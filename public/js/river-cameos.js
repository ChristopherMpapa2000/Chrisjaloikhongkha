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

    // 3. 🐊 River Crocodile ("จระเข้แม่น้ำคาบเด็กเก็บเหรียญ")
    this.croc = {
      active: false,
      phase: 'idle', // idle | surfacing | chomping | swallowing | submerging
      x: 0,
      y: 0,
      targetX: 0,
      dir: 1,
      timer: 0,
      jawOpen: 0,
      submergeY: 0,
      bubble: '',
      bubbleTimer: 0,
      chewTimer: 0,
      burpBubble: null,
      floatieRing: null,
      impactStars: [],
    };
  }

  reset() {
    this.coinKid.state = 'hidden';
    this.coinKid.cooldown = 6;
    this.fishSchool.active = false;
    this.fishSchool.cooldown = 10;
    this.bubbles = [];
    this.coinSparks = [];
    this.croc.active = false;
    this.croc.phase = 'idle';
    this.croc.burpBubble = null;
    this.croc.floatieRing = null;
    this.croc.impactStars = [];
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
    // If crocodile is already active in that area, consume click
    if (this.croc.active && Math.hypot(px - this.croc.x, py - this.croc.y) < 60) {
      return true;
    }

    // Clicking the sneaky coin-diver kid summons a hungry river crocodile!
    const k = this.coinKid;
    if (k.state === 'hidden' || k.state === 'diving' || k.state === 'croc_attack') return false;
    if (Math.hypot(px - k.x, py - (k.y - 10)) < 42) {
      this.triggerCrocodileAttack();
      return true;
    }
    return false;
  }

  /**
   * Spawns a river crocodile emerging with snapping jaws to chomp the coin-diver kid!
   */
  triggerCrocodileAttack() {
    const k = this.coinKid;
    if (k.state === 'hidden') {
      k.x = this.engine.width * 0.5;
      k.y = this.engine.height * 0.62;
      k.emerge = 1;
      k.dir = 1;
    }
    k.state = 'croc_attack';
    k.age = 0;
    k.bubble = 'จ๊ากกกก!! จระเข้มาาา!! 🐊💦';
    k.bubbleTimer = 2.0;

    // Crocodile attacks head-on facing towards the kid
    const crocDir = k.dir >= 0 ? -1 : 1;
    const crocStartX = k.x + (crocDir > 0 ? -60 : 60);

    this.croc.active = true;
    this.croc.phase = 'surfacing';
    this.croc.x = crocStartX;
    this.croc.targetX = k.x + (crocDir > 0 ? -16 : 16);
    this.croc.y = k.y + 4;
    this.croc.dir = crocDir > 0 ? 1 : -1;
    this.croc.timer = 0;
    this.croc.jawOpen = 0;
    this.croc.submergeY = 22;
    this.croc.bubble = '';
    this.croc.bubbleTimer = 0;
    this.croc.chewTimer = 0;
    this.croc.burpBubble = null;
    this.croc.floatieRing = null;
    this.croc.impactStars = [];

    this._spawnBubbles(this.croc.x, this.croc.y, 16);
    this.engine.addSplashRipple(this.croc.x, this.croc.y, false);

    if (this.callbacks.onCrocAttack) this.callbacks.onCrocAttack();
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

    // --- 1.5 Update Hungry River Crocodile Cameo ---
    this._updateCrocodile(dt, now);

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
    } else if (k.state === 'croc_attack') {
      // Kid is frozen in panic, shaking and screaming while crocodile lunges!
      // When crocodile clamps shut, kid is swallowed (k.emerge set to 0)
      if (!this.croc.active) {
        k.state = 'hidden';
        k.emerge = 0;
      }
    } else if (k.state === 'diving') {
      k.emerge = Math.max(0, 1 - k.age / 0.55);
      if (k.emerge <= 0) {
        k.state = 'hidden';
        k.cooldown = 16 + Math.random() * 12;
      }
    }
  }

  _updateCrocodile(dt, now) {
    const c = this.croc;
    if (!c.active) return;

    c.timer += dt;
    if (c.bubbleTimer > 0) c.bubbleTimer = Math.max(0, c.bubbleTimer - dt);

    const k = this.coinKid;

    // Phase 1: surfacing (0.0s to 0.45s) - breaks through water surface
    if (c.phase === 'surfacing') {
      const prog = Math.min(1, c.timer / 0.45);
      c.x += (c.targetX - c.x) * (dt * 6.5);
      c.submergeY = (1 - prog) * 24;
      if (Math.random() < 0.35) {
        this._spawnBubbles(c.x + c.dir * 18, c.y, 2);
      }
      if (c.timer >= 0.45) {
        c.phase = 'chomping';
        c.timer = 0;
      }
    }
    // Phase 2: chomping (0.0s to 0.65s) - jaws open wide, lunges forward and CLAMPS shut!
    else if (c.phase === 'chomping') {
      c.submergeY = 0;
      if (c.timer < 0.28) {
        // Jaws open wide!
        c.jawOpen = Math.min(1, c.timer / 0.24);
        c.x += (k.x - c.x) * (dt * 14);
      } else {
        // SNAP! Jaws clamp violently shut!
        if (c.jawOpen > 0.05) {
          c.jawOpen = 0;
          c.bubble = 'งั่มมม!! 🐊💥 (เคี้ยวตุ้ยๆ)';
          c.bubbleTimer = 2.4;

          // Synthesized Chomp & Gulp Sound Effect!
          if (this.callbacks.onCrocChomp) this.callbacks.onCrocChomp();

          // Big splash ripples & foam
          this.engine.addSplashRipple(c.x, c.y, true);
          this.engine.addSplashRipple(k.x, k.y, false);
          this._spawnBubbles(c.x, c.y, 24);

          // Comic impact stars burst!
          this._spawnImpactStars(k.x, k.y - 8, 9);

          // Kid is swallowed!
          k.emerge = 0;
          k.state = 'croc_attack';

          // Pop the bright orange floatie ring! It flies slightly up and lands bobbing in water
          c.floatieRing = {
            x: k.x,
            y: k.y - 2,
            vx: -c.dir * 28,
            vy: -48,
            angle: 0.15,
            life: 2.2,
            age: 0,
          };
        }
      }

      if (c.timer >= 0.65) {
        c.phase = 'swallowing';
        c.timer = 0;
      }
    }
    // Phase 3: swallowing (0.0s to 1.15s) - chewing contentedly and BURPING!
    else if (c.phase === 'swallowing') {
      c.chewTimer += dt;
      // Satisfied chew wiggle
      c.jawOpen = Math.abs(Math.sin(c.chewTimer * 10)) * 0.18;

      // At 0.52s into swallowing: BURP!
      if (c.timer >= 0.52 && !c.burpBubble) {
        c.bubble = 'เอิ๊กก~ (อิ่มจัง) ✨';
        c.bubbleTimer = 2.0;
        c.burpBubble = {
          x: c.x + c.dir * 32,
          y: c.y - 18,
          vy: -32,
          vx: Math.random() * 8 - 4,
          r: 9,
          life: 1.4,
          age: 0,
        };
        this._spawnBubbles(c.x, c.y, 10);
      }

      if (c.timer >= 1.15) {
        c.phase = 'submerging';
        c.timer = 0;
      }
    }
    // Phase 4: submerging (0.0s to 0.85s) - smooth dive beneath river surface
    else if (c.phase === 'submerging') {
      const prog = Math.min(1, c.timer / 0.85);
      c.jawOpen = 0;
      c.submergeY = prog * 34; // slides back into deep river
      c.x += c.dir * 16 * dt;
      if (Math.random() < 0.25) {
        this._spawnBubbles(c.x - c.dir * 22, c.y, 2);
      }

      if (c.timer >= 0.85) {
        c.active = false;
        c.phase = 'idle';
        k.state = 'hidden';
        k.cooldown = 18 + Math.random() * 10;
      }
    }

    // Update floatie ring physics
    if (c.floatieRing) {
      const fr = c.floatieRing;
      fr.age += dt;
      fr.x += fr.vx * dt;
      fr.y += fr.vy * dt;
      fr.vy += 120 * dt;
      if (fr.y > k.y + 4) {
        fr.y = k.y + 4;
        fr.vy = 0;
        fr.vx *= 0.92;
      }
      fr.angle += dt * 1.6;
      if (fr.age >= fr.life) c.floatieRing = null;
    }

    // Update burp bubble
    if (c.burpBubble) {
      const bb = c.burpBubble;
      bb.age += dt;
      bb.x += bb.vx * dt;
      bb.y += bb.vy * dt;
      if (bb.age >= bb.life) c.burpBubble = null;
    }

    // Update comic impact stars
    for (let i = c.impactStars.length - 1; i >= 0; i--) {
      const s = c.impactStars[i];
      s.age += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.age >= s.life) c.impactStars.splice(i, 1);
    }
  }

  _spawnImpactStars(x, y, count) {
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const spd = 65 + Math.random() * 60;
      this.croc.impactStars.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        size: 5 + Math.random() * 4,
        rot: Math.random() * Math.PI,
        color: i % 2 === 0 ? '#fde047' : '#fb923c',
        life: 0.55,
        age: 0,
      });
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
    // Draw kid if active and not yet swallowed
    if (k.state !== 'hidden' && k.emerge > 0.02) {
      const isUnderAttack = k.state === 'croc_attack';
      const panicShake = isUnderAttack ? Math.sin(now * 0.04) * 3.5 : 0;
      const bob = Math.sin(now * 0.008) * 2.5;
      const rise = (1 - k.emerge) * 32;

      ctx.save();
      // Clip cleanly at the waterline so the kid pops authentically out of the water!
      ctx.beginPath();
      ctx.rect(0, 0, this.engine.width, k.y + 8);
      ctx.clip();

      ctx.translate(k.x + panicShake, k.y + bob + rise);
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

      if (isUnderAttack) {
        // Startled wide eyes with dilated pupils!
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e0f2fe';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(4.5, -10.5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(4.5, -10.5, 2, 0, Math.PI * 2);
        ctx.fill();

        // Wide open screaming mouth!
        ctx.fillStyle = '#7c2d12';
        ctx.beginPath();
        ctx.ellipse(4.5, -4.5, 3.5, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Panic sweat drop flying off
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.ellipse(-7, -18, 2.2, 3.5, -0.4, 0, Math.PI * 2);
        ctx.fill();

        // Both arms flailing up in panic!
        ctx.strokeStyle = '#e5a97c';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(8, -2);
        ctx.lineTo(16, -18 + Math.sin(now * 0.035) * 5);
        ctx.moveTo(-6, -2);
        ctx.lineTo(-14, -18 - Math.sin(now * 0.035) * 5);
        ctx.stroke();
      } else {
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
      }

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

    // Always render Hungry River Crocodile Cameo!
    this.renderCrocodile(ctx, now);
  }

  /**
   * Procedural River Crocodile with scaly snout, sharp snapping jaws, reptilian slit eye & tail!
   */
  renderCrocodile(ctx, now) {
    const c = this.croc;

    // 1. Draw leftover orange floatie ring bobbing away
    if (c.floatieRing) {
      const fr = c.floatieRing;
      const ringAlpha = Math.max(0, 1 - fr.age / fr.life);
      ctx.save();
      ctx.globalAlpha = ringAlpha;
      ctx.translate(fr.x, fr.y);
      ctx.rotate(fr.angle);

      // Empty bright orange swim ring
      ctx.fillStyle = '#fb923c';
      ctx.strokeStyle = '#ffedd5';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Empty inner hole
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Water ripple around floatie
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 4, 24, 6, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Draw comic burp bubble
    if (c.burpBubble) {
      const bb = c.burpBubble;
      const bAlpha = Math.max(0, 1 - bb.age / bb.life);
      ctx.save();
      ctx.globalAlpha = bAlpha;
      ctx.translate(bb.x, bb.y);

      // Iridescent soap bubble
      const bGrad = ctx.createRadialGradient(-bb.r * 0.3, -bb.r * 0.3, 1, 0, 0, bb.r);
      bGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      bGrad.addColorStop(0.3, 'rgba(186, 230, 253, 0.5)');
      bGrad.addColorStop(0.8, 'rgba(216, 180, 254, 0.35)');
      bGrad.addColorStop(1, 'rgba(56, 189, 248, 0.6)');
      ctx.fillStyle = bGrad;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, bb.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Specular shine
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-bb.r * 0.38, -bb.r * 0.38, bb.r * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 3. Draw comic impact stars
    for (const s of c.impactStars) {
      const a = Math.max(0, 1 - s.age / s.life);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      for (let p = 0; p < 8; p++) {
        const rad = p % 2 === 0 ? s.size : s.size * 0.38;
        const ang = (p * Math.PI) / 4;
        const px = Math.cos(ang) * rad;
        const py = Math.sin(ang) * rad;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    if (!c.active) return;

    // 4. Draw Crocodile Body & Jaws
    const submergeY = c.submergeY || 0;
    const jaw = c.jawOpen || 0;
    const isSwallowing = c.phase === 'swallowing';

    ctx.save();
    // Clip cleanly at the waterline so croc emerges from river depths
    ctx.beginPath();
    ctx.rect(0, 0, this.engine.width, c.y + 16);
    ctx.clip();

    ctx.translate(c.x, c.y + submergeY);
    ctx.scale(c.dir, 1);

    // Crocodile tail swishing in water behind
    const tailSwish = Math.sin(now * 0.012) * 5;
    ctx.save();
    ctx.translate(-42, 0);
    ctx.rotate(tailSwish * 0.04);
    ctx.fillStyle = '#1b4332';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.quadraticCurveTo(-22, -4 + tailSwish, -38, 2);
    ctx.lineTo(-44, 4);
    ctx.quadraticCurveTo(-24, 4 + tailSwish, 0, 4);
    ctx.closePath();
    ctx.fill();

    // Spiky tail dorsal ridges
    ctx.fillStyle = '#081c15';
    for (let r = 0; r < 3; r++) {
      const rx = -10 - r * 10;
      const ry = -4 + r * 1.5;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 4, ry - 6);
      ctx.lineTo(rx - 8, ry);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Crocodile body / back with scutes
    const bodyGrad = ctx.createLinearGradient(-42, -12, 10, 4);
    bodyGrad.addColorStop(0, '#1b4332');
    bodyGrad.addColorStop(0.5, '#2d6a4f');
    bodyGrad.addColorStop(1, '#1b4332');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(-42, 4);
    ctx.lineTo(-42, -6);
    ctx.quadraticCurveTo(-20, -13, 0, -8);
    ctx.lineTo(0, 4);
    ctx.closePath();
    ctx.fill();

    // Dorsal scutes (bumpy armor plates)
    ctx.fillStyle = '#081c15';
    for (let s = 0; s < 4; s++) {
      const sx = -34 + s * 9;
      const sy = -7 - (s === 2 ? 3 : 1.5);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 3.5, sy - 4.5);
      ctx.lineTo(sx + 7, sy);
      ctx.closePath();
      ctx.fill();
    }

    // Lower Jaw (opens downward with jaw angle)
    ctx.save();
    ctx.translate(-4, -1);
    ctx.rotate(jaw * 0.38);

    // Lower jaw flesh & scales
    ctx.fillStyle = '#2d6a4f';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(44, 1);
    ctx.quadraticCurveTo(46, 4, 42, 6);
    ctx.lineTo(0, 6);
    ctx.closePath();
    ctx.fill();

    // Pale olive underside
    ctx.fillStyle = '#74c69d';
    ctx.beginPath();
    ctx.moveTo(2, 4);
    ctx.lineTo(40, 4);
    ctx.quadraticCurveTo(43, 6, 40, 6.5);
    ctx.lineTo(2, 6.5);
    ctx.closePath();
    ctx.fill();

    // Pink tongue inside lower jaw
    ctx.fillStyle = '#f87171';
    ctx.beginPath();
    ctx.ellipse(18, 1, 14, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Lower sharp teeth (pointing UP)
    ctx.fillStyle = '#ffffff';
    const lowerTeeth = [8, 16, 24, 32, 38];
    for (const tx of lowerTeeth) {
      ctx.beginPath();
      ctx.moveTo(tx - 2, 1);
      ctx.lineTo(tx, -4.5);
      ctx.lineTo(tx + 2, 1);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Upper Jaw & Snout (opens upward with negative jaw angle)
    ctx.save();
    ctx.translate(-4, -6);
    ctx.rotate(-jaw * 0.52);

    // Upper snout body
    const snoutGrad = ctx.createLinearGradient(0, -10, 48, 2);
    snoutGrad.addColorStop(0, '#1b4332');
    snoutGrad.addColorStop(0.6, '#2d6a4f');
    snoutGrad.addColorStop(1, '#40916c');
    ctx.fillStyle = snoutGrad;

    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(0, -6);
    ctx.quadraticCurveTo(12, -7, 26, -5);
    ctx.lineTo(46, -2);
    // Nostril bump at tip
    ctx.quadraticCurveTo(50, -1, 50, 2);
    ctx.quadraticCurveTo(48, 5, 42, 5);
    ctx.closePath();
    ctx.fill();

    // Upper snout dorsal ridges
    ctx.fillStyle = '#081c15';
    for (let u = 0; u < 3; u++) {
      const ux = 12 + u * 10;
      ctx.beginPath();
      ctx.moveTo(ux, -6);
      ctx.lineTo(ux + 3, -8.5);
      ctx.lineTo(ux + 6, -5.5);
      ctx.closePath();
      ctx.fill();
    }

    // Nostril opening
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(46, -1, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Upper sharp teeth (pointing DOWN)
    ctx.fillStyle = '#ffffff';
    const upperTeeth = [6, 12, 19, 26, 34, 42];
    for (const tx of upperTeeth) {
      ctx.beginPath();
      ctx.moveTo(tx - 2.2, 4.5);
      ctx.lineTo(tx, 9.5);
      ctx.lineTo(tx + 2.2, 4.5);
      ctx.closePath();
      ctx.fill();
    }

    // Crocodile Eye & Bony Eyebrow ridge
    ctx.fillStyle = '#1b4332';
    ctx.beginPath();
    ctx.arc(6, -6, 5.5, Math.PI, Math.PI * 2);
    ctx.fill();

    if (isSwallowing) {
      // Contented happy cute closed eye arc! (^ shape)
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(6, -5, 3.5, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      // Menacing glowing golden-amber eye
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.ellipse(6, -6, 3.8, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sharp vertical black slit pupil
      ctx.fillStyle = '#090e24';
      ctx.beginPath();
      ctx.ellipse(6, -6, 1.1, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // White specular glint
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(5.2, -7.5, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore(); // end upper jaw
    ctx.restore(); // end crocodile translate/scale

    // Water splash foam ripples around crocodile!
    ctx.save();
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + 6, 42, 11, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(186, 230, 253, 0.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(c.x + c.dir * 12, c.y + 8, 56, 14, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 5. Comic Speech Tag above Crocodile!
    if (c.bubbleTimer > 0 && c.bubble) {
      this._drawCameoTag(ctx, c.x, c.y - 42, c.bubble, '#fef08a', 'rgba(34, 197, 94, 0.9)');
    }
  }

  _drawCameoTag(ctx, x, y, text, textColor, borderColor) {
    ctx.save();
    ctx.font = '600 12px Prompt, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
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
