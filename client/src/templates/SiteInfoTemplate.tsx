import { useState, useEffect } from 'react'

/**
 * Site Information Display Template (Rise Vision retail-inspired)
 *
 * All-in-one site information board: name, capacity, features, rules, contact.
 * Pulls live data from POS API + location config.
 *
 * Data shape:
 * {
 *   locationId?: string        // auto-pull everything from location display-config
 *   siteName: string
 *   subtitle?: string          // "Multi-Storey Car Park"
 *   capacity?: number
 *   features?: string[]        // ["ANPR Active", "CCTV 24/7", "Disabled Bays"]
 *   rules?: string[]           // ["Max stay 24 hours", "No return within 2 hours"]
 *   contact?: { phone?: string, email?: string, website?: string }
 *   operatingHours?: { open: string, close: string }
 *   showOccupancy?: boolean
 *   posApiUrl?: string
 *   posSiteId?: string
 *   brandColor?: string
 *   refreshInterval?: number
 * }
 */

interface SiteInfoData {
  locationId?: string
  siteName: string
  subtitle?: string
  capacity?: number
  features?: string[]
  rules?: string[]
  contact?: { phone?: string; email?: string; website?: string }
  operatingHours?: { open: string; close: string }
  showOccupancy?: boolean
  posApiUrl?: string
  posSiteId?: string
  brandColor?: string
  refreshInterval?: number
}

const FEATURE_ICONS: Record<string, string> = {
  'anpr': '📷', 'cctv': '📹', 'disabled': '♿', 'parent': '👶', 'ev': '⚡',
  'surface': '🅿️', 'multi': '🏢', 'barrier': '🚧', 'pay': '💳', 'app': '📱',
}

function featureIcon(feature: string): string {
  const lower = feature.toLowerCase()
  for (const [key, icon] of Object.entries(FEATURE_ICONS)) {
    if (lower.includes(key)) return icon
  }
  return '✓'
}

export function SiteInfoTemplate({ data }: { data: SiteInfoData }) {
  const [time, setTime] = useState(new Date())
  const [config, setConfig] = useState<any>(null)
  const [occupancy, setOccupancy] = useState<{ active: number } | null>(null)

  const brandColor = data.brandColor || '#F97316'
  const refreshInterval = (data.refreshInterval || 60) * 1000

  // Clock
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(iv)
  }, [])

  // Fetch location config
  useEffect(() => {
    if (!data.locationId) return
    const fetchConfig = async () => {
      try {
        const res = await fetch(`/api/locations/${data.locationId}/display-config`)
        const json = await res.json()
        if (json.success) setConfig(json.data?.config || {})
      } catch (e) { /* ignore */ }
    }
    fetchConfig()
    const iv = setInterval(fetchConfig, refreshInterval)
    return () => clearInterval(iv)
  }, [data.locationId, refreshInterval])

  // Fetch occupancy from POS
  useEffect(() => {
    const posUrl = (config?.posApiUrl || data.posApiUrl || 'http://localhost:3000')
    const siteId = config?.posSiteId || data.posSiteId
    if (!siteId || data.showOccupancy === false) return

    const fetchOcc = async () => {
      try {
        const res = await fetch(`${posUrl}/api/payment/statistics/${siteId}`)
        const json = await res.json()
        setOccupancy({ active: json.activePayments || 0 })
      } catch (e) { /* ignore */ }
    }
    fetchOcc()
    const iv = setInterval(fetchOcc, 30000)
    return () => clearInterval(iv)
  }, [config?.posApiUrl, config?.posSiteId, data.posApiUrl, data.posSiteId, data.showOccupancy])

  // Merge static data with API config
  const siteName = data.siteName
  const subtitle = data.subtitle
  const capacity = data.capacity || config?.capacity
  const features = data.features || config?.features || []
  const rules = data.rules || config?.rules || []
  const contact = data.contact || config?.contact || {}
  const hours = data.operatingHours || config?.operatingHours

  const occupied = occupancy?.active || 0
  const available = capacity ? Math.max(0, capacity - occupied) : null
  const pctFull = capacity ? Math.round((occupied / capacity) * 100) : 0

  // Is the site currently open?
  const currentTime = time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  const isOpen = hours ? currentTime >= hours.open && currentTime <= hours.close : true

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* Header with site name + status */}
      <div className="flex-shrink-0 px-8 py-6 border-b border-gray-800" style={{ background: `linear-gradient(135deg, ${brandColor}20 0%, transparent 100%)` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl" style={{ background: `${brandColor}20`, border: `2px solid ${brandColor}50` }}>
              🅿️
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white tracking-wider" style={{ fontFamily: 'Antonio, sans-serif' }}>
                {siteName}
              </h1>
              {subtitle && <p className="text-gray-400 mt-0.5 tracking-wide">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Open/Closed badge */}
            <div className={`px-4 py-2 rounded-full text-sm font-bold tracking-wider ${
              isOpen ? 'bg-green-500/20 text-green-400 border border-green-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'
            }`}>
              {isOpen ? 'OPEN' : 'CLOSED'}
            </div>
            {/* Clock */}
            <div className="text-right">
              <div className="text-2xl font-bold text-white tabular-nums" style={{ fontFamily: 'Antonio, sans-serif' }}>
                {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-xs text-gray-500">{time.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="flex-1 grid grid-cols-3 gap-0 overflow-hidden">
        {/* Left: Occupancy */}
        <div className="flex flex-col items-center justify-center p-8 border-r border-gray-800">
          {available !== null ? (
            <>
              {/* Circular gauge */}
              <div className="relative mb-4">
                <svg width="200" height="200" className="transform -rotate-90">
                  <circle cx="100" cy="100" r="85" fill="none" stroke="#1f2937" strokeWidth="14" />
                  <circle
                    cx="100" cy="100" r="85" fill="none"
                    stroke={pctFull > 90 ? '#ef4444' : pctFull > 70 ? '#f59e0b' : '#10b981'}
                    strokeWidth="14" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 85}
                    strokeDashoffset={2 * Math.PI * 85 * (1 - pctFull / 100)}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-5xl font-bold text-white" style={{ fontFamily: 'Antonio, sans-serif' }}>{available}</div>
                  <div className="text-sm text-gray-400 tracking-wider">AVAILABLE</div>
                </div>
              </div>
              <div className="flex gap-6 text-center text-sm">
                <div>
                  <div className="text-xl font-bold text-white" style={{ fontFamily: 'Antonio, sans-serif' }}>{occupied}</div>
                  <div className="text-gray-500">Occupied</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-white" style={{ fontFamily: 'Antonio, sans-serif' }}>{capacity}</div>
                  <div className="text-gray-500">Capacity</div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">🅿️</div>
              <div className="text-lg font-medium text-white" style={{ fontFamily: 'Antonio, sans-serif' }}>CAR PARK</div>
              {capacity && <div className="text-sm text-gray-400 mt-1">{capacity} spaces</div>}
            </div>
          )}
        </div>

        {/* Center: Features + Operating Hours */}
        <div className="flex flex-col p-8 border-r border-gray-800 overflow-y-auto">
          <h3 className="text-xs font-bold tracking-widest mb-4" style={{ color: brandColor }}>FACILITIES</h3>
          <div className="space-y-3 mb-8">
            {features.map((feature, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg">
                <span className="text-lg">{featureIcon(feature)}</span>
                <span className="text-sm text-white font-medium">{feature}</span>
              </div>
            ))}
          </div>

          {hours && (
            <>
              <h3 className="text-xs font-bold tracking-widest mb-3" style={{ color: brandColor }}>OPERATING HOURS</h3>
              <div className="p-4 bg-dark-700/50 rounded-lg text-center">
                <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Antonio, sans-serif' }}>
                  {hours.open} — {hours.close}
                </div>
                <div className="text-xs text-gray-500 mt-1 tracking-wider">MONDAY TO SUNDAY</div>
              </div>
            </>
          )}
        </div>

        {/* Right: Rules + Contact */}
        <div className="flex flex-col p-8 overflow-y-auto">
          {rules.length > 0 && (
            <>
              <h3 className="text-xs font-bold tracking-widest mb-4" style={{ color: brandColor }}>CONDITIONS OF USE</h3>
              <div className="space-y-2 mb-8">
                {rules.map((rule, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                      style={{ background: `${brandColor}20`, color: brandColor }}>
                      {i + 1}
                    </div>
                    <span className="text-gray-300">{rule}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {(contact.phone || contact.email || contact.website) && (
            <>
              <h3 className="text-xs font-bold tracking-widest mb-4" style={{ color: brandColor }}>CONTACT</h3>
              <div className="space-y-3">
                {contact.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-lg">📞</span>
                    <span className="text-gray-300">{contact.phone}</span>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-lg">📧</span>
                    <span className="text-gray-300">{contact.email}</span>
                  </div>
                )}
                {contact.website && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-lg">🌐</span>
                    <span className="text-gray-300">{contact.website}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Branding footer */}
          <div className="mt-auto pt-6 flex items-center gap-2">
            <div className="w-6 h-1.5 rounded-full" style={{ background: brandColor }} />
            <span className="text-xs text-gray-600 tracking-widest" style={{ fontFamily: 'Antonio, sans-serif' }}>PARKWISE</span>
          </div>
        </div>
      </div>
    </div>
  )
}
