// TorqueBar.tsx
//
// 軸モニタ中央のピラミッド表示用、片側（RB1 or RB2）のトルクバー1本分。
// side='left' はRB1（軸ラベル側=右に寄せて描画。値が増えるほど左へ伸びる）
// side='right' はRB2（軸ラベル側=左に寄せて描画。値が増えるほど右へ伸びる）
//
// 変更点：
// ・ピーク値の文字と目盛り線は、背景やRB2の橙色に埋もれない明るい黄色で表示する
// ・バー内の数値ラベルは、編集パネルでRB1/RB2色を任意色に変更しても白文字の
//   視認性が落ちないよう、OperationStatus.css側にtext-shadowを追加してある

import type { CSSProperties } from 'react'
interface Props {
  side: 'left' | 'right'
  value: number
  peak: number
  color: string
  threshold: number
  /** ピークが正常範囲内の場合の目盛り線・ラベル色。省略時は既定のグレー */
  mutedColor?: string
}

function pct(v: number) {
  return Math.min(100, Math.max(0, v))
}

export default function TorqueBar({ side, value, peak, color }: Props) {
  const anchorProp = side === 'left' ? 'right' : 'left'

  const fillStyle: CSSProperties = {
    width: `${pct(value)}%`,
    [anchorProp]: 0,
    background: color,
    justifyContent: side === 'left' ? 'flex-end' : 'flex-start',
  } as CSSProperties

  const peakStyle: CSSProperties = { [anchorProp]: `${pct(peak)}%` } as CSSProperties
  const peakColor = '#ffeb3b'
  const peakLineColor = peakColor

  return (
    <div className={`torque-bar torque-bar--${side}`}>
      <div className="torque-bar__track">
        <div className="torque-bar__fill" style={fillStyle}>
          <span className="torque-bar__value">
            {value}% /
            <span className="torque-bar__peak-value" style={{ color: peakColor }}> {peak}%</span>
          </span>
        </div>
      </div>

      <div className="torque-bar__peak-tick" style={{ ...peakStyle, borderColor: peakLineColor }} />

    </div>
  )
}
