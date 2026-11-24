import { drawKrathong } from './krathong-renderer.js';

/**
 * Fantasy Godzilla Basketball Krathong Shot Engine
 * Renders a stylized Modern-Thai-Night Kaiju rising from the river holding a
 * glowing golden Lai-Thai basketball hoop, with interactive parabolic aim,
 * drag/click/button shooting, rim physics, net swish animation, and atomic-breath
 * fireworks celebration!
 */
export class GodzillaShotController {
  constructor(engine, callbacks = {}) {
    this.engine = engine;
    this.callbacks = callbacks;

    this.active = false;
    this.phase = 'idle'; // idle | emerging | aiming | flying | swish | submerging
    this.phaseTime = 0;

    this.krathong = null;
    this.attempts = 0;

    // Godzilla spatial & animation state
    this.emergeProgress = 0; // 0 = underwater, 1 = fully risen
    this.kaijuX = 0;
    this.kaijuBaseY = 0;
    this.hoopX = 0;
    this.hoopY = 0;
    this.hoopBaseX = 0;
    this.hoopRadius = 42;
    this.rimLeft = { x: 0, y: 0 };
    this.rimRight = { x: 0, y: 0 };
    this.backboardX = 0;
    this.backboardTop = 0;
    this.backboardBottom = 0;

    // Net & Kaiju expressive animations
    this.netSway = 0;
    this.netSwishTimer = 0;
    this.jawOpen = 0;
    this.atomicBeamAlpha = 0;
    this.speechBubble = '';
    this.speechTimer = 0;
    this.calloutText = '';
    this.calloutTimer = 0;

    // Screen shake
    this.shakeIntensity = 0;
    this.shakeX = 0;
    this.shakeY = 0;

    // Aiming & shot physics
    this.ballStartX = 0;
    this.ballStartY = 0;
    this.ball = null; // { x, y, vx, vy, rot, vrot, trail[], scored, hitBackboard }
    this.gravity = 920;

    // Aim vector controlled by cursor/touch OR oscillating sweet-spot meter
    this.pointerAimActive = false;
    this.pointerX = 0;
    this.pointerY = 0;
    this.isDragging = false;
    this.dragStart = null;
    this.meterPhase = 0; // oscillates 0..1 for button shooting
    this.aimVelocity = { vx: 0, vy: 0 };
    this.aimIsLocked = false;

    // Visual effects specific to Kaiju sequence
    this.foamParticles = [];
    this.sparkParticles = [];
  }

  start(krathong) {
    this.active = true;
    this.krathong = krathong;
    this.phase = 'emerging';
    this.phaseTime = 0;
    this.emergeProgress = 0;
    this.attempts = 0;
    this.netSway = 0;
    this.netSwishTimer = 0;
    this.jawOpen = 0.55;
    this.atomicBeamAlpha = 0;
    this.speechBubble = 'โฮกกก!! ชูตกระทงมาเลย!';
    this.speechTimer = 2.6;
    this.calloutText = '';
    this.calloutTimer = 0;
    this.pointerAimActive = false;
    this.isDragging = false;
    this.dragStart = null;
    this.ball = null;
    this.foamParticles = [];
    this.sparkParticles = [];
    this.shakeIntensity = 12;

    this._recomputeLayout(performance.now());
    this._spawnWaterBurst(this.kaijuX, this.kaijuBaseY, 34);

    if (this.callbacks.onPhaseChange) {
      this.callbacks.onPhaseChange('emerging', this);
    }
  }

  cancelToFloat() {
    if (!this.active) return;
    const krathong = this.krathong;
    this.active = false;
    this.phase = 'idle';
    this.shakeX = 0;
    this.shakeY = 0;
    if (this.callbacks.onComplete) {
      this.callbacks.onComplete(krathong, { scored: false, skipped: true });
    }
  }

  /**
   * Fires the krathong along the current computed trajectory (used by big Shoot button or Spacebar).
   */
  shootFromButton() {
    if (!this.active || this.phase !== 'aiming') return;
    // Guaranteed perfect swish shot directly into Godzilla's hoop!
    const perfect = this._solvePerfectShot(this.ballStartX, this.ballStartY, this.hoopX, this.hoopY - 12, 1.2);
    this._launchBall(perfect.vx, perfect.vy);
  }

  handlePointerDown(px, py) {
    if (!this.active || this.phase !== 'aiming') return false;
    this.isDragging = true;
    this.dragStart = { x: px, y: py };
    this.dragCurrent = { x: px, y: py };
    this.pointerAimActive = true;
    this._updateSlingshotAim(px, py);
    return true;
  }

  handlePointerMove(px, py) {
    if (!this.active || this.phase !== 'aiming') return false;
    if (!this.isDragging) return false;
    this.dragCurrent = { x: px, y: py };
    this.pointerAimActive = true;
    this._updateSlingshotAim(px, py);
    return true;
  }

  handlePointerUp(px, py) {
    if (!this.active || this.phase !== 'aiming') return false;
    if (!this.isDragging) return false;
    this.isDragging = false;

    const pullDown = Math.max(0, (this.dragCurrent ? this.dragCurrent.y : py) - this.dragStart.y);
    // Deliberate pull-down slingshot release (> 16px pull)
    if (pullDown > 16) {
      if (this.aimIsLocked) {
        // Guaranteed swish if trajectory passed cleanly through hoop
        const perfect = this._solvePerfectShot(this.ballStartX, this.ballStartY, this.hoopX, this.hoopY - 12, 1.2);
        this._launchBall(perfect.vx, perfect.vy);
      } else {
        this._launchBall(this.aimVelocity.vx, this.aimVelocity.vy);
      }
    }
    return true;
  }

  _updateSlingshotAim(px, py) {
    // Slingshot pull down: pulling finger DOWN from drag start increases launch power and arc height
    const pullDown = Math.max(0, py - this.dragStart.y);
    const pullSide = px - this.dragStart.x;

    // Calculate baseline trajectory needed to reach the hoop
    const perfect = this._solvePerfectShot(this.ballStartX, this.ballStartY, this.hoopX, this.hoopY - 10, 1.2);
    const baseSpeed = Math.hypot(perfect.vx, perfect.vy);
    const baseAngle = Math.atan2(perfect.vy, perfect.vx);

    // Power ratio: ideal pull distance is ~80px
    const powerRatio = clamp(0.35 + (pullDown / 80) * 0.65, 0.35, 1.85);
    // Horizontal tilt: moving finger left/right tilts launch angle smoothly
    const angleTilt = clamp(pullSide / 160, -0.38, 0.38);

    const speed = baseSpeed * powerRatio;
    const angle = baseAngle - angleTilt;

    this.aimVelocity = {
      vx: speed * Math.cos(angle),
      vy: speed * Math.sin(angle),
    };

    // Check if the predicted trajectory passes cleanly through Godzilla's hoop
    this.aimIsLocked = this._trajectoryHitsHoop(this.ballStartX, this.ballStartY, this.aimVelocity.vx, this.aimVelocity.vy);
  }

  _solvePerfectShot(x0, y0, tx, ty, T) {
    const vx = (tx - x0) / T;
    const vy = (ty - y0 - 0.5 * this.gravity * T * T) / T;
    return { vx, vy };
  }

  _trajectoryHitsHoop(x0, y0, vx, vy) {
    let prevX = x0;
    let prevY = y0;
    for (let step = 1; step <= 48; step++) {
      const t = step * 0.032;
      const x = x0 + vx * t;
      const y = y0 + vy * t + 0.5 * this.gravity * t * t;
      const curVy = vy + this.gravity * t;
      // Passing downward across the hoop rim plane
      if (curVy > 0 && prevY <= this.hoopY && y >= this.hoopY) {
        const frac = (this.hoopY - prevY) / Math.max(0.001, y - prevY);
        const crossX = prevX + (x - prevX) * frac;
        if (Math.abs(crossX - this.hoopX) < this.hoopRadius * 0.92) {
          return true;
        }
      }
      prevX = x;
      prevY = y;
    }
    return false;
  }

  _launchBall(vx, vy) {
    this.attempts++;
    this.phase = 'flying';
    this.phaseTime = 0;
    this.ball = {
      x: this.ballStartX,
      y: this.ballStartY,
      vx,
      vy,
      rot: 0,
      vrot: (vx >= 0 ? 1 : -1) * 6.5,
      trail: [],
      scored: false,
      hitBackboard: false,
      prevY: this.ballStartY,
      prevX: this.ballStartX,
    };

    if (this.callbacks.onShoot) {
      this.callbacks.onShoot();
    }
    if (this.callbacks.onPhaseChange) {
      this.callbacks.onPhaseChange('flying', this);
    }
  }

  _recomputeLayout(now) {
    const w = this.engine.width;
    const h = this.engine.height;
    const horizonY = h * 0.44;
    const scale = clamp(Math.min(w / 1180, h / 780), 0.58, 1.12);

    this.scale = scale;
    this.kaijuX = w * (w < 680 ? 0.62 : 0.6);
    this.kaijuBaseY = horizonY + (h - horizonY) * 0.32;

    // Subtle lively sway while holding the hoop during aiming
    const sway = this.phase === 'aiming' ? Math.sin(now * 0.0017) * (w < 680 ? 16 : 26) : 0;
    this.hoopBaseX = this.kaijuX - 152 * scale;
    this.hoopX = this.hoopBaseX + sway;
    this.hoopY = this.kaijuBaseY - 122 * scale;
    this.hoopRadius = 40 * scale;

    this.rimLeft = { x: this.hoopX - this.hoopRadius, y: this.hoopY };
    this.rimRight = { x: this.hoopX + this.hoopRadius, y: this.hoopY };
    this.backboardX = this.hoopX + this.hoopRadius + 9 * scale;
    this.backboardTop = this.hoopY - 72 * scale;
    this.backboardBottom = this.hoopY + 14 * scale;

    // Shooter krathong hovers cleanly in lower-left/center foreground
    this.ballStartX = w * (w < 680 ? 0.28 : 0.3);
    this.ballStartY = h - (w < 680 ? 162 : 146);
  }

  update(dt, now) {
    if (!this.active) return;
    this._recomputeLayout(now);
    this.phaseTime += dt;

    // Update screen shake
    if (this.shakeIntensity > 0.1) {
      this.shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeIntensity *= Math.pow(0.06, dt);
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
      this.shakeIntensity = 0;
    }

    if (this.speechTimer > 0) this.speechTimer = Math.max(0, this.speechTimer - dt);
    if (this.calloutTimer > 0) this.calloutTimer = Math.max(0, this.calloutTimer - dt);
    if (this.netSwishTimer > 0) {
      this.netSwishTimer = Math.max(0, this.netSwishTimer - dt);
      this.netSway = Math.sin(this.netSwishTimer * 24) * this.netSwishTimer * 18;
    } else {
      this.netSway *= Math.pow(0.08, dt);
    }

    // Update splash foam & golden spark particles
    for (let i = this.foamParticles.length - 1; i >= 0; i--) {
      const p = this.foamParticles[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 320 * dt;
      if (p.age >= p.life) this.foamParticles.splice(i, 1);
    }
    for (let i = this.sparkParticles.length - 1; i >= 0; i--) {
      const p = this.sparkParticles[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
      if (p.age >= p.life) this.sparkParticles.splice(i, 1);
    }

    // --- Phase state machine ---
    if (this.phase === 'emerging') {
      this.emergeProgress = Math.min(1, this.phaseTime / 1.05);
      const eased = 1 - Math.pow(1 - this.emergeProgress, 3);
      this.jawOpen = 0.55 * (1 - eased * 0.5);

      if (Math.random() < 0.45) {
        this._spawnWaterBurst(this.kaijuX + (Math.random() - 0.5) * 140 * this.scale, this.kaijuBaseY, 3);
      }

      if (this.emergeProgress >= 1) {
        this.phase = 'aiming';
        this.phaseTime = 0;
        this.meterPhase = 0;
        if (this.callbacks.onPhaseChange) this.callbacks.onPhaseChange('aiming', this);
      }
    } else if (this.phase === 'aiming') {
      this.meterPhase += dt;
      this.jawOpen = 0.14 + Math.sin(now * 0.004) * 0.06;

      if (!this.pointerAimActive) {
        // Sync idle preview arc with oscillating power meter
        const meterVal = 0.5 + 0.5 * Math.sin(this.meterPhase * 2.5);
        const perfect = this._solvePerfectShot(this.ballStartX, this.ballStartY, this.hoopX, this.hoopY - 12, 1.24);
        const err = (meterVal - 0.5) * 2;
        const damped = Math.abs(err) < 0.36 ? err * 0.12 : err * 0.52;
        this.aimVelocity = {
          vx: perfect.vx * (1 + damped * 0.22),
          vy: perfect.vy * (1 - Math.abs(damped) * 0.08),
        };
        this.aimIsLocked = Math.abs(err) < 0.36;
      } else {
        this._updatePointerAim(this.pointerX, this.pointerY);
      }

      if (this.callbacks.onMeterUpdate) {
        const meterVal = 0.5 + 0.5 * Math.sin(this.meterPhase * 2.5);
        this.callbacks.onMeterUpdate(meterVal, this.aimIsLocked);
      }
    } else if (this.phase === 'flying' && this.ball) {
      const b = this.ball;
      b.prevX = b.x;
      b.prevY = b.y;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vy += this.gravity * dt;
      b.rot += b.vrot * dt;

      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 18) b.trail.shift();

      if (Math.random() < 0.7) {
        this.sparkParticles.push({
          x: b.x + (Math.random() - 0.5) * 16,
          y: b.y + (Math.random() - 0.5) * 16,
          vx: (Math.random() - 0.5) * 40,
          vy: (Math.random() - 0.5) * 40,
          color: Math.random() < 0.65 ? '#fde68a' : '#67e8f9',
          size: 2 + Math.random() * 2.5,
          life: 0.45 + Math.random() * 0.3,
          age: 0,
        });
      }

      // 1. Backboard collision (right side of hoop)
      if (
        !b.scored &&
        b.vx > 0 &&
        b.prevX <= this.backboardX &&
        b.x >= this.backboardX - 10 &&
        b.y >= this.backboardTop &&
        b.y <= this.backboardBottom
      ) {
        b.x = this.backboardX - 11;
        b.vx = -Math.abs(b.vx) * 0.54;
        b.vy *= 0.86;
        b.hitBackboard = true;
        if (this.callbacks.onRimHit) this.callbacks.onRimHit();
        this._spawnSparks(b.x, b.y, '#fde047', 8);
      }

      // 2. Rim left & right edge collision
      if (!b.scored) {
        for (const rimPt of [this.rimLeft, this.rimRight]) {
          const dx = b.x - rimPt.x;
          const dy = b.y - rimPt.y;
          const dist = Math.hypot(dx, dy);
          const minDist = 14 * this.scale;
          if (dist > 0.1 && dist < minDist) {
            const nx = dx / dist;
            const ny = dy / dist;
            const dot = b.vx * nx + b.vy * ny;
            if (dot < 0) {
              b.vx -= 1.65 * dot * nx;
              b.vy -= 1.65 * dot * ny;
              b.vx *= 0.68;
              b.vy *= 0.68;
              // Slight inward pull if nearly above the hoop center (forgiving arcade rim!)
              if (Math.abs(b.x - this.hoopX) < this.hoopRadius * 1.05 && b.y < this.hoopY) {
                b.vx += (this.hoopX - b.x) * 2.4;
              }
              if (this.callbacks.onRimHit) this.callbacks.onRimHit();
              this._spawnSparks(rimPt.x, rimPt.y, '#fbbf24', 10);
            }
          }
        }
      }

      // 3. Check SWISH (passing downward through hoop rim!)
      if (!b.scored && b.vy > 0 && b.prevY <= this.hoopY + 6 && b.y >= this.hoopY - 4) {
        const frac = (this.hoopY - b.prevY) / Math.max(0.001, b.y - b.prevY);
        const crossX = b.prevX + (b.x - b.prevX) * clamp(frac, 0, 1);
        if (Math.abs(crossX - this.hoopX) < this.hoopRadius * 0.92) {
          b.scored = true;
          b.vx *= 0.25;
          b.vy = Math.max(160, b.vy * 0.45);
          this.netSwishTimer = 1.1;
          this.shakeIntensity = 14;
          this.jawOpen = 1;
          this.atomicBeamAlpha = 1;
          this.calloutText = b.hitBackboard ? '✨ BANK SHOT! สวยงามระดับตำนาน!' : '🔥 SWISH!! ชูตกระทงลงห่วงสุดปัง!';
          this.calloutTimer = 2.8;
          this.speechBubble = 'โฮกกก!! คำอธิษฐานสมหวังแน่!!';
          this.speechTimer = 3.0;
          this._spawnSparks(this.hoopX, this.hoopY, '#fef08a', 34);
          this._spawnSparks(this.hoopX, this.hoopY, '#38bdf8', 22);

          // Launch 3 celebration fireworks in the night sky!
          this.engine.launchFirework(0.26, 0.16);
          setTimeout(() => this.engine.launchFirework(0.5, 0.12), 180);
          setTimeout(() => this.engine.launchFirework(0.75, 0.18), 360);

          if (this.callbacks.onSwish) this.callbacks.onSwish();
        }
      }

      // 4. Water landing detection
      const waterSurfaceY = this.kaijuBaseY + 34 * this.scale;
      if (b.scored && b.y >= waterSurfaceY) {
        // Scored krathong splashes smoothly into the river and transitions to living float!
        this._spawnWaterBurst(b.x, waterSurfaceY, 26);
        this.engine.addSplashRipple(b.x, waterSurfaceY, true);
        this.engine.spawnBlessParticles(b.x, waterSurfaceY - 24, '✨', 16);

        // Hand off the exact screen position to the live river engine so it keeps floating seamlessly!
        this._handoffKrathongToRiver(b.x, waterSurfaceY);
        this.ball = null;
        this.phase = 'swish';
        this.phaseTime = 0;
        if (this.callbacks.onPhaseChange) this.callbacks.onPhaseChange('swish', this);
      } else if (!b.scored && (b.y > this.engine.height + 60 || b.x < -80 || b.x > this.engine.width + 80)) {
        // Missed! Playful Kaiju reaction & instant retry
        this.ball = null;
        this.phase = 'aiming';
        this.phaseTime = 0;
        this.speechBubble =
          this.attempts % 2 === 1
            ? 'เฉียดไปนิดเดียว! เล็งห่วงแล้วชูตใหม่เลย!'
            : 'อีกนิดเดียว! ขยับเมาส์เล็งให้ขึ้นสีทองนะ!';
        this.speechTimer = 2.8;
        this.calloutText = '💨 พลาดนิดเดียว ลองชูตใหม่อีกที!';
        this.calloutTimer = 1.6;
        if (this.callbacks.onPhaseChange) this.callbacks.onPhaseChange('aiming', this);
      }
    } else if (this.phase === 'swish') {
      // Godzilla roars & fires atomic celebratory beam into the starry sky!
      this.atomicBeamAlpha = Math.max(0, 1 - this.phaseTime / 1.45);
      this.jawOpen = Math.max(0.15, 1 - this.phaseTime / 1.6);

      if (this.phaseTime >= 1.55) {
        this.phase = 'submerging';
        this.phaseTime = 0;
        this.shakeIntensity = 6;
        if (this.callbacks.onPhaseChange) this.callbacks.onPhaseChange('submerging', this);
      }
    } else if (this.phase === 'submerging') {
      this.emergeProgress = Math.max(0, 1 - this.phaseTime / 1.05);
      if (Math.random() < 0.4) {
        this._spawnWaterBurst(this.kaijuX + (Math.random() - 0.5) * 120 * this.scale, this.kaijuBaseY, 2);
      }
      if (this.emergeProgress <= 0) {
        const finishedKrathong = this.krathong;
        this.active = false;
        this.phase = 'idle';
        this.shakeX = 0;
        this.shakeY = 0;
        if (this.callbacks.onComplete) {
          this.callbacks.onComplete(finishedKrathong, { scored: true, attempts: this.attempts });
        }
      }
    }
  }

  _handoffKrathongToRiver(landX, landY) {
    const horizonY = this.engine.height * 0.44;
    const waterH = this.engine.height - horizonY;
    const depth = clamp((landY - horizonY - 26) / Math.max(100, waterH - 118), 0.25, 0.85);
    this.engine.addOrLaunchKrathong(this.krathong, { animateLaunch: false, isMine: true });
    const ent = this.engine.krathongEntities.find((e) => e.data.id === this.krathong.id);
    if (ent) {
      ent.x = landX;
      ent.depth = depth;
      ent.targetDepth = depth;
      ent.launchProgress = 1;
    }
    this.engine.spotlightKrathong(this.krathong.id, 11000);
  }

  _spawnWaterBurst(x, y, count) {
    for (let i = 0; i < count; i++) {
      const ang = -Math.PI * (0.12 + Math.random() * 0.76);
      const spd = 80 + Math.random() * 190;
      this.foamParticles.push({
        x: x + (Math.random() - 0.5) * 60 * this.scale,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        r: 3 + Math.random() * 6,
        color: Math.random() < 0.3 ? 'rgba(103, 232, 249, 0.78)' : 'rgba(226, 244, 255, 0.75)',
        life: 0.55 + Math.random() * 0.45,
        age: 0,
      });
    }
  }

  _spawnSparks(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 60 + Math.random() * 210;
      this.sparkParticles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        color,
        size: 2.2 + Math.random() * 3.2,
        life: 0.55 + Math.random() * 0.55,
        age: 0,
      });
    }
  }

  /* ========================================================================
     RENDERING (GODZILLA KAIJU, GOLDEN THAI HOOP, TRAJECTORY & BALL)
     ======================================================================== */
  renderBackdropLayer(ctx, now) {
    if (!this.active) return;

    const s = this.scale;
    const ease = 1 - Math.pow(1 - this.emergeProgress, 3);
    const riseOffset = (1 - ease) * 260 * s;

    // 1. Bioluminescent atomic aura on water around Godzilla
    ctx.save();
    ctx.translate(this.kaijuX, this.kaijuBaseY + 12 * s);
    ctx.scale(175 * s, 46 * s);
    const aura = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 1);
    const pulse = 0.7 + Math.sin(now * 0.006) * 0.3;
    aura.addColorStop(0, `rgba(56, 189, 248, ${0.38 * ease * pulse})`);
    aura.addColorStop(0.55, `rgba(247, 214, 138, ${0.14 * ease})`);
    aura.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Atomic Breath Victory Beam firing skyward on SWISH!
    if (this.atomicBeamAlpha > 0.01) {
      this._drawAtomicVictoryBeam(ctx, this.kaijuX - 42 * s, this.kaijuBaseY - 196 * s + riseOffset, s, now);
    }

    // 3. Clip Godzilla cleanly at the waterline so he rises authentically from the river!
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.engine.width, this.kaijuBaseY + 14 * s);
    ctx.clip();

    this._drawGodzilla(ctx, this.kaijuX, this.kaijuBaseY + riseOffset, s, now);
    this._drawThaiBasketballHoop(ctx, this.hoopX, this.hoopY + riseOffset, s, now, 'back');

    ctx.restore();

    // Waterline churning foam band right at Godzilla's torso
    if (ease > 0.05) {
      ctx.save();
      for (let i = 0; i < 9; i++) {
        const fx = this.kaijuX + (i - 4) * 24 * s + Math.sin(now * 0.006 + i) * 5;
        const fy = this.kaijuBaseY + 8 * s + Math.cos(now * 0.005 + i * 2) * 3;
        ctx.fillStyle = i % 2 === 0 ? `rgba(186, 230, 253, ${0.42 * ease})` : `rgba(103, 232, 249, ${0.32 * ease})`;
        ctx.beginPath();
        ctx.ellipse(fx, fy, (18 + (i % 3) * 8) * s, 4.5 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 4. Godzilla speech bubble
    if (this.speechTimer > 0 && ease > 0.6) {
      this._drawSpeechBubble(ctx, this.kaijuX + 24 * s, this.kaijuBaseY - 260 * s + riseOffset, this.speechBubble);
    }
  }

  renderForegroundLayer(ctx, now) {
    if (!this.active) return;
    const s = this.scale;
    const ease = 1 - Math.pow(1 - this.emergeProgress, 3);
    const riseOffset = (1 - ease) * 260 * s;

    // 1. Dotted glowing trajectory arc while aiming
    if (this.phase === 'aiming') {
      this._drawAimTrajectory(ctx, now);
      this._drawReadyKrathong(ctx, now);
    }

    // 2. Flying Krathong with Golden-Cyan Comet Trail!
    if (this.phase === 'flying' && this.ball) {
      this._drawFlyingKrathong(ctx, now);
    }

    // 3. Front Rim & Swishing Net (drawn OVER the krathong so it genuinely passes THROUGH the hoop!)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.engine.width, this.kaijuBaseY + 14 * s);
    ctx.clip();
    this._drawThaiBasketballHoop(ctx, this.hoopX, this.hoopY + riseOffset, s, now, 'front');
    ctx.restore();

    // 4. Foam & Spark Particles
    for (const p of this.foamParticles) {
      const a = Math.max(0, 1 - p.age / p.life);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const p of this.sparkParticles) {
      const a = Math.max(0, 1 - p.age / p.life);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 5. Dramatic Callout Text (SWISH! / BANK SHOT! / RETRY!)
    if (this.calloutTimer > 0 && this.calloutText) {
      const pop = Math.min(1, (2.8 - this.calloutTimer) * 5);
      const alpha = Math.min(1, this.calloutTimer * 1.6);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(this.engine.width * 0.5, this.engine.height * 0.25 - (1 - pop) * 18);
      ctx.scale(0.86 + pop * 0.14, 0.86 + pop * 0.14);
      ctx.font = `700 ${Math.round(clamp(this.engine.width * 0.032, 20, 38))}px Prompt, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(8, 12, 28, 0.72)';
      ctx.fillText(this.calloutText, 0, 3);
      ctx.fillStyle = '#fff3b0';
      ctx.shadowColor = 'rgba(247, 198, 86, 0.85)';
      ctx.shadowBlur = 18;
      ctx.fillText(this.calloutText, 0, 0);
      ctx.restore();
    }
  }

  _drawGodzilla(ctx, cx, baseY, s, now) {
    const breathe = Math.sin(now * 0.0032) * 4 * s;
    const spinePulse = 0.72 + Math.sin(now * 0.008) * 0.28;
    const superCharged = this.atomicBeamAlpha > 0.05 ? 1 : 0;

    ctx.save();
    ctx.translate(cx, baseY + breathe);

    // --- Iconic Glowing Atomic Dorsal Spines along back ---
    const spines = [
      { x: 56, y: -188, sz: 24, ang: 0.35 },
      { x: 74, y: -152, sz: 34, ang: 0.45 },
      { x: 86, y: -108, sz: 42, ang: 0.52 },
      { x: 92, y: -62, sz: 36, ang: 0.58 },
      { x: 94, y: -22, sz: 28, ang: 0.62 },
    ];
    for (let i = 0; i < spines.length; i++) {
      const sp = spines[i];
      ctx.save();
      ctx.translate(sp.x * s, sp.y * s);
      ctx.rotate(sp.ang);

      // Bioluminescent glow behind spine
      const glowColor = superCharged ? 'rgba(125, 249, 255, 0.95)' : `rgba(56, 189, 248, ${0.58 * spinePulse})`;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = (superCharged ? 28 : 16) * s;

      const sg = ctx.createLinearGradient(0, 0, sp.sz * s, 0);
      sg.addColorStop(0, '#0f293b');
      sg.addColorStop(0.45, '#0ea5e9');
      sg.addColorStop(1, superCharged ? '#ffffff' : '#a5f3fc');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(-6 * s, -sp.sz * 0.42 * s);
      ctx.lineTo(sp.sz * 0.65 * s, -sp.sz * 0.28 * s);
      ctx.lineTo(sp.sz * 1.05 * s, 0);
      ctx.lineTo(sp.sz * 0.6 * s, sp.sz * 0.28 * s);
      ctx.lineTo(-6 * s, sp.sz * 0.42 * s);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // --- Massive Muscular Kaiju Torso & Thick Neck ---
    const bodyGrad = ctx.createLinearGradient(-70 * s, -220 * s, 85 * s, 10 * s);
    bodyGrad.addColorStop(0, '#1c3144');
    bodyGrad.addColorStop(0.45, '#122030');
    bodyGrad.addColorStop(1, '#08101c');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(-88 * s, 20 * s);
    ctx.bezierCurveTo(-82 * s, -65 * s, -48 * s, -135 * s, -24 * s, -196 * s);
    ctx.bezierCurveTo(6 * s, -225 * s, 54 * s, -206 * s, 68 * s, -155 * s);
    ctx.bezierCurveTo(96 * s, -90 * s, 102 * s, -25 * s, 96 * s, 20 * s);
    ctx.closePath();
    ctx.fill();

    // Armored Chest Scales (segmented belly plates)
    ctx.strokeStyle = 'rgba(103, 232, 249, 0.22)';
    ctx.lineWidth = 1.6 * s;
    for (let r = 0; r < 5; r++) {
      const py = (-25 - r * 26) * s;
      ctx.beginPath();
      ctx.moveTo(-58 * s + r * 4 * s, py);
      ctx.quadraticCurveTo(-24 * s, py + 9 * s, 12 * s, py - 2 * s);
      ctx.stroke();
    }

    // --- Extended Kaiju Left Arm Holding Up the Golden Basketball Hoop Pole! ---
    const hoopRelX = this.hoopX - cx;
    const hoopRelY = this.hoopY - (baseY + breathe);
    const poleX = hoopRelX + this.hoopRadius + 14 * s;
    const poleY = hoopRelY + 12 * s;

    ctx.strokeStyle = '#142436';
    ctx.lineWidth = 30 * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-42 * s, -98 * s);
    ctx.quadraticCurveTo(-92 * s, -72 * s, poleX + 8 * s, poleY + 26 * s);
    ctx.stroke();

    // Arm rim highlight
    ctx.strokeStyle = 'rgba(103, 232, 249, 0.28)';
    ctx.lineWidth = 2.5 * s;
    ctx.beginPath();
    ctx.moveTo(-45 * s, -110 * s);
    ctx.quadraticCurveTo(-92 * s, -84 * s, poleX + 6 * s, poleY + 14 * s);
    ctx.stroke();

    // Massive Kaiju Claw gripping the golden hoop post
    ctx.fillStyle = '#1b3146';
    ctx.beginPath();
    ctx.ellipse(poleX + 4 * s, poleY + 22 * s, 18 * s, 14 * s, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // 3 Ivory Claws wrapped around post
    ctx.fillStyle = '#e2e8f0';
    for (let c = -1; c <= 1; c++) {
      ctx.beginPath();
      ctx.moveTo(poleX - 10 * s, poleY + (16 + c * 7) * s);
      ctx.lineTo(poleX - 18 * s, poleY + (18 + c * 7) * s);
      ctx.lineTo(poleX - 8 * s, poleY + (21 + c * 7) * s);
      ctx.closePath();
      ctx.fill();
    }

    // --- Sculpted Fierce Godzilla Head (facing left toward the shooter!) ---
    ctx.save();
    ctx.translate(4 * s, -198 * s);
    const headTilt = this.atomicBeamAlpha > 0.05 ? 0.28 : -0.04 + Math.sin(now * 0.0025) * 0.03;
    ctx.rotate(headTilt);

    // Lower jaw (opens dramatically during roar & swish!)
    ctx.save();
    ctx.rotate(-this.jawOpen * 0.42);
    ctx.fillStyle = '#0f1d2c';
    ctx.beginPath();
    ctx.moveTo(-4 * s, 4 * s);
    ctx.lineTo(-68 * s, 14 * s);
    ctx.quadraticCurveTo(-56 * s, 28 * s, -14 * s, 24 * s);
    ctx.closePath();
    ctx.fill();

    // Inner glowing mouth when roaring
    if (this.jawOpen > 0.18) {
      ctx.fillStyle = this.atomicBeamAlpha > 0.05 ? '#7dd3fc' : 'rgba(56, 189, 248, 0.55)';
      ctx.beginPath();
      ctx.ellipse(-34 * s, 6 * s, 20 * s, 7 * s, -0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lower sharp teeth
    ctx.fillStyle = '#f8fafc';
    for (let t = 0; t < 5; t++) {
      const tx = (-58 + t * 10) * s;
      ctx.beginPath();
      ctx.moveTo(tx, 12 * s);
      ctx.lineTo(tx + 3 * s, 5 * s);
      ctx.lineTo(tx + 6 * s, 12 * s);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Upper skull, fierce brow ridge & snout
    const headGrad = ctx.createLinearGradient(-74 * s, -32 * s, 32 * s, 16 * s);
    headGrad.addColorStop(0, '#223b52');
    headGrad.addColorStop(0.55, '#152536');
    headGrad.addColorStop(1, '#0b1522');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.moveTo(32 * s, 10 * s);
    ctx.quadraticCurveTo(34 * s, -34 * s, -6 * s, -34 * s);
    ctx.lineTo(-26 * s, -22 * s);
    ctx.lineTo(-72 * s, -12 * s);
    ctx.quadraticCurveTo(-78 * s, 0, -64 * s, 6 * s);
    ctx.lineTo(14 * s, 10 * s);
    ctx.closePath();
    ctx.fill();

    // Upper sharp teeth
    ctx.fillStyle = '#f8fafc';
    for (let t = 0; t < 5; t++) {
      const tx = (-62 + t * 10.5) * s;
      ctx.beginPath();
      ctx.moveTo(tx, 5 * s);
      ctx.lineTo(tx + 3.5 * s, 13 * s);
      ctx.lineTo(tx + 7 * s, 5 * s);
      ctx.closePath();
      ctx.fill();
    }

    // Glowing Fierce Golden-Cyan Eye
    ctx.save();
    ctx.shadowColor = this.atomicBeamAlpha > 0.05 ? '#38bdf8' : '#fbbf24';
    ctx.shadowBlur = 12 * s;
    ctx.fillStyle = this.atomicBeamAlpha > 0.05 ? '#e0f2fe' : '#fde047';
    ctx.beginPath();
    ctx.moveTo(-26 * s, -14 * s);
    ctx.lineTo(-12 * s, -17 * s);
    ctx.lineTo(-16 * s, -9 * s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Nostril glowing vapor puff
    ctx.fillStyle = 'rgba(186, 230, 253, 0.35)';
    ctx.beginPath();
    ctx.arc(-66 * s, -6 * s, (3 + Math.sin(now * 0.008) * 1.4) * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // end head
    ctx.restore(); // end Godzilla
  }

  _drawThaiBasketballHoop(ctx, hx, hy, s, now, layer) {
    const r = this.hoopRadius;
    const bx = hx + r + 9 * s;
    const bTop = hy - 72 * s;
    const bBot = hy + 14 * s;
    const glowLock = this.phase === 'aiming' && this.aimIsLocked;

    ctx.save();

    if (layer === 'back') {
      // Golden ceremonial pole held by Godzilla
      const poleGrad = ctx.createLinearGradient(bx, 0, bx + 12 * s, 0);
      poleGrad.addColorStop(0, '#925d12');
      poleGrad.addColorStop(0.5, '#f7d68a');
      poleGrad.addColorStop(1, '#78480a');
      ctx.fillStyle = poleGrad;
      ctx.fillRect(bx + 1 * s, bBot - 4 * s, 10 * s, 96 * s);

      // Glowing Translucent Glass Backboard with Modern Thai Gold Rim
      ctx.save();
      ctx.shadowColor = glowLock ? 'rgba(255, 224, 120, 0.9)' : 'rgba(247, 214, 138, 0.45)';
      ctx.shadowBlur = (glowLock ? 24 : 14) * s;

      ctx.fillStyle = 'rgba(18, 28, 56, 0.62)';
      ctx.strokeStyle = glowLock ? '#fff4bd' : '#f4c561';
      ctx.lineWidth = 3.2 * s;
      ctx.beginPath();
      ctx.roundRect(bx - 5 * s, bTop, 13 * s, bBot - bTop, 5 * s);
      ctx.fill();
      ctx.stroke();

      // Thai Kanok finial crown atop the backboard!
      ctx.fillStyle = '#f7d68a';
      ctx.beginPath();
      ctx.moveTo(bx - 4 * s, bTop);
      ctx.quadraticCurveTo(bx + 1 * s, bTop - 18 * s, bx + 6 * s, bTop - 22 * s);
      ctx.quadraticCurveTo(bx + 9 * s, bTop - 8 * s, bx + 8 * s, bTop);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Back half of the Basketball Rim
      ctx.strokeStyle = glowLock ? '#fde047' : '#f97316';
      ctx.lineWidth = 4.5 * s;
      ctx.beginPath();
      ctx.ellipse(hx, hy, r, 10 * s, 0, Math.PI, Math.PI * 2);
      ctx.stroke();

      // Subtle glowing target halo inside rim when trajectory is locked!
      if (glowLock) {
        const pulse = 0.6 + Math.sin(now * 0.012) * 0.4;
        ctx.fillStyle = `rgba(254, 240, 138, ${0.28 * pulse})`;
        ctx.beginPath();
        ctx.ellipse(hx, hy, r * 0.9, 8 * s, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // FRONT LAYER: Swaying white-gold braided basketball net + front rim arc
      const netHeight = 52 * s;
      const swayX = this.netSway * s;
      const strands = 7;

      ctx.strokeStyle = 'rgba(255, 246, 220, 0.78)';
      ctx.lineWidth = 1.6 * s;

      // Diagonal criss-cross net cords
      for (let i = 0; i < strands; i++) {
        const t = i / (strands - 1);
        const topX = hx - r + t * (r * 2);
        const botX = hx - r * 0.56 + t * (r * 1.12) + swayX;
        const botY = hy + netHeight;

        ctx.beginPath();
        ctx.moveTo(topX, hy + 4 * s);
        ctx.quadraticCurveTo((topX + botX) * 0.5 + swayX * 0.4, hy + netHeight * 0.52, botX, botY);
        ctx.stroke();

        if (i < strands - 1) {
          const nextTopX = hx - r + ((i + 1) / (strands - 1)) * (r * 2);
          ctx.beginPath();
          ctx.moveTo(nextTopX, hy + 4 * s);
          ctx.lineTo(botX, botY);
          ctx.stroke();
        }
      }

      // Horizontal diamond tie bands on net
      for (let row = 1; row <= 3; row++) {
        const f = row / 4;
        const rw = r * (1 - f * 0.42);
        const ry = hy + 4 * s + f * (netHeight - 4 * s);
        ctx.beginPath();
        ctx.moveTo(hx - rw + swayX * f, ry);
        ctx.quadraticCurveTo(hx + swayX * f, ry + 6 * s, hx + rw + swayX * f, ry);
        ctx.stroke();
      }

      // Front half of the flaming orange-gold Basketball Rim (drawn over ball)
      ctx.save();
      ctx.shadowColor = glowLock ? 'rgba(254, 240, 138, 0.95)' : 'rgba(251, 146, 60, 0.7)';
      ctx.shadowBlur = (glowLock ? 18 : 10) * s;
      ctx.strokeStyle = glowLock ? '#fef08a' : '#fb923c';
      ctx.lineWidth = 5 * s;
      ctx.beginPath();
      ctx.ellipse(hx, hy, r, 10 * s, 0, 0, Math.PI);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  _drawAtomicVictoryBeam(ctx, mouthX, mouthY, s, now) {
    ctx.save();
    const a = this.atomicBeamAlpha;
    const jitter = Math.sin(now * 0.05) * 4 * s;
    const endX = mouthX - 180 * s;
    const endY = -60;

    // Outer cyan glow beam
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.42 * a})`;
    ctx.lineWidth = (54 + Math.sin(now * 0.04) * 10) * s;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(mouthX, mouthY);
    ctx.lineTo(endX + jitter, endY);
    ctx.stroke();

    // Inner blazing white-gold core
    ctx.strokeStyle = `rgba(240, 253, 255, ${0.9 * a})`;
    ctx.lineWidth = 18 * s;
    ctx.beginPath();
    ctx.moveTo(mouthX, mouthY);
    ctx.lineTo(endX + jitter * 0.5, endY);
    ctx.stroke();
    ctx.restore();
  }

  _drawAimTrajectory(ctx, now) {
    const { vx, vy } = this.aimVelocity;
    const locked = this.aimIsLocked;

    ctx.save();
    for (let i = 1; i <= 18; i++) {
      const t = i * 0.055;
      const x = this.ballStartX + vx * t;
      const y = this.ballStartY + vy * t + 0.5 * this.gravity * t * t;
      if (y > this.engine.height) break;

      const fade = 1 - i / 20;
      const dotR = (4.5 - i * 0.14) * (locked ? 1.15 : 1);
      ctx.fillStyle = locked
        ? `rgba(254, 240, 138, ${0.92 * fade})`
        : `rgba(186, 230, 253, ${0.65 * fade})`;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.8, dotR), 0, Math.PI * 2);
      ctx.fill();
    }

    // Subtle pulsing lock badge next to hoop
    if (locked) {
      const pulse = 0.8 + Math.sin(now * 0.01) * 0.2;
      ctx.font = '600 13px Prompt, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(254, 240, 138, ${pulse})`;
      ctx.fillText(this.isDragging ? '✦ ตรงห่วงแล้ว! ปล่อยเพื่อชูต!' : '✦ ตรงห่วงแล้ว! กดชูตเลย!', this.hoopX, this.hoopY - 26 * this.scale);
    }
    ctx.restore();
  }

  _drawReadyKrathong(ctx, now) {
    const pulse = 1 + Math.sin(now * 0.006) * 0.04;
    const isPulling = this.isDragging && this.dragCurrent && (this.dragCurrent.y - this.dragStart.y > 6);
    const pullOffsetY = isPulling ? clamp((this.dragCurrent.y - this.dragStart.y) * 0.15, 0, 18) : 0;
    const pullOffsetX = isPulling ? clamp((this.dragCurrent.x - this.dragStart.x) * 0.12, -14, 14) : 0;
    const x = this.ballStartX + pullOffsetX;
    const y = this.ballStartY + pullOffsetY;

    // Slingshot elastic tension line while dragging downwards
    if (isPulling) {
      ctx.save();
      ctx.strokeStyle = this.aimIsLocked ? 'rgba(254, 240, 138, 0.85)' : 'rgba(56, 189, 248, 0.7)';
      ctx.lineWidth = 2.4;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(this.ballStartX - 34 * this.scale, this.ballStartY + 2);
      ctx.lineTo(x, y + 6);
      ctx.lineTo(this.ballStartX + 34 * this.scale, this.ballStartY + 2);
      ctx.stroke();
      ctx.restore();
    }

    // Mystical golden basketball launch ring
    ctx.save();
    ctx.strokeStyle = this.aimIsLocked ? 'rgba(254, 240, 138, 0.85)' : 'rgba(103, 232, 249, 0.65)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(this.ballStartX, this.ballStartY - 6, 56 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    drawKrathong(ctx, x, y, 0.96 * this.scale, this.krathong, now, {
      showReflection: false,
      showRipples: false,
      isHighlighted: true,
      label: this.isDragging ? (this.aimIsLocked ? '✦ ตรงห่วงแล้ว! ปล่อยเพื่อชูต' : '🎯 ลากลงเพื่อเล็ง') : '🏀 กระทงพร้อมชูต!',
      phase: 0,
    });
  }

  _drawFlyingKrathong(ctx, now) {
    const b = this.ball;

    // Luminous comet ribbon trail
    if (b.trail.length > 2) {
      ctx.save();
      for (let i = 1; i < b.trail.length; i++) {
        const frac = i / b.trail.length;
        ctx.strokeStyle = `rgba(254, 224, 130, ${frac * 0.65})`;
        ctx.lineWidth = frac * 14 * this.scale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(b.trail[i - 1].x, b.trail[i - 1].y);
        ctx.lineTo(b.trail[i].x, b.trail[i].y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Draw spinning airborne krathong (subtle playful tilt so flame stays iconic!)
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.sin(b.rot) * 0.28);
    drawKrathong(ctx, 0, 0, 0.78 * this.scale, this.krathong, now, {
      showReflection: false,
      showRipples: false,
      phase: 0,
    });
    ctx.restore();
  }

  _drawSpeechBubble(ctx, x, y, text) {
    ctx.save();
    ctx.font = '600 13.5px Prompt, sans-serif';
    const padX = 16;
    const tw = ctx.measureText(text).width;
    const bw = tw + padX * 2;
    const bh = 34;
    const bx = clamp(x - bw / 2, 16, this.engine.width - bw - 16);
    const by = Math.max(76, y);

    ctx.fillStyle = 'rgba(11, 18, 38, 0.9)';
    ctx.strokeStyle = 'rgba(103, 232, 249, 0.68)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 17);
    ctx.fill();
    ctx.stroke();

    // Pointer triangle
    ctx.fillStyle = 'rgba(11, 18, 38, 0.9)';
    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.44, by + bh);
    ctx.lineTo(bx + bw * 0.5, by + bh + 9);
    ctx.lineTo(bx + bw * 0.56, by + bh);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#e0f2fe';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + bw / 2, by + bh / 2 + 0.5);
    ctx.restore();
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
