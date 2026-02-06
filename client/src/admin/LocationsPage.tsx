import { useState, useEffect, useCallback } from 'react'
import { MapPin, Plus, Edit3, Trash2, Save, X, Monitor, Send, Globe } from 'lucide-react'
import type { Screen } from './AdminLayout'

interface Location {
  id: string
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  timezone: string
  screen_count: number
  online_count: number
  config: any
}

export function LocationsPage({ screens, onRefresh }: { screens: Screen[]; onRefresh: () => void }) {
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', latitude: '', longitude: '', timezone: 'Europe/London' })
  const [assignScreenId, setAssignScreenId] = useState('')

  const fetchLocations = useCallback(async () => {
    const res = await fetch('/api/locations')
    const data = await res.json()
    if (data.success) setLocations(data.data)
  }, [])

  useEffect(() => {
    fetchLocations()
  }, [fetchLocations])

  const selected = locations.find(l => l.id === selectedId)

  const startCreate = () => {
    setCreating(true)
    setEditing(true)
    setSelectedId(null)
    setForm({ name: '', address: '', latitude: '', longitude: '', timezone: 'Europe/London' })
  }

  const startEdit = (loc: Location) => {
    setSelectedId(loc.id)
    setEditing(true)
    setCreating(false)
    setForm({
      name: loc.name,
      address: loc.address || '',
      latitude: loc.latitude?.toString() || '',
      longitude: loc.longitude?.toString() || '',
      timezone: loc.timezone,
    })
  }

  const cancelEdit = () => {
    setEditing(false)
    setCreating(false)
  }

  const saveLocation = async () => {
    const body = {
      name: form.name,
      address: form.address || null,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      timezone: form.timezone,
    }

    if (creating) {
      await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
    } else if (selectedId) {
      await fetch(`/api/locations/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
    }

    setEditing(false)
    setCreating(false)
    fetchLocations()
  }

  const deleteLocation = async (id: string) => {
    if (!confirm('Delete this location? Screens will be unassigned.')) return
    await fetch(`/api/locations/${id}`, { method: 'DELETE' })
    if (selectedId === id) setSelectedId(null)
    fetchLocations()
    onRefresh()
  }

  const assignScreen = async () => {
    if (!assignScreenId || !selectedId) return
    await fetch(`/api/locations/${selectedId}/screens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ screenIds: [assignScreenId] })
    })
    setAssignScreenId('')
    onRefresh()
    fetchLocations()
  }

  const pushToLocation = async (locationId: string, widget: string, config: any) => {
    await fetch(`/api/locations/${locationId}/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'widget', content: { widget, config } })
    })
  }

  const screensAtLocation = (locationId: string) => screens.filter(s => s.location_id === locationId)
  const unassignedScreens = screens.filter(s => !s.location_id)

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-2 w-24 bg-gradient-to-r from-teal-500 to-teal-400 rounded-r-full" />
        <h1 className="text-xl font-bold tracking-widest text-lcars-teal">LOCATIONS</h1>
        <div className="flex-1 h-px bg-gradient-to-r from-teal-500/30 to-transparent" />
        <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 bg-accent text-dark-900 rounded-lg text-sm font-medium hover:bg-accent-dim transition">
          <Plus className="w-4 h-4" /> Add Location
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Location cards */}
        <div className="space-y-3">
          {locations.map(loc => (
            <div
              key={loc.id}
              onClick={() => { setSelectedId(loc.id); setEditing(false); setCreating(false) }}
              className={`glass glass-hover rounded-xl p-5 cursor-pointer transition-all ${
                selectedId === loc.id ? 'ring-1 ring-accent/50 bg-accent/5' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-lcars-teal" />
                    <h4 className="font-medium text-sm">{loc.name}</h4>
                  </div>
                  {loc.address && <p className="text-xs text-gray-500 mt-1 ml-6">{loc.address}</p>}
                  <div className="flex items-center gap-3 mt-2 ml-6 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Monitor className="w-3 h-3" /> {loc.screen_count} screens
                    </span>
                    <span className="text-green-400">{loc.online_count} online</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); startEdit(loc) }} className="p-1.5 rounded hover:bg-dark-600 text-gray-500 hover:text-white transition">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteLocation(loc.id) }} className="p-1.5 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {locations.length === 0 && (
            <div className="glass rounded-xl p-8 text-center text-gray-500">
              <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No locations yet</p>
            </div>
          )}
        </div>

        {/* Detail / Editor */}
        <div className="lg:col-span-2">
          {editing ? (
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">{creating ? 'New Location' : 'Edit Location'}</h3>
                <div className="flex gap-2">
                  <button onClick={cancelEdit} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancel</button>
                  <button onClick={saveLocation} className="px-4 py-1.5 bg-accent text-dark-900 rounded-lg text-sm font-medium hover:bg-accent-dim transition flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 tracking-wider block mb-1">NAME</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm"
                    placeholder="Location name..."
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 tracking-wider block mb-1">ADDRESS</label>
                  <input
                    value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm"
                    placeholder="Street address..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 tracking-wider block mb-1">LATITUDE</label>
                    <input
                      value={form.latitude}
                      onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm"
                      placeholder="55.46"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 tracking-wider block mb-1">LONGITUDE</label>
                    <input
                      value={form.longitude}
                      onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm"
                      placeholder="-4.63"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 tracking-wider block mb-1">TIMEZONE</label>
                    <input
                      value={form.timezone}
                      onChange={e => setForm(f => ({ ...f, timezone: e.target.value }))}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : selected ? (
            <div className="space-y-6">
              <div className="glass rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-lcars-teal" />
                      {selected.name}
                    </h3>
                    {selected.address && <p className="text-sm text-gray-500 mt-1">{selected.address}</p>}
                  </div>
                  <button
                    onClick={() => startEdit(selected)}
                    className="px-3 py-1.5 bg-dark-600 border border-dark-500 rounded-lg text-sm hover:bg-dark-500 transition"
                  >
                    Edit
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="bg-dark-700/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Coordinates</div>
                    <div className="text-white mt-1">
                      {selected.latitude && selected.longitude 
                        ? `${selected.latitude.toFixed(4)}, ${selected.longitude.toFixed(4)}`
                        : 'Not set'}
                    </div>
                  </div>
                  <div className="bg-dark-700/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Timezone</div>
                    <div className="text-white mt-1">{selected.timezone}</div>
                  </div>
                  <div className="bg-dark-700/50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">Screens</div>
                    <div className="text-white mt-1">{selected.screen_count} total, {selected.online_count} online</div>
                  </div>
                </div>
              </div>

              {/* Screens at this location */}
              <div className="glass rounded-xl p-6">
                <h4 className="text-sm font-semibold tracking-wider text-gray-400 mb-4">SCREENS AT THIS LOCATION</h4>
                <div className="space-y-2">
                  {screensAtLocation(selected.id).map(screen => (
                    <div key={screen.id} className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg">
                      <div className={`w-2.5 h-2.5 rounded-full ${screen.connected ? 'bg-green-500' : 'bg-gray-600'}`} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{screen.name}</div>
                        <div className="text-xs text-gray-500">{screen.id}</div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        screen.connected ? 'bg-green-500/20 text-green-400' : 'bg-gray-600/20 text-gray-500'
                      }`}>
                        {screen.connected ? 'ONLINE' : 'OFFLINE'}
                      </span>
                    </div>
                  ))}
                  {screensAtLocation(selected.id).length === 0 && (
                    <p className="text-sm text-gray-500">No screens assigned</p>
                  )}
                </div>

                {/* Assign screen */}
                {unassignedScreens.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-dark-600">
                    <div className="flex gap-2">
                      <select
                        value={assignScreenId}
                        onChange={e => setAssignScreenId(e.target.value)}
                        className="flex-1 bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="">Assign a screen...</option>
                        {unassignedScreens.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                        ))}
                      </select>
                      <button
                        onClick={assignScreen}
                        disabled={!assignScreenId}
                        className="px-4 py-2 bg-accent text-dark-900 rounded-lg text-sm font-medium hover:bg-accent-dim transition disabled:opacity-50"
                      >
                        Assign
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Push to location */}
              <div className="glass rounded-xl p-6">
                <h4 className="text-sm font-semibold tracking-wider text-gray-400 mb-4">PUSH TO ALL SCREENS</h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => pushToLocation(selected.id, 'clock', {})}
                    className="text-xs px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-gray-400 hover:text-white hover:border-accent/30 transition"
                  >
                    Clock
                  </button>
                  <button
                    onClick={() => pushToLocation(selected.id, 'weather', { location: 'Ayr, Scotland' })}
                    className="text-xs px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-gray-400 hover:text-white hover:border-accent/30 transition"
                  >
                    Weather
                  </button>
                  <button
                    onClick={() => pushToLocation(selected.id, 'occupancy', { siteName: selected.name, capacity: 50 })}
                    className="text-xs px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-gray-400 hover:text-white hover:border-accent/30 transition"
                  >
                    Occupancy
                  </button>
                  <button
                    onClick={() => pushToLocation(selected.id, 'testcard', {})}
                    className="text-xs px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-gray-400 hover:text-white hover:border-accent/30 transition"
                  >
                    Test Card
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass rounded-xl p-12 text-center text-gray-500">
              <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a location to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
