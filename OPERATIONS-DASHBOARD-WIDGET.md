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
    "title": "Operations Dashboard"
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
