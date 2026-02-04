import { ClockWidget } from './ClockWidget'
import { CameraWidget } from './CameraWidget'
import { CameraGridWidget } from './CameraGridWidget'
import { WeatherWidget } from './WeatherWidget'
import { StatsWidget } from './StatsWidget'
import { OccupancyWidget } from './OccupancyWidget'
import { IframeWidget } from './IframeWidget'
import { OperationsDashboardWidget } from './OperationsDashboardWidget'
import { TeamActivityWidget } from './TeamActivityWidget'
import { AlertBannerWidget } from './AlertBannerWidget'

interface LayoutConfig {
  layout: 'split-h' | 'split-v' | 'grid-2x2' | 'sidebar-left' | 'sidebar-right' | 'pip' | 'control-room' | 'dashboard-cameras'
  panels: PanelConfig[]
}

interface PanelConfig {
  widget: string
  config?: any
  size?: number // Flex ratio
}

export function LayoutWidget({ config }: { config: LayoutConfig }) {
  const { layout, panels } = config
  
  const getLayoutClass = () => {
    switch (layout) {
      case 'split-h': return 'flex flex-row'
      case 'split-v': return 'flex flex-col'
      case 'grid-2x2': return 'grid grid-cols-2 grid-rows-2'
      case 'sidebar-left': return 'flex flex-row'
      case 'sidebar-right': return 'flex flex-row'
      case 'pip': return 'relative'
      case 'control-room': return 'grid grid-cols-3 grid-rows-2'
      case 'dashboard-cameras': return 'flex flex-row'
      default: return 'flex flex-row'
    }
  }
  
  const getPanelStyle = (index: number, panel: PanelConfig) => {
    if (layout === 'pip') {
      if (index === 0) return { position: 'absolute' as const, inset: 0 }
      return { 
        position: 'absolute' as const, 
        bottom: 20, 
        right: 20, 
        width: '30%', 
        height: '30%',
        zIndex: 10,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }
    }
    
    if (layout === 'control-room') {
      // First panel (operations dashboard) spans 2 rows on the left
      if (index === 0) {
        return { gridColumn: '1', gridRow: '1 / 3' }
      }
      // Camera panels fill the remaining 2x2 grid
      return {}
    }
    
    if (layout === 'dashboard-cameras') {
      // Dashboard takes 40% on left, cameras take 60% on right
      if (index === 0) {
        return { width: '40%', flexShrink: 0 }
      }
      return { flex: 1 }
    }
    
    if (layout === 'sidebar-left' && index === 0) {
      return { width: panel.size || 300, flexShrink: 0 }
    }
    if (layout === 'sidebar-right' && index === panels.length - 1) {
      return { width: panel.size || 300, flexShrink: 0 }
    }
    
    return { flex: panel.size || 1 }
  }

  return (
    <div className={`w-full h-full ${getLayoutClass()}`}>
      {panels.map((panel, i) => (
        <div 
          key={i} 
          className="overflow-hidden bg-dark-900"
          style={getPanelStyle(i, panel)}
        >
          <PanelRenderer widget={panel.widget} config={panel.config || {}} />
        </div>
      ))}
    </div>
  )
}

function PanelRenderer({ widget, config }: { widget: string; config: any }) {
  switch (widget) {
    case 'clock': return <ClockWidget config={config} />
    case 'weather': return <WeatherWidget config={config} />
    case 'camera': return <CameraWidget config={config} />
    case 'camera-grid': return <CameraGridWidget config={config} />
    case 'stats': return <StatsWidget config={config} />
    case 'occupancy': return <OccupancyWidget config={config} />
    case 'iframe': return <IframeWidget config={config} />
    case 'operations-dashboard': return <OperationsDashboardWidget config={config} />
    case 'team-activity': return <TeamActivityWidget config={config} />
    case 'alert': return <AlertBannerWidget config={config} />
    // Recursive layout support
    case 'layout': return <LayoutWidget config={config} />
    default: return <div className="flex items-center justify-center h-full text-gray-500">Unknown: {widget}</div>
  }
}
