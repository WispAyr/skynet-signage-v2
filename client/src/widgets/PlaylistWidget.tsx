import { useState, useEffect } from 'react'
import { ClockWidget } from './ClockWidget'
import { CameraWidget } from './CameraWidget'
import { CameraGridWidget } from './CameraGridWidget'
import { WeatherWidget } from './WeatherWidget'
import { StatsWidget } from './StatsWidget'
import { OccupancyWidget } from './OccupancyWidget'
import { IframeWidget } from './IframeWidget'
import { LayoutWidget } from './LayoutWidget'

interface PlaylistItem {
  widget: string
  config?: any
  duration?: number // Seconds to show this item
}

interface PlaylistConfig {
  items: PlaylistItem[]
  defaultDuration?: number  // Default seconds per item
  transition?: 'fade' | 'slide' | 'none'
  shuffle?: boolean
}

export function PlaylistWidget({ config }: { config: PlaylistConfig }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [displayIndex, setDisplayIndex] = useState(0)
  
  const defaultDuration = config.defaultDuration || 30
  const transition = config.transition || 'fade'
  const items = config.shuffle ? shuffleArray([...config.items]) : config.items
  
  useEffect(() => {
    if (items.length <= 1) return
    
    const currentItem = items[currentIndex]
    const duration = (currentItem.duration || defaultDuration) * 1000
    
    const timer = setTimeout(() => {
      // Start transition
      setIsTransitioning(true)
      
      setTimeout(() => {
        setCurrentIndex(i => (i + 1) % items.length)
        setDisplayIndex(i => (i + 1) % items.length)
        setIsTransitioning(false)
      }, 500) // Transition duration
    }, duration)
    
    return () => clearTimeout(timer)
  }, [currentIndex, items, defaultDuration])
  
  const current = items[displayIndex]
  if (!current) return null
  
  const getTransitionClass = () => {
    if (transition === 'none') return ''
    if (transition === 'fade') {
      return isTransitioning ? 'opacity-0' : 'opacity-100'
    }
    if (transition === 'slide') {
      return isTransitioning ? 'translate-x-full' : 'translate-x-0'
    }
    return ''
  }

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div className={`w-full h-full transition-all duration-500 ${getTransitionClass()}`}>
        <ItemRenderer widget={current.widget} config={current.config || {}} />
      </div>
      
      {/* Progress dots */}
      {items.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {items.map((_, i) => (
            <div 
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === displayIndex ? 'bg-accent w-6' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ItemRenderer({ widget, config }: { widget: string; config: any }) {
  switch (widget) {
    case 'clock': return <ClockWidget config={config} />
    case 'weather': return <WeatherWidget config={config} />
    case 'camera': return <CameraWidget config={config} />
    case 'camera-grid': return <CameraGridWidget config={config} />
    case 'stats': return <StatsWidget config={config} />
    case 'occupancy': return <OccupancyWidget config={config} />
    case 'iframe': return <IframeWidget config={config} />
    case 'layout': return <LayoutWidget config={config} />
    default: return <div className="flex items-center justify-center h-full text-gray-500">Unknown: {widget}</div>
  }
}

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]
  }
  return array
}
