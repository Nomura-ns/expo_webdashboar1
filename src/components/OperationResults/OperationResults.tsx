import { useMemo, useRef, useState, type PointerEvent } from 'react'
import PanelFrame from '../common/PanelFrame'
import JobFlowDiagram, { RobotFlows } from './JobFlowDiagram'
import type { Theme, ThemeMode } from '../../types'
import './OperationResults.css'

/** 稼働実績（検査回数・異常回数・上刃挿入回数・ねじ締め回数・ねじ緩め回数・検査OK/NG）の日別データ */
export interface MetricPoint {
  date: string
  /** 検査回数 */
  inspectCount: number
  /** 異常回数 */
  anomalyCount: number
  /** 上刃挿入回数 */
  insertCount: number
  /** ねじ締め回数 */
  tightenCount: number
  /** ねじ緩め回数 */
  loosenCount: number
  /** 検査OK回数 */
  okCount: number
  /** 検査NG回数 */
  ngCount: number
}

type MetricKey = Exclude<keyof MetricPoint, 'date'>

interface OperationResultsProps {
  theme: Theme
  /** ライト／ダーク（QRコード画像の切替などに使用） */
  themeMode: ThemeMode
  isEditing: boolean
  /** PLCのDアドレスから受け取る現在工程ステップ値。フロー図の該当工程を強調表示します。 */
  activeStep?: number
  /** 稼働実績（検査回数・異常回数・上刃挿入回数・ねじ締め回数・ねじ緩め回数・検査OK/NG）の日別データ */
  metrics: MetricPoint[]
  /** 全体サイクルタイム（秒）。PLCのDレジスタ（未定）またはコード側の蓄積値から算出。 */
  overallCycleTimeSec?: number
  /** RB1のサイクルタイム（秒） */
  rb1CycleTimeSec?: number
  /** RB2のサイクルタイム（秒） */
  rb2CycleTimeSec?: number
  /** PLCのNG判定信号（true = NG検出中） */
  ngSignal?: boolean
  onEditingChange: (value: boolean) => void
}

const CHART_W = 560

const PIE_CANVAS_H = 300

// 棒グラフ専用：3日分しかないので横に広めのアスペクト比を確保
const BAR_CHART_W = 1800
const BAR_CHART_H = 300
const BAR_PAD_L = 56
const BAR_PAD_R = 12
const BAR_PAD_B = 28
const BAR_PAD_T = 16

/** 棒グラフ（ロボットモニタ）の5指標定義。表示順・色はモックアップに準拠 */
const METRIC_DEFS: { key: MetricKey; label: string; defaultColor: string }[] = [
  { key: 'inspectCount', label: '検査回数', defaultColor: '#4f9cd9' },
  { key: 'anomalyCount', label: '異常回数', defaultColor: '#e0503f' },
  { key: 'insertCount', label: '上刃挿入回数', defaultColor: '#e0b04f' },
  { key: 'tightenCount', label: 'ねじ締め回数', defaultColor: '#4fbf8f' },
  { key: 'loosenCount', label: 'ねじ緩め回数', defaultColor: '#8a7fc9' },
]

/** 円グラフ（OK/NG判定割合）の2指標定義 */
const OKNG_DEFS: { key: MetricKey; label: string; defaultColor: string }[] = [
  { key: 'okCount', label: 'OK', defaultColor: '#4f9cd9' },
  { key: 'ngCount', label: 'NG', defaultColor: '#e0503f' },
]

/** 異常回数バッジ：常時うっすら赤みを付けて視認性を上げる */
const ANOMALY_TINT = 'rgba(224, 80, 63, 0.14)'
const NG_ACCENT_COLOR = '#e0503f'

/** 円グラフの位置・大きさ */
interface PieLayout {
  cx: number
  cy: number
  r: number
}

const DEFAULT_PIE_R = PIE_CANVAS_H / 2 - 14
const MIN_PIE_R = 24
const MAX_PIE_R = 130

const DEFAULT_PIE_LAYOUT: PieLayout = {
  cx: CHART_W / 2 - 60,
  cy: PIE_CANVAS_H / 2,
  r: DEFAULT_PIE_R,
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
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

function formatCycleTime(sec?: number) {
  if (!sec || sec <= 0) return '--'
  return `${sec.toFixed(1)} 秒`
}

function computeMaxCount(barItems: ChartItem[]): number {
  const allValues = barItems.flatMap((it) => it.values)
  const max = Math.max(...allValues, 0)
  const padded = max + 5
  return Math.max(Math.round(padded / 10) * 10, 10) // 0除算・0上限防止
}

interface ChartItem {
  id: string
  label: string
  color: string
  values: number[]
}

export default function OperationResults({
  theme,
  themeMode,
  isEditing,
  activeStep,
  metrics,
  overallCycleTimeSec,
  rb1CycleTimeSec,
  rb2CycleTimeSec,
  ngSignal,
  onEditingChange,
}: OperationResultsProps) {
  const [customColors, setCustomColors] = useState<Record<string, string>>({})
  const [pieLayout, setPieLayout] = useState<PieLayout>(DEFAULT_PIE_LAYOUT)

  const pieSvgRef = useRef<SVGSVGElement | null>(null)
  const dragModeRef = useRef<'move' | 'resize' | null>(null)

  const dates = metrics.map((m) => m.date)
  const latest = metrics.at(-1)

  const barItems: ChartItem[] = useMemo(
    () =>
      METRIC_DEFS.map((def) => ({
        id: def.key,
        label: def.label,
        color: customColors[def.key] ?? def.defaultColor,
        values: metrics.map((m) => m[def.key]),
      })),
    [metrics, customColors]
  )

  const okNgItems: ChartItem[] = useMemo(
    () =>
      OKNG_DEFS.map((def) => ({
        id: def.key,
        label: def.label,
        color: customColors[def.key] ?? def.defaultColor,
        values: metrics.map((m) => m[def.key]),
      })),
    [metrics, customColors]
  )

  
const plotH = BAR_CHART_H - BAR_PAD_T - BAR_PAD_B
const groupW = (BAR_CHART_W - BAR_PAD_L - BAR_PAD_R) / dates.length
const barW = Math.min(60, groupW / (barItems.length + 1)) // 3日分なので上限も少し広げる
const maxCount = computeMaxCount(barItems)
const gridLines = 4  

  const okNgTotals = useMemo(
    () => okNgItems.map((it) => ({ ...it, total: it.values.reduce((sum, v) => sum + v, 0) })),
    [okNgItems]
  )
  const grandTotal = Math.max(okNgTotals.reduce((sum, it) => sum + it.total, 0), 1)

  const handleColorChange = (id: string, color: string) => {
    setCustomColors((prev) => ({ ...prev, [id]: color }))
  }

  const handleResetColors = () => setCustomColors({})

  const handleResetPieLayout = () => setPieLayout({ ...DEFAULT_PIE_LAYOUT })

  const handlePieRadiusStep = (delta: number) => {
    setPieLayout((prev) => ({ ...prev, r: clamp(prev.r + delta, MIN_PIE_R, MAX_PIE_R) }))
  }

  const handlePieRadiusInput = (value: number) => {
    if (Number.isNaN(value)) return
    setPieLayout((prev) => ({ ...prev, r: clamp(value, MIN_PIE_R, MAX_PIE_R) }))
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

    setPieLayout((prev) => {
      if (mode === 'move') {
        const cx = clamp(p.x, prev.r, CHART_W - prev.r)
        const cy = clamp(p.y, prev.r, PIE_CANVAS_H - prev.r)
        return { ...prev, cx, cy }
      }
      const dist = Math.hypot(p.x - prev.cx, p.y - prev.cy)
      const r = clamp(dist, MIN_PIE_R, MAX_PIE_R)
      return { ...prev, r }
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

  const qrSrc = themeMode === 'dark' ? '/QR_dark.png' : '/QR_light.png'

  return (
    <PanelFrame className="op-results">
      <div className="op-results__body">
        <div className="op-results__main-col">
          {/* 上部：検査回数・異常回数・上刃挿入回数・ねじ締め回数・ねじ緩め回数 */}
          <div className="op-results__badges">
            {METRIC_DEFS.map((def) => (
              <div
                key={def.key}
                className="op-results__badge"
                style={{
                  borderColor: def.key === 'anomalyCount' && ngSignal ? NG_ACCENT_COLOR : theme.border,
                  background: def.key === 'anomalyCount' ? ANOMALY_TINT : theme.headerBg,
                }}
              >
                <span className="op-results__badge-label" style={{ color: theme.subtext }}>
                  {def.label}
                </span>
                <span className="op-results__badge-value-wrap">
                  <span className="op-results__badge-value" style={{ color: theme.text }}>
                    {latest?.[def.key] ?? '--'}
                  </span>
                  <span className="op-results__badge-unit" style={{ color: theme.subtext }}>
                    回
                  </span>
                </span>
              </div>
            ))}
          </div>

          {/* 全体サイクルタイム（フロー自体のタイトル・進捗はJobFlowDiagram内で表示） */}
          <div
            className="op-results__overall-row"
            style={{ display: "flex", alignItems: "center" }}
          >
           <div className="op-results__cycle-badge">
            <span>全体サイクルタイム</span>
            <span>{formatCycleTime(overallCycleTimeSec)}</span>
           </div>
         </div>


          <JobFlowDiagram theme={theme} activeStep={activeStep} ngSignal={ngSignal} />

          {/* RB1／RB2フロー（形状は全体フローと共通。各々枠で囲んで表示。ループは矢印ではなく注記テキストで表現） */}
          <div className="op-results__robot-flows-header">
            <span className="op-results__robot-col-cycle" style={{ color: theme.subtext }}>
              RB1
              <strong style={{ color: theme.accent }}>{formatCycleTime(rb1CycleTimeSec)}</strong>
              　RB2
              <strong style={{ color: theme.accent }}>{formatCycleTime(rb2CycleTimeSec)}</strong>
            </span>
          </div>
          <RobotFlows theme={theme} activeStep={activeStep} />

          {/* 下部：OK/NG判定割合（円グラフ）＋ ロボットモニタ（棒グラフ） */}
          <div className="op-results__charts-row">
            <div className="op-results__pie-panel">
              <h3 className="op-results__panel-title" style={{ color: theme.text }}>
                OK/NG判定割合
              </h3>
              <div className="op-results__chart-wrap">
                <svg
                  ref={pieSvgRef}
                  className="op-results__chart"
                  viewBox={`0 0 ${CHART_W} ${PIE_CANVAS_H}`}
                  preserveAspectRatio="xMidYMid meet"
                  role="img"
                  aria-label="検査OK/NG判定割合の円グラフ"
                  style={{ background: theme.surface }}
                >
                  <g
                    onPointerDown={beginPieDrag('move')}
                    onPointerMove={handlePiePointerMove}
                    onPointerUp={endPieDrag}
                    onPointerCancel={endPieDrag}
                    style={{ cursor: isEditing ? 'grab' : 'default', touchAction: 'none' }}
                  >
                    {/* 背景リング（データが無い場合の土台） */}
                    <circle
                      cx={pieLayout.cx}
                      cy={pieLayout.cy}
                      r={pieLayout.r}
                      fill="none"
                      stroke={theme.border}
                      strokeWidth={Math.max(pieLayout.r * 0.42, 12)}
                      opacity={0.4}
                    />
                    <g transform={`rotate(-90 ${pieLayout.cx} ${pieLayout.cy})`}>
                      {(() => {
                        const ringWidth = Math.max(pieLayout.r * 0.42, 12)
                        const circumference = 2 * Math.PI * pieLayout.r
                        let cumulative = 0
                        return okNgTotals.map((it) => {
                          const pct = it.total / grandTotal
                          const dash = pct * circumference
                          const el = (
                            <circle
                              key={it.id}
                              cx={pieLayout.cx}
                              cy={pieLayout.cy}
                              r={pieLayout.r}
                              fill="none"
                              stroke={it.color}
                              strokeWidth={ringWidth}
                              strokeDasharray={`${dash} ${Math.max(circumference - dash, 0)}`}
                              strokeDashoffset={-cumulative}
                              strokeLinecap={okNgTotals.length > 1 ? 'butt' : 'round'}
                            />
                          )
                          cumulative += dash
                          return el
                        })
                      })()}
                    </g>
                  </g>
                  {(() => {
                    const okItem = okNgTotals.find((it) => it.id === 'okCount')
                    const okPct = grandTotal > 0 ? Math.round(((okItem?.total ?? 0) / grandTotal) * 100) : 0
                    return (
                      <text
                        x={pieLayout.cx}
                        y={pieLayout.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={Math.max(pieLayout.r * 0.42, 20)}
                        fontWeight={700}
                        fill={theme.text}
                      >
                        {okPct}%
                      </text>
                    )
                  })()}

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
                </svg>
              </div>
              <div className="op-results__legend">
                {okNgTotals.map((it) => {
                  const pct = grandTotal > 0 ? Math.round((it.total / grandTotal) * 100) : 0
                  return (
                    <span key={it.id} className="op-results__legend-item" style={{ color: theme.subtext }}>
                      <span className="op-results__swatch" style={{ background: it.color }} />
                      {it.label}：{it.total}回（{pct}%）
                    </span>
                  )
                })}
              </div>
            </div>

            <div className="op-results__bar-panel">
              <h3 className="op-results__panel-title" style={{ color: theme.text }}>
                ロボットモニタ
              </h3>
              <div className="op-results__chart-wrap op-results__chart-wrap--bar">
                <svg
                  className="op-results__chart op-results__chart--bar"
                  viewBox={`0 0 ${BAR_CHART_W} ${BAR_CHART_H}`}
                  preserveAspectRatio="xMidYMid meet"
                  role="img"
                  aria-label="日別稼働実績の棒グラフ"
                  style={{ background: theme.surface }}
                >
                  {Array.from({ length: gridLines + 1 }).map((_, i) => {
  const y = BAR_PAD_T + (plotH / gridLines) * i
  const value = Math.round(maxCount - (maxCount / gridLines) * i)
  return (
    <g key={i}>
      <line
        x1={BAR_PAD_L}
        x2={BAR_CHART_W - 10}
        y1={y}
        y2={y}
        stroke={theme.border}
        strokeWidth={1}
        opacity={0.6}
      />
      <text x={BAR_PAD_L - 8} y={y + 3} textAnchor="end" className="op-results__axis-label" fill={theme.subtext}>
        {value}
      </text>
    </g>
  )
})}

{dates.map((date, dIdx) => {
  const groupX = BAR_PAD_L + groupW * dIdx
  return (
    <g key={date}>
      {barItems.map((it, sIdx) => {
        const count = it.values[dIdx] ?? 0
        const barH = (count / maxCount) * plotH
        const x = groupX + (groupW - barItems.length * barW) / 2 + sIdx * barW
        const y = BAR_PAD_T + plotH - barH
        return (
          <g key={it.id}>
            <rect
              x={x}
              y={y}
              width={barW - 10}
              height={barH}
              rx={1.5}
              fill={it.color}
              opacity={dIdx === dates.length - 1 ? 1 : 0.72}
            >
              <title>{`${date} ${it.label}: ${count}回`}</title>
            </rect>
            <text
              x={x + (barW - 2) / 2}
              y={y - 3}
              textAnchor="middle"
              className="op-results__bar-value-label"
              fill={theme.text}
            >
              {count}
            </text>
          </g>
        )
      })}
      <text
        x={groupX + groupW / 2}
        y={BAR_CHART_H - 4}
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
              </div>
              <div className="op-results__legend">
                {barItems.map((it) => (
                  <span key={it.id} className="op-results__legend-item" style={{ color: theme.subtext }}>
                    <span className="op-results__swatch" style={{ background: it.color }} />
                    {it.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="op-results__edit-panel" style={{ background: theme.headerBg, borderColor: theme.border }}>
            <div className="op-results__edit-panel-scroll">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <span style={{ fontSize: '14px', color: theme.text }}>編集モード</span>
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                  <input
                    type="checkbox"
                    id="editMode"
                    name="editMode"
                    checked={isEditing}
                    onChange={(e) => onEditingChange(e.target.checked)}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      cursor: 'pointer',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
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
                <span style={{ fontSize: '13px', color: theme.text }}>{isEditing ? 'ON' : 'OFF'}</span>
              </div>

              <section className="op-results__panel-section">
                <h3 style={{ color: theme.text }}>円グラフの位置・大きさ（OK/NG判定割合）</h3>
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
                    id="pieRadius"
                    name="pieRadius"
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

              <section className="op-results__panel-section">
                <h3 style={{ color: theme.text }}>色（ロボットモニタ）</h3>
                <div className="op-results__edit-group">
                  {barItems.map((it) => (
                    <label key={it.id} className="op-results__color-row">
                      <span className="op-results__color-row-label" style={{ color: theme.subtext }}>
                        {it.label}
                      </span>
                      <input type="color"id={`color-${it.id}`} name={`color-${it.id}`}className="op-results__color-input" value={it.color} onChange={(e) => handleColorChange(it.id, e.target.value)} />
                    </label>
                  ))}
                </div>
              </section>

              <section className="op-results__panel-section">
                <h3 style={{ color: theme.text }}>色（OK/NG判定割合）</h3>
                <div className="op-results__edit-group">
                  {okNgItems.map((it) => (
                    <label key={it.id} className="op-results__color-row">
                      <span className="op-results__color-row-label" style={{ color: theme.subtext }}>
                        {it.label}
                      </span>
                      <input type="color"id={`okng-color-${it.id}`}name={`okng-color-${it.id}`} className="op-results__color-input" value={it.color} onChange={(e) => handleColorChange(it.id, e.target.value)} />
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

      <img src={qrSrc} alt="QRコード" className="op-results__qr" />
    </PanelFrame>
  )
}
