// hooks/usePlcJobFlowSignals.ts
//
// 全体フロー（ROBOT PERFORMANCE）の現在工程ステップをPLC(Dレジスタ)から取得するための
// アドレス定義とフック。usePlcOperationMetricsSignals / usePlcRobotStatusSignals と
// 同じ構成に統一しています。
//
// D15004の値と工程の対応（JobFlowDiagram.tsxのOVERALL_FLOWと対応させること）：
// 1：刃物取付 / 2：刃物取外 / 3：検査 / 4：検査結果OK？ / 5：刃物交換 /
// 6：刃物ストックへ返却 / 7：動作準備

import { getLatestDataPoint, readAddress } from '../utils/usePlcSignalUtils'
import type { DataPoint } from '../types'

/** 全体フローの現在工程ステップ（D15004） */
export const JOB_FLOW_STEP_ADDRESS = 15004

/** usePlcWebSocket の selectedAddresses にまとめて渡すための一覧 */
export const JOB_FLOW_ADDRESSES = [JOB_FLOW_STEP_ADDRESS]

export interface PlcJobFlow {
  /** 全体フローの現在工程ステップ（1〜7）。未割り当て（0）時は undefined */
  activeStep: number | undefined
}

export function usePlcJobFlowSignals(data: DataPoint[]): PlcJobFlow {
  const latest = getLatestDataPoint(data)
  const rawStep = readAddress(latest, JOB_FLOW_STEP_ADDRESS)

  // readAddressは未取得時に0を返すため、0はステップ未割り当てとして扱いundefinedにする
  // （JobFlowDiagram側のactiveStep?: numberは「どの工程も強調しない」状態として扱う）
  const activeStep = rawStep > 0 ? rawStep : undefined

  return { activeStep }
}