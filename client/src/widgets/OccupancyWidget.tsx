import { useState, useEffect } from 'react'
import { Car, ParkingCircle, AlertTriangle, CheckCircle } from 'lucide-react'

interface OccupancyConfig {
  siteId?: string
  siteName?: string
  capacity?: number
  apiUrl?: string  // POS API for real-time data
  refreshInterval?: number
  showPercentage?: boolean
  warningThreshold?: number  // Percentage to show warning
  criticalThreshold?: number // Percentage to show critical
}

interface OccupancyData {
  current: number
  capacity: number
  available: number
  percentage: number
}

export function OccupancyWidget({ config }: { config: OccupancyConfig }) {
  const [data, setData] = useState<OccupancyData | null>(null)
  const [loading, setLoading] = useState(true)
  
  const capacity = config.capacity || 100
  const warningThreshold = config.warningThreshold || 80
  const criticalThreshold = config.criticalThreshold || 95
  const refreshInterval = config.refreshInterval || 10000
  
  useEffect(() => {
    const fetchData = async () => {
      if (config.apiUrl) {
        try {
          const res = await fetch(config.apiUrl)
          const json = await res.json()
          setData({
            current: json.current || json.occupied || 0,
            capacity: json.capacity || capacity,
            available: json.available || (json.capacity - json.current) || 0,
            percentage: json.percentage || Math.round((json.current / json.capacity) * 100) || 0
          })
        } catch (e) {
          console.error('Failed to fetch occupancy:', e)
        }
      } else {
        // Demo data
        const current = Math.floor(Math.random() * capacity * 0.9)
        setData({
          current,
          capacity,
          available: capacity - current,
          percentage: Math.round((current / capacity) * 100)
        })
      }
      setLoading(false)
    }
    
    fetchData()
    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [config.apiUrl, capacity, refreshInterval])
  
  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading occupancy...</div>
      </div>
    )
  }
  
  const getStatus = () => {
    if (data.percentage >= criticalThreshold) return { color: '#ef4444', label: 'FULL', icon: AlertTriangle }
    if (data.percentage >= warningThreshold) return { color: '#f59e0b', label: 'FILLING', icon: AlertTriangle }
    return { color: '#10b981', label: 'AVAILABLE', icon: CheckCircle }
  }
  
  const status = getStatus()
  const StatusIcon = status.icon
  
  // Calculate stroke for circular progress
  const radius = 120
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (data.percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      {/* Site name */}
      {config.siteName && (
        <div className="flex items-center gap-3 mb-8">
          <ParkingCircle className="w-8 h-8 text-accent" />
          <h2 className="text-3xl font-semibold text-white">{config.siteName}</h2>
        </div>
      )}
      
      {/* Circular progress */}
      <div className="relative mb-8">
        <svg width="280" height="280" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="140"
            cy="140"
            r={radius}
            fill="none"
            stroke="#1f2937"
            strokeWidth="20"
          />
          {/* Progress circle */}
          <circle
            cx="140"
            cy="140"
            r={radius}
            fill="none"
            stroke={status.color}
            strokeWidth="20"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-6xl font-bold text-white">{data.available}</div>
          <div className="text-xl text-gray-400">spaces</div>
        </div>
      </div>
      
      {/* Status badge */}
      <div 
        className="flex items-center gap-2 px-6 py-3 rounded-full text-lg font-semibold mb-8"
        style={{ backgroundColor: `${status.color}20`, color: status.color }}
      >
        <StatusIcon className="w-6 h-6" />
        {status.label}
      </div>
      
      {/* Stats row */}
      <div className="flex gap-12 text-center">
        <div>
          <div className="flex items-center justify-center gap-2 text-3xl font-semibold text-white">
            <Car className="w-8 h-8" />
            {data.current}
          </div>
          <div className="text-gray-500 mt-1">Occupied</div>
        </div>
        <div>
          <div className="text-3xl font-semibold text-white">{data.capacity}</div>
          <div className="text-gray-500 mt-1">Capacity</div>
        </div>
        {config.showPercentage !== false && (
          <div>
            <div className="text-3xl font-semibold" style={{ color: status.color }}>
              {data.percentage}%
            </div>
            <div className="text-gray-500 mt-1">Full</div>
          </div>
        )}
      </div>
    </div>
  )
}
