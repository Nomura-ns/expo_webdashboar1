// config/operationMetricsAddresses.ts
//
// 稼働実績（検査回数・異常回数・上刃挿入回数・取付実行回数・取出実行回数・OK割合・NG割合）と、
// サイクル変更タイミング用bit・サイクルタイム・NG判定信号のPLCアドレス定義。
//
// D15180〜D15192 はアドレス確定済み。上刃挿入回数・NG判定信号・サイクル変更タイミング用bit・
// サイクルタイムは引き続きアドレス未定のため、仮の番号のままにしています
// （確定後、下記の値を実際のD番号に書き換えてください）。

/** 検査回数（D15180） */
export const INSPECT_COUNT_ADDRESS = 15180
/** 異常回数（D15181） */
export const ANOMALY_COUNT_ADDRESS = 15181
/** 上刃挿入回数（アドレス未定のため仮番号） */
export const INSERT_COUNT_ADDRESS = 202
/** 取付実行回数（D15186） */
export const TIGHTEN_COUNT_ADDRESS = 15186
/** 取出実行回数（D15188） */
export const LOOSEN_COUNT_ADDRESS = 15188
/** OK割合（D15190、0〜100の%値） */
export const OK_RATIO_ADDRESS = 15190
/** NG割合（D15192、0〜100の%値。usePlcOperationMetricsSignals側では未使用で、
 *  検査回数とOK割合からngCountを逆算しているが、表示・デバッグ用に定義だけ残している） */
export const NG_RATIO_ADDRESS = 15192
/** NG判定信号（0 = OK, 1 = NG）（アドレス未定のため仮番号） */
export const NG_SIGNAL_ADDRESS = 205
/**
 * サイクル変更タイミング用bit（アドレス未定のため仮番号）。
 * 0→1に立ち上がったタイミングを「サイクルの区切り」として扱う。
 */
export const CYCLE_CHANGE_BIT_ADDRESS = 206
/**
 * サイクルタイム（秒）（アドレス未定のため仮番号）。PLC側で保持していない場合は、
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
  OK_RATIO_ADDRESS,
  NG_RATIO_ADDRESS,
  NG_SIGNAL_ADDRESS,
  CYCLE_CHANGE_BIT_ADDRESS,
  CYCLE_TIME_ADDRESS,
]