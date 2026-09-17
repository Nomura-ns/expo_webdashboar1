// usePlcRobotStatusSignals.ts
//
// usePlcWebSocket から得た生データを、
// RB1/RB2の「軸ごとのトルク値・ピーク値・速度(%)」に変換するフック。
//
// 速度は deg/s で送られてくるため、
// speed(%) = speedCurrent / speedMax * 100
// に変換してからAxisFullStatとして返す。

import { useMemo } from 'react'

import type { DataPoint } from '../types'

import { getLatestDataPoint, readAddress } from '../utils/usePlcSignalUtils'

import { ROBOT_AXIS_ADDRESSES, type RobotKey } from '../config/robotStatusAddresses'

export interface AxisFullStat {
  /** MAX比(%)。speedCurrent / speedMax * 100 で算出 */
  speed: number
  torque: number
  peakTorque: number
}

export interface PlcRobotStatusSignals {
  rb1AxisStats: AxisFullStat[]
  rb2AxisStats: AxisFullStat[]
}

/** speedMaxが0（未取得等）の場合は0%として扱う。
 * 表示側（SpeedBar等）が整数前提のため、ここで四捨五入して整数化する。 */
function toSpeedPercent(current: number, max: number): number {
  if (!max) return 0
  return Math.round((current / max) * 100)
}

export function usePlcRobotStatusSignals(
  data: DataPoint[],
): PlcRobotStatusSignals {
  return useMemo(() => {
    const latest = getLatestDataPoint(data)

    const buildAxisStats = (robot: RobotKey): AxisFullStat[] =>
      ROBOT_AXIS_ADDRESSES[robot].map((addr) => {
        const speedCurrent = readAddress(latest, addr.speedCurrent)
        const speedMax = readAddress(latest, addr.speedMax)

        return {
          speed: toSpeedPercent(speedCurrent, speedMax),
          torque: readAddress(latest, addr.torque),
          peakTorque: readAddress(latest, addr.peakTorque),
        }
      })

    return {
      rb1AxisStats: buildAxisStats('RB1'),
      rb2AxisStats: buildAxisStats('RB2'),
    }
  }, [data])
}