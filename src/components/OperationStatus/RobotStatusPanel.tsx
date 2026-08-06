interface Props {
  data: {
    speed: number
    torque: number
  }
}

export default function RobotStatusPanel({ data }: Props) {
  return (
    <div className="robot-status">
      <div className="robot-status__item">
        <span className="robot-status__label">速度</span>
        <span className="robot-status__value robot-status__value--speed">
          {data.speed}
          <span className="robot-status__unit">mm/s</span>
        </span>
      </div>
      <div className="robot-status__item">
        <span className="robot-status__label">トルク</span>
        <span className="robot-status__value robot-status__value--torque">
          {data.torque}
          <span className="robot-status__unit">%</span>
        </span>
      </div>
    </div>
  )
}
