import { useState, useEffect, useCallback, useRef } from 'react'
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Repeat, Clock } from 'lucide-react'
import { ClockWidget } from './ClockWidget'
import { CameraWidget } from './CameraWidget'
import { CameraGridWidget } from './CameraGridWidget'
import { WeatherWidget } from './WeatherWidget'
import { StatsWidget } from './StatsWidget'
import { OccupancyWidget } from './OccupancyWidget'
import { IframeWidget } from './IframeWidget'
import { LayoutWidget } from './LayoutWidget'
import { OperationsDashboardWidget } from './OperationsDashboardWidget'

export interface PlaylistItem {
  id: string
  contentType: 'video' | 'template' | 'widget' | 'url'
  contentId?: string
  url?: string
  widget?: string
  config?: any
  duration: number // seconds
  name: string
}

export interface Playlist {
  id: string
  name: string
  items: PlaylistItem[]
  loop: boolean
  transition: 'fade' | 'slide' | 'none'
}

interface PlaylistPlayerProps {
  playlist: Playlist
  showControls?: boolean
  onComplete?: () => void
  onInterrupt?: () => void
}

// Video base URL - serve from signage server itself (works on all screens)
const VIDEO_BASE_URL = '/video'

export function PlaylistPlayer({ playlist, showControls = false, onComplete, onInterrupt }: PlaylistPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(0) // 0-100
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  
  const currentItem = playlist.items[currentIndex]
  const totalItems = playlist.items.length
  
  // Advance to next item
  const nextItem = useCallback(() => {
    if (currentIndex >= totalItems - 1) {
      if (playlist.loop) {
        setIsTransitioning(true)
        setTimeout(() => {
          setCurrentIndex(0)
          setProgress(0)
          startTimeRef.current = Date.now()
          setIsTransitioning(false)
        }, 500)
      } else {
        setIsPlaying(false)
        onComplete?.()
      }
    } else {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex(i => i + 1)
        setProgress(0)
        startTimeRef.current = Date.now()
        setIsTransitioning(false)
      }, 500)
    }
  }, [currentIndex, totalItems, playlist.loop, onComplete])
  
  // Go to previous item
  const prevItem = useCallback(() => {
    if (currentIndex > 0) {
      setIsTransitioning(true)
      setTimeout(() => {
        setCurrentIndex(i => i - 1)
        setProgress(0)
        startTimeRef.current = Date.now()
        setIsTransitioning(false)
      }, 500)
    }
  }, [currentIndex])
  
  // Progress timer for non-video items
  useEffect(() => {
    if (!isPlaying || !currentItem) return
    
    // Videos manage their own timing
    if (currentItem.contentType === 'video') return
    
    const duration = currentItem.duration * 1000
    startTimeRef.current = Date.now()
    
    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current
      const pct = Math.min((elapsed / duration) * 100, 100)
      setProgress(pct)
      
      if (elapsed >= duration) {
        nextItem()
      } else {
        timerRef.current = requestAnimationFrame(updateProgress)
      }
    }
    
    timerRef.current = requestAnimationFrame(updateProgress)
    
    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current)
      }
    }
  }, [currentIndex, isPlaying, currentItem, nextItem])
  
  // Handle video events
  const handleVideoEnded = useCallback(() => {
    nextItem()
  }, [nextItem])
  
  const handleVideoTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100
      setProgress(pct)
    }
  }, [])
  
  // Pause/play toggle
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {})
      } else {
        videoRef.current.pause()
      }
    }
  }, [isPlaying, currentIndex])
  
  // Mute toggle
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted
    }
  }, [isMuted])
  
  if (!currentItem) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-dark-900 text-gray-500">
        <div className="text-center">
          <Clock className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>Empty playlist</p>
        </div>
      </div>
    )
  }
  
  const getTransitionClass = () => {
    if (playlist.transition === 'none') return ''
    if (playlist.transition === 'fade') {
      return isTransitioning ? 'opacity-0' : 'opacity-100'
    }
    if (playlist.transition === 'slide') {
      return isTransitioning ? '-translate-x-full' : 'translate-x-0'
    }
    return ''
  }
  
  return (
    <div className="w-full h-full relative overflow-hidden bg-dark-900">
      {/* Content Area */}
      <div className={`w-full h-full transition-all duration-500 ${getTransitionClass()}`}>
        <ContentRenderer 
          item={currentItem} 
          videoRef={videoRef}
          onVideoEnded={handleVideoEnded}
          onVideoTimeUpdate={handleVideoTimeUpdate}
          isPlaying={isPlaying}
          isMuted={isMuted}
        />
      </div>
      
      {/* Progress Bar - Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-dark-800/50">
        <div 
          className="h-full bg-accent transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Item Indicators */}
      {totalItems > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {playlist.items.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setIsTransitioning(true)
                setTimeout(() => {
                  setCurrentIndex(i)
                  setProgress(0)
                  startTimeRef.current = Date.now()
                  setIsTransitioning(false)
                }, 300)
              }}
              className={`h-2 rounded-full transition-all ${
                i === currentIndex ? 'bg-accent w-8' : 'bg-white/30 w-2 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
      
      {/* Controls Overlay */}
      {showControls && (
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          {/* Playlist Info */}
          <div className="bg-dark-800/80 backdrop-blur-sm rounded-lg px-3 py-2">
            <div className="text-sm font-medium text-white">{playlist.name}</div>
            <div className="text-xs text-gray-400">
              {currentIndex + 1} / {totalItems} • {currentItem.name}
            </div>
          </div>
          
          {/* Playback Controls */}
          <div className="flex items-center gap-2 bg-dark-800/80 backdrop-blur-sm rounded-lg px-3 py-2">
            <button 
              onClick={prevItem}
              disabled={currentIndex === 0}
              className="p-1 hover:bg-dark-600 rounded disabled:opacity-30"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 bg-accent text-dark-900 rounded-full hover:bg-accent-dim"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            
            <button 
              onClick={nextItem}
              className="p-1 hover:bg-dark-600 rounded"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            
            <div className="w-px h-4 bg-dark-600 mx-1" />
            
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="p-1 hover:bg-dark-600 rounded"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            
            <div className={`p-1 rounded ${playlist.loop ? 'text-accent' : 'text-gray-500'}`}>
              <Repeat className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Content renderer for different content types
function ContentRenderer({ 
  item, 
  videoRef, 
  onVideoEnded, 
  onVideoTimeUpdate,
  isPlaying,
  isMuted
}: { 
  item: PlaylistItem
  videoRef: React.RefObject<HTMLVideoElement>
  onVideoEnded: () => void
  onVideoTimeUpdate: () => void
  isPlaying: boolean
  isMuted: boolean
}) {
  switch (item.contentType) {
    case 'video':
      const videoUrl = item.url || `${VIDEO_BASE_URL}/${item.contentId}.mp4`
      return (
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain bg-black"
          autoPlay={isPlaying}
          muted={isMuted}
          onEnded={onVideoEnded}
          onTimeUpdate={onVideoTimeUpdate}
          playsInline
        />
      )
    
    case 'template':
    case 'url':
      const url = item.url || item.config?.url || ''
      return (
        <iframe
          src={url}
          className="w-full h-full border-0"
          title={item.name}
          allow="autoplay"
        />
      )
    
    case 'widget':
      return <WidgetRenderer widget={item.widget || ''} config={item.config || {}} />
    
    default:
      return (
        <div className="w-full h-full flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="text-xl">Unknown content type</p>
            <p className="text-sm mt-2">{item.contentType}</p>
          </div>
        </div>
      )
  }
}

// Widget renderer
function WidgetRenderer({ widget, config }: { widget: string; config: any }) {
  switch (widget) {
    case 'clock':
      return <ClockWidget config={config} />
    case 'weather':
      return <WeatherWidget config={config} />
    case 'camera':
      return <CameraWidget config={config} />
    case 'camera-grid':
      return <CameraGridWidget config={config} />
    case 'stats':
      return <StatsWidget config={config} />
    case 'occupancy':
      return <OccupancyWidget config={config} />
    case 'iframe':
      return <IframeWidget config={config} />
    case 'layout':
      return <LayoutWidget config={config} />
    case 'operations-dashboard':
      return <OperationsDashboardWidget config={config} />
    default:
      return (
        <div className="w-full h-full flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="text-xl">Unknown widget: {widget}</p>
            <pre className="text-sm mt-2">{JSON.stringify(config, null, 2)}</pre>
          </div>
        </div>
      )
  }
}

// Exportable types for use in other components
export type { PlaylistItem, Playlist }
