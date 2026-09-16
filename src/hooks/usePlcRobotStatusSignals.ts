// usePlcRobotStatusSignals.ts
//
// usePlcWebSocket から得た生データ（アドレス→値のマップ）を、
// RB1/RB2の「軸ごとのトルク値・ピーク値」に変換するフック。
//
// トルク値・ピーク値はPLC上で
// 2ワード = 32bit signed integer
// として格納されている前提。
//
// 稼働率はこのフックでは扱わない。

import { useMemo } from 'react'

import type { DataPoint } from '../types'

import {
  getLatestDataPoint,
  read2WordSignedAddress,
} from '../utils/usePlcSignalUtils'

import {
  ROBOT_AXIS_ADDRESSES,
  type RobotKey,
} from '../config/robotStatusAddresses'

export interface AxisTorqueStat {
  torque: number
  peakTorque: number
}

export interface PlcRobotStatusSignals {
  rb1AxisTorques: AxisTorqueStat[]
  rb2AxisTorques: AxisTorqueStat[]
}

/**
 * usePlcWebSocket の生データ（DataPoint[]）から、
 * RB1/RB2の各軸トルク・ピーク値を取り出す。
 *
 * 軸の並び：
 *
 * 0 = S
 * 1 = L
 * 2 = U
 * 3 = R
 * 4 = B
 * 5 = T
 *
 * 例：
 *
 * RB1 S軸
 * torque     → D15100～D15101
 * peakTorque → D15120～D15121
 *
 * RB2 S軸
 * torque     → D15140～D15141
 * peakTorque → D15160～D15161
 */
export function usePlcRobotStatusSignals(
  data: DataPoint[],
): PlcRobotStatusSignals {
  return useMemo(() => {
    const latest = getLatestDataPoint(data)

    /**
     * 指定したロボットの6軸分の
     * 現在トルク / 最大トルクを取得する。
     */
    const buildAxisStats = (
      robot: RobotKey,
    ): AxisTorqueStat[] =>
      ROBOT_AXIS_ADDRESSES[robot].map((addr) => ({
        torque: read2WordSignedAddress(
          latest,
          addr.torque,
        ),
        peakTorque: read2WordSignedAddress(
          latest,
          addr.peakTorque,
        ),
      }))

    return {
      rb1AxisTorques: buildAxisStats('RB1'),
      rb2AxisTorques: buildAxisStats('RB2'),
    }
  }, [data])
}