// hooks/useOperationHourlyTrend.ts
//
// 稼働時間ごとの異常回数・取付実行回数・取出実行回数の推移データ（OperationResultsの
// hourlyTrend props）を、PLCから取得済みの累積カウント値（usePlcOperationMetricsSignalsが
// 返すanomalyCount/tightenCount/loosenCount）を一定間隔でサンプリングして作成するフック。
//
// PLC側はその瞬間の累積カウントしか持っておらず、時系列の推移データそのものはPLCに
// 無いため、クライアント側で定期的にスナップショットを取ってグラフ用の点列を組み立てる
// （サイクルタイムのフォールバックをbitの立上り間隔から算出しているのと同じ考え方）。
//
// 展示会場でページを開きっぱなしにする運用を想定し、リロードしても当日分の推移が
// 消えないようlocalStorageに保存し、日付が変わったら自動的にリセットする。

import { useEffect, useRef, useState } from 'react'
import type { HourlyTrendPoint } from '../components/OperationResults/OperationResults'

const STORAGE_KEY = 'operationHourlyTrend'
/** サンプリング間隔（ミリ秒）。30分ごとに1点記録する */
const SAMPLE_INTERVAL_MS = 30 * 60 * 1000
/** 保持する最大点数（30分刻みで1日 = 48点）。超えたら古い点から捨てる */
const MAX_POINTS = 48

interface StoredTrend {
  /** サンプリング対象の日付（YYYY-MM-DD）。変わったらリセットする */
  dateKey: string
  points: HourlyTrendPoint[]
}

function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function loadStored(): StoredTrend {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as StoredTrend
      if (parsed.dateKey === todayKey()) return parsed
    }
  } catch {
    // localStorageが使えない/壊れている場合は空から開始する
  }
  return { dateKey: todayKey(), points: [] }
}

function saveStored(trend: StoredTrend) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trend))
  } catch {
    // 保存できなくても表示自体は継続する（次回サンプリング時に再度保存を試みる）
  }
}

/**
 * @param anomalyCount 現在の異常回数（PLCから取得した累積値）
 * @param tightenCount 現在の取付実行回数（同上）
 * @param loosenCount 現在の取出実行回数（同上）
 */
export function useOperationHourlyTrend(
  anomalyCount: number,
  tightenCount: number,
  loosenCount: number
): HourlyTrendPoint[] {
  const [points, setPoints] = useState<HourlyTrendPoint[]>(() => loadStored().points)

  // setIntervalのコールバックが古い値を参照し続けないよう、最新値をrefで保持する
  const latestRef = useRef({ anomalyCount, tightenCount, loosenCount })
  useEffect(() => {
    latestRef.current = { anomalyCount, tightenCount, loosenCount }
  }, [anomalyCount, tightenCount, loosenCount])

  useEffect(() => {
    const recordPoint = () => {
      const key = todayKey()
      const stored = loadStored()
      const base = stored.dateKey === key ? stored.points : []
      const next = [...base, { time: formatTime(new Date()), ...latestRef.current }].slice(-MAX_POINTS)
      saveStored({ dateKey: key, points: next })
      setPoints(next)
    }

    // マウント時点でまだ当日分の記録が無ければ、最初の1点をすぐに記録する
    // （30分待たないとグラフが空のままになるのを防ぐ）
    if (loadStored().points.length === 0) {
      recordPoint()
    }

    const sampleId = window.setInterval(recordPoint, SAMPLE_INTERVAL_MS)

    // 日付が変わったタイミングを検知してリセットする（1分おきにチェック）
    const dayCheckId = window.setInterval(() => {
      if (loadStored().dateKey !== todayKey()) {
        setPoints([])
      }
    }, 60 * 1000)

    return () => {
      window.clearInterval(sampleId)
      window.clearInterval(dayCheckId)
    }
    // 初回マウント時のみ購読を開始する。以降の値変化はlatestRefで拾う
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return points
}