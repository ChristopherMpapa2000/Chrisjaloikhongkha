/**
 * Ambient Thai River Cameos Engine:
 *   1. 🏊‍♂️ Sneaky Coin-Diver Kid ("เด็กแอบว่ายน้ำเก็บเหรียญ"):
 *      Pops up wearing swim goggles & bright orange floatie ring, paddles over to krathongs
 *      with lucky coins (or searches the river), grabs a glinting coin ("ขอค่าขนม 10 บาทนะพี่!"),
 *      and dives underwater if clicked ("จ๊าก! โดนจับได้แล้ว!")!
 *   2. 🐟 Glowing Fish School ("ฝูงปลาตอดกระทงขนมปัง"):
 *      Graceful glowing koi/catfish silhouettes glide smoothly through the night river to nibble
 *      eco bread krathongs ("งั่มๆ อร่อยจัง!") leaving delicate water ripples.
 */
export class RiverCameosController {
  constructor(engine, callbacks = {}) {
    this.engine = engine;
    this.callbacks = callbacks;

    this.coinKid = {
      state: 'hidden', // hidden | surfacing | swimming | grabbing | fleeing | diving
      x: 0,
      y: 0,
      targetKrathongId: null,
      targetX: 0,
      targetY: 0,
      age: 0,
      emerge: 0,
      dir: 1,
      bubble: '',
      bubbleTimer: 0,
      cooldown: 7,
    };

    this.fishSchool = {
      active: false,
      targetKrathongId: null,
      centerX: 0,
      centerY: 0,
      vx: 0,
      vy: 0,
      age: 0,
      duration: 9.5,
      bubble: '',
      bubbleTimer: 0,
      cooldown: 11,
      fishes: [],
    };

    this.bubbles = [];
    this.coinSparks = [];
  }

  reset() {
    this.coinKid.state = 'hidden';
    this.coinKid.cooldown = 6;
    this.fishSchool.active = false;
    this.fishSchool.cooldown = 10;
    this.bubbles = [];
    this.coinSparks = [];
  }

  /**
   * Immediately invites a matching cameo shortly after user floats a coin or bread krathong!
   */
  notifyNewKrathong(krathong) {
    if (!krathong) return;
    if (krathong.ornamentType === 'coins' && this.coinKid.state === 'hidden') {
      this.coinKid.cooldown = Math.min(this.coinKid.cooldown, 3.2);
    }
    if (krathong.baseType === 'bread' && !this.fishSchool.active) {
      this.fishSchool.cooldown = Math.min(this.fishSchool.cooldown, 2.8);
    }
  }

  handleClick(px, py) {
    // Clicking the sneaky coin-diver kid startles them into diving away!
    const k = this.coinKid;
    if (k.state === 'hidden' || k.state === 'diving') return false;
    if (Math.hypot(px - k.x, py - (k.y - 10)) < 36) {
      k.state = 'fleeing';
      k.age = 0;
      k.bubble = 'จ๊าก!! โดนจับได้แล้ว ดำหนีก่อน! 💦';
      k.bubbleTimer = 1.8;
      this._spawnBubbles(k.x, k.y, 12);
      this.engine.addSplashRipple(k.x, k.y, false);
      if (this.callbacks.onKidCaught) this.callbacks.onKidCaught();
      return true;
    }
    return false;
  }

  update(dt, now) {
    const w = this.engine.width;
    const h = this.engine.height;
    const horizonY = h * 0.44;
    const krathongs = this.engine.krathongEntities || [];

    // Pause spawning new cameos while Godzilla or Throw Mode is active
    const busy = this.engine.isGodzillaActive() || this.engine.isLanternThrowActive();

    // --- 1. Update Coin-Diver Kid ---
    this._updateCoinKid(dt, now, w, h, horizonY, krathongs, busy);

    // --- 2. Update Glowing Bread-Nibbling Fish School ---
    this._updateFishSchool(dt, now, w, h, horizonY, krathongs, busy);

    // --- 3. Update Bubbles & Coin Sparks ---
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.age += dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.age >= b.life) this.bubbles.splice(i, 1);
    }
    for (let i = this.coinSparks.length - 1; i >= 0; i--) {
      const c = this.coinSparks[i];
      c.age += dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vy += 120 * dt;
      if (c.age >= c.life) this.coinSparks.splice(i, 1);
    }
  }

  _updateCoinKid(dt, now, w, h, horizonY, krathongs, busy) {
    const k = this.coinKid;
    if (k.bubbleTimer > 0) k.bubbleTimer = Math.max(0, k.bubbleTimer - dt);

    if (k.state === 'hidden') {
      if (busy || krathongs.length === 0) return;
      k.cooldown -= dt;
      if (k.cooldown <= 0) {
        // Prefer krathongs with lucky coins, otherwise pick any floating krathong
        const coinTarget =
          krathongs.find((e) => e.data.ornamentType === 'coins' && e.x > 90 && e.x < w - 90) ||
          krathongs.find((e) => e.x > 110 && e.x < w - 110);
        if (!coinTarget) {
          k.cooldown = 4;
          return;
        }
        const pos = this.engine._getEntityScreenPos(coinTarget);
        k.targetKrathongId = coinTarget.data.id;
        k.x = clamp(pos.x + (pos.x > w * 0.5 ? -135 : 135), 70, w - 70);
        k.y = clamp(pos.y + 18, horizonY + 70, h - 125);
        k.dir = pos.x >= k.x ? 1 : -1;
        k.state = 'surfacing';
        k.age = 0;
        k.emerge = 0;
        k.bubble = coinTarget.data.ornamentType === 'coins'
          ? 'เจอเป้าหมาย! กระทงใส่เหรียญ!! 👀'
          : 'เอ๊ะ กระทงนี้มีเหรียญมั้ยน้า~';
        k.bubbleTimer = 2.4;
        this._spawnBubbles(k.x, k.y, 10);
        this.engine.addSplashRipple(k.x, k.y, false);
      }
      return;
    }

    k.age += dt;
    const ent = krathongs.find((e) => e.data.id === k.targetKrathongId);

    if (k.state === 'surfacing') {
      k.emerge = Math.min(1, k.age / 0.65);
      if (k.emerge >= 1) {
        k.state = 'swimming';
        k.age = 0;
      }
    } else if (k.state === 'swimming') {
      if (!ent) {
        k.state = 'diving';
        k.age = 0;
        return;
      }
      const pos = this.engine._getEntityScreenPos(ent);
      const goalX = pos.x + (k.x < pos.x ? -44 : 44);
      const goalY = pos.y + 12;
      const dx = goalX - k.x;
      const dy = goalY - k.y;
      const dist = Math.hypot(dx, dy);
      k.dir = dx >= 0 ? 1 : -1;

      if (dist > 8) {
        const spd = 72;
        k.x += (dx / dist) * spd * dt;
        k.y += (dy / dist) * spd * dt;
        if (Math.random() < 0.22) {
          this._spawnBubbles(k.x - k.dir * 14, k.y + 4, 1);
        }
      } else {
        k.state = 'grabbing';
        k.age = 0;
        const hasCoins = ent.data.ornamentType === 'coins';
        k.bubble = hasCoins
          ? 'ขอค่าขนม 10 บาทนะพี่! เย้! ✨'
          : 'อ้าว ไม่มีเหรียญเลย ขอพรให้แทนละกัน!';
        k.bubbleTimer = 2.6;
        if (hasCoins) {
          this._spawnCoinSparks(pos.x, pos.y - 6, 8);
          this.engine.addSplashRipple(pos.x, pos.y + 8, true);
        }
      }
      if (k.age > 6) {
        k.state = 'diving';
        k.age = 0;
      }
    } else if (k.state === 'grabbing') {
      if (k.age >= 2.2) {
        k.state = 'diving';
        k.age = 0;
        this._spawnBubbles(k.x, k.y, 10);
      }
    } else if (k.state === 'fleeing') {
      k.x -= k.dir * 90 * dt;
      if (k.age >= 0.7) {
        k.state = 'diving';
        k.age = 0;
      }
    } else if (k.state === 'diving') {
      k.emerge = Math.max(0, 1 - k.age / 0.55);
      if (k.emerge <= 0) {
        k.state = 'hidden';
        k.cooldown = 16 + Math.random() * 12;
      }
    }
  }

  _updateFishSchool(dt, now, w, h, horizonY, krathongs, busy) {
    const fs = this.fishSchool;
    if (fs.bubbleTimer > 0) fs.bubbleTimer = Math.max(0, fs.bubbleTimer - dt);

    if (!fs.active) {
      if (busy) return;
      fs.cooldown -= dt;
      if (fs.cooldown <= 0) {
        const breadEnt = krathongs.find((e) => e.data.baseType === 'bread' && e.x > 80 && e.x < w - 80);
        const startLeft = Math.random() < 0.5;
        fs.active = true;
        fs.age = 0;
        fs.targetKrathongId = breadEnt ? breadEnt.data.id : null;
        fs.centerX = startLeft ? -60 : w + 60;
        fs.centerY = breadEnt
          ? this.engine._getEntityScreenPos(breadEnt).y + 24
          : horizonY + 90 + Math.random() * (h - horizonY - 210);
        fs.vx = startLeft ? 78 : -78;
        fs.vy = 0;
        fs.bubble = '';
        fs.fishes = Array.from({ length: 5 }, (_, i) => ({
          ox: (i - 2) * 20 + (Math.random() - 0.5) * 12,
          oy: ((i % 3) - 1) * 14 + (Math.random() - 0.5) * 8,
          size: 11 + (i % 3) * 3.5,
          phase: i * 1.3,
          color: i % 2 === 0 ? '#fbbf24' : '#fb923c',
        }));
      }
      return;
    }

    fs.age += dt;
    const breadEnt = fs.targetKrathongId
      ? krathongs.find((e) => e.data.id === fs.targetKrathongId)
      : null;

    if (breadEnt && fs.age < 7.2) {
      const pos = this.engine._getEntityScreenPos(breadEnt);
      const dx = pos.x - fs.centerX;
      const dy = pos.y + 18 - fs.centerY;
      const dist = Math.hypot(dx, dy);
      if (dist > 34) {
        fs.vx = (dx / dist) * 88;
        fs.vy = (dy / dist) * 62;
      } else {
        // Orbit happily nibbling the eco bread krathong!
        fs.vx = Math.cos(now * 0.004) * 38;
        fs.vy = Math.sin(now * 0.004) * 14;
        if (!fs.bubble) {
          fs.bubble = 'งั่มๆ กระทงขนมปังอร่อยจัง! 🐟✨';
          fs.bubbleTimer = 3.2;
          this.engine.addSplashRipple(pos.x, pos.y + 12, false);
        }
      }
    } else {
      // Swim gracefully off-screen
      if (Math.abs(fs.vx) < 55) fs.vx = fs.vx >= 0 ? 84 : -84;
      fs.vy *= 0.94;
    }

    fs.centerX += fs.vx * dt;
    fs.centerY = clamp(fs.centerY + fs.vy * dt, horizonY + 42, h - 92);

    if (fs.age >= fs.duration || fs.centerX < -140 || fs.centerX > w + 140) {
      fs.active = false;
      fs.cooldown = 15 + Math.random() * 12;
    }
  }

  _spawnBubbles(x, y, count) {
    for (let i = 0; i < count; i++) {
      this.bubbles.push({
        x: x + (Math.random() - 0.5) * 26,
        y: y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 18,
        vy: -14 - Math.random() * 24,
        r: 2 + Math.random() * 3.5,
        life: 0.8 + Math.random() * 0.5,
        age: 0,
      });
    }
  }

  _spawnCoinSparks(x, y, count) {
    for (let i = 0; i < count; i++) {
      this.coinSparks.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 75,
        vy: -55 - Math.random() * 65,
        r: 2.5 + Math.random() * 2,
        life: 0.75 + Math.random() * 0.35,
        age: 0,
      });
    }
  }

  /* ========================================================================
     RENDERING
     ======================================================================== */
  renderUnderwaterFish(ctx, now) {
    const fs = this.fishSchool;
    if (!fs.active) return;

    const dir = fs.vx >= 0 ? 1 : -1;
    ctx.save();
    for (const f of fs.fishes) {
      const fx = fs.centerX + f.ox + Math.sin(now * 0.004 + f.phase) * 5;
      const fy = fs.centerY + f.oy + Math.cos(now * 0.005 + f.phase) * 3;
      const tailWag = Math.sin(now * 0.016 + f.phase) * 0.35;

      ctx.save();
      ctx.translate(fx, fy);
      ctx.scale(dir, 1);

      // Soft underwater bioluminescent glow
      ctx.fillStyle = 'rgba(253, 224, 71, 0.14)';
      ctx.beginPath();
      ctx.ellipse(0, 0, f.size * 1.5, f.size * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Fish body (stylized golden-orange Koi silhouette beneath water surface)
      ctx.globalAlpha = 0.78;
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, f.size * 0.9, f.size * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wagging tail fin
      ctx.save();
      ctx.translate(-f.size * 0.85, 0);
      ctx.rotate(tailWag);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-f.size * 0.65, -f.size * 0.38);
      ctx.lineTo(-f.size * 0.65, f.size * 0.38);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.restore();
    }

    if (fs.bubbleTimer > 0 && fs.bubble) {
      this._drawCameoTag(ctx, fs.centerX, fs.centerY - 26, fs.bubble, '#fef9c3', 'rgba(251, 191, 36, 0.72)');
    }
    ctx.restore();
  }

  renderCoinDiverKid(ctx, now) {
    // Water bubbles & golden coin sparkles
    for (const b of this.bubbles) {
      const a = Math.max(0, 1 - b.age / b.life);
      ctx.save();
      ctx.strokeStyle = `rgba(186, 230, 253, ${a * 0.8})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const c of this.coinSparks) {
      const a = Math.max(0, 1 - c.age / c.life);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const k = this.coinKid;
    if (k.state === 'hidden' || k.emerge <= 0.02) return;

    const bob = Math.sin(now * 0.008) * 2.5;
    const rise = (1 - k.emerge) * 32;

    ctx.save();
    // Clip cleanly at the waterline so the kid pops authentically out of the water!
    ctx.beginPath();
    ctx.rect(0, 0, this.engine.width, k.y + 8);
    ctx.clip();

    ctx.translate(k.x, k.y + bob + rise);
    ctx.scale(k.dir, 1);

    // Bright Orange Inflatable Swim Ring (ห่วงยางสีส้ม!)
    ctx.fillStyle = '#fb923c';
    ctx.strokeStyle = '#ffedd5';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 2, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cute Thai kid head & messy wet hair
    ctx.fillStyle = '#e5a97c';
    ctx.beginPath();
    ctx.arc(0, -10, 11.5, 0, Math.PI * 2);
    ctx.fill();

    // Wet dark hair bangs
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(0, -13, 11.5, Math.PI * 1.05, Math.PI * 1.98);
    ctx.lineTo(10, -12);
    ctx.quadraticCurveTo(0, -16, -10, -12);
    ctx.closePath();
    ctx.fill();

    // Cute Bright Cyan Swim Goggles!
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(4.5, -10.5, 4.2, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(5.5, -10.5, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Cheeky grin
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(5, -6, 3.2, 0.15, Math.PI * 0.85);
    ctx.stroke();

    // Little splashing arm reaching forward when grabbing coin!
    const armWave = Math.sin(now * 0.015) * 4;
    ctx.strokeStyle = '#e5a97c';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(10, -2);
    ctx.lineTo(20, k.state === 'grabbing' ? -10 : -2 + armWave);
    ctx.stroke();

    ctx.restore();

    // Water ring ripples around floatie
    ctx.save();
    ctx.strokeStyle = `rgba(186, 230, 253, ${0.42 * k.emerge})`;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(k.x, k.y + 6, 26 + Math.sin(now * 0.008) * 3, 9, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Comic Speech Bubble above the sneaky coin-diver kid!
    if (k.bubbleTimer > 0 && k.bubble && k.emerge > 0.6) {
      this._drawCameoTag(ctx, k.x, k.y - 34, k.bubble, '#fff7ed', 'rgba(251, 146, 60, 0.85)');
    }
  }

  _drawCameoTag(ctx, x, y, text, textColor, borderColor) {
    ctx.save();
    ctx.font = '600 12px Prompt, sans-serif';
    const tw = ctx.measureText(text).width;
    const bw = tw + 22;
    const bh = 26;
    const bx = clamp(x - bw / 2, 12, this.engine.width - bw - 12);
    const by = Math.max(66, y - bh);

    ctx.fillStyle = 'rgba(10, 16, 34, 0.9)';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 13);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + bw / 2, by + bh / 2 + 0.5);
    ctx.restore();
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
