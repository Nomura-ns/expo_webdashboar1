// OperationStatus.tsx 内の JOINT_POSITIONS 定義を、このように置き換えてください。
// 各軸に `slot` を追加し、CSS の grid-template-areas (top1/top2/right1/right2/bottom1/bottom2)
// に対応させています。x, y は元のまま（画像に対する%座標）なので、実画像に合わせて微調整してください。

import type { JointPosition } from './RobotJointCallout'

const JOINT_POSITIONS: JointPosition[] = [
  { axis: 1, x: 58, y: 82, slot: 'bottom1' }, // 軸1: ベース旋回
  { axis: 2, x: 68, y: 49, slot: 'bottom2' }, // 軸2: 肩
  { axis: 3, x: 71, y: 35, slot: 'right2' },  // 軸3: 肘
  { axis: 4, x: 62, y: 26, slot: 'right1' },  // 軸4: 前腕回転
  { axis: 5, x: 44, y: 19, slot: 'top2' },    // 軸5: 手首
  { axis: 6, x: 26, y: 21, slot: 'top1' },    // 軸6: フランジ
]

export default JOINT_POSITIONS
