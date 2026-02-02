import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatItem {
  label: string
  value: number | string
  unit?: string
  change?: number  // Percentage change
  color?: string
}

interface StatsConfig {
  title?: string
  stats: StatItem[]
  columns?: number
  apiUrl?: string  // Optional API to fetch stats from
  refreshInterval?: number
}

export function StatsWidget({ config }: { config: StatsConfig }) {
  const [stats, setStats] = useState<StatItem[]>(config.stats || [])
  const [animatedValues, setAnimatedValues] = useState<Record<string, number>>({})
  
  const columns = config.columns || 3
  const refreshInterval = config.refreshInterval || 30000
  
  // Fetch from API if provided
  useEffect(() => {
    if (!config.apiUrl) return
    
    const fetchStats = async () => {
      try {
        const res = await fetch(config.apiUrl!)
        const data = await res.json()
        if (Array.isArray(data)) {
          setStats(data)
        } else if (data.stats) {
          setStats(data.stats)
        }
      } catch (e) {
        console.error('Failed to fetch stats:', e)
      }
    }
    
    fetchStats()
    const interval = setInterval(fetchStats, refreshInterval)
    return () => clearInterval(interval)
  }, [config.apiUrl, refreshInterval])
  
  // Animate number changes
  useEffect(() => {
    stats.forEach((stat, i) => {
      if (typeof stat.value === 'number') {
        const key = `${i}-${stat.label}`
        const current = animatedValues[key] || 0
        const target = stat.value
        
        if (current !== target) {
          const duration = 1000
          const steps = 30
          const increment = (target - current) / steps
          let step = 0
          
          const animate = () => {
            step++
            if (step <= steps) {
              setAnimatedValues(prev => ({
                ...prev,
                [key]: Math.round(current + increment * step)
              }))
              requestAnimationFrame(animate)
            } else {
              setAnimatedValues(prev => ({ ...prev, [key]: target }))
            }
          }
          requestAnimationFrame(animate)
        }
      }
    })
  }, [stats])
  
  const getValue = (stat: StatItem, index: number) => {
    if (typeof stat.value === 'number') {
      const key = `${index}-${stat.label}`
      return animatedValues[key] ?? stat.value
    }
    return stat.value
  }
  
  const getTrendIcon = (change?: number) => {
    if (!change) return <Minus className="w-5 h-5 text-gray-500" />
    if (change > 0) return <TrendingUp className="w-5 h-5 text-green-500" />
    return <TrendingDown className="w-5 h-5 text-red-500" />
  }

  return (
    <div className="flex flex-col h-full p-8">
      {config.title && (
        <h2 className="text-2xl font-semibold text-white mb-8">{config.title}</h2>
      )}
      
      <div 
        className="grid gap-6 flex-1"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {stats.map((stat, i) => (
          <div 
            key={`${i}-${stat.label}`}
            className="bg-dark-700/50 rounded-2xl p-6 flex flex-col"
          >
            <div className="text-gray-400 text-sm mb-2">{stat.label}</div>
            <div className="flex items-baseline gap-2">
              <span 
                className="text-4xl font-semibold"
                style={{ color: stat.color || '#00d4ff' }}
              >
                {getValue(stat, i)}
              </span>
              {stat.unit && (
                <span className="text-xl text-gray-500">{stat.unit}</span>
              )}
            </div>
            {stat.change !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                {getTrendIcon(stat.change)}
                <span className={stat.change > 0 ? 'text-green-500' : stat.change < 0 ? 'text-red-500' : 'text-gray-500'}>
                  {stat.change > 0 ? '+' : ''}{stat.change}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
