import { motion } from 'framer-motion'

interface TaskCompleteData {
  title: string
  agent: string
  agentEmoji?: string
  duration?: string
  highlights?: string[]
  status: 'success' | 'warning' | 'error'
  timestamp?: string
}

const statusColors = {
  success: { bg: 'from-emerald-900/80 to-emerald-950/90', border: 'border-emerald-500', icon: '✅', glow: 'shadow-emerald-500/20' },
  warning: { bg: 'from-amber-900/80 to-amber-950/90', border: 'border-amber-500', icon: '⚠️', glow: 'shadow-amber-500/20' },
  error: { bg: 'from-red-900/80 to-red-950/90', border: 'border-red-500', icon: '❌', glow: 'shadow-red-500/20' }
}

const agentColors: Record<string, string> = {
  'Builder': 'text-blue-400',
  'Atlas': 'text-amber-400',
  'Wonda': 'text-pink-400',
  'Cipher': 'text-green-400',
  'Friday': 'text-purple-400',
  'Herald': 'text-cyan-400',
  'default': 'text-gray-300'
}

export function TaskCompleteTemplate({ data }: { data: TaskCompleteData }) {
  const colors = statusColors[data.status]
  const agentColor = agentColors[data.agent] || agentColors.default

  return (
    <div className="w-full h-full flex items-center justify-center bg-black p-8">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`
          max-w-2xl w-full rounded-2xl border-2 ${colors.border}
          bg-gradient-to-br ${colors.bg} backdrop-blur-xl
          shadow-2xl ${colors.glow} p-8
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm uppercase tracking-widest text-gray-400 mb-2"
            >
              Task Complete
            </motion.div>
            <motion.h1
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-white"
            >
              {data.title}
            </motion.h1>
          </div>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, type: 'spring' }}
            className="text-5xl"
          >
            {colors.icon}
          </motion.div>
        </div>

        {/* Agent & Duration */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center gap-6 mb-6"
        >
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Agent:</span>
            <span className={`font-semibold ${agentColor}`}>
              {data.agentEmoji && <span className="mr-1">{data.agentEmoji}</span>}
              {data.agent}
            </span>
          </div>
          {data.duration && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Duration:</span>
              <span className="font-mono text-white">{data.duration}</span>
            </div>
          )}
        </motion.div>

        {/* Highlights */}
        {data.highlights && data.highlights.length > 0 && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="text-sm uppercase tracking-widest text-gray-400 mb-3">
              Highlights
            </div>
            <div className="flex flex-wrap gap-2">
              {data.highlights.map((item, i) => (
                <motion.span
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.1 }}
                  className="px-3 py-1.5 rounded-full bg-white/10 text-white text-sm font-medium"
                >
                  {item}
                </motion.span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Timestamp */}
        {data.timestamp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-6 pt-4 border-t border-white/10 text-right text-sm text-gray-500"
          >
            {data.timestamp}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
