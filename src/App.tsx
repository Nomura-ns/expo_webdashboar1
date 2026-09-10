import { useState, useRef, useEffect } from 'react'
import './App.css'
import type { ThemeKey, PageKey, NameplateQuestion } from './types'
import { THEMES, PAGES, getThemeMode } from './components/common/themes'
import Sidebar from './components/common/Sidebar'
import SettingsPanel from './components/common/SettingsPanel'
import OperationResults, { type MetricPoint } from './components/OperationResults/OperationResults'
import RobotArmDashboard from './components/RobotArmDashboard/RobotArmDashboard'
import OperationStatus from './components/OperationStatus/OperationStatus'
import NameplateQuiz from './components/NameplateQuiz/NameplateQuiz'
import { usePlcWebSocket } from './hooks/usePlcWebSocket' 
import { useIsMobile } from './hooks/useMediaQuery'
import { usePlcJobFlowSignals, JOB_FLOW_STEP_ADDRESS, JOB_FLOW_CYCLE_CURRENT_ADDRESS, JOB_FLOW_CYCLE_TOTAL_ADDRESS,} from './hooks/usePlcJobFlowSignals'
import { usePlcRobotStatusSignals } from './hooks/usePlcRobotStatusSignals'
import { usePlcOperationMetricsSignals } from './hooks/usePlcOperationMetricsSignals'
import { OPERATION_METRICS_ADDRESSES } from './config/operationMetricsAddresses'
import { getRecentDates, METRIC_DAYS } from './utils/dateRange'


// 稼働状況（anomalyページ）用のサンプルデータ
// RB1・RB2は同一機種のため、画像は1枚を共通で使用する
const SHARED_ROBOT_IMAGE_URL = '/TEST.png'

// 速度はPLC対象外のためサンプル値のまま。トルク・ピーク値・稼働率はPLC(Dレジスタ、未定)から取得予定で、
// アドレス確定までのフォールバックとしてここに仮の値を置いている（config/robotStatusAddresses.ts 参照）
const SAMPLE_RB1_MOTORS = [
  { speed: 78, torque: 53, peakTorque: 61 },
  { speed: 75, torque: 50, peakTorque: 58 },
  { speed: 80, torque: 55, peakTorque: 64 },
  { speed: 72, torque: 48, peakTorque: 56 },
  { speed: 77, torque: 52, peakTorque: 60 },
  { speed: 79, torque: 54, peakTorque: 62 },
]
const SAMPLE_RB1_UTILIZATION = 92

const SAMPLE_RB2_MOTORS = [
  { speed: 82, torque: 55, peakTorque: 63 },
  { speed: 79, torque: 51, peakTorque: 59 },
  { speed: 84, torque: 57, peakTorque: 66 },
  { speed: 76, torque: 49, peakTorque: 57 },
  { speed: 81, torque: 53, peakTorque: 61 },
  { speed: 83, torque: 56, peakTorque: 64 },
]
const SAMPLE_RB2_UTILIZATION = 88

// サイクルタイムはジョブ別・ロボット別ではなく、A・B合算の1つの値として扱う
const cycleTime = 4.4

// 銘板クイズ（quizページ）用データ
// choices[0] が正解（correctIndex: 0）。「わからない」は各問共通の固定第5選択肢
// としてNameplateQuiz側で自動的に追加される。
const sampleQuestions: NameplateQuestion[] = [
  {
    id: '1',
    question: 'のアイコンの意味は？',
    choices: ['運転起動', '高速運転', '低速運転', '寸動運転'],
    correctIndex: 0,
    explanation: '運転開始の合図で周りに運転することを知らせます。',
    videoUrl: {
      light: 'run buzzer.mp4',
      dark: 'run buzzer.mp4'
    },
    iconUrl: {
      light: 'buzzer_light.png',
      dark: 'buzzer.png'
    }
  },
  {
    id: '2',
    question: 'のアイコンの意味は？',
    choices: ['停止', '緊急停止', '低速運転', '高速運転'],
    correctIndex: 0,
    explanation: '減速しながら機械を停止させます。',
    videoUrl: {
      light: '停止.mp4',
      dark: '停止.mp4'
    },
    iconUrl: {
      light: 'stop_light.png', 
      dark: 'stop.png'    
    }
  },
  {
    id: '3',
    question: 'のアイコンの意味は？',
    choices: ['エラーリセット', '緊急停止', 'ブザーリセット', '設定値初期化'],
    correctIndex: 0,
    explanation: '異常状態をリセットします。',
    videoUrl: {
      light: 'エラーリセット.mp4',
      dark: 'エラーリセット.mp4'
    },
    iconUrl: {
      light: 'error reset_light.png', 
      dark: 'error reset.png'    
    }
  },
  {
    id: '4',
    question: 'のアイコンの意味は？',
    choices: ['カウンタリセット', 'パスワード入力', 'ブザーリセット', 'カウントアップ'],
    correctIndex: 0,
    explanation: 'カウントされていた値を0にリセットします。',
    videoUrl: {
      light: 'カウンタリセット.mp4',
      dark: 'カウンタリセット.mp4'
    },
    iconUrl: {
      light: 'counter reset_light.png', 
      dark: 'counter reset.png'    
    }
  },
]
// URLの ?page=xxx を読み取り、4分割パネルごとに違う初期ページを開けるようにする
// 例）
//   .../?page=dashboard  → RobotArmDashboard
//   .../?page=control    → OperationResults
//   .../?page=anomaly    → OperationStatus
//   .../?page=quiz       → NameplateQuiz
// パラメータが無い/不正な場合は従来どおり 'dashboard' にフォールバックする
function getInitialPage(): PageKey {
  const params = new URLSearchParams(window.location.search)
  const requested = params.get('page')
  const validKeys = PAGES.map((p) => p.key)
  if (requested && (validKeys as string[]).includes(requested)) {
    return requested as PageKey
  }
  return 'dashboard'
}

// アイドル検知：この時間ユーザー操作が無ければPLC接続を切る（Netlify無料枠の閲覧数上限対策）
const IDLE_TIMEOUT_MS = 30 * 60 * 1000 // 30分

export default function App() {
  const isTouchDevice = !window.matchMedia('(hover: hover)').matches
  const [isGearHover, setIsGearHover] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [themeKey, setThemeKey] = useState<ThemeKey>('dark-exhibition')
  const [currentPage, setCurrentPage] = useState<PageKey>(getInitialPage)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isAdminOpen, setIsAdminOpen] = useState(false)
  const theme = THEMES[themeKey]
  const settingsRef = useRef<HTMLDivElement>(null)
  const gearBtnRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const footerRef = useRef<HTMLElement>(null)
  const mode = getThemeMode(themeKey)
  const isMobile = useIsMobile()
  // QRコードは3画面（dashboard/control/anomaly）で共通のため、各コンポーネント側では持たず
  // ここで一箇所だけ描画する。モバイル版・銘板ページ（quiz）では表示しない
  const showQrCode = !isMobile && currentPage !== 'quiz'

  // --- アイドル検知（モバイル版のみ：30分間ユーザー操作が無ければPLC接続を切る） ---
  // モニタ版は展示会場で常時つけっぱなし運用のため、絶対に接続を切ってはいけない。
  // モバイル版（来場者のスマホ等での閲覧）に限り、マウス・タッチ・キー操作が無い状態が
  // 続いたらWebSocket接続を一時停止し、操作が再開されたら自動的に再接続する。
  const [isIdle, setIsIdle] = useState(false)
  const idleTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!isMobile) {
      // モニタ版では常時接続を維持するため、アイドル判定自体を行わない
      setIsIdle(false)
      return
    }

    const resetIdleTimer = () => {
      setIsIdle(false)
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = window.setTimeout(() => setIsIdle(true), IDLE_TIMEOUT_MS)
    }

    const activityEvents = ['pointerdown', 'mousemove', 'keydown', 'touchstart', 'wheel'] as const
    activityEvents.forEach((evt) => window.addEventListener(evt, resetIdleTimer, { passive: true }))
    resetIdleTimer() // 初期化（マウント時点からタイマー開始）

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, resetIdleTimer))
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current)
    }
  }, [isMobile])

  const recentDates = getRecentDates(METRIC_DAYS)
  const DATES = recentDates.map((d) => d.label)  //['MM/DD', 'MM/DD', 'MM/DD']
  // 稼働実績5指標＋検査OK/NGのサンプルデータ（ダミー値）
  const SAMPLE_METRICS: Record<Exclude<keyof MetricPoint, 'date'>, number[]> = {
   inspectCount:  [ 150, 150, 150],
   anomalyCount:  [ 12, 6, 4],
   insertCount:   [ 96, 145, 118],
   tightenCount:  [ 150, 150, 150],
   loosenCount:   [ 152, 140, 145],
   okCount:       [ 96, 145, 151],
   ngCount:       [ 7, 4, 2],
  }

  const sampleMetrics: MetricPoint[] = DATES.map((date, i) => ({
   date,
   inspectCount: SAMPLE_METRICS.inspectCount[i] ?? 0,
   anomalyCount: SAMPLE_METRICS.anomalyCount[i] ?? 0,
   insertCount: SAMPLE_METRICS.insertCount[i] ?? 0,
   tightenCount: SAMPLE_METRICS.tightenCount[i] ?? 0,
   loosenCount: SAMPLE_METRICS.loosenCount[i] ?? 0,
   okCount: SAMPLE_METRICS.okCount[i] ?? 0,
   ngCount: SAMPLE_METRICS.ngCount[i] ?? 0,
  }))

  const { data: plcData } = usePlcWebSocket({
    enabled: !isIdle, // モバイル版のみ、30分間操作が無ければ接続を切る（モニタ版はisIdleが常にfalseなので影響しない）
    isPlaying: true,
    intervalSec: 0.5,
    selectedAddresses: [
      JOB_FLOW_STEP_ADDRESS,
      JOB_FLOW_CYCLE_CURRENT_ADDRESS,
      JOB_FLOW_CYCLE_TOTAL_ADDRESS,
      ...OPERATION_METRICS_ADDRESSES,
    ],
  })

  const { activeStep } = usePlcJobFlowSignals(plcData)

  // RB1・RB2のトルク値・ピーク値・稼働率（PLC Dレジスタは未定のため現状は常に0が返る想定。
  // 確定するまではサンプル値をフォールバックとして使用する）
  const { rb1AxisTorques, rb2AxisTorques, rb1UtilizationRate, rb2UtilizationRate } =
    usePlcRobotStatusSignals(plcData)

  // 稼働実績5指標・NG判定信号・サイクルタイム（PLC Dレジスタは未定のため現状は常に0が返る想定。
  // 確定するまではサンプル値をフォールバックとして使用する。サイクルタイムはPLC値が
  // 無い場合、サイクル変更タイミング用bitの立上り間隔からコード側で算出した値を使用する）
  const {
    inspectCount,
    anomalyCount,
    insertCount,
    tightenCount,
    loosenCount,
    ngSignal,
    cycleTimeSec,
  } = usePlcOperationMetricsSignals(plcData)

  // 当日分（配列末尾）はPLCの値があればそちらを優先し、無ければサンプル値を使う
  const liveMetrics: MetricPoint[] = sampleMetrics.map((m, i) => {
    if (i !== sampleMetrics.length - 1) return m
    return {
      ...m,
      inspectCount: inspectCount || m.inspectCount,
      anomalyCount: anomalyCount || m.anomalyCount,
      insertCount: insertCount || m.insertCount,
      tightenCount: tightenCount || m.tightenCount,
      loosenCount: loosenCount || m.loosenCount,
    }
  })

  const robotRB1 = {
    motors: SAMPLE_RB1_MOTORS.map((m, i) => ({
      speed: m.speed,
      torque: rb1AxisTorques[i]?.torque || m.torque,
      peakTorque: rb1AxisTorques[i]?.peakTorque || m.peakTorque,
    })),
    utilizationRate: rb1UtilizationRate || SAMPLE_RB1_UTILIZATION,
  }

  const robotRB2 = {
    motors: SAMPLE_RB2_MOTORS.map((m, i) => ({
      speed: m.speed,
      torque: rb2AxisTorques[i]?.torque || m.torque,
      peakTorque: rb2AxisTorques[i]?.peakTorque || m.peakTorque,
    })),
    utilizationRate: rb2UtilizationRate || SAMPLE_RB2_UTILIZATION,
  }

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
  useEffect(() => {
  document.documentElement.style.setProperty(
    '--panel-offset-x',
    sidebarOpen ? '220px' : '0px'
  )
  }, [sidebarOpen])

  // footerの実高さを --footer-h に反映する。
  // QR(.app-qr)はfooterより上に浮かせて表示する必要があるため、
  // headerと同様にResizeObserverで実測し、ハードコードの30pxに依存しないようにする。
  useEffect(() => {
    if (!footerRef.current) return
    const el = footerRef.current
    const update = () => {
      // footerはCSSで display:none になる場合(モバイル)は offsetHeight が0になる。
      // QR自体もモバイルでは非表示なので、0で問題ない。
      document.documentElement.style.setProperty('--footer-h', `${el.offsetHeight}px`)
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
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
        style={{ borderBottom: `1px solid ${theme.border}` }}
      >
        <div
         className="app-header__brand"
         style={{
          background: sidebarOpen
          ? mode === 'dark'
            ? 'rgba(0,0,0,0.55)'   // ← オーバーレイと同じ暗さ
            : 'rgba(180, 178, 178, 0.46)'
          : theme.bg,
          transition: 'background 0.1s ease',
         }}
         >
          <img src={theme.logo} alt="logo" className="logo" />
       </div>

        <span className="app-header__title" style={{ color: theme.subtext,fontSize: '19px', }}>
         {isMobile && currentPage === 'control'
           ? 'ROBOT PERM'
           : PAGES.find((p) => p.key === currentPage)?.label}
        </span>

       

      {/* 右側をまとめる */}
      <div
        className="header-right"
        ref={gearBtnRef}
        style={{
         position: 'relative',
         display: 'inline-block',
         justifySelf: 'end',
        }}
        onMouseEnter={() => setIsGearHover(true)}
        onMouseLeave={() => setIsGearHover(false)}
       >
       <button
         onClick={(e) => {
          e.stopPropagation()
          setShowSettings((p) => !p)
        }}
       style={{
        background: showSettings ? `${theme.accent}33` : 'transparent',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: showSettings ? theme.accent : theme.border,
        borderRadius: '8px',
        padding: '6px 10px',
        cursor: 'pointer',
        fontSize: '15px',
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
         top: '100%',           // ← bottom指定より安定
         marginTop: '6px',
         left: '50%',
         transform: 'translateX(-50%)',
         background: 'rgba(0,0,0,0.75)',
         color: '#fff',
         fontSize: '11px',
         padding: '2px 8px',
         borderRadius: '4px',
         whiteSpace: 'nowrap',
         opacity: isTouchDevice ? 0 : (isGearHover ? 1 : 0),
         pointerEvents: 'none',
         transition: 'opacity 0.2s',
         zIndex: 200,
         }}
         >
        設定
       </span>
       </div>
    </header>
 

      {/* ヘッダー下レイアウト */}
      <div
       style={{
        position: 'relative',
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
       }}
      >
      
        {/* サイドバー（内部でモバイル/PCを判定して表示を切替） */}
        <Sidebar
          theme={theme}
          currentPage={currentPage}
          sidebarOpen={sidebarOpen}
          onPageChange={setCurrentPage}
          onClose={() => setSidebarOpen(false)}
          onToggle={() => setSidebarOpen((p) => !p)}
          footerHeight={30}
        />

        {/* QRコード（dashboard/control/anomalyの3画面で共通。パネルフレームの外＝この階層で1回だけ描画する） */}
        {showQrCode && (
          <img src={theme.qr} alt="QRコード" className="app-qr" />
        )}

        {/* アイドル状態の通知（30分操作が無く接続を切っている間だけ表示。画面に触れると自動復帰） */}
        {isIdle && (
          <div
            className="app-idle-banner"
            style={{
              background: theme.surface,
              border: `1px solid ${theme.border}`,
              color: theme.subtext,
            }}
          >
            操作が無いため接続を一時停止中です（画面に触れると再開します）
          </div>
        )}

        {/* 設定パネル */}
        {showSettings && (
          <div ref={settingsRef}>
            <SettingsPanel
              theme={theme}
              themeKey={themeKey}
    
              isPlaying={isPlaying}
              isEditing={isEditing}
              onThemeChange={setThemeKey}
              onPlayingChange={setIsPlaying}
              onEditingChange={setIsEditing}
              isNameplatePage={currentPage === 'quiz'}
              isEditingEnabled={currentPage !== 'control' || !isMobile}
              onOpenAdmin={() => setIsAdminOpen(true)}
            />
          </div>
        )}

        {/* ページコンテンツ（4項目）*/}
        <div className="dashboard-page" style={{ display: currentPage === 'dashboard' ? 'flex' : 'none' }}>
          <RobotArmDashboard theme={theme} isEditing={isEditing} onEditingChange={setIsEditing}/>
        </div>

        <div className="dashboard-page" style={{ display: currentPage === 'control' ? 'flex' : 'none' }}>
         <OperationResults
           theme={theme}
           metrics={liveMetrics}
           isEditing={isEditing}
           activeStep={activeStep}
           overallCycleTimeSec={cycleTimeSec}
           rb1CycleTimeSec={cycleTimeSec}
           rb2CycleTimeSec={cycleTimeSec}
           ngSignal={ngSignal}
           onEditingChange={setIsEditing}
         />
       </div>

        <div className="dashboard-page" style={{ display: currentPage === 'anomaly' ? 'flex' : 'none' }}>
          <OperationStatus
            theme={theme}
            imageUrl={SHARED_ROBOT_IMAGE_URL}
            robotRB1={robotRB1}
            robotRB2={robotRB2}
            cycleTime={cycleTime}
            isEditing={isEditing}
            onEditingChange={setIsEditing}
          />
        </div>

        <div className="dashboard-page dashboard-page--nameplate" style={{ display: currentPage === 'quiz' ? 'flex' : 'none' }}>
          <NameplateQuiz
            theme={theme}
            questions={sampleQuestions}
            themeMode={getThemeMode(themeKey)}
            isAdminOpen={isAdminOpen}
            onAdminOpenChange={setIsAdminOpen}
            dateOptions={recentDates.map((d) => ({ label: d.label, value: d.key }))}
            
         />
        </div>
      </div>
      <footer
        ref={footerRef}
        className="app-footer"
        style={{
          position: 'fixed',      
          bottom: 0,               
          left: 0,                 
          width: '100%',
          padding: '3px 0px',
          borderTop: `1px solid ${theme.border}`,
          backgroundColor: theme.surface,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          zIndex: 100,              
         }}
        >
      <span
        
        style={{
          color: theme.text,
          fontSize: '20px',
          letterSpacing: '0.5px',
        }}
      >
        e
        <span style={{ color: theme.accent }}>X</span>
        ight
      </span>
    </footer>
    </div>
  )
  
}
 
