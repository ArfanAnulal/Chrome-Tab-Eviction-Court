/**
 * ==========================================================================
 * CHROME TAB EVICTION COURT - COURTROOM ENGINE
 * Dev 2 Scope: Frontend State Machine, Sprites, Audio, Speech & Retro Polish
 * ==========================================================================
 */

// --- 1. CONFIGURATION & DEV 1 HANDSHAKE ---
const CONFIG = {
  // Toggle this to false when Dev 1 provides the live FastAPI server
  USE_MOCK: true,
  API_URL: "http://127.0.0.1:8000/judge",
  MOCK_LATENCY_MS: 2000,
  TYPEWRITER_SPEED_MS: 25,
  AUDIO_ENABLED: true,
  PARDON_CLOSE_DELAY_MS: 4000
};

// --- 2. ASSET DICTIONARY ---
const ASSETS = {
  sprites: {
    normal_idle: 'assets/Judge_Normal_Idle.gif',
    normal_talking: 'assets/Judge_Normal_Talking.gif',
    thinking: 'assets/Judge_Thinking.gif',
    surprised: 'assets/Judge_Surprised.gif',
    stern_idle: 'assets/Judge_Stern_Idle.gif',
    stern_talking: 'assets/Judge_Stern_Talking.gif',
    gavel: 'assets/Judge_Gavel.gif',
    nodding: 'assets/Judge_Nodding.gif'
  },
  audio: {
    gavel: 'assets/gavel.mp3',
    objection: 'assets/objection.mp3',
    typewriter: 'assets/typewriter.mp3',
    acquitted: 'assets/acquitted.mp3'
  }
};

// --- 3. RUNTIME STATE ---
const STATE = {
  accusedTitle: '',
  accusedUrl: '',
  caseId: '',
  audioMuted: false,
  isRecording: false,
  currentPhase: 'ARRAIGNMENT' // 'ARRAIGNMENT' | 'DELIBERATING' | 'GUILTY' | 'PARDONED'
};

// --- 4. DOM ELEMENTS ---
const DOM = {
  container: document.getElementById('courtroom-container'),
  accusedTitle: document.getElementById('accused-title'),
  accusedUrl: document.getElementById('accused-url'),
  caseId: document.getElementById('case-id'),
  engineStatus: document.getElementById('engine-status'),
  audioBtn: document.getElementById('audio-btn'),
  judgeSprite: document.getElementById('judge-sprite'),
  dialogueSpeaker: document.getElementById('dialogue-speaker'),
  dialogueText: document.getElementById('dialogue-text'),
  deliberationBanner: document.getElementById('deliberation-banner'),
  pleaInput: document.getElementById('plea-input'),
  micBtn: document.getElementById('mic-btn'),
  micBtnText: document.getElementById('mic-btn-text'),
  recordingStatus: document.getElementById('recording-status'),
  submitBtn: document.getElementById('submit-btn'),
  presetChips: document.querySelectorAll('.preset-chip'),
  verdictStampContainer: document.getElementById('verdict-stamp-container'),
  verdictStamp: document.getElementById('verdict-stamp'),
  resurrectAlert: document.getElementById('resurrect-alert')
};

// --- 5. INITIALIZATION (STEP 1: VISUAL STAGE & HUD BINDINGS) ---
function initCourtroom() {
  // Parse query parameters passed by Chrome tab interceptor
  const urlParams = new URLSearchParams(window.location.search);
  STATE.accusedTitle = urlParams.get('title') || "Wikipedia: List of Unfinished Projects";
  STATE.accusedUrl = urlParams.get('url') || "https://en.wikipedia.org/wiki/List_of_unsolved_problems";

  // Generate randomized retro case ID
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  STATE.caseId = `CASE #TAB-${randomNum}`;

  // Update HUD
  if (DOM.accusedTitle) DOM.accusedTitle.textContent = STATE.accusedTitle;
  if (DOM.accusedUrl) DOM.accusedUrl.textContent = STATE.accusedUrl;
  if (DOM.caseId) DOM.caseId.textContent = STATE.caseId;

  if (DOM.engineStatus) {
    DOM.engineStatus.textContent = CONFIG.USE_MOCK ? "MOCK GPU JURY" : "LOCAL OLLAMA (LIVE)";
    if (!CONFIG.USE_MOCK) DOM.engineStatus.classList.remove('mock-active');
  }

  // Preload Sprites to avoid pop-in during trial
  preloadSprites();

  // Bind Quick Plea Chips
  DOM.presetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const plea = chip.getAttribute('data-plea');
      if (DOM.pleaInput && plea) {
        DOM.pleaInput.value = plea;
        DOM.pleaInput.focus();
      }
    });
  });

  // Bind Audio Toggle Button
  if (DOM.audioBtn) {
    DOM.audioBtn.addEventListener('click', () => {
      STATE.audioMuted = !STATE.audioMuted;
      DOM.audioBtn.textContent = STATE.audioMuted ? "🔇 SFX: OFF" : "🔊 SFX: ON";
      DOM.audioBtn.style.color = STATE.audioMuted ? "#888" : "var(--gold-primary)";
    });
  }

  console.log("⚖️ [TAB COURT] Step 1 Courtroom Stage Initialized.", {
    case: STATE.caseId,
    title: STATE.accusedTitle,
    url: STATE.accusedUrl,
    mock: CONFIG.USE_MOCK
  });
}

/**
 * Preload all judge animation frames into browser cache
 */
function preloadSprites() {
  Object.values(ASSETS.sprites).forEach(src => {
    const img = new Image();
    img.src = src;
  });
}

// Kick off initialization on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCourtroom);
} else {
  initCourtroom();
}
