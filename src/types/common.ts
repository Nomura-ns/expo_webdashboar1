// =============================================
// 型定義（テーマ・ページ共通）
// =============================================

export type ThemeKey = 'dark-blue' | 'dark-red' | 'dark-green' | 'light-blue' | 'light-red' | 'light-green'

export type Theme = {
  label: string
  bg: string
  surface: string
  border: string
  text: string
  subtext: string
  accent: string
  headerBg: string
  logo: string
}

export type PageKey = 'dashboard' | 'control' | 'anomaly'| 'quiz'

export type DataPoint = {
  time: string
  _ts: number
} & Record<string, number | string>

/** 横軸: 時系列 または Dレジスタ（1つ） */
export type XAxisKey = 'time' | number

/** 軸スケールの手動指定（空欄ならデータから自動） */
export type AxisRange = {
  min?: number
  max?: number
}

export type PanelConfig = {
  id: number
  xAxis: XAxisKey
  /** 縦軸データ（最大2） */
  yAddresses: number[]
  yRange?: AxisRange
  /** 横軸=データのときのみ有効 */
  xRange?: AxisRange
}

export type ActionStatus = 'done' | 'active' | 'waiting'

export type RobotAction = {
  id: number
  name: string
  detail: string
  status: ActionStatus
  startTime: string
  endTime?: string
  progress?: number
}
// =============================================
// 機械情報（MachineImage用）
// =============================================

export type MachineStatus = '動作1' | '動作2' | '動作3'

export type MachineInfo = {
  id: string
  name: string
  location: string
  imageUrl: string
  status: MachineStatus
}

// =============================================
// ロボットアームダッシュボード用（RobotArmDashboard）
// =============================================

/** キャンバス内の位置（% 座標, 0-100） */
export type Vec2 = {
  x: number
  y: number
}

/** カメラ映像1台分の状態 */
/** カメラの点検結果（正常/異常の2値） */
export type CameraCheckStatus = '正常' | '異常'

/** カメラ映像1台分の状態 */
export type CameraFeed = {
  id: string
  label: string
  /** 撮影箇所（例: "正面" / "背面" / "側面"） */
  location?: string
  imageUrl?: string
  status?: CameraCheckStatus
  pos: Vec2   // キャンバス内の位置（% 座標）
  size: number // 表示幅（px）。高さは aspect-ratio で自動追従
}



// =============================================
// 稼働実績（OperationResults用）
// =============================================

export type RobotId = 'A' | 'B'

/** 上刃セッティング／取出しの2フェーズ */
export type JobPhase = 'setting' | 'extraction'

/** 1日分のジョブ実行回数 */
export type JobDataPoint = {
  date: string
  count: number
}

/** 1ジョブ分の実行回数時系列（ジョブ = 実行主体が一貫する作業単位） */
export type JobSeries = {
  jobId: string
  jobName: string
  /** 凡例・円グラフ表示用の短縮名 */
  shortName: string
  robot: RobotId
  phase: JobPhase
  color: string
  data: JobDataPoint[]
}

/** グラフ表示種別（編集モードで切替） */
export type ChartType = 'bar' | 'pie'

/** グラフ表示サイズ（編集モードで切替） */
export type ChartSize = 'sm' | 'md' | 'lg'