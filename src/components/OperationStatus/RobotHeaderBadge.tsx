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

import type { UtilizationColorKey } from './UtilizationRateDisplay'

interface Props {
  label: string // 'RB1' | 'RB2'
  colorKey: UtilizationColorKey
  color: string
  utilizationRate: number
  align: 'left' | 'right'
  /** 'stacked'：ドーナツの上下にテキストを縦積み（狭い列向け）。
   * 'boxed'：枠線付きの箱にラベルのみを収め、横に平均速度ゲージを並べられるようにする
   *（フォントサイズはstackedと同じ45pxを維持したまま、箱の縦幅だけをテキストに合わせて縮める）。
   * 省略時は従来のinline */
  layout?: 'inline' | 'stacked' | 'boxed'
  /** ラベル（RB1/RB2）文字色。省略時はcolorを使用 */
  textColor?: string
  /** キャプション（アーム稼働率）文字色 */
  captionColor?: string
  /** モバイル表示でRB切替に使用するクリック処理 */
  onClick?: () => void
  /** 選択されていないRBを減光表示する */
  dimmed?: boolean
}

export default function RobotHeaderBadge({
  label,
  color,
  align,
  layout = 'inline',
  textColor,
  onClick,
  dimmed = false,
}: Props) {
  const text = (
    <div className="robot-header-badge__text">
      <div className="robot-header-badge__title" style={{ color: textColor ?? color }}>
        {label}
      </div>
    </div>
  )

  return (
    <div
      className={`robot-header-badge robot-header-badge--${align} robot-header-badge--${layout}${onClick ? ' robot-header-badge--clickable' : ''}`}
      style={{
        ...(layout === 'boxed' ? { borderColor: `${textColor ?? color}99` } : {}),
        ...(dimmed ? { opacity: 0.35 } : {}),
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {text}
    </div>
  )
}
