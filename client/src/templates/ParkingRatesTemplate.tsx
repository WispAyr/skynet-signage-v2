import { useState, useEffect } from 'react'

/**
 * Parking Rates / Info Board Template
 * Dynamic pricing display like a menu board — JSON-configurable
 *
 * Data shape:
 * {
 *   siteName: string
 *   subtitle?: string
 *   rates: Array<{
 *     label: string       // "Up to 1 hour"
 *     price: string       // "£2.00"
 *     highlight?: boolean // visually emphasise
 *     note?: string       // "Best value"
 *   }>
 *   notices?: string[]    // ["Free after 6pm", "Disabled bays available"]
 *   paymentMethods?: string[]  // ["Card", "Cash", "App"]
 *   maxStay?: string      // "4 hours"
 *   brandColor?: string
 *   showClock?: boolean
 * }
 */

interface RateItem {
  label: string
  price: string
  highlight?: boolean
  note?: string
}

interface ParkingRatesData {
  siteName: string
  subtitle?: string
  rates: RateItem[]
  notices?: string[]
  paymentMethods?: string[]
  maxStay?: string
  brandColor?: string
  showClock?: boolean
}

export function ParkingRatesTemplate({ data }: { data: ParkingRatesData }) {
  const [time, setTime] = useState(new Date())
  const brandColor = data.brandColor || '#F97316'
  const showClock = data.showClock !== false

  useEffect(() => {
    if (!showClock) return
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [showClock])

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* Header with gradient */}
      <div
        className="flex-shrink-0 px-8 py-6"
        style={{
          background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}cc 100%)`,
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-4xl md:text-5xl font-bold text-white tracking-wider"
              style={{ fontFamily: 'Antonio, sans-serif' }}
            >
              {data.siteName}
            </h1>
            {data.subtitle && (
              <p className="text-lg text-white/80 mt-1 tracking-wide">{data.subtitle}</p>
            )}
          </div>
          {showClock && (
            <div className="text-right">
              <div className="text-3xl font-bold text-white tabular-nums" style={{ fontFamily: 'Antonio, sans-serif' }}>
                {time.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-sm text-white/60">
                {time.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rates */}
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        <div className="space-y-3 max-w-2xl mx-auto">
          {data.rates.map((rate, i) => (
            <div
              key={i}
              className={`flex items-center justify-between p-5 rounded-xl transition-all ${
                rate.highlight
                  ? 'border-2'
                  : 'border border-gray-800'
              }`}
              style={rate.highlight ? {
                background: `${brandColor}10`,
                borderColor: `${brandColor}60`,
              } : {
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-1.5 h-10 rounded-full"
                  style={{ background: rate.highlight ? brandColor : '#374151' }}
                />
                <div>
                  <div className="text-xl md:text-2xl font-semibold text-white" style={{ fontFamily: 'Antonio, sans-serif' }}>
                    {rate.label}
                  </div>
                  {rate.note && (
                    <div
                      className="text-xs mt-1 tracking-wider font-medium"
                      style={{ color: brandColor }}
                    >
                      {rate.note}
                    </div>
                  )}
                </div>
              </div>
              <div
                className="text-3xl md:text-4xl font-bold tabular-nums"
                style={{ fontFamily: 'Antonio, sans-serif', color: rate.highlight ? brandColor : '#ffffff' }}
              >
                {rate.price}
              </div>
            </div>
          ))}
        </div>

        {/* Max stay */}
        {data.maxStay && (
          <div className="text-center mt-6">
            <span className="text-sm text-gray-500 tracking-wider">MAXIMUM STAY: </span>
            <span className="text-sm font-bold text-white tracking-wider">{data.maxStay}</span>
          </div>
        )}
      </div>

      {/* Bottom bar: notices + payment methods */}
      <div className="flex-shrink-0 px-8 py-4 border-t border-gray-800 bg-black/40">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Notices */}
          <div className="flex flex-wrap gap-3">
            {data.notices?.map((notice, i) => (
              <span
                key={i}
                className="text-sm px-4 py-1.5 rounded-full border"
                style={{
                  color: `${brandColor}dd`,
                  borderColor: `${brandColor}40`,
                  background: `${brandColor}10`,
                }}
              >
                {notice}
              </span>
            ))}
          </div>

          {/* Payment methods */}
          {data.paymentMethods && data.paymentMethods.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 tracking-wider">PAYMENT:</span>
              {data.paymentMethods.map((method, i) => (
                <span key={i} className="text-xs px-3 py-1 bg-gray-800 text-gray-300 rounded-full">
                  {method}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
