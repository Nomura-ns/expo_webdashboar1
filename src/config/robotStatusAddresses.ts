// robotStatusAddresses.ts
//
// RB1・RB2それぞれの
// 「軸ごとのトルク値」「軸ごとのピーク値」
// をPLC(Dレジスタ)から取得するためのアドレス定義。
//
// トルク値・ピーク値は2ワード構成（32bit signed integer）。
//
// 例：
// D15100～D15101 → RB1 S軸トルク
// D15120～D15121 → RB1 S軸トルク最大値
//
// このファイルでは2ワードの「先頭アドレス」のみ指定する。
// 実際の2ワードの読み取りは
// read2WordSignedAddress() で行う。

export type RobotKey = 'RB1' | 'RB2'

export interface AxisAddressSet {
  /** 2ワード構成のトルク値・先頭Dレジスタ */
  torque: string

  /** 2ワード構成のピーク値・先頭Dレジスタ */
  peakTorque: string
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
export const ROBOT_AXIS_ADDRESSES: Record<
  RobotKey,
  AxisAddressSet[]
> = {
  RB1: [
    { torque: 'D15100', peakTorque: 'D15120' }, // S軸
    { torque: 'D15102', peakTorque: 'D15122' }, // L軸
    { torque: 'D15104', peakTorque: 'D15124' }, // U軸
    { torque: 'D15106', peakTorque: 'D15126' }, // R軸
    { torque: 'D15108', peakTorque: 'D15128' }, // B軸
    { torque: 'D15110', peakTorque: 'D15130' }, // T軸
  ],

  RB2: [
    { torque: 'D15140', peakTorque: 'D15160' }, // S軸
    { torque: 'D15142', peakTorque: 'D15162' }, // L軸
    { torque: 'D15144', peakTorque: 'D15164' }, // U軸
    { torque: 'D15146', peakTorque: 'D15166' }, // R軸
    { torque: 'D15148', peakTorque: 'D15168' }, // B軸
    { torque: 'D15150', peakTorque: 'D15170' }, // T軸
  ],
}

/**
 * usePlcWebSocket の selectedAddresses に
 * まとめて渡すための一覧。
 *
 * 2ワード値については先頭アドレスのみ登録する。
 *
 * 例：
 * D15100 → D15100 + D15101
 * D15120 → D15120 + D15121
 */
export const ALL_ROBOT_STATUS_ADDRESSES: string[] = [
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