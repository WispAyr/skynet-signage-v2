import { useState, useEffect } from 'react'

interface ClockConfig {
  format?: '12h' | '24h'
  showDate?: boolean
  showSeconds?: boolean
  timezone?: string
}

export function ClockWidget({ config }: { config: ClockConfig }) {
  const [time, setTime] = useState(new Date())
  
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])
  
  const formatTime = () => {
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      ...(config.showSeconds && { second: '2-digit' }),
      hour12: config.format === '12h',
      ...(config.timezone && { timeZone: config.timezone })
    }
    return time.toLocaleTimeString('en-GB', options)
  }
  
  const formatDate = () => {
    return time.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...(config.timezone && { timeZone: config.timezone })
    })
  }

  return (
    <div className="flex flex-col items-center justify-center h-full text-center">
      <div className="text-[12vw] font-light tracking-tight text-white leading-none">
        {formatTime()}
      </div>
      {config.showDate !== false && (
        <div className="text-[2.5vw] text-gray-400 mt-4">
          {formatDate()}
        </div>
      )}
    </div>
  )
}
