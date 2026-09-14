// SpeedBar.tsx
//
// 軸モニタの速度（MAX比）表示用ゲージ。
//
// 変更点（再修正）：
// ・毎行に「速度」の文字を繰り返し表示していたのをやめ、アイコン＋ガラス調ゲージのみの
//   表示にした（「速度」の文字は列見出し側に1回だけ表示する運用に変更。
//   OperationStatus.tsx の axis-monitor__speed-caption-row 参照）。
// ・アイコンは汎用の速度計（スピードメーター）アイコンに変更。
// ・数値表示はゲージ内をなぞって移動するバブルではなく、ゲージの外側に固定表示するよう変更。
//   RB1側は中央（軸ラベル）に近い方＝ゲージの右側、RB2側も中央に近い方＝ゲージの左側に置く
//   ことで、軸ラベルを中心にRB1/RB2が左右対称（ピラミッド型）に読めるようにしている。
// ・見た目はAverageSpeedGauge（6軸平均速度ゲージ）と統一感を持たせたガラス調に変更。

interface Props {
  value: number // 0-100
  color: string // RB1_COLOR / RB2_COLOR、または編集パネルでのカスタムカラー
  /** 数値をゲージのどちら側に表示するか。RB1は'right'、RB2は'left'（どちらも軸ラベル側＝中央寄り） */
  valueSide: 'left' | 'right'
  /** trueの場合、ゲージを右端から左向きに満たす */
  reverse?: boolean
  /** 数値の文字色。省略時はcolorをそのまま使用 */
  valueTextColor?: string
  trackColor?: string
}

function clampPct(v: number) {
  return Math.min(100, Math.max(0, v))
}

export default function SpeedBar({ value, color, valueSide, valueTextColor, trackColor, reverse = false }: Props) {
  const clamped = clampPct(value)

  const gauge = (
    <div className="speed-bar__gauge" style={{ borderColor: `${color}55` }}>
      <span className="speed-bar__icon" style={{ color }}>
        {/* 汎用の速度計（スピードメーター）アイコン */}
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 16a8 8 0 1 1 16 0" />
          <path d="M12 16 L16.2 10.4" />
          <circle cx="12" cy="16" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <div className={`speed-bar__track${reverse ? ' speed-bar__track--reverse' : ''}`} style={{ background: trackColor }}>
        <div
          className="speed-bar__fill"
          style={{ width: `${clamped}%`, background: color, color }}
        />
      </div>
    </div>
  )

  const valueEl = (
    <span className="speed-bar__value" style={{ color: valueTextColor ?? color }}>
      {clamped}%
    </span>
  )

  return (
    <div className={`speed-bar speed-bar--${valueSide}`}>
      {valueSide === 'left' ? (
        <>
          {valueEl}
          {gauge}
        </>
      ) : (
        <>
          {gauge}
          {valueEl}
        </>
      )}
    </div>
  )
}
