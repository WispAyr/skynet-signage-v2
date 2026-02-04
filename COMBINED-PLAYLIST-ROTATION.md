# Combined Playlist Rotation: Operations & Team Activity

A ready-to-deploy playlist configuration that rotates between the Operations Dashboard and Team Activity widgets for office signage displays.

## Overview

This playlist creates an engaging office display that cycles between:
- **Operations Dashboard** - Real-time parking site monitoring, ANPR events, enforcement queue
- **Team Activity Timeline** - HQ task completions, agent activity, Monday.com sync status

Perfect for reception areas, NOC displays, or team visibility screens.

---

## Quick Deploy

### Create the Playlist

```bash
curl -X POST http://localhost:3400/api/playlists \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "HQ Operations Loop",
    "description": "Combined operations dashboard and team activity rotation",
    "items": [
      {
        "contentType": "widget",
        "widget": "operations-dashboard",
        "name": "Operations Dashboard",
        "duration": 60,
        "config": {
          "posApiUrl": "http://localhost:3000",
          "siteIds": ["kyle-rise", "KCS01"],
          "refreshInterval": 30000,
          "eventLimit": 8,
          "showEnforcement": true,
          "showHealth": true,
          "title": "ParkWise Operations",
          "alertSound": {
            "enabled": true,
            "threshold": 3,
            "soundType": "chime",
            "volume": 0.4
          }
        }
      },
      {
        "contentType": "widget",
        "widget": "team-activity",
        "name": "Team Activity",
        "duration": 45,
        "config": {
          "hqApiUrl": "http://localhost:3800",
          "refreshInterval": 30000,
          "maxItems": 15,
          "showMondayStatus": true,
          "autoScroll": true,
          "autoScrollInterval": 5000,
          "title": "Team Activity"
        }
      }
    ],
    "loop": true,
    "transition": "fade"
  }'
```

### Push to All Screens

```bash
# After creating, push to all connected displays
curl -X POST http://localhost:3400/api/playlists/{PLAYLIST_ID}/push \
  -H 'Content-Type: application/json' \
  -d '{"target": "all"}'
```

---

## Playlist Variations

### Standard Office (60/45 rotation)
Default configuration above - balanced viewing time for both widgets.

### Operations-Heavy (90/30 rotation)
For control rooms where ops visibility is priority:

```json
{
  "items": [
    { "contentType": "widget", "widget": "operations-dashboard", "duration": 90 },
    { "contentType": "widget", "widget": "team-activity", "duration": 30 }
  ]
}
```

### Team-Focused (30/60 rotation)
For team spaces where activity matters most:

```json
{
  "items": [
    { "contentType": "widget", "widget": "operations-dashboard", "duration": 30 },
    { "contentType": "widget", "widget": "team-activity", "duration": 60 }
  ]
}
```

### Extended Loop with Clock
Add ambient clock between rotations:

```json
{
  "name": "HQ Extended Loop",
  "items": [
    { "contentType": "widget", "widget": "operations-dashboard", "duration": 60 },
    { "contentType": "widget", "widget": "clock", "duration": 15 },
    { "contentType": "widget", "widget": "team-activity", "duration": 45 },
    { "contentType": "widget", "widget": "weather", "duration": 15, "config": { "location": "Ayr" } }
  ],
  "loop": true,
  "transition": "fade"
}
```

---

## Scheduling

### Mon-Fri Business Hours

```bash
curl -X POST http://localhost:3400/api/schedules \
  -H 'Content-Type: application/json' \
  -d '{
    "playlistId": "{PLAYLIST_ID}",
    "screenTarget": "office",
    "startTime": "09:00",
    "endTime": "18:00",
    "days": [1, 2, 3, 4, 5],
    "priority": 10
  }'
```

### 24/7 NOC Display

```bash
curl -X POST http://localhost:3400/api/schedules \
  -H 'Content-Type: application/json' \
  -d '{
    "playlistId": "{PLAYLIST_ID}",
    "screenTarget": "noc-display",
    "startTime": "00:00",
    "endTime": "23:59",
    "days": [0, 1, 2, 3, 4, 5, 6],
    "priority": 20
  }'
```

---

## Configuration Reference

### Operations Dashboard Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `posApiUrl` | string | `http://localhost:3000` | POS API base URL |
| `siteIds` | string[] | `["kyle-rise", "KCS01"]` | Sites to monitor |
| `refreshInterval` | number | `30000` | Refresh rate (ms) |
| `eventLimit` | number | `8` | Recent events shown |
| `showEnforcement` | boolean | `true` | Show enforcement queue |
| `showHealth` | boolean | `true` | Show system health |
| `title` | string | `"Operations Dashboard"` | Display title |
| `alertSound.enabled` | boolean | `true` | Enable audio alerts |
| `alertSound.threshold` | number | `3` | Queue count trigger |
| `alertSound.soundType` | string | `"chime"` | Alert sound type |
| `alertSound.volume` | number | `0.5` | Volume (0-1) |

### Team Activity Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `hqApiUrl` | string | `http://localhost:3800` | HQ API base URL |
| `refreshInterval` | number | `30000` | Refresh rate (ms) |
| `maxItems` | number | `15` | Max tasks displayed |
| `showMondayStatus` | boolean | `true` | Show Monday.com sync |
| `autoScroll` | boolean | `true` | Enable auto-scroll |
| `autoScrollInterval` | number | `5000` | Scroll speed (ms) |
| `title` | string | `"Team Activity"` | Display title |
| `compact` | boolean | `false` | Hide descriptions |

---

## Display Layout Preview

### Operations Dashboard (60s)
```
┌────────────────────────────────────────────────────────────────────────┐
│  PARKWISE OPERATIONS                                    ⏱ 14:30:45    │
├────────────────────────────┬────────────────────────────┬──────────────┤
│  KYLE RISE                 │  KYLE SURFACE              │  ENFORCEMENT │
│  🚗 127 vehicles           │  🚗 45 vehicles            │  🛡 3 pending │
│  ↑ 89  ↓ 34               │  ↑ 32  ↓ 18               │              │
│  ━━━━━━━━━━━━━━           │  ━━━━━━━━━━━━━━           │  👁 View Queue│
├────────────────────────────┴────────────────────────────┴──────────────┤
│  RECENT ANPR EVENTS                                                    │
│  14:29  AB12 CDE  Kyle Rise Front   ENTRY   Match: Season Ticket      │
│  14:28  XY99 ZZZ  Kyle Surface      EXIT    Duration: 2h 15m          │
│  14:25  PW23 HQ1  Kyle Rise Ramp    ENTRY   Match: Staff              │
└────────────────────────────────────────────────────────────────────────┘
```

### Team Activity (45s)
```
┌─────────────────────────────────────────────────────────────────────────┐
│ TEAM ACTIVITY              Monday.com ● Synced       14:45 │ Sun 2 Feb │
├────────────────────────────────────────────┬────────────────────────────┤
│ Recent Completions                   12 today│ Completed Today          │
│                                              │     12                   │
│ 14:45  ● Task Completed [Done]               │ Active Agents            │
│          Signage templates design...         │     8                    │
│          🎨 Wonda • Designer        2m ago  ├────────────────────────────┤
│                                              │ Team Status              │
│ 14:20  ● Deployment [Live]                   │ ⚡ Friday     ●          │
│          Skynet Dashboard v2.3.1...          │ 🎨 Wonda      ●          │
│          ⚡ Friday • Lead Dev       25m ago  │ 🎯 Jarvis     ●          │
└──────────────────────────────────────────────┴────────────────────────────┘
```

---

## Transition Effects

| Effect | Description | Best For |
|--------|-------------|----------|
| `fade` | Smooth opacity fade (default) | Professional settings |
| `slide` | Horizontal slide left | Dynamic feel |
| `none` | Instant switch | Fast transitions |

---

## Troubleshooting

### Widgets not loading data

1. Check API connectivity:
   ```bash
   curl http://localhost:3000/api/operations/dashboard  # POS
   curl http://localhost:3800/api/tasks                  # HQ
   ```

2. Verify signage service is running:
   ```bash
   pm2 status skynet-signage
   ```

### Playlist not advancing

- Ensure `loop: true` is set
- Check browser console for errors
- Verify WebSocket connection to signage server

### Audio alerts not playing

- Check `alertSound.enabled: true`
- Verify browser audio permissions
- Test with `soundType: "alert"` (louder)

---

## Related Documentation

- [Playlists System](./PLAYLISTS.md)
- [Operations Dashboard Widget](./OPERATIONS-DASHBOARD-WIDGET.md)
- [Team Activity Widget](./TEAM-ACTIVITY-WIDGET.md)
- [Control Room Presets](./CONTROL-ROOM-PRESETS.md)

---

## Version History

| Date | Change |
|------|--------|
| 2025-02-04 | Initial combined playlist specification |

---

*Created by 📚 Wong • Tech Writer • HQ Mission Control*
