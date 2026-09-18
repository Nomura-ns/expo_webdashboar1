// hooks/usePlcConnectionStatus.ts
//
// PLCから常時送られてくる「サイクル開始時刻」を監視し、
// ・起動直後は必ず非接続（未受信）扱いでスタートする
// ・値が実際に変化したら、その瞬間に即座に「接続中」へ切り替える
// ・値が一定時間（既定3分）変化しなければ「非接続」に戻す

import { useEffect, useRef, useState } from 'react'

const DEFAULT_DISCONNECT_THRESHOLD_MS = 3 * 60 * 1000 // 3分
const CHECK_INTERVAL_MS = 1000 // 経過時間の再チェック間隔

export function usePlcConnectionStatus(
  cycleStartTimeRaw: number | string | undefined,
  thresholdMs: number = DEFAULT_DISCONNECT_THRESHOLD_MS
): boolean {
  const [isConnected, setIsConnected] = useState(false) // ← 初期は非接続スタート
  const lastValueRef = useRef<typeof cycleStartTimeRaw>(undefined)
  // 値を一度も受け取っていない間はnull。受け取った瞬間に時刻を記録する
  const lastChangedAtRef = useRef<number | null>(null)

  // 値が実際に変化した瞬間だけ「最終更新時刻」を更新し、即座に接続中にする
  useEffect(() => {
    if (cycleStartTimeRaw === undefined) return
    if (lastValueRef.current !== cycleStartTimeRaw) {
      lastValueRef.current = cycleStartTimeRaw
      lastChangedAtRef.current = Date.now()
      setIsConnected(true) // ← タイマー内に接続が来ればここで即座に切り替わる
    }
  }, [cycleStartTimeRaw])

  // データが止まっている間も経過時間を見張るため、ポーリングとは別に
  // 一定間隔で「最後の変化からどれだけ経ったか」を判定する
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (lastChangedAtRef.current === null) {
        // まだ一度も値を受信していない＝非接続のまま
        setIsConnected(false)
        return
      }
      setIsConnected(Date.now() - lastChangedAtRef.current < thresholdMs)
    }, CHECK_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [thresholdMs])

  return isConnected
}