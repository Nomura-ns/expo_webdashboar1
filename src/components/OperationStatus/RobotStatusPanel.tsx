// RobotStatusPanel.tsx
interface MotorStat {
  speed: number
  torque: number
}

interface Props {
  prefix: string
  motors: MotorStat[]
}

export default function RobotStatusPanel({ prefix, motors }: Props) {
  if (!motors || motors.length === 0) {
    return <div className="robot-status-table__empty">データ取得中...</div>
  }

  return (
    <table className="robot-status-table">
      <thead>
        <tr>
          <th>モータ</th>
          <th>速度</th>
          <th>トルク</th>
        </tr>
      </thead>
      <tbody>
        {motors.map((m, i) => (
          <tr key={i}>
            <td className="robot-status-table__label">
              {prefix}-{i + 1}
            </td>
            <td className="robot-status-table__value robot-status-table__value--speed">
              {m.speed}
              <span className="robot-status-table__unit">mm/s</span>
            </td>
            <td className="robot-status-table__value robot-status-table__value--torque">
              {m.torque}
              <span className="robot-status-table__unit">%</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}