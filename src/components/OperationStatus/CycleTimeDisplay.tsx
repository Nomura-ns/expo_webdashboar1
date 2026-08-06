interface Props {
  seconds: number
}

export default function CycleTimeDisplay({ seconds }: Props) {
  return (
    <div className="cycle-time">
      <span className="cycle-time__value">{seconds.toFixed(1)}</span>
      <span className="cycle-time__unit">秒 / サイクル</span>
    </div>
  )
}
