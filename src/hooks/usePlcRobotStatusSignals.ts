// usePlcRobotStatusSignals.ts
//
// usePlcWebSocket から得た生データ(アドレス→値のマップ)を、RB1/RB2の
// 「軸ごとのトルク値・ピーク値」「ロボット単位の稼働率」に変換するフック。
// usePlcJobFlowSignals と同じ構成パターンに合わせています。
//
// !!! 注意 !!!
// アドレス自体はまだ確定していません（config/robotStatusAddresses.ts 参照）。
// 実データが来るまでは全て 0 を返します。
// また、usePlcWebSocket が返す plcData の実際の型に合わせて
// 「アドレス文字列 -> 数値」のマッピング部分は調整してください。

import { useMemo } from 'react'
import type { DataPoint } from '../types'
import { getLatestDataPoint, readAddress } from '../utils/usePlcSignalUtils'
import {
  ROBOT_AXIS_ADDRESSES,
  ROBOT_UTILIZATION_ADDRESS,
  type RobotKey,
} from '../config/robotStatusAddresses'

export interface AxisTorqueStat {
  torque: number
  peakTorque: number
}

export interface PlcRobotStatusSignals {
  rb1AxisTorques: AxisTorqueStat[]
  rb2AxisTorques: AxisTorqueStat[]
  rb1UtilizationRate: number
  rb2UtilizationRate: number
}

/**
 * usePlcWebSocket の生データ（DataPoint[]）から、
 * RB1/RB2の軸トルク・ピーク値・稼働率を取り出す。
 * 使い方は usePlcJobFlowSignals(plcData) と同じ:
 *   const { rb1AxisTorques, ... } = usePlcRobotStatusSignals(plcData)
 */
export function usePlcRobotStatusSignals(data: DataPoint[]): PlcRobotStatusSignals {
  return useMemo(() => {
    const latest = getLatestDataPoint(data)

    const buildAxisStats = (robot: RobotKey): AxisTorqueStat[] =>
      ROBOT_AXIS_ADDRESSES[robot].map((addr) => ({
        torque: readAddress(latest, addr.torque),
        peakTorque: readAddress(latest, addr.peakTorque),
      }))

    return {
      rb1AxisTorques: buildAxisStats('RB1'),
      rb2AxisTorques: buildAxisStats('RB2'),
      rb1UtilizationRate: readAddress(latest, ROBOT_UTILIZATION_ADDRESS.RB1),
      rb2UtilizationRate: readAddress(latest, ROBOT_UTILIZATION_ADDRESS.RB2),
    }
  }, [data])
}
