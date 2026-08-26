// RobotJointCallout.tsx
//
// ロボット画像上の軸マーカー(①〜⑥)と、速度・トルクを表示するチップを
// どちらも自由な位置にドラッグ配置できるコンポーネント。
// マーカーは画像に対する%座標、チップはラッパー全体に対する%座標で管理し、
// 位置が変わるたびに引き出し線（点線）を再計算して結び直します。
//
// 使い方:
//   <RobotJointCallout
//     prefix="A"
//     imageUrl={robotA.imageUrl}
//     motors={robotA.motors}
//     jointPositions={jointPositions}
//     chipPositions={chipPositions}
//     chipLayout={chipLayout}
//     isEditing={isEditing}
//     onJointPositionsChange={setJointPositions}
//     onChipPositionsChange={setChipPositions}
//   />

import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

export interface MotorStat {
  speed: number
  torque: number
}

/** 互換のため残していますが、自由配置になったため現在は未使用（初期値の目安にのみ利用可） */
export type CalloutSlot = 'top1' | 'top2' | 'right1' | 'right2' | 'bottom1' | 'bottom2'

/** チップ内表示のレイアウト。2段: ラベル / 速度+トルク　3段: ラベル / 速度 / トルク */
export type ChipLayout = 'row2' | 'row3'

export interface JointPosition {
  /** 1〜6。motors配列のインデックス+1と対応 */
  axis: number
  /** 画像幅に対する割合 (0-100) */
  x: number
  /** 画像高さに対する割合 (0-100) */
  y: number
  slot?: CalloutSlot
}

export interface ChipPosition {
  /** 1〜6。motors配列のインデックス+1と対応 */
  axis: number
  /** ラッパー幅に対する割合 (0-100) */
  x: number
  /** ラッパー高さに対する割合 (0-100) */
  y: number
}

interface Props {
  prefix: string // 'A' | 'B'
  imageUrl?: string
  motors: MotorStat[] // 長さ6想定
  jointPositions: JointPosition[] // 長さ6想定、axis:1-6
  chipPositions: ChipPosition[] // 長さ6想定、axis:1-6
  chipLayout: ChipLayout
  /** 編集モード中のみマーカー・チップをドラッグ移動可能にする */
  isEditing: boolean
  onJointPositionsChange: (positions: JointPosition[]) => void
  onChipPositionsChange: (positions: ChipPosition[]) => void
}

interface PathInfo {
  axis: number
  d: string
}

// ドラッグ時の可動範囲（枠からはみ出しすぎないようクランプ）
const DOT_MIN = 4
const DOT_MAX = 96
const CHIP_MIN = 3
const CHIP_MAX = 97

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

export default function RobotJointCallout({
  prefix,
  imageUrl,
  motors,
  jointPositions,
  chipPositions,
  chipLayout,
  isEditing,
  onJointPositionsChange,
  onChipPositionsChange,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const imgBoxRef = useRef<HTMLDivElement>(null)
  const chipRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const [paths, setPaths] = useState<PathInfo[]>([])
  const [activeAxis, setActiveAxis] = useState<number | null>(null)

  const draggingDot = useRef<number | null>(null)
  const draggingChip = useRef<number | null>(null)

  // 軸マーカー(startX/Y) → チップ(endX/Y) の引き出し線を、
  // 画像中心から見たチップの方向（上下 or 左右）に応じて自然な曲線でつなぐ
  const recompute = () => {
    const wrap = wrapRef.current
    const imgBox = imgBoxRef.current
    if (!wrap || !imgBox) return
    const wrapRect = wrap.getBoundingClientRect()
    const imgRect = imgBox.getBoundingClientRect()
    const imgCenterX = imgRect.left - wrapRect.left + imgRect.width / 2
    const imgCenterY = imgRect.top - wrapRect.top + imgRect.height / 2

    const next = jointPositions.map((j) => {
      const startX = imgRect.left - wrapRect.left + (j.x / 100) * imgRect.width
      const startY = imgRect.top - wrapRect.top + (j.y / 100) * imgRect.height

      const chip = chipRefs.current[j.axis]
      let endX = startX
      let endY = startY

      if (chip) {
        const chipRect = chip.getBoundingClientRect()
        const chipCenterX = chipRect.left - wrapRect.left + chipRect.width / 2
        const chipCenterY = chipRect.top - wrapRect.top + chipRect.height / 2
        const dx = chipCenterX - imgCenterX
        const dy = chipCenterY - imgCenterY

        if (Math.abs(dx) > Math.abs(dy)) {
          // 画像より左右にあるチップ：画像に近い辺の中点に接続
          endX = dx > 0 ? chipRect.left - wrapRect.left : chipRect.right - wrapRect.left
          endY = chipCenterY
        } else {
          // 画像より上下にあるチップ：画像に近い辺の中点に接続
          endX = chipCenterX
          endY = dy > 0 ? chipRect.top - wrapRect.top : chipRect.bottom - wrapRect.top
        }
      }

      let d: string
      if (Math.abs(endX - startX) > Math.abs(endY - startY)) {
        const midX = startX + (endX - startX) * 0.5
        d = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`
      } else {
        const midY = startY + (endY - startY) * 0.5
        d = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`
      }

      return { axis: j.axis, d }
    })
    setPaths(next)
  }

  useEffect(() => {
    recompute()
    const ro = new ResizeObserver(recompute)
    if (wrapRef.current) ro.observe(wrapRef.current)
    window.addEventListener('resize', recompute)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', recompute)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, motors, jointPositions, chipPositions, chipLayout])

  const handleDotPointerDown = (axis: number) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isEditing) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingDot.current = axis
  }

  const handleChipPointerDown = (axis: number) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isEditing) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingChip.current = axis
  }

  const handleWrapPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (draggingDot.current !== null) {
      const imgBox = imgBoxRef.current
      if (imgBox) {
        const rect = imgBox.getBoundingClientRect()
        const axis = draggingDot.current
        const x = clamp(((e.clientX - rect.left) / rect.width) * 100, DOT_MIN, DOT_MAX)
        const y = clamp(((e.clientY - rect.top) / rect.height) * 100, DOT_MIN, DOT_MAX)
        onJointPositionsChange(jointPositions.map((j) => (j.axis === axis ? { ...j, x, y } : j)))
      }
    }
    if (draggingChip.current !== null) {
      const wrap = wrapRef.current
      if (wrap) {
        const rect = wrap.getBoundingClientRect()
        const axis = draggingChip.current
        const x = clamp(((e.clientX - rect.left) / rect.width) * 100, CHIP_MIN, CHIP_MAX)
        const y = clamp(((e.clientY - rect.top) / rect.height) * 100, CHIP_MIN, CHIP_MAX)
        onChipPositionsChange(chipPositions.map((c) => (c.axis === axis ? { ...c, x, y } : c)))
      }
    }
  }

  const handleWrapPointerUp = () => {
    draggingDot.current = null
    draggingChip.current = null
  }

  // 編集モード中はドラッグと衝突するのでクリック選択は無効。通常表示中はタップ/クリックでガラスUIをトグル
  const handleChipClick = (axis: number) => () => {
    if (isEditing) return
    setActiveAxis((prev) => (prev === axis ? null : axis))
  }

  if (!motors || motors.length === 0) {
    return <div className="robot-callout__empty">データ取得中...</div>
  }

  return (
    <div
      className={`robot-callout${isEditing ? ' is-editing' : ''}`}
      ref={wrapRef}
      onPointerMove={handleWrapPointerMove}
      onPointerUp={handleWrapPointerUp}
      onPointerLeave={handleWrapPointerUp}
    >
      <div className="robot-callout__image" ref={imgBoxRef}>
        {imageUrl ? (
          <img src={imageUrl} alt={`ロボット${prefix}`} draggable={false} />
        ) : (
          <div className="robot-callout__image-placeholder">3D画像</div>
        )}
        {jointPositions.map((j) => (
          <div
            key={j.axis}
            className={`robot-callout__dot${activeAxis === j.axis ? ' is-active' : ''}${
              isEditing ? ' is-draggable' : ''
            }`}
            style={{ left: `${j.x}%`, top: `${j.y}%` }}
            onPointerDown={handleDotPointerDown(j.axis)}
            onMouseEnter={() => !isEditing && setActiveAxis(j.axis)}
            onMouseLeave={() => !isEditing && setActiveAxis(null)}
          >
            {j.axis}
          </div>
        ))}
      </div>

      {jointPositions.map((j) => {
        const m = motors[j.axis - 1]
        const pos = (chipPositions ?? []).find((c) => c.axis === j.axis)
        if (!m || !pos) return null
        return (
          <div
            key={j.axis}
            ref={(el) => (chipRefs.current[j.axis] = el)}
            className={`robot-callout__chip robot-callout__chip--${chipLayout}${
              activeAxis === j.axis ? ' is-active' : ''
            }${isEditing ? ' is-draggable' : ''}`}
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            onPointerDown={handleChipPointerDown(j.axis)}
            onMouseEnter={() => !isEditing && setActiveAxis(j.axis)}
            onMouseLeave={() => !isEditing && setActiveAxis(null)}
            onClick={handleChipClick(j.axis)}
          >
            <span className="robot-callout__chip-label">
              {prefix}-{j.axis}
            </span>
            <span className="robot-callout__chip-vals">
              <span className="robot-callout__chip-val robot-callout__chip-val--speed">
                {m.speed}
                <span className="robot-callout__chip-unit">mm/s</span>
              </span>
              <span className="robot-callout__chip-val robot-callout__chip-val--torque">
                {m.torque}
                <span className="robot-callout__chip-unit">%</span>
              </span>
            </span>
          </div>
        )
      })}

      <svg className="robot-callout__svg">
        {paths.map((p) => (
          <path key={p.axis} d={p.d} className={activeAxis === p.axis ? 'is-active' : ''} />
        ))}
      </svg>
    </div>
  )
}