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
  activeStep?: number
  cycleCurrent?: number
  cycleTotal?: number
  /** ジョブ実行回数タブの色編集で上書きされた色（jobId → color） */
  colorOverrides?: Record<string, string>
}

// ── レイアウト定数（フォントサイズに合わせて余白を確保） ──
const BOX_W = 650
const BOX_H = 85
const ROW_GAP = 40              // 同フェーズ内、矢印分のギャップ
const STEP = BOX_H + ROW_GAP    // ノード間の縦ステップ
const MARGIN_X = 35
const TITLE_GAP = 40            // タイトルから最初のボックスまで
const PHASE_END_GAP = 32        // フェーズ末尾ボックス → 区切りテキストまで
const DIVIDER_TO_TITLE_GAP = 56 // 区切りテキスト → 次フェーズタイトルまで
const TITLE_TO_BOX_GAP = 40     // 次フェーズタイトル → 最初のボックスまで

// ── ループ矢印（曲線）の調整用パラメータ ──
// 各ループ矢印は「開始点 → 終了点」を結ぶベジェ曲線です。
// - bulge      : 曲線がどれだけ横に膨らむか（px）。大きいほど弧が大きくなる
// - ctrl1Ratio : 開始点側の制御点を、開始〜終了の縦距離のどの位置に置くか（0=開始点と同じ高さ）
// - ctrl2Ratio : 終了点側の制御点を、同じく縦距離のどの位置に置くか（1=終了点と同じ高さ）
// 縦距離（ノード数）が違うループでも見た目のバランスが取れるよう、
// それぞれ個別に数値を変えて調整してください。
// ── ♦（分岐）の頂点がボックスの上下端からどれだけ外側に飛び出すか ──
// renderBox内のpolygon座標と、下のDECISION_ARROW_CONFIGの両方から参照する共通値。
const DIAMOND_TOP_INSET = 5    // 上頂点が n.y からどれだけ上に飛び出すか
const DIAMOND_BOTTOM_INSET = 2 // 下頂点が n.y+BOX_H からどれだけ下に飛び出すか

// ── ♦に入る矢印／♦から出る矢印の長さ調整用パラメータ ──
// ♦は上下の頂点がボックス枠より外側に飛び出しているため、通常のボックス間矢印と
// 同じ計算だと「矢印の先端が♦の下に隠れる」「♦との間に隙間ができる」ことがあります。
// ここを個別に調整してください（pxの数値。プラスにするほど矢印は短く＝隙間が増え、
// マイナスにするほど矢印は長く＝♦に食い込みます）。
const DECISION_ARROW_CONFIG = {
  intoGap: 30,  // 手前のボックス →♦ に入る矢印。0で♦の上頂点にぴったり届く
  outGap: -30,   // ♦ → 次のボックス に出る矢印（NG方向）。0で♦の下頂点からぴったり始まる
}

const LOOP_CONFIG = {
  // ①セッティングフェーズ：先頭ノードへ戻る矢印（4ノード分）
  settingLoop: {
    bulge: 90,
    ctrl1Ratio: 0.2,
    ctrl2Ratio: 0.8,
  },
  // ②取出しフェーズ：先頭ノードへ戻る矢印（9ノード分、縦に長い）
  extractionLoop: {
    bulge: 130,
    ctrl1Ratio: 0.12,
    ctrl2Ratio: 0.88,
  },
  // OK分岐：検査ノードから格納ノードまで右側を迂回する矢印
  decisionBranch: {
    bulge: 50,
    ctrl1Ratio: 0.1,
    ctrl2Ratio: 0.9,
  },
}

/**
 * 縦方向に離れた2点を、左右どちらかに膨らむベジェ曲線でつなぐパスを生成します。
 * direction: -1 = 左に膨らむ（戻りループ用）, 1 = 右に膨らむ（OK分岐用）
 */
function bulgeLoopPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  cfg: { bulge: number; ctrl1Ratio: number; ctrl2Ratio: number },
  direction: -1 | 1
) {
  const dx = cfg.bulge * direction
  const c1y = startY + (endY - startY) * cfg.ctrl1Ratio
  const c2y = startY + (endY - startY) * cfg.ctrl2Ratio
  return `M ${startX} ${startY} C ${startX + dx} ${c1y}, ${endX + dx} ${c2y}, ${endX} ${endY}`
}

function buildLayout() {
  const title1Y = TITLE_GAP - 20
  const settingNodes = SETTING_FLOW.map((n, i) => ({ ...n, y: TITLE_GAP + i * STEP }))
  const settingBottom = settingNodes[settingNodes.length - 1].y + BOX_H

  const dividerY = settingBottom + PHASE_END_GAP
  const title2Y = dividerY + DIVIDER_TO_TITLE_GAP
  const extractionStartY = title2Y + TITLE_TO_BOX_GAP

  const extractionNodes = EXTRACTION_FLOW.map((n, i) => ({ ...n, y: extractionStartY + i * STEP }))
  const lastNode = extractionNodes[extractionNodes.length - 1]
  const totalH = lastNode.y + BOX_H + 44

  // 左右のループ矢印（bulge）がSVGの外にはみ出て途切れないよう、
  // LOOP_CONFIGの値に応じてviewBoxの余白を自動計算する。
  // bulgeの数値をどれだけ大きくしても、ここで自動的に描画エリアが広がる。
  const maxLeftBulge = Math.max(LOOP_CONFIG.settingLoop.bulge, LOOP_CONFIG.extractionLoop.bulge)
  const leftExtra = Math.max(0, maxLeftBulge - MARGIN_X + 15)
  const rightExtra = Math.max(90, LOOP_CONFIG.decisionBranch.bulge + 60)

  return { title1Y, settingNodes, settingBottom, dividerY, title2Y, extractionStartY, extractionNodes, lastNode, totalH, leftExtra, rightExtra }
}

export default function JobFlowDiagram({theme, activeStep, cycleCurrent, cycleTotal, colorOverrides, }: JobFlowDiagramProps) {
  const { title1Y, settingNodes, settingBottom, dividerY, title2Y, extractionNodes, lastNode, totalH, leftExtra, rightExtra } = buildLayout()
  const cx = MARGIN_X + BOX_W / 2

  const hasCurrent = typeof cycleCurrent === 'number'
  const hasTotal = typeof cycleTotal === 'number' && cycleTotal > 0
  const cyclePct = hasCurrent && hasTotal ? Math.min(100, Math.round((cycleCurrent! / cycleTotal!) * 100)) : 0
  const cycleCurrentLabel = hasCurrent ? cycleCurrent : '--'
  const cycleTotalLabel = hasTotal ? cycleTotal : '--'

 const renderBox = (n: { id: string; jobId?: string; label: string; kind?: 'decision'; plcStep?: number; y: number }) => {
    const job = n.jobId ? JOB_MAP[n.jobId] : undefined
     const fill = job ? (colorOverrides?.[n.jobId!] ?? job.color) : theme.border
    const isActive = n.plcStep !== undefined && activeStep !== undefined && n.plcStep === activeStep
    const strokeColor = isActive ? theme.accent : fill
    const groupClass = isActive ? 'flow__node flow__node--active' : 'flow__node'

    if (n.kind === 'decision') {
      const cyD = n.y + BOX_H / 2
      const w = BOX_W - 12
      const points = [
        [cx, n.y - DIAMOND_TOP_INSET],
        [cx + w / 2, cyD],
        [cx, n.y + BOX_H + DIAMOND_BOTTOM_INSET],
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
          <text x={cx-3} y={cyD+5} dominantBaseline="middle" textAnchor="middle" className="flow__label" fill={theme.subtext}>
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
    <line key={key} x1={cx+220} y1={fromY} x2={cx+220} y2={toY} stroke={theme.accent} strokeWidth={2.5} markerEnd="url(#flow-arrow)" />
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
        viewBox={`${-leftExtra} 0 ${leftExtra + MARGIN_X * 2 + BOX_W + rightExtra} ${totalH}`}
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

        {/* セッティング先頭へ戻るループ矢印（LOOP_CONFIG.settingLoop で調整） */}
        <path
          d={bulgeLoopPath(
            MARGIN_X - 1, settingBottom - BOX_H / 2,
            MARGIN_X, settingNodes[0].y + BOX_H / 2,
            LOOP_CONFIG.settingLoop, -1
          )}
          fill="none" stroke={theme.accent} strokeWidth={3.5} strokeDasharray="12 6" markerEnd="url(#flow-arrow)"
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
                {arrowDown(n.y + BOX_H + DIAMOND_BOTTOM_INSET + DECISION_ARROW_CONFIG.outGap, next.y, `${n.id}-ng`)}
                <text x={cx + 235} y={n.y + BOX_H - 20} dominantBaseline="hanging" className="flow__branch-label" fill={theme.subtext}>NG</text>
                {/* OK分岐：格納ノードまで右側を迂回（LOOP_CONFIG.decisionBranch で調整） */}
                <path
                  d={bulgeLoopPath(
                    cx + (BOX_W - 12) / 2, n.y + BOX_H / 2,
                    cx + BOX_W / 2, lastNode.y + BOX_H / 2,
                    LOOP_CONFIG.decisionBranch, 1
                  )}
                  fill="none" stroke={theme.accent} strokeWidth={2.5} markerEnd="url(#flow-arrow)"
                />
                <text x={MARGIN_X + BOX_W + 50} y={(n.y + lastNode.y) / 2 - 28} dominantBaseline="middle" className="flow__branch-label" fill={theme.accent}>OK</text>
              </g>
            )
          }
          const arrowEndY = next.kind === 'decision'
            ? next.y - DIAMOND_TOP_INSET + DECISION_ARROW_CONFIG.intoGap
            : next.y
          return (
            <g key={n.id}>
              {renderBox(n)}
              {arrowDown(n.y + BOX_H, arrowEndY, `${n.id}-arrow`)}
            </g>
          )
        })}

        {/* 取出しフェーズ先頭へ戻るループ矢印（LOOP_CONFIG.extractionLoop で調整） */}
        <path
          d={bulgeLoopPath(
            MARGIN_X - 3, lastNode.y + BOX_H / 2,
            MARGIN_X + 1, extractionNodes[0].y + BOX_H / 2,
            LOOP_CONFIG.extractionLoop, -1
          )}
          fill="none" stroke={theme.accent} strokeWidth={3.5} strokeDasharray="12 6" markerEnd="url(#flow-arrow)"
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
