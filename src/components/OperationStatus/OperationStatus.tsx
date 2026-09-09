// OperationStatus.tsx
import { useState } from 'react'
import PanelFrame from '../common/PanelFrame'
import type { Theme } from '../../types'

import RobotHeaderBadge from './RobotHeaderBadge'
import AxisRow, { type AxisRowData } from './AxisRow'
import AxisTable from './AxisTable'
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

  // RB1/RB2カラーの編集（参考：OperationResults.tsxの色編集パターン）
  const [customColors, setCustomColors] = useState<{ rb1?: string; rb2?: string }>({})
  const rb1Color = customColors.rb1 ?? RB1_COLOR
  const rb2Color = customColors.rb2 ?? RB2_COLOR
  const handleResetColors = () => setCustomColors({})

  // 軸1〜6の名称編集（現場の実際の軸名が異なるため、初期名も変更できるようにする）
  const [customAxisNames, setCustomAxisNames] = useState<string[]>([])
  const axisNames = Array.from({ length: axisCount }, (_, i) => customAxisNames[i] ?? `軸${i + 1}`)
  const handleAxisNameChange = (index: number, value: string) => {
    setCustomAxisNames((prev) => {
      const next = [...prev]
      next[index] = value
      return next
    })
  }
  const handleResetAxisNames = () => setCustomAxisNames([])

  const axisRows: AxisRowData[] = Array.from({ length: axisCount }, (_, i) => ({
    axis: i + 1,
    axisLabel: axisNames[i],
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
        <div className="axis-monitor__body">
          <div className="axis-monitor__main-col">
            {/* 上部タイトルバー：タイトル・単位/凡例・現在時刻 */}
            <div className="axis-monitor__topbar" style={{ borderBottomColor: theme.border }}>
              <div className="axis-monitor__title" style={{ color: theme.text }}>
                軸モニタ ー RB1 / RB2 比較
              </div>
              <div className="axis-monitor__unit" style={{ color: theme.subtext }}>
                トルク：定格トルク比 % ／ 速度：MAX比 %
              </div>
              <div className="axis-monitor__legend">
                <span
                  className="axis-monitor__legend-item axis-monitor__legend-item--peak"
                  style={{ color: theme.subtext }}
                >
                  <i style={{ borderColor: theme.subtext }} />
                  ピーク値
                </span>
                <span
                  className="axis-monitor__legend-item axis-monitor__legend-item--threshold"
                  style={{ color: theme.subtext }}
                >
                  <i style={{ borderColor: WARN_COLOR }} />
                  しきい値近接（{THRESHOLD}%〜）
                </span>
              </div>
              <LiveClock />
            </div>

            {/* RB1/RB2の稼働率バッジ＋中央見出し
               ※稼働率バッジは、それぞれRB1/RB2の速度ゲージの列（左端／右端）の真上に
                 くるようgrid-columnで明示的に位置合わせしている（従来は中央寄りにずれていた） */}
            <div className="axis-monitor__header-row">
              <div className="axis-monitor__header-rb1">
                <RobotHeaderBadge
                  label="RB1"
                  colorKey="RB1"
                  color={rb1Color}
                  utilizationRate={robotRB1.utilizationRate}
                  align="left"
                  layout="stacked"
                  textColor={rb1Color}
                  captionColor={theme.subtext}
                />
              </div>
              <div className="axis-monitor__header-center">
                <div className="axis-monitor__header-center-title" style={{ color: theme.text }}>
                  軸別
                </div>
                <div className="axis-monitor__header-center-caption" style={{ color: theme.subtext }}>
                  トルク・速度
                </div>
              </div>
              <div className="axis-monitor__header-rb2">
                <RobotHeaderBadge
                  label="RB2"
                  colorKey="RB2"
                  color={rb2Color}
                  utilizationRate={robotRB2.utilizationRate}
                  align="right"
                  layout="stacked"
                  textColor={rb2Color}
                  captionColor={theme.subtext}
                />
              </div>
            </div>

            {/* 軸1〜6：モニタ表示（グリッド＋ゲージ）。モバイル幅ではCSSで非表示にする */}
            <div className="axis-monitor__rows">
              {axisRows.map((row) => (
                <AxisRow
                  key={row.axis}
                  data={row}
                  threshold={THRESHOLD}
                  rb1Color={rb1Color}
                  rb2Color={rb2Color}
                  theme={theme}
                />
              ))}
            </div>

            {/* モバイル表示：グラフ／ゲージの代わりに表形式（横スクロール可）。
               モニタ幅ではCSSで非表示にする */}
            <AxisTable
              rows={axisRows}
              threshold={THRESHOLD}
              rb1Color={rb1Color}
              rb2Color={rb2Color}
              theme={theme}
            />

            {/* 下部の補足 */}
            <div
              className="axis-monitor__footer"
              style={{ borderTopColor: theme.border, color: theme.subtext }}
            >
              <span>棒グラフ：現在トルク%（内側＝軸ラベル側が現在値）</span>
              <span>異常しきい値{THRESHOLD}%を超えると赤破線に接近</span>
              <span>データ更新：現場PLC同期</span>
            </div>
          </div>

          {/* 編集パネル：RB1/RB2カラーと軸名を変更可能（モニタ・モバイル共通） */}
          {isEditing && (
            <div
              className="axis-monitor__edit-panel"
              style={{ background: theme.headerBg, borderColor: theme.border }}
            >
              <div className="axis-monitor__edit-panel-scroll">
                <section className="axis-monitor__panel-section">
                  <h3 style={{ color: theme.text }}>ロボットカラー</h3>
                  <div className="axis-monitor__edit-group">
                    <label className="axis-monitor__color-row">
                      <span style={{ color: theme.subtext }}>RB1</span>
                      <input
                        type="color"
                        value={rb1Color}
                        onChange={(e) => setCustomColors((prev) => ({ ...prev, rb1: e.target.value }))}
                      />
                    </label>
                    <label className="axis-monitor__color-row">
                      <span style={{ color: theme.subtext }}>RB2</span>
                      <input
                        type="color"
                        value={rb2Color}
                        onChange={(e) => setCustomColors((prev) => ({ ...prev, rb2: e.target.value }))}
                      />
                    </label>
                    <button
                      type="button"
                      className="axis-monitor__panel-reset"
                      style={{ borderColor: theme.border, color: theme.subtext }}
                      onClick={handleResetColors}
                    >
                      色をリセット
                    </button>
                  </div>
                </section>

                <section className="axis-monitor__panel-section">
                  <h3 style={{ color: theme.text }}>軸の名称</h3>
                  <p className="axis-monitor__hint" style={{ color: theme.subtext }}>
                    現場の実際の軸名に合わせて変更できます。
                  </p>
                  <div className="axis-monitor__edit-group">
                    {axisNames.map((name, i) => (
                      <label key={i} className="axis-monitor__color-row">
                        <span style={{ color: theme.subtext }}>軸{i + 1}</span>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => handleAxisNameChange(i, e.target.value)}
                          style={{ borderColor: theme.border, color: theme.text }}
                        />
                      </label>
                    ))}
                    <button
                      type="button"
                      className="axis-monitor__panel-reset"
                      style={{ borderColor: theme.border, color: theme.subtext }}
                      onClick={handleResetAxisNames}
                    >
                      名称をリセット
                    </button>
                  </div>
                </section>

                <button
                  type="button"
                  className="axis-monitor__panel-reset"
                  style={{ borderColor: theme.border, color: theme.subtext }}
                  onClick={() => onEditingChange(false)}
                >
                  編集モードを終了
                </button>
              </div>
            </div>
          )}
        </div>

        <img src={qrUrl} alt="QRコード" className="axis-monitor__qr" />
      </div>
    </PanelFrame>
  )
}
