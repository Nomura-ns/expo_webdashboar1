// AdminResultsPanel.tsx
import { useMemo, useState } from 'react'
import type { NameplateQuestion, Theme, ThemeMode, ChoiceBreakdown, DailyCorrectRate } from '../../types'
import './AdminResultsPanel.css'

interface AdminResultsPanelProps {
  theme: Theme
  questions: NameplateQuestion[]
  themeMode: ThemeMode
  dateOptions: { label: string; value: string }[]
  getBreakdown: (question: NameplateQuestion, dateRange?: string[]) => ChoiceBreakdown[]
  getDailyCorrectRates: (dates: string[], questionIds?: string[]) => DailyCorrectRate[]
  onClose?: () => void
  password?: string
  /**
   * true: モニタに常時埋め込む「公開用」表示。パスワード不要・答えは一切見せない
   *       （カテゴリ別の日別正解率の棒グラフのみ）。
   * false: 鍵ボタンから開くオーバーレイ表示。パスワード解錠後に詳細（問題別タグ・
   *        選択肢ごとの集計・折れ線グラフ）を表示する。モバイル/デスクトップ共通。
   */
  embedded?: boolean
}

const CATEGORY_TABS = ['全体', '運転起動', '停止', 'エラーリセット', 'カウンタリセット'] as const
type CategoryTab = (typeof CATEGORY_TABS)[number]

export default function AdminResultsPanel({
  theme,
  questions,
  themeMode,
  dateOptions,
  getBreakdown,
  getDailyCorrectRates,
  onClose,
  password = 'nishi2460',
  embedded = false,
}: AdminResultsPanelProps) {
  const themeVars = {
    '--nq-bg': theme.bg,
    '--nq-surface': theme.surface,
    '--nq-border': theme.border,
    '--nq-text': theme.text,
    '--nq-subtext': theme.subtext,
    '--nq-accent': theme.accent,
  } as React.CSSProperties

  // ─────────────────────────────────────────────
  // 公開用（embedded）：カテゴリ別・日別正解率の棒グラフのみ。答えは一切表示しない。
  // ─────────────────────────────────────────────
  if (embedded) {
    const [category, setCategory] = useState<CategoryTab>('全体')
    const [selectedDates, setSelectedDates] = useState<string[]>(dateOptions.map((d) => d.value))

    const questionIds = useMemo(
      () =>
        category === '全体'
          ? undefined
          : questions.filter((q) => q.choices[q.correctIndex] === category).map((q) => q.id),
      [category, questions]
    )

    const dailyRates = useMemo(() => {
      const dates = dateOptions.filter((d) => selectedDates.includes(d.value))
      return getDailyCorrectRates(dates.map((d) => d.value), questionIds)
    }, [dateOptions, selectedDates, questionIds, getDailyCorrectRates])

    const toggleDate = (value: string) => {
      setSelectedDates((prev) =>
        prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
      )
    }

    const chartW = 480
    const chartH = 220
    const padX = 34
    const padY = 40
    const barGap = 10
    const plotW = chartW - padX * 2
    const plotH = chartH - padY * 2
    const barW = dailyRates.length > 0 ? (plotW - barGap * (dailyRates.length - 1)) / dailyRates.length : 0
    const bars = dailyRates.map((d, i) => {
      const x = padX + i * (barW + barGap)
      const h = (d.correctRate / 100) * plotH
      const y = padY + (plotH - h)
      return { x, y, h, d }
    })

    return (
      <div className="admin-panel__embed" style={themeVars}>
        <div className="admin-panel__modal admin-panel__modal--embedded">
          <div className="admin-panel__content">
            <h2 className="admin-panel__title">日別正解率</h2>

            <div className="admin-panel__tags">
              {CATEGORY_TABS.map((c) => (
                <button
                  key={c}
                  className={`admin-panel__tag${category === c ? ' is-active' : ''}`}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="admin-panel__dates">
              {dateOptions.map((d) => (
                <label key={d.value} className="admin-panel__date-chip">
                  <input
                    type="checkbox"
                    checked={selectedDates.includes(d.value)}
                    onChange={() => toggleDate(d.value)}
                  />
                  {d.label}
                </label>
              ))}
            </div>

            <div className="admin-panel__chart-section">
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="admin-panel__chart">
                <line
                  x1={padX}
                  y1={padY + plotH}
                  x2={chartW - padX}
                  y2={padY + plotH}
                  className="admin-panel__chart-baseline"
                />
                {bars.map((b, i) => (
                  <g key={i}>
                    <rect x={b.x} y={b.y} width={barW} height={b.h} rx={4} className="admin-panel__chart-bar" />
                    <text x={b.x + barW / 2} y={b.y - 10} textAnchor="middle" className="admin-panel__chart-y-label">
                      {b.d.totalAnswered > 0 ? `${b.d.correctRate}%` : '-'}
                    </text>
                    <text x={b.x + barW / 2} y={chartH - 4} textAnchor="middle" className="admin-panel__chart-x-label">
                      {b.d.date.slice(5)}
                    </text>
                  </g>
                ))}
              </svg>
              {dailyRates.length === 0 && (
                <p className="admin-panel__empty">表示する日付がありません</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // オーバーレイ（鍵ボタンから開く）：パスワード解錠後に詳細パネルを表示
  // ─────────────────────────────────────────────
  const [unlocked, setUnlocked] = useState(false)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(false)

  const [selectedQuestionId, setSelectedQuestionId] = useState(questions[0]?.id ?? null)
  const [selectedDates, setSelectedDates] = useState<string[]>(dateOptions.map((d) => d.value))

  const selectedQuestion = useMemo(
    () => questions.find((q) => q.id === selectedQuestionId) ?? null,
    [questions, selectedQuestionId]
  )

  const breakdown = useMemo(
    () => (selectedQuestion ? getBreakdown(selectedQuestion, selectedDates) : []),
    [selectedQuestion, selectedDates, getBreakdown]
  )

  const dailyRates = useMemo(
    () => getDailyCorrectRates(dateOptions.map((d) => d.value)),
    [dateOptions, getDailyCorrectRates]
  )

  const toggleDate = (value: string) => {
    setSelectedDates((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    )
  }

  const handleUnlock = () => {
    if (pwInput === password) {
      setUnlocked(true)
      setPwError(false)
    } else {
      setPwError(true)
    }
  }

  const maxRate = 100
  const chartW = 480
  const chartH = 160
  const padX = 30
  const padY = 20
  const stepX = dailyRates.length > 1 ? (chartW - padX * 2) / (dailyRates.length - 1) : 0
  const points = dailyRates.map((d, i) => {
    const x = padX + i * stepX
    const y = padY + (1 - d.correctRate / maxRate) * (chartH - padY * 2)
    return { x, y, d }
  })
  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ')

  return (
    <div className="admin-panel__overlay" style={themeVars}>
      <div className="admin-panel__modal">
        <button className="admin-panel__close" onClick={onClose} aria-label="閉じる">
          ×
        </button>

        {!unlocked ? (
          <div className="admin-panel__gate">
            <h2 className="admin-panel__title">作成者用ページ</h2>
            <p className="admin-panel__gate-desc">パスワードを入力してください</p>
            <input
              type="password"
              className={`admin-panel__pw-input${pwError ? ' is-error' : ''}`}
              value={pwInput}
              onChange={(e) => {
                setPwInput(e.target.value)
                setPwError(false)
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder="パスワード"
              autoFocus
            />
            {pwError && <p className="admin-panel__pw-error">パスワードが違います</p>}
            <button className="admin-panel__unlock-btn" onClick={handleUnlock}>
              開く
            </button>
          </div>
        ) : (
          <div className="admin-panel__content">
            <h2 className="admin-panel__title">正解集計ページ</h2>

            <div className="admin-panel__tags">
              {questions.map((q) => (
                <button
                  key={q.id}
                  className={`admin-panel__tag${selectedQuestionId === q.id ? ' is-active' : ''}`}
                  onClick={() => setSelectedQuestionId(q.id)}
                >
                  {q.choices[q.correctIndex]}
                </button>
              ))}
            </div>

            <div className="admin-panel__dates">
              {dateOptions.map((d) => (
                <label key={d.value} className="admin-panel__date-chip">
                  <input
                    type="checkbox"
                    checked={selectedDates.includes(d.value)}
                    onChange={() => toggleDate(d.value)}
                  />
                  {d.label}
                </label>
              ))}
            </div>

            {selectedQuestion && (
              <div className="admin-panel__breakdown">
                <p className="admin-panel__question-label">
                  {selectedQuestion.iconUrl?.[themeMode] && (
                    <img
                      src={selectedQuestion.iconUrl[themeMode]}
                      alt=""
                      className="admin-panel__question-icon-inline"
                    />
                  )}
                  {selectedQuestion.question}
                </p>
                {breakdown.map((b) => (
                  <div key={b.choiceIndex} className="admin-panel__bar-row">
                    <span className={`admin-panel__bar-label${b.isCorrect ? ' is-correct' : ''}`}>
                      {b.label}
                    </span>
                    <div className="admin-panel__bar-track">
                      <div
                        className={`admin-panel__bar-fill${b.isCorrect ? ' is-correct' : ''}`}
                        style={{ width: `${b.percent}%` }}
                      />
                    </div>
                    <span className="admin-panel__bar-value">
                      {b.percent}%（{b.count}件）
                    </span>
                  </div>
                ))}
                {breakdown.every((b) => b.count === 0) && (
                  <p className="admin-panel__empty">選択した期間のデータがありません</p>
                )}
              </div>
            )}

            <div className="admin-panel__chart-section">
              <p className="admin-panel__chart-title">日別正解率</p>
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="admin-panel__chart">
                <polyline points={polyline} className="admin-panel__chart-line" />
                {points.map((p, i) => (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r={3.5} className="admin-panel__chart-dot" />
                    <text x={p.x} y={chartH - 4} textAnchor="middle" className="admin-panel__chart-x-label">
                      {p.d.date.slice(5)}
                    </text>
                    <text x={p.x} y={p.y - 8} textAnchor="middle" className="admin-panel__chart-y-label">
                      {p.d.totalAnswered > 0 ? `${p.d.correctRate}%` : '-'}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}