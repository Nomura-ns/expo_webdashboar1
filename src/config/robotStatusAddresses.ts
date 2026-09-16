// robotStatusAddresses.ts
//
// RB1・RB2それぞれの
// 「軸ごとのトルク値」「軸ごとのピーク値」
// をPLC(Dレジスタ)から取得するためのアドレス定義。
//
// サーバー側で既に32bit結合済みの値として送信されるため、
// クライアント側では1ワードとしてそのまま読み取る。

export type RobotKey = 'RB1' | 'RB2'

export interface AxisAddressSet {
  /** 2ワード構成のトルク値・先頭Dレジスタ */
  torque: number

  /** 2ワード構成のピーク値・先頭Dレジスタ */
  peakTorque: number
}

/**
 * RB1・RB2の各軸
 *
 * 軸の並び：
 * 0 = S
 * 1 = L
 * 2 = U
 * 3 = R
 * 4 = B
 * 5 = T
 *
 * 各値は2ワード（32bit signed integer）。
 */
export const ROBOT_AXIS_ADDRESSES: Record<RobotKey, AxisAddressSet[]> = {
  RB1: [
    { torque: 15100, peakTorque: 15120 }, // S軸
    { torque: 15102, peakTorque: 15122 }, // L軸
    { torque: 15104, peakTorque: 15124 }, // U軸
    { torque: 15106, peakTorque: 15126 }, // R軸
    { torque: 15108, peakTorque: 15128 }, // B軸
    { torque: 15110, peakTorque: 15130 }, // T軸
  ],

  RB2: [
    { torque: 15140, peakTorque: 15160 }, // S軸
    { torque: 15142, peakTorque: 15162 }, // L軸
    { torque: 15144, peakTorque: 15164 }, // U軸
    { torque: 15146, peakTorque: 15166 }, // R軸
    { torque: 15148, peakTorque: 15168 }, // B軸
    { torque: 15150, peakTorque: 15170 }, // T軸
  ],
}

/**
 * usePlcWebSocket の selectedAddresses に
 * まとめて渡すための一覧。
 *
 * 2ワード値については先頭アドレスのみ登録する。
 *
 * 例：
 * 15100 → 15100 + 15101
 * 15120 → 15120 + 15121
 */
export const ALL_ROBOT_STATUS_ADDRESSES: number[] = [
  // RB1
  ...ROBOT_AXIS_ADDRESSES.RB1.flatMap((axis) => [
    axis.torque,
    axis.peakTorque,
  ]),

  // RB2
  ...ROBOT_AXIS_ADDRESSES.RB2.flatMap((axis) => [
    axis.torque,
    axis.peakTorque,
  ]),
]