import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, AlertCircle, Info } from 'lucide-react'

interface SecurityAlertConfig {
  level: 'info' | 'warning' | 'critical'
  escalationLevel?: number
  title: string
  message: string
  source?: string
  timestamp?: string
  pullFromApi?: boolean
  apiUrl?: string
  refreshInterval?: number
}

const LEVEL_STYLES = {
  info: {
    bg: 'from-blue-900/80 to-dark-900',
    border: 'border-blue-500/50',
    icon: Info,
    iconColor: 'text-blue-400',
    pulse: false,
    badge: 'bg-blue-500/20 text-blue-400',
  },
  warning: {
    bg: 'from-amber-900/60 to-dark-900',
    border: 'border-amber-500/50',
    icon: AlertTriangle,
    iconColor: 'text-amber-400',
    pulse: true,
    badge: 'bg-amber-500/20 text-amber-400',
  },
  critical: {
    bg: 'from-red-900/60 to-dark-900',
    border: 'border-red-500/50',
    icon: AlertTriangle,
    iconColor: 'text-red-400',
    pulse: true,
    badge: 'bg-red-500/20 text-red-400',
  },
}

export function SecurityAlertWidget({ config }: { config: SecurityAlertConfig }) {
  const [alerts, setAlerts] = useState<any[]>([])
  const level = config.level || 'info'
  const style = LEVEL_STYLES[level]
  const Icon = style.icon

  // Optional: pull from SentryFlow API
  useEffect(() => {
    if (!config.pullFromApi) return
    const url = config.apiUrl || 'http://localhost:3890/api/alerts'
    
    const fetchAlerts = async () => {
      try {
        const res = await fetch(url)
        const data = await res.json()
        if (Array.isArray(data)) setAlerts(data.slice(0, 5))
        else if (data.alerts) setAlerts(data.alerts.slice(0, 5))
      } catch (e) {
        console.error('Failed to fetch security alerts:', e)
      }
    }

    fetchAlerts()
    const interval = setInterval(fetchAlerts, config.refreshInterval || 30000)
    return () => clearInterval(interval)
  }, [config.pullFromApi, config.apiUrl, config.refreshInterval])

  return (
    <div className={`flex flex-col items-center justify-center h-full p-8 bg-gradient-to-b ${style.bg}`}>
      {/* Pulsing border effect for critical */}
      {style.pulse && (
        <div className="absolute inset-0 border-4 border-red-500/30 animate-pulse rounded-none" />
      )}

      {/* Shield icon */}
      <div className={`mb-6 ${style.pulse ? 'animate-pulse' : ''}`}>
        <Shield className={`w-20 h-20 ${style.iconColor}`} />
      </div>

      {/* Badge */}
      <div className={`${style.badge} px-4 py-1.5 rounded-full text-sm font-bold tracking-widest mb-6`}>
        {config.escalationLevel ? `LEVEL ${config.escalationLevel}` : level.toUpperCase()} ALERT
      </div>

      {/* Title */}
      <h1 className="text-4xl font-bold text-white text-center mb-4" style={{ fontFamily: 'Antonio, sans-serif' }}>
        {config.title}
      </h1>

      {/* Message */}
      <p className="text-xl text-gray-300 text-center max-w-2xl mb-6">
        {config.message}
      </p>

      {/* Source & time */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        {config.source && <span>Source: {config.source}</span>}
        {config.timestamp && (
          <span>{new Date(config.timestamp).toLocaleTimeString('en-GB')}</span>
        )}
      </div>

      {/* Recent alerts from API */}
      {alerts.length > 0 && (
        <div className="mt-8 w-full max-w-xl space-y-2">
          <h3 className="text-sm font-semibold text-gray-400 tracking-wider">RECENT ALERTS</h3>
          {alerts.map((alert, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg">
              <AlertCircle className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{alert.message || alert.title}</div>
                <div className="text-xs text-gray-500">{alert.timestamp || alert.time}</div>
              </div>
              {alert.level && (
                <span className={`text-xs px-2 py-0.5 rounded ${
                  alert.level >= 3 ? 'bg-red-500/20 text-red-400' :
                  alert.level >= 2 ? 'bg-amber-500/20 text-amber-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  L{alert.level}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
