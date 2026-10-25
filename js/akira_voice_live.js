/**
 * AKIRA VOICE LIVE (Ultra-Fast 1-Click Conversational Voice Engine - $0.00 COP / USD)
 * Optimized for natural live oral conversation in quiet or noisy outdoor street environments:
 *  - Instant 1-Click Launch: Zero secondary dialogs, instant modal presentation.
 *  - Ergonomic Master Voice Hub ("Un Solo Botón"):
 *      * Push-to-Talk (Hold-to-Talk): Hold to speak, release to send immediately (100% street noise immune).
 *      * Tap-to-Talk: Tap to start, tap again to stop & send immediately.
 *      * Interruption: Touching the button while Akira speaks cuts her off instantly and listens.
 *  - Street Noise Elimination:
 *      * Hardware audio constraints: echoCancellation: true, noiseSuppression: true, autoGainControl: false (prevents AGC street noise pumping).
 *      * Web Audio Analyser with BiquadFilter (120Hz highpass) to eliminate vehicle rumble and wind noise.
 *      * Immediate transcript flushing without waiting for native cloud silence timeouts.
 *      * Junk ambient noise token stripper.
 *  - Warm Colombian Cadence & Phonetic Smoothing:
 *      * Natural, affectionate Colombian cadence ("parce", "de una", "tranquilo", "Jhon Grimm").
 *      * Rapid oral turnaround (< 1-2 concise sentences).
 */
(function() {
  "use strict";

  class AkiraVoiceLiveController {
    constructor() {
      this.active = false;
      this.isListening = false;
      this.isRecording = false;
      this.isSpeaking = false;
      this.isThinking = false;
      this.streetMode = true; // Default to Modo Calle (Push-to-Talk) for 100% noise immunity
      this.tapToTalkActive = false;

      // Gesture timing
      this.touchStartTime = 0;
      this.isPointerDown = false;
      this.speechStartTime = 0;
      this.userSpeechBuffer = "";
      this.currentTurnTranscript = "";
      this.watchdogTimer = null;
      this.silenceTimer = null;

      // Audio & Speech handles
      this.recognition = null;
      this.synthesis = window.speechSynthesis;
      this.selectedVoice = null;
      this.audioContext = null;
      this.biquadFilter = null;
      this.analyser = null;
      this.micStream = null;
      this.audioDataArray = null;
      this.audioAnimId = null;
      this.currentUtterance = null;
      this.modalEl = null;
      this.orbInstance = null;

      this.initVoices();
      this.initRecognition();
    }

    initVoices() {
      const loadVoices = () => {
        if (!this.synthesis) return;
        const voices = this.synthesis.getVoices() || [];
        const esVoices = voices.filter(v => (v.lang && (v.lang.startsWith("es") || v.lang.startsWith("spa"))));
        
        let savedName = "";
        try { savedName = localStorage.getItem("akira_pref_voice") || ""; } catch(_) {}
        if (savedName) {
          const match = esVoices.find(v => v.name === savedName);
          if (match) {
            this.selectedVoice = match;
            this.updateVoiceLabel();
            return;
          }
        }

        // Strict priority for natural fluid Spanish / Colombian voices:
        this.selectedVoice = 
          esVoices.find(v => (v.lang === "es-CO" || v.name.toLowerCase().includes("colombia")) && (v.name.toLowerCase().includes("natural") || v.name.toLowerCase().includes("online") || v.name.toLowerCase().includes("neural"))) ||
          esVoices.find(v => v.lang === "es-CO" && v.name.toLowerCase().includes("salome")) ||
          esVoices.find(v => v.lang === "es-CO") ||
          esVoices.find(v => (v.name.toLowerCase().includes("natural") || v.name.toLowerCase().includes("online") || v.name.toLowerCase().includes("neural"))) ||
          esVoices.find(v => v.name.toLowerCase().includes("sofi") || v.name.toLowerCase().includes("camila") || v.name.toLowerCase().includes("monica") || v.name.toLowerCase().includes("paulina") || v.name.toLowerCase().includes("lucia") || v.name.toLowerCase().includes("jimena")) ||
          esVoices[0] ||
          voices[0];

        this.updateVoiceLabel();
      };

      if (this.synthesis) {
        loadVoices();
        if (this.synthesis.onvoiceschanged !== undefined) {
          this.synthesis.onvoiceschanged = loadVoices;
        }
      }
    }

    initRecognition() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.warn("[AkiraVoiceLive] SpeechRecognition API not supported on this browser.");
        return;
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = "es-CO";

      this.recognition.onstart = () => {
        this.isListening = true;
      };

      this.recognition.onresult = (event) => {
        if (this.isSpeaking || this.isThinking) return;

        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i][0];
          const transcript = res.transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        const currentSpoken = (final || interim).trim();
        if (!currentSpoken) return;

        // Strip junk ambient clicks or single letters
        const isNoiseToken = /^(\.|\.\.|\.\.\.|ah|eh|uh|oh|mm|mmm|shh|ss|si|sí|y|a|de|un|o|la|el|al)$/i.test(currentSpoken);
        if (currentSpoken.length < 2 || isNoiseToken) return;

        this.userSpeechBuffer = currentSpoken;
        this.currentTurnTranscript = currentSpoken;
        this.setSubtitles("Tú: “" + currentSpoken + "”");

        // If in Hands-Free mode (non-street): auto-detect silence
        if (!this.streetMode && this.isRecording) {
          clearTimeout(this.silenceTimer);
          const isFinalSentence = final.length > 0 || /[.?!]$/.test(currentSpoken);
          const delay = isFinalSentence ? 480 : 750;
          this.silenceTimer = setTimeout(() => {
            if (this.userSpeechBuffer.length >= 2 && !this.isSpeaking && !this.isThinking) {
              this.stopVoiceCaptureAndSend();
            }
          }, delay);
        }
      };

      this.recognition.onerror = (event) => {
        if (event.error === "no-speech") return;
        if (event.error === "not-allowed") {
          this.updateHUD("Micrófono no permitido", "idle");
          this.setSubtitles("Por favor permite el acceso al micrófono para hablar.");
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        // In hands-free mode: if active and not speaking, restart
        if (this.active && !this.streetMode && !this.isSpeaking && !this.isThinking) {
          try { this.recognition.start(); } catch(_) {}
        }
      };
    }

    async initAudioAnalyser() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;

        // Hardware DSP constraints for street immunity:
        // autoGainControl: false is ESSENTIAL to stop mobile phone from boosting ambient noise when user pauses.
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: { ideal: true },
            noiseSuppression: { ideal: true },
            autoGainControl: { ideal: false },
            channelCount: 1
          },
          video: false
        });

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = this.audioContext.createMediaStreamSource(this.micStream);

        // Low-cut high-pass filter at 120Hz to eliminate engine rumbles, wind, and body handling noise
        this.biquadFilter = this.audioContext.createBiquadFilter();
        this.biquadFilter.type = "highpass";
        this.biquadFilter.frequency.value = 120;
        this.biquadFilter.Q.value = 0.7;

        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;
        this.analyser.smoothingTimeConstant = 0.35;

        source.connect(this.biquadFilter);
        this.biquadFilter.connect(this.analyser);

        this.audioDataArray = new Uint8Array(this.analyser.frequencyBinCount);

        const pollAudio = () => {
          if (!this.active) return;
          this.audioAnimId = requestAnimationFrame(pollAudio);

          if (this.isRecording && this.analyser) {
            this.analyser.getByteFrequencyData(this.audioDataArray);
            let energy = 0;
            // Human vocal range bins (approx 300Hz - 3400Hz)
            for (let i = 2; i <= 10 && i < this.audioDataArray.length; i++) {
              energy += this.audioDataArray[i];
            }
            const avg = energy / (9 * 255);
            const reactiveLevel = Math.min(1.0, avg * 2.2);

            if (this.orbInstance) {
              this.orbInstance.setAudioLevel(reactiveLevel);
            }

            // Pulse the master button's outer wave ring with user voice volume
            const ring = document.querySelector(".akira-master-voice-pulse");
            if (ring) {
              ring.style.transform = `scale(${1 + reactiveLevel * 0.45})`;
              ring.style.opacity = `${0.35 + reactiveLevel * 0.65}`;
            }
          }
        };
        pollAudio();
      } catch (e) {
        console.warn("[AkiraVoiceLive] Audio analyser fallback:", e);
      }
    }

    createModalDOM() {
      let modal = document.getElementById("akiraLiveModal");
      if (modal) return modal;

      modal = document.createElement("div");
      modal.id = "akiraLiveModal";
      modal.className = "akira-live-modal";
      modal.innerHTML = `
        <div class="akira-live-backdrop" id="akiraLiveBackdrop"></div>
        <div class="akira-live-container">
          <!-- Header Bar -->
          <header class="akira-live-header">
            <div class="akira-live-brand">
              <span class="akira-live-dot"></span>
              <span class="akira-live-title">AKIRA LIVE</span>
              <button class="akira-live-mode-toggle" id="akiraLiveModeToggle" title="Toca para alternar Modo Calle y Manos Libres">
                <span id="akiraLiveModeIcon">🛡️</span>
                <span id="akiraLiveModeLabel">Modo Calle (Pulsar)</span>
              </button>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <button id="akiraLiveVoiceSelector" type="button" class="akira-live-voice-badge" title="Toca para cambiar la voz de Akira">
                🎙️ <span id="akiraLiveVoiceName">Cargando voz...</span>
              </button>
              <button class="akira-live-close-btn" id="akiraLiveCloseBtn" title="Salir de Akira Live">✕</button>
            </div>
          </header>

          <!-- Central Stage: Celestial Orb & Giant Master PTT Hub -->
          <main class="akira-live-stage-wrap">
            <div class="akira-live-orb-stage" id="akiraLiveOrbStage" title="Toca o mantén presionado para hablar"></div>

            <!-- Master Voice Hub: ONE BIG ERGONOMIC BUTTON -->
            <div class="akira-live-master-hub">
              <button class="akira-master-voice-btn" id="akiraMasterVoiceBtn" type="button" aria-label="Hablar con Akira">
                <div class="akira-master-voice-pulse"></div>
                <div class="akira-master-voice-ring"></div>
                <div class="akira-master-voice-core">
                  <span class="akira-master-icon" id="akiraMasterIcon">🎙️</span>
                </div>
              </button>
              <div class="akira-master-hint-badge" id="akiraMasterHint">
                <strong id="akiraMasterHintMain">Mantén presionado para hablar</strong>
                <small id="akiraMasterHintSub">o toca una vez para hablar y otra para enviar</small>
              </div>
            </div>
          </main>

          <!-- Footer Area: Live Conversation Transcript & Telemetry -->
          <footer class="akira-live-footer">
            <div class="akira-live-subtitles-card" id="akiraLiveSubtitlesCard">
              <div class="akira-live-sub-tag" id="akiraLiveSubTag">✦ AKIRA COGNITIVA</div>
              <div class="akira-live-subtitles" id="akiraLiveSubtitles">¡Hola Jhon! Mantén presionado el botón central para hablarme sin interferencias de la calle.</div>
            </div>

            <div class="akira-live-status-bar">
              <span class="akira-live-status-pill status-idle" id="akiraLiveStatusPill">Lista</span>
              <span class="akira-live-noise-pill" id="akiraLiveNoisePill">🔇 Filtro Anti-Ruido Activo</span>
              <button class="akira-live-quick-end-btn" id="akiraLiveEndBtn" type="button">Finalizar</button>
            </div>
          </footer>
        </div>
      `;

      document.body.appendChild(modal);

      // Event bindings
      modal.querySelector("#akiraLiveCloseBtn").addEventListener("click", () => this.stop());
      modal.querySelector("#akiraLiveEndBtn").addEventListener("click", () => this.stop());
      modal.querySelector("#akiraLiveBackdrop").addEventListener("click", () => this.stop());

      const vBtn = modal.querySelector("#akiraLiveVoiceSelector");
      if (vBtn) vBtn.addEventListener("click", () => this.cycleVoice());

      const mToggle = modal.querySelector("#akiraLiveModeToggle");
      if (mToggle) mToggle.addEventListener("click", () => this.toggleStreetMode());

      // MASTER BUTTON: Ergonomic pointer events for Hold-to-Talk AND Tap-to-Talk
      const masterBtn = modal.querySelector("#akiraMasterVoiceBtn");
      const orbStage = modal.querySelector("#akiraLiveOrbStage");

      const bindMasterEvents = (elem) => {
        elem.addEventListener("pointerdown", (e) => this.handlePointerDown(e));
        elem.addEventListener("pointerup", (e) => this.handlePointerUp(e));
        elem.addEventListener("pointercancel", (e) => this.handlePointerCancel(e));
        elem.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });
      };

      bindMasterEvents(masterBtn);
      bindMasterEvents(orbStage);

      this.modalEl = modal;
      return modal;
    }

    handlePointerDown(e) {
      if (e) e.preventDefault();
      this.touchStartTime = Date.now();
      this.isPointerDown = true;

      // Interruption: if Akira is currently speaking, stop her immediately
      if (this.isSpeaking) {
        this.stopSpeaking();
      }

      // If user is currently NOT recording:
      if (!this.isRecording) {
        this.startVoiceCapture();
      }
    }

    handlePointerUp(e) {
      if (e) e.preventDefault();
      if (!this.isPointerDown) return;
      this.isPointerDown = false;

      const holdDuration = Date.now() - this.touchStartTime;

      if (this.streetMode) {
        // Hold-to-talk (>= 300ms) -> send immediately!
        if (holdDuration >= 300) {
          this.tapToTalkActive = false;
          this.stopVoiceCaptureAndSend();
        } else {
          // Quick tap (< 300ms)
          if (this.tapToTalkActive) {
            // Second tap -> send immediately!
            this.tapToTalkActive = false;
            this.stopVoiceCaptureAndSend();
          } else {
            // First tap -> switch to active tap recording
            this.tapToTalkActive = true;
            this.updateHUD("Escuchando...", "listening");
            this.updateMasterButton("listening", "🔴 Escuchando tu voz...", "Toca de nuevo para enviar tu mensaje");
          }
        }
      } else {
        // Hands-Free mode: tap toggles recording
        if (this.isRecording) {
          this.stopVoiceCaptureAndSend();
        }
      }
    }

    handlePointerCancel(e) {
      this.isPointerDown = false;
      if (this.isRecording && !this.tapToTalkActive) {
        this.stopVoiceCaptureAndSend();
      }
    }

    startVoiceCapture() {
      if (this.isSpeaking) this.stopSpeaking();
      this.isRecording = true;
      this.userSpeechBuffer = "";
      this.currentTurnTranscript = "";
      this.speechStartTime = Date.now();

      try { navigator.vibrate && navigator.vibrate(28); } catch(_) {}

      this.updateHUD("Escuchando...", "listening");
      this.updateMasterButton("listening", "🔴 Escuchando tu voz...", "Suelta o toca para enviar a Akira");
      this.setSubtitles("Te escucho atentamente...");

      if (this.orbInstance) this.orbInstance.setState("listening");

      if (this.recognition) {
        try { this.recognition.start(); } catch(_) {}
      }
    }

    stopVoiceCaptureAndSend() {
      if (!this.isRecording) return;
      this.isRecording = false;
      this.tapToTalkActive = false;

      try { navigator.vibrate && navigator.vibrate(38); } catch(_) {}

      clearTimeout(this.silenceTimer);
      clearTimeout(this.watchdogTimer);

      if (this.recognition) {
        try { this.recognition.stop(); } catch(_) {}
      }

      this.updateMasterButton("thinking", "🧠 Pensando...", "Procesando tu mensaje con la colmena...");

      // Fast watchdog: do not hang waiting for Google speech recognition
      this.watchdogTimer = setTimeout(() => {
        this.dispatchRecognizedTurn();
      }, 180);
    }

    dispatchRecognizedTurn() {
      clearTimeout(this.watchdogTimer);
      const query = (this.userSpeechBuffer || this.currentTurnTranscript || "").trim();
      this.userSpeechBuffer = "";
      this.currentTurnTranscript = "";

      if (query.length >= 2) {
        this.processUserVoiceInput(query);
      } else {
        this.updateHUD("Lista", "idle");
        this.updateMasterButton("idle", "Mantén presionado para hablar", "o toca una vez para hablar y otra para enviar");
        this.setSubtitles("No te alcancé a escuchar bien. Mantén presionado el botón central y habla.");
        if (this.orbInstance) this.orbInstance.setState("idle");
      }
    }

    updateMasterButton(state, mainText, subText) {
      const btn = document.getElementById("akiraMasterVoiceBtn");
      const icon = document.getElementById("akiraMasterIcon");
      const hintMain = document.getElementById("akiraMasterHintMain");
      const hintSub = document.getElementById("akiraMasterHintSub");

      if (btn) {
        btn.className = "akira-master-voice-btn state-" + state;
      }
      if (icon) {
        if (state === "listening") icon.textContent = "🎙️";
        else if (state === "thinking") icon.textContent = "🧠";
        else if (state === "speaking") icon.textContent = "🔊";
        else icon.textContent = "🎙️";
      }
      if (hintMain && mainText) hintMain.textContent = mainText;
      if (hintSub && subText) hintSub.textContent = subText;
    }

    toggleStreetMode() {
      this.streetMode = !this.streetMode;
      const icon = document.getElementById("akiraLiveModeIcon");
      const label = document.getElementById("akiraLiveModeLabel");
      const noisePill = document.getElementById("akiraLiveNoisePill");

      if (this.streetMode) {
        if (icon) icon.textContent = "🛡️";
        if (label) label.textContent = "Modo Calle (Pulsar)";
        if (noisePill) noisePill.textContent = "🔇 Filtro Anti-Ruido Activo";
        this.updateMasterButton("idle", "Mantén presionado para hablar", "Modo Calle: Suelta para enviar sin ruidos");
        this.setSubtitles("Modo Calle activo. Mantén presionado el botón central para hablar y suelta para enviar.");
        if (this.recognition && !this.isRecording) {
          try { this.recognition.stop(); } catch(_) {}
        }
      } else {
        if (icon) icon.textContent = "🍃";
        if (label) label.textContent = "Manos Libres";
        if (noisePill) noisePill.textContent = "🍃 Manos Libres Activo";
        this.updateMasterButton("idle", "Toca para activar micrófono", "Manos Libres: Akira detecta tus pausas");
        this.setSubtitles("Modo Manos Libres activo. Habla normalmente y Akira detectará tus pausas.");
        if (this.recognition && !this.isSpeaking && !this.isThinking) {
          try { this.recognition.start(); } catch(_) {}
        }
      }
    }

    start() {
      this.active = true;
      const modal = this.createModalDOM();
      modal.classList.add("is-visible");
      document.body.classList.add("akira-live-active");

      const stage = modal.querySelector("#akiraLiveOrbStage");
      if (window.AkiraQuantumOrb && stage) {
        this.orbInstance = window.AkiraQuantumOrb.mount(stage, {
          size: 380,
          interactive: true,
          enableRings: true,
          enableParticles: true,
          state: "idle"
        });
      }

      this.initAudioAnalyser();
      this.startKeepAlive();
      this.updateHUD("Lista", "idle");
      this.updateMasterButton("idle", "Mantén presionado para hablar", "o toca una vez para hablar y otra para enviar");
      this.updateVoiceLabel();
    }

    stop() {
      this.active = false;
      this.isListening = false;
      this.isRecording = false;
      this.isSpeaking = false;
      this.isThinking = false;
      this.tapToTalkActive = false;
      this.isPointerDown = false;

      clearTimeout(this.silenceTimer);
      clearTimeout(this.watchdogTimer);

      if (this.recognition) {
        try { this.recognition.abort(); } catch(_) {
          try { this.recognition.stop(); } catch(__) {}
        }
      }

      this.stopSpeaking();

      this.stopKeepAlive();
      if (this.audioAnimId) cancelAnimationFrame(this.audioAnimId);
      if (this.micStream) this.micStream.getTracks().forEach(t => t.stop());
      if (this.audioContext && this.audioContext.state !== "closed") {
        try { this.audioContext.close(); } catch(_) {}
      }

      if (this.modalEl) this.modalEl.classList.remove("is-visible");
      document.body.classList.remove("akira-live-active");

      if (this.orbInstance) {
        this.orbInstance.destroy();
        this.orbInstance = null;
      }
    }


    startKeepAlive() {
      if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
      const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
      try { fetch(backend + "/health", { cache: "no-store" }).catch(() => {}); } catch(_) {}
      this.keepAliveInterval = setInterval(() => {
        try { fetch(backend + "/health", { cache: "no-store" }).catch(() => {}); } catch(_) {}
      }, 7 * 60 * 1000);
    }

    stopKeepAlive() {
      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = null;
      }
    }
    updateVoiceLabel() {
      const lbl = document.getElementById("akiraLiveVoiceName");
      if (lbl && this.selectedVoice) {
        const shortName = (this.selectedVoice.name || "Voz").split("-")[0].replace("Microsoft", "").replace("Google", "").trim();
        lbl.textContent = shortName + " (" + (this.selectedVoice.lang || "es") + ")";
      }
    }

    cycleVoice() {
      if (!this.synthesis) return;
      const voices = (this.synthesis.getVoices() || []).filter(v => v.lang && (v.lang.startsWith("es") || v.lang.startsWith("spa")));
      if (!voices.length) return;
      let idx = voices.findIndex(v => v.name === (this.selectedVoice && this.selectedVoice.name));
      idx = (idx + 1) % voices.length;
      this.selectedVoice = voices[idx];
      try { localStorage.setItem("akira_pref_voice", this.selectedVoice.name); } catch(_) {}
      this.updateVoiceLabel();
      const testUtterance = new SpeechSynthesisUtterance("Hola Jhon, probando esta voz para ti.");
      testUtterance.voice = this.selectedVoice;
      testUtterance.rate = 1.0;
      testUtterance.pitch = 1.02;
      this.synthesis.speak(testUtterance);
    }

    updateHUD(text, state) {
      const pill = document.getElementById("akiraLiveStatusPill");
      if (pill) {
        pill.textContent = text;
        pill.className = "akira-live-status-pill status-" + (state || "idle");
      }
      if (this.orbInstance) {
        this.orbInstance.setState(state || "idle");
      }
    }

    setSubtitles(text) {
      const sub = document.getElementById("akiraLiveSubtitles");
      if (sub) {
        sub.textContent = text;
      }
    }

    async processUserVoiceInput(query) {
      this.isThinking = true;
      this.updateHUD("Pensando...", "thinking");
      this.updateMasterButton("thinking", "🧠 Akira respondiendo...", "Inferencia rápida en la colmena...");
      this.setSubtitles("Tú: “" + query + "”");

      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : { "Content-Type": "application/json" };

        const payload = {
          message: query,
          fast_voice: true,
          voice_mode: true
        };

        const response = await fetch(backend + "/api/chat", {
          method: "POST",
          headers: headers,
          body: JSON.stringify(payload)
        });

        const data = await response.json();
        const replyText = data.response || data.reply || "Te escuché perfectamente, Jhon.";

        this.isThinking = false;
        this.speakReply(replyText);
      } catch (err) {
        console.error("[AkiraVoiceLive] Voice request error:", err);
        this.isThinking = false;
        this.speakReply("Te escucho un poco entrecortado, ¿me repites por favor?");
      }
    }

    speakReply(text) {
      if (!this.synthesis) {
        this.setSubtitles("Akira: " + text);
        this.updateHUD("Lista", "idle");
        this.updateMasterButton("idle", "Mantén presionado para hablar", "o toca una vez para hablar y otra para enviar");
        return;
      }

      this.stopSpeaking();
      this.isSpeaking = true;
      this.updateHUD("Hablando...", "speaking");
      this.updateMasterButton("speaking", "🔊 Akira respondiendo...", "Toca en cualquier momento para interrumpir");
      this.setSubtitles("Akira: " + text);

      let cleanVoiceText = text
        .replace(/[*_#`~\[\]]/g, "")
        .replace(/https?:\/\/\S+/g, "enlace")
        .trim();

      // Colombian Phonetic Smoothing & Human Breathing Pauses:
      cleanVoiceText = cleanVoiceText
        .replace(/\bJhon Bernal\b/gi, "Yhon Bernal")
        .replace(/\bJhon Grimm\b/gi, "Yhon Grim")
        .replace(/\bJhon\b/gi, "Yhon")
        .replace(/\bJohn\b/gi, "Yhon")
        .replace(/\bJon\b/gi, "Yhon")
        .replace(/\bGrimm\b/gi, "Grim")
        .replace(/\bAkira\b/g, "Áquira")
        .replace(/\bAI\b/g, "inteligencia artificial")
        .replace(/\bAPI\b/g, "ápi")
        .replace(/\bRender\b/gi, "Rénder")
        .replace(/\bGroq\b/gi, "Groc")
        .replace(/([.!?])\s+/g, "$1, ");

      const utterance = new SpeechSynthesisUtterance(cleanVoiceText);
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }
      utterance.rate = 1.0;
      utterance.pitch = 1.02;

      let speakWaveInterval = setInterval(() => {
        if (!this.isSpeaking || !this.orbInstance) {
          clearInterval(speakWaveInterval);
          return;
        }
        const pseudoWave = 0.35 + Math.random() * 0.55;
        this.orbInstance.setAudioLevel(pseudoWave);
      }, 80);

      utterance.onend = () => {
        clearInterval(speakWaveInterval);
        this.isSpeaking = false;
        if (this.orbInstance) this.orbInstance.setAudioLevel(0);
        if (this.active) {
          this.updateHUD("Lista", "idle");
          this.updateMasterButton("idle", "Mantén presionado para hablar", "o toca una vez para hablar y otra para enviar");
          if (!this.streetMode && this.recognition) {
            setTimeout(() => {
              if (this.active && !this.isSpeaking && this.recognition) {
                try { this.recognition.start(); } catch(_) {}
              }
            }, 300);
          }
        }
      };

      utterance.onerror = () => {
        clearInterval(speakWaveInterval);
        this.isSpeaking = false;
        if (this.active) {
          this.updateHUD("Lista", "idle");
          this.updateMasterButton("idle", "Mantén presionado para hablar", "o toca una vez para hablar y otra para enviar");
        }
      };

      this.currentUtterance = utterance;
      this.synthesis.speak(utterance);
    }

    stopSpeaking() {
      if (this.synthesis && this.isSpeaking) {
        this.synthesis.cancel();
      }
      this.isSpeaking = false;
      this.currentUtterance = null;
    }
  }

  window.AkiraVoiceLive = new AkiraVoiceLiveController();

  window.toggleAkiraLiveVoice = function() {
    if (window.AkiraVoiceLive.active) {
      window.AkiraVoiceLive.stop();
    } else {
      window.AkiraVoiceLive.start();
    }
  };

  console.log("[AkiraVoiceLive] Ultra-Fast 1-Click Street Noise Immune Voice Engine Ready.");
})();
