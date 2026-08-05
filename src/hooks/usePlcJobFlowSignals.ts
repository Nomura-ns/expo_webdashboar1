// usePlcJobFlowSignals.ts
import { useMemo } from 'react'
import type { DataPoint } from '../types'
import { addressToDataKey } from '../plc'

/**
 * 工程フロー図（JobFlowDiagram）で使用するPLCアドレス。
 * usePlcQuizSignals と同じ形式（数値アドレス）で定義してください。
 * 実際のラダー側のアドレス番号に合わせて書き換えてください。
 */
export const JOB_FLOW_STEP_ADDRESS = 110          // 現在工程ステップ
export const JOB_FLOW_CYCLE_CURRENT_ADDRESS = 111 // 現在サイクル数
export const JOB_FLOW_CYCLE_TOTAL_ADDRESS = 112   // 全体サイクル数（目標・予定回数）

type JobFlowSignals = {
  activeStep?: number
  cycleCurrent?: number
  cycleTotal?: number
}

/**
 * usePlcWebSocket の生データ（DataPoint[]）から、
 * 工程フロー図が必要とする値（現在ステップ・サイクル進捗）を取り出す。
 * 使い方は usePlcQuizSignals(plcData) と同じ:
 *   const { activeStep, cycleCurrent, cycleTotal } = usePlcJobFlowSignals(plcData)
 */
export function usePlcJobFlowSignals(data: DataPoint[]): JobFlowSignals {
  return useMemo(() => {
    const latest = data[data.length - 1]
    if (!latest) return {}

    const stepValue = latest[addressToDataKey(JOB_FLOW_STEP_ADDRESS)]
    const currentValue = latest[addressToDataKey(JOB_FLOW_CYCLE_CURRENT_ADDRESS)]
    const totalValue = latest[addressToDataKey(JOB_FLOW_CYCLE_TOTAL_ADDRESS)]

    return {
      activeStep: typeof stepValue === 'number' ? stepValue : undefined,
      cycleCurrent: typeof currentValue === 'number' ? currentValue : undefined,
      cycleTotal: typeof totalValue === 'number' ? totalValue : undefined,
    }
  }, [data])
}