// ArmDiagram.tsx
//
// 「アーム構成」パネル用の簡易アーム図。
// これまでのように実写真+自由配置チップではなく、軸(1〜6)を線で結んだ簡易schematicを表示し、
// 各軸に RB1 / RB2 それぞれの状態ドット（しきい値超過なら赤）を並べて出す。
// ロボット画像自体はRB1・RB2で共通の1台分だが、しきい値の状態はRB1・RB2の2台分を
// 両方表示する（これまでは1台分しか出せていなかった点の対応）。

export interface ArmJointPosition {
  /** 1〜6 */
  axis: number
  /** viewBoxに対する割合 (0-100) */
  x: number
  /** viewBoxに対する割合 (0-100) */
  y: number
}

interface Props {
  jointPositions: ArmJointPosition[]
  /** 軸ごと（index 0 = 軸1）に RB1 / RB2 がしきい値を超えているか */
  warnByAxis: { rb1: boolean; rb2: boolean }[]
}

const RB1_COLOR = '#3b82f6' // 青
const RB2_COLOR = '#ff9a3d' // 橙
const WARN_COLOR = '#ff4d4f' // 赤

export default function ArmDiagram({ jointPositions, warnByAxis }: Props) {
  const sorted = [...jointPositions].sort((a, b) => a.axis - b.axis)
  const linePath = sorted.map((j, i) => `${i === 0 ? 'M' : 'L'} ${j.x} ${j.y}`).join(' ')

  return (
    <div className="arm-diagram">
      <svg className="arm-diagram__svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {/* アーム本体（軸を結ぶ太いライン） */}
        <path d={linePath} className="arm-diagram__link" />

        {sorted.map((j) => {
          const warn = warnByAxis[j.axis - 1] ?? { rb1: false, rb2: false }
          const rb1Color = warn.rb1 ? WARN_COLOR : RB1_COLOR
          const rb2Color = warn.rb2 ? WARN_COLOR : RB2_COLOR
          return (
            <g key={j.axis}>
              {/* RB1用ドット（左上寄せ） */}
              <circle cx={j.x - 2.4} cy={j.y - 2.4} r={2.4} fill={rb1Color} />
              {/* RB2用ドット（右下寄せ） */}
              <circle cx={j.x + 2.4} cy={j.y + 2.4} r={2.4} fill={rb2Color} />
              <text x={j.x} y={j.y - 6} textAnchor="middle" className="arm-diagram__axis-label">
                軸{j.axis}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="arm-diagram__legend">
        <span className="arm-diagram__legend-item">
          <i style={{ background: RB1_COLOR }} />RB1
        </span>
        <span className="arm-diagram__legend-item">
          <i style={{ background: RB2_COLOR }} />RB2
        </span>
        <span className="arm-diagram__legend-item">
          <i style={{ background: WARN_COLOR }} />しきい値超過
        </span>
      </div>
    </div>
  )
}
