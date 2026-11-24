/**
 * Shared Procedural 2D Krathong Renderer
 * Used identically across:
 *   1) Living 2D River Canvas
 *   2) DIY Studio Live Preview Canvas
 *   3) Wish Inspector Modal Canvas
 *   4) High-Resolution 1080x1350 E-Card Generator
 */

export function isCoupleKrathong(spec) {
  if (!spec) return false;
  if (spec.isCouple) return true;
  return typeof spec.name === 'string' && spec.name.includes(' ♥ ');
}

export function drawKrathong(ctx, x, y, scale, spec, time, options = {}) {
  // Couple / Duo Mode: render two companion krathongs gently linked by a rose-gold heart ribbon!
  if (!options._singleInner && isCoupleKrathong(spec)) {
    const t = time * 0.001 + (options.phase || 0);
    const offsetX = 24 * scale;
    const offsetY = 5 * scale;

    // Draw back companion krathong slightly right & behind
    drawKrathong(
      ctx,
      x + offsetX,
      y - offsetY,
      scale * 0.8,
      {
        ...spec,
        baseType: spec.baseType === 'lotus' ? 'royal-gold' : 'lotus',
        flowerType: spec.flowerType === 'pink-lotus' ? 'rose' : 'pink-lotus',
      },
      time,
      {
        ...options,
        _singleInner: true,
        label: '',
        isHighlighted: false,
        isHovered: false,
        isMine: false,
        phase: (options.phase || 0) + 1.4,
      }
    );

    // Draw shimmering golden-rose connecting ribbon & floating hearts between the duo!
    ctx.save();
    ctx.globalAlpha = options.alpha ?? 1;
    const pulse = 0.72 + Math.sin(t * 3.4) * 0.28;
    ctx.strokeStyle = `rgba(249, 168, 212, ${0.65 * pulse})`;
    ctx.lineWidth = Math.max(1.2, 2.2 * scale);
    ctx.beginPath();
    ctx.moveTo(x - offsetX * 0.5, y + 3 * scale);
    ctx.quadraticCurveTo(x, y - 22 * scale, x + offsetX * 0.75, y - offsetY + 2 * scale);
    ctx.stroke();

    // 3 miniature glowing rose-gold hearts drifting softly upward between the pair
    for (let i = 0; i < 3; i++) {
      const prog = (t * 0.45 + i * 0.33) % 1;
      const hx = x + Math.sin(t * 2.5 + i * 2) * 8 * scale;
      const hy = y - 18 * scale - prog * 38 * scale;
      const ha = Math.sin(prog * Math.PI) * 0.9;
      ctx.save();
      ctx.globalAlpha = ha * (options.alpha ?? 1);
      ctx.fillStyle = i % 2 === 0 ? '#f472b6' : '#fde047';
      ctx.font = `${Math.max(10, Math.round(13 * scale))}px Prompt, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('♥', hx, hy);
      ctx.restore();
    }
    ctx.restore();

    // Draw main front krathong slightly left
    drawKrathong(ctx, x - offsetX * 0.62, y + offsetY * 0.65, scale * 0.92, spec, time, {
      ...options,
      _singleInner: true,
    });
    return;
  }

  let {
    baseType = 'banana-leaf',
    flowerType = 'marigold',
    candleType = 'classic-gold',
    ornamentType = 'coins',
  } = spec || {};

  // Resilient alias mappings
  if (baseType === 'gold') baseType = 'royal-gold';
  if (flowerType === 'purple-orchid' || flowerType === 'purple') flowerType = 'orchid';
  if (flowerType === 'lotus' || flowerType === 'pink-lotus') flowerType = 'pink-lotus';
  if (flowerType === 'red-gold-rose') flowerType = 'rose';
  if (candleType === 'lotus') candleType = 'lotus-candle';
  if (candleType === 'gold' || candleType === 'classic') candleType = 'classic-gold';
  if (ornamentType === 'fireflies') ornamentType = 'butterfly';

  const {
    showReflection = true,
    showRipples = true,
    isHighlighted = false,
    isHovered = false,
    isMine = false,
    label = '',
    phase = 0,
    alpha = 1,
  } = options;

  const t = time * 0.001 + phase;
  const bob = Math.sin(t * 1.9) * 2.1 * scale;
  const tilt = Math.sin(t * 1.35 + 0.7) * 0.032;
  const flicker = 0.92 + Math.sin(t * 11.5) * 0.05 + Math.cos(t * 17.3) * 0.04;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y + bob);

  // 1. Water Ripples beneath hull
  if (showRipples) {
    drawWaterRipples(ctx, scale, t, isHighlighted || isHovered);
  }

  // 2. Warm Shimmering Water Reflection beneath krathong
  if (showReflection) {
    drawWaterReflection(ctx, scale, t, flicker, candleType, baseType);
  }

  // 3. Highlight / Owner Halo on water
  if (isHighlighted || isHovered || isMine) {
    ctx.save();
    const pulse = 0.68 + Math.sin(t * 3.6) * 0.32;
    ctx.strokeStyle = isHighlighted
      ? `rgba(255, 232, 152, ${0.75 * pulse})`
      : isHovered
        ? 'rgba(255, 224, 138, 0.72)'
        : `rgba(107, 226, 176, ${0.42 * pulse})`;
    ctx.lineWidth = (isHighlighted ? 2.4 : 1.6) * scale;
    ctx.beginPath();
    ctx.ellipse(0, 6 * scale, 56 * scale, 21 * scale, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Rotate slightly for floating rock
  ctx.save();
  ctx.scale(scale, scale);
  ctx.rotate(tilt);

  // Soft ambient contact shadow on water
  const shadowGrad = ctx.createRadialGradient(0, 12, 8, 0, 12, 50);
  shadowGrad.addColorStop(0, 'rgba(3, 6, 18, 0.55)');
  shadowGrad.addColorStop(1, 'rgba(3, 6, 18, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(0, 12, 50, 17, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4. Back half of Krathong Base
  drawBaseBack(ctx, baseType);

  // 5. Back Flowers & Ornaments
  drawFlowerRing(ctx, flowerType, 'back', t);
  if (ornamentType === 'swan') {
    drawSwanOrnament(ctx);
  } else if (ornamentType === 'gold-leaf') {
    drawGoldLeafOrnament(ctx, 'back');
  }

  // 6. Center Candle & Incense + Warm Flame Aura
  drawCandleAndIncense(ctx, candleType, t, flicker);

  // 7. Front Flowers & Base Rim
  drawFlowerRing(ctx, flowerType, 'front', t);
  drawBaseFront(ctx, baseType);

  // 8. Front Ornaments (Coins, Garland, Leaves, Glowing Butterflies)
  if (ornamentType === 'coins') {
    drawCoinsOrnament(ctx, t);
  } else if (ornamentType === 'gold-leaf') {
    drawGoldLeafOrnament(ctx, 'front');
  } else if (ornamentType === 'garland') {
    drawGarlandOrnament(ctx);
  } else if (ornamentType === 'butterfly') {
    drawButterflyOrnament(ctx, t);
  }

  ctx.restore();

  // 9. Optional floating badge/name pill for Owner or Highlighted Krathong
  if (label && (isHighlighted || isMine)) {
    drawOwnerTag(ctx, scale, label, isHighlighted);
  }

  ctx.restore();
}

function drawWaterRipples(ctx, scale, t, emphasized) {
  ctx.save();
  const ringCount = emphasized ? 3 : 2;
  for (let i = 0; i < ringCount; i++) {
    const progress = (t * 0.36 + i / ringCount) % 1;
    const rx = (44 + progress * 34) * scale;
    const ry = (14 + progress * 12) * scale;
    const alpha = (1 - progress) * (emphasized ? 0.34 : 0.16);
    ctx.strokeStyle = `rgba(247, 214, 138, ${alpha})`;
    ctx.lineWidth = Math.max(0.7, 1.2 * scale);
    ctx.beginPath();
    ctx.ellipse(0, 11 * scale, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWaterReflection(ctx, scale, t, flicker, candleType, baseType) {
  ctx.save();
  // Warm vertical golden glow pool reflected on the ripples
  const glowColor =
    candleType === 'lotus-candle'
      ? '255, 178, 198'
      : baseType === 'royal-gold'
        ? '255, 218, 120'
        : '255, 196, 102';

  const grad = ctx.createRadialGradient(0, 22 * scale, 2 * scale, 0, 34 * scale, 48 * scale);
  grad.addColorStop(0, `rgba(${glowColor}, ${0.34 * flicker})`);
  grad.addColorStop(0.5, `rgba(242, 162, 68, ${0.14 * flicker})`);
  grad.addColorStop(1, 'rgba(242, 162, 68, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(0, 28 * scale, 48 * scale, 26 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Horizontal shimmering reflection ribbons
  for (let i = 0; i < 5; i++) {
    const ry = (18 + i * 7.5) * scale;
    const waveX = Math.sin(t * 2.8 + i * 1.4) * (4 + i * 1.4) * scale;
    const width = (26 - i * 3.8) * scale * flicker;
    ctx.fillStyle = `rgba(255, 225, 148, ${(0.28 - i * 0.048) * flicker})`;
    ctx.beginPath();
    ctx.ellipse(waveX, ry, Math.max(3, width), 1.5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ------------------ BASES ------------------ */
function drawBaseBack(ctx, baseType) {
  // Inner platform fill (dark lush interior where flowers sit)
  if (baseType === 'banana-leaf') {
    drawPleatedPetals(ctx, -Math.PI, 0, 11, '#1b4332', '#2d6a4f', '#52b788', 46, 20, -4);
    ctx.fillStyle = '#183a2c';
    ctx.beginPath();
    ctx.ellipse(0, -1, 37, 13, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (baseType === 'lotus') {
    drawLotusPetals(ctx, -Math.PI, 0, 9, '#b5486e', '#e789a8', '#ffe3ed', 49, 22, -5);
    ctx.fillStyle = '#752c49';
    ctx.beginPath();
    ctx.ellipse(0, -1, 36, 13, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (baseType === 'coconut') {
    // Coconut bowl back rim
    const grad = ctx.createLinearGradient(0, -14, 0, 10);
    grad.addColorStop(0, '#5a3820');
    grad.addColorStop(1, '#361f10');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, -2, 41, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d9a452';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  } else if (baseType === 'bread') {
    drawBreadPetals(ctx, -Math.PI, 0, 9, '#9e5c24', '#d89648', '#f5cb86', 46, 20, -4);
    ctx.fillStyle = '#7e481a';
    ctx.beginPath();
    ctx.ellipse(0, -1, 36, 13, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Default / royal-gold
    drawPleatedPetals(ctx, -Math.PI, 0, 11, '#7c5310', '#c9932c', '#fce192', 49, 22, -5);
    ctx.fillStyle = '#5c3c09';
    ctx.beginPath();
    ctx.ellipse(0, -1, 37, 13, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBaseFront(ctx, baseType) {
  if (baseType === 'banana-leaf') {
    // Lower woven banana trunk rim
    const hull = ctx.createLinearGradient(0, 0, 0, 19);
    hull.addColorStop(0, '#2d6a4f');
    hull.addColorStop(0.55, '#1e4d38');
    hull.addColorStop(1, '#123123');
    ctx.fillStyle = hull;
    ctx.beginPath();
    ctx.ellipse(0, 5, 42, 14.5, 0, 0, Math.PI);
    ctx.lineTo(-42, 2);
    ctx.ellipse(0, 2, 42, 13, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();

    // Front folded glip-phaka banana leaf petals
    drawPleatedPetals(ctx, 0.06, Math.PI - 0.06, 10, '#1e523a', '#3a865f', '#74c69d', 45, 17, 1);

    // Subtle gold Thai pin beads around rim
    ctx.fillStyle = '#f6d379';
    for (let i = 0; i < 7; i++) {
      const a = 0.25 + (i / 6) * (Math.PI - 0.5);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 38, Math.sin(a) * 12 + 5, 1.35, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (baseType === 'lotus') {
    // Rich layered pink-white sacred lotus front petals
    drawLotusPetals(ctx, 0.04, Math.PI - 0.04, 9, '#b5486e', '#ec95b4', '#fff1f6', 47, 18, 2);
    drawLotusPetals(ctx, 0.22, Math.PI - 0.22, 6, '#d06288', '#f8b9d0', '#ffffff', 38, 14, 4);
  } else if (baseType === 'coconut') {
    // Carved rounded coconut shell bowl
    const bowl = ctx.createRadialGradient(-8, 4, 4, 0, 8, 44);
    bowl.addColorStop(0, '#8d5b37');
    bowl.addColorStop(0.55, '#59361e');
    bowl.addColorStop(1, '#2b180b');
    ctx.fillStyle = bowl;
    ctx.beginPath();
    ctx.moveTo(-41, -1);
    ctx.bezierCurveTo(-40, 20, -18, 23, 0, 23);
    ctx.bezierCurveTo(18, 23, 40, 20, 41, -1);
    ctx.ellipse(0, -1, 41, 13, 0, 0, Math.PI, false);
    ctx.closePath();
    ctx.fill();

    // Delicate Lai Thai golden filigree pattern along the shell
    ctx.strokeStyle = 'rgba(246, 208, 122, 0.72)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    for (let i = -3; i <= 3; i++) {
      const cx = i * 10;
      const cy = 11 - Math.abs(i) * 1.1;
      ctx.moveTo(cx - 4, cy);
      ctx.quadraticCurveTo(cx, cy - 5, cx + 4, cy);
      ctx.quadraticCurveTo(cx, cy + 4, cx - 4, cy);
    }
    ctx.stroke();

    // Rim highlight
    ctx.strokeStyle = '#e4b765';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, -1, 41, 13, 0, 0.04, Math.PI - 0.04);
    ctx.stroke();
  } else if (baseType === 'bread') {
    // Golden toasted bread krathong petals
    const body = ctx.createLinearGradient(0, 0, 0, 20);
    body.addColorStop(0, '#d89648');
    body.addColorStop(1, '#8c4f1d');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 6, 41, 14, 0, 0, Math.PI);
    ctx.fill();

    drawBreadPetals(ctx, 0.06, Math.PI - 0.06, 9, '#a56024', '#de9f52', '#fbe0a6', 45, 17, 1);
  } else {
    // Default / royal-gold
    const body = ctx.createLinearGradient(0, 0, 0, 20);
    body.addColorStop(0, '#e5b34b');
    body.addColorStop(0.6, '#a87118');
    body.addColorStop(1, '#5d3b07');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 5, 43, 15, 0, 0, Math.PI);
    ctx.fill();

    drawPleatedPetals(ctx, 0.05, Math.PI - 0.05, 11, '#8c5e12', '#d7a135', '#fff0b8', 47, 18, 1);

    // Emerald gem accents
    for (let i = 0; i < 5; i++) {
      const a = 0.4 + (i / 4) * (Math.PI - 0.8);
      ctx.fillStyle = '#34d399';
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 34, Math.sin(a) * 11 + 6, 2.2, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPleatedPetals(ctx, startAngle, endAngle, count, dark, mid, light, rx, ry, yOffset) {
  for (let i = 0; i < count; i++) {
    const frac = count === 1 ? 0.5 : i / (count - 1);
    const angle = startAngle + frac * (endAngle - startAngle);
    const px = Math.cos(angle) * (rx * 0.78);
    const py = Math.sin(angle) * (ry * 0.62) + yOffset;
    const tipX = Math.cos(angle) * (rx * 1.07);
    const tipY = Math.sin(angle) * (ry * 0.72) + yOffset - 10;

    const grad = ctx.createLinearGradient(px, py + 7, tipX, tipY);
    grad.addColorStop(0, dark);
    grad.addColorStop(0.58, mid);
    grad.addColorStop(1, light);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(px - 6.5, py + 5);
    ctx.quadraticCurveTo(px - 4, tipY + 5, tipX, tipY);
    ctx.quadraticCurveTo(px + 4, tipY + 5, px + 6.5, py + 5);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 245, 210, 0.22)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
}

function drawLotusPetals(ctx, startAngle, endAngle, count, dark, mid, light, rx, ry, yOffset) {
  for (let i = 0; i < count; i++) {
    const frac = count === 1 ? 0.5 : i / (count - 1);
    const angle = startAngle + frac * (endAngle - startAngle);
    const px = Math.cos(angle) * (rx * 0.72);
    const py = Math.sin(angle) * (ry * 0.56) + yOffset;
    const tipX = Math.cos(angle) * (rx * 1.08);
    const tipY = Math.sin(angle) * (ry * 0.68) + yOffset - 12;

    const grad = ctx.createLinearGradient(px, py + 6, tipX, tipY);
    grad.addColorStop(0, dark);
    grad.addColorStop(0.55, mid);
    grad.addColorStop(1, light);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(px - 8, py + 5);
    ctx.bezierCurveTo(px - 10, tipY + 6, tipX - 3, tipY + 1, tipX, tipY);
    ctx.bezierCurveTo(tipX + 3, tipY + 1, px + 10, tipY + 6, px + 8, py + 5);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 245, 248, 0.28)';
    ctx.lineWidth = 0.75;
    ctx.stroke();
  }
}

function drawBreadPetals(ctx, startAngle, endAngle, count, dark, mid, light, rx, ry, yOffset) {
  for (let i = 0; i < count; i++) {
    const frac = count === 1 ? 0.5 : i / (count - 1);
    const angle = startAngle + frac * (endAngle - startAngle);
    const px = Math.cos(angle) * (rx * 0.78);
    const py = Math.sin(angle) * (ry * 0.58) + yOffset;
    const tipX = Math.cos(angle) * (rx * 1.02);
    const tipY = Math.sin(angle) * (ry * 0.64) + yOffset - 8;

    const grad = ctx.createRadialGradient(tipX, tipY + 3, 2, px, py + 2, 13);
    grad.addColorStop(0, light);
    grad.addColorStop(0.65, mid);
    grad.addColorStop(1, dark);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(px - 7.5, py + 5);
    ctx.quadraticCurveTo(px - 8, tipY - 2, tipX, tipY);
    ctx.quadraticCurveTo(px + 8, tipY - 2, px + 7.5, py + 5);
    ctx.closePath();
    ctx.fill();
  }
}

/* ------------------ FLOWERS ------------------ */
function drawFlowerRing(ctx, flowerType, half, t) {
  const count = 10;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + 0.15;
    const isFront = Math.sin(angle) >= 0;
    if ((half === 'front' && !isFront) || (half === 'back' && isFront)) continue;

    const fx = Math.cos(angle) * 28.5;
    const fy = Math.sin(angle) * 9.5 - 3.5;

    if (flowerType === 'marigold') {
      drawMarigoldBloom(ctx, fx, fy, 7.2);
    } else if (flowerType === 'orchid') {
      drawOrchidBloom(ctx, fx, fy, 7.6);
    } else if (flowerType === 'pink-lotus') {
      drawMiniLotusBloom(ctx, fx, fy, 7.4);
    } else if (flowerType === 'jasmine') {
      drawJasmineCluster(ctx, fx, fy, 6.8);
    } else if (flowerType === 'rose') {
      drawRoseBloom(ctx, fx, fy, 7.2, t + i);
    } else {
      drawMarigoldBloom(ctx, fx, fy, 7.2);
    }
  }
}

function drawMarigoldBloom(ctx, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#d97706';
  for (let p = 0; p < 8; p++) {
    const a = (p / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * (r * 0.45), Math.sin(a) * (r * 0.35), r * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fbbf24';
  for (let p = 0; p < 6; p++) {
    const a = (p / 6) * Math.PI * 2 + 0.3;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * (r * 0.28), Math.sin(a) * (r * 0.22), r * 0.34, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(0, -0.5, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawOrchidBloom(ctx, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  for (let p = 0; p < 5; p++) {
    const a = (p / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = p % 2 === 0 ? '#a855f7' : '#c084fc';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.48, r * 0.32, r * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#f5d0fe';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMiniLotusBloom(ctx, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  for (let p = 0; p < 6; p++) {
    const a = (p / 6) * Math.PI * 2;
    ctx.save();
    ctx.rotate(a);
    ctx.fillStyle = p % 2 === 0 ? '#f472b6' : '#fbcfe8';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.44, r * 0.28, r * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawJasmineCluster(ctx, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#2f855a';
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, r * 0.2, r * 0.45, r * 0.22, -0.4, 0, Math.PI * 2);
  ctx.fill();

  const offsets = [
    [-2.5, -1],
    [2.5, -1.2],
    [0, 1.8],
    [0, -3.2],
  ];
  for (const [ox, oy] of offsets) {
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(ox, oy, r * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef9c3';
    ctx.beginPath();
    ctx.arc(ox, oy, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawRoseBloom(ctx, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#9f1239';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e11d48';
  for (let p = 0; p < 5; p++) {
    const a = (p / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * (r * 0.26), Math.sin(a) * (r * 0.2), r * 0.36, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#fda4af';
  ctx.beginPath();
  ctx.arc(0, -0.4, r * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ------------------ CANDLES & INCENSE ------------------ */
function drawCandleAndIncense(ctx, candleType, t, flicker) {
  if (candleType === 'classic-gold') {
    // 3 Incense sticks behind candle
    drawIncenseSticks(ctx, t);
    // Tall golden beeswax candle
    const cGrad = ctx.createLinearGradient(-4.5, 0, 4.5, 0);
    cGrad.addColorStop(0, '#c27b14');
    cGrad.addColorStop(0.45, '#fce195');
    cGrad.addColorStop(1, '#b56e0d');
    ctx.fillStyle = cGrad;
    roundRectPath(ctx, -4.4, -33, 8.8, 30, 3);
    ctx.fill();

    // Wick + flickering teardrop flame
    drawFlame(ctx, 0, -35, 1.05, t, flicker);
  } else if (candleType === 'lotus-candle') {
    drawIncenseSticks(ctx, t, -6);
    // Sculpted pink lotus wax candle
    const baseY = -8;
    for (let i = -2; i <= 2; i++) {
      ctx.fillStyle = Math.abs(i) === 2 ? '#be185d' : i === 0 ? '#fbcfe8' : '#ec4899';
      ctx.beginPath();
      ctx.moveTo(i * 4.5, baseY + 5);
      ctx.quadraticCurveTo(i * 7.5, baseY - 12, i * 3, baseY - 17 + Math.abs(i) * 2);
      ctx.quadraticCurveTo(i * 1.5, baseY - 4, i * 4.5, baseY + 5);
      ctx.fill();
    }
    drawFlame(ctx, 0, -25, 1.0, t, flicker, '#ff9ec7');
  } else if (candleType === 'twin-candle') {
    drawIncenseSticks(ctx, t, 0);
    const positions = [-7.5, 7.5];
    for (let idx = 0; idx < positions.length; idx++) {
      const cx = positions[idx];
      const h = idx === 0 ? 27 : 24;
      const g = ctx.createLinearGradient(cx - 3.5, 0, cx + 3.5, 0);
      g.addColorStop(0, '#d97706');
      g.addColorStop(0.5, '#fef3c7');
      g.addColorStop(1, '#b45309');
      ctx.fillStyle = g;
      roundRectPath(ctx, cx - 3.6, -h - 3, 7.2, h, 2.5);
      ctx.fill();
      drawFlame(ctx, cx, -h - 5, 0.88, t + idx * 1.2, flicker);
    }
  } else if (candleType === 'lantern-mini') {
    // Contemporary frosted glass tealight lantern
    const aura = ctx.createRadialGradient(0, -18, 3, 0, -18, 42 * flicker);
    aura.addColorStop(0, 'rgba(255, 224, 130, 0.58)');
    aura.addColorStop(0.45, 'rgba(246, 165, 65, 0.24)');
    aura.addColorStop(1, 'rgba(246, 165, 65, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, -18, 42 * flicker, 0, Math.PI * 2);
    ctx.fill();

    // Brass rim base
    ctx.fillStyle = '#c8922f';
    roundRectPath(ctx, -11, -7, 22, 5, 2);
    ctx.fill();

    // Frosted glass cylinder
    const glass = ctx.createLinearGradient(-10, -28, 10, -7);
    glass.addColorStop(0, 'rgba(255, 245, 210, 0.42)');
    glass.addColorStop(0.5, 'rgba(255, 200, 105, 0.56)');
    glass.addColorStop(1, 'rgba(255, 240, 200, 0.34)');
    ctx.fillStyle = glass;
    roundRectPath(ctx, -10, -29, 20, 23, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 235, 175, 0.65)';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Top brass crown
    ctx.fillStyle = '#d49d38';
    roundRectPath(ctx, -11, -31, 22, 3.2, 1.5);
    ctx.fill();

    drawFlame(ctx, 0, -17, 0.78, t, flicker);
  }
}

function drawIncenseSticks(ctx, t, offsetX = 0) {
  const sticks = [
    { x0: -5 + offsetX, x1: -11 + offsetX, y1: -37 },
    { x0: 0 + offsetX, x1: 0 + offsetX, y1: -41 },
    { x0: 5 + offsetX, x1: 11 + offsetX, y1: -37 },
  ];

  for (let i = 0; i < sticks.length; i++) {
    const s = sticks[i];
    ctx.strokeStyle = '#9a7b5c';
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.moveTo(s.x0, -4);
    ctx.lineTo(s.x1, s.y1);
    ctx.stroke();

    // Glowing ember tip
    ctx.fillStyle = '#ff6b35';
    ctx.beginPath();
    ctx.arc(s.x1, s.y1, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Delicate wispy rising smoke
    ctx.save();
    ctx.strokeStyle = 'rgba(235, 240, 255, 0.24)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1 - 1);
    const sway1 = Math.sin(t * 1.9 + i * 2.1) * 5;
    const sway2 = Math.cos(t * 1.5 + i * 1.7) * 7;
    ctx.bezierCurveTo(
      s.x1 + sway1,
      s.y1 - 11,
      s.x1 - sway2 * 0.6,
      s.y1 - 21,
      s.x1 + sway2,
      s.y1 - 32
    );
    ctx.stroke();
    ctx.restore();
  }
}

function drawFlame(ctx, x, y, size, t, flicker, tintColor = '#ffbe4f') {
  const sway = Math.sin(t * 9.5) * 1.15;

  // Radial warm bloom
  const bloom = ctx.createRadialGradient(x, y - 5 * size, 1, x, y - 5 * size, 36 * size * flicker);
  bloom.addColorStop(0, 'rgba(255, 244, 196, 0.72)');
  bloom.addColorStop(0.28, 'rgba(255, 186, 72, 0.36)');
  bloom.addColorStop(0.65, 'rgba(255, 136, 42, 0.1)');
  bloom.addColorStop(1, 'rgba(255, 136, 42, 0)');
  ctx.fillStyle = bloom;
  ctx.beginPath();
  ctx.arc(x, y - 5 * size, 36 * size * flicker, 0, Math.PI * 2);
  ctx.fill();

  // Outer flame
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = tintColor;
  ctx.beginPath();
  ctx.moveTo(0, 1);
  ctx.bezierCurveTo(-6.2 * size, -3 * size, -4.5 * size + sway * 0.5, -12 * size, sway, -18 * size * flicker);
  ctx.bezierCurveTo(4.5 * size + sway * 0.5, -12 * size, 6.2 * size, -3 * size, 0, 1);
  ctx.fill();

  // Bright inner core
  ctx.fillStyle = '#fffbeb';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-3 * size, -2 * size, -2 * size, -7 * size, sway * 0.5, -11.5 * size * flicker);
  ctx.bezierCurveTo(2 * size, -7 * size, 3 * size, -2 * size, 0, 0);
  ctx.fill();
  ctx.restore();
}

/* ------------------ ORNAMENTS ------------------ */
function drawCoinsOrnament(ctx, t) {
  const coins = [
    [-16, 4],
    [-8, 6.5],
    [0, 7.5],
    [9, 6.5],
    [16, 4],
  ];
  for (let i = 0; i < coins.length; i++) {
    const [cx, cy] = coins[i];
    const glint = 0.65 + Math.sin(t * 4.2 + i * 1.4) * 0.35;
    ctx.fillStyle = '#d99116';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 4.3, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 240, 165, ${glint})`;
    ctx.beginPath();
    ctx.ellipse(cx - 0.6, cy - 0.4, 2.7, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGoldLeafOrnament(ctx, half) {
  const leaves =
    half === 'back'
      ? [
          { x: -24, y: -12, ang: -0.7, gold: true },
          { x: 24, y: -12, ang: 0.7, gold: false },
        ]
      : [
          { x: -19, y: 2, ang: -0.45, gold: false },
          { x: 19, y: 2, ang: 0.45, gold: true },
        ];
  for (const lf of leaves) {
    ctx.save();
    ctx.translate(lf.x, lf.y);
    ctx.rotate(lf.ang);
    const g = ctx.createLinearGradient(0, 6, 0, -12);
    if (lf.gold) {
      g.addColorStop(0, '#b47b16');
      g.addColorStop(1, '#fef08a');
    } else {
      g.addColorStop(0, '#94a3b8');
      g.addColorStop(1, '#f8fafc');
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.quadraticCurveTo(-5, -2, 0, -12);
    ctx.quadraticCurveTo(5, -2, 0, 6);
    ctx.fill();
    ctx.restore();
  }
}

function drawSwanOrnament(ctx) {
  // Graceful folded banana-leaf miniature Thai swan on the right rim
  ctx.save();
  ctx.translate(18, -6);
  ctx.fillStyle = '#40916c';
  ctx.beginPath();
  ctx.ellipse(0, 2, 10, 5.5, -0.15, 0, Math.PI * 2);
  ctx.fill();

  // Elegant S-curved neck
  ctx.strokeStyle = '#74c69d';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.bezierCurveTo(-8, -10, -2, -19, 4, -18);
  ctx.stroke();

  // Beak & crown accent
  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.moveTo(4, -18.5);
  ctx.lineTo(8.5, -17);
  ctx.lineTo(4, -16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGarlandOrnament(ctx) {
  // Miniature Thai Phuang Malai draped gracefully across the front rim
  ctx.save();
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 3.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-21, 1);
  ctx.quadraticCurveTo(0, 13, 21, 1);
  ctx.stroke();

  // Rose & marigold tassel accents
  const beads = [-14, -7, 0, 7, 14];
  for (let i = 0; i < beads.length; i++) {
    const bx = beads[i];
    const by = 7 - Math.abs(bx) * 0.28;
    ctx.fillStyle = i % 2 === 0 ? '#f43f5e' : '#fbbf24';
    ctx.beginPath();
    ctx.arc(bx, by, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawButterflyOrnament(ctx, t) {
  // Orbiting ethereal fireflies + glowing golden butterfly
  for (let i = 0; i < 4; i++) {
    const a = t * (1.2 + i * 0.25) + i * 1.6;
    const fx = Math.cos(a) * (24 + i * 5);
    const fy = -22 + Math.sin(a * 1.5) * 11 - i * 3;
    const glow = 0.55 + Math.sin(t * 5 + i * 2) * 0.45;
    ctx.fillStyle = `rgba(255, 240, 155, ${glow})`;
    ctx.beginPath();
    ctx.arc(fx, fy, 1.9, 0, Math.PI * 2);
    ctx.fill();
  }

  // Golden butterfly hovering gently near upper left
  const bx = -22 + Math.sin(t * 2.2) * 4;
  const by = -28 + Math.cos(t * 2.7) * 3;
  const wing = 0.55 + Math.abs(Math.sin(t * 8.5)) * 0.65;

  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(-0.2);
  ctx.fillStyle = 'rgba(255, 224, 128, 0.9)';
  ctx.beginPath();
  ctx.ellipse(-3.2 * wing, -1, 4.2 * wing, 3, -0.4, 0, Math.PI * 2);
  ctx.ellipse(3.2 * wing, -1, 4.2 * wing, 3, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawOwnerTag(ctx, scale, label, isHighlighted) {
  ctx.save();
  const text = label.length > 18 ? label.slice(0, 17) + '…' : label;
  ctx.font = `500 ${Math.max(11, Math.round(12 * Math.min(scale, 1.15)))}px Prompt, sans-serif`;
  const w = ctx.measureText(text).width + 18;
  const h = 22;
  const ty = -54 * scale - 16;

  ctx.fillStyle = isHighlighted ? 'rgba(247, 214, 138, 0.94)' : 'rgba(11, 16, 34, 0.78)';
  ctx.strokeStyle = isHighlighted ? '#fff6dc' : 'rgba(107, 226, 176, 0.7)';
  ctx.lineWidth = 1;
  roundRectPath(ctx, -w / 2, ty - h / 2, w, h, 11);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isHighlighted ? '#1a1204' : '#e2fff2';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, ty + 0.5);
  ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, r) {
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
