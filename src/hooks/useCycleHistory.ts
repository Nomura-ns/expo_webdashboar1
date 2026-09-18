// useCycleHistory.ts
//
// 「ダッシュボード改修仕様書」の下記2項目に対応するフック：
//   ・⑤サイクルタイムを最下部ティッカー表示 → サイクルタイム機能追加（ベストサイクルタイム）
//   ・サイクル履歴追加（新規パネル）＋ステータス判定ロジック
//
// PLCから「サイクル開始時刻」「サイクル終了時刻」が送られてくるようになったため、
// 1サイクル完了の検知は「サイクル終了時刻（cycleEndTimeRaw）の値が変化した瞬間」を基準にする。
// ※以前はcycleTimeSec（サイクルタイムの値そのもの）の変化を基準にしていたが、
//   偶然2回連続で同じサイクルタイムになった場合にサイクルが1件取りこぼされる不具合があったため、
//   毎回必ず変化する終了時刻を基準にするよう変更した。
//
// ステータス判定ロジック（仕様書どおり）:
//   1件目            … 判定なし（pending）
//   2件目・3件目      … 3件揃った時点で相互比較。他2件との差がいずれも10秒以内なら「正常」
//                        正常判定されたデータを基準値プールに登録
//   4件目以降        … 基準値＝正常履歴の平均値。|現在値−基準値|≦10秒なら「正常」、
//                        10秒超なら「異常」。正常と判定されたものは基準値プールに追加

import { useEffect, useRef, useState } from 'react'

export type CycleStatus = 'normal' | 'abnormal' | 'pending'

export interface CycleRecord {
  no: number
  startTime: string
  endTime: string
  cycleTimeSec: number
  status: CycleStatus
}

/** 正常/異常判定のしきい値（秒）。仕様書に基づく固定値。 */
const STATUS_THRESHOLD_SEC = 10

/** 内部保持する履歴の最大件数（表示側は別途「最大5件表示」等でさらに絞る） */
const DEFAULT_KEEP_MAX = 200

function formatClock(ms: number) {
  const d = new Date(ms)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

interface UseCycleHistoryResult {
  /** 新しい順ではなく発生順（古い→新しい）の全履歴 */
  history: CycleRecord[]
  /** これまでで最短のサイクルタイム（秒） */
  bestCycleTimeSec?: number
}

/**
 * @param cycleTimeSec 最新のサイクルタイム（秒）。履歴の各行に記録する値。
 * @param cycleEndTimeRaw PLCから受け取るサイクル終了時刻の生値。この値が変化した瞬間を
 *                        「1サイクル完了」として記録する（サイクルタイムの値自体の変化ではない）。
 * @param keepMax 保持する履歴の最大件数（古いものから削除）
 */
export function useCycleHistory(
  cycleTimeSec: number | undefined,
  cycleEndTimeRaw: number | string | undefined,
  keepMax: number = DEFAULT_KEEP_MAX
): UseCycleHistoryResult {
  const [history, setHistory] = useState<CycleRecord[]>([])
  const [bestCycleTimeSec, setBestCycleTimeSec] = useState<number | undefined>(undefined)

  /** 正常判定された値だけを蓄積する基準値プール（4件目以降の平均値算出に使用） */
  const normalValuesRef = useRef<number[]>([])
  const prevEndRef = useRef<typeof cycleEndTimeRaw>(undefined)
  const lastEdgeAtRef = useRef<number>(Date.now())
  const noRef = useRef(0)

  useEffect(() => {
    if (cycleEndTimeRaw === undefined || cycleTimeSec === undefined || cycleTimeSec <= 0) return
    // 終了時刻そのものが変化した時だけを「1サイクル完了」として扱う
    // （PLCポーリング毎の重複記録を防ぐ。サイクルタイムの値が偶然同じでも
    //  終了時刻は毎回異なるため取りこぼさない）
    if (prevEndRef.current === cycleEndTimeRaw) return
    prevEndRef.current = cycleEndTimeRaw

    const now = Date.now()
    const startedAt = lastEdgeAtRef.current
    lastEdgeAtRef.current = now
    noRef.current += 1

    setHistory((prev) => {
      const rawCount = prev.length + 1
      let status: CycleStatus = 'pending'

      if (rawCount < 3) {
        status = 'pending'
      } else if (rawCount === 3) {
        const others = [prev[prev.length - 2].cycleTimeSec, prev[prev.length - 1].cycleTimeSec]
        status = others.every((v) => Math.abs(cycleTimeSec - v) <= STATUS_THRESHOLD_SEC)
          ? 'normal'
          : 'abnormal'
      } else {
        const pool = normalValuesRef.current
        const baseline = pool.length > 0 ? pool.reduce((sum, v) => sum + v, 0) / pool.length : undefined
        status =
          baseline !== undefined && Math.abs(cycleTimeSec - baseline) <= STATUS_THRESHOLD_SEC
            ? 'normal'
            : 'abnormal'
      }

      if (status === 'normal') {
        normalValuesRef.current = [...normalValuesRef.current, cycleTimeSec]
      }

      const record: CycleRecord = {
        no: noRef.current,
        startTime: formatClock(startedAt),
        endTime: formatClock(now),
        cycleTimeSec,
        status,
      }
      return [...prev, record].slice(-keepMax)
    })

    setBestCycleTimeSec((prevBest) =>
      prevBest === undefined || cycleTimeSec < prevBest ? cycleTimeSec : prevBest
    )
  }, [cycleEndTimeRaw, cycleTimeSec, keepMax])

  return { history, bestCycleTimeSec }
}