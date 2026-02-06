import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { io, Socket } from 'socket.io-client'
import { 
  Monitor, LayoutDashboard, MapPin, List, Film, Calendar, Settings, 
  Wifi, WifiOff, RefreshCw, ChevronLeft, ChevronRight, Shield, Link2,
  Building2, ChevronDown
} from 'lucide-react'
import { DashboardPage } from './DashboardPage'
import { ScreensPage } from './ScreensPage'
import { PlaylistsPage } from './PlaylistsPage'
import { ContentPage } from './ContentPage'
import { LocationsPage } from './LocationsPage'
import { SchedulesPage } from './SchedulesPage'
import { SyncGroupsPage } from './SyncGroupsPage'
import { ClientsPage } from './ClientsPage'
import { SettingsPage } from './SettingsPage'

// ===== Client Context =====
interface Client {
  id: string
  name: string
  slug: string
  logo_url?: string
  branding: {
    primaryColor: string
    secondaryColor: string
    accentColor: string
    backgroundColor: string
    textColor: string
    fontFamily: string
    fontFamilyBody: string
    theme: string
    [key: string]: any
  }
  plan: string
  active: boolean
  location_count?: number
  screen_count?: number
  playlist_count?: number
}

interface ClientContextType {
  clients: Client[]
  activeClient: Client | null
  setActiveClientId: (id: string) => void
  refreshClients: () => void
}

const ClientContext = createContext<ClientContextType>({
  clients: [],
  activeClient: null,
  setActiveClientId: () => {},
  refreshClients: () => {},
})

export const useClient = () => useContext(ClientContext)

// ===== Types =====
type Page = 'dashboard' | 'screens' | 'playlists' | 'content' | 'locations' | 'sync' | 'schedules' | 'clients' | 'settings'

const NAV_ITEMS: { id: Page; label: string; icon: any; color: string; platformOnly?: boolean }[] = [
  { id: 'dashboard', label: 'DASHBOARD', icon: LayoutDashboard, color: 'text-accent' },
  { id: 'screens', label: 'SCREENS', icon: Monitor, color: 'text-lcars-blue' },
  { id: 'playlists', label: 'PLAYLISTS', icon: List, color: 'text-lcars-amber' },
  { id: 'content', label: 'CONTENT', icon: Film, color: 'text-lcars-purple' },
  { id: 'locations', label: 'LOCATIONS', icon: MapPin, color: 'text-lcars-teal' },
  { id: 'sync', label: 'SYNC GROUPS', icon: Link2, color: 'text-lcars-pink' },
  { id: 'schedules', label: 'SCHEDULES', icon: Calendar, color: 'text-gray-400' },
  { id: 'clients', label: 'CLIENTS', icon: Building2, color: 'text-accent', platformOnly: true },
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
  client_id?: string
  client_name?: string
  status: string
  connected: boolean
  last_seen?: number
  config: any
  currentMode?: 'signage' | 'interactive'
}

// ===== Client Selector Component =====
function ClientSelector() {
  const { clients, activeClient, setActiveClientId } = useClient()
  const [open, setOpen] = useState(false)

  if (clients.length <= 1) {
    // Single client — just show name, no dropdown
    return activeClient ? (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20">
        <Building2 className="w-3.5 h-3.5 text-accent" />
        <span className="text-xs font-bold tracking-wider text-accent">{activeClient.name.toUpperCase()}</span>
      </div>
    ) : null
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 hover:bg-accent/20 transition"
      >
        <Building2 className="w-3.5 h-3.5 text-accent" />
        <span className="text-xs font-bold tracking-wider text-accent">
          {activeClient?.name.toUpperCase() || 'SELECT CLIENT'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-accent/60 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1 w-64 bg-dark-700 border border-dark-500 rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-dark-600">
              <span className="text-[10px] text-gray-500 tracking-widest">SWITCH CLIENT</span>
            </div>
            {clients.map(client => (
              <button
                key={client.id}
                onClick={() => { setActiveClientId(client.id); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-dark-600 transition ${
                  client.id === activeClient?.id ? 'bg-accent/10 border-l-2 border-accent' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                  style={{ 
                    background: `${client.branding?.primaryColor || '#F97316'}20`,
                    color: client.branding?.primaryColor || '#F97316',
                    border: `1px solid ${client.branding?.primaryColor || '#F97316'}40`,
                  }}>
                  {client.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white font-medium truncate">{client.name}</div>
                  <div className="text-[10px] text-gray-500">
                    {client.screen_count || 0} screens · {client.location_count || 0} locations · {client.plan}
                  </div>
                </div>
                {client.id === activeClient?.id && (
                  <div className="w-2 h-2 rounded-full bg-accent" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ===== Main Layout =====
export function AdminLayout() {
  const [page, setPage] = useState<Page>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [screens, setScreens] = useState<Screen[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [activeClientId, setActiveClientId] = useState<string>('parkwise')

  const activeClient = clients.find(c => c.id === activeClientId) || null

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch('/api/clients')
      const data = await res.json()
      if (data.success) {
        setClients(data.data)
        // If current client doesn't exist in list, switch to first
        if (data.data.length > 0 && !data.data.find((c: Client) => c.id === activeClientId)) {
          setActiveClientId(data.data[0].id)
        }
      }
    } catch (e) { console.error('Failed to fetch clients:', e) }
  }, [activeClientId])

  const fetchScreens = useCallback(async () => {
    try {
      const res = await fetch(`/api/screens?client_id=${activeClientId}`)
      const data = await res.json()
      if (data.success) setScreens(data.data)
    } catch (e) { console.error('Failed to fetch screens:', e) }
  }, [activeClientId])

  useEffect(() => {
    fetchClients()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchScreens()
  }, [activeClientId, fetchScreens])

  useEffect(() => {
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
    <ClientContext.Provider value={{ clients, activeClient, setActiveClientId, refreshClients: fetchClients }}>
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
                <p className="text-[10px] text-gray-500 tracking-widest">SIGNAGE PLATFORM</p>
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
            <div className="flex items-center gap-4">
              <ClientSelector />
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
            {page === 'sync' && <SyncGroupsPage screens={screens} onRefresh={fetchScreens} />}
            {page === 'schedules' && <SchedulesPage />}
            {page === 'clients' && <ClientsPage />}
            {page === 'settings' && <SettingsPage />}
          </div>
        </main>
      </div>
    </ClientContext.Provider>
  )
}
