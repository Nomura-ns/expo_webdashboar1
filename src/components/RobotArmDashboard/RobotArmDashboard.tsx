import { useEffect, useRef, useState, useCallback } from 'react'
import type { PointerEvent, UIEvent } from 'react'
import PanelFrame from '../common/PanelFrame'
import { useIsMobile } from '../../hooks/useMediaQuery'
import type { Theme, CameraFeed } from '../../types/common'
import './RobotArmDashboard.css'

type Props = {
  theme: Theme
  isEditing: boolean
  onEditingChange: (value: boolean) => void
}
// 背景色（theme.bg）が明るい色かどうかを簡易判定
// これによりキャンバス背景の半透明色をテーマの明暗に合わせて切り替える
function isLightColor(hex: string): boolean {
  const c = hex.replace('#', '')
  if (c.length !== 6) return true
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5
}
 
// --- サイズ・台数の制約値 ---
const DESIGN_CANVAS_WIDTH = 1920
const MIN_SIZE = 160
const MAX_CAMERA_SIZE = 1000
const MIN_CAMERAS = 1
const MAX_CAMERAS = 256

// 編集パネルがキャンバスの横幅から奪う分（幅300px + 左マージン12px）
const EDIT_PANEL_FOOTPRINT = 300 + 12

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

export default function RobotArmDashboard({ theme, isEditing, onEditingChange, }: Props) {
  const isMobile = useIsMobile()
  const bodyRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const mobileScrollerRef = useRef<HTMLDivElement>(null)
  const draggingId = useRef<string | null>(null)
  const resizingRef = useRef<{ id: string; startX: number; startY: number; startSize: number } | null>(null)

  const [cameras, setCameras] = useState<CameraFeed[]>(createInitialCameras())
  const [countInput, setCountInput] = useState(String(cameras.length))

  // --- モバイル：現在表示中のカメラ（タブ切替・横スクロール切替と連動） ---
  const [activeCameraIndex, setActiveCameraIndex] = useState(0)
  const isScrollingBySelf = useRef(false)

  // カメラが削除されるなどして台数が減った場合、表示中インデックスがはみ出さないよう補正
  useEffect(() => {
    setActiveCameraIndex(prev => Math.min(prev, Math.max(0, cameras.length - 1)))
  }, [cameras.length])

  // body要素自体の実寸（編集パネルの有無に左右されない、パネル外枠から与えられるサイズ）を測る。
  // これを「基準サイズ」として、編集モード時はこの基準サイズに対する縮小率(scale)を計算する。
  const [fullSize, setFullSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const update = () => {
      setFullSize({ width: el.clientWidth, height: el.clientHeight })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // カメラ台数が外部要因（±ボタン等）で変わったら入力欄の表示も同期する
  useEffect(() => {
    setCountInput(String(cameras.length))
  }, [cameras.length])

  const canvasHeight = fullSize.height > 0 ? fullSize.height * 0.98 : 0
  const availableWidth = isEditing
    ? Math.max(0, fullSize.width - EDIT_PANEL_FOOTPRINT)
    : fullSize.width
  const canvasScale = fullSize.width > 0 ? Math.min(1, availableWidth / fullSize.width) : 1

   const canvasBg = isLightColor(theme.bg) ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.14)'

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
    if (draggingId.current) {
      const pos = clientToPercent(e.clientX, e.clientY)
      const id = draggingId.current
      setCameras(prev => prev.map(cam => (cam.id === id ? { ...cam, pos } : cam)))
    }
    if (resizingRef.current) {
      const { id, startX, startY, startSize } = resizingRef.current
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      const screenDelta = (dx + dy) / 2
      const scaleForDelta = canvasScale || 1
      const pxPerDesignUnit = fullSize.width > 0 ? fullSize.width / DESIGN_CANVAS_WIDTH : 1
      const deltaSize = (screenDelta / scaleForDelta) / pxPerDesignUnit
      const newSize = Math.min(MAX_CAMERA_SIZE, Math.max(MIN_SIZE, startSize + deltaSize))
      setCameras(prev => prev.map(cam => (cam.id === id ? { ...cam, size: newSize } : cam)))
    }
  }

  const handlePointerUp = () => {
    draggingId.current = null
    resizingRef.current = null
  }

  const handleResizeStart = (id: string, size: number) => (e: PointerEvent<HTMLDivElement>) => {
    if (!isEditing) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    resizingRef.current = { id, startX: e.clientX, startY: e.clientY, startSize: size }
  }

  // --- モバイル：タブクリック → 該当ページへスクロール ---
  const scrollToCameraIndex = (index: number) => {
    const el = mobileScrollerRef.current
    if (!el) return
    isScrollingBySelf.current = true
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' })
    setActiveCameraIndex(index)
    // スムーススクロール完了後にフラグを戻す（スクロールイベントとの競合防止）
    window.setTimeout(() => {
      isScrollingBySelf.current = false
    }, 400)
  }

  // --- モバイル：横スクロールでページが変わったらタブも追従させる ---
  const handleMobileScroll = (e: UIEvent<HTMLDivElement>) => {
    if (isScrollingBySelf.current) return
    const el = e.currentTarget
    if (el.clientWidth === 0) return
    const index = Math.round(el.scrollLeft / el.clientWidth)
    setActiveCameraIndex(prev => (prev === index ? prev : index))
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
    if (value === '' || /^\d+$/.test(value)) {
      setCountInput(value)
    }
  }

  const commitCountInput = () => {
    applyCameraCount(countInput)
  }

  // --- サイズ操作（全カメラ一括／デスクトップのみ使用） ---
  const resizeCameras = (delta: number) => {
    setCameras(prev =>
      prev.map(cam => ({ ...cam, size: Math.min(MAX_CAMERA_SIZE, Math.max(MIN_SIZE, cam.size + delta)) }))
    )
  }

  const applyBulkSize = (raw: string) => {
    const parsed = parseInt(raw, 10)
    if (Number.isNaN(parsed)) return
    const clamped = Math.min(MAX_CAMERA_SIZE, Math.max(MIN_SIZE, parsed))
    setCameras(prev => prev.map(cam => ({ ...cam, size: clamped })))
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

  const applySingleSize = (id: string, raw: string) => {
    const parsed = parseInt(raw, 10)
    if (Number.isNaN(parsed)) return
    const clamped = Math.min(MAX_CAMERA_SIZE, Math.max(MIN_SIZE, parsed))
    updateCamera(id, { size: clamped })
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

  // --- カメラ枠の中身（画像 / プレースホルダー / オーバーレイ）はデスクトップ・モバイル共通 ---
  const renderCameraContent = (cam: CameraFeed) => {
    const isAbnormal = cam.status === '異常'
    return (
      <>
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
      </>
    )
  }

  return (
    <PanelFrame className="robot-dashboard">
      <div
        ref={bodyRef}
        className={`robot-dashboard__body${isEditing ? ' is-editing' : ''}`}
        style={{ '--canvas-bg': canvasBg } as React.CSSProperties}
      >
        {isMobile ? (
          /* --- モバイル版：1台だけ表示し、上部タブ or 横スクロールで切替 --- */
          <div className="robot-dashboard__mobile-wrap">
            {cameras.length > 1 && (
              <div className="robot-dashboard__mobile-tabs">
                {cameras.map((cam, i) => (
                  <button
                    key={cam.id}
                    type="button"
                    className={`robot-dashboard__mobile-tab${i === activeCameraIndex ? ' is-active' : ''}`}
                    style={
                      i === activeCameraIndex
                        ? { borderColor: theme.accent, color: theme.accent }
                        : undefined
                    }
                    onClick={() => scrollToCameraIndex(i)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}

            <div
              ref={mobileScrollerRef}
              className="robot-dashboard__mobile-scroller"
              onScroll={handleMobileScroll}
            >
              {cameras.map(cam => {
                const isAbnormal = cam.status === '異常'
                return (
                  <div key={cam.id} className="robot-dashboard__mobile-page">
                    <div
                      className={`robot-dashboard__mobile-frame${isAbnormal ? ' is-abnormal' : ' is-normal'}`}
                      style={{ borderColor: isAbnormal ? undefined : theme.border }}
                    >
                      {renderCameraContent(cam)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* --- デスクトップ版：これまで通りのフロアマップ配置 --- */
          <div
            className="robot-dashboard__canvas-stage"
            style={
              fullSize.width > 0
                ? { width: availableWidth, height: canvasHeight }
                : undefined
            }
          >
                        <div
            ref={containerRef}
            className={`robot-dashboard__canvas${isEditing ? ' is-editing' : ''}`}
            style={{
             background: canvasBg,
             ...(fullSize.width > 0
             ? {
               width: fullSize.width,
               height: canvasHeight,
               transform: `scale(${canvasScale})`,
               transformOrigin: 'top left',
              }
              : {}),
            }}
            >

              <div
                className="robot-dashboard__canvas-inner"
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
                        width: `${(cam.size / DESIGN_CANVAS_WIDTH) * 100}cqw`,
                      }}
                      onPointerDown={handlePointerDown(cam.id)}
                    >
                      <div
                        className={`robot-dashboard__camera-frame${isAbnormal ? ' is-abnormal' : ' is-normal'}`}
                        style={{ borderColor: isAbnormal ? undefined : theme.border }}
                      >
                        {renderCameraContent(cam)}

                        {isEditing && (
                          <div
                            className="robot-dashboard__resize-handle"
                            onPointerDown={handleResizeStart(cam.id, cam.size)}
                            title="ドラッグでサイズ変更"
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* 右側編集パネル */}
        {isEditing && (
          <div
            className="robot-dashboard__edit-panel"
            style={{ background: theme.headerBg, borderColor: theme.border }}
          >
            <div className="robot-dashboard__edit-panel-scroll">
              {/* 編集モードトグル（設定パネルと同期） */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <span style={{ fontSize: '14px', color: theme.text }}>編集モード</span>

        <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
          <input
            type="checkbox"
            checked={isEditing}
            onChange={(e) => onEditingChange(e.target.checked)}
            style={{ opacity: 0, width: 0, height: 0 }}
          />
          <span
            style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: isEditing ? theme.accent : '#ccc',
              borderRadius: '24px',
              transition: '0.2s',
            }}
          >
            <span
              style={{
                position: 'absolute',
                height: '18px',
                width: '18px',
                left: isEditing ? '23px' : '3px',
                bottom: '3px',
                backgroundColor: '#fff',
                borderRadius: '50%',
                transition: '0.2s',
                boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
              }}
            />
          </span>
        </label>

        <span style={{ fontSize: '13px', color: theme.text }}>
          {isEditing ? 'ON' : 'OFF'}
        </span>
      </div>
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
                <p className="robot-dashboard__panel-hint">
                  台数を直接入力しても変更できます（最大 {MAX_CAMERAS} 台）
                  {isMobile && '。モバイルではこの台数分のタブが表示に追加されます'}
                </p>
              </section>

              {/* モバイルは常に1台表示のため、全カメラ一括のサイズ変更は不要 */}
              {!isMobile && (
                <section className="robot-dashboard__panel-section">
                  <h3>カメラサイズ（全カメラ一括）</h3>
                  <div className="robot-dashboard__toolbar-row">
                    <button type="button" onClick={() => resizeCameras(-20)}>
                      −
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="robot-dashboard__size-input"
                      placeholder="px"
                      defaultValue=""
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur()
                        }
                      }}
                      onBlur={e => {
                        applyBulkSize(e.target.value)
                        e.target.value = ''
                      }}
                    />
                    <button type="button" onClick={() => resizeCameras(20)}>
                      ＋
                    </button>
                  </div>
                  <p className="robot-dashboard__panel-hint">
                    入力欄に数値（{MIN_SIZE}〜{MAX_CAMERA_SIZE}）を入れて確定すると全カメラのサイズを一括指定できます。カメラ枠の右下角をドラッグしても個別にサイズ変更できます
                  </p>
                </section>
              )}

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
                        <span>サイズ（px）</span>
                        <div className="robot-dashboard__toolbar-row">
                          <button
                            type="button"
                            onClick={() => resizeSingleCamera(cam.id, -20)}
                            disabled={cam.size <= MIN_SIZE}
                          >
                            −
                          </button>
                          <input
                            key={Math.round(cam.size)}
                            type="text"
                            inputMode="numeric"
                            className="robot-dashboard__size-input"
                            defaultValue={Math.round(cam.size)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.currentTarget.blur()
                              }
                            }}
                            onBlur={e => applySingleSize(cam.id, e.target.value)}
                          />
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

              <p className="robot-dashboard__panel-hint">
                {isMobile ? '表示中のカメラは上部タブか横スクロールで切り替えられます' : 'ドラッグでカメラの位置を変更できます'}
              </p>
            </div>
          </div>
        )}
      </div>
    </PanelFrame>
  )
}