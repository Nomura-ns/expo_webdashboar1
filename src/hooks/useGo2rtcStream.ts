import { useEffect, useRef, useState } from 'react'

const GO2RTC_BASE = 'http://localhost:1984'

export function useGo2rtcStream(streamName: string | undefined) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)

  useEffect(() => {
    if (!streamName) {
      setStream(null)
      return
    }
    let cancelled = false

    const connect = async () => {
      const pc = new RTCPeerConnection()
      pcRef.current = pc

      pc.addTransceiver('video', { direction: 'recvonly' })

      pc.ontrack = (ev) => {
        if (cancelled) return
        setStream(ev.streams[0])
      }

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          if (!cancelled) setError('接続が切断されました')
        }
      }

      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)

        const res = await fetch(`${GO2RTC_BASE}/api/webrtc?src=${streamName}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: offer.sdp,
        })
        if (!res.ok) {
          if (!cancelled) setError(`go2rtc接続失敗 (${res.status})`)
          return
        }
        const answerSdp = await res.text()
        if (cancelled) return
        await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
        setError(null)
      } catch {
        if (!cancelled) setError('WebRTC接続エラー')
      }
    }

    connect()

    return () => {
      cancelled = true
      pcRef.current?.close()
      pcRef.current = null
      setStream(null)
    }
  }, [streamName])

  return { stream, error }
}