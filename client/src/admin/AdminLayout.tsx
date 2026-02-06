import { useState, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { 
  Monitor, LayoutDashboard, MapPin, List, Film, Calendar, Settings, 
  Wifi, WifiOff, RefreshCw, ChevronLeft, ChevronRight, Shield
} from 'lucide-react'
import { DashboardPage } from './DashboardPage'
import { ScreensPage } from './ScreensPage'
import { PlaylistsPage } from './PlaylistsPage'
import { ContentPage } from './ContentPage'
import { LocationsPage } from './LocationsPage'
import { SchedulesPage } from './SchedulesPage'
import { SettingsPage } from './SettingsPage'

type Page = 'dashboard' | 'screens' | 'playlists' | 'content' | 'locations' | 'schedules' | 'settings'

const NAV_ITEMS: { id: Page; label: string; icon: any; color: string }[] = [
  { id: 'dashboard', label: 'DASHBOARD', icon: LayoutDashboard, color: 'text-accent' },
  { id: 'screens', label: 'SCREENS', icon: Monitor, color: 'text-lcars-blue' },
  { id: 'playlists', label: 'PLAYLISTS', icon: List, color: 'text-lcars-amber' },
  { id: 'content', label: 'CONTENT', icon: Film, color: 'text-lcars-purple' },
  { id: 'locations', label: 'LOCATIONS', icon: MapPin, color: 'text-lcars-teal' },
  { id: 'schedules', label: 'SCHEDULES', icon: Calendar, color: 'text-lcars-pink' },
  { id: 'settings', label: 'SETTINGS', icon: Settings, color: 'text-gray-400' },
]

export interface Screen {
  id: string
  name: string
  group_id: string
  type: string
  location?: string
  location_id?: string
  location_name?: string
  status: string
  connected: boolean
  last_seen?: number
  config: any
  currentMode?: 'signage' | 'interactive'
}

export function AdminLayout() {
  const [page, setPage] = useState<Page>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [screens, setScreens] = useState<Screen[]>([])

  const fetchScreens = useCallback(async () => {
    try {
      const res = await fetch('/api/screens')
      const data = await res.json()
      if (data.success) setScreens(data.data)
    } catch (e) { console.error('Failed to fetch screens:', e) }
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
    setSocket(s)
    return () => { s.disconnect() }
  }, [fetchScreens])

  // Hash-based routing
  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as Page
    if (NAV_ITEMS.find(n => n.id === hash)) setPage(hash)
    
    const onHashChange = () => {
      const h = window.location.hash.replace('#', '') as Page
      if (NAV_ITEMS.find(n => n.id === h)) setPage(h)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigateTo = (p: Page) => {
    setPage(p)
    window.location.hash = p
  }

  const onlineCount = screens.filter(s => s.connected).length

  return (
    <div className="h-screen flex overflow-hidden bg-dark-900">
      {/* Sidebar */}
      <aside className={`flex-shrink-0 flex flex-col border-r border-dark-600 bg-dark-800 transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-56'
      }`}>
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-dark-600 h-16">
          <div className="w-8 h-8 bg-accent/20 border border-accent rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-accent" />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold tracking-wider text-accent">SKYNET</h1>
              <p className="text-[10px] text-gray-500 tracking-widest">SIGNAGE</p>
            </div>
          )}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-2 space-y-1 px-2 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = page === item.id
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-accent/15 text-accent border-l-2 border-accent'
                    : 'text-gray-400 hover:text-white hover:bg-dark-700'
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${active ? 'text-accent' : item.color}`} />
                {!sidebarCollapsed && <span className="tracking-wider">{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Connection status + collapse toggle */}
        <div className="p-3 border-t border-dark-600 space-y-2">
          {!sidebarCollapsed && (
            <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs ${
              connected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            }`}>
              {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{connected ? 'Connected' : 'Disconnected'}</span>
              <span className="ml-auto text-gray-500">{onlineCount}/{screens.length}</span>
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-dark-700 transition"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Top bar */}
        <header className="flex-shrink-0 flex items-center justify-between h-16 px-6 border-b border-dark-600 bg-dark-800/50">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold tracking-wider">
              {NAV_ITEMS.find(n => n.id === page)?.label}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchScreens} className="p-2 hover:bg-dark-600 rounded-lg transition text-gray-400 hover:text-white">
              <RefreshCw className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {onlineCount} screens online
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-6">
          {page === 'dashboard' && <DashboardPage screens={screens} />}
          {page === 'screens' && <ScreensPage screens={screens} onRefresh={fetchScreens} />}
          {page === 'playlists' && <PlaylistsPage screens={screens} />}
          {page === 'content' && <ContentPage />}
          {page === 'locations' && <LocationsPage screens={screens} onRefresh={fetchScreens} />}
          {page === 'schedules' && <SchedulesPage />}
          {page === 'settings' && <SettingsPage />}
        </div>
      </main>
    </div>
  )
}
