// AxisRow.tsx
//
// 軸モニタ1行分。[RB1速度ゲージ] [RB1トルクバー] [軸ラベル＋警告] [RB2トルクバー] [RB2速度ゲージ]
// を1行にまとめ、中央の軸ラベルを軸にRB1/RB2を左右対称（ピラミッド型）に表示する。
//
// 変更点：
// ・速度表示はSpeedRing（円形）からSpeedBar（横長）に変更し、縦方向の圧迫を軽減
// ・RB1/RB2の色は編集パネルで変更できるよう、固定importではなくprops経由で受け取れるようにした
//   （props省略時はrobotColors.tsのデフォルト色にフォールバック）
// ・軸名（軸1〜6）を編集できるよう、data.axisLabelがあればそちらを優先表示する
// ・文字色がthemeによって薄く見えない問題への対応として、theme.text/theme.subtextを
//   ラベル・警告表示に適用できるようにした

import TorqueBar from './TorqueBar'
import SpeedBar from './SpeedBar'
import { RB1_COLOR, RB2_COLOR } from './robotColors'
import type { Theme } from '../../types'

export interface AxisRowData {
  axis: number
  /** 軸の表示名。未指定時は「軸{axis}」を使用（編集パネルでの名称変更に対応） */
  axisLabel?: string
  rb1: { torqueValue: number; torquePeak: number; speed: number }
  rb2: { torqueValue: number; torquePeak: number; speed: number }
}

interface Props {
  data: AxisRowData
  threshold: number
  /** 編集パネルで変更されたRB1色。省略時はRB1_COLOR */
  rb1Color?: string
  /** 編集パネルで変更されたRB2色。省略時はRB2_COLOR */
  rb2Color?: string
  /** 文字色をtheme色に揃えるために使用 */
  theme?: Theme
}

export default function AxisRow({
  data,
  threshold,
  rb1Color = RB1_COLOR,
  rb2Color = RB2_COLOR,
  theme,
}: Props) {
  const { axis, axisLabel, rb1, rb2 } = data
  const rb1Warn = rb1.torquePeak >= threshold || rb1.speed >= threshold
  const rb2Warn = rb2.torquePeak >= threshold || rb2.speed >= threshold
  const labelColor = theme?.text
  const speedLabelColor = theme?.subtext

  return (
    <div className="axis-row">
      <SpeedBar value={rb1.speed} color={rb1Color} labelColor={speedLabelColor} />

      <TorqueBar
        side="left"
        value={rb1.torqueValue}
        peak={rb1.torquePeak}
        color={rb1Color}
        threshold={threshold}
        mutedColor={speedLabelColor}
      />

      <div className="axis-row__center">
        <div className="axis-row__warn-slots">
          {rb1Warn && <span className="axis-row__warn">!</span>}
          {rb2Warn && <span className="axis-row__warn">!</span>}
        </div>
        <div className="axis-row__label" style={{ color: labelColor }}>
          {axisLabel ?? `軸${axis}`}
        </div>
      </div>

      <TorqueBar
        side="right"
        value={rb2.torqueValue}
        peak={rb2.torquePeak}
        color={rb2Color}
        threshold={threshold}
        mutedColor={speedLabelColor}
      />

      <SpeedBar value={rb2.speed} color={rb2Color} labelColor={speedLabelColor} />
    </div>
  )
}
