import { useState, useEffect } from 'react'
import { Coffee, UtensilsCrossed, Soup, Cookie } from 'lucide-react'

interface YoungsMenuConfig {
  section?: 'all' | 'hot-meals' | 'chips' | 'drinks' | 'sandwiches' | 'baked-potato'
  rotateInterval?: number
  theme?: 'dark' | 'chalk'
}

const MENU_DATA = {
  hotMeals: {
    title: 'Hot Meals',
    icon: '🍛',
    items: [
      { name: 'Chicken Curry + Chips', price: 5.80 },
      { name: 'Chicken Curry + Rice', price: 5.80 },
      { name: 'Chicken Curry, Rice + Chips', price: 6.30 },
      { name: 'Pie + Chips', price: 4.80 },
      { name: 'Pie, Chips + Beans', price: 5.30 },
      { name: 'Steak Pie + Chips', price: 5.30 },
      { name: 'Steak Pie, Chips + Beans', price: 5.30 },
      { name: 'Links + Chips', price: 4.80 },
      { name: 'Links, Chips + Beans', price: 4.80 },
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
      { name: 'Add Buttered Roll', price: 0.50 },
    ]
  },
  chips: {
    title: 'Chips',
    icon: '🍟',
    items: [
      { name: 'Chips', price: 3.00, large: 4.00 },
      { name: 'Salt + Chilli Chips', price: 3.50, large: 4.50 },
      { name: 'Salt + Pepper Chips', price: 3.50, large: 4.50 },
      { name: 'Cajun Chips', price: 3.50, large: 4.50 },
      { name: 'Chips + Cheese', price: 4.00, large: 5.00 },
      { name: 'Chips + Curry Sauce', price: 4.00, large: 5.00 },
      { name: 'Chips, Cheese + Curry Sauce', price: 4.50, large: 5.50 },
      { name: 'Chips + Coleslaw', price: 4.00, large: 5.00 },
      { name: 'Chips, Cheese + Coleslaw', price: 4.50, large: 5.50 },
    ]
  },
  bakedPotato: {
    title: 'Baked Potato',
    icon: '🥔',
    subtitle: 'Comes with side salad',
    items: [
      { name: 'Plain', price: 3.70 },
      { name: 'Cheese', price: 4.80 },
      { name: 'Beans', price: 4.80 },
      { name: 'Cheese & Beans', price: 5.30 },
      { name: 'Cheese Savoury', price: 4.80 },
      { name: 'Coleslaw', price: 4.80 },
      { name: 'Cheese & Coleslaw', price: 5.30 },
      { name: 'Egg Mayo', price: 4.80 },
      { name: 'Chicken (Various)', price: 5.30 },
      { name: 'Tuna (Various)', price: 5.30 },
      { name: 'Chicken Curry', price: 6.30 },
      { name: 'Cheese & Bacon', price: 5.80 },
    ]
  },
  sandwiches: {
    title: 'Rolls & Sandwiches',
    icon: '🥪',
    items: [
      { name: 'Ayrshire Ham', price: 2.60, withSalad: 3.20 },
      { name: 'Corned Beef', price: 2.60, withSalad: 3.20 },
      { name: 'Chopped Pork', price: 2.60, withSalad: 3.20 },
      { name: 'Chicken (Various)', price: 3.00, withSalad: 3.60 },
      { name: 'Tuna (Various)', price: 3.00, withSalad: 3.60 },
      { name: 'Egg Mayo', price: 2.20, withSalad: 2.80 },
      { name: 'Cheese', price: 2.20, withSalad: 2.80 },
      { name: 'Cheese Savoury', price: 2.20, withSalad: 2.80 },
    ]
  },
  baguettes: {
    title: 'Baguettes',
    icon: '🥖',
    items: [
      { name: 'Ayrshire Ham', price: 2.90, withSalad: 3.50 },
      { name: 'Corned Beef', price: 2.90, withSalad: 3.50 },
      { name: 'Chopped Pork', price: 2.90, withSalad: 3.50 },
      { name: 'Chicken (Various)', price: 3.20, withSalad: 3.80 },
      { name: 'Tuna (Various)', price: 3.20, withSalad: 3.80 },
      { name: 'Egg Mayo', price: 2.40, withSalad: 3.00 },
      { name: 'Cheese', price: 2.40, withSalad: 3.00 },
      { name: 'Cheese Savoury', price: 2.40, withSalad: 3.00 },
    ]
  },
  toasties: {
    title: 'Toasties & Paninis',
    icon: '🧀',
    subtitle: 'Comes with side salad',
    items: [
      { name: '1 Filling', price: 3.60 },
    ]
  },
  wraps: {
    title: 'Wraps',
    icon: '🌯',
    items: [
      { name: 'Plain (1 Filling)', price: 3.30 },
      { name: 'Toasted (1 Filling)', price: 3.70 },
    ]
  },
  pastaSalad: {
    title: 'Pasta & Salad Boxes',
    icon: '🥗',
    items: [
      { name: 'Salad Box with Filling', price: 5.50 },
      { name: 'Egg Salad', price: 4.50 },
      { name: 'Pasta Box with Filling', price: 5.50 },
      { name: 'Pasta Salad Box with Filling', price: 6.00 },
    ]
  },
  hotDrinks: {
    title: 'Hot Drinks',
    icon: '☕',
    items: [
      { name: 'Tea', price: 1.40 },
      { name: 'Coffee', price: 1.40 },
      { name: 'White Frothy Coffee', price: 1.90 },
      { name: 'Latte', price: 2.20 },
      { name: 'Cappuccino', price: 2.40 },
      { name: 'Mochaccino', price: 2.40 },
      { name: 'Espresso', price: 1.80 },
      { name: 'Double Espresso', price: 2.20 },
      { name: 'Hot Chocolate', price: 2.40 },
      { name: 'Add Shot (Caramel/Hazelnut/Vanilla)', price: 0.50 },
    ]
  },
}

const SECTIONS = [
  ['hotMeals', 'soup'],
  ['chips'],
  ['bakedPotato'],
  ['sandwiches', 'baguettes'],
  ['toasties', 'wraps', 'pastaSalad'],
  ['hotDrinks'],
]

function MenuSection({ data, showLarge, showSalad }: { data: any, showLarge?: boolean, showSalad?: boolean }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-amber-400 mb-3 flex items-center gap-2">
        <span>{data.icon}</span> {data.title}
      </h2>
      {data.subtitle && <p className="text-gray-400 text-sm mb-2 italic">{data.subtitle}</p>}
      <div className="space-y-1">
        {data.items.map((item: any, i: number) => (
          <div key={i} className="flex justify-between items-center text-lg">
            <span className="text-white">{item.name}</span>
            <span className="text-green-400 font-mono">
              £{item.price.toFixed(2)}
              {item.large && <span className="text-gray-500 ml-2">/ £{item.large.toFixed(2)}</span>}
              {item.withSalad && <span className="text-gray-500 ml-2">/ £{item.withSalad.toFixed(2)}</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function YoungsMenuWidget({ config }: { config: YoungsMenuConfig }) {
  const [currentSection, setCurrentSection] = useState(0)
  const rotateInterval = config.rotateInterval || 15000

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSection(s => (s + 1) % SECTIONS.length)
    }, rotateInterval)
    return () => clearInterval(interval)
  }, [rotateInterval])

  const sectionsToShow = SECTIONS[currentSection]

  return (
    <div className="w-full h-full bg-gray-900 text-white p-8 overflow-hidden">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Young's Food Emporium</h1>
        <p className="text-gray-400">📞 01292 652 043 • 📱 youngsfoodemporium</p>
      </div>

      {/* Menu Content */}
      <div className="grid grid-cols-2 gap-8 h-[calc(100%-150px)]">
        {sectionsToShow.map(sectionKey => (
          <MenuSection 
            key={sectionKey} 
            data={MENU_DATA[sectionKey as keyof typeof MENU_DATA]} 
          />
        ))}
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center">
        <div className="flex justify-center gap-2">
          {SECTIONS.map((_, i) => (
            <div 
              key={i} 
              className={`w-2 h-2 rounded-full transition ${i === currentSection ? 'bg-amber-400' : 'bg-gray-600'}`}
            />
          ))}
        </div>
        <p className="text-gray-500 text-sm mt-2">Why not phone your order for collection?</p>
      </div>
    </div>
  )
}

export default YoungsMenuWidget
