import { useState, useRef, useEffect } from 'react'
import type {
  ThemeKey,
  PageKey,
  JobSeries,
  NameplateQuestion,
  QuizStats,
} from './types'
import { THEMES, PAGES } from './components/common/themes'
import Sidebar from './components/common/Sidebar'
import SettingsPanel from './components/common/SettingsPanel'
import OperationResults from './components/OperationResults/OperationResults'
import RobotArmDashboard from './components/RobotArmDashboard/RobotArmDashboard'
import OperationStatus from './components/OperationStatus/OperationStatus'
import NameplateQuiz from './components/NameplateQuiz/NameplateQuiz'
import { getThemeMode } from './components/common/themes'
import { usePlcWebSocket } from './hooks/usePlcWebSocket' 
import { usePlcQuizSignals, QUIZ_QUESTION_ADDRESS, QUIZ_RESULT_ADDRESS }  from './hooks/usePlcQuizsignals' 
import {
  usePlcJobFlowSignals,
  JOB_FLOW_STEP_ADDRESS,
  JOB_FLOW_CYCLE_CURRENT_ADDRESS,
  JOB_FLOW_CYCLE_TOTAL_ADDRESS,
} from './hooks/usePlcJobFlowSignals'
import { JOB_DEFINITIONS } from './config/jobDefinitions'

// サンプルデータ（実際はAPIやpropsから取得）
const DATES = ['07/24', '07/25', '07/26', '07/27', '07/28']

// ジョブごとの日別サンプル実行回数（ダミー値）
const SAMPLE_COUNTS: Record<string, number[]> = {
  'pick-store':    [12, 15, 9, 18, 14],
  'insert-fit':    [10, 13, 8, 16, 12],
  'position':      [9, 12, 7, 14, 11],
  'screw-tighten': [8, 10, 11, 7, 13],
  'screw-loosen':  [7, 9, 6, 12, 10],
  'inspect':       [6, 8, 5, 10, 9],
  'sort':          [6, 8, 5, 10, 9],
  'lid':           [5, 7, 4, 9, 8],
  'exchange':      [3, 4, 2, 5, 4],
  'ring-spring':   [3, 4, 2, 5, 4],
}

const sampleSeries: JobSeries[] = JOB_DEFINITIONS.map((def) => ({
  jobId: def.id,
  jobName: def.jobName,
  shortName: def.shortName,
  robot: def.robot,
  phase: def.phase,
  color: def.color,
  data: DATES.map((date, i) => ({
    date,
    count: SAMPLE_COUNTS[def.id]?.[i] ?? 0,
  })),
}))

// 稼働状況（anomalyページ）用のサンプルデータ
// ロボットA/Bは直近の速度・トルクの数値のみ（グラフ表示はしない）
const robotA = { speed: 78, torque: 53 }
const robotB = { speed: 82, torque: 55 }

// サイクルタイムはジョブ別・ロボット別ではなく、A・B合算の1つの値として扱う
const cycleTime = 4.4

const loadA = [
  { name: '動作', value: 70 },
  { name: '待機', value: 20 },
  { name: '停止', value: 10 },
]

const loadB = [
  { name: '動作', value: 62 },
  { name: '待機', value: 28 },
  { name: '停止', value: 10 },
]


// 銘板クイズ（quizページ）用のサンプルデータ
const sampleQuestions: NameplateQuestion[] = [
  {
    id: '1',
    question: '「停止」を示すアイコンは？',
    correctIndex: 0,
  },
  {
    id: '2',
    question: '「運転起動」を示すアイコンは？',
    correctIndex: 1,
  },
  {
    id: '3',
    question: '「エラーリセット」を示すアイコンは？',
    correctIndex: 2,
  },
  {
    id: '4',
    question: '「カウンタリセット」を示すアイコンは？',
    correctIndex: 3,
  },
]
const sampleQuizStats: QuizStats = {
  totalAnswered: 0,
  totalCorrect: 0,
  streak: 0,
  history: [],
}

export default function App() {
  const isTouchDevice = !window.matchMedia('(hover: hover)').matches
  const [intervalSec, setIntervalSec] = useState(0.5)
  const [showSettings, setShowSettings] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [themeKey, setThemeKey] = useState<ThemeKey>('dark-blue')
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const theme = THEMES[themeKey]
  const settingsRef = useRef<HTMLDivElement>(null)
  const gearBtnRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const { data: plcData } = usePlcWebSocket({
    enabled: true, // quizページでも受信したいので常時 true（他ページの設定次第で調整）
    isPlaying: true,
    intervalSec: 0.5,
    selectedAddresses: [
      QUIZ_QUESTION_ADDRESS,
      QUIZ_RESULT_ADDRESS,
      JOB_FLOW_STEP_ADDRESS,
      JOB_FLOW_CYCLE_CURRENT_ADDRESS,
      JOB_FLOW_CYCLE_TOTAL_ADDRESS,
    ],
  })

  const { activeQuestionId, resultFlag } = usePlcQuizSignals(plcData)
  const { activeStep, cycleCurrent, cycleTotal } = usePlcJobFlowSignals(plcData)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        settingsRef.current &&
        !settingsRef.current.contains(e.target as Node) &&
        gearBtnRef.current &&
        !gearBtnRef.current.contains(e.target as Node)
      ) {
        setShowSettings(false)
      }
    }
    if (showSettings) {
      document.addEventListener('mousedown', handler)
    }
    return () => document.removeEventListener('mousedown', handler)
  }, [showSettings])

  useEffect(() => {
    if (!headerRef.current) return
    const el = headerRef.current
    const update = () => {
      document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update) // svh再計算のフォールバック
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: theme.bg,
        color: theme.text,
        transition: 'background-color 0.3s, color 0.3s',
      }}
    >
      {/* ヘッダー */}
      <header
        ref={headerRef}
        className="app-header"
        style={{
          background: theme.headerBg,
          borderBottom: `1px solid ${theme.border}`,
        }}
      >
        <div className="app-header__brand">
          <img src={theme.logo} alt="logo" className="logo" />
          <span className="app-header__title" style={{ color: theme.subtext }}>
            {PAGES.find((p) => p.key === currentPage)?.label}
          </span>
        </div>

        {/* 歯車ボタン */}
        <div
          ref={gearBtnRef}
          style={{ position: 'relative', display: 'inline-block' }}
          onMouseEnter={(e) => {
            const tooltip = e.currentTarget.querySelector('.settings-tooltip') as HTMLElement
            if (tooltip) tooltip.style.opacity = '1'
          }}
          onMouseLeave={(e) => {
            const tooltip = e.currentTarget.querySelector('.settings-tooltip') as HTMLElement
            if (tooltip) tooltip.style.opacity = '0'
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowSettings((p) => !p)
            }}
            style={{
              background: showSettings ? `${theme.accent}33` : 'transparent',
              border: `1px solid ${showSettings ? theme.accent : theme.border}`,
              borderRadius: '8px',
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: '18px',
              lineHeight: 1,
              transition: 'all 0.2s',
            }}
          >
            ⚙️
          </button>
          <span
            className="settings-tooltip"
            style={{
              position: 'absolute',
              bottom: '-28px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.75)',
              color: '#fff',
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              whiteSpace: 'nowrap',
              opacity: 0,
              pointerEvents: 'none',
              transition: 'opacity 0.2s',
              zIndex: 200,
              display: isTouchDevice ? 'none' : undefined,
            }}
          >
            設定
          </span>
        </div>
      </header>

      {/* ヘッダー下レイアウト */}
      <div style={{ position: 'relative', flex: 1 }}>
        {/* サイドバー（内部でモバイル/PCを判定して表示を切替） */}
        <Sidebar
          theme={theme}
          currentPage={currentPage}
          sidebarOpen={sidebarOpen}
          onPageChange={setCurrentPage}
          onClose={() => setSidebarOpen(false)}
          onToggle={() => setSidebarOpen((p) => !p)}
        />

        {/* 設定パネル */}
        {showSettings && (
          <div ref={settingsRef}>
            <SettingsPanel
              theme={theme}
              themeKey={themeKey}
              intervalSec={intervalSec}
              isPlaying={isPlaying}
              isEditing={isEditing}
              onThemeChange={setThemeKey}
              onIntervalChange={setIntervalSec}
              onPlayingChange={setIsPlaying}
              onEditingChange={setIsEditing}
            />
          </div>
        )}

        {/* ページコンテンツ（4項目）*/}
        <div className="dashboard-page" style={{ display: currentPage === 'dashboard' ? 'flex' : 'none' }}>
          <RobotArmDashboard theme={theme} isEditing={isEditing} />
        </div>

        <div className="dashboard-page" style={{ display: currentPage === 'control' ? 'flex' : 'none' }}>
          <OperationResults
            theme={theme}
            series={sampleSeries}
            isEditing={isEditing}
            activeStep={activeStep}
            cycleCurrent={cycleCurrent}
            cycleTotal={cycleTotal}
          />
        </div>

        <div className="dashboard-page" style={{ display: currentPage === 'anomaly' ? 'flex' : 'none' }}>
          <OperationStatus theme={theme} robotA={robotA} robotB={robotB} cycleTime={cycleTime} loadA={loadA} loadB={loadB} />
        </div>

        <div className="dashboard-page" style={{ display: currentPage === 'quiz' ? 'flex' : 'none' }}>
         <NameplateQuiz
           theme={theme}
           questions={sampleQuestions}
           initialStats={sampleQuizStats}
           themeMode={getThemeMode(themeKey)}
           activeQuestionId={activeQuestionId}
           resultFlag={resultFlag}
          />
       </div>
      </div>
    </div>
  )
}
