import { useIsMobile } from '../../hooks/useMediaQuery' 
import type { Theme, ThemeKey } from '../../types'
import { THEMES } from './themes'

type Props = {
  theme: Theme
  themeKey: ThemeKey
  intervalSec: number
  isPlaying: boolean
  isEditing: boolean
  onThemeChange: (key: ThemeKey) => void
  onIntervalChange: (value: number) => void
  onPlayingChange: (value: boolean) => void
  onEditingChange: (value: boolean) => void
}

export default function SettingsPanel({
  theme, themeKey, isEditing,
  onThemeChange, onEditingChange,
}: Props) {
  const isMobile = useIsMobile() 

  return (
    <div style={{
      position: 'fixed', top: '57px', zIndex: 100,
      background: theme.surface, border: `1px solid ${theme.border}`,
      borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      display: 'flex', flexDirection: 'column', gap: '14px',
      ...(isMobile ? {
        left: '8px', right: '8px', padding: '16px',
      } : {
        right: '16px', padding: '20px 24px', minWidth: '420px',
      }),
    }}>
      <p style={{ fontSize: '20px', fontWeight: 'bold', color: theme.accent, margin: 0 }}>設定</p>

      {/* 編集モード切替スイッチ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '8px' : '16px' }}>
        <span style={{ width: '80px', fontSize: '16px', color: theme.text }}>編集モード</span>
        <label
          style={{
            position: 'relative',
            display: 'inline-block',
            width: '44px',
            height: '24px',
            flexShrink: 0,
          }}
        >
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
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
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


      {/* テーマ */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? '8px' : '16px' }}>
        <span style={{ width: '80px', fontSize: '13px', color: theme.text, paddingTop: '4px' }}>テーマ</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {(Object.keys(THEMES) as ThemeKey[]).map(key => (
            <button key={key} onClick={() => onThemeChange(key)} style={{
              padding: '4px 12px', borderRadius: '6px', fontSize: '12px',
              border: `1px solid ${themeKey === key ? theme.accent : theme.border}`,
              background: themeKey === key ? `${theme.accent}22` : 'transparent',
              color: theme.text, cursor: 'pointer',
              fontWeight: themeKey === key ? 'bold' : 'normal',
            }}>
              {THEMES[key].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}