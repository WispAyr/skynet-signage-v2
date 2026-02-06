import { useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { Tv, Wifi, WifiOff } from 'lucide-react'
import { ClockWidget } from './widgets/ClockWidget'
import { CameraWidget } from './widgets/CameraWidget'
import { CameraGridWidget } from './widgets/CameraGridWidget'
import { WeatherWidget } from './widgets/WeatherWidget'
import { StatsWidget } from './widgets/StatsWidget'
import { OccupancyWidget } from './widgets/OccupancyWidget'
import { IframeWidget } from './widgets/IframeWidget'
import { LayoutWidget } from './widgets/LayoutWidget'
import { PlaylistWidget } from './widgets/PlaylistWidget'
import { AlertBannerWidget } from './widgets/AlertBannerWidget'
import { OperationsDashboardWidget } from './widgets/OperationsDashboardWidget'
import { TeamActivityWidget } from './widgets/TeamActivityWidget'
import { TestCardWidget } from './widgets/TestCardWidget'
import { SportsWidget } from './widgets/SportsWidget'
import { YoungsMenuWidget } from './widgets/YoungsMenuWidget'
import { YoungsKioskWidget } from './widgets/YoungsKioskWidget'
import { TemplateWidget } from './widgets/TemplateWidget'
import { SecurityAlertWidget } from './widgets/SecurityAlertWidget'
import { RevenueWidget } from './widgets/RevenueWidget'
import { PlaylistPlayer, Playlist } from './widgets/PlaylistPlayer'
import { AdminLayout } from './admin/AdminLayout'

// Determine mode from URL params
const params = new URLSearchParams(window.location.search)
const isDisplayMode = params.has('screen') || params.has('display')
const screenId = params.get('screen') || params.get('id') || `screen-${Math.random().toString(36).slice(2, 8)}`

interface ScreenConfig {
  mode: 'hybrid' | 'signage-only' | 'kiosk'
  interactiveUrl: string
  idleTimeout: number
  touchToInteract: boolean
}

const DEFAULT_CONFIG: ScreenConfig = {
  mode: 'hybrid',
  interactiveUrl: '',
  idleTimeout: 60,
  touchToInteract: true
}

interface Screen {
  id: string
  name: string
  group_id: string
  type: string
  location?: string
  status: string
  connected: boolean
  last_seen?: number
  config: ScreenConfig
  currentMode?: 'signage' | 'interactive'
}

interface ContentPayload {
  type: 'url' | 'widget' | 'alert' | 'media' | 'clear' | 'playlist'
  content: any
  priority?: number
  duration?: number
  timestamp: number
  source?: string
}

// ===== WIDGET RENDERER =====
function WidgetRenderer({ widget, config }: { widget: string; config: any }) {
  switch (widget) {
    case 'clock':
      return <ClockWidget config={config} />
    case 'weather':
      return <WeatherWidget config={config} />
    case 'camera':
      return <CameraWidget config={config} />
    case 'camera-grid':
      return <CameraGridWidget config={config} />
    case 'stats':
      return <StatsWidget config={config} />
    case 'occupancy':
      return <OccupancyWidget config={config} />
    case 'iframe':
      return <IframeWidget config={config} />
    case 'layout':
      return <LayoutWidget config={config} />
    case 'playlist':
      return <PlaylistWidget config={config} />
    case 'alert':
      return <AlertBannerWidget config={config} />
    case 'operations-dashboard':
      return <OperationsDashboardWidget config={config} />
    case 'team-activity':
      return <TeamActivityWidget config={config} />
    case 'sports':
    case 'football':
    case 'rangers':
    case 'celtic':
      return <SportsWidget config={{ team: widget === 'celtic' ? 'celtic' : widget === 'rangers' ? 'rangers' : config.team, ...config }} />
    case 'testcard':
    case 'test-card':
      return <TestCardWidget config={config} />
    case 'youngs-menu':
    case 'youngs':
      return <YoungsMenuWidget config={config} />
    case 'youngs-kiosk':
    case 'kiosk':
      return <YoungsKioskWidget config={config} />
    case 'template':
      return <TemplateWidget config={config} />
    case 'security-alert':
      return <SecurityAlertWidget config={config} />
    case 'revenue':
    case 'pos-revenue':
      return <RevenueWidget config={config} />
    default:
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <div className="text-2xl mb-2">Unknown widget: {widget}</div>
            <pre className="text-sm">{JSON.stringify(config, null, 2)}</pre>
          </div>
        </div>
      )
  }
}

// ===== DISPLAY MODE =====
function DisplayMode() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [currentContent, setCurrentContent] = useState<ContentPayload | null>(null)
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null)
  const [alert, setAlert] = useState<{ message: string; level: string } | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showFullscreenPrompt, setShowFullscreenPrompt] = useState(true)
  
  // Hybrid mode state
  const [screenConfig, setScreenConfig] = useState<ScreenConfig>(DEFAULT_CONFIG)
  const [displayMode, setDisplayMode] = useState<'signage' | 'interactive'>('signage')
  const [interactiveFading, setInteractiveFading] = useState(false)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const socketRef = useRef<Socket | null>(null)

  // Fullscreen handler
  const requestFullscreen = useCallback(() => {
    const elem = document.documentElement
    if (elem.requestFullscreen) {
      elem.requestFullscreen().then(() => {
        setIsFullscreen(true)
        setShowFullscreenPrompt(false)
      }).catch(console.error)
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen()
      setIsFullscreen(true)
      setShowFullscreenPrompt(false)
    }
  }, [])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
      if (!document.fullscreenElement) {
        setShowFullscreenPrompt(true)
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Switch to interactive mode
  const switchToInteractive = useCallback(() => {
    if (screenConfig.mode === 'signage-only') return
    setDisplayMode('interactive')
    setInteractiveFading(false)
    socketRef.current?.emit('mode-change', { mode: 'interactive' })
  }, [screenConfig.mode])

  // Switch back to signage mode
  const switchToSignage = useCallback(() => {
    setInteractiveFading(true)
    setTimeout(() => {
      setDisplayMode('signage')
      setInteractiveFading(false)
      socketRef.current?.emit('mode-change', { mode: 'signage' })
    }, 500) // fade duration
  }, [])

  // Reset idle timer
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    if (screenConfig.idleTimeout > 0) {
      idleTimerRef.current = setTimeout(() => {
        console.log('⏰ Idle timeout — returning to signage')
        switchToSignage()
      }, screenConfig.idleTimeout * 1000)
    }
  }, [screenConfig.idleTimeout, switchToSignage])

  // Idle activity detection for interactive mode
  useEffect(() => {
    if (displayMode !== 'interactive') {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      return
    }
    
    resetIdleTimer()
    
    const handleActivity = () => resetIdleTimer()
    // Listen on the whole window — iframe messages will be caught by postMessage listener
    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('mousedown', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('touchstart', handleActivity)
    window.addEventListener('touchmove', handleActivity)
    
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('mousedown', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
      window.removeEventListener('touchmove', handleActivity)
    }
  }, [displayMode, resetIdleTimer])

  // Listen for iframe activity via postMessage (cross-origin idle detection)
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data === 'user-activity' || e.data?.type === 'user-activity') {
        resetIdleTimer()
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [resetIdleTimer])

  useEffect(() => {
    const s = io(window.location.origin, { 
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      randomizationFactor: 0.5,
      timeout: 20000,
    })
    socketRef.current = s
    
    s.on('connect', () => {
      console.log('🔌 Connected to server')
      setConnected(true)
      s.emit('register', { screenId, name: params.get('name') || screenId, type: 'browser' })
    })
    
    s.on('disconnect', (reason) => {
      console.log('❌ Disconnected:', reason)
      setConnected(false)
    })
    
    s.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 Reconnecting... attempt ${attempt}`)
    })
    
    s.on('reconnect', () => {
      console.log('✅ Reconnected!')
    })
    
    // Receive screen config for hybrid mode
    s.on('screen-config', (config: ScreenConfig) => {
      console.log('⚙️ Screen config received:', config)
      setScreenConfig({ ...DEFAULT_CONFIG, ...config })
    })
    
    // Admin forced mode change
    s.on('set-mode', (data: { mode: 'signage' | 'interactive' }) => {
      console.log(`🔄 Admin forced mode: ${data.mode}`)
      if (data.mode === 'signage') {
        switchToSignage()
      } else {
        switchToInteractive()
      }
    })
    
    s.on('content', (payload: ContentPayload) => {
      console.log('📺 Content received:', payload)
      
      if (payload.type === 'alert') {
        setAlert(payload.content)
        if (payload.duration) {
          setTimeout(() => setAlert(null), payload.duration)
        }
      } else if (payload.type === 'clear') {
        setCurrentContent(null)
        setCurrentPlaylist(null)
        setAlert(null)
      } else if (payload.type === 'reload') {
        console.log('🔄 Reload requested')
        window.location.reload()
      } else if (payload.type === 'playlist') {
        console.log('📋 Playlist received:', payload.content)
        setCurrentPlaylist(payload.content as Playlist)
        setCurrentContent(null)
      } else {
        setCurrentContent(payload)
        setCurrentPlaylist(null)
      }
      
      // New content pushed — exit interactive mode back to signage
      if (payload.type !== 'alert' && payload.type !== 'reload') {
        setDisplayMode('signage')
        setInteractiveFading(false)
        s.emit('mode-change', { mode: 'signage' })
      }
    })
    
    setSocket(s)
    return () => { s.disconnect() }
  }, []) // Note: switchToSignage/switchToInteractive are stable via useCallback

  // Heartbeat
  useEffect(() => {
    if (!socket) return
    const interval = setInterval(() => socket.emit('heartbeat'), 30000)
    return () => clearInterval(interval)
  }, [socket])

  // Touch-to-interact handler
  const handleScreenTouch = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Don't trigger during fullscreen prompt
    if (showFullscreenPrompt && !isFullscreen) return
    // Don't trigger on interactive elements within signage content
    const target = e.target as HTMLElement
    if (target.closest('video, button, input, a, iframe, [data-no-interact]')) return
    
    // Only trigger if config allows
    if (screenConfig.touchToInteract && screenConfig.mode !== 'signage-only') {
      switchToInteractive()
    }
  }, [screenConfig, switchToInteractive, showFullscreenPrompt, isFullscreen])

  // Resolve interactive URL
  const interactiveUrl = screenConfig.interactiveUrl || 
    `${window.location.protocol}//${window.location.hostname}:5180`

  // If in kiosk mode, always show interactive URL
  if (screenConfig.mode === 'kiosk') {
    return (
      <div className="fixed inset-0 bg-black">
        <iframe 
          src={interactiveUrl}
          className="w-full h-full border-0"
          title="Kiosk Interface"
          allow="camera;microphone;fullscreen"
        />
      </div>
    )
  }

  // If in interactive mode, show the interactive iframe
  if (displayMode === 'interactive') {
    return (
      <div className={`fixed inset-0 bg-black transition-opacity duration-500 ${interactiveFading ? 'opacity-0' : 'opacity-100'}`}>
        <iframe 
          src={interactiveUrl}
          className="w-full h-full border-0"
          title="Interactive Interface"
          allow="camera;microphone;fullscreen"
        />
        {/* Subtle signage return indicator */}
        <div className="fixed bottom-4 right-4 bg-black/50 text-gray-500 text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
          Auto-return in {screenConfig.idleTimeout}s idle
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-dark-900" onClick={handleScreenTouch} onTouchStart={handleScreenTouch}>
      {/* Fullscreen prompt overlay */}
      {showFullscreenPrompt && !isFullscreen && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] cursor-pointer"
          onClick={(e) => { e.stopPropagation(); requestFullscreen(); }}
        >
          <div className="text-center animate-pulse">
            <Tv className="w-20 h-20 mx-auto mb-6 text-accent" />
            <h2 className="text-2xl font-light text-white mb-2">Click anywhere to enter fullscreen</h2>
            <p className="text-gray-500 text-sm">{screenId}</p>
          </div>
        </div>
      )}

      {/* Connection indicator */}
      <div className={`fixed top-4 right-4 flex items-center gap-2 text-xs px-3 py-1.5 rounded-full z-40 ${
        connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
      }`}>
        {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4 animate-pulse" />}
        <span>{connected ? screenId : 'Reconnecting...'}</span>
      </div>
      
      {/* Alert overlay */}
      {alert && (
        <div className={`fixed top-0 left-0 right-0 p-6 text-center text-2xl font-bold animate-slideUp z-50 ${
          alert.level === 'error' ? 'bg-red-600' : 
          alert.level === 'warning' ? 'bg-yellow-600' : 
          alert.level === 'success' ? 'bg-green-600' : 'bg-accent-dim'
        }`}>
          {alert.message}
        </div>
      )}
      
      {/* Main content */}
      {currentPlaylist ? (
        <PlaylistPlayer 
          playlist={currentPlaylist} 
          showControls={false}
          onComplete={() => {
            console.log('📋 Playlist complete')
            setCurrentPlaylist(null)
          }}
        />
      ) : currentContent ? (
        currentContent.type === 'url' ? (
          <iframe 
            src={currentContent.content.url} 
            className="w-full h-full border-0"
            title="Display Content"
          />
        ) : currentContent.type === 'widget' ? (
          <div className="w-full h-full">
            <WidgetRenderer widget={currentContent.content.widget} config={currentContent.content.config || {}} />
          </div>
        ) : currentContent.type === 'media' ? (
          <video
            src={currentContent.content.url}
            className="w-full h-full object-contain bg-black"
            autoPlay
            muted={false}
            loop={currentContent.content.loop}
            playsInline
          />
        ) : (
          <div className="text-center text-gray-400">
            <div className="text-2xl mb-2">Unknown content type</div>
            <pre className="text-sm">{JSON.stringify(currentContent, null, 2)}</pre>
          </div>
        )
      ) : (
        <div className="text-center animate-fadeIn">
          <Tv className="w-24 h-24 mx-auto mb-6 text-accent opacity-30" />
          <h1 className="text-3xl font-light text-gray-500 mb-2">SKYNET Display</h1>
          <p className="text-gray-600">{screenId}</p>
          <p className="text-sm text-gray-700 mt-4">Waiting for content...</p>
          {screenConfig.touchToInteract && screenConfig.mode === 'hybrid' && (
            <p className="text-xs text-gray-800 mt-2">Touch to interact</p>
          )}
        </div>
      )}
    </div>
  )
}

// ===== MAIN APP =====
export default function App() {
  return isDisplayMode ? <DisplayMode /> : <AdminLayout />
}
