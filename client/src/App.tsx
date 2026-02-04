import { useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { Monitor, Tv, AlertCircle, Settings, Send, RefreshCw, Wifi, WifiOff, Layout, X, Clock, Cloud, Camera, BarChart3, ParkingCircle, Play, Columns, AlertTriangle, Home, Activity, Sun, Zap, List } from 'lucide-react'
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
import { TemplateWidget } from './widgets/TemplateWidget'
import { PlaylistPlayer, Playlist } from './widgets/PlaylistPlayer'
import { PlaylistManager } from './components/PlaylistManager'

// Determine mode from URL params
const params = new URLSearchParams(window.location.search)
const isDisplayMode = params.has('screen') || params.has('display')
const screenId = params.get('screen') || params.get('id') || `screen-${Math.random().toString(36).slice(2, 8)}`

interface Screen {
  id: string
  name: string
  group_id: string
  type: string
  location?: string
  status: string
  connected: boolean
  last_seen?: number
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

  useEffect(() => {
    const s = io(window.location.origin, { 
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    })
    
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
    
    s.on('content', (payload: ContentPayload) => {
      console.log('📺 Content received:', payload)
      
      if (payload.type === 'alert') {
        // Alerts overlay on top of everything
        setAlert(payload.content)
        if (payload.duration) {
          setTimeout(() => setAlert(null), payload.duration)
        }
      } else if (payload.type === 'clear') {
        setCurrentContent(null)
        setCurrentPlaylist(null)
        setAlert(null)
      } else if (payload.type === 'reload') {
        // Force browser refresh to load new code
        console.log('🔄 Reload requested')
        window.location.reload()
      } else if (payload.type === 'playlist') {
        // Playlist takes over the display
        console.log('📋 Playlist received:', payload.content)
        setCurrentPlaylist(payload.content as Playlist)
        setCurrentContent(null) // Clear any non-playlist content
      } else {
        // Other content (url, widget, media) interrupts playlist
        setCurrentContent(payload)
        setCurrentPlaylist(null)
      }
    })
    
    setSocket(s)
    return () => { s.disconnect() }
  }, [])

  // Heartbeat
  useEffect(() => {
    if (!socket) return
    const interval = setInterval(() => socket.emit('heartbeat'), 30000)
    return () => clearInterval(interval)
  }, [socket])

  return (
    <div className="fixed inset-0 bg-dark-900">
      {/* Fullscreen prompt overlay */}
      {showFullscreenPrompt && !isFullscreen && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] cursor-pointer"
          onClick={requestFullscreen}
        >
          <div className="text-center animate-pulse">
            <Tv className="w-20 h-20 mx-auto mb-6 text-accent" />
            <h2 className="text-2xl font-light text-white mb-2">Click anywhere to enter fullscreen</h2>
            <p className="text-gray-500 text-sm">{screenId}</p>
          </div>
        </div>
      )}

      {/* Connection indicator */}
      <div className={`fixed top-4 right-4 flex items-center gap-2 text-xs px-3 py-1.5 rounded-full ${
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
        </div>
      )}
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
  const [activeTab, setActiveTab] = useState<'screens' | 'playlists'>('screens')

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
    setSocket(s)
    
    return () => { s.disconnect() }
  }, [fetchScreens])
  
  const handlePlaylistPush = (playlistId: string, target: string) => {
    console.log(`📋 Pushed playlist ${playlistId} to ${target}`)
    // Could add toast notification here
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

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between p-6 border-b border-dark-700">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-accent/20 border border-accent rounded-lg flex items-center justify-center">
            <Monitor className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">SKYNET Signage</h1>
            <p className="text-sm text-gray-500">Display Control System</p>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-dark-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('screens')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === 'screens' 
                ? 'bg-accent text-dark-900' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Monitor className="w-4 h-4 inline mr-2" />
            Screens
          </button>
          <button
            onClick={() => setActiveTab('playlists')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === 'playlists' 
                ? 'bg-accent text-dark-900' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <List className="w-4 h-4 inline mr-2" />
            Playlists
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {connected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {connected ? 'Connected' : 'Disconnected'}
          </div>
          <button onClick={fetchScreens} className="p-2 hover:bg-dark-600 rounded-lg transition">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Playlist Manager Tab */}
      {activeTab === 'playlists' && (
        <div className="flex-1 overflow-hidden">
          <PlaylistManager 
            screens={screens} 
            onPush={handlePlaylistPush}
          />
        </div>
      )}

      {/* Screens Tab */}
      {activeTab === 'screens' && (
      <div className="flex-1 p-6 overflow-y-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Screens list */}
        <div className="lg:col-span-2 bg-dark-800 rounded-xl border border-dark-600 p-6">
          <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Layout className="w-5 h-5 text-accent" />
            Screens ({screens.length})
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
                  onClick={() => setPushTarget(pushTarget === screen.id ? 'all' : screen.id)}
                  className={`flex items-center justify-between p-4 rounded-lg border transition cursor-pointer ${
                    pushTarget === screen.id
                      ? 'bg-accent/20 border-accent ring-2 ring-accent/50'
                      : screen.connected 
                        ? 'bg-dark-700 border-green-500/30 hover:bg-dark-600' 
                        : 'bg-dark-700/50 border-dark-600 hover:bg-dark-600/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      pushTarget === screen.id 
                        ? 'bg-accent animate-pulse' 
                        : screen.connected 
                          ? 'bg-green-500 animate-pulse' 
                          : 'bg-gray-600'
                    }`} />
                    <div>
                      <div className="font-medium">{screen.name}</div>
                      <div className="text-sm text-gray-500">{screen.id} • {screen.group_id}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
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
              ))}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-6">
          {/* Push URL */}
          <div className="bg-dark-800 rounded-xl border border-dark-600 p-6">
            <h3 className="font-medium mb-4 flex items-center gap-2">
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
                  <option key={s.id} value={s.id}>{s.name}</option>
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
          <div className="bg-dark-800 rounded-xl border border-dark-600 p-6">
            <h3 className="font-medium mb-4 flex items-center gap-2">
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

          {/* Branded Templates */}
          <div className="bg-dark-800 rounded-xl border border-accent/30 p-6">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" />
              Branded Templates
            </h3>
            <p className="text-xs text-gray-500 mb-3">Quick-push ParkWise branded displays</p>
            <div className="space-y-2">
              <button 
                onClick={() => pushTemplate('/templates/welcome.html')}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg hover:from-accent/20 hover:to-dark-700 border border-dark-600 hover:border-accent/50 transition-all text-sm group"
              >
                <div className="w-8 h-8 bg-accent/20 rounded-lg flex items-center justify-center group-hover:bg-accent/30">
                  <Home className="w-4 h-4 text-accent" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Welcome Screen</div>
                  <div className="text-xs text-gray-500">Reception & entrance display</div>
                </div>
              </button>
              <button 
                onClick={() => pushTemplate('/templates/dashboard.html')}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg hover:from-blue-500/20 hover:to-dark-700 border border-dark-600 hover:border-blue-500/50 transition-all text-sm group"
              >
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center group-hover:bg-blue-500/30">
                  <BarChart3 className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Operations Dashboard</div>
                  <div className="text-xs text-gray-500">Live stats & monitoring</div>
                </div>
              </button>
              <button 
                onClick={() => pushTemplate('/templates/activity-feed.html')}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg hover:from-purple-500/20 hover:to-dark-700 border border-dark-600 hover:border-purple-500/50 transition-all text-sm group"
              >
                <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/30">
                  <Activity className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Activity Feed</div>
                  <div className="text-xs text-gray-500">Team timeline & tasks</div>
                </div>
              </button>
              <button 
                onClick={() => pushTemplate('/templates/ambient.html')}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg hover:from-amber-500/20 hover:to-dark-700 border border-dark-600 hover:border-amber-500/50 transition-all text-sm group"
              >
                <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center group-hover:bg-amber-500/30">
                  <Sun className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Ambient Clock/Weather</div>
                  <div className="text-xs text-gray-500">Break rooms & hallways</div>
                </div>
              </button>
              <button 
                onClick={() => pushTemplate('http://10.10.10.123:3800/')}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg hover:from-cyan-500/20 hover:to-dark-700 border border-dark-600 hover:border-cyan-500/50 transition-all text-sm group"
              >
                <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center group-hover:bg-cyan-500/30">
                  <Monitor className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium">HQ Mission Control</div>
                  <div className="text-xs text-gray-500">Command center dashboard</div>
                </div>
              </button>
              <button 
                onClick={() => pushTemplate('http://10.10.10.123:5180/')}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg hover:from-orange-500/20 hover:to-dark-700 border border-dark-600 hover:border-orange-500/50 transition-all text-sm group"
              >
                <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center group-hover:bg-orange-500/30">
                  <Layout className="w-4 h-4 text-orange-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium">LCARS Interface</div>
                  <div className="text-xs text-gray-500">Star Trek NOC display</div>
                </div>
              </button>
              <button 
                onClick={() => pushTemplate('http://10.10.10.123:5173/')}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg hover:from-green-500/20 hover:to-dark-700 border border-dark-600 hover:border-green-500/50 transition-all text-sm group"
              >
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center group-hover:bg-green-500/30">
                  <ParkingCircle className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium">POS Dashboard</div>
                  <div className="text-xs text-gray-500">Parking operations system</div>
                </div>
              </button>
              <button 
                onClick={() => pushTemplate('http://10.10.10.123:8501/')}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg hover:from-sky-500/20 hover:to-dark-700 border border-dark-600 hover:border-sky-500/50 transition-all text-sm group"
              >
                <div className="w-8 h-8 bg-sky-500/20 rounded-lg flex items-center justify-center group-hover:bg-sky-500/30">
                  <Zap className="w-4 h-4 text-sky-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium">AirWave Mission Control</div>
                  <div className="text-xs text-gray-500">Aviation tracking system</div>
                </div>
              </button>
              <button 
                onClick={() => pushTemplate('http://10.10.10.123:3847/')}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg hover:from-pink-500/20 hover:to-dark-700 border border-dark-600 hover:border-pink-500/50 transition-all text-sm group"
              >
                <div className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center group-hover:bg-pink-500/30">
                  <Zap className="w-4 h-4 text-pink-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Ideate Board</div>
                  <div className="text-xs text-gray-500">Ideas & project planning</div>
                </div>
              </button>
              <button 
                onClick={() => pushTemplate('http://10.10.10.123:3210/')}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg hover:from-violet-500/20 hover:to-dark-700 border border-dark-600 hover:border-violet-500/50 transition-all text-sm group"
              >
                <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center group-hover:bg-violet-500/30">
                  <Monitor className="w-4 h-4 text-violet-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Skynet Command Center</div>
                  <div className="text-xs text-gray-500">Main dashboard hub</div>
                </div>
              </button>
              <button 
                onClick={() => pushTemplate('http://10.10.10.123:3210/memory')}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg hover:from-fuchsia-500/20 hover:to-dark-700 border border-dark-600 hover:border-fuchsia-500/50 transition-all text-sm group"
              >
                <div className="w-8 h-8 bg-fuchsia-500/20 rounded-lg flex items-center justify-center group-hover:bg-fuchsia-500/30">
                  <Activity className="w-4 h-4 text-fuchsia-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Memory Visualization</div>
                  <div className="text-xs text-gray-500">3D neural architecture</div>
                </div>
              </button>
              <button 
                onClick={() => pushTemplate('http://10.10.10.123:3210/sa')}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg hover:from-rose-500/20 hover:to-dark-700 border border-dark-600 hover:border-rose-500/50 transition-all text-sm group"
              >
                <div className="w-8 h-8 bg-rose-500/20 rounded-lg flex items-center justify-center group-hover:bg-rose-500/30">
                  <Camera className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Situational Awareness</div>
                  <div className="text-xs text-gray-500">Live overview display</div>
                </div>
              </button>
              <button 
                onClick={() => pushTemplate('http://10.10.10.123:3280/')}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg hover:from-teal-500/20 hover:to-dark-700 border border-dark-600 hover:border-teal-500/50 transition-all text-sm group"
              >
                <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center group-hover:bg-teal-500/30">
                  <Wifi className="w-4 h-4 text-teal-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Skynet Voice</div>
                  <div className="text-xs text-gray-500">Bidirectional voice interface</div>
                </div>
              </button>
              <button 
                onClick={() => pushWidget('rangers', {})}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg hover:from-blue-600/20 hover:to-dark-700 border border-dark-600 hover:border-blue-600/50 transition-all text-sm group"
              >
                <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center group-hover:bg-blue-600/30">
                  <span className="text-lg">🔵</span>
                </div>
                <div className="text-left">
                  <div className="font-medium">Rangers FC</div>
                  <div className="text-xs text-gray-500">News, fixtures & results</div>
                </div>
              </button>
              <button 
                onClick={() => pushWidget('celtic', {})}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg hover:from-green-600/20 hover:to-dark-700 border border-dark-600 hover:border-green-600/50 transition-all text-sm group"
              >
                <div className="w-8 h-8 bg-green-600/20 rounded-lg flex items-center justify-center group-hover:bg-green-600/30">
                  <span className="text-lg">🍀</span>
                </div>
                <div className="text-left">
                  <div className="font-medium">Celtic FC</div>
                  <div className="text-xs text-gray-500">News, fixtures & results</div>
                </div>
              </button>
              <button 
                onClick={() => pushWidget('sports', { team: 'ayr-united' })}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg hover:from-gray-500/20 hover:to-dark-700 border border-dark-600 hover:border-gray-500/50 transition-all text-sm group"
              >
                <div className="w-8 h-8 bg-gray-500/20 rounded-lg flex items-center justify-center group-hover:bg-gray-500/30">
                  <span className="text-lg">⚫</span>
                </div>
                <div className="text-left">
                  <div className="font-medium">Ayr United</div>
                  <div className="text-xs text-gray-500">Local team news & fixtures</div>
                </div>
              </button>
              <button 
                onClick={() => pushTemplate('/templates/alert.html?level=info&title=System%20Notice&message=All%20systems%20operational')}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg hover:from-red-500/20 hover:to-dark-700 border border-dark-600 hover:border-red-500/50 transition-all text-sm group"
              >
                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center group-hover:bg-red-500/30">
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Alert Template</div>
                  <div className="text-xs text-gray-500">Emergency notifications</div>
                </div>
              </button>
            </div>
          </div>

          {/* Camera Views */}
          <div className="bg-dark-800 rounded-xl border border-dark-600 p-6">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <Camera className="w-4 h-4 text-accent" />
              Camera Views
            </h3>
            <p className="text-xs text-gray-500 mb-3">Live camera feeds via go2rtc</p>
            <div className="space-y-2">
              <button 
                onClick={() => pushWidget('camera', { src: 'kyle-rise-front', go2rtcHost: '10.10.10.123:1984' })}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg hover:from-emerald-500/20 hover:to-dark-700 border border-dark-600 hover:border-emerald-500/50 transition-all text-sm group"
              >
                <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center group-hover:bg-emerald-500/30">
                  <Camera className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Kyle Rise - Front</div>
                  <div className="text-xs text-gray-500">Main entrance camera</div>
                </div>
              </button>
              <button 
                onClick={() => pushWidget('camera', { src: 'kyle-rise-rear', go2rtcHost: '10.10.10.123:1984' })}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg hover:from-emerald-500/20 hover:to-dark-700 border border-dark-600 hover:border-emerald-500/50 transition-all text-sm group"
              >
                <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center group-hover:bg-emerald-500/30">
                  <Camera className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Kyle Rise - Rear</div>
                  <div className="text-xs text-gray-500">Back entrance view</div>
                </div>
              </button>
              <button 
                onClick={() => pushWidget('camera', { src: 'kyle-rise-ptz', go2rtcHost: '10.10.10.123:1984' })}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg hover:from-emerald-500/20 hover:to-dark-700 border border-dark-600 hover:border-emerald-500/50 transition-all text-sm group"
              >
                <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center group-hover:bg-emerald-500/30">
                  <Camera className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Kyle Rise - PTZ</div>
                  <div className="text-xs text-gray-500">Pan-tilt-zoom camera</div>
                </div>
              </button>
              <button 
                onClick={() => pushWidget('camera', { src: 'kyle-surface-anpr', go2rtcHost: '10.10.10.123:1984' })}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg hover:from-lime-500/20 hover:to-dark-700 border border-dark-600 hover:border-lime-500/50 transition-all text-sm group"
              >
                <div className="w-8 h-8 bg-lime-500/20 rounded-lg flex items-center justify-center group-hover:bg-lime-500/30">
                  <Camera className="w-4 h-4 text-lime-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Kyle Surface - ANPR</div>
                  <div className="text-xs text-gray-500">Number plate recognition</div>
                </div>
              </button>
              <button 
                onClick={() => pushWidget('camera', { src: 'greenford-overview', go2rtcHost: '10.10.10.123:1984' })}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg hover:from-yellow-500/20 hover:to-dark-700 border border-dark-600 hover:border-yellow-500/50 transition-all text-sm group"
              >
                <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center group-hover:bg-yellow-500/30">
                  <Camera className="w-4 h-4 text-yellow-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Greenford Overview</div>
                  <div className="text-xs text-gray-500">Site overview camera</div>
                </div>
              </button>
              <button 
                onClick={() => pushWidget('camera-grid', { cameras: ['kyle-rise-front', 'kyle-rise-rear', 'kyle-rise-ptz', 'kyle-surface-anpr'], go2rtcHost: '10.10.10.123:1984' })}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg hover:from-indigo-500/20 hover:to-dark-700 border border-dark-600 hover:border-indigo-500/50 transition-all text-sm group"
              >
                <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center group-hover:bg-indigo-500/30">
                  <Columns className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Kyle Sites Grid</div>
                  <div className="text-xs text-gray-500">4-camera overview</div>
                </div>
              </button>
              <button 
                onClick={() => pushWidget('camera-grid', { cameras: ['kyle-rise-front', 'kyle-rise-rear', 'kyle-surface-anpr', 'greenford-overview'], go2rtcHost: '10.10.10.123:1984' })}
                className="w-full flex items-center gap-3 p-3 bg-gradient-to-r from-dark-700 to-dark-700/50 rounded-lg hover:from-indigo-500/20 hover:to-dark-700 border border-dark-600 hover:border-indigo-500/50 transition-all text-sm group"
              >
                <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center group-hover:bg-indigo-500/30">
                  <Columns className="w-4 h-4 text-indigo-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium">All Sites Grid</div>
                  <div className="text-xs text-gray-500">Multi-site overview</div>
                </div>
              </button>
            </div>
          </div>

          {/* Widget Presets */}
          <div className="bg-dark-800 rounded-xl border border-dark-600 p-6">
            <h3 className="font-medium mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent" />
              Quick Widgets
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => pushWidget('clock', {})}
                className="flex items-center gap-2 p-2 bg-dark-700 rounded-lg hover:bg-dark-600 text-sm"
              >
                <Clock className="w-4 h-4" /> Clock
              </button>
              <button 
                onClick={() => pushWidget('weather', { location: 'Ayr, Scotland' })}
                className="flex items-center gap-2 p-2 bg-dark-700 rounded-lg hover:bg-dark-600 text-sm"
              >
                <Cloud className="w-4 h-4" /> Weather
              </button>
              <button 
                onClick={() => pushWidget('camera-grid', { 
                  cameras: ['kyle-rise-front', 'kyle-rise-ptz', 'kyle-rise-rear', 'kyle-surface-anpr']
                })}
                className="flex items-center gap-2 p-2 bg-dark-700 rounded-lg hover:bg-dark-600 text-sm"
              >
                <Camera className="w-4 h-4" /> Cameras
              </button>
              <button 
                onClick={() => pushWidget('occupancy', { 
                  siteName: 'Kyle Rise', 
                  capacity: 50 
                })}
                className="flex items-center gap-2 p-2 bg-dark-700 rounded-lg hover:bg-dark-600 text-sm"
              >
                <ParkingCircle className="w-4 h-4" /> Occupancy
              </button>
              <button 
                onClick={() => pushWidget('layout', { 
                  layout: 'split-h',
                  panels: [
                    { widget: 'clock', size: 1 },
                    { widget: 'weather', config: { location: 'Ayr' }, size: 1 }
                  ]
                })}
                className="flex items-center gap-2 p-2 bg-dark-700 rounded-lg hover:bg-dark-600 text-sm"
              >
                <Columns className="w-4 h-4" /> Split View
              </button>
              <button 
                onClick={() => pushWidget('playlist', { 
                  items: [
                    { widget: 'clock', duration: 15 },
                    { widget: 'weather', config: { location: 'Ayr' }, duration: 15 },
                    { widget: 'camera-grid', config: { cameras: ['kyle-rise-front', 'kyle-rise-ptz'] }, duration: 20 }
                  ],
                  transition: 'fade'
                })}
                className="flex items-center gap-2 p-2 bg-dark-700 rounded-lg hover:bg-dark-600 text-sm"
              >
                <Play className="w-4 h-4" /> Playlist
              </button>
            </div>
          </div>

          {/* Quick links */}
          <div className="bg-dark-800 rounded-xl border border-dark-600 p-6">
            <h3 className="font-medium mb-4">Quick Links</h3>
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

// ===== MAIN APP =====
export default function App() {
  return isDisplayMode ? <DisplayMode /> : <AdminMode />
}
