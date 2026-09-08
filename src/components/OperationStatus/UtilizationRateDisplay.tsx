export type UtilizationColorKey = 'RB1' | 'RB2'

interface Props {
  label: string // 例: 'RB1'
  rate: number // 0-100 (%)
  /** リング色（RB1/RB2で色分け）。省略時はRB1色。 */
  colorKey?: UtilizationColorKey
}

// RB1/RB2で色分け（軸別トルク使用率のバー色と統一）
const RING_COLOR: Record<UtilizationColorKey, string> = {
  RB1: '#3b82f6', // 青
  RB2: '#ff9a3d', // 橙
}

const TRACK_COLOR = 'var(--border-soft, #2a3650)'

export default function UtilizationRateDisplay({ label, rate, colorKey = 'RB1' }: Props) {
  const clamped = Math.min(100, Math.max(0, rate))
  const color = RING_COLOR[colorKey]

  return (
    <div className="utilization-donut">
      <div className="utilization-donut__label">{label}</div>
      <div className="utilization-donut__ring">
        <svg viewBox="0 0 100 100">
          <circle
            cx={50}
            cy={50}
            r={40}
            className="utilization-donut__track"
            style={{ stroke: TRACK_COLOR }}
            pathLength={100}
          />
          <circle
            cx={50}
            cy={50}
            r={40}
            className="utilization-donut__value"
            style={{
              stroke: color,
              strokeDasharray: `${clamped} ${100 - clamped}`,
            }}
            pathLength={100}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="utilization-donut__center">
          <span className="utilization-donut__number">{clamped.toFixed(0)}</span>
          <span className="utilization-donut__percent">%</span>
          <span className="utilization-donut__caption">運転</span>
        </div>
      </div>
      <div className="utilization-donut__legend">
        <span>
          <i style={{ background: color }} />
          運転
        </span>
        <span>
          <i style={{ background: TRACK_COLOR }} />
          停止
        </span>
      </div>
    </div>
  )
}
