import { useState, useEffect, useRef } from 'react'

/**
 * Announcement Board Template (Rise Vision jobs-board–inspired)
 *
 * Auto-refreshing notice board that pulls from /api/announcements.
 * Admin-editable via signage dashboard — no code changes needed.
 *
 * Data shape:
 * {
 *   title?: string              // "SITE NOTICES" header
 *   locationId?: string         // filter to location-specific + global announcements
 *   maxItems?: number           // max shown at once (default 6)
 *   rotatePages?: boolean       // paginate and auto-rotate if more than maxItems
 *   rotateInterval?: number     // seconds between page rotations (default 12)
 *   refreshInterval?: number    // seconds between API refreshes (default 30)
 *   showTimestamps?: boolean    // show when each notice was posted
 *   brandColor?: string
 *   showClock?: boolean
 *   layout?: 'list' | 'cards'  // display style
 * }
 */

interface AnnouncementBoardData {
  title?: string
  locationId?: string
  maxItems?: number
  rotatePages?: boolean
  rotateInterval?: number
  refreshInterval?: number
  showTimestamps?: boolean
  brandColor?: string
  showClock?: boolean
  layout?: 'list' | 'cards'
}

interface Announcement {
  id: string
  title: string
  message: string
  icon: string
  priority: 'normal' | 'high' | 'urgent'
  location_name?: string
  created_at: number
  updated_at: number
}

const PRIORITY_COLORS = {
  normal: { bg: 'rgba(255,255,255,0.03)', border: '#1f2937', badge: '' },
  high: { bg: 'rgba(251,191,36,0.05)', border: '#92400e', badge: 'bg-amber-500/20 text-amber-400' },
  urgent: { bg: 'rgba(239,68,68,0.05)', border: '#991b1b', badge: 'bg-red-500/20 text-red-400' },
}

export function AnnouncementBoardTemplate({ data }: { data: AnnouncementBoardData }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [currentPage, setCurrentPage] = useState(0)
  const [time, setTime] = useState(new Date())
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const brandColor = data.brandColor || '#F97316'
  const maxItems = data.maxItems || 6
  const rotateInterval = (data.rotateInterval || 12) * 1000
  const refreshInterval = (data.refreshInterval || 30) * 1000
  const showClock = data.showClock !== false
  const layout = data.layout || 'list'

  // Clock
  useEffect(() => {
    if (!showClock) return
    const iv = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(iv)
  }, [showClock])

  // Fetch announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        let url = '/api/announcements?active_only=true'
        if (data.locationId) url += `&location_id=${data.locationId}`
        const res = await fetch(url)
        const json = await res.json()
        if (json.success) {
          setAnnouncements(json.data || [])
          setLastRefresh(new Date())
        }
      } catch (e) { console.error('Failed to fetch announcements:', e) }
    }

    fetchAnnouncements()
    const iv = setInterval(fetchAnnouncements, refreshInterval)
    return () => clearInterval(iv)
  }, [data.locationId, refreshInterval])

  // Page rotation
  const totalPages = Math.ceil(announcements.length / maxItems)
  useEffect(() => {
    if (!data.rotatePages || totalPages <= 1) return
    const iv = setInterval(() => {
      setCurrentPage(p => (p + 1) % totalPages)
    }, rotateInterval)
    return () => clearInterval(iv)
  }, [data.rotatePages, totalPages, rotateInterval])

  // Get current page items
  const pageStart = currentPage * maxItems
  const currentItems = announcements.slice(pageStart, pageStart + maxItems)

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-8 py-5 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <div className="w-2 h-8 rounded-full" style={{ background: brandColor }} />
          <div>
            <h1 className="text-2xl font-bold tracking-widest" style={{ fontFamily: 'Antonio, sans-serif', color: brandColor }}>
              {data.title || 'SITE NOTICES'}
            </h1>
            {lastRefresh && (
              <p className="text-[10px] text-gray-600 tracking-wider mt-0.5">
                Updated {lastRefresh.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {totalPages > 1 && (
            <div className="text-xs text-gray-500">
              {currentPage + 1} / {totalPages}
            </div>
          )}
          {showClock && (
            <div className="text-2xl font-bold text-white tabular-nums" style={{ fontFamily: 'Antonio, sans-serif' }}>
              {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      </div>

      {/* Announcements */}
      <div className="flex-1 p-6 overflow-hidden">
        {announcements.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-5xl mb-4">📋</div>
              <div className="text-xl" style={{ fontFamily: 'Antonio, sans-serif' }}>No Current Notices</div>
              <div className="text-sm text-gray-600 mt-1">Check back later for updates</div>
            </div>
          </div>
        ) : layout === 'cards' ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 h-full content-start">
            {currentItems.map(ann => (
              <AnnouncementCard key={ann.id} ann={ann} brandColor={brandColor} showTimestamps={data.showTimestamps} />
            ))}
          </div>
        ) : (
          <div className="space-y-3 h-full">
            {currentItems.map(ann => (
              <AnnouncementRow key={ann.id} ann={ann} brandColor={brandColor} showTimestamps={data.showTimestamps} />
            ))}
          </div>
        )}
      </div>

      {/* Page indicators */}
      {totalPages > 1 && (
        <div className="flex-shrink-0 flex justify-center gap-2 pb-4">
          {Array.from({ length: totalPages }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === currentPage ? 'w-8' : 'w-1.5 opacity-30'}`}
              style={{ background: i === currentPage ? brandColor : '#6b7280' }}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex-shrink-0 h-1" style={{ background: `linear-gradient(90deg, ${brandColor}, ${brandColor}80, transparent)` }} />
    </div>
  )
}

function AnnouncementRow({ ann, brandColor, showTimestamps }: { ann: Announcement; brandColor: string; showTimestamps?: boolean }) {
  const pStyle = PRIORITY_COLORS[ann.priority] || PRIORITY_COLORS.normal
  return (
    <div
      className="flex items-start gap-4 p-5 rounded-xl border transition-all"
      style={{ background: pStyle.bg, borderColor: pStyle.border }}
    >
      {ann.icon && <span className="text-2xl flex-shrink-0 mt-0.5">{ann.icon}</span>}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Antonio, sans-serif' }}>{ann.title}</h3>
          {ann.priority !== 'normal' && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider ${pStyle.badge}`}>
              {ann.priority.toUpperCase()}
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400 leading-relaxed">{ann.message}</p>
        {showTimestamps && ann.created_at && (
          <div className="text-[10px] text-gray-600 mt-2 tracking-wider">
            Posted {new Date(ann.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        )}
      </div>
    </div>
  )
}

function AnnouncementCard({ ann, brandColor, showTimestamps }: { ann: Announcement; brandColor: string; showTimestamps?: boolean }) {
  const pStyle = PRIORITY_COLORS[ann.priority] || PRIORITY_COLORS.normal
  return (
    <div
      className="flex flex-col p-5 rounded-xl border h-full"
      style={{ background: pStyle.bg, borderColor: pStyle.border }}
    >
      <div className="flex items-center gap-3 mb-3">
        {ann.icon && <span className="text-xl">{ann.icon}</span>}
        {ann.priority !== 'normal' && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider ${pStyle.badge}`}>
            {ann.priority.toUpperCase()}
          </span>
        )}
      </div>
      <h3 className="text-base font-bold text-white mb-2" style={{ fontFamily: 'Antonio, sans-serif' }}>{ann.title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed flex-1">{ann.message}</p>
      {showTimestamps && ann.created_at && (
        <div className="text-[10px] text-gray-600 mt-3 tracking-wider">
          {new Date(ann.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </div>
      )}
    </div>
  )
}
