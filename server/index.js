import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as remotion from './remotion-integration.js';
import { setupPlaylistRoutes } from './playlist-routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3400;

// Screens excluded from "all" broadcasts (e.g., dedicated NOC/Skynet screens)
const EXCLUDED_FROM_ALL = new Set(['noc1', 'noc', 'skynet']);

// ===== DATABASE =====
const db = new Database(join(__dirname, 'signage.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS screens (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    group_id TEXT DEFAULT 'default',
    type TEXT DEFAULT 'browser',
    location TEXT,
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

// Serve static client build
app.use(express.static(join(__dirname, '../client/dist')));

// ===== SCREEN REGISTRY =====
const connectedScreens = new Map(); // screenId -> socket

// ===== PLAYLIST ROUTES =====
setupPlaylistRoutes(app, db, io, connectedScreens);

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
  const screens = db.prepare('SELECT * FROM screens ORDER BY name').all();
  const enriched = screens.map(s => ({
    ...s,
    config: JSON.parse(s.config || '{}'),
    connected: connectedScreens.has(s.id)
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
  const { id, name, group_id, type, location, config } = req.body;
  const screenId = id || `screen-${uuidv4().slice(0, 8)}`;
  
  db.prepare(`
    INSERT INTO screens (id, name, group_id, type, location, config, last_seen, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'registered')
    ON CONFLICT(id) DO UPDATE SET
      name = COALESCE(excluded.name, name),
      group_id = COALESCE(excluded.group_id, group_id),
      type = COALESCE(excluded.type, type),
      location = COALESCE(excluded.location, location),
      config = COALESCE(excluded.config, config)
  `).run(screenId, name || screenId, group_id || 'default', type || 'browser', location, JSON.stringify(config || {}));
  
  const screen = db.prepare('SELECT * FROM screens WHERE id = ?').get(screenId);
  res.json({ success: true, data: { ...screen, config: JSON.parse(screen.config || '{}') } });
});

// Delete screen
app.delete('/api/screens/:id', (req, res) => {
  db.prepare('DELETE FROM screens WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// List groups
app.get('/api/groups', (req, res) => {
  const groups = db.prepare('SELECT * FROM groups').all();
  res.json({ success: true, data: groups });
});

// ===== PUSH API =====

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
        socket.emit('content', payload);
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
    
    console.log(`📺 Screen registered: ${screenId} (${name || 'unnamed'})`);
    
    // Send current config to screen
    const screen = db.prepare('SELECT * FROM screens WHERE id = ?').get(screenId);
    socket.emit('config', { screen: { ...screen, config: JSON.parse(screen.config || '{}') } });
    
    // Broadcast updated screen list
    io.emit('screens:update', { screenId, status: 'online' });
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
      db.prepare('UPDATE screens SET status = ? WHERE id = ?').run('offline', socket.screenId);
      console.log(`📺 Screen disconnected: ${socket.screenId}`);
      io.emit('screens:update', { screenId: socket.screenId, status: 'offline' });
    }
  });
});

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
