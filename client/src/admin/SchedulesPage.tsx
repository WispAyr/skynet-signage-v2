import { useState, useEffect, useCallback } from 'react'
import { Calendar, Plus, Edit3, Trash2, Save, X, Clock, Play, Power } from 'lucide-react'

interface Schedule {
  id: string
  playlistId: string
  screenTarget: string
  startTime: string
  endTime: string
  days: number[]
  priority: number
  enabled: boolean
  createdAt: number
}

interface Playlist {
  id: string
  name: string
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [editing, setEditing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({
    playlistId: '',
    screenTarget: 'all',
    startTime: '09:00',
    endTime: '17:00',
    days: [1, 2, 3, 4, 5] as number[],
    priority: 0,
  })

  const fetchSchedules = useCallback(async () => {
    const res = await fetch('/api/schedules')
    const data = await res.json()
    if (data.success) setSchedules(data.data)
  }, [])

  const fetchPlaylists = useCallback(async () => {
    const res = await fetch('/api/playlists')
    const data = await res.json()
    if (data.success) setPlaylists(data.data)
  }, [])

  useEffect(() => {
    fetchSchedules()
    fetchPlaylists()
  }, [fetchSchedules, fetchPlaylists])

  const startCreate = () => {
    setCreating(true)
    setEditing(true)
    setEditId(null)
    setForm({ playlistId: playlists[0]?.id || '', screenTarget: 'all', startTime: '09:00', endTime: '17:00', days: [1, 2, 3, 4, 5], priority: 0 })
  }

  const startEdit = (schedule: Schedule) => {
    setEditId(schedule.id)
    setEditing(true)
    setCreating(false)
    setForm({
      playlistId: schedule.playlistId,
      screenTarget: schedule.screenTarget,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      days: schedule.days,
      priority: schedule.priority,
    })
  }

  const cancelEdit = () => {
    setEditing(false)
    setCreating(false)
    setEditId(null)
  }

  const saveSchedule = async () => {
    if (creating) {
      await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
    } else if (editId) {
      await fetch(`/api/schedules/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
    }
    cancelEdit()
    fetchSchedules()
  }

  const deleteSchedule = async (id: string) => {
    if (!confirm('Delete this schedule?')) return
    await fetch(`/api/schedules/${id}`, { method: 'DELETE' })
    fetchSchedules()
  }

  const toggleEnabled = async (schedule: Schedule) => {
    await fetch(`/api/schedules/${schedule.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !schedule.enabled })
    })
    fetchSchedules()
  }

  const toggleDay = (day: number) => {
    setForm(f => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day].sort()
    }))
  }

  const getPlaylistName = (id: string) => playlists.find(p => p.id === id)?.name || id

  // Check if a schedule is currently active
  const isActive = (schedule: Schedule) => {
    const now = new Date()
    const currentDay = now.getDay()
    const currentTime = now.toTimeString().slice(0, 5)
    return schedule.enabled && schedule.days.includes(currentDay) && currentTime >= schedule.startTime && currentTime <= schedule.endTime
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-2 w-24 bg-gradient-to-r from-pink-500 to-pink-400 rounded-r-full" />
        <h1 className="text-xl font-bold tracking-widest text-lcars-pink">SCHEDULES</h1>
        <div className="flex-1 h-px bg-gradient-to-r from-pink-500/30 to-transparent" />
        <button onClick={startCreate} className="flex items-center gap-2 px-4 py-2 bg-accent text-dark-900 rounded-lg text-sm font-medium hover:bg-accent-dim transition">
          <Plus className="w-4 h-4" /> New Schedule
        </button>
      </div>

      {/* Visual timeline */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-sm font-semibold tracking-wider text-gray-400 mb-4">TODAY'S TIMELINE</h3>
        <div className="relative">
          {/* 24-hour timeline */}
          <div className="flex items-end gap-0 mb-2">
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} className="flex-1 text-center">
                <span className="text-[10px] text-gray-600">{i.toString().padStart(2, '0')}</span>
              </div>
            ))}
          </div>
          <div className="relative h-12 bg-dark-700/50 rounded-lg overflow-hidden">
            {/* Current time marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-accent z-10"
              style={{ left: `${(new Date().getHours() * 60 + new Date().getMinutes()) / 1440 * 100}%` }}
            />
            {/* Schedule bars */}
            {schedules.filter(s => s.enabled && s.days.includes(new Date().getDay())).map(schedule => {
              const [startH, startM] = schedule.startTime.split(':').map(Number)
              const [endH, endM] = schedule.endTime.split(':').map(Number)
              const startPct = (startH * 60 + startM) / 1440 * 100
              const endPct = (endH * 60 + endM) / 1440 * 100
              const width = endPct - startPct
              return (
                <div
                  key={schedule.id}
                  className={`absolute top-1 bottom-1 rounded ${isActive(schedule) ? 'bg-accent/40' : 'bg-accent/20'}`}
                  style={{ left: `${startPct}%`, width: `${width}%` }}
                  title={`${getPlaylistName(schedule.playlistId)}: ${schedule.startTime} - ${schedule.endTime}`}
                >
                  <span className="text-[10px] text-white/70 px-1 truncate block mt-0.5">
                    {getPlaylistName(schedule.playlistId)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Schedule list */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold tracking-wider text-gray-400">ALL SCHEDULES ({schedules.length})</h3>
          
          {schedules.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center text-gray-500">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No schedules configured</p>
            </div>
          ) : (
            schedules.map(schedule => (
              <div key={schedule.id} className={`glass glass-hover rounded-xl p-4 transition-all ${
                isActive(schedule) ? 'ring-1 ring-green-500/30' : ''
              } ${!schedule.enabled ? 'opacity-50' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {isActive(schedule) && (
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      )}
                      <h4 className="text-sm font-medium">{getPlaylistName(schedule.playlistId)}</h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {schedule.startTime} - {schedule.endTime}
                      </span>
                      <span>→ {schedule.screenTarget}</span>
                      <span>P{schedule.priority}</span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      {DAY_SHORT.map((label, i) => (
                        <span
                          key={i}
                          className={`w-5 h-5 rounded text-[10px] flex items-center justify-center ${
                            schedule.days.includes(i) ? 'bg-accent/20 text-accent' : 'bg-dark-700 text-gray-600'
                          }`}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button onClick={() => toggleEnabled(schedule)} className={`p-1.5 rounded transition ${
                      schedule.enabled ? 'text-green-400 hover:bg-green-500/20' : 'text-gray-500 hover:bg-dark-600'
                    }`} title={schedule.enabled ? 'Disable' : 'Enable'}>
                      <Power className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => startEdit(schedule)} className="p-1.5 rounded hover:bg-dark-600 text-gray-500 hover:text-white transition">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteSchedule(schedule.id)} className="p-1.5 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Editor */}
        {editing ? (
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">{creating ? 'New Schedule' : 'Edit Schedule'}</h3>
              <div className="flex gap-2">
                <button onClick={cancelEdit} className="px-3 py-1.5 text-sm text-gray-400 hover:text-white">Cancel</button>
                <button onClick={saveSchedule} className="px-4 py-1.5 bg-accent text-dark-900 rounded-lg text-sm font-medium hover:bg-accent-dim transition flex items-center gap-2">
                  <Save className="w-4 h-4" /> Save
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 tracking-wider block mb-1">PLAYLIST</label>
                <select
                  value={form.playlistId}
                  onChange={e => setForm(f => ({ ...f, playlistId: e.target.value }))}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select playlist...</option>
                  {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 tracking-wider block mb-1">TARGET</label>
                <input
                  value={form.screenTarget}
                  onChange={e => setForm(f => ({ ...f, screenTarget: e.target.value }))}
                  className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm"
                  placeholder="all, screen id, or group id"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 tracking-wider block mb-1">START TIME</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 tracking-wider block mb-1">END TIME</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 tracking-wider block mb-2">DAYS</label>
                <div className="flex gap-2">
                  {DAY_LABELS.map((label, i) => (
                    <button
                      key={i}
                      onClick={() => toggleDay(i)}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition ${
                        form.days.includes(i)
                          ? 'bg-accent/20 text-accent border border-accent/40'
                          : 'bg-dark-700 text-gray-500 border border-dark-600 hover:border-gray-500'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => setForm(f => ({ ...f, days: [1,2,3,4,5] }))} className="text-xs text-accent hover:underline">Weekdays</button>
                  <button onClick={() => setForm(f => ({ ...f, days: [0,6] }))} className="text-xs text-accent hover:underline">Weekends</button>
                  <button onClick={() => setForm(f => ({ ...f, days: [0,1,2,3,4,5,6] }))} className="text-xs text-accent hover:underline">Every day</button>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 tracking-wider block mb-1">PRIORITY</label>
                <input
                  type="number"
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))}
                  className="w-32 bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm"
                  min={0}
                  max={100}
                />
                <p className="text-xs text-gray-600 mt-1">Higher priority overrides lower</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass rounded-xl p-12 text-center text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Select a schedule to edit</p>
            <p className="text-xs text-gray-600 mt-1">or create a new one</p>
          </div>
        )}
      </div>
    </div>
  )
}
