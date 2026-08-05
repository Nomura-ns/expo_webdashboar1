// NameplateQuiz.tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import PanelFrame from '../common/PanelFrame'
import type { NameplateQuestion, QuizStats, ThemeMode, Theme } from '../../types'
import './NameplateQuiz.css'

const TIMER_DURATION = 10 // 秒

interface NameplateQuizProps {
  theme: Theme
  questions: NameplateQuestion[]
  initialStats: QuizStats
  themeMode: ThemeMode
  activeQuestionId: string | null
  resultFlag: 'correct' | 'incorrect' | null
}

export default function NameplateQuiz({
  theme,
  questions,
  initialStats,
  themeMode,
  activeQuestionId,
  resultFlag,
}: NameplateQuizProps) {
  const [stats, setStats] = useState(initialStats)
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION)
  const [progress, setProgress] = useState(0) // 0〜1（経過割合）
  const startTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastProcessedFlag = useRef<string | null>(null)
  

  const qIndex = useMemo(() => {
    const idx = questions.findIndex((q) => q.id === activeQuestionId)
    return idx === -1 ? 0 : idx
  }, [questions, activeQuestionId])

  const question = questions[qIndex]
  const currentVideoUrl = question?.videoUrl?.[themeMode]

  useEffect(() => {
    if (!resultFlag) return
    const flagKey = `${activeQuestionId}:${resultFlag}`
    if (lastProcessedFlag.current === flagKey) return
    lastProcessedFlag.current = flagKey

    setStats((prev) => {
      const isCorrect = resultFlag === 'correct'
      return {
        ...prev,
        totalAnswered: prev.totalAnswered + 1,
        totalCorrect: prev.totalCorrect + (isCorrect ? 1 : 0),
        streak: isCorrect ? prev.streak + 1 : 0,
      }
    })
  }, [resultFlag, activeQuestionId])

  const rate = stats.totalAnswered > 0 ? Math.round((stats.totalCorrect / stats.totalAnswered) * 100) : 0

  const ring = useMemo(() => {
    const r = 30
    const c = 2 * Math.PI * r
    return { r, c, offset: c - (rate / 100) * c }
  }, [rate])

  const showAnswerView = !!resultFlag
  const showQuestionView = !showAnswerView 

  useEffect(() => {
  if (rafRef.current) {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }

  if (!showQuestionView) {
    setTimeLeft(TIMER_DURATION)
    setProgress(0)
    startTimeRef.current = null
    return
  }

  startTimeRef.current = performance.now()
  setTimeLeft(TIMER_DURATION)
  setProgress(0)

  const tick = (now: number) => {
    const start = startTimeRef.current ?? now
    const elapsed = (now - start) / 1000
    const clamped = Math.min(elapsed, TIMER_DURATION)

    setProgress(clamped / TIMER_DURATION)
    setTimeLeft(Math.max(0, Math.ceil(TIMER_DURATION - clamped)))

    if (clamped < TIMER_DURATION) {
      rafRef.current = requestAnimationFrame(tick)
    }
  }
  rafRef.current = requestAnimationFrame(tick)

  return () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
  }
}, [showQuestionView, activeQuestionId])

const isUrgent = timeLeft <= 3

// 4辺それぞれの進捗（0〜1）。上→右→下→左の順で均等に埋まる
const edgeUnit = progress * 4
const edgeProgress = {
  top: Math.min(1, edgeUnit),
  right: Math.min(1, Math.max(0, edgeUnit - 1)),
  bottom: Math.min(1, Math.max(0, edgeUnit - 2)),
  left: Math.min(1, Math.max(0, edgeUnit - 3)),
}

const themeVars = {
    '--nq-bg': theme.bg,
    '--nq-surface': theme.surface,
    '--nq-border': theme.border,
    '--nq-text': theme.text,
    '--nq-subtext': theme.subtext,
    '--nq-accent': theme.accent,
  } as React.CSSProperties

  return (
    <PanelFrame index="04" title="銘板アイコン出題" subtitle="QUIZ" className="nameplate-quiz">
      <div className="nameplate-quiz__layout" style={themeVars}>
        <div className="nameplate-quiz__side">
          <svg viewBox="0 0 72 72" className="nameplate-quiz__ring" role="img" aria-label="正解率">
            <circle cx="36" cy="13" r={ring.r} className="nameplate-quiz__ring-track" />
            <circle
              cx="36"
              cy="13"
              r={ring.r}
              className="nameplate-quiz__ring-fill"
              strokeDasharray={ring.c}
              strokeDashoffset={ring.offset}
            />
            <text x="36" y="33" textAnchor="middle" className="nameplate-quiz__ring-value">
              {rate}
            </text>
            <text x="36" y="46" textAnchor="middle" className="nameplate-quiz__ring-unit">
              % 正解率
            </text>
          </svg>

          <div className="nameplate-quiz__legend">
            <span className="nameplate-quiz__legend-item">
              <i className="nameplate-quiz__legend-dot is-correct" />
              正解
            </span>
            <span className="nameplate-quiz__legend-item">
              <i className="nameplate-quiz__legend-dot is-wrong" />
              不正解
            </span>
          </div>

          <div className="nameplate-quiz__figures">
            <div className="nameplate-quiz__figure">
              <span className="nameplate-quiz__figure-label">回答数</span>
              <span className="nameplate-quiz__figure-value">{stats.totalAnswered}</span>
            </div>
            <div className="nameplate-quiz__figure">
              <span className="nameplate-quiz__figure-label">連続正解</span>
              <span className="nameplate-quiz__figure-value">{stats.streak}</span>
            </div>
          </div>
        </div>

        <div className="nameplate-quiz__media">
          {showQuestionView ? (
            // ★問題表示：アイコン画像＋問題文＋選択肢テキスト＋10秒タイマー枠
            <div className="nameplate-quiz__question-view">
            <div className="nameplate-quiz__timer-overlay">
            <div
              className={`nameplate-quiz__timer-frame${isUrgent ? ' is-urgent' : ''}`}
              aria-hidden="true"
            >
            <span
              className="nameplate-quiz__timer-edge nameplate-quiz__timer-edge--top"
              style={{ transform: `scaleX(${edgeProgress.top})` }}
            />
            <span
              className="nameplate-quiz__timer-edge nameplate-quiz__timer-edge--right"
              style={{ transform: `scaleY(${edgeProgress.right})` }}
            />
            <span
              className="nameplate-quiz__timer-edge nameplate-quiz__timer-edge--bottom"
              style={{ transform: `scaleX(${edgeProgress.bottom})` }}
            />
            <span
              className="nameplate-quiz__timer-edge nameplate-quiz__timer-edge--left"
              style={{ transform: `scaleY(${edgeProgress.left})` }}
            />
            </div>
           <span className={`nameplate-quiz__timer-count${isUrgent ? ' is-urgent' : ''}`}>
            {timeLeft}
           </span>
           </div>

           {question?.question && (
           <p className="nameplate-quiz__question-text">{question.question}</p>
           )}
           </div>
          ) : currentVideoUrl ? (
            <video
              key={currentVideoUrl}
              src={currentVideoUrl}
              className="nameplate-quiz__video"
              controls
              autoPlay
              muted
              loop
            />
          ) : (
            <span className="nameplate-quiz__media-placeholder">動画</span>
          )}

          {showAnswerView && (
            <div className={`nameplate-quiz__result nameplate-quiz__result--${resultFlag}`}>
              {resultFlag === 'correct' ? '正解' : '不正解'}
            </div>
          )}
        </div>
      </div>
    </PanelFrame>
  )
}