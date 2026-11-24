import { LOCATIONS } from './config.js';
import { drawKrathong } from './krathong-renderer.js';
import { GodzillaShotController } from './godzilla-shot.js';
import { LanternRescueController } from './lantern-event.js';
import { FireworkFantasyController } from './firework-event.js';
import { RiverCameosController } from './river-cameos.js';

/**
 * Interactive 2D Night River Scene Engine
 * Renders:
 *  - Starry sky, shooting stars, moon + craters + moonlight water shimmer
 *  - 4 iconic Thai architectural silhouettes & rippling water reflections
 *  - Animated sky lanterns (Yi Peng) & physics-based fireworks with reflections
 *  - Depth-sorted floating krathongs with launch animation, ripples, bless particles, hover & click
 */
export class RiverSceneEngine {
  constructor(canvas, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.callbacks = callbacks;

    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.locationId = 'wat-arun';
    this.previousLocationId = 'wat-arun';
    this.transitionProgress = 1;

    this.myKrathongIds = new Set();
    this.krathongEntities = [];
    this.stars = [];
    this.clouds = [];
    this.lanterns = [];
    this.fireworks = [];
    this.fireworkParticles = [];
    this.splashRipples = [];
    this.blessParticles = [];
    this.shootingStar = null;

    this.hoveredEntity = null;
    this.spotlightId = null;
    this.spotlightUntil = 0;

    this.rafId = null;
    this.lastFrameTime = performance.now();

    this.godzillaShot = new GodzillaShotController(this);
    this.lanternRescue = new LanternRescueController(this);
    this.fireworkFantasy = new FireworkFantasyController(this);
    this.riverCameos = new RiverCameosController(this, {
      onKidCaught: () => {
        if (this.callbacks.onKidCaught) this.callbacks.onKidCaught();
      },
      onCrocAttack: () => {
        if (this.callbacks.onCrocAttack) this.callbacks.onCrocAttack();
      },
      onCrocChomp: () => {
        if (this.callbacks.onCrocChomp) this.callbacks.onCrocChomp();
      },
    });

    this._initBackdropEntities();
    this._bindEvents();
    this.resize();
  }

  triggerCrocodileAttack() {
    this.riverCameos.triggerCrocodileAttack();
  }

  openFireworkLauncher(hooks = {}) {
    if (this.godzillaShot.active || this.lanternRescue.throwMode) return;
    this.hoveredEntity = null;
    if (this.callbacks.onHover) this.callbacks.onHover(null, 0, 0);
    this.fireworkFantasy.openLauncher(hooks);
  }

  closeFireworkLauncher() {
    this.fireworkFantasy.closeLauncher();
  }

  fireUfoRocket() {
    this.fireworkFantasy.fireUfoOrSkyRocket();
  }

  startNagaCharge(autoSweep = false) {
    this.fireworkFantasy.startNagaCharge(autoSweep);
  }

  releaseNagaCharge() {
    this.fireworkFantasy.releaseNagaCharge();
  }

  isFireworkLauncherActive() {
    return this.fireworkFantasy.launcherOpen;
  }

  openLanternThrowMode(hooks = {}) {
    if (this.godzillaShot.active) return;
    this.hoveredEntity = null;
    if (this.callbacks.onHover) this.callbacks.onHover(null, 0, 0);
    this.lanternRescue.openThrowMode(hooks);
  }

  closeLanternThrowMode() {
    this.lanternRescue.closeThrowMode();
  }

  throwInteractiveLantern() {
    this.lanternRescue.throwFromButton();
  }

  isLanternThrowActive() {
    return this.lanternRescue.throwMode;
  }

  startGodzillaShot(krathong, hooks = {}) {
    this.godzillaShot.callbacks = hooks;
    this.hoveredEntity = null;
    if (this.callbacks.onHover) this.callbacks.onHover(null, 0, 0);
    this.godzillaShot.start(krathong);
  }

  shootGodzillaKrathong() {
    this.godzillaShot.shootFromButton();
  }

  skipGodzillaShot() {
    this.godzillaShot.cancelToFloat();
  }

  isGodzillaActive() {
    return this.godzillaShot.active;
  }

  start() {
    if (this.rafId) return;
    const loop = (now) => {
      const dt = Math.min(0.05, (now - this.lastFrameTime) / 1000);
      this.lastFrameTime = now;
      this._update(dt, now);
      this._render(now);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setMyKrathongIds(idList) {
    this.myKrathongIds = new Set(idList || []);
  }

  setLocation(locationId) {
    if (!LOCATIONS[locationId] || locationId === this.locationId) return;
    this.previousLocationId = this.locationId;
    this.locationId = locationId;
    this.transitionProgress = 0;
    this.lanternRescue.resetForLocationChange();
    this.fireworkFantasy.resetForLocationChange();
    this.riverCameos.reset();
    this._syncAmbientLanterns();
  }

  setKrathongs(krathongs) {
    const existingById = new Map(this.krathongEntities.map((e) => [e.data.id, e]));
    const count = Math.max(krathongs.length, 1);

    this.krathongEntities = krathongs.map((data, idx) => {
      const prev = existingById.get(data.id);
      if (prev) {
        prev.data = data;
        return prev;
      }

      // Deterministic panoramic spread across full river width & depth bands
      const hash = hashString(data.id);
      const visibleCount = Math.min(count, 18);
      const band = (idx + 0.5) / visibleCount;
      const depth = clamp(0.14 + ((band * 0.76 + (hash % 17) * 0.011) % 0.78), 0.14, 0.9);
      const xRatio = clamp(((idx + 0.5) / visibleCount + ((hash % 13) - 6) * 0.014) % 1, 0.06, 0.94);

      return {
        data,
        x: xRatio * this.width,
        depth, // 0 = far horizon, 1 = close foreground
        speed: (10 + depth * 18) * (0.85 + ((hash % 30) / 100)),
        phase: (hash % 628) / 100,
        launchProgress: 1,
        targetDepth: depth,
        startX: xRatio * this.width,
        targetX: xRatio * this.width,
      };
    });
  }

  addOrLaunchKrathong(krathong, { animateLaunch = false, isMine = false } = {}) {
    if (isMine) this.myKrathongIds.add(krathong.id);
    const existing = this.krathongEntities.find((e) => e.data.id === krathong.id);
    if (existing) {
      existing.data = krathong;
      if (animateLaunch) this.spotlightKrathong(krathong.id);
      return;
    }

    const hash = hashString(krathong.id);
    const targetDepth = animateLaunch ? 0.62 + (hash % 16) * 0.01 : 0.22 + (hash % 64) * 0.01;
    const targetX = animateLaunch
      ? this.width * (0.42 + ((hash % 18) - 9) * 0.012)
      : -60;

    const entity = {
      data: krathong,
      x: animateLaunch ? this.width * 0.5 : targetX,
      depth: animateLaunch ? 1.18 : targetDepth,
      targetDepth,
      startX: animateLaunch ? this.width * 0.5 : targetX,
      targetX,
      speed: (11 + targetDepth * 17),
      phase: (hash % 628) / 100,
      launchProgress: animateLaunch ? 0 : 1,
    };

    this.krathongEntities.push(entity);
    if (this.krathongEntities.length > 65) {
      this.krathongEntities.shift();
    }
    this.riverCameos.notifyNewKrathong(krathong);

    if (animateLaunch) {
      this.spotlightKrathong(krathong.id, 9500);
      const horizonY = this.height * 0.44;
      const waterH = this.height - horizonY;
      this.addSplashRipple(this.width * 0.5, horizonY + waterH * 0.84, true);
      this.spawnBlessParticles(this.width * 0.5, horizonY + waterH * 0.8, '✨', 14);
    }
  }

  updateKrathongData(updated, reactionEmoji = '💛') {
    const entity = this.krathongEntities.find((e) => e.data.id === updated.id);
    if (!entity) return;
    entity.data = updated;
    const pos = this._getEntityScreenPos(entity);
    this.spawnBlessParticles(pos.x, pos.y - 26 * pos.scale, reactionEmoji, 8);
    this.addSplashRipple(pos.x, pos.y + 8 * pos.scale, true);
  }

  spotlightKrathong(id, durationMs = 7000) {
    this.spotlightId = id;
    this.spotlightUntil = performance.now() + durationMs;
    const entity = this.krathongEntities.find((e) => e.data.id === id);
    if (entity) {
      // Gently ensure it's well inside the visible screen
      if (entity.x < this.width * 0.16 || entity.x > this.width * 0.84) {
        entity.x = this.width * 0.48;
      }
      const pos = this._getEntityScreenPos(entity);
      this.addSplashRipple(pos.x, pos.y + 8 * pos.scale, true);
    }
  }

  launchSkyLantern(xRatio = null, bright = true) {
    const horizonY = this.height * 0.44;
    const x = xRatio != null ? xRatio * this.width : this.width * (0.12 + Math.random() * 0.76);
    this.lanterns.push({
      x,
      y: horizonY + 18 + Math.random() * 25,
      size: bright ? 13 + Math.random() * 6 : 7 + Math.random() * 7,
      speedY: (bright ? 22 : 11) + Math.random() * 14,
      driftX: (Math.random() - 0.45) * 14,
      phase: Math.random() * Math.PI * 2,
      alpha: 0,
      bright,
    });
    if (this.lanterns.length > 48) {
      this.lanterns.shift();
    }
  }

  launchFirework(xRatio = null, yRatio = null) {
    const startX = (xRatio != null ? xRatio : 0.18 + Math.random() * 0.64) * this.width;
    const targetY = (yRatio != null ? yRatio : 0.12 + Math.random() * 0.22) * this.height;
    const palettes = [
      ['#ffe599', '#f6b93b', '#ff9f43', '#ffffff'],
      ['#ffb8d0', '#f472b6', '#fde68a', '#ffffff'],
      ['#a7f3d0', '#34d399', '#fef08a', '#ffffff'],
      ['#c4b5fd', '#a78bfa', '#fcd34d', '#ffffff'],
    ];
    const palette = palettes[Math.floor(Math.random() * palettes.length)];
    this.fireworks.push({
      x: startX,
      y: this.height * 0.45,
      targetY,
      vy: -360 - Math.random() * 90,
      palette,
      trail: [],
    });
  }

  addSplashRipple(x, y, golden = false) {
    this.splashRipples.push({
      x,
      y,
      radius: 12,
      maxRadius: golden ? 98 : 65,
      alpha: golden ? 0.72 : 0.4,
      golden,
    });
  }

  spawnBlessParticles(x, y, emoji = '💛', count = 8) {
    for (let i = 0; i < count; i++) {
      this.blessParticles.push({
        x: x + (Math.random() - 0.5) * 34,
        y: y + (Math.random() - 0.5) * 14,
        vx: (Math.random() - 0.5) * 28,
        vy: -34 - Math.random() * 44,
        size: 13 + Math.random() * 8,
        alpha: 1,
        life: 1.4 + Math.random() * 0.8,
        age: 0,
        emoji: i % 3 === 0 ? '✨' : emoji,
      });
    }
  }

  _initBackdropEntities() {
    this.stars = Array.from({ length: 115 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.43,
      r: 0.6 + Math.random() * 1.45,
      phase: Math.random() * Math.PI * 2,
      speed: 1.2 + Math.random() * 2.4,
    }));

    this.clouds = Array.from({ length: 5 }, (_, i) => ({
      x: i * 0.25 + Math.random() * 0.1,
      y: 0.1 + (i % 3) * 0.08,
      w: 170 + Math.random() * 160,
      h: 26 + Math.random() * 22,
      speed: 4 + Math.random() * 5,
      alpha: 0.055 + Math.random() * 0.045,
    }));

    this._syncAmbientLanterns(true);
  }

  _syncAmbientLanterns(initial = false) {
    const loc = LOCATIONS[this.locationId];
    const target = loc.lanternDensity;
    const horizonY = this.height * 0.44;

    if (initial) {
      this.lanterns = [];
      for (let i = 0; i < target; i++) {
        this.lanterns.push({
          x: Math.random() * this.width,
          y: Math.random() * horizonY,
          size: 6.5 + Math.random() * 8.5,
          speedY: 9 + Math.random() * 12,
          driftX: (Math.random() - 0.45) * 10,
          phase: Math.random() * Math.PI * 2,
          alpha: 0.8,
          bright: false,
        });
      }
      return;
    }

    while (this.lanterns.length < target) {
      this.lanterns.push({
        x: Math.random() * this.width,
        y: horizonY * (0.25 + Math.random() * 0.72),
        size: 6.5 + Math.random() * 8.5,
        speedY: 9 + Math.random() * 12,
        driftX: (Math.random() - 0.45) * 10,
        phase: Math.random() * Math.PI * 2,
        alpha: 0,
        bright: false,
      });
    }
  }

  _bindEvents() {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('pointerdown', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = rect.width > 0 ? this.width / rect.width : 1;
      const scaleY = rect.height > 0 ? this.height / rect.height : 1;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;
      if (this.godzillaShot.active) {
        this.godzillaShot.handlePointerDown(px, py);
        return;
      }
      if (this.lanternRescue.throwMode) {
        this.canvas.style.cursor = 'grabbing';
        this.lanternRescue.handlePointerDown(px, py);
        return;
      }
      if (this.fireworkFantasy.launcherOpen) {
        this.fireworkFantasy.handlePointerDown(px, py);
      }
    });

    this.canvas.addEventListener('pointerup', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = rect.width > 0 ? this.width / rect.width : 1;
      const scaleY = rect.height > 0 ? this.height / rect.height : 1;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;
      if (this.godzillaShot.active) {
        this.godzillaShot.handlePointerUp(px, py);
        return;
      }
      if (this.lanternRescue.throwMode) {
        this.canvas.style.cursor = 'default';
        this.lanternRescue.handlePointerUp(px, py);
      }
    });

    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = rect.width > 0 ? this.width / rect.width : 1;
      const scaleY = rect.height > 0 ? this.height / rect.height : 1;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;

      if (this.godzillaShot.active) {
        this.hoveredEntity = null;
        this.canvas.style.cursor = this.godzillaShot.phase === 'aiming' ? 'crosshair' : 'default';
        this.godzillaShot.handlePointerMove(px, py);
        if (this.callbacks.onHover) this.callbacks.onHover(null, 0, 0);
        return;
      }

      if (this.lanternRescue.throwMode) {
        this.hoveredEntity = null;
        this.canvas.style.cursor = this.lanternRescue.isDragging ? 'grabbing' : 'grab';
        this.lanternRescue.handlePointerMove(px, py);
        if (this.callbacks.onHover) this.callbacks.onHover(null, 0, 0);
        return;
      }

      if (this.fireworkFantasy.launcherOpen) {
        this.hoveredEntity = null;
        this.canvas.style.cursor = 'crosshair';
        this.fireworkFantasy.handlePointerMove(px, py);
        if (this.callbacks.onHover) this.callbacks.onHover(null, 0, 0);
        return;
      }

      const hit = this._hitTestKrathong(px, py);

      this.hoveredEntity = hit;
      this.canvas.style.cursor = hit ? 'pointer' : py < this.height * 0.42 ? 'crosshair' : 'default';

      if (this.callbacks.onHover) {
        if (hit) {
          const pos = this._getEntityScreenPos(hit);
          this.callbacks.onHover(hit.data, pos.x, pos.y - 42 * pos.scale);
        } else {
          this.callbacks.onHover(null, 0, 0);
        }
      }
    });

    this.canvas.addEventListener('pointerleave', () => {
      this.hoveredEntity = null;
      if (this.callbacks.onHover) this.callbacks.onHover(null, 0, 0);
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.godzillaShot.active || this.lanternRescue.throwMode || this.fireworkFantasy.launcherOpen) return;
      const rect = this.canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      // Check playful click on the sneaky coin-diver kid first!
      if (this.riverCameos.handleClick(px, py)) {
        return;
      }

      const hit = this._hitTestKrathong(px, py);
      if (hit) {
        if (this.callbacks.onSelectKrathong) {
          this.callbacks.onSelectKrathong(hit.data);
        }
        return;
      }

      const horizonY = this.height * 0.44;
      if (py < horizonY - 12) {
        // Clicking the night sky launches a sky lantern right there!
        if (this.callbacks.onSkyClick) {
          this.callbacks.onSkyClick(px / this.width, py / this.height);
        }
      } else {
        // Clicking empty water creates gentle shimmering ripples
        this.addSplashRipple(px, py, false);
      }
    });
  }

  _getEntityScreenPos(entity) {
    const horizonY = this.height * 0.44;
    const waterH = this.height - horizonY;
    const y = horizonY + 22 + entity.depth * (waterH - 108);
    // Responsive scale so krathongs look natural on mobile portrait viewports
    const baseScale = clamp(this.width / 960, 0.68, 1.0);
    const scale = (0.42 + entity.depth * 0.7) * baseScale;
    return { x: entity.x, y, scale };
  }

  _hitTestKrathong(px, py) {
    // Sort front-to-back so nearest krathong wins clicks
    const sorted = [...this.krathongEntities].sort((a, b) => b.depth - a.depth);
    for (const entity of sorted) {
      const { x, y, scale } = this._getEntityScreenPos(entity);
      // Ensure generous touch tap target on mobile screens
      const hitRx = Math.max(30, 52 * scale);
      const hitRy = Math.max(26, 42 * scale);
      const dx = (px - x) / hitRx;
      const dy = (py - (y - 10 * scale)) / hitRy;
      if (dx * dx + dy * dy <= 1) {
        return entity;
      }
    }
    return null;
  }

  _update(dt, now) {
    const loc = LOCATIONS[this.locationId];
    const horizonY = this.height * 0.44;

    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + dt * 1.8);
    }

    // Drift clouds
    for (const c of this.clouds) {
      c.x += (c.speed * dt) / Math.max(this.width, 600);
      if (c.x > 1.25) c.x = -0.25;
    }

    // Occasional gentle shooting star
    if (!this.shootingStar && Math.random() < dt * 0.09) {
      this.shootingStar = {
        x: this.width * (0.2 + Math.random() * 0.65),
        y: this.height * (0.04 + Math.random() * 0.14),
        vx: -340 - Math.random() * 140,
        vy: 110 + Math.random() * 70,
        life: 0.75,
        age: 0,
      };
    }
    if (this.shootingStar) {
      this.shootingStar.x += this.shootingStar.vx * dt;
      this.shootingStar.y += this.shootingStar.vy * dt;
      this.shootingStar.age += dt;
      if (this.shootingStar.age >= this.shootingStar.life) {
        this.shootingStar = null;
      }
    }

    // Sky lanterns
    for (let i = this.lanterns.length - 1; i >= 0; i--) {
      const l = this.lanterns[i];
      l.y -= l.speedY * dt;
      l.x += (l.driftX + Math.sin(now * 0.0009 + l.phase) * 9) * dt;
      l.alpha = Math.min(1, l.alpha + dt * 0.8);

      if (l.y < -40) {
        if (this.lanterns.length > loc.lanternDensity) {
          this.lanterns.splice(i, 1);
        } else {
          l.y = horizonY + 12;
          l.x = Math.random() * this.width;
          l.alpha = 0;
        }
      }
    }

    // Fireworks rockets & bursts
    for (let i = this.fireworks.length - 1; i >= 0; i--) {
      const fw = this.fireworks[i];
      fw.trail.push({ x: fw.x, y: fw.y });
      if (fw.trail.length > 8) fw.trail.shift();
      fw.y += fw.vy * dt;
      fw.vy += 155 * dt;

      if (fw.y <= fw.targetY || fw.vy >= -20) {
        this._burstFirework(fw);
        this.fireworks.splice(i, 1);
      }
    }

    for (let i = this.fireworkParticles.length - 1; i >= 0; i--) {
      const p = this.fireworkParticles[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.982;
      p.vy = p.vy * 0.982 + 42 * dt;
      if (p.age >= p.life) {
        this.fireworkParticles.splice(i, 1);
      }
    }

    // Krathong gentle river drift & launch glide
    for (const entity of this.krathongEntities) {
      if (entity.launchProgress < 1) {
        entity.launchProgress = Math.min(1, entity.launchProgress + dt * 0.42);
        const ease = 1 - Math.pow(1 - entity.launchProgress, 3);
        entity.depth = 1.18 + (entity.targetDepth - 1.18) * ease;
        entity.x = entity.startX + (entity.targetX - entity.startX) * ease;
        if (Math.random() < 0.25) {
          const pos = this._getEntityScreenPos(entity);
          this.addSplashRipple(pos.x, pos.y + 8 * pos.scale, true);
        }
      } else {
        const isHovered = this.hoveredEntity === entity;
        const speedMul = isHovered ? 0.18 : 1;
        const mobileSpeedFactor = this.width < 600 ? 0.72 : 1;
        entity.x += entity.speed * loc.riverSpeed * speedMul * mobileSpeedFactor * dt;
        if (entity.x > this.width + 90) {
          entity.x = -90;
        }
      }
    }

    // Splash ripples
    for (let i = this.splashRipples.length - 1; i >= 0; i--) {
      const r = this.splashRipples[i];
      r.radius += (r.golden ? 46 : 36) * dt;
      r.alpha -= (r.golden ? 0.34 : 0.28) * dt;
      if (r.alpha <= 0 || r.radius >= r.maxRadius) {
        this.splashRipples.splice(i, 1);
      }
    }

    // Blessing particles
    for (let i = this.blessParticles.length - 1; i >= 0; i--) {
      const p = this.blessParticles[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy *= 0.97;
      p.alpha = Math.max(0, 1 - p.age / p.life);
      if (p.age >= p.life) {
        this.blessParticles.splice(i, 1);
      }
    }

    // Fantasy Godzilla Shot, Lantern Rescue, Firework UFO/Naga & River Cameos
    this.godzillaShot.update(dt, now);
    this.lanternRescue.update(dt, now);
    this.fireworkFantasy.update(dt, now);
    this.riverCameos.update(dt, now);
  }

  _burstFirework(fw) {
    const count = 48 + Math.floor(Math.random() * 20);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.14;
      const speed = 55 + Math.random() * 145;
      this.fireworkParticles.push({
        x: fw.x,
        y: fw.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: fw.palette[i % fw.palette.length],
        size: 1.7 + Math.random() * 1.9,
        life: 1.15 + Math.random() * 0.75,
        age: 0,
      });
    }
  }

  _render(now) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const horizonY = h * 0.44;
    const loc = LOCATIONS[this.locationId];

    ctx.save();
    if (this.godzillaShot.active && (this.godzillaShot.shakeX || this.godzillaShot.shakeY)) {
      ctx.translate(this.godzillaShot.shakeX, this.godzillaShot.shakeY);
    }

    // 1. Night Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGrad.addColorStop(0, loc.skyStops[0]);
    skyGrad.addColorStop(0.45, loc.skyStops[1]);
    skyGrad.addColorStop(0.8, loc.skyStops[2]);
    skyGrad.addColorStop(1, loc.skyStops[3]);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, horizonY + 2);

    // 2. Twinkling Stars & Shooting Star
    this._drawStars(ctx, w, h, now);

    // 3. Super Full Moon & Drifting Clouds
    const moonX = w * loc.moonX;
    const moonY = h * loc.moonY;
    this._drawMoon(ctx, moonX, moonY, Math.min(w, h) * 0.052, now);
    this._drawClouds(ctx, w, h);

    // 4. Horizon Atmospheric Glow (full sky height so radial gradient never clips into a seam)
    const hGlow = ctx.createRadialGradient(w * 0.5, horizonY, 20, w * 0.5, horizonY, Math.max(w * 0.65, horizonY * 1.15));
    hGlow.addColorStop(0, loc.horizonGlow);
    hGlow.addColorStop(0.55, 'rgba(246, 186, 98, 0.06)');
    hGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = hGlow;
    ctx.fillRect(0, 0, w, horizonY + 2);

    // 5. Floating Sky Lanterns (Yi Peng)
    this._drawSkyLanterns(ctx, now);

    // 6. Fireworks in Sky
    this._drawFireworks(ctx, horizonY, false);

    // 7. Water Base Gradient
    const waterGrad = ctx.createLinearGradient(0, horizonY, 0, h);
    waterGrad.addColorStop(0, loc.waterStops[0]);
    waterGrad.addColorStop(0.45, loc.waterStops[1]);
    waterGrad.addColorStop(1, loc.waterStops[2]);
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, horizonY, w, h - horizonY);

    // 8. Moonlight Water Shimmer & Fireworks Reflections (Castle water reflection removed as requested)
    this._drawMoonReflection(ctx, moonX, horizonY, h, now);
    this._drawFireworks(ctx, horizonY, true);

    // 9. Crisp Architectural Landmark Skyline above Horizon
    this._drawLocationLandmark(ctx, this.locationId, w, horizonY, now, false);

    // Subtle Shoreline Rim Light
    const shoreLine = ctx.createLinearGradient(0, horizonY - 2, 0, horizonY + 8);
    shoreLine.addColorStop(0, 'rgba(255, 214, 130, 0.22)');
    shoreLine.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shoreLine;
    ctx.fillRect(0, horizonY - 1, w, 9);

    // 10.5 Background Shoreline Fire, Water Spray & Heroic Firetruck Rescue!
    this.lanternRescue.renderHorizonEvents(ctx, now);

    // 10.6 Fantasy UFO Ambush, Rainbow Disco Fireworks, Naga Fireballs & Golden Naga!
    this.fireworkFantasy.renderSkySpectacles(ctx, now);

    // 11. Subtle Horizontal Water Wave Highlights & Underwater Glowing Fish School
    this._drawWaterWaves(ctx, w, horizonY, h, now);
    this.riverCameos.renderUnderwaterFish(ctx, now);

    // 11.5 Fantasy Godzilla Kaiju & Back Hoop Layer (emerging right from the river!)
    if (this.godzillaShot.active) {
      this.godzillaShot.renderBackdropLayer(ctx, now);
    }

    // 12. Interactive Splash Ripples
    for (const r of this.splashRipples) {
      ctx.save();
      ctx.strokeStyle = r.golden
        ? `rgba(255, 224, 140, ${Math.max(0, r.alpha)})`
        : `rgba(185, 218, 255, ${Math.max(0, r.alpha)})`;
      ctx.lineWidth = r.golden ? 1.6 : 1.1;
      ctx.beginPath();
      ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 13. Depth-sorted Krathongs (back to front)
    const sorted = [...this.krathongEntities].sort((a, b) => a.depth - b.depth);
    for (const entity of sorted) {
      const { x, y, scale } = this._getEntityScreenPos(entity);
      const isHighlighted = this.spotlightId === entity.data.id && now < this.spotlightUntil;
      const isMine = this.myKrathongIds.has(entity.data.id);
      const isHovered = this.hoveredEntity === entity;

      drawKrathong(ctx, x, y, scale, entity.data, now, {
        showReflection: true,
        showRipples: true,
        isHighlighted,
        isHovered,
        isMine,
        label: isHighlighted ? `✦ ${entity.data.name}` : isMine ? `✦ ของคุณ` : '',
        phase: entity.phase,
      });
    }

    // 13.5 Sneaky Coin-Diver Kid popping out of the river!
    this.riverCameos.renderCoinDiverKid(ctx, now);

    // 14. Floating Blessing Particles
    for (const p of this.blessParticles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.font = `${p.size}px Prompt, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(p.emoji, p.x, p.y);
      ctx.restore();
    }

    // 14.5 Fantasy Godzilla Shot Foreground & Interactive Throwable Sky Lantern
    if (this.godzillaShot.active) {
      this.godzillaShot.renderForegroundLayer(ctx, now);
    }
    if (this.lanternRescue.throwMode) {
      this.lanternRescue.renderForegroundThrowLantern(ctx, now);
    }
    if (this.fireworkFantasy.launcherOpen) {
      this.fireworkFantasy.renderForegroundLauncher(ctx, now);
    }

    // Crossfade veil during location switch
    if (this.transitionProgress < 1) {
      const veilAlpha = Math.sin(this.transitionProgress * Math.PI) * 0.28;
      ctx.fillStyle = `rgba(6, 9, 23, ${veilAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
  }

  _drawStars(ctx, w, h, now) {
    for (const s of this.stars) {
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(now * 0.001 * s.speed + s.phase));
      ctx.fillStyle = `rgba(255, 248, 228, ${tw * 0.85})`;
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.shootingStar) {
      const ss = this.shootingStar;
      const alpha = Math.sin((ss.age / ss.life) * Math.PI);
      const grad = ctx.createLinearGradient(ss.x, ss.y, ss.x - ss.vx * 0.16, ss.y - ss.vy * 0.16);
      grad.addColorStop(0, `rgba(255, 248, 220, ${alpha})`);
      grad.addColorStop(1, 'rgba(255, 248, 220, 0)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ss.x - ss.vx * 0.16, ss.y - ss.vy * 0.16);
      ctx.stroke();
    }
  }

  _drawMoon(ctx, cx, cy, r, now) {
    const radius = clamp(r, 26, 48);
    const pulse = 1 + Math.sin(now * 0.0008) * 0.03;

    // Outer luminous halo
    const halo = ctx.createRadialGradient(cx, cy, radius * 0.6, cx, cy, radius * 4.4 * pulse);
    halo.addColorStop(0, 'rgba(255, 241, 194, 0.38)');
    halo.addColorStop(0.38, 'rgba(246, 204, 118, 0.14)');
    halo.addColorStop(1, 'rgba(246, 204, 118, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 4.4 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Moon disc
    const disc = ctx.createRadialGradient(cx - radius * 0.25, cy - radius * 0.25, radius * 0.1, cx, cy, radius);
    disc.addColorStop(0, '#fffef5');
    disc.addColorStop(0.7, '#f8e4a8');
    disc.addColorStop(1, '#e8c474');
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();

    // Subtle poetic moon craters
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = 'rgba(182, 146, 84, 0.14)';
    ctx.beginPath();
    ctx.arc(cx - radius * 0.26, cy - radius * 0.12, radius * 0.24, 0, Math.PI * 2);
    ctx.arc(cx + radius * 0.22, cy + radius * 0.18, radius * 0.3, 0, Math.PI * 2);
    ctx.arc(cx + radius * 0.14, cy - radius * 0.35, radius * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  _drawClouds(ctx, w, h) {
    for (const c of this.clouds) {
      const cx = c.x * w;
      const cy = c.y * h;
      const rx = c.w * 0.55;
      const ry = c.h * 1.1;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(rx, ry);
      const g = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 1);
      g.addColorStop(0, `rgba(210, 218, 255, ${c.alpha})`);
      g.addColorStop(0.55, `rgba(210, 218, 255, ${c.alpha * 0.35})`);
      g.addColorStop(1, 'rgba(210, 218, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawSkyLanterns(ctx, now) {
    for (const l of this.lanterns) {
      const flick = 0.88 + Math.sin(now * 0.008 + l.phase) * 0.12;
      const w = l.size * 0.72;
      const h = l.size * 1.1;

      ctx.save();
      ctx.globalAlpha = l.alpha;
      ctx.translate(l.x, l.y);
      ctx.rotate(Math.sin(now * 0.0014 + l.phase) * 0.08);

      // Lantern warm glow
      const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, l.size * 2.6 * flick);
      glow.addColorStop(0, 'rgba(255, 206, 112, 0.45)');
      glow.addColorStop(0.5, 'rgba(242, 138, 56, 0.14)');
      glow.addColorStop(1, 'rgba(242, 138, 56, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, l.size * 2.6 * flick, 0, Math.PI * 2);
      ctx.fill();

      // Paper lantern silhouette
      const body = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
      body.addColorStop(0, '#c2571a');
      body.addColorStop(0.45, '#f29c38');
      body.addColorStop(1, '#fff3bf');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(-w * 0.65, -h * 0.48);
      ctx.quadraticCurveTo(0, -h * 0.62, w * 0.65, -h * 0.48);
      ctx.quadraticCurveTo(w * 0.85, 0, w * 0.42, h * 0.5);
      ctx.lineTo(-w * 0.42, h * 0.5);
      ctx.quadraticCurveTo(-w * 0.85, 0, -w * 0.65, -h * 0.48);
      ctx.closePath();
      ctx.fill();

      // Inner flame dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, h * 0.34, Math.max(1.2, l.size * 0.14), 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  _drawFireworks(ctx, horizonY, isReflection) {
    if (!isReflection) {
      for (const fw of this.fireworks) {
        for (let i = 0; i < fw.trail.length; i++) {
          const pt = fw.trail[i];
          const a = (i + 1) / fw.trail.length;
          ctx.fillStyle = `rgba(255, 232, 168, ${a * 0.8})`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 1.8 * a, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    for (const p of this.fireworkParticles) {
      const alpha = Math.max(0, 1 - p.age / p.life);
      if (isReflection) {
        const ry = horizonY + (horizonY - p.y) * 0.65;
        if (ry > horizonY && ry < this.height) {
          ctx.save();
          ctx.globalAlpha = alpha * 0.25;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.ellipse(p.x, ry, p.size * 2.5, p.size * 0.8, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      } else {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  _drawMoonReflection(ctx, moonX, horizonY, h, now) {
    const waterH = h - horizonY;

    // Clipped to water below horizon + true elliptical radial gradient (zero oval border)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, horizonY, this.width, waterH);
    ctx.clip();

    ctx.save();
    ctx.translate(moonX, horizonY + waterH * 0.24);
    ctx.scale(150, waterH * 0.62);
    const wash = ctx.createRadialGradient(0, -0.25, 0.02, 0, 0, 1);
    wash.addColorStop(0, 'rgba(255, 232, 168, 0.22)');
    wash.addColorStop(0.45, 'rgba(246, 198, 108, 0.08)');
    wash.addColorStop(0.8, 'rgba(246, 198, 108, 0.015)');
    wash.addColorStop(1, 'rgba(246, 198, 108, 0)');
    ctx.fillStyle = wash;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Organic shimmering ripple ribbons tapering gently across the river
    for (let i = 0; i < 32; i++) {
      const frac = Math.pow(i / 32, 1.18);
      const y = horizonY + 6 + frac * waterH * 0.84;
      const shimmer = 0.65 + 0.35 * Math.sin(now * 0.0024 + i * 1.37);
      const spread = (12 + frac * 52 + Math.sin(i * 2.4) * 8) * shimmer;
      const offset = Math.sin(now * 0.0016 + i * 0.92) * (5 + frac * 16);
      const alpha = (1 - frac * 0.88) * 0.2 * shimmer;
      ctx.fillStyle = `rgba(255, 238, 184, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(moonX + offset, y, Math.max(6, spread), 1.2 + frac * 1.1, 0, 0, Math.PI * 2);
      ctx.fill();

      // Occasional split sparkle highlight beside the main moon path
      if (i % 3 === 0) {
        const side = i % 6 === 0 ? 1 : -1;
        ctx.fillStyle = `rgba(255, 244, 205, ${alpha * 0.65})`;
        ctx.beginPath();
        ctx.ellipse(moonX + offset + side * (spread * 0.78 + 8), y + 2, Math.max(4, spread * 0.32), 1, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  _drawWaterWaves(ctx, w, horizonY, h, now) {
    ctx.save();
    const lines = 18;
    const waterH = h - horizonY;
    for (let i = 0; i < lines; i++) {
      const frac = i / lines;
      const y = horizonY + 12 + frac * waterH * 0.92;
      const xStart = ((now * (0.012 + frac * 0.015) + i * 197) % (w + 200)) - 100;
      const len = 40 + frac * 90;
      ctx.strokeStyle = `rgba(235, 224, 198, ${0.04 + frac * 0.045})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xStart, y);
      ctx.lineTo(xStart + len, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* ========================================================================
     ICONIC THAI ARCHITECTURAL LANDMARKS (4 LOCATIONS)
     ======================================================================== */
  _drawLocationLandmark(ctx, locId, w, horizonY, now, isReflection) {
    if (locId === 'wat-arun') {
      this._drawWatArunSkyline(ctx, w, horizonY, now, isReflection);
    } else if (locId === 'chiang-mai') {
      this._drawChiangMaiSkyline(ctx, w, horizonY, now, isReflection);
    } else if (locId === 'sukhothai') {
      this._drawSukhothaiSkyline(ctx, w, horizonY, now, isReflection);
    } else if (locId === 'khlong-ong-ang') {
      this._drawKhlongOngAngSkyline(ctx, w, horizonY, now, isReflection);
    }
  }

  _drawWatArunSkyline(ctx, w, horizonY, now, isReflection) {
    const cx = w * (w < 600 ? 0.42 : 0.34);
    const scale = clamp(w / 1280, 0.48, 1.15);

    // Distant Bangkok horizon buildings (right side) with subtle warm architectural lights
    const bldg = [
      [0.64, 34, 48],
      [0.68, 28, 74],
      [0.72, 40, 42],
      [0.77, 30, 88],
      [0.82, 46, 54],
      [0.88, 32, 66],
      [0.93, 44, 38],
    ];
    bldg.forEach(([rx, bw, bh], bIdx) => {
      const bx = w * rx;
      const by = horizonY - bh * scale;
      ctx.fillStyle = '#090e22';
      ctx.fillRect(bx, by, bw * scale, bh * scale);

      if (!isReflection) {
        const rows = Math.max(2, Math.floor((bh * scale) / 14));
        const cols = Math.max(2, Math.floor((bw * scale) / 11));
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if ((r * 7 + c * 3 + bIdx) % 3 !== 0) continue;
            ctx.fillStyle = 'rgba(255, 224, 152, 0.28)';
            ctx.fillRect(bx + 4 * scale + c * 9 * scale, by + 6 * scale + r * 12 * scale, 3 * scale, 4 * scale);
          }
        }
      }
    });

    // Golden architectural uplight behind Wat Arun
    if (!isReflection) {
      const up = ctx.createRadialGradient(cx, horizonY - 22 * scale, 10, cx, horizonY - 50 * scale, 180 * scale);
      up.addColorStop(0, 'rgba(255, 198, 92, 0.42)');
      up.addColorStop(0.55, 'rgba(232, 148, 52, 0.14)');
      up.addColorStop(1, 'rgba(232, 148, 52, 0)');
      ctx.fillStyle = up;
      ctx.beginPath();
      ctx.arc(cx, horizonY - 30 * scale, 180 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Wat Arun embankment wall & flanking Thai temple gables
    ctx.fillStyle = '#11162c';
    ctx.fillRect(0, horizonY - 14 * scale, w, 16 * scale);

    // Helper for multi-tiered Khmer-style Prang silhouette
    const drawPrang = (px, baseY, pw, ph, highlightAlpha) => {
      const g = ctx.createLinearGradient(px, baseY, px, baseY - ph);
      g.addColorStop(0, `rgba(246, 196, 102, ${highlightAlpha})`);
      g.addColorStop(0.45, '#2b2436');
      g.addColorStop(1, '#15182e');
      ctx.fillStyle = g;

      // Stepped base terraces
      ctx.fillRect(px - pw * 0.9, baseY - ph * 0.14, pw * 1.8, ph * 0.14);
      ctx.fillRect(px - pw * 0.68, baseY - ph * 0.28, pw * 1.36, ph * 0.15);

      // Tapered corncob spire tiers
      const tiers = 7;
      for (let t = 0; t < tiers; t++) {
        const f = t / tiers;
        const tw = pw * (0.56 - f * 0.44);
        const ty = baseY - ph * (0.28 + f * 0.56);
        const th = (ph * 0.58) / tiers + 2;
        ctx.beginPath();
        ctx.moveTo(px - tw, ty);
        ctx.lineTo(px - tw * 0.78, ty - th);
        ctx.lineTo(px + tw * 0.78, ty - th);
        ctx.lineTo(px + tw, ty);
        ctx.closePath();
        ctx.fill();
      }

      // Needle spire pinnacle
      ctx.beginPath();
      ctx.moveTo(px - pw * 0.1, baseY - ph * 0.84);
      ctx.lineTo(px, baseY - ph);
      ctx.lineTo(px + pw * 0.1, baseY - ph * 0.84);
      ctx.closePath();
      ctx.fill();
    };

    // Satellite Prangs + Grand Central Prang
    drawPrang(cx - 72 * scale, horizonY - 12 * scale, 22 * scale, 82 * scale, 0.45);
    drawPrang(cx + 72 * scale, horizonY - 12 * scale, 22 * scale, 82 * scale, 0.45);
    drawPrang(cx, horizonY - 12 * scale, 44 * scale, 162 * scale, 0.62);

    // Classic Thai Viharn gable roof to the left
    ctx.fillStyle = '#181c34';
    const gx = cx - 155 * scale;
    ctx.beginPath();
    ctx.moveTo(gx - 42 * scale, horizonY - 12 * scale);
    ctx.lineTo(gx - 38 * scale, horizonY - 40 * scale);
    ctx.lineTo(gx, horizonY - 68 * scale);
    ctx.lineTo(gx + 38 * scale, horizonY - 40 * scale);
    ctx.lineTo(gx + 42 * scale, horizonY - 12 * scale);
    ctx.closePath();
    ctx.fill();

    // Warm twinkling riverside lamps along Chao Phraya
    const lampCount = 22;
    for (let i = 0; i < lampCount; i++) {
      const lx = (i + 0.5) * (w / lampCount);
      const flick = 0.7 + Math.sin(now * 0.003 + i * 1.9) * 0.3;
      ctx.fillStyle = `rgba(255, 222, 136, ${0.72 * flick})`;
      ctx.beginPath();
      ctx.arc(lx, horizonY - 7 * scale, 2.2 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawChiangMaiSkyline(ctx, w, horizonY, now, isReflection) {
    const scale = clamp(w / 1280, 0.58, 1.15);

    // Doi Suthep distant northern mountain ridge
    ctx.fillStyle = '#151024';
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    ctx.lineTo(0, horizonY - 68 * scale);
    ctx.quadraticCurveTo(w * 0.18, horizonY - 132 * scale, w * 0.38, horizonY - 78 * scale);
    ctx.quadraticCurveTo(w * 0.62, horizonY - 120 * scale, w * 0.85, horizonY - 62 * scale);
    ctx.lineTo(w, horizonY - 82 * scale);
    ctx.lineTo(w, horizonY);
    ctx.closePath();
    ctx.fill();

    // Tha Phae Gate brick wall & battlements centered
    const gx = w * 0.54;
    const wallW = Math.min(w * 0.62, 620 * scale);
    const wallH = 54 * scale;

    if (!isReflection) {
      const glow = ctx.createRadialGradient(gx, horizonY - 16 * scale, 12, gx, horizonY - 24 * scale, 220 * scale);
      glow.addColorStop(0, 'rgba(255, 162, 66, 0.36)');
      glow.addColorStop(1, 'rgba(255, 162, 66, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(gx, horizonY - 24 * scale, 220 * scale, Math.PI, 0, false);
      ctx.lineTo(gx + 220 * scale, horizonY);
      ctx.lineTo(gx - 220 * scale, horizonY);
      ctx.closePath();
      ctx.fill();
    }

    const wallGrad = ctx.createLinearGradient(0, horizonY, 0, horizonY - wallH);
    wallGrad.addColorStop(0, '#5a2d24');
    wallGrad.addColorStop(1, '#261420');
    ctx.fillStyle = wallGrad;
    ctx.fillRect(gx - wallW / 2, horizonY - wallH, wallW, wallH);

    // Battlements (crenellations)
    const merlonStep = 22 * scale;
    for (let mx = gx - wallW / 2; mx < gx + wallW / 2 - 10; mx += merlonStep) {
      ctx.fillRect(mx, horizonY - wallH - 11 * scale, 12 * scale, 11 * scale);
    }

    // Central arched Tha Phae Gate doorway bathed in warm amber
    const archW = 46 * scale;
    const archH = 38 * scale;
    const archGlow = ctx.createRadialGradient(gx, horizonY - 14 * scale, 4, gx, horizonY - 16 * scale, 34 * scale);
    archGlow.addColorStop(0, '#ffd485');
    archGlow.addColorStop(1, '#7a3519');
    ctx.fillStyle = archGlow;
    ctx.beginPath();
    ctx.moveTo(gx - archW / 2, horizonY);
    ctx.lineTo(gx - archW / 2, horizonY - archH * 0.6);
    ctx.arc(gx, horizonY - archH * 0.6, archW / 2, Math.PI, 0, false);
    ctx.lineTo(gx + archW / 2, horizonY);
    ctx.closePath();
    ctx.fill();

    // Lanna Chedi rising gently behind left wall
    const cx = gx - wallW * 0.34;
    ctx.fillStyle = '#25172b';
    ctx.beginPath();
    ctx.moveTo(cx - 28 * scale, horizonY - wallH);
    ctx.lineTo(cx - 18 * scale, horizonY - wallH - 36 * scale);
    ctx.lineTo(cx, horizonY - wallH - 96 * scale);
    ctx.lineTo(cx + 18 * scale, horizonY - wallH - 36 * scale);
    ctx.lineTo(cx + 28 * scale, horizonY - wallH);
    ctx.closePath();
    ctx.fill();

    // Glowing Lanna paper lanterns along the moat
    for (let i = 0; i < 16; i++) {
      const lx = gx - wallW * 0.46 + (i / 15) * (wallW * 0.92);
      const flick = 0.78 + Math.sin(now * 0.004 + i) * 0.22;
      ctx.fillStyle = i % 2 === 0 ? `rgba(255, 198, 92, ${flick})` : `rgba(255, 128, 102, ${flick})`;
      ctx.beginPath();
      ctx.ellipse(lx, horizonY - wallH + 14 * scale, 3.5 * scale, 5 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawSukhothaiSkyline(ctx, w, horizonY, now, isReflection) {
    const cx = w * 0.44;
    const scale = clamp(w / 1280, 0.58, 1.15);

    // Calm dark embankment & tropical tree canopies framing ancient pond
    ctx.fillStyle = '#091824';
    ctx.fillRect(0, horizonY - 12 * scale, w, 14 * scale);

    const drawTree = (tx, r) => {
      ctx.fillStyle = '#0b1e29';
      ctx.beginPath();
      ctx.arc(tx, horizonY - r * 0.85, r, 0, Math.PI * 2);
      ctx.arc(tx - r * 0.7, horizonY - r * 0.5, r * 0.72, 0, Math.PI * 2);
      ctx.arc(tx + r * 0.7, horizonY - r * 0.5, r * 0.72, 0, Math.PI * 2);
      ctx.fill();
    };
    drawTree(w * 0.1, 46 * scale);
    drawTree(w * 0.88, 52 * scale);

    // Warm golden heritage spotlight behind Wat Mahathat
    if (!isReflection) {
      const spot = ctx.createRadialGradient(cx, horizonY - 20 * scale, 10, cx, horizonY - 46 * scale, 200 * scale);
      spot.addColorStop(0, 'rgba(252, 212, 124, 0.36)');
      spot.addColorStop(1, 'rgba(252, 212, 124, 0)');
      ctx.fillStyle = spot;
      ctx.beginPath();
      ctx.arc(cx, horizonY - 30 * scale, 200 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    // Iconic Sukhothai Lotus-Bud Stupa (เจดีย์ทรงพุ่มข้าวบิณฑ์)
    const stupaGrad = ctx.createLinearGradient(cx, horizonY - 12 * scale, cx, horizonY - 156 * scale);
    stupaGrad.addColorStop(0, '#c89b52');
    stupaGrad.addColorStop(0.45, '#3b373e');
    stupaGrad.addColorStop(1, '#182430');
    ctx.fillStyle = stupaGrad;

    // Stepped plinth
    ctx.fillRect(cx - 56 * scale, horizonY - 26 * scale, 112 * scale, 14 * scale);
    ctx.fillRect(cx - 38 * scale, horizonY - 44 * scale, 76 * scale, 18 * scale);
    ctx.fillRect(cx - 24 * scale, horizonY - 76 * scale, 48 * scale, 32 * scale);

    // Graceful lotus-bud spire
    ctx.beginPath();
    ctx.moveTo(cx - 20 * scale, horizonY - 76 * scale);
    ctx.bezierCurveTo(
      cx - 28 * scale,
      horizonY - 104 * scale,
      cx - 10 * scale,
      horizonY - 124 * scale,
      cx,
      horizonY - 156 * scale
    );
    ctx.bezierCurveTo(
      cx + 10 * scale,
      horizonY - 124 * scale,
      cx + 28 * scale,
      horizonY - 104 * scale,
      cx + 20 * scale,
      horizonY - 76 * scale
    );
    ctx.closePath();
    ctx.fill();

    // Classical colonnade pillars (วิหารหลวง) to the right
    ctx.fillStyle = '#1b2c38';
    for (let i = 0; i < 6; i++) {
      const px = cx + (72 + i * 24) * scale;
      const ph = (48 - i * 3.5) * scale;
      ctx.fillRect(px, horizonY - 12 * scale - ph, 7.5 * scale, ph);
    }

    // Serene golden candle torches (ตะคัน) along pond edge
    for (let i = 0; i < 14; i++) {
      const tx = cx - 180 * scale + i * 32 * scale;
      const fl = 0.72 + Math.sin(now * 0.005 + i * 1.3) * 0.28;
      ctx.fillStyle = `rgba(255, 214, 116, ${0.8 * fl})`;
      ctx.beginPath();
      ctx.arc(tx, horizonY - 10 * scale, 2.4 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawKhlongOngAngSkyline(ctx, w, horizonY, now, isReflection) {
    const scale = clamp(w / 1280, 0.58, 1.15);

    // Charming heritage shophouses along left & right canal banks
    const houses = [
      { x: 0, bw: w * 0.13, bh: 78 * scale },
      { x: w * 0.13, bw: w * 0.12, bh: 64 * scale },
      { x: w * 0.25, bw: w * 0.1, bh: 52 * scale },
      { x: w * 0.65, bw: w * 0.1, bh: 54 * scale },
      { x: w * 0.75, bw: w * 0.12, bh: 68 * scale },
      { x: w * 0.87, bw: w * 0.14, bh: 82 * scale },
    ];

    for (const hs of houses) {
      ctx.fillStyle = '#14132b';
      ctx.fillRect(hs.x, horizonY - hs.bh, hs.bw + 1, hs.bh);

      // Warm glowing heritage shop windows
      const cols = Math.max(2, Math.floor(hs.bw / (28 * scale)));
      for (let c = 0; c < cols; c++) {
        const wx = hs.x + 12 * scale + c * 24 * scale;
        const wy = horizonY - hs.bh + 18 * scale;
        ctx.fillStyle = 'rgba(255, 206, 128, 0.55)';
        ctx.fillRect(wx, wy, 10 * scale, 14 * scale);
      }
    }

    // Arched canal pedestrian bridge across the center
    const bx = w * 0.5;
    const bridgeSpan = w * 0.34;
    ctx.strokeStyle = '#252148';
    ctx.lineWidth = 10 * scale;
    ctx.beginPath();
    ctx.moveTo(bx - bridgeSpan / 2, horizonY);
    ctx.quadraticCurveTo(bx, horizonY - 46 * scale, bx + bridgeSpan / 2, horizonY);
    ctx.stroke();

    // Bridge warm handrail glow
    ctx.strokeStyle = 'rgba(255, 204, 120, 0.55)';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(bx - bridgeSpan / 2, horizonY - 6 * scale);
    ctx.quadraticCurveTo(bx, horizonY - 52 * scale, bx + bridgeSpan / 2, horizonY - 6 * scale);
    ctx.stroke();

    // Overhead festive catenary string lights arcing across the canal!
    const strands = [
      { yLeft: horizonY - 76 * scale, yRight: horizonY - 78 * scale, sag: 42 * scale },
      { yLeft: horizonY - 54 * scale, yRight: horizonY - 56 * scale, sag: 30 * scale },
    ];
    const bulbColors = ['#ffd166', '#ff8fab', '#f7b267', '#fff3b0', '#c77dff'];

    strands.forEach((st, sIdx) => {
      ctx.strokeStyle = 'rgba(255, 224, 178, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w * 0.08, st.yLeft);
      ctx.quadraticCurveTo(w * 0.5, st.yLeft + st.sag, w * 0.92, st.yRight);
      ctx.stroke();

      const bulbs = 18;
      for (let i = 1; i < bulbs; i++) {
        const t = i / bulbs;
        const x = w * (0.08 + t * 0.84);
        const y =
          (1 - t) * (1 - t) * st.yLeft +
          2 * (1 - t) * t * (st.yLeft + st.sag) +
          t * t * st.yRight;

        const color = bulbColors[(i + sIdx * 2) % bulbColors.length];
        const pulse = 0.78 + Math.sin(now * 0.004 + i + sIdx) * 0.22;

        if (!isReflection) {
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.22 * pulse;
          ctx.beginPath();
          ctx.arc(x, y, 9 * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 2.8 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
