# Young's Food Emporium - Digital Menu Project

## Overview
Digital menu board and interactive kiosk for Young's Food Emporium, deployed on Skynet Signage.

## Widgets

### 1. Menu Board (`youngs-menu`)
Display-only premium menu for wall-mounted screens.

**Features:**
- Auto-rotating specials carousel
- Lunch-time detection (banner changes 11am-2pm)
- Live clock
- Glass-morphism cards
- Shimmer text animations
- Responsive scaling (works on any screen size)

**Push command:**
```bash
curl -X POST http://localhost:3400/api/push \
  -H 'Content-Type: application/json' \
  -d '{"target": "noc1", "type": "widget", "content": {"widget": "youngs-menu"}}'
```

### 2. Interactive Kiosk (`youngs-kiosk`)
Touch-enabled ordering interface for tablets/touchscreens.

**Features:**
- Tap to add items
- Multi-person ordering (Ewan/Megan/Guest)
- Order panel with per-person totals
- Category tabs
- Call to order button (tel: link)
- Touch-optimized (large targets, active states)

**Push command:**
```bash
curl -X POST http://localhost:3400/api/push \
  -H 'Content-Type: application/json' \
  -d '{"target": "office1", "type": "widget", "content": {"widget": "youngs-kiosk"}}'
```

## Data Source
- **Monday.com Board:** https://localcarparkmanagement.monday.com/boards/5091111990
- Currently: Static data in widget (copy of Monday board)
- Future: Live API sync

## Current Deployment
| Screen | Widget | Purpose |
|--------|--------|---------|
| noc1 | youngs-menu | Display demo |
| office1 | youngs-kiosk | Touch ordering |

## Files
```
client/src/widgets/
├── YoungsMenuWidget.tsx    # Display menu
└── YoungsKioskWidget.tsx   # Interactive kiosk

client/src/utils/
└── design-system.ts        # Shared scaling/styles
```

## Future Roadmap

### Phase 2: Shared Ordering
- [ ] WebSocket sync - multiple people add to same order
- [ ] "Lunch run" countdown/sign-up
- [ ] Order summary export

### Phase 3: Personalization
- [ ] LocalStorage favorites per person
- [ ] "Your usual" quick-reorder
- [ ] Order history

### Phase 4: Smart Features
- [ ] Live Monday.com sync (auto-update prices)
- [ ] Dietary filters (vegetarian, etc.)
- [ ] Time-based recommendations
- [ ] "Office favorites" leaderboard

### Phase 5: Integration
- [ ] QR code ordering from phone
- [ ] Print order summary
- [ ] Direct API to Young's (if available)

## Contact
- **Young's Food Emporium:** 01292 652 043
- **Instagram:** @youngsfoodemporium

---
*Project started: 2026-02-04*
*Last updated: 2026-02-04*
