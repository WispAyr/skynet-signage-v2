/**
 * Multi-Tenant Client Management
 * 
 * Each client gets isolated: locations, screens, playlists, schedules,
 * announcements, sync groups. Content inherits client branding.
 * 
 * Default client: "parkwise" — all existing data migrated to this client.
 */

import { v4 as uuidv4 } from 'uuid';

const DEFAULT_BRANDING = {
  primaryColor: '#F97316',
  secondaryColor: '#1E293B',
  accentColor: '#F59E0B',
  backgroundColor: '#07080a',
  textColor: '#e8eaed',
  fontFamily: 'Antonio, sans-serif',
  fontFamilyBody: 'system-ui, -apple-system, sans-serif',
  logoPosition: 'top-left',
  theme: 'dark',
};

export function setupClientRoutes(app, db, io) {

  // ===== ENSURE SCHEMA =====
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      logo_url TEXT,
      branding TEXT DEFAULT '{}',
      domain TEXT,
      contact_name TEXT,
      contact_email TEXT,
      plan TEXT DEFAULT 'basic',
      active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    );
  `);

  // Add client_id to all tenant tables (safe — catches duplicate column errors)
  const tenantTables = ['locations', 'screens', 'playlists', 'schedules', 'announcements', 'sync_groups'];
  for (const table of tenantTables) {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN client_id TEXT REFERENCES clients(id) ON DELETE CASCADE`);
      console.log(`  ✅ Added client_id to ${table}`);
    } catch (e) {
      if (!e.message.includes('duplicate column')) throw e;
    }
  }

  // Create indexes for client_id
  for (const table of tenantTables) {
    try {
      db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_client ON ${table}(client_id)`);
    } catch (e) { /* ignore */ }
  }

  // ===== SEED PARKWISE =====
  const parkwise = db.prepare('SELECT id FROM clients WHERE slug = ?').get('parkwise');
  if (!parkwise) {
    db.prepare(`
      INSERT INTO clients (id, name, slug, logo_url, branding, contact_name, contact_email, plan, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      'parkwise',
      'Parkwise',
      'parkwise',
      null,
      JSON.stringify({
        primaryColor: '#F97316',
        secondaryColor: '#1E293B',
        accentColor: '#F59E0B',
        backgroundColor: '#07080a',
        textColor: '#e8eaed',
        fontFamily: 'Antonio, sans-serif',
        fontFamilyBody: 'system-ui, -apple-system, sans-serif',
        logoPosition: 'top-left',
        theme: 'dark',
      }),
      'Ewan',
      'ewan@parkwise.tech',
      'enterprise'
    );
    console.log('  ✅ Parkwise client seeded');

    // Assign all existing data to Parkwise
    for (const table of tenantTables) {
      const result = db.prepare(`UPDATE ${table} SET client_id = 'parkwise' WHERE client_id IS NULL`).run();
      if (result.changes > 0) {
        console.log(`  ✅ Assigned ${result.changes} ${table} records to Parkwise`);
      }
    }
  }

  // ===== CLIENT CRUD =====

  // List all clients
  app.get('/api/clients', (req, res) => {
    try {
      const clients = db.prepare(`
        SELECT c.*,
          (SELECT COUNT(*) FROM locations WHERE client_id = c.id) as location_count,
          (SELECT COUNT(*) FROM screens WHERE client_id = c.id) as screen_count,
          (SELECT COUNT(*) FROM playlists WHERE client_id = c.id) as playlist_count
        FROM clients c
        ORDER BY c.name
      `).all();

      res.json({
        success: true,
        data: clients.map(c => ({
          ...c,
          branding: { ...DEFAULT_BRANDING, ...JSON.parse(c.branding || '{}') },
        }))
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Get single client
  app.get('/api/clients/:id', (req, res) => {
    try {
      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
      if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

      const locations = db.prepare('SELECT id, name FROM locations WHERE client_id = ?').all(req.params.id);
      const screenCount = db.prepare('SELECT COUNT(*) as count FROM screens WHERE client_id = ?').get(req.params.id);
      const playlistCount = db.prepare('SELECT COUNT(*) as count FROM playlists WHERE client_id = ?').get(req.params.id);

      res.json({
        success: true,
        data: {
          ...client,
          branding: { ...DEFAULT_BRANDING, ...JSON.parse(client.branding || '{}') },
          locations,
          screenCount: screenCount.count,
          playlistCount: playlistCount.count,
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Create client
  app.post('/api/clients', (req, res) => {
    try {
      const { name, slug, logo_url, branding, domain, contact_name, contact_email, plan } = req.body;
      if (!name) return res.status(400).json({ success: false, error: 'name required' });

      const clientSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const existing = db.prepare('SELECT id FROM clients WHERE slug = ?').get(clientSlug);
      if (existing) return res.status(409).json({ success: false, error: 'Client with this slug already exists' });

      const id = clientSlug; // Use slug as ID for readability
      db.prepare(`
        INSERT INTO clients (id, name, slug, logo_url, branding, domain, contact_name, contact_email, plan, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        id, name, clientSlug,
        logo_url || null,
        JSON.stringify({ ...DEFAULT_BRANDING, ...branding }),
        domain || null,
        contact_name || null,
        contact_email || null,
        plan || 'basic'
      );

      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
      console.log(`🏢 Client created: ${name} (${clientSlug})`);
      res.json({ success: true, data: { ...client, branding: JSON.parse(client.branding || '{}') } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update client
  app.put('/api/clients/:id', (req, res) => {
    try {
      const existing = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
      if (!existing) return res.status(404).json({ success: false, error: 'Client not found' });

      const { name, logo_url, branding, domain, contact_name, contact_email, plan, active } = req.body;

      // Merge branding
      let newBranding = existing.branding;
      if (branding) {
        const currentBranding = JSON.parse(existing.branding || '{}');
        newBranding = JSON.stringify({ ...currentBranding, ...branding });
      }

      db.prepare(`
        UPDATE clients SET
          name = COALESCE(?, name),
          logo_url = COALESCE(?, logo_url),
          branding = COALESCE(?, branding),
          domain = COALESCE(?, domain),
          contact_name = COALESCE(?, contact_name),
          contact_email = COALESCE(?, contact_email),
          plan = COALESCE(?, plan),
          active = COALESCE(?, active)
        WHERE id = ?
      `).run(
        name || null,
        logo_url !== undefined ? logo_url : null,
        branding ? newBranding : null,
        domain !== undefined ? domain : null,
        contact_name !== undefined ? contact_name : null,
        contact_email !== undefined ? contact_email : null,
        plan || null,
        active !== undefined ? (active ? 1 : 0) : null,
        req.params.id
      );

      const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
      console.log(`🏢 Client updated: ${updated.name}`);
      res.json({ success: true, data: { ...updated, branding: JSON.parse(updated.branding || '{}') } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Delete client (soft — set active=0; or hard with ?hard=true)
  app.delete('/api/clients/:id', (req, res) => {
    try {
      if (req.params.id === 'parkwise') {
        return res.status(403).json({ success: false, error: 'Cannot delete the default Parkwise client' });
      }

      if (req.query.hard === 'true') {
        // Hard delete — cascades to all client data
        db.prepare('DELETE FROM announcements WHERE client_id = ?').run(req.params.id);
        db.prepare('DELETE FROM sync_groups WHERE client_id = ?').run(req.params.id);
        db.prepare('DELETE FROM schedules WHERE client_id = ?').run(req.params.id);
        db.prepare('DELETE FROM playlists WHERE client_id = ?').run(req.params.id);
        db.prepare('DELETE FROM screens WHERE client_id = ?').run(req.params.id);
        db.prepare('DELETE FROM locations WHERE client_id = ?').run(req.params.id);
        db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
        console.log(`🏢 Client hard-deleted: ${req.params.id}`);
      } else {
        db.prepare('UPDATE clients SET active = 0 WHERE id = ?').run(req.params.id);
        console.log(`🏢 Client deactivated: ${req.params.id}`);
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ===== BRANDING API =====

  // Get client branding (for templates/players)
  app.get('/api/clients/:id/branding', (req, res) => {
    try {
      const client = db.prepare('SELECT branding, logo_url, name FROM clients WHERE id = ?').get(req.params.id);
      if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

      const branding = { ...DEFAULT_BRANDING, ...JSON.parse(client.branding || '{}') };
      branding.logoUrl = client.logo_url;
      branding.clientName = client.name;

      res.json({ success: true, data: branding });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Update client branding
  app.put('/api/clients/:id/branding', (req, res) => {
    try {
      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
      if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

      const currentBranding = JSON.parse(client.branding || '{}');
      const newBranding = { ...currentBranding, ...req.body };

      db.prepare('UPDATE clients SET branding = ? WHERE id = ?')
        .run(JSON.stringify(newBranding), req.params.id);

      if (req.body.logo_url !== undefined) {
        db.prepare('UPDATE clients SET logo_url = ? WHERE id = ?')
          .run(req.body.logo_url, req.params.id);
      }

      console.log(`🎨 Branding updated for ${client.name}`);
      res.json({ success: true, data: { ...DEFAULT_BRANDING, ...newBranding } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ===== CLIENT STATS =====
  app.get('/api/clients/:id/stats', (req, res) => {
    try {
      const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
      if (!client) return res.status(404).json({ success: false, error: 'Client not found' });

      const stats = {
        locations: db.prepare('SELECT COUNT(*) as count FROM locations WHERE client_id = ?').get(req.params.id).count,
        screens: db.prepare('SELECT COUNT(*) as count FROM screens WHERE client_id = ?').get(req.params.id).count,
        playlists: db.prepare('SELECT COUNT(*) as count FROM playlists WHERE client_id = ?').get(req.params.id).count,
        schedules: db.prepare('SELECT COUNT(*) as count FROM schedules WHERE client_id = ?').get(req.params.id).count,
        announcements: db.prepare('SELECT COUNT(*) as count FROM announcements WHERE client_id = ?').get(req.params.id).count,
        syncGroups: db.prepare('SELECT COUNT(*) as count FROM sync_groups WHERE client_id = ?').get(req.params.id).count,
      };

      res.json({ success: true, data: stats });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ===== HELPER: Get client for request =====
  // Middleware that can be used to scope queries
  app.use('/api/*', (req, res, next) => {
    // Client scoping via header or query param (for API consumers)
    // X-Client-Id header or ?client_id= query param
    const clientId = req.headers['x-client-id'] || req.query.client_id;
    if (clientId) {
      const client = db.prepare('SELECT id, active FROM clients WHERE id = ? AND active = 1').get(clientId);
      if (client) {
        req.clientId = client.id;
      }
    }
    // Default to parkwise if no client specified
    if (!req.clientId) {
      req.clientId = 'parkwise';
    }
    next();
  });

  return { DEFAULT_BRANDING };
}
