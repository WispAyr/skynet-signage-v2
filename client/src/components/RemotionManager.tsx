import { useState, useEffect, useCallback } from 'react'
import { Play, RefreshCw, Film, Monitor, Send, Clock, CheckCircle, XCircle, Loader2, Video, Clapperboard } from 'lucide-react'

interface Composition {
  id: string
  description: string
  duration: number
  dimensions: string
}

interface RenderJob {
  jobId: string
  compositionId: string
  props: Record<string, any>
  status: 'queued' | 'rendering' | 'completed' | 'failed'
  progress?: number
  pushOnComplete: boolean
  pushTarget: string
  createdAt: string
  completedAt?: string
  videoId?: string
  error?: string
}

interface VideoFile {
  id: string
  filename: string
  compositionId: string
  category: string
  duration: number
  width: number
  height: number
  createdAt: string
}

interface BrandingPreset {
  compositionId: string
  props?: Record<string, any>
  category: string
  tags: string[]
}

interface Screen {
  id: string
  name: string
  connected: boolean
}

interface RemotionManagerProps {
  screens: Screen[]
}

export function RemotionManager({ screens }: RemotionManagerProps) {
  const [compositions, setCompositions] = useState<Composition[]>([])
  const [videos, setVideos] = useState<VideoFile[]>([])
  const [jobs, setJobs] = useState<RenderJob[]>([])
  const [presets, setPresets] = useState<Record<string, BrandingPreset>>({})
  
  const [selectedComposition, setSelectedComposition] = useState<string>('')
  const [selectedPreset, setSelectedPreset] = useState<string>('')
  const [pushTarget, setPushTarget] = useState('all')
  const [pushOnComplete, setPushOnComplete] = useState(true)
  const [propsJson, setPropsJson] = useState('{}')
  const [propsError, setPropsError] = useState('')
  
  const [renderLoading, setRenderLoading] = useState(false)
  const [pushLoading, setPushLoading] = useState<string | null>(null)
  
  const [activeSection, setActiveSection] = useState<'render' | 'queue' | 'library'>('render')

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      const [compRes, vidRes, jobRes, presetRes] = await Promise.all([
        fetch('/api/remotion/compositions').then(r => r.json()),
        fetch('/api/remotion/videos').then(r => r.json()),
        fetch('/api/remotion/jobs').then(r => r.json()),
        fetch('/api/remotion/branding').then(r => r.json()),
      ])
      
      if (compRes.success) setCompositions(compRes.compositions || [])
      if (vidRes.success) setVideos(vidRes.videos || [])
      if (jobRes.success) setJobs(jobRes.jobs || [])
      if (presetRes.success) setPresets(presetRes.presets || {})
    } catch (err) {
      console.error('Failed to fetch Remotion data:', err)
    }
  }, [])

  useEffect(() => {
    fetchData()
    // Poll jobs every 5s
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [fetchData])

  // Validate props JSON
  useEffect(() => {
    try {
      JSON.parse(propsJson)
      setPropsError('')
    } catch {
      setPropsError('Invalid JSON')
    }
  }, [propsJson])

  // Submit render
  const handleRender = async () => {
    if (!selectedComposition && !selectedPreset) return
    if (propsError) return
    
    setRenderLoading(true)
    try {
      const body: any = {
        pushOnComplete,
        pushTarget,
        props: JSON.parse(propsJson),
      }
      
      if (selectedPreset) {
        body.preset = selectedPreset
      } else {
        body.compositionId = selectedComposition
      }
      
      const res = await fetch('/api/remotion/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      
      const data = await res.json()
      if (data.success) {
        setActiveSection('queue')
        fetchData()
      } else {
        alert(`Render failed: ${data.error}`)
      }
    } catch (err: any) {
      alert(`Render error: ${err.message}`)
    } finally {
      setRenderLoading(false)
    }
  }

  // Push existing video
  const handlePushVideo = async (videoId: string) => {
    setPushLoading(videoId)
    try {
      await fetch('/api/remotion/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId, target: pushTarget }),
      })
      fetchData()
    } catch (err: any) {
      alert(`Push error: ${err.message}`)
    } finally {
      setPushLoading(null)
    }
  }

  // Handle composition selection
  const handleCompositionSelect = (id: string) => {
    setSelectedComposition(id)
    setSelectedPreset('')
    // Reset props to default
    setPropsJson('{}')
  }

  // Handle preset selection
  const handlePresetSelect = (id: string) => {
    setSelectedPreset(id)
    setSelectedComposition('')
    const preset = presets[id]
    if (preset?.props) {
      setPropsJson(JSON.stringify(preset.props, null, 2))
    } else {
      setPropsJson('{}')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued': return <Clock className="w-4 h-4 text-yellow-400" />
      case 'rendering': return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'failed': return <XCircle className="w-4 h-4 text-red-400" />
      default: return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const connectedScreens = screens.filter(s => s.connected)

  return (
    <div className="h-full flex">
      {/* Sidebar - Composition/Preset Selection */}
      <div className="w-80 flex-shrink-0 border-r border-dark-600 flex flex-col">
        <div className="p-4 border-b border-dark-700">
          <h3 className="font-medium flex items-center gap-2">
            <Clapperboard className="w-4 h-4 text-accent" />
            Remotion Video Render
          </h3>
        </div>
        
        {/* Section Tabs */}
        <div className="flex border-b border-dark-700">
          <button
            onClick={() => setActiveSection('render')}
            className={`flex-1 px-4 py-2 text-sm ${activeSection === 'render' ? 'bg-dark-700 text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'}`}
          >
            Render
          </button>
          <button
            onClick={() => setActiveSection('queue')}
            className={`flex-1 px-4 py-2 text-sm relative ${activeSection === 'queue' ? 'bg-dark-700 text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'}`}
          >
            Queue
            {jobs.filter(j => j.status === 'rendering' || j.status === 'queued').length > 0 && (
              <span className="absolute top-1 right-2 w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveSection('library')}
            className={`flex-1 px-4 py-2 text-sm ${activeSection === 'library' ? 'bg-dark-700 text-accent border-b-2 border-accent' : 'text-gray-400 hover:text-white'}`}
          >
            Library
          </button>
        </div>
        
        {/* Target Selection */}
        <div className="p-4 border-b border-dark-700 bg-dark-800/50">
          <label className="text-xs text-gray-400 block mb-2">Push Target</label>
          <select
            value={pushTarget}
            onChange={e => setPushTarget(e.target.value)}
            className="w-full bg-dark-700 border border-dark-600 rounded px-3 py-2 text-sm"
          >
            <option value="all">All Screens ({connectedScreens.length} online)</option>
            {screens.map(s => (
              <option key={s.id} value={s.id} disabled={!s.connected}>
                {s.name} {s.connected ? '●' : '○'}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {activeSection === 'render' && (
            <div className="p-4 space-y-4">
              {/* Quick Presets */}
              <div>
                <h4 className="text-sm font-medium text-gray-300 mb-2">Quick Presets</h4>
                <div className="space-y-1">
                  {Object.entries(presets).map(([id, preset]) => (
                    <button
                      key={id}
                      onClick={() => handlePresetSelect(id)}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                        selectedPreset === id
                          ? 'bg-accent/20 border border-accent text-accent'
                          : 'bg-dark-700 hover:bg-dark-600 text-gray-300'
                      }`}
                    >
                      <div className="font-medium">{id}</div>
                      <div className="text-xs text-gray-500">{preset.compositionId}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="border-t border-dark-600 pt-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">All Compositions</h4>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {compositions.map(comp => (
                    <button
                      key={comp.id}
                      onClick={() => handleCompositionSelect(comp.id)}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition ${
                        selectedComposition === comp.id
                          ? 'bg-accent/20 border border-accent text-accent'
                          : 'bg-dark-700 hover:bg-dark-600 text-gray-300'
                      }`}
                    >
                      <div className="font-medium">{comp.id}</div>
                      <div className="text-xs text-gray-500 flex justify-between">
                        <span>{comp.description}</span>
                        <span>{comp.duration}s</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {activeSection === 'queue' && (
            <div className="p-4 space-y-2">
              {jobs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Film className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No render jobs</p>
                </div>
              ) : (
                jobs.map(job => (
                  <div
                    key={job.jobId}
                    className="bg-dark-700 rounded p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{job.compositionId}</span>
                      {getStatusIcon(job.status)}
                    </div>
                    {job.progress !== undefined && job.status === 'rendering' && (
                      <div className="w-full bg-dark-600 rounded-full h-1.5 mb-2">
                        <div 
                          className="bg-accent h-1.5 rounded-full transition-all"
                          style={{ width: `${job.progress * 100}%` }}
                        />
                      </div>
                    )}
                    <div className="text-xs text-gray-500 flex justify-between">
                      <span>{new Date(job.createdAt).toLocaleTimeString()}</span>
                      <span>{job.pushTarget}</span>
                    </div>
                    {job.error && (
                      <div className="text-xs text-red-400 mt-1">{job.error}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
          
          {activeSection === 'library' && (
            <div className="p-4 space-y-2">
              {videos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Video className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No rendered videos</p>
                </div>
              ) : (
                videos.map(video => (
                  <div
                    key={video.id}
                    className="bg-dark-700 rounded p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm truncate flex-1">{video.compositionId}</span>
                      <button
                        onClick={() => handlePushVideo(video.id)}
                        disabled={pushLoading === video.id}
                        className="ml-2 p-1.5 bg-accent/20 hover:bg-accent/30 text-accent rounded transition"
                      >
                        {pushLoading === video.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 flex justify-between">
                      <span>{video.width}x{video.height} • {video.duration}s</span>
                      <span>{video.category}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Main Panel - Props Editor & Preview */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-dark-700 flex items-center justify-between">
          <div>
            <h3 className="font-medium">
              {selectedPreset || selectedComposition || 'Select a composition or preset'}
            </h3>
            {(selectedPreset || selectedComposition) && (
              <p className="text-sm text-gray-500">
                {selectedPreset ? `Preset → ${presets[selectedPreset]?.compositionId}` : 'Custom composition'}
              </p>
            )}
          </div>
          <button
            onClick={fetchData}
            className="p-2 hover:bg-dark-600 rounded transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 p-6 overflow-y-auto">
          {(selectedPreset || selectedComposition) ? (
            <div className="max-w-xl space-y-6">
              {/* Props Editor */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Props (JSON)
                  {propsError && <span className="text-red-400 ml-2">{propsError}</span>}
                </label>
                <textarea
                  value={propsJson}
                  onChange={e => setPropsJson(e.target.value)}
                  placeholder='{"variant": "color", "tagline": "Custom Text"}'
                  className={`w-full h-40 bg-dark-800 border rounded p-3 font-mono text-sm ${
                    propsError ? 'border-red-500' : 'border-dark-600'
                  }`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Pass dynamic data to the composition (text, colors, data arrays, etc.)
                </p>
              </div>
              
              {/* Options */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pushOnComplete}
                    onChange={e => setPushOnComplete(e.target.checked)}
                    className="w-4 h-4 accent-accent"
                  />
                  <span className="text-sm">Auto-push when complete</span>
                </label>
              </div>
              
              {/* Render Button */}
              <button
                onClick={handleRender}
                disabled={renderLoading || !!propsError}
                className="w-full py-3 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-dark-900 font-medium rounded-lg flex items-center justify-center gap-2 transition"
              >
                {renderLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Render Video
                  </>
                )}
              </button>
              
              {/* Preview hint */}
              <div className="text-center text-sm text-gray-500">
                <p>Preview available at Remotion Studio (localhost:3500)</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Film className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg mb-2">Select a composition or preset</p>
                <p className="text-sm">Choose from the sidebar to configure and render</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
