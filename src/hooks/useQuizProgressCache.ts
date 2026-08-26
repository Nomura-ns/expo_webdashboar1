// useQuizProgressCache.ts
//
// クイズの進行状態（出題順・現在の問題・選択した回答・フェーズ）を
// sessionStorage にキャッシュし、ブラウザを閉じても再訪問時に続きから
// 再開できるようにする。
//
// 「10分未回答ならその問題だけ未回答扱いにして次へ進める」というタイム
// アウト処理そのものは、質問データ（questions）や回答ログ（logAnswer）に
// 依存するため、このフックでは扱わず呼び出し側（NameplateQuiz.tsx）が
// progress.timestamp を基準に行う。このフックは状態の保存・復元だけを担当する。

import { useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'nameplateQuiz.progress.v1'

export type QuizPhase = 'idle' | 'question' | 'answered' | 'finished'

export interface QuizProgress {
  phase: QuizPhase
  /** シャッフル済み出題順（question.id の配列） */
  order: string[]
  currentIndex: number
  selectedChoiceIndex: number | null
  resultFlag: 'correct' | 'incorrect' | 'unanswered' | null
  sessionAnswered: number
  sessionCorrect: number
  timestamp: number
}

export const INITIAL_PROGRESS: QuizProgress = {
  phase: 'idle',
  order: [],
  currentIndex: 0,
  selectedChoiceIndex: null,
  resultFlag: null,
  sessionAnswered: 0,
  sessionCorrect: 0,
  timestamp: 0,
}

function readCache(): QuizProgress | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as QuizProgress
    // 「開始前」または「終了済み」状態はそもそも再開の必要がない
    if (parsed.phase === 'idle' || parsed.phase === 'finished') return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(progress: QuizProgress) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // noop
  }
}

function clearCache() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // noop
  }
}

export function useQuizProgressCache() {
  const restoredRef = useRef<QuizProgress | null>(null)
  if (restoredRef.current === null) {
    restoredRef.current = readCache() ?? INITIAL_PROGRESS
  }

  const [progress, setProgressState] = useState<QuizProgress>(restoredRef.current)

  const setProgress = (
    update: QuizProgress | ((prev: QuizProgress) => QuizProgress)
  ) => {
    setProgressState((prev) => {
      const next = typeof update === 'function' ? (update as (p: QuizProgress) => QuizProgress)(prev) : update
      return { ...next, timestamp: Date.now() }
    })
  }

  useEffect(() => {
    if (progress.phase === 'idle' || progress.phase === 'finished') {
      clearCache()
    } else {
      writeCache(progress)
    }
  }, [progress])

  return { progress, setProgress }
}