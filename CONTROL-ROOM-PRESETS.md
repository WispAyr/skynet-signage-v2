# Control Room Preset Layouts

Pre-configured layouts combining the operations dashboard with camera feeds for control room displays, NOC screens, and office signage.

## Quick Start

```bash
# List all presets
curl http://localhost:3400/api/presets

# Push a preset to all screens
curl -X POST http://localhost:3400/api/push/preset \
  -H 'Content-Type: application/json' \
  -d '{"presetId":"noc-primary"}'

# Push to specific screen
curl -X POST http://localhost:3400/api/push/preset \
  -H 'Content-Type: application/json' \
  -d '{"target":"office-display","presetId":"noc-primary"}'
```

## Available Presets

### Control Room (Full Operations)

| Preset ID | Name | Description |
|-----------|------|-------------|
| `noc-primary` | NOC Primary | Dashboard (40%) + 4-camera grid (60%) - ideal for main NOC |
| `noc-security` | NOC Security | All 6 cameras with dashboard PIP overlay |
| `control-room-grid` | Control Room Grid | 3-column layout with dashboard spanning left |
| `control-room-all-sites` | All Sites | Multi-site dashboard with cameras from each site |

### Site-Specific

| Preset ID | Name | Description |
|-----------|------|-------------|
| `kyle-rise` | Kyle Rise Operations | Kyle Rise dashboard + all 4 Kyle Rise cameras |
| `kyle-surface` | Kyle Surface Operations | Kyle Surface dashboard + Kyle Surface cameras |

### Dashboard Only

| Preset ID | Name | Description |
|-----------|------|-------------|
| `dashboard-full` | Dashboard Full | Full-screen operations dashboard |
| `dashboard-compact` | Dashboard Compact | Minimal dashboard for sidebars |
| `dashboard-kyle-rise` | Dashboard - Kyle Rise | Kyle Rise site only |
| `dashboard-kyle-surface` | Dashboard - Kyle Surface | Kyle Surface site only |

### Cameras Only

| Preset ID | Name | Description |
|-----------|------|-------------|
| `cameras-2x2` | Main Cameras 2x2 | 4 main cameras in grid |
| `cameras-all` | All Cameras | All 6 cameras in 3x2 grid |
| `cameras-rotate` | Camera Carousel | Auto-rotating single camera |
| `cameras-kyle-rise` | Cameras - Kyle Rise | All Kyle Rise cameras |

### Office Displays

| Preset ID | Name | Description |
|-----------|------|-------------|
| `office-overview` | Office Overview | Dashboard + clock/weather sidebar |
| `lobby-display` | Lobby Display | Large occupancy numbers for public areas |

### Enforcement

| Preset ID | Name | Description |
|-----------|------|-------------|
| `enforcement` | Enforcement Station | ANPR focus with fast-refresh dashboard |

### Split View

| Preset ID | Name | Description |
|-----------|------|-------------|
| `split-dashboard-activity` | Dashboard + Activity | Ops dashboard with team activity feed |
| `split-cameras-clock` | Cameras + Info | Camera grid with clock/weather sidebar |

### Picture-in-Picture

| Preset ID | Name | Description |
|-----------|------|-------------|
| `pip-dashboard-camera` | Dashboard + Camera PIP | Full dashboard with camera corner overlay |
| `pip-cameras-dashboard` | Cameras + Dashboard PIP | Full cameras with dashboard corner overlay |

## API Reference

### List Presets

```bash
GET /api/presets
GET /api/presets?category=control-room
```

Response:
```json
{
  "success": true,
  "presets": [
    { "id": "noc-primary", "name": "NOC Primary", "description": "...", "category": "control-room" }
  ],
  "categories": ["control-room", "site-specific", "dashboard", "cameras", "office", "enforcement", "split", "pip"]
}
```

### Get Preset Details

```bash
GET /api/presets/:id
```

Response:
```json
{
  "success": true,
  "preset": {
    "id": "noc-primary",
    "name": "NOC Primary",
    "widget": "layout",
    "config": { ... }
  }
}
```

### Push Preset

```bash
POST /api/push/preset
```

Body:
```json
{
  "target": "all",          // "all", screen ID, or group ID
  "presetId": "noc-primary",
  "overrides": {            // Optional: override config values
    "refreshInterval": 15000
  }
}
```

## Configuration Overrides

You can override any config value when pushing:

```bash
curl -X POST http://localhost:3400/api/push/preset \
  -H 'Content-Type: application/json' \
  -d '{
    "presetId": "noc-primary",
    "overrides": {
      "panels.0.config.refreshInterval": 15000,
      "panels.0.config.title": "Custom Title"
    }
  }'
```

## Available Cameras

| Camera ID | Location |
|-----------|----------|
| `kyle-rise-front` | Kyle Rise - Front Entrance |
| `kyle-rise-rear` | Kyle Rise - Rear Exit |
| `kyle-rise-ramp` | Kyle Rise - Ramp |
| `kyle-rise-ptz` | Kyle Rise - PTZ Overview |
| `kyle-surface-anpr` | Kyle Surface - ANPR Entry |
| `kyle-surface-rear` | Kyle Surface - Rear |
| `greenford-overview` | Greenford - Overview |

## Available Sites

| Site ID | Name |
|---------|------|
| `KRS01` | Kyle Rise (multi-storey) |
| `KCS01` | Kyle Surface |
| `GRN01` | Greenford Business Centre |

## Recommended Use Cases

### Main Operations Room
Use `noc-primary` - provides the best balance of operational data and camera visibility.

### Security Monitoring
Use `noc-security` - maximizes camera coverage with quick stats overlay.

### Site-Specific Monitoring  
Use `kyle-rise` or `kyle-surface` for dedicated site screens.

### Public/Lobby Display
Use `lobby-display` - shows large, readable occupancy numbers.

### Enforcement Officers
Use `enforcement` - focuses on ANPR feeds with fast-refresh enforcement queue.

## Adding to Screen on Boot

Register a screen with a default preset:

```bash
curl -X POST http://localhost:3400/api/screens \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "noc-main",
    "name": "NOC Main Display",
    "group_id": "control-room",
    "config": {
      "defaultPreset": "noc-primary"
    }
  }'
```

## Creating Custom Presets

Add new presets to `/server/presets.js`:

```javascript
'my-custom-preset': {
  name: 'My Custom Layout',
  description: 'Description here',
  category: 'custom',
  widget: 'layout',
  config: {
    layout: 'dashboard-cameras',
    panels: [
      { widget: 'operations-dashboard', config: { ... } },
      { widget: 'camera-grid', config: { ... } }
    ]
  }
}
```

Then restart the signage server:
```bash
pm2 restart skynet-signage
```
