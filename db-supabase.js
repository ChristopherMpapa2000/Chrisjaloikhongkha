'use strict';

const crypto = require('node:crypto');

const WASTE_KG_PER_KRATHONG = 0.35;
const CO2_KG_PER_KRATHONG = 0.22;

function generateId() {
  return 'kr_' + crypto.randomBytes(5).toString('hex');
}

function formatRow(row) {
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
    blessings: Number(row.blessings || 0),
    createdAt: row.created_at,
  };
}

/**
 * Zero-dependency Supabase PostgreSQL repository via PostgREST & Postgres RPCs.
 * Uses Node.js built-in fetch over HTTPS (works cleanly on all cloud hosts with no native pg drivers).
 */
function createSupabaseRepository({
  url,
  apiKey,
  VALID_LOCATIONS,
  VALID_BASES,
  VALID_FLOWERS,
  VALID_CANDLES,
  VALID_ORNAMENTS,
  VALID_REACTIONS,
}) {
  // Normalize pasted URL whether user copies Project URL or Data API URL (.../rest/v1/)
  let normalizedOrigin = url.replace(/\/+$/, '').replace(/\/rest\/v1$/i, '');
  try {
    normalizedOrigin = new URL(url).origin;
  } catch {
    // Keep cleaned string fallback
  }
  const baseUrl = normalizedOrigin + '/rest/v1';
  const isLegacyJwt = apiKey.startsWith('eyJ');

  async function request(endpoint, { method = 'GET', body, prefer } = {}) {
    const headers = {
      apikey: apiKey,
      Accept: 'application/json',
    };
    // Legacy service_role JWTs use Authorization: Bearer; newer sb_secret_ keys must only be sent via apikey header
    if (isLegacyJwt) {
      headers.Authorization = `Bearer ${apiKey}`;
    }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (prefer) {
      headers.Prefer = prefer;
    }

    const res = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = text;
      }
    }

    if (!res.ok) {
      const msg =
        (json && typeof json === 'object' && (json.message || json.error || json.hint)) ||
        `Supabase request failed (${res.status})`;
      throw Object.assign(new Error(msg), { statusCode: res.status >= 500 ? 502 : res.status });
    }
    return json;
  }

  async function getReactionBreakdown(krathongId) {
    const rows = await request(
      `/blessings_log?select=reaction&krathong_id=eq.${encodeURIComponent(krathongId)}`
    );
    const map = { sathu: 0, wish: 0, health: 0, love: 0 };
    if (Array.isArray(rows)) {
      for (const r of rows) {
        if (r.reaction in map) map[r.reaction] += 1;
      }
    }
    return map;
  }

  return {
    provider: 'supabase',

    async listKrathongs({ location, q, ids, sort, limit = 60 } = {}) {
      const safeLimit = Math.max(1, Math.min(120, Number(limit) || 60));
      const params = new URLSearchParams();
      params.set('select', '*');
      params.set('order', sort === 'popular' ? 'blessings.desc,created_at.desc' : 'created_at.desc');

      if (ids && Array.isArray(ids) && ids.length > 0) {
        const cleanIds = ids
          .slice(0, 50)
          .filter((v) => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,32}$/.test(v));
        if (cleanIds.length === 0) return [];
        params.set('id', `in.(${cleanIds.join(',')})`);
        const rows = await request(`/krathongs?${params.toString()}`);
        return Array.isArray(rows) ? rows.map(formatRow) : [];
      }

      if (location && VALID_LOCATIONS.includes(location)) {
        params.set('location', `eq.${location}`);
      }

      if (q && typeof q === 'string' && q.trim().length > 0) {
        // Strip characters that can interfere with PostgREST logical filter syntax
        const cleanQ = q.trim().slice(0, 80).replace(/[(),*"]/g, '');
        if (cleanQ) {
          params.set('or', `(name.ilike.*${cleanQ}*,wish.ilike.*${cleanQ}*)`);
        }
      }

      params.set('limit', String(safeLimit));
      const rows = await request(`/krathongs?${params.toString()}`);
      return Array.isArray(rows) ? rows.map(formatRow) : [];
    },

    async getKrathongById(id) {
      if (!id || typeof id !== 'string') return null;
      const rows = await request(
        `/krathongs?select=*&id=eq.${encodeURIComponent(id)}&limit=1`
      );
      if (!Array.isArray(rows) || rows.length === 0) return null;
      const item = formatRow(rows[0]);
      item.reactions = await getReactionBreakdown(id);
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
      const rows = await request('/krathongs', {
        method: 'POST',
        prefer: 'return=representation',
        body: {
          id,
          name,
          wish,
          location,
          base_type: baseType,
          flower_type: flowerType,
          candle_type: candleType,
          ornament_type: ornamentType,
          blessings: 0,
        },
      });

      const created = formatRow(Array.isArray(rows) ? rows[0] : rows);
      created.reactions = { sathu: 0, wish: 0, health: 0, love: 0 };
      return created;
    },

    async blessKrathong(id, reaction = 'sathu') {
      const safeReaction = VALID_REACTIONS.includes(reaction) ? reaction : 'sathu';
      const result = await request('/rpc/bless_krathong', {
        method: 'POST',
        body: {
          p_krathong_id: id,
          p_reaction: safeReaction,
        },
      });

      if (!result) {
        throw Object.assign(new Error('ไม่พบกระทงที่ต้องการอวยพร'), { statusCode: 404 });
      }

      return {
        krathong: result,
        reaction: safeReaction,
      };
    },

    async incrementCounter(key) {
      if (key !== 'lanterns' && key !== 'fireworks') return 0;
      const count = await request('/rpc/increment_festival_counter', {
        method: 'POST',
        body: { p_key: key },
      });
      return Number(count || 0);
    },

    async getStats() {
      const data = await request('/rpc/get_festival_stats', { method: 'POST', body: {} });
      const totalKrathongs = Number(data?.totalKrathongs || 0);
      return {
        totalKrathongs,
        totalBlessings: Number(data?.totalBlessings || 0),
        totalLanterns: Number(data?.totalLanterns || 0),
        totalFireworks: Number(data?.totalFireworks || 0),
        wasteSavedKg: Number((totalKrathongs * WASTE_KG_PER_KRATHONG).toFixed(2)),
        co2SavedKg: Number((totalKrathongs * CO2_KG_PER_KRATHONG).toFixed(2)),
        byLocation: {
          'wat-arun': Number(data?.byLocation?.['wat-arun'] || 0),
          'chiang-mai': Number(data?.byLocation?.['chiang-mai'] || 0),
          sukhothai: Number(data?.byLocation?.sukhothai || 0),
          'khlong-ong-ang': Number(data?.byLocation?.['khlong-ong-ang'] || 0),
        },
      };
    },
  };
}

module.exports = { createSupabaseRepository };
