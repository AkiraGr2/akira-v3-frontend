/**
 * AKIRA SITUATIONAL VOICE STUDIO & CONTINUOUS DICTATION v1.0
 * Zero-Cost ($0.00 COP/USD) acoustic presets & hands-free speech recognition engine.
 * Supports 4 modes: Ejecutivo, Táctico Dev, Calidez Natural, and Nocturno.
 */
(function(){
  "use strict";

  const VOICE_MODES = {
    natural: {
      id: "natural",
      name: "☕ Calidez Natural (Chica Colombiana)",
      rate: "+3%",
      pitch: "+1Hz",
      description: "Tono cercano, fresco y humano de chica colombiana conversando con su creador."
    },
    executive: {
      id: "executive",
      name: "👔 Modo Ejecutivo (Alto ROI)",
      rate: "+12%",
      pitch: "+0Hz",
      description: "Directo, dinámico, enfocado en resultados rápidos y toma de decisiones."
    },
    tactical: {
      id: "tactical",
      name: "⚡ Táctico Dev (Arquitectura & Código)",
      rate: "+6%",
      pitch: "-1Hz",
      description: "Enfoque técnico de ingeniería de software, sintaxis limpia y comandos."
    },
    night: {
      id: "night",
      name: "🌙 Nocturno (Susurro en Calma)",
      rate: "-5%",
      pitch: "-2Hz",
      description: "Volumen suave y cadencia relajada, ideal para sesiones nocturnas sin fatiga."
    }
  };

  function getActiveVoiceMode(){
    const saved = localStorage.getItem("akira_active_voice_mode");
    return VOICE_MODES[saved] || VOICE_MODES.natural;
  }

  function setVoiceMode(modeId){
    if(VOICE_MODES[modeId]){
      localStorage.setItem("akira_active_voice_mode", modeId);
      updateVoiceBadge();
      console.log(`[Akira Voice Studio] Modo de voz cambiado a: ${VOICE_MODES[modeId].name}`);
    }
  }

  window.akiraSetVoiceMode = setVoiceMode;
  window.akiraGetVoiceMode = getActiveVoiceMode;

  /**
   * Continuous Dictation (Hands-Free) Engine
   */
  let recognitionInstance = null;
  let isContinuousListening = false;
  let silenceTimer = null;

  window.akiraStartContinuousDictation = function(onTranscript, onFinal){
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRecognition){
      alert("El reconocimiento por voz no es soportado por este navegador.");
      return;
    }

    if(recognitionInstance){
      try { recognitionInstance.stop(); } catch(e){}
    }

    recognitionInstance = new SpeechRecognition();
    recognitionInstance.lang = "es-CO";
    recognitionInstance.continuous = true;
    recognitionInstance.interimResults = true;

    recognitionInstance.onstart = function(){
      isContinuousListening = true;
      console.log("[Akira Voice] Dictado continuo iniciado.");
      updateDictationStatus(true);
    };

    recognitionInstance.onresult = function(event){
      let interim = "";
      let finalStr = "";

      for(let i = event.resultIndex; i < event.results.length; ++i){
        if(event.results[i].isFinal){
          finalStr += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if(typeof onTranscript === "function") {
        onTranscript(interim || finalStr);
      }

      // Reset silence timer
      if(silenceTimer) clearTimeout(silenceTimer);
      if(finalStr.trim()) {
        silenceTimer = setTimeout(() => {
          if(typeof onFinal === "function") {
            onFinal(finalStr.trim());
          }
        }, 1400); // 1.4s of silence triggers submission
      }
    };

    recognitionInstance.onerror = function(err){
      console.warn("[Akira Voice] Error en dictado:", err);
      if(err.error !== "no-speech") {
        updateDictationStatus(false);
      }
    };

    recognitionInstance.onend = function(){
      if(isContinuousListening) {
        // Auto-restart if hands-free is enabled
        try { recognitionInstance.start(); } catch(e){}
      } else {
        updateDictationStatus(false);
      }
    };

    try {
      recognitionInstance.start();
    } catch(err){
      console.error("[Akira Voice] No se pudo iniciar el dictado:", err);
    }
  };

  window.akiraStopContinuousDictation = function(){
    isContinuousListening = false;
    if(recognitionInstance){
      try { recognitionInstance.stop(); } catch(e){}
    }
    updateDictationStatus(false);
  };

  function updateDictationStatus(active){
    const badge = document.getElementById("akiraDictationBadge");
    if(badge){
      badge.style.display = active ? "inline-flex" : "none";
    }
  }

  function updateVoiceBadge(){
    const label = document.getElementById("akiraVoiceModeLabel");
    if(label){
      const mode = getActiveVoiceMode();
      label.innerText = mode.name.split(" ")[0] + " " + mode.name.split(" ")[1];
    }
  }

  /**
   * Voice Studio Modal / Switcher
   */
  function ensureVoiceStudioModal(){
    let modal = document.getElementById("akiraVoiceStudioModal");
    if(modal) return modal;

    modal = document.createElement("div");
    modal.id = "akiraVoiceStudioModal";
    modal.className = "ak-voice-overlay";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="ak-voice-dialog">
        <div class="ak-voice-header">
          <div class="ak-voice-title-wrap">
            <span class="ak-voice-icon">🎙️</span>
            <div>
              <strong style="color:#fff;font-size:14px;display:block;">Estudio de Voz Situacional &amp; Dictado Continuo</strong>
              <small style="color:#94a3b8;font-size:11px;">Ajuste acústico en tiempo real para Salomé Neural ($0.00 COP)</small>
            </div>
          </div>
          <button type="button" class="ak-voice-close-btn" onclick="window.akiraCloseVoiceStudioModal()">✕</button>
        </div>
        <div class="ak-voice-body">
          <div class="ak-voice-presets-grid" id="akVoicePresetsGrid">
            ${Object.values(VOICE_MODES).map(m => `
              <div class="ak-voice-card" data-mode="${m.id}" onclick="window.akiraSelectVoicePreset('${m.id}')">
                <div class="voice-card-title">
                  <strong>${m.name}</strong>
                </div>
                <div class="voice-card-desc">${m.description}</div>
                <div class="voice-card-meta">Velocidad: <code>${m.rate}</code> | Tono: <code>${m.pitch}</code></div>
              </div>
            `).join("")}
          </div>
          <div class="ak-voice-dictation-box">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <strong style="color:#f8fafc;font-size:13px;display:block;">Dictado Continuo Manos Libres (Hands-Free)</strong>
                <small style="color:#94a3b8;font-size:11px;">Habla libremente; Akira detecta pausas de 1.4s y responde automáticamente.</small>
              </div>
              <button type="button" id="akBtnToggleHandsFree" class="ak-btn-voice-toggle" onclick="toggleHandsFree()">
                Activar Manos Libres
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      if(e.target === modal) window.akiraCloseVoiceStudioModal();
    });

    return modal;
  }

  window.akiraOpenVoiceStudioModal = function(){
    const modal = ensureVoiceStudioModal();
    highlightActivePreset();
    modal.style.display = "flex";
  };

  window.akiraCloseVoiceStudioModal = function(){
    const modal = document.getElementById("akiraVoiceStudioModal");
    if(modal) modal.style.display = "none";
  };

  window.akiraSelectVoicePreset = function(modeId){
    setVoiceMode(modeId);
    highlightActivePreset();
  };

  function highlightActivePreset(){
    const active = getActiveVoiceMode();
    const cards = document.querySelectorAll(".ak-voice-card");
    cards.forEach(c => {
      c.classList.toggle("active", c.getAttribute("data-mode") === active.id);
    });
  }

  function toggleHandsFree(){
    const btn = document.getElementById("akBtnToggleHandsFree");
    if(!isContinuousListening){
      window.akiraStartContinuousDictation(
        (interim) => {
          const input = document.getElementById("input");
          if(input) input.value = interim;
        },
        (finalText) => {
          const input = document.getElementById("input");
          if(input) input.value = finalText;
          if(typeof window.sendMessage === "function") {
            window.sendMessage();
          }
        }
      );
      if(btn){
        btn.innerText = "🛑 Detener Manos Libres";
        btn.classList.add("recording");
      }
    } else {
      window.akiraStopContinuousDictation();
      if(btn){
        btn.innerText = "Activar Manos Libres";
        btn.classList.remove("recording");
      }
    }
  }

  // Inject styles
  (function injectStyles(){
    if(document.getElementById("akira-voice-styles")) return;
    const st = document.createElement("style");
    st.id = "akira-voice-styles";
    st.textContent = `
      .ak-voice-overlay {
        position: fixed; inset: 0; z-index: 99998;
        background: rgba(4, 7, 14, 0.85); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center; padding: 16px;
      }
      .ak-voice-dialog {
        background: #0b1120; border: 2px solid #00f0ff; border-radius: 12px;
        box-shadow: 0 0 35px rgba(0, 240, 255, 0.25); width: 95vw; max-width: 680px;
        max-height: 85vh; display: flex; flex-direction: column; overflow: hidden;
      }
      .ak-voice-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px 18px; background: #0e1526; border-bottom: 1px solid rgba(0, 240, 255, 0.2);
      }
      .ak-voice-title-wrap { display: flex; align-items: center; gap: 10px; }
      .ak-voice-icon { font-size: 22px; }
      .ak-voice-close-btn {
        background: rgba(239,68,68,0.2); border: 1px solid #ef4444; color: #ef4444;
        font-size: 13px; font-weight: 700; padding: 4px 10px; border-radius: 5px; cursor: pointer;
      }
      .ak-voice-body { padding: 16px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 14px; }
      .ak-voice-presets-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      @media(max-width: 600px){ .ak-voice-presets-grid { grid-template-columns: 1fr; } }
      .ak-voice-card {
        background: #080d19; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;
        padding: 12px; cursor: pointer; transition: all 0.15s;
      }
      .ak-voice-card:hover { border-color: #00f0ff; background: #0e1629; }
      .ak-voice-card.active { border-color: #00f0ff; background: rgba(0,240,255,0.08); box-shadow: 0 0 14px rgba(0,240,255,0.2); }
      .voice-card-title strong { color: #f8fafc; font-size: 12px; }
      .voice-card-desc { font-size: 11px; color: #94a3b8; margin: 4px 0 8px; line-height: 1.4; }
      .voice-card-meta { font-size: 10px; color: #38bdf8; }
      .ak-voice-dictation-box {
        background: #070a13; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 14px;
      }
      .ak-btn-voice-toggle {
        background: #00f0ff; color: #04070e; font-weight: 700; border: none; padding: 8px 14px;
        border-radius: 6px; cursor: pointer; font-size: 11px;
      }
      .ak-btn-voice-toggle.recording {
        background: #ef4444; color: #fff; animation: pulseRed 1.5s infinite;
      }
      @keyframes pulseRed {
        0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
        100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
      }
    `;
    document.head.appendChild(st);
  })();

})();
