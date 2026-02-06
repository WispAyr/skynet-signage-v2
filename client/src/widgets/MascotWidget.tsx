import { useState, useEffect, useMemo } from 'react'
import { useContextMood, MoodVector } from '../hooks/useContextMood'

/**
 * Skynet Parking Buddy — Mood-reactive animated mascot
 * 
 * A friendly robot character that responds to the Context Engine mood vector.
 * Eyes, expression, accessories, and animation all driven by environmental signals.
 * 
 * Phase 1: SVG + CSS animations (upgradeable to Rive later)
 */

interface MascotConfig {
  locationId?: string
  size?: 'small' | 'medium' | 'large' | 'fullscreen'
  showSpeechBubble?: boolean
  characterName?: string
  style?: 'robot' | 'friendly'  // future: different character styles
  brandColor?: string
  weather?: { condition: string; temp: number }
  overlay?: boolean  // transparent background for layering on templates
}

// Speech bubble messages driven by mood + context
function getSpeechBubble(mood: MoodVector, weather?: { condition: string; temp: number }): string {
  // Security override
  if (mood.urgency > 0.6) return "⚠️ Stay alert — I'm monitoring!"
  if (mood.urgency > 0.3) return "🛡️ Keeping watch..."

  // Weather reactions
  if (weather) {
    const c = weather.condition.toLowerCase()
    if (c.includes('snow')) return `❄️ ${weather.temp}°C — Brrr! Watch for ice!`
    if (c.includes('rain') || c.includes('drizzle')) return `🌧️ ${weather.temp}°C — Stay dry out there!`
    if (c.includes('thunder')) return "⛈️ Storm warning — park safely!"
    if (weather.temp < 2) return `🥶 ${weather.temp}°C — Wrap up warm!`
    if (weather.temp > 25) return `☀️ ${weather.temp}°C — Stay cool!`
    if (c.includes('sun') || c.includes('clear')) return `☀️ ${weather.temp}°C — Beautiful day!`
  }

  // Time/mood based
  const h = new Date().getHours()
  if (h < 6) return "🔦 All quiet on the night watch"
  if (h < 9 && mood.energy > 0.5) return "☀️ Good morning! Have a great day!"
  if (h < 12) return "🅿️ Plenty of spaces — park easy!"
  if (h < 14) return "🍽️ Lunchtime! Your car's safe with me"
  if (h < 17) return "👋 Afternoon! Need any help?"
  if (h < 20) return "🌆 Good evening! Drive safely"
  if (h < 22) return "🌙 Evening watch — all systems normal"
  return "😴 Night mode — I'm still watching!"
}

// Character state derived from mood
interface CharacterState {
  eyeSize: number        // 0.5-1.5 scale
  eyeOpenness: number    // 0-1 (0=closed, 1=wide)
  pupilX: number         // -1 to 1 (looking direction)
  pupilY: number         // -1 to 1
  mouthCurve: number     // -1 (sad) to 1 (smile)
  mouthOpen: number      // 0-1
  bodyBob: number        // animation speed (seconds)
  bodyTilt: number       // degrees
  blushOpacity: number   // 0-1
  glowColor: string
  glowIntensity: number
  accessory: 'none' | 'umbrella' | 'scarf' | 'sunglasses' | 'torch' | 'shield' | 'headphones'
  antennaWiggle: number  // animation speed
}

function getCharacterState(mood: MoodVector, weather?: { condition: string; temp: number }): CharacterState {
  const h = new Date().getHours()
  const isNight = h < 6 || h >= 22
  const isSleepy = isNight && mood.energy < 0.3
  
  let accessory: CharacterState['accessory'] = 'none'
  if (weather) {
    const c = weather.condition.toLowerCase()
    if (c.includes('rain') || c.includes('drizzle')) accessory = 'umbrella'
    else if (weather.temp < 5) accessory = 'scarf'
    else if (c.includes('sun') && weather.temp > 18) accessory = 'sunglasses'
  }
  if (mood.urgency > 0.5) accessory = 'shield'
  if (isNight && mood.urgency < 0.3) accessory = 'torch'
  if (mood.tempo > 0.7) accessory = 'headphones'

  const warmHue = 30 + mood.warmth * 20
  
  return {
    eyeSize: 0.8 + mood.energy * 0.4,
    eyeOpenness: isSleepy ? 0.2 : 0.5 + mood.energy * 0.5,
    pupilX: Math.sin(Date.now() / 3000) * 0.3,
    pupilY: mood.urgency > 0.3 ? -0.3 : 0,
    mouthCurve: mood.urgency > 0.5 ? -0.3 : 0.2 + mood.energy * 0.6,
    mouthOpen: mood.tempo > 0.6 ? 0.5 : 0.1,
    bodyBob: 2 + (1 - mood.tempo) * 4,
    bodyTilt: isSleepy ? 8 : 0,
    blushOpacity: mood.warmth > 0.6 ? 0.3 : 0,
    glowColor: `hsl(${warmHue}, 70%, 50%)`,
    glowIntensity: 0.1 + mood.energy * 0.2,
    accessory,
    antennaWiggle: 1 + (1 - mood.energy) * 3,
  }
}

export function MascotWidget({ config }: { config: MascotConfig }) {
  const mood = useContextMood(config.locationId)
  const [weather, setWeather] = useState(config.weather || null)
  const [tick, setTick] = useState(0)
  
  const brandColor = config.brandColor || '#FF9900'
  const sizeClass = config.size || 'medium'
  const showBubble = config.showSpeechBubble !== false

  // Fetch weather if not provided
  useEffect(() => {
    if (config.weather) return
    const fetchWeather = async () => {
      try {
        const res = await fetch('https://wttr.in/Ayr?format=j1')
        const json = await res.json()
        const c = json.current_condition?.[0]
        if (c) setWeather({ condition: c.weatherDesc?.[0]?.value || '', temp: parseInt(c.temp_C) })
      } catch {}
    }
    fetchWeather()
    const iv = setInterval(fetchWeather, 600000)
    return () => clearInterval(iv)
  }, [config.weather])

  // Animation tick for eye movement
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 100)
    return () => clearInterval(iv)
  }, [])

  const state = useMemo(() => getCharacterState(mood, weather || undefined), [mood, weather, tick])
  const bubble = useMemo(() => getSpeechBubble(mood, weather || undefined), [mood, weather])

  const sizes = {
    small: { w: 200, h: 280 },
    medium: { w: 300, h: 420 },
    large: { w: 400, h: 560 },
    fullscreen: { w: 500, h: 700 },
  }
  const { w, h } = sizes[sizeClass]

  // Blink every few seconds
  const blinkPhase = Math.floor(tick / 30) % 20
  const isBlinking = blinkPhase === 0
  const eyeOpen = isBlinking ? 0.05 : state.eyeOpenness

  return (
    <div 
      className={`flex flex-col items-center justify-center ${config.overlay ? '' : 'h-full'}`}
      style={{ background: config.overlay ? 'transparent' : 'var(--mood-bg, #0a0a0f)' }}
    >
      {/* Speech bubble */}
      {showBubble && (
        <div 
          className="relative mb-4 px-6 py-3 rounded-2xl max-w-sm text-center transition-all duration-1000"
          style={{
            background: `${brandColor}20`,
            border: `1px solid ${brandColor}40`,
            color: '#e0e0e0',
            fontSize: sizeClass === 'small' ? '12px' : '16px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {bubble}
          {/* Triangle pointer */}
          <div 
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45"
            style={{ background: `${brandColor}20`, borderRight: `1px solid ${brandColor}40`, borderBottom: `1px solid ${brandColor}40` }}
          />
        </div>
      )}

      {/* Character SVG */}
      <svg 
        width={w} height={h} viewBox="0 0 200 280" 
        className="transition-transform duration-1000"
        style={{ 
          transform: `rotate(${state.bodyTilt}deg)`,
          filter: `drop-shadow(0 0 ${20 + state.glowIntensity * 40}px ${state.glowColor})`,
        }}
      >
        {/* Ambient glow */}
        <defs>
          <radialGradient id="bodyGlow">
            <stop offset="0%" stopColor={brandColor} stopOpacity={state.glowIntensity} />
            <stop offset="100%" stopColor={brandColor} stopOpacity="0" />
          </radialGradient>
          <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3a3a5c" />
            <stop offset="100%" stopColor="#22223a" />
          </linearGradient>
          <linearGradient id="headGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4a4a6c" />
            <stop offset="100%" stopColor="#2a2a4a" />
          </linearGradient>
          <linearGradient id="visorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a1a2e" />
            <stop offset="100%" stopColor="#0a0a1a" />
          </linearGradient>
        </defs>

        {/* Background glow circle */}
        <circle cx="100" cy="140" r="90" fill="url(#bodyGlow)" />

        {/* Body bob animation */}
        <g style={{ 
          animation: `mascotBob ${state.bodyBob}s ease-in-out infinite`,
          transformOrigin: '100px 140px',
        }}>
          {/* Body */}
          <rect x="65" y="155" width="70" height="75" rx="20" fill="url(#bodyGrad)" stroke={brandColor} strokeWidth="1.5" strokeOpacity="0.3" />
          
          {/* Body accent stripe */}
          <rect x="90" y="160" width="20" height="30" rx="5" fill={brandColor} opacity="0.3" />
          
          {/* Arms */}
          <rect x="45" y="165" width="18" height="45" rx="9" fill="#2a2a4a" stroke={brandColor} strokeWidth="1" strokeOpacity="0.2">
            <animateTransform attributeName="transform" type="rotate" values="-5,54,165;5,54,165;-5,54,165" dur={`${state.bodyBob * 1.5}s`} repeatCount="indefinite" />
          </rect>
          <rect x="137" y="165" width="18" height="45" rx="9" fill="#2a2a4a" stroke={brandColor} strokeWidth="1" strokeOpacity="0.2">
            <animateTransform attributeName="transform" type="rotate" values="5,146,165;-5,146,165;5,146,165" dur={`${state.bodyBob * 1.5}s`} repeatCount="indefinite" />
          </rect>

          {/* Legs */}
          <rect x="75" y="225" width="18" height="30" rx="9" fill="#2a2a4a" />
          <rect x="107" y="225" width="18" height="30" rx="9" fill="#2a2a4a" />
          
          {/* Feet */}
          <ellipse cx="84" cy="258" rx="14" ry="6" fill="#22223a" />
          <ellipse cx="116" cy="258" rx="14" ry="6" fill="#22223a" />

          {/* Head */}
          <rect x="55" y="70" width="90" height="80" rx="25" fill="url(#headGrad)" stroke={brandColor} strokeWidth="1.5" strokeOpacity="0.3" />
          
          {/* Visor / face plate */}
          <rect x="65" y="85" width="70" height="45" rx="15" fill="url(#visorGrad)" stroke={brandColor} strokeWidth="1" strokeOpacity="0.4" />

          {/* Eyes */}
          <g className="transition-all duration-300">
            {/* Left eye */}
            <ellipse 
              cx="85" cy={105 + (1 - eyeOpen) * 5} 
              rx={8 * state.eyeSize} 
              ry={10 * eyeOpen * state.eyeSize} 
              fill="white" 
              opacity="0.95"
            />
            <circle 
              cx={85 + state.pupilX * 3} 
              cy={105 + state.pupilY * 2} 
              r={4 * state.eyeSize} 
              fill={mood.urgency > 0.5 ? '#ef4444' : brandColor}
            />
            <circle cx={87 + state.pupilX * 2} cy={103} r={1.5} fill="white" opacity="0.8" />
            
            {/* Right eye */}
            <ellipse 
              cx="115" cy={105 + (1 - eyeOpen) * 5} 
              rx={8 * state.eyeSize} 
              ry={10 * eyeOpen * state.eyeSize} 
              fill="white" 
              opacity="0.95"
            />
            <circle 
              cx={115 + state.pupilX * 3} 
              cy={105 + state.pupilY * 2} 
              r={4 * state.eyeSize} 
              fill={mood.urgency > 0.5 ? '#ef4444' : brandColor}
            />
            <circle cx={117 + state.pupilX * 2} cy={103} r={1.5} fill="white" opacity="0.8" />
          </g>

          {/* Blush */}
          <circle cx="72" cy="115" r="6" fill="#ff6b6b" opacity={state.blushOpacity} />
          <circle cx="128" cy="115" r="6" fill="#ff6b6b" opacity={state.blushOpacity} />

          {/* Mouth */}
          <path 
            d={state.mouthOpen > 0.3 
              ? `M 88,${122 - state.mouthCurve * 3} Q 100,${128 + state.mouthCurve * 8} 112,${122 - state.mouthCurve * 3} Q 100,${130 + state.mouthOpen * 5} 88,${122 - state.mouthCurve * 3}`
              : `M 88,${122 - state.mouthCurve * 3} Q 100,${122 + state.mouthCurve * 8} 112,${122 - state.mouthCurve * 3}`
            }
            fill={state.mouthOpen > 0.3 ? '#1a1a2e' : 'none'}
            stroke={brandColor} 
            strokeWidth="2" 
            strokeOpacity="0.6"
            strokeLinecap="round"
          />

          {/* Antenna */}
          <line x1="100" y1="70" x2="100" y2="52" stroke="#4a4a6c" strokeWidth="3" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate" values={`-3,100,70;3,100,70;-3,100,70`} dur={`${state.antennaWiggle}s`} repeatCount="indefinite" />
          </line>
          <circle cx="100" cy="48" r="5" fill={brandColor} opacity="0.8">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Accessories */}
          {state.accessory === 'umbrella' && (
            <g transform="translate(140, 60)">
              <line x1="0" y1="0" x2="0" y2="70" stroke="#666" strokeWidth="2" />
              <path d="M -25,-5 Q 0,-30 25,-5" fill={brandColor} opacity="0.6" stroke={brandColor} strokeWidth="1" />
            </g>
          )}
          {state.accessory === 'scarf' && (
            <g>
              <path d="M 70,145 Q 100,155 130,145 L 135,165 Q 100,175 65,165 Z" fill="#ef4444" opacity="0.7" />
              <rect x="125" y="150" width="12" height="30" rx="4" fill="#ef4444" opacity="0.6" transform="rotate(15, 131, 165)" />
            </g>
          )}
          {state.accessory === 'sunglasses' && (
            <g>
              <rect x="70" y="95" width="24" height="16" rx="4" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
              <rect x="106" y="95" width="24" height="16" rx="4" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
              <line x1="94" y1="103" x2="106" y2="103" stroke="#333" strokeWidth="1.5" />
            </g>
          )}
          {state.accessory === 'torch' && (
            <g transform="translate(38, 175) rotate(-30)">
              <rect x="-3" y="0" width="6" height="25" rx="2" fill="#666" />
              <circle cx="0" cy="-3" r="5" fill="#ffd700" opacity="0.8">
                <animate attributeName="opacity" values="0.6;1;0.6" dur="1.5s" repeatCount="indefinite" />
              </circle>
              <circle cx="0" cy="-3" r="12" fill="#ffd700" opacity="0.15">
                <animate attributeName="r" values="10;15;10" dur="2s" repeatCount="indefinite" />
              </circle>
            </g>
          )}
          {state.accessory === 'shield' && (
            <g transform="translate(42, 170)">
              <path d="M 0,-10 L 12,-5 L 12,10 Q 6,18 0,20 Q -6,18 -12,10 L -12,-5 Z" fill={brandColor} opacity="0.7" stroke={brandColor} strokeWidth="1" />
              <text x="0" y="8" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">!</text>
            </g>
          )}
          {state.accessory === 'headphones' && (
            <g>
              <path d="M 58,90 Q 58,60 100,55 Q 142,60 142,90" fill="none" stroke="#444" strokeWidth="5" strokeLinecap="round" />
              <rect x="48" y="85" width="14" height="20" rx="5" fill="#333" stroke={brandColor} strokeWidth="1" strokeOpacity="0.5" />
              <rect x="138" y="85" width="14" height="20" rx="5" fill="#333" stroke={brandColor} strokeWidth="1" strokeOpacity="0.5" />
            </g>
          )}
        </g>

        <style>{`
          @keyframes mascotBob {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-6px); }
          }
        `}</style>
      </svg>

      {/* Character name */}
      {config.characterName && (
        <div 
          className="mt-2 text-sm tracking-widest uppercase opacity-50"
          style={{ color: brandColor, fontFamily: 'Antonio, sans-serif' }}
        >
          {config.characterName}
        </div>
      )}
    </div>
  )
}
