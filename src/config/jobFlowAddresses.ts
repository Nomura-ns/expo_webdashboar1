// config/jobFlowAddresses.ts
//
// 全体フロー（ROBOT PERFORMANCE）の現在工程ステップをPLC(Dレジスタ)から取得するための
// アドレス定義。robotStatusAddresses.ts / operationMetricsAddresses.ts と同じ考え方です。
//
// D15004の値と工程の対応：
// 1：刃物取付
// 2：刃物取外
// 3：検査
// 4：検査結果OK？
// 5：刃物交換（検査結果によっては飛ばされる）
// 6：刃物ストックへ返却
// 7：動作準備

/** 全体フローの現在工程ステップ（D15004） */
export const JOB_FLOW_STEP_ADDRESS = 15004

/** usePlcWebSocket の selectedAddresses にまとめて渡すための一覧 */
export const JOB_FLOW_ADDRESSES = [JOB_FLOW_STEP_ADDRESS]

/** ステップ番号 ⇔ 工程名の対応表（表示・デバッグ用） */
export const JOB_FLOW_STEP_LABELS: Record<number, string> = {
  1: '刃物取付',
  2: '刃物取外',
  3: '検査',
  4: '検査結果OK？',
  5: '刃物交換',
  6: '刃物ストックへ返却',
  7: '動作準備',
}