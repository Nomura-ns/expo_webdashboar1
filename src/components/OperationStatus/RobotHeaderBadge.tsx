// RobotHeaderBadge.tsx
//
// 画面上部、RB1(左) / RB2(右) の稼働率ドーナツ＋ラベル＋キャプションをまとめたバッジ。
// align='left' はドーナツが左・テキストが右、align='right' はその逆で表示する（layout='inline'時）。
//
// 変更点：
// ・layout='stacked' を追加。RB1/RB2の速度ゲージの列（軸行の左右端・幅100px）の真上に
//   ぴったり重ねて表示できるよう、ドーナツを上・テキストを下に縦積みする表示を用意した
//   （従来のinline横並びだと幅100pxの列に収まらないため）
// ・textColor / captionColor を追加し、theme色を直接渡せるようにした
//   （文字色が薄くて見にくい問題への対応）

import UtilizationRateDisplay, { type UtilizationColorKey } from './UtilizationRateDisplay'

interface Props {
  label: string // 'RB1' | 'RB2'
  colorKey: UtilizationColorKey
  color: string
  utilizationRate: number
  align: 'left' | 'right'
  /** 'stacked'：ドーナツの上下にテキストを縦積み（狭い列向け）。省略時は従来のinline */
  layout?: 'inline' | 'stacked'
  /** ラベル（RB1/RB2）文字色。省略時はcolorを使用 */
  textColor?: string
  /** キャプション（アーム稼働率）文字色 */
  captionColor?: string
}

export default function RobotHeaderBadge({
  label,
  colorKey,
  color,
  utilizationRate,
  align,
  layout = 'inline',
  textColor,
  captionColor,
}: Props) {
  const donut = (
    <UtilizationRateDisplay label="" rate={utilizationRate} colorKey={colorKey} color={color} compact />
  )
  const text = (
    <div className="robot-header-badge__text">
      <div className="robot-header-badge__title" style={{ color: textColor ?? color }}>
        {label}
      </div>
      <div className="robot-header-badge__caption" style={{ color: captionColor }}>
        アーム稼働率
      </div>
    </div>
  )

  return (
    <div className={`robot-header-badge robot-header-badge--${align} robot-header-badge--${layout}`}>
      {layout === 'stacked' ? (
        <>
          {donut}
          {text}
        </>
      ) : align === 'left' ? (
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
