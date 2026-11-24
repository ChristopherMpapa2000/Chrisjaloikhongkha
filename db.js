'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { createSupabaseRepository } = require('./db-supabase');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'krathong.db');

const VALID_LOCATIONS = ['wat-arun', 'chiang-mai', 'sukhothai', 'khlong-ong-ang'];
const VALID_BASES = ['banana-leaf', 'lotus', 'coconut', 'bread', 'royal-gold'];
const VALID_FLOWERS = ['marigold', 'orchid', 'pink-lotus', 'jasmine', 'rose'];
const VALID_CANDLES = ['classic-gold', 'lotus-candle', 'twin-candle', 'lantern-mini'];
const VALID_ORNAMENTS = ['coins', 'gold-leaf', 'swan', 'garland', 'butterfly'];
const VALID_REACTIONS = ['sathu', 'wish', 'health', 'love'];

const WASTE_KG_PER_KRATHONG = 0.35;
const CO2_KG_PER_KRATHONG = 0.22;

function generateId() {
  return 'kr_' + crypto.randomBytes(5).toString('hex');
}

function initSqliteDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;

    CREATE TABLE IF NOT EXISTS krathongs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      wish TEXT NOT NULL,
      location TEXT NOT NULL,
      base_type TEXT NOT NULL,
      flower_type TEXT NOT NULL,
      candle_type TEXT NOT NULL,
      ornament_type TEXT NOT NULL,
      blessings INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_krathongs_location_created
      ON krathongs (location, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_krathongs_created
      ON krathongs (created_at DESC);

    CREATE TABLE IF NOT EXISTS blessings_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      krathong_id TEXT NOT NULL,
      reaction TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (krathong_id) REFERENCES krathongs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_blessings_krathong
      ON blessings_log (krathong_id);

    CREATE TABLE IF NOT EXISTS festival_counters (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Production default: start cleanly from 0 (no mock data!)
  db.prepare(`INSERT OR IGNORE INTO festival_counters (key, count) VALUES ('lanterns', 0)`).run();
  db.prepare(`INSERT OR IGNORE INTO festival_counters (key, count) VALUES ('fireworks', 0)`).run();

  return db;
}

function createSqliteRepository(db) {
  const getReactionBreakdown = (krathongId) => {
    const rows = db
      .prepare('SELECT reaction, COUNT(*) AS cnt FROM blessings_log WHERE krathong_id = ? GROUP BY reaction')
      .all(krathongId);
    const map = { sathu: 0, wish: 0, health: 0, love: 0 };
    for (const r of rows) {
      if (r.reaction in map) map[r.reaction] = Number(r.cnt);
    }
    return map;
  };

  const formatRow = (row) => {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      wish: row.wish,
      location: row.location,
      baseType: row.base_type,
      flowerType: row.flower_type,
      candleType: row.candle_type,
      ornamentType: row.ornament_type,
      blessings: Number(row.blessings),
      createdAt: row.created_at,
    };
  };

  return {
    provider: 'sqlite',

    async listKrathongs({ location, q, ids, sort, limit = 60 } = {}) {
      const safeLimit = Math.max(1, Math.min(120, Number(limit) || 60));

      if (ids && Array.isArray(ids) && ids.length > 0) {
        const cleanIds = ids.slice(0, 50).filter((v) => typeof v === 'string' && v.length <= 32);
        if (cleanIds.length === 0) return [];
        const placeholders = cleanIds.map(() => '?').join(',');
        const rows = db
          .prepare(`SELECT * FROM krathongs WHERE id IN (${placeholders}) ORDER BY created_at DESC`)
          .all(...cleanIds);
        return rows.map(formatRow);
      }

      const conditions = [];
      const params = [];

      if (location && VALID_LOCATIONS.includes(location)) {
        conditions.push('location = ?');
        params.push(location);
      }

      if (q && typeof q === 'string' && q.trim().length > 0) {
        const pattern = `%${q.trim().slice(0, 80)}%`;
        conditions.push('(name LIKE ? OR wish LIKE ?)');
        params.push(pattern, pattern);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const orderClause = sort === 'popular' ? 'ORDER BY blessings DESC, created_at DESC' : 'ORDER BY created_at DESC';
      const rows = db
        .prepare(`SELECT * FROM krathongs ${whereClause} ${orderClause} LIMIT ?`)
        .all(...params, safeLimit);

      return rows.map(formatRow);
    },

    async getKrathongById(id) {
      if (!id || typeof id !== 'string') return null;
      const row = db.prepare('SELECT * FROM krathongs WHERE id = ?').get(id);
      if (!row) return null;
      const item = formatRow(row);
      item.reactions = getReactionBreakdown(id);
      return item;
    },

    async createKrathong(input) {
      const name = String(input.name || '').trim().slice(0, 40);
      const wish = String(input.wish || '').trim().slice(0, 240);
      const location = VALID_LOCATIONS.includes(input.location) ? input.location : 'wat-arun';
      const baseType = VALID_BASES.includes(input.baseType) ? input.baseType : 'banana-leaf';
      const flowerType = VALID_FLOWERS.includes(input.flowerType) ? input.flowerType : 'marigold';
      const candleType = VALID_CANDLES.includes(input.candleType) ? input.candleType : 'classic-gold';
      const ornamentType = VALID_ORNAMENTS.includes(input.ornamentType) ? input.ornamentType : 'coins';

      if (!name) {
        throw Object.assign(new Error('กรุณากรอกชื่อผู้ลอยกระทง'), { statusCode: 400 });
      }
      if (!wish) {
        throw Object.assign(new Error('กรุณากรอกคำอธิษฐาน'), { statusCode: 400 });
      }

      const id = generateId();
      const createdAt = new Date().toISOString();

      db.prepare(`
        INSERT INTO krathongs (id, name, wish, location, base_type, flower_type, candle_type, ornament_type, blessings, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
      `).run(id, name, wish, location, baseType, flowerType, candleType, ornamentType, createdAt);

      return this.getKrathongById(id);
    },

    async blessKrathong(id, reaction = 'sathu') {
      const safeReaction = VALID_REACTIONS.includes(reaction) ? reaction : 'sathu';
      const existing = db.prepare('SELECT id FROM krathongs WHERE id = ?').get(id);
      if (!existing) {
        throw Object.assign(new Error('ไม่พบกระทงที่ต้องการอวยพร'), { statusCode: 404 });
      }

      const createdAt = new Date().toISOString();
      db.prepare('UPDATE krathongs SET blessings = blessings + 1 WHERE id = ?').run(id);
      db.prepare('INSERT INTO blessings_log (krathong_id, reaction, created_at) VALUES (?, ?, ?)').run(
        id,
        safeReaction,
        createdAt
      );

      const updated = await this.getKrathongById(id);
      return {
        krathong: updated,
        reaction: safeReaction,
      };
    },

    async incrementCounter(key) {
      if (key !== 'lanterns' && key !== 'fireworks') return 0;
      db.prepare('INSERT OR IGNORE INTO festival_counters (key, count) VALUES (?, 0)').run(key);
      db.prepare('UPDATE festival_counters SET count = count + 1 WHERE key = ?').run(key);
      const row = db.prepare('SELECT count FROM festival_counters WHERE key = ?').get(key);
      return Number(row ? row.count : 0);
    },

    async getStats() {
      const summary = db
        .prepare('SELECT COUNT(*) AS total, COALESCE(SUM(blessings), 0) AS blessings FROM krathongs')
        .get();
      const locRows = db
        .prepare('SELECT location, COUNT(*) AS cnt FROM krathongs GROUP BY location')
        .all();
      const counterRows = db.prepare('SELECT key, count FROM festival_counters').all();

      const byLocation = {
        'wat-arun': 0,
        'chiang-mai': 0,
        sukhothai: 0,
        'khlong-ong-ang': 0,
      };
      for (const r of locRows) {
        if (r.location in byLocation) byLocation[r.location] = Number(r.cnt);
      }

      const counters = { lanterns: 0, fireworks: 0 };
      for (const c of counterRows) {
        if (c.key in counters) counters[c.key] = Number(c.count);
      }

      const totalKrathongs = Number(summary.total);
      return {
        totalKrathongs,
        totalBlessings: Number(summary.blessings),
        totalLanterns: counters.lanterns,
        totalFireworks: counters.fireworks,
        wasteSavedKg: Number((totalKrathongs * WASTE_KG_PER_KRATHONG).toFixed(2)),
        co2SavedKg: Number((totalKrathongs * CO2_KG_PER_KRATHONG).toFixed(2)),
        byLocation,
      };
    },
  };
}

/**
 * Unified repository initializer:
 *  - Uses Supabase PostgreSQL automatically when SUPABASE_URL + key are set.
 *  - Falls back to clean local SQLite (0 mock records) for instant local development.
 */
function initRepository() {
  const supabaseUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseKey = (
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (supabaseUrl && supabaseKey) {
    return createSupabaseRepository({
      url: supabaseUrl,
      apiKey: supabaseKey,
      VALID_LOCATIONS,
      VALID_BASES,
      VALID_FLOWERS,
      VALID_CANDLES,
      VALID_ORNAMENTS,
      VALID_REACTIONS,
    });
  }

  const db = initSqliteDatabase();
  return createSqliteRepository(db);
}

module.exports = {
  initRepository,
  VALID_LOCATIONS,
  VALID_BASES,
  VALID_FLOWERS,
  VALID_CANDLES,
  VALID_ORNAMENTS,
  VALID_REACTIONS,
};
