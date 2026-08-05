import type { ReactNode } from 'react'
import './PanelFrame.css'

interface PanelFrameProps {
  index: string // e.g. '01'
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}

export default function PanelFrame({ index, title, subtitle, children, className }: PanelFrameProps) {
  return (
    <section className={`panel-frame ${className ?? ''}`}>
      <span className="panel-frame__rivet panel-frame__rivet--tl" />
      <span className="panel-frame__rivet panel-frame__rivet--tr" />
      <span className="panel-frame__rivet panel-frame__rivet--bl" />
      <span className="panel-frame__rivet panel-frame__rivet--br" />

      <header className="panel-frame__header">
        <span className="panel-frame__index">{index}</span>
        <div className="panel-frame__titles">
          <h2 className="panel-frame__title">{title}</h2>
          {subtitle && <p className="panel-frame__subtitle">{subtitle}</p>}
        </div>
      </header>

      <div className="panel-frame__body">{children}</div>
    </section>
  )
}
