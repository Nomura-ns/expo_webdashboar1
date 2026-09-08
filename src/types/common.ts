// =============================================
// 型定義（テーマ・ページ共通）
// =============================================

export type ThemeKey = 'dark-exhibition' | 'dark-blue' | 'dark-red' | 'dark-green' | 'light-blue' | 'light-red' | 'light-green'

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
  qr: string
  mobile: string
}

export type PageKey = 'dashboard' | 'control' | 'anomaly'| 'quiz'

export type DataPoint = {
  time: string
  _ts: number
} & Record<string, number | string>

// =============================================
// ロボットアームダッシュボード用（RobotArmDashboard）
// =============================================

/** キャンバス内の位置（% 座標, 0-100） */
export type Vec2 = {
  x: number
  y: number
}

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
  /** 完了工程数（PLCから工程完了/開始のたびに加算されるイメージ） */
  completedSteps?: number
  /** 全工程数 */
  totalSteps?: number
}