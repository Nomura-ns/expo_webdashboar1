// OperationStatus.tsx
import PanelFrame from '../common/PanelFrame'
import type { Theme } from '../../types'

import ArmDiagram, { type ArmJointPosition } from './ArmDiagram'
import UtilizationRateDisplay from './UtilizationRateDisplay'
import TorqueUsageChart, { type AxisTorqueRow } from './TorqueUsageChart'
import SpeedGaugeGrid, { type AxisSpeedRow } from './SpeedGaugeGrid'

import './OperationStatus.css'

export interface AxisStat {
  speed: number // MAX比(%)。PLC対象外のためサンプル値運用（config/robotStatusAddresses.ts 参照）
  torque: number // 定格トルク比(%)。PLC(Dレジスタ、未定)から取得予定
  /** トルクのピーク値（%）。PLC(Dレジスタ、未定)から取得予定 */
  peakTorque: number
}

export type RobotKey = 'RB1' | 'RB2'

export interface RobotStat {
  motors: AxisStat[] // 長さ6を想定（RB1-1〜RB1-6 / RB2-1〜RB2-6）
  /** 稼働率（PLC由来。%）。Dレジスタのアドレスは config/robotStatusAddresses.ts を参照 */
  utilizationRate: number
}

interface OperationStatusProps {
  theme: Theme
  /** ライト/ダークの判定（QRコード画像の出し分けに使用） */
  themeMode?: 'light' | 'dark'
  /** RB1・RB2は同一機種のため、アーム図・画像は1台分のみ表示するが、
   *  しきい値の状態はRB1・RB2の2台分をそれぞれ表示する */
  imageUrl?: string
  robotRB1: RobotStat
  robotRB2: RobotStat
  /** 現状このページでは非表示（稼働実績ページ側で表示）。互換性のためpropsは残す */
  cycleTime?: number
  isEditing: boolean
  onEditingChange: (value: boolean) => void
}

// しきい値（トルク・速度どちらも同じ%で判定）
const THRESHOLD = 80

// アーム図：軸(1〜6)の位置（%）。RB1/RB2で共通のシンプルなschematic用の座標。
const JOINT_POSITIONS: ArmJointPosition[] = [
  { axis: 1, x: 58, y: 82 },
  { axis: 2, x: 68, y: 49 },
  { axis: 3, x: 71, y: 35 },
  { axis: 4, x: 62, y: 26 },
  { axis: 5, x: 44, y: 19 },
  { axis: 6, x: 26, y: 21 },
]

// QRコード画像。ダーク/ライトのテーマに応じて出し分ける（配置予定：/public 直下）
const QR_CODE_URL = {
  light: 'QR_light.png',
  dark: 'QR_dark.png',
}

export default function OperationStatus({
  theme,
  themeMode = 'dark',
  robotRB1,
  robotRB2,
  isEditing,
  onEditingChange,
}: OperationStatusProps) {
  const axisCount = Math.max(robotRB1.motors.length, robotRB2.motors.length, 6)

  const torqueRows: AxisTorqueRow[] = Array.from({ length: axisCount }, (_, i) => ({
    axis: i + 1,
    rb1: {
      value: robotRB1.motors[i]?.torque ?? 0,
      peak: robotRB1.motors[i]?.peakTorque ?? 0,
    },
    rb2: {
      value: robotRB2.motors[i]?.torque ?? 0,
      peak: robotRB2.motors[i]?.peakTorque ?? 0,
    },
  }))

  const speedRows: AxisSpeedRow[] = Array.from({ length: axisCount }, (_, i) => ({
    axis: i + 1,
    rb1: robotRB1.motors[i]?.speed ?? 0,
    rb2: robotRB2.motors[i]?.speed ?? 0,
  }))

  // アーム図に出す軸ごとのしきい値超過フラグ（RB1・RB2それぞれ独立に判定）
  const warnByAxis = torqueRows.map((row) => ({
    rb1: row.rb1.peak >= THRESHOLD,
    rb2: row.rb2.peak >= THRESHOLD,
  }))

  const qrUrl = themeMode === 'light' ? QR_CODE_URL.light : QR_CODE_URL.dark

  return (
    <PanelFrame className={`op-status op-status--${theme}`}>
      <div className="op-status__layout">
        <div className="op-status__main-row">
          <div className="op-status__card op-status__card--arm">
            <div className="op-status__title">アーム構成</div>
            <ArmDiagram jointPositions={JOINT_POSITIONS} warnByAxis={warnByAxis} />
          </div>

          <div className="op-status__card op-status__card--torque">
            <TorqueUsageChart data={torqueRows} threshold={THRESHOLD} />
          </div>

          <div className="op-status__card op-status__card--util">
            <div className="op-status__title">ROBOT 稼働率</div>
            <div className="op-status__util-row">
              <UtilizationRateDisplay label="RB1" rate={robotRB1.utilizationRate} colorKey="RB1" />
              <UtilizationRateDisplay label="RB2" rate={robotRB2.utilizationRate} colorKey="RB2" />
            </div>
          </div>
        </div>

        <div className="op-status__card op-status__card--speed">
          <SpeedGaugeGrid data={speedRows} threshold={THRESHOLD} />
          <img src={qrUrl} alt="QRコード" className="op-status__qr" />
        </div>

        {/* 編集モード：新レイアウト（バー/ドーナツ/ゲージ表示）向けの位置編集UIは未実装。
            トグル自体はSettingsPanelと同期を取るため残してあります。 */}
        {isEditing && (
          <div className="op-status__edit-note">
            編集モード：このページの表示位置編集は現在準備中です。
            <button type="button" onClick={() => onEditingChange(false)}>
              編集モードを終了
            </button>
          </div>
        )}
      </div>
    </PanelFrame>
  )
}
