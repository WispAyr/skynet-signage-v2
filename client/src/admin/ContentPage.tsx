import { useState, useEffect } from 'react'
import { Film, Layout, Zap, Camera, Clock, Cloud, BarChart3, ParkingCircle, Activity, Users, AlertTriangle, Play, ExternalLink, Folder, FileVideo } from 'lucide-react'

interface Widget {
  id: string
  name: string
  description: string
  icon: string
  defaultConfig: any
}

interface Template {
  id: string
  name: string
  path?: string
  type?: string
  category: string
  description?: string
  defaultData?: any
}

interface VideoFile {
  id: string
  filename: string
  category: string
  size: number
  modified: number
}

const WIDGET_ICONS: Record<string, any> = {
  clock: Clock,
  cloud: Cloud,
  camera: Camera,
  grid: Layout,
  parking: ParkingCircle,
  'bar-chart': BarChart3,
  activity: Activity,
  users: Users,
}

export function ContentPage() {
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [videos, setVideos] = useState<VideoFile[]>([])
  const [tab, setTab] = useState<'widgets' | 'templates' | 'videos'>('widgets')
  const [pushTarget, setPushTarget] = useState('all')

  useEffect(() => {
    fetch('/api/content/widgets').then(r => r.json()).then(d => { if (d.success) setWidgets(d.data) })
    fetch('/api/content/templates').then(r => r.json()).then(d => { if (d.success) setTemplates(d.data) })
    fetch('/api/content/videos').then(r => r.json()).then(d => { if (d.success) setVideos(d.data) }).catch(() => {})
  }, [])

  const pushWidget = async (widget: string, config: any) => {
    await fetch('/api/push/widget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: pushTarget, widget, config })
    })
  }

  const pushUrl = async (url: string) => {
    await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: pushTarget, type: 'url', content: { url } })
    })
  }

  const pushReactTemplate = async (templateId: string, defaultData: any) => {
    await fetch('/api/display', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: pushTarget, template: templateId, data: defaultData })
    })
  }

  const pushVideo = async (filename: string) => {
    await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: pushTarget, type: 'media', content: { url: `/video/${filename}`, type: 'video', loop: true } })
    })
  }

  // Group videos by category
  const videosByCategory: Record<string, VideoFile[]> = {}
  videos.forEach(v => {
    if (!videosByCategory[v.category]) videosByCategory[v.category] = []
    videosByCategory[v.category].push(v)
  })

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-2 w-24 bg-gradient-to-r from-purple-500 to-purple-400 rounded-r-full" />
        <h1 className="text-xl font-bold tracking-widest text-lcars-purple">CONTENT LIBRARY</h1>
        <div className="flex-1 h-px bg-gradient-to-r from-purple-500/30 to-transparent" />
      </div>

      {/* Target + Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-dark-800 rounded-lg p-1">
          {(['widgets', 'templates', 'videos'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium tracking-wider transition ${
                tab === t ? 'bg-accent text-dark-900' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Push to:</span>
          <select
            value={pushTarget}
            onChange={e => setPushTarget(e.target.value)}
            className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="all">All Screens</option>
            <option value="office">Office Group</option>
          </select>
        </div>
      </div>

      {/* Widgets tab */}
      {tab === 'widgets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {widgets.map(widget => {
            const Icon = WIDGET_ICONS[widget.icon] || Zap
            return (
              <div key={widget.id} className="glass glass-hover rounded-xl p-5 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-accent" />
                  </div>
                  <button
                    onClick={() => pushWidget(widget.id, widget.defaultConfig)}
                    className="opacity-0 group-hover:opacity-100 p-2 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition"
                    title="Push to screens"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                </div>
                <h4 className="font-medium text-sm">{widget.name}</h4>
                <p className="text-xs text-gray-500 mt-1">{widget.description}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Templates tab */}
      {tab === 'templates' && (
        <div className="space-y-6">
          {/* React templates (new piSignage-inspired) */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-gray-400 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" />
              DISPLAY TEMPLATES
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.filter(t => t.type === 'react-template').map(template => (
                <div key={template.id} className="glass glass-hover rounded-xl p-5 group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
                      <Layout className="w-5 h-5 text-accent" />
                    </div>
                    <button
                      onClick={() => pushReactTemplate(template.id, template.defaultData)}
                      className="opacity-0 group-hover:opacity-100 p-2 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition"
                      title="Push with demo data"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  </div>
                  <h4 className="font-medium text-sm">{template.name}</h4>
                  {template.description && <p className="text-xs text-gray-500 mt-1">{template.description}</p>}
                  <p className="text-[10px] text-gray-600 mt-1.5 tracking-wider">{template.category.toUpperCase()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* HTML templates */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-gray-400 mb-3 flex items-center gap-2">
              <Film className="w-4 h-4 text-lcars-purple" />
              HTML TEMPLATES
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.filter(t => !t.type || t.type !== 'react-template').map(template => (
                <div key={template.id} className="glass glass-hover rounded-xl p-5 group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-lcars-purple/10 rounded-lg flex items-center justify-center">
                      <Layout className="w-5 h-5 text-lcars-purple" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => template.path && pushUrl(template.path)}
                        className="p-2 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition"
                        title="Push to screens"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      {template.path && (
                        <a
                          href={template.path}
                          target="_blank"
                          className="p-2 bg-dark-600 text-gray-400 rounded-lg hover:bg-dark-500 transition"
                          title="Preview"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                  <h4 className="font-medium text-sm">{template.name}</h4>
                  <p className="text-xs text-gray-500 mt-1">Category: {template.category}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Branded integrations */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-gray-400 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-lcars-blue" />
              INTEGRATIONS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[
                { label: 'LCARS Interface', desc: 'Star Trek NOC', url: 'http://10.10.10.123:5180/', color: 'amber' },
                { label: 'Skynet Command', desc: 'Main dashboard', url: 'http://10.10.10.123:3210/', color: 'blue' },
                { label: 'POS Dashboard', desc: 'Parking ops', url: 'http://10.10.10.123:5173/', color: 'green' },
                { label: 'Skynet Voice', desc: 'Voice interface', url: 'http://10.10.10.123:3280/', color: 'teal' },
                { label: 'AirWave', desc: 'Aviation tracking', url: 'http://10.10.10.123:8501/', color: 'purple' },
                { label: 'Situational Awareness', desc: 'Live overview', url: 'http://10.10.10.123:3210/sa', color: 'rose' },
              ].map(item => (
                <div key={item.url} className="glass glass-hover rounded-xl p-4 group">
                  <h4 className="font-medium text-sm">{item.label}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  <button
                    onClick={() => pushUrl(item.url)}
                    className="mt-2 text-xs text-accent hover:underline opacity-0 group-hover:opacity-100 transition"
                  >
                    Push to screens →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Videos tab */}
      {tab === 'videos' && (
        <div className="space-y-6">
          {Object.keys(videosByCategory).length === 0 ? (
            <div className="glass rounded-xl p-12 text-center text-gray-500">
              <FileVideo className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No videos found</p>
              <p className="text-xs text-gray-600 mt-1">Videos should be at /Volumes/Parkwise/Skynet/video/</p>
            </div>
          ) : (
            Object.entries(videosByCategory).map(([category, vids]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                  <Folder className="w-4 h-4" />
                  {category.toUpperCase()}
                  <span className="text-xs text-gray-600">({vids.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {vids.map(video => (
                    <div key={video.filename} className="glass glass-hover rounded-xl p-4 group">
                      <div className="flex items-center gap-3">
                        <FileVideo className="w-8 h-8 text-lcars-purple flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{video.filename}</div>
                          <div className="text-xs text-gray-500">
                            {(video.size / 1024 / 1024).toFixed(1)} MB
                          </div>
                        </div>
                        <button
                          onClick={() => pushVideo(video.filename)}
                          className="opacity-0 group-hover:opacity-100 p-2 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
