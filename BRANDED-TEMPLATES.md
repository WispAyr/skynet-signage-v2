# Branded Templates for Office Displays

Created: 2026-02-04

This document describes the branded video templates available for office signage displays, integrated with the Remotion rendering system.

## Overview

These templates are designed for common office display use cases:
- **Welcome/Intro** - Greet visitors and employees
- **Announcements** - Important messages and alerts
- **Stats/Metrics** - Live data visualization
- **Event Countdown** - Count down to important dates
- **Team Spotlight** - Employee recognition
- **Quote of the Day** - Inspirational/motivational content

## Available Templates

### Welcome Messages

| Composition ID | Description | Duration | Style |
|----------------|-------------|----------|-------|
| `WelcomeMessage` | Corporate welcome with time | 6s | Corporate |
| `WelcomeFriendly` | Warm welcome with particle effects | 6s | Friendly |
| `WelcomePremium` | Elegant premium display | 6s | Premium |
| `Portrait-WelcomeMessage` | Portrait for kiosks | 6s | Corporate |

**Props:**
```json
{
  "brand": "parkwise",
  "greeting": "Good Morning",  // or leave empty for auto-detect
  "companyName": "ParkWise",
  "subtitle": "Intelligent Parking Solutions",
  "showLogo": true,
  "showTime": true,
  "style": "corporate|friendly|premium",
  "theme": "dark|light"
}
```

### Announcements / Alerts

| Composition ID | Description | Duration | Level |
|----------------|-------------|----------|-------|
| `AlertBanner` | Standard alert banner | 5s | Any |
| `AlertBannerQuick` | Quick alert | 3s | Any |
| `Portrait-AlertBanner` | Portrait alerts | 5s | Any |

**Props:**
```json
{
  "message": "Important Announcement",
  "subtitle": "Additional details",
  "level": "info|success|warning|error|critical",
  "icon": "🔔"  // optional custom icon
}
```

**Alert Levels:**
- `info` - Blue, informational
- `success` - Green, positive news
- `warning` - Yellow, attention needed
- `error` - Red, problem occurred
- `critical` - Red with effects, urgent

### Statistics / Metrics

| Composition ID | Description | Duration |
|----------------|-------------|----------|
| `StatsDisplay` | 4-stat dashboard | 6s |
| `StatsDisplaySignage` | Extended display | 10s |
| `Portrait-StatsDisplay` | Portrait stats | 6s |

**Props:**
```json
{
  "title": "Live Statistics",
  "stats": [
    { "label": "Occupancy", "value": 75, "icon": "🚗", "color": "#00b398" },
    { "label": "Available", "value": 25, "icon": "✅", "color": "#22c55e" },
    { "label": "Today", "value": 156, "icon": "📊", "color": "#3b82f6" },
    { "label": "Revenue", "value": "£847", "icon": "💰", "color": "#eab308" }
  ],
  "showLogo": true,
  "theme": "dark|light"
}
```

### Event Countdown

| Composition ID | Description | Duration |
|----------------|-------------|----------|
| `EventCountdown` | Standard countdown | 6s |
| `EventCountdownLong` | Extended display | 10s |
| `Portrait-EventCountdown` | Portrait countdown | 6s |

**Props:**
```json
{
  "brand": "parkwise",
  "eventName": "Annual Conference",
  "targetDate": "2025-06-15",  // ISO date format
  "subtitle": "Counting down to",
  "showLogo": true,
  "theme": "dark|light"
}
```

### Team Spotlight

| Composition ID | Description | Duration | Style |
|----------------|-------------|----------|-------|
| `TeamSpotlight` | Modern employee recognition | 6s | Modern |
| `TeamSpotlightCelebration` | With confetti effects | 6s | Celebration |
| `TeamSpotlightMinimal` | Clean minimal display | 5s | Minimal |
| `Portrait-TeamSpotlight` | Portrait spotlight | 6s | Modern |

**Props:**
```json
{
  "brand": "parkwise",
  "name": "John Smith",
  "role": "Software Engineer",
  "department": "Engineering",
  "achievement": "Outstanding contribution to the project",
  "photoUrl": "https://...",  // optional, falls back to icon
  "showLogo": true,
  "style": "modern|celebration|minimal",
  "theme": "dark|light"
}
```

### Quote Display

| Composition ID | Description | Duration | Style |
|----------------|-------------|----------|-------|
| `QuoteDisplay` | Elegant serif quote | 8s | Elegant |
| `QuoteBold` | Bold impactful text | 8s | Bold |
| `QuoteMinimal` | Clean minimal display | 7s | Minimal |
| `QuoteTech` | Tech grid background | 8s | Tech |
| `Portrait-QuoteDisplay` | Portrait quote | 8s | Elegant |

**Props:**
```json
{
  "brand": "parkwise",
  "quote": "Innovation distinguishes between a leader and a follower.",
  "author": "Steve Jobs",
  "authorTitle": "Co-founder, Apple",
  "icon": "💡",  // optional header icon
  "showLogo": true,
  "style": "elegant|bold|minimal|tech",
  "theme": "dark|light"
}
```

## Branding

All templates support the following brands (defined in `remotion-server/src/brands.ts`):

| Brand ID | Name | Primary Color |
|----------|------|---------------|
| `parkwise` | ParkWise | #00b398 (Teal) |
| `localconnect` | Local Connect | #00D4B4 (Cyan) |
| `kylerise` | The Kyle Rise | #1B4D5C (Navy) |
| `skynet` | Skynet | #ef4444 (Red) |
| `generic` | Generic | #3b82f6 (Blue) |

## Presets

Quick-start presets are available in `server/remotion-integration.js`:

### Welcome Presets
- `welcome-corporate` - Professional corporate welcome
- `welcome-friendly` - Warm friendly welcome
- `welcome-premium` - Premium executive display
- `welcome-portrait` - Portrait kiosk welcome

### Announcement Presets
- `announcement-info` - Informational
- `announcement-success` - Good news
- `announcement-warning` - Attention needed
- `announcement-urgent` - Critical alert

### Stats Presets
- `stats-dashboard` - Four-stat dashboard
- `stats-occupancy` - Simple occupancy
- `stats-revenue` - Revenue metrics

### Countdown Presets
- `countdown-event` - General event countdown
- `countdown-launch` - Product launch
- `countdown-deadline` - Deadline timer

### Spotlight Presets
- `spotlight-employee` - Employee recognition
- `spotlight-celebration` - Achievement celebration
- `spotlight-minimal` - Clean display

### Quote Presets
- `quote-elegant` - Elegant serif style
- `quote-bold` - Bold impactful
- `quote-minimal` - Clean minimal
- `quote-tech` - Tech themed

## Usage

### Via API

```bash
# Render a welcome message
curl -X POST http://localhost:3500/api/render \
  -H 'Content-Type: application/json' \
  -d '{
    "compositionId": "WelcomeMessage",
    "props": {
      "brand": "parkwise",
      "greeting": "Welcome",
      "companyName": "ParkWise"
    },
    "category": "welcome"
  }'

# Using a preset via signage system
curl -X POST http://localhost:3400/api/remotion/preset \
  -H 'Content-Type: application/json' \
  -d '{
    "presetId": "welcome-corporate",
    "props": {
      "companyName": "Custom Name"
    }
  }'
```

### Via Admin UI

1. Go to Signage Admin → Video tab
2. Select composition from dropdown
3. Configure props
4. Click Render
5. Preview when complete
6. Push to screens

## File Locations

- **Compositions:** `/Users/noc/operations/remotion-server/src/compositions/`
  - `WelcomeMessage.tsx`
  - `EventCountdown.tsx`
  - `TeamSpotlight.tsx`
  - `QuoteDisplay.tsx`

- **Brands:** `/Users/noc/operations/remotion-server/src/brands.ts`
- **Logos:** `/Users/noc/operations/remotion-server/public/logos/`
- **Presets:** `/Users/noc/operations/skynet-signage/server/remotion-integration.js`

## Test Renders

Successfully rendered on 2026-02-04:
- ✅ `WelcomeMessage` - `/Volumes/Parkwise/Skynet/video/welcome/WelcomeMessage-1770213525413.mp4`
- ✅ `QuoteDisplay` - `/Volumes/Parkwise/Skynet/video/quotes/QuoteDisplay-1770213560757.mp4`

## Adding New Templates

1. Create composition in `/Users/noc/operations/remotion-server/src/compositions/`
2. Import and register in `/Users/noc/operations/remotion-server/src/Root.tsx`
3. Add to compositions list in `/Users/noc/operations/remotion-server/server/index.js`
4. Add presets in `/Users/noc/operations/skynet-signage/server/remotion-integration.js`
5. Rebuild: `cd /Users/noc/operations/remotion-server && npm run build`
6. Restart: `pm2 restart remotion-server`
