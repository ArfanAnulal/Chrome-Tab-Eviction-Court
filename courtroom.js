/**
 * ==========================================================================
 * CHROME TAB EVICTION COURT - COURTROOM ENGINE
 * Dev 2 Scope: Step 2 Audio Engine & Step 3 Judge Sprite State Machine
 * ==========================================================================
 */

// --- 1. CONFIGURATION & DEV 1 HANDSHAKE ---
const CONFIG = {
  // Toggle to false when Dev 1 provides the live FastAPI server
  USE_MOCK: true,
  API_URL: "http://127.0.0.1:8000/judge",
  MOCK_LATENCY_MS: 2000,
  TYPEWRITER_SPEED_MS: 38,       // Natural retro dialogue cadence
  TYPEWRITER_SOUND_INTERVAL: 3,  // Balanced mechanical clack rhythm
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
  audioMuted: !CONFIG.AUDIO_ENABLED,
  audioUnlocked: false,
  isRecording: false,
  currentPhase: 'INIT', // 'INIT' | 'AWAITING_UNLOCK' | 'ARRAIGNMENT' | 'AWAITING_PLEA' | 'DELIBERATING' | 'VERDICT_GUILTY' | 'VERDICT_PARDONED'
  currentJudgeSprite: 'normal_idle',
  submittedPlea: ''
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
  gavelCutscene: document.getElementById('gavel-cutscene'),
  gavelCutsceneImg: document.getElementById('gavel-cutscene-img')
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

    // Continuous typewriter audio loop (assets/typewriter.mp3 is 4.34s typing recording)
    this.typewriterAudio = new Audio(ASSETS.audio.typewriter);
    this.typewriterAudio.loop = true;
    this.typewriterAudio.volume = 0.55;

    // Set volumes for dramatic balance
    this.sounds.gavel.volume = 0.9;
    this.sounds.objection.volume = 0.85;
    this.sounds.acquitted.volume = 0.85;
  }

  /**
   * Check if browser allows autoplay without initial interaction
   */
  checkAutoplay(onAllowed, onBlocked) {
    const testAudio = new Audio(ASSETS.audio.objection);
    testAudio.volume = 0.001;
    const p = testAudio.play();

    if (p !== undefined) {
      p.then(() => {
        this.unlocked = true;
        STATE.audioUnlocked = true;
        testAudio.pause();
        testAudio.currentTime = 0;
        if (DOM.audioUnlockPrompt) DOM.audioUnlockPrompt.style.display = 'none';
        if (onAllowed) onAllowed();
      }).catch(() => {
        this.unlocked = false;
        STATE.audioUnlocked = false;
        if (DOM.audioUnlockPrompt) DOM.audioUnlockPrompt.style.display = 'block';
        if (onBlocked) onBlocked();
      });
    } else {
      if (onBlocked) onBlocked();
    }
  }

  /**
   * Unlock audio engine upon first user interaction
   */
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    STATE.audioUnlocked = true;

    if (DOM.audioUnlockPrompt) {
      DOM.audioUnlockPrompt.style.display = 'none';
    }

    // Warm up all audio instances
    Object.values(this.sounds).forEach(snd => {
      snd.play().then(() => {
        snd.pause();
        snd.currentTime = 0;
      }).catch(() => {});
    });

    // If typewriter is currently in typing mode, resume typing sound immediately
    if (typewriter && typewriter.isTyping && !this.muted) {
      this.startTypewriter();
    }
  }

  /**
   * Starts the typewriter audio loop
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
   * Immediately stops the typewriter audio loop
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
        p.catch(err => console.warn(`[Audio] Play blocked for ${name}:`, err));
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
    } else {
      // Play brief feedback chime when unmuting so user knows speakers are working
      this.play('objection');
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
    this.onCompleteCallback = null;
    this.speed = CONFIG.TYPEWRITER_SPEED_MS;
  }

  /**
   * Type out text character-by-character into dialogue box
   * @param {string} text 
   * @param {object} options 
   * @returns {Promise<void>}
   */
  type(text, options = {}) {
    this.stop();

    this.fullText = text;
    this.charIndex = 0;
    this.isTyping = true;
    this.speed = options.speed || CONFIG.TYPEWRITER_SPEED_MS;
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

    // Start authentic typewriter audio loop
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

      // Add natural pauses at punctuation for realistic cadence
      let delay = this.speed;
      if (char === '.' || char === '!' || char === '?') {
        delay = this.speed * 4.2;
        this.soundController.typewriterAudio.pause();
      } else if (char === ',' || char === ';' || char === ':') {
        delay = this.speed * 2.0;
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
   * Fast-forward / skip dialogue immediately
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
   * Finalize typing process
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

  // Toggle gavel offset class
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

// --- 8. STEP 3: COURTROOM FINITE STATE MACHINE (FSM) ---
const CourtroomFSM = {
  /**
   * Transition to a new courtroom phase
   * @param {string} newPhase 
   * @param {object} payload 
   */
  transitionTo(newPhase, payload = {}) {
    console.log(`⚖️ [FSM] State Transition: ${STATE.currentPhase} -> ${newPhase}`, payload);
    STATE.currentPhase = newPhase;

    switch (newPhase) {
      case 'AWAITING_UNLOCK':
        this.enterAwaitingUnlock();
        break;

      case 'ARRAIGNMENT':
        this.enterArraignment();
        break;

      case 'AWAITING_PLEA':
        this.enterAwaitingPlea();
        break;

      case 'DELIBERATING':
        this.enterDeliberating(payload.plea);
        break;

      case 'VERDICT_GUILTY':
        this.enterVerdictGuilty(payload.plea);
        break;

      case 'VERDICT_PARDONED':
        this.enterVerdictPardoned(payload.plea);
        break;
    }
  },

  enterAwaitingUnlock() {
    setJudgeSprite('normal_idle');
    if (DOM.audioUnlockPrompt) {
      DOM.audioUnlockPrompt.style.display = 'block';
    }
    if (DOM.dialogueContent) {
      DOM.dialogueContent.innerHTML = '⚖️ COURT IS IN SESSION.<br><span style="color: #ffd700; font-size: 13px;">[ 🔊 CLICK ANYWHERE TO COMMENCE & UNMUTE AUDIO ]</span>';
    }
    if (DOM.promptIndicator) {
      DOM.promptIndicator.style.display = 'block';
    }
  },

  enterArraignment() {
    if (DOM.audioUnlockPrompt) {
      DOM.audioUnlockPrompt.style.display = 'none';
    }
    if (DOM.verdictStampContainer) {
      DOM.verdictStampContainer.classList.remove('active');
    }
    if (DOM.gavelCutscene) {
      DOM.gavelCutscene.classList.remove('active');
    }
    if (DOM.resurrectAlert) {
      DOM.resurrectAlert.style.display = 'none';
    }

    const chargeSpeech = `Court is now in session! Defendant, you stand accused of UNAUTHORIZED TAB MURDER for the tab: "${STATE.accusedTitle}". How do you plead?!`;

    typewriter.type(chargeSpeech, {
      speed: CONFIG.TYPEWRITER_SPEED_MS,
      onStart: () => {
        setJudgeSprite('normal_talking');
      },
      onComplete: () => {
        setJudgeSprite('normal_idle');
        this.transitionTo('AWAITING_PLEA');
      }
    });
  },

  enterAwaitingPlea() {
    setJudgeSprite('normal_idle');
    if (DOM.pleaInput) {
      DOM.pleaInput.disabled = false;
      DOM.pleaInput.focus();
    }
    if (DOM.submitBtn) DOM.submitBtn.disabled = false;
    if (DOM.micBtn) DOM.micBtn.disabled = false;
  },

  enterDeliberating(pleaText) {
    // 1. Play dramatic OBJECTION sting
    sound.play('objection');

    // 2. Lock defendant input dock
    if (DOM.pleaInput) DOM.pleaInput.disabled = true;
    if (DOM.submitBtn) DOM.submitBtn.disabled = true;
    if (DOM.micBtn) DOM.micBtn.disabled = true;

    // 3. Switch judge sprite to thinking
    setJudgeSprite('thinking');

    // 4. Show deliberation progress banner
    if (DOM.deliberationBanner) {
      DOM.deliberationBanner.classList.add('active');
    }

    // 5. Judge deliberate monologue
    typewriter.type("OBJECTION! The Court will now deliberate on your testimony...", {
      speed: 30,
      onComplete: () => {
        // Wait simulated Ollama GPU deliberation latency
        setTimeout(() => {
          // Check plea keywords: cat or cheaper deal gets pardon, otherwise 50/50
          const lowerPlea = (pleaText || '').toLowerCase();
          const isPardoned = lowerPlea.includes('cat') || lowerPlea.includes('cheaper') || Math.random() < 0.35;

          if (isPardoned) {
            this.transitionTo('VERDICT_PARDONED', { plea: pleaText });
          } else {
            this.transitionTo('VERDICT_GUILTY', { plea: pleaText });
          }
        }, CONFIG.MOCK_LATENCY_MS);
      }
    });
  },

  enterVerdictGuilty(pleaText) {
    // Hide deliberation marquee
    if (DOM.deliberationBanner) {
      DOM.deliberationBanner.classList.remove('active');
    }

    // Step 1: Flash surprised judge (350ms)
    setJudgeSprite('surprised');

    setTimeout(() => {
      // Step 2: Full-screen Gavel strike cutscene takes over the entire screen
      if (DOM.gavelCutscene && DOM.gavelCutsceneImg) {
        DOM.gavelCutsceneImg.src = ASSETS.sprites.gavel + '?t=' + Date.now();
        DOM.gavelCutscene.classList.add('active');
      }

      // Step 3: Play loud Gavel sound
      sound.play('gavel');

      // Step 4: Screen shake quake
      if (DOM.container) {
        DOM.container.classList.remove('screen-shake');
        void DOM.container.offsetWidth; // Force reflow
        DOM.container.classList.add('screen-shake');
      }
      if (DOM.gavelCutscene) {
        DOM.gavelCutscene.classList.remove('screen-shake');
        void DOM.gavelCutscene.offsetWidth;
        DOM.gavelCutscene.classList.add('screen-shake');
      }

      // Step 5: After gavel animation completes (~1150ms), return to courtroom UI
      setTimeout(() => {
        if (DOM.gavelCutscene) {
          DOM.gavelCutscene.classList.remove('active');
          DOM.gavelCutscene.classList.remove('screen-shake');
        }
        if (DOM.container) {
          DOM.container.classList.remove('screen-shake');
        }

        // Judge is now moving in stern talking mode on the bench
        setJudgeSprite('stern_talking');

        // Step 6: Slam red GUILTY stamp directly over defendant's testimony text box
        if (DOM.verdictStampContainer && DOM.verdictStamp) {
          DOM.verdictStamp.className = 'verdict-stamp guilty stamp-slam';
          DOM.verdictStamp.textContent = 'GUILTY';
          DOM.verdictStampContainer.classList.add('active');
        }

        // Step 7: Harsh verdict speech
        const guiltSpeech = `GUILTY AS CHARGED! The excuse "${pleaText}" is utterly rejected! You had 42 tabs open! This tab is condemned to eternal memory allocation!`;

        typewriter.type(guiltSpeech, {
          speed: CONFIG.TYPEWRITER_SPEED_MS,
          onStart: () => {
            setJudgeSprite('stern_talking');
          },
          onComplete: () => {
            setJudgeSprite('stern_idle');
            // Reveal resurrected tab notification
            if (DOM.resurrectAlert) {
              DOM.resurrectAlert.style.display = 'block';
            }
            console.log("📌 [TAB COURT] SANCTION ENFORCED: Tab Pinned Forever.");
          }
        });
      }, 1150);
    }, 350);
  },

  enterVerdictPardoned(pleaText) {
    // Hide deliberation marquee
    if (DOM.deliberationBanner) {
      DOM.deliberationBanner.classList.remove('active');
    }

    // Step 1: Judge Nodding (uncovered and visible moving on bench)
    setJudgeSprite('nodding');

    // Step 2: Acquittal 8-bit fanfare
    sound.play('acquitted');

    // Step 3: Slam emerald PARDONED stamp directly over defendant's testimony text box
    if (DOM.verdictStampContainer && DOM.verdictStamp) {
      DOM.verdictStamp.className = 'verdict-stamp pardoned stamp-slam';
      DOM.verdictStamp.textContent = 'PARDONED';
      DOM.verdictStampContainer.classList.add('active');
    }

    // Step 4: Dismissal speech
    const pardonSpeech = `CASE DISMISSED! A plausible defense. The Court reluctantly grants tab euthanasia. Tab closure permitted in ${CONFIG.PARDON_CLOSE_DELAY_MS / 1000} seconds...`;

    typewriter.type(pardonSpeech, {
      speed: CONFIG.TYPEWRITER_SPEED_MS,
      onComplete: () => {
        console.log("🕊️ [TAB COURT] PARDON GRANTED: Tab will close.");
      }
    });
  }
};

// --- 9. INITIALIZATION & EVENT BINDINGS ---
function initCourtroom() {
  // Parse query parameters
  const urlParams = new URLSearchParams(window.location.search);
  STATE.accusedTitle = urlParams.get('title') || "Wikipedia: List of Unfinished Projects";
  STATE.accusedUrl = urlParams.get('url') || "https://en.wikipedia.org/wiki/List_of_unsolved_problems";

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

  // Bind Dialogue Skip / Replay
  if (DOM.dialogueContainer) {
    DOM.dialogueContainer.addEventListener('click', () => {
      if (typewriter.isTyping) {
        typewriter.skip();
      } else if (STATE.currentPhase === 'AWAITING_PLEA') {
        // Replay charge speech if clicked when waiting for plea
        CourtroomFSM.transitionTo('ARRAIGNMENT');
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    // Space skips dialogue if not inside plea input
    if (e.code === 'Space' && document.activeElement !== DOM.pleaInput) {
      if (typewriter.isTyping) {
        e.preventDefault();
        typewriter.skip();
      }
    }
  });

  // Bind Plea Submit Action
  const submitPlea = () => {
    if (STATE.currentPhase === 'DELIBERATING' || STATE.currentPhase.startsWith('VERDICT')) {
      return; // Already submitted
    }
    const text = (DOM.pleaInput && DOM.pleaInput.value.trim()) || "Your Honor, I swear I was going to read it!";
    STATE.submittedPlea = text;
    CourtroomFSM.transitionTo('DELIBERATING', { plea: text });
  };

  if (DOM.submitBtn) {
    DOM.submitBtn.addEventListener('click', submitPlea);
  }

  if (DOM.pleaInput) {
    DOM.pleaInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitPlea();
      }
    });
  }

  // Universal First Interaction Listener (Unlocks Audio on Click or Key)
  const unlockAudioGesture = () => {
    sound.unlock();
    window.removeEventListener('pointerdown', unlockAudioGesture);
    window.removeEventListener('keydown', unlockAudioGesture);

    // If currently awaiting unlock, start Arraignment immediately with sound!
    if (STATE.currentPhase === 'AWAITING_UNLOCK') {
      CourtroomFSM.transitionTo('ARRAIGNMENT');
    }
  };

  window.addEventListener('pointerdown', unlockAudioGesture, { passive: true });
  window.addEventListener('keydown', unlockAudioGesture, { passive: true });

  if (DOM.audioUnlockPrompt) {
    DOM.audioUnlockPrompt.addEventListener('click', unlockAudioGesture);
  }

  console.log("⚖️ [TAB COURT] Engine Online.", {
    case: STATE.caseId,
    title: STATE.accusedTitle,
    mock: CONFIG.USE_MOCK
  });

  // Check autoplay status on start
  sound.checkAutoplay(
    () => {
      // Autoplay permitted: start arraignment directly
      CourtroomFSM.transitionTo('ARRAIGNMENT');
    },
    () => {
      // Autoplay blocked: show prompt and wait for user's first click
      CourtroomFSM.transitionTo('AWAITING_UNLOCK');
    }
  );
}

// Kick off initialization on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCourtroom);
} else {
  initCourtroom();
}
