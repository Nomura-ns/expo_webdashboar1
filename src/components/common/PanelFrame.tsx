import type { ReactNode } from 'react'
import './PanelFrame.css'

interface PanelFrameProps {
  index?: string
  subtitle?: string
  children: ReactNode
  className?: string
  /**
   * このパネルが画面右下（QRコードが固定表示される位置）と重なりうる場合に true を指定する。
   * true にすると panel-frame__body の右下に安全余白（--qr-safe-inset）を確保し、
   * コンテンツがQRの下に隠れるのを防ぐ。
   * 例）4分割レイアウトの右下に置かれるパネルにだけ付ける。
   */
  reserveForQr?: boolean
}

export default function PanelFrame({ children, className, reserveForQr }: PanelFrameProps) {
  return (
    <section
      className={`panel-frame ${reserveForQr ? 'panel-frame--reserve-qr' : ''} ${className ?? ''}`}
    >
      <header className="panel-frame__header">
        
        <div className="panel-frame__titles">
          
          
        </div>
      </header>

      <div className="panel-frame__body">{children}</div>
    </section>
  )
}
