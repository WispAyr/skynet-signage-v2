/**
 * Control Room Preset Layouts
 * 
 * Pre-configured layouts combining dashboard widgets with camera feeds
 * for control room and operations displays.
 * 
 * Usage:
 *   GET  /api/presets              - List all presets
 *   GET  /api/presets/:id          - Get preset details
 *   POST /api/push/preset          - Push preset to screen(s)
 *   
 * Example push:
 *   curl -X POST http://localhost:3400/api/push/preset \
 *     -H 'Content-Type: application/json' \
 *     -d '{"target":"all","presetId":"noc-primary"}'
 */

// Default configuration
const DEFAULT_GO2RTC_HOST = 'localhost:1984';
const DEFAULT_POS_API = 'http://localhost:3000';

// Available camera streams (from go2rtc)
const CAMERAS = {
  // Kyle Rise (multi-storey)
  KYLE_RISE_FRONT: 'kyle-rise-front',
  KYLE_RISE_REAR: 'kyle-rise-rear',
  KYLE_RISE_RAMP: 'kyle-rise-ramp',
  KYLE_RISE_PTZ: 'kyle-rise-ptz',
  
  // Kyle Surface
  KYLE_SURFACE_ANPR: 'kyle-surface-anpr',
  KYLE_SURFACE_REAR: 'kyle-surface-rear',
  
  // Greenford
  GREENFORD_OVERVIEW: 'greenford-overview',
};

// Site IDs (from POS backend)
const SITES = {
  KYLE_RISE: 'KRS01',
  KYLE_SURFACE: 'KCS01',
  GREENFORD: 'GRN01',
};

// Available preset layouts
export const PRESETS = {
  // ============================================================
  // CONTROL ROOM PRESETS - Full operational displays
  // ============================================================
  
  /**
   * NOC Primary - The main operations view
   * Dashboard on left (40%), 4 camera grid on right (60%)
   */
  'noc-primary': {
    name: 'NOC Primary',
    description: 'Full operations dashboard with 4-camera grid - ideal for main NOC display',
    category: 'control-room',
    widget: 'layout',
    config: {
      layout: 'dashboard-cameras',
      panels: [
        {
          widget: 'operations-dashboard',
          config: {
            posApiUrl: DEFAULT_POS_API,
            siteIds: [SITES.KYLE_RISE, SITES.KYLE_SURFACE],
            refreshInterval: 30000,
            eventLimit: 8,
            showEnforcement: true,
            showHealth: true,
            title: 'Parkwise Operations'
          }
        },
        {
          widget: 'camera-grid',
          config: {
            cameras: [
              CAMERAS.KYLE_RISE_FRONT,
              CAMERAS.KYLE_RISE_REAR,
              CAMERAS.KYLE_SURFACE_ANPR,
              CAMERAS.KYLE_SURFACE_REAR
            ],
            go2rtcHost: DEFAULT_GO2RTC_HOST,
            columns: 2,
            refreshInterval: 3000
          }
        }
      ]
    }
  },

  /**
   * NOC Security - All cameras with compact dashboard overlay
   * 6-camera grid with PIP dashboard
   */
  'noc-security': {
    name: 'NOC Security',
    description: 'Security-focused view - all cameras with dashboard overlay',
    category: 'control-room',
    widget: 'layout',
    config: {
      layout: 'pip',
      panels: [
        {
          widget: 'camera-grid',
          config: {
            cameras: [
              CAMERAS.KYLE_RISE_FRONT,
              CAMERAS.KYLE_RISE_REAR,
              CAMERAS.KYLE_RISE_RAMP,
              CAMERAS.KYLE_SURFACE_ANPR,
              CAMERAS.KYLE_SURFACE_REAR,
              CAMERAS.GREENFORD_OVERVIEW
            ],
            go2rtcHost: DEFAULT_GO2RTC_HOST,
            columns: 3,
            refreshInterval: 3000
          }
        },
        {
          widget: 'operations-dashboard',
          config: {
            posApiUrl: DEFAULT_POS_API,
            siteIds: [SITES.KYLE_RISE, SITES.KYLE_SURFACE],
            refreshInterval: 30000,
            eventLimit: 5,
            showEnforcement: true,
            showHealth: false,
            compact: true,
            title: 'Quick Stats'
          }
        }
      ]
    }
  },

  /**
   * Control Room Grid - 6-panel layout
   * Dashboard spans left column, cameras fill right 2x2 grid
   */
  'control-room-grid': {
    name: 'Control Room Grid',
    description: 'Dashboard with 4-camera grid in 3-column layout',
    category: 'control-room',
    widget: 'layout',
    config: {
      layout: 'control-room',
      panels: [
        {
          widget: 'operations-dashboard',
          config: {
            posApiUrl: DEFAULT_POS_API,
            siteIds: [SITES.KYLE_RISE, SITES.KYLE_SURFACE],
            refreshInterval: 30000,
            eventLimit: 8,
            showEnforcement: true,
            showHealth: true,
            title: 'Operations'
          }
        },
        {
          widget: 'camera',
          config: { src: CAMERAS.KYLE_RISE_FRONT, go2rtcHost: DEFAULT_GO2RTC_HOST }
        },
        {
          widget: 'camera',
          config: { src: CAMERAS.KYLE_RISE_REAR, go2rtcHost: DEFAULT_GO2RTC_HOST }
        },
        {
          widget: 'camera',
          config: { src: CAMERAS.KYLE_SURFACE_ANPR, go2rtcHost: DEFAULT_GO2RTC_HOST }
        },
        {
          widget: 'camera',
          config: { src: CAMERAS.KYLE_SURFACE_REAR, go2rtcHost: DEFAULT_GO2RTC_HOST }
        }
      ]
    }
  },

  /**
   * Control Room - All Sites
   * Multi-site monitoring with all site cameras
   */
  'control-room-all-sites': {
    name: 'Control Room - All Sites',
    description: 'Dashboard monitoring all sites with multi-site camera grid',
    category: 'control-room',
    widget: 'layout',
    config: {
      layout: 'dashboard-cameras',
      panels: [
        {
          widget: 'operations-dashboard',
          config: {
            posApiUrl: DEFAULT_POS_API,
            siteIds: [SITES.KYLE_RISE, SITES.KYLE_SURFACE, SITES.GREENFORD],
            refreshInterval: 30000,
            eventLimit: 8,
            showEnforcement: true,
            showHealth: true,
            title: 'All Sites'
          }
        },
        {
          widget: 'camera-grid',
          config: {
            cameras: [
              CAMERAS.KYLE_RISE_FRONT,
              CAMERAS.KYLE_SURFACE_ANPR,
              CAMERAS.GREENFORD_OVERVIEW,
              CAMERAS.KYLE_RISE_REAR
            ],
            go2rtcHost: DEFAULT_GO2RTC_HOST,
            columns: 2
          }
        }
      ]
    }
  },

  // ============================================================
  // SITE-SPECIFIC PRESETS
  // ============================================================
  
  /**
   * Kyle Rise Focus
   */
  'kyle-rise': {
    name: 'Kyle Rise Operations',
    description: 'Kyle Rise site monitoring with all Kyle Rise cameras',
    category: 'site-specific',
    widget: 'layout',
    config: {
      layout: 'dashboard-cameras',
      panels: [
        {
          widget: 'operations-dashboard',
          config: {
            posApiUrl: DEFAULT_POS_API,
            siteIds: [SITES.KYLE_RISE],
            refreshInterval: 30000,
            eventLimit: 10,
            showEnforcement: true,
            showHealth: true,
            title: 'Kyle Rise Operations'
          }
        },
        {
          widget: 'camera-grid',
          config: {
            cameras: [
              CAMERAS.KYLE_RISE_FRONT,
              CAMERAS.KYLE_RISE_REAR,
              CAMERAS.KYLE_RISE_RAMP,
              CAMERAS.KYLE_RISE_PTZ
            ],
            go2rtcHost: DEFAULT_GO2RTC_HOST,
            columns: 2,
            refreshInterval: 3000
          }
        }
      ]
    }
  },

  /**
   * Kyle Surface Focus
   */
  'kyle-surface': {
    name: 'Kyle Surface Operations',
    description: 'Kyle Surface site monitoring',
    category: 'site-specific',
    widget: 'layout',
    config: {
      layout: 'dashboard-cameras',
      panels: [
        {
          widget: 'operations-dashboard',
          config: {
            posApiUrl: DEFAULT_POS_API,
            siteIds: [SITES.KYLE_SURFACE],
            refreshInterval: 30000,
            eventLimit: 10,
            showEnforcement: true,
            showHealth: true,
            title: 'Kyle Surface Operations'
          }
        },
        {
          widget: 'camera-grid',
          config: {
            cameras: [
              CAMERAS.KYLE_SURFACE_ANPR,
              CAMERAS.KYLE_SURFACE_REAR
            ],
            go2rtcHost: DEFAULT_GO2RTC_HOST,
            columns: 1,
            autoRotate: true,
            rotateInterval: 10000,
            refreshInterval: 3000
          }
        }
      ]
    }
  },

  // ============================================================
  // DASHBOARD-ONLY PRESETS
  // ============================================================

  /**
   * Dashboard Full - Operations dashboard only
   */
  'dashboard-full': {
    name: 'Dashboard Full',
    description: 'Full-screen operations dashboard',
    category: 'dashboard',
    widget: 'operations-dashboard',
    config: {
      posApiUrl: DEFAULT_POS_API,
      siteIds: [SITES.KYLE_RISE, SITES.KYLE_SURFACE],
      refreshInterval: 30000,
      eventLimit: 12,
      showEnforcement: true,
      showHealth: true,
      title: 'Parkwise Operations'
    }
  },

  /**
   * Dashboard Compact
   */
  'dashboard-compact': {
    name: 'Dashboard Compact',
    description: 'Compact operations view - smaller footprint',
    category: 'dashboard',
    widget: 'operations-dashboard',
    config: {
      posApiUrl: DEFAULT_POS_API,
      siteIds: [SITES.KYLE_RISE, SITES.KYLE_SURFACE],
      refreshInterval: 30000,
      eventLimit: 5,
      showEnforcement: true,
      showHealth: false,
      compact: true,
      title: 'Ops Summary'
    }
  },

  /**
   * Dashboard Kyle Rise Only
   */
  'dashboard-kyle-rise': {
    name: 'Dashboard - Kyle Rise',
    description: 'Kyle Rise site only',
    category: 'dashboard',
    widget: 'operations-dashboard',
    config: {
      posApiUrl: DEFAULT_POS_API,
      siteIds: [SITES.KYLE_RISE],
      refreshInterval: 30000,
      eventLimit: 10,
      showEnforcement: true,
      showHealth: true,
      title: 'Kyle Rise'
    }
  },

  /**
   * Dashboard Kyle Surface Only
   */
  'dashboard-kyle-surface': {
    name: 'Dashboard - Kyle Surface',
    description: 'Kyle Surface site only',
    category: 'dashboard',
    widget: 'operations-dashboard',
    config: {
      posApiUrl: DEFAULT_POS_API,
      siteIds: [SITES.KYLE_SURFACE],
      refreshInterval: 30000,
      eventLimit: 10,
      showEnforcement: true,
      showHealth: true,
      title: 'Kyle Surface'
    }
  },

  // ============================================================
  // CAMERA-ONLY PRESETS
  // ============================================================

  /**
   * Cameras 2x2 - Main entrance cameras
   */
  'cameras-2x2': {
    name: 'Main Cameras 2x2',
    description: '4 main cameras in 2x2 grid',
    category: 'cameras',
    widget: 'camera-grid',
    config: {
      cameras: [
        CAMERAS.KYLE_RISE_FRONT,
        CAMERAS.KYLE_RISE_REAR,
        CAMERAS.KYLE_SURFACE_ANPR,
        CAMERAS.KYLE_SURFACE_REAR
      ],
      go2rtcHost: DEFAULT_GO2RTC_HOST,
      columns: 2,
      refreshInterval: 3000
    }
  },

  /**
   * Cameras 3x2 - All available cameras
   */
  'cameras-all': {
    name: 'All Cameras',
    description: 'All cameras in 3x2 grid',
    category: 'cameras',
    widget: 'camera-grid',
    config: {
      cameras: [
        CAMERAS.KYLE_RISE_FRONT,
        CAMERAS.KYLE_RISE_REAR,
        CAMERAS.KYLE_RISE_RAMP,
        CAMERAS.KYLE_SURFACE_ANPR,
        CAMERAS.KYLE_SURFACE_REAR,
        CAMERAS.GREENFORD_OVERVIEW
      ],
      go2rtcHost: DEFAULT_GO2RTC_HOST,
      columns: 3,
      refreshInterval: 3000
    }
  },

  /**
   * Camera Rotate - Single camera with auto-rotation
   */
  'cameras-rotate': {
    name: 'Camera Carousel',
    description: 'Auto-rotating single camera view',
    category: 'cameras',
    widget: 'camera-grid',
    config: {
      cameras: [
        CAMERAS.KYLE_RISE_FRONT,
        CAMERAS.KYLE_RISE_REAR,
        CAMERAS.KYLE_SURFACE_ANPR,
        CAMERAS.KYLE_SURFACE_REAR
      ],
      go2rtcHost: DEFAULT_GO2RTC_HOST,
      autoRotate: true,
      rotateInterval: 10000,
      refreshInterval: 3000
    }
  },

  /**
   * Kyle Rise Cameras Only
   */
  'cameras-kyle-rise': {
    name: 'Cameras - Kyle Rise',
    description: 'All Kyle Rise cameras',
    category: 'cameras',
    widget: 'camera-grid',
    config: {
      cameras: [
        CAMERAS.KYLE_RISE_FRONT,
        CAMERAS.KYLE_RISE_REAR,
        CAMERAS.KYLE_RISE_RAMP,
        CAMERAS.KYLE_RISE_PTZ
      ],
      go2rtcHost: DEFAULT_GO2RTC_HOST,
      columns: 2,
      refreshInterval: 3000
    }
  },

  // ============================================================
  // OFFICE DISPLAYS
  // ============================================================

  /**
   * Office Overview - Dashboard with weather/clock sidebar
   */
  'office-overview': {
    name: 'Office Overview',
    description: 'Dashboard with clock and weather sidebar',
    category: 'office',
    widget: 'layout',
    config: {
      layout: 'sidebar-right',
      panels: [
        {
          widget: 'operations-dashboard',
          config: {
            posApiUrl: DEFAULT_POS_API,
            siteIds: [SITES.KYLE_RISE, SITES.KYLE_SURFACE],
            refreshInterval: 30000,
            eventLimit: 8,
            showEnforcement: true,
            showHealth: true,
            title: 'Parkwise Operations'
          }
        },
        {
          widget: 'layout',
          size: 300,
          config: {
            layout: 'split-v',
            panels: [
              { widget: 'clock', config: { showDate: true, showSeconds: false } },
              { widget: 'weather', config: { location: 'Ayr, Scotland' } }
            ]
          }
        }
      ]
    }
  },

  /**
   * Lobby Display - Large occupancy numbers
   */
  'lobby-display': {
    name: 'Lobby Display',
    description: 'Large occupancy numbers for public areas',
    category: 'office',
    widget: 'layout',
    config: {
      layout: 'split-v',
      panels: [
        {
          widget: 'occupancy',
          config: {
            posApiUrl: DEFAULT_POS_API,
            siteId: SITES.KYLE_RISE,
            siteName: 'Kyle Rise',
            refreshInterval: 15000
          }
        },
        {
          widget: 'occupancy',
          config: {
            posApiUrl: DEFAULT_POS_API,
            siteId: SITES.KYLE_SURFACE,
            siteName: 'Kyle Surface',
            refreshInterval: 15000
          }
        }
      ]
    }
  },

  // ============================================================
  // ENFORCEMENT FOCUSED
  // ============================================================

  /**
   * Enforcement Station - ANPR feeds with dashboard
   */
  'enforcement': {
    name: 'Enforcement Station',
    description: 'ANPR camera focus for enforcement operators',
    category: 'enforcement',
    widget: 'layout',
    config: {
      layout: 'dashboard-cameras',
      panels: [
        {
          widget: 'operations-dashboard',
          config: {
            posApiUrl: DEFAULT_POS_API,
            siteIds: [SITES.KYLE_RISE, SITES.KYLE_SURFACE],
            refreshInterval: 15000,  // Faster refresh for enforcement
            eventLimit: 12,
            showEnforcement: true,
            showHealth: false,
            title: 'Enforcement Queue'
          }
        },
        {
          widget: 'camera-grid',
          config: {
            cameras: [
              CAMERAS.KYLE_RISE_FRONT,   // Entry ANPR
              CAMERAS.KYLE_RISE_REAR,    // Exit ANPR
              CAMERAS.KYLE_SURFACE_ANPR  // Surface ANPR
            ],
            go2rtcHost: DEFAULT_GO2RTC_HOST,
            columns: 1,
            refreshInterval: 2000  // Faster refresh for enforcement
          }
        }
      ]
    }
  },

  // ============================================================
  // SPLIT VIEW / COMBINED PRESETS
  // ============================================================

  /**
   * Split - Dashboard + Activity
   */
  'split-dashboard-activity': {
    name: 'Split - Dashboard + Activity',
    description: 'Operations dashboard with team activity feed',
    category: 'split',
    widget: 'layout',
    config: {
      layout: 'split-h',
      panels: [
        {
          widget: 'operations-dashboard',
          config: {
            posApiUrl: DEFAULT_POS_API,
            siteIds: [SITES.KYLE_RISE, SITES.KYLE_SURFACE],
            refreshInterval: 30000,
            eventLimit: 6,
            showEnforcement: true,
            showHealth: false
          },
          size: 2
        },
        {
          widget: 'team-activity',
          config: {},
          size: 1
        }
      ]
    }
  },

  /**
   * Split - Cameras + Clock/Weather
   */
  'split-cameras-clock': {
    name: 'Split - Cameras + Info',
    description: 'Camera grid with time and weather sidebar',
    category: 'split',
    widget: 'layout',
    config: {
      layout: 'sidebar-right',
      panels: [
        {
          widget: 'camera-grid',
          config: {
            cameras: [
              CAMERAS.KYLE_RISE_FRONT,
              CAMERAS.KYLE_RISE_REAR,
              CAMERAS.KYLE_SURFACE_ANPR,
              CAMERAS.KYLE_SURFACE_REAR
            ],
            go2rtcHost: DEFAULT_GO2RTC_HOST,
            columns: 2
          }
        },
        {
          widget: 'layout',
          config: {
            layout: 'split-v',
            panels: [
              { widget: 'clock', config: { showDate: true } },
              { widget: 'weather', config: { location: 'Ayr, Scotland' } }
            ]
          },
          size: 300
        }
      ]
    }
  },

  // ============================================================
  // PIP (Picture-in-Picture) PRESETS
  // ============================================================

  /**
   * PiP - Dashboard with Camera
   */
  'pip-dashboard-camera': {
    name: 'PiP - Dashboard with Camera',
    description: 'Full dashboard with camera overlay in corner',
    category: 'pip',
    widget: 'layout',
    config: {
      layout: 'pip',
      panels: [
        {
          widget: 'operations-dashboard',
          config: {
            posApiUrl: DEFAULT_POS_API,
            siteIds: [SITES.KYLE_RISE, SITES.KYLE_SURFACE],
            refreshInterval: 30000,
            eventLimit: 10,
            showEnforcement: true,
            showHealth: true,
            title: 'Operations'
          }
        },
        {
          widget: 'camera',
          config: { src: CAMERAS.KYLE_RISE_FRONT, go2rtcHost: DEFAULT_GO2RTC_HOST }
        }
      ]
    }
  },

  /**
   * PiP - Cameras with Dashboard
   */
  'pip-cameras-dashboard': {
    name: 'PiP - Cameras with Dashboard',
    description: 'Full camera grid with dashboard overlay',
    category: 'pip',
    widget: 'layout',
    config: {
      layout: 'pip',
      panels: [
        {
          widget: 'camera-grid',
          config: {
            cameras: [
              CAMERAS.KYLE_RISE_FRONT,
              CAMERAS.KYLE_RISE_REAR,
              CAMERAS.KYLE_SURFACE_ANPR,
              CAMERAS.KYLE_SURFACE_REAR
            ],
            go2rtcHost: DEFAULT_GO2RTC_HOST,
            columns: 2
          }
        },
        {
          widget: 'operations-dashboard',
          config: {
            posApiUrl: DEFAULT_POS_API,
            siteIds: [SITES.KYLE_RISE, SITES.KYLE_SURFACE],
            refreshInterval: 30000,
            eventLimit: 4,
            showEnforcement: false,
            showHealth: false,
            compact: true,
            title: 'Quick Stats'
          }
        }
      ]
    }
  }
};

// Get preset by ID
export function getPreset(presetId) {
  return PRESETS[presetId] || null;
}

// List all presets (optionally filtered by category)
export function listPresets(category = null) {
  const presets = Object.entries(PRESETS).map(([id, preset]) => ({
    id,
    name: preset.name,
    description: preset.description,
    category: preset.category
  }));
  
  if (category) {
    return presets.filter(p => p.category === category);
  }
  return presets;
}

// Get preset categories
export function getCategories() {
  const categories = new Set();
  Object.values(PRESETS).forEach(p => categories.add(p.category));
  return Array.from(categories);
}

// Export cameras and sites for documentation
export { CAMERAS, SITES };
