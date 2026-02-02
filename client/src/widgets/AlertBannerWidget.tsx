import { useState, useEffect } from 'react'
import { AlertTriangle, Info, CheckCircle, XCircle, Bell } from 'lucide-react'

interface AlertBannerConfig {
  message: string
  level?: 'info' | 'success' | 'warning' | 'error' | 'critical'
  title?: string
  icon?: boolean
  animate?: boolean
  fullscreen?: boolean
  sound?: boolean
}

export function AlertBannerWidget({ config }: { config: AlertBannerConfig }) {
  const [flash, setFlash] = useState(false)
  
  const level = config.level || 'info'
  const animate = config.animate !== false
  const fullscreen = config.fullscreen || level === 'critical'
  
  // Flash animation for critical alerts
  useEffect(() => {
    if (level === 'critical' && animate) {
      const interval = setInterval(() => {
        setFlash(f => !f)
      }, 500)
      return () => clearInterval(interval)
    }
  }, [level, animate])
  
  // Play sound for critical
  useEffect(() => {
    if (config.sound && (level === 'critical' || level === 'error')) {
      // Browser audio - would need actual sound file
      try {
        const audio = new Audio('/alert.mp3')
        audio.play().catch(() => {})
      } catch {}
    }
  }, [config.sound, level])
  
  const getColors = () => {
    switch (level) {
      case 'success': return { bg: 'bg-green-600', text: 'text-white', border: 'border-green-400' }
      case 'warning': return { bg: 'bg-yellow-600', text: 'text-white', border: 'border-yellow-400' }
      case 'error': return { bg: 'bg-red-600', text: 'text-white', border: 'border-red-400' }
      case 'critical': return { bg: flash ? 'bg-red-700' : 'bg-red-900', text: 'text-white', border: 'border-red-500' }
      default: return { bg: 'bg-accent-dim', text: 'text-white', border: 'border-accent' }
    }
  }
  
  const getIcon = () => {
    switch (level) {
      case 'success': return <CheckCircle className="w-12 h-12" />
      case 'warning': return <AlertTriangle className="w-12 h-12" />
      case 'error': return <XCircle className="w-12 h-12" />
      case 'critical': return <AlertTriangle className="w-12 h-12 animate-pulse" />
      default: return <Info className="w-12 h-12" />
    }
  }
  
  const colors = getColors()
  
  if (fullscreen) {
    return (
      <div className={`w-full h-full ${colors.bg} ${colors.text} flex flex-col items-center justify-center p-12 transition-colors duration-300`}>
        {config.icon !== false && (
          <div className="mb-8">
            {getIcon()}
          </div>
        )}
        {config.title && (
          <h1 className="text-5xl font-bold mb-6 text-center">{config.title}</h1>
        )}
        <p className="text-3xl text-center max-w-4xl leading-relaxed">
          {config.message}
        </p>
      </div>
    )
  }
  
  // Banner mode
  return (
    <div className="w-full h-full flex items-center justify-center bg-dark-900">
      <div className={`${colors.bg} ${colors.text} border-2 ${colors.border} rounded-2xl p-8 max-w-3xl mx-8 shadow-2xl`}>
        <div className="flex items-center gap-6">
          {config.icon !== false && getIcon()}
          <div>
            {config.title && (
              <h2 className="text-2xl font-bold mb-2">{config.title}</h2>
            )}
            <p className="text-xl">{config.message}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
