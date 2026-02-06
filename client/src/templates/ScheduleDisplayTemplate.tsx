import { useState, useEffect } from 'react'

/**
 * Schedule Display Template (Rise Vision events/calendar–inspired)
 *
 * Shows current parking rate status: peak/off-peak, time-of-day pricing,
 * upcoming rate changes, and special event pricing.
 * Pulls schedule data from location config + signage schedules API.
 *
 * Data shape:
 * {
 *   siteName: string
 *   locationId?: string        // pull from location config
 *   periods: Array<{
 *     name: string             // "Standard", "Peak", "Evening", "Weekend"
 *     startTime: string        // "09:00"
 *     endTime: string          // "17:00"
 *     days?: number[]          // [1,2,3,4,5] = Mon-Fri. Empty = every day
 *     rates: Array<{ label: string; price: string }>
 *     color?: string           // accent color for this period
 *     active?: boolean         // override: is this period currently active?
 *   }>
 *   specialEvents?: Array<{
 *     name: string             // "Town Centre Event"
 *     date: string             // "2026-02-14"
 *     note: string             // "Flat rate £3 all day"
 *     color?: string
 *   }>
 *   brandColor?: string
 *   showClock?: boolean
 *   showOccupancy?: boolean
 *   posApiUrl?: string
 *   posSiteId?: string
 *   refreshInterval?: number
 * }
 */

interface SchedulePeriod {
  name: string
  startTime: string
  endTime: string
  days?: number[]
  rates: Array<{ label: string; price: string }>
  color?: string
  active?: boolean
}

interface SpecialEvent {
  name: string
  date: string
  note: string
  color?: string
}

interface ScheduleDisplayData {
  siteName: string
  locationId?: string
  periods: SchedulePeriod[]
  specialEvents?: SpecialEvent[]
  brandColor?: string
  showClock?: boolean
  showOccupancy?: boolean
  posApiUrl?: string
  posSiteId?: string
  refreshInterval?: number
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function ScheduleDisplayTemplate({ data }: { data: ScheduleDisplayData }) {
  const [time, setTime] = useState(new Date())
  const [liveActive, setLiveActive] = useState<number | null>(null)

  const brandColor = data.brandColor || '#F97316'
  const showClock = data.showClock !== false
  const periods = data.periods || []

  // Clock
  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(iv)
  }, [])

  // POS occupancy
  useEffect(() => {
    if (!data.showOccupancy) return
    const posUrl = data.posApiUrl || 'http://localhost:3000'
    const siteId = data.posSiteId
    if (!siteId) return

    const fetch_ = async () => {
      try {
        const res = await fetch(`${posUrl}/api/payment/statistics/${siteId}`)
        const json = await res.json()
        setLiveActive(json.activePayments || 0)
      } catch (e) { /* ignore */ }
    }
    fetch_()
    const iv = setInterval(fetch_, 30000)
    return () => clearInterval(iv)
  }, [data.showOccupancy, data.posApiUrl, data.posSiteId])

  // Determine which period is currently active
  const currentDay = time.getDay()
  const currentTime = time.toTimeString().slice(0, 5)
  
  const getActivePeriodIndex = () => {
    for (let i = 0; i < periods.length; i++) {
      const p = periods[i]
      if (p.active !== undefined) {
        if (p.active) return i
        continue
      }
      const dayMatch = !p.days || p.days.length === 0 || p.days.includes(currentDay)
      const timeMatch = currentTime >= p.startTime && currentTime <= p.endTime
      if (dayMatch && timeMatch) return i
    }
    return -1
  }
  const activePeriodIndex = getActivePeriodIndex()
  const activePeriod = activePeriodIndex >= 0 ? periods[activePeriodIndex] : null

  // Find next period
  const getNextPeriod = () => {
    if (periods.length <= 1) return null
    // Simple: find next period that starts after current time today
    for (const p of periods) {
      if (p === activePeriod) continue
      const dayMatch = !p.days || p.days.length === 0 || p.days.includes(currentDay)
      if (dayMatch && p.startTime > currentTime) return p
    }
    // Wrap to tomorrow's first period
    const tomorrow = (currentDay + 1) % 7
    for (const p of periods) {
      const dayMatch = !p.days || p.days.length === 0 || p.days.includes(tomorrow)
      if (dayMatch) return p
    }
    return null
  }
  const nextPeriod = getNextPeriod()

  // Special events today or upcoming
  const today = time.toISOString().slice(0, 10)
  const todayEvents = data.specialEvents?.filter(e => e.date === today) || []
  const upcomingEvents = data.specialEvents?.filter(e => e.date > today).slice(0, 3) || []

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-8 py-5 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <div className="w-2 h-8 rounded-full" style={{ background: brandColor }} />
          <div>
            <h1 className="text-2xl font-bold tracking-widest text-white" style={{ fontFamily: 'Antonio, sans-serif' }}>
              {data.siteName}
            </h1>
            <p className="text-xs tracking-widest mt-0.5" style={{ color: `${brandColor}cc` }}>RATE SCHEDULE</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          {liveActive !== null && (
            <div className="px-4 py-2 rounded-xl bg-dark-700 border border-dark-600 text-center">
              <div className="text-lg font-bold text-white tabular-nums" style={{ fontFamily: 'Antonio, sans-serif' }}>{liveActive}</div>
              <div className="text-[10px] text-gray-500 tracking-wider">IN USE</div>
            </div>
          )}
          {showClock && (
            <div className="text-right">
              <div className="text-3xl font-bold text-white tabular-nums" style={{ fontFamily: 'Antonio, sans-serif' }}>
                {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-xs text-gray-500">
                {time.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Special event banner */}
      {todayEvents.length > 0 && (
        <div className="flex-shrink-0 px-8 py-3 bg-amber-500/10 border-b border-amber-500/30">
          {todayEvents.map((event, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-lg">🎉</span>
              <span className="text-sm font-bold text-amber-400 tracking-wider" style={{ fontFamily: 'Antonio, sans-serif' }}>
                {event.name}:
              </span>
              <span className="text-sm text-amber-300">{event.note}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main content: active period + timeline */}
      <div className="flex-1 flex overflow-hidden">
        {/* Current rate - large display */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {activePeriod ? (
            <>
              <div className="px-4 py-1.5 rounded-full text-xs font-bold tracking-widest mb-4 border"
                style={{
                  color: activePeriod.color || brandColor,
                  borderColor: `${activePeriod.color || brandColor}60`,
                  background: `${activePeriod.color || brandColor}15`,
                }}>
                NOW ACTIVE
              </div>
              <h2 className="text-4xl font-bold text-white mb-6" style={{ fontFamily: 'Antonio, sans-serif' }}>
                {activePeriod.name}
              </h2>
              <div className="text-sm text-gray-500 mb-6 tracking-wider">
                {activePeriod.startTime} — {activePeriod.endTime}
                {activePeriod.days && activePeriod.days.length > 0 && activePeriod.days.length < 7 && (
                  <span className="ml-2">({activePeriod.days.map(d => DAY_NAMES[d]).join(', ')})</span>
                )}
              </div>
              <div className="space-y-3 w-full max-w-md">
                {activePeriod.rates.map((rate, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-gray-800 bg-dark-700/30">
                    <span className="text-lg text-gray-300" style={{ fontFamily: 'Antonio, sans-serif' }}>{rate.label}</span>
                    <span className="text-2xl font-bold" style={{ fontFamily: 'Antonio, sans-serif', color: activePeriod.color || brandColor }}>
                      {rate.price}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center text-gray-500">
              <div className="text-4xl mb-4">⏰</div>
              <div className="text-xl" style={{ fontFamily: 'Antonio, sans-serif' }}>NO ACTIVE PERIOD</div>
              <div className="text-sm text-gray-600 mt-1">Outside operating hours</div>
            </div>
          )}
        </div>

        {/* Sidebar: all periods + next up + events */}
        <div className="w-80 border-l border-gray-800 flex flex-col overflow-y-auto">
          {/* All periods */}
          <div className="p-6">
            <h3 className="text-xs font-bold tracking-widest mb-4" style={{ color: brandColor }}>ALL PERIODS</h3>
            <div className="space-y-2">
              {periods.map((period, i) => {
                const isActive = i === activePeriodIndex
                const color = period.color || brandColor
                return (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border transition-all ${isActive ? 'border-2' : 'border border-gray-800'}`}
                    style={isActive ? { borderColor: `${color}80`, background: `${color}10` } : {}}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-white" style={{ fontFamily: 'Antonio, sans-serif' }}>{period.name}</span>
                      {isActive && (
                        <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: color }} />
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {period.startTime} — {period.endTime}
                    </div>
                    {period.days && period.days.length > 0 && period.days.length < 7 && (
                      <div className="text-[10px] text-gray-600 mt-0.5">
                        {period.days.map(d => DAY_NAMES[d]).join(', ')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Next up */}
          {nextPeriod && (
            <div className="px-6 pb-6">
              <h3 className="text-xs font-bold tracking-widest mb-3" style={{ color: brandColor }}>NEXT UP</h3>
              <div className="p-3 rounded-lg bg-dark-700/50 border border-dark-600">
                <div className="text-sm font-bold text-white" style={{ fontFamily: 'Antonio, sans-serif' }}>{nextPeriod.name}</div>
                <div className="text-xs text-gray-500">Starting at {nextPeriod.startTime}</div>
              </div>
            </div>
          )}

          {/* Upcoming events */}
          {upcomingEvents.length > 0 && (
            <div className="px-6 pb-6">
              <h3 className="text-xs font-bold tracking-widest mb-3" style={{ color: brandColor }}>UPCOMING EVENTS</h3>
              <div className="space-y-2">
                {upcomingEvents.map((event, i) => (
                  <div key={i} className="p-3 rounded-lg bg-dark-700/50 border border-dark-600">
                    <div className="text-sm font-bold text-white" style={{ fontFamily: 'Antonio, sans-serif' }}>{event.name}</div>
                    <div className="text-xs text-gray-500">{event.date} — {event.note}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="flex-shrink-0 h-1" style={{ background: `linear-gradient(90deg, ${brandColor}, ${brandColor}80, transparent)` }} />
    </div>
  )
}
