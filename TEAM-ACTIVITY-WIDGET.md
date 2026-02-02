# Team Activity Timeline Widget

A dynamic signage widget showing HQ task completions and agent activity in real-time.

## Features

- **Live Task Feed**: Shows recent task completions from HQ Mission Control
- **Agent Activity**: Displays who completed what with avatars/emojis
- **Monday.com Status**: Shows sync status indicator
- **Auto-Scroll**: Timeline automatically scrolls through entries
- **Team Status Sidebar**: Shows active vs idle agents
- **Stats Display**: Tasks completed today, active agent count

## Data Sources

| Source | API | Purpose |
|--------|-----|---------|
| HQ Tasks | `localhost:3800/api/tasks` | Task completions, titles, assignees |
| HQ Agents | `localhost:3800/api/agents` | Agent status, current tasks |

## Usage

### React Widget (via Signage System)

Push to connected screens:

```bash
curl -X POST http://localhost:3400/api/push/widget \
  -H "Content-Type: application/json" \
  -d '{"target":"all","widget":"team-activity","config":{}}'
```

### Configuration Options

```typescript
interface TeamActivityConfig {
  hqApiUrl?: string          // Default: 'http://localhost:3800'
  refreshInterval?: number   // Default: 30000 (30 seconds)
  maxItems?: number          // Default: 15 tasks
  showMondayStatus?: boolean // Default: true
  autoScroll?: boolean       // Default: true
  autoScrollInterval?: number // Default: 5000ms
  title?: string             // Default: 'Team Activity'
  compact?: boolean          // Default: false (hide descriptions)
}
```

### Standalone HTML Template

Access directly at:
```
http://localhost:3400/templates/team-activity.html
```

## Display Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ TEAM ACTIVITY           Monday.com ● Synced      14:45 │ Sun 2 Feb │
├─────────────────────────────────────────┬───────────────────────┤
│ Recent Completions                   12 today │ Completed Today  │
│                                              │     12            │
│ 14:45  ● Task Completed [Done]               │ Active Agents     │
│          Signage templates design...         │     8             │
│          🎨 Wonda • Designer        2m ago  ├───────────────────┤
│                                              │ Team Status       │
│ 14:20  ● Deployment [Live]                   │ ⚡ Friday    ●    │
│          Skynet Dashboard v2.3.1...          │ 🎨 Wonda     ●    │
│          ⚡ Friday • Lead Dev       25m ago  │ 🎯 Jarvis    ●    │
│                                              │ 📚 Archie    ○    │
│ 13:55  ● Documentation Updated [Update]      │ 🔵 Blue      ○    │
│          API documentation refreshed...      │                   │
│          📚 Archie • Tech Docs      50m ago  │                   │
│                                              │ ParkWise • LC     │
└──────────────────────────────────────────────┴───────────────────┘
```

## Agent Emojis & Colors

| Agent | Emoji | Color | Role |
|-------|-------|-------|------|
| Friday | ⚡ | #F97316 | Lead Developer |
| Wonda | 🎨 | #EC4899 | Designer |
| Jarvis | 🎯 | #0EA5E9 | Project Lead |
| Archie | 📚 | #6366F1 | Tech Documentation |
| Atlas | 🅿️ | #22C55E | Parking Expert |
| Scout | 🔍 | #34D399 | Market Research |
| Blue | 🔵 | #3B82F6 | Monday.com |
| Cipher | 🔐 | #EF4444 | Security |
| Professor | 🎓 | #10B981 | Agent Trainer |
| Mentor | 🧭 | #F59E0B | HR & Talent |
| Pepper | 💼 | #8B5CF6 | Admin & Comms |
| Wong | 📚 | #6366F1 | Tech Writer |
| Loki | 📝 | #F472B6 | Content Writer |
| Quill | ✍️ | #A78BFA | Social Media |
| Vision | 👁️ | #60A5FA | SEO Analyst |
| Lexis | ⚖️ | #8B5CF6 | Legal Research |

## Files

| File | Description |
|------|-------------|
| `client/src/widgets/TeamActivityWidget.tsx` | React widget component |
| `client/public/templates/team-activity.html` | Standalone HTML template |
| `TEAM-ACTIVITY-WIDGET.md` | This documentation |

## Auto-Scroll Behavior

- Scrolls at 0.5px per 50ms (smooth)
- Pauses at bottom for 2 seconds before looping
- Pauses on mouse hover (HTML template)
- Continues indefinitely

## Integration with Playlists

Add to a signage playlist:

```json
{
  "name": "Office Display",
  "items": [
    { "type": "widget", "widget": "team-activity", "duration": 60 },
    { "type": "widget", "widget": "operations-dashboard", "duration": 60 },
    { "type": "url", "url": "/templates/welcome.html", "duration": 30 }
  ]
}
```

## Styling

- **Dark theme** with high contrast for office displays
- **LCARS-influenced** sidebar design
- **ParkWise green** (#22C55E) and **Local Connect teal** (#4ECDC4) accents
- **JetBrains Mono** for timestamps and counters
- **Inter** for body text
