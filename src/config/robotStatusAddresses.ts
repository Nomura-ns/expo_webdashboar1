// robotStatusAddresses.ts
//
// RB1・RB2それぞれの「トルク値」「ピーク値」「稼働率」をPLC(Dレジスタ)から取得するための
// アドレス定義。
//
// !!! 注意 !!!
// 実機のDレジスタ番号はまだ決まっていません。以下は仮のアドレスです。
// アドレスが確定し次第、このファイルの値だけを書き換えれば反映されるようにしています。
// TODO: 実アドレス確定後に差し替える

export type RobotKey = 'RB1' | 'RB2'

export interface AxisAddressSet {
  /** トルク値のDレジスタアドレス */
  torque: string
  /** ピーク値のDレジスタアドレス */
  peakTorque: string
}

// 軸(1〜6)ごとの トルク値 / ピーク値 アドレス（仮アドレス、要差し替え）
export const ROBOT_AXIS_ADDRESSES: Record<RobotKey, AxisAddressSet[]> = {
  RB1: [
    { torque: 'D0000', peakTorque: 'D0001' }, // TODO 軸1
    { torque: 'D0002', peakTorque: 'D0003' }, // TODO 軸2
    { torque: 'D0004', peakTorque: 'D0005' }, // TODO 軸3
    { torque: 'D0006', peakTorque: 'D0007' }, // TODO 軸4
    { torque: 'D0008', peakTorque: 'D0009' }, // TODO 軸5
    { torque: 'D0010', peakTorque: 'D0011' }, // TODO 軸6
  ],
  RB2: [
    { torque: 'D0100', peakTorque: 'D0101' }, // TODO 軸1
    { torque: 'D0102', peakTorque: 'D0103' }, // TODO 軸2
    { torque: 'D0104', peakTorque: 'D0105' }, // TODO 軸3
    { torque: 'D0106', peakTorque: 'D0107' }, // TODO 軸4
    { torque: 'D0108', peakTorque: 'D0109' }, // TODO 軸5
    { torque: 'D0110', peakTorque: 'D0111' }, // TODO 軸6
  ],
}

// 稼働率のDレジスタアドレス（ロボット単位、仮アドレス、要差し替え）
export const ROBOT_UTILIZATION_ADDRESS: Record<RobotKey, string> = {
  RB1: 'D0200', // TODO
  RB2: 'D0201', // TODO
}

// usePlcWebSocket の selectedAddresses にまとめて渡すための一覧
export const ALL_ROBOT_STATUS_ADDRESSES: string[] = [
  ...ROBOT_AXIS_ADDRESSES.RB1.flatMap((a) => [a.torque, a.peakTorque]),
  ...ROBOT_AXIS_ADDRESSES.RB2.flatMap((a) => [a.torque, a.peakTorque]),
  ROBOT_UTILIZATION_ADDRESS.RB1,
  ROBOT_UTILIZATION_ADDRESS.RB2,
]
