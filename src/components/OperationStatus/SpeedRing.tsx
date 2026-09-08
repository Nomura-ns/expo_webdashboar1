// SpeedRing.tsx
//
// 軸モニタの左右外側に置く、速度（MAX比）用の円形ゲージ。
// 稼働率ドーナツ(UtilizationRateDisplay)とは見た目の役割が違うため別コンポーネントにした。
// 上に「速度」ラベル、リング中央には数値のみ（%記号なし）を表示するコンパクト仕様。

interface Props {
  value: number // 0-100
  color: string
}

const TRACK_COLOR = 'var(--border-soft, #2a3650)'

export default function SpeedRing({ value, color }: Props) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className="speed-ring">
      <div className="speed-ring__label">速度</div>
      <div className="speed-ring__circle">
        <svg viewBox="0 0 100 100">
          <circle
            cx={50}
            cy={50}
            r={40}
            className="speed-ring__track"
            style={{ stroke: TRACK_COLOR }}
            pathLength={100}
          />
          <circle
            cx={50}
            cy={50}
            r={40}
            className="speed-ring__value"
            style={{ stroke: color, strokeDasharray: `${clamped} ${100 - clamped}` }}
            pathLength={100}
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="speed-ring__number" style={{ color }}>
          {clamped}
        </div>
      </div>
    </div>
  )
}
