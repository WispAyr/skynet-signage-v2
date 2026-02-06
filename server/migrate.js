/**
 * Database Migration Script
 * Run: node server/migrate.js
 * 
 * Adds:
 * - locations table
 * - location_id to screens
 * - connection_history table
 * - settings table
 * Cleans up stale screens
 * Pre-populates locations
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, 'signage.db'));

console.log('🔄 Running Skynet Signage migrations...\n');

// ===== 1. Locations Table =====
console.log('📍 Creating locations table...');
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

// Pre-populate locations
const locations = [
  { id: 'parkwise-office', name: 'Parkwise Office, Ayr', address: '45 Alloway St, Ayr KA7 1SP', lat: 55.4611, lng: -4.6322 },
  { id: 'kyle-rise', name: 'Kyle Rise Car Park', address: 'Kyle St, Ayr KA7 1RZ', lat: 55.4590, lng: -4.6280 },
  { id: 'kyle-surface', name: 'Kyle Surface Car Park', address: 'Kyle St, Ayr KA7 1RZ', lat: 55.4585, lng: -4.6275 },
];

const insertLoc = db.prepare(`
  INSERT OR IGNORE INTO locations (id, name, address, latitude, longitude, timezone)
  VALUES (?, ?, ?, ?, ?, 'Europe/London')
`);

for (const loc of locations) {
  insertLoc.run(loc.id, loc.name, loc.address, loc.lat, loc.lng);
  console.log(`  ✅ ${loc.name}`);
}

// ===== 2. Add location_id to screens =====
console.log('\n📺 Adding location_id to screens...');
try {
  db.exec(`ALTER TABLE screens ADD COLUMN location_id TEXT REFERENCES locations(id);`);
  console.log('  ✅ Column added');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('  ⏭️  Column already exists');
  } else {
    throw e;
  }
}

// ===== 3. Connection History Table =====
console.log('\n📊 Creating connection_history table...');
db.exec(`
  CREATE TABLE IF NOT EXISTS connection_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    screen_id TEXT NOT NULL,
    event TEXT NOT NULL,
    timestamp INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    details TEXT DEFAULT '{}',
    FOREIGN KEY (screen_id) REFERENCES screens(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_conn_history_screen ON connection_history(screen_id);
  CREATE INDEX IF NOT EXISTS idx_conn_history_time ON connection_history(timestamp);
`);
console.log('  ✅ connection_history table created');

// ===== 4. Settings Table =====
console.log('\n⚙️  Creating settings table...');
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  );
`);

// Default settings
const defaults = {
  'global.transition': 'fade',
  'global.transitionDuration': '500',
  'global.defaultPlaylistLoop': 'true',
  'global.brandColor': '#F97316',
  'global.companyName': 'Parkwise',
  'alerts.autoExpire': '30000',
  'alerts.soundEnabled': 'false',
  'screens.offlineAlertMinutes': '10',
};

const insertSetting = db.prepare(`
  INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
`);

for (const [key, value] of Object.entries(defaults)) {
  insertSetting.run(key, value);
}
console.log('  ✅ Default settings populated');

// ===== 5. Add location_id to playlists =====
console.log('\n📋 Adding location_id to playlists...');
try {
  db.exec(`ALTER TABLE playlists ADD COLUMN location_id TEXT REFERENCES locations(id);`);
  console.log('  ✅ Column added');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('  ⏭️  Column already exists');
  } else {
    throw e;
  }
}

// ===== 6. Clean Up Stale Screens =====
console.log('\n🧹 Cleaning up stale screens...');
const stale = ['test', 'debug', '__reload__', 'ewanslaptop'];
const deleteScreen = db.prepare('DELETE FROM screens WHERE id = ?');
for (const id of stale) {
  const result = deleteScreen.run(id);
  if (result.changes > 0) {
    console.log(`  🗑️  Removed: ${id}`);
  } else {
    console.log(`  ⏭️  Not found: ${id}`);
  }
}

// ===== 7. Rename Real Screens & Assign Location =====
console.log('\n✏️  Renaming screens and assigning locations...');
const renames = {
  'office1': { name: 'Office Screen 1', location_id: 'parkwise-office' },
  'office2': { name: 'Office Screen 2', location_id: 'parkwise-office' },
  'office3': { name: 'Office Screen 3', location_id: 'parkwise-office' },
  'noc1': { name: 'NOC Display', location_id: 'parkwise-office' },
  'hisense1': { name: 'Office TV', location_id: 'parkwise-office' },
  'pu1': { name: 'Processing Unit 1', location_id: 'parkwise-office' },
  'pu2': { name: 'Processing Unit 2', location_id: 'parkwise-office' },
  'lcars-main': { name: 'LCARS NOC Interface', location_id: 'parkwise-office' },
};

const updateScreen = db.prepare(`
  UPDATE screens SET name = ?, location_id = ? WHERE id = ?
`);

for (const [id, data] of Object.entries(renames)) {
  const result = updateScreen.run(data.name, data.location_id, id);
  if (result.changes > 0) {
    console.log(`  ✅ ${id} → "${data.name}" @ ${data.location_id}`);
  } else {
    console.log(`  ⏭️  Screen not found: ${id}`);
  }
}

// ===== 8. Multi-Tenant Clients =====
console.log('\n🏢 Setting up multi-tenant clients...');
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

// Add client_id to tenant tables
const clientTables = ['locations', 'screens', 'playlists', 'schedules', 'announcements', 'sync_groups'];
for (const table of clientTables) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN client_id TEXT REFERENCES clients(id) ON DELETE CASCADE`);
    console.log(`  ✅ Added client_id to ${table}`);
  } catch (e) {
    if (e.message.includes('duplicate column')) {
      console.log(`  ⏭️  client_id already in ${table}`);
    } else {
      throw e;
    }
  }
  try { db.exec(`CREATE INDEX IF NOT EXISTS idx_${table}_client ON ${table}(client_id)`); } catch (e) { /* ignore */ }
}

// Seed Parkwise
const pkw = db.prepare('SELECT id FROM clients WHERE slug = ?').get('parkwise');
if (!pkw) {
  db.prepare(`
    INSERT INTO clients (id, name, slug, branding, contact_name, contact_email, plan, active)
    VALUES ('parkwise', 'Parkwise', 'parkwise', ?, 'Ewan', 'ewan@parkwise.tech', 'enterprise', 1)
  `).run(JSON.stringify({
    primaryColor: '#F97316', secondaryColor: '#1E293B', accentColor: '#F59E0B',
    backgroundColor: '#07080a', textColor: '#e8eaed',
    fontFamily: 'Antonio, sans-serif', fontFamilyBody: 'system-ui, -apple-system, sans-serif',
    logoPosition: 'top-left', theme: 'dark',
  }));
  console.log('  ✅ Parkwise client seeded');
  // Assign existing data
  for (const table of clientTables) {
    const r = db.prepare(`UPDATE ${table} SET client_id = 'parkwise' WHERE client_id IS NULL`).run();
    if (r.changes > 0) console.log(`  ✅ Assigned ${r.changes} ${table} to Parkwise`);
  }
} else {
  console.log('  ⏭️  Parkwise already exists');
}

// ===== 10. Player Sync — New Screen Columns =====
console.log('\n🔗 Adding player/sync columns to screens...');
const syncColumns = [
  { name: 'sync_group', sql: "ALTER TABLE screens ADD COLUMN sync_group TEXT" },
  { name: 'platform', sql: "ALTER TABLE screens ADD COLUMN platform TEXT DEFAULT 'browser'" },
  { name: 'resolution', sql: "ALTER TABLE screens ADD COLUMN resolution TEXT" },
  { name: 'orientation', sql: "ALTER TABLE screens ADD COLUMN orientation TEXT DEFAULT 'landscape'" },
  { name: 'capabilities', sql: "ALTER TABLE screens ADD COLUMN capabilities TEXT DEFAULT '{}'" },
];

for (const col of syncColumns) {
  try {
    db.exec(col.sql);
    console.log(`  ✅ Added ${col.name}`);
  } catch (e) {
    if (e.message.includes('duplicate column')) {
      console.log(`  ⏭️  ${col.name} already exists`);
    } else {
      throw e;
    }
  }
}

// ===== 11. Sync Groups Table =====
console.log('\n🔗 Creating sync_groups table...');
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
  CREATE INDEX IF NOT EXISTS idx_screens_sync_group ON screens(sync_group);
`);
console.log('  ✅ sync_groups table created');

// Pre-populate a pavilion sync group
const pavilionGroup = db.prepare(`
  INSERT OR IGNORE INTO sync_groups (id, name, mode, config)
  VALUES ('pavilion', 'Pavilion Screens', 'mirror', '{"description":"3 x screens at the pavilion — synchronised playback"}')
`);
pavilionGroup.run();
console.log('  ✅ Pavilion sync group seeded');

// ===== Done =====
console.log('\n✨ Migration complete!');
console.log('\nCurrent screens:');
const screens = db.prepare('SELECT id, name, location_id, status FROM screens ORDER BY name').all();
screens.forEach(s => {
  console.log(`  ${s.id.padEnd(15)} ${s.name.padEnd(25)} ${(s.location_id || '-').padEnd(18)} ${s.status}`);
});

console.log('\nLocations:');
const locs = db.prepare('SELECT id, name FROM locations').all();
locs.forEach(l => {
  console.log(`  ${l.id.padEnd(18)} ${l.name}`);
});

db.close();
