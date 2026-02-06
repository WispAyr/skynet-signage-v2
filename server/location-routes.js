/**
 * Location Management API Routes
 * CRUD for locations, screen assignments, location-based content pushing
 */

import { v4 as uuidv4 } from 'uuid';

export function setupLocationRoutes(app, db, io, connectedScreens) {

  // Ensure locations table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT,
      latitude REAL,
      longitude REAL,
      timezone TEXT DEFAULT 'Europe/London',
      group_id TEXT DEFAULT 'default',
      config TEXT DEFAULT '{}',
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  // ===== LOCATIONS CRUD =====

  // List all locations (with screen counts)
  app.get('/api/locations', (req, res) => {
    try {
      const locations = db.prepare(`
        SELECT l.*, 
          (SELECT COUNT(*) FROM screens WHERE location_id = l.id) as screen_count,
          (SELECT COUNT(*) FROM screens WHERE location_id = l.id AND id IN (${
            Array.from(connectedScreens.keys()).map(() => '?').join(',') || "'__none__'"
          })) as online_count
        FROM locations l
        ORDER BY l.name
      `).all(...Array.from(connectedScreens.keys()));

      res.json({ success: true, data: locations.map(l => ({
        ...l,
        config: JSON.parse(l.config || '{}'),
      }))});
    } catch (err) {
      console.error('Error listing locations:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get single location with screens
  app.get('/api/locations/:id', (req, res) => {
    try {
      const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
      if (!location) return res.status(404).json({ success: false, error: 'Location not found' });

      const screens = db.prepare('SELECT * FROM screens WHERE location_id = ?').all(req.params.id);
      const enrichedScreens = screens.map(s => ({
        ...s,
        config: JSON.parse(s.config || '{}'),
        connected: connectedScreens.has(s.id),
      }));

      res.json({ success: true, data: { 
        ...location, 
        config: JSON.parse(location.config || '{}'),
        screens: enrichedScreens 
      }});
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Create location
  app.post('/api/locations', (req, res) => {
    try {
      const { name, address, latitude, longitude, timezone, group_id, config } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'Name is required' });

      const id = req.body.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      
      db.prepare(`
        INSERT INTO locations (id, name, address, latitude, longitude, timezone, group_id, config)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, name, address || null, latitude || null, longitude || null, 
             timezone || 'Europe/London', group_id || 'default', JSON.stringify(config || {}));

      const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(id);
      console.log(`📍 Location created: ${name} (${id})`);
      res.json({ success: true, data: { ...location, config: JSON.parse(location.config || '{}') } });
    } catch (err) {
      if (err.message.includes('UNIQUE constraint')) {
        return res.status(409).json({ success: false, error: 'Location ID already exists' });
      }
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update location
  app.put('/api/locations/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
      if (!existing) return res.status(404).json({ success: false, error: 'Location not found' });

      const { name, address, latitude, longitude, timezone, group_id, config } = req.body;
      
      db.prepare(`
        UPDATE locations SET
          name = COALESCE(?, name),
          address = COALESCE(?, address),
          latitude = COALESCE(?, latitude),
          longitude = COALESCE(?, longitude),
          timezone = COALESCE(?, timezone),
          group_id = COALESCE(?, group_id),
          config = COALESCE(?, config)
        WHERE id = ?
      `).run(name || null, address || null, latitude || null, longitude || null,
             timezone || null, group_id || null, config ? JSON.stringify(config) : null, req.params.id);

      const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
      console.log(`📍 Location updated: ${location.name}`);
      res.json({ success: true, data: { ...location, config: JSON.parse(location.config || '{}') } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete location
  app.delete('/api/locations/:id', (req, res) => {
    try {
      // Unassign screens first
      db.prepare('UPDATE screens SET location_id = NULL WHERE location_id = ?').run(req.params.id);
      db.prepare('DELETE FROM locations WHERE id = ?').run(req.params.id);
      console.log(`📍 Location deleted: ${req.params.id}`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ===== SCREEN ASSIGNMENT =====

  // Assign screen to location
  app.post('/api/locations/:id/screens', (req, res) => {
    try {
      const { screenIds } = req.body;
      if (!Array.isArray(screenIds)) return res.status(400).json({ success: false, error: 'screenIds must be an array' });

      const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
      if (!location) return res.status(404).json({ success: false, error: 'Location not found' });

      const stmt = db.prepare('UPDATE screens SET location_id = ? WHERE id = ?');
      let updated = 0;
      for (const screenId of screenIds) {
        const result = stmt.run(req.params.id, screenId);
        updated += result.changes;
      }

      console.log(`📍 Assigned ${updated} screen(s) to ${location.name}`);
      res.json({ success: true, updated });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Push content to all screens at a location
  app.post('/api/locations/:id/push', (req, res) => {
    try {
      const { type, content, duration } = req.body;
      const screens = db.prepare('SELECT id FROM screens WHERE location_id = ?').all(req.params.id);
      
      const payload = { type, content, duration, timestamp: Date.now(), source: 'location' };
      let pushed = 0;

      for (const screen of screens) {
        const socket = connectedScreens.get(screen.id);
        if (socket) {
          socket.emit('content', payload);
          pushed++;
        }
      }

      console.log(`📍 Pushed ${type} to ${pushed} screen(s) at location ${req.params.id}`);
      res.json({ success: true, pushed, location: req.params.id });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ===== SETTINGS API =====

  app.get('/api/settings', (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM settings ORDER BY key').all();
      const settings = {};
      for (const row of rows) {
        settings[row.key] = row.value;
      }
      res.json({ success: true, data: settings });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/settings', (req, res) => {
    try {
      const { settings } = req.body;
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ success: false, error: 'settings object required' });
      }

      const stmt = db.prepare(`
        INSERT INTO settings (key, value, updated_at) VALUES (?, ?, strftime('%s', 'now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `);

      for (const [key, value] of Object.entries(settings)) {
        stmt.run(key, String(value));
      }

      console.log(`⚙️ Settings updated: ${Object.keys(settings).join(', ')}`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ===== SECURITY ALERT PUSH (SentryFlow Integration) =====

  app.post('/api/push/security-alert', (req, res) => {
    try {
      const { level = 2, title, message, source = 'SentryFlow', duration = 30000, target = 'all' } = req.body;
      
      if (!message) return res.status(400).json({ success: false, error: 'message required' });

      const alertLevel = level >= 3 ? 'critical' : level >= 2 ? 'warning' : 'info';
      
      const payload = {
        type: 'widget',
        content: {
          widget: 'security-alert',
          config: {
            level: alertLevel,
            escalationLevel: level,
            title: title || `Security Alert - Level ${level}`,
            message,
            source,
            timestamp: new Date().toISOString(),
          }
        },
        duration,
        timestamp: Date.now(),
        source: 'sentryflow'
      };

      let pushed = 0;
      // Security alerts go to ALL screens, including normally excluded ones
      if (target === 'all') {
        connectedScreens.forEach((socket) => {
          socket.emit('content', payload);
          pushed++;
        });
      } else {
        const socket = connectedScreens.get(target);
        if (socket) { socket.emit('content', payload); pushed++; }
      }

      console.log(`🚨 Security alert (L${level}) pushed to ${pushed} screen(s): ${message}`);
      res.json({ success: true, pushed, level: alertLevel });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ===== DASHBOARD STATS =====

  app.get('/api/dashboard/stats', (req, res) => {
    try {
      const totalScreens = db.prepare('SELECT COUNT(*) as count FROM screens').get().count;
      const onlineScreens = connectedScreens.size;
      const totalPlaylists = db.prepare('SELECT COUNT(*) as count FROM playlists').get().count;
      const totalLocations = db.prepare('SELECT COUNT(*) as count FROM locations').get().count;
      const totalSchedules = db.prepare('SELECT COUNT(*) as count FROM schedules WHERE enabled = 1').get().count;
      
      // Content counts
      const totalWidgets = 18; // Static — known count
      const totalTemplates = 5;

      // Screens by location
      const screensByLocation = db.prepare(`
        SELECT l.name as location, COUNT(s.id) as count
        FROM locations l
        LEFT JOIN screens s ON s.location_id = l.id
        GROUP BY l.id
        ORDER BY count DESC
      `).all();

      // Recent connection events
      let recentEvents = [];
      try {
        recentEvents = db.prepare(`
          SELECT * FROM connection_history 
          ORDER BY timestamp DESC LIMIT 20
        `).all();
      } catch(e) { /* table might not have data yet */ }

      res.json({
        success: true,
        data: {
          screens: { total: totalScreens, online: onlineScreens, offline: totalScreens - onlineScreens },
          playlists: { total: totalPlaylists },
          locations: { total: totalLocations },
          schedules: { active: totalSchedules },
          content: { widgets: totalWidgets, templates: totalTemplates },
          screensByLocation,
          recentEvents,
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ===== CONNECTION HISTORY =====

  // Track connection events
  function recordConnectionEvent(screenId, event, details = {}) {
    try {
      db.prepare(`
        INSERT INTO connection_history (screen_id, event, timestamp, details)
        VALUES (?, ?, ?, ?)
      `).run(screenId, event, Date.now(), JSON.stringify(details));
    } catch(e) { /* ignore if table doesn't exist yet */ }
  }

  // Expose for use in main socket handler
  app.locals.recordConnectionEvent = recordConnectionEvent;

  // Get connection history for a screen
  app.get('/api/screens/:id/history', (req, res) => {
    try {
      const { limit = 50 } = req.query;
      const history = db.prepare(`
        SELECT * FROM connection_history 
        WHERE screen_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `).all(req.params.id, Number(limit));

      res.json({ success: true, data: history.map(h => ({ ...h, details: JSON.parse(h.details || '{}') })) });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  console.log('📍 Location routes initialized');
}
