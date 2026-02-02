# SKYNET Signage

Next-Gen Reactive Display System - AI-controlled, content-generating, real-time responsive displays.

## Quick Start

```bash
# Install all dependencies
npm run setup

# Start development (server + client)
npm run dev

# Or start server only
npm run dev:server
```

## URLs

- **Admin Panel:** http://localhost:3400
- **API:** http://localhost:3400/api
- **Display Mode:** http://localhost:3400?screen=YOUR_SCREEN_ID

## API Endpoints

### Screens
- `GET /api/screens` - List all screens
- `GET /api/screens/:id` - Get single screen
- `POST /api/screens` - Register/update screen
- `DELETE /api/screens/:id` - Remove screen

### Push Content
- `POST /api/push` - Push content to screen(s)
  ```json
  {
    "target": "all|<group>|<screenId>",
    "type": "url|widget|alert|media|clear",
    "content": { ... },
    "duration": 10000
  }
  ```

- `POST /api/push/url` - Push URL
  ```json
  { "target": "all", "url": "https://example.com" }
  ```

- `POST /api/push/alert` - Push alert banner
  ```json
  { "target": "all", "message": "Hello!", "level": "info", "duration": 10000 }
  ```

- `POST /api/push/widget` - Push widget
  ```json
  { "target": "all", "widget": "camera", "config": { "src": "camera-name" } }
  ```

- `POST /api/push/clear` - Clear screen content
  ```json
  { "target": "all" }
  ```

## Display Mode

Open any browser with `?screen=<id>` to register as a display:

```
http://localhost:3400?screen=office-main
http://localhost:3400?screen=kiosk-1&name=Kyle%20Rise%20Kiosk
```

The display will:
1. Auto-register with the server
2. Connect via WebSocket
3. Listen for pushed content
4. Send heartbeats every 30 seconds

## Groups

Default groups:
- `default` - All screens
- `office` - Office displays
- `kiosk` - Field kiosks
- `viewport` - UniFi Viewports

## PM2 Setup

```bash
pm2 start server/index.js --name skynet-signage
pm2 save
```
