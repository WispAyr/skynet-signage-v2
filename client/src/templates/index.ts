// Signage Display Templates
// Pre-built, beautiful templates for quick data display
// Push structured data, get beautiful output instantly

export { TaskCompleteTemplate } from './TaskCompleteTemplate'
export { AlertTemplate } from './AlertTemplate'
export { MetricsTemplate } from './MetricsTemplate'
export { AnnouncementTemplate } from './AnnouncementTemplate'
export { DailyDigestTemplate } from './DailyDigestTemplate'
export { WelcomeDisplayTemplate } from './WelcomeDisplayTemplate'
export { ParkingRatesTemplate } from './ParkingRatesTemplate'
export { MultiZoneTemplate } from './MultiZoneTemplate'
export { AnnouncementRotatorTemplate } from './AnnouncementRotatorTemplate'

// Template registry for dynamic loading
export const templates = {
  'task-complete': () => import('./TaskCompleteTemplate').then(m => m.TaskCompleteTemplate),
  'alert': () => import('./AlertTemplate').then(m => m.AlertTemplate),
  'metrics': () => import('./MetricsTemplate').then(m => m.MetricsTemplate),
  'announcement': () => import('./AnnouncementTemplate').then(m => m.AnnouncementTemplate),
  'daily-digest': () => import('./DailyDigestTemplate').then(m => m.DailyDigestTemplate),
  'welcome-display': () => import('./WelcomeDisplayTemplate').then(m => m.WelcomeDisplayTemplate),
  'parking-rates': () => import('./ParkingRatesTemplate').then(m => m.ParkingRatesTemplate),
  'multi-zone': () => import('./MultiZoneTemplate').then(m => m.MultiZoneTemplate),
  'announcement-rotator': () => import('./AnnouncementRotatorTemplate').then(m => m.AnnouncementRotatorTemplate),
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

export interface WelcomeDisplayData {
  siteName: string
  greeting?: string
  subtitle?: string
  weatherLocation?: string
  showClock?: boolean
  showWeather?: boolean
  notices?: string[]
  brandColor?: string
  backgroundImage?: string
}

export interface ParkingRatesData {
  siteName: string
  subtitle?: string
  rates: Array<{ label: string; price: string; highlight?: boolean; note?: string }>
  notices?: string[]
  paymentMethods?: string[]
  maxStay?: string
  brandColor?: string
  showClock?: boolean
}

export interface MultiZoneData {
  mainContent: {
    type: 'image' | 'video' | 'html' | 'text'
    url?: string
    html?: string
    title?: string
    body?: string
    items?: Array<{ type: string; url?: string; title?: string; body?: string }>
    rotateInterval?: number
  }
  sidebar?: {
    showClock?: boolean
    showWeather?: boolean
    weatherLocation?: string
    showLogo?: boolean
    logoUrl?: string
    customItems?: Array<{ label: string; value: string }>
  }
  ticker?: {
    messages: string[]
    speed?: number
    backgroundColor?: string
  }
  brandColor?: string
  sidebarWidth?: string
  tickerHeight?: string
}

export interface AnnouncementRotatorData {
  title?: string
  announcements: Array<{
    title: string
    message: string
    icon?: string
    color?: string
    priority?: 'normal' | 'high' | 'urgent'
    footer?: string
  }>
  rotateInterval?: number
  brandColor?: string
  showClock?: boolean
  showProgress?: boolean
  transition?: 'fade' | 'slide'
}

export type TemplateData = 
  | { template: 'task-complete', data: TaskCompleteData }
  | { template: 'alert', data: AlertData }
  | { template: 'metrics', data: MetricsData }
  | { template: 'announcement', data: AnnouncementData }
  | { template: 'daily-digest', data: DailyDigestData }
  | { template: 'welcome-display', data: WelcomeDisplayData }
  | { template: 'parking-rates', data: ParkingRatesData }
  | { template: 'multi-zone', data: MultiZoneData }
  | { template: 'announcement-rotator', data: AnnouncementRotatorData }
