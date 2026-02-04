import { useState, useEffect } from 'react'

interface YoungsMenuConfig {
  rotateInterval?: number
  theme?: 'dark' | 'chalk' | 'elegant'
}

const MENU_DATA = {
  hotMeals: {
    title: 'Hot Meals',
    icon: '🍛',
    items: [
      { name: 'Chicken Curry + Chips', price: 5.80, popular: true },
      { name: 'Chicken Curry + Rice', price: 5.80 },
      { name: 'Chicken Curry, Rice + Chips', price: 6.30 },
      { name: 'Pie + Chips', price: 4.80 },
      { name: 'Pie, Chips + Beans', price: 5.30 },
      { name: 'Steak Pie + Chips', price: 5.30 },
      { name: 'Links + Chips', price: 4.80 },
      { name: 'Macaroni', price: 5.30 },
      { name: 'Macaroni + Chips', price: 5.30 },
    ]
  },
  soup: {
    title: 'Homemade Soup',
    icon: '🍲',
    items: [
      { name: 'Regular', price: 2.50 },
      { name: 'Large', price: 2.90 },
      { name: '+ Buttered Roll', price: 0.50 },
    ]
  },
  chips: {
    title: 'Chips',
    icon: '🍟',
    items: [
      { name: 'Chips', price: 3.00, large: 4.00 },
      { name: 'Salt + Chilli', price: 3.50, large: 4.50 },
      { name: 'Salt + Pepper', price: 3.50, large: 4.50 },
      { name: 'Cajun', price: 3.50, large: 4.50 },
      { name: '+ Cheese', price: 4.00, large: 5.00 },
      { name: '+ Curry Sauce', price: 4.00, large: 5.00 },
      { name: 'Loaded', price: 4.50, large: 5.50, popular: true },
    ]
  },
  bakedPotato: {
    title: 'Baked Potatoes',
    icon: '🥔',
    subtitle: 'Served with side salad',
    items: [
      { name: 'Plain', price: 3.70 },
      { name: 'Cheese', price: 4.80 },
      { name: 'Beans', price: 4.80 },
      { name: 'Cheese & Beans', price: 5.30 },
      { name: 'Coleslaw', price: 4.80 },
      { name: 'Cheese & Coleslaw', price: 5.30 },
      { name: 'Egg Mayo', price: 4.80 },
      { name: 'Chicken', price: 5.30 },
      { name: 'Tuna', price: 5.30 },
      { name: 'Chicken Curry', price: 6.30, popular: true },
      { name: 'Cheese & Bacon', price: 5.80 },
    ]
  },
  hotDrinks: {
    title: 'Hot Drinks',
    icon: '☕',
    items: [
      { name: 'Tea', price: 1.40 },
      { name: 'Coffee', price: 1.40 },
      { name: 'Latte', price: 2.20 },
      { name: 'Cappuccino', price: 2.40 },
      { name: 'Hot Chocolate', price: 2.40 },
      { name: 'Espresso', price: 1.80 },
      { name: '+ Flavour Shot', price: 0.50 },
    ]
  },
}

const SPECIALS = [
  { name: 'Chicken Curry + Rice', price: 5.80, tag: 'Most Popular', emoji: '🔥' },
  { name: 'Steak Pie + Chips', price: 5.30, tag: 'Scottish Classic', emoji: '🥧' },
  { name: 'Loaded Chips', price: 5.50, tag: 'Comfort Food', emoji: '🧀' },
  { name: 'Homemade Soup + Roll', price: 3.40, tag: 'Warm Up', emoji: '🍲' },
]

// Shared scaling utilities
const scale = {
  title: 'clamp(28px, 3.5vw, 72px)',
  subtitle: 'clamp(10px, 1vw, 20px)',
  sectionTitle: 'clamp(14px, 1.5vw, 30px)',
  sectionIcon: 'clamp(18px, 1.8vw, 36px)',
  item: 'clamp(11px, 1.15vw, 22px)',
  price: 'clamp(11px, 1.15vw, 22px)',
  small: 'clamp(9px, 0.85vw, 16px)',
  tiny: 'clamp(8px, 0.7vw, 14px)',
  gap: 'clamp(8px, 1vw, 20px)',
  padding: 'clamp(12px, 1.5vw, 28px)',
  radius: 'clamp(8px, 1vw, 20px)',
}

function MenuSection({ data }: { data: any }) {
  return (
    <div 
      className="h-full relative overflow-hidden"
      style={{ 
        background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
        backdropFilter: 'blur(10px)',
        borderRadius: scale.radius,
        padding: scale.padding,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
      }}
    >
      {/* Section header */}
      <div 
        className="flex items-center border-b border-amber-400/30"
        style={{ 
          gap: 'clamp(6px, 0.6vw, 12px)',
          paddingBottom: 'clamp(8px, 0.8vw, 16px)',
          marginBottom: 'clamp(10px, 1vw, 20px)'
        }}
      >
        <span style={{ fontSize: scale.sectionIcon }}>{data.icon}</span>
        <h2 
          className="font-bold tracking-wide"
          style={{ 
            fontSize: scale.sectionTitle,
            background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 2px 10px rgba(251,191,36,0.3)'
          }}
        >
          {data.title}
        </h2>
      </div>
      
      {data.subtitle && (
        <p 
          className="text-gray-400 italic"
          style={{ 
            fontSize: scale.tiny,
            marginBottom: 'clamp(6px, 0.6vw, 12px)',
            marginTop: 'clamp(-6px, -0.5vw, -10px)'
          }}
        >
          {data.subtitle}
        </p>
      )}
      
      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(6px, 0.6vw, 14px)' }}>
        {data.items.map((item: any, i: number) => (
          <div 
            key={i} 
            className="flex justify-between items-center"
            style={{ 
              padding: 'clamp(2px, 0.2vw, 4px) 0',
              borderBottom: i < data.items.length - 1 ? '1px dotted rgba(255,255,255,0.1)' : 'none'
            }}
          >
            <div className="flex items-center" style={{ gap: 'clamp(4px, 0.4vw, 8px)' }}>
              <span 
                className="text-white/90 font-medium"
                style={{ fontSize: scale.item }}
              >
                {item.name}
              </span>
              {item.popular && (
                <span 
                  className="text-orange-400 animate-pulse"
                  style={{ fontSize: scale.tiny }}
                >
                  ★
                </span>
              )}
            </div>
            <div className="flex items-center" style={{ gap: 'clamp(4px, 0.4vw, 8px)' }}>
              <span 
                className="font-bold tabular-nums"
                style={{ 
                  fontSize: scale.price,
                  color: '#34d399',
                  textShadow: '0 0 20px rgba(52,211,153,0.3)'
                }}
              >
                £{item.price.toFixed(2)}
              </span>
              {item.large && (
                <span 
                  className="text-gray-500 tabular-nums"
                  style={{ fontSize: scale.small }}
                >
                  / £{item.large.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function YoungsMenuWidget({ config }: { config: YoungsMenuConfig }) {
  const [time, setTime] = useState(new Date())
  const [specialIndex, setSpecialIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setSpecialIndex(i => (i + 1) % SPECIALS.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const isLunchTime = time.getHours() >= 11 && time.getHours() < 14
  const currentSpecial = SPECIALS[specialIndex]

  return (
    <div 
      className="w-full h-full text-white overflow-hidden relative"
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 30%, #0f172a 70%, #1e1a2e 100%)'
      }}
    >
      {/* Animated background elements */}
      <div 
        className="absolute rounded-full blur-3xl opacity-30 animate-pulse"
        style={{ 
          top: '-10%', left: '-5%',
          width: '40vw', height: '40vw',
          background: 'radial-gradient(circle, rgba(251,191,36,0.4) 0%, transparent 70%)'
        }} 
      />
      <div 
        className="absolute rounded-full blur-3xl opacity-20"
        style={{ 
          bottom: '-15%', right: '-10%',
          width: '50vw', height: '50vw',
          background: 'radial-gradient(circle, rgba(52,211,153,0.3) 0%, transparent 70%)',
          animation: 'pulse 4s ease-in-out infinite alternate'
        }} 
      />
      <div 
        className="absolute rounded-full blur-2xl opacity-10"
        style={{ 
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '60vw', height: '30vw',
          background: 'radial-gradient(ellipse, rgba(139,92,246,0.2) 0%, transparent 60%)'
        }} 
      />
      
      {/* Subtle noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
        }}
      />
      
      <div 
        className="relative z-10 h-full flex flex-col"
        style={{ padding: scale.padding }}
      >
        {/* Header */}
        <div className="text-center" style={{ marginBottom: scale.gap }}>
          <h1 
            className="font-bold tracking-tight"
            style={{ 
              fontSize: scale.title,
              background: 'linear-gradient(135deg, #fef3c7 0%, #fcd34d 25%, #f59e0b 50%, #fcd34d 75%, #fef3c7 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'shimmer 3s linear infinite',
              filter: 'drop-shadow(0 4px 20px rgba(251,191,36,0.4))'
            }}
          >
            Young's Food Emporium
          </h1>
          <div 
            className="flex items-center justify-center text-gray-400"
            style={{ 
              gap: 'clamp(12px, 2vw, 32px)',
              marginTop: 'clamp(4px, 0.5vw, 12px)',
              fontSize: scale.subtitle
            }}
          >
            <span className="flex items-center gap-1">
              <span className="text-amber-500">📞</span> 01292 652 043
            </span>
            <span className="text-amber-500/50">✦</span>
            <span className="flex items-center gap-1">
              <span className="text-amber-500">📱</span> @youngsfoodemporium
            </span>
            <span className="text-amber-500/50">✦</span>
            <span className="text-amber-400 font-semibold tabular-nums">
              {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Special Banner */}
        <div style={{ marginBottom: scale.gap }}>
          <div 
            className="relative overflow-hidden"
            style={{ 
              background: isLunchTime 
                ? 'linear-gradient(135deg, rgba(249,115,22,0.2) 0%, rgba(239,68,68,0.15) 50%, rgba(249,115,22,0.2) 100%)'
                : 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.1) 50%, rgba(251,191,36,0.15) 100%)',
              border: isLunchTime ? '1px solid rgba(249,115,22,0.3)' : '1px solid rgba(251,191,36,0.3)',
              borderRadius: scale.radius,
              padding: 'clamp(10px, 1.2vw, 24px)'
            }}
          >
            {/* Shimmer effect */}
            <div 
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
                animation: 'shimmer 2s ease-in-out infinite'
              }}
            />
            
            <div 
              className="relative flex items-center justify-center flex-wrap"
              style={{ gap: 'clamp(12px, 2vw, 32px)' }}
            >
              <span 
                className="uppercase tracking-[0.2em] font-medium"
                style={{ 
                  fontSize: scale.tiny,
                  color: isLunchTime ? '#fb923c' : '#fbbf24'
                }}
              >
                {isLunchTime ? '🍽️ Lunch Special' : '⭐ Today\'s Recommendation'}
              </span>
              
              <div className="flex items-center" style={{ gap: 'clamp(8px, 1vw, 16px)' }}>
                <span style={{ fontSize: 'clamp(16px, 1.8vw, 36px)' }}>{currentSpecial.emoji}</span>
                <span 
                  className="font-bold text-white"
                  style={{ fontSize: 'clamp(14px, 1.5vw, 30px)' }}
                >
                  {currentSpecial.name}
                </span>
              </div>
              
              <span 
                className="font-black tabular-nums"
                style={{ 
                  fontSize: 'clamp(16px, 1.8vw, 36px)',
                  color: '#34d399',
                  textShadow: '0 0 30px rgba(52,211,153,0.5)'
                }}
              >
                £{currentSpecial.price.toFixed(2)}
              </span>
              
              <span 
                className="rounded-full font-medium"
                style={{ 
                  fontSize: scale.tiny,
                  padding: 'clamp(3px, 0.3vw, 6px) clamp(10px, 1vw, 20px)',
                  background: 'rgba(251,191,36,0.2)',
                  color: '#fcd34d',
                  border: '1px solid rgba(251,191,36,0.3)'
                }}
              >
                {currentSpecial.tag}
              </span>
            </div>
            
            {/* Progress dots */}
            <div 
              className="flex justify-center"
              style={{ 
                gap: 'clamp(4px, 0.4vw, 8px)',
                marginTop: 'clamp(8px, 0.8vw, 16px)'
              }}
            >
              {SPECIALS.map((_, i) => (
                <div 
                  key={i}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === specialIndex ? 'clamp(16px, 1.5vw, 28px)' : 'clamp(6px, 0.5vw, 10px)',
                    height: 'clamp(6px, 0.5vw, 10px)',
                    background: i === specialIndex ? '#fbbf24' : 'rgba(255,255,255,0.2)'
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Menu Grid */}
        <div 
          className="flex-1 grid grid-cols-4 min-h-0"
          style={{ gap: scale.gap }}
        >
          <div className="flex flex-col" style={{ gap: scale.gap }}>
            <div className="flex-[2]"><MenuSection data={MENU_DATA.hotDrinks} /></div>
            <div className="flex-1"><MenuSection data={MENU_DATA.soup} /></div>
          </div>
          <div><MenuSection data={MENU_DATA.bakedPotato} /></div>
          <div><MenuSection data={MENU_DATA.chips} /></div>
          <div><MenuSection data={MENU_DATA.hotMeals} /></div>
        </div>

        {/* Footer */}
        <div 
          className="text-center"
          style={{ 
            marginTop: scale.gap,
            paddingTop: 'clamp(8px, 0.8vw, 16px)',
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <p style={{ fontSize: scale.subtitle }}>
            <span className="text-gray-500">📞</span>
            <span className="text-amber-400 font-medium"> Phone ahead for collection </span>
            <span className="text-gray-600 mx-2">•</span>
            <span className="text-gray-500">Fresh</span>
            <span className="text-gray-600 mx-1">•</span>
            <span className="text-gray-500">Homemade</span>
            <span className="text-gray-600 mx-1">•</span>
            <span className="text-gray-500">Delicious</span>
          </p>
        </div>
      </div>
      
      {/* CSS Animation keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  )
}

export default YoungsMenuWidget
