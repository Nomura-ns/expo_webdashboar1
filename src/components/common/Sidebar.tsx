import type { Theme, PageKey } from '../../types'
import { PAGES } from './themes'
import { useIsMobile } from '../../hooks/useMediaQuery'

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
  const data = [
    { label: '下刃撮像', count: 8 },
    { label: '上刃ストックから移動', count: 15 },
    { label: '上刃組換台から移動', count: 3 },
  ]
  const max = Math.max(...data.map(d => d.count))

  return (
    <div style={{ padding: '8px' }}>
      <div style={{
        background: theme.bg, border: `1px solid ${theme.border}`,
        borderRadius: '6px', padding: '8px', display: 'flex',
        flexDirection: 'column', gap: '6px',
      }}>
        <div style={{ fontSize: '8px', color: theme.subtext }}>
          <span style={{ color: theme.accent, marginRight: '4px' }}>ロボット1</span>
          動作回数
        </div>

        {/* バー本体 */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: '8px',
          height: '60px', padding: '0 4px',
        }}>
          {data.map((d, i) => (
            <div
              key={i}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                flex: 1, height: '100%', justifyContent: 'flex-end',
              }}
            >
              <div style={{ fontSize: '8px', color: theme.text, marginBottom: '2px' }}>
                {d.count}
              </div>
              <div style={{
                width: '100%', maxWidth: '20px',
                height: `${(d.count / max) * 100}%`,
                background: theme.accent,
                borderRadius: '2px 2px 0 0',
                boxShadow: `0 0 4px ${theme.accent}33`,
              }} />
            </div>
          ))}
        </div>

        {/* ラベル */}
        <div style={{ display: 'flex', gap: '8px', padding: '0 4px' }}>
          {data.map((d, i) => (
            <div
              key={i}
              style={{
                flex: 1, fontSize: '7px', color: theme.subtext,
                textAlign: 'center', overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
              title={d.label}
            >
              {d.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AlertPreview({ theme }: { theme: Theme }) {
  const gauges = [
    { label: '速度', value: 72, unit: '%', color: theme.accent },
    { label: 'トルク', value: 45, unit: '%', color: theme.accent },
  ]
  const cycleTime = { value: 3.2, unit: '秒' }

  // 円グラフ用の計算（半円ではなく全円ゲージ）
  const radius = 16
  const circumference = 2 * Math.PI * radius

  return (
    <div style={{ padding: '8px' }}>
      <div style={{
        background: theme.bg, border: `1px solid ${theme.border}`,
        borderRadius: '6px', padding: '8px', display: 'flex',
        flexDirection: 'column', gap: '8px',
      }}>
        <div style={{ fontSize: '8px', color: theme.subtext }}>
          <span style={{ color: theme.accent, marginRight: '4px' }}>ロボット1</span>
          稼働状況
        </div>

        {/* 円形ゲージ（速度・トルク） */}
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          {gauges.map((g, i) => {
            const offset = circumference - (g.value / 100) * circumference
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <svg width="44" height="44" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
                  <circle
                    cx="20" cy="20" r={radius}
                    fill="none" stroke={theme.border} strokeWidth="4"
                  />
                  <circle
                    cx="20" cy="20" r={radius}
                    fill="none" stroke={g.color} strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    style={{ filter: `drop-shadow(0 0 3px ${g.color}66)` }}
                  />
                </svg>
                <div style={{
                  marginTop: '-30px', fontSize: '9px', fontWeight: 600, color: theme.text,
                }}>
                  {g.value}{g.unit}
                </div>
                <div style={{ marginTop: '12px', fontSize: '7px', color: theme.subtext }}>
                  {g.label}
                </div>
              </div>
            )
          })}
        </div>

        {/* サイクルタイム（数値表示） */}
        <div style={{
          background: `${theme.surface}88`, border: `1px solid ${theme.border}`,
          borderRadius: '4px', padding: '4px 8px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '8px', color: theme.subtext }}>サイクルタイム</span>
          <span style={{ fontSize: '11px', fontWeight: 600, color: theme.accent }}>
            {cycleTime.value}<span style={{ fontSize: '8px', marginLeft: '2px' }}>{cycleTime.unit}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
function NameplateQuizPreview({ theme }: { theme: Theme }) {
  const question = { no: 'Q12', text: '[起動]を表す銘板は？' }
  const accuracy = 68 // 正解率(%)

  const radius = 16
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (accuracy / 100) * circumference

  return (
    <div style={{ padding: '8px' }}>
      <div style={{
        background: theme.bg, border: `1px solid ${theme.border}`,
        borderRadius: '6px', padding: '8px', display: 'flex',
        flexDirection: 'column', gap: '8px',
      }}>
        <div style={{ fontSize: '8px', color: theme.subtext }}>
          <span style={{ color: theme.accent, marginRight: '4px' }}>銘板</span>
          出題 / 正解率
        </div>

        {/* 出題表示 */}
        <div style={{
          background: theme.surface, border: `1px solid ${theme.border}`,
          borderRadius: '4px', padding: '6px 8px',
          display: 'flex', flexDirection: 'column', gap: '3px',
        }}>
          <span style={{
            fontSize: '8px', color: theme.accent, fontWeight: 600,
          }}>
            {question.no}
          </span>
          <span style={{
            fontSize: '9px', color: theme.text, lineHeight: 1.4,
          }}>
            {question.text}
          </span>
        </div>

        {/* 正解率（リングゲージ + ラベル） */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: `${theme.surface}88`, border: `1px solid ${theme.border}`,
          borderRadius: '4px', padding: '4px 8px',
        }}>
          <div style={{ position: 'relative', width: '36px', height: '36px', flexShrink: 0 }}>
            <svg width="36" height="36" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
              <circle
                cx="20" cy="20" r={radius}
                fill="none" stroke={theme.border} strokeWidth="4"
              />
              <circle
                cx="20" cy="20" r={radius}
                fill="none" stroke={theme.accent} strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 3px ${theme.accent}66)` }}
              />
            </svg>
            <div style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '9px', fontWeight: 600, color: theme.text,
            }}>
              {accuracy}%
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <span style={{ fontSize: '7px', color: theme.subtext }}>正解率</span>
            <span style={{ fontSize: '7px', color: theme.subtext, opacity: 0.7 }}>
              全10問中 7問正解
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
// =============================================
// サイドバー本体
// =============================================

type Props = {
  theme: Theme
  currentPage: PageKey
  sidebarOpen: boolean
  onPageChange: (page: PageKey) => void
  onClose: () => void
  onToggle: () => void
}

export default function Sidebar({
  theme,
  currentPage,
  sidebarOpen,
  onPageChange,
  onClose,
  onToggle,
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
        height: '56px',
        display: 'flex',
        background: theme.surface,
        borderTop: `1px solid ${theme.border}`,
        zIndex: 100,
        boxSizing: 'border-box',
      }}>
        {PAGES.filter(page => page.key !== 'anomaly').map(page => {
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

  return (
    <>
      {/* ブックマークタブ */}
      <div style={{
        position: 'fixed',
        top: '57px',
        left: sidebarOpen ? '223px' : '0px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start',
        paddingTop: '20px',
        zIndex: 50,
        transition: 'left 0.3s ease',
      }}>
        <div
          onClick={onToggle}
          style={{
            width: '80px', height: '26px',
            background: sidebarOpen ? theme.accent : theme.surface,
            color: sidebarOpen ? '#fff' : theme.subtext,
            border: `1px solid ${sidebarOpen ? theme.accent : theme.border}`,
            borderRadius: '6px 6px 0 0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s',
            transform: 'rotate(90deg) translateX(48px) translateY(70px)',
            transformOrigin: 'right center',
            whiteSpace: 'nowrap',
          }}
        >
          画面切替
        </div>
      </div>

      {/* スライドパネル */}
      <div style={{
        position: 'fixed', top: '57px', left: 0,
        height: '100vh', width: sidebarOpen ? '220px' : '0px',
        background: theme.surface,
        borderRight: sidebarOpen ? `1px solid ${theme.border}` : 'none',
        overflow: 'hidden',
        transition: 'width 0.3s ease',
        zIndex: 40,
      }}>
        <div style={{ padding: '12px 8px', minWidth: '200px' }}>
          <p style={{ fontSize: '11px', color: theme.subtext, margin: '0 0 10px 4px', letterSpacing: '0.1em' }}>
            ページ切り替え
          </p>
          {PAGES.map(page => (
            <div
              key={page.key}
              onClick={() => { onPageChange(page.key); onClose() }}
              style={{
                marginBottom: '12px',
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
              }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: currentPage === page.key ? theme.accent : theme.subtext,
                  flexShrink: 0,
                }} />
                {page.label}
              </div>

              {/* ミニプレビュー */}
              <div style={{
                borderRadius: '6px', overflow: 'hidden',
                border: `1px solid ${theme.border}`,
                opacity: 0.85,
              }}>
                {renderPreview(page.key)}
              </div>
            </div>
          ))}
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
