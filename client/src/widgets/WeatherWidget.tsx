import { useState, useEffect } from 'react'
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Droplets, Thermometer } from 'lucide-react'

interface WeatherConfig {
  latitude?: number
  longitude?: number
  location?: string  // Display name
  units?: 'celsius' | 'fahrenheit'
  showForecast?: boolean
}

interface WeatherData {
  temperature: number
  feelsLike: number
  humidity: number
  windSpeed: number
  weatherCode: number
  description: string
}

const WEATHER_CODES: Record<number, { icon: any; description: string }> = {
  0: { icon: Sun, description: 'Clear sky' },
  1: { icon: Sun, description: 'Mainly clear' },
  2: { icon: Cloud, description: 'Partly cloudy' },
  3: { icon: Cloud, description: 'Overcast' },
  45: { icon: Cloud, description: 'Foggy' },
  48: { icon: Cloud, description: 'Depositing rime fog' },
  51: { icon: CloudRain, description: 'Light drizzle' },
  53: { icon: CloudRain, description: 'Moderate drizzle' },
  55: { icon: CloudRain, description: 'Dense drizzle' },
  61: { icon: CloudRain, description: 'Slight rain' },
  63: { icon: CloudRain, description: 'Moderate rain' },
  65: { icon: CloudRain, description: 'Heavy rain' },
  71: { icon: CloudSnow, description: 'Slight snow' },
  73: { icon: CloudSnow, description: 'Moderate snow' },
  75: { icon: CloudSnow, description: 'Heavy snow' },
  80: { icon: CloudRain, description: 'Rain showers' },
  81: { icon: CloudRain, description: 'Moderate showers' },
  82: { icon: CloudRain, description: 'Violent showers' },
  95: { icon: CloudRain, description: 'Thunderstorm' },
}

export function WeatherWidget({ config }: { config: WeatherConfig }) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Default to Ayr, Scotland
  const lat = config.latitude || 55.4583
  const lon = config.longitude || -4.6292
  const location = config.location || 'Ayr, Scotland'
  
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`
        const res = await fetch(url)
        const data = await res.json()
        
        if (data.current) {
          setWeather({
            temperature: Math.round(data.current.temperature_2m),
            feelsLike: Math.round(data.current.apparent_temperature),
            humidity: data.current.relative_humidity_2m,
            windSpeed: Math.round(data.current.wind_speed_10m),
            weatherCode: data.current.weather_code,
            description: WEATHER_CODES[data.current.weather_code]?.description || 'Unknown'
          })
        }
        setLoading(false)
      } catch (e) {
        setError('Failed to fetch weather')
        setLoading(false)
      }
    }
    
    fetchWeather()
    const interval = setInterval(fetchWeather, 300000) // 5 minutes
    return () => clearInterval(interval)
  }, [lat, lon])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading weather...</div>
      </div>
    )
  }
  
  if (error || !weather) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">{error || 'No weather data'}</div>
      </div>
    )
  }
  
  const WeatherIcon = WEATHER_CODES[weather.weatherCode]?.icon || Cloud

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      {/* Main temperature */}
      <div className="flex items-center gap-6 mb-6">
        <WeatherIcon className="w-24 h-24 text-accent" />
        <div>
          <div className="text-[8vw] font-light leading-none text-white">
            {weather.temperature}°
          </div>
          <div className="text-xl text-gray-400">{weather.description}</div>
        </div>
      </div>
      
      {/* Location */}
      <div className="text-2xl text-gray-500 mb-8">{location}</div>
      
      {/* Details */}
      <div className="flex gap-8 text-gray-400">
        <div className="flex items-center gap-2">
          <Thermometer className="w-5 h-5" />
          <span>Feels {weather.feelsLike}°</span>
        </div>
        <div className="flex items-center gap-2">
          <Droplets className="w-5 h-5" />
          <span>{weather.humidity}%</span>
        </div>
        <div className="flex items-center gap-2">
          <Wind className="w-5 h-5" />
          <span>{weather.windSpeed} km/h</span>
        </div>
      </div>
    </div>
  )
}
