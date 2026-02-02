import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, X } from 'lucide-react'

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

interface Schedule {
  id: string
  playlistId: string
  screenTarget: string
  startTime: string
  endTime: string
  days: number[]
  priority: number
  enabled: boolean
}

interface Widget {
  id: string
  name: string
  description: string
  defaultConfig: any
}

interface Template {
  id: string
  name: string
  path: string
}

interface VideoFile {
  id: string
  filename: string
  category: string
}

interface Screen {
  id: string
  name: string
  connected: boolean
}

interface PlaylistManagerProps {
  screens: Screen[]
  onPush: (playlistId: string, target: string) => void
}

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function PlaylistManager({ screens, onPush }: PlaylistManagerProps) {
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [videos, setVideos] = useState<VideoFile[]>([])
  
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Playlist>>({})
  const [editItems, setEditItems] = useState<PlaylistItem[]>([])
  
  const [showAddContent, setShowAddContent] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [pushTarget, setPushTarget] = useState('all')
  
  const [scheduleForm, setScheduleForm] = useState({
    startTime: '09:00',
    endTime: '18:00',
    days: [1, 2, 3, 4, 5] as number[],
    screenTarget: 'all'
  })
  
  const selected = playlists.find(p => p.id === selectedId) || null
  const playlistSchedules = schedules.filter(s => s.playlistId === selectedId)
  
  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [pRes, sRes, wRes, tRes, vRes] = await Promise.all([
        fetch('/api/playlists').then(r => r.json()),
        fetch('/api/schedules').then(r => r.json()),
        fetch('/api/content/widgets').then(r => r.json()),
        fetch('/api/content/templates').then(r => r.json()),
        fetch('/api/content/videos').then(r => r.json()).catch(() => ({ data: [] }))
      ])
      if (pRes.success) setPlaylists(pRes.data)
      if (sRes.success) setSchedules(sRes.data)
      if (wRes.success) setWidgets(wRes.data)
      if (tRes.success) setTemplates(tRes.data)
      if (vRes.success) setVideos(vRes.data)
    } catch (err) {
      console.error('Fetch error:', err)
    }
  }, [])
  
  useEffect(() => { fetchData() }, [fetchData])
  
  // Playlist CRUD
  const createPlaylist = async () => {
    const res = await fetch('/api/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Playlist', items: [], loop: true, transition: 'fade' })
    })
    const data = await res.json()
    if (data.success) {
      setPlaylists(prev => [data.data, ...prev])
      setSelectedId(data.data.id)
      startEditing(data.data)
    }
  }
  
  const startEditing = (playlist: Playlist) => {
    setEditForm({ name: playlist.name, description: playlist.description, loop: playlist.loop, transition: playlist.transition })
    setEditItems([...playlist.items])
    setIsEditing(true)
  }
  
  const savePlaylist = async () => {
    if (!selectedId) return
    const res = await fetch(`/api/playlists/${selectedId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editForm, items: editItems })
    })
    const data = await res.json()
    if (data.success) {
      setPlaylists(prev => prev.map(p => p.id === data.data.id ? data.data : p))
      setIsEditing(false)
    }
  }
  
  const deletePlaylist = async (id: string) => {
    if (!confirm('Delete this playlist?')) return
    await fetch(`/api/playlists/${id}`, { method: 'DELETE' })
    setPlaylists(prev => prev.filter(p => p.id !== id))
    if (selectedId === id) { setSelectedId(null); setIsEditing(false) }
  }
  
  const pushPlaylist = async () => {
    if (!selectedId) return
    await fetch(`/api/playlists/${selectedId}/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: pushTarget })
    })
    onPush(selectedId, pushTarget)
  }
  
  // Item management
  const addItem = (type: 'widget' | 'template' | 'video' | 'url', data: any) => {
    const item: PlaylistItem = {
      id: `item-${Date.now()}`,
      contentType: type,
      duration: 30,
      name: data.name || 'Untitled',
      ...data
    }
    setEditItems(prev => [...prev, item])
    setShowAddContent(false)
  }
  
  const removeItem = (id: string) => setEditItems(prev => prev.filter(i => i.id !== id))
  
  const moveItem = (index: number, dir: 'up' | 'down') => {
    const to = dir === 'up' ? index - 1 : index + 1
    if (to < 0 || to >= editItems.length) return
    const items = [...editItems]
    const [item] = items.splice(index, 1)
    items.splice(to, 0, item)
    setEditItems(items)
  }
  
  const updateItemDuration = (id: string, duration: number) => {
    setEditItems(prev => prev.map(i => i.id === id ? { ...i, duration } : i))
  }
  
  // Schedule management
  const createSchedule = async () => {
    if (!selectedId) return
    const res = await fetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playlistId: selectedId, ...scheduleForm })
    })
    const data = await res.json()
    if (data.success) {
      setSchedules(prev => [...prev, data.data])
      setShowSchedule(false)
    }
  }
  
  const deleteSchedule = async (id: string) => {
    await fetch(`/api/schedules/${id}`, { method: 'DELETE' })
    setSchedules(prev => prev.filter(s => s.id !== id))
  }
  
  // Duration helpers
  const formatDuration = (items: PlaylistItem[]) => {
    const total = items.reduce((s, i) => s + i.duration, 0)
    const m = Math.floor(total / 60)
    const s = total % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }
  
  const connectedCount = screens.filter(s => s.connected).length

  return (
    <div className="h-full flex bg-dark-900">
      {/* LEFT: Playlist List */}
      <div className="w-72 border-r border-dark-700 flex flex-col">
        <div className="p-4 border-b border-dark-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Playlists</h2>
          <button onClick={createPlaylist} className="px-3 py-1.5 bg-accent text-dark-900 text-sm font-medium rounded">
            New
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {playlists.length === 0 ? (
            <div className="p-6 text-gray-500 text-sm">
              No playlists yet.<br />Create one to get started.
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {playlists.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedId(p.id); setIsEditing(false) }}
                  className={`w-full text-left p-3 rounded transition ${
                    selectedId === p.id 
                      ? 'bg-accent/15 border-l-2 border-accent' 
                      : 'hover:bg-dark-800'
                  }`}
                >
                  <div className="font-medium truncate">{p.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {p.items.length} items · {formatDuration(p.items)}
                    {p.loop && ' · Loop'}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* RIGHT: Playlist Detail */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-dark-700">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                      className="text-xl font-semibold bg-transparent border-b-2 border-accent outline-none w-full"
                      placeholder="Playlist name"
                      autoFocus
                    />
                  ) : (
                    <h2 className="text-xl font-semibold truncate">{selected.name}</h2>
                  )}
                  <div className="text-sm text-gray-500 mt-1">
                    {selected.items.length} items · Total: {formatDuration(selected.items)}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
                        Cancel
                      </button>
                      <button onClick={savePlaylist} className="px-4 py-2 bg-accent text-dark-900 text-sm font-medium rounded">
                        Save
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEditing(selected)} className="px-4 py-2 bg-dark-700 text-sm rounded hover:bg-dark-600">
                        Edit
                      </button>
                      <button onClick={() => deletePlaylist(selected.id)} className="px-4 py-2 bg-dark-700 text-red-400 text-sm rounded hover:bg-red-500/20">
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {/* Settings row when editing */}
              {isEditing && (
                <div className="flex items-center gap-6 mt-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.loop}
                      onChange={e => setEditForm(f => ({ ...f, loop: e.target.checked }))}
                      className="accent-accent w-4 h-4"
                    />
                    <span>Loop</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="text-gray-500">Transition:</span>
                    <select
                      value={editForm.transition}
                      onChange={e => setEditForm(f => ({ ...f, transition: e.target.value as any }))}
                      className="bg-dark-700 border border-dark-600 rounded px-2 py-1"
                    >
                      <option value="fade">Fade</option>
                      <option value="slide">Slide</option>
                      <option value="none">None</option>
                    </select>
                  </label>
                </div>
              )}
            </div>
            
            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4">
              {(isEditing ? editItems : selected.items).length === 0 ? (
                <div className="text-gray-500 text-sm py-8">
                  No items in playlist.
                  {isEditing && (
                    <button onClick={() => setShowAddContent(true)} className="block mt-2 text-accent hover:underline">
                      Add content
                    </button>
                  )}
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-dark-700">
                      <th className="pb-2 font-medium w-8">#</th>
                      <th className="pb-2 font-medium">Content</th>
                      <th className="pb-2 font-medium w-20">Type</th>
                      <th className="pb-2 font-medium w-24 text-right">Duration</th>
                      {isEditing && <th className="pb-2 w-24"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(isEditing ? editItems : selected.items).map((item, i) => (
                      <tr key={item.id} className="border-b border-dark-800 hover:bg-dark-800/50">
                        <td className="py-3 text-gray-500">{i + 1}</td>
                        <td className="py-3 font-medium">{item.name}</td>
                        <td className="py-3 text-gray-500 capitalize">{item.contentType}</td>
                        <td className="py-3 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              value={item.duration}
                              onChange={e => updateItemDuration(item.id, parseInt(e.target.value) || 10)}
                              className="w-16 bg-dark-700 border border-dark-600 rounded px-2 py-1 text-right"
                              min="5"
                              max="3600"
                            />
                          ) : (
                            <span>{item.duration}s</span>
                          )}
                        </td>
                        {isEditing && (
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => moveItem(i, 'up')}
                                disabled={i === 0}
                                className="p-1 hover:bg-dark-600 rounded disabled:opacity-30"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => moveItem(i, 'down')}
                                disabled={i === editItems.length - 1}
                                className="p-1 hover:bg-dark-600 rounded disabled:opacity-30"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-1 hover:bg-red-500/20 rounded text-red-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              
              {isEditing && (
                <button
                  onClick={() => setShowAddContent(true)}
                  className="mt-4 px-4 py-2 border border-dashed border-dark-600 rounded text-gray-500 hover:border-accent hover:text-accent text-sm"
                >
                  + Add content
                </button>
              )}
            </div>
            
            {/* Bottom Bar: Push & Schedule */}
            {!isEditing && (
              <div className="p-4 border-t border-dark-700 bg-dark-800">
                <div className="flex items-center gap-4">
                  {/* Push controls */}
                  <div className="flex-1">
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Push to screens</div>
                    <div className="flex items-center gap-2">
                      <select
                        value={pushTarget}
                        onChange={e => setPushTarget(e.target.value)}
                        className="flex-1 bg-dark-700 border border-dark-600 rounded px-3 py-2 text-sm"
                      >
                        <option value="all">All screens ({connectedCount} connected)</option>
                        <option value="office">Office group</option>
                        <option value="kiosk">Kiosk group</option>
                        {screens.map(s => (
                          <option key={s.id} value={s.id} disabled={!s.connected}>
                            {s.name} {!s.connected && '(offline)'}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={pushPlaylist}
                        disabled={connectedCount === 0}
                        className="px-6 py-2 bg-accent text-dark-900 font-medium rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Push Now
                      </button>
                    </div>
                  </div>
                  
                  {/* Schedule */}
                  <div className="border-l border-dark-600 pl-4">
                    <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Schedules</div>
                    {playlistSchedules.length > 0 ? (
                      <div className="space-y-1">
                        {playlistSchedules.map(s => (
                          <div key={s.id} className="flex items-center gap-2 text-sm">
                            <span className="font-mono">{s.startTime}–{s.endTime}</span>
                            <span className="text-gray-500">{s.days.map(d => DAY_LABELS[d]).join('')}</span>
                            <button onClick={() => deleteSchedule(s.id)} className="text-red-400 hover:text-red-300 text-xs">×</button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">No schedules</div>
                    )}
                    <button onClick={() => setShowSchedule(true)} className="mt-2 text-sm text-accent hover:underline">
                      + Add schedule
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-lg mb-2">Select a playlist</div>
              <div className="text-sm">or create a new one</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Add Content Modal */}
      {showAddContent && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAddContent(false)}>
          <div className="bg-dark-800 rounded-lg border border-dark-600 w-[500px] max-h-[70vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-dark-700 flex items-center justify-between">
              <h3 className="font-semibold">Add Content</h3>
              <button onClick={() => setShowAddContent(false)} className="p-1 hover:bg-dark-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[calc(70vh-60px)] space-y-6">
              {/* Widgets */}
              <section>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Widgets</h4>
                <div className="grid grid-cols-2 gap-2">
                  {widgets.map(w => (
                    <button
                      key={w.id}
                      onClick={() => addItem('widget', { widget: w.id, name: w.name, config: w.defaultConfig })}
                      className="text-left p-3 bg-dark-700 rounded hover:bg-dark-600"
                    >
                      <div className="font-medium text-sm">{w.name}</div>
                      <div className="text-xs text-gray-500">{w.description}</div>
                    </button>
                  ))}
                </div>
              </section>
              
              {/* Templates */}
              <section>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Templates</h4>
                <div className="grid grid-cols-2 gap-2">
                  {templates.map(t => (
                    <button
                      key={t.id}
                      onClick={() => addItem('template', { contentId: t.id, name: t.name, url: t.path })}
                      className="text-left p-3 bg-dark-700 rounded hover:bg-dark-600"
                    >
                      <div className="font-medium text-sm">{t.name}</div>
                    </button>
                  ))}
                </div>
              </section>
              
              {/* Videos */}
              {videos.length > 0 && (
                <section>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Videos</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {videos.slice(0, 8).map(v => (
                      <button
                        key={v.id}
                        onClick={() => addItem('video', { contentId: v.id, name: v.filename })}
                        className="text-left p-3 bg-dark-700 rounded hover:bg-dark-600"
                      >
                        <div className="font-medium text-sm truncate">{v.filename}</div>
                        <div className="text-xs text-gray-500">{v.category}</div>
                      </button>
                    ))}
                  </div>
                </section>
              )}
              
              {/* Custom URL */}
              <section>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Custom URL</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="custom-url-input"
                    placeholder="https://..."
                    className="flex-1 bg-dark-700 border border-dark-600 rounded px-3 py-2 text-sm"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const v = (e.target as HTMLInputElement).value
                        if (v) addItem('url', { url: v, name: 'Custom URL' })
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('custom-url-input') as HTMLInputElement
                      if (input?.value) addItem('url', { url: input.value, name: 'Custom URL' })
                    }}
                    className="px-4 py-2 bg-accent text-dark-900 rounded text-sm font-medium"
                  >
                    Add
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
      
      {/* Schedule Modal */}
      {showSchedule && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowSchedule(false)}>
          <div className="bg-dark-800 rounded-lg border border-dark-600 w-[380px]" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-dark-700 flex items-center justify-between">
              <h3 className="font-semibold">Add Schedule</h3>
              <button onClick={() => setShowSchedule(false)} className="p-1 hover:bg-dark-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Time range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Start</label>
                  <input
                    type="time"
                    value={scheduleForm.startTime}
                    onChange={e => setScheduleForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full mt-1 bg-dark-700 border border-dark-600 rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">End</label>
                  <input
                    type="time"
                    value={scheduleForm.endTime}
                    onChange={e => setScheduleForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full mt-1 bg-dark-700 border border-dark-600 rounded px-3 py-2"
                  />
                </div>
              </div>
              
              {/* Days */}
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Days</label>
                <div className="flex gap-1 mt-1">
                  {DAY_LABELS.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const days = scheduleForm.days.includes(i)
                          ? scheduleForm.days.filter(x => x !== i)
                          : [...scheduleForm.days, i]
                        setScheduleForm(f => ({ ...f, days }))
                      }}
                      className={`flex-1 py-2 rounded text-sm font-medium ${
                        scheduleForm.days.includes(i) ? 'bg-accent text-dark-900' : 'bg-dark-700'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Target */}
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide">Target screens</label>
                <select
                  value={scheduleForm.screenTarget}
                  onChange={e => setScheduleForm(f => ({ ...f, screenTarget: e.target.value }))}
                  className="w-full mt-1 bg-dark-700 border border-dark-600 rounded px-3 py-2"
                >
                  <option value="all">All screens</option>
                  <option value="office">Office group</option>
                  <option value="kiosk">Kiosk group</option>
                  {screens.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              
              <button onClick={createSchedule} className="w-full py-2.5 bg-accent text-dark-900 font-medium rounded">
                Create Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
