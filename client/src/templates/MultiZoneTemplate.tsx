import { useState, useEffect, useRef } from 'react'

/**
 * Multi-Zone Layout Template
 * Main content area + sidebar (clock/weather) + bottom ticker
 *
 * Data shape:
 * {
 *   mainContent: {
 *     type: 'image' | 'video' | 'html' | 'text'
 *     url?: string           // for image/video
 *     html?: string          // for html type
 *     title?: string         // for text type
 *     body?: string          // for text type
 *     items?: Array<{ type, url?, title?, body? }>  // rotating content
 *     rotateInterval?: number // seconds between rotation
 *   }
 *   sidebar?: {
 *     showClock?: boolean
 *     showWeather?: boolean
 *     weatherLocation?: string
 *     showLogo?: boolean
 *     logoUrl?: string
 *     customItems?: Array<{ label: string, value: string }>
 *   }
 *   ticker?: {
 *     messages: string[]
 *     speed?: number         // pixels per second
 *     backgroundColor?: string
 *   }
 *   brandColor?: string
 *   sidebarWidth?: string    // "300px" or "25%"
 *   tickerHeight?: string    // "48px"
 * }
 */

interface MainContent {
  type: 'image' | 'video' | 'html' | 'text'
  url?: string
  html?: string
  title?: string
  body?: string
  items?: Array<{ type: string; url?: string; title?: string; body?: string }>
  rotateInterval?: number
}

interface SidebarConfig {
  showClock?: boolean
  showWeather?: boolean
  weatherLocation?: string
  showLogo?: boolean
  logoUrl?: string
  customItems?: Array<{ label: string; value: string }>
}

interface TickerConfig {
  messages: string[]
  speed?: number
  backgroundColor?: string
}

interface MultiZoneData {
  mainContent: MainContent
  sidebar?: SidebarConfig
  ticker?: TickerConfig
  brandColor?: string
  sidebarWidth?: string
  tickerHeight?: string
}

interface WeatherInfo {
  temp: number
  description: string
}

export function MultiZoneTemplate({ data }: { data: MultiZoneData }) {
  const [time, setTime] = useState(new Date())
  const [weather, setWeather] = useState<WeatherInfo | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const tickerRef = useRef<HTMLDivElement>(null)

  const brandColor = data.brandColor || '#F97316'
  const sidebarWidth = data.sidebarWidth || '280px'
  const tickerHeight = data.tickerHeight || '48px'
  const showSidebar = data.sidebar !== undefined
  const showTicker = data.ticker && data.ticker.messages.length > 0

  // Clock
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Weather
  useEffect(() => {
    if (!data.sidebar?.showWeather) return
    const loc = data.sidebar.weatherLocation || 'Ayr'

    const fetchWeather = async () => {
      try {
        const res = await fetch(`https://wttr.in/${encodeURIComponent(loc)}?format=j1`)
        const json = await res.json()
        const c = json.current_condition?.[0]
        if (c) setWeather({ temp: parseInt(c.temp_C), description: c.weatherDesc?.[0]?.value || '' })
      } catch (e) { /* ignore */ }
    }

    fetchWeather()
    const interval = setInterval(fetchWeather, 600000)
    return () => clearInterval(interval)
  }, [data.sidebar?.showWeather, data.sidebar?.weatherLocation])

  // Rotate main content
  useEffect(() => {
    const items = data.mainContent.items
    if (!items || items.length <= 1) return
    const ms = (data.mainContent.rotateInterval || 15) * 1000
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % items.length)
    }, ms)
    return () => clearInterval(interval)
  }, [data.mainContent.items, data.mainContent.rotateInterval])

  // Get current main content item
  const mainItem = data.mainContent.items
    ? data.mainContent.items[currentIndex] || data.mainContent
    : data.mainContent

  const renderMainContent = () => {
    const item = mainItem as any
    const type = item.type || data.mainContent.type

    switch (type) {
      case 'image':
        return (
          <div className="w-full h-full flex items-center justify-center bg-black">
            <img src={item.url} className="max-w-full max-h-full object-contain" alt="" />
          </div>
        )
      case 'video':
        return (
          <video
            src={item.url}
            className="w-full h-full object-contain bg-black"
            autoPlay
            muted
            loop
            playsInline
          />
        )
      case 'html':
        return (
          <div className="w-full h-full p-8 overflow-auto" dangerouslySetInnerHTML={{ __html: item.html || '' }} />
        )
      case 'text':
      default:
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center">
            {item.title && (
              <h2
                className="text-5xl font-bold text-white mb-6"
                style={{ fontFamily: 'Antonio, sans-serif' }}
              >
                {item.title}
              </h2>
            )}
            {item.body && (
              <p className="text-xl text-gray-300 max-w-2xl leading-relaxed">{item.body}</p>
            )}
          </div>
        )
    }
  }

  // Build ticker text
  const tickerText = showTicker
    ? data.ticker!.messages.join('     •     ') + '     •     '
    : ''

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* Main row: content + sidebar */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
        {/* Main content area */}
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 transition-opacity duration-700">
            {renderMainContent()}
          </div>
          {/* Item counter for rotating content */}
          {data.mainContent.items && data.mainContent.items.length > 1 && (
            <div className="absolute bottom-4 right-4 flex gap-1.5">
              {data.mainContent.items.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentIndex ? 'w-6' : 'opacity-40'
                  }`}
                  style={{ background: i === currentIndex ? brandColor : '#6b7280' }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        {showSidebar && (
          <div
            className="flex-shrink-0 flex flex-col border-l border-gray-800 bg-dark-800/80"
            style={{ width: sidebarWidth }}
          >
            {/* Logo */}
            {data.sidebar?.showLogo && (
              <div className="p-6 border-b border-gray-800 flex items-center justify-center">
                {data.sidebar.logoUrl ? (
                  <img src={data.sidebar.logoUrl} className="max-h-12 object-contain" alt="Logo" />
                ) : (
                  <div className="text-xl font-bold tracking-widest" style={{ color: brandColor, fontFamily: 'Antonio, sans-serif' }}>
                    PARKWISE
                  </div>
                )}
              </div>
            )}

            {/* Clock */}
            {data.sidebar?.showClock !== false && (
              <div className="p-6 border-b border-gray-800 text-center">
                <div className="text-4xl font-bold text-white tabular-nums" style={{ fontFamily: 'Antonio, sans-serif' }}>
                  {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {time.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                </div>
              </div>
            )}

            {/* Weather */}
            {data.sidebar?.showWeather !== false && weather && (
              <div className="p-6 border-b border-gray-800 text-center">
                <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Antonio, sans-serif' }}>
                  {weather.temp}°C
                </div>
                <div className="text-sm text-gray-400 mt-1 capitalize">{weather.description}</div>
              </div>
            )}

            {/* Custom items */}
            {data.sidebar?.customItems && data.sidebar.customItems.length > 0 && (
              <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                {data.sidebar.customItems.map((item, i) => (
                  <div key={i} className="p-3 bg-dark-700/50 rounded-lg">
                    <div className="text-xs text-gray-500 tracking-wider">{item.label}</div>
                    <div className="text-lg font-bold text-white mt-0.5" style={{ fontFamily: 'Antonio, sans-serif' }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom ticker */}
      {showTicker && (
        <div
          className="flex-shrink-0 overflow-hidden flex items-center border-t border-gray-800"
          style={{
            height: tickerHeight,
            background: data.ticker?.backgroundColor || `${brandColor}15`,
          }}
        >
          <div
            ref={tickerRef}
            className="whitespace-nowrap text-sm font-medium tracking-wider animate-ticker"
            style={{
              color: `${brandColor}dd`,
              fontFamily: 'Antonio, sans-serif',
              animation: `ticker ${Math.max(20, tickerText.length * 0.15)}s linear infinite`,
            }}
          >
            {tickerText}{tickerText}
          </div>
          <style>{`
            @keyframes ticker {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}
