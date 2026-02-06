import { useState, useEffect, useCallback } from 'react'
import {
  Link2, Plus, Trash2, Play, Square, SkipForward, Monitor,
  Wifi, WifiOff, Eye, Camera, Radio, Copy, Layers, ArrowRight,
  Settings, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react'

interface Screen {
  id: string
  name: string
  status: string
  connected: boolean
  platform?: string
  resolution?: string
  orientation?: string
  sync_group?: string
}

interface SyncGroup {
  id: string
  name: string
  mode: 'mirror' | 'complementary' | 'span'
  leader_screen_id?: string
  playlist_id?: string
  playlist_name?: string
  config: any
  screen_count: number
  screens: Array<Screen & { connected: boolean }>
  state: { playing: boolean; itemIndex: number; startedAt: number } | null
  created_at: number
}

interface Playlist {
  id: string
  name: string
  items: any[]
}

interface Props {
  screens: Screen[]
  onRefresh: () => void
}

const MODE_INFO = {
  mirror: { label: 'MIRROR', desc: 'All screens show identical content in lockstep', icon: Copy, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  complementary: { label: 'COMPLEMENTARY', desc: 'Each screen shows a different item from the playlist', icon: Layers, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  span: { label: 'SPAN', desc: 'Video wall — content spans across all screens', icon: Monitor, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
}

export function SyncGroupsPage({ screens, onRefresh }: Props) {
  const [groups, setGroups] = useState<SyncGroup[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupMode, setNewGroupMode] = useState<'mirror' | 'complementary' | 'span'>('mirror')
  const [assigningTo, setAssigningTo] = useState<string | null>(null)

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/sync-groups')
      const data = await res.json()
      if (data.success) setGroups(data.data)
    } catch (e) { console.error('Failed to fetch sync groups:', e) }
    setLoading(false)
  }, [])

  const fetchPlaylists = useCallback(async () => {
    try {
      const res = await fetch('/api/playlists')
      const data = await res.json()
      if (data.success) setPlaylists(data.data)
    } catch (e) { /* ignore */ }
  }, [])

  useEffect(() => { fetchGroups(); fetchPlaylists() }, [fetchGroups, fetchPlaylists])

  const createGroup = async () => {
    if (!newGroupName.trim()) return
    try {
      const res = await fetch('/api/sync-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim(), mode: newGroupMode }),
      })
      const data = await res.json()
      if (data.success) {
        setShowCreate(false)
        setNewGroupName('')
        fetchGroups()
      }
    } catch (e) { console.error(e) }
  }

  const deleteGroup = async (id: string) => {
    if (!confirm('Delete this sync group? Screens will be unassigned.')) return
    try {
      await fetch(`/api/sync-groups/${id}`, { method: 'DELETE' })
      fetchGroups()
    } catch (e) { console.error(e) }
  }

  const updateGroup = async (id: string, updates: any) => {
    try {
      await fetch(`/api/sync-groups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      fetchGroups()
    } catch (e) { console.error(e) }
  }

  const assignScreens = async (groupId: string, screenIds: string[]) => {
    try {
      await fetch(`/api/sync-groups/${groupId}/screens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screenIds }),
      })
      fetchGroups()
      onRefresh()
    } catch (e) { console.error(e) }
  }

  const removeScreen = async (groupId: string, screenId: string) => {
    try {
      await fetch(`/api/sync-groups/${groupId}/screens/${screenId}`, { method: 'DELETE' })
      fetchGroups()
      onRefresh()
    } catch (e) { console.error(e) }
  }

  const playGroup = async (groupId: string, playlistId?: string) => {
    try {
      await fetch(`/api/sync-groups/${groupId}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlist_id: playlistId }),
      })
      fetchGroups()
    } catch (e) { console.error(e) }
  }

  const stopGroup = async (groupId: string) => {
    try {
      await fetch(`/api/sync-groups/${groupId}/stop`, { method: 'POST' })
      fetchGroups()
    } catch (e) { console.error(e) }
  }

  const seekGroup = async (groupId: string, itemIndex: number) => {
    try {
      await fetch(`/api/sync-groups/${groupId}/seek`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIndex }),
      })
      fetchGroups()
    } catch (e) { console.error(e) }
  }

  const identifyGroup = async (groupId: string) => {
    try {
      await fetch(`/api/sync-groups/${groupId}/identify`, { method: 'POST' })
    } catch (e) { console.error(e) }
  }

  const screenshotGroup = async (groupId: string) => {
    try {
      await fetch(`/api/sync-groups/${groupId}/screenshot`, { method: 'POST' })
    } catch (e) { console.error(e) }
  }

  // Screens not assigned to any sync group
  const unassignedScreens = screens.filter(s => !groups.some(g => g.screens.some(gs => gs.id === s.id)))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-6 h-6 text-accent animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-wider text-white flex items-center gap-3">
            <Link2 className="w-5 h-5 text-accent" />
            SYNC GROUPS
          </h2>
          <p className="text-sm text-gray-500 mt-1">Group screens for synchronised playback across multiple displays</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchGroups} className="p-2 hover:bg-dark-600 rounded-lg transition text-gray-400 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark text-dark-900 rounded-lg font-medium text-sm tracking-wider transition"
          >
            <Plus className="w-4 h-4" /> NEW GROUP
          </button>
        </div>
      </div>

      {/* Mode explanation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {Object.entries(MODE_INFO).map(([mode, info]) => {
          const Icon = info.icon
          return (
            <div key={mode} className={`${info.bg} border ${info.border} rounded-xl p-4`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${info.color}`} />
                <span className={`text-sm font-bold tracking-wider ${info.color}`}>{info.label}</span>
              </div>
              <p className="text-xs text-gray-400">{info.desc}</p>
            </div>
          )
        })}
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div className="bg-dark-700 border border-dark-500 rounded-xl p-6">
          <h3 className="text-sm font-bold tracking-wider text-accent mb-4">CREATE SYNC GROUP</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-gray-500 tracking-wider mb-1 block">GROUP NAME</label>
              <input
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                placeholder="e.g., Pavilion Screens"
                className="w-full bg-dark-800 border border-dark-500 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:border-accent focus:outline-none"
                onKeyDown={e => e.key === 'Enter' && createGroup()}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 tracking-wider mb-2 block">SYNC MODE</label>
              <div className="flex gap-3">
                {Object.entries(MODE_INFO).map(([mode, info]) => {
                  const Icon = info.icon
                  return (
                    <button
                      key={mode}
                      onClick={() => setNewGroupMode(mode as any)}
                      className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-lg border transition ${
                        newGroupMode === mode
                          ? `${info.bg} ${info.border} ${info.color}`
                          : 'bg-dark-800 border-dark-600 text-gray-500 hover:border-dark-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs font-bold tracking-wider">{info.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm transition">Cancel</button>
              <button onClick={createGroup} disabled={!newGroupName.trim()} className="px-6 py-2 bg-accent hover:bg-accent-dark text-dark-900 rounded-lg font-medium text-sm tracking-wider transition disabled:opacity-30">CREATE</button>
            </div>
          </div>
        </div>
      )}

      {/* Groups list */}
      {groups.length === 0 && !showCreate ? (
        <div className="bg-dark-700/50 border border-dark-500 rounded-xl p-12 text-center">
          <Link2 className="w-10 h-10 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">No sync groups yet</p>
          <p className="text-sm text-gray-600">Create a sync group to coordinate playback across multiple screens</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map(group => {
            const expanded = expandedGroup === group.id
            const modeInfo = MODE_INFO[group.mode] || MODE_INFO.mirror
            const ModeIcon = modeInfo.icon
            const onlineInGroup = group.screens.filter(s => s.connected).length
            const isPlaying = group.state?.playing

            return (
              <div key={group.id} className="bg-dark-700/80 border border-dark-500 rounded-xl overflow-hidden">
                {/* Group header */}
                <div
                  className="flex items-center justify-between p-5 cursor-pointer hover:bg-dark-600/50 transition"
                  onClick={() => setExpandedGroup(expanded ? null : group.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl ${modeInfo.bg} border ${modeInfo.border} flex items-center justify-center`}>
                      <ModeIcon className={`w-5 h-5 ${modeInfo.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-white font-bold tracking-wider">{group.name}</h3>
                        <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full ${modeInfo.bg} ${modeInfo.color} border ${modeInfo.border}`}>
                          {modeInfo.label}
                        </span>
                        {isPlaying && (
                          <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/30 animate-pulse">
                            ▶ PLAYING
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {group.screen_count} screen{group.screen_count !== 1 ? 's' : ''} · {onlineInGroup} online
                        {group.playlist_name && ` · Playlist: ${group.playlist_name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Quick controls */}
                    {!isPlaying && group.playlist_id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); playGroup(group.id) }}
                        className="p-2 rounded-lg bg-green-500/10 text-green-400 hover:bg-green-500/20 transition"
                        title="Start sync playback"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    {isPlaying && (
                      <button
                        onClick={(e) => { e.stopPropagation(); stopGroup(group.id) }}
                        className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                        title="Stop playback"
                      >
                        <Square className="w-4 h-4" />
                      </button>
                    )}
                    {expanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                  </div>
                </div>

                {/* Expanded details */}
                {expanded && (
                  <div className="border-t border-dark-500 p-5 space-y-5">
                    {/* Screens in group */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold tracking-widest text-gray-400">SCREENS IN GROUP</h4>
                        <button
                          onClick={() => setAssigningTo(assigningTo === group.id ? null : group.id)}
                          className="text-xs text-accent hover:underline flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add Screens
                        </button>
                      </div>

                      {group.screens.length === 0 ? (
                        <div className="bg-dark-800 border border-dark-600 rounded-lg p-6 text-center">
                          <Monitor className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No screens assigned yet</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {group.screens.map((screen, idx) => (
                            <div key={screen.id} className="flex items-center justify-between bg-dark-800 border border-dark-600 rounded-lg p-3">
                              <div className="flex items-center gap-3">
                                <div className="relative">
                                  <Monitor className="w-5 h-5 text-gray-400" />
                                  <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ${screen.connected ? 'bg-green-500' : 'bg-gray-600'}`} />
                                </div>
                                <div>
                                  <div className="text-sm text-white font-medium">{screen.name || screen.id}</div>
                                  <div className="text-[10px] text-gray-600">
                                    {screen.platform || 'browser'} · {screen.resolution || '?'} · #{idx + 1}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => removeScreen(group.id, screen.id)}
                                className="p-1.5 text-gray-600 hover:text-red-400 transition"
                                title="Remove from group"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Screen assignment panel */}
                      {assigningTo === group.id && unassignedScreens.length > 0 && (
                        <div className="mt-3 bg-dark-800/50 border border-accent/20 rounded-lg p-4">
                          <h5 className="text-xs text-accent tracking-wider mb-3">AVAILABLE SCREENS</h5>
                          <div className="flex flex-wrap gap-2">
                            {unassignedScreens.map(s => (
                              <button
                                key={s.id}
                                onClick={() => assignScreens(group.id, [s.id])}
                                className="flex items-center gap-2 px-3 py-2 bg-dark-700 border border-dark-500 rounded-lg hover:border-accent/40 transition text-sm"
                              >
                                <div className={`w-1.5 h-1.5 rounded-full ${s.connected ? 'bg-green-500' : 'bg-gray-600'}`} />
                                <span className="text-gray-300">{s.name || s.id}</span>
                                <ArrowRight className="w-3 h-3 text-gray-500" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {assigningTo === group.id && unassignedScreens.length === 0 && (
                        <div className="mt-3 text-xs text-gray-600 text-center py-3">All screens are already assigned to sync groups</div>
                      )}
                    </div>

                    {/* Playlist assignment */}
                    <div>
                      <h4 className="text-xs font-bold tracking-widest text-gray-400 mb-3">PLAYLIST</h4>
                      <select
                        value={group.playlist_id || ''}
                        onChange={e => updateGroup(group.id, { playlist_id: e.target.value || null })}
                        className="w-full bg-dark-800 border border-dark-600 rounded-lg px-4 py-2.5 text-white focus:border-accent focus:outline-none appearance-none"
                      >
                        <option value="">— No playlist assigned —</option>
                        {playlists.map(p => (
                          <option key={p.id} value={p.id}>{p.name} ({p.items?.length || 0} items)</option>
                        ))}
                      </select>
                    </div>

                    {/* Playback controls */}
                    <div>
                      <h4 className="text-xs font-bold tracking-widest text-gray-400 mb-3">CONTROLS</h4>
                      <div className="flex flex-wrap gap-2">
                        {!isPlaying ? (
                          <button
                            onClick={() => playGroup(group.id)}
                            disabled={!group.playlist_id}
                            className="flex items-center gap-2 px-4 py-2.5 bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/20 transition text-sm font-medium tracking-wider disabled:opacity-30"
                          >
                            <Play className="w-4 h-4" /> PLAY
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => stopGroup(group.id)}
                              className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition text-sm font-medium tracking-wider"
                            >
                              <Square className="w-4 h-4" /> STOP
                            </button>
                            <button
                              onClick={() => {
                                const nextIdx = ((group.state?.itemIndex ?? 0) + 1)
                                seekGroup(group.id, nextIdx)
                              }}
                              className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 transition text-sm font-medium tracking-wider"
                            >
                              <SkipForward className="w-4 h-4" /> NEXT
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => identifyGroup(group.id)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition text-sm font-medium tracking-wider"
                          title="Flash screen IDs on all group screens"
                        >
                          <Eye className="w-4 h-4" /> IDENTIFY
                        </button>
                        <button
                          onClick={() => screenshotGroup(group.id)}
                          className="flex items-center gap-2 px-4 py-2.5 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/20 transition text-sm font-medium tracking-wider"
                          title="Request screenshots from all group screens"
                        >
                          <Camera className="w-4 h-4" /> SCREENSHOT
                        </button>
                      </div>
                      {isPlaying && group.state && (
                        <div className="mt-3 text-xs text-gray-500">
                          Currently on item #{(group.state.itemIndex || 0) + 1} · Started {new Date(group.state.startedAt).toLocaleTimeString()}
                        </div>
                      )}
                    </div>

                    {/* Mode selector */}
                    <div>
                      <h4 className="text-xs font-bold tracking-widest text-gray-400 mb-3">SYNC MODE</h4>
                      <div className="flex gap-3">
                        {Object.entries(MODE_INFO).map(([mode, info]) => {
                          const Icon = info.icon
                          return (
                            <button
                              key={mode}
                              onClick={() => updateGroup(group.id, { mode })}
                              className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-lg border transition ${
                                group.mode === mode
                                  ? `${info.bg} ${info.border} ${info.color}`
                                  : 'bg-dark-800 border-dark-600 text-gray-500 hover:border-dark-400'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                              <span className="text-xs font-bold tracking-wider">{info.label}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Danger zone */}
                    <div className="pt-3 border-t border-dark-600">
                      <button
                        onClick={() => deleteGroup(group.id)}
                        className="flex items-center gap-2 text-xs text-red-500/60 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete sync group
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Player download link */}
      <div className="bg-dark-700/50 border border-dark-500 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Radio className="w-5 h-5 text-accent" />
            <div>
              <h3 className="text-sm font-bold tracking-wider text-white">PLAYER APPS</h3>
              <p className="text-xs text-gray-500 mt-0.5">Download and configure player apps for your display screens</p>
            </div>
          </div>
          <a
            href="/player"
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent border border-accent/30 rounded-lg hover:bg-accent/20 transition text-sm font-medium tracking-wider"
          >
            <Monitor className="w-4 h-4" /> PLAYER SETUP
          </a>
        </div>
      </div>
    </div>
  )
}
