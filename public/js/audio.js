/**
 * Procedural Contemporary Thai Soundscape & Interactive SFX Engine
 * Pure Web Audio API — zero external MP3 dependencies, always crisp & serene.
 * Includes:
 *  - Soft rippling river ambiance (lowpass-filtered pink noise with slow LFO)
 *  - Peaceful Thai pentatonic Khim/Ranat-inspired chime melody
 *  - Interactive SFX for floating krathong, sky lantern, fireworks, and blessings
 */
export class SoundscapeEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.enabled = false;
    this.waterSource = null;
    this.melodyTimer = null;
    this.noteIndex = 0;

    // Gentle Thai pentatonic scale (C major pentatonic / บันไดเสียง ๕ เสียง)
    this.scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99];
    // Poetic unhurried phrase motif
    this.motif = [5, 4, 3, 4, 5, 7, 5, 3, 2, 3, 5, 4, 2, 0, 2, 3];
  }

  _ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.0001;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return true;
  }

  toggle() {
    if (this.enabled) {
      this.stop();
      return false;
    }
    this.start();
    return true;
  }

  start() {
    if (!this._ensureContext()) return;
    this.enabled = true;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
    this.masterGain.gain.exponentialRampToValueAtTime(0.45, now + 0.8);

    this._startRiverAmbiance();
    this._scheduleMelody();
  }

  stop() {
    this.enabled = false;
    if (this.melodyTimer) {
      clearTimeout(this.melodyTimer);
      this.melodyTimer = null;
    }
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    }
    setTimeout(() => {
      if (!this.enabled && this.waterSource) {
        try {
          this.waterSource.stop();
        } catch {
          // ignore
        }
        this.waterSource = null;
      }
    }, 520);
  }

  _startRiverAmbiance() {
    if (this.waterSource || !this.ctx) return;

    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 4;
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    // Pink noise approximation for soft flowing river water
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.032;
      b6 = white * 0.115926;
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 460;
    filter.Q.value = 0.7;

    // Gentle wave modulation
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 0.16;
    lfoGain.gain.value = 130;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    const waterGain = this.ctx.createGain();
    waterGain.gain.value = 0.35;

    src.connect(filter);
    filter.connect(waterGain);
    waterGain.connect(this.masterGain);
    src.start();
    this.waterSource = src;
  }

  _scheduleMelody() {
    if (!this.enabled) return;
    const freq = this.scale[this.motif[this.noteIndex % this.motif.length]];
    this.noteIndex++;

    this._playKhimPluck(freq, 0.14);

    // Subtle fifth harmony every 4th note
    if (this.noteIndex % 4 === 0) {
      setTimeout(() => {
        if (this.enabled) this._playKhimPluck(freq * 0.5, 0.09);
      }, 160);
    }

    const nextDelay = 1150 + Math.random() * 1100;
    this.melodyTimer = setTimeout(() => this._scheduleMelody(), nextDelay);
  }

  _playKhimPluck(freq, volume = 0.14) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';
    osc1.frequency.setValueAtTime(freq, now);
    osc2.frequency.setValueAtTime(freq * 2, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);

    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.value = 0.25;

    osc1.connect(gain);
    osc2.connect(osc2Gain);
    osc2Gain.connect(gain);
    gain.connect(this.masterGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 2.5);
    osc2.stop(now + 2.5);
  }

  playFloatSplash() {
    if (!this.enabled || !this._ensureContext()) return;
    const now = this.ctx.currentTime;
    // Serene 3-note ascending golden blessing chord
    [392.0, 523.25, 659.25].forEach((freq, i) => {
      setTimeout(() => this._playKhimPluck(freq, 0.18), i * 130);
    });

    // Soft water drop tone
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(160, now + 0.24);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  playLanternWhoosh() {
    if (!this.enabled || !this._ensureContext()) return;
    this._playKhimPluck(587.33, 0.12);
    setTimeout(() => this._playKhimPluck(783.99, 0.1), 110);
  }

  playFireworkPop() {
    if (!this.enabled || !this._ensureContext()) return;
    const now = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * 0.42);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.28));
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 340;
    filter.Q.value = 0.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
  }

  playBlessChime() {
    if (!this.enabled || !this._ensureContext()) return;
    this._playKhimPluck(659.25, 0.15);
    setTimeout(() => this._playKhimPluck(880.0, 0.11), 95);
  }

  /**
   * Synthesized Kaiju Godzilla Emergence Rumble + Iconic Roar Sweep!
   */
  playKaijuRoar() {
    if (!this.enabled || !this._ensureContext()) return;
    const now = this.ctx.currentTime;

    // 1. Sub-bass river emergence rumble
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sawtooth';
    sub.frequency.setValueAtTime(62, now);
    sub.frequency.exponentialRampToValueAtTime(34, now + 1.15);
    const subFilter = this.ctx.createBiquadFilter();
    subFilter.type = 'lowpass';
    subFilter.frequency.value = 150;
    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.linearRampToValueAtTime(0.32, now + 0.14);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);
    sub.connect(subFilter);
    subFilter.connect(subGain);
    subGain.connect(this.masterGain);
    sub.start(now);
    sub.stop(now + 1.3);

    // 2. Classic metallic screech-to-growl Kaiju roar sweep
    const roar = this.ctx.createOscillator();
    const roarMod = this.ctx.createOscillator();
    const modGain = this.ctx.createGain();
    const roarFilter = this.ctx.createBiquadFilter();
    const roarGain = this.ctx.createGain();

    roar.type = 'sawtooth';
    roar.frequency.setValueAtTime(520, now + 0.08);
    roar.frequency.exponentialRampToValueAtTime(240, now + 0.55);
    roar.frequency.exponentialRampToValueAtTime(92, now + 1.2);

    roarMod.frequency.value = 46;
    modGain.gain.value = 48;
    roarMod.connect(modGain);
    modGain.connect(roar.frequency);

    roarFilter.type = 'bandpass';
    roarFilter.frequency.setValueAtTime(950, now + 0.08);
    roarFilter.frequency.exponentialRampToValueAtTime(320, now + 1.15);
    roarFilter.Q.value = 3.2;

    roarGain.gain.setValueAtTime(0.001, now + 0.08);
    roarGain.gain.linearRampToValueAtTime(0.24, now + 0.22);
    roarGain.gain.exponentialRampToValueAtTime(0.001, now + 1.22);

    roar.connect(roarFilter);
    roarFilter.connect(roarGain);
    roarGain.connect(this.masterGain);

    roarMod.start(now + 0.08);
    roar.start(now + 0.08);
    roarMod.stop(now + 1.25);
    roar.stop(now + 1.25);
  }

  playShootWhoosh() {
    if (!this.enabled || !this._ensureContext()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.22);
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.27);
  }

  playRimClank() {
    if (!this.enabled || !this._ensureContext()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(310, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.14);
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  playSwishFanfare() {
    if (!this.enabled || !this._ensureContext()) return;
    // Crisp net swish + heroic Thai pentatonic victory fanfare + fireworks!
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      setTimeout(() => this._playKhimPluck(freq, 0.2), i * 85);
    });
    this.playKaijuRoar();
    setTimeout(() => this.playFireworkPop(), 220);
    setTimeout(() => this.playFireworkPop(), 480);
  }

  playFireIgnition() {
    if (!this.enabled || !this._ensureContext()) return;
    const now = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * 0.45);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      ch[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.35));
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.3, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    src.start(now);
  }

  /**
   * Friendly two-tone Wee-Woo emergency siren for the heroic firetruck!
   */
  playFireSiren() {
    if (!this.enabled || !this._ensureContext()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.34);
    osc.frequency.linearRampToValueAtTime(620, now + 0.72);
    osc.frequency.linearRampToValueAtTime(880, now + 1.08);
    osc.frequency.linearRampToValueAtTime(600, now + 1.42);

    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.11, now + 0.08);
    g.gain.setValueAtTime(0.1, now + 1.25);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.46);

    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.5);
  }

  playWaterSpray() {
    if (!this.enabled || !this._ensureContext()) return;
    const now = this.ctx.currentTime;
    const len = Math.floor(this.ctx.sampleRate * 0.9);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      ch[i] = (Math.random() * 2 - 1) * 0.5;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 1.1;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.14, now + 0.12);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.masterGain);
    src.start(now);
  }

  playCannonLaunch() {
    if (!this.enabled || !this._ensureContext()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.16);
    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.22);

    // Rising rocket whistle
    const wh = this.ctx.createOscillator();
    const wg = this.ctx.createGain();
    wh.type = 'sine';
    wh.frequency.setValueAtTime(420, now + 0.04);
    wh.frequency.exponentialRampToValueAtTime(1250, now + 0.45);
    wg.gain.setValueAtTime(0.001, now + 0.04);
    wg.gain.linearRampToValueAtTime(0.08, now + 0.12);
    wg.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    wh.connect(wg);
    wg.connect(this.masterGain);
    wh.start(now + 0.04);
    wh.stop(now + 0.5);
  }

  playUfoReveal() {
    if (!this.enabled || !this._ensureContext()) return;
    const now = this.ctx.currentTime;
    this.playFireworkPop();

    // Playful sci-fi wobbly theremin UFO tone!
    const osc = this.ctx.createOscillator();
    const lfo = this.ctx.createOscillator();
    const lfoG = this.ctx.createGain();
    const g = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.linearRampToValueAtTime(780, now + 0.4);
    osc.frequency.linearRampToValueAtTime(460, now + 0.95);

    lfo.frequency.value = 14;
    lfoG.gain.value = 38;
    lfo.connect(lfoG);
    lfoG.connect(osc.frequency);

    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.16, now + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.0);

    osc.connect(g);
    g.connect(this.masterGain);
    lfo.start(now);
    osc.start(now);
    lfo.stop(now + 1.05);
    osc.stop(now + 1.05);
  }

  playUfoWarp() {
    if (!this.enabled || !this._ensureContext()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(2400, now + 0.42);
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2600;
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.connect(f);
    f.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.48);
  }

  playNagaAwaken() {
    if (!this.enabled || !this._ensureContext()) return;
    const now = this.ctx.currentTime;
    // Deep majestic temple gong
    const gong = this.ctx.createOscillator();
    const gg = this.ctx.createGain();
    gong.type = 'triangle';
    gong.frequency.setValueAtTime(110, now);
    gong.frequency.exponentialRampToValueAtTime(82, now + 2.2);
    gg.gain.setValueAtTime(0.001, now);
    gg.gain.linearRampToValueAtTime(0.3, now + 0.06);
    gg.gain.exponentialRampToValueAtTime(0.001, now + 2.4);
    gong.connect(gg);
    gg.connect(this.masterGain);
    gong.start(now);
    gong.stop(now + 2.5);

    // Shimmering ascending celestial Thai pentatonic arpeggio!
    [261.63, 329.63, 392.0, 523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      setTimeout(() => this._playKhimPluck(freq, 0.17), idx * 95);
    });
  }

  /**
   * Bamboo Siem-Si Fortune Cup Rattle + Mystical Reveal Chime!
   */
  playSiemSiRattle() {
    if (!this.enabled || !this._ensureContext()) return;
    // Rapid wooden bamboo click clicks over ~1.1s
    for (let i = 0; i < 9; i++) {
      setTimeout(() => {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(680 + Math.random() * 420, now);
        osc.frequency.exponentialRampToValueAtTime(240, now + 0.045);
        g.gain.setValueAtTime(0.14, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.06);
      }, i * 115 + Math.random() * 25);
    }
    // Warm golden reveal chime when stick lands!
    setTimeout(() => {
      this._playKhimPluck(523.25, 0.18);
      setTimeout(() => this._playKhimPluck(783.99, 0.16), 120);
    }, 1180);
  }
}
