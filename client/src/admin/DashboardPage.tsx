import { useState, useEffect } from 'react'
import { Monitor, MonitorOff, List, MapPin, Calendar, Film, Zap, Shield, Activity, Clock } from 'lucide-react'
import type { Screen } from './AdminLayout'

interface DashboardStats {
  screens: { total: number; online: number; offline: number }
  playlists: { total: number }
  locations: { total: number }
  schedules: { active: number }
  content: { widgets: number; templates: number }
  screensByLocation: { location: string; count: number }[]
  recentEvents: any[]
}

export function DashboardPage({ screens }: { screens: Screen[] }) {
  const [stats, setStats] = useState<DashboardStats | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.data) })
      .catch(console.error)
    
    const interval = setInterval(() => {
      fetch('/api/dashboard/stats')
        .then(r => r.json())
        .then(d => { if (d.success) setStats(d.data) })
        .catch(() => {})
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const onlineCount = screens.filter(s => s.connected).length
  const offlineCount = screens.length - onlineCount

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* LCARS-style top bar decoration */}
      <div className="flex items-center gap-4">
        <div className="lcars-bar h-2 w-32" />
        <h1 className="text-2xl font-bold tracking-widest text-accent">SYSTEM STATUS</h1>
        <div className="flex-1 h-px bg-gradient-to-r from-accent/30 to-transparent" />
        <span className="text-xs text-gray-500 tracking-wider">{new Date().toLocaleTimeString('en-GB')}</span>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Monitor} label="TOTAL SCREENS" value={stats?.screens.total ?? screens.length} color="accent" />
        <StatCard icon={Zap} label="ONLINE" value={onlineCount} color="green" />
        <StatCard icon={MonitorOff} label="OFFLINE" value={offlineCount} color="red" />
        <StatCard icon={List} label="PLAYLISTS" value={stats?.playlists.total ?? 0} color="amber" />
        <StatCard icon={MapPin} label="LOCATIONS" value={stats?.locations.total ?? 0} color="teal" />
        <StatCard icon={Calendar} label="SCHEDULES" value={stats?.schedules.active ?? 0} color="pink" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Screen Status Overview */}
        <div className="lg:col-span-2 glass rounded-xl p-6">
          <h3 className="text-sm font-semibold tracking-wider text-gray-400 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" />
            SCREEN STATUS
          </h3>
          <div className="space-y-2">
            {screens.length === 0 ? (
              <p className="text-gray-500 text-sm">No screens registered</p>
            ) : (
              screens.map(screen => (
                <div key={screen.id} className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                    screen.connected ? 'bg-green-500 animate-pulse' : 'bg-gray-600'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{screen.name}</div>
                    <div className="text-xs text-gray-500">{screen.id} • {screen.location_name || 'No location'}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    screen.connected 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-gray-600/20 text-gray-500'
                  }`}>
                    {screen.connected ? 'ONLINE' : 'OFFLINE'}
                  </span>
                  {screen.connected && screen.currentMode && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      screen.currentMode === 'interactive' 
                        ? 'bg-purple-500/20 text-purple-400' 
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {screen.currentMode.toUpperCase()}
                    </span>
                  )}
                  {screen.last_seen && (
                    <span className="text-xs text-gray-600">
                      {formatLastSeen(screen.last_seen)}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Locations breakdown */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-sm font-semibold tracking-wider text-gray-400 mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-lcars-teal" />
              LOCATIONS
            </h3>
            <div className="space-y-3">
              {stats?.screensByLocation?.map((loc, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{loc.location}</span>
                  <span className="text-sm text-accent font-bold">{loc.count}</span>
                </div>
              )) || <p className="text-gray-500 text-xs">Loading...</p>}
            </div>
          </div>

          {/* Content summary */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-sm font-semibold tracking-wider text-gray-400 mb-4 flex items-center gap-2">
              <Film className="w-4 h-4 text-lcars-purple" />
              CONTENT LIBRARY
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Widgets</span>
                <span className="text-white font-medium">{stats?.content.widgets ?? 18}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Templates</span>
                <span className="text-white font-medium">{stats?.content.templates ?? 5}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Playlists</span>
                <span className="text-white font-medium">{stats?.playlists.total ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-sm font-semibold tracking-wider text-gray-400 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" />
              QUICK ACTIONS
            </h3>
            <div className="space-y-2">
              <QuickAction label="Reload All Screens" color="accent" onClick={() => fetch('/api/reload-all', { method: 'POST' })} />
              <QuickAction label="Clear All Screens" color="red" onClick={() => fetch('/api/push/clear', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({target:'all'}) })} />
              <QuickAction label="Push Test Alert" color="amber" onClick={() => fetch('/api/push/alert', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({target:'all', message:'System test', level:'info', duration:5000}) })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  const colorClasses: Record<string, string> = {
    accent: 'bg-accent/10 text-accent border-accent/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    teal: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    pink: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  }

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color] || colorClasses.accent}`}>
      <Icon className="w-5 h-5 mb-2 opacity-70" />
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs tracking-wider opacity-60 mt-1">{label}</div>
    </div>
  )
}

function QuickAction({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  const colorClasses: Record<string, string> = {
    accent: 'hover:bg-accent/20 hover:text-accent hover:border-accent/40',
    red: 'hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/40',
    amber: 'hover:bg-amber-500/20 hover:text-amber-400 hover:border-amber-500/40',
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left text-sm px-3 py-2 rounded-lg border border-dark-600 text-gray-400 transition ${colorClasses[color]}`}
    >
      {label}
    </button>
  )
}

function formatLastSeen(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}
