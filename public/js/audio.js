/**
 * Soundscape & Audio System (Disabled per user request)
 * No Web Audio API context, no background music, no ambient water noise, no sound effects.
 * Safe dummy interface preserving all method names to ensure zero runtime errors.
 */
export class SoundscapeEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.enabled = false;
  }

  _ensureContext() {
    return false;
  }

  toggle() {
    return false;
  }

  start() {
    this.enabled = false;
  }

  stop() {
    this.enabled = false;
  }

  playFloatSplash() {}
  playLanternWhoosh() {}
  playFireworkPop() {}
  playBlessChime() {}
  playCrocChomp() {}
  playKaijuRoar() {}
  playShootWhoosh() {}
  playRimClank() {}
  playSwishFanfare() {}
  playFireIgnition() {}
  playFireSiren() {}
  playWaterSpray() {}
  playCannonLaunch() {}
  playUfoReveal() {}
  playUfoWarp() {}
  playNagaAwaken() {}
  playSiemSiRattle() {}
}
