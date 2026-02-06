import { useState, useEffect } from 'react'

/**
 * Welcome / Entrance Display Template
 * Big greeting + time + weather + site info
 * 
 * Data shape:
 * {
 *   siteName: string          // "Kyle Rise Car Park"
 *   greeting?: string         // Override auto-greeting
 *   subtitle?: string         // "Welcome to Parkwise"
 *   weatherLocation?: string  // "Ayr, Scotland"
 *   showClock?: boolean       // default true
 *   showWeather?: boolean     // default true
 *   notices?: string[]        // ["Free after 6pm", "Max stay 4 hours"]
 *   brandColor?: string       // "#F97316"
 *   backgroundImage?: string  // optional URL
 * }
 */

interface WelcomeData {
  siteName: string
  greeting?: string
  subtitle?: string
  weatherLocation?: string
  showClock?: boolean
  showWeather?: boolean
  notices?: string[]
  brandColor?: string
  backgroundImage?: string
}

interface WeatherInfo {
  temp: number
  description: string
  icon: string
}

function getAutoGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function getWeatherEmoji(desc: string): string {
  const d = desc.toLowerCase()
  if (d.includes('sun') || d.includes('clear')) return '☀️'
  if (d.includes('cloud')) return '☁️'
  if (d.includes('rain') || d.includes('drizzle')) return '🌧️'
  if (d.includes('snow')) return '❄️'
  if (d.includes('thunder') || d.includes('storm')) return '⛈️'
  if (d.includes('fog') || d.includes('mist')) return '🌫️'
  return '🌤️'
}

export function WelcomeDisplayTemplate({ data }: { data: WelcomeData }) {
  const [time, setTime] = useState(new Date())
  const [weather, setWeather] = useState<WeatherInfo | null>(null)
  const [greeting, setGreeting] = useState(data.greeting || getAutoGreeting())

  const brandColor = data.brandColor || '#F97316'
  const showClock = data.showClock !== false
  const showWeather = data.showWeather !== false

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date())
      if (!data.greeting) setGreeting(getAutoGreeting())
    }, 1000)
    return () => clearInterval(interval)
  }, [data.greeting])

  // Fetch weather
  useEffect(() => {
    if (!showWeather) return
    const loc = data.weatherLocation || 'Ayr'
    
    const fetchWeather = async () => {
      try {
        const res = await fetch(`https://wttr.in/${encodeURIComponent(loc)}?format=j1`)
        const json = await res.json()
        const current = json.current_condition?.[0]
        if (current) {
          setWeather({
            temp: parseInt(current.temp_C),
            description: current.weatherDesc?.[0]?.value || '',
            icon: current.weatherCode || '',
          })
        }
      } catch (e) {
        console.error('Weather fetch failed:', e)
      }
    }

    fetchWeather()
    const interval = setInterval(fetchWeather, 600000) // 10 min
    return () => clearInterval(interval)
  }, [data.weatherLocation, showWeather])

  const dateStr = time.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div
      className="relative flex flex-col items-center justify-center h-full overflow-hidden"
      style={{
        background: data.backgroundImage
          ? `url(${data.backgroundImage}) center/cover`
          : `linear-gradient(135deg, #0a0a0f 0%, #111827 40%, ${brandColor}15 100%)`,
      }}
    >
      {/* Ambient glow orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: brandColor }} />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-10 blur-3xl" style={{ background: brandColor }} />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: `linear-gradient(90deg, ${brandColor}, ${brandColor}80, transparent)` }} />

      {/* Content */}
      <div className="relative z-10 text-center px-8 max-w-4xl">
        {/* Greeting */}
        <div className="mb-4 text-2xl tracking-widest uppercase" style={{ color: `${brandColor}cc`, fontFamily: 'Antonio, sans-serif' }}>
          {greeting}
        </div>

        {/* Site name */}
        <h1
          className="text-6xl md:text-8xl font-bold text-white mb-6 leading-tight"
          style={{ fontFamily: 'Antonio, sans-serif', textShadow: `0 0 60px ${brandColor}30` }}
        >
          {data.siteName}
        </h1>

        {/* Subtitle */}
        {data.subtitle && (
          <p className="text-xl md:text-2xl text-gray-400 mb-8 tracking-wide">
            {data.subtitle}
          </p>
        )}

        {/* Time + Weather row */}
        <div className="flex items-center justify-center gap-8 mb-10">
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
                {getWeatherEmoji(weather.description)} {weather.temp}°C
              </div>
              <div className="text-sm text-gray-500 mt-2 tracking-wider capitalize">{weather.description}</div>
            </div>
          )}
        </div>

        {/* Notices */}
        {data.notices && data.notices.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3">
            {data.notices.map((notice, i) => (
              <div
                key={i}
                className="px-5 py-2.5 rounded-full text-sm font-medium border"
                style={{
                  background: `${brandColor}15`,
                  borderColor: `${brandColor}40`,
                  color: `${brandColor}dd`,
                }}
              >
                {notice}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom branding bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-8 py-4 bg-black/30 backdrop-blur-sm">
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
