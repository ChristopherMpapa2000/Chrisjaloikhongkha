import { LOCATIONS, findPart } from './config.js';
import { drawKrathong, isCoupleKrathong } from './krathong-renderer.js';

/**
 * Renders a high-resolution 1080x1350 (4:5 social-ready) commemorative PNG card
 * directly onto the provided canvas element.
 */
export async function renderCommemorativeCard(canvas, krathong) {
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed even if webfont loading times out offline
    }
  }

  const W = 1080;
  const H = 1350;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const loc = LOCATIONS[krathong.location] || LOCATIONS['wat-arun'];

  // 1. Rich Night Sky & Water Background
  const horizonY = 640;
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, loc.skyStops[0]);
  skyGrad.addColorStop(0.45, loc.skyStops[1]);
  skyGrad.addColorStop(0.82, loc.skyStops[2]);
  skyGrad.addColorStop(1, loc.skyStops[3]);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, horizonY);

  const waterGrad = ctx.createLinearGradient(0, horizonY, 0, H);
  waterGrad.addColorStop(0, loc.waterStops[0]);
  waterGrad.addColorStop(0.45, loc.waterStops[1]);
  waterGrad.addColorStop(1, '#040714');
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, horizonY, W, H - horizonY);

  // 2. Soft Starfield & Decorative Sky Lanterns
  let seed = hashCode(krathong.id || krathong.name || 'krathong');
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  for (let i = 0; i < 85; i++) {
    const sx = 55 + nextRand() * (W - 110);
    const sy = 55 + nextRand() * (horizonY - 120);
    const sr = 1 + nextRand() * 2.1;
    ctx.fillStyle = `rgba(255, 246, 218, ${0.25 + nextRand() * 0.65})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Mini glowing sky lanterns in upper corners
  const lanternCoords = [
    [185, 260, 22],
    [265, 340, 15],
    [890, 250, 20],
    [820, 355, 14],
    [140, 410, 12],
    [940, 390, 13],
  ];
  for (const [lx, ly, ls] of lanternCoords) {
    drawCardLantern(ctx, lx, ly, ls);
  }

  // 3. Super Full Moon centered behind the header/krathong
  const moonX = W * 0.5;
  const moonY = 395;
  const moonR = 128;

  const halo = ctx.createRadialGradient(moonX, moonY, moonR * 0.4, moonX, moonY, moonR * 3.1);
  halo.addColorStop(0, 'rgba(255, 236, 178, 0.34)');
  halo.addColorStop(0.45, 'rgba(246, 194, 96, 0.14)');
  halo.addColorStop(1, 'rgba(246, 194, 96, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR * 3.1, 0, Math.PI * 2);
  ctx.fill();

  const disc = ctx.createRadialGradient(moonX - 30, moonY - 30, 16, moonX, moonY, moonR);
  disc.addColorStop(0, '#fffef4');
  disc.addColorStop(0.7, '#f8e2a2');
  disc.addColorStop(1, '#e6be6c');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.fill();

  // Horizon atmospheric glow & moonlight water shimmer
  const hGlow = ctx.createRadialGradient(W / 2, horizonY, 30, W / 2, horizonY, 520);
  hGlow.addColorStop(0, loc.horizonGlow);
  hGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hGlow;
  ctx.fillRect(0, horizonY - 200, W, 240);

  for (let i = 0; i < 14; i++) {
    const wy = horizonY + 18 + i * 24;
    const ww = 160 - i * 8;
    ctx.fillStyle = `rgba(255, 234, 172, ${0.18 - i * 0.011})`;
    ctx.beginPath();
    ctx.ellipse(W / 2 + Math.sin(i * 1.3) * 18, wy, Math.max(24, ww), 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Centerpiece: High-Resolution User Krathong (or Couple Duo!) on the Water
  const coupleMode = isCoupleKrathong(krathong);
  drawKrathong(ctx, W / 2, 650, coupleMode ? 3.55 : 4.15, krathong, 2400, {
    showReflection: true,
    showRipples: true,
    isHighlighted: false,
    phase: 0.2,
  });

  if (coupleMode) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fbcfe8';
    ctx.font = '600 24px Prompt, sans-serif';
    ctx.fillText('♥  ลอยกระทงคู่คืนวันเพ็ญ  ♥', W / 2, 300);
    ctx.restore();
  }

  // 5. Modern Thai Ceremonial Double Border Frame
  drawOrnamentalFrame(ctx, W, H);

  // 6. Top Typography Header
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f7d68a';
  ctx.font = '500 24px Prompt, sans-serif';
  ctx.fillText('คืนเพ็ญเดือน ๑๒  ·  ๒๔ พฤศจิกายน ๒๕๖๙', W / 2, 118);

  ctx.fillStyle = '#fff8e6';
  ctx.font = '700 62px "Noto Serif Thai", Georgia, serif';
  ctx.fillText('แสงคงคา', W / 2, 192);

  ctx.fillStyle = 'rgba(247, 214, 138, 0.78)';
  ctx.font = '400 24px Prompt, sans-serif';
  ctx.fillText('ลอยกระทงออนไลน์ร่วมสมัย รักษ์สายน้ำไทย', W / 2, 232);

  // 7. Wish Glass Card Panel
  const cardX = 92;
  const cardY = 835;
  const cardW = W - 184;
  const cardH = 342;

  ctx.save();
  roundRect(ctx, cardX, cardY, cardW, cardH, 28);
  const panelGrad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
  panelGrad.addColorStop(0, 'rgba(13, 19, 42, 0.82)');
  panelGrad.addColorStop(1, 'rgba(8, 12, 28, 0.9)');
  ctx.fillStyle = panelGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(247, 214, 138, 0.34)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Opening decorative quote mark
  ctx.fillStyle = 'rgba(247, 214, 138, 0.36)';
  ctx.font = '700 72px Georgia, serif';
  ctx.fillText('“', W / 2, cardY + 62);

  // Thai-aware wrapped wish text
  ctx.fillStyle = '#fff9eb';
  ctx.font = '500 32px "Noto Serif Thai", Georgia, serif';
  const lines = wrapThaiText(ctx, krathong.wish || '', cardW - 104, 4);
  const lineHeight = 52;
  const textStartY = cardY + 114 + ((4 - lines.length) * lineHeight) / 3;
  lines.forEach((line, idx) => {
    ctx.fillText(line, W / 2, textStartY + idx * lineHeight);
  });

  // Sender signature
  ctx.fillStyle = '#f7d68a';
  ctx.font = '600 28px Prompt, sans-serif';
  ctx.fillText(`— ${krathong.name} —`, W / 2, cardY + cardH - 36);

  // 8. Footer Badges (Location, Craft Summary & Eco Impact)
  const baseName = findPart('base', krathong.baseType).name;
  const baseLabel = baseName.startsWith('กระทง') ? baseName : `กระทง${baseName}`;
  const flowerName = findPart('flower', krathong.flowerType).name;

  ctx.fillStyle = 'rgba(247, 244, 236, 0.85)';
  ctx.font = '500 23px Prompt, sans-serif';
  ctx.fillText(`📍 ${loc.fullName}`, W / 2, 1230);

  ctx.fillStyle = 'rgba(107, 226, 176, 0.92)';
  ctx.font = '500 21px Prompt, sans-serif';
  ctx.fillText(`🌱 ${baseLabel} · ${flowerName}  |  ช่วยลดขยะในแม่น้ำ 0.35 กก.`, W / 2, 1272);
}

function drawCardLantern(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);
  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, size * 2.8);
  glow.addColorStop(0, 'rgba(255, 206, 114, 0.42)');
  glow.addColorStop(1, 'rgba(255, 145, 58, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, size * 2.8, 0, Math.PI * 2);
  ctx.fill();

  const w = size * 0.72;
  const h = size * 1.12;
  const body = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  body.addColorStop(0, '#c45b1c');
  body.addColorStop(0.5, '#f4a23a');
  body.addColorStop(1, '#fff5cc');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-w * 0.65, -h * 0.48);
  ctx.quadraticCurveTo(0, -h * 0.62, w * 0.65, -h * 0.48);
  ctx.quadraticCurveTo(w * 0.85, 0, w * 0.42, h * 0.5);
  ctx.lineTo(-w * 0.42, h * 0.5);
  ctx.quadraticCurveTo(-w * 0.85, 0, -w * 0.65, -h * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawOrnamentalFrame(ctx, W, H) {
  ctx.save();
  // Outer hairline border
  ctx.strokeStyle = 'rgba(247, 214, 138, 0.38)';
  ctx.lineWidth = 2;
  roundRect(ctx, 36, 36, W - 72, H - 72, 26);
  ctx.stroke();

  // Inner fine border
  ctx.strokeStyle = 'rgba(247, 214, 138, 0.16)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 50, 50, W - 100, H - 100, 18);
  ctx.stroke();

  // Minimal Thai diamond corner accents
  const corners = [
    [50, 50],
    [W - 50, 50],
    [50, H - 50],
    [W - 50, H - 50],
  ];
  ctx.fillStyle = '#f7d68a';
  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx + 8, cy);
    ctx.lineTo(cx, cy + 8);
    ctx.lineTo(cx - 8, cy);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Thai-friendly line wrapper using Intl.Segmenter('th') so Thai text wraps
 * cleanly at word boundaries without overflowing or splitting tone marks!
 */
function wrapThaiText(ctx, text, maxWidth, maxLines = 4) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [''];

  let segments;
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    const seg = new Intl.Segmenter('th', { granularity: 'word' });
    segments = Array.from(seg.segment(clean), (s) => s.segment);
  } else {
    segments = Array.from(clean);
  }

  const lines = [];
  let current = '';

  for (const token of segments) {
    const candidate = current + token;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current.trim()) {
        lines.push(current.trim());
        if (lines.length >= maxLines) {
          lines[maxLines - 1] = truncateWithEllipsis(ctx, lines[maxLines - 1], maxWidth);
          return lines;
        }
      }
      current = token.trimStart();
    }
  }

  if (current.trim() && lines.length < maxLines) {
    lines.push(current.trim());
  }

  return lines;
}

function truncateWithEllipsis(ctx, line, maxWidth) {
  let out = line.replace(/[…]+$/, '');
  while (out.length > 1 && ctx.measureText(out + '…').width > maxWidth) {
    out = out.slice(0, -1);
  }
  return out + '…';
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function hashCode(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
