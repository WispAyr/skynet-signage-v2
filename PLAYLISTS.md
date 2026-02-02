# Playlist System for Skynet Signage

## Overview

The playlist system allows you to create, manage, and schedule content rotations for digital signage displays. Playlists can contain a mix of widgets, templates, videos, and custom URLs.

## Features

- **Playlist Management**: Create, edit, delete, and duplicate playlists
- **Content Types**: Support for widgets, templates, videos, and URLs
- **Scheduling**: Time-based scheduling with day-of-week support
- **Playback Controls**: Loop, transitions (fade/slide/none), per-item duration
- **Live Push**: Push playlists to screens instantly via WebSocket
- **Admin UI**: Full visual management in the admin panel

## API Endpoints

### Playlists

```bash
# List all playlists
GET /api/playlists

# Get single playlist
GET /api/playlists/:id

# Create playlist
POST /api/playlists
{
  "name": "My Playlist",
  "description": "Optional description",
  "items": [...],
  "loop": true,
  "transition": "fade"
}

# Update playlist
PUT /api/playlists/:id

# Delete playlist
DELETE /api/playlists/:id

# Push playlist to screens
POST /api/playlists/:id/push
{ "target": "all" | "office" | "screen-id" }
```

### Schedules

```bash
# List schedules
GET /api/schedules
GET /api/schedules?playlistId=xxx

# Create schedule
POST /api/schedules
{
  "playlistId": "playlist-xxx",
  "screenTarget": "all",
  "startTime": "09:00",
  "endTime": "18:00",
  "days": [1,2,3,4,5],  # 0=Sun, 6=Sat
  "priority": 10
}

# Update schedule
PUT /api/schedules/:id

# Delete schedule
DELETE /api/schedules/:id
```

### Content Library

```bash
# Available widgets
GET /api/content/widgets

# Available templates
GET /api/content/templates

# Available videos (scanned from /Volumes/Parkwise/Skynet/video/)
GET /api/content/videos
```

## Playlist Item Schema

```typescript
interface PlaylistItem {
  id: string                    // Auto-generated
  contentType: 'video' | 'template' | 'widget' | 'url'
  contentId?: string           // For video/template references
  url?: string                 // For URLs and templates
  widget?: string              // Widget name (clock, weather, etc.)
  config?: object              // Widget config or content options
  duration: number             // Seconds to display
  name: string                 // Display name
}
```

## Available Content Types

### Widgets
- `clock` - Digital clock display
- `weather` - Current weather conditions
- `camera` - Single camera feed
- `camera-grid` - Multi-camera grid view
- `occupancy` - Parking occupancy display
- `stats` - Statistics dashboard
- `operations-dashboard` - Full operations overview

### Templates
- `welcome` - Reception/entrance display
- `dashboard` - Operations dashboard
- `activity-feed` - Team activity feed
- `ambient` - Clock/weather ambient display
- `alert` - Alert/notification template

### Videos
Videos are automatically scanned from `/Volumes/Parkwise/Skynet/video/` and can include Remotion-rendered content.

## Example: Create an Office Playlist

```bash
curl -X POST http://localhost:3400/api/playlists \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Office Loop",
    "description": "Standard office display rotation",
    "items": [
      { "contentType": "widget", "widget": "clock", "name": "Clock", "duration": 30 },
      { "contentType": "widget", "widget": "weather", "name": "Weather", "config": { "location": "Ayr" }, "duration": 30 },
      { "contentType": "widget", "widget": "occupancy", "name": "Parking", "duration": 20 },
      { "contentType": "template", "name": "Welcome", "url": "/templates/welcome.html", "duration": 60 }
    ],
    "loop": true,
    "transition": "fade"
  }'
```

## Schedule: Run Mon-Fri 9am-6pm

```bash
curl -X POST http://localhost:3400/api/schedules \
  -H 'Content-Type: application/json' \
  -d '{
    "playlistId": "playlist-xxx",
    "screenTarget": "office",
    "startTime": "09:00",
    "endTime": "18:00",
    "days": [1,2,3,4,5],
    "priority": 10
  }'
```

## Admin UI

Access the playlist manager at `http://localhost:3400/admin` and click the **Playlists** tab.

Features:
- Create and edit playlists visually
- Drag content from the picker
- Adjust durations per item
- Preview playlist flow
- Push to screens with target selector
- Schedule playlists for automatic playback

## Client Playback

When a playlist is pushed to a screen:
1. Client receives `playlist` type content via WebSocket
2. PlaylistPlayer component takes over the display
3. Items play in sequence with configured transitions
4. Progress indicator shows at bottom
5. Alerts overlay and take priority over playlist
6. Loop continues until interrupted or cleared

## Files

- `server/playlist-routes.js` - API routes and schedule checker
- `client/src/widgets/PlaylistPlayer.tsx` - Enhanced playback component
- `client/src/components/PlaylistManager.tsx` - Admin UI for playlist management
