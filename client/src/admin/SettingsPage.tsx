import { useState, useEffect } from 'react'
import { Settings, Save, RefreshCw, Shield, Palette, Clock, Bell, Monitor } from 'lucide-react'

export function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => { if (d.success) setSettings(d.data) })
      .catch(console.error)
  }, [])

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      console.error('Failed to save:', e)
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6 animate-fadeIn max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-2 w-24 bg-gradient-to-r from-gray-500 to-gray-400 rounded-r-full" />
        <h1 className="text-xl font-bold tracking-widest text-gray-300">SETTINGS</h1>
        <div className="flex-1 h-px bg-gradient-to-r from-gray-500/30 to-transparent" />
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-dark-900 rounded-lg text-sm font-medium hover:bg-accent-dim transition disabled:opacity-50"
        >
          {saved ? '✓ Saved' : saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save All</>}
        </button>
      </div>

      {/* Branding */}
      <SettingsSection icon={Palette} title="BRANDING" color="text-accent">
        <SettingRow label="Company Name" description="Displayed on signage screens">
          <input
            value={settings['global.companyName'] || ''}
            onChange={e => updateSetting('global.companyName', e.target.value)}
            className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm w-64"
          />
        </SettingRow>
        <SettingRow label="Brand Color" description="Primary accent color (hex)">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={settings['global.brandColor'] || '#F97316'}
              onChange={e => updateSetting('global.brandColor', e.target.value)}
              className="w-10 h-10 rounded cursor-pointer bg-dark-700 border border-dark-600"
            />
            <input
              value={settings['global.brandColor'] || '#F97316'}
              onChange={e => updateSetting('global.brandColor', e.target.value)}
              className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm w-28"
            />
          </div>
        </SettingRow>
      </SettingsSection>

      {/* Transitions */}
      <SettingsSection icon={Clock} title="TRANSITIONS" color="text-lcars-blue">
        <SettingRow label="Default Transition" description="Used when playlist doesn't specify">
          <select
            value={settings['global.transition'] || 'fade'}
            onChange={e => updateSetting('global.transition', e.target.value)}
            className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm w-40"
          >
            <option value="fade">Fade</option>
            <option value="slide">Slide</option>
            <option value="none">None</option>
          </select>
        </SettingRow>
        <SettingRow label="Transition Duration" description="Milliseconds">
          <input
            type="number"
            value={settings['global.transitionDuration'] || '500'}
            onChange={e => updateSetting('global.transitionDuration', e.target.value)}
            className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm w-28"
            min={0}
            max={3000}
            step={100}
          />
        </SettingRow>
        <SettingRow label="Default Loop" description="Loop playlists by default">
          <button
            onClick={() => updateSetting('global.defaultPlaylistLoop', settings['global.defaultPlaylistLoop'] === 'true' ? 'false' : 'true')}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              settings['global.defaultPlaylistLoop'] === 'true' ? 'bg-accent' : 'bg-dark-600'
            }`}
          >
            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              settings['global.defaultPlaylistLoop'] === 'true' ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </SettingRow>
      </SettingsSection>

      {/* Alerts */}
      <SettingsSection icon={Bell} title="ALERTS" color="text-lcars-amber">
        <SettingRow label="Auto-Expire Duration" description="Alert auto-dismiss time (ms)">
          <input
            type="number"
            value={settings['alerts.autoExpire'] || '30000'}
            onChange={e => updateSetting('alerts.autoExpire', e.target.value)}
            className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm w-28"
            min={5000}
            max={300000}
            step={5000}
          />
        </SettingRow>
        <SettingRow label="Sound Enabled" description="Play sound on alert push">
          <button
            onClick={() => updateSetting('alerts.soundEnabled', settings['alerts.soundEnabled'] === 'true' ? 'false' : 'true')}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              settings['alerts.soundEnabled'] === 'true' ? 'bg-accent' : 'bg-dark-600'
            }`}
          >
            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              settings['alerts.soundEnabled'] === 'true' ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </SettingRow>
      </SettingsSection>

      {/* Screen Monitoring */}
      <SettingsSection icon={Monitor} title="MONITORING" color="text-lcars-teal">
        <SettingRow label="Offline Alert Threshold" description="Minutes before alerting on offline screen">
          <input
            type="number"
            value={settings['screens.offlineAlertMinutes'] || '10'}
            onChange={e => updateSetting('screens.offlineAlertMinutes', e.target.value)}
            className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-sm w-28"
            min={1}
            max={60}
          />
        </SettingRow>
      </SettingsSection>

      {/* System info */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-sm font-semibold tracking-wider text-gray-400 mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          SYSTEM
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-400">
            <span>Server</span>
            <span className="text-white">http://localhost:3400</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Database</span>
            <span className="text-white">SQLite (signage.db)</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Process Manager</span>
            <span className="text-white">PM2 (skynet-signage)</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Video Storage</span>
            <span className="text-white">/Volumes/Parkwise/Skynet/video/</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingsSection({ icon: Icon, title, color, children }: { 
  icon: any; title: string; color: string; children: React.ReactNode 
}) {
  return (
    <div className="glass rounded-xl p-6">
      <h3 className={`text-sm font-semibold tracking-wider mb-4 flex items-center gap-2 ${color}`}>
        <Icon className="w-4 h-4" />
        {title}
      </h3>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}

function SettingRow({ label, description, children }: { 
  label: string; description: string; children: React.ReactNode 
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm text-white">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      {children}
    </div>
  )
}
