import { useState, useEffect, useCallback } from 'react'
import { 
  Monitor, Wifi, WifiOff, Send, RefreshCw, Settings, X, MapPin,
  ChevronDown, Eye, Tv, Smartphone, Trash2, Edit3, Save, Filter
} from 'lucide-react'
import type { Screen } from './AdminLayout'

interface Location {
  id: string
  name: string
}

export function ScreensPage({ screens, onRefresh }: { screens: Screen[]; onRefresh: () => void }) {
  const [pushTarget, setPushTarget] = useState('all')
  const [pushUrl, setPushUrl] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const [editingScreen, setEditingScreen] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', location_id: '', group_id: '' })
  const [locations, setLocations] = useState<Location[]>([])
  const [filterLocation, setFilterLocation] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [selectedScreens, setSelectedScreens] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  useEffect(() => {
    fetch('/api/locations').then(r => r.json()).then(d => {
      if (d.success) setLocations(d.data)
    }).catch(() => {})
  }, [])

  const filteredScreens = screens.filter(s => {
    if (filterLocation && s.location_id !== filterLocation) return false
    if (filterStatus === 'online' && !s.connected) return false
    if (filterStatus === 'offline' && s.connected) return false
    return true
  })

  const onlineCount = screens.filter(s => s.connected).length

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

  const reloadScreens = async () => {
    const targets = selectedScreens.size > 0 ? Array.from(selectedScreens) : [pushTarget]
    for (const target of targets) {
      await fetch('/api/reload-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target })
      })
    }
  }

  const clearScreens = async () => {
    await fetch('/api/push/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: pushTarget })
    })
  }

  const deleteScreen = async (id: string) => {
    if (!confirm(`Delete screen "${id}"?`)) return
    await fetch(`/api/screens/${id}`, { method: 'DELETE' })
    onRefresh()
  }

  const startEdit = (screen: Screen) => {
    setEditingScreen(screen.id)
    setEditForm({ name: screen.name, location_id: screen.location_id || '', group_id: screen.group_id })
  }

  const saveEdit = async () => {
    if (!editingScreen) return
    await fetch(`/api/screens/${editingScreen}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm)
    })
    setEditingScreen(null)
    onRefresh()
  }

  const forceMode = async (screenId: string, mode: 'signage' | 'interactive') => {
    await fetch(`/api/screens/${screenId}/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    })
  }

  const toggleSelectScreen = (id: string) => {
    setSelectedScreens(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const bulkAssignPlaylist = async (playlistId: string) => {
    for (const screenId of selectedScreens) {
      await fetch(`/api/playlists/${playlistId}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: screenId })
      })
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="lcars-bar h-2 w-24" />
        <h1 className="text-xl font-bold tracking-widest text-lcars-blue">SCREEN CONTROL</h1>
        <div className="flex-1 h-px bg-gradient-to-r from-blue-500/30 to-transparent" />
        <span className="text-sm text-gray-400">
          {onlineCount} online / {screens.length} total
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Screens list - 3 cols */}
        <div className="xl:col-span-3 space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={filterLocation}
                onChange={e => setFilterLocation(e.target.value)}
                className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-1.5 text-sm text-gray-300"
              >
                <option value="">All Locations</option>
                {locations.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-1.5 text-sm text-gray-300"
              >
                <option value="">All Status</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {selectedScreens.size > 0 && (
                <span className="text-xs text-accent px-2 py-1 bg-accent/10 rounded-lg">
                  {selectedScreens.size} selected
                </span>
              )}
              <button onClick={onRefresh} className="p-2 hover:bg-dark-600 rounded-lg transition text-gray-400">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Screen cards */}
          <div className="space-y-2">
            {filteredScreens.map(screen => (
              <div
                key={screen.id}
                className={`glass glass-hover rounded-xl transition-all ${
                  selectedScreens.has(screen.id) ? 'ring-1 ring-accent/50 bg-accent/5' : ''
                } ${pushTarget === screen.id ? 'ring-1 ring-blue-500/50' : ''}`}
              >
                <div className="flex items-center gap-4 p-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedScreens.has(screen.id)}
                    onChange={() => toggleSelectScreen(screen.id)}
                    className="w-4 h-4 rounded border-dark-500 bg-dark-700 text-accent focus:ring-accent"
                  />

                  {/* Status indicator */}
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                    screen.connected ? 'bg-green-500 animate-pulse' : 'bg-gray-600'
                  }`} />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {editingScreen === screen.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editForm.name}
                          onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                          className="bg-dark-700 border border-dark-500 rounded px-2 py-1 text-sm w-48"
                          autoFocus
                        />
                        <select
                          value={editForm.location_id}
                          onChange={e => setEditForm(f => ({ ...f, location_id: e.target.value }))}
                          className="bg-dark-700 border border-dark-500 rounded px-2 py-1 text-sm"
                        >
                          <option value="">No Location</option>
                          {locations.map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                          ))}
                        </select>
                        <button onClick={saveEdit} className="p-1 text-green-400 hover:bg-green-500/20 rounded">
                          <Save className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingScreen(null)} className="p-1 text-gray-400 hover:bg-dark-600 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{screen.name}</span>
                          {screen.currentMode && screen.connected && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              screen.currentMode === 'interactive' 
                                ? 'bg-purple-500/20 text-purple-400' 
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {screen.currentMode.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                          <span>{screen.id}</span>
                          {screen.location_name && (
                            <>
                              <span>•</span>
                              <MapPin className="w-3 h-3" />
                              <span>{screen.location_name}</span>
                            </>
                          )}
                          {screen.last_seen && (
                            <>
                              <span>•</span>
                              <span>{formatLastSeen(screen.last_seen)}</span>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Status badge */}
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    screen.connected ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500'
                  }`}>
                    {screen.connected ? 'ONLINE' : 'OFFLINE'}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {screen.connected && (
                      <>
                        <button
                          onClick={() => forceMode(screen.id, 'signage')}
                          className="p-1.5 rounded hover:bg-dark-600 text-gray-500 hover:text-blue-400 transition"
                          title="Signage Mode"
                        >
                          <Tv className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => forceMode(screen.id, 'interactive')}
                          className="p-1.5 rounded hover:bg-dark-600 text-gray-500 hover:text-purple-400 transition"
                          title="Interactive Mode"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPushTarget(screen.id)}
                          className={`p-1.5 rounded transition ${
                            pushTarget === screen.id 
                              ? 'bg-accent/20 text-accent' 
                              : 'hover:bg-dark-600 text-gray-500 hover:text-accent'
                          }`}
                          title="Set as push target"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => startEdit(screen)}
                      className="p-1.5 rounded hover:bg-dark-600 text-gray-500 hover:text-white transition"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteScreen(screen.id)}
                      className="p-1.5 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {filteredScreens.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Monitor className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No screens match filters</p>
              </div>
            )}
          </div>
        </div>

        {/* Push controls - 1 col */}
        <div className="space-y-4">
          {/* Push Target */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold tracking-wider text-gray-400 mb-3 flex items-center gap-2">
              <Send className="w-4 h-4 text-accent" />
              PUSH CONTENT
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
                  <option key={s.id} value={s.id}>
                    {s.name} {s.connected ? '🟢' : '⚫'}
                  </option>
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

          {/* Alert */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold tracking-wider text-gray-400 mb-3">PUSH ALERT</h3>
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
                className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium text-sm hover:bg-amber-700 transition"
              >
                Alert
              </button>
            </div>
          </div>

          {/* Bulk actions */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold tracking-wider text-gray-400 mb-3">ACTIONS</h3>
            <div className="space-y-2">
              <button onClick={reloadScreens} className="w-full flex items-center gap-2 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm text-gray-300 hover:text-white hover:border-accent/40 transition">
                <RefreshCw className="w-4 h-4" /> Reload Screens
              </button>
              <button onClick={clearScreens} className="w-full flex items-center gap-2 px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-sm text-gray-300 hover:text-white hover:border-red-500/40 transition">
                <X className="w-4 h-4" /> Clear Screens
              </button>
            </div>
          </div>

          {/* Quick Widgets */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold tracking-wider text-gray-400 mb-3">QUICK PUSH</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Clock', widget: 'clock', config: {} },
                { label: 'Weather', widget: 'weather', config: { location: 'Ayr, Scotland' } },
                { label: 'Occupancy', widget: 'occupancy', config: { siteName: 'Kyle Rise', capacity: 50 } },
                { label: 'Test Card', widget: 'testcard', config: {} },
                { label: 'Ops Dashboard', widget: 'operations-dashboard', config: {} },
                { label: 'Team Feed', widget: 'team-activity', config: {} },
              ].map(w => (
                <button
                  key={w.widget}
                  onClick={() => pushWidget(pushTarget, w.widget, w.config)}
                  className="text-xs px-2 py-2 bg-dark-700 border border-dark-600 rounded-lg text-gray-400 hover:text-white hover:border-accent/30 transition"
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="glass rounded-xl p-5">
            <h3 className="text-sm font-semibold tracking-wider text-gray-400 mb-3">LINKS</h3>
            <div className="space-y-1.5 text-sm">
              <a href="?screen=test" className="block text-accent hover:underline">→ Open test display</a>
              <a href="/api/health" target="_blank" className="block text-gray-400 hover:text-white">→ API Health</a>
              <a href="/api/screens" target="_blank" className="block text-gray-400 hover:text-white">→ Screens API</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

async function pushWidget(target: string, widget: string, config: any) {
  await fetch('/api/push/widget', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target, widget, config })
  })
}

function formatLastSeen(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}
