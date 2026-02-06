import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, Play, Save, X, Edit3, Send, Clock, Film, Layout, Grip } from 'lucide-react'
import type { Screen } from './AdminLayout'

interface PlaylistItem {
  id: string
  contentType: 'video' | 'template' | 'widget' | 'url'
  contentId?: string
  url?: string
  widget?: string
  config?: any
  duration: number
  name: string
}

interface Playlist {
  id: string
  name: string
  description: string
  items: PlaylistItem[]
  loop: boolean
  transition: 'fade' | 'slide' | 'none'
  createdAt: number
  updatedAt: number
}

interface Widget {
  id: string
  name: string
  description: string
  defaultConfig: any
}

const TRANSITIONS = ['fade', 'slide', 'none'] as const

export function PlaylistsPage({ screens }: { screens: Screen[] }) {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', description: '', transition: 'fade' as string, loop: true })
  const [editItems, setEditItems] = useState<PlaylistItem[]>([])
  const [creating, setCreating] = useState(false)
  const [pushTarget, setPushTarget] = useState('all')

  const fetchPlaylists = useCallback(async () => {
    const res = await fetch('/api/playlists')
    const data = await res.json()
    if (data.success) setPlaylists(data.data)
  }, [])

  const fetchWidgets = useCallback(async () => {
    const res = await fetch('/api/content/widgets')
    const data = await res.json()
    if (data.success) setWidgets(data.data)
  }, [])

  useEffect(() => {
    fetchPlaylists()
    fetchWidgets()
  }, [fetchPlaylists, fetchWidgets])

  const selectedPlaylist = playlists.find(p => p.id === selectedId)

  const startCreate = () => {
    setCreating(true)
    setEditing(true)
    setSelectedId(null)
    setEditForm({ name: '', description: '', transition: 'fade', loop: true })
    setEditItems([])
  }

  const startEdit = (playlist: Playlist) => {
    setSelectedId(playlist.id)
    setEditing(true)
    setCreating(false)
    setEditForm({ name: playlist.name, description: playlist.description, transition: playlist.transition, loop: playlist.loop })
    setEditItems([...playlist.items])
  }

  const cancelEdit = () => {
    setEditing(false)
    setCreating(false)
  }

  const savePlaylist = async () => {
    const body = {
      name: editForm.name,
      description: editForm.description,
      items: editItems,
      transition: editForm.transition,
      loop: editForm.loop,
    }

    if (creating) {
      await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
    } else if (selectedId) {
      await fetch(`/api/playlists/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
    }

    setEditing(false)
    setCreating(false)
    fetchPlaylists()
  }

  const deletePlaylist = async (id: string) => {
    if (!confirm('Delete this playlist?')) return
    await fetch(`/api/playlists/${id}`, { method: 'DELETE' })
    if (selectedId === id) setSelectedId(null)
    fetchPlaylists()
  }

  const pushPlaylist = async (id: string) => {
    await fetch(`/api/playlists/${id}/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: pushTarget })
    })
  }

  const addItem = (type: 'widget' | 'url', widget?: string) => {
    const id = `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const item: PlaylistItem = {
      id,
      contentType: type,
      widget: widget || undefined,
      config: widget ? (widgets.find(w => w.id === widget)?.defaultConfig || {}) : {},
      duration: 30,
      name: widget ? (widgets.find(w => w.id === widget)?.name || widget) : 'URL Item',
      url: type === 'url' ? '' : undefined,
    }
    setEditItems(prev => [...prev, item])
  }

  const removeItem = (index: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== index))
  }

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === editItems.length - 1) return
    const newItems = [...editItems]
    const target = direction === 'up' ? index - 1 : index + 1
    ;[newItems[index], newItems[target]] = [newItems[target], newItems[index]]
    setEditItems(newItems)
  }

  const updateItem = (index: number, updates: Partial<PlaylistItem>) => {
    setEditItems(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item))
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-2 w-24 bg-gradient-to-r from-amber-500 to-amber-400 rounded-r-full" />
        <h1 className="text-xl font-bold tracking-widest text-lcars-amber">PLAYLISTS</h1>
        <div className="flex-1 h-px bg-gradient-to-r from-amber-500/30 to-transparent" />
        <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 bg-accent text-dark-900 rounded-lg text-sm font-medium hover:bg-accent-dim transition">
          <Plus className="w-4 h-4" /> New Playlist
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Playlist list */}
        <div className="space-y-2">
          {playlists.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center text-gray-500">
              <Film className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No playlists yet</p>
              <button onClick={startCreate} className="mt-3 text-accent text-sm hover:underline">Create one →</button>
            </div>
          ) : (
            playlists.map(playlist => (
              <div
                key={playlist.id}
                onClick={() => { setSelectedId(playlist.id); setEditing(false); setCreating(false) }}
                className={`glass glass-hover rounded-xl p-4 cursor-pointer transition-all ${
                  selectedId === playlist.id ? 'ring-1 ring-accent/50 bg-accent/5' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm">{playlist.name}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {playlist.items.length} items • {playlist.transition} • {playlist.loop ? 'loop' : 'once'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); pushPlaylist(playlist.id) }} className="p-1.5 rounded hover:bg-dark-600 text-gray-500 hover:text-green-400 transition" title="Push">
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); startEdit(playlist) }} className="p-1.5 rounded hover:bg-dark-600 text-gray-500 hover:text-white transition" title="Edit">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deletePlaylist(playlist.id) }} className="p-1.5 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Push target selector */}
          <div className="glass rounded-xl p-4 mt-4">
            <label className="text-xs text-gray-500 tracking-wider mb-2 block">PUSH TARGET</label>
            <select
              value={pushTarget}
              onChange={e => setPushTarget(e.target.value)}
              className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm"
            >
              <option value="all">All Screens</option>
              {screens.map(s => (
                <option key={s.id} value={s.id}>{s.name} {s.connected ? '🟢' : '⚫'}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Playlist detail / editor */}
        <div className="lg:col-span-2">
          {editing ? (
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">{creating ? 'New Playlist' : 'Edit Playlist'}</h3>
                <div className="flex gap-2">
                  <button onClick={cancelEdit} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition">Cancel</button>
                  <button onClick={savePlaylist} className="px-4 py-1.5 bg-accent text-dark-900 rounded-lg text-sm font-medium hover:bg-accent-dim transition flex items-center gap-2">
                    <Save className="w-4 h-4" /> Save
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-500 tracking-wider block mb-1">NAME</label>
                    <input
                      value={editForm.name}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm"
                      placeholder="Playlist name..."
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 tracking-wider block mb-1">TRANSITION</label>
                    <select
                      value={editForm.transition}
                      onChange={e => setEditForm(f => ({ ...f, transition: e.target.value }))}
                      className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm"
                    >
                      {TRANSITIONS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 tracking-wider block mb-1">DESCRIPTION</label>
                  <input
                    value={editForm.description}
                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm"
                    placeholder="Optional description..."
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.loop}
                    onChange={e => setEditForm(f => ({ ...f, loop: e.target.checked }))}
                    className="w-4 h-4 rounded border-dark-500 bg-dark-700 text-accent"
                  />
                  Loop playlist
                </label>
              </div>

              {/* Items */}
              <div className="space-y-2 mb-4">
                <h4 className="text-sm font-medium text-gray-400 tracking-wider">ITEMS ({editItems.length})</h4>
                {editItems.map((item, index) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg group">
                    <Grip className="w-4 h-4 text-gray-600 cursor-grab" />
                    <div className="flex-1 min-w-0">
                      <input
                        value={item.name}
                        onChange={e => updateItem(index, { name: e.target.value })}
                        className="bg-transparent text-sm font-medium w-full outline-none"
                        placeholder="Item name"
                      />
                      {item.contentType === 'url' && (
                        <input
                          value={item.url || ''}
                          onChange={e => updateItem(index, { url: e.target.value })}
                          className="bg-dark-600 mt-1 text-xs px-2 py-1 rounded w-full outline-none"
                          placeholder="https://..."
                        />
                      )}
                      <span className="text-xs text-gray-500">{item.contentType} {item.widget ? `• ${item.widget}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      <input
                        type="number"
                        value={item.duration}
                        onChange={e => updateItem(index, { duration: Number(e.target.value) })}
                        className="w-14 bg-dark-600 text-center text-xs px-1 py-1 rounded"
                        min={5}
                        max={600}
                      />
                      <span className="text-xs text-gray-500">s</span>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => moveItem(index, 'up')} className="p-1 hover:bg-dark-600 rounded"><ChevronUp className="w-3 h-3" /></button>
                      <button onClick={() => moveItem(index, 'down')} className="p-1 hover:bg-dark-600 rounded"><ChevronDown className="w-3 h-3" /></button>
                      <button onClick={() => removeItem(index)} className="p-1 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add items */}
              <div className="border-t border-dark-600 pt-4">
                <h4 className="text-xs text-gray-500 tracking-wider mb-2">ADD WIDGET</h4>
                <div className="flex flex-wrap gap-2">
                  {widgets.map(w => (
                    <button
                      key={w.id}
                      onClick={() => addItem('widget', w.id)}
                      className="text-xs px-3 py-1.5 bg-dark-700 border border-dark-600 rounded-lg text-gray-400 hover:text-white hover:border-accent/30 transition"
                    >
                      {w.name}
                    </button>
                  ))}
                  <button
                    onClick={() => addItem('url')}
                    className="text-xs px-3 py-1.5 bg-dark-700 border border-dark-600 rounded-lg text-gray-400 hover:text-white hover:border-blue-500/30 transition"
                  >
                    + URL
                  </button>
                </div>
              </div>
            </div>
          ) : selectedPlaylist ? (
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{selectedPlaylist.name}</h3>
                  <p className="text-sm text-gray-500">{selectedPlaylist.description || 'No description'}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => pushPlaylist(selectedPlaylist.id)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition flex items-center gap-2">
                    <Play className="w-4 h-4" /> Push
                  </button>
                  <button onClick={() => startEdit(selectedPlaylist)} className="px-4 py-2 bg-dark-600 border border-dark-500 text-white rounded-lg text-sm hover:bg-dark-500 transition flex items-center gap-2">
                    <Edit3 className="w-4 h-4" /> Edit
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 mb-6">
                <span>{selectedPlaylist.items.length} items</span>
                <span>Transition: {selectedPlaylist.transition}</span>
                <span>{selectedPlaylist.loop ? 'Looping' : 'Play once'}</span>
                <span>Total: {selectedPlaylist.items.reduce((s, i) => s + i.duration, 0)}s</span>
              </div>

              <div className="space-y-2">
                {selectedPlaylist.items.map((item, i) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg">
                    <span className="text-xs text-gray-600 w-6 text-center">{i + 1}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{item.name}</div>
                      <div className="text-xs text-gray-500">{item.contentType} {item.widget ? `• ${item.widget}` : ''}</div>
                    </div>
                    <span className="text-xs text-gray-500">{item.duration}s</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass rounded-xl p-12 text-center text-gray-500">
              <Layout className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a playlist to view details</p>
              <p className="text-xs text-gray-600 mt-1">or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
