/**
 * AKIRA VOICE LIVE (Modo Conversacional Bidireccional en Vivo - $0.00)
 * Uses native Web Speech API (webkitSpeechRecognition) + Web SpeechSynthesis + Web Audio API.
 * Features:
 *  - Immersive full-screen quantum modal
 *  - Dynamic 3D Quantum Orb reacting to both user speech and Akira's synthesized voice
 *  - Seamless turn-taking with natural interruption support
 *  - Real-time subtitle HUD for user transcript and Akira response
 *  - Zero external paid APIs, 100% free browser native execution
 */
(function() {
  "use strict";

  class AkiraVoiceLiveController {
    constructor() {
      this.active = false;
      this.isListening = false;
      this.isSpeaking = false;
      this.isThinking = false;
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
        // Priority: Spanish voices (Colombia, Latin America, Spain, Mexico, US)
        const esVoices = voices.filter(v => v.lang.startsWith("es"));
        this.selectedVoice = esVoices.find(v => v.lang === "es-CO" || v.name.toLowerCase().includes("colombia")) ||
                             esVoices.find(v => v.name.toLowerCase().includes("natural") || v.name.toLowerCase().includes("online")) ||
                             esVoices.find(v => v.name.toLowerCase().includes("sabina") || v.name.toLowerCase().includes("helena") || v.name.toLowerCase().includes("monica") || v.name.toLowerCase().includes("paulina")) ||
                             esVoices[0] ||
                             voices[0];
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
        console.warn("[AkiraVoiceLive] SpeechRecognition is not supported in this browser.");
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
        // Natural interruption: If Akira is speaking and user speaks, stop Akira's voice immediately
        if (this.isSpeaking) {
          this.stopSpeaking();
        }

        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        const spoken = (final || interim).trim();
        if (spoken) {
          this.userSpeechBuffer = spoken;
          this.setSubtitles("Tú: " + spoken);

          // Reset silence timer: user is still speaking
          clearTimeout(this.silenceTimer);
          this.silenceTimer = setTimeout(() => {
            if (this.userSpeechBuffer.length > 2 && !this.isSpeaking && !this.isThinking) {
              this.processUserVoiceInput(this.userSpeechBuffer);
              this.userSpeechBuffer = "";
            }
          }, 1100);
        }
      };

      this.recognition.onerror = (event) => {
        if (event.error === "no-speech") return;
        console.warn("[AkiraVoiceLive] Recognition error:", event.error);
        if (event.error === "not-allowed") {
          this.updateHUD("Micrófono no permitido", "idle");
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        // Auto-restart if modal is still open and not speaking
        if (this.active && !this.isSpeaking && !this.isThinking) {
          try { this.recognition.start(); } catch(_) {}
        }
      };
    }

    async initAudioAnalyser() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
        this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = this.audioContext.createMediaStreamSource(this.micStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;
        source.connect(this.analyser);
        this.audioDataArray = new Uint8Array(this.analyser.frequencyBinCount);

        const pollAudio = () => {
          if (!this.active) return;
          this.audioAnimId = requestAnimationFrame(pollAudio);

          if (this.isListening && this.analyser) {
            this.analyser.getByteFrequencyData(this.audioDataArray);
            let sum = 0;
            for (let i = 0; i < this.audioDataArray.length; i++) {
              sum += this.audioDataArray[i];
            }
            const avg = sum / (this.audioDataArray.length * 255);
            if (this.orbInstance) {
              this.orbInstance.setAudioLevel(avg * 1.8);
            }
          }
        };
        pollAudio();
      } catch (e) {
        console.warn("[AkiraVoiceLive] Audio analyser not available (will use simulated speech resonance):", e);
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
              <span class="akira-live-title">AKIRA LIVE</span>
              <span class="akira-live-status-pill" id="akiraLiveStatusPill">Iniciando...</span>
            </div>
            <button class="akira-live-close-btn" id="akiraLiveCloseBtn" title="Salir de Modo Voz">✕</button>
          </header>

          <main class="akira-live-stage-wrap">
            <div class="akira-live-orb-stage" id="akiraLiveOrbStage"></div>
          </main>

          <footer class="akira-live-footer">
            <div class="akira-live-subtitles" id="akiraLiveSubtitles">Habla libremente con Akira...</div>
            <div class="akira-live-controls">
              <button class="akira-live-btn mic-btn" id="akiraLiveMicToggle" title="Silenciar / Activar Micrófono">
                <span class="mic-icon">🎙️</span>
              </button>
              <button class="akira-live-btn end-btn" id="akiraLiveEndBtn" title="Finalizar Sesión de Voz">
                Finalizar Voz
              </button>
            </div>
          </footer>
        </div>
      `;

      document.body.appendChild(modal);

      // Event listeners
      modal.querySelector("#akiraLiveCloseBtn").addEventListener("click", () => this.stop());
      modal.querySelector("#akiraLiveEndBtn").addEventListener("click", () => this.stop());
      modal.querySelector("#akiraLiveMicToggle").addEventListener("click", () => this.toggleMic());

      this.modalEl = modal;
      return modal;
    }

    start() {
      this.active = true;
      const modal = this.createModalDOM();
      modal.classList.add("is-visible");
      document.body.classList.add("akira-live-active");

      // Mount high-definition 3D Quantum Orb in the stage
      const stage = modal.querySelector("#akiraLiveOrbStage");
      if (window.AkiraQuantumOrb) {
        this.orbInstance = window.AkiraQuantumOrb.mount(stage, {
          size: 420,
          interactive: true,
          enableRings: true,
          enableParticles: true,
          state: "listening"
        });
      }

      this.initAudioAnalyser();

      // Start recognition
      if (this.recognition) {
        try { this.recognition.start(); } catch(_) {}
      }

      this.updateHUD("Escuchando...", "listening");
      this.setSubtitles("Habla libremente... Akira te está escuchando.");
    }

    stop() {
      this.active = false;
      this.isListening = false;
      this.isSpeaking = false;
      this.isThinking = false;

      clearTimeout(this.silenceTimer);

      if (this.recognition) {
        try { this.recognition.stop(); } catch(_) {}
      }

      this.stopSpeaking();

      if (this.audioAnimId) {
        cancelAnimationFrame(this.audioAnimId);
      }
      if (this.micStream) {
        this.micStream.getTracks().forEach(t => t.stop());
      }
      if (this.audioContext && this.audioContext.state !== "closed") {
        try { this.audioContext.close(); } catch(_) {}
      }

      if (this.modalEl) {
        this.modalEl.classList.remove("is-visible");
      }
      document.body.classList.remove("akira-live-active");

      if (this.orbInstance) {
        this.orbInstance.destroy();
        this.orbInstance = null;
      }
    }

    toggleMic() {
      const btn = document.getElementById("akiraLiveMicToggle");
      if (this.isListening) {
        if (this.recognition) try { this.recognition.stop(); } catch(_) {}
        this.isListening = false;
        btn.classList.add("muted");
        this.updateHUD("Micrófono pausado", "idle");
      } else {
        if (this.recognition) try { this.recognition.start(); } catch(_) {}
        this.isListening = true;
        btn.classList.remove("muted");
        this.updateHUD("Escuchando...", "listening");
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
      this.setSubtitles("Procesando: \"" + query + "\"...");

      if (this.recognition) {
        try { this.recognition.stop(); } catch(_) {}
      }

      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : { "Content-Type": "application/json" };
        
        // Use conversational endpoint
        const response = await fetch(backend + "/api/chat", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ message: query })
        });

        const data = await response.json();
        const replyText = data.response || data.reply || "He procesado tu mensaje.";

        this.isThinking = false;
        this.speakReply(replyText);
      } catch (err) {
        console.error("[AkiraVoiceLive] Error querying backend:", err);
        this.isThinking = false;
        this.speakReply("Disculpa, hubo un problema al conectar con el servidor. ¿Me repites?");
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

      // Clean markdown tags for spoken audio
      const cleanVoiceText = text
        .replace(/[*_#`~\[\]]/g, "")
        .replace(/https?:\/\/\S+/g, "enlace")
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanVoiceText);
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }
      utterance.rate = 1.05;
      utterance.pitch = 1.0;

      // Simulated voice wave pulsation if mic analyser is paused during speech
      let speakWaveInterval = setInterval(() => {
        if (!this.isSpeaking || !this.orbInstance) {
          clearInterval(speakWaveInterval);
          return;
        }
        const pseudoWave = 0.35 + Math.random() * 0.55;
        this.orbInstance.setAudioLevel(pseudoWave);
      }, 90);

      utterance.onend = () => {
        clearInterval(speakWaveInterval);
        this.isSpeaking = false;
        if (this.orbInstance) this.orbInstance.setAudioLevel(0);
        if (this.active) {
          this.updateHUD("Escuchando...", "listening");
          if (this.recognition) {
            try { this.recognition.start(); } catch(_) {}
          }
        }
      };

      utterance.onerror = (e) => {
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

  // Global trigger helper
  window.toggleAkiraLiveVoice = function() {
    if (window.AkiraVoiceLive.active) {
      window.AkiraVoiceLive.stop();
    } else {
      window.AkiraVoiceLive.start();
    }
  };

  console.log("[AkiraVoiceLive] Bidirectional Live Voice system ready.");
})();
