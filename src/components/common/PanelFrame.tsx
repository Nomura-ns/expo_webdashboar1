import type { ReactNode } from 'react'
import './PanelFrame.css'

interface PanelFrameProps {
  index?: string
  subtitle?: string
  children: ReactNode
  className?: string
}

export default function PanelFrame({ children, className }: PanelFrameProps) {
  return (
    <section
      className={`panel-frame ${className ?? ''}`}
    >
      <header className="panel-frame__header">
        
        <div className="panel-frame__titles">
          
          
        </div>
      </header>

      <div className="panel-frame__body">{children}</div>
    </section>
  )
}
