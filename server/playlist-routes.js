/**
 * Playlist Management API Routes
 * Handles playlist CRUD, scheduling, and push operations
 */

import { v4 as uuidv4 } from 'uuid';
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';

const VIDEO_PATH = '/Volumes/Parkwise/Skynet/video/';

// ===== PLAYLIST DATA MODEL =====

/**
 * PlaylistItem:
 * {
 *   id: string
 *   contentType: 'video' | 'template' | 'widget' | 'url'
 *   contentId: string (for video/template) or null
 *   url: string (for url type) or null
 *   widget: string (for widget type - 'clock', 'weather', etc.)
 *   config: object (widget config, video props, etc.)
 *   duration: number (seconds)
 *   name: string (display name)
 * }
 * 
 * Playlist:
 * {
 *   id: string
 *   name: string
 *   description: string
 *   items: PlaylistItem[]
 *   loop: boolean
 *   transition: 'fade' | 'slide' | 'none'
 *   createdAt: number
 *   updatedAt: number
 * }
 * 
 * Schedule:
 * {
 *   id: string
 *   playlistId: string
 *   screenTarget: string ('all', group id, or screen id)
 *   startTime: string (HH:mm)
 *   endTime: string (HH:mm)
 *   days: number[] (0-6, Sunday=0)
 *   priority: number
 *   enabled: boolean
 *   createdAt: number
 * }
 */

export function setupPlaylistRoutes(app, db, io, connectedScreens) {
  
  // ===== DATABASE SETUP =====
  db.exec(`
    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      items TEXT DEFAULT '[]',
      loop INTEGER DEFAULT 1,
      transition TEXT DEFAULT 'fade',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
    
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      playlist_id TEXT NOT NULL,
      screen_target TEXT DEFAULT 'all',
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      days TEXT DEFAULT '[0,1,2,3,4,5,6]',
      priority INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
    );
    
    CREATE TABLE IF NOT EXISTS screen_playlists (
      screen_id TEXT PRIMARY KEY,
      playlist_id TEXT,
      current_index INTEGER DEFAULT 0,
      started_at INTEGER,
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE SET NULL
    );
  `);
  
  // ===== HELPER FUNCTIONS =====
  
  function parsePlaylist(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      items: JSON.parse(row.items || '[]'),
      loop: Boolean(row.loop),
      transition: row.transition || 'fade',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
  
  function parseSchedule(row) {
    if (!row) return null;
    return {
      id: row.id,
      playlistId: row.playlist_id,
      screenTarget: row.screen_target,
      startTime: row.start_time,
      endTime: row.end_time,
      days: JSON.parse(row.days || '[]'),
      priority: row.priority,
      enabled: Boolean(row.enabled),
      createdAt: row.created_at
    };
  }
  
  function pushToTarget(target, payload) {
    let pushed = 0;
    
    if (target === 'all') {
      connectedScreens.forEach((socket) => {
        socket.emit('content', payload);
        pushed++;
      });
    } else {
      // Check if target is a group
      const group = db.prepare('SELECT id FROM groups WHERE id = ?').get(target);
      if (group) {
        const screens = db.prepare('SELECT id FROM screens WHERE group_id = ?').all(target);
        screens.forEach(s => {
          const socket = connectedScreens.get(s.id);
          if (socket) {
            socket.emit('content', payload);
            pushed++;
          }
        });
      } else {
        // Push to specific screen
        const socket = connectedScreens.get(target);
        if (socket) {
          socket.emit('content', payload);
          pushed++;
        }
      }
    }
    
    return pushed;
  }
  
  // ===== PLAYLIST ENDPOINTS =====
  
  // List all playlists
  app.get('/api/playlists', (req, res) => {
    try {
      const rows = db.prepare('SELECT * FROM playlists ORDER BY updated_at DESC').all();
      const playlists = rows.map(parsePlaylist);
      res.json({ success: true, data: playlists });
    } catch (err) {
      console.error('Error listing playlists:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // Get single playlist
  app.get('/api/playlists/:id', (req, res) => {
    try {
      const row = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
      if (!row) {
        return res.status(404).json({ success: false, error: 'Playlist not found' });
      }
      res.json({ success: true, data: parsePlaylist(row) });
    } catch (err) {
      console.error('Error getting playlist:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // Create playlist
  app.post('/api/playlists', (req, res) => {
    try {
      const { name, description = '', items = [], loop = true, transition = 'fade' } = req.body;
      
      if (!name) {
        return res.status(400).json({ success: false, error: 'Name is required' });
      }
      
      // Validate and process items
      const processedItems = items.map((item, index) => ({
        id: item.id || uuidv4(),
        contentType: item.contentType || 'widget',
        contentId: item.contentId || null,
        url: item.url || null,
        widget: item.widget || null,
        config: item.config || {},
        duration: item.duration || 30,
        name: item.name || `Item ${index + 1}`
      }));
      
      const id = `playlist-${uuidv4().slice(0, 8)}`;
      const now = Math.floor(Date.now() / 1000);
      
      db.prepare(`
        INSERT INTO playlists (id, name, description, items, loop, transition, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, name, description, JSON.stringify(processedItems), loop ? 1 : 0, transition, now, now);
      
      const row = db.prepare('SELECT * FROM playlists WHERE id = ?').get(id);
      console.log(`📋 Playlist created: ${name} (${id})`);
      res.json({ success: true, data: parsePlaylist(row) });
    } catch (err) {
      console.error('Error creating playlist:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // Update playlist
  app.put('/api/playlists/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Playlist not found' });
      }
      
      const { name, description, items, loop, transition } = req.body;
      const now = Math.floor(Date.now() / 1000);
      
      // Process items if provided
      let processedItems = JSON.parse(existing.items);
      if (items !== undefined) {
        processedItems = items.map((item, index) => ({
          id: item.id || uuidv4(),
          contentType: item.contentType || 'widget',
          contentId: item.contentId || null,
          url: item.url || null,
          widget: item.widget || null,
          config: item.config || {},
          duration: item.duration || 30,
          name: item.name || `Item ${index + 1}`
        }));
      }
      
      db.prepare(`
        UPDATE playlists SET
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          items = ?,
          loop = COALESCE(?, loop),
          transition = COALESCE(?, transition),
          updated_at = ?
        WHERE id = ?
      `).run(
        name || null,
        description !== undefined ? description : null,
        JSON.stringify(processedItems),
        loop !== undefined ? (loop ? 1 : 0) : null,
        transition || null,
        now,
        req.params.id
      );
      
      const row = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
      console.log(`📋 Playlist updated: ${row.name} (${req.params.id})`);
      res.json({ success: true, data: parsePlaylist(row) });
    } catch (err) {
      console.error('Error updating playlist:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // Delete playlist
  app.delete('/api/playlists/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Playlist not found' });
      }
      
      db.prepare('DELETE FROM playlists WHERE id = ?').run(req.params.id);
      console.log(`📋 Playlist deleted: ${existing.name} (${req.params.id})`);
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting playlist:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // Push playlist to screens
  app.post('/api/playlists/:id/push', (req, res) => {
    try {
      const { target = 'all' } = req.body;
      
      const row = db.prepare('SELECT * FROM playlists WHERE id = ?').get(req.params.id);
      if (!row) {
        return res.status(404).json({ success: false, error: 'Playlist not found' });
      }
      
      const playlist = parsePlaylist(row);
      
      const payload = {
        type: 'playlist',
        content: {
          id: playlist.id,
          name: playlist.name,
          items: playlist.items,
          loop: playlist.loop,
          transition: playlist.transition
        },
        timestamp: Date.now()
      };
      
      const pushed = pushToTarget(target, payload);
      
      console.log(`📋 Playlist pushed: ${playlist.name} → ${pushed} screen(s)`);
      res.json({ success: true, pushed, playlistId: playlist.id, target });
    } catch (err) {
      console.error('Error pushing playlist:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // ===== SCHEDULE ENDPOINTS =====
  
  // List schedules
  app.get('/api/schedules', (req, res) => {
    try {
      const { playlistId } = req.query;
      let rows;
      
      if (playlistId) {
        rows = db.prepare('SELECT * FROM schedules WHERE playlist_id = ? ORDER BY priority DESC').all(playlistId);
      } else {
        rows = db.prepare('SELECT * FROM schedules ORDER BY priority DESC').all();
      }
      
      const schedules = rows.map(parseSchedule);
      res.json({ success: true, data: schedules });
    } catch (err) {
      console.error('Error listing schedules:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // Create schedule
  app.post('/api/schedules', (req, res) => {
    try {
      const { playlistId, screenTarget = 'all', startTime, endTime, days = [0,1,2,3,4,5,6], priority = 0 } = req.body;
      
      if (!playlistId || !startTime || !endTime) {
        return res.status(400).json({ success: false, error: 'playlistId, startTime, and endTime are required' });
      }
      
      // Verify playlist exists
      const playlist = db.prepare('SELECT id FROM playlists WHERE id = ?').get(playlistId);
      if (!playlist) {
        return res.status(404).json({ success: false, error: 'Playlist not found' });
      }
      
      const id = `schedule-${uuidv4().slice(0, 8)}`;
      
      db.prepare(`
        INSERT INTO schedules (id, playlist_id, screen_target, start_time, end_time, days, priority)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, playlistId, screenTarget, startTime, endTime, JSON.stringify(days), priority);
      
      const row = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id);
      console.log(`📅 Schedule created: ${startTime}-${endTime} for playlist ${playlistId}`);
      res.json({ success: true, data: parseSchedule(row) });
    } catch (err) {
      console.error('Error creating schedule:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // Update schedule
  app.put('/api/schedules/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Schedule not found' });
      }
      
      const { playlistId, screenTarget, startTime, endTime, days, priority, enabled } = req.body;
      
      db.prepare(`
        UPDATE schedules SET
          playlist_id = COALESCE(?, playlist_id),
          screen_target = COALESCE(?, screen_target),
          start_time = COALESCE(?, start_time),
          end_time = COALESCE(?, end_time),
          days = COALESCE(?, days),
          priority = COALESCE(?, priority),
          enabled = COALESCE(?, enabled)
        WHERE id = ?
      `).run(
        playlistId || null,
        screenTarget || null,
        startTime || null,
        endTime || null,
        days ? JSON.stringify(days) : null,
        priority !== undefined ? priority : null,
        enabled !== undefined ? (enabled ? 1 : 0) : null,
        req.params.id
      );
      
      const row = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);
      res.json({ success: true, data: parseSchedule(row) });
    } catch (err) {
      console.error('Error updating schedule:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // Delete schedule
  app.delete('/api/schedules/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM schedules WHERE id = ?').get(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Schedule not found' });
      }
      
      db.prepare('DELETE FROM schedules WHERE id = ?').run(req.params.id);
      console.log(`📅 Schedule deleted: ${req.params.id}`);
      res.json({ success: true });
    } catch (err) {
      console.error('Error deleting schedule:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // ===== CONTENT LIBRARY ENDPOINTS =====
  
  // List available videos
  app.get('/api/content/videos', (req, res) => {
    try {
      const videos = [];
      
      if (existsSync(VIDEO_PATH)) {
        const scanDir = (dir, category = '') => {
          const items = readdirSync(dir);
          for (const item of items) {
            const fullPath = join(dir, item);
            const stat = statSync(fullPath);
            
            if (stat.isDirectory()) {
              scanDir(fullPath, item);
            } else if (item.endsWith('.mp4') || item.endsWith('.webm') || item.endsWith('.mov')) {
              videos.push({
                id: item.replace(/\.[^/.]+$/, ''),
                filename: item,
                path: fullPath,
                category: category || 'uncategorized',
                size: stat.size,
                modified: stat.mtime.getTime()
              });
            }
          }
        };
        
        scanDir(VIDEO_PATH);
      }
      
      res.json({ success: true, data: videos });
    } catch (err) {
      console.error('Error listing videos:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // List available widgets
  app.get('/api/content/widgets', (req, res) => {
    const widgets = [
      { id: 'clock', name: 'Clock', description: 'Digital clock display', icon: 'clock', defaultConfig: {} },
      { id: 'weather', name: 'Weather', description: 'Current weather conditions', icon: 'cloud', defaultConfig: { location: 'Ayr, Scotland' } },
      { id: 'camera', name: 'Camera Feed', description: 'Single camera stream', icon: 'camera', defaultConfig: { stream: 'kyle-rise-front' } },
      { id: 'camera-grid', name: 'Camera Grid', description: 'Multi-camera view', icon: 'grid', defaultConfig: { cameras: ['kyle-rise-front', 'kyle-rise-ptz'] } },
      { id: 'occupancy', name: 'Occupancy', description: 'Parking occupancy display', icon: 'parking', defaultConfig: { siteName: 'Kyle Rise', capacity: 50 } },
      { id: 'stats', name: 'Stats', description: 'Statistics dashboard', icon: 'bar-chart', defaultConfig: {} },
      { id: 'operations-dashboard', name: 'Operations Dashboard', description: 'Full operations overview', icon: 'activity', defaultConfig: { siteIds: ['kyle-rise', 'KCS01'] } },
      { id: 'team-activity', name: 'Team Activity', description: 'HQ task completions and agent activity feed', icon: 'users', defaultConfig: { hqApiUrl: 'http://localhost:3800', refreshInterval: 30000, maxItems: 15 } },
      { id: 'security-alert', name: 'Security Alert', description: 'SentryFlow security alerts display', icon: 'shield', defaultConfig: { level: 'info', title: 'Security Notice', message: 'All clear', pullFromApi: false } },
      { id: 'revenue', name: 'Revenue Dashboard', description: 'POS revenue stats and transactions', icon: 'credit-card', defaultConfig: { apiUrl: 'http://localhost:3000', showTransactions: true } },
    ];
    
    res.json({ success: true, data: widgets });
  });
  
  // List available templates
  app.get('/api/content/templates', (req, res) => {
    const templates = [
      { id: 'welcome', name: 'Welcome Screen', path: '/templates/welcome.html', category: 'reception' },
      { id: 'dashboard', name: 'Operations Dashboard', path: '/templates/dashboard.html', category: 'monitoring' },
      { id: 'activity-feed', name: 'Activity Feed', path: '/templates/activity-feed.html', category: 'team' },
      { id: 'ambient', name: 'Ambient Clock/Weather', path: '/templates/ambient.html', category: 'ambient' },
      { id: 'alert', name: 'Alert Template', path: '/templates/alert.html', category: 'alerts' },
      { id: 'welcome-display', name: 'Welcome Display', type: 'react-template', category: 'entrance', description: 'Large greeting + clock + weather + site info. Perfect for car park entrances.', defaultData: { siteName: 'Kyle Rise Car Park', subtitle: 'Welcome to Parkwise', weatherLocation: 'Ayr, Scotland', notices: ['Free after 6pm', 'Max stay 4 hours'] } },
      { id: 'parking-rates', name: 'Parking Rates Board', type: 'react-template', category: 'info', description: 'Dynamic tariff display board with gradient header. JSON-configurable rates.', defaultData: { siteName: 'Parking Tariff', rates: [{ label: 'Up to 1 hour', price: '£2.00' }, { label: 'Up to 2 hours', price: '£3.50', highlight: true, note: 'Most popular' }, { label: 'Up to 4 hours', price: '£5.00' }, { label: 'All day', price: '£8.00' }], paymentMethods: ['Card', 'Cash', 'App'], notices: ['Free after 6pm'] } },
      { id: 'multi-zone', name: 'Multi-Zone Layout', type: 'react-template', category: 'layout', description: 'Split screen: main content area + sidebar (clock/weather) + bottom ticker. Ideal for info displays.', defaultData: { mainContent: { type: 'text', title: 'Welcome', body: 'Main content area — supports text, images, video, and rotation.' }, sidebar: { showClock: true, showWeather: true, showLogo: true }, ticker: { messages: ['Welcome to Parkwise', 'Car park closes at 10pm', 'Report issues to reception'] } } },
      { id: 'announcement-rotator', name: 'Announcement Rotator', type: 'react-template', category: 'notices', description: 'Rotating announcements with nice transitions. Great for site notices and event info.', defaultData: { title: 'NOTICES', announcements: [{ title: 'Free Parking Weekend', message: 'This Saturday and Sunday, enjoy free parking!', icon: '🎉', footer: 'Valid 12-13 July' }, { title: 'ANPR Active', message: 'Automatic number plate recognition is now active at this site.', icon: '📷' }, { title: 'EV Charging', message: 'Electric vehicle charging bays now available on Level 2.', icon: '⚡' }] } },
      { id: 'site-info', name: 'Site Information Display', type: 'react-template', category: 'info', description: 'All-in-one info board: occupancy gauge, features, rules, contact, hours. Pulls live data from POS + location config.', defaultData: { siteName: 'Kyle Rise Car Park', subtitle: 'Multi-Storey Car Park', locationId: 'kyle-rise', showOccupancy: true } },
      { id: 'announcement-board', name: 'Announcement Board', type: 'react-template', category: 'notices', description: 'Auto-refreshing notice board pulling from admin-editable announcements database. Paginates and rotates.', defaultData: { title: 'SITE NOTICES', rotatePages: true, showTimestamps: true, layout: 'list' } },
      { id: 'schedule-display', name: 'Rate Schedule Display', type: 'react-template', category: 'pricing', description: 'Shows current rate period (peak/off-peak), all periods timeline, upcoming events. Live POS data.', defaultData: { siteName: 'Kyle Rise Car Park', periods: [{ name: 'Standard', startTime: '06:00', endTime: '18:00', days: [1,2,3,4,5], rates: [{ label: 'Up to 2 hours', price: '£3.50' }, { label: 'All day', price: '£8.00' }], color: '#F97316' }, { name: 'Evening', startTime: '18:00', endTime: '22:00', rates: [{ label: 'Flat rate', price: '£2.00' }], color: '#60A5FA' }, { name: 'Weekend', startTime: '06:00', endTime: '22:00', days: [0,6], rates: [{ label: 'All day', price: '£4.00' }], color: '#2DD4BF' }], showOccupancy: true, posSiteId: 'KMS01' } },
    ];
    
    res.json({ success: true, data: templates });
  });
  
  // ===== SCHEDULE CHECKER =====
  
  function checkSchedules() {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    
    const schedules = db.prepare(`
      SELECT s.*, p.name as playlist_name, p.items, p.loop, p.transition
      FROM schedules s
      JOIN playlists p ON s.playlist_id = p.id
      WHERE s.enabled = 1
      ORDER BY s.priority DESC
    `).all();
    
    for (const schedule of schedules) {
      const days = JSON.parse(schedule.days || '[]');
      
      // Check if schedule applies now
      if (days.includes(currentDay) && 
          currentTime >= schedule.start_time && 
          currentTime <= schedule.end_time) {
        
        // Get target screens
        const target = schedule.screen_target;
        
        // Check if we need to push (simple: just push if schedule is active)
        // In production, would track which screens have which playlist
        const playlist = {
          id: schedule.playlist_id,
          name: schedule.playlist_name,
          items: JSON.parse(schedule.items || '[]'),
          loop: Boolean(schedule.loop),
          transition: schedule.transition
        };
        
        const payload = {
          type: 'playlist',
          content: playlist,
          source: 'schedule',
          scheduleId: schedule.id,
          timestamp: Date.now()
        };
        
        // Only push on minute boundaries to avoid spam
        if (now.getSeconds() < 10) {
          pushToTarget(target, payload);
        }
      }
    }
  }
  
  // Check schedules every minute
  setInterval(checkSchedules, 60000);
  
  console.log('📋 Playlist routes initialized');
}
