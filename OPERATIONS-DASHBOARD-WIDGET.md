# Operations Dashboard Widget

A comprehensive operations dashboard widget for office signage displays. Shows real-time parking operations data from the POS API.

## Features

- **Multi-site Monitoring**: Track Kyle Rise and Kyle Surface (or any configured sites)
- **Occupancy Display**: Current vehicles on-site with entry/exit counts
- **Recent ANPR Events**: Live feed of the last 5-10 ANPR detections
- **Enforcement Queue**: Pending enforcement cases requiring review
- **System Health**: Camera status and system-wide health indicators
- **Auto-refresh**: Updates every 30 seconds by default

## Widget Configuration

```json
{
  "widget": "operations-dashboard",
  "config": {
    "posApiUrl": "http://localhost:3000",
    "siteIds": ["kyle-rise", "KCS01"],
    "refreshInterval": 30000,
    "eventLimit": 8,
    "showEnforcement": true,
    "showHealth": true,
    "title": "Operations Dashboard",
    "alertSound": {
      "enabled": true,
      "threshold": 3,
      "soundType": "chime",
      "volume": 0.5
    }
  }
}
```

### Config Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `posApiUrl` | string | `http://localhost:3000` | Base URL of the POS API |
| `siteIds` | string[] | `["kyle-rise", "KCS01"]` | Site IDs to monitor |
| `refreshInterval` | number | `30000` | Data refresh interval in milliseconds |
| `eventLimit` | number | `8` | Number of recent events to display |
| `showEnforcement` | boolean | `true` | Show enforcement queue section |
| `showHealth` | boolean | `true` | Show system health section |
| `title` | string | `"Operations Dashboard"` | Dashboard title |
| `alertSound` | object | See below | Alert sound configuration |

### Alert Sound Configuration

The `alertSound` config object controls audio alerts when the enforcement queue exceeds a threshold.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `true` | Enable/disable alert sounds |
| `threshold` | number | `3` | Queue count that triggers alerts |
| `soundType` | string | `"chime"` | Sound type: `chime`, `alert`, `urgent`, `bell`, `none`, `custom` |
| `customSoundUrl` | string | `""` | URL for custom sound file (when `soundType` is `custom`) |
| `volume` | number | `0.5` | Volume level (0.0 - 1.0) |
| `repeatInterval` | number | `60000` | Minimum ms between alerts (prevents spam) |
| `playOnIncrease` | boolean | `true` | Only play alert when queue count increases |

#### Sound Types

- **`chime`** - Pleasant two-tone chime (default, good for office environments)
- **`alert`** - Attention-grabbing three-tone ascending
- **`urgent`** - Urgent pulsing alert (for critical situations)
- **`bell`** - Bell-like notification sound
- **`none`** - No sound (visual indicators only)
- **`custom`** - Use your own sound file via `customSoundUrl`

#### Examples

**High-threshold urgent alerts:**
```json
{
  "alertSound": {
    "enabled": true,
    "threshold": 5,
    "soundType": "urgent",
    "volume": 0.7
  }
}
```

**Custom corporate sound:**
```json
{
  "alertSound": {
    "enabled": true,
    "threshold": 3,
    "soundType": "custom",
    "customSoundUrl": "https://example.com/sounds/alert.mp3",
    "volume": 0.6
  }
}
```

**Visual-only alerts (no sound):**
```json
{
  "alertSound": {
    "enabled": true,
    "threshold": 2,
    "soundType": "none"
  }
}
```

#### UI Controls

- A **mute button** appears in the header when alerts are enabled
- Click to toggle sound mute/unmute
- Shows current threshold setting (e.g., "Alert: 3+")
- Visual highlighting on the enforcement queue card when threshold is exceeded

## Push to Display

### Push via API

```bash
# Push to all connected screens
curl -X POST http://localhost:3400/api/push/widget \
  -H 'Content-Type: application/json' \
  -d '{
    "target": "all",
    "widget": "operations-dashboard",
    "config": {
      "siteIds": ["kyle-rise", "KCS01"],
      "refreshInterval": 30000,
      "eventLimit": 8
    }
  }'

# Push to specific screen
curl -X POST http://localhost:3400/api/push/widget \
  -H 'Content-Type: application/json' \
  -d '{
    "target": "office-display",
    "widget": "operations-dashboard",
    "config": {
      "title": "Parkwise Operations",
      "siteIds": ["kyle-rise", "KCS01"]
    }
  }'
```

### View Directly in Browser

Open in a browser for display mode:
```
http://localhost:3400/?screen=ops-dashboard
```

Then push the widget to it.

## Data Sources

The widget fetches data from these POS API endpoints:

- `GET /api/operations/dashboard` - Site stats, camera status, health
- `GET /api/operations/events` - Recent ANPR events
- `GET /enforcement/queue` - Pending enforcement cases

## Design

- **Dark theme** with high contrast for visibility
- **Large readable numbers** for at-a-glance monitoring
- **Color-coded status indicators**:
  - 🟢 Green: Healthy / Entry
  - 🟡 Yellow: Warning / Pending
  - 🔴 Red: Critical / Exit
- **Responsive grid layout** for different screen sizes
- **Real-time updates** without page reload

## Available Sites

From POS database:
- `kyle-rise` - Kyle Rise (multi-storey)
- `KCS01` - Kyle Centre Surface
- `GRN01` - Greenford Business Centre
- ...and others (see `/api/sites` for full list)

## Integration

The widget is registered in the signage system and can be used in:
- Standalone display mode
- Layout compositions
- Playlist rotations

Example layout composition:
```json
{
  "widget": "layout",
  "config": {
    "type": "split",
    "direction": "horizontal",
    "children": [
      {
        "widget": "operations-dashboard",
        "config": { "siteIds": ["kyle-rise", "KCS01"] }
      },
      {
        "widget": "camera-grid",
        "config": { "streams": ["kyle-rise-front", "kyle-rise-rear"] }
      }
    ]
  }
}
```
