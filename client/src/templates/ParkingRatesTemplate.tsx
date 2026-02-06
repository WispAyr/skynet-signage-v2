import { useState, useEffect } from 'react'
import { useContextMood } from '../hooks/useContextMood'

/**
 * Parking Rates / Tariff Board Template (Rise Vision–inspired data-driven)
 *
 * Pulls rates from:
 * 1. Inline data.rates[] (static)
 * 2. Location display-config API (admin-editable)
 * 3. POS API statistics (live occupancy/revenue overlay)
 *
 * Data shape:
 * {
 *   siteName: string
 *   subtitle?: string
 *   locationId?: string        // pull config from /api/locations/:id/display-config
 *   rates?: RateItem[]         // inline override (if no locationId)
 *   notices?: string[]
 *   paymentMethods?: string[]
 *   maxStay?: string
 *   brandColor?: string
 *   showClock?: boolean
 *   showOccupancy?: boolean    // pull live occupancy from POS
 *   posApiUrl?: string         // default http://localhost:3000
 *   posSiteId?: string         // e.g. "KMS01"
 *   refreshInterval?: number   // seconds, default 60
 * }
 */

interface RateItem {
  label: string
  price: string
  highlight?: boolean
  note?: string
}

interface ParkingRatesData {
  siteName: string
  subtitle?: string
  locationId?: string
  rates?: RateItem[]
  notices?: string[]
  paymentMethods?: string[]
  maxStay?: string
  brandColor?: string
  showClock?: boolean
  showOccupancy?: boolean
  posApiUrl?: string
  posSiteId?: string
  refreshInterval?: number
}

interface LiveStats {
  activePayments: number
  totalRevenue: number
  totalPayments: number
}

export function ParkingRatesTemplate({ data }: { data: ParkingRatesData }) {
  const mood = useContextMood(data.locationId)
  const [time, setTime] = useState(new Date())
  const [rates, setRates] = useState<RateItem[]>(data.rates || [])
  const [notices, setNotices] = useState<string[]>(data.notices || [])
  const [paymentMethods, setPaymentMethods] = useState<string[]>(data.paymentMethods || [])
  const [maxStay, setMaxStay] = useState(data.maxStay || '')
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null)
  const [capacity, setCapacity] = useState<number | null>(null)

  const brandColor = data.brandColor || '#F97316'
  const showClock = data.showClock !== false
  const refreshInterval = (data.refreshInterval || 60) * 1000

  // Clock
  useEffect(() => {
    if (!showClock) return
    const iv = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(iv)
  }, [showClock])

  // Pull config from location API if locationId provided
  useEffect(() => {
    if (!data.locationId) return

    const fetchConfig = async () => {
      try {
        const res = await fetch(`/api/locations/${data.locationId}/display-config`)
        const json = await res.json()
        if (json.success && json.data?.config) {
          const cfg = json.data.config
          if (cfg.rates && !data.rates) setRates(cfg.rates)
          if (cfg.paymentMethods && !data.paymentMethods) setPaymentMethods(cfg.paymentMethods)
          if (cfg.maxStay && !data.maxStay) setMaxStay(cfg.maxStay)
          if (cfg.capacity) setCapacity(cfg.capacity)
          // Merge notices from config if not overridden
          if (cfg.features && !data.notices) {
            setNotices(cfg.features)
          }
        }
      } catch (e) { console.error('Failed to fetch location config:', e) }
    }

    fetchConfig()
    const iv = setInterval(fetchConfig, refreshInterval)
    return () => clearInterval(iv)
  }, [data.locationId, refreshInterval])

  // Pull live stats from POS
  useEffect(() => {
    if (!data.showOccupancy) return
    const posUrl = data.posApiUrl || 'http://localhost:3000'
    const siteId = data.posSiteId
    if (!siteId) return

    const fetchStats = async () => {
      try {
        const res = await fetch(`${posUrl}/api/payment/statistics/${siteId}`)
        const json = await res.json()
        setLiveStats({
          activePayments: json.activePayments || 0,
          totalRevenue: json.totalRevenue || 0,
          totalPayments: json.totalPayments || 0,
        })
      } catch (e) { /* POS may not be running */ }
    }

    fetchStats()
    const iv = setInterval(fetchStats, 30000)
    return () => clearInterval(iv)
  }, [data.showOccupancy, data.posApiUrl, data.posSiteId])

  const occupiedSpaces = liveStats?.activePayments || 0
  const availableSpaces = capacity ? capacity - occupiedSpaces : null

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <div
        className="flex-shrink-0 px-8 py-6"
        style={{ background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}cc 100%)` }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-wider" style={{ fontFamily: 'Antonio, sans-serif' }}>
              {data.siteName}
            </h1>
            {data.subtitle && <p className="text-lg text-white/80 mt-1 tracking-wide">{data.subtitle}</p>}
          </div>
          <div className="flex items-center gap-6">
            {/* Live occupancy badge */}
            {availableSpaces !== null && (
              <div className="text-center bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3">
                <div className="text-3xl font-bold text-white tabular-nums" style={{ fontFamily: 'Antonio, sans-serif' }}>
                  {availableSpaces}
                </div>
                <div className="text-xs text-white/70 tracking-wider">SPACES</div>
              </div>
            )}
            {showClock && (
              <div className="text-right">
                <div className="text-3xl font-bold text-white tabular-nums" style={{ fontFamily: 'Antonio, sans-serif' }}>
                  {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-sm text-white/60">
                  {time.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rates */}
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        <div className="space-y-3 max-w-2xl mx-auto">
          {rates.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">🅿️</div>
              <div className="text-lg">Loading tariff data...</div>
            </div>
          ) : rates.map((rate, i) => (
            <div
              key={i}
              className={`flex items-center justify-between p-5 rounded-xl transition-all ${rate.highlight ? 'border-2' : 'border border-gray-800'}`}
              style={rate.highlight ? { background: `${brandColor}10`, borderColor: `${brandColor}60` } : { background: 'rgba(255,255,255,0.03)' }}
            >
              <div className="flex items-center gap-4">
                <div className="w-1.5 h-10 rounded-full" style={{ background: rate.highlight ? brandColor : '#374151' }} />
                <div>
                  <div className="text-xl md:text-2xl font-semibold text-white" style={{ fontFamily: 'Antonio, sans-serif' }}>
                    {rate.label}
                  </div>
                  {rate.note && (
                    <div className="text-xs mt-1 tracking-wider font-medium" style={{ color: brandColor }}>
                      {rate.note}
                    </div>
                  )}
                </div>
              </div>
              <div
                className="text-3xl md:text-4xl font-bold tabular-nums"
                style={{ fontFamily: 'Antonio, sans-serif', color: rate.highlight ? brandColor : '#ffffff' }}
              >
                {rate.price}
              </div>
            </div>
          ))}
        </div>

        {maxStay && (
          <div className="text-center mt-6">
            <span className="text-sm text-gray-500 tracking-wider">MAXIMUM STAY: </span>
            <span className="text-sm font-bold text-white tracking-wider">{maxStay}</span>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0 px-8 py-4 border-t border-gray-800 bg-black/40">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex flex-wrap gap-3">
            {notices.map((notice, i) => (
              <span key={i} className="text-sm px-4 py-1.5 rounded-full border"
                style={{ color: `${brandColor}dd`, borderColor: `${brandColor}40`, background: `${brandColor}10` }}>
                {notice}
              </span>
            ))}
          </div>
          {paymentMethods.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 tracking-wider">PAYMENT:</span>
              {paymentMethods.map((method, i) => (
                <span key={i} className="text-xs px-3 py-1 bg-gray-800 text-gray-300 rounded-full">{method}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
