// RobotHeaderBadge.tsx
//
// 画面上部、RB1(左) / RB2(右) の稼働率ドーナツ＋ラベル＋キャプションをまとめたバッジ。
// align='left' はドーナツが左・テキストが右、align='right' はその逆で表示する。

import UtilizationRateDisplay, { type UtilizationColorKey } from './UtilizationRateDisplay'

interface Props {
  label: string // 'RB1' | 'RB2'
  colorKey: UtilizationColorKey
  color: string
  utilizationRate: number
  align: 'left' | 'right'
}

export default function RobotHeaderBadge({
  label,
  colorKey,
  color,
  utilizationRate,
  align,
}: Props) {
  const donut = <UtilizationRateDisplay label="" rate={utilizationRate} colorKey={colorKey} compact />
  const text = (
    <div className="robot-header-badge__text">
      <div className="robot-header-badge__title" style={{ color }}>
        {label}
      </div>
      <div className="robot-header-badge__caption">アーム稼働率</div>
    </div>
  )

  return (
    <div className={`robot-header-badge robot-header-badge--${align}`}>
      {align === 'left' ? (
        <>
          {donut}
          {text}
        </>
      ) : (
        <>
          {text}
          {donut}
        </>
      )}
    </div>
  )
}
