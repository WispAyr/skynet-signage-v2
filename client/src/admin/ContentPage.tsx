import { useState, useEffect, useRef } from 'react'
import { Film, Layout, Zap, Camera, Clock, Cloud, BarChart3, ParkingCircle, Activity, Users, AlertTriangle, Play, ExternalLink, Folder, FileVideo, Eye, X, Volume2, VolumeX, ChevronDown, Bot } from 'lucide-react'

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
  path: string
  category: string
  size: number
  modified: number
  thumbnail: string | null
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
  shield: AlertTriangle,
  bot: Bot,
}

// Template preview thumbnails (mini screenshots / emoji representations)
const TEMPLATE_PREVIEWS: Record<string, { emoji: string; gradient: string; preview?: string }> = {
  'welcome-display': { emoji: '👋', gradient: 'from-orange-900/40 to-dark-900', preview: 'Welcome screen with clock, weather, rotating slides' },
  'parking-rates': { emoji: '🅿️', gradient: 'from-blue-900/40 to-dark-900', preview: 'Tariff board with rates and payment methods' },
  'site-info': { emoji: '🏢', gradient: 'from-green-900/40 to-dark-900', preview: 'Site details, features, capacity' },
  'announcement-board': { emoji: '📢', gradient: 'from-amber-900/40 to-dark-900', preview: 'Rotating notices with priority levels' },
  'announcement-rotator': { emoji: '🔄', gradient: 'from-purple-900/40 to-dark-900', preview: 'Auto-rotating announcements' },
  'multi-zone': { emoji: '📐', gradient: 'from-cyan-900/40 to-dark-900', preview: 'Split layout: main + sidebar + ticker' },
  'schedule-display': { emoji: '📅', gradient: 'from-indigo-900/40 to-dark-900', preview: 'Time-based schedule with peak/off-peak' },
  'alert': { emoji: '🚨', gradient: 'from-red-900/40 to-dark-900', preview: 'Emergency/alert overlay' },
  'metrics': { emoji: '📊', gradient: 'from-teal-900/40 to-dark-900', preview: 'Live metrics dashboard' },
  'announcement': { emoji: '📣', gradient: 'from-yellow-900/40 to-dark-900', preview: 'Single announcement display' },
  'daily-digest': { emoji: '📰', gradient: 'from-slate-900/40 to-dark-900', preview: 'Daily summary digest' },
  'task-complete': { emoji: '✅', gradient: 'from-emerald-900/40 to-dark-900', preview: 'Task completion notification' },
}

// Demo data for template previews
const TEMPLATE_DEMO_DATA: Record<string, any> = {
  'welcome-display': {
    siteName: 'KYLE RISE', subtitle: 'Welcome to Parkwise', weatherLocation: 'Ayr',
    showClock: true, showWeather: true, brandColor: '#FF9900',
    notices: ['🅿️ 24/7 Parking', '💳 Contactless', '♿ Accessible'],
    slides: [{ icon: '🅿️', title: 'Welcome', message: 'KYLE RISE CAR PARK' }],
  },
  'parking-rates': {
    siteName: 'Kyle Rise Car Park', currency: '£', brandColor: '#FF9900',
    rates: [
      { duration: 'Up to 1 hour', price: 1.50 }, { duration: 'Up to 2 hours', price: 2.50 },
      { duration: 'Up to 4 hours', price: 4.00 }, { duration: 'All day', price: 8.00 },
    ],
    paymentMethods: ['Cash', 'Card', 'Contactless', 'RingGo'], operatingHours: '24/7',
  },
  'site-info': {
    siteName: 'Kyle Rise Car Park', address: 'Kyle Street, Ayr KA7 1RZ', operator: 'Parkwise',
    capacity: 120, type: 'Multi-Storey', brandColor: '#FF9900',
    features: ['CCTV', '24/7 Access', 'EV Charging', 'Disabled Bays', 'Contactless Payment'],
  },
  'announcement-board': {
    title: 'PARKWISE NOTICES', brandColor: '#FF9900',
    announcements: [
      { title: 'Level 3 Maintenance', message: 'Closed for cleaning Saturday 6am-10am', priority: 'warning' },
      { title: 'New EV Chargers', message: 'Fast chargers on Level 1', priority: 'info' },
    ],
  },
}

// Video card with thumbnail + hover-to-play
function VideoCard({ video, onPush, onPreview }: { video: VideoFile; onPush: () => void; onPreview: () => void }) {
  const [hovering, setHovering] = useState(false)
  const videoEl = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (hovering && videoEl.current) {
      videoEl.current.currentTime = 0
      videoEl.current.play().catch(() => {})
    } else if (!hovering && videoEl.current) {
      videoEl.current.pause()
    }
  }, [hovering])

  const videoUrl = `/video/${video.path || video.filename}`

  return (
    <div className="glass glass-hover rounded-xl overflow-hidden group">
      {/* Thumbnail / hover video preview */}
      <div 
        className="h-36 bg-dark-800 relative cursor-pointer overflow-hidden"
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onClick={onPreview}
      >
        {/* Thumbnail image */}
        {video.thumbnail ? (
          <img 
            src={video.thumbnail} 
            alt={video.filename}
            className={`w-full h-full object-cover transition-opacity duration-300 ${hovering ? 'opacity-0' : 'opacity-100'}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-700 to-dark-900">
            <FileVideo className="w-10 h-10 text-gray-600" />
          </div>
        )}
        
        {/* Hover video (lazy loads on hover) */}
        {hovering && (
          <video 
            ref={videoEl}
            src={videoUrl}
            className="absolute inset-0 w-full h-full object-cover"
            muted loop playsInline preload="none"
          />
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
            <Play className="w-5 h-5 text-white ml-0.5" />
          </div>
        </div>

        {/* Duration / size badge */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/70 rounded text-[10px] text-gray-300 backdrop-blur-sm">
          {(video.size / 1024 / 1024).toFixed(1)} MB
        </div>
      </div>

      {/* Info bar */}
      <div className="p-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate" title={video.filename}>
            {video.filename.replace(/\.[^.]+$/, '').replace(/-/g, ' ').replace(/\d{13}/g, '').trim()}
          </div>
          <div className="text-[10px] text-gray-500 truncate">{video.filename}</div>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onPush() }}
          className="p-2 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition flex-shrink-0"
          title="Push to screens">
          <Play className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export function ContentPage() {
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [videos, setVideos] = useState<VideoFile[]>([])
  const [tab, setTab] = useState<'widgets' | 'templates' | 'videos'>('widgets')
  const [pushTarget, setPushTarget] = useState('all')
  const [screens, setScreens] = useState<{ id: string; name: string }[]>([])
  const [previewModal, setPreviewModal] = useState<{ type: 'template' | 'video'; id: string; url?: string } | null>(null)
  const [videoPreview, setVideoPreview] = useState<string | null>(null)
  const [videoMuted, setVideoMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    fetch('/api/content/widgets').then(r => r.json()).then(d => { if (d.success) setWidgets(d.data) }).catch(() => {})
    fetch('/api/content/templates').then(r => r.json()).then(d => { if (d.success) setTemplates(d.data) }).catch(() => {})
    fetch('/api/content/videos').then(r => r.json()).then(d => { if (d.success) setVideos(d.data) }).catch(() => {})
    fetch('/api/screens').then(r => r.json()).then(d => {
      const s = d.data || d
      if (Array.isArray(s)) setScreens(s.map((x: any) => ({ id: x.id, name: x.name })))
    }).catch(() => {})
  }, [])

  const pushWidget = async (widget: string, config: any) => {
    await fetch('/api/push/widget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: pushTarget, widget, config })
    })
  }

  const pushReactTemplate = async (templateId: string, data?: any) => {
    const demoData = data || TEMPLATE_DEMO_DATA[templateId] || {}
    await fetch('/api/display', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: pushTarget, template: templateId, data: demoData })
    })
  }

  const pushVideo = async (filename: string) => {
    await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: pushTarget, type: 'media', content: { url: `/video/${filename}`, type: 'video', loop: true } })
    })
  }

  const pushUrl = async (url: string) => {
    await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: pushTarget, type: 'url', content: { url } })
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
            <button key={t} onClick={() => setTab(t)}
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
          <select value={pushTarget} onChange={e => setPushTarget(e.target.value)}
            className="bg-dark-700 border border-dark-600 rounded-lg px-3 py-1.5 text-sm">
            <option value="all">All Screens</option>
            {screens.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* ===== WIDGETS TAB ===== */}
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
                  <button onClick={() => pushWidget(widget.id, widget.defaultConfig)}
                    className="opacity-0 group-hover:opacity-100 p-2 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition"
                    title="Push to screens">
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

      {/* ===== TEMPLATES TAB ===== */}
      {tab === 'templates' && (
        <div className="space-y-6">
          {/* React display templates with previews */}
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-gray-400 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" />
              DISPLAY TEMPLATES
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.filter(t => t.type === 'react-template').map(template => {
                const preview = TEMPLATE_PREVIEWS[template.id] || { emoji: '📄', gradient: 'from-gray-900/40 to-dark-900' }
                return (
                  <div key={template.id} className="glass glass-hover rounded-xl overflow-hidden group">
                    {/* Preview thumbnail */}
                    <div 
                      className={`h-32 bg-gradient-to-br ${preview.gradient} flex items-center justify-center relative cursor-pointer`}
                      onClick={() => setPreviewModal({ type: 'template', id: template.id })}
                    >
                      <span className="text-5xl">{preview.emoji}</span>
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                        <Eye className="w-5 h-5 text-white" />
                        <span className="text-white text-sm font-medium">Preview</span>
                      </div>
                    </div>
                    {/* Info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-sm">{template.name}</h4>
                          {preview.preview && <p className="text-xs text-gray-500 mt-1">{preview.preview}</p>}
                          <p className="text-[10px] text-gray-600 mt-1.5 tracking-wider">{template.category.toUpperCase()}</p>
                        </div>
                        <button onClick={() => pushReactTemplate(template.id, template.defaultData)}
                          className="p-2 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition" title="Push to screens">
                          <Play className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* HTML templates */}
          {templates.filter(t => !t.type || t.type !== 'react-template').length > 0 && (
            <div>
              <h3 className="text-sm font-semibold tracking-wider text-gray-400 mb-3 flex items-center gap-2">
                <Film className="w-4 h-4 text-lcars-purple" />
                HTML TEMPLATES
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.filter(t => !t.type || t.type !== 'react-template').map(template => (
                  <div key={template.id} className="glass glass-hover rounded-xl overflow-hidden group">
                    {/* iframe preview thumbnail */}
                    {template.path ? (
                      <div className="h-28 relative overflow-hidden cursor-pointer" onClick={() => setPreviewModal({ type: 'template', id: template.id, url: template.path })}>
                        <iframe src={template.path} className="w-[200%] h-[200%] origin-top-left scale-50 pointer-events-none border-0" title={template.name} />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <Eye className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="h-28 bg-gradient-to-br from-purple-900/30 to-dark-900 flex items-center justify-center">
                        <Layout className="w-8 h-8 text-gray-600" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-sm">{template.name}</h4>
                          <p className="text-xs text-gray-500 mt-1">Category: {template.category}</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => template.path && pushUrl(template.path)}
                            className="p-2 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition" title="Push">
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          {template.path && (
                            <a href={template.path} target="_blank"
                              className="p-2 bg-dark-600 text-gray-400 rounded-lg hover:bg-dark-500 transition" title="Open">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== VIDEOS TAB ===== */}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {vids.map(video => (
                    <VideoCard 
                      key={video.filename} 
                      video={video} 
                      onPush={() => pushVideo(video.filename)}
                      onPreview={() => setVideoPreview(`/video/${video.path || video.filename}`)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ===== VIDEO PREVIEW MODAL ===== */}
      {videoPreview && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8" onClick={() => setVideoPreview(null)}>
          <div className="relative w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setVideoPreview(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition">
              <X className="w-5 h-5" />
            </button>
            <button onClick={() => setVideoMuted(!videoMuted)}
              className="absolute top-4 right-16 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition">
              {videoMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <video 
              src={videoPreview} 
              className="w-full h-full object-contain" 
              autoPlay 
              muted={videoMuted} 
              loop 
              controls 
            />
          </div>
        </div>
      )}

      {/* ===== TEMPLATE PREVIEW MODAL ===== */}
      {previewModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-8" onClick={() => setPreviewModal(null)}>
          <div className="relative w-full max-w-5xl aspect-video bg-dark-900 rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Close button */}
            <button onClick={() => setPreviewModal(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition">
              <X className="w-5 h-5" />
            </button>
            
            {/* Push button */}
            <button 
              onClick={() => {
                if (previewModal.url) pushUrl(previewModal.url)
                else pushReactTemplate(previewModal.id)
                setPreviewModal(null)
              }}
              className="absolute top-4 left-4 z-10 px-4 py-2 bg-accent rounded-lg text-dark-900 font-medium text-sm hover:bg-accent/80 transition flex items-center gap-2">
              <Play className="w-4 h-4" /> Push to {pushTarget}
            </button>

            {/* Preview iframe */}
            {previewModal.url ? (
              <iframe src={previewModal.url} className="w-full h-full border-0" title="Preview" />
            ) : (
              <iframe 
                src={`/?screen=preview-${Date.now()}&display=true&location=parkwise-office`}
                className="w-full h-full border-0" 
                title="Template Preview"
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
