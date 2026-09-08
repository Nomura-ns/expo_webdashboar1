// useQuizAnswerLog.ts
//
// 銘板クイズの回答ログを集計するフック。
// 保存・取得そのものは services/answerLogStore.ts の AnswerLogStore に
// 委譲している（今は localStorage 実装）。
// DB版のストアができたら answerLogStore.ts 側を差し替えるだけで、
// このフック・呼び出し側のコンポーネントは変更不要になる想定。
//
// ストレージ層が非同期（Promiseベース）になったため、
// logAnswer / getOverallStats / getBreakdown / getDailyCorrectRates は
// すべて Promise を返す点に注意（呼び出し側は await するか .then() する）。

import { useCallback, useMemo } from 'react'
import type {
  NameplateQuestion,
  QuizAnswerLog,
  ChoiceBreakdown,
  DailyCorrectRate,
} from '../types'
import { getAnswerLogStore } from '../services/answerLogStore'

function todayStr(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function useQuizAnswerLog() {
  const store = useMemo(() => getAnswerLogStore(), [])

  const logAnswer = useCallback(
    (questionId: string, choiceIndex: number, correct: boolean, date = todayStr()) => {
      const log: QuizAnswerLog = { questionId, date, choiceIndex, correct, timestamp: Date.now() }
      return store.append(log)
    },
    [store]
  )

  /** 全期間の累計正解率（サイドのリング表示用） */
  const getOverallStats = useCallback(async () => {
    const logs = await store.getAll()
    const totalAnswered = logs.length
    const totalCorrect = logs.filter((l) => l.correct).length
    return { totalAnswered, totalCorrect }
  }, [store])

  const getBreakdown = useCallback(
    async (question: NameplateQuestion, dateRange?: string[]): Promise<ChoiceBreakdown[]> => {
      const all = await store.getAll()
      const logs = all.filter(
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
    [store]
  )

  // 第2引数 questionIds で対象問題を絞り込める（省略時は全問題＝全体）
  const getDailyCorrectRates = useCallback(
    async (dates: string[], questionIds?: string[]): Promise<DailyCorrectRate[]> => {
      const logs = await store.getAll()
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
    [store]
  )

  const clearLogs = useCallback(() => store.clear(), [store])

  return useMemo(
    () => ({ logAnswer, getOverallStats, getBreakdown, getDailyCorrectRates, clearLogs }),
    [logAnswer, getOverallStats, getBreakdown, getDailyCorrectRates, clearLogs]
  )
}
