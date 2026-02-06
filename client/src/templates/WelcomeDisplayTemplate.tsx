import { useState, useEffect } from 'react'

/**
 * Welcome / Entrance Display Template (Rise Vision university–inspired)
 *
 * Rotating branded content + weather + clock + occupancy.
 * For car park entrance screens.
 *
 * Data shape:
 * {
 *   siteName: string           // "Kyle Rise Car Park"
 *   greeting?: string          // Override auto-greeting
 *   subtitle?: string          // "Welcome to Parkwise"
 *   weatherLocation?: string   // "Ayr, Scotland"
 *   showClock?: boolean
 *   showWeather?: boolean
 *   showOccupancy?: boolean    // pull live occupancy
 *   locationId?: string        // for occupancy + config
 *   posApiUrl?: string
 *   posSiteId?: string
 *   notices?: string[]
 *   slides?: Array<{           // rotating content panels
 *     title?: string
 *     message?: string
 *     image?: string           // background image URL
 *     icon?: string            // emoji
 *   }>
 *   slideInterval?: number     // seconds between slides (default 10)
 *   brandColor?: string
 *   backgroundImage?: string
 *   refreshInterval?: number
 * }
 */

interface Slide {
  title?: string
  message?: string
  image?: string
  icon?: string
}

interface WelcomeData {
  siteName: string
  greeting?: string
  subtitle?: string
  weatherLocation?: string
  showClock?: boolean
  showWeather?: boolean
  showOccupancy?: boolean
  locationId?: string
  posApiUrl?: string
  posSiteId?: string
  notices?: string[]
  slides?: Slide[]
  slideInterval?: number
  brandColor?: string
  backgroundImage?: string
  refreshInterval?: number
}

interface WeatherInfo { temp: number; description: string }

function getAutoGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function weatherEmoji(desc: string): string {
  const d = desc.toLowerCase()
  if (d.includes('sun') || d.includes('clear')) return '☀️'
  if (d.includes('cloud')) return '☁️'
  if (d.includes('rain') || d.includes('drizzle')) return '🌧️'
  if (d.includes('snow')) return '❄️'
  if (d.includes('thunder')) return '⛈️'
  if (d.includes('fog') || d.includes('mist')) return '🌫️'
  return '🌤️'
}

export function WelcomeDisplayTemplate({ data }: { data: WelcomeData }) {
  const [time, setTime] = useState(new Date())
  const [weather, setWeather] = useState<WeatherInfo | null>(null)
  const [greeting, setGreeting] = useState(data.greeting || getAutoGreeting())
  const [slideIndex, setSlideIndex] = useState(0)
  const [capacity, setCapacity] = useState<number | null>(null)
  const [activePayments, setActivePayments] = useState<number | null>(null)

  const brandColor = data.brandColor || '#F97316'
  const showClock = data.showClock !== false
  const showWeather = data.showWeather !== false
  const slides = data.slides || []
  const slideInterval = (data.slideInterval || 10) * 1000

  // Clock + greeting update
  useEffect(() => {
    const iv = setInterval(() => {
      setTime(new Date())
      if (!data.greeting) setGreeting(getAutoGreeting())
    }, 1000)
    return () => clearInterval(iv)
  }, [data.greeting])

  // Weather
  useEffect(() => {
    if (!showWeather) return
    const loc = data.weatherLocation || 'Ayr'
    const fetch_ = async () => {
      try {
        const res = await fetch(`https://wttr.in/${encodeURIComponent(loc)}?format=j1`)
        const json = await res.json()
        const c = json.current_condition?.[0]
        if (c) setWeather({ temp: parseInt(c.temp_C), description: c.weatherDesc?.[0]?.value || '' })
      } catch (e) { /* ignore */ }
    }
    fetch_()
    const iv = setInterval(fetch_, 600000)
    return () => clearInterval(iv)
  }, [data.weatherLocation, showWeather])

  // Slide rotation
  useEffect(() => {
    if (slides.length <= 1) return
    const iv = setInterval(() => setSlideIndex(p => (p + 1) % slides.length), slideInterval)
    return () => clearInterval(iv)
  }, [slides.length, slideInterval])

  // Location config (capacity)
  useEffect(() => {
    if (!data.locationId) return
    const fetch_ = async () => {
      try {
        const res = await fetch(`/api/locations/${data.locationId}/display-config`)
        const json = await res.json()
        if (json.success && json.data?.config?.capacity) setCapacity(json.data.config.capacity)
      } catch (e) { /* ignore */ }
    }
    fetch_()
    const iv = setInterval(fetch_, 60000)
    return () => clearInterval(iv)
  }, [data.locationId])

  // Occupancy from POS
  useEffect(() => {
    if (!data.showOccupancy) return
    const posUrl = data.posApiUrl || 'http://localhost:3000'
    const siteId = data.posSiteId
    if (!siteId) return
    const fetch_ = async () => {
      try {
        const res = await fetch(`${posUrl}/api/payment/statistics/${siteId}`)
        const json = await res.json()
        setActivePayments(json.activePayments || 0)
      } catch (e) { /* ignore */ }
    }
    fetch_()
    const iv = setInterval(fetch_, 30000)
    return () => clearInterval(iv)
  }, [data.showOccupancy, data.posApiUrl, data.posSiteId])

  const available = capacity && activePayments !== null ? Math.max(0, capacity - activePayments) : null
  const currentSlide = slides.length > 0 ? slides[slideIndex] : null
  const dateStr = time.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div
      className="relative flex flex-col h-full overflow-hidden"
      style={{
        background: currentSlide?.image
          ? `url(${currentSlide.image}) center/cover`
          : data.backgroundImage
            ? `url(${data.backgroundImage}) center/cover`
            : `linear-gradient(135deg, #0a0a0f 0%, #111827 40%, ${brandColor}15 100%)`,
      }}
    >
      {/* Overlay for images */}
      {(currentSlide?.image || data.backgroundImage) && (
        <div className="absolute inset-0 bg-black/60" />
      )}

      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: brandColor }} />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10 blur-3xl" style={{ background: brandColor }} />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 z-20" style={{ background: `linear-gradient(90deg, ${brandColor}, ${brandColor}80, transparent)` }} />

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8">
        {/* Slide icon */}
        {currentSlide?.icon && (
          <div className="text-5xl mb-4 animate-fadeIn">{currentSlide.icon}</div>
        )}

        {/* Greeting */}
        <div className="mb-4 text-2xl tracking-widest uppercase" style={{ color: `${brandColor}cc`, fontFamily: 'Antonio, sans-serif' }}>
          {currentSlide?.title || greeting}
        </div>

        {/* Site name or slide message */}
        <h1
          className="text-6xl md:text-8xl font-bold text-white mb-6 leading-tight text-center transition-all duration-500"
          style={{ fontFamily: 'Antonio, sans-serif', textShadow: `0 0 60px ${brandColor}30` }}
        >
          {currentSlide?.message || data.siteName}
        </h1>

        {/* Subtitle (only when no slide content is showing) */}
        {!currentSlide?.message && data.subtitle && (
          <p className="text-xl md:text-2xl text-gray-400 mb-8 tracking-wide">{data.subtitle}</p>
        )}

        {/* Time + Weather + Occupancy row */}
        <div className="flex items-center justify-center gap-8 mb-10 flex-wrap">
          {showClock && (
            <div className="text-center">
              <div className="text-5xl md:text-6xl font-bold text-white tabular-nums" style={{ fontFamily: 'Antonio, sans-serif' }}>
                {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-sm text-gray-500 mt-2 tracking-wider">{dateStr}</div>
            </div>
          )}

          {showWeather && weather && (
            <div className="text-center border-l border-gray-700 pl-8">
              <div className="text-4xl md:text-5xl font-bold text-white" style={{ fontFamily: 'Antonio, sans-serif' }}>
                {weatherEmoji(weather.description)} {weather.temp}°C
              </div>
              <div className="text-sm text-gray-500 mt-2 tracking-wider capitalize">{weather.description}</div>
            </div>
          )}

          {available !== null && (
            <div className="text-center border-l border-gray-700 pl-8">
              <div className="text-4xl md:text-5xl font-bold tabular-nums"
                style={{ fontFamily: 'Antonio, sans-serif', color: available < 10 ? '#ef4444' : available < 30 ? '#f59e0b' : '#10b981' }}>
                {available}
              </div>
              <div className="text-sm text-gray-500 mt-2 tracking-wider">SPACES</div>
            </div>
          )}
        </div>

        {/* Notices */}
        {data.notices && data.notices.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3">
            {data.notices.map((notice, i) => (
              <div key={i} className="px-5 py-2.5 rounded-full text-sm font-medium border"
                style={{ background: `${brandColor}15`, borderColor: `${brandColor}40`, color: `${brandColor}dd` }}>
                {notice}
              </div>
            ))}
          </div>
        )}

        {/* Slide indicators */}
        {slides.length > 1 && (
          <div className="flex gap-2 mt-8">
            {slides.map((_, i) => (
              <div key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === slideIndex ? 'w-8' : 'w-1.5 opacity-30'}`}
                style={{ background: i === slideIndex ? brandColor : '#6b7280' }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom branding bar */}
      <div className="relative z-10 flex items-center justify-between px-8 py-4 bg-black/30 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-2 rounded-full" style={{ background: brandColor }} />
          <span className="text-sm text-gray-500 tracking-widest" style={{ fontFamily: 'Antonio, sans-serif' }}>PARKWISE</span>
        </div>
        <div className="text-xs text-gray-600">
          {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>
    </div>
  )
}
