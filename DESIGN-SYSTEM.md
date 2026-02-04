# Skynet Signage Design System

Responsive design utilities for signage displays across all screen sizes.

## Quick Start

```tsx
import { scale, colors, gradients, presets } from '@/utils/design-system'

function MyWidget() {
  return (
    <div style={{ padding: scale.pad, background: colors.bgDark }}>
      <h1 style={{ fontSize: scale.title, ...presets.shimmerText, background: gradients.goldText }}>
        Hello World
      </h1>
      <span style={{ ...presets.priceTag, fontSize: scale.item }}>
        £5.99
      </span>
    </div>
  )
}
```

## Scaling System

All sizes use `clamp(min, preferred, max)` for smooth scaling:

| Token | Min | Preferred | Max | Use Case |
|-------|-----|-----------|-----|----------|
| `scale.hero` | 32px | 4vw | 80px | Hero titles |
| `scale.title` | 28px | 3.5vw | 72px | Page titles |
| `scale.heading` | 20px | 2.5vw | 50px | Section headings |
| `scale.body` | 12px | 1.2vw | 24px | Body text |
| `scale.item` | 11px | 1.15vw | 22px | Menu/list items |
| `scale.small` | 10px | 1vw | 20px | Captions |
| `scale.tiny` | 8px | 0.8vw | 16px | Badges, labels |

### Spacing & Padding

| Token | Use |
|-------|-----|
| `scale.gap` / `scale.gapSmall` | Flex/grid gaps |
| `scale.pad` / `scale.padSmall` | Container padding |
| `scale.radius` | Border radius |

## Colors

```tsx
colors.gold        // #fbbf24 - Primary accent
colors.emerald     // #34d399 - Prices, positive
colors.textPrimary // rgba(255,255,255,0.95)
colors.bgGlass     // Translucent card background
```

## Presets

Ready-to-use style objects:

```tsx
// Glass card with blur effect
<div style={presets.glassCard}>...</div>

// Shimmering gradient text
<h1 style={{ ...presets.shimmerText, background: gradients.goldText }}>

// Price styling
<span style={presets.priceTag}>£9.99</span>

// Badge/tag
<span style={presets.badge}>Popular</span>
```

## Gradients

```tsx
gradients.goldText    // Shimmer gold for text
gradients.darkBg      // Dark background
gradients.glowAmber   // Ambient glow orb
```

## Effects

```tsx
effects.shadowCard    // Card shadow with inner highlight
effects.shadowGlow('#fbbf24')  // Colored glow
effects.noiseTexture  // Subtle noise overlay
effects.blur          // backdrop-filter blur
```

## Animations

Include keyframes in your component:

```tsx
<style>{keyframes}</style>
```

Available:
- `shimmer` - Flowing gradient animation
- `pulse-glow` - Pulsing glow effect
- `float` - Gentle floating motion
- `fade-in` - Entry animation

## Custom Responsive Values

```tsx
import { responsive } from '@/utils/design-system'

// Create custom clamp value
const customSize = responsive(16, 2, 40)  // clamp(16px, 2vw, 40px)
```

## Best Practices

1. **Always use scale tokens** - Never hardcode pixel sizes
2. **Test on multiple screens** - Preview on tablet, TV, projector
3. **Use presets** - Combine with spread operator for consistency
4. **Add keyframes** - Include animation CSS when using animated effects
5. **Glass cards** - Use for content sections on dark backgrounds

---

*Part of Skynet Signage System*
