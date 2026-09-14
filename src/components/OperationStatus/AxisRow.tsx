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
import { RB1_COLOR, RB2_COLOR, WARN_COLOR } from './robotColors'
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
  /** 80%でON、70%以下を3秒維持してOFFする軸警告状態 */
  isWarning?: boolean
}

export default function AxisRow({
  data,
  threshold,
  rb1Color = RB1_COLOR,
  rb2Color = RB2_COLOR,
  theme,
  isWarning = false,
}: Props) {
  const { axis, axisLabel, rb1, rb2 } = data
  const labelColor = theme?.text
  const speedLabelColor = theme?.subtext

  return (
    <div className={`axis-row${isWarning ? ' axis-row--warning' : ''}`}>
      <SpeedBar value={rb1.speed} color={rb1Color} valueSide="right" />

      <TorqueBar
        side="left"
        value={rb1.torqueValue}
        peak={rb1.torquePeak}
        color={isWarning ? WARN_COLOR : rb1Color}
        threshold={threshold}
        mutedColor={speedLabelColor}
      />

      <div className="axis-row__center">
        <div className="axis-row__icon-box" style={{ borderColor: `${labelColor ?? '#9aa4b2'}55` }}>
          {/* public/{軸名}.png を軸アイコンとして表示。軸名は編集パネルで変更可能なため、
             画像が用意されていない軸名の場合はimgを非表示にして文字ラベルのみ残す */}
          <img
            className="axis-row__icon-img"
            src={`/${axisLabel ?? `軸${axis}`}.png`}
            alt=""
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <div className="axis-row__label" style={{ color: labelColor }}>
            {axisLabel ?? `軸${axis}`}
          </div>
        </div>
      </div>

      <TorqueBar
        side="right"
        value={rb2.torqueValue}
        peak={rb2.torquePeak}
        color={isWarning ? WARN_COLOR : rb2Color}
        threshold={threshold}
        mutedColor={speedLabelColor}
      />

      <SpeedBar value={rb2.speed} color={rb2Color} valueSide="left" />
    </div>
  )
}
