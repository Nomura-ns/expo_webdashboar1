// LiveClock.tsx
//
// 上部タイトルバー右端の現在日時表示。「データ更新：現場PLC同期」の目安として、
// 画面が最終更新された/表示され続けている時刻がわかるように1秒ごとに更新する。

import { useEffect, useState } from 'react'

function pad2(n: number) {
  return n.toString().padStart(2, '0')
}

function format(d: Date) {
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${pad2(d.getHours())}:${pad2(
    d.getMinutes(),
  )}:${pad2(d.getSeconds())}`
}

export default function LiveClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return <span className="axis-monitor__clock">{format(now)}</span>
}
