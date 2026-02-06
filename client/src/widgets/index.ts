// Widget Registry
export { CameraWidget } from './CameraWidget'
export { CameraGridWidget } from './CameraGridWidget'
export { ClockWidget } from './ClockWidget'
export { WeatherWidget } from './WeatherWidget'
export { StatsWidget } from './StatsWidget'
export { OccupancyWidget } from './OccupancyWidget'
export { IframeWidget } from './IframeWidget'
export { LayoutWidget } from './LayoutWidget'
export { PlaylistWidget } from './PlaylistWidget'
export { AlertBannerWidget } from './AlertBannerWidget'
export { OperationsDashboardWidget } from './OperationsDashboardWidget'
export { TeamActivityWidget } from './TeamActivityWidget'
export { TestCardWidget } from './TestCardWidget'
export { YoungsMenuWidget } from './YoungsMenuWidget'
export { TemplateWidget } from './TemplateWidget'
export { SecurityAlertWidget } from './SecurityAlertWidget'
export { RevenueWidget } from './RevenueWidget'
export { MascotWidget } from './MascotWidget'

// Re-export templates
export * from '../templates'

export interface WidgetConfig {
  [key: string]: any
}
