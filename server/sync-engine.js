/**
 * Sync Engine — Coordinated multi-screen playback
 * 
 * Manages sync groups: sets of screens that play content in lockstep.
 * 
 * Sync modes:
 *   mirror        — all screens show identical content at same index
 *   complementary — screens show different items from same playlist (round-robin roles)
 *   span          — video wall: each screen shows a portion of content
 * 
 * Protocol (WebSocket messages):
 *   Server → Player:
 *     sync:tick     { groupId, itemIndex, timestamp, duration }
 *     sync:seek     { groupId, itemIndex }
 *     sync:state    { groupId, playing, itemIndex, startedAt, playlist }
 *     command:reload
 *     command:screenshot
 *     command:identify
 *     content:update { screenId, playlist, items }
 *
 *   Player → Server:
 *     player:register  { screenId, capabilities, platform, resolution, orientation }
 *     player:heartbeat { screenId, status, currentItem, bufferHealth, screenshot? }
 *     player:ready     { screenId, groupId }
 *     sync:ack         { screenId, groupId, itemIndex }
 */

import { v4 as uuidv4 } from 'uuid';

// In-memory sync state per group
const syncState = new Map(); // groupId -> { playing, itemIndex, startedAt, playlist, tickTimer }

// screenModes is managed by the main server but we need to set it for players
let screenModes = new Map();

export function setupSyncEngine(app, db, io, connectedScreens, _screenModes) {
  if (_screenModes) screenModes = _screenModes;

  // Ensure tables exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mode TEXT DEFAULT 'mirror',
      leader_screen_id TEXT,
      playlist_id TEXT,
      config TEXT DEFAULT '{}',
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE SET NULL
    );
  `);

  // ===== SYNC GROUP CRUD API =====

  app.get('/api/sync-groups', (req, res) => {
    try {
      let query = `
        SELECT sg.*,
          (SELECT COUNT(*) FROM screens WHERE sync_group = sg.id) as screen_count,
          p.name as playlist_name
        FROM sync_groups sg
        LEFT JOIN playlists p ON sg.playlist_id = p.id`;
      const params = [];
      if (req.clientId && req.query.all_clients !== 'true') {
        query += ' WHERE sg.client_id = ?';
        params.push(req.clientId);
      }
      query += ' ORDER BY sg.name';
      const groups = db.prepare(query).all(...params);

      const enriched = groups.map(g => {
        const screens = db.prepare('SELECT id, name, status, platform, resolution, orientation FROM screens WHERE sync_group = ?').all(g.id);
        const state = syncState.get(g.id);
        return {
          ...g,
          config: JSON.parse(g.config || '{}'),
          screens: screens.map(s => ({ ...s, connected: connectedScreens.has(s.id) })),
          state: state ? { playing: state.playing, itemIndex: state.itemIndex, startedAt: state.startedAt } : null,
        };
      });

      res.json({ success: true, data: enriched });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/sync-groups/:id', (req, res) => {
    try {
      const group = db.prepare('SELECT * FROM sync_groups WHERE id = ?').get(req.params.id);
      if (!group) return res.status(404).json({ success: false, error: 'Sync group not found' });

      const screens = db.prepare('SELECT * FROM screens WHERE sync_group = ?').all(req.params.id);
      const state = syncState.get(req.params.id);

      res.json({
        success: true,
        data: {
          ...group,
          config: JSON.parse(group.config || '{}'),
          screens: screens.map(s => ({
            ...s,
            config: JSON.parse(s.config || '{}'),
            capabilities: JSON.parse(s.capabilities || '{}'),
            connected: connectedScreens.has(s.id),
          })),
          state: state ? { playing: state.playing, itemIndex: state.itemIndex, startedAt: state.startedAt } : null,
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post('/api/sync-groups', (req, res) => {
    try {
      const { name, mode = 'mirror', leader_screen_id, playlist_id, config } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'name required' });

      const id = `sync-${uuidv4().slice(0, 8)}`;
      const assignedClient = req.body.client_id || req.clientId || 'parkwise';
      db.prepare(`
        INSERT INTO sync_groups (id, name, mode, leader_screen_id, playlist_id, config, client_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(id, name, mode, leader_screen_id || null, playlist_id || null, JSON.stringify(config || {}), assignedClient);

      const group = db.prepare('SELECT * FROM sync_groups WHERE id = ?').get(id);
      console.log(`🔗 Sync group created: ${name} (${mode})`);
      res.json({ success: true, data: { ...group, config: JSON.parse(group.config || '{}') } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.put('/api/sync-groups/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM sync_groups WHERE id = ?').get(req.params.id);
      if (!existing) return res.status(404).json({ success: false, error: 'Not found' });

      const { name, mode, leader_screen_id, playlist_id, config } = req.body;
      db.prepare(`
        UPDATE sync_groups SET
          name = COALESCE(?, name),
          mode = COALESCE(?, mode),
          leader_screen_id = COALESCE(?, leader_screen_id),
          playlist_id = COALESCE(?, playlist_id),
          config = COALESCE(?, config)
        WHERE id = ?
      `).run(
        name || null, mode || null,
        leader_screen_id !== undefined ? leader_screen_id : null,
        playlist_id !== undefined ? playlist_id : null,
        config ? JSON.stringify(config) : null,
        req.params.id
      );

      const updated = db.prepare('SELECT * FROM sync_groups WHERE id = ?').get(req.params.id);
      res.json({ success: true, data: { ...updated, config: JSON.parse(updated.config || '{}') } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete('/api/sync-groups/:id', (req, res) => {
    try {
      // Unassign screens
      db.prepare('UPDATE screens SET sync_group = NULL WHERE sync_group = ?').run(req.params.id);
      // Stop sync if running
      stopSync(req.params.id);
      db.prepare('DELETE FROM sync_groups WHERE id = ?').run(req.params.id);
      console.log(`🔗 Sync group deleted: ${req.params.id}`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Assign screens to sync group
  app.post('/api/sync-groups/:id/screens', (req, res) => {
    try {
      const { screenIds } = req.body;
      if (!Array.isArray(screenIds)) return res.status(400).json({ success: false, error: 'screenIds[] required' });

      const group = db.prepare('SELECT * FROM sync_groups WHERE id = ?').get(req.params.id);
      if (!group) return res.status(404).json({ success: false, error: 'Group not found' });

      const stmt = db.prepare('UPDATE screens SET sync_group = ? WHERE id = ?');
      let updated = 0;
      for (const sid of screenIds) {
        updated += stmt.run(req.params.id, sid).changes;
      }

      console.log(`🔗 Assigned ${updated} screen(s) to sync group ${group.name}`);
      io.emit('screens:update', {});
      res.json({ success: true, updated });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Remove screen from sync group
  app.delete('/api/sync-groups/:id/screens/:screenId', (req, res) => {
    try {
      db.prepare('UPDATE screens SET sync_group = NULL WHERE id = ? AND sync_group = ?')
        .run(req.params.screenId, req.params.id);
      io.emit('screens:update', {});
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ===== SYNC CONTROL API =====

  // Start synchronised playback
  app.post('/api/sync-groups/:id/play', (req, res) => {
    try {
      const group = db.prepare('SELECT * FROM sync_groups WHERE id = ?').get(req.params.id);
      if (!group) return res.status(404).json({ success: false, error: 'Group not found' });

      const playlistId = req.body.playlist_id || group.playlist_id;
      if (!playlistId) return res.status(400).json({ success: false, error: 'No playlist assigned' });

      const playlist = db.prepare('SELECT * FROM playlists WHERE id = ?').get(playlistId);
      if (!playlist) return res.status(404).json({ success: false, error: 'Playlist not found' });

      const items = JSON.parse(playlist.items || '[]');
      if (items.length === 0) return res.status(400).json({ success: false, error: 'Playlist is empty' });

      startSync(req.params.id, group, playlist, items);

      console.log(`▶️  Sync group ${group.name}: started playback (${items.length} items)`);
      res.json({ success: true, playing: true, items: items.length });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Stop synchronised playback
  app.post('/api/sync-groups/:id/stop', (req, res) => {
    try {
      stopSync(req.params.id);
      res.json({ success: true, playing: false });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Seek to specific item
  app.post('/api/sync-groups/:id/seek', (req, res) => {
    try {
      const { itemIndex } = req.body;
      const state = syncState.get(req.params.id);
      if (!state) return res.status(400).json({ success: false, error: 'Group not playing' });

      state.itemIndex = itemIndex;
      broadcastToGroup(req.params.id, 'sync:seek', { groupId: req.params.id, itemIndex });
      res.json({ success: true, itemIndex });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get sync state
  app.get('/api/sync-groups/:id/state', (req, res) => {
    const state = syncState.get(req.params.id);
    res.json({
      success: true,
      data: state ? { playing: state.playing, itemIndex: state.itemIndex, startedAt: state.startedAt } : { playing: false }
    });
  });

  // Send identify command (flash screen ID)
  app.post('/api/sync-groups/:id/identify', (req, res) => {
    broadcastToGroup(req.params.id, 'command:identify', {});
    res.json({ success: true });
  });

  // Request screenshots from group
  app.post('/api/sync-groups/:id/screenshot', (req, res) => {
    broadcastToGroup(req.params.id, 'command:screenshot', {});
    res.json({ success: true });
  });

  // ===== SCREEN CAPABILITIES UPDATE =====

  app.put('/api/screens/:id/capabilities', (req, res) => {
    try {
      const { platform, resolution, orientation, capabilities } = req.body;
      db.prepare(`
        UPDATE screens SET
          platform = COALESCE(?, platform),
          resolution = COALESCE(?, resolution),
          orientation = COALESCE(?, orientation),
          capabilities = COALESCE(?, capabilities)
        WHERE id = ?
      `).run(
        platform || null,
        resolution || null,
        orientation || null,
        capabilities ? JSON.stringify(capabilities) : null,
        req.params.id
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ===== PLAYER DOWNLOAD PAGE =====

  app.get('/player', (req, res) => {
    const port = req.socket.localPort || 3400;
    const serverUrl = `${req.protocol}://${req.hostname}:${port}`;
    res.send(playerPageHtml(serverUrl));
  });

  // ===== INTERNAL SYNC FUNCTIONS =====

  function getGroupScreenSockets(groupId) {
    const screens = db.prepare('SELECT id FROM screens WHERE sync_group = ?').all(groupId);
    const sockets = [];
    for (const s of screens) {
      const sock = connectedScreens.get(s.id);
      if (sock) sockets.push({ screenId: s.id, socket: sock });
    }
    return sockets;
  }

  function broadcastToGroup(groupId, event, data) {
    const sockets = getGroupScreenSockets(groupId);
    for (const { socket } of sockets) {
      socket.emit(event, data);
    }
    return sockets.length;
  }

  function startSync(groupId, group, playlist, items) {
    // Stop existing sync if running
    stopSync(groupId);

    const config = JSON.parse(group.config || '{}');
    const mode = group.mode || 'mirror';

    const state = {
      playing: true,
      itemIndex: 0,
      startedAt: Date.now(),
      items,
      playlist,
      mode,
      config,
      tickTimer: null,
    };

    syncState.set(groupId, state);

    // Push initial content to all group screens
    pushSyncContent(groupId, state, group);

    // Set up tick timer — advances to next item when duration expires
    const advanceItem = () => {
      if (!state.playing) return;

      const currentItem = state.items[state.itemIndex];
      const duration = (currentItem?.duration || 30) * 1000;

      state.tickTimer = setTimeout(() => {
        if (!state.playing) return;

        // Advance
        const nextIndex = (state.itemIndex + 1) % state.items.length;
        state.itemIndex = nextIndex;
        state.startedAt = Date.now();

        // Push sync tick
        const tickData = {
          groupId,
          itemIndex: nextIndex,
          timestamp: Date.now(),
          duration: state.items[nextIndex]?.duration || 30,
        };

        broadcastToGroup(groupId, 'sync:tick', tickData);
        pushSyncContent(groupId, state, group);

        // Schedule next advance
        advanceItem();
      }, duration);
    };

    advanceItem();

    // Broadcast full state to admin
    io.emit('sync:state-update', { groupId, playing: true, itemIndex: 0, startedAt: state.startedAt });
  }

  function stopSync(groupId) {
    const state = syncState.get(groupId);
    if (state) {
      state.playing = false;
      if (state.tickTimer) clearTimeout(state.tickTimer);
      syncState.delete(groupId);
    }
    io.emit('sync:state-update', { groupId, playing: false });
  }

  function pushSyncContent(groupId, state, group) {
    const mode = state.mode;
    const sockets = getGroupScreenSockets(groupId);
    const item = state.items[state.itemIndex];
    if (!item) return;

    for (let i = 0; i < sockets.length; i++) {
      const { screenId, socket } = sockets[i];
      let contentItem = item;

      if (mode === 'complementary') {
        // Each screen gets a different item (round-robin offset)
        const offsetIndex = (state.itemIndex + i) % state.items.length;
        contentItem = state.items[offsetIndex];
      }
      // 'span' mode: all get same item but with a viewport offset (handled client-side via config)
      // 'mirror' mode: all get same item

      const payload = buildContentPayload(contentItem, {
        syncGroup: groupId,
        syncMode: mode,
        screenIndex: i,
        totalScreens: sockets.length,
        itemIndex: mode === 'complementary' ? (state.itemIndex + i) % state.items.length : state.itemIndex,
      });

      socket.emit('content', payload);
    }
  }

  function buildContentPayload(item, syncMeta) {
    const base = {
      timestamp: Date.now(),
      source: 'sync-engine',
      syncMeta,
    };

    if (item.contentType === 'video' || item.contentType === 'media') {
      return { ...base, type: 'media', content: { url: item.url || `/video/${item.contentId}`, type: 'video', loop: false } };
    }
    if (item.contentType === 'url') {
      return { ...base, type: 'url', content: { url: item.url } };
    }
    if (item.contentType === 'widget') {
      return { ...base, type: 'widget', content: { widget: item.widget, config: item.config || {} } };
    }
    if (item.contentType === 'template') {
      return { ...base, type: 'widget', content: { widget: 'template', config: { template: item.contentId, data: item.config || {} } } };
    }
    // Fallback
    return { ...base, type: 'widget', content: { widget: item.widget || 'clock', config: item.config || {} } };
  }

  // ===== WEBSOCKET SYNC EVENTS (player → server) =====

  function setupSocketSync(socket) {
    // Enhanced player registration with capabilities
    socket.on('player:register', (data) => {
      const { screenId, capabilities, platform, resolution, orientation } = data;
      if (!screenId) return;

      // Update screen record with capabilities
      db.prepare(`
        UPDATE screens SET
          platform = COALESCE(?, platform),
          resolution = COALESCE(?, resolution),
          orientation = COALESCE(?, orientation),
          capabilities = COALESCE(?, capabilities),
          last_seen = ?,
          status = 'online'
        WHERE id = ?
      `).run(
        platform || null,
        resolution || null,
        orientation || null,
        capabilities ? JSON.stringify(capabilities) : null,
        Date.now(),
        screenId
      );

      connectedScreens.set(screenId, socket);
      socket.screenId = screenId;
      screenModes.set(screenId, 'signage');

      console.log(`🎮 Player registered: ${screenId} (${platform || 'unknown'}, ${resolution || '?'})`);

      // If screen is in a sync group, send current state
      const screen = db.prepare('SELECT sync_group FROM screens WHERE id = ?').get(screenId);
      if (screen?.sync_group) {
        const state = syncState.get(screen.sync_group);
        if (state && state.playing) {
          socket.emit('sync:state', {
            groupId: screen.sync_group,
            playing: true,
            itemIndex: state.itemIndex,
            startedAt: state.startedAt,
            playlist: state.playlist ? {
              id: state.playlist.id,
              name: state.playlist.name,
              items: state.items,
            } : null,
          });
        }
      }

      io.emit('screens:update', { screenId, status: 'online' });
    });

    // Enhanced heartbeat with player status
    socket.on('player:heartbeat', (data) => {
      const { screenId, status, currentItem, bufferHealth, screenshot } = data;
      if (!screenId) return;

      db.prepare('UPDATE screens SET last_seen = ?, status = ? WHERE id = ?')
        .run(Date.now(), status || 'online', screenId);

      // Store screenshot if provided (base64)
      if (screenshot) {
        // Store in memory for admin retrieval (don't persist to DB — too large)
        if (!app.locals.screenshots) app.locals.screenshots = new Map();
        app.locals.screenshots.set(screenId, { data: screenshot, timestamp: Date.now() });
      }
    });

    // Player acknowledges sync tick
    socket.on('sync:ack', (data) => {
      // Could track ack latency for drift detection
      const { screenId, groupId, itemIndex } = data;
      // Future: detect drift and re-sync if needed
    });

    // Player reports ready (finished loading)
    socket.on('player:ready', (data) => {
      const { screenId, groupId } = data;
      console.log(`✅ Player ready: ${screenId} in group ${groupId}`);
    });

    // Screenshot response from player
    socket.on('screenshot:response', (data) => {
      const { screenId, image } = data;
      if (!app.locals.screenshots) app.locals.screenshots = new Map();
      app.locals.screenshots.set(screenId, { data: image, timestamp: Date.now() });
      io.emit('screenshot:available', { screenId, timestamp: Date.now() });
    });
  }

  // Get screenshot for a screen
  app.get('/api/screens/:id/screenshot', (req, res) => {
    const screenshots = app.locals.screenshots || new Map();
    const ss = screenshots.get(req.params.id);
    if (!ss) return res.status(404).json({ success: false, error: 'No screenshot available' });
    res.json({ success: true, data: ss });
  });

  // ===== PLAYER DOWNLOAD PAGE HTML =====

  function playerPageHtml(serverUrl) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Skynet Signage Player</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Antonio:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #07080a; color: #e8eaed; font-family: Antonio, sans-serif; min-height: 100vh; }
  body::before { content: ''; position: fixed; inset: 0; background-image: linear-gradient(rgba(249,115,22,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,0.02) 1px, transparent 1px); background-size: 50px 50px; pointer-events: none; }
  .container { max-width: 900px; margin: 0 auto; padding: 40px 24px; position: relative; z-index: 1; }
  .header { display: flex; align-items: center; gap: 16px; margin-bottom: 48px; }
  .logo { width: 48px; height: 48px; background: rgba(249,115,22,0.2); border: 2px solid rgba(249,115,22,0.5); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
  h1 { font-size: 32px; font-weight: 700; letter-spacing: 4px; color: #F97316; }
  .subtitle { font-size: 14px; color: #6b7280; letter-spacing: 3px; }
  .bar { height: 3px; background: linear-gradient(90deg, #F97316, rgba(249,115,22,0.3), transparent); border-radius: 0 20px 20px 0; margin-bottom: 32px; }
  .section { margin-bottom: 40px; }
  .section h2 { font-size: 18px; letter-spacing: 3px; color: #F97316; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
  .card { background: rgba(13,15,18,0.8); border: 1px solid rgba(249,115,22,0.1); border-radius: 16px; padding: 24px; margin-bottom: 16px; transition: border-color 0.3s; }
  .card:hover { border-color: rgba(249,115,22,0.3); }
  .card h3 { font-size: 20px; margin-bottom: 8px; }
  .card p { font-size: 14px; color: #9ca3af; line-height: 1.6; font-family: system-ui, sans-serif; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 2px; margin-right: 8px; }
  .badge-green { background: rgba(16,185,129,0.2); color: #34d399; border: 1px solid rgba(16,185,129,0.3); }
  .badge-blue { background: rgba(96,165,250,0.2); color: #60a5fa; border: 1px solid rgba(96,165,250,0.3); }
  .badge-purple { background: rgba(167,139,250,0.2); color: #a78bfa; border: 1px solid rgba(167,139,250,0.3); }
  .badge-amber { background: rgba(251,191,36,0.2); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); }
  .code { background: #151820; border: 1px solid #1f2937; border-radius: 8px; padding: 16px; font-family: 'SF Mono', Consolas, monospace; font-size: 13px; color: #d1d5db; overflow-x: auto; margin: 12px 0; white-space: pre; }
  .btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 10px; font-family: Antonio, sans-serif; font-size: 15px; font-weight: 600; letter-spacing: 2px; text-decoration: none; transition: all 0.3s; cursor: pointer; border: none; }
  .btn-primary { background: #F97316; color: #07080a; }
  .btn-primary:hover { background: #EA580C; }
  .btn-outline { background: transparent; color: #F97316; border: 1px solid rgba(249,115,22,0.4); }
  .btn-outline:hover { background: rgba(249,115,22,0.1); }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; }
  .step { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 16px; }
  .step-num { width: 32px; height: 32px; background: rgba(249,115,22,0.2); color: #F97316; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
  .config-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
  .config-row label { width: 120px; font-size: 13px; color: #6b7280; letter-spacing: 1px; }
  .config-row input, .config-row select { background: #151820; border: 1px solid #1f2937; border-radius: 8px; padding: 8px 12px; color: #e8eaed; font-family: system-ui; font-size: 14px; flex: 1; }
  .server-url { color: #F97316; font-weight: 600; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="logo">📺</div>
    <div>
      <h1>SKYNET SIGNAGE PLAYER</h1>
      <div class="subtitle">DISPLAY MANAGEMENT SYSTEM</div>
    </div>
  </div>
  <div class="bar"></div>

  <!-- Server Info -->
  <div class="section">
    <h2>🔗 SERVER CONNECTION</h2>
    <div class="card">
      <p>Connect your player to this signage server:</p>
      <div class="code">${serverUrl}</div>
      <p style="margin-top:8px; font-size:12px; color:#6b7280;">WebSocket endpoint: <span class="server-url">${serverUrl}</span> (Socket.IO)</p>
    </div>
  </div>

  <!-- Quick Start: Browser -->
  <div class="section">
    <h2>🌐 BROWSER PLAYER (QUICKEST)</h2>
    <div class="card">
      <span class="badge badge-green">READY NOW</span>
      <h3>Open in any browser</h3>
      <p>No installation needed. Works on any device with a web browser.</p>
      <div class="step" style="margin-top:16px;">
        <div class="step-num">1</div>
        <div><p>Open this URL on your display screen:</p>
          <div class="code">${serverUrl}?screen=YOUR_SCREEN_ID</div>
        </div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div><p>Replace <code>YOUR_SCREEN_ID</code> with a unique name (e.g., <code>pavilion-1</code>, <code>entrance-left</code>)</p></div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div><p>Click to go fullscreen, then manage from the admin dashboard.</p></div>
      </div>
      <div style="margin-top:16px; display:flex; gap:12px; flex-wrap:wrap;">
        <a href="?screen=player-test" class="btn btn-primary">OPEN TEST PLAYER</a>
        <a href="/" class="btn btn-outline">ADMIN DASHBOARD</a>
      </div>
    </div>
  </div>

  <!-- Platform Players -->
  <div class="section">
    <h2>💻 DEDICATED PLAYERS</h2>
    <div class="grid">
      <div class="card">
        <span class="badge badge-blue">WINDOWS</span>
        <h3>Windows Player</h3>
        <p>Standalone app for Windows PCs. Auto-starts, runs in kiosk mode, handles crashes gracefully.</p>
        <p style="margin-top:12px; color:#60a5fa; font-size:13px;">⏳ Coming soon — use browser player for now</p>
      </div>
      <div class="card">
        <span class="badge badge-purple">RASPBERRY PI</span>
        <h3>Pi Player</h3>
        <p>Lightweight player for Raspberry Pi. Runs in Chromium kiosk mode with auto-recovery.</p>
        <p style="margin-top:12px; color:#a78bfa; font-size:13px;">⏳ Coming soon — use browser player for now</p>
      </div>
      <div class="card">
        <span class="badge badge-amber">ANDROID</span>
        <h3>Android Player</h3>
        <p>APK for Android TV and tablets. Stays in foreground, prevents sleep.</p>
        <p style="margin-top:12px; color:#fbbf24; font-size:13px;">⏳ Coming soon — use browser player for now</p>
      </div>
    </div>
  </div>

  <!-- Sync Groups -->
  <div class="section">
    <h2>🔗 SYNCHRONISED PLAYBACK</h2>
    <div class="card">
      <h3>Multi-Screen Sync</h3>
      <p>Group screens together for coordinated playback. Three sync modes:</p>
      <div style="margin-top:16px;">
        <div class="step"><div class="step-num">M</div><div><p><strong>Mirror</strong> — All screens show identical content in lockstep.</p></div></div>
        <div class="step"><div class="step-num">C</div><div><p><strong>Complementary</strong> — Screens show different items from the same playlist (e.g., 3 screens showing items 1, 2, 3 respectively).</p></div></div>
        <div class="step"><div class="step-num">S</div><div><p><strong>Span</strong> — Video wall mode. Content spans across multiple screens as one large display.</p></div></div>
      </div>
      <p style="margin-top:16px;">Configure sync groups in the <a href="/#sync" style="color:#F97316;">admin dashboard</a>.</p>
    </div>
  </div>

  <!-- Connection Protocol -->
  <div class="section">
    <h2>📡 PLAYER PROTOCOL</h2>
    <div class="card">
      <h3>WebSocket Messages</h3>
      <p>Players communicate via Socket.IO. Key message types:</p>
      <div class="code">// Player → Server
player:register  { screenId, platform, resolution, orientation, capabilities }
player:heartbeat { screenId, status, currentItem, bufferHealth }
player:ready     { screenId, groupId }
sync:ack         { screenId, groupId, itemIndex }

// Server → Player
content:update   { playlist, items }
sync:tick        { groupId, itemIndex, timestamp, duration }
sync:seek        { groupId, itemIndex }
sync:state       { groupId, playing, itemIndex, startedAt, playlist }
command:reload
command:screenshot
command:identify</div>
    </div>
  </div>

  <div style="text-align:center; padding:32px 0; color:#374151; font-size:13px; letter-spacing:2px;">
    SKYNET SIGNAGE v2.0 — PARKWISE
  </div>
</div>
</body>
</html>`;
  }

  // ===== EXPOSE SOCKET SETUP =====
  // Called from main index.js for each new socket connection
  return { setupSocketSync };
}
