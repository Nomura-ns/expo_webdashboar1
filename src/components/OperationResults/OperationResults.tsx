import { useState, useMemo, useRef, type PointerEvent } from 'react'
import PanelFrame from '../common/PanelFrame'
import JobFlowDiagram from './JobFlowDiagram'
import type { Theme, JobSeries, ChartType } from '../../types'
import './OperationResults.css'

/** 刃物交換回数・NG検出回数・OK検出回数を日別に保持するデータ */
export interface MetricPoint {
  date: string
  bladeChangeCount: number
  ngCount: number
  okCount: number
}

type ViewMode = 'job' | 'metrics'

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
  /** 刃物交換回数・NG検出回数・OK検出回数の日別データ */
  metrics?: MetricPoint[]
  
  onEditingChange: (value: boolean) => void
}

const CHART_W = 560
const CHART_H = 348
const PIE_CANVAS_H = 480 


const PAD_L = 34
const PAD_B = 22
const PAD_T = 10

const METRIC_DEFS: { key: keyof Omit<MetricPoint, 'date'>; label: string; defaultColor: string }[] = [
  { key: 'bladeChangeCount', label: '刃物交換回数', defaultColor: '#f59e0b' },
  { key: 'ngCount', label: 'NG検出回数', defaultColor: '#ef4444' },
  { key: 'okCount', label: 'OK検出回数', defaultColor: '#22c55e' },
]

/** タブ（ジョブ実行回数／刃物交換・検査結果）ごとのグラフ種類 */
type ChartTypeMap = Record<ViewMode, ChartType>

const DEFAULT_CHART_TYPES: ChartTypeMap = {
  job: 'bar',
  metrics: 'pie',
}

/** 円グラフの位置・大きさ */
interface PieLayout {
  cx: number
  cy: number
  r: number
}

const DEFAULT_PIE_R = CHART_H / 2 - 14
const MIN_PIE_R = 24
const MAX_PIE_R = 200

const DEFAULT_PIE_LAYOUT: PieLayout = {
  cx: CHART_H / 2,
  cy: CHART_H / 2,
  r: DEFAULT_PIE_R,
}

const DEFAULT_PIE_LAYOUTS: Record<ViewMode, PieLayout> = {
  job: { ...DEFAULT_PIE_LAYOUT },
  metrics: { ...DEFAULT_PIE_LAYOUT },
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

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

/** マウス／タッチのクライアント座標をSVGのユーザー座標系に変換 */
function toSvgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: clientX, y: clientY }
  const transformed = pt.matrixTransform(ctm.inverse())
  return { x: transformed.x, y: transformed.y }
}

interface ChartItem {
  id: string
  label: string
  color: string
  values: number[]
}

export default function OperationResults({
  theme,
  series,
  isEditing,
  activeStep,
  cycleCurrent,
  cycleTotal,
  metrics,
  onEditingChange,
}: OperationResultsProps) {
  const [chartTypes, setChartTypes] = useState<ChartTypeMap>(DEFAULT_CHART_TYPES)
  const [viewMode, setViewMode] = useState<ViewMode>('job')
  const [customColors, setCustomColors] = useState<Record<string, string>>({})
  const [pieLayouts, setPieLayouts] = useState<Record<ViewMode, PieLayout>>(DEFAULT_PIE_LAYOUTS)

  const pieSvgRef = useRef<SVGSVGElement | null>(null)
  const dragModeRef = useRef<'move' | 'resize' | null>(null)

  const chartType = chartTypes[viewMode]
  const pieLayout = pieLayouts[viewMode]

  const jobDates = series[0]?.data.map((d) => d.date) ?? []
  const metricDates = (metrics ?? []).map((m) => m.date)

  const jobItems: ChartItem[] = useMemo(
    () =>
      series.map((s) => ({
        id: s.jobId,
        label: s.shortName,
        color: customColors[s.jobId] ?? s.color,
        values: s.data.map((d) => d.count),
      })),
    [series, customColors]
  )

  const metricItems: ChartItem[] = useMemo(
    () =>
      METRIC_DEFS.map((def) => ({
        id: def.key,
        label: def.label,
        color: customColors[def.key] ?? def.defaultColor,
        values: (metrics ?? []).map((m) => m[def.key]),
      })),
    [metrics, customColors]
  )

  // 変更後
  const activeItems = useMemo(() => {
  const base = viewMode === 'job' ? jobItems : metricItems
  // 刃物交換・検査結果タブの円グラフでは OK / NG のみ表示する
  if (viewMode === 'metrics' && chartType === 'pie') {
    return base.filter((it) => it.id !== 'bladeChangeCount')
  }
  return base
}, [viewMode, chartType, jobItems, metricItems])

const activeDates = viewMode === 'job' ? jobDates : metricDates

  const plotW = CHART_W - PAD_L - 10
  const plotH = CHART_H - PAD_T - PAD_B
  const groupW = plotW / Math.max(activeDates.length, 1)
  const barW = Math.min(10, (groupW - 8) / Math.max(activeItems.length, 1))
  const gridLines = 4

  const maxCount = Math.max(...activeItems.flatMap((it) => it.values), 1)
  const todayTotal = activeItems.reduce((sum, it) => sum + (it.values.at(-1) ?? 0), 0)

  const totals = useMemo(
    () => activeItems.map((it) => ({ ...it, total: it.values.reduce((sum, v) => sum + v, 0) })),
    [activeItems]
  )
  const grandTotal = Math.max(totals.reduce((sum, it) => sum + it.total, 0), 1)

  const handleColorChange = (id: string, color: string) => {
    setCustomColors((prev) => ({ ...prev, [id]: color }))
  }

  const handleResetColors = () => setCustomColors({})

  const handleChartTypeChange = (t: ChartType) => {
    setChartTypes((prev) => ({ ...prev, [viewMode]: t }))
  }

  const handleResetPieLayout = () => {
    setPieLayouts((prev) => ({ ...prev, [viewMode]: { ...DEFAULT_PIE_LAYOUT } }))
  }

  const handlePieRadiusStep = (delta: number) => {
    setPieLayouts((prev) => ({
      ...prev,
      [viewMode]: { ...prev[viewMode], r: clamp(prev[viewMode].r + delta, MIN_PIE_R, MAX_PIE_R) },
    }))
  }

  const handlePieRadiusInput = (value: number) => {
    if (Number.isNaN(value)) return
    setPieLayouts((prev) => ({
      ...prev,
      [viewMode]: { ...prev[viewMode], r: clamp(value, MIN_PIE_R, MAX_PIE_R) },
    }))
  }

  const beginPieDrag = (mode: 'move' | 'resize') => (e: PointerEvent<SVGElement>) => {
    if (!isEditing) return
    e.stopPropagation()
    dragModeRef.current = mode
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  const handlePiePointerMove = (e: PointerEvent<SVGElement>) => {
  const mode = dragModeRef.current
  const svg = pieSvgRef.current
  if (!mode || !svg) return
  const p = toSvgPoint(svg, e.clientX, e.clientY)

  setPieLayouts((prev) => {
    const cur = prev[viewMode]
    if (mode === 'move') {
      const cx = clamp(p.x, cur.r, CHART_W - cur.r)
      const cy = clamp(p.y, cur.r, PIE_CANVAS_H - cur.r)   // ← CHART_H → PIE_CANVAS_H
      return { ...prev, [viewMode]: { ...cur, cx, cy } }
    }
    const dist = Math.hypot(p.x - cur.cx, p.y - cur.cy)
    const r = clamp(dist, MIN_PIE_R, MAX_PIE_R)
    return { ...prev, [viewMode]: { ...cur, r } }
  })
}

  const endPieDrag = (e: PointerEvent<SVGElement>) => {
    dragModeRef.current = null
    try {
      ;(e.target as Element).releasePointerCapture(e.pointerId)
    } catch {
      // すでに解放済みの場合は無視
    }
  }

  return (
    <PanelFrame className="op-results">
      <div className="op-results__top">
        <div className="op-results__legend">
          {activeItems.map((it) => (
            <span key={it.id} className="op-results__legend-item" style={{ color: theme.subtext }}>
              <span className="op-results__swatch" style={{ background: it.color }} />
              {it.label}
            </span>
          ))}
        </div>
        <div className="op-results__today">
          <span className="op-results__today-label" style={{ color: theme.subtext }}>本日合計</span>
          <span className="op-results__today-value" style={{ color: theme.accent }}>{todayTotal}</span>
          <span className="op-results__today-unit" style={{ color: theme.subtext }}>件</span>
        </div>
      </div>

      <div className="op-results__tabs">
       <button
         type="button"
         className={`op-results__tab ${viewMode === 'job' ? 'is-active' : ''}`}
         style={{
          color: viewMode === 'job' ? theme.accent : theme.subtext,
          background: viewMode === 'job' ? `${theme.accent}33` : 'transparent',
        }}
       onClick={() => setViewMode('job')}
      >
       ジョブ実行回数
      </button>
      <button
       type="button"
       className={`op-results__tab ${viewMode === 'metrics' ? 'is-active' : ''}`}
       style={{
        color: viewMode === 'metrics' ? theme.accent : theme.subtext,
        background: viewMode === 'metrics' ? `${theme.accent}33` : 'transparent',
      }}
       onClick={() => setViewMode('metrics')}
      >
      刃物交換・検査結果
    </button>
    </div>

      <div className={`op-results__body${isEditing ? ' is-editing' : ''}`}>
        <div className="op-results__chart-wrap">
          {chartType === 'bar' ? (
            <svg
              className="op-results__chart"
              viewBox={`0 0 ${CHART_W} ${CHART_H}`}
              preserveAspectRatio="none"
              role="img"
              aria-label={viewMode === 'job' ? '日別ジョブ実行回数のグラフ' : '日別刃物交換・検査結果のグラフ'}
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

              {activeDates.map((date, dIdx) => {
                const groupX = PAD_L + groupW * dIdx
                return (
                  <g key={date}>
                    {activeItems.map((it, sIdx) => {
                      const count = it.values[dIdx] ?? 0
                      const barH = (count / maxCount) * plotH
                      const x =
                        groupX +
                        (groupW - activeItems.length * barW) / 2 +
                        sIdx * barW
                      const y = PAD_T + plotH - barH

                      return (
                        <rect
                          key={it.id}
                          x={x}
                          y={y}
                          width={barW - 2}
                          height={barH}
                          rx={1.5}
                          fill={it.color}
                          opacity={dIdx === activeDates.length - 1 ? 1 : 0.72}
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
              ref={pieSvgRef}
              className="op-results__chart"
              viewBox={`0 0 ${CHART_W} ${PIE_CANVAS_H}`}
              preserveAspectRatio="xMidYMin meet"
              role="img"
              aria-label={viewMode === 'job' ? 'ジョブ別実行回数の円グラフ' : '刃物交換・検査結果の円グラフ'}
              style={{ background: theme.surface }}
            >
              <g
                onPointerDown={beginPieDrag('move')}
                onPointerMove={handlePiePointerMove}
                onPointerUp={endPieDrag}
                onPointerCancel={endPieDrag}
                style={{ cursor: isEditing ? 'grab' : 'default', touchAction: 'none' }}
              >
                {(() => {
                  let angle = 0
                  return totals.map((it) => {
                    const pct = it.total / grandTotal
                    const startAngle = angle
                    const endAngle = angle + pct * 360
                    angle = endAngle

                    return (
                      <path
                        key={it.id}
                        d={describeArc(pieLayout.cx, pieLayout.cy, pieLayout.r, startAngle, endAngle)}
                        fill={it.color}
                        stroke={theme.surface}
                        strokeWidth={1}
                      />
                    )
                  })
                })()}
              </g>

              {isEditing && (
                <circle
                  cx={pieLayout.cx}
                  cy={pieLayout.cy - pieLayout.r}
                  r={6}
                  fill={theme.accent}
                  stroke="#fff"
                  strokeWidth={1.5}
                  style={{ cursor: 'nwse-resize', touchAction: 'none' }}
                  onPointerDown={beginPieDrag('resize')}
                  onPointerMove={handlePiePointerMove}
                  onPointerUp={endPieDrag}
                  onPointerCancel={endPieDrag}
                />
              )}

              {(() => {
                const legendGap = 20
                const legendX = pieLayout.cx + pieLayout.r + legendGap
                const legendBlockH = totals.length * 16
                const legendStartY = pieLayout.cy - legendBlockH / 2 + 4

                return totals.map((it, i) => {
                 const pct = Math.round((it.total / grandTotal) * 100)
                 const legendY = legendStartY + i * 16

              return (
               <g key={it.id}>
                <rect x={legendX} y={legendY} width={8} height={8} rx={2} fill={it.color} />
                <text
                  x={legendX + 12}
                  y={legendY + 8}
                  className="op-results__axis-label"
                  fill={theme.subtext}
                >
                  {it.label} {pct}%
                </text>
               </g>
              )
            })
          })()}
            </svg>
          )}
        </div>

        <div className="op-results__flow-wrap">
          <JobFlowDiagram
            theme={theme}
            activeStep={activeStep}
            cycleCurrent={cycleCurrent}
            cycleTotal={cycleTotal}
            colorOverrides={customColors}
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
              {/* 編集モードトグル（設定パネルと同期） */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <span style={{ fontSize: '14px', color: theme.text }}>編集モード</span>

        <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
          <input
            type="checkbox"
            checked={isEditing}
            onChange={(e) => onEditingChange(e.target.checked)}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span
            style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: isEditing ? theme.accent : '#ccc',
              borderRadius: '24px',
              transition: '0.2s',
            }}
          >
            <span
              style={{
                position: 'absolute',
                height: '18px',
                width: '18px',
                left: isEditing ? '23px' : '3px',
                bottom: '3px',
                backgroundColor: '#fff',
                borderRadius: '50%',
                transition: '0.2s',
                boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
              }}
            />
          </span>
        </label>

        <span style={{ fontSize: '13px', color: theme.text }}>
          {isEditing ? 'ON' : 'OFF'}
        </span>
      </div>
              <section className="op-results__panel-section">
                <h3>グラフ種類（{viewMode === 'job' ? 'ジョブ実行回数' : '刃物交換・検査結果'}）</h3>

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
                      onClick={() => handleChartTypeChange(t)}
                    >
                      {t === 'bar' ? '棒グラフ' : '円グラフ'}
                    </button>
                  ))}
                </div>
              </section>

              {chartType === 'pie' && (
                <section className="op-results__panel-section">
                  <h3>円グラフの位置・大きさ</h3>
                  <p className="op-results__hint" style={{ color: theme.subtext }}>
                    円グラフ本体をドラッグで移動、右上のハンドル（●）をドラッグで大きさを変更できます。
                  </p>

                  <div className="op-results__size-control">
                    <button
                      type="button"
                      className="op-results__size-btn"
                      style={{ borderColor: theme.border, color: theme.subtext }}
                      onClick={() => handlePieRadiusStep(-5)}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      className="op-results__size-input"
                      style={{ borderColor: theme.border, color: theme.subtext }}
                      value={Math.round(pieLayout.r)}
                      min={MIN_PIE_R}
                      max={MAX_PIE_R}
                      onChange={(e) => handlePieRadiusInput(Number(e.target.value))}
                    />
                    <button
                      type="button"
                      className="op-results__size-btn"
                      style={{ borderColor: theme.border, color: theme.subtext }}
                      onClick={() => handlePieRadiusStep(5)}
                    >
                      ＋
                    </button>
                  </div>

                  <button
                    type="button"
                    className="op-results__color-reset"
                    style={{ borderColor: theme.border, color: theme.subtext }}
                    onClick={handleResetPieLayout}
                  >
                    位置・大きさをリセット
                  </button>
                </section>
              )}

              <section className="op-results__panel-section">
                <h3>色</h3>

                <div className="op-results__edit-group">
                  {activeItems.map((it) => (
                    <label key={it.id} className="op-results__color-row">
                      <span className="op-results__color-row-label" style={{ color: theme.subtext }}>
                        {it.label}
                      </span>
                      <input
                        type="color"
                        className="op-results__color-input"
                        value={it.color}
                        onChange={(e) => handleColorChange(it.id, e.target.value)}
                      />
                    </label>
                  ))}

                  <button
                    type="button"
                    className="op-results__color-reset"
                    style={{ borderColor: theme.border, color: theme.subtext }}
                    onClick={handleResetColors}
                  >
                    色をリセット
                  </button>
                </div>
              </section>

            </div>
          </div>
        )}
      </div>
    </PanelFrame>
  )
}