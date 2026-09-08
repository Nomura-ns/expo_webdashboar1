// services/answerLogStore.ts
//
// 回答ログの「保存の実体」を隠すための層。
// 今は localStorage 実装（localAnswerLogStore）だけを使っているが、
// スマホとモニタは別デバイス/別ブラウザなので、localStorage である限り
// 端末をまたいだ共有は原理的にできない。
//
// 後日DBを用意するときは、この AnswerLogStore インターフェースを実装した
// 別のストア（例: apiAnswerLogStore、下にサンプルを書いてある）を作り、
// getAnswerLogStore() の中身をそちらに差し替えるだけでよい。
// useQuizAnswerLog より上のコード（コンポーネント側）は一切変更不要。

import type { QuizAnswerLog } from '../types'

export interface AnswerLogStore {
  /** 1件の回答ログを追加保存する */
  append(log: QuizAnswerLog): Promise<void>
  /** 保存されている全ログを取得する */
  getAll(): Promise<QuizAnswerLog[]>
  /** 全ログを消去する（デバッグ・管理用） */
  clear(): Promise<void>
}

const STORAGE_KEY = 'nameplateQuiz.answerLog.v1'

function readLocal(): QuizAnswerLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeLocal(logs: QuizAnswerLog[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs))
  } catch {
    // ストレージ容量超過等は無視（集計機能が使えなくなるだけで致命的ではない）
  }
}

/**
 * 現状の実装：端末内の localStorage に保存する。
 * スマホで回答してもモニタ（別端末）には反映されない、という今の制約は
 * この実装そのものが原因。DB版に差し替えるまでの暫定実装。
 */
export const localAnswerLogStore: AnswerLogStore = {
  async append(log) {
    const logs = readLocal()
    logs.push(log)
    writeLocal(logs)
  },
  async getAll() {
    return readLocal()
  },
  async clear() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // noop
    }
  },
}

/**
 * DB接続版のサンプル（未使用・コメントのみ）。
 * バックエンドAPIができたら、こういう実装を作って
 * 下の getAnswerLogStore() の戻り値をこちらに差し替えるだけで良い。
 *
 * export const apiAnswerLogStore: AnswerLogStore = {
 *   async append(log) {
 *     await fetch('/api/quiz-answers', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify(log),
 *     })
 *   },
 *   async getAll() {
 *     const res = await fetch('/api/quiz-answers')
 *     if (!res.ok) return []
 *     return res.json()
 *   },
 *   async clear() {
 *     await fetch('/api/quiz-answers', { method: 'DELETE' })
 *   },
 * }
 */

// ここを差し替えるだけで、アプリ全体の保存先をDBに切り替えられる。
export function getAnswerLogStore(): AnswerLogStore {
  return localAnswerLogStore
}
