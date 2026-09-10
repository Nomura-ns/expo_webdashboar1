// src/utils/dateRange.ts

/** 直近N日分の日付を { key: 'YYYY-MM-DD', label: 'MM/DD' } の配列で返す。
 *  古い日付が先頭、当日が末尾になる。
 *  OperationResults（棒グラフのdateフィールド）と
 *  NameplateQuiz/AdminResultsPanel（日付フィルタ）の両方で共通使用する。
 */
export interface DateRangeItem {
  key: string    // 'YYYY-MM-DD' 形式。データの突き合わせ・保存キーに使う
  label: string  // 'MM/DD' 形式。表示用
}

export function getRecentDates(days: number): DateRangeItem[] {
  const out: DateRangeItem[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    out.push({ key: `${y}-${m}-${day}`, label: `${m}/${day}` })
  }
  return out
}

/** 表示する日数。ここを変えるだけで全ページの日数が揃って変わる */
export const METRIC_DAYS = 3