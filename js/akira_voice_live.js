/**
 * AKIRA VOICE LIVE (Ultra-Fast & VAD Noise-Gated Conversational Engine - $0.00)
 * Optimized for natural live oral conversation in quiet or noisy outdoor environments:
 *  - Real-time Human Voice Activity Detector (VAD) using Web Audio Analyser (300-3400Hz)
 *  - Hardware beamforming & acoustic noise suppression constraints for mobile microphones
 *  - Non-resetting silence countdown: ambient street noise/rumble never blocks turn completion
 *  - Push-to-Talk & Tap-to-Talk on central Quantum Orb & Mic in Street Mode
 *  - Colombian phonetic smoothing & human conversational prosody
 */
(function() {
  "use strict";

  class AkiraVoiceLiveController {
    constructor() {
      this.active = false;
      this.isListening = false;
      this.isSpeaking = false;
      this.isThinking = false;
      this.streetMode = false;
      this.isStreetRecording = false;

      // VAD & Speech Timing
      this.speechStartTime = 0;
      this.lastSpokenText = "";
      this.lastSpokenLength = 0;
      this.lastMeaningfulTime = 0;
      this.lastHumanVoiceTime = 0;
      this.noiseFloor = 0.05;
      this.hasRealSpeech = false;

      // Engine handles
      this.recognition = null;
      this.synthesis = window.speechSynthesis;
      this.selectedVoice = null;
      this.audioContext = null;
      this.analyser = null;
      this.micStream = null;
      this.audioDataArray = null;
      this.audioAnimId = null;
      this.currentUtterance = null;
      this.userSpeechBuffer = "";
      this.silenceTimer = null;
      this.modalEl = null;
      this.orbInstance = null;

      this.initVoices();
      this.initRecognition();
    }

    initVoices() {
      const loadVoices = () => {
        if (!this.synthesis) return;
        const voices = this.synthesis.getVoices();
        const esVoices = voices.filter(v => (v.lang && (v.lang.startsWith("es") || v.lang.startsWith("spa"))));
        
        // Preferred saved voice
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

        // Strict priority for natural fluid Spanish voices:
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
        console.warn("[AkiraVoiceLive] SpeechRecognition not supported on this browser.");
        return;
      }

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = "es-CO";

      this.recognition.onstart = () => {
        this.isListening = true;
        this.updateHUD("Escuchando...", "listening");
        if (this.orbInstance) this.orbInstance.setState("listening");
      };

      this.recognition.onresult = (event) => {
        // ANTI-LOOP: Ignore microphone callbacks if Akira is actively thinking or speaking
        if (this.isSpeaking || this.isThinking) return;

        let interim = "";
        let final = "";
        let totalConfidence = 0;
        let count = 0;

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i][0];
          const transcript = res.transcript;
          if (res.confidence > 0) {
            totalConfidence += res.confidence;
            count++;
          }
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        const spoken = (final || interim).trim();
        const now = Date.now();

        // Discard low-confidence ambient rumble (engines, horns, wind)
        const avgConfidence = count > 0 ? (totalConfidence / count) : 1;
        if (count > 0 && avgConfidence > 0 && avgConfidence < 0.35) return;

        // Street Noise Filter: ignore single ambient clicks, pops, coughs or short junk tokens
        const isNoiseToken = /^(ah|eh|uh|oh|mm|mmm|shh|ss|si|sí|y|a|de|un|o|la|el|al|\.|\.\.|\.\.\.)$/i.test(spoken);
        if (spoken.length < 3 || isNoiseToken) return;

        // In Street Mode (Push-to-Talk): update buffer and subtitles
        if (this.streetMode) {
          this.userSpeechBuffer = spoken;
          this.setSubtitles("Tú: " + spoken);
          return;
        }

        // --- HANDS-FREE INTELLIGENT VAD FILTER ---
        this.userSpeechBuffer = spoken;
        this.setSubtitles("Tú: " + spoken);

        const words = spoken.split(/\s+/).filter(w => w.length > 0);
        const isHumanSpeech = words.length >= 2 || spoken.length >= 5;
        if (!isHumanSpeech) return;

        if (!this.speechStartTime) {
          this.speechStartTime = now;
          this.lastSpokenLength = spoken.length;
          this.lastSpokenText = spoken;
          this.lastMeaningfulTime = now;
          this.hasRealSpeech = true;
        }

        const isFinalSentence = final.length > 0 || /[.?!]$/.test(spoken);

        // Check if user is actively speaking NEW words
        const isNewSpeech = spoken.length > this.lastSpokenLength + 2 && spoken !== this.lastSpokenText;

        if (isNewSpeech) {
          // User added new words -> extend timer
          this.lastSpokenLength = spoken.length;
          this.lastSpokenText = spoken;
          this.lastMeaningfulTime = now;
          this.lastHumanVoiceTime = now;

          clearTimeout(this.silenceTimer);
          const delay = isFinalSentence ? 450 : 650;
          this.silenceTimer = setTimeout(() => {
            if (this.userSpeechBuffer.length >= 3 && !this.isSpeaking && !this.isThinking) {
              this.finishVoiceTurn();
            }
          }, delay);
        } else {
          // The transcript did NOT grow meaningfully (it was just repeated ambient noise or interim jitter).
          // CRITICAL FIX: DO NOT reset the silence timer! Let it continue counting down!
          if (!this.silenceTimer) {
            const delay = isFinalSentence ? 380 : 520;
            this.silenceTimer = setTimeout(() => {
              if (this.userSpeechBuffer.length >= 3 && !this.isSpeaking && !this.isThinking) {
                this.finishVoiceTurn();
              }
            }, delay);
          }
        }

        // Hard Ceiling: Never allow continuous noise to keep Akira waiting > 3.8 seconds
        if (now - this.speechStartTime > 3800) {
          clearTimeout(this.silenceTimer);
          this.finishVoiceTurn();
        }
      };

      this.recognition.onerror = (event) => {
        if (event.error === "no-speech") return;
        if (event.error === "not-allowed") {
          this.updateHUD("Micrófono no permitido", "idle");
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.active && !this.isSpeaking && !this.isThinking) {
          try { this.recognition.start(); } catch(_) {}
        }
      };
    }

    async initAudioAnalyser() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
        
        // Request hardware noise cancellation & acoustic echo cancellation from mobile OS
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: { ideal: true },
            noiseSuppression: { ideal: true },
            autoGainControl: { ideal: true },
            channelCount: 1
          },
          video: false
        });

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = this.audioContext.createMediaStreamSource(this.micStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;
        this.analyser.smoothingTimeConstant = 0.4;
        source.connect(this.analyser);
        this.audioDataArray = new Uint8Array(this.analyser.frequencyBinCount);

        const pollAudio = () => {
          if (!this.active) return;
          this.audioAnimId = requestAnimationFrame(pollAudio);

          if (this.isListening && this.analyser) {
            this.analyser.getByteFrequencyData(this.audioDataArray);
            
            // Calculate energy in human voice formant range (approx 300Hz - 3400Hz, bins 2 to 10)
            let voiceEnergy = 0;
            let voiceBins = 0;
            for (let i = 2; i <= 10 && i < this.audioDataArray.length; i++) {
              voiceEnergy += this.audioDataArray[i];
              voiceBins++;
            }
            const avgVoice = voiceBins > 0 ? (voiceEnergy / (voiceBins * 255)) : 0;

            // Track adaptive background noise floor
            if (avgVoice < this.noiseFloor) {
              this.noiseFloor = this.noiseFloor * 0.95 + avgVoice * 0.05;
            } else {
              this.noiseFloor = this.noiseFloor * 0.999 + avgVoice * 0.001;
            }
            this.noiseFloor = Math.max(0.03, Math.min(0.25, this.noiseFloor));

            const isVoiceAboveNoise = avgVoice > (this.noiseFloor + 0.06);

            if (isVoiceAboveNoise) {
              this.lastHumanVoiceTime = Date.now();
            }

            // Visual orb reactivity
            const cleanLevel = avgVoice > this.noiseFloor ? (avgVoice - this.noiseFloor) * 1.8 : 0;
            if (this.orbInstance) {
              this.orbInstance.setAudioLevel(Math.min(1.0, cleanLevel));
            }

            // Automatic silence trigger from VAD:
            // If we have recognized human speech AND voice energy has ceased for > 500ms:
            if (!this.streetMode && this.hasRealSpeech && this.userSpeechBuffer.length >= 4 && !this.isSpeaking && !this.isThinking) {
              const quietDuration = Date.now() - (this.lastHumanVoiceTime || this.lastMeaningfulTime || 0);
              if (quietDuration > 520) {
                this.finishVoiceTurn();
              }
            }
          }
        };
        pollAudio();
      } catch (e) {
        console.warn("[AkiraVoiceLive] Audio analyser fallback:", e);
      }
    }

    createModalDOM() {
      if (document.getElementById("akiraLiveModal")) {
        return document.getElementById("akiraLiveModal");
      }

      const modal = document.createElement("div");
      modal.id = "akiraLiveModal";
      modal.className = "akira-live-modal";
      modal.innerHTML = `
        <div class="akira-live-backdrop"></div>
        <div class="akira-live-container">
          <header class="akira-live-header">
            <div class="akira-live-brand">
              <span class="akira-live-dot"></span>
              <span class="akira-live-title">AKIRA LIVE 3D</span>
              <span class="akira-live-status-pill" id="akiraLiveStatusPill">En línea</span>
              <button id="akiraLiveVoiceSelector" type="button" class="akira-live-voice-badge" title="Toca para cambiar de voz" style="background:rgba(255,255,255,0.07);border:1px solid rgba(0,242,254,0.3);color:#e2e8f0;font-size:11px;padding:4px 10px;border-radius:999px;cursor:pointer;margin-left:8px;font-family:inherit;">
                🎙️ <span id="akiraLiveVoiceName">Cargando voz...</span>
              </button>
            </div>
            <button class="akira-live-close-btn" id="akiraLiveCloseBtn" title="Salir">✕</button>
          </header>

          <main class="akira-live-stage-wrap">
            <div class="akira-live-orb-stage" id="akiraLiveOrbStage" title="Toca el orbe para hablar"></div>
          </main>

          <footer class="akira-live-footer">
            <div class="akira-live-subtitles" id="akiraLiveSubtitles">Habla con tranquilidad, Akira te escucha...</div>
            <div class="akira-live-controls">
              <button class="akira-live-btn mode-btn" id="akiraLiveStreetModeBtn" title="Alternar entre Manos Libres y Modo Calle Anti-Ruido">
                <span id="akiraStreetModeIcon">🎙️</span> <span id="akiraStreetModeText">Manos Libres</span>
              </button>
              <button class="akira-live-btn mic-btn" id="akiraLiveMicToggle" title="Toca o mantén pulsado para hablar">
                <span class="mic-icon" id="akiraMicIcon">🎙️</span>
              </button>
              <button class="akira-live-btn end-btn" id="akiraLiveEndBtn">
                Finalizar Voz
              </button>
            </div>
          </footer>
        </div>
      `;

      document.body.appendChild(modal);

      modal.querySelector("#akiraLiveCloseBtn").addEventListener("click", () => this.stop());
      const vBtn = modal.querySelector("#akiraLiveVoiceSelector");
      if (vBtn) {
        vBtn.addEventListener("click", () => this.cycleVoice());
        this.updateVoiceLabel();
      }
      modal.querySelector("#akiraLiveEndBtn").addEventListener("click", () => this.stop());
      
      const micBtn = modal.querySelector("#akiraLiveMicToggle");
      micBtn.addEventListener("click", () => this.handleMicClick());

      // Push-to-Talk on touch screens
      micBtn.addEventListener("touchstart", (e) => {
        if (this.streetMode) {
          e.preventDefault();
          this.startPushToTalk();
        }
      }, { passive: false });

      micBtn.addEventListener("touchend", (e) => {
        if (this.streetMode && this.isStreetRecording) {
          e.preventDefault();
          this.stopPushToTalk();
        }
      });

      // Push-to-talk on the Orb stage as well
      const orbStage = modal.querySelector("#akiraLiveOrbStage");
      orbStage.addEventListener("click", () => {
        if (this.streetMode) {
          if (this.isStreetRecording) this.stopPushToTalk();
          else this.startPushToTalk();
        } else {
          this.handleMicClick();
        }
      });

      const smBtn = modal.querySelector("#akiraLiveStreetModeBtn");
      if (smBtn) smBtn.addEventListener("click", () => this.toggleStreetMode());

      this.modalEl = modal;
      return modal;
    }

    startPushToTalk() {
      if (this.isSpeaking) this.stopSpeaking();
      this.isStreetRecording = true;
      this.userSpeechBuffer = "";
      this.speechStartTime = Date.now();
      const btn = document.getElementById("akiraLiveMicToggle");
      if (btn) btn.classList.add("street-recording");
      this.updateHUD("Grabando...", "listening");
      this.setSubtitles("Escuchando tu voz... Suelta para enviar.");
      try { navigator.vibrate && navigator.vibrate(30); } catch(_) {}
      if (this.recognition) {
        try { this.recognition.start(); } catch(_) {}
      }
    }

    stopPushToTalk() {
      try { navigator.vibrate && navigator.vibrate(40); } catch(_) {}
      const btn = document.getElementById("akiraLiveMicToggle");
      if (btn) btn.classList.remove("street-recording");
      this.isStreetRecording = false;
      this.finishVoiceTurn();
    }

    handleMicClick() {
      if (this.streetMode) {
        if (this.isStreetRecording) {
          this.stopPushToTalk();
        } else {
          this.startPushToTalk();
        }
        return;
      }

      // Hands-Free Toggle
      const btn = document.getElementById("akiraLiveMicToggle");
      if (this.isListening) {
        if (this.recognition) try { this.recognition.stop(); } catch(_) {}
        this.isListening = false;
        if (btn) btn.classList.add("muted");
        this.updateHUD("Pausado", "idle");
      } else {
        if (this.recognition) try { this.recognition.start(); } catch(_) {}
        this.isListening = true;
        if (btn) btn.classList.remove("muted");
        this.updateHUD("Escuchando...", "listening");
      }
    }

    start() {
      this.active = true;
      const modal = this.createModalDOM();
      modal.classList.add("is-visible");
      document.body.classList.add("akira-live-active");

      const stage = modal.querySelector("#akiraLiveOrbStage");
      if (window.AkiraQuantumOrb) {
        this.orbInstance = window.AkiraQuantumOrb.mount(stage, {
          size: 440,
          interactive: true,
          enableRings: true,
          enableParticles: true,
          state: "listening"
        });
      }

      this.initAudioAnalyser();

      if (this.recognition) {
        try { this.recognition.start(); } catch(_) {}
      }

      this.updateHUD("Escuchando...", "listening");
      this.setSubtitles("Habla libremente... Akira te escucha.");
    }

    stop() {
      this.active = false;
      this.isListening = false;
      this.isSpeaking = false;
      this.isThinking = false;
      this.hasRealSpeech = false;

      clearTimeout(this.silenceTimer);

      if (this.recognition) {
        try { this.recognition.abort(); } catch(_) {
          try { this.recognition.stop(); } catch(__) {}
        }
      }

      this.stopSpeaking();

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

    updateVoiceLabel() {
      const lbl = document.getElementById("akiraLiveVoiceName");
      if (lbl && this.selectedVoice) {
        const shortName = (this.selectedVoice.name || "Voz").split("-")[0].replace("Microsoft", "").replace("Google", "").trim();
        lbl.textContent = shortName + " (" + (this.selectedVoice.lang || "es") + ")";
      }
    }

    cycleVoice() {
      if (!this.synthesis) return;
      const voices = this.synthesis.getVoices().filter(v => v.lang && (v.lang.startsWith("es") || v.lang.startsWith("spa")));
      if (!voices.length) return;
      let idx = voices.findIndex(v => v.name === (this.selectedVoice && this.selectedVoice.name));
      idx = (idx + 1) % voices.length;
      this.selectedVoice = voices[idx];
      try { localStorage.setItem("akira_pref_voice", this.selectedVoice.name); } catch(_) {}
      this.updateVoiceLabel();
      const testUtterance = new SpeechSynthesisUtterance("Hola Yhon, probando esta voz para ti.");
      testUtterance.voice = this.selectedVoice;
      testUtterance.rate = 0.98;
      testUtterance.pitch = 1.02;
      this.synthesis.speak(testUtterance);
    }

    finishVoiceTurn() {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
      const query = this.userSpeechBuffer.trim();
      this.userSpeechBuffer = "";
      this.speechStartTime = 0;
      this.lastSpokenLength = 0;
      this.lastSpokenText = "";
      this.lastMeaningfulTime = 0;
      this.lastHumanVoiceTime = 0;
      this.hasRealSpeech = false;

      const btn = document.getElementById("akiraLiveMicToggle");
      if (btn) btn.classList.remove("street-recording");
      this.isStreetRecording = false;

      if (query.length >= 3 && !this.isSpeaking && !this.isThinking) {
        this.processUserVoiceInput(query);
      }
    }

    toggleStreetMode() {
      this.streetMode = !this.streetMode;
      const btn = document.getElementById("akiraLiveStreetModeBtn");
      const icon = document.getElementById("akiraStreetModeIcon");
      const text = document.getElementById("akiraStreetModeText");
      const sub = document.getElementById("akiraLiveSubtitles");

      if (this.streetMode) {
        if (btn) btn.classList.add("street-active");
        if (icon) icon.textContent = "🛡️";
        if (text) text.textContent = "Modo Calle (Anti-Ruido)";
        if (sub) sub.textContent = "Modo Calle: Toca el micrófono o el orbe para hablar y vuelve a tocar para enviar.";
        this.updateHUD("Modo Calle", "idle");
        if (this.recognition) {
          try { this.recognition.stop(); } catch(_) {}
        }
      } else {
        if (btn) btn.classList.remove("street-active");
        if (icon) icon.textContent = "🎙️";
        if (text) text.textContent = "Manos Libres";
        if (sub) sub.textContent = "Manos libres activo con filtro anti-ruido VAD.";
        this.updateHUD("Escuchando...", "listening");
        if (this.recognition && !this.isSpeaking) {
          try { this.recognition.start(); } catch(_) {}
        }
      }
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
      this.setSubtitles("Procesando: “" + query + "”");

      if (this.recognition) {
        try { this.recognition.abort(); } catch(_) {
          try { this.recognition.stop(); } catch(__) {}
        }
      }

      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : { "Content-Type": "application/json" };
        
        // Fast concise prompt for rapid oral turnaround
        const fastVoicePrompt = `[MODO VOZ AKIRA LIVE: Eres Akira, colmena cognitiva personal de Colombia creada por Jhon Bernal (a quien le gusta que lo llames Jhon Grimm o Grimm). Háblale a Jhon con la tranquilidad, calidez, frescura y acento natural de una chica colombiana (relajada, cercana, humana, llamándolo Jhon o Jhon Grimm, usando giros naturales como 'parce', 'tranquilo', 'de una', 'claro que sí', sin sonar a robot ni dar rodeos, máximo 1 o 2 oraciones breves)]: ${query}`;

        const response = await fetch(backend + "/api/chat", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ message: fastVoicePrompt })
        });

        const data = await response.json();
        const replyText = data.response || data.reply || "Te escuché perfectamente.";

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
        this.updateHUD("Escuchando...", "listening");
        if (this.recognition) try { this.recognition.start(); } catch(_) {}
        return;
      }

      this.stopSpeaking();
      this.isSpeaking = true;
      this.updateHUD("Hablando...", "speaking");
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
        .replace(/([.!?])\s+/g, "$1, "); // Micro-pause after punctuation for natural breath

      const utterance = new SpeechSynthesisUtterance(cleanVoiceText);
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }
      // Relaxed, empathetic human cadence
      utterance.rate = 0.98;
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
          if (this.streetMode) {
            this.updateHUD("Modo Calle", "idle");
            this.setSubtitles("Toca el micrófono o el orbe para hablar.");
          } else {
            this.updateHUD("Escuchando...", "listening");
            // 350ms delay to clear acoustic speaker tail before listening again
            setTimeout(() => {
              if (this.active && !this.isSpeaking && !this.streetMode && this.recognition) {
                try { this.recognition.start(); } catch(_) {}
              }
            }, 350);
          }
        }
      };

      utterance.onerror = () => {
        clearInterval(speakWaveInterval);
        this.isSpeaking = false;
        if (this.active && this.recognition) {
          try { this.recognition.start(); } catch(_) {}
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

  console.log("[AkiraVoiceLive] Ultra-fast VAD noise-gated voice live engine ready.");
})();
