# Signage + Remotion Integration

**Status:** ✅ Complete  
**Date:** 2026-02-04

## Overview

The Skynet Signage system now has full integration with the Remotion video rendering server, allowing admins to:

1. Select from 15+ Remotion compositions (landscape, portrait, square variants)
2. Configure dynamic props (text, colors, data)
3. Submit render jobs with real-time progress tracking
4. Auto-push rendered videos to connected screens
5. Browse and push previously rendered videos from library

## Architecture

```
┌─────────────────────┐     ┌──────────────────────┐
│  Signage Admin UI   │────▶│   Signage Server     │
│  (localhost:3400)   │     │   (:3400)            │
└─────────────────────┘     └──────────┬───────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
    ┌─────────────────┐    ┌─────────────────────┐    ┌────────────────┐
    │  Remotion API   │    │   Screen Displays   │    │   Video NAS    │
    │  (:3500)        │    │   (WebSocket)       │    │   Storage      │
    └─────────────────┘    └─────────────────────┘    └────────────────┘
```

## API Endpoints (Signage Server)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/remotion/compositions` | GET | List available compositions |
| `/api/remotion/presets` | GET | Get dimension presets |
| `/api/remotion/branding` | GET | Get branding quick-presets |
| `/api/remotion/render` | POST | Submit render job |
| `/api/remotion/jobs` | GET | List all tracked jobs |
| `/api/remotion/jobs/:id` | GET | Get job status |
| `/api/remotion/videos` | GET | List rendered videos |
| `/api/remotion/push` | POST | Push video to screens |
| `/api/remotion/render-and-push` | POST | One-call render + push |

## Available Compositions

### Landscape (1920x1080)
- ParkwiseIntro (4s) - Logo reveal
- ParkwiseIntroShort (2s) - Quick logo
- AlertBanner (5s) - Alert display
- StatsDisplay (6s) - Statistics
- FloatingCubes (10s) - 3D ambient
- TunnelFlight (6s) - 3D tunnel
- Logo3DSpin (5s) - 3D logo
- GlitchText (5s) - Glitch reveal

### Portrait (1080x1920)
- Portrait-ParkwiseIntro
- Portrait-AlertBanner
- Portrait-StatsDisplay
- Portrait-FloatingCubes
- Portrait-TunnelFlight

### Square (1080x1080)
- Square-ParkwiseIntro
- Square-FloatingCubes

## Quick Presets

Pre-configured render options:
- `intro-default` - Standard logo reveal
- `intro-short` - 2-second logo
- `intro-portrait` - Portrait kiosk intro
- `alert-landscape/portrait` - Alert banners
- `stats-landscape/portrait` - Statistics display
- `ambient-cubes/tunnel/logo-spin` - Background animations

## Usage Examples

### Render via API
```bash
# Using preset
curl -X POST http://localhost:3400/api/remotion/render \
  -H "Content-Type: application/json" \
  -d '{"preset": "intro-default", "pushOnComplete": true, "pushTarget": "all"}'

# Custom composition with props
curl -X POST http://localhost:3400/api/remotion/render \
  -H "Content-Type: application/json" \
  -d '{
    "compositionId": "AlertBanner",
    "props": {"message": "System Alert", "level": "warning"},
    "pushOnComplete": true,
    "pushTarget": "all"
  }'
```

### Push existing video
```bash
curl -X POST http://localhost:3400/api/remotion/push \
  -H "Content-Type: application/json" \
  -d '{"videoId": "abc-123", "target": "all"}'
```

## Admin UI

Access at `http://localhost:3400/admin` → **Video** tab

Features:
- **Render tab:** Select composition/preset, configure props, submit
- **Queue tab:** View active/completed render jobs with progress
- **Library tab:** Browse rendered videos, one-click push

## Files Modified

- `server/remotion-integration.js` - Core integration module
- `server/index.js` - API routes and push callback
- `client/src/components/RemotionManager.tsx` - Admin UI component (NEW)
- `client/src/App.tsx` - Tab integration
