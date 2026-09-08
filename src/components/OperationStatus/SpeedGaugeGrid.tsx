// SpeedGaugeGrid.tsx
//
// 「軸別 速度（MAX比）」パネル。軸(1〜6)ごとにRB1/RB2の半円ゲージを並べる。
// トルク使用率とは別指標（PLC対象外・サンプル値のまま運用中）のため、
// しきい値判定もこのコンポーネント内で速度%に対して独立に行う。

export interface AxisSpeedRow {
  axis: number
  rb1: number // 0-100 (%、MAX比)
  rb2: number // 0-100 (%、MAX比)
}

interface Props {
  data: AxisSpeedRow[]
  threshold: number
}

const RB1_COLOR = '#3b82f6'
const RB2_COLOR = '#ff9a3d'
const TRACK_COLOR = 'var(--border-soft, #2a3650)'

function SemiGauge({ value, color, label }: { value: number; color: string; label: string }) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className="semi-gauge">
      <svg className="semi-gauge__svg" viewBox="0 0 100 58">
        <path d="M 8 50 A 42 42 0 0 1 92 50" className="semi-gauge__track" pathLength={100} />
        <path
          d="M 8 50 A 42 42 0 0 1 92 50"
          className="semi-gauge__value"
          pathLength={100}
          style={{ stroke: color, strokeDasharray: `${clamped} ${100 - clamped}` }}
        />
      </svg>
      <div className="semi-gauge__label" style={{ color }}>
        {label} {clamped}%
      </div>
    </div>
  )
}

export default function SpeedGaugeGrid({ data, threshold }: Props) {
  return (
    <div className="speed-gauge-grid">
      <div className="speed-gauge-grid__header">
        <div className="speed-gauge-grid__title">軸別 速度（MAX比）</div>
        <div className="speed-gauge-grid__note">―トルク使用率とは別指標</div>
      </div>
      <div className="speed-gauge-grid__cards">
        {data.map((row) => {
          const warn = row.rb1 >= threshold || row.rb2 >= threshold
          return (
            <div className="speed-gauge-card" key={row.axis}>
              <div className="speed-gauge-card__title">
                軸{row.axis}
                {warn && <span className="speed-gauge-card__warn">!</span>}
              </div>
              <div className="speed-gauge-card__gauges">
                <SemiGauge value={row.rb1} color={RB1_COLOR} label="R1" />
                <SemiGauge value={row.rb2} color={RB2_COLOR} label="R2" />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { TRACK_COLOR }
