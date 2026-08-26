// useQuizAnswerLog.ts
//
// 銘板クイズの回答ログを localStorage に蓄積し、作成者用の集計ページ
// （正解タグ押下→5択の選択率、日付ごとの正解率グラフ）向けに集計する。
// クイズはダッシュボード上（ブラウザのクリック）で完結するため、
// choiceIndex は実際にユーザーが選んだ選択肢（0-3=choices、4=わからない）
// をそのままログする。

import { useCallback, useMemo } from 'react'
import type {
  NameplateQuestion,
  QuizAnswerLog,
  ChoiceBreakdown,
  DailyCorrectRate,
} from '../types'

const STORAGE_KEY = 'nameplateQuiz.answerLog.v1'

function loadLogs(): QuizAnswerLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLogs(logs: QuizAnswerLog[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
  } catch {
    // ストレージ容量超過等は無視（集計機能が使えなくなるだけで致命的ではない）
  }
}

function todayStr(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function useQuizAnswerLog() {
  const logAnswer = useCallback(
    (questionId: string, choiceIndex: number, correct: boolean, date = todayStr()) => {
      const logs = loadLogs()
      logs.push({ questionId, date, choiceIndex, correct, timestamp: Date.now() })
      saveLogs(logs)
    },
    []
  )

  /** 全期間の累計正解率（サイドのリング表示用） */
  const getOverallStats = useCallback(() => {
    const logs = loadLogs()
    const totalAnswered = logs.length
    const totalCorrect = logs.filter((l) => l.correct).length
    return { totalAnswered, totalCorrect }
  }, [])

  const getBreakdown = useCallback(
    (question: NameplateQuestion, dateRange?: string[]): ChoiceBreakdown[] => {
      const logs = loadLogs().filter(
        (l) => l.questionId === question.id && (!dateRange || dateRange.includes(l.date))
      )
      const total = logs.length
      const labels = [...question.choices, 'わからない']

      return labels.map((label, idx) => {
        const count = logs.filter((l) => l.choiceIndex === idx).length
        return {
          choiceIndex: idx,
          label,
          count,
          percent: total > 0 ? Math.round((count / total) * 100) : 0,
          isCorrect: idx === question.correctIndex,
        }
      })
    },
    []
  )

  // 変更後：第2引数 questionIds で対象問題を絞り込めるようにする（省略時は全問題＝全体）
const getDailyCorrectRates = useCallback(
  (dates: string[], questionIds?: string[]): DailyCorrectRate[] => {
    const logs = loadLogs()
    const idSet = questionIds ? new Set(questionIds) : null

    return dates.map((date) => {
      const dayLogs = logs.filter(
        (l) => l.date === date && (!idSet || idSet.has(l.questionId))
      )
      const totalAnswered = dayLogs.length
      const totalCorrect = dayLogs.filter((l) => l.correct).length
      return {
        date,
        totalAnswered,
        totalCorrect,
        correctRate: totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
      }
    })
  },
  []
)

  const clearLogs = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // noop
    }
  }, [])

  return useMemo(
    () => ({ logAnswer, getOverallStats, getBreakdown, getDailyCorrectRates, clearLogs }),
    [logAnswer, getOverallStats, getBreakdown, getDailyCorrectRates, clearLogs]
  )
}
