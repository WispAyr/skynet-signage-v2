import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import * as remotion from './remotion-integration.js';
import { setupPlaylistRoutes } from './playlist-routes.js';
import { setupLocationRoutes } from './location-routes.js';
import { PRESETS, getPreset, listPresets, getCategories } from './presets.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3400;

// Screens excluded from "all" broadcasts (e.g., dedicated NOC/Skynet screens)
const EXCLUDED_FROM_ALL = new Set(['noc1', 'noc', 'skynet']);

// Default screen config for hybrid mode
const DEFAULT_SCREEN_CONFIG = {
  mode: 'hybrid',           // 'hybrid' | 'signage-only' | 'kiosk'
  interactiveUrl: '',        // URL for interactive mode (empty = auto-detect :5180)
  idleTimeout: 60,           // seconds before auto-return to signage
  touchToInteract: true      // whether touch switches to interactive
};

// Track current screen display modes in memory (signage | interactive)
const screenModes = new Map(); // screenId -> 'signage' | 'interactive'

function getScreenConfig(screenRow) {
  const stored = JSON.parse(screenRow?.config || '{}');
  return { ...DEFAULT_SCREEN_CONFIG, ...stored };
}

function mergeScreenConfig(existing, updates) {
  const current = { ...DEFAULT_SCREEN_CONFIG, ...existing };
  const merged = { ...current };
  if (updates.mode !== undefined) merged.mode = updates.mode;
  if (updates.interactiveUrl !== undefined) merged.interactiveUrl = updates.interactiveUrl;
  if (updates.idleTimeout !== undefined) merged.idleTimeout = Number(updates.idleTimeout);
  if (updates.touchToInteract !== undefined) merged.touchToInteract = Boolean(updates.touchToInteract);
  return merged;
}

// ===== DATABASE =====
const db = new Database(join(__dirname, 'signage.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS screens (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    group_id TEXT DEFAULT 'default',
    type TEXT DEFAULT 'browser',
    location TEXT,
    location_id TEXT,
    config TEXT DEFAULT '{}',
    last_seen INTEGER,
    status TEXT DEFAULT 'offline',
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );
  
  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    config TEXT DEFAULT '{}'
  );
  
  CREATE TABLE IF NOT EXISTS content_queue (
    id TEXT PRIMARY KEY,
    screen_id TEXT,
    content TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    expires_at INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );
  
  INSERT OR IGNORE INTO groups (id, name, description) VALUES 
    ('default', 'Default', 'All screens'),
    ('office', 'Office', 'Office displays'),
    ('kiosk', 'Kiosk', 'Field kiosks'),
    ('viewport', 'Viewport', 'UniFi Viewports');
`);

// ===== EXPRESS + SOCKET.IO =====
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// Panel Protocol — self-registration for Skynet Command Extension
app.get('/_panel', (req, res) => {
  const screens = db.prepare('SELECT id, name, status, type FROM screens').all();
  const onlineCount = screens.filter(s => connectedScreens.has(s.id)).length;
  res.json({
    app: 'signage',
    name: 'Skynet Signage',
    icon: 'monitor',
    version: '2.0',
    baseUrl: `http://${req.hostname}:${PORT}`,
    status: { screens: screens.length, online: onlineCount },
    panels: [
      {
        id: 'screen-status',
        title: 'SCREENS',
        type: 'status',
        endpoint: '/api/screens',
        refreshMs: 5000,
        fields: [
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'NAME' },
          { key: 'status', label: 'STATUS', color: { online: 'success', offline: 'danger' } },
          { key: 'type', label: 'TYPE' }
        ]
      },
      {
        id: 'controls',
        title: 'CONTROLS',
        type: 'controls',
        actions: [
          { label: 'RELOAD ALL', method: 'POST', endpoint: '/api/reload-all', color: 'orange' },
          { label: 'OFFICE LOOP', method: 'POST', endpoint: '/api/push', body: { target: 'all', type: 'playlist', content: 'playlist-5d0c4f2a' }, color: 'blue' }
        ]
      },
      {
        id: 'admin',
        title: 'ADMIN PANEL',
        type: 'iframe',
        url: '/',
        size: 'full'
      }
    ]
  });
});

// Serve static client build
app.use(express.static(join(__dirname, '../client/dist')));

// Serve video files from NAS
const VIDEO_BASE = '/Volumes/Parkwise/Skynet/video';
app.use('/video', (req, res, next) => {
  const filename = req.path.replace(/^\//, '');
  const subdirs = ['branding', 'signage', 'exports', 'welcome', 'campaigns', 'quotes', 'renderflow', 'alerts', 'announcements', 'gaiety'];
  for (const dir of subdirs) {
    const filePath = join(VIDEO_BASE, dir, filename);
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    }
  }
  const directPath = join(VIDEO_BASE, filename);
  if (fs.existsSync(directPath)) {
    return res.sendFile(directPath);
  }
  next();
});

// ===== SCREEN REGISTRY =====
const connectedScreens = new Map(); // screenId -> socket
const lastPushedContent = new Map(); // screenId -> last ContentPayload

// ===== PLAYLIST ROUTES =====
setupPlaylistRoutes(app, db, io, connectedScreens);

// ===== LOCATION & SETTINGS ROUTES =====
setupLocationRoutes(app, db, io, connectedScreens);

// ===== API ROUTES =====

// RSS Proxy for sports widgets (CORS workaround)
app.get('/api/proxy/rss', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL required' });
  
  // Only allow BBC Sport RSS feeds
  if (!url.includes('bbc.co.uk/sport')) {
    return res.status(403).json({ error: 'Only BBC Sport RSS feeds allowed' });
  }
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    
    // Parse RSS XML
    const items = [];
    const itemMatches = text.matchAll(/<item>([\s\S]*?)<\/item>/g);
    
    for (const match of itemMatches) {
      const itemXml = match[1];
      const title = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] 
                 || itemXml.match(/<title>(.*?)<\/title>/)?.[1] || '';
      const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1] || '';
      const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
      
      if (title) {
        items.push({ title, link, pubDate });
      }
    }
    
    res.json({ items: items.slice(0, 10) });
  } catch (err) {
    console.error('RSS fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch RSS' });
  }
});

// Phoenix Proxy (CORS workaround for sync status)
app.get('/api/proxy/phoenix', async (req, res) => {
  try {
    const response = await fetch('http://142.202.191.208:3000/api/sync/status');
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Phoenix fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch Phoenix status' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    screens: connectedScreens.size,
    uptime: process.uptime()
  });
});

// List all screens
app.get('/api/screens', (req, res) => {
  const { location_id, status } = req.query;
  let query = 'SELECT s.*, l.name as location_name FROM screens s LEFT JOIN locations l ON s.location_id = l.id';
  const conditions = [];
  const params = [];
  
  if (location_id) { conditions.push('s.location_id = ?'); params.push(location_id); }
  if (status === 'online') { 
    const onlineIds = Array.from(connectedScreens.keys());
    if (onlineIds.length) {
      conditions.push(`s.id IN (${onlineIds.map(() => '?').join(',')})`);
      params.push(...onlineIds);
    } else {
      conditions.push('1=0');
    }
  } else if (status === 'offline') {
    const onlineIds = Array.from(connectedScreens.keys());
    if (onlineIds.length) {
      conditions.push(`s.id NOT IN (${onlineIds.map(() => '?').join(',')})`);
      params.push(...onlineIds);
    }
  }
  
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY s.name';
  
  const screens = db.prepare(query).all(...params);
  const enriched = screens.map(s => ({
    ...s,
    config: { ...DEFAULT_SCREEN_CONFIG, ...JSON.parse(s.config || '{}') },
    connected: connectedScreens.has(s.id),
    currentMode: screenModes.get(s.id) || 'signage'
  }));
  res.json({ success: true, data: enriched });
});

// Get single screen
app.get('/api/screens/:id', (req, res) => {
  const screen = db.prepare('SELECT * FROM screens WHERE id = ?').get(req.params.id);
  if (!screen) return res.status(404).json({ error: 'Screen not found' });
  res.json({ 
    success: true, 
    data: { ...screen, config: JSON.parse(screen.config || '{}'), connected: connectedScreens.has(screen.id) }
  });
});

// Register/update screen
app.post('/api/screens', (req, res) => {
  const { id, name, group_id, type, location, location_id, config } = req.body;
  const screenId = id || `screen-${uuidv4().slice(0, 8)}`;
  
  db.prepare(`
    INSERT INTO screens (id, name, group_id, type, location, location_id, config, last_seen, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'registered')
    ON CONFLICT(id) DO UPDATE SET
      name = COALESCE(excluded.name, name),
      group_id = COALESCE(excluded.group_id, group_id),
      type = COALESCE(excluded.type, type),
      location = COALESCE(excluded.location, location),
      location_id = COALESCE(excluded.location_id, location_id),
      config = COALESCE(excluded.config, config)
  `).run(screenId, name || screenId, group_id || 'default', type || 'browser', location, location_id || null, JSON.stringify(config || {}), Date.now());
  
  const screen = db.prepare('SELECT * FROM screens WHERE id = ?').get(screenId);
  io.emit('screens:update', { screenId, status: 'registered' });
  res.json({ success: true, data: { ...screen, config: JSON.parse(screen.config || '{}') } });
});

// Update screen details (name, location, group)
app.put('/api/screens/:id', (req, res) => {
  const screen = db.prepare('SELECT * FROM screens WHERE id = ?').get(req.params.id);
  if (!screen) return res.status(404).json({ error: 'Screen not found' });
  
  const { name, group_id, location_id, location, type } = req.body;
  db.prepare(`
    UPDATE screens SET
      name = COALESCE(?, name),
      group_id = COALESCE(?, group_id),
      location_id = COALESCE(?, location_id),
      location = COALESCE(?, location),
      type = COALESCE(?, type)
    WHERE id = ?
  `).run(name || null, group_id || null, location_id !== undefined ? location_id : null, 
         location || null, type || null, req.params.id);
  
  const updated = db.prepare('SELECT * FROM screens WHERE id = ?').get(req.params.id);
  io.emit('screens:update', { screenId: req.params.id });
  res.json({ success: true, data: { ...updated, config: JSON.parse(updated.config || '{}'), connected: connectedScreens.has(req.params.id) } });
});

// Delete screen
app.delete('/api/screens/:id', (req, res) => {
  db.prepare('DELETE FROM screens WHERE id = ?').run(req.params.id);
  screenModes.delete(req.params.id);
  res.json({ success: true });
});

// ===== SCREEN CONFIG API =====

// Get screen config
app.get('/api/screens/:id/config', (req, res) => {
  const screen = db.prepare('SELECT * FROM screens WHERE id = ?').get(req.params.id);
  if (!screen) return res.status(404).json({ error: 'Screen not found' });
  const config = getScreenConfig(screen);
  const currentMode = screenModes.get(req.params.id) || 'signage';
  res.json({ success: true, data: { ...config, currentMode } });
});

// Update screen config
app.put('/api/screens/:id/config', (req, res) => {
  const screen = db.prepare('SELECT * FROM screens WHERE id = ?').get(req.params.id);
  if (!screen) return res.status(404).json({ error: 'Screen not found' });
  
  const existing = JSON.parse(screen.config || '{}');
  const merged = mergeScreenConfig(existing, req.body);
  
  db.prepare('UPDATE screens SET config = ? WHERE id = ?')
    .run(JSON.stringify(merged), req.params.id);
  
  // Push updated config to connected screen
  const socket = connectedScreens.get(req.params.id);
  if (socket) {
    socket.emit('screen-config', merged);
  }
  
  console.log(`⚙️  Screen config updated: ${req.params.id}`, merged);
  // Notify admin clients
  io.emit('screens:config-update', { screenId: req.params.id, config: merged });
  
  res.json({ success: true, data: merged });
});

// Force screen mode change from admin
app.post('/api/screens/:id/mode', (req, res) => {
  const { mode } = req.body; // 'signage' | 'interactive'
  if (!mode || !['signage', 'interactive'].includes(mode)) {
    return res.status(400).json({ error: 'mode must be "signage" or "interactive"' });
  }
  
  const socket = connectedScreens.get(req.params.id);
  if (!socket) {
    return res.status(404).json({ error: 'Screen not connected' });
  }
  
  socket.emit('set-mode', { mode });
  screenModes.set(req.params.id, mode);
  io.emit('screens:mode-update', { screenId: req.params.id, mode });
  
  console.log(`🔄 Screen mode forced: ${req.params.id} → ${mode}`);
  res.json({ success: true, screenId: req.params.id, mode });
});

// List groups
app.get('/api/groups', (req, res) => {
  const groups = db.prepare('SELECT * FROM groups').all();
  res.json({ success: true, data: groups });
});

// ===== PUSH API =====

// Helper: push content to a screen and remember it
function pushToScreen(screenId, socket, payload) {
  socket.emit('content', payload);
  // Remember last non-alert, non-clear content for auto-resume on reconnect
  if (payload.type !== 'alert' && payload.type !== 'clear' && payload.type !== 'reload') {
    lastPushedContent.set(screenId, payload);
  }
}

// Push content to screen(s)
app.post('/api/push', (req, res) => {
  const { target, type, content, priority = 0, duration } = req.body;
  // target: screen id, group id, or 'all'
  // type: 'url', 'widget', 'alert', 'media', 'clear'
  // content: depends on type
  
  const payload = { type, content, priority, duration, timestamp: Date.now() };
  let pushed = 0;
  
  if (target === 'all') {
    // Push to all connected screens (except excluded ones like noc1)
    connectedScreens.forEach((socket, screenId) => {
      if (!EXCLUDED_FROM_ALL.has(screenId)) {
        pushToScreen(screenId, socket, payload);
        pushed++;
      }
    });
  } else {
    // Check if target is a group
    const group = db.prepare('SELECT id FROM groups WHERE id = ?').get(target);
    if (group) {
      // Push to all screens in group
      const screens = db.prepare('SELECT id FROM screens WHERE group_id = ?').all(target);
      screens.forEach(s => {
        const socket = connectedScreens.get(s.id);
        if (socket) {
          pushToScreen(s.id, socket, payload);
          pushed++;
        }
      });
    } else {
      // Push to specific screen
      const socket = connectedScreens.get(target);
      if (socket) {
        pushToScreen(target, socket, payload);
        pushed++;
      }
    }
  }
  
  console.log(`📺 Pushed ${type} to ${pushed} screen(s) [target: ${target}]`);
  res.json({ success: true, pushed, target });
});

// Convenience endpoints
app.post('/api/push/url', (req, res) => {
  req.body.type = 'url';
  req.body.content = { url: req.body.url, title: req.body.title };
  return app._router.handle(Object.assign(req, { url: '/api/push' }), res, () => {});
});

app.post('/api/push/alert', (req, res) => {
  const { target = 'all', message, level = 'info', duration = 10000 } = req.body;
  const payload = { type: 'alert', content: { message, level }, duration, timestamp: Date.now() };
  
  let pushed = 0;
  const pushTo = (socket) => { socket.emit('content', payload); pushed++; };
  
  if (target === 'all') {
    connectedScreens.forEach((socket, screenId) => {
      if (!EXCLUDED_FROM_ALL.has(screenId)) pushTo(socket);
    });
  } else {
    const socket = connectedScreens.get(target);
    if (socket) pushTo(socket);
  }
  
  console.log(`🚨 Alert pushed to ${pushed} screen(s): ${message}`);
  res.json({ success: true, pushed });
});

// Manual reload all screens (use after deploys instead of auto-reload)
app.post('/api/reload-all', (req, res) => {
  const { target = 'all' } = req.body;
  let reloaded = 0;
  
  const reloadScreen = (socket) => { 
    socket.emit('content', { type: 'reload' }); 
    reloaded++; 
  };
  
  if (target === 'all') {
    connectedScreens.forEach((socket, screenId) => reloadScreen(socket));
  } else {
    const socket = connectedScreens.get(target);
    if (socket) reloadScreen(socket);
  }
  
  console.log(`🔄 Manual reload triggered for ${reloaded} screen(s)`);
  res.json({ success: true, reloaded });
});

app.post('/api/push/widget', (req, res) => {
  const { target = 'all', widget, config = {} } = req.body;
  const payload = { type: 'widget', content: { widget, config }, timestamp: Date.now() };
  
  let pushed = 0;
  const pushTo = (socket) => { socket.emit('content', payload); pushed++; };
  
  if (target === 'all') {
    connectedScreens.forEach((socket, screenId) => {
      if (!EXCLUDED_FROM_ALL.has(screenId)) pushTo(socket);
    });
  } else {
    const socket = connectedScreens.get(target);
    if (socket) pushTo(socket);
  }
  
  console.log(`🧩 Widget ${widget} pushed to ${pushed} screen(s)`);
  res.json({ success: true, pushed });
});

// Clear screen
app.post('/api/push/clear', (req, res) => {
  const { target = 'all' } = req.body;
  const payload = { type: 'clear', timestamp: Date.now() };
  
  let pushed = 0;
  const pushTo = (socket) => { socket.emit('content', payload); pushed++; };
  
  if (target === 'all') {
    connectedScreens.forEach((socket, screenId) => {
      if (!EXCLUDED_FROM_ALL.has(screenId)) pushTo(socket);
    });
  } else {
    const socket = connectedScreens.get(target);
    if (socket) pushTo(socket);
  }
  
  res.json({ success: true, pushed });
});

// ===== PRESET LAYOUTS API =====
// Pre-configured control room layouts combining dashboard + cameras

// List all presets
app.get('/api/presets', (req, res) => {
  const { category } = req.query;
  const presets = listPresets(category || null);
  const categories = getCategories();
  res.json({ success: true, presets, categories });
});

// Get single preset details
app.get('/api/presets/:id', (req, res) => {
  const preset = getPreset(req.params.id);
  if (!preset) {
    return res.status(404).json({ success: false, error: 'Preset not found' });
  }
  res.json({ success: true, preset: { id: req.params.id, ...preset } });
});

// Push preset to screen(s)
app.post('/api/push/preset', (req, res) => {
  const { target = 'all', presetId, overrides = {} } = req.body;
  
  const preset = getPreset(presetId);
  if (!preset) {
    return res.status(404).json({ success: false, error: `Preset '${presetId}' not found` });
  }
  
  // Merge overrides into config
  const config = { ...preset.config };
  if (overrides.siteIds && config.panels) {
    // Apply siteIds override to dashboard panels
    config.panels = config.panels.map(panel => {
      if (panel.widget === 'operations-dashboard' && panel.config) {
        return { ...panel, config: { ...panel.config, siteIds: overrides.siteIds } };
      }
      return panel;
    });
  }
  if (overrides.cameras && config.panels) {
    // Apply cameras override to camera panels
    config.panels = config.panels.map(panel => {
      if (panel.widget === 'camera-grid' && panel.config) {
        return { ...panel, config: { ...panel.config, cameras: overrides.cameras } };
      }
      return panel;
    });
  }
  
  const payload = { 
    type: 'widget', 
    content: { widget: preset.widget, config },
    timestamp: Date.now() 
  };
  
  let pushed = 0;
  const pushTo = (socket) => { socket.emit('content', payload); pushed++; };
  
  if (target === 'all') {
    connectedScreens.forEach((socket, screenId) => {
      if (!EXCLUDED_FROM_ALL.has(screenId)) pushTo(socket);
    });
  } else {
    // Check if target is a group
    const group = db.prepare('SELECT id FROM groups WHERE id = ?').get(target);
    if (group) {
      const screens = db.prepare('SELECT id FROM screens WHERE group_id = ?').all(target);
      screens.forEach(s => {
        const socket = connectedScreens.get(s.id);
        if (socket) pushTo(socket);
      });
    } else {
      const socket = connectedScreens.get(target);
      if (socket) pushTo(socket);
    }
  }
  
  console.log(`🎯 Preset "${preset.name}" pushed to ${pushed} screen(s) [target: ${target}]`);
  res.json({ success: true, pushed, preset: presetId, name: preset.name });
});

// ===== TEMPLATE DISPLAY SYSTEM =====
// Push pre-built templates with just data - beautiful output instantly

const VALID_TEMPLATES = [
  'task-complete',
  'alert', 
  'metrics',
  'announcement',
  'daily-digest'
];

// Display template - main entry point for template-based content
app.post('/api/display', (req, res) => {
  const { target = 'all', template, data, duration } = req.body;
  
  // Validate template name
  if (!template || !VALID_TEMPLATES.includes(template)) {
    return res.status(400).json({ 
      success: false, 
      error: `Invalid template. Valid templates: ${VALID_TEMPLATES.join(', ')}` 
    });
  }
  
  // Push as widget with template config
  const payload = { 
    type: 'widget', 
    content: { 
      widget: 'template',
      config: { template, data }
    }, 
    duration,
    timestamp: Date.now() 
  };
  
  let pushed = 0;
  const pushTo = (socket) => { socket.emit('content', payload); pushed++; };
  
  if (target === 'all') {
    connectedScreens.forEach((socket, screenId) => {
      if (!EXCLUDED_FROM_ALL.has(screenId)) pushTo(socket);
    });
  } else {
    const socket = connectedScreens.get(target);
    if (socket) pushTo(socket);
  }
  
  console.log(`📋 Template "${template}" pushed to ${pushed} screen(s)`);
  res.json({ success: true, pushed, template });
});

// List available templates
app.get('/api/templates', (req, res) => {
  res.json({
    templates: VALID_TEMPLATES,
    docs: {
      'task-complete': {
        description: 'Display completed agent task',
        fields: ['title', 'agent', 'agentEmoji?', 'duration?', 'highlights?', 'status', 'timestamp?']
      },
      'alert': {
        description: 'Display alert/notification',
        fields: ['level', 'title', 'message', 'source?', 'timestamp?', 'action?']
      },
      'metrics': {
        description: 'Display metrics/stats grid',
        fields: ['title', 'subtitle?', 'metrics[]', 'columns?', 'timestamp?']
      },
      'announcement': {
        description: 'Display large announcement',
        fields: ['title', 'message', 'icon?', 'style?', 'footer?']
      },
      'daily-digest': {
        description: 'Display daily work summary',
        fields: ['date', 'summary', 'items[]', 'stats?']
      }
    }
  });
});

// ===== REMOTION INTEGRATION =====

// Push content helper for auto-push callback
async function pushContent(options) {
  const { target, type, content, duration } = options;
  const payload = { type, content, duration, timestamp: Date.now() };
  
  let pushed = 0;
  if (target === 'all') {
    connectedScreens.forEach((socket, screenId) => {
      if (!EXCLUDED_FROM_ALL.has(screenId)) {
        socket.emit('content', payload);
        pushed++;
      }
    });
  } else {
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
      const socket = connectedScreens.get(target);
      if (socket) {
        socket.emit('content', payload);
        pushed++;
      }
    }
  }
  return pushed;
}

// List available Remotion compositions
app.get('/api/remotion/compositions', async (req, res) => {
  try {
    const data = await remotion.getCompositions();
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List dimension presets
app.get('/api/remotion/presets', async (req, res) => {
  try {
    const data = await remotion.getPresets();
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List branding presets
app.get('/api/remotion/branding', (req, res) => {
  res.json({ success: true, presets: remotion.BRANDING_PRESETS });
});

// Submit render job
app.post('/api/remotion/render', async (req, res) => {
  try {
    const {
      compositionId,
      preset,
      props = {},
      category = 'signage',
      tags = [],
      filename,
      pushOnComplete = true,
      pushTarget = 'all',
      pushDuration = null,
    } = req.body;

    let result;
    if (preset) {
      // Use branding preset
      result = await remotion.renderPreset(preset, {
        props,
        pushOnComplete,
        pushTarget,
        pushDuration,
      });
    } else if (compositionId) {
      // Custom render
      result = await remotion.submitRender({
        compositionId,
        props,
        category,
        tags,
        filename,
        pushOnComplete,
        pushTarget,
        pushDuration,
      });
    } else {
      return res.status(400).json({ success: false, error: 'compositionId or preset required' });
    }

    console.log(`🎬 Remotion render submitted: ${result.jobId}`);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Remotion render error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get job status
app.get('/api/remotion/jobs/:jobId', async (req, res) => {
  try {
    const job = await remotion.checkJob(req.params.jobId, pushContent);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }
    res.json({ success: true, job });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List all tracked jobs
app.get('/api/remotion/jobs', (req, res) => {
  const jobs = remotion.getJobs();
  res.json({ success: true, jobs });
});

// List available videos
app.get('/api/remotion/videos', async (req, res) => {
  try {
    const { category } = req.query;
    const data = await remotion.getVideos(category);
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Push existing video to screens
app.post('/api/remotion/push', async (req, res) => {
  const { videoId, target = 'all', duration = null, loop = false } = req.body;
  
  if (!videoId) {
    return res.status(400).json({ success: false, error: 'videoId required' });
  }

  const videoUrl = remotion.getVideoStreamUrl(videoId);
  const pushed = await pushContent({
    target,
    type: 'media',
    content: {
      url: videoUrl,
      type: 'video',
      loop,
    },
    duration,
  });

  console.log(`🎬 Pushed video ${videoId} to ${pushed} screen(s)`);
  res.json({ success: true, pushed, videoId, target });
});

// Render and push in one call (convenience endpoint)
app.post('/api/remotion/render-and-push', async (req, res) => {
  try {
    const {
      compositionId,
      preset,
      props = {},
      target = 'all',
      category = 'signage',
      tags = [],
    } = req.body;

    // Always push on complete
    let result;
    if (preset) {
      result = await remotion.renderPreset(preset, {
        props,
        pushOnComplete: true,
        pushTarget: target,
      });
    } else if (compositionId) {
      result = await remotion.submitRender({
        compositionId,
        props,
        category,
        tags,
        pushOnComplete: true,
        pushTarget: target,
      });
    } else {
      return res.status(400).json({ success: false, error: 'compositionId or preset required' });
    }

    console.log(`🎬 Render+Push job submitted: ${result.jobId} → ${target}`);
    res.json({ success: true, ...result, pushTarget: target });
  } catch (err) {
    console.error('Render+Push error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Background job poller - checks pending jobs every 5 seconds
setInterval(async () => {
  for (const [jobId, job] of remotion.renderQueue) {
    if (job.status !== 'completed' && job.status !== 'failed' && !job.completedAt) {
      try {
        await remotion.checkJob(jobId, pushContent);
      } catch (err) {
        console.error(`Job check failed for ${jobId}:`, err.message);
      }
    }
  }
}, 5000);

// ===== SOCKET.IO =====
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);
  
  // Screen registration
  socket.on('register', (data) => {
    const { screenId, name, type, group } = data;
    
    // Auto-register if not exists
    db.prepare(`
      INSERT INTO screens (id, name, group_id, type, last_seen, status)
      VALUES (?, ?, ?, ?, ?, 'online')
      ON CONFLICT(id) DO UPDATE SET
        last_seen = excluded.last_seen,
        status = 'online'
    `).run(screenId, name || screenId, group || 'default', type || 'browser', Date.now());
    
    connectedScreens.set(screenId, socket);
    socket.screenId = screenId;
    screenModes.set(screenId, 'signage'); // Default to signage on connect
    
    // Track connection event
    if (app.locals.recordConnectionEvent) {
      app.locals.recordConnectionEvent(screenId, 'connected', { name: name || screenId, type: type || 'browser' });
    }
    
    console.log(`📺 Screen registered: ${screenId} (${name || 'unnamed'})`);
    
    // Send current config to screen (legacy)
    const screen = db.prepare('SELECT * FROM screens WHERE id = ?').get(screenId);
    socket.emit('config', { screen: { ...screen, config: JSON.parse(screen.config || '{}') } });
    
    // Send screen-config for hybrid mode system
    const screenConfig = getScreenConfig(screen);
    socket.emit('screen-config', screenConfig);
    
    // Auto-resume: push last content back to the screen
    const lastContent = lastPushedContent.get(screenId);
    if (lastContent) {
      console.log(`📺 Auto-resuming ${lastContent.type} on ${screenId}`);
      setTimeout(() => socket.emit('content', lastContent), 500); // slight delay for client to settle
    }
    
    // Broadcast updated screen list
    io.emit('screens:update', { screenId, status: 'online' });
  });
  
  // Screen mode change (from client)
  socket.on('mode-change', (data) => {
    const { mode } = data; // 'signage' | 'interactive'
    if (socket.screenId && ['signage', 'interactive'].includes(mode)) {
      screenModes.set(socket.screenId, mode);
      console.log(`🔄 Screen ${socket.screenId} switched to ${mode} mode`);
      // Broadcast to admin clients
      io.emit('screens:mode-update', { screenId: socket.screenId, mode });
    }
  });
  
  // Heartbeat
  socket.on('heartbeat', () => {
    if (socket.screenId) {
      db.prepare('UPDATE screens SET last_seen = ?, status = ? WHERE id = ?')
        .run(Date.now(), 'online', socket.screenId);
    }
  });
  
  // Screenshot request
  socket.on('screenshot', (callback) => {
    // Screen will respond with screenshot data
    if (typeof callback === 'function') {
      callback({ requested: true });
    }
  });
  
  socket.on('disconnect', () => {
    if (socket.screenId) {
      connectedScreens.delete(socket.screenId);
      screenModes.delete(socket.screenId);
      db.prepare('UPDATE screens SET status = ? WHERE id = ?').run('offline', socket.screenId);
      
      // Track disconnection
      if (app.locals.recordConnectionEvent) {
        app.locals.recordConnectionEvent(socket.screenId, 'disconnected', {});
      }
      
      console.log(`📺 Screen disconnected: ${socket.screenId}`);
      io.emit('screens:update', { screenId: socket.screenId, status: 'offline' });
    }
  });
});

// ===== PANEL PROTOCOL — Self-registration with Skynet Command =====

async function registerWithRegistry() {
  try {
    // Fetch our own panel manifest (which is dynamic based on DB)
    const manifest = {
      app: 'signage',
      name: 'Skynet Signage',
      icon: 'monitor',
      version: '2.0',
      baseUrl: `http://localhost:${PORT}`,
      panels: [
        {
          id: 'screen-status',
          title: 'SCREENS',
          type: 'status',
          endpoint: '/api/screens',
          dataPath: 'data',
          refreshMs: 5000,
          fields: [
            { key: 'id', label: 'ID' },
            { key: 'name', label: 'NAME' },
            { key: 'status', label: 'STATUS', color: { online: 'success', offline: 'danger' } },
            { key: 'type', label: 'TYPE' }
          ]
        },
        {
          id: 'controls',
          title: 'CONTROLS',
          type: 'controls',
          actions: [
            { label: 'RELOAD ALL', method: 'POST', endpoint: '/api/reload-all', color: 'orange' },
            { label: 'CLEAR ALL', method: 'POST', endpoint: '/api/push/clear', body: { target: 'all' }, color: 'red', confirm: true, confirmText: 'CLEAR ALL SCREENS?' },
            { label: 'PUSH ALERT', method: 'POST', endpoint: '/api/push/alert', body: { target: 'all', message: 'Test alert from Skynet Command', level: 'info', duration: 5000 }, color: 'amber' },
            { label: 'OFFICE LOOP', method: 'POST', endpoint: '/api/push', body: { target: 'all', type: 'playlist', content: 'playlist-5d0c4f2a' }, color: 'blue' }
          ]
        },
        {
          id: 'admin',
          title: 'ADMIN PANEL',
          type: 'iframe',
          url: '/',
          size: 'full'
        }
      ]
    };

    const resp = await fetch('http://localhost:3210/api/panels/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manifest)
    });
    if (resp.ok) {
      console.log('📋 Registered with Skynet panel registry');
    }
  } catch (err) {
    // Registry might not be running yet, that's fine
  }
}

// Register on startup and re-register periodically (heartbeat)
setTimeout(registerWithRegistry, 3000);
setInterval(registerWithRegistry, 60000);

// ===== ADMIN UI =====
app.get('/admin', (req, res) => {
  res.sendFile(join(__dirname, '../client/dist/index.html'));
});

// Fallback to client
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../client/dist/index.html'));
});

// ===== START =====
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║     SKYNET SIGNAGE - Display Control System   ║
╠═══════════════════════════════════════════════╣
║  Server:  http://localhost:${PORT}               ║
║  Admin:   http://localhost:${PORT}/admin          ║
║  API:     http://localhost:${PORT}/api            ║
╚═══════════════════════════════════════════════╝
  `);
  
  // Auto-reload disabled - was causing constant screen resets
  // Use POST /api/reload-all to manually trigger if needed after deploys
  // setTimeout(() => {
  //   if (connectedScreens.size > 0) {
  //     console.log(`🔄 Auto-reloading ${connectedScreens.size} screen(s) after deploy...`);
  //     for (const [screenId, socket] of connectedScreens) {
  //       socket.emit('content', { type: 'reload' });
  //     }
  //   }
  // }, 5000);
});
