import { useState, useEffect, useCallback } from 'react'
import { useClient } from './AdminLayout'
import {
  Building2, Plus, Trash2, Palette, Users, MapPin, Monitor, List,
  Edit3, Check, X, Globe, Mail, User, CreditCard, RefreshCw,
  ChevronDown, ChevronUp, Zap, Eye
} from 'lucide-react'

interface ClientStats {
  locations: number
  screens: number
  playlists: number
  schedules: number
  announcements: number
  syncGroups: number
}

const PLAN_BADGES: Record<string, { color: string; bg: string; border: string }> = {
  basic: { color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/30' },
  pro: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  enterprise: { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
}

const COLOR_PRESETS = [
  '#F97316', '#EF4444', '#EC4899', '#A855F7', '#6366F1',
  '#3B82F6', '#14B8A6', '#22C55E', '#EAB308', '#F59E0B',
]

export function ClientsPage() {
  const { clients, refreshClients, setActiveClientId } = useClient()
  const [showCreate, setShowCreate] = useState(false)
  const [expandedClient, setExpandedClient] = useState<string | null>(null)
  const [clientStats, setClientStats] = useState<Record<string, ClientStats>>({})
  const [editingBranding, setEditingBranding] = useState<string | null>(null)
  
  // Create form
  const [newName, setNewName] = useState('')
  const [newContact, setNewContact] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPlan, setNewPlan] = useState('basic')
  const [newColor, setNewColor] = useState('#F97316')

  const fetchStats = useCallback(async (clientId: string) => {
    try {
      const res = await fetch(`/api/clients/${clientId}/stats`)
      const data = await res.json()
      if (data.success) {
        setClientStats(prev => ({ ...prev, [clientId]: data.data }))
      }
    } catch (e) { /* ignore */ }
  }, [])

  useEffect(() => {
    clients.forEach(c => fetchStats(c.id))
  }, [clients, fetchStats])

  const createClient = async () => {
    if (!newName.trim()) return
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          contact_name: newContact || undefined,
          contact_email: newEmail || undefined,
          plan: newPlan,
          branding: { primaryColor: newColor },
        }),
      })
      const data = await res.json()
      if (data.success) {
        setShowCreate(false)
        setNewName('')
        setNewContact('')
        setNewEmail('')
        setNewPlan('basic')
        setNewColor('#F97316')
        refreshClients()
      }
    } catch (e) { console.error(e) }
  }

  const updateClient = async (id: string, updates: any) => {
    try {
      await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      refreshClients()
    } catch (e) { console.error(e) }
  }

  const updateBranding = async (id: string, branding: any) => {
    try {
      await fetch(`/api/clients/${id}/branding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branding),
      })
      refreshClients()
    } catch (e) { console.error(e) }
  }

  const deleteClient = async (id: string) => {
    if (id === 'parkwise') return
    if (!confirm('Deactivate this client? Their screens and content will be hidden.')) return
    try {
      await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      refreshClients()
    } catch (e) { console.error(e) }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-wider text-white flex items-center gap-3">
            <Building2 className="w-5 h-5 text-accent" />
            PLATFORM CLIENTS
          </h2>
          <p className="text-sm text-gray-500 mt-1">Manage client tenants — each with isolated screens, content, and branding</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refreshClients} className="p-2 hover:bg-dark-600 rounded-lg transition text-gray-400 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-dark text-dark-900 rounded-lg font-medium text-sm tracking-wider transition"
          >
            <Plus className="w-4 h-4" /> NEW CLIENT
          </button>
        </div>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-dark-700/50 border border-dark-500 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-accent" style={{ fontFamily: 'Antonio, sans-serif' }}>{clients.length}</div>
          <div className="text-[10px] text-gray-500 tracking-widest mt-1">CLIENTS</div>
        </div>
        <div className="bg-dark-700/50 border border-dark-500 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-lcars-blue" style={{ fontFamily: 'Antonio, sans-serif' }}>
            {Object.values(clientStats).reduce((s, cs) => s + cs.screens, 0)}
          </div>
          <div className="text-[10px] text-gray-500 tracking-widest mt-1">TOTAL SCREENS</div>
        </div>
        <div className="bg-dark-700/50 border border-dark-500 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-lcars-teal" style={{ fontFamily: 'Antonio, sans-serif' }}>
            {Object.values(clientStats).reduce((s, cs) => s + cs.locations, 0)}
          </div>
          <div className="text-[10px] text-gray-500 tracking-widest mt-1">TOTAL LOCATIONS</div>
        </div>
        <div className="bg-dark-700/50 border border-dark-500 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-lcars-amber" style={{ fontFamily: 'Antonio, sans-serif' }}>
            {Object.values(clientStats).reduce((s, cs) => s + cs.playlists, 0)}
          </div>
          <div className="text-[10px] text-gray-500 tracking-widest mt-1">TOTAL PLAYLISTS</div>
        </div>
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div className="bg-dark-700 border border-dark-500 rounded-xl p-6">
          <h3 className="text-sm font-bold tracking-wider text-accent mb-4">CREATE NEW CLIENT</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 tracking-wider mb-1 block">CLIENT NAME *</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g., NCP, Saba, Q-Park"
                className="w-full bg-dark-800 border border-dark-500 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:border-accent focus:outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 tracking-wider mb-1 block">PLAN</label>
              <select
                value={newPlan}
                onChange={e => setNewPlan(e.target.value)}
                className="w-full bg-dark-800 border border-dark-500 rounded-lg px-4 py-2.5 text-white focus:border-accent focus:outline-none appearance-none"
              >
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 tracking-wider mb-1 block">CONTACT NAME</label>
              <input
                value={newContact}
                onChange={e => setNewContact(e.target.value)}
                placeholder="Primary contact"
                className="w-full bg-dark-800 border border-dark-500 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:border-accent focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 tracking-wider mb-1 block">CONTACT EMAIL</label>
              <input
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="email@client.com"
                className="w-full bg-dark-800 border border-dark-500 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:border-accent focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 tracking-wider mb-2 block">BRAND COLOR</label>
              <div className="flex items-center gap-2">
                {COLOR_PRESETS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                      newColor === color ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ background: color }}
                  />
                ))}
                <input
                  type="color"
                  value={newColor}
                  onChange={e => setNewColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 justify-end mt-6">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm transition">Cancel</button>
            <button onClick={createClient} disabled={!newName.trim()} className="px-6 py-2 bg-accent hover:bg-accent-dark text-dark-900 rounded-lg font-medium text-sm tracking-wider transition disabled:opacity-30">CREATE CLIENT</button>
          </div>
        </div>
      )}

      {/* Client list */}
      <div className="space-y-4">
        {clients.map(client => {
          const expanded = expandedClient === client.id
          const stats = clientStats[client.id]
          const planBadge = PLAN_BADGES[client.plan] || PLAN_BADGES.basic
          const primaryColor = client.branding?.primaryColor || '#F97316'

          return (
            <div key={client.id} className="bg-dark-700/80 border border-dark-500 rounded-xl overflow-hidden">
              {/* Client header */}
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-dark-600/50 transition"
                onClick={() => setExpandedClient(expanded ? null : client.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                    style={{ background: `${primaryColor}20`, color: primaryColor, border: `2px solid ${primaryColor}40` }}>
                    {client.logo_url ? (
                      <img src={client.logo_url} className="w-8 h-8 object-contain" alt="" />
                    ) : (
                      client.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-white font-bold tracking-wider text-lg">{client.name}</h3>
                      <span className={`text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full ${planBadge.bg} ${planBadge.color} border ${planBadge.border}`}>
                        {client.plan.toUpperCase()}
                      </span>
                      {!client.active && (
                        <span className="text-[10px] font-bold tracking-widest px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
                          INACTIVE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      {stats && (
                        <>
                          <span className="flex items-center gap-1"><Monitor className="w-3 h-3" /> {stats.screens}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {stats.locations}</span>
                          <span className="flex items-center gap-1"><List className="w-3 h-3" /> {stats.playlists}</span>
                        </>
                      )}
                      {client.contact_email && (
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {client.contact_email}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); setActiveClientId(client.id) }}
                    className="p-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition"
                    title="Switch to this client"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {expanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
                </div>
              </div>

              {/* Expanded details */}
              {expanded && (
                <div className="border-t border-dark-500 p-5 space-y-6">
                  {/* Branding */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold tracking-widest text-gray-400 flex items-center gap-2">
                        <Palette className="w-3.5 h-3.5" /> BRANDING
                      </h4>
                      <button
                        onClick={() => setEditingBranding(editingBranding === client.id ? null : client.id)}
                        className="text-xs text-accent hover:underline flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" /> {editingBranding === client.id ? 'Done' : 'Edit'}
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Color preview */}
                      <div className="flex gap-2">
                        {['primaryColor', 'secondaryColor', 'accentColor'].map(key => (
                          <div key={key} className="text-center">
                            <div className="w-10 h-10 rounded-lg border border-dark-500 mb-1"
                              style={{ background: (client.branding as any)?.[key] || '#333' }} />
                            <span className="text-[9px] text-gray-600 tracking-wider">
                              {key.replace('Color', '').toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="text-xs text-gray-500">
                        Font: <span className="text-gray-300">{client.branding?.fontFamily || 'Antonio'}</span>
                      </div>
                    </div>

                    {editingBranding === client.id && (
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 bg-dark-800/50 border border-dark-600 rounded-lg p-4">
                        {[
                          { key: 'primaryColor', label: 'Primary' },
                          { key: 'secondaryColor', label: 'Secondary' },
                          { key: 'accentColor', label: 'Accent' },
                        ].map(({ key, label }) => (
                          <div key={key}>
                            <label className="text-[10px] text-gray-500 tracking-wider mb-1 block">{label.toUpperCase()}</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={(client.branding as any)?.[key] || '#F97316'}
                                onChange={e => updateBranding(client.id, { [key]: e.target.value })}
                                className="w-8 h-8 rounded cursor-pointer bg-transparent"
                              />
                              <span className="text-xs text-gray-400 font-mono">
                                {(client.branding as any)?.[key] || '#F97316'}
                              </span>
                            </div>
                          </div>
                        ))}
                        <div className="md:col-span-3">
                          <label className="text-[10px] text-gray-500 tracking-wider mb-1 block">LOGO URL</label>
                          <input
                            value={client.logo_url || ''}
                            onChange={e => updateClient(client.id, { logo_url: e.target.value || null })}
                            placeholder="https://..."
                            className="w-full bg-dark-900 border border-dark-500 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-accent focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stats grid */}
                  {stats && (
                    <div>
                      <h4 className="text-xs font-bold tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5" /> RESOURCES
                      </h4>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                        {[
                          { label: 'Screens', value: stats.screens, icon: Monitor },
                          { label: 'Locations', value: stats.locations, icon: MapPin },
                          { label: 'Playlists', value: stats.playlists, icon: List },
                          { label: 'Schedules', value: stats.schedules, icon: null },
                          { label: 'Notices', value: stats.announcements, icon: null },
                          { label: 'Sync Groups', value: stats.syncGroups, icon: null },
                        ].map(stat => (
                          <div key={stat.label} className="bg-dark-800 border border-dark-600 rounded-lg p-3 text-center">
                            <div className="text-lg font-bold text-white" style={{ fontFamily: 'Antonio, sans-serif' }}>
                              {stat.value}
                            </div>
                            <div className="text-[9px] text-gray-500 tracking-widest mt-0.5">{stat.label.toUpperCase()}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contact & config */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] text-gray-500 tracking-wider mb-1 block">CONTACT NAME</label>
                      <input
                        value={client.contact_name || ''}
                        onChange={e => updateClient(client.id, { contact_name: e.target.value })}
                        className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 tracking-wider mb-1 block">CONTACT EMAIL</label>
                      <input
                        value={client.contact_email || ''}
                        onChange={e => updateClient(client.id, { contact_email: e.target.value })}
                        className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:border-accent focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 tracking-wider mb-1 block">CUSTOM DOMAIN</label>
                      <input
                        value={client.domain || ''}
                        onChange={e => updateClient(client.id, { domain: e.target.value })}
                        placeholder="signage.client.com"
                        className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-accent focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 tracking-wider mb-1 block">PLAN</label>
                      <select
                        value={client.plan}
                        onChange={e => updateClient(client.id, { plan: e.target.value })}
                        className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-sm text-white focus:border-accent focus:outline-none appearance-none"
                      >
                        <option value="basic">Basic</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                  </div>

                  {/* Danger zone */}
                  {client.id !== 'parkwise' && (
                    <div className="pt-3 border-t border-dark-600">
                      <button
                        onClick={() => deleteClient(client.id)}
                        className="flex items-center gap-2 text-xs text-red-500/60 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Deactivate client
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {clients.length === 0 && (
        <div className="bg-dark-700/50 border border-dark-500 rounded-xl p-12 text-center">
          <Building2 className="w-10 h-10 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">No clients yet</p>
        </div>
      )}
    </div>
  )
}
