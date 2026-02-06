import { useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { Monitor, Tv, AlertCircle, Settings, Send, RefreshCw, Wifi, WifiOff, Layout, X, Clock, Cloud, Camera, BarChart3, ParkingCircle, Play, Columns, AlertTriangle, Home, Activity, Sun, Zap, List, Film, Eye, EyeOff, Save, ChevronDown, ToggleLeft, ToggleRight, Timer, Link, Smartphone } from 'lucide-react'
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
import { PlaylistPlayer, Playlist } from './widgets/PlaylistPlayer'
import { PlaylistManager } from './components/PlaylistManager'
import { RemotionManager } from './components/RemotionManager'

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
      reconnectionDelayMax: 5000
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

// ===== SCREEN CONFIG EDITOR MODAL =====
function ScreenConfigModal({ screen, onClose, onSave }: { 
  screen: Screen; 
  onClose: () => void; 
  onSave: (config: ScreenConfig) => void 
}) {
  const [config, setConfig] = useState<ScreenConfig>({ ...DEFAULT_CONFIG, ...screen.config })
  const [saving, setSaving] = useState(false)

  const URL_PRESETS = [
    { label: 'LCARS', url: ':5180' },
    { label: 'AI Analytics', url: ':3861' },
    { label: 'Dashboard', url: ':3210' },
    { label: 'Mission Control', url: ':3800' },
    { label: 'Voice', url: ':3280' },
  ]

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/screens/${screen.id}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      const data = await res.json()
      if (data.success) {
        onSave(data.data)
        onClose()
      }
    } catch (err) {
      console.error('Failed to save config:', err)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-dark-800 rounded-2xl border border-dark-600 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-dark-700">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Settings className="w-5 h-5 text-accent" />
              Screen Config
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">{screen.name} ({screen.id})</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-dark-700 rounded-lg transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Config Form */}
        <div className="p-5 space-y-5">
          {/* Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Display Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {(['hybrid', 'signage-only', 'kiosk'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setConfig(c => ({ ...c, mode }))}
                  className={`p-3 rounded-lg border text-sm font-medium transition ${
                    config.mode === mode
                      ? 'bg-accent/20 border-accent text-accent'
                      : 'bg-dark-700 border-dark-600 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {mode === 'hybrid' && '📺🖥️'}
                  {mode === 'signage-only' && '📺'}
                  {mode === 'kiosk' && '⌨️'}
                  <div className="mt-1 capitalize">{mode.replace('-', ' ')}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Interactive URL */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Interactive URL</label>
            <input
              type="text"
              value={config.interactiveUrl}
              onChange={e => setConfig(c => ({ ...c, interactiveUrl: e.target.value }))}
              placeholder="Leave empty for auto (:5180 LCARS)"
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2.5 text-sm focus:border-accent focus:ring-1 focus:ring-accent outline-none"
            />
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {URL_PRESETS.map(p => (
                <button
                  key={p.url}
                  onClick={() => setConfig(c => ({ ...c, interactiveUrl: p.url }))}
                  className={`px-2.5 py-1 rounded-md text-xs border transition ${
                    config.interactiveUrl === p.url 
                      ? 'bg-accent/20 border-accent text-accent' 
                      : 'bg-dark-700 border-dark-600 text-gray-400 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Idle Timeout */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Idle Timeout: <span className="text-accent">{config.idleTimeout}s</span>
            </label>
            <input
              type="range"
              min="10"
              max="300"
              step="5"
              value={config.idleTimeout}
              onChange={e => setConfig(c => ({ ...c, idleTimeout: Number(e.target.value) }))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>10s</span>
              <span>60s</span>
              <span>120s</span>
              <span>300s</span>
            </div>
          </div>

          {/* Touch to Interact */}
          <div className="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
            <div>
              <div className="text-sm font-medium text-gray-300">Touch to Interact</div>
              <div className="text-xs text-gray-500">Touching the screen switches to interactive mode</div>
            </div>
            <button
              onClick={() => setConfig(c => ({ ...c, touchToInteract: !c.touchToInteract }))}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                config.touchToInteract ? 'bg-accent' : 'bg-dark-600'
              }`}
            >
              <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                config.touchToInteract ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-dark-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition">
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-accent text-dark-900 rounded-lg font-medium text-sm hover:bg-accent-dim transition disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Config'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ===== ADMIN MODE =====
function AdminMode() {
  const [screens, setScreens] = useState<Screen[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [pushUrl, setPushUrl] = useState('')
  const [pushTarget, setPushTarget] = useState('all')
  const [alertMessage, setAlertMessage] = useState('')
  const [activeTab, setActiveTab] = useState<'screens' | 'playlists' | 'video'>('screens')
  const [editingScreen, setEditingScreen] = useState<Screen | null>(null)
  const [expandedTemplates, setExpandedTemplates] = useState(false)

  const fetchScreens = useCallback(async () => {
    const res = await fetch('/api/screens')
    const data = await res.json()
    if (data.success) setScreens(data.data)
  }, [])

  useEffect(() => {
    fetchScreens()
    
    const s = io(window.location.origin, { transports: ['websocket', 'polling'] })
    s.on('connect', () => setConnected(true))
    s.on('disconnect', () => setConnected(false))
    s.on('screens:update', () => fetchScreens())
    s.on('screens:mode-update', ({ screenId, mode }: { screenId: string; mode: string }) => {
      setScreens(prev => prev.map(scr => 
        scr.id === screenId ? { ...scr, currentMode: mode as 'signage' | 'interactive' } : scr
      ))
    })
    s.on('screens:config-update', ({ screenId, config }: { screenId: string; config: ScreenConfig }) => {
      setScreens(prev => prev.map(scr => 
        scr.id === screenId ? { ...scr, config } : scr
      ))
    })
    setSocket(s)
    
    return () => { s.disconnect() }
  }, [fetchScreens])
  
  const handlePlaylistPush = (playlistId: string, target: string) => {
    console.log(`📋 Pushed playlist ${playlistId} to ${target}`)
  }

  const pushUrlToScreen = async () => {
    if (!pushUrl) return
    await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: pushTarget, type: 'url', content: { url: pushUrl } })
    })
    setPushUrl('')
  }

  const pushAlert = async () => {
    if (!alertMessage) return
    await fetch('/api/push/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: pushTarget, message: alertMessage, level: 'info', duration: 10000 })
    })
    setAlertMessage('')
  }

  const clearScreens = async () => {
    await fetch('/api/push/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: pushTarget })
    })
  }

  const forceMode = async (screenId: string, mode: 'signage' | 'interactive') => {
    await fetch(`/api/screens/${screenId}/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    })
  }

  const onlineCount = screens.filter(s => s.connected).length
  const modeIcon = (mode?: string) => {
    switch (mode) {
      case 'interactive': return '🖥️'
      case 'kiosk': return '⌨️'
      default: return '📺'
    }
  }
  const configModeIcon = (mode: string) => {
    switch (mode) {
      case 'hybrid': return '📺🖥️'
      case 'kiosk': return '⌨️'
      default: return '📺'
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex flex-wrap items-center justify-between p-4 md:p-6 border-b border-dark-700 gap-3">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-9 h-9 md:w-10 md:h-10 bg-accent/20 border border-accent rounded-lg flex items-center justify-center">
            <Monitor className="w-4 h-4 md:w-5 md:h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-semibold">SKYNET Signage</h1>
            <p className="text-xs md:text-sm text-gray-500">
              {onlineCount}/{screens.length} online
            </p>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-dark-800 rounded-lg p-1 order-last md:order-none w-full md:w-auto">
          <button
            onClick={() => setActiveTab('screens')}
            className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === 'screens' 
                ? 'bg-accent text-dark-900' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Monitor className="w-4 h-4 inline mr-1.5" />
            Screens
          </button>
          <button
            onClick={() => setActiveTab('playlists')}
            className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === 'playlists' 
                ? 'bg-accent text-dark-900' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <List className="w-4 h-4 inline mr-1.5" />
            Playlists
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`flex-1 md:flex-none px-3 md:px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === 'video' 
                ? 'bg-accent text-dark-900' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Film className="w-4 h-4 inline mr-1.5" />
            Video
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs md:text-sm ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <button onClick={fetchScreens} className="p-2 hover:bg-dark-600 rounded-lg transition">
            <RefreshCw className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </header>

      {/* Config Modal */}
      {editingScreen && (
        <ScreenConfigModal
          screen={editingScreen}
          onClose={() => setEditingScreen(null)}
          onSave={(config) => {
            setScreens(prev => prev.map(s => s.id === editingScreen.id ? { ...s, config } : s))
          }}
        />
      )}

      {/* Playlist Manager Tab */}
      {activeTab === 'playlists' && (
        <div className="flex-1 overflow-hidden">
          <PlaylistManager 
            screens={screens} 
            onPush={handlePlaylistPush}
          />
        </div>
      )}

      {/* Video/Remotion Tab */}
      {activeTab === 'video' && (
        <div className="flex-1 overflow-hidden">
          <RemotionManager screens={screens} />
        </div>
      )}

      {/* Screens Tab */}
      {activeTab === 'screens' && (
      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Screens list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-dark-800 rounded-xl border border-dark-600 p-4 md:p-6">
            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Layout className="w-5 h-5 text-accent" />
              Screens ({screens.length})
              <span className="ml-auto text-xs text-gray-500 font-normal">
                {onlineCount} online • {screens.length - onlineCount} offline
              </span>
            </h2>
          
            {screens.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Tv className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No screens registered</p>
                <p className="text-sm mt-2">Open <code className="bg-dark-600 px-2 py-0.5 rounded">?screen=myscreen</code> to register one</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {screens.map(screen => (
                  <div 
                    key={screen.id}
                    className={`rounded-xl border transition ${
                      pushTarget === screen.id
                        ? 'bg-accent/10 border-accent ring-1 ring-accent/50'
                        : screen.connected 
                          ? 'bg-dark-700 border-dark-600 hover:border-gray-500' 
                          : 'bg-dark-700/50 border-dark-600/50'
                    }`}
                  >
                    {/* Screen row - clickable to set target */}
                    <div 
                      className="flex items-center justify-between p-3 md:p-4 cursor-pointer"
                      onClick={() => setPushTarget(pushTarget === screen.id ? 'all' : screen.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                          screen.connected ? 'bg-green-500 animate-pulse' : 'bg-gray-600'
                        }`} />
                        <div className="min-w-0">
                          <div className="font-medium flex items-center gap-2 flex-wrap">
                            {screen.name}
                            <span className="text-sm" title={`Config: ${screen.config?.mode || 'hybrid'}`}>
                              {configModeIcon(screen.config?.mode || 'hybrid')}
                            </span>
                            {screen.connected && screen.currentMode && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                screen.currentMode === 'interactive' 
                                  ? 'bg-purple-500/20 text-purple-400' 
                                  : 'bg-blue-500/20 text-blue-400'
                              }`}>
                                {modeIcon(screen.currentMode)} {screen.currentMode}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate">{screen.id} • {screen.group_id}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {pushTarget === screen.id && (
                          <span className="text-xs px-2 py-1 rounded bg-accent/30 text-accent font-medium">
                            TARGET
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded ${screen.connected ? 'bg-green-500/20 text-green-400' : 'bg-gray-600/20 text-gray-400'}`}>
                          {screen.connected ? 'online' : 'offline'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Screen quick actions */}
                    {screen.connected && (
                      <div className="flex items-center gap-2 px-3 md:px-4 pb-3 pt-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); forceMode(screen.id, 'signage') }}
                          className={`text-xs px-2.5 py-1.5 rounded-md border transition flex items-center gap-1.5 ${
                            screen.currentMode === 'signage' 
                              ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' 
                              : 'bg-dark-600 border-dark-500 text-gray-400 hover:text-white'
                          }`}
                          title="Switch to signage mode"
                        >
                          <Tv className="w-3 h-3" /> Signage
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); forceMode(screen.id, 'interactive') }}
                          className={`text-xs px-2.5 py-1.5 rounded-md border transition flex items-center gap-1.5 ${
                            screen.currentMode === 'interactive' 
                              ? 'bg-purple-500/20 border-purple-500/50 text-purple-400' 
                              : 'bg-dark-600 border-dark-500 text-gray-400 hover:text-white'
                          }`}
                          title="Switch to interactive mode"
                        >
                          <Smartphone className="w-3 h-3" /> Interactive
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingScreen(screen) }}
                          className="text-xs px-2.5 py-1.5 rounded-md bg-dark-600 border border-dark-500 text-gray-400 hover:text-white transition flex items-center gap-1.5 ml-auto"
                          title="Edit screen config"
                        >
                          <Settings className="w-3 h-3" /> Config
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-4 md:space-y-6">
          {/* Push URL */}
          <div className="bg-dark-800 rounded-xl border border-dark-600 p-4 md:p-6">
            <h3 className="font-medium mb-3 md:mb-4 flex items-center gap-2">
              <Send className="w-4 h-4 text-accent" />
              Push Content
            </h3>
            
            <div className="space-y-3">
              <select 
                value={pushTarget} 
                onChange={e => setPushTarget(e.target.value)}
                className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm"
              >
                <option value="all">All Screens</option>
                <option value="office">Office Group</option>
                <option value="kiosk">Kiosk Group</option>
                {screens.map(s => (
                  <option key={s.id} value={s.id}>{s.name} {s.connected ? '🟢' : '⚫'}</option>
                ))}
              </select>
              
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="URL to push..."
                  value={pushUrl}
                  onChange={e => setPushUrl(e.target.value)}
                  className="flex-1 bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm"
                  onKeyDown={e => e.key === 'Enter' && pushUrlToScreen()}
                />
                <button 
                  onClick={pushUrlToScreen}
                  className="px-4 py-2 bg-accent text-dark-900 rounded-lg font-medium text-sm hover:bg-accent-dim transition"
                >
                  Push
                </button>
              </div>
            </div>
          </div>

          {/* Push Alert */}
          <div className="bg-dark-800 rounded-xl border border-dark-600 p-4 md:p-6">
            <h3 className="font-medium mb-3 md:mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              Push Alert
            </h3>
            
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Alert message..."
                value={alertMessage}
                onChange={e => setAlertMessage(e.target.value)}
                className="flex-1 bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm"
                onKeyDown={e => e.key === 'Enter' && pushAlert()}
              />
              <button 
                onClick={pushAlert}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium text-sm hover:bg-yellow-700 transition"
              >
                Alert
              </button>
            </div>
          </div>

          {/* Clear */}
          <button 
            onClick={clearScreens}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-gray-400 hover:bg-dark-600 hover:text-white transition"
          >
            <X className="w-4 h-4" />
            Clear Screens
          </button>

          {/* Branded Templates - Collapsible */}
          <div className="bg-dark-800 rounded-xl border border-accent/30 p-4 md:p-6">
            <button 
              onClick={() => setExpandedTemplates(!expandedTemplates)}
              className="w-full font-medium mb-2 flex items-center gap-2"
            >
              <Zap className="w-4 h-4 text-accent" />
              Quick Push
              <ChevronDown className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${expandedTemplates ? 'rotate-180' : ''}`} />
            </button>
            <p className="text-xs text-gray-500 mb-3">Branded displays, dashboards & cameras</p>
            
            <div className={`space-y-2 ${expandedTemplates ? '' : 'max-h-[420px] overflow-y-auto'}`}>
              {/* Templates */}
              <TemplateButton icon={<Home className="w-4 h-4 text-accent" />} label="Welcome Screen" sub="Reception & entrance" color="accent" onClick={() => pushTemplate('/templates/welcome.html')} />
              <TemplateButton icon={<BarChart3 className="w-4 h-4 text-blue-400" />} label="Operations Dashboard" sub="Live stats & monitoring" color="blue" onClick={() => pushTemplate('/templates/dashboard.html')} />
              <TemplateButton icon={<Activity className="w-4 h-4 text-purple-400" />} label="Activity Feed" sub="Team timeline & tasks" color="purple" onClick={() => pushTemplate('/templates/activity-feed.html')} />
              <TemplateButton icon={<Sun className="w-4 h-4 text-amber-400" />} label="Ambient Clock/Weather" sub="Break rooms & hallways" color="amber" onClick={() => pushTemplate('/templates/ambient.html')} />
              <TemplateButton icon={<Monitor className="w-4 h-4 text-cyan-400" />} label="HQ Mission Control" sub="Command center" color="cyan" onClick={() => pushTemplate('http://10.10.10.123:3800/')} />
              <TemplateButton icon={<Layout className="w-4 h-4 text-orange-400" />} label="LCARS Interface" sub="Star Trek NOC" color="orange" onClick={() => pushTemplate('http://10.10.10.123:5180/')} />
              <TemplateButton icon={<ParkingCircle className="w-4 h-4 text-green-400" />} label="POS Dashboard" sub="Parking ops" color="green" onClick={() => pushTemplate('http://10.10.10.123:5173/')} />
              <TemplateButton icon={<Monitor className="w-4 h-4 text-violet-400" />} label="Skynet Command" sub="Main dashboard" color="violet" onClick={() => pushTemplate('http://10.10.10.123:3210/')} />
              <TemplateButton icon={<Activity className="w-4 h-4 text-fuchsia-400" />} label="Memory Viz" sub="3D neural architecture" color="fuchsia" onClick={() => pushTemplate('http://10.10.10.123:3210/memory')} />
              <TemplateButton icon={<Camera className="w-4 h-4 text-rose-400" />} label="Situational Awareness" sub="Live overview" color="rose" onClick={() => pushTemplate('http://10.10.10.123:3210/sa')} />
              <TemplateButton icon={<Wifi className="w-4 h-4 text-teal-400" />} label="Skynet Voice" sub="Voice interface" color="teal" onClick={() => pushTemplate('http://10.10.10.123:3280/')} />
              <TemplateButton icon={<Zap className="w-4 h-4 text-sky-400" />} label="AirWave" sub="Aviation tracking" color="sky" onClick={() => pushTemplate('http://10.10.10.123:8501/')} />
              <TemplateButton icon={<Zap className="w-4 h-4 text-pink-400" />} label="Ideate Board" sub="Ideas & planning" color="pink" onClick={() => pushTemplate('http://10.10.10.123:3847/')} />
              
              {/* Sports */}
              <div className="border-t border-dark-600 pt-2 mt-2">
                <div className="flex gap-2">
                  <button onClick={() => pushWidget('rangers', {})} className="flex-1 flex items-center gap-2 p-2 bg-dark-700 rounded-lg hover:bg-dark-600 text-sm border border-dark-600 hover:border-blue-500/50 transition">
                    <span>🔵</span> Rangers
                  </button>
                  <button onClick={() => pushWidget('celtic', {})} className="flex-1 flex items-center gap-2 p-2 bg-dark-700 rounded-lg hover:bg-dark-600 text-sm border border-dark-600 hover:border-green-500/50 transition">
                    <span>🍀</span> Celtic
                  </button>
                  <button onClick={() => pushWidget('sports', { team: 'ayr-united' })} className="flex-1 flex items-center gap-2 p-2 bg-dark-700 rounded-lg hover:bg-dark-600 text-sm border border-dark-600 hover:border-gray-500/50 transition">
                    <span>⚫</span> Ayr
                  </button>
                </div>
              </div>

              {/* Alert Template */}
              <TemplateButton icon={<AlertTriangle className="w-4 h-4 text-red-400" />} label="Alert Template" sub="Emergency notifications" color="red" onClick={() => pushTemplate('/templates/alert.html?level=info&title=System%20Notice&message=All%20systems%20operational')} />
            </div>
          </div>

          {/* Camera Views */}
          <div className="bg-dark-800 rounded-xl border border-dark-600 p-4 md:p-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Camera className="w-4 h-4 text-accent" />
              Camera Views
            </h3>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => pushWidget('camera', { src: 'kyle-rise-front', go2rtcHost: '10.10.10.123:1984' })} className="flex items-center gap-2 p-2 bg-dark-700 rounded-lg hover:bg-dark-600 text-xs border border-dark-600 transition">
                  <Camera className="w-3 h-3 text-emerald-400" /> KR Front
                </button>
                <button onClick={() => pushWidget('camera', { src: 'kyle-rise-rear', go2rtcHost: '10.10.10.123:1984' })} className="flex items-center gap-2 p-2 bg-dark-700 rounded-lg hover:bg-dark-600 text-xs border border-dark-600 transition">
                  <Camera className="w-3 h-3 text-emerald-400" /> KR Rear
                </button>
                <button onClick={() => pushWidget('camera', { src: 'kyle-rise-ptz', go2rtcHost: '10.10.10.123:1984' })} className="flex items-center gap-2 p-2 bg-dark-700 rounded-lg hover:bg-dark-600 text-xs border border-dark-600 transition">
                  <Camera className="w-3 h-3 text-emerald-400" /> KR PTZ
                </button>
                <button onClick={() => pushWidget('camera', { src: 'kyle-surface-anpr', go2rtcHost: '10.10.10.123:1984' })} className="flex items-center gap-2 p-2 bg-dark-700 rounded-lg hover:bg-dark-600 text-xs border border-dark-600 transition">
                  <Camera className="w-3 h-3 text-lime-400" /> KS ANPR
                </button>
                <button onClick={() => pushWidget('camera', { src: 'greenford-overview', go2rtcHost: '10.10.10.123:1984' })} className="flex items-center gap-2 p-2 bg-dark-700 rounded-lg hover:bg-dark-600 text-xs border border-dark-600 transition">
                  <Camera className="w-3 h-3 text-yellow-400" /> Greenford
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button onClick={() => pushWidget('camera-grid', { cameras: ['kyle-rise-front', 'kyle-rise-rear', 'kyle-rise-ptz', 'kyle-surface-anpr'], go2rtcHost: '10.10.10.123:1984' })} className="flex items-center gap-2 p-2 bg-dark-700 rounded-lg hover:bg-dark-600 text-xs border border-dark-600 transition">
                  <Columns className="w-3 h-3 text-indigo-400" /> Kyle Grid
                </button>
                <button onClick={() => pushWidget('camera-grid', { cameras: ['kyle-rise-front', 'kyle-rise-rear', 'kyle-surface-anpr', 'greenford-overview'], go2rtcHost: '10.10.10.123:1984' })} className="flex items-center gap-2 p-2 bg-dark-700 rounded-lg hover:bg-dark-600 text-xs border border-dark-600 transition">
                  <Columns className="w-3 h-3 text-indigo-400" /> All Sites
                </button>
              </div>
            </div>
          </div>

          {/* Quick Widgets */}
          <div className="bg-dark-800 rounded-xl border border-dark-600 p-4 md:p-6">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent" />
              Quick Widgets
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => pushWidget('clock', {})} className="flex items-center gap-2 p-2 bg-dark-700 rounded-lg hover:bg-dark-600 text-sm"><Clock className="w-4 h-4" /> Clock</button>
              <button onClick={() => pushWidget('weather', { location: 'Ayr, Scotland' })} className="flex items-center gap-2 p-2 bg-dark-700 rounded-lg hover:bg-dark-600 text-sm"><Cloud className="w-4 h-4" /> Weather</button>
              <button onClick={() => pushWidget('occupancy', { siteName: 'Kyle Rise', capacity: 50 })} className="flex items-center gap-2 p-2 bg-dark-700 rounded-lg hover:bg-dark-600 text-sm"><ParkingCircle className="w-4 h-4" /> Occupancy</button>
              <button onClick={() => pushWidget('layout', { layout: 'split-h', panels: [{ widget: 'clock', size: 1 }, { widget: 'weather', config: { location: 'Ayr' }, size: 1 }] })} className="flex items-center gap-2 p-2 bg-dark-700 rounded-lg hover:bg-dark-600 text-sm"><Columns className="w-4 h-4" /> Split View</button>
              <button onClick={() => pushWidget('playlist', { items: [{ widget: 'clock', duration: 15 }, { widget: 'weather', config: { location: 'Ayr' }, duration: 15 }, { widget: 'camera-grid', config: { cameras: ['kyle-rise-front', 'kyle-rise-ptz'] }, duration: 20 }], transition: 'fade' })} className="flex items-center gap-2 p-2 bg-dark-700 rounded-lg hover:bg-dark-600 text-sm col-span-2"><Play className="w-4 h-4" /> Demo Playlist</button>
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-dark-800 rounded-xl border border-dark-600 p-4 md:p-6">
            <h3 className="font-medium mb-3">Quick Links</h3>
            <div className="space-y-2 text-sm">
              <a href="?screen=test" className="block text-accent hover:underline">→ Open test display</a>
              <a href="/api/health" target="_blank" className="block text-gray-400 hover:text-white">→ API Health</a>
              <a href="/api/screens" target="_blank" className="block text-gray-400 hover:text-white">→ Screens API</a>
              <a href="/api/playlists" target="_blank" className="block text-gray-400 hover:text-white">→ Playlists API</a>
            </div>
          </div>
        </div>
      </div>
      </div>
      )}
    </div>
  )
  
  async function pushWidget(widget: string, config: any) {
    await fetch('/api/push/widget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: pushTarget, widget, config })
    })
  }
  
  async function pushTemplate(templatePath: string) {
    await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: pushTarget, type: 'url', content: { url: templatePath } })
    })
  }
}

// Helper component for template buttons (reduces repetition)
// Color classes must be written in full for Tailwind purge to detect them
const COLOR_STYLES: Record<string, { hover: string; bg: string; hoverBg: string; border: string }> = {
  accent: { hover: 'hover:from-accent/20', bg: 'bg-accent/20', hoverBg: 'group-hover:bg-accent/30', border: 'hover:border-accent/50' },
  blue: { hover: 'hover:from-blue-500/20', bg: 'bg-blue-500/20', hoverBg: 'group-hover:bg-blue-500/30', border: 'hover:border-blue-500/50' },
  purple: { hover: 'hover:from-purple-500/20', bg: 'bg-purple-500/20', hoverBg: 'group-hover:bg-purple-500/30', border: 'hover:border-purple-500/50' },
  amber: { hover: 'hover:from-amber-500/20', bg: 'bg-amber-500/20', hoverBg: 'group-hover:bg-amber-500/30', border: 'hover:border-amber-500/50' },
  cyan: { hover: 'hover:from-cyan-500/20', bg: 'bg-cyan-500/20', hoverBg: 'group-hover:bg-cyan-500/30', border: 'hover:border-cyan-500/50' },
  orange: { hover: 'hover:from-orange-500/20', bg: 'bg-orange-500/20', hoverBg: 'group-hover:bg-orange-500/30', border: 'hover:border-orange-500/50' },
  green: { hover: 'hover:from-green-500/20', bg: 'bg-green-500/20', hoverBg: 'group-hover:bg-green-500/30', border: 'hover:border-green-500/50' },
  violet: { hover: 'hover:from-violet-500/20', bg: 'bg-violet-500/20', hoverBg: 'group-hover:bg-violet-500/30', border: 'hover:border-violet-500/50' },
  fuchsia: { hover: 'hover:from-fuchsia-500/20', bg: 'bg-fuchsia-500/20', hoverBg: 'group-hover:bg-fuchsia-500/30', border: 'hover:border-fuchsia-500/50' },
  rose: { hover: 'hover:from-rose-500/20', bg: 'bg-rose-500/20', hoverBg: 'group-hover:bg-rose-500/30', border: 'hover:border-rose-500/50' },
  teal: { hover: 'hover:from-teal-500/20', bg: 'bg-teal-500/20', hoverBg: 'group-hover:bg-teal-500/30', border: 'hover:border-teal-500/50' },
  sky: { hover: 'hover:from-sky-500/20', bg: 'bg-sky-500/20', hoverBg: 'group-hover:bg-sky-500/30', border: 'hover:border-sky-500/50' },
  pink: { hover: 'hover:from-pink-500/20', bg: 'bg-pink-500/20', hoverBg: 'group-hover:bg-pink-500/30', border: 'hover:border-pink-500/50' },
  red: { hover: 'hover:from-red-500/20', bg: 'bg-red-500/20', hoverBg: 'group-hover:bg-red-500/30', border: 'hover:border-red-500/50' },
}

function TemplateButton({ icon, label, sub, color, onClick }: {
  icon: React.ReactNode; label: string; sub: string; color: string; onClick: () => void
}) {
  const c = COLOR_STYLES[color] || COLOR_STYLES.accent
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-2.5 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg ${c.hover} hover:to-dark-700 border border-dark-600 ${c.border} transition-all text-sm group`}
    >
      <div className={`w-7 h-7 ${c.bg} rounded-lg flex items-center justify-center ${c.hoverBg} flex-shrink-0`}>
        {icon}
      </div>
      <div className="text-left min-w-0">
        <div className="font-medium text-sm truncate">{label}</div>
        <div className="text-xs text-gray-500 truncate">{sub}</div>
      </div>
    </button>
  )
}

// ===== MAIN APP =====
export default function App() {
  return isDisplayMode ? <DisplayMode /> : <AdminMode />
}
