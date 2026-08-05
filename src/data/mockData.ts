import type {
  MachineInfo,
  JobSeries,
  OperationMetric,
  CycleTimePoint,
  NameplateQuestion,
  QuizStats,
} from '../types'

export const machineInfo: MachineInfo = {
  id: 'MC-0417',
  name: 'CNC加工機 #4',
  imageUrl:
    'https://images.unsplash.com/photo-1565087077078-a9a51e5e0a5e?q=80&w=1200&auto=format&fit=crop',
  status: '動作1',
  location: '第2工場 / ラインB',
}

export const jobSeries: JobSeries[] = [
  {
    jobName: '穴あけ加工',
    color: 'var(--accent-cyan)',
    data: [
      { date: '07/21', count: 128 },
      { date: '07/22', count: 141 },
      { date: '07/23', count: 119 },
      { date: '07/24', count: 156 },
      { date: '07/25', count: 132 },
      { date: '07/26', count: 98 },
      { date: '07/27', count: 87 },
    ],
  },
  {
    jobName: '研磨仕上げ',
    color: 'var(--accent-amber)',
    data: [
      { date: '07/21', count: 74 },
      { date: '07/22', count: 81 },
      { date: '07/23', count: 69 },
      { date: '07/24', count: 92 },
      { date: '07/25', count: 88 },
      { date: '07/26', count: 61 },
      { date: '07/27', count: 54 },
    ],
  },
  {
    jobName: '検査',
    color: 'var(--accent-green)',
    data: [
      { date: '07/21', count: 205 },
      { date: '07/22', count: 219 },
      { date: '07/23', count: 188 },
      { date: '07/24', count: 240 },
      { date: '07/25', count: 221 },
      { date: '07/26', count: 152 },
      { date: '07/27', count: 133 },
    ],
  },
]

export const operationMetrics: OperationMetric[] = [
  {
    key: 'speed',
    label: '主軸速度',
    unit: 'rpm',
    value: 8420,
    min: 0,
    max: 12000,
    nominal: 8500,
    status: '動作1',
  },
  {
    key: 'torque',
    label: 'トルク',
    unit: 'N·m',
    value: 41.2,
    min: 0,
    max: 60,
    nominal: 42,
    status: '動作1',
  },
  {
    key: 'feed',
    label: '送り速度',
    unit: 'mm/min',
    value: 310,
    min: 0,
    max: 500,
    nominal: 320,
    status: '動作1',
  },
  {
    key: 'temp',
    label: '主軸温度',
    unit: '℃',
    value: 58.4,
    min: 0,
    max: 80,
    nominal: 55,
    status: '動作2',
  },
]

export const cycleTimeHistory: CycleTimePoint[] = [
  { cycle: 1, seconds: 42.1 },
  { cycle: 2, seconds: 41.8 },
  { cycle: 3, seconds: 43.6 },
  { cycle: 4, seconds: 42.9 },
  { cycle: 5, seconds: 44.8 },
  { cycle: 6, seconds: 42.3 },
  { cycle: 7, seconds: 41.5 },
  { cycle: 8, seconds: 42.0 },
  { cycle: 9, seconds: 45.2 },
  { cycle: 10, seconds: 42.7 },
  { cycle: 11, seconds: 41.9 },
  { cycle: 12, seconds: 42.4 },
]

export const nameplateQuestions: NameplateQuestion[] = [
  {
    id: 'q1',
    iconUrl:
      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=400&auto=format&fit=crop',
    question: 'このアイコンが示す銘板項目はどれ？',
    choices: ['定格電圧', '製造番号', '許容荷重', '設置年月'],
    correctIndex: 1,
  },
  {
    id: 'q2',
    iconUrl:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=400&auto=format&fit=crop',
    question: 'このマークの意味は？',
    choices: ['防爆構造', '要接地', '禁油厳禁', '回転方向注意'],
    correctIndex: 3,
  },
]

export const quizStats: QuizStats = {
  totalAnswered: 184,
  totalCorrect: 151,
  streak: 6,
  history: [
    { label: '第1週', correctRate: 71 },
    { label: '第2週', correctRate: 76 },
    { label: '第3週', correctRate: 79 },
    { label: '第4週', correctRate: 82 },
  ],
}
