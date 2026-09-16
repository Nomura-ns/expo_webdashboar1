// OperationStatus.tsx
import { useEffect, useRef, useState } from 'react'
import PanelFrame from '../common/PanelFrame'
import type { Theme } from '../../types'

import RobotHeaderBadge from './RobotHeaderBadge'
import AxisRow, { type AxisRowData } from './AxisRow'
import AxisTable from './AxisTable'
import AverageSpeedGauge from './AverageSpeedGauge'
import { RB1_COLOR, RB2_COLOR } from './robotColors'

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
const WARNING_RELEASE_THRESHOLD = 70
const WARNING_RELEASE_DELAY_MS = 3000

export default function OperationStatus({
  theme,
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

  const [warningAxes, setWarningAxes] = useState<boolean[]>(() => Array(axisCount).fill(false))
  const releaseTimersRef = useRef<Array<number | undefined>>([])
  const latestRowsRef = useRef(axisRows)
  latestRowsRef.current = axisRows

  useEffect(() => {
    setWarningAxes((previous) => {
      const next = Array.from({ length: axisCount }, (_, i) => previous[i] ?? false)
      let changed = false

      next.forEach((isWarning, index) => {
        const row = axisRows[index]
        if (!row) return
        const values = [
          row.rb1.torqueValue,
          row.rb2.torqueValue,
        ]
        const reachedWarning = values.some((value) => value >= THRESHOLD)
        const belowReleaseThreshold = values.every((value) => value <= WARNING_RELEASE_THRESHOLD)

        if (reachedWarning) {
          if (releaseTimersRef.current[index] !== undefined) {
            window.clearTimeout(releaseTimersRef.current[index])
            releaseTimersRef.current[index] = undefined
          }
          if (!isWarning) {
            next[index] = true
            changed = true
          }
        } else if (isWarning && belowReleaseThreshold && releaseTimersRef.current[index] === undefined) {
          releaseTimersRef.current[index] = window.setTimeout(() => {
            const latest = latestRowsRef.current[index]
            if (!latest) return
            const latestValues = [
              latest.rb1.torqueValue,
              latest.rb2.torqueValue,
            ]
            if (latestValues.every((value) => value <= WARNING_RELEASE_THRESHOLD)) {
              setWarningAxes((current) => {
                const released = [...current]
                released[index] = false
                return released
              })
            }
            releaseTimersRef.current[index] = undefined
          }, WARNING_RELEASE_DELAY_MS)
        }
      })

      return changed ? next : previous
    })
  }, [axisCount, axisRows])

  useEffect(() => () => {
    releaseTimersRef.current.forEach((timer) => {
      if (timer !== undefined) window.clearTimeout(timer)
    })
  }, [])

  // 6軸平均トルク（トルク%のみの平均）。履歴は持たず現在値のみを
  // ガラス調ゲージで表示する（各トルクグラフ群の直上・モニタ版のみ）
  const rb1AvgTorque = axisRows.reduce((sum, r) => sum + r.rb1.torqueValue, 0) / axisRows.length
  const rb2AvgTorque = axisRows.reduce((sum, r) => sum + r.rb2.torqueValue, 0) / axisRows.length

  // モバイルRB切替：選択中の側を強調し、同じ側を再タップすると両方を通常表示に戻す
  const [selectedMobileRB, setSelectedMobileRB] = useState<RobotKey | null>(null)
  const handleMobileRBToggle = (rb: RobotKey) => {
    setSelectedMobileRB((prev) => (prev === rb ? null : rb))
  }

  return (
    <PanelFrame className={`op-status op-status--${theme}`}>
      <div className="axis-monitor">
        <div className="axis-monitor__body">
          <div className="axis-monitor__main-col">
            {/* RB1/RB2ラベルは枠付きの箱(boxed)に変更し、縦に間延びさせず
               同じ行の隣に平均速度ゲージを並べる（旧・speed-gauge-rowはここに統合）。
               中央列にはトルクバー群の見出しとなる「トルク」バッジを配置する。 */}
            <div className="axis-monitor__header-row">
              <div className="axis-monitor__header-rb1">
                <RobotHeaderBadge
                  label="RB1"
                  colorKey="RB1"
                  color={rb1Color}
                  utilizationRate={robotRB1.utilizationRate}
                  align="left"
                  layout="boxed"
                  textColor={rb1Color}
                  captionColor={theme.subtext}
                  onClick={() => handleMobileRBToggle('RB1')}
                  dimmed={selectedMobileRB === 'RB2'}
                />
                <AverageSpeedGauge
                  value={rb1AvgTorque}
                  color={rb1Color}
                  label="平均トルク"
                  reverse
                  iconOnRight
                />
              </div>

              <div className="axis-monitor__header-rb2">
                <AverageSpeedGauge value={rb2AvgTorque} color={rb2Color} label="平均トルク" />
                <RobotHeaderBadge
                  label="RB2"
                  colorKey="RB2"
                  color={rb2Color}
                  utilizationRate={robotRB2.utilizationRate}
                  align="right"
                  layout="boxed"
                  textColor={rb2Color}
                  captionColor={theme.subtext}
                  onClick={() => handleMobileRBToggle('RB2')}
                  dimmed={selectedMobileRB === 'RB1'}
                />
              </div>
            </div>

            {/* 「速度」の文字は各軸行で繰り返さず、ここで1か所だけ表示する
               （RB1側＝1列目／RB2側＝5列目。軸ごとのSpeedBarはアイコンのみ） */}
            <div className="axis-monitor__speed-caption-row">
              <span className="axis-monitor__speed-caption axis-monitor__speed-caption--rb1" style={{ color: theme.text }}>
                速度 (deg/s)
              </span>
              <div className="axis-monitor__header-center">
                <div
                  className="axis-monitor__torque-badge"
                  style={{ borderColor: `${theme.text}55`, color: theme.text }}
                >
                  トルク (N·m)
                </div>
              </div>
              <span className="axis-monitor__speed-caption axis-monitor__speed-caption--rb2" style={{ color: theme.text }}>
                速度 (deg/s)
              </span>
            </div>

            {/* 軸1〜6：モニタ表示（グリッド＋ゲージ）。モバイル幅ではCSSで非表示にする */}
            <div className="axis-monitor__rows">
              {axisRows.map((row) => (
                <AxisRow
                  key={row.axis}
                  data={row}
                  threshold={THRESHOLD}
                  isWarning={warningAxes[row.axis - 1] ?? false}
                  rb1Color={rb1Color}
                  rb2Color={rb2Color}
                  theme={theme}
                />
              ))}
            </div>

            {/* モバイル表示：平均トルクカード、RB切替、軸別データ表 */}
            <div className="axis-monitor__mobile-average-torque-label" style={{ color: theme.text }}>
              平均トルク
            </div>
            <div className="axis-monitor__mobile-average-torque">
              <div
                className={`axis-monitor__mobile-torque-card${selectedMobileRB === 'RB2' ? ' is-dimmed' : ''}`}
                style={{ borderColor: rb1Color, color: rb1Color }}
              >
                <strong>{Math.round(rb1AvgTorque)}%</strong>
              </div>
              <div
                className={`axis-monitor__mobile-torque-card${selectedMobileRB === 'RB1' ? ' is-dimmed' : ''}`}
                style={{ borderColor: rb2Color, color: rb2Color }}
              >
                <strong>{Math.round(rb2AvgTorque)}%</strong>
              </div>
            </div>

            <AxisTable
              rows={axisRows}
              threshold={THRESHOLD}
              rb1Color={rb1Color}
              rb2Color={rb2Color}
              theme={theme}
              warningAxes={warningAxes}
              selectedRB={selectedMobileRB}
            />

          </div>

          {/* 編集パネル：RB1/RB2カラーと軸名を変更可能（モニタ・モバイル共通） */}
          {isEditing && (
            <div
              className="axis-monitor__edit-panel"
              style={{ background: theme.headerBg, borderColor: theme.border }}
            >
              <div className="axis-monitor__edit-panel-scroll">
                {/* 編集モードのON/OFFはこのパネル先頭のトグルで切り替える（他ページと統一） */}
                <label className="axis-monitor__panel-toggle-row" style={{ color: theme.text }}>
                  <span>編集モード</span>
                  <span className={`toggle-switch${isEditing ? ' toggle-switch--on' : ''}`}>
                    <input
                      type="checkbox"
                      className="toggle-switch__input"
                      checked={isEditing}
                      onChange={(e) => onEditingChange(e.target.checked)}
                      aria-label="編集モードの切替"
                    />
                    <span
                      className="toggle-switch__track"
                      style={{ background: isEditing ? theme.accent : theme.border }}
                    >
                      <span className="toggle-switch__thumb" />
                    </span>
                  </span>
                  <span className="axis-monitor__panel-toggle-state" style={{ color: theme.subtext }}>
                    {isEditing ? 'ON' : 'OFF'}
                  </span>
                </label>

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
              </div>
            </div>
          )}
        </div>
      </div>
    </PanelFrame>
  )
}
