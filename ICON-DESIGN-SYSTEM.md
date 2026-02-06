# Unified Icon Design System
## Parking & Wayfinding Icons Across All Brands

**Created:** 2026-02-04  
**Designer:** Wonda (AI Designer Agent)  
**Version:** 1.0

---

## Overview

This document defines the unified icon system for parking and wayfinding signage across all ParkWise Tech Group brands. Icons are designed to be:
- **Instantly recognizable** at any distance
- **Brand-flexible** with consistent structure
- **Accessible** with high contrast and clear shapes
- **Scalable** from 24px UI to 4000px signage

---

## Brand Color Mapping

| Brand | Primary | Secondary | Accent | Icon Default |
|-------|---------|-----------|--------|--------------|
| **ParkWise** | `#00b398` | `#00d4aa` | `#00ffcc` | White on Primary |
| **Local Connect** | `#00D4B4` | `#2563EB` | `#00FFD4` | White on Primary |
| **The Kyle Rise** | `#1B4D5C` | `#F5A623` | `#E86830` | Gold on Navy |
| **Skynet** | `#ef4444` | `#f87171` | `#fca5a5` | White on Red |
| **Generic** | `#3b82f6` | `#60a5fa` | `#93c5fd` | White on Blue |

### Icon Color Rules

```tsx
// Icon color tokens
const iconColors = {
  // For dark backgrounds
  onDark: {
    primary: '#FFFFFF',        // Main icons
    secondary: 'rgba(255,255,255,0.7)',  // Secondary icons
    disabled: 'rgba(255,255,255,0.3)',   // Inactive state
    accent: '{brand.accent}',  // Highlighted icons
  },
  
  // For light backgrounds  
  onLight: {
    primary: '#1a1a2e',        // Main icons
    secondary: 'rgba(26,26,46,0.7)',     // Secondary icons
    disabled: 'rgba(26,26,46,0.3)',      // Inactive state
    accent: '{brand.primary}', // Highlighted icons
  },
  
  // Status colors (universal)
  status: {
    available: '#22c55e',      // Green - spaces available
    limited: '#eab308',        // Yellow - filling up
    full: '#ef4444',           // Red - no spaces
    reserved: '#8b5cf6',       // Purple - reserved/VIP
    disabled: '#3b82f6',       // Blue - accessible
    ev: '#06b6d4',             // Cyan - EV charging
    info: '#6b7280',           // Gray - informational
  }
};
```

---

## Icon Categories

### 1. Parking Status Icons

| Icon | Name | Use Case | SVG Path |
|------|------|----------|----------|
| 🅿️ | `parking` | General parking indicator | `M6 4h5a4 4 0 0 1 0 8H8v6H6V4zm2 6h3a2 2 0 1 0 0-4H8v4z` |
| ✅ | `available` | Spaces available | `M9 12l2 2 4-4M22 12c0 5.5-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2s10 4.5 10 10z` |
| ⛔ | `full` | No spaces / Full | `M18.4 5.6l-12.8 12.8M22 12c0 5.5-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2s10 4.5 10 10z` |
| ⚠️ | `limited` | Limited spaces | `M12 9v4M12 17h.01M5.3 21h13.4c1.6 0 2.4-1.9 1.3-3L13.3 4c-.6-1-2-.1-2.6 0L4 18c-1.1 1.1-.3 3 1.3 3z` |
| 🔒 | `reserved` | Reserved spaces | `M19 11H5c-1.1 0-2 .9-2 2v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7c0-1.1-.9-2-2-2zm-7 5a2 2 0 100-4 2 2 0 000 4zM8 11V7a4 4 0 118 0v4` |

### 2. Wayfinding Icons

| Icon | Name | Use Case | SVG Path |
|------|------|----------|----------|
| ↑ | `straight` | Continue straight | `M12 19V5M5 12l7-7 7 7` |
| ↱ | `turn-right` | Turn right | `M18 10l-6-6-6 6M12 4v16` (rotate 90°) |
| ↰ | `turn-left` | Turn left | Mirror of turn-right |
| ↺ | `u-turn` | Make U-turn | `M4 10c0-4.4 3.6-8 8-8s8 3.6 8 8M4 10l4-4M4 10l4 4` |
| ⤴ | `ramp-up` | Ramp ascending | `M4 14l8-8 8 8` |
| ⤵ | `ramp-down` | Ramp descending | `M4 10l8 8 8-8` |
| 🚶 | `pedestrian` | Pedestrian route | `M12 6a2 2 0 100-4 2 2 0 000 4zm-1 4l-3 8h2l1.5-5 2 2v5h2v-6l-2-2-.5-2 2-2v-2h-4v4z` |
| ♿ | `accessible` | Accessible route | Standard accessible symbol |
| 🚗 | `vehicle-entry` | Vehicle entrance | `M7 17m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M17 17m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M5 17H3V6l2-3h9l4 3h1c2 0 3 1 3 3v8h-2` |

### 3. Facility Icons

| Icon | Name | Use Case |
|------|------|----------|
| ⚡ | `ev-charging` | EV charging stations |
| 🏧 | `payment` | Payment machines |
| 🚻 | `toilets` | Restroom facilities |
| 🛗 | `elevator` | Lift/elevator access |
| 🚪 | `exit` | Exit route |
| 📞 | `help` | Help point / intercom |
| 📷 | `cctv` | CCTV monitored |
| 🎫 | `ticket` | Ticket validation |

### 4. Level Indicators

| Icon | Name | Use Case |
|------|------|----------|
| `L0` | `level-ground` | Ground floor |
| `L1` | `level-1` | First floor |
| `L-1` | `level-basement` | Basement level |
| `🔺` | `level-up` | Levels above |
| `🔻` | `level-down` | Levels below |

---

## Design Specifications

### Grid System

```
┌────────────────────────────────────┐
│  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  │
│  ·  ┌─────────────────────┐  ·  · │  ← 2px safe zone
│  ·  │                     │  ·  · │
│  ·  │   ICON CONTENT      │  ·  · │  ← 20px content area
│  ·  │   AREA              │  ·  · │    (on 24px grid)
│  ·  │                     │  ·  · │
│  ·  └─────────────────────┘  ·  · │
│  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  ·  │
└────────────────────────────────────┘
         24px × 24px base
```

- **Base grid:** 24×24px
- **Safe zone:** 2px padding
- **Content area:** 20×20px
- **Stroke width:** 2px (scales proportionally)
- **Corner radius:** 2px (where applicable)

### Scale Multipliers

| Context | Base Size | Scale | Stroke |
|---------|-----------|-------|--------|
| UI (web/app) | 24px | 1× | 2px |
| Tablet | 32px | 1.33× | 2.5px |
| Kiosk display | 48px | 2× | 3px |
| Indoor signage | 96px | 4× | 6px |
| Large signage | 192px | 8× | 12px |
| Billboard | 384px+ | 16×+ | 24px+ |

### Stroke Rules

```tsx
const strokeStyle = {
  lineCap: 'round',
  lineJoin: 'round',
  strokeWidth: 2,  // At 24px base
  fill: 'none',    // Outline style default
};
```

---

## Brand-Specific Icon Styling

### ParkWise Icons

```tsx
// ParkWise: Clean, modern, tech-forward
const parkwiseStyle = {
  strokeColor: '#00b398',
  fillColor: 'none',
  glowColor: 'rgba(0, 179, 152, 0.3)',
  animation: 'subtle-pulse',
  style: 'outlined',
  cornerRadius: 'rounded',
};
```

### The Kyle Rise Icons

```tsx
// Kyle Rise: Premium, warm, welcoming
const kyleRiseStyle = {
  strokeColor: '#F5A623',  // Gold stroke
  fillColor: '#1B4D5C',    // Navy fill
  style: 'filled-outlined',
  cornerRadius: 'soft',
  shadow: '0 2px 8px rgba(0,0,0,0.3)',
};
```

### Local Connect Icons

```tsx
// Local Connect: Friendly, accessible, community
const localConnectStyle = {
  strokeColor: '#00D4B4',
  fillColor: 'none',
  gradient: 'linear-gradient(135deg, #00D4B4, #2563EB)',
  style: 'outlined',
  cornerRadius: 'rounded',
};
```

### Skynet Icons (Internal)

```tsx
// Skynet: Technical, precise, operational
const skynetStyle = {
  strokeColor: '#ef4444',
  fillColor: 'none',
  style: 'outlined',
  cornerRadius: 'sharp',
  terminalStyle: true,  // Monospace, grid-aligned
};
```

---

## SVG Icon Templates

### Base Template

```svg
<svg 
  xmlns="http://www.w3.org/2000/svg" 
  viewBox="0 0 24 24" 
  fill="none" 
  stroke="currentColor" 
  stroke-width="2" 
  stroke-linecap="round" 
  stroke-linejoin="round"
  class="parking-icon"
>
  <!-- Icon path here -->
</svg>
```

### React Component Template

```tsx
// components/icons/ParkingIcon.tsx
import React from 'react';
import { getBrand } from '@/brands';

interface IconProps {
  name: string;
  brand?: string;
  size?: number;
  color?: string;
  className?: string;
}

export const ParkingIcon: React.FC<IconProps> = ({
  name,
  brand = 'parkwise',
  size = 24,
  color,
  className,
}) => {
  const brandConfig = getBrand(brand);
  const iconColor = color || brandConfig.colors.primary;
  
  const icons: Record<string, string> = {
    parking: 'M6 4h5a4 4 0 0 1 0 8H8v6H6V4zm2 6h3a2 2 0 1 0 0-4H8v4z',
    available: 'M9 12l2 2 4-4M22 12c0 5.5-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2s10 4.5 10 10z',
    full: 'M18.4 5.6l-12.8 12.8M22 12c0 5.5-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2s10 4.5 10 10z',
    // ... more icons
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={iconColor}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d={icons[name]} />
    </svg>
  );
};
```

---

## Animated Icon Variants

### Availability Pulse

```css
@keyframes availability-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}

.icon-available {
  animation: availability-pulse 2s ease-in-out infinite;
}
```

### Direction Arrow Bounce

```css
@keyframes arrow-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}

.icon-direction {
  animation: arrow-bounce 1s ease-in-out infinite;
}
```

### Loading/Processing Spin

```css
@keyframes icon-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.icon-loading {
  animation: icon-spin 1s linear infinite;
}
```

---

## Implementation Checklist

### Phase 1: Core Icon Set (Priority)
- [ ] Parking symbol (P)
- [ ] Available indicator
- [ ] Full indicator  
- [ ] Directional arrows (4 directions)
- [ ] Entry/Exit symbols
- [ ] Level indicators (L1, L2, etc.)

### Phase 2: Extended Set
- [ ] EV charging
- [ ] Accessible parking
- [ ] Payment machine
- [ ] Help point
- [ ] CCTV indicator
- [ ] Pedestrian routes

### Phase 3: Brand Variants
- [ ] ParkWise icon pack
- [ ] Kyle Rise icon pack
- [ ] Local Connect icon pack
- [ ] Skynet (internal) icon pack

### Phase 4: Animation & Polish
- [ ] Animated variants
- [ ] Loading states
- [ ] Transition effects
- [ ] High-contrast versions

---

## File Structure

```
/public/icons/
├── parking/
│   ├── parking.svg
│   ├── available.svg
│   ├── full.svg
│   ├── limited.svg
│   └── reserved.svg
├── wayfinding/
│   ├── arrow-up.svg
│   ├── arrow-down.svg
│   ├── arrow-left.svg
│   ├── arrow-right.svg
│   ├── u-turn.svg
│   └── pedestrian.svg
├── facilities/
│   ├── ev-charging.svg
│   ├── accessible.svg
│   ├── payment.svg
│   ├── elevator.svg
│   └── toilets.svg
└── brands/
    ├── parkwise/
    ├── kylerise/
    ├── localconnect/
    └── skynet/
```

---

## Accessibility Guidelines

1. **Minimum size:** Icons should not appear smaller than 24px in UI contexts
2. **Touch targets:** Interactive icons need 44px minimum touch area
3. **Color contrast:** 4.5:1 minimum against background
4. **Text labels:** Always pair icons with text for screen readers
5. **Alt text:** Provide meaningful descriptions

```tsx
// Accessible icon usage
<button aria-label="Available parking spaces">
  <ParkingIcon name="available" aria-hidden="true" />
  <span className="sr-only">Available</span>
</button>
```

---

## Usage Examples

### Signage Display

```tsx
<div className="parking-sign">
  <ParkingIcon name="parking" brand="parkwise" size={96} />
  <span className="level">Level 2</span>
  <ParkingIcon name="arrow-right" size={64} />
</div>
```

### Status Dashboard

```tsx
<div className="status-row">
  <ParkingIcon 
    name={spaces > 10 ? 'available' : spaces > 0 ? 'limited' : 'full'} 
    color={iconColors.status[getStatus(spaces)]}
    size={32}
  />
  <span>{spaces} spaces</span>
</div>
```

---

*Part of the Skynet Signage Design System*
*ParkWise Tech Group © 2026*
