// components/common/PlcConnectionIcon.tsx
interface PlcConnectionIconProps {
  connected: boolean
  size?: number
}

export default function PlcConnectionIcon({ connected, size = 18 }: PlcConnectionIconProps) {
  const color = connected ? '#4ade80' : '#ff4d4f'
  return (
    <span
      className={`plc-connection-icon${connected ? '' : ' plc-connection-icon--disconnected'}`}
      title={connected ? 'PLC接続中' : 'PLC未接続（3分以上応答なし）'}
      style={{ color, display: 'inline-flex', alignItems: 'center' }}
    >
      {connected ? (
        // 接続中：プラグが繋がった1本の状態
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M5 7h14v3a7 7 0 0 1-14 0V7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : (
        // 未接続：プラグが2つに分かれ、矢印が外向きに離れていく状態
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M3 8h6v4a3 3 0 0 1-6 0V8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M4.5 5.5v3M8 5.5v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M15 8h6v4a3 3 0 0 1-6 0V8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M16.5 5.5v3M20 5.5v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M9.5 10h1M9 8.5 7.3 10 9 11.5M14.5 10h-1M15 8.5l1.7 1.5-1.7 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}