import { useState, useEffect, useRef } from 'react'
import { Video, AlertCircle } from 'lucide-react'

interface CameraConfig {
  src: string  // Camera name or RTSP URL
  go2rtcHost?: string
  mode?: 'jpeg' | 'mse' | 'webrtc'
  refreshInterval?: number  // For JPEG mode
  showLabel?: boolean
}

export function CameraWidget({ config }: { config: CameraConfig }) {
  const [error, setError] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const imgRef = useRef<HTMLImageElement>(null)
  
  const host = config.go2rtcHost || `${window.location.hostname}:1984`
  const mode = config.mode || 'jpeg'
  const refreshInterval = config.refreshInterval || 2000
  
  useEffect(() => {
    if (mode === 'jpeg') {
      // Snapshot mode with refresh
      const updateImage = () => {
        const url = `http://${host}/api/frame.jpeg?src=${encodeURIComponent(config.src)}&t=${Date.now()}`
        setImageUrl(url)
      }
      
      updateImage()
      const interval = setInterval(updateImage, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [config.src, host, mode, refreshInterval])
  
  const handleError = () => {
    setError(true)
  }
  
  const handleLoad = () => {
    setError(false)
  }

  if (mode === 'mse' || mode === 'webrtc') {
    // Use go2rtc's built-in player
    const streamUrl = `http://${host}/stream.html?src=${encodeURIComponent(config.src)}&mode=${mode}`
    return (
      <div className="relative w-full h-full bg-black">
        <iframe 
          src={streamUrl}
          className="w-full h-full border-0"
          allow="autoplay"
        />
        {config.showLabel && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <span className="text-white text-lg font-medium">{config.src}</span>
          </div>
        )}
      </div>
    )
  }

  // JPEG snapshot mode
  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      {error ? (
        <div className="text-center text-gray-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <div>Camera unavailable</div>
          <div className="text-sm mt-1">{config.src}</div>
        </div>
      ) : (
        <img 
          ref={imgRef}
          src={imageUrl}
          alt={config.src}
          className="max-w-full max-h-full object-contain"
          onError={handleError}
          onLoad={handleLoad}
        />
      )}
      {config.showLabel && !error && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-red-500 animate-pulse" />
            <span className="text-white font-medium">{config.src}</span>
          </div>
        </div>
      )}
    </div>
  )
}
