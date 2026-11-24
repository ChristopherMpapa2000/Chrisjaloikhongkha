import {
  LOCATIONS,
  LOCATION_ORDER,
  KRATHONG_PARTS,
  CURATED_WISHES,
  REACTIONS,
  findPart,
  formatRelativeThaiTime,
} from './config.js';
import { drawKrathong } from './krathong-renderer.js';
import { RiverSceneEngine } from './scene-engine.js';
import { renderCommemorativeCard } from './ecard.js';
import { SoundscapeEngine } from './audio.js';
import { drawRandomFortune, renderFortuneCardPng, toThaiDigits } from './fortune.js';

const STORAGE_KEY_MY_IDS = 'saeng_khongkha_my_krathongs_v1';
const CLIENT_ID = 'cl_' + Math.random().toString(36).slice(2, 10);

const state = {
  activeLocation: 'wat-arun',
  stats: null,
  myKrathongIds: loadMyKrathongIds(),
  draft: {
    baseType: 'banana-leaf',
    flowerType: 'marigold',
    candleType: 'classic-gold',
    ornamentType: 'coins',
    location: 'wat-arun',
    isCouple: false,
  },
  activePartCategory: 'base',
  studioStep: 1,
  wishCursor: { khongkha: 0, career: 0, love: 0, health: 0 },
  inspectedKrathong: null,
  ecardKrathong: null,
  currentFortune: null,
  drawerTab: 'mine',
  zenMode: false,
};

const sound = new SoundscapeEngine();
let scene = null;
let previewRaf = null;
let inspectorRaf = null;
let snackbarTimer = null;
let searchDebounce = null;
let eventSource = null;

// --- DOM References ---
const els = {
  riverCanvas: document.getElementById('riverCanvas'),
  tooltip: document.getElementById('riverTooltip'),
  tooltipName: document.getElementById('tooltipName'),
  tooltipWish: document.getElementById('tooltipWish'),
  tooltipBlessings: document.getElementById('tooltipBlessings'),

  locationBar: document.getElementById('locationBar'),
  sceneLocationTag: document.getElementById('sceneLocationTag'),
  onlineCountLabel: document.getElementById('onlineCountLabel'),
  sceneTitle: document.getElementById('sceneTitle'),
  sceneHint: document.getElementById('sceneHint'),
  emptyRiverCard: document.getElementById('emptyRiverCard'),
  emptyRiverDesc: document.getElementById('emptyRiverDesc'),
  emptyRiverCtaBtn: document.getElementById('emptyRiverCtaBtn'),

  statTotalKrathongs: document.getElementById('statTotalKrathongs'),
  statWasteKg: document.getElementById('statWasteKg'),
  statsPillBtn: document.getElementById('statsPillBtn'),

  soundToggleBtn: document.getElementById('soundToggleBtn'),
  soundIconOff: document.getElementById('soundIconOff'),
  soundIconOn: document.getElementById('soundIconOn'),
  searchOpenBtn: document.getElementById('searchOpenBtn'),
  zenModeBtn: document.getElementById('zenModeBtn'),
  exitZenBtn: document.getElementById('exitZenBtn'),

  liveFeed: document.getElementById('liveFeed'),
  lanternBtn: document.getElementById('lanternBtn'),
  openStudioBtn: document.getElementById('openStudioBtn'),
  fireworkBtn: document.getElementById('fireworkBtn'),
  fortuneOpenBtn: document.getElementById('fortuneOpenBtn'),
  myKrathongsDockBtn: document.getElementById('myKrathongsDockBtn'),
  myCountBadge: document.getElementById('myCountBadge'),

  // Studio modal
  studioModal: document.getElementById('studioModal'),
  previewCanvas: document.getElementById('previewCanvas'),
  previewSummary: document.getElementById('previewSummary'),
  randomizeBtn: document.getElementById('randomizeBtn'),
  stepTab1: document.getElementById('stepTab1'),
  stepTab2: document.getElementById('stepTab2'),
  studioStep1: document.getElementById('studioStep1'),
  studioStep2: document.getElementById('studioStep2'),
  partCategoryTabs: document.getElementById('partCategoryTabs'),
  partOptionsGrid: document.getElementById('partOptionsGrid'),
  goToStep2Btn: document.getElementById('goToStep2Btn'),
  backToStep1Btn: document.getElementById('backToStep1Btn'),
  senderNameInput: document.getElementById('senderNameInput'),
  senderNameLabel: document.getElementById('senderNameLabel'),
  coupleModeToggle: document.getElementById('coupleModeToggle'),
  coupleHeartSep: document.getElementById('coupleHeartSep'),
  partnerNameInput: document.getElementById('partnerNameInput'),
  wishTextarea: document.getElementById('wishTextarea'),
  wishCharCount: document.getElementById('wishCharCount'),
  wishPresets: document.getElementById('wishPresets'),
  studioLocationGrid: document.getElementById('studioLocationGrid'),
  fantasyModeToggle: document.getElementById('fantasyModeToggle'),
  studioError: document.getElementById('studioError'),
  floatSubmitBtn: document.getElementById('floatSubmitBtn'),

  // Kaiju Fantasy Basketball Shot HUD
  kaijuHud: document.getElementById('kaijuHud'),
  kaijuStatusText: document.getElementById('kaijuStatusText'),
  kaijuMeterWrap: document.getElementById('kaijuMeterWrap'),
  kaijuLockLabel: document.getElementById('kaijuLockLabel'),
  kaijuMeterNeedle: document.getElementById('kaijuMeterNeedle'),
  kaijuSoundBtn: document.getElementById('kaijuSoundBtn'),
  kaijuShootBtn: document.getElementById('kaijuShootBtn'),
  kaijuSkipBtn: document.getElementById('kaijuSkipBtn'),

  // Interactive Sky Lantern Throw HUD
  lanternHud: document.getElementById('lanternHud'),
  lanternThrowBtn: document.getElementById('lanternThrowBtn'),
  lanternCancelBtn: document.getElementById('lanternCancelBtn'),

  // Fantasy Firework Cannon HUD (UFO & Golden Naga)
  fireworkHud: document.getElementById('fireworkHud'),
  nagaChargeLabel: document.getElementById('nagaChargeLabel'),
  nagaChargeFill: document.getElementById('nagaChargeFill'),
  fireUfoBtn: document.getElementById('fireUfoBtn'),
  chargeNagaBtn: document.getElementById('chargeNagaBtn'),
  fireworkCloseBtn: document.getElementById('fireworkCloseBtn'),

  // Wish inspector modal
  wishModal: document.getElementById('wishModal'),
  inspectorCanvas: document.getElementById('inspectorCanvas'),
  wishLocationBadge: document.getElementById('wishLocationBadge'),
  wishTimeBadge: document.getElementById('wishTimeBadge'),
  wishModalName: document.getElementById('wishModalName'),
  wishTotalBlessings: document.getElementById('wishTotalBlessings'),
  wishModalText: document.getElementById('wishModalText'),
  wishCraftMeta: document.getElementById('wishCraftMeta'),
  blessButtons: document.getElementById('blessButtons'),
  openEcardFromWishBtn: document.getElementById('openEcardFromWishBtn'),
  copyWishLinkBtn: document.getElementById('copyWishLinkBtn'),

  // E-card modal
  ecardModal: document.getElementById('ecardModal'),
  ecardCanvas: document.getElementById('ecardCanvas'),
  ecardImg: document.getElementById('ecardImg'),
  downloadEcardBtn: document.getElementById('downloadEcardBtn'),
  shareEcardBtn: document.getElementById('shareEcardBtn'),
  copyEcardLinkBtn: document.getElementById('copyEcardLinkBtn'),

  // Explore drawer
  exploreDrawer: document.getElementById('exploreDrawer'),
  drawerTabMine: document.getElementById('drawerTabMine'),
  drawerTabTop: document.getElementById('drawerTabTop'),
  drawerTabSearch: document.getElementById('drawerTabSearch'),
  drawerTabEco: document.getElementById('drawerTabEco'),
  myKrathongsList: document.getElementById('myKrathongsList'),
  topKrathongsList: document.getElementById('topKrathongsList'),
  globalSearchInput: document.getElementById('globalSearchInput'),
  searchResultsList: document.getElementById('searchResultsList'),

  // Siem-Si Fortune Modal
  fortuneModal: document.getElementById('fortuneModal'),
  fortuneShakeStage: document.getElementById('fortuneShakeStage'),
  fortuneResultStage: document.getElementById('fortuneResultStage'),
  siemsiCup: document.getElementById('siemsiCup'),
  fortuneStageHint: document.getElementById('fortuneStageHint'),
  shakeFortuneBtn: document.getElementById('shakeFortuneBtn'),
  fortuneNoThai: document.getElementById('fortuneNoThai'),
  fortuneGrade: document.getElementById('fortuneGrade'),
  fortuneTitle: document.getElementById('fortuneTitle'),
  fortuneVerse: document.getElementById('fortuneVerse'),
  fortuneCareer: document.getElementById('fortuneCareer'),
  fortuneLove: document.getElementById('fortuneLove'),
  fortuneLucky: document.getElementById('fortuneLucky'),
  fortuneTip: document.getElementById('fortuneTip'),
  downloadFortuneBtn: document.getElementById('downloadFortuneBtn'),
  reshakeFortuneBtn: document.getElementById('reshakeFortuneBtn'),
  fortuneExportCanvas: document.getElementById('fortuneExportCanvas'),
  ecoWasteBig: document.getElementById('ecoWasteBig'),
  ecoCo2Big: document.getElementById('ecoCo2Big'),
  ecoTotalKrathongs: document.getElementById('ecoTotalKrathongs'),
  ecoTotalBlessings: document.getElementById('ecoTotalBlessings'),
  ecoTotalLanterns: document.getElementById('ecoTotalLanterns'),
  ecoTotalFireworks: document.getElementById('ecoTotalFireworks'),
  locationBreakdownBars: document.getElementById('locationBreakdownBars'),

  snackbar: document.getElementById('snackbar'),
};

/* ==========================================================================
   INITIALIZATION
   ========================================================================== */
async function init() {
  scene = new RiverSceneEngine(els.riverCanvas, {
    onHover: handleCanvasHover,
    onSelectKrathong: (krathong) => openWishInspector(krathong.id, krathong),
    onSkyClick: (xRatio) => triggerLantern(xRatio),
    onKidCaught: () => {},
    onCrocAttack: () => {},
    onCrocChomp: () => {},
  });
  scene.setMyKrathongIds(state.myKrathongIds);
  scene.start();
  window.scene = scene;

  // Test / cameo hook
  window.triggerCroc = () => scene.triggerCrocodileAttack();
  window.openEcardModal = openEcardModal;

  renderLocationBar();
  renderStudioLocationGrid();
  updateMyCountBadge();
  bindUIEvents();
  connectRealtimeStream();

  // Check for deep-link ?krathong=<id>
  const params = new URLSearchParams(window.location.search);
  const sharedKrathongId = params.get('krathong');

  await fetchStats();

  if (sharedKrathongId) {
    try {
      const res = await fetch(`/api/krathongs/${encodeURIComponent(sharedKrathongId)}`);
      if (res.ok) {
        const { krathong } = await res.json();
        await switchLocation(krathong.location, false);
        scene.addOrLaunchKrathong(krathong, { animateLaunch: false });
        scene.spotlightKrathong(krathong.id, 10000);
        openWishInspector(krathong.id, krathong);
        return;
      }
    } catch {
      // Fall back to default location
    }
  }

  await switchLocation(state.activeLocation, false);
}

/* ==========================================================================
   API & REAL-TIME SSE
   ========================================================================== */
async function fetchStats() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) return;
    const stats = await res.json();
    applyStats(stats);
  } catch {
    // ignore transient offline errors
  }
}

function applyStats(stats) {
  if (!stats) return;
  state.stats = stats;
  els.statTotalKrathongs.textContent = Number(stats.totalKrathongs || 0).toLocaleString('th-TH');
  els.statWasteKg.textContent = Number(stats.wasteSavedKg || 0).toFixed(1);
  if (typeof stats.onlineCount === 'number') {
    els.onlineCountLabel.textContent = `ร่วมลอยออนไลน์ ${stats.onlineCount.toLocaleString('th-TH')} คน`;
  }

  // Update counts on location pills
  LOCATION_ORDER.forEach((locId) => {
    const badge = document.querySelector(`.loc-pill[data-loc="${locId}"] .loc-pill__count`);
    if (badge && stats.byLocation) {
      badge.textContent = stats.byLocation[locId] ?? 0;
    }
  });

  // Update Eco Dashboard if present
  els.ecoWasteBig.textContent = Number(stats.wasteSavedKg || 0).toFixed(2);
  els.ecoCo2Big.textContent = Number(stats.co2SavedKg || 0).toFixed(2);
  els.ecoTotalKrathongs.textContent = Number(stats.totalKrathongs || 0).toLocaleString('th-TH');
  els.ecoTotalBlessings.textContent = Number(stats.totalBlessings || 0).toLocaleString('th-TH');
  els.ecoTotalLanterns.textContent = Number(stats.totalLanterns || 0).toLocaleString('th-TH');
  els.ecoTotalFireworks.textContent = Number(stats.totalFireworks || 0).toLocaleString('th-TH');
  renderLocationBreakdown(stats);
}

async function switchLocation(locationId, announce = true) {
  if (!LOCATIONS[locationId]) return;
  state.activeLocation = locationId;
  state.draft.location = locationId;
  scene.setLocation(locationId);

  const loc = LOCATIONS[locationId];
  els.sceneLocationTag.textContent = loc.province;
  els.sceneTitle.textContent = loc.fullName;
  els.sceneHint.textContent = `${loc.subtitle} · คลิกกระทงเพื่อส่งใจ หรือแตะท้องฟ้าปล่อยโคม`;

  document.querySelectorAll('.loc-pill').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.loc === locationId);
  });
  renderStudioLocationGrid();

  try {
    const res = await fetch(`/api/krathongs?location=${encodeURIComponent(locationId)}&limit=55`);
    if (res.ok) {
      const { items } = await res.json();
      scene.setKrathongs(items);
      updateEmptyRiverPrompt(items.length);
    }
  } catch {
    showSnackbar('ไม่สามารถเชื่อมต่อสายน้ำได้ชั่วคราว');
  }

  if (announce) {
    showSnackbar(`เปลี่ยนบรรยากาศไปยัง ${loc.shortName} แล้ว 🌕`);
  }
}

function updateEmptyRiverPrompt(countInLocation) {
  const isEmpty = countInLocation === 0;
  els.emptyRiverCard.classList.toggle('hidden', !isEmpty);
  if (isEmpty) {
    const loc = LOCATIONS[state.activeLocation] || LOCATIONS['wat-arun'];
    els.emptyRiverDesc.textContent = `ออกแบบกระทง DIY ในสไตล์ของคุณ แล้วชูตลงห่วงก็อตซิลล่าเป็นใบแรกที่${loc.shortName}`;
  }
}

function connectRealtimeStream() {
  if (eventSource) eventSource.close();
  eventSource = new EventSource('/api/stream');

  eventSource.addEventListener('presence', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (typeof data.onlineCount === 'number') {
        els.onlineCountLabel.textContent = `ร่วมลอยออนไลน์ ${data.onlineCount.toLocaleString('th-TH')} คน`;
      }
    } catch {
      // ignore
    }
  });

  eventSource.addEventListener('krathong:created', (e) => {
    try {
      const { krathong, stats, clientId } = JSON.parse(e.data);
      applyStats(stats);
      const isMine = clientId === CLIENT_ID || state.myKrathongIds.includes(krathong.id);
      if (krathong.location === state.activeLocation && !isMine) {
        scene.addOrLaunchKrathong(krathong, { animateLaunch: true, isMine: false });
        updateEmptyRiverPrompt(scene.krathongEntities.length);
      }
      if (!isMine) {
        const locName = (LOCATIONS[krathong.location] || {}).shortName || '';
        pushLiveFeed(`✦ ${krathong.name} เพิ่งลอยกระทงที่${locName}`, () => {
          jumpToKrathong(krathong);
        });
      }
    } catch {
      // ignore
    }
  });

  eventSource.addEventListener('krathong:blessed', (e) => {
    try {
      const { krathong, reaction, stats } = JSON.parse(e.data);
      applyStats(stats);
      const rInfo = REACTIONS[reaction] || REACTIONS.love;
      if (krathong.location === state.activeLocation) {
        scene.updateKrathongData(krathong, rInfo.emoji);
      }
      if (state.inspectedKrathong && state.inspectedKrathong.id === krathong.id) {
        state.inspectedKrathong = krathong;
        updateWishInspectorCounts(krathong);
      }
    } catch {
      // ignore
    }
  });

  eventSource.addEventListener('lantern:launched', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (state.stats) {
        state.stats.totalLanterns = data.totalLanterns;
        els.ecoTotalLanterns.textContent = Number(data.totalLanterns || 0).toLocaleString('th-TH');
      }
      if (data.clientId !== CLIENT_ID && data.location === state.activeLocation) {
        scene.launchSkyLantern(data.xRatio, true);
      }
    } catch {
      // ignore
    }
  });

  eventSource.addEventListener('firework:launched', (e) => {
    try {
      const data = JSON.parse(e.data);
      if (state.stats) {
        state.stats.totalFireworks = data.totalFireworks;
        els.ecoTotalFireworks.textContent = Number(data.totalFireworks || 0).toLocaleString('th-TH');
      }
      if (data.clientId !== CLIENT_ID && data.location === state.activeLocation) {
        scene.launchFirework(data.xRatio, data.yRatio);
        sound.playFireworkPop();
      }
    } catch {
      // ignore
    }
  });
}

/* ==========================================================================
   AMBIENT INTERACTIONS (LANTERN & FIREWORK)
   ========================================================================== */
async function triggerLantern(xRatio = null, { skipLocalSpawn = false } = {}) {
  if (!skipLocalSpawn) {
    scene.launchSkyLantern(xRatio, true);
  }
  sound.playLanternWhoosh();
  try {
    await fetch('/api/events/lantern', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: state.activeLocation,
        xRatio,
        clientId: CLIENT_ID,
      }),
    });
  } catch {
    // ignore
  }
}

function openLanternThrowExperience() {
  if (scene.isGodzillaActive()) return;
  scene.openLanternThrowMode({
    onThrowModeChange: (isOpen) => {
      document.body.classList.toggle('lantern-mode', isOpen);
      els.lanternHud.classList.toggle('hidden', !isOpen);
    },
    onThrown: (xRatio) => {
      // Persist & broadcast lantern counter to Supabase without spawning duplicate ambient lantern
      triggerLantern(xRatio, { skipLocalSpawn: true });
      pushLiveFeed('🏮 โยนโคมขึ้นฟ้าแล้ว! ลอยสูงขึ้นไปชมพระจันทร์...', null, 4500);
    },
    onFireStarted: () => {
      sound.playFireIgnition();
      pushLiveFeed('🔥 ว้าย! โคมลอยตกลงริมฝั่ง ไฟไหม้แล้ว! เรียกรถดับเพลิงด่วน!!', null, 5200);
    },
    onSiren: () => {
      sound.playFireSiren();
    },
    onWaterSpray: () => {
      sound.playWaterSpray();
    },
    onFireExtinguished: () => {
      sound.playBlessChime();
      pushLiveFeed('🚒 รถดับเพลิงดับไฟเรียบร้อย! ลอยกระทงออนไลน์ปลอดภัยกว่าเยอะ ✨', null, 6000);
    },
  });
}

async function triggerFirework(xRatio = null, yRatio = null, { skipLocalSpawn = false } = {}) {
  const fx = xRatio != null ? xRatio : 0.2 + Math.random() * 0.6;
  const fy = yRatio != null ? yRatio : 0.12 + Math.random() * 0.2;
  if (!skipLocalSpawn) {
    scene.launchFirework(fx, fy);
    setTimeout(() => scene.launchFirework(Math.min(0.86, fx + 0.14), fy + 0.04), 220);
    sound.playFireworkPop();
  }
  try {
    await fetch('/api/events/firework', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: state.activeLocation,
        xRatio: fx,
        yRatio: fy,
        clientId: CLIENT_ID,
      }),
    });
  } catch {
    // ignore
  }
}

function openFireworkLauncherExperience() {
  if (scene.isGodzillaActive() || scene.isLanternThrowActive()) return;
  scene.openFireworkLauncher({
    onLauncherChange: (isOpen) => {
      document.body.classList.toggle('firework-mode', isOpen);
      els.fireworkHud.classList.toggle('hidden', !isOpen);
    },
    onChargeUpdate: (level) => {
      const pct = Math.round(level * 100);
      els.nagaChargeFill.style.width = `${pct}%`;
      els.nagaChargeLabel.textContent =
        pct >= 95
          ? '⚡ พลังเต็มพิกัด!! ปลุกพญานาค!'
          : pct > 0
            ? `กำลังชาร์จพลังพญานาค ${pct}%...`
            : 'กดค้างหรือกดปุ่มพญานาคเพื่อชาร์จ!';
    },
    onRocketFired: (xRatio, yRatio) => {
      sound.playCannonLaunch();
      triggerFirework(xRatio, yRatio, { skipLocalSpawn: true });
    },
    onFireworkBoom: () => {
      sound.playFireworkPop();
    },
    onUfoHit: () => {
      sound.playUfoReveal();
      pushLiveFeed('🛸 อ้าว!! ยิงพลุไปโดนจานบิน UFO ล่องหนที่แอบมาลอยกระทง!', null, 5200);
    },
    onUfoDisco: () => {
      pushLiveFeed('🌈 เอเลี่ยนเอาคืน! ปล่อยพลุดิสโก้สายรุ้งเต็มท้องฟ้า!!', null, 5200);
    },
    onUfoWarp: () => {
      sound.playUfoWarp();
      pushLiveFeed('⚡ จานบิน UFO วาร์ปหนีกลับอวกาศไปแล้ว!', null, 4500);
    },
    onNagaAwaken: () => {
      sound.playNagaAwaken();
      pushLiveFeed('🐉 พญานาคแสงทองพุ่งแหวกฟ้าพร้อมบั้งไฟพญานาคสุดอลังการ ✨', null, 6500);
    },
  });
}

/* ==========================================================================
   DIY STUDIO FLOW
   ========================================================================== */
function openStudioModal() {
  state.draft.location = state.activeLocation;
  setStudioStep(1);
  renderPartOptions();
  renderPreviewSummary();
  renderStudioLocationGrid();
  els.studioError.classList.add('hidden');
  els.studioModal.classList.remove('hidden');
  startPreviewLoop();
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('hidden');

  if (modalId === 'studioModal' && previewRaf) {
    cancelAnimationFrame(previewRaf);
    previewRaf = null;
  }
  if (modalId === 'wishModal' && inspectorRaf) {
    cancelAnimationFrame(inspectorRaf);
    inspectorRaf = null;
  }
}

function setStudioStep(step) {
  state.studioStep = step;
  const isStep1 = step === 1;
  els.studioStep1.classList.toggle('hidden', !isStep1);
  els.studioStep2.classList.toggle('hidden', isStep1);
  els.stepTab1.classList.toggle('active', isStep1);
  els.stepTab2.classList.toggle('active', !isStep1);
  els.stepTab1.setAttribute('aria-selected', String(isStep1));
  els.stepTab2.setAttribute('aria-selected', String(!isStep1));

  if (!isStep1) {
    setTimeout(() => els.senderNameInput.focus(), 60);
  }
}

function renderPartOptions() {
  const cat = state.activePartCategory;
  const keyMap = {
    base: 'baseType',
    flower: 'flowerType',
    candle: 'candleType',
    ornament: 'ornamentType',
  };
  const selectedId = state.draft[keyMap[cat]];
  const items = KRATHONG_PARTS[cat] || [];

  els.partOptionsGrid.innerHTML = '';
  for (const item of items) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `part-card${item.id === selectedId ? ' selected' : ''}`;
    btn.innerHTML = `
      <span class="part-swatch" style="background:${item.swatchBg}">${item.icon}</span>
      <span>
        <span class="part-card__name">${escapeHtml(item.name)}</span>
        <span class="part-card__desc">${escapeHtml(item.desc)}</span>
      </span>
    `;
    btn.addEventListener('click', () => {
      state.draft[keyMap[cat]] = item.id;
      renderPartOptions();
      renderPreviewSummary();
    });
    els.partOptionsGrid.appendChild(btn);
  }
}

function renderPreviewSummary() {
  const tags = [
    findPart('base', state.draft.baseType),
    findPart('flower', state.draft.flowerType),
    findPart('candle', state.draft.candleType),
    findPart('ornament', state.draft.ornamentType),
  ];
  els.previewSummary.innerHTML = tags
    .map((t) => `<span class="summary-tag">${t.icon} ${escapeHtml(t.name)}</span>`)
    .join('');
}

function randomizeDraft() {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)].id;
  state.draft.baseType = pick(KRATHONG_PARTS.base);
  state.draft.flowerType = pick(KRATHONG_PARTS.flower);
  state.draft.candleType = pick(KRATHONG_PARTS.candle);
  state.draft.ornamentType = pick(KRATHONG_PARTS.ornament);
  renderPartOptions();
  renderPreviewSummary();
  sound.playBlessChime();
}

function renderStudioLocationGrid() {
  els.studioLocationGrid.innerHTML = '';
  for (const locId of LOCATION_ORDER) {
    const loc = LOCATIONS[locId];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `mini-loc-card${state.draft.location === locId ? ' selected' : ''}`;
    btn.innerHTML = `
      <span class="mini-loc-card__name">${escapeHtml(loc.shortName)}</span>
      <span class="mini-loc-card__province">${escapeHtml(loc.province)}</span>
    `;
    btn.addEventListener('click', () => {
      state.draft.location = locId;
      renderStudioLocationGrid();
    });
    els.studioLocationGrid.appendChild(btn);
  }
}

function startPreviewLoop() {
  if (previewRaf) cancelAnimationFrame(previewRaf);
  const canvas = els.previewCanvas;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const renderFrame = (now) => {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(260, rect.width || 360);
    const h = Math.max(190, rect.height || 300);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawMiniNightWaterBackdrop(ctx, w, h, now, state.draft.location);
    const scale = Math.min(w, h) / 148;
    drawKrathong(ctx, w / 2, h * 0.62, scale, state.draft, now, {
      showReflection: true,
      showRipples: true,
      phase: 0.4,
    });

    previewRaf = requestAnimationFrame(renderFrame);
  };
  previewRaf = requestAnimationFrame(renderFrame);
}

async function handleFloatSubmit(e) {
  e.preventDefault();
  const isCouple = Boolean(els.coupleModeToggle && els.coupleModeToggle.checked);
  const name1 = els.senderNameInput.value.trim();
  const name2 = els.partnerNameInput ? els.partnerNameInput.value.trim() : '';
  const wish = els.wishTextarea.value.trim();

  if (!name1) {
    showStudioError(isCouple ? 'กรุณากรอกชื่อคนที่ 1 ก่อนนะครับ' : 'กรุณากรอกชื่อผู้ลอยกระทงก่อนนะครับ');
    els.senderNameInput.focus();
    return;
  }
  if (isCouple && !name2) {
    showStudioError('กรุณากรอกชื่อคู่ของคุณด้วยนะครับ ♥');
    els.partnerNameInput.focus();
    return;
  }
  if (!wish) {
    showStudioError('กรุณาเขียนคำอธิษฐาน หรือกดปุ่มช่วยคิดคำอธิษฐานด้านล่างครับ');
    els.wishTextarea.focus();
    return;
  }

  const name = isCouple ? `${name1.slice(0, 18)} ♥ ${name2.slice(0, 18)}` : name1;

  els.studioError.classList.add('hidden');
  els.floatSubmitBtn.disabled = true;
  els.floatSubmitBtn.textContent = 'กำลังปล่อยกระทง...';

  try {
    const res = await fetch('/api/krathongs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        wish,
        location: state.draft.location,
        baseType: state.draft.baseType,
        flowerType: state.draft.flowerType,
        candleType: state.draft.candleType,
        ornamentType: state.draft.ornamentType,
        clientId: CLIENT_ID,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'ไม่สามารถปล่อยกระทงได้');
    }

    const created = data.krathong;
    saveMyKrathongId(created.id);
    applyStats(data.stats);
    closeModal('studioModal');

    // Clear wish input for next krathong
    els.wishTextarea.value = '';
    els.wishCharCount.textContent = '0 / 240';

    if (created.location !== state.activeLocation) {
      await switchLocation(created.location, false);
    }

    scene.setMyKrathongIds(state.myKrathongIds);
    const useFantasyGodzilla = els.fantasyModeToggle ? els.fantasyModeToggle.checked : true;

    if (useFantasyGodzilla) {
      beginGodzillaShotSequence(created);
    } else {
      finishKrathongFloatNormal(created);
    }
  } catch (err) {
    showStudioError(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
  } finally {
    els.floatSubmitBtn.disabled = false;
    updateSubmitButtonLabel();
  }
}

function updateSubmitButtonLabel() {
  const isFantasy = els.fantasyModeToggle ? els.fantasyModeToggle.checked : true;
  els.floatSubmitBtn.textContent = isFantasy ? '🏀 ชูตกระทงลงห่วงก็อตซิลล่า!' : '✦ ปล่อยกระทงลงสายน้ำ';
}

function finishKrathongFloatNormal(created) {
  scene.addOrLaunchKrathong(created, { animateLaunch: true, isMine: true });
  updateEmptyRiverPrompt(scene.krathongEntities.length);
  sound.playFloatSplash();

  pushLiveFeed(`✨ ลอยกระทงของคุณ${created.name} สำเร็จ! คลิกดูการ์ด E-Card`, () => {
    openEcardModal(created);
  }, 9000);

  setTimeout(() => {
    openEcardModal(created);
  }, 1850);
}

function beginGodzillaShotSequence(created) {
  updateEmptyRiverPrompt(1);
  document.body.classList.add('kaiju-mode');
  els.kaijuHud.classList.remove('hidden');
  if (els.kaijuSoundBtn) els.kaijuSoundBtn.classList.toggle('hidden', sound.enabled);
  els.kaijuShootBtn.disabled = true;
  els.kaijuStatusText.textContent = 'ก็อตซิลล่ากำลังผุดขึ้นมาจากใต้สายน้ำ...';
  if (els.kaijuMeterWrap) els.kaijuMeterWrap.classList.remove('hidden');
  sound.playKaijuRoar();

  scene.startGodzillaShot(created, {
    onPhaseChange: (phase) => {
      if (phase === 'aiming') {
        els.kaijuShootBtn.disabled = false;
        els.kaijuStatusText.textContent = 'แตะลากกระทงถอยหลังเพื่อเล็ง แล้วปล่อยเพื่อชูต!';
      } else if (phase === 'flying') {
        els.kaijuShootBtn.disabled = true;
        els.kaijuStatusText.textContent = 'กระทงพุ่งขึ้นสู่ฟ้าแล้ว! ลุ้นลงห่วงกัน...';
      } else if (phase === 'swish') {
        els.kaijuShootBtn.disabled = true;
        if (els.kaijuMeterWrap) els.kaijuMeterWrap.classList.add('hidden');
        els.kaijuStatusText.textContent = '🔥 SWISH!! ก็อตซิลล่าคำรามพ่นลำแสงฉลองคำอธิษฐานของคุณ!';
      } else if (phase === 'submerging') {
        els.kaijuStatusText.textContent = 'กระทงลงสู่สายน้ำเรียบร้อย ก็อตซิลล่ากำลังดำกลับลงแม่น้ำ...';
      }
    },
    onMeterUpdate: (val, isLocked) => {
      if (els.kaijuMeterNeedle) els.kaijuMeterNeedle.style.left = `${(val * 100).toFixed(1)}%`;
      if (els.kaijuLockLabel) {
        els.kaijuLockLabel.textContent = isLocked ? '✦ ตรงห่วงแล้ว! ชูตเลย!' : 'เล็งห่วงหรือกดชูตช่วงสีทอง';
        els.kaijuLockLabel.classList.toggle('locked', isLocked);
      }
    },
    onShoot: () => {
      sound.playShootWhoosh();
    },
    onRimHit: () => {
      sound.playRimClank();
    },
    onSwish: () => {
      sound.playSwishFanfare();
      // Broadcast celebration firework to all live viewers via SSE!
      fetch('/api/events/firework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: created.location,
          xRatio: 0.5,
          yRatio: 0.14,
          clientId: CLIENT_ID,
        }),
      }).catch(() => {});
    },
    onComplete: (krathong, { scored, skipped } = {}) => {
      document.body.classList.remove('kaiju-mode');
      els.kaijuHud.classList.add('hidden');
      if (skipped) {
        finishKrathongFloatNormal(krathong);
        return;
      }
      if (scored) {
        pushLiveFeed(`🦖🏀 ชูตกระทงของคุณ${krathong.name} ลงห่วงสำเร็จ! คลิกดูการ์ด E-Card`, () => {
          openEcardModal(krathong);
        }, 10000);
        setTimeout(() => {
          openEcardModal(krathong);
        }, 700);
      }
    },
  });
}

function showStudioError(msg) {
  els.studioError.textContent = msg;
  els.studioError.classList.remove('hidden');
}

/* ==========================================================================
   WISH INSPECTOR & BLESSINGS
   ========================================================================== */
async function openWishInspector(id, cachedData = null) {
  let krathong = cachedData;
  try {
    const res = await fetch(`/api/krathongs/${encodeURIComponent(id)}`);
    if (res.ok) {
      const json = await res.json();
      krathong = json.krathong;
    }
  } catch {
    // Use cached data if available
  }
  if (!krathong) return;

  state.inspectedKrathong = krathong;
  const loc = LOCATIONS[krathong.location] || LOCATIONS['wat-arun'];

  els.wishLocationBadge.textContent = `📍 ${loc.shortName}`;
  els.wishTimeBadge.textContent = formatRelativeThaiTime(krathong.createdAt);
  els.wishModalName.textContent = krathong.name;
  els.wishModalText.textContent = `“${krathong.wish}”`;

  const metaParts = [
    findPart('base', krathong.baseType),
    findPart('flower', krathong.flowerType),
    findPart('candle', krathong.candleType),
    findPart('ornament', krathong.ornamentType),
  ];
  els.wishCraftMeta.innerHTML = metaParts
    .map((p) => `<span class="summary-tag">${p.icon} ${escapeHtml(p.name)}</span>`)
    .join('');

  updateWishInspectorCounts(krathong);
  els.wishModal.classList.remove('hidden');
  startInspectorLoop(krathong);
}

function updateWishInspectorCounts(krathong) {
  els.wishTotalBlessings.textContent = Number(krathong.blessings || 0).toLocaleString('th-TH');
  const reactions = krathong.reactions || { sathu: 0, wish: 0, health: 0, love: 0 };
  for (const key of Object.keys(REACTIONS)) {
    const span = els.blessButtons.querySelector(`[data-count="${key}"]`);
    if (span) span.textContent = Number(reactions[key] || 0).toLocaleString('th-TH');
  }
}

function startInspectorLoop(krathong) {
  if (inspectorRaf) cancelAnimationFrame(inspectorRaf);
  const canvas = els.inspectorCanvas;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  const renderFrame = (now) => {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(260, rect.width || 420);
    const h = Math.max(180, rect.height || 215);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawMiniNightWaterBackdrop(ctx, w, h, now, krathong.location);
    const scale = Math.min(w, h) / 128;
    drawKrathong(ctx, w / 2, h * 0.62, scale, krathong, now, {
      showReflection: true,
      showRipples: true,
      phase: 1.1,
    });

    inspectorRaf = requestAnimationFrame(renderFrame);
  };
  inspectorRaf = requestAnimationFrame(renderFrame);
}

async function sendBlessing(reaction, buttonEl) {
  const krathong = state.inspectedKrathong;
  if (!krathong) return;

  buttonEl.classList.remove('pop');
  void buttonEl.offsetWidth;
  buttonEl.classList.add('pop');
  sound.playBlessChime();

  try {
    const res = await fetch(`/api/krathongs/${encodeURIComponent(krathong.id)}/bless`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction }),
    });
    if (!res.ok) return;
    const data = await res.json();
    state.inspectedKrathong = data.krathong;
    updateWishInspectorCounts(data.krathong);
    applyStats(data.stats);
    const rInfo = REACTIONS[reaction] || REACTIONS.love;
    showSnackbar(`ส่งคำอวยพร "${rInfo.emoji} ${rInfo.label}" ให้คุณ${krathong.name} แล้ว`);
  } catch {
    showSnackbar('ไม่สามารถส่งคำอวยพรได้ในขณะนี้');
  }
}

/* ==========================================================================
   COMMEMORATIVE E-CARD GENERATOR
   ========================================================================== */
async function openEcardModal(krathong) {
  if (!krathong) return;
  state.ecardKrathong = krathong;
  els.ecardModal.classList.remove('hidden');
  await renderCommemorativeCard(els.ecardCanvas, krathong);
  try {
    const dataUrl = els.ecardCanvas.toDataURL('image/png');
    if (els.ecardImg) {
      els.ecardImg.src = dataUrl;
    }
  } catch (err) {
    console.error('Failed to sync ecard img preview:', err);
  }
}

/**
 * Robust cross-platform image saving for Mobile (iOS Safari / in-app browsers / Android) and Desktop.
 */
async function saveCanvasImage(canvas, fileName, title = 'การ์ดที่ระลึกวันลอยกระทง') {
  if (!canvas) return;

  try {
    // 1. Convert canvas to Blob & File
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Canvas toBlob returned null');

    const file = new File([blob], fileName, { type: 'image/png' });
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // 2. On Mobile with Web Share API: triggers native iOS/Android sheet with "Save Image" to camera roll
    if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title,
        });
        showSnackbar('บันทึกรูปภาพเรียบร้อยแล้ว ✨');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // User simply closed the share sheet
        console.warn('Mobile share failed, using fallback:', err);
      }
    }

    // 3. Blob ObjectURL download (Desktop browsers & Android Chrome)
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    }, 2500);

    // If on iOS where <a download> might be silently ignored:
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      showSnackbar('แตะที่รูปการ์ดค้างไว้ แล้วเลือก "บันทึกภาพ" (Save Image) 📸');
    } else {
      showSnackbar('บันทึกการ์ด (PNG) ลงเครื่องเรียบร้อยแล้ว 🎴');
    }
  } catch (err) {
    console.error('saveCanvasImage error:', err);
    // Ultimate fallback: data URL
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName;
      link.click();
      showSnackbar('แตะที่รูปการ์ดค้างไว้ แล้วเลือก "บันทึกภาพ" 📸');
    } catch {
      showSnackbar('แตะที่รูปการ์ดค้างไว้ แล้วเลือก "บันทึกภาพ" 📸');
    }
  }
}

async function downloadEcardPng() {
  if (!state.ecardKrathong) return;
  const safeName = state.ecardKrathong.name.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 24) || 'krathong';
  const fileName = `saeng-khongkha-${safeName}.png`;
  await saveCanvasImage(els.ecardCanvas, fileName, `การ์ดที่ระลึกวันลอยกระทงของคุณ${state.ecardKrathong.name}`);
}

async function shareEcardOrLink() {
  if (!state.ecardKrathong) return;
  const url = buildKrathongUrl(state.ecardKrathong.id);
  const text = `มาชมกระทงและร่วมส่งคำอวยพรให้ "${state.ecardKrathong.name}" ในคืนวันลอยกระทงออนไลน์ 🌕✨`;

  if (navigator.share) {
    try {
      const blob = await new Promise((resolve) => els.ecardCanvas.toBlob(resolve, 'image/png'));
      const file = blob ? new File([blob], 'saeng-khongkha-ecard.png', { type: 'image/png' }) : null;
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title: 'แสงคงคา — ลอยกระทงออนไลน์', text, url, files: [file] });
        return;
      }
      await navigator.share({ title: 'แสงคงคา — ลอยกระทงออนไลน์', text, url });
      return;
    } catch {
      // User cancelled or share unsupported — fall back to copy
    }
  }
  await copyKrathongLink(state.ecardKrathong.id);
}

async function copyKrathongLink(id) {
  const url = buildKrathongUrl(id);
  try {
    await navigator.clipboard.writeText(url);
    showSnackbar('คัดลอกลิงก์กระทงแล้ว ส่งให้เพื่อนเปิดชมได้เลย 🔗');
  } catch {
    showSnackbar(url);
  }
}

function buildKrathongUrl(id) {
  const u = new URL(window.location.href);
  u.search = `?krathong=${encodeURIComponent(id)}`;
  return u.toString();
}

/* ==========================================================================
   EXPLORE DRAWER (MY KRATHONGS, SEARCH, ECO STATS)
   ========================================================================== */
function openExploreDrawer(initialTab = 'mine') {
  els.exploreDrawer.classList.remove('hidden');
  switchDrawerTab(initialTab);
}

function switchDrawerTab(tab) {
  state.drawerTab = tab;
  document.querySelectorAll('.drawer-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.drawerTab === tab);
  });
  els.drawerTabMine.classList.toggle('hidden', tab !== 'mine');
  els.drawerTabTop.classList.toggle('hidden', tab !== 'top');
  els.drawerTabSearch.classList.toggle('hidden', tab !== 'search');
  els.drawerTabEco.classList.toggle('hidden', tab !== 'eco');

  if (tab === 'mine') {
    loadMyKrathongsList();
  } else if (tab === 'top') {
    loadTopPopularKrathongs();
  } else if (tab === 'search') {
    runGlobalSearch(els.globalSearchInput.value.trim());
    setTimeout(() => els.globalSearchInput.focus(), 60);
  } else if (tab === 'eco') {
    fetchStats();
  }
}

async function loadTopPopularKrathongs() {
  els.topKrathongsList.innerHTML = `<div class="empty-state"><p>กำลังโหลดอันดับกระทงยอดนิยม...</p></div>`;
  try {
    const res = await fetch('/api/krathongs?sort=popular&limit=5');
    const { items } = await res.json();
    renderKrathongList(
      els.topKrathongsList,
      items,
      'ยังไม่มีกระทงในสายน้ำ มาลอยใบแรกแล้วชวนเพื่อนกดส่งใจกันเลย!',
      { ranked: true }
    );
  } catch {
    els.topKrathongsList.innerHTML = `<div class="empty-state"><p>โหลดอันดับไม่สำเร็จ กรุณาลองใหม่</p></div>`;
  }
}

async function loadMyKrathongsList() {
  if (state.myKrathongIds.length === 0) {
    els.myKrathongsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">🌕</div>
        <p>คุณยังไม่ได้ลอยกระทงในเบราว์เซอร์นี้<br/>มาออกแบบกระทงใบแรกและอธิษฐานในคืนวันเพ็ญกันครับ</p>
        <button type="button" class="btn btn--gold" id="emptyCreateBtn">✨ สร้างกระทงของฉัน</button>
      </div>
    `;
    const btn = document.getElementById('emptyCreateBtn');
    if (btn) {
      btn.addEventListener('click', () => {
        closeModal('exploreDrawer');
        openStudioModal();
      });
    }
    return;
  }

  els.myKrathongsList.innerHTML = `<div class="empty-state"><p>กำลังโหลดกระทงของคุณ...</p></div>`;
  try {
    const res = await fetch(`/api/krathongs?ids=${encodeURIComponent(state.myKrathongIds.join(','))}`);
    const { items } = await res.json();
    // Prune stale IDs if database was reset
    const validIds = new Set((items || []).map((it) => it.id));
    if (validIds.size !== state.myKrathongIds.length) {
      state.myKrathongIds = state.myKrathongIds.filter((id) => validIds.has(id));
      try {
        localStorage.setItem(STORAGE_KEY_MY_IDS, JSON.stringify(state.myKrathongIds));
      } catch {
        // ignore
      }
      updateMyCountBadge();
      scene.setMyKrathongIds(state.myKrathongIds);
    }
    if (items.length === 0) {
      loadMyKrathongsList();
      return;
    }
    renderKrathongList(els.myKrathongsList, items, 'ไม่พบประวัติกระทงของคุณ');
  } catch {
    els.myKrathongsList.innerHTML = `<div class="empty-state"><p>โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่</p></div>`;
  }
}

async function runGlobalSearch(query) {
  els.searchResultsList.innerHTML = `<div class="empty-state"><p>กำลังค้นหาในสายน้ำ...</p></div>`;
  try {
    const url = query
      ? `/api/krathongs?q=${encodeURIComponent(query)}&limit=40`
      : `/api/krathongs?limit=25`;
    const res = await fetch(url);
    const { items } = await res.json();
    renderKrathongList(
      els.searchResultsList,
      items,
      query ? `ไม่พบกระทงที่ตรงกับ "${escapeHtml(query)}"` : 'ยังไม่มีกระทงในสายน้ำ'
    );
  } catch {
    els.searchResultsList.innerHTML = `<div class="empty-state"><p>ค้นหาไม่สำเร็จ กรุณาลองใหม่</p></div>`;
  }
}

function renderKrathongList(container, items, emptyMessage, { ranked = false } = {}) {
  if (!items || items.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state__icon">🌕</div><p>${emptyMessage}</p></div>`;
    return;
  }

  const medals = ['🥇 #1', '🥈 #2', '🥉 #3'];
  container.innerHTML = '';
  items.forEach((item, idx) => {
    const loc = LOCATIONS[item.location] || LOCATIONS['wat-arun'];
    const rankClass = idx < 3 ? `rank-badge--${idx + 1}` : 'rank-badge--other';
    const rankHtml = ranked
      ? `<span class="rank-badge ${rankClass}">${medals[idx] || `#${idx + 1}`}</span>`
      : '';
    const card = document.createElement('article');
    card.className = 'k-item-card';
    card.innerHTML = `
      <div class="k-item-card__top">
        <span class="k-item-card__name">${rankHtml}${escapeHtml(item.name)}</span>
        <span class="k-item-card__loc">📍 ${escapeHtml(loc.shortName)}</span>
      </div>
      <p class="k-item-card__wish">“${escapeHtml(item.wish)}”</p>
      <div class="k-item-card__footer">
        <span class="k-item-card__meta">💛 ${Number(item.blessings).toLocaleString('th-TH')} · ${formatRelativeThaiTime(item.createdAt)}</span>
        <div class="k-item-card__actions">
          <button type="button" class="mini-btn" data-action="view">ชมบนสายน้ำ</button>
          <button type="button" class="mini-btn" data-action="card">🎴 การ์ด</button>
        </div>
      </div>
    `;

    card.querySelector('[data-action="view"]').addEventListener('click', () => {
      closeModal('exploreDrawer');
      jumpToKrathong(item);
    });
    card.querySelector('[data-action="card"]').addEventListener('click', () => {
      closeModal('exploreDrawer');
      openEcardModal(item);
    });
    container.appendChild(card);
  });
}

/* ==========================================================================
   SIEM-SI FULL MOON FORTUNE SHAKER
   ========================================================================== */
function openFortuneModal() {
  els.fortuneShakeStage.classList.remove('hidden');
  els.fortuneResultStage.classList.add('hidden');
  els.siemsiCup.classList.remove('shaking');
  els.shakeFortuneBtn.disabled = false;
  els.fortuneStageHint.textContent =
    'ตั้งจิตอธิษฐาน แล้วกดปุ่มด้านล่างหรือแตะกระบอกเพื่อเขย่าเซียมซีรับคำทำนายคืนวันเพ็ญ';
  els.fortuneModal.classList.remove('hidden');
}

function triggerSiemSiShake() {
  if (els.siemsiCup.classList.contains('shaking')) return;
  els.siemsiCup.classList.add('shaking');
  els.shakeFortuneBtn.disabled = true;
  els.fortuneStageHint.textContent = 'กำลังเขย่ากระบอกเซียมซี... ตั้งจิตอธิษฐานนะ ✨';
  sound.playSiemSiRattle();

  setTimeout(() => {
    const fortune = drawRandomFortune(state.currentFortune?.no);
    state.currentFortune = fortune;
    els.siemsiCup.classList.remove('shaking');
    els.shakeFortuneBtn.disabled = false;

    els.fortuneNoThai.textContent = toThaiDigits(fortune.no);
    els.fortuneGrade.textContent = fortune.grade;
    els.fortuneTitle.textContent = fortune.title;
    els.fortuneVerse.textContent = `“${fortune.verse}”`;
    els.fortuneCareer.textContent = fortune.career;
    els.fortuneLove.textContent = fortune.love;
    els.fortuneLucky.textContent = `${fortune.luckyColor}  ·  เลขเด็ด ${fortune.luckyNum}`;
    els.fortuneTip.textContent = `💡 เคล็ดลับคืนวันเพ็ญ: ${fortune.tip}`;

    els.fortuneShakeStage.classList.add('hidden');
    els.fortuneResultStage.classList.remove('hidden');
  }, 1250);
}

async function downloadFortunePng() {
  if (!state.currentFortune) return;
  await renderFortuneCardPng(els.fortuneExportCanvas, state.currentFortune);
  const fileName = `saeng-khongkha-siemsi-${state.currentFortune.no}.png`;
  await saveCanvasImage(els.fortuneExportCanvas, fileName, `ใบเซียมซีคืนเพ็ญใบที่ ${state.currentFortune.no}`);
}

async function jumpToKrathong(krathong) {
  if (krathong.location !== state.activeLocation) {
    await switchLocation(krathong.location, false);
  }
  scene.addOrLaunchKrathong(krathong, { animateLaunch: false });
  scene.spotlightKrathong(krathong.id, 9000);
  openWishInspector(krathong.id, krathong);
}

function renderLocationBreakdown(stats) {
  if (!stats || !stats.byLocation) return;
  const total = Math.max(1, stats.totalKrathongs);
  els.locationBreakdownBars.innerHTML = LOCATION_ORDER.map((locId) => {
    const loc = LOCATIONS[locId];
    const cnt = stats.byLocation[locId] || 0;
    const pct = Math.round((cnt / total) * 100);
    return `
      <div class="breakdown-row">
        <div class="breakdown-row__top">
          <span>${escapeHtml(loc.shortName)}</span>
          <span>${cnt.toLocaleString('th-TH')} กระทง (${pct}%)</span>
        </div>
        <div class="breakdown-track">
          <div class="breakdown-fill" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

/* ==========================================================================
   HELPERS & UI EVENT BINDING
   ========================================================================== */
function renderLocationBar() {
  els.locationBar.innerHTML = '';
  for (const locId of LOCATION_ORDER) {
    const loc = LOCATIONS[locId];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `loc-pill${locId === state.activeLocation ? ' active' : ''}`;
    btn.dataset.loc = locId;
    btn.innerHTML = `<span>${escapeHtml(loc.shortName)}</span><span class="loc-pill__count">0</span>`;
    btn.addEventListener('click', () => switchLocation(locId, true));
    els.locationBar.appendChild(btn);
  }
}

function handleCanvasHover(krathong, x, y) {
  if (!krathong || !els.studioModal.classList.contains('hidden') || !els.wishModal.classList.contains('hidden')) {
    els.tooltip.classList.remove('visible');
    return;
  }
  els.tooltipName.textContent = krathong.name;
  els.tooltipWish.textContent = `“${krathong.wish}”`;
  els.tooltipBlessings.textContent = `💛 ${Number(krathong.blessings || 0).toLocaleString('th-TH')} คำอวยพร`;

  const clampedX = Math.max(140, Math.min(window.innerWidth - 140, x));
  const clampedY = Math.max(120, y);
  els.tooltip.style.left = `${clampedX}px`;
  els.tooltip.style.top = `${clampedY}px`;
  els.tooltip.classList.add('visible');
}

function drawMiniNightWaterBackdrop(ctx, w, h, now, locId) {
  const loc = LOCATIONS[locId] || LOCATIONS['wat-arun'];
  const horizon = h * 0.42;

  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, loc.skyStops[0]);
  sky.addColorStop(1, loc.skyStops[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizon);

  // Soft moon behind preview krathong
  const mx = w * 0.78;
  const my = h * 0.22;
  const halo = ctx.createRadialGradient(mx, my, 4, mx, my, 62);
  halo.addColorStop(0, 'rgba(255, 240, 190, 0.36)');
  halo.addColorStop(1, 'rgba(255, 240, 190, 0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(mx, my, 62, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fae7b0';
  ctx.beginPath();
  ctx.arc(mx, my, 16, 0, Math.PI * 2);
  ctx.fill();

  // Water
  const water = ctx.createLinearGradient(0, horizon, 0, h);
  water.addColorStop(0, loc.waterStops[0]);
  water.addColorStop(1, loc.waterStops[2]);
  ctx.fillStyle = water;
  ctx.fillRect(0, horizon, w, h - horizon);

  // Subtle horizontal shimmer waves
  for (let i = 0; i < 8; i++) {
    const wy = horizon + 12 + i * ((h - horizon) / 8);
    const ox = Math.sin(now * 0.0018 + i) * 14;
    ctx.fillStyle = 'rgba(255, 232, 168, 0.07)';
    ctx.beginPath();
    ctx.ellipse(w * 0.5 + ox, wy, 48 + i * 8, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function pushLiveFeed(message, onClick = null, duration = 5600) {
  // Activity toast feed completely disabled per user request
}

function showSnackbar(message) {
  els.snackbar.textContent = message;
  els.snackbar.classList.remove('hidden');
  if (snackbarTimer) clearTimeout(snackbarTimer);
  snackbarTimer = setTimeout(() => {
    els.snackbar.classList.add('hidden');
  }, 3200);
}

function loadMyKrathongIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MY_IDS);
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveMyKrathongId(id) {
  if (!state.myKrathongIds.includes(id)) {
    state.myKrathongIds.unshift(id);
    state.myKrathongIds = state.myKrathongIds.slice(0, 40);
    try {
      localStorage.setItem(STORAGE_KEY_MY_IDS, JSON.stringify(state.myKrathongIds));
    } catch {
      // ignore storage quota
    }
    updateMyCountBadge();
  }
}

function updateMyCountBadge() {
  const count = state.myKrathongIds.length;
  els.myCountBadge.textContent = String(count);
  els.myCountBadge.classList.toggle('hidden', count === 0);
}

function setZenMode(enabled) {
  state.zenMode = enabled;
  document.body.classList.toggle('zen-mode', enabled);
  if (enabled) els.tooltip.classList.remove('visible');
}

function bindUIEvents() {
  // Prevent system copy/magnifier popup and blue selection highlight on long press
  window.addEventListener('contextmenu', (e) => {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  }, { passive: false });

  window.addEventListener('selectstart', (e) => {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  });

  // Primary Dock & Header Actions
  els.openStudioBtn.addEventListener('click', openStudioModal);
  els.emptyRiverCtaBtn.addEventListener('click', openStudioModal);
  els.lanternBtn.addEventListener('click', () => openLanternThrowExperience());
  els.lanternThrowBtn.addEventListener('click', () => scene.throwInteractiveLantern());
  els.lanternCancelBtn.addEventListener('click', () => scene.closeLanternThrowMode());
  els.fireworkBtn.addEventListener('click', () => openFireworkLauncherExperience());
  els.fireUfoBtn.addEventListener('click', () => scene.fireUfoRocket());
  els.chargeNagaBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    scene.startNagaCharge(false);
  });
  els.chargeNagaBtn.addEventListener('pointerup', () => scene.releaseNagaCharge());
  els.chargeNagaBtn.addEventListener('pointerleave', () => {
    if (scene.isFireworkLauncherActive()) scene.releaseNagaCharge();
  });
  els.fireworkCloseBtn.addEventListener('click', () => scene.closeFireworkLauncher());
  els.fortuneOpenBtn.addEventListener('click', openFortuneModal);
  els.siemsiCup.addEventListener('click', triggerSiemSiShake);
  els.shakeFortuneBtn.addEventListener('click', triggerSiemSiShake);
  els.reshakeFortuneBtn.addEventListener('click', () => {
    els.fortuneResultStage.classList.add('hidden');
    els.fortuneShakeStage.classList.remove('hidden');
    triggerSiemSiShake();
  });
  els.downloadFortuneBtn.addEventListener('click', downloadFortunePng);

  // Couple Mode toggle inside DIY Studio Step 2
  if (els.coupleModeToggle) {
    els.coupleModeToggle.addEventListener('change', () => {
      const isCouple = els.coupleModeToggle.checked;
      state.draft.isCouple = isCouple;
      els.coupleHeartSep.classList.toggle('hidden', !isCouple);
      els.partnerNameInput.classList.toggle('hidden', !isCouple);
      els.senderNameLabel.textContent = isCouple ? 'ชื่อคู่ลอยกระทง' : 'ชื่อผู้ลอยกระทง';
      els.senderNameInput.placeholder = isCouple ? 'ชื่อคนที่ 1...' : 'เช่น คุณแพรวา, น้องต้นกล้า...';
      els.senderNameInput.maxLength = isCouple ? 18 : 40;
      if (isCouple && els.senderNameInput.value.trim()) {
        els.partnerNameInput.focus();
      }
    });
  }
  els.myKrathongsDockBtn.addEventListener('click', () => openExploreDrawer('mine'));
  els.searchOpenBtn.addEventListener('click', () => openExploreDrawer('search'));
  els.statsPillBtn.addEventListener('click', () => openExploreDrawer('eco'));

  // Soundscape Toggle (Disabled per user request)
  if (els.soundToggleBtn) {
    els.soundToggleBtn.addEventListener('click', () => {
      const isOn = sound.toggle();
      els.soundToggleBtn.classList.toggle('active', isOn);
      if (els.soundIconOn) els.soundIconOn.classList.toggle('hidden', !isOn);
      if (els.soundIconOff) els.soundIconOff.classList.toggle('hidden', isOn);
    });
  }

  // Zen Mode Toggle
  els.zenModeBtn.addEventListener('click', () => setZenMode(true));
  els.exitZenBtn.addEventListener('click', () => setZenMode(false));

  // Studio Navigation
  els.randomizeBtn.addEventListener('click', randomizeDraft);
  els.stepTab1.addEventListener('click', () => setStudioStep(1));
  els.stepTab2.addEventListener('click', () => setStudioStep(2));
  els.goToStep2Btn.addEventListener('click', () => setStudioStep(2));
  els.backToStep1Btn.addEventListener('click', () => setStudioStep(1));
  els.studioStep2.addEventListener('submit', handleFloatSubmit);
  if (els.fantasyModeToggle) {
    els.fantasyModeToggle.addEventListener('change', updateSubmitButtonLabel);
  }

  // Fantasy Godzilla Shot Controls
  els.kaijuShootBtn.addEventListener('click', () => scene.shootGodzillaKrathong());
  if (els.kaijuSkipBtn) {
    els.kaijuSkipBtn.addEventListener('click', () => scene.skipGodzillaShot());
  }
  if (els.kaijuSoundBtn) {
    els.kaijuSoundBtn.addEventListener('click', () => {
      if (!sound.enabled) {
        sound.start();
        if (els.soundToggleBtn) els.soundToggleBtn.classList.add('active');
        if (els.soundIconOn) els.soundIconOn.classList.remove('hidden');
        if (els.soundIconOff) els.soundIconOff.classList.add('hidden');
      }
      els.kaijuSoundBtn.classList.add('hidden');
      sound.playKaijuRoar();
    });
  }

  els.partCategoryTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-tab');
    if (!btn) return;
    state.activePartCategory = btn.dataset.category;
    els.partCategoryTabs.querySelectorAll('.cat-tab').forEach((b) => {
      b.classList.toggle('active', b === btn);
    });
    renderPartOptions();
  });

  els.wishTextarea.addEventListener('input', () => {
    els.wishCharCount.textContent = `${els.wishTextarea.value.length} / 240`;
  });

  els.wishPresets.addEventListener('click', (e) => {
    const btn = e.target.closest('.preset-chip');
    if (!btn) return;
    const cat = btn.dataset.wishCat;
    const pool = CURATED_WISHES[cat] || [];
    if (pool.length === 0) return;
    const idx = state.wishCursor[cat] % pool.length;
    state.wishCursor[cat] = idx + 1;
    els.wishTextarea.value = pool[idx];
    els.wishCharCount.textContent = `${els.wishTextarea.value.length} / 240`;
  });

  // Wish Inspector Reactions & Share
  els.blessButtons.addEventListener('click', (e) => {
    const btn = e.target.closest('.bless-btn');
    if (!btn) return;
    sendBlessing(btn.dataset.reaction, btn);
  });

  els.openEcardFromWishBtn.addEventListener('click', () => {
    if (!state.inspectedKrathong) return;
    const item = state.inspectedKrathong;
    closeModal('wishModal');
    openEcardModal(item);
  });

  els.copyWishLinkBtn.addEventListener('click', () => {
    if (state.inspectedKrathong) copyKrathongLink(state.inspectedKrathong.id);
  });

  // E-Card Modal Actions
  els.downloadEcardBtn.addEventListener('click', downloadEcardPng);
  els.shareEcardBtn.addEventListener('click', shareEcardOrLink);
  els.copyEcardLinkBtn.addEventListener('click', () => {
    if (state.ecardKrathong) copyKrathongLink(state.ecardKrathong.id);
  });

  // Drawer Tabs & Search Input
  document.querySelectorAll('.drawer-tab').forEach((btn) => {
    btn.addEventListener('click', () => switchDrawerTab(btn.dataset.drawerTab));
  });

  els.globalSearchInput.addEventListener('input', () => {
    if (searchDebounce) clearTimeout(searchDebounce);
    searchDebounce = setTimeout(() => {
      runGlobalSearch(els.globalSearchInput.value.trim());
    }, 240);
  });

  // Generic Modal / Drawer Close Buttons & Backdrop Click
  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
  });

  [els.studioModal, els.wishModal, els.ecardModal, els.fortuneModal, els.exploreDrawer].forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal(backdrop.id);
    });
  });

  // Escape closes active overlay; Space shoots in Kaiju mode or throws in Lantern mode
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && scene && scene.isGodzillaActive()) {
      e.preventDefault();
      scene.shootGodzillaKrathong();
      return;
    }
    if (e.code === 'Space' && scene && scene.isLanternThrowActive()) {
      e.preventDefault();
      scene.throwInteractiveLantern();
      return;
    }
    if (e.code === 'Space' && scene && scene.isFireworkLauncherActive() && !e.repeat) {
      e.preventDefault();
      scene.startNagaCharge(false);
      return;
    }
    if (e.key !== 'Escape') return;
    if (scene && scene.isGodzillaActive()) scene.skipGodzillaShot();
    else if (scene && scene.isLanternThrowActive()) scene.closeLanternThrowMode();
    else if (scene && scene.isFireworkLauncherActive()) scene.closeFireworkLauncher();
    else if (!els.fortuneModal.classList.contains('hidden')) closeModal('fortuneModal');
    else if (!els.ecardModal.classList.contains('hidden')) closeModal('ecardModal');
    else if (!els.wishModal.classList.contains('hidden')) closeModal('wishModal');
    else if (!els.studioModal.classList.contains('hidden')) closeModal('studioModal');
    else if (!els.exploreDrawer.classList.contains('hidden')) closeModal('exploreDrawer');
    else if (state.zenMode) setZenMode(false);
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && scene && scene.isFireworkLauncherActive()) {
      scene.releaseNagaCharge();
    }
  });

  // Reset any iOS Safari / in-app viewport displacement when closing virtual keyboard
  document.addEventListener('focusout', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
    }
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

init();
