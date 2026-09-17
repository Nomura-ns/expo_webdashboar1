// AxisRow.tsx
//
// STATUS画面仕様変更対応：中央に共有のロボット模式図（RobotAxisDiagram）を
// 配置する構成に変更したため、本コンポーネントは「RB1側だけ」または
// 「RB2側だけ」の軸データ（速度＋トルク）1行分を描画する役割に変更した
// （旧版は左右2ロボット分＋中央の軸ラベルボックスを1行にまとめて描画していた。
//  軸名称の編集機能も、軸名がS/L/U/R/B/T固定になったことに伴い廃止した）。
//
// side='rb1' … [SpeedBar][TorqueBar]（模式図側＝右寄りにTorqueBarを配置）
// side='rb2' … [TorqueBar][SpeedBar]（模式図側＝左寄りにTorqueBarを配置）
// のように、中央（模式図）に近い側に必ずTorqueBarが来るようにし、
// 模式図を挟んで左右対称（ピラミッド型）に読めるようにしている。
//
// 行の高さは軸ごとに均等ではなく、RobotAxisDiagramと共有するAXIS_ROW_FLEX比率
// （関節間隔のイメージ）に合わせたflexGrowを呼び出し側（OperationStatus.tsx）
// から受け取る。これにより模式図の関節位置とデータ行の高さが常に一致する。

import TorqueBar from './TorqueBar'
import SpeedBar from './SpeedBar'
import { RB1_COLOR, RB2_COLOR, WARN_COLOR } from './robotColors'

/** 軸データ1行分（RB1・RB2両方）。AxisTable.tsx（モバイル表）側は
 * 引き続きこの結合済みの形を使うため、型はそのまま維持している。 */
export interface AxisRowData {
  axis: number
  /** 軸の表示名。S/L/U/R/B/T固定（OperationStatus.tsx側でAXIS_NAMESから設定） */
  axisLabel?: string
  rb1: { torqueValue: number; torquePeak: number; speed: number }
  rb2: { torqueValue: number; torquePeak: number; speed: number }
}

/** 片側（RB1 or RB2）1軸分のデータ */
export interface AxisSideData {
  axis: number
  torqueValue: number
  torquePeak: number
  speed: number
}

interface Props {
  data: AxisSideData
  side: 'rb1' | 'rb2'
  threshold: number
  /** 編集パネルで変更されたRB色。省略時はside側のデフォルト色 */
  color?: string
  /** 80%でON、70%以下を3秒維持してOFFする軸警告状態 */
  isWarning?: boolean
  /** ロボット模式図の関節間隔（AXIS_ROW_FLEX）に合わせた行の高さ配分 */
  flexGrow: number
}

export default function AxisRow({ data, side, threshold, color, isWarning = false, flexGrow }: Props) {
  const defaultColor = side === 'rb1' ? RB1_COLOR : RB2_COLOR
  const baseColor = color ?? defaultColor
  const torqueColor = isWarning ? WARN_COLOR : baseColor

  const speedBar = (
    <SpeedBar
      value={data.speed}
      color={baseColor}
      valueSide={side === 'rb1' ? 'right' : 'left'}
      reverse={side === 'rb1'}
    />
  )

  const torqueBar = (
    <TorqueBar
      side={side === 'rb1' ? 'left' : 'right'}
      value={data.torqueValue}
      peak={data.torquePeak}
      color={torqueColor}
      threshold={threshold}
    />
  )

  return (
    <div
      className={`axis-row axis-row--${side}${isWarning ? ' axis-row--warning' : ''}`}
      style={{ flexGrow, flexBasis: 0 }}
    >
      {side === 'rb1' ? (
        <>
          {speedBar}
          {torqueBar}
        </>
      ) : (
        <>
          {torqueBar}
          {speedBar}
        </>
      )}
    </div>
  )
}
