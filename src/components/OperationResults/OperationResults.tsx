import { useEffect, useMemo, useRef, useState } from 'react'
import PanelFrame from '../common/PanelFrame'
import JobFlowDiagram from './JobFlowDiagram'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { useCycleHistory, type CycleStatus } from '../../hooks/useCycleHistory'
import type { Theme } from '../../types'
import './OperationResults.css'

/** 稼働実績（検査回数・異常回数・上刃挿入回数・取付実行回数・取出実行回数・検査OK/NG）の日別データ */
export interface MetricPoint {
  date: string
  /** 検査回数 */
  inspectCount: number
  /** 異常回数 */
  anomalyCount: number
  /** 上刃挿入回数 */
  insertCount: number
  /** 取付実行回数 */
  tightenCount: number
  /** 取出実行回数 */
  loosenCount: number
  /** 検査OK回数 */
  okCount: number
  /** 検査NG回数 */
  ngCount: number
}

type MetricKey = Exclude<keyof MetricPoint, 'date'>

/** 10秒稼働率の推移点。PLCアドレス未定のため、指定が無い場合はサンプル値でフォールバック表示する */
export interface UtilizationPoint {
  label: string
  rate: number
}

interface OperationResultsProps {
  theme: Theme
  isEditing: boolean
  /** PLCのDアドレスから受け取る現在工程ステップ値。フロー図の該当工程を強調表示します。 */
  activeStep?: number
  /** 稼働実績（検査回数・異常回数・上刃挿入回数・取付実行回数・取出実行回数・検査OK/NG）の日別データ */
  metrics: MetricPoint[]
  /** 全体サイクルタイム（秒）。PLCのDレジスタ（未定）またはコード側の蓄積値から算出。 */
  overallCycleTimeSec?: number
  /** PLCのNG判定信号（true = NG検出中） */
  ngSignal?: boolean
  /** 刃物画像のURL。後から差替え可能な構造にするため、固定値ではなくpropsで受け取る */
  bladeImageUrl?: string
  /** 10秒稼働率の推移データ。PLCアドレス未定のため未指定時はサンプル値を使用 */
  tenSecUtilization?: UtilizationPoint[]
  onEditingChange: (value: boolean) => void
}

const CHART_W = 560
const PIE_CANVAS_H = 460
const DEFAULT_PIE_R = PIE_CANVAS_H / 2 - 40
const PIE_CX = CHART_W / 2
const PIE_CY = PIE_CANVAS_H / 2

// 棒グラフ専用：3日分しかないので横に広めのアスペクト比を確保
const BAR_CHART_W = 1800
const BAR_CHART_H = 260
const BAR_PAD_L = 120
const BAR_PAD_R = 12
const BAR_PAD_B = 60
const BAR_PAD_T = 40
const CHART_AXIS_FONT_SIZE = 48

// 10秒稼働率グラフ（折れ線）
const UTIL_CHART_W = 1800
const UTIL_CHART_H = 260
const UTIL_PAD_L = 160
const UTIL_PAD_R = 5
const UTIL_PAD_T = 55
const UTIL_PAD_B = 50

/** グラフエリア（④）の自動切替間隔（ミリ秒） */
const CAROUSEL_INTERVAL_MS = 8000

/** サイクル履歴（⑤）：最下部ティッカーの最大表示件数 */
const CYCLE_HISTORY_DISPLAY_MAX = 5

/** KPIカード・棒グラフ共通の5指標定義（色を統一するため同じ定義を両方で使用する） */
const METRIC_DEFS: { key: MetricKey; label: string; defaultColor: string }[] = [
  { key: 'inspectCount', label: '検査回数', defaultColor: '#4f9cd9' },
  { key: 'anomalyCount', label: '異常回数', defaultColor: '#e0503f' },
  { key: 'insertCount', label: '上刃挿入回数', defaultColor: '#e0b04f' },
  { key: 'tightenCount', label: '取付実行回数', defaultColor: '#4fbf8f' },
  { key: 'loosenCount', label: '取出実行回数', defaultColor: '#8a7fc9' },
]

/** 円グラフ（OK/NG判定割合）の2指標定義 */
const OKNG_DEFS: { key: MetricKey; label: string; defaultColor: string }[] = [
  { key: 'okCount', label: 'OK', defaultColor: '#4fbf8f' },
  { key: 'ngCount', label: 'NG', defaultColor: '#e0503f' },
]

const STATUS_LABEL: Record<CycleStatus, string> = {
  normal: '正常',
  abnormal: '異常',
  pending: '判定中',
}

const STATUS_COLOR: Record<CycleStatus, string> = {
  normal: '#4fbf8f',
  abnormal: '#e0503f',
  pending: '#7d8aa8',
}

/** 10秒稼働率のサンプル値（PLCアドレス確定まではこちらを表示） */
const SAMPLE_UTILIZATION: UtilizationPoint[] = [
  { label: '0s', rate: 82 },
  { label: '10s', rate: 88 },
  { label: '20s', rate: 91 },
  { label: '30s', rate: 85 },
  { label: '40s', rate: 93 },
  { label: '50s', rate: 90 },
]

function formatCycleTime(sec?: number) {
  if (!sec || sec <= 0) return '--'
  return `${sec.toFixed(1)} 秒`
}

function computeMaxCount(values: number[][]): number {
  const allValues = values.flat()
  const max = Math.max(...allValues, 0)
  const padded = max + 5
  return Math.max(Math.round(padded / 10) * 10, 10)
}

interface ChartItem {
  id: string
  label: string
  color: string
  values: number[]
}

export default function OperationResults({
  theme,
  isEditing,
  activeStep,
  metrics,
  overallCycleTimeSec,
  ngSignal,
  bladeImageUrl,
  tenSecUtilization,
  onEditingChange,
}: OperationResultsProps) {
  const isMobile = useIsMobile()
  const [customColors, setCustomColors] = useState<Record<string, string>>({})

  /** グラフエリア統合（④）：日別実績／10秒稼働率を一定間隔で自動切替する */
  const [carouselIndex, setCarouselIndex] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => {
      setCarouselIndex((i) => (i + 1) % 2)
    }, CAROUSEL_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [])

  /** サイクル履歴・ベストサイクルタイム（⑤） */
  const { history, bestCycleTimeSec } = useCycleHistory(overallCycleTimeSec)

  /** 新規追加された行だけにスライドインアニメーションを付ける */
  const [flashNo, setFlashNo] = useState<number | null>(null)
  const prevLenRef = useRef(history.length)
  useEffect(() => {
    if (history.length > prevLenRef.current) {
      const latest = history[history.length - 1]
      setFlashNo(latest.no)
      const t = window.setTimeout(() => setFlashNo(null), 500)
      prevLenRef.current = history.length
      return () => window.clearTimeout(t)
    }
    prevLenRef.current = history.length
  }, [history])

  const displayedHistory = history.slice(-CYCLE_HISTORY_DISPLAY_MAX)

  /** モニタごとの実高さの違いに自動追従して、コンテンツ全体を「はみ出さない最大サイズ」にスケールする */
  const scaleOuterRef = useRef<HTMLDivElement | null>(null)
  const scaleInnerRef = useRef<HTMLDivElement | null>(null)
  const [contentScale, setContentScale] = useState(1)

  const dates = metrics.map((m) => m.date)
  const latest = metrics.at(-1)

  const kpiItems: ChartItem[] = useMemo(
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
  const groupW = (BAR_CHART_W - BAR_PAD_L - BAR_PAD_R) / Math.max(dates.length, 1)
  const barW = Math.min(60, groupW / (kpiItems.length + 1))
  const maxCount = computeMaxCount(kpiItems.map((it) => it.values))
  const gridLines = 2

  const okNgTotals = useMemo(
    () => okNgItems.map((it) => ({ ...it, total: it.values.reduce((sum, v) => sum + v, 0) })),
    [okNgItems]
  )
  const grandTotal = Math.max(okNgTotals.reduce((sum, it) => sum + it.total, 0), 1)

  const utilizationData = tenSecUtilization && tenSecUtilization.length > 0 ? tenSecUtilization : SAMPLE_UTILIZATION
  const utilPlotW = UTIL_CHART_W - UTIL_PAD_L - UTIL_PAD_R
  const utilPlotH = UTIL_CHART_H - UTIL_PAD_T - UTIL_PAD_B
  const utilPoints = utilizationData.map((p, i) => {
    const x = UTIL_PAD_L + (utilPlotW / Math.max(utilizationData.length - 1, 1)) * i
    const y = UTIL_PAD_T + utilPlotH - (Math.min(Math.max(p.rate, 0), 100) / 100) * utilPlotH
    return { x, y, ...p }
  })
  const utilPolylinePoints = utilPoints.map((p) => `${p.x},${p.y}`).join(' ')

  const handleColorChange = (id: string, color: string) => {
    setCustomColors((prev) => ({ ...prev, [id]: color }))
  }

  const handleResetColors = () => setCustomColors({})

  useEffect(() => {
    const outer = scaleOuterRef.current
    const inner = scaleInnerRef.current
    if (!outer || !inner) return

    let frame = 0
    const recompute = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const availableH = outer.clientHeight
        const naturalH = inner.offsetHeight
        if (availableH <= 0 || naturalH <= 0) return
        const next = Math.min(Math.max(availableH / naturalH, 0.55), 1.6)
        setContentScale((prev) => (Math.abs(prev - next) > 0.01 ? next : prev))
      })
    }

    const ro = new ResizeObserver(recompute)
    ro.observe(outer)
    ro.observe(inner)
    recompute()

    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
    }
  }, [metrics, activeStep, ngSignal, isMobile, overallCycleTimeSec, carouselIndex, displayedHistory.length])

  /** ベスト／現在サイクルタイム：グラフの色分けと混同しないよう、あえて色を付けずKPIカードと同じ形で表示する */
  const cycleTimeCards = (
    <>
      <div className="op-results__kpi-card" style={{ borderLeftColor: theme.border, background: theme.headerBg }}>
        <span className="op-results__kpi-label" style={{ color: theme.subtext }}>
          bestサイクルタイム
        </span>
        <span className="op-results__kpi-value-wrap">
          <span className="op-results__kpi-value" style={{ color: theme.text }}>
            {formatCycleTime(bestCycleTimeSec)}
          </span>
        </span>
      </div>
      <div className="op-results__kpi-card" style={{ borderLeftColor: theme.border, background: theme.headerBg }}>
        <span className="op-results__kpi-label" style={{ color: theme.subtext }}>
          現在サイクルタイム
        </span>
        <span className="op-results__kpi-value-wrap">
          <span className="op-results__kpi-value" style={{ color: theme.text }}>
            {formatCycleTime(overallCycleTimeSec)}
          </span>
        </span>
      </div>
    </>
  )

  /** KPIカード（②）：検査回数・異常回数・上刃挿入回数・取付実行回数・取出実行回数＋ベスト／現在サイクルタイムを縦配置。
   *  色は棒グラフと統一し、異常回数のみ常時うっすら赤みを付ける。サイクルタイムはグラフの色と混雑しないよう色分けなし。 */
  const kpiColumn = (
    <div className="op-results__kpi-col">
      {kpiItems.map((it) => (
        <div
          key={it.id}
          className={`op-results__kpi-card${it.id === 'anomalyCount' ? ' op-results__kpi-card--anomaly' : ''}`}
          style={{ borderLeftColor: it.color, background: theme.headerBg }}
        >
          <span className="op-results__kpi-label" style={{ color: theme.subtext }}>
            {it.label}
          </span>
          <span className="op-results__kpi-value-wrap">
            <span className="op-results__kpi-value" style={{ color: theme.text }}>
              {latest?.[it.id as MetricKey] ?? '--'}
            </span>
            <span className="op-results__kpi-unit" style={{ color: theme.subtext }}>
              回
            </span>
          </span>
        </div>
      ))}
      {cycleTimeCards}
    </div>
  )

  /** モバイル専用：横スクロールKPI・ドーナツ・棒/折れ線グラフは廃止し、
   *  検査系の各回数・OK/NG回数・現在の稼働率を、全体フローと同じ「ボックス」形式で縦に積んで表示する。
   *  （幅が途切れる横スクロールや、読み取りにくいグラフを避けるための簡易表示） */
  const mobileStatsList = (
    <div className="op-results__kpi-col">
      {kpiItems.map((it) => (
        <div
          key={it.id}
          className={`op-results__kpi-card${it.id === 'anomalyCount' ? ' op-results__kpi-card--anomaly' : ''}`}
          style={{ borderLeftColor: it.color, background: theme.headerBg }}
        >
          <span className="op-results__kpi-label" style={{ color: theme.subtext }}>
            {it.label}
          </span>
          <span className="op-results__kpi-value-wrap">
            <span className="op-results__kpi-value" style={{ color: theme.text }}>
              {latest?.[it.id as MetricKey] ?? '--'}
            </span>
            <span className="op-results__kpi-unit" style={{ color: theme.subtext }}>
              回
            </span>
          </span>
        </div>
      ))}
      {okNgTotals.map((it) => (
        <div key={it.id} className="op-results__kpi-card" style={{ borderLeftColor: it.color, background: theme.headerBg }}>
          <span className="op-results__kpi-label" style={{ color: theme.subtext }}>
            {it.label}
          </span>
          <span className="op-results__kpi-value-wrap">
            <span className="op-results__kpi-value" style={{ color: theme.text }}>
              {it.total}
            </span>
            <span className="op-results__kpi-unit" style={{ color: theme.subtext }}>
              回
            </span>
          </span>
        </div>
      ))}
      <div className="op-results__kpi-card" style={{ borderLeftColor: theme.accent, background: theme.headerBg }}>
        <span className="op-results__kpi-label" style={{ color: theme.subtext }}>
          稼働率（現在）
        </span>
        <span className="op-results__kpi-value-wrap">
          <span className="op-results__kpi-value" style={{ color: theme.text }}>
            {utilizationData.at(-1)?.rate ?? '--'}
          </span>
          <span className="op-results__kpi-unit" style={{ color: theme.subtext }}>
            %
          </span>
        </span>
      </div>
      {cycleTimeCards}
    </div>
  )

  /** OK/NG判定割合（ドーナツ）＋刃物画像（③）。NG時はボックス全体を赤色点滅させ、即座に異常を認識できるようにする。 */
  const okNgAndBlade = (
    <div className={`op-results__okng-col${ngSignal ? ' op-results__okng-col--ng' : ''}`}>
      <svg
        className="op-results__okng-chart"
        viewBox={`0 0 ${CHART_W} ${PIE_CANVAS_H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="検査OK/NG判定割合の円グラフ"
      >
        <circle cx={PIE_CX} cy={PIE_CY} r={DEFAULT_PIE_R} fill="none" stroke={theme.border} strokeWidth={Math.max(DEFAULT_PIE_R * 0.42, 12)} opacity={0.4} />
        <g transform={`rotate(-90 ${PIE_CX} ${PIE_CY})`}>
          {(() => {
            const ringWidth = Math.max(DEFAULT_PIE_R * 0.42, 12)
            const circumference = 2 * Math.PI * DEFAULT_PIE_R
            let cumulative = 0
            return okNgTotals.map((it) => {
              const pct = it.total / grandTotal
              const dash = pct * circumference
              const el = (
                <circle
                  key={it.id}
                  cx={PIE_CX}
                  cy={PIE_CY}
                  r={DEFAULT_PIE_R}
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
        {(() => {
          const okItem = okNgTotals.find((it) => it.id === 'okCount')
          const okPct = grandTotal > 0 ? Math.round(((okItem?.total ?? 0) / grandTotal) * 100) : 0
          return (
            <text x={PIE_CX} y={PIE_CY} textAnchor="middle" dominantBaseline="middle" fontSize={Math.max(DEFAULT_PIE_R * 0.42, 22)} fontWeight={700} fill={theme.text}>
              {okPct}%
            </text>
          )
        })()}
      </svg>
      <div className="op-results__okng-legend">
        {okNgTotals.map((it) => {
          const pct = grandTotal > 0 ? Math.round((it.total / grandTotal) * 100) : 0
          return (
            <span key={it.id} className="op-results__okng-legend-item" style={{ color: theme.subtext }}>
              <span className="op-results__swatch" style={{ background: it.color }} />
              {it.label}：{it.total}回（{pct}%）
            </span>
          )
        })}
      </div>

      {!isMobile && (
        <div className="op-results__blade-frame" style={{ borderColor: theme.border }}>
          {bladeImageUrl ? <img src={bladeImageUrl} alt="刃物画像" /> : (
            <span style={{ color: theme.subtext, fontSize: 20 }}>刃物画像未設定</span>
          )}
        </div>
      )}
    </div>
  )

  /** グラフエリア統合（④）：日別実績（棒グラフ）と10秒稼働率（折れ線）を一定間隔で自動切替。
   *  傾向把握が目的のため、グラフ下のラベル・棒の上の数値ラベルは表示しない。 */
  const graphCarousel = (
    <div className="op-results__graph-carousel">
      <div className="op-results__graph-carousel-head">
        <span className="op-results__graph-carousel-title" style={{ color: theme.text }}>
          {carouselIndex === 0 ? '日別実績' : '10秒稼働率'}
        </span>
        <span className="op-results__graph-carousel-dots">
          <span className={`op-results__graph-carousel-dot${carouselIndex === 0 ? ' op-results__graph-carousel-dot--active' : ''}`} style={{ background: theme.accent }} />
          <span className={`op-results__graph-carousel-dot${carouselIndex === 1 ? ' op-results__graph-carousel-dot--active' : ''}`} style={{ background: theme.accent }} />
        </span>
      </div>
      <div className="op-results__graph-carousel-body">
        {carouselIndex === 0 ? (
          <svg
            className="op-results__chart"
            viewBox={`0 0 ${BAR_CHART_W} ${BAR_CHART_H}`}
            preserveAspectRatio="xMinYMin meet"
            role="img"
            aria-label="日別稼働実績の棒グラフ"
            style={{ background: theme.surface }}
          >
            {Array.from({ length: gridLines + 1 }).map((_, i) => {
              const y = BAR_PAD_T + (plotH / gridLines) * i
              const value = Math.round(maxCount - (maxCount / gridLines) * i)
              return (
                <g key={i}>
                  <line x1={BAR_PAD_L} x2={BAR_CHART_W - 10} y1={y} y2={y} stroke={theme.border} strokeWidth={1} opacity={0.6} />
                  <text x={BAR_PAD_L - 8} y={y + 3} textAnchor="end" fontSize={CHART_AXIS_FONT_SIZE} fill={theme.subtext}>
                    {value}
                  </text>
                </g>
              )
            })}
            {dates.map((date, dIdx) => {
              const groupX = BAR_PAD_L + groupW * dIdx
              return (
                <g key={date}>
                  <text
                    x={groupX + groupW / 2}
                    y={BAR_CHART_H - 10}
                    textAnchor="middle"
                    fontSize={CHART_AXIS_FONT_SIZE}
                    fill={theme.subtext}
                  >
                    {date}
                  </text>
                  {kpiItems.map((it, sIdx) => {
                    const count = it.values[dIdx] ?? 0
                    const barH = (count / maxCount) * plotH
                    const x = groupX + (groupW - kpiItems.length * barW) / 2 + sIdx * barW
                    const y = BAR_PAD_T + plotH - barH
                    return (
                      <rect key={it.id} x={x} y={y} width={barW - 10} height={barH} rx={1.5} fill={it.color} opacity={dIdx === dates.length - 1 ? 1 : 0.72}>
                        <title>{`${date} ${it.label}: ${count}回`}</title>
                      </rect>
                    )
                  })}
                </g>
              )
            })}
          </svg>
        ) : (
          <svg
            className="op-results__chart"
            viewBox={`0 0 ${UTIL_CHART_W} ${UTIL_CHART_H}`}
            preserveAspectRatio="xMinYMin meet"
            role="img"
            aria-label="10秒稼働率の推移グラフ"
            style={{ background: theme.surface }}
          >
            {[0, 50, 100].map((v) => {
              const y = UTIL_PAD_T + utilPlotH - (v / 100) * utilPlotH
              return (
                <g key={v}>
                  <line x1={UTIL_PAD_L} x2={UTIL_CHART_W - UTIL_PAD_R} y1={y} y2={y} stroke={theme.border} strokeWidth={1} opacity={0.6} />
                  <text x={UTIL_PAD_L - 8} y={y + 3} textAnchor="end" fontSize={CHART_AXIS_FONT_SIZE} fill={theme.subtext}>
                    {v}%
                  </text>
                </g>
              )
            })}
            <polyline points={utilPolylinePoints} fill="none" stroke={theme.accent} strokeWidth={3} />
            {utilPoints.map((p) => (
              <g key={p.label}>
                <circle cx={p.x} cy={p.y} r={4} fill={theme.accent} />
                <text
                  x={p.x + (p.label === '0s' ? 25 : 0)}
                  y={UTIL_CHART_H - 8}
                  textAnchor="middle"
                  fontSize={CHART_AXIS_FONT_SIZE}
                  fill={theme.subtext}
                >
                  {p.label}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>
    </div>
  )

  /** サイクル履歴（グラフのすぐ下にボックス表示・最大5件・新規は下からスライドイン）
   *  ベスト／現在サイクルタイムはKPIカード側に統合済みのため、ここは履歴表のみ */
  const cycleSection = (
      <div className={`op-results__cycle-history${isMobile ? ' op-results__cycle-history--mobile' : ''}`}>
        <span className="op-results__cycle-history-title" style={{ color: theme.text }}>
          サイクル履歴
        </span>
        <table className="op-results__cycle-history-table">
          <thead>
            <tr style={{ color: theme.subtext }}>
              <th>No.</th>
              <th>開始時刻</th>
              <th>終了時刻</th>
              <th>サイクルタイム</th>
              <th>ステータス</th>
            </tr>
          </thead>
          <tbody>
            {displayedHistory.length === 0 && (
              <tr>
                <td colSpan={5} style={{ color: theme.subtext }}>
                  データ収集中…
                </td>
              </tr>
            )}
            {displayedHistory.map((rec) => (
              <tr key={rec.no} className={rec.no === flashNo ? 'op-results__cycle-history-row--enter' : undefined} style={{ color: theme.text }}>
                <td>{rec.no}</td>
                <td>{rec.startTime}</td>
                <td>{rec.endTime}</td>
                <td>{rec.cycleTimeSec.toFixed(1)} 秒</td>
                <td>
                  <span className="op-results__status-pill" style={{ background: STATUS_COLOR[rec.status] }}>
                    {STATUS_LABEL[rec.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
  )

  return (
    <PanelFrame className="op-results">
      <div className="op-results__body">
        <div className="op-results__main-col">
          <div className="op-results__scale-outer" ref={scaleOuterRef}>
            <div
              className="op-results__scale-inner"
              ref={scaleInnerRef}
              style={{
                transform: `scale(${contentScale})`,
                width: contentScale !== 1 ? `${100 / contentScale}%` : '100%',
              }}
            >
              {isMobile ? (
                <>
                  {/* モバイル：フローは簡易ボックス表示、各回数・OK/NG・稼働率も同じボックス形式で縦積み
                      （横スクロールKPIやドーナツ／棒・折れ線グラフは可読性のため廃止） */}
                  <JobFlowDiagram theme={theme} activeStep={activeStep} ngSignal={ngSignal} />
                  {mobileStatsList}
                </>
              ) : (
                <>
                  {/* ①ロボットフロー（中央上段）／②KPI＋サイクルタイム（左・全高）／
                      ③OK/NG＋刃物（右・全高）／④グラフ＋サイクル履歴（中央下段・縦積み） */}
                  <div className="op-results__top-grid">
                    {kpiColumn}
                    <div className="op-results__flow-col">
                      <JobFlowDiagram theme={theme} activeStep={activeStep} ngSignal={ngSignal} />
                    </div>
                    {/* グラフの直下にサイクル履歴をボックス表示し、グラフ下の余白をそのまま履歴に充てる */}
                    <div className="op-results__graph-history-col">
                      {graphCarousel}
                      {cycleSection}
                    </div>
                    {okNgAndBlade}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* モバイル版のみ：サイクル履歴をスケール対象外の最下部にボックス表示 */}
          {isMobile && <div className="op-results__cycle-wrap">{cycleSection}</div>}
        </div>

        {isEditing && !isMobile && (
          <div className="op-results__edit-panel" style={{ background: theme.headerBg, borderColor: theme.border }}>
            <div className="op-results__edit-panel-scroll">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                <span style={{ fontSize: '20px', color: theme.text }}>編集モード</span>
                <label className={`toggle-switch${isEditing ? ' toggle-switch--on' : ''}`}>
                  <input
                    type="checkbox"
                    className="toggle-switch__input"
                    checked={isEditing}
                    onChange={(e) => onEditingChange(e.target.checked)}
                    aria-label="編集モードの切替"
                  />
                  <span className="toggle-switch__track" style={{ background: isEditing ? theme.accent : theme.border }}>
                    <span className="toggle-switch__thumb" />
                  </span>
                </label>
                <span style={{ fontSize: '20px', color: theme.text }}>{isEditing ? 'ON' : 'OFF'}</span>
              </div>

              <section className="op-results__panel-section">
                <h3 style={{ color: theme.text }}>色（KPIカード／ロボットモニタ共通）</h3>
                <div className="op-results__edit-group">
                  {kpiItems.map((it) => (
                    <label key={it.id} className="op-results__color-row">
                      <span className="op-results__color-row-label" style={{ color: theme.subtext }}>{it.label}</span>
                      <input className="op-results__color-input" type="color" value={it.color} onChange={(e) => handleColorChange(it.id, e.target.value)} />
                    </label>
                  ))}
                </div>
              </section>

              <section className="op-results__panel-section">
                <h3 style={{ color: theme.text }}>色（OK/NG判定割合）</h3>
                <div className="op-results__edit-group">
                  {okNgItems.map((it) => (
                    <label key={it.id} className="op-results__color-row">
                      <span className="op-results__color-row-label" style={{ color: theme.subtext }}>{it.label}</span>
                      <input className="op-results__color-input" type="color" value={it.color} onChange={(e) => handleColorChange(it.id, e.target.value)} />
                    </label>
                  ))}
                  <button type="button" className="op-results__color-reset" style={{ borderColor: theme.border, color: theme.subtext }} onClick={handleResetColors}>
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
