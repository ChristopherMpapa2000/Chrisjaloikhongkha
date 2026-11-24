/**
 * Fantasy Firework Cannon + Cloaked UFO Ambush + Golden-Emerald Naga Awakening Engine
 *
 * Interactive Launcher Mode:
 *   - Brass Thai Firework Mortar Cannon aims dynamically at pointer
 *   - Fire Normal / Sky Click -> Blazing rocket breaks a cloaked Alien UFO's stealth shield!
 *     Cute green alien holding a tiny krathong panics, retaliates with rainbow disco fireworks,
 *     then hyperspace-warps out of the night sky!
 *   - Hold / Click Naga Charge -> Charges emerald-gold lightning (0% -> 100%), launches a
 *     celestial Golden Lotus Firework, and awakens a 28-segment luminous Golden-Emerald Thai Naga
 *     undulating gracefully across the moonlit sky while Naga Fireballs rise from the river!
 */
export class FireworkFantasyController {
  constructor(engine, callbacks = {}) {
    this.engine = engine;
    this.callbacks = callbacks;

    this.launcherOpen = false;
    this.aimX = 0.5;
    this.aimY = 0.22;
    this.cannonRecoil = 0;

    // Naga charge state
    this.chargingNaga = false;
    this.autoChargingNaga = false;
    this.chargeLevel = 0; // 0..1

    // Custom fantasy rockets & special burst particles
    this.rockets = [];
    this.specialParticles = [];
    this.nagaFireballs = [];
    this.shockwaves = [];

    // UFO Ambush State
    this.ufo = {
      state: 'hidden', // hidden | hit | panicking | retaliating | warping
      x: 0,
      y: 0,
      baseX: 0,
      baseY: 0,
      age: 0,
      shieldShards: [],
      smokeTimer: 0,
      discoCooldown: 0,
      discoShotsLeft: 0,
      warpStretch: 1,
      bubble: '',
    };

    // Golden-Emerald Naga State
    this.naga = {
      active: false,
      progress: 0, // 0 -> 1 across full sky arc
      duration: 6.4,
      direction: 1, // 1 = left-to-right, -1 = right-to-left
      fireballCooldown: 0,
      calloutTimer: 0,
    };
  }

  openLauncher(hooks = {}) {
    this.callbacks = hooks;
    this.launcherOpen = true;
    this.chargingNaga = false;
    this.autoChargingNaga = false;
    this.chargeLevel = 0;
    this.aimX = 0.5;
    this.aimY = 0.2;
    if (this.callbacks.onLauncherChange) {
      this.callbacks.onLauncherChange(true);
    }
    if (this.callbacks.onChargeUpdate) {
      this.callbacks.onChargeUpdate(0);
    }
  }

  closeLauncher() {
    if (!this.launcherOpen) return;
    this.launcherOpen = false;
    this.chargingNaga = false;
    this.autoChargingNaga = false;
    this.chargeLevel = 0;
    if (this.callbacks.onLauncherChange) {
      this.callbacks.onLauncherChange(false);
    }
  }

  resetForLocationChange() {
    this.closeLauncher();
    this.rockets = [];
    this.specialParticles = [];
    this.nagaFireballs = [];
    this.shockwaves = [];
    this.ufo.state = 'hidden';
    this.naga.active = false;
  }

  handlePointerMove(px, py) {
    if (!this.launcherOpen) return false;
    this.aimX = clamp(px / Math.max(1, this.engine.width), 0.08, 0.92);
    this.aimY = clamp(py / Math.max(1, this.engine.height), 0.06, 0.44);
    return true;
  }

  handlePointerDown(px, py) {
    if (!this.launcherOpen) return false;
    this.handlePointerMove(px, py);
    // Clicking the sky fires an interactive rocket right at the tapped spot
    if (py < this.engine.height * 0.65) {
      this.fireUfoOrSkyRocket(this.aimX, this.aimY);
      return true;
    }
    return false;
  }

  /**
   * Fires a firework rocket from the brass mortar cannon directly at the aimed target.
   * If aimed near the cloaked UFO (or fired towards it), strikes the stealth shield!
   */
  fireUfoOrSkyRocket(xRatio = null, yRatio = null) {
    const w = this.engine.width;
    const h = this.engine.height;

    // Use current user aim position if not explicitly supplied
    const targetXRatio = xRatio != null ? xRatio : this.aimX;
    const targetYRatio = yRatio != null ? yRatio : this.aimY;

    const tx = clamp(targetXRatio, 0.08, 0.92) * w;
    const ty = clamp(targetYRatio, 0.06, 0.44) * h;

    // UFO cloaked position is at (w * 0.5, h * 0.19)
    const ufoX = w * 0.5;
    const ufoY = h * 0.19;
    const distToUfo = Math.hypot(tx - ufoX, ty - ufoY);

    // If UFO is hidden, triggers UFO ambush if aimed near UFO (within 75px radius),
    // or if shot from the button with default aim close to center
    const triggerUfo = this.ufo.state === 'hidden' && (distToUfo < 75 || (xRatio == null && Math.abs(this.aimX - 0.5) < 0.15));

    this.cannonRecoil = 1;
    this._launchRocket(tx, ty, triggerUfo ? 'ufo-strike' : 'rainbow-burst');

    if (this.callbacks.onRocketFired) {
      this.callbacks.onRocketFired(tx / w, ty / h);
    }
  }

  startNagaCharge(autoSweep = false) {
    if (!this.launcherOpen) return;
    if (autoSweep) {
      this.autoChargingNaga = true;
      this.chargingNaga = true;
    } else {
      this.chargingNaga = true;
      this.autoChargingNaga = false;
    }
  }

  releaseNagaCharge() {
    if (!this.chargingNaga) return;
    // If user clicked quickly (< 0.35), smoothly auto-complete charge so tapping also summons the Naga!
    if (this.chargeLevel < 0.35) {
      this.autoChargingNaga = true;
      return;
    }
    if (this.chargeLevel >= 0.85) {
      this._fireNagaAwakeningRocket();
    } else {
      // Partial charge still fires a dazzling golden lotus firework!
      this.chargingNaga = false;
      this.autoChargingNaga = false;
      this.chargeLevel = 0;
      if (this.callbacks.onChargeUpdate) this.callbacks.onChargeUpdate(0);
      this._fireNagaAwakeningRocket();
    }
  }

  _fireNagaAwakeningRocket() {
    this.chargingNaga = false;
    this.autoChargingNaga = false;
    this.chargeLevel = 0;
    this.cannonRecoil = 1.35;
    if (this.callbacks.onChargeUpdate) this.callbacks.onChargeUpdate(0);

    const w = this.engine.width;
    const h = this.engine.height;
    this._launchRocket(w * 0.5, h * 0.18, 'naga-flare');

    // Close launcher overlay smoothly so user sees the full panoramic Golden Naga flight!
    this.closeLauncher();

    if (this.callbacks.onRocketFired) {
      this.callbacks.onRocketFired(0.5, 0.18);
    }
  }

  _launchRocket(targetX, targetY, kind) {
    const cx = this.engine.width * 0.5;
    const cy = this.engine.height - (this.launcherOpen ? 188 : 56);
    const angle = Math.atan2(targetY - cy, targetX - cx);
    const barrelLen = this.launcherOpen ? 46 : 28;
    const startX = cx + Math.cos(angle) * barrelLen;
    const startY = cy + Math.sin(angle) * barrelLen;
    const duration = kind === 'naga-flare' ? 0.68 : 0.52;

    this.rockets.push({
      startX,
      startY,
      x: startX,
      y: startY,
      targetX,
      targetY,
      age: 0,
      duration,
      kind,
      trail: [],
    });
  }

  update(dt, now) {
    const w = this.engine.width;
    const h = this.engine.height;
    const horizonY = h * 0.44;

    if (this.cannonRecoil > 0) {
      this.cannonRecoil = Math.max(0, this.cannonRecoil - dt * 5.2);
    }

    // --- 1. Naga Charge Meter ---
    if (this.chargingNaga) {
      const rate = this.autoChargingNaga ? 1.35 : 0.95;
      this.chargeLevel = Math.min(1, this.chargeLevel + dt * rate);
      if (this.callbacks.onChargeUpdate) {
        this.callbacks.onChargeUpdate(this.chargeLevel);
      }

      // Crackling emerald-gold charge sparks around mortar cannon
      if (Math.random() < 0.7) {
        const cx = w * 0.5;
        const cy = h - 190;
        const a = Math.random() * Math.PI * 2;
        const dist = 26 + Math.random() * 28;
        this.specialParticles.push({
          x: cx + Math.cos(a) * dist,
          y: cy + Math.sin(a) * dist,
          vx: -Math.cos(a) * 65,
          vy: -Math.sin(a) * 65,
          color: Math.random() < 0.5 ? '#34d399' : '#fde047',
          size: 2.2 + Math.random() * 2,
          life: 0.34,
          age: 0,
          gravity: 0,
        });
      }

      if (this.chargeLevel >= 1) {
        this._fireNagaAwakeningRocket();
      }
    }

    // --- 2. Active Rockets ---
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.age += dt;
      const t = clamp(r.age / r.duration, 0, 1);
      const ease = 1 - Math.pow(1 - t, 2.2);
      r.x = r.startX + (r.targetX - r.startX) * ease;
      r.y = r.startY + (r.targetY - r.startY) * ease - Math.sin(t * Math.PI) * 32;
      r.trail.push({ x: r.x, y: r.y });
      if (r.trail.length > 14) r.trail.shift();

      if (t >= 1) {
        this._detonateRocket(r);
        this.rockets.splice(i, 1);
      }
    }

    // --- 3. UFO Ambush State Machine ---
    this._updateUfo(dt, now, w);

    // --- 4. Golden-Emerald Naga Flight State Machine ---
    this._updateNaga(dt, now, w, h, horizonY);

    // --- 5. Naga Fireballs (บั้งไฟพญานาค) rising out of the river ---
    for (let i = this.nagaFireballs.length - 1; i >= 0; i--) {
      const fb = this.nagaFireballs[i];
      fb.age += dt;
      fb.y += fb.vy * dt;
      fb.x += Math.sin(now * 0.006 + fb.phase) * 18 * dt;
      fb.trail.push({ x: fb.x, y: fb.y });
      if (fb.trail.length > 10) fb.trail.shift();
      if (fb.age >= fb.life) this.nagaFireballs.splice(i, 1);
    }

    // --- 6. Shockwaves & Special Particles ---
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.age += dt;
      sw.r += sw.speed * dt;
      if (sw.age >= sw.life) this.shockwaves.splice(i, 1);
    }

    for (let i = this.specialParticles.length - 1; i >= 0; i--) {
      const p = this.specialParticles[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.975;
      p.vy = p.vy * 0.975 + (p.gravity ?? 44) * dt;
      if (p.age >= p.life) this.specialParticles.splice(i, 1);
    }
  }

  _detonateRocket(r) {
    if (r.kind === 'ufo-strike') {
      // Shatter stealth cloak and reveal the Alien UFO!
      this.closeLauncher();
      this._triggerUfoAmbush(r.targetX, r.targetY);
    } else if (r.kind === 'naga-flare') {
      // Burst into a 12-petal Golden Lotus Firework + Awaken the Golden Naga!
      this._burstLotusFirework(r.targetX, r.targetY);
      this._awakenGoldenNaga();
    } else {
      // Vibrant rainbow burst
      this._burstDiscoFirework(r.targetX, r.targetY);
      if (this.callbacks.onFireworkBoom) this.callbacks.onFireworkBoom();
    }
  }

  _triggerUfoAmbush(x, y) {
    const u = this.ufo;
    u.state = 'panicking';
    u.x = x;
    u.y = y;
    u.baseX = x;
    u.baseY = y;
    u.age = 0;
    u.warpStretch = 1;
    u.discoCooldown = 0.25;
    u.discoShotsLeft = 6;
    u.bubble = '🛸 เห้ย! แค่แวะมาลอยกระทง ยิงโดนยานทำไม!!';
    u.shieldShards = Array.from({ length: 18 }, (_, i) => {
      const a = (i / 18) * Math.PI * 2;
      const spd = 95 + Math.random() * 140;
      return {
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: 8 + Math.random() * 10,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 8,
        age: 0,
        life: 0.95,
      };
    });

    this.shockwaves.push({
      x,
      y,
      r: 12,
      speed: 240,
      color: '#38bdf8',
      life: 0.65,
      age: 0,
    });
    this._burstDiscoFirework(x, y);

    if (this.callbacks.onUfoHit) this.callbacks.onUfoHit();
  }

  _updateUfo(dt, now, w) {
    const u = this.ufo;
    if (u.state === 'hidden') return;

    u.age += dt;

    // Update shattered stealth cloak shards
    for (let i = u.shieldShards.length - 1; i >= 0; i--) {
      const s = u.shieldShards[i];
      s.age += dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.rot += s.vrot * dt;
      if (s.age >= s.life) u.shieldShards.splice(i, 1);
    }

    if (u.state === 'panicking') {
      // Wobble wildly & puff engine smoke!
      u.x = u.baseX + Math.sin(now * 0.022) * 14;
      u.y = u.baseY + Math.cos(now * 0.018) * 8;

      if (Math.random() < 0.55) {
        this.specialParticles.push({
          x: u.x + 26,
          y: u.y - 4,
          vx: 22 + Math.random() * 24,
          vy: -28 - Math.random() * 24,
          color: Math.random() < 0.35 ? '#fbbf24' : 'rgba(148, 163, 184, 0.72)',
          size: 4 + Math.random() * 5,
          life: 0.75,
          age: 0,
          gravity: -18,
        });
      }

      if (u.age >= 2.2) {
        u.state = 'retaliating';
        u.age = 0;
        u.bubble = 'รับพลุดิสโก้สายรุ้งไปเลย!! 🌈🛸';
        if (this.callbacks.onUfoDisco) this.callbacks.onUfoDisco();
      }
    } else if (u.state === 'retaliating') {
      // Hover smoothly across the sky blasting Rainbow Disco Fireworks!
      u.x = clamp(u.baseX + Math.sin(u.age * 2.6) * 120, w * 0.18, w * 0.82);
      u.y = u.baseY - 12 + Math.cos(u.age * 3.8) * 10;

      u.discoCooldown -= dt;
      if (u.discoCooldown <= 0 && u.discoShotsLeft > 0) {
        u.discoShotsLeft--;
        u.discoCooldown = 0.38;
        const bx = clamp(u.x + (Math.random() - 0.5) * 380, w * 0.12, w * 0.88);
        const by = clamp(u.y + (Math.random() - 0.3) * 130, 68, this.engine.height * 0.36);
        this._burstDiscoFirework(bx, by);
        if (this.callbacks.onFireworkBoom) this.callbacks.onFireworkBoom();
      }

      if (u.age >= 2.8) {
        u.state = 'warping';
        u.age = 0;
        u.bubble = 'วาร์ปหนีละจ้าาา บุ๋ยๆ! ⚡';
        this.shockwaves.push({
          x: u.x,
          y: u.y,
          r: 10,
          speed: 320,
          color: '#e879f9',
          life: 0.6,
          age: 0,
        });
        if (this.callbacks.onUfoWarp) this.callbacks.onUfoWarp();
      }
    } else if (u.state === 'warping') {
      u.warpStretch = 1 + u.age * 16;
      u.x += (u.age * u.age) * 1850 * dt;
      u.y -= u.age * 180 * dt;
      if (Math.random() < 0.85) {
        this.specialParticles.push({
          x: u.x - 20,
          y: u.y,
          vx: -140 - Math.random() * 120,
          vy: (Math.random() - 0.5) * 40,
          color: Math.random() < 0.5 ? '#67e8f9' : '#f472b6',
          size: 2.5 + Math.random() * 2.5,
          life: 0.55,
          age: 0,
          gravity: 0,
        });
      }
      if (u.age >= 0.9 || u.x > w + 260) {
        u.state = 'hidden';
      }
    }
  }

  _awakenGoldenNaga() {
    this.naga.active = true;
    this.naga.progress = 0;
    this.naga.direction = Math.random() < 0.5 ? 1 : -1;
    this.naga.fireballCooldown = 0.15;
    this.naga.calloutTimer = 3.2;

    const w = this.engine.width;
    const horizonY = this.engine.height * 0.44;
    const entryX = this.naga.direction === 1 ? w * 0.16 : w * 0.84;

    this.engine.addSplashRipple(entryX, horizonY + 34, true);
    this.shockwaves.push({
      x: entryX,
      y: horizonY,
      r: 18,
      speed: 220,
      color: '#34d399',
      life: 0.9,
      age: 0,
    });

    if (this.callbacks.onNagaAwaken) this.callbacks.onNagaAwaken();
  }

  _updateNaga(dt, now, w, h, horizonY) {
    if (!this.naga.active) return;

    this.naga.progress += dt / this.naga.duration;
    if (this.naga.calloutTimer > 0) this.naga.calloutTimer -= dt;

    // Continuously launch crimson-gold Bang Fai Phaya Nak (บั้งไฟพญานาค) rising out of the river!
    this.naga.fireballCooldown -= dt;
    if (this.naga.fireballCooldown <= 0 && this.naga.progress < 0.86) {
      this.naga.fireballCooldown = 0.24;
      const fx = w * (0.12 + Math.random() * 0.76);
      this.nagaFireballs.push({
        x: fx,
        y: horizonY + 26 + Math.random() * 45,
        vy: -155 - Math.random() * 95,
        phase: Math.random() * Math.PI * 2,
        r: 4.5 + Math.random() * 3,
        life: 1.55 + Math.random() * 0.4,
        age: 0,
        trail: [],
      });
      this.engine.addSplashRipple(fx, horizonY + 30, true);
    }

    // Golden-emerald stardust raining softly from Naga's head position
    const headPos = this._evalNagaSpine(this.naga.progress, w, h, horizonY, now);
    if (headPos.y < horizonY + 20 && Math.random() < 0.85) {
      this.specialParticles.push({
        x: headPos.x + (Math.random() - 0.5) * 28,
        y: headPos.y + (Math.random() - 0.5) * 18,
        vx: (Math.random() - 0.5) * 45,
        vy: 15 + Math.random() * 45,
        color: Math.random() < 0.55 ? '#fde047' : '#34d399',
        size: 2 + Math.random() * 2.6,
        life: 0.85 + Math.random() * 0.4,
        age: 0,
        gravity: 22,
      });
    }

    if (this.naga.progress >= 1.24) {
      this.naga.active = false;
    }
  }

  /**
   * Computes a graceful sweeping celestial arc for any point `t` along the Golden Naga's path:
   * Emerges from the river -> loops majestically across the moonlit sky -> dives back into the river!
   */
  _evalNagaSpine(t, w, h, horizonY, now) {
    const dir = this.naga.direction;
    const xStart = dir === 1 ? w * 0.08 : w * 0.92;
    const xEnd = dir === 1 ? w * 0.94 : w * 0.06;

    const x = xStart + (xEnd - xStart) * t;
    // Dramatic soaring arch cleanly gliding across the night sky above the landmarks & below top HUD
    const arch = Math.sin(clamp(t, -0.2, 1.2) * Math.PI);
    const wave = Math.sin(t * 14 - now * 0.0055) * 20;
    const y = horizonY + 56 - arch * (horizonY * 0.64) + wave;
    return { x, y };
  }

  _burstDiscoFirework(x, y) {
    const rainbow = ['#ff6bcb', '#38bdf8', '#fde047', '#4ade80', '#c084fc', '#fb923c', '#ffffff'];
    const count = 46;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.1;
      const spd = 65 + Math.random() * 145;
      this.specialParticles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color: rainbow[i % rainbow.length],
        size: 2.1 + Math.random() * 2.2,
        life: 1.1 + Math.random() * 0.55,
        age: 0,
        gravity: 42,
      });
    }
  }

  _burstLotusFirework(x, y) {
    // 12-petal sculpted Golden-Emerald Lotus Firework burst!
    const petals = 12;
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const petalMod = 0.55 + 0.55 * Math.abs(Math.sin(a * (petals / 2)));
      const spd = 145 * petalMod + (Math.random() - 0.5) * 14;
      this.specialParticles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color: i % 3 === 0 ? '#34d399' : i % 2 === 0 ? '#fef08a' : '#f59e0b',
        size: 2.4 + Math.random() * 2,
        life: 1.45 + Math.random() * 0.45,
        age: 0,
        gravity: 34,
      });
    }
    this.shockwaves.push({
      x,
      y,
      r: 14,
      speed: 260,
      color: '#fde047',
      life: 0.75,
      age: 0,
    });
  }

  /* ========================================================================
     RENDERING
     ======================================================================== */
  renderSkySpectacles(ctx, now) {
    const horizonY = this.engine.height * 0.44;
    const w = this.engine.width;
    const h = this.engine.height;

    // 1. Subtle shimmering stealth silhouette hint when launcher is open and UFO is cloaked!
    if (this.launcherOpen && this.ufo.state === 'hidden') {
      const hx = w * 0.5;
      const hy = h * 0.19;
      const shimmer = 0.1 + Math.abs(Math.sin(now * 0.004)) * 0.14;
      ctx.save();
      ctx.strokeStyle = `rgba(103, 232, 249, ${shimmer})`;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.ellipse(hx, hy, 44, 15, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Shockwave rings
    for (const sw of this.shockwaves) {
      const a = Math.max(0, 1 - sw.age / sw.life);
      ctx.save();
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = a * 0.75;
      ctx.lineWidth = 3 * a + 1;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 3. Flying Rockets
    for (const r of this.rockets) {
      ctx.save();
      for (let i = 1; i < r.trail.length; i++) {
        const f = i / r.trail.length;
        ctx.strokeStyle = r.kind === 'naga-flare'
          ? `rgba(52, 211, 153, ${f * 0.85})`
          : `rgba(254, 240, 138, ${f * 0.85})`;
        ctx.lineWidth = f * (r.kind === 'naga-flare' ? 8 : 5);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(r.trail[i - 1].x, r.trail[i - 1].y);
        ctx.lineTo(r.trail[i].x, r.trail[i].y);
        ctx.stroke();
      }
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.kind === 'naga-flare' ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Special Burst & Spark Particles (+ subtle water reflections!)
    for (const p of this.specialParticles) {
      const a = Math.max(0, 1 - p.age / p.life);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      // Mirror sky firework color faintly on the river surface
      if (p.y < horizonY) {
        const ry = horizonY + (horizonY - p.y) * 0.58;
        if (ry < h) {
          ctx.globalAlpha = a * 0.22;
          ctx.beginPath();
          ctx.ellipse(p.x, ry, p.size * 2.4, p.size * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // 5. Bang Fai Phaya Nak (บั้งไฟพญานาค) crimson-gold fireballs rising out of river!
    for (const fb of this.nagaFireballs) {
      const a = Math.sin(clamp(fb.age / fb.life, 0, 1) * Math.PI);
      ctx.save();
      ctx.globalAlpha = a;
      for (let i = 1; i < fb.trail.length; i++) {
        const f = i / fb.trail.length;
        ctx.strokeStyle = `rgba(251, 113, 133, ${f * 0.65})`;
        ctx.lineWidth = fb.r * f * 1.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(fb.trail[i - 1].x, fb.trail[i - 1].y);
        ctx.lineTo(fb.trail[i].x, fb.trail[i].y);
        ctx.stroke();
      }
      const g = ctx.createRadialGradient(fb.x, fb.y, 1, fb.x, fb.y, fb.r * 3.4);
      g.addColorStop(0, '#fff1f2');
      g.addColorStop(0.35, '#fb7185');
      g.addColorStop(1, 'rgba(244, 63, 94, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(fb.x, fb.y, fb.r * 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 6. Golden-Emerald Thai Naga soaring across the moonlit night sky!
    if (this.naga.active) {
      this._drawGoldenNaga(ctx, w, h, horizonY, now);
    }

    // 7. Alien UFO + Rainbow Disco Beam + Speech Bubble
    if (this.ufo.state !== 'hidden') {
      this._drawUfo(ctx, now, horizonY);
    }
  }

  renderForegroundLauncher(ctx, now) {
    if (!this.launcherOpen) return;

    const w = this.engine.width;
    const h = this.engine.height;
    const cx = w * 0.5;
    const cy = h - 188;
    const tx = this.aimX * w;
    const ty = this.aimY * h;
    const angle = Math.atan2(ty - cy, tx - cx);
    const recoilDist = this.cannonRecoil * 12;

    // Subtle aiming laser dots from mortar cannon toward cursor
    ctx.save();
    for (let i = 1; i <= 10; i++) {
      const f = i / 11;
      const dx = cx + (tx - cx) * f;
      const dy = cy + (ty - cy) * f;
      ctx.fillStyle = this.chargeLevel > 0.05
        ? `rgba(52, 211, 153, ${(1 - f) * 0.72})`
        : `rgba(254, 240, 138, ${(1 - f) * 0.55})`;
      ctx.beginPath();
      ctx.arc(dx, dy, 2.8 - f * 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Aiming Reticle Crosshair at (tx, ty)
    const isLockedOnUfo = this.ufo.state === 'hidden' && Math.hypot(tx - w * 0.5, ty - h * 0.19) < 65;
    const reticleColor = isLockedOnUfo ? '#34d399' : '#fef08a';

    ctx.save();
    ctx.translate(tx, ty);

    // Outer rotating reticle ring with ticks
    const rot = now * 0.002;
    ctx.strokeStyle = reticleColor;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.stroke();

    // 4 crosshair tick marks
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = rot + (k * Math.PI) / 2;
      ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 14);
      ctx.lineTo(Math.cos(a) * 23, Math.sin(a) * 23);
    }
    ctx.stroke();

    // Center pulsating target dot
    const dotPulse = 2.5 + Math.sin(now * 0.01) * 1;
    ctx.fillStyle = reticleColor;
    ctx.beginPath();
    ctx.arc(0, 0, dotPulse, 0, Math.PI * 2);
    ctx.fill();

    // Target label below reticle
    ctx.font = '600 11px Prompt, "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = isLockedOnUfo ? '#6ee7b7' : 'rgba(254, 240, 138, 0.9)';
    ctx.fillText(isLockedOnUfo ? '🎯 ล็อคเป้าหมาย UFO!' : '✦ จุดเล็งยิงพลุ', 0, 26);
    ctx.restore();

    // Brass Thai Firework Mortar Cannon
    ctx.save();
    ctx.translate(cx, cy);

    // Charge aura ring around mortar base
    if (this.chargeLevel > 0.02) {
      const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, 52 + this.chargeLevel * 38);
      glow.addColorStop(0, `rgba(52, 211, 153, ${0.55 * this.chargeLevel})`);
      glow.addColorStop(0.55, `rgba(250, 204, 21, ${0.35 * this.chargeLevel})`);
      glow.addColorStop(1, 'rgba(52, 211, 153, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 52 + this.chargeLevel * 38, 0, Math.PI * 2);
      ctx.fill();
    }

    // Swiveling gold-inlaid mortar barrel
    ctx.save();
    ctx.rotate(angle + Math.PI / 2);
    ctx.translate(0, recoilDist);
    const barrelGrad = ctx.createLinearGradient(-15, 0, 15, 0);
    barrelGrad.addColorStop(0, '#78480c');
    barrelGrad.addColorStop(0.45, '#f7d68a');
    barrelGrad.addColorStop(1, '#5e3508');
    ctx.fillStyle = barrelGrad;
    ctx.beginPath();
    ctx.roundRect(-14, -46, 28, 52, [6, 6, 10, 10]);
    ctx.fill();

    // Ornate crimson & gold Thai collar rings on barrel
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(-15, -36, 30, 6);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-16, -48, 32, 5);
    ctx.restore();

    // Wooden-gold pedestal carriage
    ctx.fillStyle = '#3b1d0c';
    ctx.strokeStyle = '#e5b34b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-28, -4, 56, 18, 8);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  _drawUfo(ctx, now, horizonY) {
    const u = this.ufo;
    const scale = clamp(this.engine.width / 1280, 0.72, 1.12);

    // Draw shattering cyan stealth shards
    for (const sh of u.shieldShards) {
      const a = Math.max(0, 1 - sh.age / sh.life);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(sh.x, sh.y);
      ctx.rotate(sh.rot);
      ctx.fillStyle = 'rgba(103, 232, 249, 0.72)';
      ctx.strokeStyle = '#e0f2fe';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -sh.size * 0.6);
      ctx.lineTo(sh.size * 0.5, 0);
      ctx.lineTo(0, sh.size * 0.6);
      ctx.lineTo(-sh.size * 0.5, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(u.x, u.y);

    // Rainbow Disco Tractor Beam during retaliation!
    if (u.state === 'retaliating') {
      const hue = (now * 0.35) % 360;
      const beam = ctx.createLinearGradient(0, 14 * scale, 0, horizonY - u.y + 40);
      beam.addColorStop(0, `hsla(${hue}, 92%, 66%, 0.46)`);
      beam.addColorStop(0.5, `hsla(${(hue + 90) % 360}, 90%, 62%, 0.22)`);
      beam.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(-22 * scale, 12 * scale);
      ctx.lineTo(-96 * scale, horizonY - u.y + 40);
      ctx.lineTo(96 * scale, horizonY - u.y + 40);
      ctx.lineTo(22 * scale, 12 * scale);
      ctx.closePath();
      ctx.fill();
    }

    const wobble = u.state === 'panicking' ? Math.sin(now * 0.03) * 0.16 : Math.sin(now * 0.008) * 0.06;
    ctx.rotate(wobble);
    ctx.scale(scale * u.warpStretch, scale / Math.sqrt(u.warpStretch));

    // Glowing bottom thruster ring
    const under = ctx.createRadialGradient(0, 12, 4, 0, 14, 48);
    under.addColorStop(0, u.state === 'retaliating' ? 'rgba(244, 114, 182, 0.72)' : 'rgba(56, 189, 248, 0.62)');
    under.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = under;
    ctx.beginPath();
    ctx.ellipse(0, 14, 48, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Metallic Saucer Hull
    const hull = ctx.createLinearGradient(-52, -10, 52, 16);
    hull.addColorStop(0, '#334155');
    hull.addColorStop(0.45, '#cbd5e1');
    hull.addColorStop(1, '#1e293b');
    ctx.fillStyle = hull;
    ctx.beginPath();
    ctx.ellipse(0, 4, 52, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Spinning Rainbow Neon Rim Lights
    const lightColors = ['#ff6bcb', '#38bdf8', '#fde047', '#4ade80', '#c084fc'];
    for (let i = 0; i < 7; i++) {
      const lx = -38 + i * 12.6;
      const ly = 5 + Math.cos(((i - 3) / 3) * 1.1) * 4;
      const cIdx = (i + Math.floor(now / 120)) % lightColors.length;
      ctx.fillStyle = lightColors[cIdx];
      ctx.beginPath();
      ctx.arc(lx, ly, 3.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Translucent Glass Cockpit Dome
    const dome = ctx.createRadialGradient(-8, -18, 3, 0, -8, 28);
    dome.addColorStop(0, 'rgba(224, 242, 254, 0.68)');
    dome.addColorStop(0.6, 'rgba(56, 189, 248, 0.34)');
    dome.addColorStop(1, 'rgba(15, 23, 42, 0.45)');
    ctx.fillStyle = dome;
    ctx.beginPath();
    ctx.arc(0, -4, 24, Math.PI, 0);
    ctx.closePath();
    ctx.fill();

    // Cute Wide-Eyed Green Alien Pilot inside dome holding a tiny glowing Krathong!
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.ellipse(0, -14, 9, 10.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Big shocked black alien eyes
    ctx.fillStyle = '#090d1a';
    ctx.beginPath();
    ctx.ellipse(-3.6, -14.5, 2.4, 3.4, -0.2, 0, Math.PI * 2);
    ctx.ellipse(3.6, -14.5, 2.4, 3.4, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-4.2, -15.5, 0.9, 0, Math.PI * 2);
    ctx.arc(3, -15.5, 0.9, 0, Math.PI * 2);
    ctx.fill();
    // Tiny mini pink-gold krathong held by alien!
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.ellipse(11, -7, 5, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(11, -10.5, 1.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Speech bubble above UFO
    if (u.bubble && u.state !== 'warping') {
      this._drawComicBubble(ctx, u.x, u.y - 42 * scale, u.bubble, '#e0f2fe', 'rgba(232, 121, 249, 0.85)');
    }
  }

  _drawGoldenNaga(ctx, w, h, horizonY, now) {
    const segCount = 28;
    const bodySpan = 0.3; // fraction of full path occupied by Naga length
    const scale = clamp(w / 1280, 0.65, 1.15);

    const pts = [];
    for (let i = 0; i < segCount; i++) {
      const segT = this.naga.progress - (i / segCount) * bodySpan;
      pts.push(this._evalNagaSpine(segT, w, h, horizonY, now));
    }

    ctx.save();
    // Clip cleanly slightly below horizon so Naga bursts genuinely OUT OF and BACK INTO the river!
    ctx.beginPath();
    ctx.rect(0, 0, w, horizonY + 26);
    ctx.clip();

    // Draw tail-to-head so front scales & crown overlap cleanly
    for (let i = segCount - 1; i >= 1; i--) {
      const p = pts[i];
      const prev = pts[i - 1];
      const frac = i / segCount; // 0 = head, 1 = tail tip
      const radius = (1 - frac * 0.82) * 19 * scale;
      const ang = Math.atan2(prev.y - p.y, prev.x - p.x);

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);

      // Luminous golden-emerald dorsal Lai-Thai crest fins along spine
      if (i % 2 === 0 && frac < 0.88) {
        ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
        ctx.beginPath();
        ctx.moveTo(-radius * 0.5, -radius * 0.7);
        ctx.quadraticCurveTo(-radius * 0.9, -radius * 2.1, radius * 0.35, -radius * 1.45);
        ctx.lineTo(radius * 0.5, -radius * 0.6);
        ctx.closePath();
        ctx.fill();
      }

      // Shimmering emerald-to-gold body scale segment
      const sg = ctx.createRadialGradient(0, -radius * 0.25, radius * 0.1, 0, 0, radius * 1.25);
      sg.addColorStop(0, '#fef08a');
      sg.addColorStop(0.45, '#10b981');
      sg.addColorStop(1, '#064e3b');
      ctx.fillStyle = sg;
      ctx.shadowColor = 'rgba(250, 204, 21, 0.45)';
      ctx.shadowBlur = 12 * scale;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.35, radius, 0, 0, Math.PI * 2);
      ctx.fill();

      // Golden belly highlight line
      ctx.strokeStyle = 'rgba(254, 243, 199, 0.55)';
      ctx.lineWidth = Math.max(1, 2 * scale * (1 - frac));
      ctx.beginPath();
      ctx.arc(0, radius * 0.25, radius * 0.65, 0.15, Math.PI - 0.15);
      ctx.stroke();

      ctx.restore();
    }

    // --- Ornate Sculpted Golden Thai Naga Head (เศียรพญานาค) ---
    const head = pts[0];
    const neck = pts[1];
    const headAng = Math.atan2(head.y - neck.y, head.x - neck.x);

    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(headAng);
    // Keep crown pointing upward regardless of left/right travel direction
    if (Math.cos(headAng) < 0) ctx.scale(1, -1);

    // Radiant aura behind Naga head
    const hGlow = ctx.createRadialGradient(4 * scale, 0, 4, 4 * scale, 0, 56 * scale);
    hGlow.addColorStop(0, 'rgba(254, 240, 138, 0.72)');
    hGlow.addColorStop(0.5, 'rgba(52, 211, 153, 0.3)');
    hGlow.addColorStop(1, 'rgba(52, 211, 153, 0)');
    ctx.fillStyle = hGlow;
    ctx.beginPath();
    ctx.arc(4 * scale, 0, 56 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Tall Iconic Golden Kanok Crown (หงอนพญานาค)
    const crownGrad = ctx.createLinearGradient(0, 0, -14 * scale, -48 * scale);
    crownGrad.addColorStop(0, '#d97706');
    crownGrad.addColorStop(0.5, '#fde047');
    crownGrad.addColorStop(1, '#fffbeb');
    ctx.fillStyle = crownGrad;
    ctx.beginPath();
    ctx.moveTo(-12 * scale, -8 * scale);
    ctx.bezierCurveTo(-24 * scale, -26 * scale, -10 * scale, -46 * scale, 2 * scale, -52 * scale);
    ctx.bezierCurveTo(-2 * scale, -34 * scale, 8 * scale, -24 * scale, 12 * scale, -10 * scale);
    ctx.closePath();
    ctx.fill();

    // Naga Snout & Majestic Jaw
    ctx.fillStyle = '#059669';
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(-12 * scale, -12 * scale);
    ctx.quadraticCurveTo(18 * scale, -16 * scale, 34 * scale, -4 * scale);
    ctx.quadraticCurveTo(26 * scale, 10 * scale, 4 * scale, 12 * scale);
    ctx.lineTo(-12 * scale, 10 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing Golden-White Mystical Eye
    ctx.fillStyle = '#fef9c3';
    ctx.shadowColor = '#fde047';
    ctx.shadowBlur = 10 * scale;
    ctx.beginPath();
    ctx.ellipse(8 * scale, -4 * scale, 4.2 * scale, 2.8 * scale, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // Flowing Golden Whiskers
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 1.8 * scale;
    ctx.beginPath();
    ctx.moveTo(22 * scale, 2 * scale);
    ctx.quadraticCurveTo(8 * scale, 18 * scale, -16 * scale, 20 * scale);
    ctx.stroke();

    ctx.restore();
    ctx.restore();

    // Dramatic Poetic Callout Banner
    if (this.naga.calloutTimer > 0) {
      const a = Math.min(1, this.naga.calloutTimer * 1.4);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `700 ${Math.round(clamp(w * 0.028, 18, 32))}px "Noto Serif Thai", Prompt, serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(52, 211, 153, 0.85)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#fef9c3';
      ctx.fillText('🐉 พญานาคแสงทองตื่นแล้ว! บั้งไฟพญานาคพุ่งรับคืนวันเพ็ญ ✨', w * 0.5, h * 0.27);
      ctx.restore();
    }
  }

  _drawComicBubble(ctx, x, y, text, textColor, borderColor) {
    ctx.save();
    ctx.font = '600 13px Prompt, sans-serif';
    const padX = 14;
    const tw = ctx.measureText(text).width;
    const bw = tw + padX * 2;
    const bh = 32;
    const bx = clamp(x - bw / 2, 14, this.engine.width - bw - 14);
    const by = Math.max(66, y - bh);

    ctx.fillStyle = 'rgba(11, 16, 36, 0.92)';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 16);
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
