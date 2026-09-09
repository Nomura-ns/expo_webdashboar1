import { useLayoutEffect, useRef, useState } from 'react'
import type { Theme, PageKey } from '../../types'
import { PAGES } from './themes'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { PanelLeft } from 'lucide-react';

// =============================================
// ミニプレビュー用サムネイル枠
// 枠の実サイズと中身の自然なサイズをResizeObserverで実測し、
// X軸・Y軸それぞれ独立の倍率で「枠にぴったりフィット」させる。
// ページごとに中身の縦横比が違っても対応でき、画面サイズが
// 変わってもリアルタイムに追従する。
// =============================================
function PreviewThumb({ children }: { children: React.ReactNode }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState({ x: 1, y: 1 })

  useLayoutEffect(() => {
    const box = boxRef.current
    const inner = innerRef.current
    if (!box || !inner) return

    const measure = () => {
      // 実測の前に一旦transformを外して「中身の自然なサイズ」を取得する
      inner.style.transform = 'none'
      const boxRect = box.getBoundingClientRect()
      const innerRect = inner.getBoundingClientRect()
      if (innerRect.width === 0 || innerRect.height === 0) return
      setScale({
        x: boxRect.width / innerRect.width,
        y: boxRect.height / innerRect.height,
      })
    }

    measure()

    const ro = new ResizeObserver(measure)
    ro.observe(box)
    ro.observe(inner)
    return () => ro.disconnect()
  }, [children])

  return (
    <div ref={boxRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <div
        ref={innerRef}
        style={{
          display: 'inline-block',
          transform: `scale(${scale.x}, ${scale.y})`,
          transformOrigin: 'top left',
        }}
      >
        {children}
      </div>
    </div>
  )
}

// =============================================
// ミニプレビュー
// =============================================

function DashboardPreview({ theme }: { theme: Theme }) {
  return (
    <div style={{ padding: '8px' }}>
      <div style={{
        background: theme.bg,
        border: `1px solid ${theme.border}`,
        borderRadius: '6px',
        padding: '6px',
        overflow: 'hidden',
      }}>
        {/* パネルタイトル */}
        <div style={{
          fontSize: '8px',
          color: theme.subtext,
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>監視カメラ</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: '#ff4d4d',
              display: 'inline-block',
            }} />
            <span style={{ color: '#ff4d4d', fontSize: '7px' }}>REC</span>
          </span>
        </div>

        {/* カメラ映像エリア */}
        <svg width="100%" height="80" viewBox="0 0 90 70" preserveAspectRatio="none">
          {/* 背景 */}
          <rect x="0" y="0" width="90" height="70" fill="#0a0e14" />

          {/* 床のライン（軽め） */}
          <line x1="0" y1="70" x2="35" y2="34" stroke={theme.border} strokeWidth="0.5" opacity="0.5" />
          <line x1="90" y1="70" x2="55" y2="34" stroke={theme.border} strokeWidth="0.5" opacity="0.5" />
          <line x1="0" y1="55" x2="90" y2="55" stroke={theme.border} strokeWidth="0.4" opacity="0.3" />

          {/* アーム型ロボット */}
          <g fill="none" stroke="#0af3e0" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
            {/* 台座 */}
            <rect x="36" y="48" width="16" height="5" rx="1" fill="#0af3e0" stroke="none" />
            {/* 第1関節から第2関節（斜め上に伸びるアーム） */}
            <line x1="44" y1="48" x2="44" y2="38" />
            <line x1="44" y1="38" x2="56" y2="30" />
            <line x1="56" y1="30" x2="52" y2="20" />
            {/* グリッパー（先端） */}
            <line x1="52" y1="20" x2="48" y2="16" />
            <line x1="52" y1="20" x2="56" y2="16" />
          </g>
          {/* 関節の丸 */}
          <g fill="#0af3e0">
            <circle cx="44" cy="48" r="1.8" />
            <circle cx="44" cy="38" r="1.6" />
            <circle cx="56" cy="30" r="1.6" />
            <circle cx="52" cy="20" r="1.4" />
          </g>

          {/* モーション検知の枠 */}
          <rect x="32" y="12" width="28" height="42" fill="none"
            stroke="#0af3e0" strokeWidth="0.7" strokeDasharray="2,1" />
          <text x="32" y="10" fontSize="4.5" fill="#0af3e0">ROBOT ARM 98%</text>

          {/* 四隅のビューファインダー */}
          {[
            { x: 3, y: 3, dx: 1, dy: 1 },
            { x: 87, y: 3, dx: -1, dy: 1 },
            { x: 3, y: 67, dx: 1, dy: -1 },
            { x: 87, y: 67, dx: -1, dy: -1 },
          ].map((c, i) => (
            <path
              key={i}
              d={`M${c.x + c.dx * 6},${c.y} L${c.x},${c.y} L${c.x},${c.y + c.dy * 6}`}
              fill="none"
              stroke="#0af3e0"
              strokeWidth="0.8"
            />
          ))}

          {/* カメラ名／タイムスタンプ */}
          <text x="3" y="66" fontSize="4" fill="#0af3e0">CAM-02</text>
          <text x="63" y="66" fontSize="4" fill="#0af3e0">14:32:07</text>
        </svg>
      </div>
    </div>
  )
}

function ControlPreview({ theme }: { theme: Theme }) {
  // 実ページの「ジョブ実行回数」バーチャートを模したミニプレビュー
  const colors = [
    '#22d3d3', // ピック/格納
    '#3fa9f5', // 挿入・勘合
    '#7fb8e8', // 位置決め
    '#f2b544', // ネジ締め
    '#f2735a', // ネジ緩め
    '#7ec97e', // 検査
    '#9ad07a', // 仕分け
    '#ef5a5a', // 蓋開閉
    '#b467e0', // 刃交換
    '#3fbfa0', // リング着脱
  ]

  // 日別グループ（各グループ内は上記カラー順、高さはランダム風に固定値）
  const days = [
    [12, 10, 9, 7, 6, 6, 6, 5, 3, 3],
    [15, 12, 11, 9, 8, 7, 6, 6, 4, 4],
    [9, 8, 7, 10, 7, 6, 6, 5, 3, 3],
    [18, 17, 15, 10, 9, 8, 6, 6, 4, 4],
    [13, 12, 11, 14, 10, 9, 9, 8, 5, 5],
  ]

  const max = 18
  const groupGap = 3
  const barGap = 0.4
  const barsPerGroup = colors.length
  const groupWidth = (90 - groupGap * (days.length - 1)) / days.length
  const barWidth = (groupWidth - barGap * (barsPerGroup - 1)) / barsPerGroup
  const chartH = 52
  const chartTop = 6

  return (
    <div style={{ padding: '8px' }}>
      <div style={{
        background: '#141a2b',
        border: `1px solid ${theme.border}`,
        borderRadius: '6px',
        padding: '6px',
        overflow: 'hidden',
      }}>
        {/* 凡例（先頭数個のみ・省略気味に） */}
        <div style={{
          fontSize: '6px',
          color: theme.subtext,
          marginBottom: '4px',
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '3px',
        }}>
          {colors.slice(0, 4).map((c, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <span style={{
                width: '4px', height: '4px', borderRadius: '50%',
                background: c, display: 'inline-block',
              }} />
            </span>
          ))}
          <span style={{ fontSize: '6px', color: theme.subtext }}>ジョブ実行回数</span>
        </div>

        <svg width="100%" height="64" viewBox="0 0 90 64" preserveAspectRatio="none">
          <rect x="0" y="0" width="90" height="64" fill="#141a2b" />

          {/* 横グリッド線 */}
          {[0, 1, 2].map(i => (
            <line
              key={i}
              x1="0" x2="90"
              y1={chartTop + (chartH / 3) * i}
              y2={chartTop + (chartH / 3) * i}
              stroke={theme.border}
              strokeWidth="0.3"
              opacity="0.5"
            />
          ))}

          {/* バー本体 */}
          {days.map((group, gi) => {
            const groupX = gi * (groupWidth + groupGap)
            return (
              <g key={gi}>
                {group.map((val, bi) => {
                  const h = (val / max) * chartH
                  const x = groupX + bi * (barWidth + barGap)
                  const y = chartTop + chartH - h
                  return (
                    <rect
                      key={bi}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={h}
                      fill={colors[bi]}
                      rx="0.3"
                    />
                  )
                })}
                {/* 日付ラベル */}
                <text
                  x={groupX + groupWidth / 2}
                  y={62}
                  fontSize="4.2"
                  fill={theme.subtext}
                  textAnchor="middle"
                >
                  {`0${7}/2${gi + 4}`}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

function AlertPreview({ theme }: { theme: Theme }) {
  const cycleTime = { value: 4.4, unit: '秒' }

  const robots = [
    {
      label: 'A',
      top: { axis: 'A-6', speed: 79, torque: 54 },
      bottom: { axis: 'A-1', speed: 78, torque: 53 },
    },
    {
      label: 'B',
      top: { axis: 'B-6', speed: 83, torque: 56 },
      bottom: { axis: 'B-1', speed: 82, torque: 55 },
    },
  ]

  // 簡易アームアイコン（DashboardPreviewのロボットアームを流用・簡略化）
  function MiniArm() {
    return (
      <svg width="100%" height="100%" viewBox="0 0 60 60" preserveAspectRatio="xMidYMid meet">
        <rect x="0" y="0" width="60" height="60" rx="4" fill="#e9edf1" />
        <g fill="none" stroke="#8a97a6" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="24" y="42" width="12" height="4" rx="1" fill="#8a97a6" stroke="none" />
          <line x1="30" y1="42" x2="30" y2="34" />
          <line x1="30" y1="34" x2="40" y2="27" />
          <line x1="40" y1="27" x2="37" y2="18" />
          <line x1="37" y1="18" x2="33" y2="14" />
        </g>
        <g fill={theme.accent}>
          <circle cx="30" cy="34" r="1.6" />
          <circle cx="40" cy="27" r="1.4" />
          <circle cx="37" cy="18" r="1.2" />
        </g>
      </svg>
    )
  }

  function StatBadge({ axis, speed, torque }: { axis: string; speed: number; torque: number }) {
    return (
      <div style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        borderRadius: '4px',
        padding: '2px 4px',
        display: 'flex',
        alignItems: 'baseline',
        gap: '3px',
        whiteSpace: 'nowrap',
      }}>
        <span style={{ fontSize: '6px', color: theme.text, fontWeight: 700 }}>{axis}</span>
        <span style={{ fontSize: '7px', color: '#3fb6ff', fontWeight: 700 }}>{speed}</span>
        <span style={{ fontSize: '7px', color: '#ffb648', fontWeight: 700 }}>{torque}%</span>
      </div>
    )
  }

  return (
    <div style={{ padding: '8px' }}>
      <div style={{
        background: theme.bg, border: `1px solid ${theme.border}`,
        borderRadius: '6px', padding: '8px', display: 'flex',
        flexDirection: 'column', gap: '6px',
      }}>
        {/* サイクルタイム */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '7px', color: theme.subtext, fontWeight: 600 }}>
            サイクルタイム
          </span>
          <span style={{ fontSize: '10px', fontWeight: 700, color: '#4ade80' }}>
            {cycleTime.value}
          </span>
          <span style={{ fontSize: '6px', color: theme.subtext }}>{cycleTime.unit}</span>
        </div>

        {/* ロボットA・B 速度/トルク */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {robots.map((r, i) => (
            <div key={i} style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '2px',
            }}>
              <div style={{ fontSize: '6px', color: theme.subtext, alignSelf: 'flex-start' }}>
                ロボット{r.label}
              </div>
              <StatBadge axis={r.top.axis} speed={r.top.speed} torque={r.top.torque} />
              <div style={{ width: '28px', height: '28px' }}>
                <MiniArm />
              </div>
              <StatBadge axis={r.bottom.axis} speed={r.bottom.speed} torque={r.bottom.torque} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function NameplateQuizPreview({ theme }: { theme: Theme }) {
  // 実際の「正解集計ページ」に合わせたミニプレビュー
  // 大きな数値＋リングゲージ（左） + フィルターボタン／日付チェックボックス（右上） + 日別棒グラフ（下）
  const accuracy = 82 // 全体正解率(%)

  const filters = ['全体', '運転起動', '停止', 'エラーリセット', 'カウンタリセット']
  const activeFilter = '運転起動'

  const days = [
    { date: '08/22', pct: null },
    { date: '08/23', pct: null },
    { date: '08/24', pct: 100 },
    { date: '08/25', pct: 100 },
    { date: '08/26', pct: null },
  ]

  const radius = 15
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (accuracy / 100) * circumference

  const barMaxH = 22 // px

  return (
    <div style={{ padding: '8px' }}>
      <div style={{
        background: theme.bg, border: `1px solid ${theme.border}`,
        borderRadius: '6px', padding: '8px', display: 'flex',
        flexDirection: 'column', gap: '6px',
      }}>
        <div style={{ fontSize: '8px', color: theme.subtext }}>
          <span style={{ color: theme.accent, marginRight: '4px' }}>銘板</span>
          正解集計
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {/* 左：大きい数値＋リング */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: '2px', flexShrink: 0, width: '46px',
          }}>
            <div style={{ position: 'relative', width: '32px', height: '32px' }}>
              <svg width="32" height="32" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="20" cy="20" r={radius} fill="none" stroke={theme.border} strokeWidth="4" />
                <circle
                  cx="20" cy="20" r={radius}
                  fill="none" stroke={theme.accent} strokeWidth="4"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span style={{
              fontSize: '13px', fontWeight: 700, color: theme.accent, lineHeight: 1, marginTop: '2px',
            }}>
              {accuracy}
            </span>
            <span style={{ fontSize: '5px', color: theme.subtext, whiteSpace: 'nowrap' }}>
              % 正解率
            </span>
          </div>

          {/* 右：フィルターボタン＋日付チェックボックス＋日別棒グラフ */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 }}>
            {/* フィルターボタン */}
            <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap' }}>
              {filters.map((f, i) => (
                <span key={i} style={{
                  fontSize: '4.5px', color: f === activeFilter ? theme.accent : theme.subtext,
                  border: `1px solid ${f === activeFilter ? theme.accent : theme.border}`,
                  borderRadius: '6px', padding: '1px 4px', whiteSpace: 'nowrap',
                }}>
                  {f}
                </span>
              ))}
            </div>

            {/* 日付チェックボックス */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {days.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1.5px' }}>
                  <div style={{
                    width: '5px', height: '5px', borderRadius: '1px',
                    background: theme.accent, border: `1px solid ${theme.accent}`,
                  }} />
                  <span style={{ fontSize: '4.5px', color: theme.text, whiteSpace: 'nowrap' }}>
                    {d.date}
                  </span>
                </div>
              ))}
            </div>

            {/* 日別棒グラフ */}
            <div style={{
              background: theme.surface, border: `1px solid ${theme.border}`,
              borderRadius: '4px', padding: '4px 6px',
            }}>
              <div style={{ fontSize: '5px', color: theme.subtext, marginBottom: '2px' }}>
                日別正解率
              </div>
              <div style={{
                display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                height: `${barMaxH}px`, gap: '3px', borderBottom: `1px solid ${theme.border}`,
                paddingBottom: '2px',
              }}>
                {days.map((d, i) => (
                  <div key={i} style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'flex-end', height: '100%',
                  }}>
                    <span style={{ fontSize: '4px', color: theme.text, marginBottom: '1px' }}>
                      {d.pct === null ? '-' : `${d.pct}%`}
                    </span>
                    {d.pct !== null && (
                      <div style={{
                        width: '60%',
                        height: `${(d.pct / 100) * (barMaxH - 8)}px`,
                        background: theme.accent,
                        borderRadius: '1px',
                      }} />
                    )}
                  </div>
                ))}
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', marginTop: '2px',
              }}>
                {days.map((d, i) => (
                  <span key={i} style={{
                    fontSize: '4px', color: theme.subtext, flex: 1, textAlign: 'center',
                  }}>
                    {d.date}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
// スライドパネルの幅。ブックマークタブの水平位置もこの値を基準に計算するため、
// ここを変えれば両方が連動して動く。
const SIDEBAR_WIDTH = 280

type Props = {
  theme: Theme
  currentPage: PageKey
  sidebarOpen: boolean
  onPageChange: (page: PageKey) => void
  onClose: () => void
  onToggle: () => void
  /**
   * 画面下部に固定フッターがある場合、その高さ(px)。
   * これを渡すとサイドバーパネルがフッターの上でぴったり止まり、
   * 一番下のミニプレビューがフッターの裏に隠れなくなる。
   * フッター側のpadding/フォントサイズを変えた場合はこの値も一緒に見直すこと。
   */
  footerHeight?: number
}

export default function Sidebar({
  theme,
  currentPage,
  sidebarOpen,
  onPageChange,
  onClose,
  onToggle,
  footerHeight = 30, // padding 3px*2 + 20pxテキストの行送り分の概算値
}: Props) {

  const isMobile = useIsMobile()

  // モバイル版：画面下部固定のコンパクトなタブバー
  if (isMobile) {
    return (
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '64px',
        display: 'flex',
        background: theme.surface,
        borderTop: `1px solid ${theme.border}`,
        zIndex: 100,
        boxSizing: 'border-box',
      }}>
        {PAGES.map(page => {
          const isActive = currentPage === page.key
          return (
            <button
              key={page.key}
              onClick={() => onPageChange(page.key)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                color: isActive ? theme.accent : theme.subtext,
              }}
            >
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: isActive ? theme.accent : theme.subtext,
                opacity: isActive ? 1 : 0.5,
              }} />
              <span style={{
                fontSize: '11px',
                fontWeight: isActive ? 'bold' : 'normal',
              }}>
                {page.label}
              </span>
            </button>
          )
        })}
      </nav>
    )
  }

  function renderPreview(pageKey: string) {
  if (pageKey === 'dashboard') return <DashboardPreview theme={theme} />
  if (pageKey === 'anomaly')   return <AlertPreview theme={theme} />
  if (pageKey === 'quiz')      return <NameplateQuizPreview theme={theme} />
  return <ControlPreview theme={theme} />
 }
  const handleSidebarMouseEnter = () => {
    if (!sidebarOpen) {
      onToggle()
    }
  }

  return (
    <>
      {/* ブックマークタブ */}
      <div style={{
        position: 'fixed',
        top: '57px', // スライドパネル側のtopと同じ基準（ヘッダー高さ）に揃える
        left: sidebarOpen ? `${SIDEBAR_WIDTH}px` : '0px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start',
        zIndex: 50,
        transition: 'left 0.2s ease',
      }}>
       <div
  onClick={onToggle}
  onMouseEnter={handleSidebarMouseEnter}
  style={{
    background: sidebarOpen ? theme.accent : theme.surface,
    color: sidebarOpen ? '#fff' : theme.subtext,
    border: `1px solid ${sidebarOpen ? theme.accent : theme.border}`,
    borderRadius: '6px 6px 0 0',

    /* ← 余白を追加 */
    padding: '8px 14px',

    /* ← 高さを固定して見た目を安定させる */
    height: '32px',

    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',

    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',

    /* rotate(90deg)を要素自身の左上を基準に回転させたあと、
       translateY(-100%)＝自分自身の高さぶんだけ（％指定なので常に正確に）
       引き戻すことで、画面サイズに関わらず必ず左端ぴったりに揃う。
       以前のtranslateX(40px)/translateY(60px)は特定の画面幅でしか
       合わない当て推量だったため廃止。 */
    transform: 'rotate(90deg) translateY(-100%)',
    transformOrigin: 'top left',

    whiteSpace: 'nowrap',
  }}
>
  <PanelLeft
    size={14}
    style={{ transform: 'rotate(-90deg)' }}
  />
  画面切替
</div>

      </div>

      {/* スライドパネル */}
      <div
       onMouseLeave={onClose}
       style={{
        position: 'fixed', top: '57px', left: 0,
        bottom: `${footerHeight}px`, width: sidebarOpen ? `${SIDEBAR_WIDTH}px` : '0px',
        background: theme.surface,
        borderRight: sidebarOpen ? `1px solid ${theme.border}` : 'none',
        overflow: 'hidden',
        transition: 'width 0.3s ease',
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          padding: '12px 8px 8px', minWidth: '200px',
          display: 'flex', flexDirection: 'column',
          flex: 1, minHeight: 0,
        }}>
          <p style={{
            fontSize: '11px', color: theme.subtext, margin: '0 0 10px 4px',
            letterSpacing: '0.1em', flexShrink: 0,
          }}>
            ページ切り替え
          </p>

          {/* ページ一覧：flexで縦方向を均等分割 → 画面サイズが変わっても
              常にPAGES.length枚ぶん(=4枚)が枠内に収まる。スクロールも不要。 */}
          <div style={{
            flex: 1, minHeight: 0,
            display: 'flex', flexDirection: 'column', gap: '8px',
          }}>
            {PAGES.map(page => (
              <div
                key={page.key}
                onClick={() => { onPageChange(page.key); onClose() }}
                style={{
                  flex: 1, minHeight: 0,
                  display: 'flex', flexDirection: 'column',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  border: `1px solid ${currentPage === page.key ? theme.accent : 'transparent'}`,
                  background: currentPage === page.key ? `${theme.accent}11` : 'transparent',
                  padding: '6px',
                  transition: 'all 0.2s',
                }}
              >
                {/* ページ名 */}
                <div style={{
                  padding: '2px 4px', fontSize: '12px',
                  color: currentPage === page.key ? theme.accent : theme.text,
                  fontWeight: currentPage === page.key ? 'bold' : 'normal',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  marginBottom: '4px',
                  flexShrink: 0,
                }}>
                  <span style={{
                    width: '6px', height: '6px', borderRadius: '50%',
                    background: currentPage === page.key ? theme.accent : theme.subtext,
                    flexShrink: 0,
                  }} />
                  {page.label}
                </div>

                {/* ミニプレビュー：枠の幅・高さにぴったりフィットさせる */}
                <div style={{
                  flex: 1, minHeight: 0,
                  overflow: 'hidden',
                  borderRadius: '6px',
                  border: `1px solid ${theme.border}`,
                  opacity: 0.7,
                }}>
                  <PreviewThumb>
                    {renderPreview(page.key)}
                  </PreviewThumb>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* オーバーレイ */}
      {sidebarOpen && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.3)' }}
        />
      )}
    </>
  )
}
