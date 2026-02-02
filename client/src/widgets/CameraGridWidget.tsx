import { useState, useEffect } from 'react'
import { Video, AlertCircle, Maximize2 } from 'lucide-react'

interface CameraGridConfig {
  cameras: string[]  // Array of camera names
  go2rtcHost?: string
  columns?: number
  refreshInterval?: number
  autoRotate?: boolean
  rotateInterval?: number
}

export function CameraGridWidget({ config }: { config: CameraGridConfig }) {
  const [focusedCamera, setFocusedCamera] = useState<string | null>(null)
  const [rotationIndex, setRotationIndex] = useState(0)
  const [errors, setErrors] = useState<Set<string>>(new Set())
  
  const host = config.go2rtcHost || `${window.location.hostname}:1984`
  const columns = config.columns || 2
  const refreshInterval = config.refreshInterval || 3000
  const rotateInterval = config.rotateInterval || 10000
  
  // Auto-rotation for single view mode
  useEffect(() => {
    if (config.autoRotate && focusedCamera === null) {
      const interval = setInterval(() => {
        setRotationIndex(i => (i + 1) % config.cameras.length)
      }, rotateInterval)
      return () => clearInterval(interval)
    }
  }, [config.autoRotate, config.cameras.length, focusedCamera, rotateInterval])
  
  const handleError = (camera: string) => {
    setErrors(prev => new Set(prev).add(camera))
  }
  
  const getImageUrl = (camera: string) => {
    return `http://${host}/api/frame.jpeg?src=${encodeURIComponent(camera)}&t=${Math.floor(Date.now() / refreshInterval)}`
  }

  // Full screen single camera view
  if (focusedCamera) {
    return (
      <div 
        className="relative w-full h-full bg-black cursor-pointer"
        onClick={() => setFocusedCamera(null)}
      >
        <CameraImage 
          src={getImageUrl(focusedCamera)} 
          camera={focusedCamera}
          onError={() => handleError(focusedCamera)}
          hasError={errors.has(focusedCamera)}
          showLabel
        />
        <div className="absolute top-4 right-4 text-white/50 text-sm">
          Click to exit full screen
        </div>
      </div>
    )
  }

  // Auto-rotate single camera
  if (config.autoRotate) {
    const camera = config.cameras[rotationIndex]
    return (
      <div className="relative w-full h-full bg-black">
        <CameraImage 
          src={getImageUrl(camera)} 
          camera={camera}
          onError={() => handleError(camera)}
          hasError={errors.has(camera)}
          showLabel
        />
        <div className="absolute top-4 right-4 flex gap-2">
          {config.cameras.map((c, i) => (
            <div 
              key={c}
              className={`w-2 h-2 rounded-full transition ${i === rotationIndex ? 'bg-accent' : 'bg-white/30'}`}
            />
          ))}
        </div>
        <div className="absolute bottom-4 right-4">
          <button 
            onClick={(e) => { e.stopPropagation(); setFocusedCamera(camera) }}
            className="p-2 bg-black/50 rounded-lg hover:bg-black/70 transition"
          >
            <Maximize2 className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    )
  }

  // Grid view
  return (
    <div 
      className="w-full h-full grid gap-1 bg-black p-1"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {config.cameras.map(camera => (
        <div 
          key={camera}
          className="relative bg-dark-900 cursor-pointer hover:ring-2 ring-accent transition"
          onClick={() => setFocusedCamera(camera)}
        >
          <CameraImage 
            src={getImageUrl(camera)} 
            camera={camera}
            onError={() => handleError(camera)}
            hasError={errors.has(camera)}
            showLabel
          />
        </div>
      ))}
    </div>
  )
}

function CameraImage({ 
  src, 
  camera, 
  onError, 
  hasError,
  showLabel 
}: { 
  src: string
  camera: string
  onError: () => void
  hasError: boolean
  showLabel?: boolean
}) {
  const [key, setKey] = useState(0)
  
  // Force refresh periodically
  useEffect(() => {
    const interval = setInterval(() => setKey(k => k + 1), 3000)
    return () => clearInterval(interval)
  }, [])
  
  if (hasError) {
    return (
      <div className="absolute inset-0 flex items-center justify-center text-gray-600">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-1 opacity-50" />
          <div className="text-xs">{camera}</div>
        </div>
      </div>
    )
  }
  
  return (
    <>
      <img 
        key={key}
        src={src}
        alt={camera}
        className="absolute inset-0 w-full h-full object-cover"
        onError={onError}
      />
      {showLabel && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
          <div className="flex items-center gap-1.5">
            <Video className="w-3 h-3 text-red-500 animate-pulse" />
            <span className="text-white text-xs font-medium truncate">{camera}</span>
          </div>
        </div>
      )}
    </>
  )
}
