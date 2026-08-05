import type {
  MachineInfo,
  CycleTimePoint,
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
