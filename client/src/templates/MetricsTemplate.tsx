import { motion } from 'framer-motion'

interface MetricItem {
  label: string
  value: string | number
  change?: string
  changeType?: 'up' | 'down' | 'neutral'
  icon?: string
}

interface MetricsData {
  title: string
  subtitle?: string
  metrics: MetricItem[]
  columns?: 2 | 3 | 4
  timestamp?: string
}

export function MetricsTemplate({ data }: { data: MetricsData }) {
  const columns = data.columns || 3
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4'
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-black p-8">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-4xl w-full"
      >
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8 text-center"
        >
          <h1 className="text-4xl font-bold text-white mb-2">{data.title}</h1>
          {data.subtitle && (
            <p className="text-lg text-gray-400">{data.subtitle}</p>
          )}
        </motion.div>

        {/* Metrics Grid */}
        <div className={`grid ${gridCols[columns]} gap-6`}>
          {data.metrics.map((metric, i) => (
            <motion.div
              key={i}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="
                rounded-2xl border border-white/10
                bg-gradient-to-br from-gray-900/80 to-gray-950/90
                backdrop-blur-xl p-6 text-center
                hover:border-white/20 transition-colors
              "
            >
              {metric.icon && (
                <div className="text-3xl mb-3">{metric.icon}</div>
              )}
              <div className="text-sm uppercase tracking-widest text-gray-400 mb-2">
                {metric.label}
              </div>
              <div className="text-4xl font-bold text-white font-mono mb-2">
                {metric.value}
              </div>
              {metric.change && (
                <div className={`text-sm font-medium ${
                  metric.changeType === 'up' ? 'text-emerald-400' :
                  metric.changeType === 'down' ? 'text-red-400' :
                  'text-gray-400'
                }`}>
                  {metric.changeType === 'up' && '↑ '}
                  {metric.changeType === 'down' && '↓ '}
                  {metric.change}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Timestamp */}
        {data.timestamp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 text-center text-sm text-gray-500"
          >
            {data.timestamp}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
