import type { RobotId } from '../types'

export interface JobDefinition {
  id: string
  jobName: string
  shortName: string
  robot: RobotId
  phase: 'setting' | 'extraction'
  steps: number[] // 元手順書のステップ番号（参考用）
  color: string
}

export const JOB_DEFINITIONS: JobDefinition[] = [
  { id: 'pick-store',   jobName: '刃物ピック・格納',       shortName: 'ピック/格納', robot: 'A', phase: 'setting',    steps: [1, 6, 7, 22],      color: '#4dd0e1' },
  { id: 'insert-fit',   jobName: '挿入・勘合',             shortName: '挿入・勘合',        robot: 'A', phase: 'setting',    steps: [2],                color: '#29b6f6' },
  { id: 'position',     jobName: '撮影・位置決め',         shortName: '位置決め',    robot: 'A', phase: 'setting',    steps: [3, 4],             color: '#42a5f5' },
  { id: 'screw-tighten',jobName: 'ネジ締め・ツール準備',   shortName: 'ネジ締め',    robot: 'B', phase: 'setting',    steps: [5, 19],            color: '#ffb74d' },
  { id: 'screw-loosen', jobName: 'ネジ緩め',               shortName: 'ネジ緩め',    robot: 'B', phase: 'extraction', steps: [8],                color: '#ff8a65' },
  { id: 'inspect',      jobName: '検査台移動・検査',       shortName: '検査',        robot: 'A', phase: 'extraction', steps: [9, 10],            color: '#66bb6a' },
  { id: 'sort',         jobName: 'OK/NG仕分け',            shortName: '仕分け',      robot: 'A', phase: 'extraction', steps: [11],               color: '#9ccc65' },
  { id: 'lid',          jobName: '蓋開閉',                 shortName: '蓋開閉',      robot: 'B', phase: 'extraction', steps: [12, 18],           color: '#ef5350' },
  { id: 'exchange',     jobName: '吸着交換作業',           shortName: '刃交換',      robot: 'A', phase: 'extraction', steps: [14, 15, 16, 17],   color: '#ab47bc' },
  { id: 'ring-spring',  jobName: 'リングスプリング着脱',   shortName: 'リング着脱',  robot: 'A', phase: 'extraction', steps: [13, 20, 21],       color: '#26a69a' },
]

export const JOB_MAP: Record<string, JobDefinition> = Object.fromEntries(
  JOB_DEFINITIONS.map((j) => [j.id, j])
)