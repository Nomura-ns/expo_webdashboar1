// RobotAxisDiagram.tsx
//
// STATUS画面仕様変更対応：ダッシュボード中央に安川協働ロボット（MOTOMAN-HCシリーズ、
// 6軸垂直多関節）を模した側面模式図を配置し、S/L/U/R/B/T各軸のデータ表示位置を
// 模式図上の実際の関節位置に対応させる。
//
// 実装方針：
// ・関節の並び順・間隔（AXIS_ROW_FLEX）を「唯一の基準値」として、模式図側の
//   関節マーカーの縦位置と、左右のAxisRow（軸データ行）のflexGrow（行の高さ配分）
//   の両方に同じ値を使う。これにより「模式図のどの関節が、どのデータ行に対応するか」
//   がズレなく一致する（OperationStatus.tsx側でAxisRowにflexGrowとして渡している）。
// ・実機そのものの写真ではなく、視認性重視のスタイリッシュなSVGシルエットとする。
//   ベース(S・旋回)→下腕(L)→上腕(U)→手首ロール(R)→手首ピッチ(B)→フランジ(T)という
//   6軸垂直多関節の関節構成・並び順は、実機（安川MOTOMAN-HCシリーズ等の協働ロボット）
//   から大きく外れないようにしている。
// ・表示は根元(S)を下・先端(T)を上に固定（＝ロボットが床に立っている見た目に対応。
//   OperationStatus.tsx側で軸データ行の描画順を根元→先端から先端→根元に反転させた
//   のと揃えている）。
// ・立体感演出：リンクにグラデーション＋艶ハイライト＋ドロップシャドウ、関節は
//   段差なく繋がる「軸受け（collar）」を追加。輪郭パス（outline）を下敷きに敷いて
//   背景から浮き上がって見えるようにしている。

import type { Theme } from '../../types'

export const AXIS_NAMES = ['S', 'L', 'U', 'R', 'B', 'T'] as const
export type AxisName = (typeof AXIS_NAMES)[number]

/** 画面表示順（上→下）。根元(S)を一番下、先端(T)を一番上にする */
export const AXIS_DISPLAY_ORDER: AxisName[] = ['T', 'B', 'R', 'U', 'L', 'S']

/** 関節間の間隔イメージ（合計100）。模式図の関節縦位置と、
 * 軸データ行（AxisRow）のflexGrowの両方でこの値を共有することで、
 * 「模式図のどの関節がどのデータ行に対応するか」を一致させている。 */
export const AXIS_ROW_FLEX: Record<AxisName, number> = {
  T: 14,
  B: 17,
  R: 20,
  U: 20,
  L: 13,
  S: 16,
}

// 関節中心のY座標（0〜100）。AXIS_ROW_FLEXの累積区間の中間点として算出する
// （境界＝flexGrowの累積和、中心＝隣り合う境界の中間）。
function computeJointCenters(): Record<AxisName, number> {
  const bounds: number[] = [0]
  let acc = 0
  for (const name of AXIS_DISPLAY_ORDER) {
    acc += AXIS_ROW_FLEX[name]
    bounds.push(acc)
  }
  const centers = {} as Record<AxisName, number>
  AXIS_DISPLAY_ORDER.forEach((name, i) => {
    centers[name] = (bounds[i] + bounds[i + 1]) / 2
  })
  return centers
}

const JOINT_Y = computeJointCenters()

// 関節のX座標（0〜100）。ベース(S)を中心に、肘・手首が左右へ振れた
// 「く」の字姿勢（安川協働ロボットの標準姿勢に近いイメージ）にしている。
const JOINT_X: Record<AxisName, number> = {
  S: 50,
  L: 38,
  U: 64,
  R: 55,
  B: 45,
  T: 50,
}

// 関節間リンクの太さ（根元ほど太く、先端ほど細く）
const LINK_WIDTH: Record<string, number> = {
  'S-L': 8.5,
  'L-U': 7,
  'U-R': 5.6,
  'R-B': 4.6,
  'B-T': 3.4,
}

// 各関節の「軸受け」半径。前後リンクの太い方に合わせておくことで、
// リンクの太さが変わる場所でも段差なくなめらかに繋がる。
const JOINT_COLLAR: Record<AxisName, number> = {
  S: 4.6,
  L: 4.6,
  U: 3.9,
  R: 3.1,
  B: 2.6,
  T: 2.0,
}

const LINKS: Array<[AxisName, AxisName, number]> = [
  ['S', 'L', LINK_WIDTH['S-L']],
  ['L', 'U', LINK_WIDTH['L-U']],
  ['U', 'R', LINK_WIDTH['U-R']],
  ['R', 'B', LINK_WIDTH['R-B']],
  ['B', 'T', LINK_WIDTH['B-T']],
]

const OUTLINE_COLOR = 'rgba(10, 14, 20, 0.65)'

interface Props {
  theme: Theme
  /** 軸ごとの警告状態（配列の並びはS〜T＝AXIS_NAMESの順。OperationStatus.tsxの
   * warningAxesをそのまま渡す） */
  warningAxes?: boolean[]
}

export default function RobotAxisDiagram({ theme, warningAxes = [] }: Props) {
  // outline=true のときは輪郭線用に少し太め・単色（下敷き）で描く。
  // outline=false のときは本体（グラデーション＋艶ハイライト＋ドロップシャドウ）を描く。
  const link = (a: AxisName, b: AxisName, width: number, outline = false) => {
    if (outline) {
      return (
        <path
          key={`${a}-${b}-outline`}
          d={`M ${JOINT_X[a]} ${JOINT_Y[a]} L ${JOINT_X[b]} ${JOINT_Y[b]}`}
          stroke={OUTLINE_COLOR}
          strokeWidth={width + 1.4}
          strokeLinecap="round"
          fill="none"
        />
      )
    }
    return (
      <g key={`${a}-${b}`} filter="url(#robotDiagramShadow)">
        <path
          d={`M ${JOINT_X[a]} ${JOINT_Y[a]} L ${JOINT_X[b]} ${JOINT_Y[b]}`}
          stroke="url(#robotDiagramBody)"
          strokeWidth={width}
          strokeLinecap="round"
          fill="none"
        />
        {/* ハイライト線：本体より細く、少し明るい線を上に重ねて艶を出す */}
        <path
          d={`M ${JOINT_X[a]} ${JOINT_Y[a]} L ${JOINT_X[b]} ${JOINT_Y[b]}`}
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={width * 0.28}
          strokeLinecap="round"
          fill="none"
        />
      </g>
    )
  }

  const collar = (name: AxisName, outline = false) => (
    <circle
      key={`collar-${name}${outline ? '-outline' : ''}`}
      cx={JOINT_X[name]}
      cy={JOINT_Y[name]}
      r={outline ? JOINT_COLLAR[name] + 0.7 : JOINT_COLLAR[name]}
      fill={outline ? OUTLINE_COLOR : 'url(#robotDiagramBody)'}
    />
  )

  return (
    <div className="robot-diagram">
      <svg
        className="robot-diagram__svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="robotDiagramBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f2f5f8" />
            <stop offset="30%" stopColor="#d6dce3" />
            <stop offset="55%" stopColor="#9aa4b0" />
            <stop offset="100%" stopColor="#6b7480" />
          </linearGradient>

          <filter id="robotDiagramShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="1.2" stdDeviation="1" floodColor="#000" floodOpacity="0.45" />
          </filter>
        </defs>

        {/* 接地影（床に立っている感じを出す） */}
        <ellipse cx="50" cy={JOINT_Y.S + 6.8} rx="13" ry="1.8" fill="#000" opacity="0.25" />

        {/* 設置ベース（少し立体感を出す） */}
        <rect x="40" y={JOINT_Y.S + 4.2} width="20" height="4" rx="1.4" fill="#0d1117" />
        <rect x="41" y={JOINT_Y.S + 4.2} width="18" height="1.4" rx="0.7" fill="#2a323c" opacity="0.8" />

        {/* 1. 輪郭（下敷き）：シルエットを背景から浮き上がらせる */}
        {LINKS.map(([a, b, w]) => link(a, b, w, true))}
        {AXIS_DISPLAY_ORDER.map((name) => collar(name, true))}

        {/* 2. 本体：リンク＋関節の軸受け（段差なく繋がる） */}
        {LINKS.map(([a, b, w]) => link(a, b, w))}
        {AXIS_DISPLAY_ORDER.map((name) => collar(name))}

        {/* ツールフランジ（T軸先端） */}
        <circle cx={JOINT_X.T} cy={JOINT_Y.T - 2.6} r="2.2" fill="#161c24" />
      </svg>

      <div className="robot-diagram__cells">
        {AXIS_DISPLAY_ORDER.map((name) => {
          const axisIndex = AXIS_NAMES.indexOf(name)
          const isWarning = warningAxes[axisIndex] ?? false
          return (
            <div
              key={name}
              className="robot-diagram__cell"
              style={{ flexGrow: AXIS_ROW_FLEX[name], flexBasis: 0 }}
            >
              <div
                className={`robot-diagram__joint${isWarning ? ' robot-diagram__joint--warning' : ''}`}
                style={{ borderColor: isWarning ? '#ff4d4f' : `${theme.text}66`, color: theme.text }}
              >
                {name}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}