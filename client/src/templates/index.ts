// Signage Display Templates
// Pre-built, beautiful templates for quick data display
// Push structured data, get beautiful output instantly

export { TaskCompleteTemplate } from './TaskCompleteTemplate'
export { AlertTemplate } from './AlertTemplate'
export { MetricsTemplate } from './MetricsTemplate'
export { AnnouncementTemplate } from './AnnouncementTemplate'
export { DailyDigestTemplate } from './DailyDigestTemplate'

// Template registry for dynamic loading
export const templates = {
  'task-complete': () => import('./TaskCompleteTemplate').then(m => m.TaskCompleteTemplate),
  'alert': () => import('./AlertTemplate').then(m => m.AlertTemplate),
  'metrics': () => import('./MetricsTemplate').then(m => m.MetricsTemplate),
  'announcement': () => import('./AnnouncementTemplate').then(m => m.AnnouncementTemplate),
  'daily-digest': () => import('./DailyDigestTemplate').then(m => m.DailyDigestTemplate),
} as const

export type TemplateName = keyof typeof templates

// Template data types
export interface TaskCompleteData {
  title: string
  agent: string
  agentEmoji?: string
  duration?: string
  highlights?: string[]
  status: 'success' | 'warning' | 'error'
  timestamp?: string
}

export interface AlertData {
  level: 'info' | 'success' | 'warning' | 'critical'
  title: string
  message: string
  source?: string
  timestamp?: string
  action?: string
}

export interface MetricsData {
  title: string
  subtitle?: string
  metrics: Array<{
    label: string
    value: string | number
    change?: string
    changeType?: 'up' | 'down' | 'neutral'
    icon?: string
  }>
  columns?: 2 | 3 | 4
  timestamp?: string
}

export interface AnnouncementData {
  title: string
  message: string
  icon?: string
  style?: 'default' | 'celebration' | 'urgent' | 'info'
  footer?: string
}

export interface DailyDigestData {
  date: string
  summary: string
  items: Array<{
    agent: string
    task: string
    status: 'done' | 'in-progress' | 'blocked'
    time?: string
  }>
  stats?: {
    completed: number
    inProgress: number
    blocked: number
  }
}

export type TemplateData = 
  | { template: 'task-complete', data: TaskCompleteData }
  | { template: 'alert', data: AlertData }
  | { template: 'metrics', data: MetricsData }
  | { template: 'announcement', data: AnnouncementData }
  | { template: 'daily-digest', data: DailyDigestData }
