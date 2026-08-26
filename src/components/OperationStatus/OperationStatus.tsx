// OperationStatus.tsx
import { useState } from 'react'
import PanelFrame from '../common/PanelFrame'
import type { Theme } from '../../types'

import RobotJointCallout, {
  type JointPosition,
  type ChipPosition,
  type ChipLayout,
} from './RobotJointCallout'
import CycleTimeDisplay from './CycleTimeDisplay'

import './OperationStatus.css'

export interface MotorStat {
  speed: number
  torque: number
}

export interface RobotStat {
  motors: MotorStat[] // 長さ6を想定（A-1〜A-6 / B-1〜B-6）
  imageUrl?: string
}

interface OperationStatusProps {
  theme: Theme
  robotA: RobotStat
  robotB: RobotStat
  cycleTime: number
  isEditing: boolean
  onEditingChange: (value: boolean) => void
}

// 軸(1〜6)の画像上の初期位置（%）。実際に差し替える画像に合わせて微調整してください。
const DEFAULT_JOINT_POSITIONS: JointPosition[] = [
  { axis: 1, x: 58, y: 82 },
  { axis: 2, x: 68, y: 49 },
  { axis: 3, x: 71, y: 35 },
  { axis: 4, x: 62, y: 26 },
  { axis: 5, x: 44, y: 19 },
  { axis: 6, x: 26, y: 21 },
]

// チップ（速度・トルク表示）の初期位置（%、ラッパー全体基準）
const DEFAULT_CHIP_POSITIONS: ChipPosition[] = [
  { axis: 1, x: 28, y: 92 },
  { axis: 2, x: 72, y: 92 },
  { axis: 3, x: 94, y: 64 },
  { axis: 4, x: 94, y: 36 },
  { axis: 5, x: 72, y: 6 },
  { axis: 6, x: 28, y: 6 },
]

type RobotKey = 'A' | 'B'

export default function OperationStatus({ theme, robotA, robotB, cycleTime, isEditing, onEditingChange, }: OperationStatusProps) {
  // A・Bそれぞれ独立して動かせるように分離
  const [jointPositionsA, setJointPositionsA] = useState<JointPosition[]>(DEFAULT_JOINT_POSITIONS)
  const [jointPositionsB, setJointPositionsB] = useState<JointPosition[]>(DEFAULT_JOINT_POSITIONS)
  const [chipPositionsA, setChipPositionsA] = useState<ChipPosition[]>(DEFAULT_CHIP_POSITIONS)
  const [chipPositionsB, setChipPositionsB] = useState<ChipPosition[]>(DEFAULT_CHIP_POSITIONS)
  const [chipLayout, setChipLayout] = useState<ChipLayout>('row2')

  // 編集パネルで今どちらのロボットを編集中か（タブ切り替え）
  const [selectedRobot, setSelectedRobot] = useState<RobotKey>('A')

  const resetAxis = (robot: RobotKey, axis: number) => {
    const defJoint = DEFAULT_JOINT_POSITIONS.find((d) => d.axis === axis)
    const defChip = DEFAULT_CHIP_POSITIONS.find((d) => d.axis === axis)
    const setJointPositions = robot === 'A' ? setJointPositionsA : setJointPositionsB
    const setChipPositions = robot === 'A' ? setChipPositionsA : setChipPositionsB
    if (defJoint) setJointPositions((prev) => prev.map((p) => (p.axis === axis ? defJoint : p)))
    if (defChip) setChipPositions((prev) => prev.map((p) => (p.axis === axis ? defChip : p)))
  }

  const resetAllRobot = (robot: RobotKey) => {
    if (robot === 'A') {
      setJointPositionsA(DEFAULT_JOINT_POSITIONS)
      setChipPositionsA(DEFAULT_CHIP_POSITIONS)
    } else {
      setJointPositionsB(DEFAULT_JOINT_POSITIONS)
      setChipPositionsB(DEFAULT_CHIP_POSITIONS)
    }
  }

  const resetAll = () => {
    resetAllRobot('A')
    resetAllRobot('B')
  }

  const currentJointPositions = selectedRobot === 'A' ? jointPositionsA : jointPositionsB

  return (
    <PanelFrame className={`op-status op-status--${theme}`}>
      <div className={`op-status__layout${isEditing ? ' is-editing' : ''}`}>
        <div className="op-status__main">
          {/* サイクルタイム（A・B合算）：左上にコンパクト表示 */}
          <div className="op-status__cycle-corner">
            <div className="op-status__title op-status__title--inline">サイクルタイム</div>
            <CycleTimeDisplay seconds={cycleTime} />
          </div>

          {/* ロボットA/B：画像 + 軸ごとの速度・トルクチップ（引き出し線付き・自由配置） */}
          <div className="op-status__row">
            <div className="op-status__card">
              {/* タイトルをクリックすると編集パネル側のタブも連動して切り替わる */}
              <div
                className={`op-status__title${isEditing ? ' op-status__title--selectable' : ''}${isEditing && selectedRobot === 'A' ? ' is-selected' : ''}`}
                onClick={() => isEditing && setSelectedRobot('A')}
                role={isEditing ? 'button' : undefined}
                tabIndex={isEditing ? 0 : undefined}
              >
                ロボットA 速度・トルク
              </div>
              <RobotJointCallout
                prefix="A"
                imageUrl={robotA.imageUrl}
                motors={robotA.motors}
                jointPositions={jointPositionsA}
                chipPositions={chipPositionsA}
                chipLayout={chipLayout}
                isEditing={isEditing}
                onJointPositionsChange={setJointPositionsA}
                onChipPositionsChange={setChipPositionsA}
              />
            </div>
            <div className="op-status__card">
              <div
                className={`op-status__title${isEditing ? ' op-status__title--selectable' : ''}${isEditing && selectedRobot === 'B' ? ' is-selected' : ''}`}
                onClick={() => isEditing && setSelectedRobot('B')}
                role={isEditing ? 'button' : undefined}
                tabIndex={isEditing ? 0 : undefined}
              >
                ロボットB 速度・トルク
              </div>
              <RobotJointCallout
                prefix="B"
                imageUrl={robotB.imageUrl}
                motors={robotB.motors}
                jointPositions={jointPositionsB}
                chipPositions={chipPositionsB}
                chipLayout={chipLayout}
                isEditing={isEditing}
                onJointPositionsChange={setJointPositionsB}
                onChipPositionsChange={setChipPositionsB}
              />
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="op-status__edit-panel">
            <div className="op-status__edit-panel-scroll">
              {/* 編集モードトグル（設定パネルと同期） */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <span style={{ fontSize: '14px', color: theme.text }}>編集モード</span>

                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                  <input
                    type="checkbox"
                    checked={isEditing}
                    onChange={(e) => onEditingChange(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: isEditing ? theme.accent : '#ccc',
                      borderRadius: '24px',
                      transition: '0.2s',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        height: '18px',
                        width: '18px',
                        left: isEditing ? '23px' : '3px',
                        bottom: '3px',
                        backgroundColor: '#fff',
                        borderRadius: '50%',
                        transition: '0.2s',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                      }}
                    />
                  </span>
                </label>

                <span style={{ fontSize: '13px', color: theme.text }}>
                  {isEditing ? 'ON' : 'OFF'}
                </span>
              </div>

              <section className="op-status__panel-section">
                <h3>チップ表示</h3>
                <div className="op-status__edit-group">
                  {(['row2', 'row3'] as ChipLayout[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      className={`op-status__chip-opt${chipLayout === l ? ' is-active' : ''}`}
                      onClick={() => setChipLayout(l)}
                    >
                      {l === 'row2' ? '2段構成（ラベル / 速度+トルク）' : '3段構成（ラベル / 速度 / トルク）'}
                    </button>
                  ))}
                </div>
              </section>

              <section className="op-status__panel-section">
                <h3>編集対象ロボット</h3>
                <div className="op-status__robot-tabs">
                  <button
                    type="button"
                    className={`op-status__robot-tab${selectedRobot === 'A' ? ' is-active' : ''}`}
                    onClick={() => setSelectedRobot('A')}
                  >
                    ロボットA
                  </button>
                  <button
                    type="button"
                    className={`op-status__robot-tab${selectedRobot === 'B' ? ' is-active' : ''}`}
                    onClick={() => setSelectedRobot('B')}
                  >
                    ロボットB
                  </button>
                </div>
              </section>

              <section className="op-status__panel-section">
                <h3>ロボット{selectedRobot}：軸ごとの位置</h3>
                <div className="op-status__edit-group">
                  {currentJointPositions.map((j) => (
                    <div key={j.axis} className="op-status__axis-row">
                      <span className="op-status__axis-row-label">軸 {j.axis}</span>
                      <button
                        type="button"
                        className="op-status__axis-reset"
                        onClick={() => resetAxis(selectedRobot, j.axis)}
                      >
                        位置をリセット
                      </button>
                    </div>
                  ))}
                </div>
                <p className="op-status__panel-hint">
                  画像上のマーカーとチップをそれぞれドラッグして自由に配置できます。点線は自動で追従します。A・Bは独立して配置を保持します。
                </p>
                <button type="button" className="op-status__reset-all" onClick={() => resetAllRobot(selectedRobot)}>
                  ロボット{selectedRobot}をすべてリセット
                </button>
              </section>

              <section className="op-status__panel-section">
                <button type="button" className="op-status__reset-all" onClick={resetAll}>
                  すべての位置をリセット（A・B両方）
                </button>
              </section>
            </div>
          </div>
        )}
      </div>
    </PanelFrame>
  )
}