/**
 * Skynet Signage Design System
 * 
 * Responsive scaling utilities for signage displays.
 * Uses CSS clamp() for smooth scaling across all screen sizes.
 * 
 * Usage:
 *   import { scale, colors, effects } from '@/utils/design-system'
 *   <h1 style={{ fontSize: scale.title }}>Hello</h1>
 */

// =============================================================================
// RESPONSIVE SCALING
// =============================================================================
// Format: clamp(min, preferred, max)
// - min: smallest size (mobile/tablet)
// - preferred: scales with viewport (vw)
// - max: largest size (big screens/projectors)

export const scale = {
  // Typography
  hero: 'clamp(32px, 4vw, 80px)',           // Main hero titles
  title: 'clamp(28px, 3.5vw, 72px)',        // Page/section titles
  heading: 'clamp(20px, 2.5vw, 50px)',      // Section headings
  subheading: 'clamp(16px, 1.8vw, 36px)',   // Subheadings
  large: 'clamp(14px, 1.5vw, 30px)',        // Large body text
  body: 'clamp(12px, 1.2vw, 24px)',         // Normal body text
  item: 'clamp(11px, 1.15vw, 22px)',        // List items, menu items
  small: 'clamp(10px, 1vw, 20px)',          // Small text, captions
  tiny: 'clamp(8px, 0.8vw, 16px)',          // Labels, badges
  micro: 'clamp(6px, 0.6vw, 12px)',         // Fine print

  // Icons & Emojis
  iconHero: 'clamp(40px, 4vw, 80px)',
  iconLarge: 'clamp(24px, 2.5vw, 50px)',
  iconMedium: 'clamp(18px, 1.8vw, 36px)',
  iconSmall: 'clamp(14px, 1.4vw, 28px)',

  // Spacing
  gapLarge: 'clamp(16px, 2vw, 40px)',
  gap: 'clamp(8px, 1vw, 20px)',
  gapSmall: 'clamp(4px, 0.5vw, 10px)',
  gapTiny: 'clamp(2px, 0.25vw, 5px)',

  // Padding
  padLarge: 'clamp(20px, 2.5vw, 50px)',
  pad: 'clamp(12px, 1.5vw, 28px)',
  padSmall: 'clamp(8px, 1vw, 18px)',
  padTiny: 'clamp(4px, 0.5vw, 10px)',

  // Border Radius
  radiusLarge: 'clamp(12px, 1.5vw, 30px)',
  radius: 'clamp(8px, 1vw, 20px)',
  radiusSmall: 'clamp(4px, 0.5vw, 10px)',
}

// =============================================================================
// COLOR PALETTE
// =============================================================================

export const colors = {
  // Backgrounds
  bgDark: '#0f172a',
  bgSlate: '#1e293b',
  bgCard: 'rgba(255,255,255,0.05)',
  bgCardHover: 'rgba(255,255,255,0.08)',
  bgGlass: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',

  // Accent Colors
  gold: '#fbbf24',
  goldLight: '#fcd34d',
  goldDark: '#d97706',
  amber: '#f59e0b',
  
  emerald: '#34d399',
  emeraldLight: '#6ee7b7',
  emeraldDark: '#059669',

  orange: '#fb923c',
  orangeDark: '#ea580c',

  purple: '#a78bfa',
  purpleDark: '#7c3aed',

  red: '#f87171',
  redDark: '#dc2626',

  // Text
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.5)',
  textDim: 'rgba(255,255,255,0.3)',

  // Borders
  borderLight: 'rgba(255,255,255,0.1)',
  borderMedium: 'rgba(255,255,255,0.2)',
  borderAccent: 'rgba(251,191,36,0.3)',
}

// =============================================================================
// GRADIENT PRESETS
// =============================================================================

export const gradients = {
  // Text gradients (use with background-clip: text)
  goldText: 'linear-gradient(135deg, #fef3c7 0%, #fcd34d 25%, #f59e0b 50%, #fcd34d 75%, #fef3c7 100%)',
  emeraldText: 'linear-gradient(135deg, #a7f3d0 0%, #34d399 50%, #059669 100%)',
  
  // Background gradients
  darkBg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 30%, #0f172a 70%, #1e1a2e 100%)',
  cardGlass: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
  
  // Glow orbs (for ambient backgrounds)
  glowAmber: 'radial-gradient(circle, rgba(251,191,36,0.4) 0%, transparent 70%)',
  glowEmerald: 'radial-gradient(circle, rgba(52,211,153,0.3) 0%, transparent 70%)',
  glowPurple: 'radial-gradient(ellipse, rgba(139,92,246,0.2) 0%, transparent 60%)',
  glowOrange: 'radial-gradient(circle, rgba(249,115,22,0.3) 0%, transparent 70%)',
}

// =============================================================================
// EFFECTS & ANIMATIONS
// =============================================================================

export const effects = {
  // Box shadows
  shadowCard: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
  shadowGlow: (color: string) => `0 0 30px ${color}`,
  shadowText: (color: string) => `0 2px 10px ${color}`,

  // Backdrop blur
  blur: 'blur(10px)',
  blurHeavy: 'blur(20px)',

  // Noise texture (SVG data URI)
  noiseTexture: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
}

// =============================================================================
// CSS ANIMATION KEYFRAMES
// =============================================================================

export const keyframes = `
  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }
  
  @keyframes pulse-glow {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50% { opacity: 0.5; transform: scale(1.05); }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`

// =============================================================================
// COMPONENT STYLE PRESETS
// =============================================================================

export const presets = {
  // Glass card style
  glassCard: {
    background: gradients.cardGlass,
    backdropFilter: effects.blur,
    borderRadius: scale.radius,
    padding: scale.pad,
    border: `1px solid ${colors.borderLight}`,
    boxShadow: effects.shadowCard,
  },

  // Shimmer text style (apply to element with background)
  shimmerText: {
    backgroundSize: '200% auto',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animation: 'shimmer 3s linear infinite',
  },

  // Price tag style
  priceTag: {
    color: colors.emerald,
    fontWeight: 'bold',
    fontVariantNumeric: 'tabular-nums',
    textShadow: effects.shadowText('rgba(52,211,153,0.3)'),
  },

  // Badge/tag style
  badge: {
    fontSize: scale.tiny,
    padding: `${scale.gapTiny} ${scale.padSmall}`,
    borderRadius: '9999px',
    background: 'rgba(251,191,36,0.2)',
    color: colors.goldLight,
    border: `1px solid ${colors.borderAccent}`,
  },
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a responsive size value
 */
export function responsive(min: number, vw: number, max: number): string {
  return `clamp(${min}px, ${vw}vw, ${max}px)`
}

/**
 * Apply styles object to inline style
 */
export function applyPreset(...presetStyles: object[]): React.CSSProperties {
  return Object.assign({}, ...presetStyles) as React.CSSProperties
}

export default {
  scale,
  colors,
  gradients,
  effects,
  keyframes,
  presets,
  responsive,
  applyPreset,
}
