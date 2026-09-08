// SpeedGaugeGrid.tsx
//
// 「軸別 速度（MAX比）」パネル。軸(1〜6)ごとにRB1/RB2の半円ゲージを並べる。
// トルク使用率とは別指標（PLC対象外・サンプル値のまま運用中）のため、
// しきい値判定もこのコンポーネント内で速度%に対して独立に行う。
//
// 注: OperationStatus.tsxからは現在このグリッド表示ではなく、軸ごとにトルクと
// まとめて表示するAxisMetricRow経由でSemiGaugeを使う構成に変更したため、
// このコンポーネント自体は現状どこからも呼ばれていない。将来グリッド表示に
// 戻す場合のために残してある。

import SemiGauge from './SemiGauge'
import { RB1_COLOR, RB2_COLOR } from './robotColors'

export interface AxisSpeedRow {
  axis: number
  rb1: number // 0-100 (%、MAX比)
  rb2: number // 0-100 (%、MAX比)
}

interface Props {
  data: AxisSpeedRow[]
  threshold: number
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
