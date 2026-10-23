/**
 * AKIRA VOICE LIVE (Ultra-Fast & Noise-Gated Conversational Loop - $0.00)
 * Optimized for low-latency live oral conversation:
 *  - 600ms adaptive silence detection
 *  - Background noise gate (filters mic clicks and acoustic noise)
 *  - Concise oral response mode (blazing fast backend turnaround)
 *  - Fullscreen Celestial Quantum Orb audio synchronization
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
        const esVoices = voices.filter(v => v.lang.startsWith("es"));
        this.selectedVoice = 
          esVoices.find(v => v.lang === "es-CO" && (v.name.toLowerCase().includes("salome") || v.name.toLowerCase().includes("natural") || v.name.toLowerCase().includes("online"))) ||
          esVoices.find(v => v.lang === "es-CO") ||
          esVoices.find(v => v.name.toLowerCase().includes("colombia")) ||
          esVoices.find(v => v.name.toLowerCase().includes("sabina") || v.name.toLowerCase().includes("helena") || v.name.toLowerCase().includes("sofi") || v.name.toLowerCase().includes("monica") || v.name.toLowerCase().includes("paulina") || v.name.toLowerCase().includes("camila") || v.name.toLowerCase().includes("lucia")) ||
          esVoices.find(v => v.name.toLowerCase().includes("natural") || v.name.toLowerCase().includes("online")) ||
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
        console.warn("[AkiraVoiceLive] SpeechRecognition not supported.");
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
        // Natural interruption: user speaks -> cancel synthesis instantly
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

        // Noise gate: ignore mic clicks, ambient pops, or single characters
        if (spoken.length < 3) return;

        this.userSpeechBuffer = spoken;
        this.setSubtitles("Tú: " + spoken);

        // Fast adaptive silence timeout: 600ms when sentence seems finished, 900ms otherwise
        clearTimeout(this.silenceTimer);
        const delay = (final.length > 0 || /[.?!]$/.test(spoken)) ? 600 : 900;

        this.silenceTimer = setTimeout(() => {
          if (this.userSpeechBuffer.length >= 3 && !this.isSpeaking && !this.isThinking) {
            const queryToSend = this.userSpeechBuffer;
            this.userSpeechBuffer = "";
            this.processUserVoiceInput(queryToSend);
          }
        }, delay);
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
            // Threshold to ignore quiet room noise
            const cleanLevel = avg > 0.08 ? (avg - 0.08) * 1.5 : 0;
            if (this.orbInstance) {
              this.orbInstance.setAudioLevel(cleanLevel);
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
              <span class="akira-live-title">AKIRA LIVE</span>
              <span class="akira-live-status-pill" id="akiraLiveStatusPill">En línea</span>
            </div>
            <button class="akira-live-close-btn" id="akiraLiveCloseBtn" title="Salir">✕</button>
          </header>

          <main class="akira-live-stage-wrap">
            <div class="akira-live-orb-stage" id="akiraLiveOrbStage"></div>
          </main>

          <footer class="akira-live-footer">
            <div class="akira-live-subtitles" id="akiraLiveSubtitles">Habla con naturalidad, Akira te está escuchando...</div>
            <div class="akira-live-controls">
              <button class="akira-live-btn mic-btn" id="akiraLiveMicToggle" title="Silenciar / Activar Micrófono">
                <span class="mic-icon">🎙️</span>
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

      clearTimeout(this.silenceTimer);

      if (this.recognition) {
        try { this.recognition.stop(); } catch(_) {}
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

    toggleMic() {
      const btn = document.getElementById("akiraLiveMicToggle");
      if (this.isListening) {
        if (this.recognition) try { this.recognition.stop(); } catch(_) {}
        this.isListening = false;
        btn.classList.add("muted");
        this.updateHUD("Pausado", "idle");
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
      this.setSubtitles("Procesando...");

      if (this.recognition) {
        try { this.recognition.stop(); } catch(_) {}
      }

      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : { "Content-Type": "application/json" };
        
        // Fast concise prompt for rapid oral turnaround
        const fastVoicePrompt = `[MODO VOZ AKIRA LIVE: Eres Akira, colmena de Colombia creada por Jhon Grimm. Háblale a Jhon con la tranquilidad, calidez, frescura y acento natural de una chica colombiana (relajada, cercana, humana, usando giros naturales como 'parce', 'tranquilo', 'de una', 'claro que sí', sin sonar a robot ni dar rodeos, máximo 1 o 2 oraciones breves)]: ${query}`;

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

      const cleanVoiceText = text
        .replace(/[*_#`~\[\]]/g, "")
        .replace(/https?:\/\/\S+/g, "enlace")
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanVoiceText);
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }
      utterance.rate = 1.02; // Slightly faster for natural fluid rhythm
      utterance.pitch = 1.05;

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
          this.updateHUD("Escuchando...", "listening");
          if (this.recognition) {
            try { this.recognition.start(); } catch(_) {}
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

  console.log("[AkiraVoiceLive] Ultra-fast voice live engine ready.");
})();
