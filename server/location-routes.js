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
      const onlineKeys = Array.from(connectedScreens.keys());
      const onlinePlaceholders = onlineKeys.length ? onlineKeys.map(() => '?').join(',') : "'__none__'";
      const clientFilter = req.clientId ? ' WHERE l.client_id = ?' : '';
      const clientParams = req.clientId ? [req.clientId] : [];
      
      const locations = db.prepare(`
        SELECT l.*, 
          (SELECT COUNT(*) FROM screens WHERE location_id = l.id) as screen_count,
          (SELECT COUNT(*) FROM screens WHERE location_id = l.id AND id IN (${onlinePlaceholders})) as online_count
        FROM locations l
        ${clientFilter}
        ORDER BY l.name
      `).all(...onlineKeys, ...clientParams);

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
      const { name, address, latitude, longitude, timezone, group_id, config, client_id } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'Name is required' });

      const id = req.body.id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const assignedClient = client_id || req.clientId || 'parkwise';
      
      db.prepare(`
        INSERT INTO locations (id, name, address, latitude, longitude, timezone, group_id, config, client_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, name, address || null, latitude || null, longitude || null, 
             timezone || 'Europe/London', group_id || 'default', JSON.stringify(config || {}), assignedClient);

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
      const totalWidgets = 20; // 18 original + security-alert + revenue
      const totalTemplates = 9; // 5 original + 4 new display templates

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

  // ===== ANNOUNCEMENTS CRUD =====
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      icon TEXT DEFAULT '',
      priority TEXT DEFAULT 'normal',
      location_id TEXT,
      starts_at INTEGER,
      expires_at INTEGER,
      active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
    );
  `);

  // List announcements (with optional location filter)
  app.get('/api/announcements', (req, res) => {
    try {
      const { location_id, active_only } = req.query;
      let query = 'SELECT a.*, l.name as location_name FROM announcements a LEFT JOIN locations l ON a.location_id = l.id';
      const conditions = [];
      const params = [];
      
      // Client scoping
      if (req.clientId && req.query.all_clients !== 'true') {
        conditions.push('a.client_id = ?'); params.push(req.clientId);
      }
      
      if (location_id) { conditions.push('(a.location_id = ? OR a.location_id IS NULL)'); params.push(location_id); }
      if (active_only === 'true') {
        conditions.push('a.active = 1');
        conditions.push('(a.starts_at IS NULL OR a.starts_at <= ?)');
        conditions.push('(a.expires_at IS NULL OR a.expires_at >= ?)');
        const now = Date.now();
        params.push(now, now);
      }
      
      if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
      query += ' ORDER BY CASE a.priority WHEN \'urgent\' THEN 0 WHEN \'high\' THEN 1 ELSE 2 END, a.created_at DESC';
      
      const rows = db.prepare(query).all(...params);
      res.json({ success: true, data: rows });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Create announcement
  app.post('/api/announcements', (req, res) => {
    try {
      const { title, message, icon, priority, location_id, starts_at, expires_at } = req.body;
      if (!title || !message) return res.status(400).json({ success: false, error: 'title and message required' });
      
      const id = `ann-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      
      const assignedClient = req.body.client_id || req.clientId || 'parkwise';
      db.prepare(`
        INSERT INTO announcements (id, title, message, icon, priority, location_id, starts_at, expires_at, client_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, title, message, icon || '', priority || 'normal', location_id || null, starts_at || null, expires_at || null, assignedClient);
      
      const row = db.prepare('SELECT * FROM announcements WHERE id = ?').get(id);
      console.log(`📢 Announcement created: ${title}`);
      res.json({ success: true, data: row });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update announcement
  app.put('/api/announcements/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id);
      if (!existing) return res.status(404).json({ success: false, error: 'Not found' });
      
      const { title, message, icon, priority, location_id, starts_at, expires_at, active } = req.body;
      
      db.prepare(`
        UPDATE announcements SET
          title = COALESCE(?, title),
          message = COALESCE(?, message),
          icon = COALESCE(?, icon),
          priority = COALESCE(?, priority),
          location_id = COALESCE(?, location_id),
          starts_at = COALESCE(?, starts_at),
          expires_at = COALESCE(?, expires_at),
          active = COALESCE(?, active),
          updated_at = ?
        WHERE id = ?
      `).run(
        title || null, message || null, icon !== undefined ? icon : null, priority || null,
        location_id !== undefined ? location_id : null,
        starts_at !== undefined ? starts_at : null,
        expires_at !== undefined ? expires_at : null,
        active !== undefined ? (active ? 1 : 0) : null,
        Date.now(), req.params.id
      );
      
      const row = db.prepare('SELECT * FROM announcements WHERE id = ?').get(req.params.id);
      res.json({ success: true, data: row });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete announcement
  app.delete('/api/announcements/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ===== SITE CONFIG (for per-location display data) =====
  // Store configurable site information (rates, rules, contact) in location config
  
  app.get('/api/locations/:id/display-config', (req, res) => {
    try {
      const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
      if (!location) return res.status(404).json({ success: false, error: 'Location not found' });
      
      const config = JSON.parse(location.config || '{}');
      // Include live data
      const screenCount = db.prepare('SELECT COUNT(*) as count FROM screens WHERE location_id = ?').get(req.params.id).count;
      const onlineCount = Array.from(connectedScreens.keys()).filter(id => {
        const screen = db.prepare('SELECT location_id FROM screens WHERE id = ?').get(id);
        return screen && screen.location_id === req.params.id;
      }).length;
      
      res.json({
        success: true,
        data: {
          ...location,
          config,
          screens: { total: screenCount, online: onlineCount },
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/locations/:id/display-config', (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM locations WHERE id = ?').get(req.params.id);
      if (!existing) return res.status(404).json({ success: false, error: 'Location not found' });
      
      const currentConfig = JSON.parse(existing.config || '{}');
      const mergedConfig = { ...currentConfig, ...req.body };
      
      db.prepare('UPDATE locations SET config = ? WHERE id = ?')
        .run(JSON.stringify(mergedConfig), req.params.id);
      
      console.log(`📍 Display config updated for ${existing.name}`);
      res.json({ success: true, data: mergedConfig });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  console.log('📍 Location + announcement routes initialized');
}
