import { useState, useMemo } from 'react'
import PanelFrame from '../common/PanelFrame'
import JobFlowDiagram from './JobFlowDiagram'
import type { Theme, JobSeries, ChartType, ChartSize } from '../../types'
import './OperationResults.css'

interface OperationResultsProps {
  theme: Theme
  series: JobSeries[]
  isEditing: boolean
  /** PLCのDアドレスから受け取る現在工程ステップ値。フロー図の該当工程を強調表示します。 */
  activeStep?: number
  /** 現在のサイクル数 */
  cycleCurrent?: number
  /** 全体サイクル数（目標・予定回数） */
  cycleTotal?: number
}

const SIZE_PRESETS: Record<ChartSize, { w: number; h: number }> = {
  sm: { w: 420, h: 160 },
  md: { w: 560, h: 190 },
  lg: { w: 680, h: 230 },
}

const PAD_L = 34
const PAD_B = 22
const PAD_T = 10

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`
}

export default function OperationResults({ theme, series, isEditing, activeStep, cycleCurrent, cycleTotal }: OperationResultsProps) {
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [chartSize, setChartSize] = useState<ChartSize>('md')

  const { w: CHART_W, h: CHART_H } = SIZE_PRESETS[chartSize]
  const dates = series[0]?.data.map((d) => d.date) ?? []
  const maxCount = Math.max(...series.flatMap((s) => s.data.map((d) => d.count)), 1)
  const plotW = CHART_W - PAD_L - 10
  const plotH = CHART_H - PAD_T - PAD_B
  const groupW = plotW / Math.max(dates.length, 1)
  const barW = Math.min(10, (groupW - 8) / series.length)
  const gridLines = 4

  const todayTotal = series.reduce((sum, s) => sum + (s.data.at(-1)?.count ?? 0), 0)

  const totals = useMemo(
    () => series.map((s) => ({ ...s, total: s.data.reduce((sum, d) => sum + d.count, 0) })),
    [series]
  )
  const grandTotal = Math.max(totals.reduce((sum, s) => sum + s.total, 0), 1)

  return (
    <PanelFrame index="02" title="稼働実績" subtitle="各ジョブ実行回数（日別）" className="op-results">
      <div className="op-results__top">
        <div className="op-results__legend">
          {series.map((s) => (
            <span key={s.jobId} className="op-results__legend-item" style={{ color: theme.subtext }}>
              <span className="op-results__swatch" style={{ background: s.color }} />
              {s.shortName}
            </span>
          ))}
        </div>
        <div className="op-results__today">
          <span className="op-results__today-label" style={{ color: theme.subtext }}>本日合計</span>
          <span className="op-results__today-value" style={{ color: theme.accent }}>{todayTotal}</span>
          <span className="op-results__today-unit" style={{ color: theme.subtext }}>件</span>
        </div>
      </div>


      <div className={`op-results__body${isEditing ? ' is-editing' : ''}`}>
  <div className="op-results__chart-wrap">
    {chartType === 'bar' ? (
      <svg
        className="op-results__chart"
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="日別ジョブ実行回数のグラフ"
        style={{ background: theme.surface }}
      >
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y = PAD_T + (plotH / gridLines) * i
          const value = Math.round(maxCount - (maxCount / gridLines) * i)
          return (
            <g key={i}>
              <line
                x1={PAD_L}
                x2={CHART_W - 10}
                y1={y}
                y2={y}
                stroke={theme.border}
                strokeWidth={1}
                opacity={0.6}
              />
              <text
                x={PAD_L - 8}
                y={y + 3}
                textAnchor="end"
                className="op-results__axis-label"
                fill={theme.subtext}
              >
                {value}
              </text>
            </g>
          )
        })}

        {dates.map((date, dIdx) => {
          const groupX = PAD_L + groupW * dIdx
          return (
            <g key={date}>
              {series.map((s, sIdx) => {
                const count = s.data[dIdx]?.count ?? 0
                const barH = (count / maxCount) * plotH
                const x =
                  groupX +
                  (groupW - series.length * barW) / 2 +
                  sIdx * barW
                const y = PAD_T + plotH - barH

                return (
                  <rect
                    key={s.jobId}
                    x={x}
                    y={y}
                    width={barW - 2}
                    height={barH}
                    rx={1.5}
                    fill={s.color}
                    opacity={dIdx === dates.length - 1 ? 1 : 0.72}
                  />
                )
              })}

              <text
                x={groupX + groupW / 2}
                y={CHART_H - 4}
                textAnchor="middle"
                className="op-results__axis-label"
                fill={theme.subtext}
              >
                {date}
              </text>
            </g>
          )
        })}
      </svg>
    ) : (
      <svg
        className="op-results__chart"
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="xMidYMin meet"
        role="img"
        aria-label="ジョブ別実行回数の円グラフ"
        style={{ background: theme.surface }}
      >
        {(() => {
          const cx = CHART_H / 2
          const cy = CHART_H / 2
          const r = CHART_H / 2 - 14
          let angle = 0

          return totals.map((s) => {
            const pct = s.total / grandTotal
            const startAngle = angle
            const endAngle = angle + pct * 360
            angle = endAngle

            return (
              <path
                key={s.jobId}
                d={describeArc(cx, cy, r, startAngle, endAngle)}
                fill={s.color}
                stroke={theme.surface}
                strokeWidth={1}
              />
            )
          })
        })()}

        {totals.map((s, i) => {
          const pct = Math.round((s.total / grandTotal) * 100)
          const legendX = CHART_H + 12
          const legendY = PAD_T + i * 16

          return (
            <g key={s.jobId}>
              <rect
                x={legendX}
                y={legendY}
                width={8}
                height={8}
                rx={2}
                fill={s.color}
              />
              <text
                x={legendX + 12}
                y={legendY + 8}
                className="op-results__axis-label"
                fill={theme.subtext}
              >
                {s.shortName} {pct}%
              </text>
            </g>
          )
        })}
      </svg>
    )}
  </div>

  <div className="op-results__flow-wrap">
    <JobFlowDiagram
      theme={theme}
      activeStep={activeStep}
      cycleCurrent={cycleCurrent}
      cycleTotal={cycleTotal}
    />
  </div>

  {isEditing && (
    <div
      className="op-results__edit-panel"
      style={{
        background: theme.headerBg,
        borderColor: theme.border,
      }}
    >
      <div className="op-results__edit-panel-scroll">

        <section className="op-results__panel-section">
          <h3>グラフ種類</h3>

          <div className="op-results__edit-group">
            {(['bar', 'pie'] as ChartType[]).map((t) => (
              <button
                key={t}
                type="button"
                className={`op-results__chip ${chartType === t ? 'is-active' : ''}`}
                style={{
                  borderColor: theme.border,
                  color: chartType === t ? theme.accent : theme.subtext,
                }}
                onClick={() => setChartType(t)}
              >
                {t === 'bar' ? '棒グラフ' : '円グラフ'}
              </button>
            ))}
          </div>
        </section>

        <section className="op-results__panel-section">
          <h3>グラフサイズ</h3>

          <div className="op-results__edit-group">
            {(['sm', 'md', 'lg'] as ChartSize[]).map((sz) => (
              <button
                key={sz}
                type="button"
                className={`op-results__chip ${chartSize === sz ? 'is-active' : ''}`}
                style={{
                  borderColor: theme.border,
                  color: chartSize === sz ? theme.accent : theme.subtext,
                }}
                onClick={() => setChartSize(sz)}
              >
                {sz === 'sm' ? '小' : sz === 'md' ? '中' : '大'}
              </button>
            ))}
          </div>
        </section>

      </div>
    </div>
  )}
</div>
    </PanelFrame>
  )
}