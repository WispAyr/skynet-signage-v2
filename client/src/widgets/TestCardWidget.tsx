import { useEffect, useState } from 'react'
import { Monitor, Wifi, WifiOff, Server } from 'lucide-react'

interface TestCardWidgetProps {
  config?: {
    screenId?: string
    screenName?: string
  }
}

// Generate consistent color from string
function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash % 360)
  return `hsl(${hue}, 70%, 50%)`
}

export function TestCardWidget({ config }: TestCardWidgetProps) {
  const [time, setTime] = useState(new Date())
  const [connected, setConnected] = useState(true)
  
  // Get screen ID from URL params if not in config
  const params = new URLSearchParams(window.location.search)
  const screenId = config?.screenId || params.get('screen') || params.get('id') || 'unknown'
  const screenName = config?.screenName || params.get('name') || screenId
  
  const accentColor = stringToColor(screenId)
  
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const bars = [
    '#c0c0c0', '#c0c000', '#00c0c0', '#00c000', 
    '#c000c0', '#c00000', '#0000c0', '#000000'
  ]

  return (
    <div className="w-full h-full bg-[#1a1a2e] flex flex-col overflow-hidden">
      {/* Color bars - classic test card style */}
      <div className="flex h-16 shrink-0">
        {bars.map((color, i) => (
          <div key={i} className="flex-1" style={{ backgroundColor: color }} />
        ))}
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Screen identifier with accent color */}
        <div 
          className="px-8 py-4 rounded-2xl mb-8"
          style={{ backgroundColor: accentColor + '30', borderColor: accentColor, borderWidth: 3 }}
        >
          <div className="flex items-center gap-4">
            <Monitor className="w-12 h-12" style={{ color: accentColor }} />
            <div>
              <h1 className="text-5xl font-bold tracking-wider" style={{ color: accentColor }}>
                {screenId.toUpperCase()}
              </h1>
              {screenName !== screenId && (
                <p className="text-xl text-gray-400 mt-1">{screenName}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Status grid */}
        <div className="grid grid-cols-2 gap-6 text-center mb-8">
          <div className="bg-black/30 rounded-xl p-6 min-w-[200px]">
            <div className="text-gray-500 text-sm uppercase tracking-wider mb-2">Time</div>
            <div className="text-3xl font-mono text-white">
              {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>
          <div className="bg-black/30 rounded-xl p-6 min-w-[200px]">
            <div className="text-gray-500 text-sm uppercase tracking-wider mb-2">Date</div>
            <div className="text-3xl font-mono text-white">
              {time.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-3 text-lg">
          {connected ? (
            <>
              <Wifi className="w-6 h-6 text-green-400" />
              <span className="text-green-400">Connected to Signage Server</span>
            </>
          ) : (
            <>
              <WifiOff className="w-6 h-6 text-red-400 animate-pulse" />
              <span className="text-red-400">Disconnected</span>
            </>
          )}
        </div>
        
        {/* Server info */}
        <div className="mt-6 flex items-center gap-2 text-gray-600 text-sm">
          <Server className="w-4 h-4" />
          <span>{window.location.host}</span>
        </div>
      </div>
      
      {/* Bottom color bar - screen accent */}
      <div className="h-8 shrink-0" style={{ backgroundColor: accentColor }} />
      
      {/* SKYNET branding */}
      <div className="absolute bottom-12 right-8 text-gray-700 text-sm font-mono">
        SKYNET SIGNAGE v0.1
      </div>
    </div>
  )
}
