import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  CheckCircle2, Clock, User, RefreshCw, Activity, 
  ChevronDown, ChevronUp, Zap, Cloud, CloudOff, 
  ListTodo, Users
} from 'lucide-react'

// Agent emoji map
const AGENT_EMOJIS: Record<string, string> = {
  blue: '🔵',
  mentor: '🧭',
  pepper: '💼',
  professor: '🎓',
  wonda: '🎨',
  archie: '📚',
  atlas: '🅿️',
  cipher: '🔐',
  friday: '⚡',
  jarvis: '🎯',
  lexis: '⚖️',
  wong: '📚',
  loki: '📝',
  quill: '✍️',
  scout: '🔍',
  vision: '👁️'
}

// Agent role map
const AGENT_ROLES: Record<string, string> = {
  blue: 'Monday.com Specialist',
  mentor: 'HR & Talent Development',
  pepper: 'Admin & Comms',
  professor: 'Agent Trainer',
  wonda: 'Designer',
  archie: 'Technical Documentation',
  atlas: 'BPA & Parking Expert',
  cipher: 'Security & Compliance',
  friday: 'Lead Developer',
  jarvis: 'Project Lead',
  lexis: 'Legal Research',
  wong: 'Tech Writer',
  loki: 'Content Writer',
  quill: 'Social Media',
  scout: 'Market Research',
  vision: 'SEO Analyst'
}

// Agent color map
const AGENT_COLORS: Record<string, string> = {
  blue: '#3B82F6',
  mentor: '#F59E0B',
  pepper: '#8B5CF6',
  professor: '#10B981',
  wonda: '#EC4899',
  archie: '#6366F1',
  atlas: '#22C55E',
  cipher: '#EF4444',
  friday: '#F97316',
  jarvis: '#0EA5E9',
  lexis: '#8B5CF6',
  wong: '#6366F1',
  loki: '#F472B6',
  quill: '#A78BFA',
  scout: '#34D399',
  vision: '#60A5FA'
}

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  assignedTo: string | null
  completedAt: string | null
  updatedAt: string
  outputAt?: string | null
  output?: string | null
}

interface Agent {
  id: string
  name: string
  role: string
  status: string
  currentTask: string | null
  avatar: string
}

interface TeamActivityConfig {
  hqApiUrl?: string
  refreshInterval?: number
  maxItems?: number
  showMondayStatus?: boolean
  autoScroll?: boolean
  autoScrollInterval?: number
  title?: string
  compact?: boolean
  // Filtering options
  filterByAgents?: string[]         // Filter to specific agent IDs (e.g., ['friday', 'wonda'])
  filterByPriority?: string[]       // Filter to specific priorities (e.g., ['high', 'critical'])
  excludeAgents?: string[]          // Exclude specific agents
  excludePriorities?: string[]      // Exclude specific priorities
  showFilterControls?: boolean      // Show interactive filter UI (default: false for signage)
}

export function TeamActivityWidget({ config }: { config: TeamActivityConfig }) {
  const hqApiUrl = config.hqApiUrl || 'http://localhost:3800'
  const refreshInterval = config.refreshInterval || 30000
  const maxItems = config.maxItems || 15
  const showMondayStatus = config.showMondayStatus !== false
  const autoScroll = config.autoScroll !== false
  const autoScrollInterval = config.autoScrollInterval || 5000
  const title = config.title || 'Team Activity'
  const compact = config.compact || false
  
  const [tasks, setTasks] = useState<Task[]>([])
  const [agents, setAgents] = useState<Agent[]>([])
  const [mondayConnected, setMondayConnected] = useState(true)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scrollPosition, setScrollPosition] = useState(0)
  
  const scrollRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<number>()
  
  // Fetch data from HQ API
  const fetchData = useCallback(async () => {
    try {
      const [tasksRes, agentsRes] = await Promise.all([
        fetch(`${hqApiUrl}/api/tasks`),
        fetch(`${hqApiUrl}/api/agents`)
      ])
      
      if (!tasksRes.ok || !agentsRes.ok) {
        throw new Error('Failed to fetch data')
      }
      
      const tasksData: Task[] = await tasksRes.json()
      const agentsData: Agent[] = await agentsRes.json()
      
      // Filter and sort tasks - get completed ones first, then recent activity
      const completedTasks = tasksData
        .filter(t => t.status === 'done' && t.completedAt)
        .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())
        .slice(0, maxItems)
      
      setTasks(completedTasks)
      setAgents(agentsData)
      setLastSync(new Date())
      setError(null)
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch HQ data:', err)
      setError('Failed to connect to HQ')
      setLoading(false)
    }
  }, [hqApiUrl, maxItems])
  
  // Initial fetch and refresh interval
  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchData, refreshInterval])
  
  // Auto-scroll functionality
  useEffect(() => {
    if (!autoScroll || !scrollRef.current) return
    
    const scroll = () => {
      if (scrollRef.current) {
        const maxScroll = scrollRef.current.scrollHeight - scrollRef.current.clientHeight
        if (maxScroll <= 0) return
        
        setScrollPosition(prev => {
          const next = prev + 1
          if (next >= maxScroll) {
            // Reset to top after a pause
            setTimeout(() => setScrollPosition(0), 2000)
            return maxScroll
          }
          return next
        })
      }
    }
    
    const scrollTimer = setInterval(scroll, 50)
    return () => clearInterval(scrollTimer)
  }, [autoScroll, tasks])
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollPosition
    }
  }, [scrollPosition])
  
  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    return `${diffDays}d ago`
  }
  
  // Format time
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-GB', { 
      hour: '2-digit', 
      minute: '2-digit'
    })
  }
  
  // Get active agents
  const activeAgents = agents.filter(a => a.status === 'working')
  const idleAgents = agents.filter(a => a.status === 'idle')
  
  // Stats
  const todayTasks = tasks.filter(t => {
    const completedDate = new Date(t.completedAt || t.updatedAt)
    const today = new Date()
    return completedDate.toDateString() === today.toDateString()
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="animate-spin">
          <RefreshCw className="w-8 h-8 text-cyan-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-cyan-400 to-emerald-400 rounded-full" />
          <h1 className="text-2xl font-light tracking-wider text-cyan-400">
            {title.split(' ').map((word, i) => (
              <span key={i} className={i === 1 ? 'font-semibold' : ''}>
                {word}{' '}
              </span>
            ))}
          </h1>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Monday.com Status */}
          {showMondayStatus && (
            <div className="flex items-center gap-2 text-sm">
              {mondayConnected ? (
                <>
                  <Cloud className="w-4 h-4 text-emerald-400" />
                  <span className="text-gray-400">Monday.com</span>
                  <span className="text-emerald-400">Synced</span>
                </>
              ) : (
                <>
                  <CloudOff className="w-4 h-4 text-red-400" />
                  <span className="text-gray-400">Monday.com</span>
                  <span className="text-red-400">Offline</span>
                </>
              )}
            </div>
          )}
          
          {/* Clock */}
          <div className="text-right">
            <div className="text-2xl font-mono text-emerald-400">
              {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-xs text-gray-500">
              {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Timeline */}
        <div className="flex-1 flex flex-col border-r border-gray-800">
          <div className="flex items-center justify-between px-6 py-3 bg-gray-800/50">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Activity className="w-4 h-4" />
              <span>Recent Completions</span>
            </div>
            <span className="text-xs text-gray-500">
              {todayTasks.length} today
            </span>
          </div>
          
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide"
            style={{ scrollBehavior: 'auto' }}
          >
            {tasks.map((task, index) => {
              const agentId = task.assignedTo || 'unknown'
              const emoji = AGENT_EMOJIS[agentId] || '🤖'
              const role = AGENT_ROLES[agentId] || 'Agent'
              const color = AGENT_COLORS[agentId] || '#64748B'
              const completedTime = task.completedAt ? formatTime(task.completedAt) : formatTime(task.updatedAt)
              const relativeTime = task.completedAt ? formatRelativeTime(task.completedAt) : formatRelativeTime(task.updatedAt)
              
              return (
                <div 
                  key={task.id}
                  className="flex gap-3 animate-fadeIn"
                  style={{ 
                    animationDelay: `${index * 0.1}s`,
                    opacity: 0,
                    animation: 'fadeIn 0.5s ease forwards'
                  }}
                >
                  {/* Timeline marker */}
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-mono text-gray-500 mb-2">{completedTime}</span>
                    <div 
                      className="w-3 h-3 rounded-full ring-2 ring-gray-700"
                      style={{ backgroundColor: color }}
                    />
                    {index < tasks.length - 1 && (
                      <div className="w-0.5 flex-1 bg-gradient-to-b from-gray-700 to-transparent mt-2" />
                    )}
                  </div>
                  
                  {/* Task card */}
                  <div 
                    className="flex-1 bg-gray-800/50 rounded-lg p-4 border-l-2 hover:bg-gray-800/80 transition-colors"
                    style={{ borderLeftColor: color }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-100 line-clamp-1">
                        {task.title}
                      </h3>
                      <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full ml-2">
                        <CheckCircle2 className="w-3 h-3" />
                        Done
                      </span>
                    </div>
                    
                    {!compact && task.output && (
                      <p className="text-sm text-gray-400 line-clamp-2 mb-3">
                        {task.output.split('##')[0].substring(0, 150)}...
                      </p>
                    )}
                    
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-lg">{emoji}</span>
                      <span className="text-gray-300 capitalize">{agentId}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-gray-500">{role}</span>
                      <span className="ml-auto text-xs text-gray-500">{relativeTime}</span>
                    </div>
                  </div>
                </div>
              )
            })}
            
            {tasks.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <ListTodo className="w-12 h-12 mb-4 opacity-50" />
                <p>No completed tasks yet</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="w-72 flex flex-col bg-gray-800/30">
          {/* Stats */}
          <div className="p-4 border-b border-gray-800">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-3xl font-bold font-mono text-emerald-400">
                  {todayTasks.length}
                </div>
                <div className="text-xs text-gray-500 mt-1">Completed Today</div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                <div className="text-3xl font-bold font-mono text-cyan-400">
                  {activeAgents.length}
                </div>
                <div className="text-xs text-gray-500 mt-1">Active Agents</div>
              </div>
            </div>
          </div>
          
          {/* Active Agents */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team Status
            </div>
            
            <div className="px-3 space-y-2">
              {activeAgents.map(agent => {
                const emoji = AGENT_EMOJIS[agent.id] || agent.avatar
                const color = AGENT_COLORS[agent.id] || '#64748B'
                const currentTask = tasks.find(t => t.id === agent.currentTask)
                
                return (
                  <div 
                    key={agent.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50"
                  >
                    <div 
                      className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                      style={{ backgroundColor: `${color}30` }}
                    >
                      {emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-200 capitalize">
                        {agent.name || agent.id}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {currentTask?.title || 'Working...'}
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                )
              })}
              
              {idleAgents.slice(0, 5).map(agent => {
                const emoji = AGENT_EMOJIS[agent.id] || agent.avatar
                const color = AGENT_COLORS[agent.id] || '#64748B'
                
                return (
                  <div 
                    key={agent.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/30 opacity-60"
                  >
                    <div 
                      className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      {emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-gray-400 capitalize">
                        {agent.name || agent.id}
                      </div>
                      <div className="text-xs text-gray-600">Idle</div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-gray-600" />
                  </div>
                )
              })}
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-3 border-t border-gray-800 text-center">
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                ParkWise
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                Local Connect
              </span>
            </div>
            {lastSync && (
              <div className="text-xs text-gray-600 mt-2">
                Last sync: {formatRelativeTime(lastSync.toISOString())}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .line-clamp-1 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 1;
        }
        .line-clamp-2 {
          overflow: hidden;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }
      `}</style>
    </div>
  )
}
