import { useEffect, useRef, type ReactNode } from 'react'
import type { Theme } from '../../types'
import { useIsMobile } from '../../hooks/useMediaQuery'
import './JobFlowDiagram.css'

interface FlowNodeDef {
  id: string
  kind: 'process' | 'decision' | 'terminal'
  /** ラベル文字列。"\n" で改行 */
  label: string
  /**
   * PLCの現在ステップレジスタ（D100など、アドレス未定）と対応させる仮番号。
   * 実アドレス確定後、PLC側の実際のステップ値に合わせて書き換えてください。
   * 全体フロー=1〜、RB1フロー=21〜、RB2フロー=31〜 の範囲で仮採番しています。
   */
  plcStep?: number
}

/** 判定結果の色（テーマに依存せず固定。うっすら赤＝異常系の視認性を優先） */
const OK_COLOR = '#4fbf8f'
const NG_COLOR = '#d9713c'

// ── ①全体フロー（フロー画面草案.pdf「全体」を参照） ─────────────────────
// 刃物取付 → インターバル → 刃物取外 → 検査 → 検査結果OK？
//   YES（OK） … 刃物交換を飛ばして「刃物ストックへ返却」へ
//   NO （NG） … 刃物交換 → 刃物ストックへ返却
// → 動作準備 → （先頭「刃物取付」へループ）
//
// 修正依頼（草案PDF）により、検査結果とその後の工程は「判明してから表示する」
// 方式に変更。そのため刃物交換のみ判定結果に応じて出し入れする分岐ノードとして扱う。
const OVERALL_FLOW: FlowNodeDef[] = [
  { id: 'ov-1', kind: 'process', label: '刃物取付', plcStep: 1 },
  { id: 'ov-2', kind: 'process', label: 'インターバル', plcStep: 2 },
  { id: 'ov-3', kind: 'process', label: '刃物取外', plcStep: 3 },
  { id: 'ov-4', kind: 'process', label: '検査', plcStep: 4 },
  { id: 'ov-d', kind: 'decision', label: '検査結果\nOK？', plcStep: 5 },
  { id: 'ov-5', kind: 'process', label: '刃物交換', plcStep: 6 },
  { id: 'ov-6', kind: 'process', label: '刃物ストックへ\n返却', plcStep: 7 },
  { id: 'ov-7', kind: 'process', label: '動作準備', plcStep: 8 },
]
const OVERALL_DECISION_STEP = OVERALL_FLOW.find((n) => n.id === 'ov-d')!.plcStep!

// ── ②RB1フロー ────────────────────────────────────────────────
const RB1_FLOW: FlowNodeDef[] = [
  { id: 'rb1-s', kind: 'terminal', label: 'START' },
  { id: 'rb1-1', kind: 'process', label: '下刃撮像', plcStep: 21 },
  { id: 'rb1-2', kind: 'process', label: '上刃取付開始', plcStep: 22 },
  { id: 'rb1-3', kind: 'process', label: '嵌合動作', plcStep: 23 },
  { id: 'rb1-4', kind: 'process', label: '上刃位置確認', plcStep: 24 },
  { id: 'rb1-d', kind: 'decision', label: '設定個数\n到達？', plcStep: 25 },
  { id: 'rb1-e', kind: 'terminal', label: 'END' },
]

// ── ③RB2フロー ────────────────────────────────────────────────
const RB2_FLOW: FlowNodeDef[] = [
  { id: 'rb2-s', kind: 'terminal', label: 'START' },
  { id: 'rb2-1', kind: 'process', label: 'ねじ締めを行う', plcStep: 31 },
  { id: 'rb2-d', kind: 'decision', label: '設定個数\n到達？', plcStep: 32 },
  { id: 'rb2-e', kind: 'terminal', label: 'END' },
]

/** 「n/m工程」の進捗を、plcStepを持つノードの数から計算する */
function computeProgress(nodes: FlowNodeDef[], activeStep: number | undefined, totalOverride?: number) {
  const stepped = nodes.filter((n) => n.plcStep !== undefined)
  const total = totalOverride ?? stepped.length
  if (activeStep === undefined) return { current: 0, total }
  let current = 0
  stepped.forEach((n, i) => {
    if (n.plcStep! <= activeStep) current = i + 1
  })
  return { current, total }
}

/**
 * 全体フローの表示ノードを、検査結果が判明しているかどうかに応じて組み立てる。
 * 判明前：検査結果の分岐（◆）まで表示。判明後：NGなら「刃物交換」を挟み、OKなら飛ばす。
 * 進捗の分母は「基本工程が多いパターン（NG＝8工程）」を初期値とし、
 * OKと判明した時点で7工程に縮める。
 */
function resolveOverallFlow(activeStep: number | undefined, ngSignal: boolean | undefined) {
  const decisionIdx = OVERALL_FLOW.findIndex((n) => n.id === 'ov-d')
  const resolved = activeStep !== undefined && activeStep > OVERALL_DECISION_STEP
  const nodes = resolved
    ? ngSignal
      ? OVERALL_FLOW
      : OVERALL_FLOW.filter((n) => n.id !== 'ov-5')
    : OVERALL_FLOW.slice(0, decisionIdx + 1)
  const progress = computeProgress(nodes, activeStep, resolved ? undefined : OVERALL_FLOW.length)
  return { nodes, resolved, progress }
}

// ══════════════════════════════════════════════════════════════════════
// 共通エンジン：全フロー（全体／RB1／RB2）で同じ形状（矩形・ひし形・端子）を
// 使う横並びSVG図。ノードごとに必要な行数分の高さ・幅を確保し、ラベルの
// 被りを防ぐ。戻りループの矢印は使わず、必要な場合は呼び出し側で
// キャプションテキストとして表示する。
// ══════════════════════════════════════════════════════════════════════

interface SizingConfig {
  boxW: number
  boxH: number
  diamondW: number
  diamondH: number
  termW: number
  termH: number
  gapX: number
  leftPad: number
  rightPad: number
  topPad: number
  bottomPad: number
  lineHeight: number
}

/** ノード1個あたりの最小幅目安（全角1文字＝約17px、左右余白込み）。ラベルの被りを防ぐため文字数に応じて広げる
 *  ※このフロー図（FlowCanvas）はモニタ（52インチ等の大画面）専用表示。モバイルは
 *  CurrentStepView（現在工程のみのシンプル表示）を使うため、文字サイズと箱の大きさは
 *  常にモニタでの視認性を優先してよい（下のCSSのフォントサイズと連動させること）。 */
function estimateNodeWidth(label: string, minWidth: number, charPx = 17, padding = 30) {
  const longestLine = Math.max(...label.split('\n').map((l) => l.length))
  return Math.max(minWidth, longestLine * charPx + padding)
}

const OVERALL_SIZING: SizingConfig = {
  boxW: 165,
  boxH: 58,
  diamondW: 114,
  diamondH: 86,
  termW: 82,
  termH: 40,
  gapX: 42,
  leftPad: 16,
  rightPad: 16,
  topPad: 20,
  bottomPad: 20,
  lineHeight: 18,
}

const ROBOT_SIZING: SizingConfig = {
  boxW: 140,
  boxH: 52,
  diamondW: 110,
  diamondH: 80,
  termW: 70,
  termH: 36,
  gapX: 36,
  leftPad: 14,
  rightPad: 14,
  topPad: 18,
  bottomPad: 18,
  lineHeight: 17,
}

interface HorizontalPositioned {
  node: FlowNodeDef
  cx: number
  left: number
  right: number
  width: number
  height: number
  lines: string[]
}

function layoutHorizontal(nodes: FlowNodeDef[], s: SizingConfig) {
  let x = s.leftPad
  const maxH = Math.max(s.boxH, s.diamondH, s.termH)
  const rowCenterY = s.topPad + maxH / 2
  const positioned: HorizontalPositioned[] = nodes.map((node) => {
    const baseW = node.kind === 'decision' ? s.diamondW : node.kind === 'terminal' ? s.termW : s.boxW
    const width = node.kind === 'terminal' ? baseW : estimateNodeWidth(node.label, baseW)
    const height = node.kind === 'decision' ? s.diamondH : node.kind === 'terminal' ? s.termH : s.boxH
    const left = x
    const right = x + width
    const cx = x + width / 2
    x = right + s.gapX
    return { node, cx, left, right, width, height, lines: node.label.split('\n') }
  })
  const totalW = Math.max(x - s.gapX + s.rightPad, 0)
  const totalH = s.topPad + maxH + s.bottomPad
  return { positioned, totalW, totalH, rowCenterY }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

interface ResolvedChip {
  nodeId: string
  label: string
  color: string
}

interface FlowCanvasProps {
  theme: Theme
  nodes: FlowNodeDef[]
  sizing: SizingConfig
  markerId: string
  activeStep?: number
  /** 判定確定後、指定ノードを色付きチップ表示に差し替える（全体フローのOK/NG用） */
  resolvedChip?: ResolvedChip
  /** ひし形の直後の矢印に添えるラベル（RB1/RB2のYESなど） */
  decisionForwardLabel?: string
  /** trueの場合、現在工程が常に見える位置へ自動スライドする */
  autoSlide?: boolean
  /** 枠の高さなどを個別指定するための追加クラス名 */
  scrollClassName?: string
}

function FlowCanvas({ theme, nodes, sizing: s, markerId, activeStep, resolvedChip, decisionForwardLabel, autoSlide, scrollClassName }: FlowCanvasProps) {
  const { positioned, totalW, totalH, rowCenterY } = layoutHorizontal(nodes, s)
  const scrollRef = useRef<HTMLDivElement>(null)

  const activeIdx = positioned.findIndex((p) => p.node.plcStep !== undefined && p.node.plcStep === activeStep)
  const focusTarget = activeIdx >= 0 ? positioned[activeIdx] : undefined

  useEffect(() => {
    if (!autoSlide) return
    const el = scrollRef.current
    const target = focusTarget ?? positioned[positioned.length - 1]
    if (!el || !target) return
    const containerW = el.clientWidth || totalW
    const left = clamp(target.cx - containerW / 2, 0, Math.max(totalW - containerW, 0))
    el.scrollTo({ left, behavior: 'smooth' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSlide, activeStep, nodes.length])

  const isActive = (p: HorizontalPositioned) => p.node.plcStep !== undefined && activeStep !== undefined && p.node.plcStep === activeStep

  const renderLines = (p: HorizontalPositioned, cx: number, labelClass: string, fill: string) => {
    const lineDy = s.lineHeight
    const startDy = -((p.lines.length - 1) * lineDy) / 2
    return (
      <text x={cx} y={rowCenterY + startDy} dominantBaseline="middle" textAnchor="middle" className={labelClass} fill={fill}>
        {p.lines.map((line, li) => (
          <tspan key={li} x={cx} dy={li === 0 ? 0 : lineDy}>
            {line}
          </tspan>
        ))}
      </text>
    )
  }

  const renderChip = (p: HorizontalPositioned, chip: ResolvedChip) => {
    const y = rowCenterY - p.height / 4
    const h = p.height / 2
    return (
      <g key={p.node.id} className="flow__node">
        <rect x={p.left} y={y} width={p.width} height={h} rx={h / 2} fill={chip.color} />
        <text x={p.cx} y={y + h / 2} dominantBaseline="middle" textAnchor="middle" className="flow__terminal-label" fill="#fff">
          {chip.label}
        </text>
      </g>
    )
  }

  const renderDiamond = (p: HorizontalPositioned) => {
    const active = isActive(p)
    const strokeColor = active ? theme.accent : theme.border
    const groupClass = active ? 'flow__node flow__node--active' : 'flow__node'
    const points = [
      [p.left, rowCenterY],
      [p.cx, rowCenterY - p.height / 2],
      [p.right, rowCenterY],
      [p.cx, rowCenterY + p.height / 2],
    ]
      .map((pt) => pt.join(','))
      .join(' ')
    return (
      <g key={p.node.id} className={groupClass}>
        {active && <polygon className="flow__active-glow" points={points} fill="none" stroke={theme.accent} strokeWidth={9} />}
        <polygon points={points} fill={theme.surface} stroke={strokeColor} strokeWidth={active ? 3 : 1.5} />
        {renderLines(p, p.cx, 'flow__label flow__label--sm', theme.subtext)}
      </g>
    )
  }

  const renderTerminal = (p: HorizontalPositioned) => {
    const active = isActive(p)
    const strokeColor = active ? theme.accent : theme.border
    const groupClass = active ? 'flow__node flow__node--active' : 'flow__node'
    const y = rowCenterY - p.height / 2
    const rx = p.height / 2
    return (
      <g key={p.node.id} className={groupClass}>
        <rect x={p.left} y={y} width={p.width} height={p.height} rx={rx} fill={theme.surface} stroke={strokeColor} strokeWidth={active ? 3 : 1.5} />
        <text x={p.cx} y={rowCenterY} dominantBaseline="middle" textAnchor="middle" className="flow__terminal-label" fill={theme.subtext}>
          {p.node.label}
        </text>
      </g>
    )
  }

  const renderBox = (p: HorizontalPositioned) => {
    const active = isActive(p)
    const strokeColor = active ? theme.accent : theme.border
    const groupClass = active ? 'flow__node flow__node--active' : 'flow__node'
    const labelClass = p.lines.length > 1 ? 'flow__label flow__label--sm' : 'flow__label'
    const y = rowCenterY - p.height / 2

    return (
      <g key={p.node.id} className={groupClass}>
        {active && (
          <rect
            className="flow__active-glow"
            x={p.left - 5}
            y={y - 5}
            width={p.width + 10}
            height={p.height + 10}
            rx={7}
            fill="none"
            stroke={theme.accent}
            strokeWidth={8}
          />
        )}
        <rect x={p.left} y={y} width={p.width} height={p.height} rx={5} fill={theme.surface} stroke={strokeColor} strokeWidth={active ? 3 : 1.5} />
        <rect x={p.left} y={y} width={4} height={p.height} fill={theme.accent} rx={2} />
        {renderLines(p, p.cx + 3, labelClass, theme.subtext)}
      </g>
    )
  }

  const renderNode = (p: HorizontalPositioned) => {
    if (resolvedChip && p.node.id === resolvedChip.nodeId) return renderChip(p, resolvedChip)
    if (p.node.kind === 'decision') return renderDiamond(p)
    if (p.node.kind === 'terminal') return renderTerminal(p)
    return renderBox(p)
  }

  const decisionIdx = positioned.findIndex((p) => p.node.kind === 'decision' && !(resolvedChip && p.node.id === resolvedChip.nodeId))

  return (
    <div
      className={`op-results__flow-scroll${scrollClassName ? ` ${scrollClassName}` : ''}`}
      ref={scrollRef}
      style={{ border: `1px solid ${theme.border}`, background: theme.surface }}
    >
      <div className="flow-diagram-wrap">
        <svg className="flow-diagram" width={totalW} height={totalH} viewBox={`0 0 ${totalW} ${totalH}`}>
          <defs>
            <marker id={markerId} markerWidth="9" markerHeight="9" refX="7" refY="3.5" orient="auto">
              <path d="M0,0 L7,3.5 L0,7 Z" fill={theme.subtext} />
            </marker>
          </defs>
          {positioned.map((p) => renderNode(p))}
          {positioned.slice(0, -1).map((p, i) => (
            <line
              key={`${p.node.id}-arrow`}
              x1={p.right}
              y1={rowCenterY}
              x2={positioned[i + 1].left}
              y2={rowCenterY}
              stroke={theme.accent}
              strokeWidth={2}
              markerEnd={`url(#${markerId})`}
            />
          ))}
          {decisionForwardLabel && decisionIdx >= 0 && decisionIdx + 1 < positioned.length && (
            <text
              x={(positioned[decisionIdx].right + positioned[decisionIdx + 1].left) / 2}
              y={rowCenterY - 15} 
              textAnchor="middle"
              className="flow__branch-label"
              fill={OK_COLOR}
            >
              {decisionForwardLabel}
            </text>
          )}
        </svg>
      </div>
    </div>
  )
}

interface FlowPanelProps {
  theme: Theme
  title: string
  progress: { current: number; total: number }
  children: ReactNode
}

function FlowPanel({ theme, title, progress, children }: FlowPanelProps) {
  return (
    <div className="flow-diagram-panel">
      <div className="flow-diagram-panel-head">
        <span className="flow-diagram-panel-title" style={{ color: theme.text }}>
          {title}
        </span>
        <span className="flow-diagram-progress" style={{ color: theme.subtext }}>
          進捗 {progress.current || '--'}/{progress.total}工程
        </span>
      </div>
      {children}
    </div>
  )
}

/** モバイルで表示する「現在工程」の中身（通常の工程名、または判定確定後のOK/NGチップ） */
interface CurrentStepInfo {
  label: string
  chipColor?: string
}

/** activeStepに対応する「現在工程」を1件だけ探す。判定確定後はOK/NGチップに差し替える */
function findCurrentStep(
  nodes: FlowNodeDef[],
  activeStep: number | undefined,
  resolvedChip?: ResolvedChip
): CurrentStepInfo | undefined {
  if (activeStep === undefined) return undefined
  let current: FlowNodeDef | undefined
  nodes.forEach((n) => {
    if (n.plcStep !== undefined && n.plcStep <= activeStep) current = n
  })
  if (!current) return undefined
  if (resolvedChip && current.id === resolvedChip.nodeId) {
    return { label: resolvedChip.label, chipColor: resolvedChip.color }
  }
  return { label: current.label.replace(/\n/g, ' ') }
}

/** モバイル専用：フロー図（横スクロール）の代わりに現在工程だけをシンプルに表示する */
function CurrentStepView({
  theme,
  title,
  progress,
  current,
}: {
  theme: Theme
  title: string
  progress: { current: number; total: number }
  current?: CurrentStepInfo
}) {
  return (
    <div className="flow-diagram-panel">
      <div className="flow-diagram-panel-head">
        <span className="flow-diagram-panel-title" style={{ color: theme.text }}>
          {title}
        </span>
        <span className="flow-diagram-progress" style={{ color: theme.subtext }}>
          進捗 {progress.current || '--'}/{progress.total}工程
        </span>
      </div>
      <div className="flow-current-step" style={{ borderColor: theme.border, background: theme.surface }}>
        {current ? (
          <span
            className="flow-current-step__label"
            style={
              current.chipColor
                ? { background: current.chipColor, color: '#fff' }
                : { color: theme.text }
            }
          >
            {current.label}
          </span>
        ) : (
          <span className="flow-current-step__label" style={{ color: theme.subtext }}>
            --
          </span>
        )}
      </div>
    </div>
  )
}

interface JobFlowDiagramProps {
  theme: Theme
  /** PLCのDレジスタ（現在工程ステップ）から受け取る値。該当工程を強調表示します。 */
  activeStep?: number
  /** PLCのNG判定信号（true = NG検出中）。全体フローの分岐確定に使用します。 */
  ngSignal?: boolean
}

/** 全体フロー図（自動スライド方式・枠で囲んだ表示）。RB1／RB2は RobotFlows を使用してください。
 *  モバイルでは横スクロールのフロー図自体が不要なため、現在工程のみを表示する簡易ビューに切り替える。 */
export default function JobFlowDiagram({ theme, activeStep, ngSignal }: JobFlowDiagramProps) {
  const isMobile = useIsMobile()
  const { nodes, resolved, progress } = resolveOverallFlow(activeStep, ngSignal)
  const resolvedChip = resolved ? { nodeId: 'ov-d', label: ngSignal ? 'NG' : 'OK', color: ngSignal ? NG_COLOR : OK_COLOR } : undefined

  if (isMobile) {
    const current = findCurrentStep(nodes, activeStep, resolvedChip)
    return <CurrentStepView theme={theme} title="全体フロー" progress={progress} current={current} />
  }

  return (
    <FlowPanel theme={theme} title="全体フロー" progress={progress}>
      <FlowCanvas
        theme={theme}
        nodes={nodes}
        sizing={OVERALL_SIZING}
        markerId="flow-arrow-overall"
        activeStep={activeStep}
        resolvedChip={resolvedChip}
        autoSlide
        scrollClassName="op-results__flow-scroll--overall"
      />
    </FlowPanel>
  )
}

/** RB1／RB2フロー。全体フローと同じ矩形・ひし形・端子の形状を用い、それぞれ枠で囲んで表示する。
 *  モバイルでは横スクロールが不要なため、各ロボットの現在工程のみを表示する。 */
export function RobotFlows({ theme, activeStep }: { theme: Theme; activeStep?: number }) {
  const isMobile = useIsMobile()
  const rb1Progress = computeProgress(RB1_FLOW, activeStep)
  const rb2Progress = computeProgress(RB2_FLOW, activeStep)

  if (isMobile) {
    const rb1Current = findCurrentStep(RB1_FLOW, activeStep)
    const rb2Current = findCurrentStep(RB2_FLOW, activeStep)
    return (
      <div className="flow-robot-panels">
        <CurrentStepView theme={theme} title="RB1フロー" progress={rb1Progress} current={rb1Current} />
        <CurrentStepView theme={theme} title="RB2フロー" progress={rb2Progress} current={rb2Current} />
      </div>
    )
  }

  return (
    <div className="flow-robot-panels">
      <FlowPanel theme={theme} title="RB1フロー" progress={rb1Progress}>
        <FlowCanvas
          theme={theme}
          nodes={RB1_FLOW}
          sizing={ROBOT_SIZING}
          markerId="flow-arrow-rb1"
          activeStep={activeStep}
          decisionForwardLabel="YES"
          autoSlide
          scrollClassName="op-results__flow-scroll--robot"
        />
        <div className="flow-diagram-note" style={{ color: NG_COLOR }}>
          NO時は再度「下刃撮像」へ
        </div>
      </FlowPanel>
      <FlowPanel theme={theme} title="RB2フロー" progress={rb2Progress}>
        <FlowCanvas
          theme={theme}
          nodes={RB2_FLOW}
          sizing={ROBOT_SIZING}
          markerId="flow-arrow-rb2"
          activeStep={activeStep}
          decisionForwardLabel="YES"
          autoSlide
          scrollClassName="op-results__flow-scroll--robot"
        />
        <div className="flow-diagram-note" style={{ color: NG_COLOR }}>
          NO時は再度「ねじ締めを行う」へ
        </div>
      </FlowPanel>
    </div>
  )
}
