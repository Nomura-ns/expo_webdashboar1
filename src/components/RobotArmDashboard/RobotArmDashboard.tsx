import { useEffect, useRef, useState, useCallback } from 'react'
import type { PointerEvent } from 'react'
import PanelFrame from '../common/PanelFrame'
import type { Theme, CameraFeed } from '../../types/common'
import './RobotArmDashboard.css'

type Props = {
  theme: Theme
  isEditing: boolean
}

// --- サイズ・台数の制約値 ---
const MIN_SIZE = 160
const MAX_CAMERA_SIZE = 1000
const MIN_CAMERAS = 1
const MAX_CAMERAS = 256

// カメラの状態は正常 / 異常の2値で管理する
type CameraStatus = '正常' | '異常'

const createInitialCameras = (): CameraFeed[] => [
  {
    id: 'cam-1',
    label: 'カメラ 1',
    location: '正面',
    pos: { x: 25, y: 50 },
    size: 800,
    status: '正常',
  },
  {
    id: 'cam-2',
    label: 'カメラ 2',
    location: '背面',
    pos: { x: 75, y: 50 },
    size: 800,
    status: '正常',
  },
]

const nextCameraDefaults = (index: number): CameraFeed => ({
  id: `cam-${Date.now()}-${index}`,
  label: `カメラ ${index}`,
  location: '',
  pos: {
    x: 50 + (Math.random() * 20 - 10),
    y: 50 + (Math.random() * 20 - 10),
  },
  size: 320,
  status: '正常',
})

export default function RobotArmDashboard({ theme, isEditing }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingId = useRef<string | null>(null)

  const [cameras, setCameras] = useState<CameraFeed[]>(createInitialCameras())
  const [countInput, setCountInput] = useState(String(cameras.length))

  // カメラ台数が外部要因（±ボタン等）で変わったら入力欄の表示も同期する
  useEffect(() => {
    setCountInput(String(cameras.length))
  }, [cameras.length])

  // ドラッグ中の座標をキャンバス内の % 位置に変換
  const clientToPercent = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 50, y: 50 }
    const x = ((clientX - rect.left) / rect.width) * 100
    const y = ((clientY - rect.top) / rect.height) * 100
    return {
      x: Math.min(96, Math.max(4, x)),
      y: Math.min(96, Math.max(4, y)),
    }
  }, [])

  const handlePointerDown = (id: string) => (e: PointerEvent<HTMLDivElement>) => {
    if (!isEditing) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    draggingId.current = id
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggingId.current) return
    const pos = clientToPercent(e.clientX, e.clientY)
    const id = draggingId.current
    setCameras(prev => prev.map(cam => (cam.id === id ? { ...cam, pos } : cam)))
  }

  const handlePointerUp = () => {
    draggingId.current = null
  }

  // --- 台数操作 ---
  const addCamera = () => {
    setCameras(prev => {
      if (prev.length >= MAX_CAMERAS) return prev
      return [...prev, nextCameraDefaults(prev.length + 1)]
    })
  }

  const removeCamera = () => {
    setCameras(prev => (prev.length > MIN_CAMERAS ? prev.slice(0, -1) : prev))
  }

  const applyCameraCount = (raw: string) => {
    const parsed = parseInt(raw, 10)
    const n = Number.isNaN(parsed)
      ? cameras.length
      : Math.min(MAX_CAMERAS, Math.max(MIN_CAMERAS, parsed))

    setCameras(prev => {
      if (n === prev.length) return prev
      if (n > prev.length) {
        const additions = Array.from({ length: n - prev.length }, (_, i) =>
          nextCameraDefaults(prev.length + i + 1)
        )
        return [...prev, ...additions]
      }
      return prev.slice(0, n)
    })
  }

  const handleCountInputChange = (value: string) => {
    // 数字のみ許容（空欄は一旦許可し、確定時に補正する）
    if (value === '' || /^\d+$/.test(value)) {
      setCountInput(value)
    }
  }

  const commitCountInput = () => {
    applyCameraCount(countInput)
  }

  // --- サイズ操作（全カメラ一括） ---
  const resizeCameras = (delta: number) => {
    setCameras(prev =>
      prev.map(cam => ({ ...cam, size: Math.min(MAX_CAMERA_SIZE, Math.max(MIN_SIZE, cam.size + delta)) }))
    )
  }

  // --- 個別カメラの編集 ---
  const updateCamera = (id: string, patch: Partial<CameraFeed>) => {
    setCameras(prev => prev.map(cam => (cam.id === id ? { ...cam, ...patch } : cam)))
  }

  const resizeSingleCamera = (id: string, delta: number) => {
    setCameras(prev =>
      prev.map(cam =>
        cam.id === id
          ? { ...cam, size: Math.min(MAX_CAMERA_SIZE, Math.max(MIN_SIZE, cam.size + delta)) }
          : cam
      )
    )
  }

  const toggleStatus = (id: string) => {
    setCameras(prev =>
      prev.map(cam =>
        cam.id === id
          ? { ...cam, status: (cam.status === '正常' ? '異常' : '正常') as CameraStatus }
          : cam
      )
    )
  }

  const deleteCamera = (id: string) => {
    setCameras(prev => (prev.length > MIN_CAMERAS ? prev.filter(cam => cam.id !== id) : prev))
  }

  return (
    <PanelFrame index="01" title="カメラ監視" subtitle="Dashboard" className="robot-dashboard">
      <div className={`robot-dashboard__body${isEditing ? ' is-editing' : ''}`}>
        {/* カメラ表示エリア（編集パネルが出るとflexで自動的に幅が縮み、全体が収まる） */}
        <div
          ref={containerRef}
          className={`robot-dashboard__canvas${isEditing ? ' is-editing' : ''}`}
          style={{ borderColor: theme.border }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {cameras.map(cam => {
            const isAbnormal = cam.status === '異常'
            return (
              <div
                key={cam.id}
                className={`robot-dashboard__node robot-dashboard__camera${isEditing ? ' draggable' : ''}`}
                style={{
                  left: `${cam.pos.x}%`,
                  top: `${cam.pos.y}%`,
                  width: cam.size,
                }}
                onPointerDown={handlePointerDown(cam.id)}
              >
                <div
                  className={`robot-dashboard__camera-frame${isAbnormal ? ' is-abnormal' : ' is-normal'}`}
                  style={{ borderColor: isAbnormal ? undefined : theme.border }}
                >
                  {cam.imageUrl ? (
                    <img src={cam.imageUrl} alt={cam.label} draggable={false} />
                  ) : (
                    <div className="robot-dashboard__camera-placeholder">NO SIGNAL</div>
                  )}
                  <div className="robot-dashboard__camera-scanline" />

                  <div className="robot-dashboard__camera-overlay">
                    <div className="robot-dashboard__camera-overlay-top">
                      <span className="robot-dashboard__camera-label">{cam.label}</span>
                      <span className={`robot-dashboard__status-badge${isAbnormal ? ' is-abnormal' : ' is-normal'}`}>
                        <span className="robot-dashboard__status-dot" />
                        {cam.status}
                      </span>
                    </div>
                    {cam.location && (
                      <span className="robot-dashboard__camera-location">撮影箇所: {cam.location}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 右側編集パネル */}
        {isEditing && (
          <div
            className="robot-dashboard__edit-panel"
            style={{ background: theme.headerBg, borderColor: theme.border }}
          >
            <div className="robot-dashboard__edit-panel-scroll">
              <section className="robot-dashboard__panel-section">
                <h3>カメラ台数</h3>
                <div className="robot-dashboard__toolbar-row">
                  <button type="button" onClick={removeCamera} disabled={cameras.length <= MIN_CAMERAS}>
                    −
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="robot-dashboard__count-input"
                    value={countInput}
                    onChange={e => handleCountInputChange(e.target.value)}
                    onBlur={commitCountInput}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur()
                      }
                    }}
                  />
                  <button type="button" onClick={addCamera} disabled={cameras.length >= MAX_CAMERAS}>
                    ＋
                  </button>
                </div>
                <p className="robot-dashboard__panel-hint">台数を直接入力しても変更できます（最大 {MAX_CAMERAS} 台）</p>
              </section>

              <section className="robot-dashboard__panel-section">
                <h3>カメラサイズ（全カメラ一括）</h3>
                <div className="robot-dashboard__toolbar-row">
                  <button type="button" onClick={() => resizeCameras(-20)}>
                    −
                  </button>
                  <button type="button" onClick={() => resizeCameras(20)}>
                    ＋
                  </button>
                </div>
                <p className="robot-dashboard__panel-hint">個別に変更したい場合は下の「カメラ個別設定」から調整できます</p>
              </section>

              <section className="robot-dashboard__panel-section">
                <h3>カメラ個別設定</h3>
                <div className="robot-dashboard__camera-list">
                  {cameras.map((cam, i) => (
                    <div className="robot-dashboard__camera-list-item" key={cam.id}>
                      <div className="robot-dashboard__camera-list-header">
                        <span>#{i + 1}</span>
                        <button
                          type="button"
                          className="robot-dashboard__camera-remove"
                          onClick={() => deleteCamera(cam.id)}
                          disabled={cameras.length <= MIN_CAMERAS}
                          aria-label="このカメラを削除"
                        >
                          ×
                        </button>
                      </div>
                      <label className="robot-dashboard__field">
                        <span>名称</span>
                        <input
                          type="text"
                          value={cam.label}
                          onChange={e => updateCamera(cam.id, { label: e.target.value })}
                        />
                      </label>
                      <label className="robot-dashboard__field">
                        <span>撮影箇所</span>
                        <input
                          type="text"
                          placeholder="例: 正面 / 背面 / 側面"
                          value={cam.location ?? ''}
                          onChange={e => updateCamera(cam.id, { location: e.target.value })}
                        />
                      </label>
                      <div className="robot-dashboard__field">
                        <span>サイズ（{cam.size}px）</span>
                        <div className="robot-dashboard__toolbar-row">
                          <button
                            type="button"
                            onClick={() => resizeSingleCamera(cam.id, -20)}
                            disabled={cam.size <= MIN_SIZE}
                          >
                            −
                          </button>
                          <button
                            type="button"
                            onClick={() => resizeSingleCamera(cam.id, 20)}
                            disabled={cam.size >= MAX_CAMERA_SIZE}
                          >
                            ＋
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`robot-dashboard__status-toggle${cam.status === '異常' ? ' is-abnormal' : ' is-normal'}`}
                        onClick={() => toggleStatus(cam.id)}
                      >
                        <span className="robot-dashboard__status-dot" />
                        {cam.status}
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <p className="robot-dashboard__panel-hint">ドラッグでカメラの位置を変更できます</p>
            </div>
          </div>
        )}
      </div>
    </PanelFrame>
  )
}
