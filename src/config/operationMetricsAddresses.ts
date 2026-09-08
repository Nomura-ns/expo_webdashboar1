// config/operationMetricsAddresses.ts
//
// 稼働実績（検査回数・異常回数・上刃挿入回数・ねじ締め回数・ねじ緩め回数）と、
// サイクル変更タイミング用bit・サイクルタイム・NG判定信号のPLCアドレス定義。
//
// D レジスタの実アドレスはまだ未定のため、ここでは仮の番号を置いています。
// アドレス確定後、下記の値を実際のD番号に書き換えてください
// （usePlcRobotStatusSignals 側の robotStatusAddresses.ts と同じ考え方です）。

/** 検査回数 */
export const INSPECT_COUNT_ADDRESS = 200
/** 異常回数 */
export const ANOMALY_COUNT_ADDRESS = 201
/** 上刃挿入回数 */
export const INSERT_COUNT_ADDRESS = 202
/** ねじ締め回数 */
export const TIGHTEN_COUNT_ADDRESS = 203
/** ねじ緩め回数 */
export const LOOSEN_COUNT_ADDRESS = 204
/** NG判定信号（0 = OK, 1 = NG） */
export const NG_SIGNAL_ADDRESS = 205
/**
 * サイクル変更タイミング用bit。
 * 0→1に立ち上がったタイミングを「サイクルの区切り」として扱う。
 */
export const CYCLE_CHANGE_BIT_ADDRESS = 206
/**
 * サイクルタイム（秒）。PLC側で保持していない場合は、
 * usePlcOperationMetricsSignals 側でCYCLE_CHANGE_BIT_ADDRESSの立上り間隔から
 * コード側で算出した値をフォールバックとして使用します。
 */
export const CYCLE_TIME_ADDRESS = 207

/** usePlcWebSocket の selectedAddresses にまとめて渡すための一覧 */
export const OPERATION_METRICS_ADDRESSES = [
  INSPECT_COUNT_ADDRESS,
  ANOMALY_COUNT_ADDRESS,
  INSERT_COUNT_ADDRESS,
  TIGHTEN_COUNT_ADDRESS,
  LOOSEN_COUNT_ADDRESS,
  NG_SIGNAL_ADDRESS,
  CYCLE_CHANGE_BIT_ADDRESS,
  CYCLE_TIME_ADDRESS,
]
