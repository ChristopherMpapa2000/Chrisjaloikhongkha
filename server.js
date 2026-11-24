'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

// Zero-dependency .env loader (does not overwrite existing platform environment variables)
function loadDotEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && !(key in process.env)) {
      process.env[key] = val;
    }
  }
}

loadDotEnv();

const { initRepository, VALID_LOCATIONS } = require('./db');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const INDEX_PATH = path.join(PUBLIC_DIR, 'index.html');
const STARTED_AT = Date.now();

const LOCATION_LABELS = {
  'wat-arun': 'แม่น้ำเจ้าพระยา · วัดอรุณฯ',
  'chiang-mai': 'คูเมืองเชียงใหม่ · ยี่เป็ง',
  sukhothai: 'อุทยานประวัติศาสตร์สุโขทัย',
  'khlong-ong-ang': 'คลองโอ่งอ่าง · กรุงเทพฯ',
};

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

const repo = initRepository();

// Real-time Server-Sent Events (SSE) clients
const sseClients = new Set();

function broadcastEvent(eventName, payload) {
  const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(data);
    } catch {
      sseClients.delete(res);
    }
  }
}

function broadcastPresence() {
  broadcastEvent('presence', { onlineCount: Math.max(1, sseClients.size) });
}

setInterval(() => {
  for (const res of sseClients) {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      sseClients.delete(res);
    }
  }
}, 25000);

// Lightweight in-memory rate limiter (reads X-Forwarded-For behind Railway/Render/Cloudflare proxies)
const rateBuckets = new Map();
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(ip, key, maxPerMinute) {
  const now = Date.now();
  const bucketKey = `${ip}:${key}`;
  const list = (rateBuckets.get(bucketKey) || []).filter((t) => now - t < 60000);
  if (list.length >= maxPerMinute) {
    return false;
  }
  list.push(now);
  rateBuckets.set(bucketKey, list);
  return true;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, list] of rateBuckets.entries()) {
    const fresh = list.filter((t) => now - t < 60000);
    if (fresh.length === 0) rateBuckets.delete(key);
    else rateBuckets.set(key, fresh);
  }
}, 60000);

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

function readJsonBody(req, maxBytes = 16384) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error('Payload too large'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      raw += chunk.toString('utf8');
    });
    req.on('end', () => {
      if (!raw.trim()) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('Invalid JSON payload'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function escapeAttr(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getBaseUrl(req) {
  const configured = (process.env.PUBLIC_BASE_URL || '').trim().replace(/\/+$/, '');
  if (configured) return configured;
  const protoHeader = req.headers['x-forwarded-proto'];
  const proto = typeof protoHeader === 'string' && protoHeader.trim() ? protoHeader.split(',')[0].trim() : 'http';
  const host = req.headers['x-forwarded-host'] || req.headers.host || `localhost:${PORT}`;
  return `${proto}://${host}`;
}

/**
 * Serves public/index.html with dynamic Open Graph & Twitter Card tags
 * so links shared to LINE / Facebook / X render rich previews — including
 * personalized name & wish previews when sharing ?krathong=<id>!
 */
async function serveIndexWithOg(req, res, parsedUrl) {
  let html = fs.readFileSync(INDEX_PATH, 'utf8');
  const baseUrl = getBaseUrl(req);
  const krathongId = parsedUrl.searchParams.get('krathong');

  let title = 'แสงคงคา — ลอยกระทงออนไลน์ร่วมสมัย ๒๕๖๙';
  let description =
    'ร่วมออกแบบกระทง DIY ชูตลงห่วงก็อตซิลล่า เลือกสถานที่สำคัญทั่วไทย เขียนคำอธิษฐาน ปล่อยโคมลอย จุดพลุ และรับการ์ดที่ระลึกแบบเรียลไทม์';
  let pageUrl = `${baseUrl}/`;

  if (krathongId) {
    try {
      const item = await repo.getKrathongById(krathongId);
      if (item) {
        const locLabel = LOCATION_LABELS[item.location] || 'สายน้ำคืนวันเพ็ญ';
        title = `กระทงของ ${item.name} — แสงคงคา ลอยกระทงออนไลน์`;
        description = `“${item.wish}” · ลอยที่ ${locLabel} — กดเข้ามาชมกระทงและร่วมส่งคำอวยพรบนสายน้ำ!`;
        pageUrl = `${baseUrl}/?krathong=${encodeURIComponent(item.id)}`;
      }
    } catch {
      // Fall back cleanly to default OG metadata if DB lookup fails
    }
  }

  const ogImage = `${baseUrl}/og-card.jpg`;
  const ogBlock = [
    `<meta property="og:type" content="website" />`,
    `  <meta property="og:site_name" content="แสงคงคา — ลอยกระทงออนไลน์" />`,
    `  <meta property="og:locale" content="th_TH" />`,
    `  <meta property="og:title" content="${escapeAttr(title)}" />`,
    `  <meta property="og:description" content="${escapeAttr(description)}" />`,
    `  <meta property="og:url" content="${escapeAttr(pageUrl)}" />`,
    `  <meta property="og:image" content="${escapeAttr(ogImage)}" />`,
    `  <meta property="og:image:type" content="image/jpeg" />`,
    `  <meta property="og:image:width" content="1200" />`,
    `  <meta property="og:image:height" content="630" />`,
    `  <meta name="twitter:card" content="summary_large_image" />`,
    `  <meta name="twitter:title" content="${escapeAttr(title)}" />`,
    `  <meta name="twitter:description" content="${escapeAttr(description)}" />`,
    `  <meta name="twitter:image" content="${escapeAttr(ogImage)}" />`,
  ].join('\n');

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeAttr(title)}</title>`);
  html = html.replace('<!-- OG_META_PLACEHOLDER -->', ogBlock);

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  res.end(html);
}

function serveStaticFile(req, res, pathname, parsedUrl) {
  if (pathname === '/' || pathname === '/index.html') {
    return serveIndexWithOg(req, res, parsedUrl);
  }

  const relative = pathname.replace(/^\/+/, '');
  const resolved = path.resolve(PUBLIC_DIR, relative);

  if (!resolved.startsWith(PUBLIC_DIR + path.sep) && resolved !== PUBLIC_DIR) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  let filePath = resolved;
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    return serveIndexWithOg(req, res, parsedUrl);
  }

  if (!fs.existsSync(filePath)) {
    if (!path.extname(pathname)) {
      return serveIndexWithOg(req, res, parsedUrl);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  const cacheHeader = ext === '.png' || ext === '.jpg' || ext === '.webp' ? 'public, max-age=86400' : 'no-cache';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal Server Error');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': cacheHeader,
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const clientIp = getClientIp(req);

  try {
    // --- Health Check Endpoint (Docker / Railway / Render / Fly.io) ---
    if (req.method === 'GET' && pathname === '/api/health') {
      return sendJson(res, 200, {
        ok: true,
        database: repo.provider,
        onlineCount: sseClients.size,
        uptimeSec: Math.floor((Date.now() - STARTED_AT) / 1000),
      });
    }

    // --- Real-time SSE Stream ---
    if (req.method === 'GET' && pathname === '/api/stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, onlineCount: sseClients.size + 1 })}\n\n`);
      sseClients.add(res);
      broadcastPresence();

      req.on('close', () => {
        sseClients.delete(res);
        broadcastPresence();
      });
      return;
    }

    // --- Stats Endpoint ---
    if (req.method === 'GET' && pathname === '/api/stats') {
      const stats = await repo.getStats();
      stats.onlineCount = Math.max(1, sseClients.size);
      stats.database = repo.provider;
      return sendJson(res, 200, stats);
    }

    // --- List / Search / Top Popular Krathongs ---
    if (req.method === 'GET' && pathname === '/api/krathongs') {
      const location = parsedUrl.searchParams.get('location') || undefined;
      const q = parsedUrl.searchParams.get('q') || undefined;
      const sort = parsedUrl.searchParams.get('sort') || undefined;
      const limit = parsedUrl.searchParams.get('limit') || 60;
      const idsParam = parsedUrl.searchParams.get('ids');
      const ids = idsParam ? idsParam.split(',').filter(Boolean) : undefined;

      const items = await repo.listKrathongs({ location, q, ids, sort, limit });
      return sendJson(res, 200, { items, count: items.length });
    }

    // --- Create New Krathong ---
    if (req.method === 'POST' && pathname === '/api/krathongs') {
      if (!checkRateLimit(clientIp, 'create', 25)) {
        return sendJson(res, 429, { error: 'กรุณารอสักครู่ก่อนลอยกระทงใบถัดไป' });
      }
      const body = await readJsonBody(req);
      const created = await repo.createKrathong(body);
      const stats = await repo.getStats();
      stats.onlineCount = Math.max(1, sseClients.size);
      const clientId = typeof body.clientId === 'string' ? body.clientId.slice(0, 32) : null;

      broadcastEvent('krathong:created', { krathong: created, stats, clientId });
      return sendJson(res, 201, { krathong: created, stats });
    }

    // --- Single Krathong Detail & Bless ---
    const krathongMatch = pathname.match(/^\/api\/krathongs\/([a-zA-Z0-9_-]+)(\/bless)?$/);
    if (krathongMatch) {
      const id = krathongMatch[1];
      const isBless = Boolean(krathongMatch[2]);

      if (!isBless && req.method === 'GET') {
        const item = await repo.getKrathongById(id);
        if (!item) return sendJson(res, 404, { error: 'ไม่พบกระทงนี้ในสายน้ำ' });
        return sendJson(res, 200, { krathong: item });
      }

      if (isBless && req.method === 'POST') {
        if (!checkRateLimit(clientIp, 'bless', 90)) {
          return sendJson(res, 429, { error: 'ส่งคำอวยพรเร็วเกินไป กรุณารอสักครู่' });
        }
        const body = await readJsonBody(req);
        const result = await repo.blessKrathong(id, body.reaction);
        const stats = await repo.getStats();
        stats.onlineCount = Math.max(1, sseClients.size);

        broadcastEvent('krathong:blessed', {
          krathong: result.krathong,
          reaction: result.reaction,
          stats,
        });
        return sendJson(res, 200, {
          krathong: result.krathong,
          reaction: result.reaction,
          stats,
        });
      }
    }

    // --- Ambient Interactive Events: Sky Lantern ---
    if (req.method === 'POST' && pathname === '/api/events/lantern') {
      if (!checkRateLimit(clientIp, 'lantern', 45)) {
        return sendJson(res, 429, { error: 'ปล่อยโคมลอยเร็วเกินไป กรุณารอสักครู่' });
      }
      const body = await readJsonBody(req);
      const location = VALID_LOCATIONS.includes(body.location) ? body.location : 'wat-arun';
      const xRatio = typeof body.xRatio === 'number' ? Math.max(0.08, Math.min(0.92, body.xRatio)) : null;
      const totalLanterns = await repo.incrementCounter('lanterns');

      const eventPayload = {
        location,
        xRatio,
        totalLanterns,
        clientId: typeof body.clientId === 'string' ? body.clientId.slice(0, 32) : null,
      };
      broadcastEvent('lantern:launched', eventPayload);
      return sendJson(res, 200, eventPayload);
    }

    // --- Ambient Interactive Events: Firework ---
    if (req.method === 'POST' && pathname === '/api/events/firework') {
      if (!checkRateLimit(clientIp, 'firework', 45)) {
        return sendJson(res, 429, { error: 'จุดพลุเร็วเกินไป กรุณารอสักครู่' });
      }
      const body = await readJsonBody(req);
      const location = VALID_LOCATIONS.includes(body.location) ? body.location : 'wat-arun';
      const xRatio = typeof body.xRatio === 'number' ? Math.max(0.12, Math.min(0.88, body.xRatio)) : null;
      const yRatio = typeof body.yRatio === 'number' ? Math.max(0.1, Math.min(0.42, body.yRatio)) : null;
      const totalFireworks = await repo.incrementCounter('fireworks');

      const eventPayload = {
        location,
        xRatio,
        yRatio,
        totalFireworks,
        clientId: typeof body.clientId === 'string' ? body.clientId.slice(0, 32) : null,
      };
      broadcastEvent('firework:launched', eventPayload);
      return sendJson(res, 200, eventPayload);
    }

    // --- Unknown API route ---
    if (pathname.startsWith('/api/')) {
      return sendJson(res, 404, { error: 'API endpoint not found' });
    }

    // --- Static Files & Dynamic OG Index ---
    if (req.method === 'GET' || req.method === 'HEAD') {
      return await serveStaticFile(req, res, pathname, parsedUrl);
    }

    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
  } catch (err) {
    const status = err.statusCode || 500;
    console.error('[Server Error]', err);
    return sendJson(res, status, { error: err.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
});

server.listen(PORT, HOST, () => {
  const dbLabel =
    repo.provider === 'supabase'
      ? 'Supabase PostgreSQL (Cloud Production)'
      : 'SQLite (Local 0-Mock Mode — set SUPABASE_URL in .env for Cloud)';
  console.log(`🌕 แสงคงคา (Saeng Khongkha) running at http://localhost:${PORT}`);
  console.log(`🗄️  Database: ${dbLabel}`);
});
