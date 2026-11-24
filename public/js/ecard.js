import { LOCATIONS, findPart } from './config.js';
import { drawKrathong, isCoupleKrathong } from './krathong-renderer.js';

/**
 * Renders a breathtaking high-resolution 1080x1350 (4:5 social-ready) commemorative PNG card
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
  const coupleMode = isCoupleKrathong(krathong);

  // =========================================================================
  // 1. Celestial Night Sky & Sacred Water Background
  // =========================================================================
  const horizonY = 635;

  // Deep royal twilight sky
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, '#040714');
  skyGrad.addColorStop(0.35, loc.skyStops[0] || '#09112a');
  skyGrad.addColorStop(0.75, loc.skyStops[1] || '#121e42');
  skyGrad.addColorStop(1, loc.skyStops[2] || '#1c2d58');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, horizonY);

  // Reflective Sacred River Water
  const waterGrad = ctx.createLinearGradient(0, horizonY, 0, H);
  waterGrad.addColorStop(0, loc.waterStops[0] || '#0e1832');
  waterGrad.addColorStop(0.3, loc.waterStops[1] || '#091124');
  waterGrad.addColorStop(0.7, '#050a18');
  waterGrad.addColorStop(1, '#02040b');
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, horizonY, W, H - horizonY);

  // =========================================================================
  // 2. Starfield & Cosmic Nebula Haze
  // =========================================================================
  let seed = hashCode(krathong.id || krathong.name || 'krathong');
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Subtle nebula cloud behind stars
  const nebula = ctx.createRadialGradient(W * 0.35, 240, 40, W * 0.35, 240, 480);
  nebula.addColorStop(0, 'rgba(147, 51, 234, 0.08)');
  nebula.addColorStop(0.6, 'rgba(59, 130, 246, 0.05)');
  nebula.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, W, horizonY);

  // 100 Twinkling stars
  for (let i = 0; i < 100; i++) {
    const sx = 48 + nextRand() * (W - 96);
    const sy = 48 + nextRand() * (horizonY - 90);
    const sr = 0.8 + nextRand() * 2.2;
    const alpha = 0.25 + nextRand() * 0.7;
    ctx.fillStyle = `rgba(255, 250, 230, ${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();

    // Occasional 4-point cross star sparkle
    if (i % 16 === 0) {
      drawStarCross(ctx, sx, sy, sr * 4, alpha);
    }
  }

  // Floating Sky Lanterns flanking the sides (never obstructing center/moon)
  const lanternCoords = [
    [155, 260, 24],
    [240, 350, 16],
    [115, 430, 13],
    [925, 240, 22],
    [840, 340, 15],
    [965, 415, 14],
  ];
  for (const [lx, ly, ls] of lanternCoords) {
    drawCardLantern(ctx, lx, ly, ls);
  }

  // =========================================================================
  // 3. Majestic Super Full Moon (Unobstructed & Radiant)
  // =========================================================================
  const moonX = W * 0.5;
  const moonY = 390;
  const moonR = 124;

  // Outer ambient lunar aura
  const outerHalo = ctx.createRadialGradient(moonX, moonY, moonR * 0.6, moonX, moonY, moonR * 3.6);
  outerHalo.addColorStop(0, 'rgba(254, 240, 138, 0.28)');
  outerHalo.addColorStop(0.35, 'rgba(250, 204, 21, 0.12)');
  outerHalo.addColorStop(0.7, 'rgba(245, 158, 11, 0.04)');
  outerHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = outerHalo;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR * 3.6, 0, Math.PI * 2);
  ctx.fill();

  // Subtle lunar rays
  ctx.save();
  ctx.globalAlpha = 0.09;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
    ctx.beginPath();
    ctx.moveTo(moonX, moonY);
    ctx.arc(moonX, moonY, moonR * 3.2, a - 0.08, a + 0.08);
    ctx.closePath();
    ctx.fillStyle = '#fef08a';
    ctx.fill();
  }
  ctx.restore();

  // Moon disc with realistic pearl shading & lunar rim
  const disc = ctx.createRadialGradient(moonX - 32, moonY - 32, 12, moonX, moonY, moonR);
  disc.addColorStop(0, '#ffffff');
  disc.addColorStop(0.25, '#fffbeb');
  disc.addColorStop(0.65, '#fef08a');
  disc.addColorStop(0.88, '#fcd34d');
  disc.addColorStop(1, '#d97706');

  ctx.save();
  ctx.shadowColor = 'rgba(254, 240, 138, 0.55)';
  ctx.shadowBlur = 32;
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Subtle lunar mare / surface texture
  ctx.save();
  ctx.fillStyle = 'rgba(180, 130, 45, 0.11)';
  ctx.beginPath();
  ctx.arc(moonX - 25, moonY - 15, 34, 0, Math.PI * 2);
  ctx.arc(moonX + 30, moonY + 20, 42, 0, Math.PI * 2);
  ctx.arc(moonX - 10, moonY + 45, 26, 0, Math.PI * 2);
  ctx.arc(moonX + 45, moonY - 25, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // =========================================================================
  // 4. Horizon Glow & Shimmering Moonlight Water Reflection
  // =========================================================================
  const hGlow = ctx.createRadialGradient(W / 2, horizonY, 20, W / 2, horizonY, 560);
  hGlow.addColorStop(0, 'rgba(254, 240, 138, 0.28)');
  hGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.08)');
  hGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hGlow;
  ctx.fillRect(0, horizonY - 180, W, 220);

  // Silvery-golden moonlight ripples down the river
  for (let i = 0; i < 18; i++) {
    const wy = horizonY + 14 + i * 20;
    const ww = Math.max(16, 175 - i * 7.5);
    const alpha = (0.24 - i * 0.011) * (1 + Math.sin(i * 0.8) * 0.25);
    ctx.fillStyle = `rgba(254, 243, 199, ${Math.max(0.04, alpha)})`;
    ctx.beginPath();
    ctx.ellipse(W / 2 + Math.sin(i * 1.2) * 14, wy, ww, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Golden lotus pool spotlight on water surface directly beneath krathong
  const pondSpot = ctx.createRadialGradient(W / 2, 665, 30, W / 2, 665, 340);
  pondSpot.addColorStop(0, 'rgba(254, 240, 138, 0.25)');
  pondSpot.addColorStop(0.5, 'rgba(217, 119, 6, 0.08)');
  pondSpot.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = pondSpot;
  ctx.beginPath();
  ctx.ellipse(W / 2, 665, 340, 75, 0, 0, Math.PI * 2);
  ctx.fill();

  // =========================================================================
  // 5. Centerpiece: High-Resolution Krathong on Sacred Water
  // =========================================================================
  drawKrathong(ctx, W / 2, 650, coupleMode ? 3.65 : 4.25, krathong, 2400, {
    showReflection: true,
    showRipples: true,
    isHighlighted: false,
    phase: 0.2,
  });

  // =========================================================================
  // 6. Modern Royal Thai Double Frame with Ornate Gold Corners
  // =========================================================================
  drawLuxuryOrnamentalFrame(ctx, W, H);

  // =========================================================================
  // 7. Top Header Typography
  // =========================================================================
  ctx.save();
  ctx.textAlign = 'center';

  // Thai Date with decorative diamond pips
  ctx.fillStyle = '#fde68a';
  ctx.font = '500 23px Prompt, sans-serif';
  ctx.shadowColor = 'rgba(250, 204, 21, 0.4)';
  ctx.shadowBlur = 8;
  ctx.fillText('✦  คืนเพ็ญเดือน ๑๒  ·  ๒๔ พฤศจิกายน ๒๕๖๙  ✦', W / 2, 115);

  // Master Ceremony Brand Name: แสงคงคา
  const titleGrad = ctx.createLinearGradient(0, 140, 0, 205);
  titleGrad.addColorStop(0, '#ffffff');
  titleGrad.addColorStop(0.5, '#fef08a');
  titleGrad.addColorStop(1, '#f59e0b');
  ctx.fillStyle = titleGrad;
  ctx.font = '700 66px "Noto Serif Thai", Georgia, serif';
  ctx.shadowColor = 'rgba(245, 158, 11, 0.55)';
  ctx.shadowBlur = 24;
  ctx.fillText('แสงคงคา', W / 2, 192);

  // Ceremony tagline
  ctx.fillStyle = 'rgba(254, 243, 199, 0.86)';
  ctx.font = '400 23px Prompt, sans-serif';
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.fillText('ลอยกระทงออนไลน์ร่วมสมัย  ·  รักษ์สายน้ำไทย', W / 2, 232);
  ctx.restore();

  // =========================================================================
  // 8. Luxury Royal Thai Wish Parchment / Glass Scroll Panel
  // =========================================================================
  const cardX = 82;
  const cardY = 825;
  const cardW = W - 164;
  const cardH = 360;
  const cardRadius = 30;

  ctx.save();

  // Soft deep ambient shadow behind glass panel
  ctx.shadowColor = 'rgba(0, 0, 0, 0.72)';
  ctx.shadowBlur = 42;
  ctx.shadowOffsetY = 18;

  // Glass background gradient: rich royal midnight indigo to velvet deep navy
  const panelGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  panelGrad.addColorStop(0, 'rgba(17, 24, 52, 0.88)');
  panelGrad.addColorStop(0.5, 'rgba(11, 16, 38, 0.92)');
  panelGrad.addColorStop(1, 'rgba(7, 10, 26, 0.96)');
  ctx.fillStyle = panelGrad;
  roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.fill();

  // Reset shadow for borders & interior elements
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Outer radiant gold border gradient
  const borderGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
  borderGrad.addColorStop(0, 'rgba(253, 224, 71, 0.65)');
  borderGrad.addColorStop(0.35, 'rgba(245, 158, 11, 0.42)');
  borderGrad.addColorStop(0.7, 'rgba(254, 240, 138, 0.6)');
  borderGrad.addColorStop(1, 'rgba(217, 119, 6, 0.38)');
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 2.2;
  roundRect(ctx, cardX, cardY, cardW, cardH, cardRadius);
  ctx.stroke();

  // Inner hairline gold inlay border
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.2)';
  ctx.lineWidth = 1.2;
  roundRect(ctx, cardX + 7, cardY + 7, cardW - 14, cardH - 14, cardRadius - 6);
  ctx.stroke();

  // 4 Luxury Royal Thai Floral Corner Ornaments on the Wish Card
  drawCardCornerFlourish(ctx, cardX + 16, cardY + 16, 0); // Top-left
  drawCardCornerFlourish(ctx, cardX + cardW - 16, cardY + 16, Math.PI / 2); // Top-right
  drawCardCornerFlourish(ctx, cardX + cardW - 16, cardY + cardH - 16, Math.PI); // Bottom-right
  drawCardCornerFlourish(ctx, cardX + 16, cardY + cardH - 16, -Math.PI / 2); // Bottom-left

  // Top Ceremonial Ribbon Crest on the Wish Card Frame
  const ribbonW = coupleMode ? 360 : 310;
  const ribbonH = 36;
  const ribbonX = (W - ribbonW) / 2;
  const ribbonY = cardY - ribbonH / 2;

  // Ribbon badge background
  ctx.save();
  ctx.shadowColor = coupleMode ? 'rgba(244, 114, 182, 0.45)' : 'rgba(245, 158, 11, 0.45)';
  ctx.shadowBlur = 14;
  const ribGrad = ctx.createLinearGradient(ribbonX, ribbonY, ribbonX + ribbonW, ribbonY);
  if (coupleMode) {
    ribGrad.addColorStop(0, '#831843');
    ribGrad.addColorStop(0.5, '#be185d');
    ribGrad.addColorStop(1, '#831843');
  } else {
    ribGrad.addColorStop(0, '#78350f');
    ribGrad.addColorStop(0.5, '#b45309');
    ribGrad.addColorStop(1, '#78350f');
  }
  ctx.fillStyle = ribGrad;
  roundRect(ctx, ribbonX, ribbonY, ribbonW, ribbonH, 18);
  ctx.fill();

  ctx.strokeStyle = coupleMode ? 'rgba(251, 207, 232, 0.75)' : 'rgba(254, 240, 138, 0.85)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, ribbonX, ribbonY, ribbonW, ribbonH, 18);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = coupleMode ? '#fdf2f8' : '#fef9c3';
  ctx.font = '600 17px Prompt, sans-serif';
  ctx.fillText(
    coupleMode ? '♥  คำอธิษฐานลอยกระทงคู่  ♥' : '✦  คำอธิษฐานคืนวันเพ็ญ  ✦',
    W / 2,
    ribbonY + 24
  );
  ctx.restore();

  // Decorative Golden Calligraphic Quote Marks
  ctx.save();
  ctx.fillStyle = 'rgba(250, 204, 21, 0.22)';
  ctx.font = '700 84px "Noto Serif Thai", Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('“', cardX + 38, cardY + 84);
  ctx.textAlign = 'right';
  ctx.fillText('”', cardX + cardW - 38, cardY + cardH - 58);
  ctx.restore();

  // Wish Body Text (Graceful, Thai Word-Wrapped, High Legibility)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fffdf7';
  ctx.font = '500 32px "Noto Serif Thai", Georgia, serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 6;

  const lines = wrapThaiText(ctx, krathong.wish || 'ขอขมาพระแม่คงคา และขอพรให้ชีวิตพบแต่ความสุขความเจริญ', cardW - 130, 4);
  const lineHeight = 52;
  const totalTextH = lines.length * lineHeight;
  // Center wish text comfortably between header ribbon and signature
  const textStartY = cardY + 70 + (190 - totalTextH) / 2 + 32;

  lines.forEach((line, idx) => {
    ctx.fillText(line, W / 2, textStartY + idx * lineHeight);
  });
  ctx.restore();

  // Ornate Divider Flourish before sender signature
  const divY = cardY + cardH - 72;
  drawOrnateDivider(ctx, W / 2, divY, 260);

  // Sender Signature
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '600 27px Prompt, sans-serif';

  const sigGrad = ctx.createLinearGradient(W / 2 - 120, divY, W / 2 + 120, divY);
  sigGrad.addColorStop(0, '#fef08a');
  sigGrad.addColorStop(0.5, '#ffffff');
  sigGrad.addColorStop(1, '#fef08a');
  ctx.fillStyle = sigGrad;
  ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
  ctx.shadowBlur = 10;

  const displayName =
    krathong.partnerName && !krathong.name.includes(krathong.partnerName)
      ? `${krathong.name}  ♥  ${krathong.partnerName}`
      : `${krathong.name}`;
  ctx.fillText(`—  ${displayName}  —`, W / 2, cardY + cardH - 30);
  ctx.restore();

  ctx.restore(); // End wish card context

  // =========================================================================
  // 9. Luxury Footer: Sacred Location & Eco Impact Badges
  // =========================================================================
  ctx.save();
  ctx.textAlign = 'center';

  // Location Badge Pill
  const locY = 1228;
  ctx.fillStyle = 'rgba(254, 243, 199, 0.9)';
  ctx.font = '500 23px Prompt, sans-serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 6;
  ctx.fillText(`📍 ${loc.fullName}`, W / 2, locY);

  // Craft Composition & Eco Conservation Note
  const baseName = findPart('base', krathong.baseType).name;
  const baseLabel = baseName.startsWith('กระทง') ? baseName : `กระทง${baseName}`;
  const flowerName = findPart('flower', krathong.flowerType).name;

  ctx.fillStyle = '#6ee7b7';
  ctx.font = '500 21px Prompt, sans-serif';
  ctx.shadowColor = 'rgba(16, 185, 129, 0.35)';
  ctx.shadowBlur = 10;
  ctx.fillText(
    `🌱 ${baseLabel} · ${flowerName}  |  ช่วยลดขยะในแม่น้ำ 0.35 กก.`,
    W / 2,
    locY + 38
  );

  ctx.restore();
}

/**
 * 4-point cross flare sparkle
 */
function drawStarCross(ctx, x, y, r, a) {
  ctx.save();
  ctx.globalAlpha = a * 0.7;
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
  ctx.moveTo(x, y - r);
  ctx.lineTo(x, y + r);
  ctx.stroke();
  ctx.restore();
}

/**
 * Ornate floral flourish in the corners of the wish card
 */
function drawCardCornerFlourish(ctx, cx, cy, rot) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.7)';
  ctx.fillStyle = '#fef08a';
  ctx.lineWidth = 1.4;

  // Center corner diamond pip
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(6, 0);
  ctx.lineTo(0, 6);
  ctx.lineTo(-6, 0);
  ctx.closePath();
  ctx.fill();

  // Corner petal curls
  ctx.beginPath();
  ctx.arc(14, 0, 8, Math.PI, Math.PI * 1.5);
  ctx.arc(0, 14, 8, -Math.PI * 0.5, 0);
  ctx.stroke();

  ctx.restore();
}

/**
 * Slim ornamental divider line with diamond lotus pip
 */
function drawOrnateDivider(ctx, cx, cy, width) {
  ctx.save();
  const half = width / 2;

  // Left fading line
  const leftGrad = ctx.createLinearGradient(cx - half, cy, cx - 18, cy);
  leftGrad.addColorStop(0, 'rgba(254, 240, 138, 0)');
  leftGrad.addColorStop(1, 'rgba(254, 240, 138, 0.65)');
  ctx.strokeStyle = leftGrad;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(cx - half, cy);
  ctx.lineTo(cx - 16, cy);
  ctx.stroke();

  // Right fading line
  const rightGrad = ctx.createLinearGradient(cx + 16, cy, cx + half, cy);
  rightGrad.addColorStop(0, 'rgba(254, 240, 138, 0.65)');
  rightGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
  ctx.strokeStyle = rightGrad;
  ctx.beginPath();
  ctx.moveTo(cx + 16, cy);
  ctx.lineTo(cx + half, cy);
  ctx.stroke();

  // Center diamond pip
  ctx.fillStyle = '#fef08a';
  ctx.shadowColor = 'rgba(250, 204, 21, 0.6)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 6);
  ctx.lineTo(cx + 6, cy);
  ctx.lineTo(cx, cy + 6);
  ctx.lineTo(cx - 6, cy);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Modern Royal Thai Double Frame with 4 Ornate Diamond Lotus Corners
 */
function drawLuxuryOrnamentalFrame(ctx, W, H) {
  ctx.save();

  // Outer primary gold border
  const outerBorder = ctx.createLinearGradient(0, 0, W, H);
  outerBorder.addColorStop(0, 'rgba(254, 240, 138, 0.55)');
  outerBorder.addColorStop(0.5, 'rgba(217, 119, 6, 0.35)');
  outerBorder.addColorStop(1, 'rgba(254, 240, 138, 0.55)');
  ctx.strokeStyle = outerBorder;
  ctx.lineWidth = 2.4;
  roundRect(ctx, 32, 32, W - 64, H - 64, 28);
  ctx.stroke();

  // Inner hairline border
  ctx.strokeStyle = 'rgba(254, 240, 138, 0.2)';
  ctx.lineWidth = 1.4;
  roundRect(ctx, 46, 46, W - 92, H - 92, 20);
  ctx.stroke();

  // 4 Master Corner Lotus Diamond Jewels
  const corners = [
    [46, 46],
    [W - 46, 46],
    [46, H - 46],
    [W - 46, H - 46],
  ];

  for (const [cx, cy] of corners) {
    ctx.save();
    ctx.translate(cx, cy);

    // Glowing lotus diamond star
    ctx.fillStyle = '#fef08a';
    ctx.shadowColor = 'rgba(250, 204, 21, 0.8)';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(11, 0);
    ctx.lineTo(0, 11);
    ctx.lineTo(-11, 0);
    ctx.closePath();
    ctx.fill();

    // Central ruby/amber core
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  ctx.restore();
}

function drawCardLantern(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x, y);

  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, size * 2.8);
  glow.addColorStop(0, 'rgba(255, 206, 114, 0.45)');
  glow.addColorStop(1, 'rgba(255, 145, 58, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, size * 2.8, 0, Math.PI * 2);
  ctx.fill();

  const w = size * 0.72;
  const h = size * 1.12;
  const body = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  body.addColorStop(0, '#c45b1c');
  body.addColorStop(0.5, '#f59e0b');
  body.addColorStop(1, '#fffbeb');
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

/**
 * Thai-friendly line wrapper using Intl.Segmenter('th')
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
