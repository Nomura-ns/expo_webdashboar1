// TorqueBar.tsx
//
// 軸モニタ中央のピラミッド表示用、片側（RB1 or RB2）のトルクバー1本分。
// side='left' はRB1（軸ラベル側=右に寄せて描画。値が増えるほど左へ伸びる）
// side='right' はRB2（軸ラベル側=左に寄せて描画。値が増えるほど右へ伸びる）

import type { CSSProperties } from 'react'
import { WARN_COLOR } from './robotColors'

interface Props {
  side: 'left' | 'right'
  value: number
  peak: number
  color: string
  threshold: number
}

const NORMAL_PEAK_COLOR = 'var(--text-secondary, #8a97ac)'

function pct(v: number) {
  return Math.min(100, Math.max(0, v))
}

export default function TorqueBar({ side, value, peak, color, threshold }: Props) {
  const isWarn = peak >= threshold
  const peakColor = isWarn ? WARN_COLOR : NORMAL_PEAK_COLOR
  const anchorProp = side === 'left' ? 'right' : 'left'

  const fillStyle: CSSProperties = {
    width: `${pct(value)}%`,
    [anchorProp]: 0,
    background: color,
    justifyContent: side === 'left' ? 'flex-end' : 'flex-start',
  } as CSSProperties

  const peakStyle: CSSProperties = { [anchorProp]: `${pct(peak)}%` } as CSSProperties
  const thresholdStyle: CSSProperties = { [anchorProp]: `${pct(threshold)}%` } as CSSProperties

  return (
    <div className={`torque-bar torque-bar--${side}`}>
      {/* しきい値の目安線（常時薄く表示） */}
      <div className="torque-bar__threshold-tick" style={thresholdStyle} />

      <div className="torque-bar__track">
        <div className="torque-bar__fill" style={fillStyle}>
          <span className="torque-bar__value">{value}%</span>
        </div>
      </div>

      {/* ピーク目盛り線＋ラベル（バー上の余白内） */}
      <div className="torque-bar__peak-tick" style={{ ...peakStyle, borderColor: peakColor }} />
      <span className="torque-bar__peak-label" style={{ ...peakStyle, color: peakColor }}>
        peak {peak}%
      </span>
    </div>
  )
}
