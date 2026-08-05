import PanelFrame from '../common/PanelFrame'
import type { Theme } from '../../types'

import RobotTrendChart from './RobotTrendChart'
import CycleBarChart from './CycleBarChart'
import LoadPieChart from './LoadPieChart'

import './OperationStatus.css'

interface TrendPoint {
  time: string
  speed: number
  torque: number
}

interface CycleData {
  job: string
  cycle: number
}

interface PieData {
  name: string
  value: number
}

interface OperationStatusProps {
  theme: Theme

  robotA: TrendPoint[]
  robotB: TrendPoint[]

  cycle: CycleData[]

  loadA: PieData[]
  loadB: PieData[]
}

export default function OperationStatus({
  theme,
  robotA,
  robotB,
  cycle,
  loadA,
  loadB,
}: OperationStatusProps) {

  return (

    <PanelFrame
      index="03"
      title="稼働状況"
      subtitle="Robot Status"
      className={`op-status op-status--${theme}`}
    >
      <div className="op-status__layout">
        {/* ロボットA/B */}
        <div className="op-status__row">
          <div className="op-status__card">
            <div className="op-status__title">
              ロボットA 速度・トルク
            </div>
            <RobotTrendChart data={robotA} />
          </div>
          <div className="op-status__card">
            <div className="op-status__title">
              ロボットB 速度・トルク
            </div>
            <RobotTrendChart data={robotB} />
          </div>
        </div>
        {/* サイクルタイム */}
        <div className="op-status__full">
          <div className="op-status__title">
            ジョブ別サイクルタイム
          </div>
          <CycleBarChart data={cycle} />
        </div>
        {/* 負荷割合 */}
        <div className="op-status__row">
          <div className="op-status__card">
            <div className="op-status__title">
              ロボットA 負荷割合
            </div>
            <LoadPieChart data={loadA} />
          </div>
          <div className="op-status__card">
            <div className="op-status__title">
              ロボットB 負荷割合
            </div>
            <LoadPieChart data={loadB} />
          </div>
        </div>
      </div>
    </PanelFrame>
  )
}