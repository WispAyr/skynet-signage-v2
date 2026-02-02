# Skynet Signage - Branded Display Templates

**Created:** 2025-02-02
**Designer:** Wonda 🎨
**Status:** Ready for deployment

---

## Overview

Five branded display templates for office screens, designed following ParkWise/Local Connect brand guidelines with LCARS-influenced dark theme aesthetics.

## Templates

### 1. Welcome/Branding Screen (`welcome.html`)
- **Purpose:** Branded welcome display with company logos
- **Features:**
  - ParkWise & Local Connect dual branding
  - Animated gradient background
  - LCARS-style corner decorations
  - Real-time clock in status bar
  - Company taglines
- **Best for:** Reception areas, entrance displays

### 2. Operations Dashboard (`dashboard.html`)
- **Purpose:** Live operational statistics and monitoring
- **Features:**
  - Key stats cards (revenue, sessions, entries, duration)
  - Real-time occupancy bars with traffic light colors
  - Recent events feed with entry/exit/alert badges
  - System status indicators
  - LCARS-style header
- **Best for:** Office monitors, operations room

### 3. Activity Feed (`activity-feed.html`)
- **Purpose:** Timeline of task completions and team activity
- **Features:**
  - Visual timeline with color-coded events
  - Agent avatars and task attribution
  - Team member activity sidebar
  - Daily stats summary
  - LCARS-style vertical sidebar
- **Best for:** Team spaces, development areas

### 4. Ambient Display (`ambient.html`)
- **Purpose:** Clock, date, and weather information
- **Features:**
  - Large, beautiful time display with gradient text
  - Full date with day of week
  - Weather widget with conditions, temperature, wind, humidity
  - Floating particle animations
  - Minimal, calming design
- **Best for:** Break rooms, hallways, ambient displays

### 5. Team Activity Timeline (`team-activity.html`)
- **Purpose:** Live HQ task completions and agent activity feed
- **Features:**
  - Real-time task completion timeline from HQ API
  - Agent avatars/emojis with role attribution
  - Monday.com sync status indicator
  - Team status sidebar (active/idle agents)
  - Auto-scrolling timeline
  - Tasks completed today counter
  - 30-second auto-refresh
- **Data Sources:**
  - HQ API: `localhost:3800/api/tasks`
  - Agents API: `localhost:3800/api/agents`
- **Best for:** Office displays, team areas, development rooms

### 6. Alert Templates (`alert.html`)
- **Purpose:** Urgent notifications and system alerts
- **URL Parameters:**
  - `level`: info | warning | error | success
  - `title`: Alert headline
  - `message`: Detailed message
  - `location`: Site/location reference
  - `priority`: LOW | MEDIUM | HIGH | CRITICAL
- **Features:**
  - Four alert levels with distinct colors
  - Animated warning stripes for critical alerts
  - Pulsing background effects
  - Sound wave indicator
- **Best for:** Emergency notifications, system alerts

---

## Usage

### Direct URL Access
```
http://localhost:3400/templates/welcome.html
http://localhost:3400/templates/dashboard.html
http://localhost:3400/templates/activity-feed.html
http://localhost:3400/templates/ambient.html
http://localhost:3400/templates/alert.html?level=error&title=System%20Alert&message=Server%20offline
```

### Push to Displays via API
```bash
# Push welcome screen to all displays
curl -X POST http://localhost:3400/api/push \
  -H 'Content-Type: application/json' \
  -d '{"target":"all","type":"url","content":{"url":"/templates/welcome.html"}}'

# Push dashboard to office group
curl -X POST http://localhost:3400/api/push \
  -H 'Content-Type: application/json' \
  -d '{"target":"office","type":"url","content":{"url":"/templates/dashboard.html"}}'

# Push alert with parameters
curl -X POST http://localhost:3400/api/push \
  -H 'Content-Type: application/json' \
  -d '{"target":"all","type":"url","content":{"url":"/templates/alert.html?level=warning&title=Maintenance&message=Scheduled%20downtime%20at%2018:00"}}'
```

---

## Branding Specifications

### Colors Used
```css
/* ParkWise */
--pw-green: #22C55E;
--pw-blue: #0077B6;
--pw-navy: #1E3A5F;
--pw-orange: #F97316;

/* Local Connect */
--lc-teal: #4ECDC4;
--lc-cyan: #48CAE4;
--lc-green: #7DD87D;

/* Dark Theme */
--bg-dark: #0a0f1a;
--bg-panel: #111827;
```

### Typography
- **Primary Font:** Inter (Google Fonts)
- **Monospace:** JetBrains Mono (for data/time displays)

### Design Principles
- Dark theme for reduced eye strain and screen burn-in
- LCARS-influenced elements (curved corners, decorative bars)
- Glanceable information hierarchy
- Consistent branding across all templates
- Responsive to different screen sizes

---

## Customization

### Updating Weather Location
In `ambient.html`, modify the weather location:
```javascript
// Line ~200
document.querySelector('.weather-location').textContent = 'Your City, Country';
```

### Connecting to Live Data
Templates use placeholder data. To connect to live APIs:

1. **Dashboard occupancy:** Fetch from `/api/sites/{siteId}/occupancy`
2. **Activity feed:** Connect to HQ task API or WebSocket
3. **Weather:** Integrate Open-Meteo or similar weather API

---

## File Structure
```
templates/
├── README.md           # This documentation
├── welcome.html        # Welcome/branding screen
├── dashboard.html      # Operations dashboard
├── activity-feed.html  # Static timeline/activity feed (demo)
├── team-activity.html  # LIVE HQ activity feed (fetches from API)
├── ambient.html        # Clock/date/weather
└── alert.html          # Alert templates (parameterized)
```

---

*Templates designed by Wonda for ParkWise / Local Connect office displays.*
