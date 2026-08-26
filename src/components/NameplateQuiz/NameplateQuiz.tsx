// NameplateQuiz.tsx (インポート部分)
import { useEffect, useMemo, useState } from 'react'
import PanelFrame from '../common/PanelFrame'
import type { NameplateQuestion, ThemeMode, Theme } from '../../types'
import AdminResultsPanel from './AdminResultsPanel'
import { useQuizAnswerLog } from '../../hooks/useQuizAnswerLog'
import { useQuizProgressCache, INITIAL_PROGRESS } from '../../hooks/useQuizProgressCache'
import { useIsMobile } from '../../hooks/useMediaQuery' // ← ここを既存フックのパスに変更
import './NameplateQuiz.css'


const UNKNOWN_CHOICE_INDEX = 4 // 「わからない」

interface NameplateQuizProps {
  theme: Theme
  questions: NameplateQuestion[]
  themeMode: ThemeMode
  isAdminOpen: boolean
  onAdminOpenChange: (open: boolean) => void
}

function shuffledOrder(questions: NameplateQuestion[]): string[] {
  const ids = questions.map((q) => q.id)
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  return ids
}

// 4択（0〜3）だけをシャッフルした並び順を返す（「わからない」は常に最後の固定枠のまま）
function shuffledChoiceOrder(choiceCount: number): number[] {
  const indices = Array.from({ length: choiceCount }, (_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return indices
}

// 直近5日分の日付（'YYYY-MM-DD'キー / 'MM/DD'表示ラベル）。管理ページの日付フィルタ用。
function recentDateOptions(days = 5): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    out.push({ label: `${m}/${day}`, value: `${y}-${m}-${day}` })
  }
  return out
}

export default function NameplateQuiz({
  theme, questions, themeMode, isAdminOpen, onAdminOpenChange,
}: NameplateQuizProps) {
  const { logAnswer, getOverallStats, getBreakdown, getDailyCorrectRates } = useQuizAnswerLog()
  const { progress, setProgress } = useQuizProgressCache()
  const isMobile = useIsMobile()

  const [overall, setOverall] = useState(() => getOverallStats())
  
  const dateOptions = useMemo(() => recentDateOptions(5), [])

  const currentQuestionId = progress.order[progress.currentIndex] ?? null
  const question = useMemo(
    () => questions.find((q) => q.id === currentQuestionId) ?? null,
    [questions, currentQuestionId]
  )
  const currentVideoUrl = question?.videoUrl?.[themeMode]
  const currentIconUrl = question?.iconUrl?.[themeMode]
  const isLastQuestion = progress.currentIndex === progress.order.length - 1
  
  const [videoReady, setVideoReady] = useState(false)

  useEffect(() => {
  setVideoReady(false)
}, [currentVideoUrl])
   
  const rate = overall.totalAnswered > 0 ? Math.round((overall.totalCorrect / overall.totalAnswered) * 100) : 0

  const ring = useMemo(() => {
    const r = 30
    const c = 2 * Math.PI * r
    return { r, c, offset: c - (rate / 100) * c }
  }, [rate])

  const showQuestionView = progress.phase === 'question'

  // 4択部分の表示順（正解位置を毎回ランダムにする）。問題が変わるたびに再計算。
  const choiceOrder = useMemo(
    () => (question ? shuffledChoiceOrder(question.choices.length) : []),
    [currentQuestionId, question]
  )

  // ---- 回答判定（クリックのみ） ----
  const submitAnswer = (choiceIndex: number) => {
    if (!question || progress.phase !== 'question') return
    const isUnknown = choiceIndex === UNKNOWN_CHOICE_INDEX
    const correct = !isUnknown && choiceIndex === question.correctIndex
    logAnswer(question.id, choiceIndex, correct)
    setOverall((prev) => ({
      totalAnswered: prev.totalAnswered + 1,
      totalCorrect: prev.totalCorrect + (correct ? 1 : 0),
    }))
    setProgress((prev) => ({
      ...prev,
      phase: 'answered',
      selectedChoiceIndex: choiceIndex,
      resultFlag: isUnknown ? 'unanswered' : correct ? 'correct' : 'incorrect',
      sessionAnswered: prev.sessionAnswered + 1,
      sessionCorrect: prev.sessionCorrect + (correct ? 1 : 0),
    }))
  }

  const TIMEOUT_MS = 10 * 60 * 1000 // 10分

// ---- 10分未回答タイムアウト：今の問題だけ「未回答」にして次へ進める ----
// （それまでの sessionCorrect / sessionAnswered は保持し、丸ごとリセットはしない）
useEffect(() => {
  if (progress.phase !== 'question' || !question) return

  const targetQuestionId = question.id
  const elapsed = Date.now() - progress.timestamp
  const remaining = TIMEOUT_MS - elapsed

  const handleTimeout = () => {
    logAnswer(targetQuestionId, UNKNOWN_CHOICE_INDEX, false)
    setOverall((prev) => ({
      totalAnswered: prev.totalAnswered + 1,
      totalCorrect: prev.totalCorrect, // 未回答は正解数に加算しない
    }))
    setProgress((prev) => {
      const isLast = prev.currentIndex === prev.order.length - 1
      if (isLast) {
        return {
          ...prev,
          phase: 'finished',
          selectedChoiceIndex: null,
          resultFlag: null,
          sessionAnswered: prev.sessionAnswered + 1,
          // sessionCorrect はそのまま（加算しない）
        }
      }
      return {
        ...prev,
        phase: 'question',
        currentIndex: prev.currentIndex + 1,
        selectedChoiceIndex: null,
        resultFlag: null,
        sessionAnswered: prev.sessionAnswered + 1,
        // sessionCorrect はそのまま（加算しない）
      }
    })
  }

  if (remaining <= 0) {
    handleTimeout()
    return
  }

  const timer = setTimeout(handleTimeout, remaining)
  return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [progress.phase, progress.timestamp, currentQuestionId])

  const themeVars = {
    '--nq-bg': theme.bg,
    '--nq-surface': theme.surface,
    '--nq-border': theme.border,
    '--nq-text': theme.text,
    '--nq-subtext': theme.subtext,
    '--nq-accent': theme.accent,
  } as React.CSSProperties

  const handleStart = () => {
    setProgress({
      phase: 'question',
      order: shuffledOrder(questions),
      currentIndex: 0,
      selectedChoiceIndex: null,
      resultFlag: null,
      sessionAnswered: 0,
      sessionCorrect: 0,
      timestamp: Date.now(),
    })
  }

  const handleNext = () => {
    if (isLastQuestion) {
      setProgress((prev) => ({ ...prev, phase: 'finished' }))
    } else {
      setProgress((prev) => ({
        ...prev,
        phase: 'question',
        currentIndex: prev.currentIndex + 1,
        selectedChoiceIndex: null,
        resultFlag: null,
      }))
    }
  }

  const handleRestart = () => {
    setProgress(INITIAL_PROGRESS)
  }

  return (
    <PanelFrame className="nameplate-quiz">
      <div className={`nameplate-quiz__layout${isMobile ? ' is-mobile' : ''}`} style={themeVars}>
      {!isMobile && (
        <div className="nameplate-quiz__side">
          <svg viewBox="-5 0 80 80" className="nameplate-quiz__ring" role="img" aria-label="正解率">
            <circle cx="40" cy="35" r={ring.r} className="nameplate-quiz__ring-track" />
            <circle
              cx="40"
              cy="35"
              r={ring.r}
              className="nameplate-quiz__ring-fill"
              strokeDasharray={ring.c}
              strokeDashoffset={ring.offset}
            />
            <text x="36" y="5" textAnchor="middle" className="nameplate-quiz__ring-value">
              {rate}
            </text>
            <text x="36" y="18" textAnchor="middle" className="nameplate-quiz__ring-unit">
              % 正解率
            </text>
          </svg>
        </div>
      )}
        <div className="nameplate-quiz__media">
         {!isMobile ? (
           <AdminResultsPanel
             theme={theme}
             questions={questions}
             themeMode={themeMode}
             dateOptions={dateOptions}
             getBreakdown={getBreakdown}
             getDailyCorrectRates={getDailyCorrectRates}
             embedded
           />
          ) : progress.phase === 'idle' ? (
            <div className="nameplate-quiz__start-view">
              <p className="nameplate-quiz__start-desc">銘板アイコンクイズ（全{questions.length}問）</p>
              <button className="nameplate-quiz__start-btn" onClick={handleStart}>
                クイズ開始
              </button>
            </div>
          ) : progress.phase === 'finished' ? (
            <div className="nameplate-quiz__final-view">
              <p className="nameplate-quiz__final-title">結果</p>
              <p className="nameplate-quiz__final-score">
                {progress.order.length}問中 <span>{progress.sessionCorrect}</span>問正解
              </p>
              <p className="nameplate-quiz__final-rate">
                正解率{' '}
                {progress.sessionAnswered > 0
                  ? Math.round((progress.sessionCorrect / progress.sessionAnswered) * 100)
                  : 0}
                %
              </p>
              <button className="nameplate-quiz__toggle-btn" onClick={handleRestart}>
                もう一度挑戦する
              </button>
            </div>
          ) : showQuestionView ? (
            // 問題表示：動画（背景）＋問題文＋選択肢（クリック可）。タイマーなし。
            <div className="nameplate-quiz__question-view">
              {currentVideoUrl && (
             <video
               key={currentVideoUrl}
               src={currentVideoUrl}
               className="nameplate-quiz__video"
               autoPlay
               muted
               loop
               playsInline
               preload="auto"
               onCanPlay={() => setVideoReady(true)}
               style={{ opacity: videoReady ? 1 : 0 }}
              />
              )}
              {currentVideoUrl && !videoReady && (
                <p className="nameplate-quiz__media-placeholder">読み込み中…</p>
              )}

              {question?.question && (
                <p className="nameplate-quiz__question-text">
                {currentIconUrl && (
                 <img
                 src={currentIconUrl}
                 alt=""
                 className="nameplate-quiz__question-icon-inline"
                />
              )}
             {question.question}
             </p>
             )}

              {question && (
                <div className="nameplate-quiz__question-choices">
                  {choiceOrder.map((idx) => (
                    <button
                      key={idx}
                      className="nameplate-quiz__question-choice nameplate-quiz__question-choice--clickable"
                      onClick={() => submitAnswer(idx)}
                    >
                      {question.choices[idx]}
                    </button>
                  ))}
                  <button
                    className="nameplate-quiz__question-choice nameplate-quiz__question-choice--clickable nameplate-quiz__question-choice--unknown"
                    onClick={() => submitAnswer(UNKNOWN_CHOICE_INDEX)}
                  >
                    わからない
                  </button>
                </div>
              )}
            </div>
          ) : (
            // 正誤判定ビュー：正解/不正解/未回答＋解説＋次へ
            <div className="nameplate-quiz__answer-view">
              <div className={`nameplate-quiz__result nameplate-quiz__result--${progress.resultFlag}`}>
                {progress.resultFlag === 'correct'
                  ? '正解 〇'
                  : progress.resultFlag === 'unanswered'
                  ? '未回答'
                  : '不正解 ×'}
              </div>

              {question?.question && (
                <p className="nameplate-quiz__question-text">
                 {currentIconUrl && (
                 <img
                 src={currentIconUrl}
                 alt=""
                 className="nameplate-quiz__question-icon-inline"
                 />
                 )}
              {question.question}
              </p>
              )}

              {question && (
                <div className="nameplate-quiz__question-choices">
                  {choiceOrder.map((idx) => {
                    const isCorrectChoice = idx === question.correctIndex
                    const isSelected = progress.selectedChoiceIndex === idx
                    return (
                      <div
                        key={idx}
                        className={`nameplate-quiz__question-choice${
                          isCorrectChoice ? ' is-correct-answer' : ''
                        }${isSelected && !isCorrectChoice ? ' is-wrong-answer' : ''}`}
                      >
                        {question.choices[idx]}
                      </div>
                    )
                  })}
                  <div
                    className={`nameplate-quiz__question-choice nameplate-quiz__question-choice--unknown${
                      progress.selectedChoiceIndex === UNKNOWN_CHOICE_INDEX ? ' is-wrong-answer' : ''
                    }`}
                  >
                    わからない
                  </div>
                </div>
              )}

              {question?.explanation && (
                <p className="nameplate-quiz__explanation">{question.explanation}</p>
              )}

              <div className="nameplate-quiz__answer-actions">
                <button className="nameplate-quiz__toggle-btn is-on" onClick={handleNext}>
                  次へ
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isAdminOpen && (
       <AdminResultsPanel
         theme={theme}
         questions={questions}
         themeMode={themeMode}
         dateOptions={dateOptions}
         getBreakdown={getBreakdown}
         getDailyCorrectRates={getDailyCorrectRates}
         onClose={() => onAdminOpenChange(false)}
        />
     )}
    </PanelFrame>
  )
}