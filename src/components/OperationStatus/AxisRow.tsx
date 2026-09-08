// AxisRow.tsx
//
// 軸モニタ1行分。[RB1速度リング] [RB1トルクバー] [軸ラベル＋警告] [RB2トルクバー] [RB2速度リング]
// を1行にまとめ、中央の軸ラベルを軸にRB1/RB2を左右対称（ピラミッド型）に表示する。

import TorqueBar from './TorqueBar'
import SpeedRing from './SpeedRing'
import { RB1_COLOR, RB2_COLOR } from './robotColors'

export interface AxisRowData {
  axis: number
  rb1: { torqueValue: number; torquePeak: number; speed: number }
  rb2: { torqueValue: number; torquePeak: number; speed: number }
}

interface Props {
  data: AxisRowData
  threshold: number
}

export default function AxisRow({ data, threshold }: Props) {
  const { axis, rb1, rb2 } = data
  const rb1Warn = rb1.torquePeak >= threshold || rb1.speed >= threshold
  const rb2Warn = rb2.torquePeak >= threshold || rb2.speed >= threshold

  return (
    <div className="axis-row">
      <SpeedRing value={rb1.speed} color={RB1_COLOR} />

      <TorqueBar
        side="left"
        value={rb1.torqueValue}
        peak={rb1.torquePeak}
        color={RB1_COLOR}
        threshold={threshold}
      />

      <div className="axis-row__center">
        <div className="axis-row__warn-slots">
          {rb1Warn && <span className="axis-row__warn">!</span>}
          {rb2Warn && <span className="axis-row__warn">!</span>}
        </div>
        <div className="axis-row__label">軸{axis}</div>
      </div>

      <TorqueBar
        side="right"
        value={rb2.torqueValue}
        peak={rb2.torquePeak}
        color={RB2_COLOR}
        threshold={threshold}
      />

      <SpeedRing value={rb2.speed} color={RB2_COLOR} />
    </div>
  )
}
