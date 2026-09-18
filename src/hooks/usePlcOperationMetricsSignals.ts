// hooks/usePlcOperationMetricsSignals.ts
//
// usePlcJobFlowSignals / usePlcRobotStatusSignals と同じ構成に統一しています。
// usePlcWebSocket が返す data（DataPoint[]、1時刻分ずつ蓄積された配列）を受け取り、
// 最新の1点から readAddress（usePlcSignalUtils）経由で値を取り出します。
//
// OK/NGはPLCからは「割合（%）」でしか来ないため、検査回数（OK回数＋NG回数）との整合を
// 取るためにここで回数へ変換します。OK割合・NG割合をそれぞれ四捨五入すると
// 合計が検査回数と一致しないことがあるため、OK回数のみ四捨五入で算出し、
// NG回数は「検査回数－OK回数」で求めることで必ず内訳の合計が検査回数と一致するようにしています。

import { useEffect, useRef, useState } from 'react'
import type { DataPoint } from '../types'
import { getLatestDataPoint, readAddress } from '../utils/usePlcSignalUtils'
import {
  INSPECT_COUNT_ADDRESS,
  ANOMALY_COUNT_ADDRESS,
  INSERT_COUNT_ADDRESS,
  TIGHTEN_COUNT_ADDRESS,
  LOOSEN_COUNT_ADDRESS,
  OK_RATIO_ADDRESS,
  NG_SIGNAL_ADDRESS,
  CYCLE_CHANGE_BIT_ADDRESS,
  CYCLE_TIME_ADDRESS,
  CYCLE_START_TIME_ADDRESS,
  CYCLE_END_TIME_ADDRESS,
} from '../config/operationMetricsAddresses'

export interface PlcOperationMetrics {
  /** 検査回数 */
  inspectCount: number
  /** 異常回数 */
  anomalyCount: number
  /** 上刃挿入回数 */
  insertCount: number
  /** 取付実行回数 */
  tightenCount: number
  /** 取出実行回数 */
  loosenCount: number
  /** 検査OK回数（検査回数×OK割合から算出） */
  okCount: number
  /** 検査NG回数（検査回数－OK回数から算出。OK割合の丸め誤差の影響を受けない） */
  ngCount: number
  /** NG判定信号（true = NG） */
  ngSignal: boolean
  /** サイクルタイム（秒）。PLC値があればそれを優先し、無ければコード側の蓄積値を使用 */
  cycleTimeSec: number
    /** サイクル開始時刻（PLC生値）。PLC接続監視（usePlcConnectionStatus）に使用 */
  cycleStartTimeRaw: number
  /** サイクル終了時刻（PLC生値）。サイクル履歴の完了検知に使用 */
  cycleEndTimeRaw: number
}

export function usePlcOperationMetricsSignals(data: DataPoint[]): PlcOperationMetrics {
  const [accumulatedCycleSec, setAccumulatedCycleSec] = useState(0)
  const lastBitRef = useRef<number | undefined>(undefined)
  const lastEdgeAtRef = useRef<number | null>(null)

  const latest = getLatestDataPoint(data)

  const inspectCount = readAddress(latest, INSPECT_COUNT_ADDRESS)
  const anomalyCount = readAddress(latest, ANOMALY_COUNT_ADDRESS)
  const insertCount = readAddress(latest, INSERT_COUNT_ADDRESS)
  const tightenCount = readAddress(latest, TIGHTEN_COUNT_ADDRESS)
  const loosenCount = readAddress(latest, LOOSEN_COUNT_ADDRESS)
  const okRatio = readAddress(latest, OK_RATIO_ADDRESS)
  const ngSignal = readAddress(latest, NG_SIGNAL_ADDRESS) === 1
  const cycleChangeBit = readAddress(latest, CYCLE_CHANGE_BIT_ADDRESS)
  const plcCycleTimeSec = readAddress(latest, CYCLE_TIME_ADDRESS)
  const cycleStartTimeRaw = readAddress(latest, CYCLE_START_TIME_ADDRESS)
  const cycleEndTimeRaw = readAddress(latest, CYCLE_END_TIME_ADDRESS)

  // OK割合（%）×検査回数からOK回数を算出。NG回数は「検査回数－OK回数」で求める
  // （OK割合・NG割合を個別に四捨五入すると合計が検査回数からズレることがあるため）。
  const okCount = Math.round(inspectCount * (okRatio / 100))
  const ngCount = Math.max(inspectCount - okCount, 0)

  // サイクル変更タイミング用bitの立上り（0→1）を検知し、
  // 直前の立上りからの経過秒数を「サイクルタイム」としてコード側で蓄積するフォールバック処理。
  // CYCLE_TIME_ADDRESS がPLCから正しく取得できるようになったら、この処理は不要になります。
  useEffect(() => {
    const now = Date.now()
    const prevBit = lastBitRef.current
    if (prevBit === 0 && cycleChangeBit === 1) {
      if (lastEdgeAtRef.current !== null) {
        setAccumulatedCycleSec((now - lastEdgeAtRef.current) / 1000)
      }
      lastEdgeAtRef.current = now
    }
    lastBitRef.current = cycleChangeBit
  }, [cycleChangeBit])

  const cycleTimeSec = plcCycleTimeSec > 0 ? plcCycleTimeSec : accumulatedCycleSec

  return {
    inspectCount,
    anomalyCount,
    insertCount,
    tightenCount,
    loosenCount,
    okCount,
    ngCount,
    ngSignal,
    cycleTimeSec,
    cycleStartTimeRaw,
    cycleEndTimeRaw,
  }
}