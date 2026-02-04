import { useState, useEffect } from 'react'
import { scale, colors, gradients, effects } from '../utils/design-system'

interface KioskConfig {
  theme?: 'dark' | 'light'
}

interface OrderItem {
  name: string
  price: number
  quantity: number
  person: string
}

interface MenuItem {
  name: string
  price: number
  large?: number
  popular?: boolean
}

interface MenuCategory {
  title: string
  icon: string
  subtitle?: string
  items: MenuItem[]
}

const PEOPLE = ['Ewan', 'Megan', 'Guest']

const MENU_DATA: Record<string, MenuCategory> = {
  hotMeals: {
    title: 'Hot Meals',
    icon: '🍛',
    items: [
      { name: 'Chicken Curry + Chips', price: 5.80, popular: true },
      { name: 'Chicken Curry + Rice', price: 5.80 },
      { name: 'Chicken Curry, Rice + Chips', price: 6.30 },
      { name: 'Pie + Chips', price: 4.80 },
      { name: 'Pie, Chips + Beans', price: 5.30 },
      { name: 'Steak Pie + Chips', price: 5.30, popular: true },
      { name: 'Links + Chips', price: 4.80 },
      { name: 'Macaroni', price: 5.30 },
      { name: 'Macaroni + Chips', price: 5.30 },
    ]
  },
  bakedPotato: {
    title: 'Baked Potatoes',
    icon: '🥔',
    subtitle: 'With side salad',
    items: [
      { name: 'Plain Jacket', price: 3.70 },
      { name: 'Cheese', price: 4.80 },
      { name: 'Beans', price: 4.80 },
      { name: 'Cheese & Beans', price: 5.30, popular: true },
      { name: 'Coleslaw', price: 4.80 },
      { name: 'Cheese & Coleslaw', price: 5.30 },
      { name: 'Tuna Mayo', price: 5.30 },
      { name: 'Chicken Curry', price: 6.30 },
      { name: 'Cheese & Bacon', price: 5.80 },
    ]
  },
  chips: {
    title: 'Chips',
    icon: '🍟',
    items: [
      { name: 'Chips (Reg)', price: 3.00 },
      { name: 'Chips (Large)', price: 4.00 },
      { name: 'Salt + Chilli', price: 3.50, large: 4.50 },
      { name: 'Cajun Chips', price: 3.50, large: 4.50 },
      { name: 'Chips + Cheese', price: 4.00, large: 5.00 },
      { name: 'Loaded Chips', price: 4.50, large: 5.50, popular: true },
    ]
  },
  soup: {
    title: 'Soup',
    icon: '🍲',
    items: [
      { name: 'Soup (Regular)', price: 2.50 },
      { name: 'Soup (Large)', price: 2.90 },
      { name: 'Soup + Roll', price: 3.40, popular: true },
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
    ]
  },
}

const CATEGORIES = Object.keys(MENU_DATA)

export function YoungsKioskWidget({ config }: { config: KioskConfig }) {
  const [currentPerson, setCurrentPerson] = useState(PEOPLE[0])
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0])
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [showOrderPanel, setShowOrderPanel] = useState(true)
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const addToOrder = (item: MenuItem) => {
    const existing = orders.find(o => o.name === item.name && o.person === currentPerson)
    if (existing) {
      setOrders(orders.map(o => 
        o.name === item.name && o.person === currentPerson 
          ? { ...o, quantity: o.quantity + 1 }
          : o
      ))
    } else {
      setOrders([...orders, { name: item.name, price: item.price, quantity: 1, person: currentPerson }])
    }
    setJustAdded(item.name)
    setTimeout(() => setJustAdded(null), 500)
  }

  const removeFromOrder = (item: OrderItem) => {
    if (item.quantity > 1) {
      setOrders(orders.map(o => 
        o.name === item.name && o.person === item.person
          ? { ...o, quantity: o.quantity - 1 }
          : o
      ))
    } else {
      setOrders(orders.filter(o => !(o.name === item.name && o.person === item.person)))
    }
  }

  const clearOrders = () => setOrders([])

  const totalByPerson = (person: string) => 
    orders.filter(o => o.person === person).reduce((sum, o) => sum + o.price * o.quantity, 0)

  const grandTotal = orders.reduce((sum, o) => sum + o.price * o.quantity, 0)

  const category = MENU_DATA[activeCategory]

  return (
    <div 
      className="w-full h-full text-white overflow-hidden relative select-none"
      style={{ background: gradients.darkBg }}
    >
      {/* Background effects */}
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: effects.noiseTexture }} />
      
      <div className="relative z-10 h-full flex flex-col" style={{ padding: scale.pad }}>
        
        {/* Header */}
        <div 
          className="flex items-center justify-between"
          style={{ marginBottom: scale.gap }}
        >
          <div>
            <h1 
              className="font-bold"
              style={{ 
                fontSize: scale.heading,
                background: gradients.goldText,
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Young's Food Emporium
            </h1>
            <p className="text-gray-400" style={{ fontSize: scale.small }}>
              Tap items to add • {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          
          {/* Person Selector */}
          <div className="flex items-center" style={{ gap: scale.gapSmall }}>
            <span className="text-gray-400" style={{ fontSize: scale.small }}>Ordering as:</span>
            <div className="flex" style={{ gap: scale.gapTiny }}>
              {PEOPLE.map(person => (
                <button
                  key={person}
                  onClick={() => setCurrentPerson(person)}
                  className="transition-all"
                  style={{
                    padding: `${scale.gapSmall} ${scale.pad}`,
                    borderRadius: scale.radius,
                    fontSize: scale.body,
                    fontWeight: currentPerson === person ? 'bold' : 'normal',
                    background: currentPerson === person 
                      ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                      : 'rgba(255,255,255,0.1)',
                    color: currentPerson === person ? '#000' : '#fff',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {person}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex min-h-0" style={{ gap: scale.gap }}>
          
          {/* Left: Categories + Menu */}
          <div className="flex-1 flex flex-col min-h-0">
            
            {/* Category Tabs */}
            <div 
              className="flex flex-wrap"
              style={{ gap: scale.gapSmall, marginBottom: scale.gap }}
            >
              {CATEGORIES.map(cat => {
                const data = MENU_DATA[cat]
                const isActive = activeCategory === cat
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="transition-all"
                    style={{
                      padding: `${scale.gapSmall} ${scale.pad}`,
                      borderRadius: scale.radius,
                      fontSize: scale.body,
                      background: isActive 
                        ? 'rgba(251,191,36,0.2)'
                        : 'rgba(255,255,255,0.05)',
                      border: isActive 
                        ? '2px solid rgba(251,191,36,0.5)'
                        : '2px solid transparent',
                      color: isActive ? colors.gold : 'rgba(255,255,255,0.7)',
                      cursor: 'pointer',
                    }}
                  >
                    {data.icon} {data.title}
                  </button>
                )
              })}
            </div>

            {/* Menu Items Grid */}
            <div 
              className="flex-1 overflow-auto"
              style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))',
                gap: scale.gap,
                alignContent: 'start',
              }}
            >
              {category.items.map((item, i) => {
                const isAdded = justAdded === item.name
                const inOrder = orders.find(o => o.name === item.name && o.person === currentPerson)
                return (
                  <button
                    key={i}
                    onClick={() => addToOrder(item)}
                    className="text-left transition-all active:scale-95"
                    style={{
                      padding: scale.pad,
                      borderRadius: scale.radius,
                      background: isAdded 
                        ? 'rgba(52,211,153,0.3)'
                        : 'rgba(255,255,255,0.05)',
                      border: inOrder 
                        ? '2px solid rgba(52,211,153,0.5)'
                        : '2px solid rgba(255,255,255,0.1)',
                      cursor: 'pointer',
                      transform: isAdded ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center" style={{ gap: scale.gapSmall }}>
                          <span 
                            className="font-medium text-white"
                            style={{ fontSize: scale.body }}
                          >
                            {item.name}
                          </span>
                          {item.popular && (
                            <span 
                              className="text-orange-400"
                              style={{ fontSize: scale.tiny }}
                            >
                              🔥 Popular
                            </span>
                          )}
                        </div>
                        {inOrder && (
                          <span 
                            className="text-emerald-400"
                            style={{ fontSize: scale.small }}
                          >
                            ✓ {inOrder.quantity} in order
                          </span>
                        )}
                      </div>
                      <span 
                        className="font-bold tabular-nums"
                        style={{ 
                          fontSize: scale.large,
                          color: colors.emerald,
                        }}
                      >
                        £{item.price.toFixed(2)}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right: Order Panel */}
          {showOrderPanel && (
            <div 
              style={{
                width: 'clamp(280px, 25vw, 400px)',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: scale.radius,
                padding: scale.pad,
                display: 'flex',
                flexDirection: 'column',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <h2 
                className="font-bold text-amber-400 flex items-center justify-between"
                style={{ fontSize: scale.large, marginBottom: scale.gap }}
              >
                <span>📋 Order</span>
                {orders.length > 0 && (
                  <button
                    onClick={clearOrders}
                    className="text-red-400 hover:text-red-300"
                    style={{ fontSize: scale.small }}
                  >
                    Clear all
                  </button>
                )}
              </h2>

              {orders.length === 0 ? (
                <div 
                  className="flex-1 flex items-center justify-center text-gray-500"
                  style={{ fontSize: scale.body }}
                >
                  Tap menu items to add
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-auto" style={{ marginBottom: scale.gap }}>
                    {PEOPLE.filter(p => orders.some(o => o.person === p)).map(person => (
                      <div key={person} style={{ marginBottom: scale.gap }}>
                        <div 
                          className="flex justify-between items-center text-gray-400 border-b border-white/10"
                          style={{ fontSize: scale.small, paddingBottom: scale.gapSmall, marginBottom: scale.gapSmall }}
                        >
                          <span className="font-medium">{person}</span>
                          <span>£{totalByPerson(person).toFixed(2)}</span>
                        </div>
                        {orders.filter(o => o.person === person).map((item, i) => (
                          <div 
                            key={i}
                            className="flex items-center justify-between"
                            style={{ padding: `${scale.gapTiny} 0` }}
                          >
                            <div className="flex items-center" style={{ gap: scale.gapSmall }}>
                              <button
                                onClick={() => removeFromOrder(item)}
                                className="text-red-400 hover:text-red-300 active:scale-90"
                                style={{ 
                                  fontSize: scale.body,
                                  width: scale.iconSmall,
                                  height: scale.iconSmall,
                                  borderRadius: '50%',
                                  background: 'rgba(239,68,68,0.2)',
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                −
                              </button>
                              <span style={{ fontSize: scale.small }}>
                                {item.quantity}× {item.name}
                              </span>
                            </div>
                            <span 
                              className="tabular-nums text-emerald-400"
                              style={{ fontSize: scale.small }}
                            >
                              £{(item.price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* Total & Actions */}
                  <div 
                    className="border-t border-white/20"
                    style={{ paddingTop: scale.gap }}
                  >
                    <div 
                      className="flex justify-between items-center font-bold"
                      style={{ fontSize: scale.large, marginBottom: scale.gap }}
                    >
                      <span className="text-white">Total</span>
                      <span className="text-emerald-400">£{grandTotal.toFixed(2)}</span>
                    </div>
                    
                    <a
                      href="tel:01292652043"
                      className="block text-center font-bold transition-all active:scale-95"
                      style={{
                        padding: scale.pad,
                        borderRadius: scale.radius,
                        fontSize: scale.body,
                        background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                        color: 'white',
                        textDecoration: 'none',
                        boxShadow: '0 4px 20px rgba(34,197,94,0.4)',
                      }}
                    >
                      📞 Call to Order
                    </a>
                    
                    <p 
                      className="text-center text-gray-500"
                      style={{ fontSize: scale.tiny, marginTop: scale.gapSmall }}
                    >
                      01292 652 043
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default YoungsKioskWidget
