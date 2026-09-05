/**
 * ==========================================================================
 * CHROME TAB EVICTION COURT - COURTROOM ENGINE
 * Full Retro Arcade Courtroom: Audio Engine, Typewriter Dialogue,
 * Sprite State Machine, Speech Recognition & FastAPI AI Handshake
 * ==========================================================================
 */

// --- 1. CONFIGURATION & BACKEND HANDSHAKE ---
const CONFIG = {
  // Live FastAPI backend with automatic graceful mock fallback if offline
  USE_MOCK: false,
  API_URL: "http://127.0.0.1:8000/judge",
  MOCK_LATENCY_MS: 1800,
  TYPEWRITER_SPEED_MS: 36,
  TYPEWRITER_SOUND_INTERVAL: 3,
  AUDIO_ENABLED: true,
  PARDON_CLOSE_DELAY_MS: 5000
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
  audioMuted: !CONFIG.AUDIO_ENABLED,
  audioUnlocked: false,
  isRecording: false,
  isSubmitting: false,
  currentPhase: 'ARRAIGNMENT', // 'ARRAIGNMENT' | 'DELIBERATING' | 'VERDICT'
  currentJudgeSprite: 'normal_idle'
};

// --- 4. DOM ELEMENTS ---
const DOM = {
  container: document.getElementById('courtroom-container'),
  accusedTitle: document.getElementById('accused-title'),
  accusedUrl: document.getElementById('accused-url'),
  caseId: document.getElementById('case-id'),
  engineStatus: document.getElementById('engine-status'),
  audioBtn: document.getElementById('audio-btn'),
  audioUnlockPrompt: document.getElementById('audio-unlock-prompt'),
  judgeSprite: document.getElementById('judge-sprite'),
  dialogueContainer: document.getElementById('dialogue-container'),
  dialogueSpeaker: document.getElementById('dialogue-speaker'),
  dialogueContent: document.getElementById('dialogue-content'),
  promptIndicator: document.getElementById('prompt-indicator'),
  deliberationBanner: document.getElementById('deliberation-banner'),
  pleaInput: document.getElementById('plea-input'),
  micBtn: document.getElementById('mic-btn'),
  micBtnText: document.getElementById('mic-btn-text'),
  recordingStatus: document.getElementById('recording-status'),
  submitBtn: document.getElementById('submit-btn'),
  presetChips: document.querySelectorAll('.preset-chip'),
  verdictStampContainer: document.getElementById('verdict-stamp-container'),
  verdictStamp: document.getElementById('verdict-stamp'),
  resurrectAlert: document.getElementById('resurrect-alert'),
  pdfContainer: document.getElementById('pdf-container'),
  pdfDownloadBtn: document.getElementById('pdf-download-btn')
};

// --- 5. AUDIO ENGINE (SOUND CONTROLLER) ---
class SoundController {
  constructor() {
    this.muted = STATE.audioMuted;
    this.unlocked = false;

    // Standard audio objects
    this.sounds = {
      gavel: new Audio(ASSETS.audio.gavel),
      objection: new Audio(ASSETS.audio.objection),
      acquitted: new Audio(ASSETS.audio.acquitted)
    };

    // Continuous typewriter audio loop
    this.typewriterAudio = new Audio(ASSETS.audio.typewriter);
    this.typewriterAudio.loop = true;
    this.typewriterAudio.volume = 0.55;

    // Set volumes for dramatic balance
    this.sounds.gavel.volume = 0.9;
    this.sounds.objection.volume = 0.85;
    this.sounds.acquitted.volume = 0.85;

    this.initAutoplay();
  }

  /**
   * Check browser autoplay permissions and set up seamless unlock
   */
  initAutoplay() {
    const testAudio = new Audio(ASSETS.audio.typewriter);
    testAudio.volume = 0.01;
    const playPromise = testAudio.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.unlocked = true;
          STATE.audioUnlocked = true;
          testAudio.pause();
          if (DOM.audioUnlockPrompt) DOM.audioUnlockPrompt.style.display = 'none';
        })
        .catch(() => {
          this.unlocked = false;
          STATE.audioUnlocked = false;
          if (DOM.audioUnlockPrompt) DOM.audioUnlockPrompt.style.display = 'block';
        });
    }

    // Gesture unlock on first user click or keypress
    const unlockHandler = () => {
      this.unlocked = true;
      STATE.audioUnlocked = true;
      if (DOM.audioUnlockPrompt) DOM.audioUnlockPrompt.style.display = 'none';

      Object.values(this.sounds).forEach(s => s.load());
      this.typewriterAudio.load();

      window.removeEventListener('pointerdown', unlockHandler);
      window.removeEventListener('keydown', unlockHandler);
    };

    window.addEventListener('pointerdown', unlockHandler, { passive: true });
    window.addEventListener('keydown', unlockHandler, { passive: true });
  }

  /**
   * Starts the typewriter typing sound loop
   */
  startTypewriter() {
    if (this.muted) return;
    try {
      this.typewriterAudio.currentTime = 0;
      const p = this.typewriterAudio.play();
      if (p !== undefined) p.catch(() => {});
    } catch (e) {}
  }

  /**
   * Immediately stops the typewriter typing sound loop
   */
  stopTypewriter() {
    try {
      this.typewriterAudio.pause();
      this.typewriterAudio.currentTime = 0;
    } catch (e) {}
  }

  /**
   * Play a named courtroom sound effect
   */
  play(name) {
    if (this.muted) return;
    const snd = this.sounds[name];
    if (snd) {
      snd.currentTime = 0;
      const p = snd.play();
      if (p !== undefined) {
        p.catch(err => console.warn(`[Audio] Blocked on play(${name}):`, err));
      }
    }
  }

  /**
   * Toggle mute state
   */
  toggleMute() {
    this.muted = !this.muted;
    STATE.audioMuted = this.muted;
    if (this.muted) {
      this.stopTypewriter();
    }
    return this.muted;
  }
}

// Global Sound Controller Instance
const sound = new SoundController();

// --- 6. TYPEWRITER DIALOGUE ENGINE ---
class TypewriterEngine {
  constructor(soundController) {
    this.soundController = soundController;
    this.isTyping = false;
    this.timeoutId = null;
    this.fullText = '';
    this.charIndex = 0;
    this.charSoundCounter = 0;
    this.onCompleteCallback = null;
    this.speed = CONFIG.TYPEWRITER_SPEED_MS || 36;
    this.soundInterval = CONFIG.TYPEWRITER_SOUND_INTERVAL || 3;
  }

  /**
   * Type out text character-by-character into the dialogue box
   * @param {string} text 
   * @param {object} options 
   * @returns {Promise<void>}
   */
  type(text, options = {}) {
    this.stop();

    this.fullText = text;
    this.charIndex = 0;
    this.charSoundCounter = 0;
    this.isTyping = true;
    this.speed = options.speed || CONFIG.TYPEWRITER_SPEED_MS || 36;
    this.soundInterval = options.soundInterval || CONFIG.TYPEWRITER_SOUND_INTERVAL || 3;
    this.onStart = options.onStart || null;
    this.onComplete = options.onComplete || null;

    if (DOM.dialogueContainer) {
      DOM.dialogueContainer.classList.add('is-typing');
    }
    if (DOM.promptIndicator) {
      DOM.promptIndicator.style.display = 'none';
    }
    if (DOM.dialogueContent) {
      DOM.dialogueContent.textContent = '';
    }

    if (this.onStart) this.onStart();

    // Start authentic typewriter audio track
    this.soundController.startTypewriter();

    return new Promise((resolve) => {
      this.onCompleteCallback = () => {
        this.soundController.stopTypewriter();
        if (DOM.dialogueContainer) {
          DOM.dialogueContainer.classList.remove('is-typing');
        }
        if (DOM.promptIndicator) {
          DOM.promptIndicator.style.display = 'block';
        }
        if (this.onComplete) this.onComplete();
        resolve();
      };

      this.step();
    });
  }

  /**
   * Process a single character step
   */
  step() {
    if (!this.isTyping) return;

    if (this.charIndex < this.fullText.length) {
      const char = this.fullText.charAt(this.charIndex);
      this.charIndex++;

      if (DOM.dialogueContent) {
        DOM.dialogueContent.textContent = this.fullText.substring(0, this.charIndex);
      }

      // Natural pauses at punctuation for cadence
      let delay = this.speed;
      if (char === '.' || char === '!' || char === '?') {
        delay = this.speed * 4.2;
        this.soundController.typewriterAudio.pause();
      } else if (char === ',' || char === ';' || char === ':') {
        delay = this.speed * 2.2;
      } else {
        if (!this.soundController.muted && this.soundController.typewriterAudio.paused) {
          this.soundController.typewriterAudio.play().catch(() => {});
        }
      }

      this.timeoutId = setTimeout(() => this.step(), delay);
    } else {
      this.finish();
    }
  }

  /**
   * Fast-forward / skip dialogue to the end immediately
   */
  skip() {
    if (!this.isTyping) return;
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.soundController.stopTypewriter();
    if (DOM.dialogueContent) {
      DOM.dialogueContent.textContent = this.fullText;
    }
    this.finish();
  }

  /**
   * Finalize the typing process
   */
  finish() {
    this.isTyping = false;
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.soundController.stopTypewriter();
    if (this.onCompleteCallback) {
      const cb = this.onCompleteCallback;
      this.onCompleteCallback = null;
      cb();
    }
  }

  /**
   * Immediately halt any running typewriter sequence
   */
  stop() {
    this.isTyping = false;
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.soundController.stopTypewriter();
    this.onCompleteCallback = null;
    if (DOM.dialogueContainer) {
      DOM.dialogueContainer.classList.remove('is-typing');
    }
  }
}

// Global Typewriter Engine Instance
const typewriter = new TypewriterEngine(sound);

// --- 7. SPRITE STATE CONTROLLER ---
function setJudgeSprite(stateName) {
  const spriteSrc = ASSETS.sprites[stateName];
  if (!spriteSrc || !DOM.judgeSprite) return;

  STATE.currentJudgeSprite = stateName;
  DOM.judgeSprite.src = spriteSrc;

  // Toggle gavel styling offset if state is gavel
  if (stateName === 'gavel') {
    DOM.judgeSprite.classList.add('gavel-active');
  } else {
    DOM.judgeSprite.classList.remove('gavel-active');
  }
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

// --- 8. SPEECH RECOGNITION (VOICE PLEAS) ---
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (DOM.micBtn) {
      DOM.micBtn.title = "Voice recognition not supported in this browser.";
    }
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    STATE.isRecording = true;
    if (DOM.micBtn) DOM.micBtn.classList.add('recording');
    if (DOM.micBtnText) DOM.micBtnText.textContent = "LISTENING...";
    if (DOM.recordingStatus) DOM.recordingStatus.style.display = 'flex';
  };

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    if (DOM.pleaInput && transcript) {
      DOM.pleaInput.value = transcript;
    }
  };

  recognition.onerror = (err) => {
    console.warn("[Speech Recognition Error]:", err);
    stopRecording();
  };

  recognition.onend = () => {
    stopRecording();
  };

  function stopRecording() {
    STATE.isRecording = false;
    if (DOM.micBtn) DOM.micBtn.classList.remove('recording');
    if (DOM.micBtnText) DOM.micBtnText.textContent = "VOICE PLEA";
    if (DOM.recordingStatus) DOM.recordingStatus.style.display = 'none';
  }

  if (DOM.micBtn) {
    DOM.micBtn.addEventListener('click', () => {
      if (STATE.isRecording) {
        recognition.stop();
      } else {
        try {
          recognition.start();
        } catch (e) {
          console.warn("[Speech] Recognition start error:", e);
        }
      }
    });
  }
}

// --- 9. SUBMIT PLEA & VERDICT HANDSHAKE ---
async function submitPlea() {
  if (STATE.isSubmitting || STATE.currentPhase === 'DELIBERATING') return;

  const plea = (DOM.pleaInput ? DOM.pleaInput.value : "").trim() || "No statement entered. I throw myself upon the mercy of the Court.";

  STATE.isSubmitting = true;
  STATE.currentPhase = 'DELIBERATING';

  // Disable controls while deliberating
  if (DOM.submitBtn) DOM.submitBtn.disabled = true;
  if (DOM.micBtn) DOM.micBtn.disabled = true;
  if (DOM.pleaInput) DOM.pleaInput.disabled = true;

  // Show deliberation banner and switch to thinking judge
  if (DOM.deliberationBanner) DOM.deliberationBanner.style.display = 'block';
  setJudgeSprite('thinking');

  // Type initial deliberation text
  typewriter.type("The Court is in recess. The Honorable Magistrate Bit-Shift is reviewing your plea and conferring with the local neural bailiff...", {
    speed: 30
  });

  let verdictData = null;

  // 1. Attempt Live FastAPI Backend
  if (!CONFIG.USE_MOCK) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const res = await fetch(CONFIG.API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tab_url: STATE.accusedUrl,
          tab_title: STATE.accusedTitle,
          plea_text: plea
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        verdictData = await res.json();
        if (typeof verdictData === "string") {
          verdictData = JSON.parse(verdictData);
        }
      } else {
        console.warn("[Courtroom API] Server returned non-200 status:", res.status);
      }
    } catch (err) {
      console.warn("[Courtroom API] Connection failed, activating internal mock fallback:", err);
    }
  }

  // 2. Graceful Mock Fallback (if backend is offline or mock enabled)
  if (!verdictData) {
    await new Promise(r => setTimeout(r, CONFIG.MOCK_LATENCY_MS));
    const isGuilty = Math.random() > 0.35;
    const fallbackCaseId = `mock-${Math.random().toString(36).substring(2, 9)}`;
    verdictData = {
      verdict: isGuilty ? "GUILTY" : "INNOCENT",
      sentence: isGuilty
        ? "Your transparent excuses crumble before this bench! The Court finds you guilty of terminal digital hoarding."
        : "The Court acknowledges your legitimate focus efforts. Case dismissed, go forth and be productive!",
      confidence: 0.88,
      case_id: fallbackCaseId,
      pdf_download_url: `http://127.0.0.1:8000/order/${fallbackCaseId}.pdf`
    };
  }

  // 3. Render Judicial Ruling
  handleVerdict(verdictData);
}

/**
 * Handle and animate the formal judicial verdict
 */
function handleVerdict(data) {
  STATE.currentPhase = 'VERDICT';
  if (DOM.deliberationBanner) DOM.deliberationBanner.style.display = 'none';

  const verdict = (data.verdict || "GUILTY").toUpperCase();
  const isGuilty = verdict.includes("GUILTY");
  const sentence = data.sentence || "No statement rendered from the bench.";

  // Display Verdict Stamp
  if (DOM.verdictStampContainer && DOM.verdictStamp) {
    DOM.verdictStampContainer.style.display = 'flex';
    DOM.verdictStamp.className = `verdict-stamp ${isGuilty ? 'guilty' : 'pardoned'} stamp-slam`;
    DOM.verdictStamp.textContent = isGuilty ? "GUILTY" : "PARDONED";
  }

  if (isGuilty) {
    // GUILTY FLOW:
    sound.play('gavel');
    setJudgeSprite('gavel');

    setTimeout(() => {
      setJudgeSprite('stern_talking');
    }, 850);

    // Show pinned tab penalty alert
    if (DOM.resurrectAlert) {
      DOM.resurrectAlert.style.display = 'block';
    }

    // Trigger Chrome Extension tab resurrection in background without stealing court focus
    if (window.chrome && chrome.runtime && chrome.runtime.sendMessage) {
      setTimeout(() => {
        try {
          if (chrome.tabs && chrome.tabs.getCurrent) {
            chrome.tabs.getCurrent((currentTab) => {
              const tabId = currentTab ? currentTab.id : null;
              const winId = currentTab ? currentTab.windowId : null;

              chrome.runtime.sendMessage({
                action: "REVIVE_TAB",
                url: STATE.accusedUrl,
                courtTabId: tabId,
                courtWindowId: winId
              }, (response) => {
                if (chrome.runtime.lastError) {
                  console.warn("[Tab Courtroom] Tab revival message error:", chrome.runtime.lastError.message);
                } else {
                  console.log("[Tab Courtroom] Tab revived in background:", response);
                }
                window.focus();
                if (winId && chrome.windows) {
                  chrome.windows.update(winId, { focused: true }).catch(() => {});
                }
              });
            });
          } else {
            chrome.runtime.sendMessage({ action: "REVIVE_TAB", url: STATE.accusedUrl });
          }
        } catch (e) {
          console.warn("[Tab Courtroom] Tab revival dispatch error:", e);
        }
      }, 500);
    }

    // Type dramatic verdict speech
    const speech = `VERDICT: GUILTY AS CHARGED!\n\n"${sentence}"`;
    typewriter.type(speech, {
      speed: CONFIG.TYPEWRITER_SPEED_MS,
      onComplete: () => {
        setJudgeSprite('stern_idle');
      }
    });

  } else {
    // PARDONED FLOW:
    sound.play('acquitted');
    setJudgeSprite('nodding');

    setTimeout(() => {
      setJudgeSprite('normal_talking');
    }, 950);

    if (DOM.resurrectAlert) {
      DOM.resurrectAlert.style.display = 'none';
    }

    // Type forgiving verdict speech
    const speech = `VERDICT: PARDONED / CLEARED!\n\n"${sentence}"`;
    typewriter.type(speech, {
      speed: CONFIG.TYPEWRITER_SPEED_MS,
      onComplete: () => {
        setJudgeSprite('normal_idle');
      }
    });
  }

  // Display PDF Court Order Download Button
  if (data.pdf_download_url && DOM.pdfContainer && DOM.pdfDownloadBtn) {
    DOM.pdfDownloadBtn.href = data.pdf_download_url;
    DOM.pdfContainer.style.display = 'flex';
  }

  // Reset controls
  if (DOM.submitBtn) {
    DOM.submitBtn.disabled = false;
    DOM.submitBtn.innerHTML = '<span>⚖️</span><span>NEW TRIAL</span>';
    DOM.submitBtn.onclick = () => window.location.reload();
  }
}

// --- 10. INITIALIZATION & ARRAIGNMENT SPEECH ---
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

  // Preload Sprites
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
      const isMuted = sound.toggleMute();
      DOM.audioBtn.textContent = isMuted ? "🔇 SFX: OFF" : "🔊 SFX: ON";
      DOM.audioBtn.style.color = isMuted ? "#888" : "var(--gold-primary)";
    });
  }

  // Bind Dialogue Skip (Click dialogue box or press Space)
  if (DOM.dialogueContainer) {
    DOM.dialogueContainer.addEventListener('click', () => {
      if (typewriter.isTyping) {
        typewriter.skip();
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && document.activeElement !== DOM.pleaInput) {
      if (typewriter.isTyping) {
        e.preventDefault();
        typewriter.skip();
      }
    }
  });

  // Bind Audio Unlock Banner Click
  if (DOM.audioUnlockPrompt) {
    DOM.audioUnlockPrompt.addEventListener('click', () => {
      sound.unlocked = true;
      STATE.audioUnlocked = true;
      DOM.audioUnlockPrompt.style.display = 'none';
      startArraignment();
    });
  }

  // Bind Submit Plea Button
  if (DOM.submitBtn) {
    DOM.submitBtn.addEventListener('click', submitPlea);
  }

  // Allow Ctrl+Enter to submit plea inside textarea
  if (DOM.pleaInput) {
    DOM.pleaInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        submitPlea();
      }
    });
  }

  // Initialize Speech Recognition
  initSpeechRecognition();

  console.log("⚖️ [TAB COURT] Courtroom Engine Online.", {
    case: STATE.caseId,
    title: STATE.accusedTitle,
    url: STATE.accusedUrl,
    mock: CONFIG.USE_MOCK
  });

  // --- START INITIAL ARRAIGNMENT SPEECH ---
  startArraignment();
}

/**
 * Executes the initial courtroom charge reading
 */
function startArraignment() {
  STATE.currentPhase = 'ARRAIGNMENT';

  const chargeSpeech = `Court is now in session! Defendant, you stand accused of UNAUTHORIZED TAB MURDER for the tab: "${STATE.accusedTitle}". How do you plead?!`;

  typewriter.type(chargeSpeech, {
    speed: CONFIG.TYPEWRITER_SPEED_MS,
    soundInterval: CONFIG.TYPEWRITER_SOUND_INTERVAL,
    onStart: () => {
      setJudgeSprite('normal_talking');
    },
    onComplete: () => {
      setJudgeSprite('normal_idle');
      if (DOM.pleaInput) {
        DOM.pleaInput.focus();
      }
    }
  });
}

// Kick off initialization on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCourtroom);
} else {
  initCourtroom();
}
