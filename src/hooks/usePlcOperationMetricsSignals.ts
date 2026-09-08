// hooks/usePlcOperationMetricsSignals.ts
//
// usePlcJobFlowSignals / usePlcRobotStatusSignals と同じ構成に統一しています。
// usePlcWebSocket が返す data（DataPoint[]、1時刻分ずつ蓄積された配列）を受け取り、
// 最新の1点から readAddress（usePlcSignalUtils）経由で値を取り出します。

import { useEffect, useRef, useState } from 'react'
import type { DataPoint } from '../types'
import { getLatestDataPoint, readAddress } from '../utils/usePlcSignalUtils'
import {
  INSPECT_COUNT_ADDRESS,
  ANOMALY_COUNT_ADDRESS,
  INSERT_COUNT_ADDRESS,
  TIGHTEN_COUNT_ADDRESS,
  LOOSEN_COUNT_ADDRESS,
  NG_SIGNAL_ADDRESS,
  CYCLE_CHANGE_BIT_ADDRESS,
  CYCLE_TIME_ADDRESS,
} from '../config/operationMetricsAddresses'

export interface PlcOperationMetrics {
  /** 検査回数 */
  inspectCount: number
  /** 異常回数 */
  anomalyCount: number
  /** 上刃挿入回数 */
  insertCount: number
  /** ねじ締め回数 */
  tightenCount: number
  /** ねじ緩め回数 */
  loosenCount: number
  /** NG判定信号（true = NG） */
  ngSignal: boolean
  /** サイクルタイム（秒）。PLC値があればそれを優先し、無ければコード側の蓄積値を使用 */
  cycleTimeSec: number
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
  const ngSignal = readAddress(latest, NG_SIGNAL_ADDRESS) === 1
  const cycleChangeBit = readAddress(latest, CYCLE_CHANGE_BIT_ADDRESS)
  const plcCycleTimeSec = readAddress(latest, CYCLE_TIME_ADDRESS)

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

  return { inspectCount, anomalyCount, insertCount, tightenCount, loosenCount, ngSignal, cycleTimeSec }
}
