import { useState, useEffect } from 'react'
import { DollarSign, TrendingUp, TrendingDown, Car, CreditCard, Clock } from 'lucide-react'

interface RevenueConfig {
  apiUrl?: string
  siteId?: string
  siteName?: string
  refreshInterval?: number
  showTransactions?: boolean
}

interface RevenueData {
  today: number
  yesterday: number
  weekTotal: number
  monthTotal: number
  transactionCount: number
  averageStay: string
  recentTransactions: Array<{
    id: string
    amount: number
    plate?: string
    time: string
    site: string
  }>
}

export function RevenueWidget({ config }: { config: RevenueConfig }) {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  
  const refreshInterval = config.refreshInterval || 60000

  useEffect(() => {
    const fetchData = async () => {
      const baseUrl = config.apiUrl || 'http://localhost:3000'
      try {
        // Try POS API
        const [todayRes, weekRes] = await Promise.allSettled([
          fetch(`${baseUrl}/api/revenue/today${config.siteId ? `?site=${config.siteId}` : ''}`),
          fetch(`${baseUrl}/api/revenue/week${config.siteId ? `?site=${config.siteId}` : ''}`),
        ])

        const todayData = todayRes.status === 'fulfilled' ? await todayRes.value.json() : null
        const weekData = weekRes.status === 'fulfilled' ? await weekRes.value.json() : null

        if (todayData || weekData) {
          setData({
            today: todayData?.total || todayData?.revenue || 0,
            yesterday: todayData?.yesterday || 0,
            weekTotal: weekData?.total || weekData?.revenue || 0,
            monthTotal: weekData?.monthTotal || 0,
            transactionCount: todayData?.count || todayData?.transactions || 0,
            averageStay: todayData?.averageStay || 'N/A',
            recentTransactions: todayData?.recent || [],
          })
        } else {
          // Demo data
          setData({
            today: 342.50,
            yesterday: 289.00,
            weekTotal: 2145.80,
            monthTotal: 8920.50,
            transactionCount: 47,
            averageStay: '2h 15m',
            recentTransactions: [
              { id: '1', amount: 4.50, plate: 'SA23 KRG', time: '14:32', site: 'Kyle Rise' },
              { id: '2', amount: 6.00, plate: 'GN21 XWB', time: '14:15', site: 'Kyle Rise' },
              { id: '3', amount: 3.00, plate: 'SD19 PPL', time: '13:48', site: 'Kyle Surface' },
            ],
          })
        }
      } catch (e) {
        console.error('Revenue fetch error:', e)
        // Demo data on error
        setData({
          today: 342.50, yesterday: 289.00, weekTotal: 2145.80, monthTotal: 8920.50,
          transactionCount: 47, averageStay: '2h 15m', recentTransactions: [],
        })
      }
      setLoading(false)
    }

    fetchData()
    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [config.apiUrl, config.siteId, refreshInterval])

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading revenue data...</div>
      </div>
    )
  }

  const todayChange = data.yesterday > 0 
    ? ((data.today - data.yesterday) / data.yesterday * 100).toFixed(1)
    : '0'
  const isUp = parseFloat(todayChange) >= 0

  return (
    <div className="flex flex-col h-full p-8" style={{ fontFamily: 'Antonio, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <CreditCard className="w-8 h-8 text-accent" />
        <div>
          <h2 className="text-2xl font-bold text-white tracking-wider">
            {config.siteName || 'REVENUE'}
          </h2>
          <p className="text-sm text-gray-500">POS Overview</p>
        </div>
      </div>

      {/* Main stat */}
      <div className="text-center mb-8">
        <div className="text-6xl font-bold text-white mb-2">
          £{data.today.toFixed(2)}
        </div>
        <div className="flex items-center justify-center gap-2 text-lg">
          {isUp ? (
            <TrendingUp className="w-5 h-5 text-green-400" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-400" />
          )}
          <span className={isUp ? 'text-green-400' : 'text-red-400'}>
            {isUp ? '+' : ''}{todayChange}%
          </span>
          <span className="text-gray-500">vs yesterday</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatBox label="YESTERDAY" value={`£${data.yesterday.toFixed(2)}`} />
        <StatBox label="THIS WEEK" value={`£${data.weekTotal.toFixed(2)}`} />
        <StatBox label="TRANSACTIONS" value={data.transactionCount.toString()} icon={<Car className="w-4 h-4" />} />
        <StatBox label="AVG STAY" value={data.averageStay} icon={<Clock className="w-4 h-4" />} />
      </div>

      {/* Recent transactions */}
      {config.showTransactions !== false && data.recentTransactions.length > 0 && (
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-400 tracking-wider mb-3">RECENT</h3>
          <div className="space-y-2">
            {data.recentTransactions.map(tx => (
              <div key={tx.id} className="flex items-center gap-3 p-3 bg-dark-700/50 rounded-lg">
                <CreditCard className="w-4 h-4 text-accent flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm text-white">£{tx.amount.toFixed(2)}</div>
                  <div className="text-xs text-gray-500">{tx.plate || 'Cash'} • {tx.site}</div>
                </div>
                <span className="text-xs text-gray-500">{tx.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-dark-700/50 rounded-lg p-4 text-center">
      {icon && <div className="flex justify-center mb-1 text-gray-500">{icon}</div>}
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500 mt-1 tracking-wider">{label}</div>
    </div>
  )
}
