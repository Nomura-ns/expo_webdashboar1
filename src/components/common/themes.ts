import type { ThemeKey, Theme, ThemeMode  } from '../../types'

// =============================================
// テーマ定義
// =============================================

export const THEMES: Record<ThemeKey, Theme> = {
  'dark-exhibition': { label: ' 🚀展示会', bg: '#000000', surface: '#0e0f14', border: '#3f6a94', text: '#dbeafe', subtext: '#93c5fd', accent: '#60a5fa', headerBg: '#0e0f14', logo: '/ns_slitter_silver.png' }, 
  'dark-blue':   { label: '🌙 ダーク青', bg: '#1a1d3a', surface: '#23274f', border: '#245d9b', text: '#f1f5f9', subtext: '#94a3b8', accent: '#38bdf8', headerBg: '#23274f', logo: '/ns_slitter_silver.png' },
  'dark-red':    { label: '🌙 ダーク赤', bg: '#200f0f', surface: '#2d1515', border: '#5c2a2a', text: '#fef2f2', subtext: '#fca5a5', accent: '#f87171', headerBg: '#2d1515', logo: '/ns_slitter_silver.png' },
  'dark-green':  { label: '🌙 ダーク緑', bg: '#0a1a0f', surface: '#152d1e', border: '#1f4a30', text: '#f0fdf4', subtext: '#86efac', accent: '#34d399', headerBg: '#152d1e', logo: '/ns_slitter_silver.png' },
  'light-blue':  { label: '☀️ ライト青', bg: '#eff6ff', surface: '#ffffff', border: '#bfdbfe', text: '#1e3a5f', subtext: '#3b82f6', accent: '#2563eb', headerBg: '#dbeafe', logo: '/image001.png' },
  'light-red':   { label: '☀️ ライト赤', bg: '#fff1f2', surface: '#ffffff', border: '#fecdd3', text: '#4c0519', subtext: '#f43f5e', accent: '#e11d48', headerBg: '#ffe4e6', logo: '/image001.png' },
  'light-green': { label: '☀️ ライト緑', bg: '#f0fdf4', surface: '#ffffff', border: '#bbf7d0', text: '#14532d', subtext: '#16a34a', accent: '#15803d', headerBg: '#dcfce7', logo: '/image001.png' },
}

export const PAGES = [
  { key: 'dashboard' as const, label: 'MONITOR' },
  { key: 'control' as const, label: 'ROBOT PERFORMANCE' },
  { key: 'anomaly' as const, label: 'ROBOT STATUS' },
  { key: 'quiz' as const, label: 'NAME PANEL' },
]

export function getThemeMode(themeKey: ThemeKey): ThemeMode {
  return themeKey.startsWith('dark') ? 'dark' : 'light'
}