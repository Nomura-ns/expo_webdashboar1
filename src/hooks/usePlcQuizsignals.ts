import { useMemo } from 'react'
import type { DataPoint } from '../types'
import { addressToDataKey } from '../plc'

export const QUIZ_QUESTION_ADDRESS = 100
export const QUIZ_RESULT_ADDRESS = 101

// ★追加：戻り値の型を明示的に定義
type QuizSignals = {
  activeQuestionId: string | null
  resultFlag: 'correct' | 'incorrect' | null
}

export function usePlcQuizSignals(data: DataPoint[]): QuizSignals { // ★戻り値の型を明示
  return useMemo(() => {
    const latest = data[data.length - 1]
    if (!latest) return { activeQuestionId: null, resultFlag: null }

    const questionValue = latest[addressToDataKey(QUIZ_QUESTION_ADDRESS)]
    const resultValue = latest[addressToDataKey(QUIZ_RESULT_ADDRESS)]

    const activeQuestionId =
      typeof questionValue === 'number' && questionValue > 0 ? String(questionValue) : null

    // ★変更：三項演算子の結果がTSに 'correct' | 'incorrect' | null と正しく推論されるように明示
    const resultFlag: 'correct' | 'incorrect' | null =
      resultValue === 1 ? 'correct' : resultValue === 2 ? 'incorrect' : null

    return { activeQuestionId, resultFlag }
  }, [data])
}