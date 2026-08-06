import PanelFrame from '../common/PanelFrame'
import type { Theme } from '../../types'

import RobotStatusPanel from './RobotStatusPanel'
import CycleTimeDisplay from './CycleTimeDisplay'
import LoadPieChart from './LoadPieChart'

import './OperationStatus.css'

interface RobotStat {
  speed: number
  torque: number
}

interface PieData {
  name: string
  value: number
}

interface OperationStatusProps {
  theme: Theme

  robotA: RobotStat
  robotB: RobotStat

  // ロボットA・Bを合算した1つのサイクルタイム（秒）
  cycleTime: number

  loadA: PieData[]
  loadB: PieData[]
}

export default function OperationStatus({
  theme,
  robotA,
  robotB,
  cycleTime,
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
            <RobotStatusPanel data={robotA} />
          </div>
          <div className="op-status__card">
            <div className="op-status__title">
              ロボットB 速度・トルク
            </div>
            <RobotStatusPanel data={robotB} />
          </div>
        </div>
        {/* サイクルタイム（A・B合算） */}
        <div className="op-status__full">
          <div className="op-status__title">
            サイクルタイム（A・B合算）
          </div>
          <CycleTimeDisplay seconds={cycleTime} />
        </div>
        {/* 稼働時間内訳 */}
        <div className="op-status__row">
          <div className="op-status__card">
            <div className="op-status__title">
              ロボットA 稼働時間内訳
            </div>
            <LoadPieChart data={loadA} />
          </div>
          <div className="op-status__card">
            <div className="op-status__title">
              ロボットB 稼働時間内訳
            </div>
            <LoadPieChart data={loadB} />
          </div>
        </div>
      </div>
    </PanelFrame>
  )
}
