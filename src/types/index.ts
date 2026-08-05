

// ── 【稼働実績】各ジョブ実行回数（日別） ─────────────
export interface DailyJobCount {
  date: string // 'MM/DD'
  jobName: string
  count: number
}

// JobSeries はここで定義せず、common.ts の定義（export * from './common'）を使う

// ── 【稼働状況】速度 / トルク / サイクルタイム等 ──────
export interface OperationMetric {
  key: string
  label: string
  unit: string
  value: number
  min: number
  max: number
  nominal: number
  
}

export interface CycleTimePoint {
  cycle: number
  seconds: number
}

// ── 銘板アイコン用出題 / 正解率 ───────────────────────

export type ThemeMode = 'light' | 'dark'

export interface NameplateQuestion {
  id: string
  videoUrl?: {          
    light: string
    dark: string
  }
  question: string
  correctIndex: number
}

export interface QuizStats {
  totalAnswered: number
  totalCorrect: number
  streak: number
  history: { label: string; correctRate: number }[]
}

// ── テーマ・ページ共通型（旧 src/types.ts より統合） ──
export * from './common'