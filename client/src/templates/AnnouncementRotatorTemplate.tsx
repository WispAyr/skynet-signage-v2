import { useState, useEffect, useRef } from 'react'

/**
 * Announcement / Event Rotator Template
 * Rotating notices with nice animations — site notices, events, messages
 *
 * Data shape:
 * {
 *   title?: string                // "Site Notices" header
 *   announcements: Array<{
 *     title: string               // "Free Parking Weekend"
 *     message: string             // "This Saturday and Sunday..."
 *     icon?: string               // emoji or icon name
 *     color?: string              // accent color for this card
 *     priority?: 'normal' | 'high' | 'urgent'
 *     footer?: string             // "Valid until 31 Dec"
 *   }>
 *   rotateInterval?: number       // seconds between slides (default 8)
 *   brandColor?: string
 *   showClock?: boolean
 *   showProgress?: boolean        // show progress bar
 *   transition?: 'fade' | 'slide' // animation type
 * }
 */

interface Announcement {
  title: string
  message: string
  icon?: string
  color?: string
  priority?: 'normal' | 'high' | 'urgent'
  footer?: string
}

interface AnnouncementRotatorData {
  title?: string
  announcements: Announcement[]
  rotateInterval?: number
  brandColor?: string
  showClock?: boolean
  showProgress?: boolean
  transition?: 'fade' | 'slide'
}

const PRIORITY_STYLES = {
  normal: { border: '', badge: '' },
  high: { border: 'ring-2 ring-amber-500/30', badge: 'bg-amber-500/20 text-amber-400' },
  urgent: { border: 'ring-2 ring-red-500/30', badge: 'bg-red-500/20 text-red-400' },
}

export function AnnouncementRotatorTemplate({ data }: { data: AnnouncementRotatorData }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [time, setTime] = useState(new Date())
  const progressRef = useRef<number>(0)
  const animFrameRef = useRef<number>(0)

  const brandColor = data.brandColor || '#F97316'
  const interval = (data.rotateInterval || 8) * 1000
  const showClock = data.showClock !== false
  const showProgress = data.showProgress !== false
  const items = data.announcements || []

  // Clock
  useEffect(() => {
    if (!showClock) return
    const iv = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(iv)
  }, [showClock])

  // Auto-rotate
  useEffect(() => {
    if (items.length <= 1) return

    let startTime = Date.now()
    const tick = () => {
      const elapsed = Date.now() - startTime
      const pct = Math.min(elapsed / interval, 1)
      setProgress(pct)

      if (pct >= 1) {
        setIsTransitioning(true)
        setTimeout(() => {
          setCurrentIndex(prev => (prev + 1) % items.length)
          setIsTransitioning(false)
          startTime = Date.now()
        }, 400)
      }

      animFrameRef.current = requestAnimationFrame(tick)
    }

    animFrameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [items.length, interval])

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-4">📋</div>
          <div className="text-xl">No Announcements</div>
        </div>
      </div>
    )
  }

  const current = items[currentIndex]
  const priority = current.priority || 'normal'
  const accentColor = current.color || brandColor

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-8 py-5 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <div className="w-2 h-8 rounded-full" style={{ background: brandColor }} />
          <h2
            className="text-2xl font-bold tracking-widest"
            style={{ fontFamily: 'Antonio, sans-serif', color: brandColor }}
          >
            {data.title || 'ANNOUNCEMENTS'}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          {showClock && (
            <div className="text-2xl font-bold text-white tabular-nums" style={{ fontFamily: 'Antonio, sans-serif' }}>
              {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
          <div className="text-sm text-gray-500">
            {currentIndex + 1} / {items.length}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {showProgress && items.length > 1 && (
        <div className="flex-shrink-0 h-1 bg-dark-700">
          <div
            className="h-full transition-all duration-100"
            style={{
              width: `${progress * 100}%`,
              background: `linear-gradient(90deg, ${brandColor}, ${accentColor})`,
            }}
          />
        </div>
      )}

      {/* Main announcement */}
      <div className="flex-1 flex items-center justify-center p-8 md:p-12">
        <div
          className={`max-w-3xl w-full transition-all duration-400 ${
            isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
          } ${PRIORITY_STYLES[priority].border}`}
        >
          {/* Icon */}
          {current.icon && (
            <div className="text-6xl mb-6 text-center">{current.icon}</div>
          )}

          {/* Priority badge */}
          {priority !== 'normal' && (
            <div className="flex justify-center mb-4">
              <span className={`text-xs px-3 py-1 rounded-full tracking-widest font-bold ${PRIORITY_STYLES[priority].badge}`}>
                {priority.toUpperCase()}
              </span>
            </div>
          )}

          {/* Title */}
          <h1
            className="text-4xl md:text-6xl font-bold text-white text-center mb-6 leading-tight"
            style={{ fontFamily: 'Antonio, sans-serif' }}
          >
            {current.title}
          </h1>

          {/* Message */}
          <p className="text-xl md:text-2xl text-gray-300 text-center leading-relaxed max-w-2xl mx-auto">
            {current.message}
          </p>

          {/* Footer */}
          {current.footer && (
            <div className="text-center mt-8">
              <span
                className="text-sm px-4 py-2 rounded-full border"
                style={{
                  color: `${accentColor}cc`,
                  borderColor: `${accentColor}40`,
                  background: `${accentColor}10`,
                }}
              >
                {current.footer}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom dot indicators */}
      {items.length > 1 && (
        <div className="flex-shrink-0 flex justify-center gap-2 pb-6">
          {items.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentIndex ? 'w-8' : 'w-2 opacity-30'
              }`}
              style={{ background: i === currentIndex ? brandColor : '#6b7280' }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
