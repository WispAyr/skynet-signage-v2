import { motion } from 'framer-motion'

interface DigestItem {
  agent: string
  task: string
  status: 'done' | 'in-progress' | 'blocked'
  time?: string
}

interface DailyDigestData {
  date: string
  summary: string
  items: DigestItem[]
  stats?: {
    completed: number
    inProgress: number
    blocked: number
  }
}

const statusBadge = {
  'done': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: '✓' },
  'in-progress': { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: '⟳' },
  'blocked': { bg: 'bg-red-500/20', text: 'text-red-400', icon: '!' }
}

export function DailyDigestTemplate({ data }: { data: DailyDigestData }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-black p-8 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="max-w-4xl w-full"
      >
        {/* Header */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-8"
        >
          <div className="text-sm uppercase tracking-widest text-gray-400 mb-2">
            Daily Digest
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">{data.date}</h1>
          <p className="text-xl text-gray-300">{data.summary}</p>
        </motion.div>

        {/* Stats Bar */}
        {data.stats && (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex gap-6 mb-8"
          >
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-gray-300">{data.stats.completed} done</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-gray-300">{data.stats.inProgress} in progress</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-gray-300">{data.stats.blocked} blocked</span>
            </div>
          </motion.div>
        )}

        {/* Items List */}
        <div className="space-y-3">
          {data.items.map((item, i) => {
            const badge = statusBadge[item.status]
            return (
              <motion.div
                key={i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="
                  flex items-center gap-4 p-4 rounded-xl
                  bg-gradient-to-r from-gray-900/80 to-gray-950/60
                  border border-white/5
                "
              >
                {/* Status Icon */}
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  ${badge.bg} ${badge.text} font-bold
                `}>
                  {badge.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{item.task}</div>
                  <div className="text-sm text-gray-400">{item.agent}</div>
                </div>

                {/* Time */}
                {item.time && (
                  <div className="text-sm text-gray-500 font-mono">
                    {item.time}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
