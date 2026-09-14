import { useEffect, useRef, useState } from 'react'

export type CameraDeviceOption = { deviceId: string; label: string }

export function useCameraDeviceStreams(deviceIdsById: Record<string, string | undefined>) {
  const [streamsByDeviceId, setStreamsByDeviceId] = useState<Record<string, MediaStream>>({})
  const [devices, setDevices] = useState<CameraDeviceOption[]>([])
  const [error, setError] = useState<string | null>(null)
  const streamsRef = useRef<Record<string, MediaStream>>({})

  const refreshDevices = async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices()
      setDevices(
        list.filter(d => d.kind === 'videoinput')
          .map(d => ({ deviceId: d.deviceId, label: d.label || 'カメラ' }))
      )
    } catch {
      setError('カメラ一覧の取得に失敗しました')
    }
  }

  // ラベル取得のための初回許可リクエスト（編集パネルのボタンから呼ぶ）
  const requestPermission = async () => {
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ video: true })
      tmp.getTracks().forEach(t => t.stop())
      await refreshDevices()
      setError(null)
    } catch {
      setError('カメラへのアクセスが許可されませんでした')
    }
  }

  useEffect(() => {
    refreshDevices()
    navigator.mediaDevices.addEventListener?.('devicechange', refreshDevices)
    return () => navigator.mediaDevices.removeEventListener?.('devicechange', refreshDevices)
  }, [])

  useEffect(() => {
    let cancelled = false
    const wanted = new Set(Object.values(deviceIdsById).filter(Boolean) as string[])

    Object.entries(streamsRef.current).forEach(([id, stream]) => {
      if (!wanted.has(id)) {
        stream.getTracks().forEach(t => t.stop())
        delete streamsRef.current[id]
        setStreamsByDeviceId(prev => {
          const next = { ...prev }
          delete next[id]
          return next
        })
      }
    })

    wanted.forEach(async id => {
      if (streamsRef.current[id]) return
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: id } },
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamsRef.current[id] = stream
        setStreamsByDeviceId(prev => ({ ...prev, [id]: stream }))
      } catch {
        setError(`カメラ(${id})への接続に失敗しました`)
      }
    })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(deviceIdsById)])

  useEffect(() => () => {
    Object.values(streamsRef.current).forEach(s => s.getTracks().forEach(t => t.stop()))
  }, [])

  return { streamsByDeviceId, devices, error, requestPermission }
}