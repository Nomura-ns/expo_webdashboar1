// OperationStatus.tsx
import PanelFrame from '../common/PanelFrame'
import type { Theme } from '../../types'

import RobotHeaderBadge from './RobotHeaderBadge'
import AxisRow, { type AxisRowData } from './AxisRow'
import LiveClock from './LiveClock'
import { RB1_COLOR, RB2_COLOR, WARN_COLOR } from './robotColors'

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

  const axisRows: AxisRowData[] = Array.from({ length: axisCount }, (_, i) => ({
    axis: i + 1,
    rb1: {
      torqueValue: robotRB1.motors[i]?.torque ?? 0,
      torquePeak: robotRB1.motors[i]?.peakTorque ?? 0,
      speed: robotRB1.motors[i]?.speed ?? 0,
    },
    rb2: {
      torqueValue: robotRB2.motors[i]?.torque ?? 0,
      torquePeak: robotRB2.motors[i]?.peakTorque ?? 0,
      speed: robotRB2.motors[i]?.speed ?? 0,
    },
  }))

  const qrUrl = themeMode === 'light' ? QR_CODE_URL.light : QR_CODE_URL.dark

  return (
    <PanelFrame className={`op-status op-status--${theme}`}>
      <div className="axis-monitor">
        {/* 上部タイトルバー：タイトル・単位/凡例・現在時刻 */}
        <div className="axis-monitor__topbar">
          <div className="axis-monitor__title">軸モニタ ー RB1 / RB2 比較</div>
          <div className="axis-monitor__unit">
            トルク：定格トルク比 % ／ 速度：MAX比 %
          </div>
          <div className="axis-monitor__legend">
            <span className="axis-monitor__legend-item axis-monitor__legend-item--peak">
              <i />
              ピーク値
            </span>
            <span className="axis-monitor__legend-item axis-monitor__legend-item--threshold">
              <i style={{ borderColor: WARN_COLOR }} />
              しきい値近接（{THRESHOLD}%〜）
            </span>
          </div>
          <LiveClock />
        </div>

        {/* RB1/RB2の稼働率バッジ＋中央見出し */}
        <div className="axis-monitor__header-row">
          <RobotHeaderBadge
            label="RB1"
            colorKey="RB1"
            color={RB1_COLOR}
            utilizationRate={robotRB1.utilizationRate}
            align="left"
          />
          <div className="axis-monitor__header-center">
            <div className="axis-monitor__header-center-title">軸別</div>
            <div className="axis-monitor__header-center-caption">トルク・速度</div>
          </div>
          <RobotHeaderBadge
            label="RB2"
            colorKey="RB2"
            color={RB2_COLOR}
            utilizationRate={robotRB2.utilizationRate}
            align="right"
          />
        </div>

        {/* 軸1〜6：中央ラベルを挟んでRB1/RB2のトルク・速度を左右対称に表示 */}
        <div className="axis-monitor__rows">
          {axisRows.map((row) => (
            <AxisRow key={row.axis} data={row} threshold={THRESHOLD} />
          ))}
        </div>

        {/* 下部の補足＋QRコード */}
        <div className="axis-monitor__footer">
          <span>棒グラフ：現在トルク%（内側＝軸ラベル側が現在値）</span>
          <span>異常しきい値{THRESHOLD}%を超えると赤破線に接近</span>
          <span>データ更新：現場PLC同期</span>
        </div>

        <img src={qrUrl} alt="QRコード" className="axis-monitor__qr" />

        {/* 編集モード：新レイアウト向けの位置編集は未実装。
            トグル自体はSettingsPanelと同期を取るため残してあります。 */}
        {isEditing && (
          <div className="axis-monitor__edit-note">
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
