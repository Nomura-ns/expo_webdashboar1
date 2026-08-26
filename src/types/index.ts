
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

/**
 * 選択肢の並び順は固定（PLC側の選択肢アドレスと対応させるため）。
 * choices[correctIndex] が正解。「わからない」は選択肢配列に含めず、
 * 固定の第5選択肢としてUI側で常に追加する。
 */
export interface NameplateQuestion {
  id: string
  videoUrl?: {          
    light: string
    dark: string
  }
  question: string
  /** 4択の選択肢テキスト（正解1つ＋不正解3つ）。表示順=この配列順 */
  choices: string[]
  correctIndex: number
  /** 正誤判定後に表示する解説文 */
  explanation: string
}


// ── 集計ページ（作成者用）用：回答ログ ────────────────

/**
 * 1回の回答ログ。選択肢は choiceIndex 0-3 = choices配列のindex、
 * 4 = 「わからない」を表す。
 */
export interface QuizAnswerLog {
  questionId: string
  /** 'YYYY-MM-DD' */
  date: string
  choiceIndex: number
  correct: boolean
  timestamp: number
}

/** 選択肢ごとの集計（管理ページのタグ押下時に表示） */
export interface ChoiceBreakdown {
  choiceIndex: number
  label: string
  count: number
  percent: number
  isCorrect: boolean
}

/** 日別正解率（管理ページのグラフ用） */
export interface DailyCorrectRate {
  date: string
  totalAnswered: number
  totalCorrect: number
  correctRate: number
}

export interface NameplateQuestion {
  id: string
  videoUrl?: {
    light: string
    dark: string
  }
  /** 設問文中（「◯◯のアイコンの意味は？」の◯◯部分）に表示するアイコン画像。テーマごとに切替可能 */
  iconUrl?: {
    light: string
    dark: string
  }
  question: string
  choices: string[]
  correctIndex: number
  explanation: string
}

// ── テーマ・ページ共通型（旧 src/types.ts より統合） ──
export * from './common'

