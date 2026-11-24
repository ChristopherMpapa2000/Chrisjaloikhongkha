/**
 * Interactive Sky Lantern Toss + Background Fire + Heroic Firetruck Rescue Engine
 * Lifecycle:
 *   1. User enters throw mode -> glowing Yi Peng lantern hovers in foreground
 *   2. User drags/swipes upward or clicks "โยนโคมขึ้นฟ้า!" -> lantern soars into night sky
 *   3. Near peak, flame sputters -> lantern slowly drifts back down toward the horizon embankment
 *   4. Touchdown triggers a dramatic background shoreline fire (with water reflections & smoke)
 *   5. Heroic 2D red firetruck races across the horizon embankment with flashing red/blue sirens,
 *      stops beside the blaze, sprays a pressurized parabolic water jet until extinguished with
 *      billowing steam, celebrates, and drives off!
 */
export class LanternRescueController {
  constructor(engine, callbacks = {}) {
    this.engine = engine;
    this.callbacks = callbacks;

    // Interactive foreground throw mode
    this.throwMode = false;
    this.isDragging = false;
    this.dragOrigin = { x: 0, y: 0 };
    this.dragCurrent = { x: 0, y: 0 };
    this.lanternAnchor = { x: 0, y: 0 };
    this.holdTime = 0;

    // Active thrown lanterns (soaring -> sputtering -> descending)
    this.activeLanterns = [];
    // Active shoreline fires on the background horizon
    this.fires = [];
    // Particles
    this.smokeParticles = [];
    this.emberParticles = [];
    this.waterDrops = [];
    this.steamParticles = [];

    // Heroic firetruck entity on the horizon road
    this.truck = {
      state: 'idle', // idle | arriving | extinguishing | celebrating | departing
      x: -140,
      dir: 1, // 1 = driving right, -1 = driving left
      targetFireId: null,
      speed: 240,
      wheelAngle: 0,
      sirenPhase: 0,
      stateTimer: 0,
      bubbleText: '',
      bubbleTimer: 0,
    };

    this.nextFireId = 1;
    this.sirenBeepCooldown = 0;
    this.spraySfxCooldown = 0;
  }

  openThrowMode(hooks = {}) {
    this.callbacks = hooks;
    this.throwMode = true;
    this.isDragging = false;
    this.holdTime = 0;
    this._updateAnchor();
    if (this.callbacks.onThrowModeChange) {
      this.callbacks.onThrowModeChange(true);
    }
  }

  closeThrowMode() {
    if (!this.throwMode) return;
    this.throwMode = false;
    this.isDragging = false;
    if (this.callbacks.onThrowModeChange) {
      this.callbacks.onThrowModeChange(false);
    }
  }

  resetForLocationChange() {
    this.closeThrowMode();
    this.activeLanterns = [];
    this.fires = [];
    this.smokeParticles = [];
    this.emberParticles = [];
    this.waterDrops = [];
    this.steamParticles = [];
    this.truck.state = 'idle';
    this.truck.x = -140;
    this.truck.targetFireId = null;
    this.truck.bubbleTimer = 0;
  }

  throwFromButton() {
    if (!this.throwMode) return;
    const vx = (Math.random() - 0.5) * 110;
    const vy = -540 - Math.random() * 60;
    this._launchInteractiveLantern(this.lanternAnchor.x, this.lanternAnchor.y, vx, vy);
  }

  handlePointerDown(px, py) {
    if (!this.throwMode) return false;
    this._updateAnchor();
    this.isDragging = true;
    this.dragOrigin = { x: px, y: py };
    this.dragCurrent = { x: px, y: py };
    return true;
  }

  handlePointerMove(px, py) {
    if (!this.throwMode) return false;
    if (this.isDragging) {
      this.dragCurrent = { x: px, y: py };
    }
    return true;
  }

  handlePointerUp(px, py) {
    if (!this.throwMode || !this.isDragging) return false;
    this.isDragging = false;
    const dx = px - this.dragOrigin.x;
    const dy = py - this.dragOrigin.y;

    // Support both intuitive swipe-up AND slingshot drag-down AND simple click on lantern!
    let vx;
    let vy;
    if (dy < -25) {
      // Swiped upward
      vx = clamp(dx * 1.4, -220, 220);
      vy = clamp(dy * 3.0, -640, -480);
    } else if (dy > 28) {
      // Slingshot pulled downward
      vx = clamp(-dx * 1.4, -220, 220);
      vy = clamp(-dy * 3.0, -640, -480);
    } else {
      // Quick tap/click tosses cleanly high into the night sky
      vx = clamp((px - this.lanternAnchor.x) * 0.6, -150, 150);
      vy = -550;
    }

    this._launchInteractiveLantern(this.lanternAnchor.x, this.lanternAnchor.y, vx, vy);
    return true;
  }

  _launchInteractiveLantern(x, y, vx, vy) {
    const w = this.engine.width;
    const h = this.engine.height;
    const horizonY = h * 0.44;

    // Choose a dramatic, clearly visible landing spot along the background shoreline
    const targetLandX = clamp(
      x + vx * 1.45 + (Math.random() - 0.5) * 160,
      w * 0.16,
      w * 0.84
    );

    this.activeLanterns.push({
      x,
      y,
      vx,
      vy,
      targetLandX,
      targetLandY: horizonY - 2,
      scale: 1.0,
      phase: 'rising', // rising | sputtering | descending
      age: 0,
      riseDuration: 1.9 + Math.random() * 0.55,
      sputterDuration: 0.9,
      wobblePhase: Math.random() * Math.PI * 2,
      tilt: 0,
      flameHealth: 1,
      bubble: '',
    });

    this.closeThrowMode();

    if (this.callbacks.onThrown) {
      this.callbacks.onThrown(x / Math.max(1, w));
    }
  }

  _updateAnchor() {
    this.lanternAnchor.x = this.engine.width * 0.5;
    this.lanternAnchor.y = this.engine.height - (this.engine.width < 640 ? 186 : 176);
  }

  update(dt, now) {
    const w = this.engine.width;
    const h = this.engine.height;
    const horizonY = h * 0.44;

    if (this.throwMode) {
      this._updateAnchor();
      this.holdTime += dt;
    }

    if (this.sirenBeepCooldown > 0) this.sirenBeepCooldown -= dt;
    if (this.spraySfxCooldown > 0) this.spraySfxCooldown -= dt;

    // --- 1. Update Active Thrown Lanterns ---
    for (let i = this.activeLanterns.length - 1; i >= 0; i--) {
      const L = this.activeLanterns[i];
      L.age += dt;

      if (L.phase === 'rising') {
        L.x += (L.vx + Math.sin(now * 0.003 + L.wobblePhase) * 28) * dt;
        L.y += L.vy * dt;
        L.vx *= Math.pow(0.55, dt);
        L.vy *= Math.pow(0.62, dt); // Smooth upward lift high into the starry night sky
        L.vy = Math.min(L.vy, -175); // Always soar well above the skyline before peaking!
        L.scale = Math.max(0.42, L.scale - dt * 0.24);
        L.tilt = Math.sin(now * 0.004 + L.wobblePhase) * 0.1;

        // Soft glowing embers trailing upward
        if (Math.random() < 0.35) {
          this.emberParticles.push({
            x: L.x + (Math.random() - 0.5) * 10,
            y: L.y + 12 * L.scale,
            vx: (Math.random() - 0.5) * 18,
            vy: 15 + Math.random() * 25,
            size: 1.5 + Math.random() * 1.8,
            color: '#fde68a',
            life: 0.65,
            age: 0,
          });
        }

        // Only begin sputtering once the lantern has soared high into the night sky (above skyline!)
        const skyPeakY = Math.min(horizonY - 120, h * 0.17);
        if (L.y <= skyPeakY || (L.age >= 2.6 && L.y < horizonY - 60)) {
          L.phase = 'sputtering';
          L.age = 0;
          L.bubble = 'อ๊ะ... ไฟโคมจะดับ!';
        }
      } else if (L.phase === 'sputtering') {
        L.x += Math.sin(now * 0.008 + L.wobblePhase) * 24 * dt;
        L.y += Math.sin(now * 0.006) * 10 * dt;
        L.tilt = Math.sin(now * 0.015 + L.wobblePhase) * 0.28;
        L.flameHealth = 0.45 + Math.sin(now * 0.04) * 0.35;

        if (Math.random() < 0.45) {
          this._spawnSmoke(L.x, L.y - 12 * L.scale, 1, 0.55);
        }

        if (L.age >= L.sputterDuration) {
          L.phase = 'descending';
          L.age = 0;
          L.bubble = 'โคมลอยตกลงฝั่งแล้ว!!';
          L.vy = 32;
        }
      } else if (L.phase === 'descending') {
        // Slowly drift & tumble down from the starry night sky onto the background shoreline!
        const dx = L.targetLandX - L.x;
        L.x += clamp(dx * 0.85, -88, 88) * dt + Math.sin(now * 0.0045 + L.wobblePhase) * 26 * dt;
        L.vy = Math.min(115, L.vy + 24 * dt);
        L.y += L.vy * dt;
        L.tilt = 0.25 + Math.sin(now * 0.009 + L.wobblePhase) * 0.32;
        L.flameHealth = 0.35 + Math.abs(Math.sin(now * 0.032)) * 0.45;
        L.scale = clamp(L.scale - dt * 0.025, 0.34, 0.5);

        if (Math.random() < 0.55) {
          this._spawnSmoke(L.x, L.y - 8 * L.scale, 1, 0.7);
        }

        if (L.y >= horizonY - 4) {
          // TOUCHDOWN! Ignite fire on the background shoreline!
          this._igniteShorelineFire(clamp(L.x, w * 0.14, w * 0.86), horizonY);
          this.activeLanterns.splice(i, 1);
        }
      }
    }

    // --- 2. Update Shoreline Fires ---
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const f = this.fires[i];
      f.age += dt;
      if (!f.extinguishing) {
        f.intensity = Math.min(1, f.intensity + dt * 1.4);
      }

      // Emit fire smoke & rising sparks proportionally to fire intensity
      if (f.intensity > 0.12) {
        if (Math.random() < 0.45 * f.intensity) {
          this._spawnSmoke(f.x + (Math.random() - 0.5) * 32 * f.intensity, horizonY - 22 * f.intensity, 1, 0.85);
        }
        if (Math.random() < 0.5 * f.intensity) {
          this.emberParticles.push({
            x: f.x + (Math.random() - 0.5) * 36 * f.intensity,
            y: horizonY - 8 - Math.random() * 24 * f.intensity,
            vx: (Math.random() - 0.5) * 34,
            vy: -45 - Math.random() * 65,
            size: 1.5 + Math.random() * 2.2,
            color: Math.random() < 0.5 ? '#fde047' : '#fb923c',
            life: 0.7 + Math.random() * 0.55,
            age: 0,
          });
        }
      }

      if (f.intensity <= 0.02) {
        this.fires.splice(i, 1);
      }
    }

    // --- 3. Update Heroic Firetruck State Machine ---
    this._updateFiretruck(dt, w, horizonY);

    // --- 4. Update Particles ---
    this._updateParticleArray(this.smokeParticles, dt, -14);
    this._updateParticleArray(this.steamParticles, dt, -26);
    this._updateParticleArray(this.emberParticles, dt, 18);
    this._updateParticleArray(this.waterDrops, dt, 340);
  }

  _igniteShorelineFire(x, horizonY) {
    // Merge into an existing nearby fire if very close, otherwise create a new fire spot
    const nearby = this.fires.find((f) => Math.abs(f.x - x) < 55);
    if (nearby) {
      nearby.intensity = 1;
      nearby.extinguishing = false;
    } else {
      this.fires.push({
        id: this.nextFireId++,
        x,
        y: horizonY,
        intensity: 0.25,
        age: 0,
        extinguishing: false,
      });
    }

    // Burst of sparks on impact
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI * Math.random();
      const sp = 50 + Math.random() * 110;
      this.emberParticles.push({
        x,
        y: horizonY - 4,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        size: 2 + Math.random() * 2.2,
        color: i % 2 === 0 ? '#fef08a' : '#f97316',
        life: 0.7 + Math.random() * 0.4,
        age: 0,
      });
    }

    if (this.callbacks.onFireStarted) {
      this.callbacks.onFireStarted();
    }

    // Summon the heroic firetruck immediately if idle or departing!
    if (this.truck.state === 'idle' || this.truck.state === 'departing') {
      this._dispatchFiretruck(x);
    }
  }

  _dispatchFiretruck(targetX) {
    const w = this.engine.width;
    // Enter from the closer edge (or opposite side for a dramatic entrance run!)
    if (this.truck.state === 'idle') {
      const enterFromLeft = targetX >= w * 0.42;
      this.truck.x = enterFromLeft ? -115 : w + 115;
      this.truck.dir = enterFromLeft ? 1 : -1;
    }
    this.truck.state = 'arriving';
    this.truck.stateTimer = 0;
    this.truck.bubbleText = 'หวอ~ หวอ~ รถดับเพลิงมาแล้ว!';
    this.truck.bubbleTimer = 2.6;

    if (this.callbacks.onSiren) {
      this.callbacks.onSiren();
      this.sirenBeepCooldown = 1.65;
    }
  }

  _updateFiretruck(dt, w, horizonY) {
    const T = this.truck;
    if (T.state === 'idle') return;

    T.sirenPhase += dt * 10;
    T.stateTimer += dt;
    if (T.bubbleTimer > 0) T.bubbleTimer = Math.max(0, T.bubbleTimer - dt);

    // Find nearest active fire
    const targetFire = this._findNearestFire(T.x);

    if (T.state === 'arriving') {
      if (!targetFire) {
        T.state = 'departing';
        T.stateTimer = 0;
        return;
      }

      // Stop a heroic ~96px beside the fire facing toward it!
      const stopOffset = T.x <= targetFire.x ? -96 : 96;
      const stopX = clamp(targetFire.x + stopOffset, 82, w - 82);
      const dx = stopX - T.x;
      T.dir = dx >= 0 ? 1 : -1;

      const step = Math.min(Math.abs(dx), T.speed * dt);
      T.x += Math.sign(dx) * step;
      T.wheelAngle += step * 0.14 * T.dir;

      if (this.sirenBeepCooldown <= 0 && this.callbacks.onSiren) {
        this.callbacks.onSiren();
        this.sirenBeepCooldown = 1.7;
      }

      if (Math.abs(dx) < 6) {
        // Face the fire & activate water cannon!
        T.dir = targetFire.x >= T.x ? 1 : -1;
        T.targetFireId = targetFire.id;
        T.state = 'extinguishing';
        T.stateTimer = 0;
        T.bubbleText = 'ฉีดน้ำดับไฟเดี๋ยวนี้!! 💦';
        T.bubbleTimer = 2.4;
        if (this.callbacks.onWaterSpray) {
          this.callbacks.onWaterSpray();
          this.spraySfxCooldown = 1.1;
        }
      }
    } else if (T.state === 'extinguishing') {
      const fire = this.fires.find((f) => f.id === T.targetFireId) || targetFire;
      if (!fire) {
        // All fires put out! Celebrate!
        T.state = 'celebrating';
        T.stateTimer = 0;
        T.bubbleText = 'ดับไฟเรียบร้อย! ปลอดภัยแล้วครับ 🚒✨';
        T.bubbleTimer = 2.6;
        if (this.callbacks.onFireExtinguished) {
          this.callbacks.onFireExtinguished();
        }
        return;
      }

      fire.extinguishing = true;
      T.dir = fire.x >= T.x ? 1 : -1;

      // Spray high-pressure parabolic water stream onto the fire!
      const nozzleX = T.x + T.dir * 26;
      const nozzleY = horizonY - 36;
      for (let i = 0; i < 4; i++) {
        const flightT = 0.42;
        const jitterX = (Math.random() - 0.5) * 20;
        const jitterY = (Math.random() - 0.5) * 14;
        const vx = (fire.x + jitterX - nozzleX) / flightT;
        const vy = (horizonY - 12 + jitterY - nozzleY - 0.5 * 340 * flightT * flightT) / flightT;
        this.waterDrops.push({
          x: nozzleX,
          y: nozzleY,
          vx,
          vy,
          r: 2.3 + Math.random() * 2.4,
          color: Math.random() < 0.45 ? '#e0f2fe' : '#38bdf8',
          life: flightT + 0.08,
          age: 0,
        });
      }

      if (this.spraySfxCooldown <= 0 && this.callbacks.onWaterSpray) {
        this.callbacks.onWaterSpray();
        this.spraySfxCooldown = 1.15;
      }

      // Reduce fire steadily and billow dramatic white steam clouds!
      fire.intensity = Math.max(0, fire.intensity - dt * 0.42);
      if (Math.random() < 0.72) {
        this.steamParticles.push({
          x: fire.x + (Math.random() - 0.5) * 34,
          y: horizonY - 12 - Math.random() * 16,
          vx: (Math.random() - 0.5) * 28,
          vy: -34 - Math.random() * 34,
          r: 7 + Math.random() * 9,
          color: 'rgba(232, 246, 255, 0.58)',
          life: 1.0 + Math.random() * 0.5,
          age: 0,
        });
      }

      // If this fire is out but another fire popped up nearby, race over to it!
      if (fire.intensity <= 0.03) {
        const nextFire = this.fires.find((f) => f.id !== fire.id && f.intensity > 0.05);
        if (nextFire) {
          T.targetFireId = nextFire.id;
          T.state = 'arriving';
          T.stateTimer = 0;
          T.bubbleText = 'มีไฟอีกจุด! ลุยต่อ!! 🚨';
          T.bubbleTimer = 1.8;
        }
      }
    } else if (T.state === 'celebrating') {
      if (targetFire) {
        T.state = 'arriving';
        T.stateTimer = 0;
        return;
      }
      if (T.stateTimer >= 1.9) {
        T.state = 'departing';
        T.stateTimer = 0;
        // Drive out toward whichever screen edge it's facing
        T.dir = T.x > w * 0.5 ? 1 : -1;
      }
    } else if (T.state === 'departing') {
      if (targetFire) {
        T.state = 'arriving';
        T.stateTimer = 0;
        return;
      }
      const step = T.speed * 1.08 * dt;
      T.x += T.dir * step;
      T.wheelAngle += step * 0.14 * T.dir;
      if (T.x < -150 || T.x > w + 150) {
        T.state = 'idle';
      }
    }
  }

  _findNearestFire(x) {
    let best = null;
    let bestDist = Infinity;
    for (const f of this.fires) {
      if (f.intensity <= 0.02) continue;
      const d = Math.abs(f.x - x);
      if (d < bestDist) {
        bestDist = d;
        best = f;
      }
    }
    return best;
  }

  _spawnSmoke(x, y, count = 1, alpha = 0.5) {
    for (let i = 0; i < count; i++) {
      this.smokeParticles.push({
        x: x + (Math.random() - 0.5) * 10,
        y,
        vx: (Math.random() - 0.5) * 18,
        vy: -24 - Math.random() * 24,
        r: 6 + Math.random() * 8,
        color: `rgba(148, 163, 184, ${alpha})`,
        life: 1.2 + Math.random() * 0.7,
        age: 0,
      });
    }
  }

  _updateParticleArray(arr, dt, gravityY) {
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += gravityY * dt;
      if (p.age >= p.life) arr.splice(i, 1);
    }
  }

  /* ========================================================================
     RENDERING
     ======================================================================== */

  /**
   * Renders shoreline fires, fire/siren water reflections, rising smoke/steam,
   * water spray jets, and the heroic red firetruck right along the background embankment!
   */
  renderHorizonEvents(ctx, now) {
    const horizonY = this.engine.height * 0.44;
    const scale = clamp(this.engine.width / 1280, 0.68, 1.12);

    // 1. Orange-red fire reflections shimmering on the river water below horizon
    for (const f of this.fires) {
      this._drawFireWaterReflection(ctx, f.x, horizonY, f.intensity, now);
    }

    // 2. Firetruck flashing red/blue siren reflection on river water
    if (this.truck.state !== 'idle') {
      this._drawSirenWaterReflection(ctx, this.truck.x, horizonY, now);
    }

    // 3. Smoke plumes behind fire
    for (const p of this.smokeParticles) {
      const a = Math.max(0, 1 - p.age / p.life);
      ctx.save();
      ctx.globalAlpha = a * 0.55;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (1 + (1 - a) * 1.4), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 4. Roaring Stylized Shoreline Fires on background embankment
    for (const f of this.fires) {
      this._drawShorelineFire(ctx, f.x, horizonY, f.intensity, scale, now);
    }

    // 5. Heroic Red Firetruck on horizon riverbank!
    if (this.truck.state !== 'idle') {
      this._drawFiretruck(ctx, this.truck.x, horizonY, scale, now);
    }

    // 6. High-pressure water jet droplets
    for (const p of this.waterDrops) {
      const a = Math.max(0, 1 - p.age / p.life);
      ctx.save();
      ctx.globalAlpha = a * 0.92;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 7. Billowing white steam clouds where water hits fire
    for (const p of this.steamParticles) {
      const a = Math.max(0, 1 - p.age / p.life);
      ctx.save();
      ctx.globalAlpha = a * 0.72;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (1 + (1 - a) * 1.1), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 8. Flying fire embers
    for (const p of this.emberParticles) {
      const a = Math.max(0, 1 - p.age / p.life);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 9. Active thrown lanterns soaring / descending across the sky
    for (const L of this.activeLanterns) {
      this._drawDetailedLantern(ctx, L.x, L.y, 44 * L.scale, now, L.tilt, L.flameHealth);
      if (L.bubble) {
        this._drawMiniComicTag(ctx, L.x, L.y - 46 * L.scale - 14, L.bubble, '#fef08a', 'rgba(251, 146, 60, 0.7)');
      }
    }
  }

  /**
   * Renders the large interactive throwable sky lantern in the foreground when Throw Mode is open.
   */
  renderForegroundThrowLantern(ctx, now) {
    if (!this.throwMode) return;

    const bob = Math.sin(now * 0.004) * 7;
    let drawX = this.lanternAnchor.x;
    let drawY = this.lanternAnchor.y + bob;
    let tilt = Math.sin(now * 0.0025) * 0.05;

    if (this.isDragging) {
      const dx = clamp(this.dragCurrent.x - this.dragOrigin.x, -110, 110);
      const dy = clamp(this.dragCurrent.y - this.dragOrigin.y, -90, 90);
      drawX += dx * 0.35;
      drawY += dy * 0.35;
      tilt = clamp(dx * 0.003, -0.3, 0.3);
    }

    // Glowing dashed throw-upward cue arrows above the lantern!
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const pulse = (now * 0.0025 + i * 0.33) % 1;
      const ay = drawY - 78 - pulse * 72;
      const alpha = Math.sin(pulse * Math.PI) * 0.78;
      ctx.strokeStyle = `rgba(254, 240, 138, ${alpha})`;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(drawX - 16, ay + 9);
      ctx.lineTo(drawX, ay);
      ctx.lineTo(drawX + 16, ay + 9);
      ctx.stroke();
    }
    ctx.restore();

    // Soft halo ring around throwable lantern
    ctx.save();
    ctx.strokeStyle = 'rgba(254, 215, 128, 0.48)';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 7]);
    ctx.beginPath();
    ctx.arc(drawX, drawY, 64, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    this._drawDetailedLantern(ctx, drawX, drawY, 68, now, tilt, 1);
  }

  _drawDetailedLantern(ctx, x, y, size, now, tilt = 0, flameHealth = 1) {
    const flick = (0.85 + Math.sin(now * 0.015) * 0.15) * Math.max(0.25, flameHealth);
    const w = size * 0.72;
    const h = size * 1.1;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);

    // Outer warm atmospheric glow
    const glow = ctx.createRadialGradient(0, 0, size * 0.1, 0, 0, size * 2.1 * flick);
    glow.addColorStop(0, `rgba(255, 216, 122, ${0.52 * flameHealth})`);
    glow.addColorStop(0.45, `rgba(245, 146, 52, ${0.2 * flameHealth})`);
    glow.addColorStop(1, 'rgba(245, 146, 52, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, size * 2.1 * flick, 0, Math.PI * 2);
    ctx.fill();

    // Paper lantern body
    const body = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
    body.addColorStop(0, '#a83c12');
    body.addColorStop(0.32, '#ea7b24');
    body.addColorStop(0.75, '#facc55');
    body.addColorStop(1, '#fff8d6');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-w * 0.66, -h * 0.45);
    ctx.quadraticCurveTo(0, -h * 0.62, w * 0.66, -h * 0.45);
    ctx.quadraticCurveTo(w * 0.88, -h * 0.04, w * 0.42, h * 0.48);
    ctx.lineTo(-w * 0.42, h * 0.48);
    ctx.quadraticCurveTo(-w * 0.88, -h * 0.04, -w * 0.66, -h * 0.45);
    ctx.closePath();
    ctx.fill();

    // Subtle paper ribs
    ctx.strokeStyle = 'rgba(130, 44, 12, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-w * 0.22, -h * 0.51);
    ctx.quadraticCurveTo(-w * 0.34, 0, -w * 0.18, h * 0.48);
    ctx.moveTo(w * 0.22, -h * 0.51);
    ctx.quadraticCurveTo(w * 0.34, 0, w * 0.18, h * 0.48);
    ctx.stroke();

    // Bottom bamboo rim & glowing fuel wick
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = Math.max(1.5, size * 0.04);
    ctx.beginPath();
    ctx.ellipse(0, h * 0.48, w * 0.42, h * 0.07, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Inner bright flame
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, h * 0.36, w * 0.14 * flick, h * 0.14 * flick, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _drawShorelineFire(ctx, x, horizonY, intensity, scale, now) {
    if (intensity <= 0.02) return;
    const s = scale * (0.45 + intensity * 0.78);

    ctx.save();
    ctx.translate(x, horizonY);

    // Big warm fiery glow illuminating the night shoreline
    const aura = ctx.createRadialGradient(0, -16 * s, 4, 0, -18 * s, 96 * s);
    aura.addColorStop(0, `rgba(255, 160, 46, ${0.65 * intensity})`);
    aura.addColorStop(0.5, `rgba(239, 68, 68, ${0.24 * intensity})`);
    aura.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, -18 * s, 96 * s, 0, Math.PI * 2);
    ctx.fill();

    // Multi-tongue animated flames (red -> orange -> bright yellow core)
    const tongues = [
      { ox: -18, h: 42, w: 16, spd: 11, ph: 0 },
      { ox: -7, h: 58, w: 20, spd: 13, ph: 1.3 },
      { ox: 6, h: 64, w: 22, spd: 10, ph: 2.5 },
      { ox: 18, h: 45, w: 16, spd: 12, ph: 4.1 },
    ];

    for (const tg of tongues) {
      const sway = Math.sin(now * 0.001 * tg.spd + tg.ph) * 6 * s;
      const fh = (tg.h + Math.cos(now * 0.001 * (tg.spd + 3) + tg.ph) * 9) * s;
      const fw = tg.w * s;
      const ox = tg.ox * s;

      // Outer crimson-orange flame
      const fg = ctx.createLinearGradient(ox, 0, ox, -fh);
      fg.addColorStop(0, '#dc2626');
      fg.addColorStop(0.45, '#f97316');
      fg.addColorStop(1, '#fde047');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.moveTo(ox - fw * 0.6, 2);
      ctx.quadraticCurveTo(ox - fw * 0.85, -fh * 0.45, ox + sway, -fh);
      ctx.quadraticCurveTo(ox + fw * 0.85, -fh * 0.45, ox + fw * 0.6, 2);
      ctx.closePath();
      ctx.fill();

      // Inner bright yellow-white core
      ctx.fillStyle = '#fef9c3';
      ctx.beginPath();
      ctx.moveTo(ox - fw * 0.28, 2);
      ctx.quadraticCurveTo(ox - fw * 0.35, -fh * 0.25, ox + sway * 0.4, -fh * 0.52);
      ctx.quadraticCurveTo(ox + fw * 0.35, -fh * 0.25, ox + fw * 0.28, 2);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  _drawFireWaterReflection(ctx, x, horizonY, intensity, now) {
    if (intensity <= 0.02) return;
    ctx.save();
    for (let i = 0; i < 9; i++) {
      const y = horizonY + 8 + i * 9;
      const wave = Math.sin(now * 0.006 + i * 1.4) * (5 + i);
      const w = (36 - i * 3) * intensity;
      ctx.fillStyle = i % 2 === 0
        ? `rgba(251, 146, 60, ${(0.32 - i * 0.03) * intensity})`
        : `rgba(239, 68, 68, ${(0.24 - i * 0.022) * intensity})`;
      ctx.beginPath();
      ctx.ellipse(x + wave, y, Math.max(4, w), 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawSirenWaterReflection(ctx, x, horizonY, now) {
    const isRed = Math.floor(now / 170) % 2 === 0;
    const color = isRed ? '239, 68, 68' : '56, 189, 248';
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const y = horizonY + 7 + i * 8;
      const wave = Math.sin(now * 0.007 + i) * 6;
      ctx.fillStyle = `rgba(${color}, ${0.28 - i * 0.04})`;
      ctx.beginPath();
      ctx.ellipse(x + wave, y, 28 - i * 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawFiretruck(ctx, x, horizonY, scale, now) {
    const T = this.truck;
    const s = scale * 1.05;
    const bounce = T.state === 'arriving' || T.state === 'departing' ? Math.sin(now * 0.035) * 1.6 : 0;
    const isRedFlash = Math.floor(now / 170) % 2 === 0;

    ctx.save();
    ctx.translate(x, horizonY + bounce);
    ctx.scale(T.dir * s, s); // Flip cleanly so truck always drives nose-first!

    // Headlight beam shining forward along the night embankment
    const beam = ctx.createLinearGradient(44, -14, 138, -4);
    beam.addColorStop(0, 'rgba(254, 249, 195, 0.52)');
    beam.addColorStop(1, 'rgba(254, 249, 195, 0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(44, -15);
    ctx.lineTo(138, -28);
    ctx.lineTo(138, 2);
    ctx.lineTo(44, -8);
    ctx.closePath();
    ctx.fill();

    // Flashing Red & Blue Siren Glow Halo above truck roof!
    const sirenColor = isRedFlash ? 'rgba(239, 68, 68, 0.65)' : 'rgba(56, 189, 248, 0.7)';
    const sirenHalo = ctx.createRadialGradient(22, -37, 2, 22, -37, 46);
    sirenHalo.addColorStop(0, sirenColor);
    sirenHalo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sirenHalo;
    ctx.beginPath();
    ctx.arc(22, -37, 46, 0, Math.PI * 2);
    ctx.fill();

    // Rear main crimson truck body
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.roundRect(-48, -32, 62, 25, [5, 3, 2, 3]);
    ctx.fill();

    // Front cab
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(14, -34, 30, 27, [3, 8, 2, 2]);
    ctx.fill();

    // Iconic white Thai emergency racing stripe
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-47, -18, 90, 4.5);

    // Cab windshield with glowing interior & tiny yellow firefighter helmet!
    ctx.fillStyle = '#bae6fd';
    ctx.beginPath();
    ctx.roundRect(22, -30, 17, 11, [2, 5, 2, 2]);
    ctx.fill();
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(29, -22, 4, Math.PI, 0);
    ctx.fill();

    // Metallic equipment shutter doors on truck side
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-38, -28, 18, 9);
    ctx.fillRect(-14, -28, 18, 9);

    // Silver rooftop extension ladder
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-44, -35);
    ctx.lineTo(10, -35);
    ctx.moveTo(-44, -39);
    ctx.lineTo(10, -39);
    for (let r = -40; r <= 6; r += 8) {
      ctx.moveTo(r, -35);
      ctx.lineTo(r, -39);
    }
    ctx.stroke();

    // Rooftop Water Cannon (tilts up when spraying!)
    ctx.save();
    ctx.translate(16, -35);
    ctx.rotate(T.state === 'extinguishing' ? -0.45 : -0.15);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-3, -4, 16, 5);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(11, -5, 4, 7);
    ctx.restore();

    // Emergency Siren Lightbar
    ctx.fillStyle = isRedFlash ? '#ff4d4d' : '#7f1d1d';
    ctx.fillRect(18, -39, 6, 5);
    ctx.fillStyle = !isRedFlash ? '#38bdf8' : '#0c4a6e';
    ctx.fillRect(24, -39, 6, 5);

    // Front bright headlight
    ctx.fillStyle = '#fef9c3';
    ctx.fillRect(42, -16, 3, 5);

    // Spinning Wheels
    const drawWheel = (wx) => {
      ctx.save();
      ctx.translate(wx, -6);
      ctx.rotate(T.wheelAngle * T.dir);
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(0, 0, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#475569';
      ctx.fillRect(-3, -0.8, 6, 1.6);
      ctx.restore();
    };
    drawWheel(-30);
    drawWheel(26);

    ctx.restore();

    // Unflipped Comic Speech Bubble above the Firetruck!
    if (T.bubbleTimer > 0 && T.bubbleText) {
      this._drawMiniComicTag(
        ctx,
        x,
        horizonY - 56 * s,
        T.bubbleText,
        '#ffffff',
        isRedFlash ? 'rgba(239, 68, 68, 0.85)' : 'rgba(56, 189, 248, 0.85)'
      );
    }
  }

  _drawMiniComicTag(ctx, x, y, text, textColor, borderColor) {
    ctx.save();
    ctx.font = '600 12.5px Prompt, sans-serif';
    const padX = 12;
    const tw = ctx.measureText(text).width;
    const bw = tw + padX * 2;
    const bh = 28;
    const bx = clamp(x - bw / 2, 12, this.engine.width - bw - 12);
    const by = Math.max(66, y - bh);

    ctx.fillStyle = 'rgba(10, 16, 34, 0.9)';
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 14);
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
