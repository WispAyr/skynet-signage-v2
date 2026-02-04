import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { 
  Car, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  ArrowUp,
  ArrowDown,
  Shield,
  Server,
  RefreshCw,
  ParkingCircle,
  Camera,
  Volume2,
  VolumeX,
  TrendingUp
} from 'lucide-react'

// Mini Activity Chart Component - displays hourly movement trends
interface HourlyData {
  hour: number
  count: number
}

interface MiniActivityChartProps {
  data: HourlyData[]
  label?: string
  color?: string
  height?: number
}

function MiniActivityChart({ 
  data, 
  label = 'Hourly Activity', 
  color = '#06b6d4', // cyan accent
  height = 60 
}: MiniActivityChartProps) {
  // Get current hour for highlighting
  const currentHour = new Date().getHours()
  
  // Normalize data: fill in missing hours and sort
  const normalizedData = useMemo(() => {
    // Create a map of existing data
    const dataMap = new Map(data.map(d => [d.hour, d.count]))
    
    // Generate all 24 hours, filling gaps with 0
    const fullData: HourlyData[] = []
    for (let h = 0; h < 24; h++) {
      fullData.push({ hour: h, count: dataMap.get(h) || 0 })
    }
    
    // Show last 12 hours ending at current hour
    const startHour = (currentHour - 11 + 24) % 24
    const reorderedData: HourlyData[] = []
    for (let i = 0; i < 12; i++) {
      const h = (startHour + i) % 24
      reorderedData.push(fullData[h])
    }
    
    return reorderedData
  }, [data, currentHour])
  
  // Calculate max for scaling
  const maxCount = Math.max(...normalizedData.map(d => d.count), 1)
  
  // Calculate total for the period shown
  const totalMovements = normalizedData.reduce((sum, d) => sum + d.count, 0)
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <TrendingUp className="w-3 h-3" />
          <span>{label}</span>
        </div>
        <span className="text-xs text-gray-500">
          {totalMovements} movements (12h)
        </span>
      </div>
      
      <div 
        className="flex items-end gap-[2px] rounded-lg bg-dark-700/50 p-2"
        style={{ height }}
      >
        {normalizedData.map((item, idx) => {
          const barHeight = maxCount > 0 ? (item.count / maxCount) * 100 : 0
          const isCurrentHour = item.hour === currentHour
          
          return (
            <div
              key={item.hour}
              className="flex-1 flex flex-col items-center justify-end h-full group relative"
            >
              {/* Bar */}
              <div
                className="w-full rounded-t transition-all duration-300 hover:opacity-80"
                style={{
                  height: `${Math.max(barHeight, 2)}%`,
                  backgroundColor: isCurrentHour ? '#22d3ee' : color,
                  opacity: isCurrentHour ? 1 : 0.7,
                  boxShadow: isCurrentHour ? '0 0 8px #22d3ee60' : 'none'
                }}
              />
              
              {/* Tooltip on hover */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                <div className="bg-dark-600 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap">
                  {String(item.hour).padStart(2, '0')}:00 - {item.count} movements
                </div>
              </div>
              
              {/* Hour label (show every 3rd hour) */}
              {idx % 3 === 0 && (
                <div className="text-[9px] text-gray-500 mt-1">
                  {String(item.hour).padStart(2, '0')}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Aggregated chart for all sites combined
interface AggregatedActivityChartProps {
  sites: SiteData[]
  height?: number
}

function AggregatedActivityChart({ sites, height = 80 }: AggregatedActivityChartProps) {
  const currentHour = new Date().getHours()
  
  // Aggregate hourly data from all sites
  const aggregatedData = useMemo(() => {
    const hourlyTotals = new Map<number, number>()
    
    sites.forEach(site => {
      site.stats.hourlyActivity.forEach(({ hour, count }) => {
        hourlyTotals.set(hour, (hourlyTotals.get(hour) || 0) + count)
      })
    })
    
    // Create full 24-hour data
    const fullData: HourlyData[] = []
    for (let h = 0; h < 24; h++) {
      fullData.push({ hour: h, count: hourlyTotals.get(h) || 0 })
    }
    
    // Show last 12 hours
    const startHour = (currentHour - 11 + 24) % 24
    const reorderedData: HourlyData[] = []
    for (let i = 0; i < 12; i++) {
      const h = (startHour + i) % 24
      reorderedData.push(fullData[h])
    }
    
    return reorderedData
  }, [sites, currentHour])
  
  const maxCount = Math.max(...aggregatedData.map(d => d.count), 1)
  const totalMovements = aggregatedData.reduce((sum, d) => sum + d.count, 0)
  const avgPerHour = Math.round(totalMovements / 12)
  
  // Find peak hour
  const peakHour = aggregatedData.reduce((peak, curr) => 
    curr.count > peak.count ? curr : peak
  , aggregatedData[0])
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <TrendingUp className="w-4 h-4 text-cyan-400" />
          <span className="font-medium">Activity Trends (12h)</span>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{totalMovements} total</span>
          <span>~{avgPerHour}/hr avg</span>
        </div>
      </div>
      
      <div 
        className="flex items-end gap-1 rounded-xl bg-dark-700/30 p-3"
        style={{ height }}
      >
        {aggregatedData.map((item, idx) => {
          const barHeight = maxCount > 0 ? (item.count / maxCount) * 100 : 0
          const isCurrentHour = item.hour === currentHour
          const isPeakHour = item.hour === peakHour.hour && item.count > 0
          
          // Color gradient based on activity level
          const intensity = maxCount > 0 ? item.count / maxCount : 0
          const barColor = isCurrentHour 
            ? '#22d3ee'  // cyan for current
            : isPeakHour
            ? '#fbbf24'  // amber for peak
            : `rgba(6, 182, 212, ${0.4 + intensity * 0.6})` // cyan with intensity
          
          return (
            <div
              key={item.hour}
              className="flex-1 flex flex-col items-center justify-end h-full group relative"
            >
              {/* Bar */}
              <div
                className="w-full rounded-t-sm transition-all duration-300"
                style={{
                  height: `${Math.max(barHeight, 3)}%`,
                  backgroundColor: barColor,
                  boxShadow: isCurrentHour 
                    ? '0 0 10px #22d3ee60' 
                    : isPeakHour
                    ? '0 0 8px #fbbf2440'
                    : 'none'
                }}
              />
              
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                <div className="bg-dark-600 text-white text-xs px-2 py-1.5 rounded-lg shadow-lg whitespace-nowrap border border-dark-500">
                  <div className="font-medium">{String(item.hour).padStart(2, '0')}:00</div>
                  <div className="text-gray-400">{item.count} movements</div>
                  {isPeakHour && <div className="text-amber-400">⚡ Peak hour</div>}
                </div>
              </div>
              
              {/* Hour labels */}
              {idx % 2 === 0 && (
                <div className={`text-[10px] mt-1 ${isCurrentHour ? 'text-cyan-400 font-medium' : 'text-gray-500'}`}>
                  {String(item.hour).padStart(2, '0')}
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-cyan-400" />
          <span>Current</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-sm bg-amber-400" />
          <span>Peak</span>
        </div>
      </div>
    </div>
  )
}

// Built-in alert sound types
type AlertSoundType = 'chime' | 'alert' | 'urgent' | 'bell' | 'none' | 'custom'

interface AlertSoundConfig {
  enabled?: boolean           // Enable/disable alert sounds (default: true)
  threshold?: number          // Queue count threshold to trigger alert (default: 3)
  soundType?: AlertSoundType  // Type of alert sound (default: 'chime')
  customSoundUrl?: string     // URL for custom sound file (when soundType is 'custom')
  volume?: number             // Volume level 0-1 (default: 0.5)
  repeatInterval?: number     // Min ms between alerts to prevent spam (default: 60000)
  playOnIncrease?: boolean    // Only play when queue increases (default: true)
}

interface OperationsDashboardConfig {
  posApiUrl?: string      // POS API base URL (default: http://localhost:3000)
  siteIds?: string[]      // Site IDs to monitor (default: kyle-rise, KCS01)
  refreshInterval?: number // Refresh interval in ms (default: 30000)
  eventLimit?: number     // Number of recent events to show (default: 8)
  showEnforcement?: boolean
  showHealth?: boolean
  title?: string
  // Alert sound configuration
  alertSound?: AlertSoundConfig
}

// Web Audio API based sound generator
const createAlertSound = (
  type: AlertSoundType, 
  volume: number = 0.5,
  customUrl?: string
): (() => void) => {
  // If custom URL provided, use audio element
  if (type === 'custom' && customUrl) {
    return () => {
      const audio = new Audio(customUrl)
      audio.volume = volume
      audio.play().catch(e => console.warn('Failed to play custom alert:', e))
    }
  }

  // Use Web Audio API for built-in sounds
  return () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const gainNode = audioContext.createGain()
      gainNode.connect(audioContext.destination)
      gainNode.gain.value = volume

      const playTone = (freq: number, start: number, duration: number, type: OscillatorType = 'sine') => {
        const oscillator = audioContext.createOscillator()
        oscillator.type = type
        oscillator.frequency.value = freq
        oscillator.connect(gainNode)
        oscillator.start(audioContext.currentTime + start)
        oscillator.stop(audioContext.currentTime + start + duration)
      }

      switch (type) {
        case 'chime':
          // Pleasant two-tone chime
          playTone(880, 0, 0.15)      // A5
          playTone(1108.73, 0.15, 0.2) // C#6
          break

        case 'alert':
          // Attention-grabbing three-tone
          playTone(523.25, 0, 0.1)    // C5
          playTone(659.25, 0.1, 0.1)  // E5
          playTone(783.99, 0.2, 0.15) // G5
          break

        case 'urgent':
          // Urgent pulsing alert
          playTone(880, 0, 0.1, 'square')
          playTone(880, 0.15, 0.1, 'square')
          playTone(1046.50, 0.3, 0.15, 'square')
          break

        case 'bell':
          // Bell-like sound
          playTone(1396.91, 0, 0.3)   // F6
          playTone(698.46, 0.05, 0.25) // F5 (harmonic)
          break

        case 'none':
        default:
          // No sound
          break
      }

      // Clean up after sounds finish
      setTimeout(() => audioContext.close(), 1000)
    } catch (e) {
      console.warn('Web Audio API not supported or failed:', e)
    }
  }
}

interface SiteData {
  siteId: string
  siteName: string
  cameras: CameraStatus[]
  stats: {
    today: {
      entries: number
      exits: number
      violations: number
    }
    hourlyActivity: { hour: number; count: number }[]
  }
  health: {
    status: 'healthy' | 'warning' | 'critical'
    lastSync: string | null
  }
}

interface CameraStatus {
  cameraId: string
  name: string
  direction: 'ENTRY' | 'EXIT' | 'INTERNAL' | null
  lastDetection: {
    timestamp: string | null
    vrm: string | null
    imageUrl: string | null
  }
  status: 'online' | 'offline' | 'warning'
}

interface RecentEvent {
  id: string
  type: string
  siteId: string
  siteName: string
  vrm: string
  direction: string
  message: string
  timestamp: string
  cameraName: string
  imageUrl?: string
}

interface EnforcementItem {
  id: string
  vrm: string
  siteId: string
  reason: string
  timestamp: string
  durationMinutes: number
}

interface DashboardData {
  sites: SiteData[]
  summary: {
    totalActiveAlarms: number
    reviewQueueCount: number
    systemStatus: 'healthy' | 'warning' | 'critical'
  }
  generatedAt: string
}

export function OperationsDashboardWidget({ config }: { config: OperationsDashboardConfig }) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([])
  const [enforcementQueue, setEnforcementQueue] = useState<EnforcementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  // Alert sound state
  const [soundMuted, setSoundMuted] = useState(false)
  const prevQueueCountRef = useRef<number>(0)
  const lastAlertTimeRef = useRef<number>(0)
  const isFirstLoadRef = useRef<boolean>(true)

  const posApiUrl = config.posApiUrl || 'http://localhost:3000'
  const siteIds = config.siteIds || ['kyle-rise', 'KCS01']
  const refreshInterval = config.refreshInterval || 30000
  const eventLimit = config.eventLimit || 8
  const showEnforcement = config.showEnforcement !== false
  const showHealth = config.showHealth !== false
  
  // Alert sound configuration with defaults
  const alertConfig: Required<AlertSoundConfig> = {
    enabled: config.alertSound?.enabled !== false,
    threshold: config.alertSound?.threshold ?? 3,
    soundType: config.alertSound?.soundType || 'chime',
    customSoundUrl: config.alertSound?.customSoundUrl || '',
    volume: config.alertSound?.volume ?? 0.5,
    repeatInterval: config.alertSound?.repeatInterval ?? 60000,
    playOnIncrease: config.alertSound?.playOnIncrease !== false
  }
  
  // Create the sound player function
  const playAlertSound = useCallback(() => {
    if (soundMuted || !alertConfig.enabled || alertConfig.soundType === 'none') return
    
    const now = Date.now()
    if (now - lastAlertTimeRef.current < alertConfig.repeatInterval) return
    
    lastAlertTimeRef.current = now
    const soundPlayer = createAlertSound(
      alertConfig.soundType, 
      alertConfig.volume, 
      alertConfig.customSoundUrl
    )
    soundPlayer()
  }, [soundMuted, alertConfig])
  
  // Check if alert should be triggered
  const checkAndTriggerAlert = useCallback((currentQueueCount: number) => {
    // Skip alert on first load
    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false
      prevQueueCountRef.current = currentQueueCount
      return
    }
    
    const prevCount = prevQueueCountRef.current
    const thresholdExceeded = currentQueueCount >= alertConfig.threshold
    const hasIncreased = currentQueueCount > prevCount
    
    // Update previous count
    prevQueueCountRef.current = currentQueueCount
    
    // Determine if we should play alert
    if (thresholdExceeded) {
      if (alertConfig.playOnIncrease) {
        // Only alert when queue increases above threshold
        if (hasIncreased) {
          playAlertSound()
        }
      } else {
        // Alert whenever threshold is exceeded
        playAlertSound()
      }
    }
  }, [alertConfig, playAlertSound])

  const fetchData = useCallback(async () => {
    try {
      // Fetch all data in parallel
      const [dashboardRes, eventsRes, enforcementRes] = await Promise.all([
        fetch(`${posApiUrl}/api/operations/dashboard`),
        fetch(`${posApiUrl}/api/operations/events?limit=${eventLimit}`),
        showEnforcement 
          ? fetch(`${posApiUrl}/enforcement/queue?limit=5`)
          : Promise.resolve({ ok: true, json: () => Promise.resolve({ items: [], total: 0 }) })
      ])

      if (dashboardRes.ok) {
        const dashboard = await dashboardRes.json()
        // Filter to only requested sites
        dashboard.sites = dashboard.sites.filter(
          (s: SiteData) => siteIds.includes(s.siteId)
        )
        setDashboardData(dashboard)
      }

      if (eventsRes.ok) {
        const events = await eventsRes.json()
        // Filter events to requested sites
        const filtered = events.events.filter(
          (e: RecentEvent) => siteIds.includes(e.siteId)
        )
        setRecentEvents(filtered.slice(0, eventLimit))
      }

      if (showEnforcement && enforcementRes.ok) {
        const enforcement = await enforcementRes.json()
        const items = enforcement.items || []
        setEnforcementQueue(items)
        
        // Check if alert should be triggered based on queue count
        const queueCount = enforcement.total ?? items.length
        checkAndTriggerAlert(queueCount)
      }

      setLastRefresh(new Date())
      setError(null)
    } catch (e) {
      console.error('Failed to fetch dashboard data:', e)
      setError('Unable to connect to POS API')
    } finally {
      setLoading(false)
    }
  }, [posApiUrl, siteIds, eventLimit, showEnforcement, checkAndTriggerAlert])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchData, refreshInterval])

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const then = new Date(timestamp)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const hours = Math.floor(diffMins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  const getStatusColor = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy': return '#10b981'
      case 'warning': return '#f59e0b'
      case 'critical': return '#ef4444'
    }
  }

  const getStatusIcon = (status: 'healthy' | 'warning' | 'critical') => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-5 h-5" />
      case 'warning': return <AlertTriangle className="w-5 h-5" />
      case 'critical': return <AlertTriangle className="w-5 h-5" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-dark-900">
        <div className="text-gray-500 flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span className="text-xl">Loading Operations Dashboard...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-dark-900">
        <div className="text-red-400 flex items-center gap-3">
          <AlertTriangle className="w-8 h-8" />
          <span className="text-xl">{error}</span>
        </div>
      </div>
    )
  }

  // Calculate totals from site data
  const totalEntries = dashboardData?.sites.reduce((sum, s) => sum + s.stats.today.entries, 0) || 0
  const totalExits = dashboardData?.sites.reduce((sum, s) => sum + s.stats.today.exits, 0) || 0
  const currentOccupancy = totalEntries - totalExits
  const systemStatus = dashboardData?.summary.systemStatus || 'healthy'

  return (
    <div className="h-full bg-dark-900 text-white p-6 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Activity className="w-8 h-8 text-accent" />
          <h1 className="text-2xl font-bold">{config.title || 'Operations Dashboard'}</h1>
        </div>
        <div className="flex items-center gap-6">
          {/* Sound Mute Toggle */}
          {alertConfig.enabled && alertConfig.soundType !== 'none' && (
            <button
              onClick={() => setSoundMuted(!soundMuted)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                soundMuted 
                  ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                  : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              }`}
              title={soundMuted ? 'Click to unmute alerts' : 'Click to mute alerts'}
            >
              {soundMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {soundMuted ? 'Muted' : `Alert: ${alertConfig.threshold}+`}
              </span>
            </button>
          )}
          {showHealth && (
            <div 
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
              style={{ 
                backgroundColor: `${getStatusColor(systemStatus)}20`, 
                color: getStatusColor(systemStatus) 
              }}
            >
              {getStatusIcon(systemStatus)}
              <span>System {systemStatus.toUpperCase()}</span>
            </div>
          )}
          {lastRefresh && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Clock className="w-4 h-4" />
              Updated {formatTime(lastRefresh.toISOString())}
            </div>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-12 gap-4">
        {/* Site Cards - Left Side */}
        <div className="col-span-4 space-y-4">
          {dashboardData?.sites.map(site => (
            <div 
              key={site.siteId}
              className="bg-dark-800 rounded-2xl p-5 border border-dark-700"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <ParkingCircle className="w-6 h-6 text-accent" />
                  <h3 className="text-lg font-semibold">{site.siteName}</h3>
                </div>
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getStatusColor(site.health.status) }}
                />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-green-400">
                    <ArrowUp className="w-4 h-4" />
                    <span className="text-3xl font-bold">{site.stats.today.entries}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Entries</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-red-400">
                    <ArrowDown className="w-4 h-4" />
                    <span className="text-3xl font-bold">{site.stats.today.exits}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Exits</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-accent">
                    {site.stats.today.entries - site.stats.today.exits}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">On Site</div>
                </div>
              </div>

              {/* Mini Activity Chart for this site */}
              {site.stats.hourlyActivity && site.stats.hourlyActivity.length > 0 && (
                <div className="mt-4 pt-4 border-t border-dark-700">
                  <MiniActivityChart 
                    data={site.stats.hourlyActivity} 
                    label="Site Activity"
                    color="#06b6d4"
                    height={50}
                  />
                </div>
              )}

              {/* Camera Status */}
              {site.cameras.length > 0 && (
                <div className="mt-4 pt-4 border-t border-dark-700">
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                    <Camera className="w-4 h-4" />
                    Cameras
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {site.cameras.map(cam => (
                      <div 
                        key={cam.cameraId}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-dark-700"
                      >
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ 
                            backgroundColor: cam.status === 'online' ? '#10b981' : 
                                           cam.status === 'warning' ? '#f59e0b' : '#ef4444'
                          }}
                        />
                        <span className="truncate max-w-[100px]">{cam.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Summary Stats */}
          <div className="bg-dark-800 rounded-2xl p-5 border border-dark-700">
            <div className="flex items-center gap-3 mb-4">
              <Server className="w-6 h-6 text-accent" />
              <h3 className="text-lg font-semibold">System Summary</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-4xl font-bold text-accent">{currentOccupancy}</div>
                <div className="text-sm text-gray-500">Current Occupancy</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-white">{totalEntries + totalExits}</div>
                <div className="text-sm text-gray-500">Total Movements</div>
              </div>
            </div>
            
            {/* Mini Activity Chart - Aggregated from all sites */}
            {dashboardData && dashboardData.sites.length > 0 && (
              <div className="pt-4 border-t border-dark-700">
                <AggregatedActivityChart sites={dashboardData.sites} height={70} />
              </div>
            )}
          </div>
        </div>

        {/* Recent Events - Center */}
        <div className="col-span-5 bg-dark-800 rounded-2xl p-5 border border-dark-700 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Car className="w-6 h-6 text-accent" />
              <h3 className="text-lg font-semibold">Recent ANPR Events</h3>
            </div>
            <span className="text-sm text-gray-500">{recentEvents.length} events</span>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <div className="space-y-2">
              {recentEvents.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No recent events for selected sites
                </div>
              ) : (
                recentEvents.map(event => (
                  <div 
                    key={event.id}
                    className="flex items-center gap-4 p-3 bg-dark-700/50 rounded-lg"
                  >
                    <div className={`p-2 rounded-lg ${
                      event.direction === 'ENTRY' ? 'bg-green-500/20 text-green-400' : 
                      event.direction === 'EXIT' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {event.direction === 'ENTRY' ? (
                        <ArrowUp className="w-5 h-5" />
                      ) : (
                        <ArrowDown className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lg">
                          {event.vrm === 'unknown' ? '---' : event.vrm}
                        </span>
                        <span className="text-xs text-gray-500 truncate">
                          {event.siteName}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {event.cameraName}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {formatTime(event.timestamp)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTimeAgo(event.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Enforcement & Health */}
        <div className="col-span-3 space-y-4">
          {/* Enforcement Queue */}
          {showEnforcement && (
            <div className={`bg-dark-800 rounded-2xl p-5 border ${
              (dashboardData?.summary.reviewQueueCount || 0) >= alertConfig.threshold
                ? 'border-orange-500 shadow-lg shadow-orange-500/20'
                : 'border-dark-700'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Shield className={`w-6 h-6 ${
                    (dashboardData?.summary.reviewQueueCount || 0) >= alertConfig.threshold
                      ? 'text-orange-500 animate-pulse'
                      : 'text-orange-400'
                  }`} />
                  <h3 className="text-lg font-semibold">Enforcement Queue</h3>
                </div>
                <span 
                  className="px-3 py-1 rounded-full text-sm font-medium"
                  style={{
                    backgroundColor: (dashboardData?.summary.reviewQueueCount || 0) >= alertConfig.threshold
                      ? '#ef444440'
                      : enforcementQueue.length > 0 
                        ? '#f59e0b20' 
                        : '#10b98120',
                    color: (dashboardData?.summary.reviewQueueCount || 0) >= alertConfig.threshold
                      ? '#ef4444'
                      : enforcementQueue.length > 0 
                        ? '#f59e0b' 
                        : '#10b981'
                  }}
                >
                  {dashboardData?.summary.reviewQueueCount || 0} pending
                </span>
              </div>
              
              <div className="space-y-2">
                {enforcementQueue.length === 0 ? (
                  <div className="text-center text-gray-500 py-6">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                    Queue is clear
                  </div>
                ) : (
                  enforcementQueue.slice(0, 4).map(item => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg"
                    >
                      <div>
                        <div className="font-mono font-bold">{item.vrm}</div>
                        <div className="text-xs text-gray-500">{item.siteId}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-orange-400">
                          {item.durationMinutes}min
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTimeAgo(item.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* System Health */}
          {showHealth && dashboardData && (
            <div className="bg-dark-800 rounded-2xl p-5 border border-dark-700">
              <div className="flex items-center gap-3 mb-4">
                <Activity className="w-6 h-6 text-accent" />
                <h3 className="text-lg font-semibold">System Health</h3>
              </div>
              
              <div className="space-y-3">
                {dashboardData.sites.map(site => (
                  <div 
                    key={site.siteId}
                    className="flex items-center justify-between p-3 bg-dark-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getStatusColor(site.health.status) }}
                      />
                      <span className="text-sm">{site.siteName}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {site.health.lastSync ? formatTimeAgo(site.health.lastSync) : 'No sync'}
                    </div>
                  </div>
                ))}

                <div className="pt-2 border-t border-dark-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Active Alarms</span>
                    <span 
                      className="font-medium"
                      style={{ 
                        color: dashboardData.summary.totalActiveAlarms > 0 ? '#f59e0b' : '#10b981'
                      }}
                    >
                      {dashboardData.summary.totalActiveAlarms}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
