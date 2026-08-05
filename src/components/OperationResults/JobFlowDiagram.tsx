import type { Theme } from '../../types'
import { JOB_MAP } from '../../config/jobDefinitions'
import './JobFlowDiagram.css'

interface FlowNode {
  id: string
  jobId?: string
  label: string
  kind?: 'decision'
  /**
   * PLCのD100（現在工程ステップ）などから送られてくる値と対応させるコード。
   * 実際のPLC側のステップ値に合わせて書き換えてください。
   */
  plcStep?: number
}

const SETTING_FLOW: FlowNode[] = [
  { id: 'set-1', jobId: 'pick-store',    label: '上刃ピック',      plcStep: 1 },
  { id: 'set-2', jobId: 'insert-fit',    label: '挿入・勘合',      plcStep: 2 },
  { id: 'set-3', jobId: 'position',      label: '撮影・位置決め',  plcStep: 3 },
  { id: 'set-4', jobId: 'screw-tighten', label: 'ネジ締め',        plcStep: 4 },
]

const EXTRACTION_FLOW: FlowNode[] = [
  { id: 'ext-1', jobId: 'pick-store',    label: '使用刃つかみ',    plcStep: 11 },
  { id: 'ext-2', jobId: 'screw-loosen',  label: 'ネジ緩め',        plcStep: 12 },
  { id: 'ext-3', jobId: 'inspect',       label: '検査',            plcStep: 13 },
  { id: 'ext-d', jobId: 'sort',          label: 'OK / NG', kind: 'decision', plcStep: 14 },
  { id: 'ext-4', jobId: 'lid',           label: '蓋開',            plcStep: 15 },
  { id: 'ext-5', jobId: 'exchange',      label: '刃交換',          plcStep: 16 },
  { id: 'ext-6', jobId: 'lid',           label: '蓋閉',            plcStep: 17 },
  { id: 'ext-7', jobId: 'ring-spring',   label: 'リング着脱',      plcStep: 18 },
  { id: 'ext-8', jobId: 'pick-store',    label: '格納・ストック',  plcStep: 19 },
]

interface JobFlowDiagramProps {
  theme: Theme
  /** PLCのDアドレスから受け取る現在工程ステップ値。一致するノードを強調表示します。 */
  activeStep?: number
  /** 現在のサイクル数（本日/直近の完了回数など） */
  cycleCurrent?: number
  /** 全体サイクル数（目標・予定回数） */
  cycleTotal?: number
}

// ── レイアウト定数（フォントサイズに合わせて余白を確保） ──
const BOX_W = 700
const BOX_H = 96
const ROW_GAP = 26              // 同フェーズ内、矢印分のギャップ
const STEP = BOX_H + ROW_GAP    // ノード間の縦ステップ
const MARGIN_X = 40
const TITLE_GAP = 40            // タイトルから最初のボックスまで
const PHASE_END_GAP = 32        // フェーズ末尾ボックス → 区切りテキストまで
const DIVIDER_TO_TITLE_GAP = 46 // 区切りテキスト → 次フェーズタイトルまで
const TITLE_TO_BOX_GAP = 28     // 次フェーズタイトル → 最初のボックスまで

function buildLayout() {
  const title1Y = TITLE_GAP - 12
  const settingNodes = SETTING_FLOW.map((n, i) => ({ ...n, y: TITLE_GAP + i * STEP }))
  const settingBottom = settingNodes[settingNodes.length - 1].y + BOX_H

  const dividerY = settingBottom + PHASE_END_GAP
  const title2Y = dividerY + DIVIDER_TO_TITLE_GAP
  const extractionStartY = title2Y + TITLE_TO_BOX_GAP

  const extractionNodes = EXTRACTION_FLOW.map((n, i) => ({ ...n, y: extractionStartY + i * STEP }))
  const lastNode = extractionNodes[extractionNodes.length - 1]
  const totalH = lastNode.y + BOX_H + 44

  return { title1Y, settingNodes, settingBottom, dividerY, title2Y, extractionStartY, extractionNodes, lastNode, totalH }
}

export default function JobFlowDiagram({ theme, activeStep, cycleCurrent, cycleTotal }: JobFlowDiagramProps) {
  const { title1Y, settingNodes, settingBottom, dividerY, title2Y, extractionNodes, lastNode, totalH } = buildLayout()
  const cx = MARGIN_X + BOX_W / 2

  const hasCurrent = typeof cycleCurrent === 'number'
  const hasTotal = typeof cycleTotal === 'number' && cycleTotal > 0
  const cyclePct = hasCurrent && hasTotal ? Math.min(100, Math.round((cycleCurrent! / cycleTotal!) * 100)) : 0
  const cycleCurrentLabel = hasCurrent ? cycleCurrent : '--'
  const cycleTotalLabel = hasTotal ? cycleTotal : '--'

  const renderBox = (n: { id: string; jobId?: string; label: string; kind?: 'decision'; plcStep?: number; y: number }) => {
    const job = n.jobId ? JOB_MAP[n.jobId] : undefined
    const fill = job ? job.color : theme.border
    const isActive = n.plcStep !== undefined && activeStep !== undefined && n.plcStep === activeStep
    const strokeColor = isActive ? theme.accent : fill
    const groupClass = isActive ? 'flow__node flow__node--active' : 'flow__node'

    if (n.kind === 'decision') {
      const cyD = n.y + BOX_H / 2
      const w = BOX_W - 12
      const points = [
        [cx, n.y - 2],
        [cx + w / 2, cyD],
        [cx, n.y + BOX_H + 2],
        [cx - w / 2, cyD],
      ].map((p) => p.join(',')).join(' ')
      return (
        <g key={n.id} className={groupClass}>
          {isActive && (
            <polygon
              className="flow__active-glow"
              points={points}
              fill="none"
              stroke={theme.accent}
              strokeWidth={14}
            />
          )}
          <polygon points={points} fill={theme.surface} stroke={strokeColor} strokeWidth={isActive ? 4 : 1.5} />
          <text x={cx} y={cyD} dominantBaseline="middle" textAnchor="middle" className="flow__label" fill={theme.subtext}>
            {n.label}
          </text>
        </g>
      )
    }
    return (
      <g key={n.id} className={groupClass}>
        {isActive && (
          <rect
            className="flow__active-glow"
            x={MARGIN_X - 6}
            y={n.y - 6}
            width={BOX_W + 12}
            height={BOX_H + 12}
            rx={9}
            fill="none"
            stroke={theme.accent}
            strokeWidth={12}
          />
        )}
        <rect x={MARGIN_X} y={n.y} width={BOX_W} height={BOX_H} rx={5} fill={theme.surface} stroke={strokeColor} strokeWidth={isActive ? 4 : 1.5} />
        <rect x={MARGIN_X} y={n.y} width={4} height={BOX_H} fill={fill} rx={2} />
        <text x={cx + 4} y={n.y + BOX_H / 2 + 8} dominantBaseline="middle" textAnchor="middle" className="flow__label" fill={theme.subtext}>
          {n.label}
        </text>
        {job && (
          <text x={MARGIN_X + BOX_W - 14} y={n.y + 12} dominantBaseline="hanging" textAnchor="end" className="flow__robot" fill={fill}>
            {job.robot}
          </text>
        )}
      </g>
    )
  }

  const arrowDown = (fromY: number, toY: number, key: string) => (
    <line key={key} x1={cx} y1={fromY} x2={cx} y2={toY} stroke={theme.border} strokeWidth={2.5} markerEnd="url(#flow-arrow)" />
  )

  return (
    <div className="flow-diagram-wrap">
      <div className="flow-diagram-wrap__progress">
        <span className="flow-diagram-wrap__progress-label" style={{ color: theme.subtext }}>サイクル進捗</span>
        <div className="flow-diagram-wrap__progress-bar" style={{ background: theme.border }}>
          <div
            className="flow-diagram-wrap__progress-bar-fill"
            style={{ width: `${cyclePct}%`, background: theme.accent }}
          />
        </div>
        <span className="flow-diagram-wrap__progress-value" style={{ color: theme.accent }}>
          {cycleCurrentLabel} / {cycleTotalLabel}
        </span>
        <span className="flow-diagram-wrap__progress-value" style={{ color: theme.subtext }}>
          ({cyclePct}%)
        </span>
      </div>

      <svg
        className="flow-diagram"
        viewBox={`0 0 ${MARGIN_X * 2 + BOX_W + 90} ${totalH}`}
        preserveAspectRatio="xMidYMin meet"
      >
        <defs>
          <marker id="flow-arrow" markerWidth="11" markerHeight="11" refX="8" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill={theme.subtext} />
          </marker>
        </defs>

        <text x={cx} y={title1Y} dominantBaseline="middle" textAnchor="middle" className="flow__title" fill={theme.accent}>
          ① 上刃自動セッティング
        </text>

        {settingNodes.map((n, i) => (
          <g key={n.id}>
            {renderBox(n)}
            {i < settingNodes.length - 1 && arrowDown(n.y + BOX_H, settingNodes[i + 1].y, `${n.id}-arrow`)}
          </g>
        ))}

        {/* セッティング先頭へ戻るループ矢印 */}
        <path
          d={`M ${MARGIN_X} ${settingBottom - BOX_H / 2} C ${MARGIN_X - 24} ${settingBottom - BOX_H}, ${MARGIN_X - 24} ${settingNodes[0].y}, ${MARGIN_X} ${settingNodes[0].y + BOX_H / 2}`}
          fill="none" stroke={theme.border} strokeWidth={2.5} strokeDasharray="4 3" markerEnd="url(#flow-arrow)"
        />

        {/* フェーズ間の連結線（矢印は最後だけ／区切りテキストとタイトルはこの上に重ねて表示） */}
        {arrowDown(settingBottom, extractionNodes[0].y, 'phase-transition')}

        <text x={cx} y={dividerY} dominantBaseline="middle" textAnchor="middle" className="flow__divider" fill={theme.subtext}>
          全刃セット完了 → 交換へ
        </text>

        <text x={cx} y={title2Y} dominantBaseline="middle" textAnchor="middle" className="flow__title" fill={theme.accent}>
          ② 上刃取出し・交換
        </text>

        {extractionNodes.map((n, i) => {
          if (i === extractionNodes.length - 1) return renderBox(n)
          const next = extractionNodes[i + 1]
          if (n.kind === 'decision') {
            return (
              <g key={n.id}>
                {renderBox(n)}
                {arrowDown(n.y + BOX_H + 6, next.y, `${n.id}-ng`)}
                <text x={cx + 22} y={n.y + BOX_H + 38} dominantBaseline="hanging" className="flow__branch-label" fill={theme.subtext}>NG</text>
                <path
                  d={`M ${cx + (BOX_W - 12) / 2} ${n.y + BOX_H / 2} C ${MARGIN_X + BOX_W + 20} ${n.y}, ${MARGIN_X + BOX_W + 40} ${lastNode.y}, ${cx + BOX_W / 2} ${lastNode.y + BOX_H / 2}`}
                  fill="none" stroke={theme.accent} strokeWidth={2.5} markerEnd="url(#flow-arrow)"
                />
                <text x={MARGIN_X + BOX_W + 32} y={(n.y + lastNode.y) / 2 - 28} dominantBaseline="middle" className="flow__branch-label" fill={theme.accent}>OK</text>
              </g>
            )
          }
          return (
            <g key={n.id}>
              {renderBox(n)}
              {arrowDown(n.y + BOX_H, next.y, `${n.id}-arrow`)}
            </g>
          )
        })}

        {/* 取出しフェーズ先頭へ戻るループ矢印 */}
        <path
          d={`M ${MARGIN_X} ${lastNode.y + BOX_H / 2} C ${MARGIN_X - 20} ${lastNode.y}, ${MARGIN_X - 20} ${extractionNodes[0].y}, ${MARGIN_X} ${extractionNodes[0].y + BOX_H / 2}`}
          fill="none" stroke={theme.border} strokeWidth={2.5} strokeDasharray="4 3" markerEnd="url(#flow-arrow)"
        />

        {/* 全刃セット完了後、①へ戻る大きなループ */}
        <path
          d={`M ${MARGIN_X + BOX_W} ${lastNode.y + BOX_H / 2} L ${MARGIN_X + BOX_W + 50} ${lastNode.y + BOX_H / 2} L ${MARGIN_X + BOX_W + 50} ${settingNodes[0].y + BOX_H / 2} L ${MARGIN_X + BOX_W} ${settingNodes[0].y + BOX_H / 2}`}
          fill="none" stroke={theme.accent} strokeWidth={2.5} markerEnd="url(#flow-arrow)"
        />
      </svg>
    </div>
  )
}
