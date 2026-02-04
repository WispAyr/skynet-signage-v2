import { motion } from 'framer-motion'

interface AlertData {
  level: 'info' | 'success' | 'warning' | 'critical'
  title: string
  message: string
  source?: string
  timestamp?: string
  action?: string
}

const levelConfig = {
  info: {
    bg: 'from-blue-900/90 to-blue-950/95',
    border: 'border-blue-500',
    icon: 'ℹ️',
    pulse: false,
    glow: 'shadow-blue-500/30'
  },
  success: {
    bg: 'from-emerald-900/90 to-emerald-950/95',
    border: 'border-emerald-500',
    icon: '✅',
    pulse: false,
    glow: 'shadow-emerald-500/30'
  },
  warning: {
    bg: 'from-amber-900/90 to-amber-950/95',
    border: 'border-amber-500',
    icon: '⚠️',
    pulse: true,
    glow: 'shadow-amber-500/40'
  },
  critical: {
    bg: 'from-red-900/90 to-red-950/95',
    border: 'border-red-500',
    icon: '🚨',
    pulse: true,
    glow: 'shadow-red-500/50'
  }
}

export function AlertTemplate({ data }: { data: AlertData }) {
  const config = levelConfig[data.level]

  return (
    <div className="w-full h-full flex items-center justify-center bg-black p-8">
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className={`
          max-w-3xl w-full rounded-2xl border-2 ${config.border}
          bg-gradient-to-br ${config.bg} backdrop-blur-xl
          shadow-2xl ${config.glow} p-8 relative overflow-hidden
        `}
      >
        {/* Pulse effect for warnings/critical */}
        {config.pulse && (
          <motion.div
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={`absolute inset-0 bg-gradient-to-r ${config.bg} pointer-events-none`}
          />
        )}

        <div className="relative z-10">
          {/* Icon and Level */}
          <div className="flex items-center gap-4 mb-4">
            <motion.span
              animate={config.pulse ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-5xl"
            >
              {config.icon}
            </motion.span>
            <div>
              <div className="text-sm uppercase tracking-widest text-gray-400">
                {data.level.toUpperCase()} ALERT
              </div>
              {data.source && (
                <div className="text-sm text-gray-500">from {data.source}</div>
              )}
            </div>
          </div>

          {/* Title */}
          <motion.h1
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-4xl font-bold text-white mb-4"
          >
            {data.title}
          </motion.h1>

          {/* Message */}
          <motion.p
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-gray-200 leading-relaxed"
          >
            {data.message}
          </motion.p>

          {/* Action */}
          {data.action && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 p-4 rounded-xl bg-white/10 border border-white/20"
            >
              <span className="text-gray-400 mr-2">Action:</span>
              <span className="text-white font-medium">{data.action}</span>
            </motion.div>
          )}

          {/* Timestamp */}
          {data.timestamp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6 text-right text-sm text-gray-500"
            >
              {data.timestamp}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
