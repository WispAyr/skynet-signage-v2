import { motion } from 'framer-motion'

interface AnnouncementData {
  title: string
  message: string
  icon?: string
  style?: 'default' | 'celebration' | 'urgent' | 'info'
  footer?: string
}

const styleConfig = {
  default: {
    bg: 'from-gray-900/90 to-gray-950/95',
    border: 'border-gray-600',
    titleColor: 'text-white',
    glow: ''
  },
  celebration: {
    bg: 'from-purple-900/90 via-pink-900/90 to-amber-900/90',
    border: 'border-amber-500',
    titleColor: 'text-amber-300',
    glow: 'shadow-amber-500/30'
  },
  urgent: {
    bg: 'from-red-900/90 to-red-950/95',
    border: 'border-red-500',
    titleColor: 'text-red-300',
    glow: 'shadow-red-500/40'
  },
  info: {
    bg: 'from-cyan-900/90 to-blue-950/95',
    border: 'border-cyan-500',
    titleColor: 'text-cyan-300',
    glow: 'shadow-cyan-500/30'
  }
}

export function AnnouncementTemplate({ data }: { data: AnnouncementData }) {
  const config = styleConfig[data.style || 'default']

  return (
    <div className="w-full h-full flex items-center justify-center bg-black p-8">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className={`
          max-w-3xl w-full rounded-3xl border-2 ${config.border}
          bg-gradient-to-br ${config.bg} backdrop-blur-xl
          shadow-2xl ${config.glow} p-12 text-center
        `}
      >
        {/* Icon */}
        {data.icon && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
            className="text-8xl mb-6"
          >
            {data.icon}
          </motion.div>
        )}

        {/* Title */}
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`text-5xl font-bold ${config.titleColor} mb-6`}
        >
          {data.title}
        </motion.h1>

        {/* Message */}
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-2xl text-gray-200 leading-relaxed"
        >
          {data.message}
        </motion.p>

        {/* Footer */}
        {data.footer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 pt-6 border-t border-white/10 text-gray-400"
          >
            {data.footer}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
