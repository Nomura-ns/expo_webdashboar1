// SpeedBar.tsx
//
// 軸モニタの速度（MAX比）表示用ゲージ。
// これまでのSpeedRing（円形）は列の高さいっぱいを占有し縦を圧迫していたため、
// 横長のバー型ゲージに変更した。塗り色はRB1/RB2のtheme色（color props）に追従し、
// 文字色もthemeから渡された色を使うことで、テーマによって薄すぎて見えない問題を防ぐ。
//
// 旧SpeedRing.tsxは他所から参照される可能性を考慮し削除せず残してある。

interface Props {
  value: number // 0-100
  color: string // RB1_COLOR / RB2_COLOR、または編集パネルでのカスタムカラー
  /** ラベル（「速度」）の文字色。省略時はtrack上のデフォルト色になる */
  labelColor?: string
  /** 数値バブルの文字色。省略時は白 */
  valueTextColor?: string
  trackColor?: string
}

export default function SpeedBar({
  value,
  color,
  labelColor,
  valueTextColor = '#fff',
  trackColor,
}: Props) {
  const clamped = Math.min(100, Math.max(0, value))

  return (
    <div className="speed-bar">
      <div className="speed-bar__label" style={{ color: labelColor }}>
        速度
      </div>
      <div className="speed-bar__track" style={{ background: trackColor }}>
        <div className="speed-bar__fill" style={{ width: `${clamped}%`, background: color }} />
        <div
          className="speed-bar__bubble"
          style={{ left: `${clamped}%`, background: color, color: valueTextColor }}
        >
          {clamped}
        </div>
      </div>
    </div>
  )
}
