import type { MachineStatus } from '../../types'
import './StatusPill.css'


export default function StatusPill({ status }: { status: MachineStatus }) {
  return (
    <span className={`status-pill status-pill--${status}`}>
      <span className="status-pill__dot" />
  
    </span>
  )
}
