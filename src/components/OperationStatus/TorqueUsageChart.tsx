// TorqueUsageChart.tsx
//
// 「軸別トルク使用率」パネル。人口ピラミッド型のレイアウトで、中心の軸ラベルを挟んで
// 左側にRB1・右側にRB2のバーを鏡合わせに表示する。
// ピーク値のラベルは各バー行の上に確保した余白（padding-top）の中に「線→ラベル」の順で
// 積む形にしており、バー本体・ピーク線・ピークラベルが互いに重ならないようにしている。

import type { CSSProperties } from 'react'

export interface AxisTorqueRow {
  axis: number
  rb1: { value: number; peak: number }
  rb2: { value: number; peak: number }
}

interface Props {
  data: AxisTorqueRow[]
  /** しきい値近接とみなす%（この値以上のピークで警告扱い） */
  threshold: number
}

// 中心(0%)から片側最大100%として計算する
const SCALE_MAX = 100

const RB1_COLOR = '#3b82f6'
const RB2_COLOR = '#ff9a3d'
const WARN_COLOR = '#ff4d4f'
const NORMAL_PEAK_COLOR = 'var(--text-secondary, #8a97ac)'

function pct(v: number) {
  return Math.min(100, Math.max(0, (v / SCALE_MAX) * 100))
}

type Side = 'left' | 'right'

function PyramidSide({
  side,
  value,
  peak,
  color,
  threshold,
}: {
  side: Side
  value: number
  peak: number
  color: string
  threshold: number
}) {
  const isWarn = peak >= threshold
  const peakColor = isWarn ? WARN_COLOR : NORMAL_PEAK_COLOR
  const anchorProp = side === 'left' ? 'right' : 'left'

  const fillStyle: CSSProperties = {
    width: `${pct(value)}%`,
    [anchorProp]: 0,
    background: color,
    justifyContent: side === 'left' ? 'flex-end' : 'flex-start',
  } as CSSProperties

  const peakPosStyle: CSSProperties = { [anchorProp]: `${pct(peak)}%` } as CSSProperties

  return (
    <div className={`torque-pyramid__side torque-pyramid__side--${side}`}>
      {/* しきい値の目安線（この行の高さ分だけ、常時薄く表示） */}
      <div
        className="torque-pyramid__threshold-tick"
        style={{ [anchorProp]: `${pct(threshold)}%` } as CSSProperties}
      />

      <div className="torque-pyramid__track">
        <div className="torque-pyramid__fill" style={fillStyle}>
          <span className="torque-pyramid__value">{value}%</span>
        </div>
      </div>

      {/* ピークの目盛り線：バー上端から少し離れた位置(padding-top内)から始まる */}
      <div
        className="torque-pyramid__peak-tick"
        style={{ ...peakPosStyle, borderColor: peakColor }}
      />
      {/* ピークのラベル：目盛り線よりさらに上（行の最上部）に置き、線と重ならないようにする */}
      <span className="torque-pyramid__peak-label" style={{ ...peakPosStyle, color: peakColor }}>
        peak {peak}%
      </span>
    </div>
  )
}

export default function TorqueUsageChart({ data, threshold }: Props) {
  return (
    <div className="torque-chart">
      <div className="torque-chart__header">
        <div className="torque-chart__title">軸別 トルク使用率</div>
        <div className="torque-chart__legend">
          <span className="torque-chart__legend-item">
            <i style={{ background: RB1_COLOR }} />RB1
          </span>
          <span className="torque-chart__legend-item">
            <i style={{ background: RB2_COLOR }} />RB2
          </span>
          <span className="torque-chart__legend-item torque-chart__legend-item--tick">
            <i style={{ borderColor: NORMAL_PEAK_COLOR }} />ピーク値
          </span>
          <span className="torque-chart__legend-item torque-chart__legend-item--tick">
            <i style={{ borderColor: WARN_COLOR }} />
            しきい値近接（{threshold}%〜）
          </span>
        </div>
        <div className="torque-chart__unit">単位：定格トルク比%</div>
      </div>

      <div className="torque-pyramid">
        {data.map((row) => {
          const warn = row.rb1.peak >= threshold || row.rb2.peak >= threshold
          return (
            <div className="torque-pyramid__row" key={row.axis}>
              <PyramidSide
                side="left"
                value={row.rb1.value}
                peak={row.rb1.peak}
                color={RB1_COLOR}
                threshold={threshold}
              />

              <div className="torque-pyramid__center">
                <span>軸{row.axis}</span>
                {warn && <span className="torque-chart__warn-badge">!</span>}
              </div>

              <PyramidSide
                side="right"
                value={row.rb2.value}
                peak={row.rb2.peak}
                color={RB2_COLOR}
                threshold={threshold}
              />
            </div>
          )
        })}

        {/* 下部の目盛り軸（0% / 50% / 100%、中心から左右対称） */}
        <div className="torque-pyramid__row torque-pyramid__row--axis">
          <div className="torque-pyramid__axis-ticks torque-pyramid__axis-ticks--left">
            <span>100%</span>
            <span>50%</span>
            <span>0%</span>
          </div>
          <div className="torque-pyramid__center" />
          <div className="torque-pyramid__axis-ticks torque-pyramid__axis-ticks--right">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
