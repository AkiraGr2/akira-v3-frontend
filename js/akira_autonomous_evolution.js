/**
 * AKIRA AUTONOMOUS EVOLUTION & IDLE COGNITIVE REFLECTION v1.0
 * Autonomous cognitive reflection engine for Akira.
 * Consolidates candidate learnings, reinforces neuronal synapses, and evolves the brain during idle periods ($0.00 COP cost).
 */
(function(){
  "use strict";

  const BACKEND = () => localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
  const IDLE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes of inactivity
  const MIN_CYCLE_INTERVAL_MS = 20 * 60 * 1000; // Run at most once every 20 minutes

  let lastActivityTime = Date.now();
  let lastCycleTime = 0;
  let isExecutingCycle = false;

  function getAuthHeaders(){
    if(typeof window.akiraAuthHeaders === "function"){
      try{ return window.akiraAuthHeaders(); }catch(_){}
    }
    return { "Content-Type": "application/json" };
  }

  function hasValidSession(){
    if (!window.akiraSessionState || window.akiraSessionState.authenticated !== true || window.akiraSessionState.is_owner !== true) return false;
    const token = localStorage.getItem("akira_session_token");
    const exp = localStorage.getItem("akira_session_exp");
    if(!token) return false;
    if(exp && Number(exp) * 1000 < Date.now()) return false;
    return true;
  }

  function ensureEvolutionModal(){
    let modal = document.getElementById("akiraEvolutionModal");
    if(modal) return modal;

    modal = document.createElement("div");
    modal.id = "akiraEvolutionModal";
    modal.className = "ak-evolve-overlay";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="ak-evolve-dialog">
        <div class="ak-evolve-topbar">
          <div class="ak-evolve-title">
            <span class="ak-evolve-icon">🌙</span>
            <div>
              <strong>Informe de Auto-Reflexión & Evolución Neuronal</strong>
              <small>Ciclo Cognitivo Autónomo · Consolidación y Refuerzo Sináptico</small>
            </div>
          </div>
          <button type="button" class="ak-evolve-close" onclick="window.akiraCloseEvolutionModal()">✕</button>
        </div>

        <div class="ak-evolve-body">
          <div class="ak-evolve-badge-row">
            <span class="ak-evolve-badge">MODO PILOTO AUTÓNOMO ACTIVO</span>
            <span class="ak-evolve-status-pill" id="akEvolveStatusPill">OPTIMIZADO</span>
          </div>

          <p class="ak-evolve-desc">
            Akira ejecuta ciclos de auto-reflexión durante periodos de inactividad o bajo demanda.
            Analiza el conocimiento candidato, refuerza las conexiones entre conceptos afines y poda el ruido cognitivo.
          </p>

          <div class="ak-evolve-stats-grid">
            <div class="ak-evolve-stat-card">
              <span class="ak-stat-icon">🧠</span>
              <strong id="akStatLearnings">0</strong>
              <small>Aprendizajes Consolidados</small>
            </div>
            <div class="ak-evolve-stat-card">
              <span class="ak-stat-icon">⚡</span>
              <strong id="akStatSynapses">0</strong>
              <small>Sinapsis Reforzadas</small>
            </div>
            <div class="ak-evolve-stat-card">
              <span class="ak-stat-icon">🌐</span>
              <strong id="akStatTotalNeurons">0</strong>
              <small>Neuronas en Membrana</small>
            </div>
            <div class="ak-evolve-stat-card">
              <span class="ak-stat-icon">🔗</span>
              <strong id="akStatTotalEdges">0</strong>
              <small>Conexiones Totales</small>
            </div>
          </div>

          <div class="ak-evolve-message-card">
            <span class="ak-pulse-dot" style="margin-right:8px"></span>
            <span id="akEvolveMessage">Evolución completada con éxito.</span>
          </div>

          <div class="ak-evolve-meta-row">
            <span>Última reflexión: <strong id="akEvolveTimestamp">Ahora</strong></span>
            <span>Costo computacional: <strong style="color:#39ff14">$0.00 COP / USD</strong></span>
          </div>
        </div>

        <div class="ak-evolve-footer">
          <button type="button" class="ak-evolve-btn-sec" onclick="window.akiraCloseEvolutionModal()">Cerrar</button>
          <button type="button" class="ak-evolve-btn-pri" onclick="window.akiraRunAutonomousEvolution(true)">
            <span>🔄 Re-ejecutar Reflexión</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    return modal;
  }

  function showIdleToast(data){
    let toast = document.getElementById("akiraIdleEvolutionToast");
    if(!toast) {
      toast = document.createElement("div");
      toast.id = "akiraIdleEvolutionToast";
      toast.className = "ak-idle-toast";
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <div class="ak-idle-toast-content">
        <span class="ak-toast-moon">🌙</span>
        <div>
          <strong>Evolución Cognitiva Completada</strong>
          <small>Akira reflexionó mientras descansabas: +${data.learnings_consolidated || 0} aprendizajes, +${data.synapses_reinforced || 0} sinapsis.</small>
        </div>
        <button type="button" class="ak-toast-btn" onclick="window.akiraOpenEvolutionModal()">Ver Informe</button>
      </div>
    `;

    toast.style.display = "flex";
    setTimeout(() => {
      if(toast) toast.style.display = "none";
    }, 12000);
  }

  window.akiraOpenEvolutionModal = function(data){
    const modal = ensureEvolutionModal();
    if(data) {
      document.getElementById("akStatLearnings").textContent = data.learnings_consolidated || 0;
      document.getElementById("akStatSynapses").textContent = data.synapses_reinforced || 0;
      document.getElementById("akStatTotalNeurons").textContent = data.total_neurons || 0;
      document.getElementById("akStatTotalEdges").textContent = data.total_synapses || 0;
      document.getElementById("akEvolveMessage").textContent = data.message || "Evolución completada con éxito.";
      document.getElementById("akEvolveTimestamp").textContent = new Date().toLocaleTimeString();
    }
    modal.style.display = "flex";
  };

  window.akiraCloseEvolutionModal = function(){
    const modal = document.getElementById("akiraEvolutionModal");
    if(modal) modal.style.display = "none";
  };

  window.akiraRunAutonomousEvolution = async function(manual){
    manual = manual === true;
    if(isExecutingCycle) return;
    if(!hasValidSession()) {
      if(manual) alert("Inicia sesión para ejecutar el ciclo de auto-reflexión.");
      return;
    }

    isExecutingCycle = true;
    lastCycleTime = Date.now();

    try {
      const resp = await fetch(BACKEND() + "/api/v8/cognitive/autonomous_evolution", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ trigger: manual ? "manual_owner" : "idle_watchdog" })
      });

      if(resp.status === 401 && window.akiraHandleAuthFailure) {
        window.akiraHandleAuthFailure(401);
        isExecutingCycle = false;
        return;
      }

      const data = await resp.json();

      if(data && data.ok) {
        // Refresh 2D Cytoscape membrane and counters
        try {
          if(typeof window.refreshMembrane === "function") window.refreshMembrane(true);
        } catch(_) {}
        try {
          if(typeof window.countNeuronas === "function") window.countNeuronas();
        } catch(_) {}

        if(manual) {
          window.akiraOpenEvolutionModal(data);
        } else if (!document.getElementById("tradingSection")?.classList.contains("active")) {
          showIdleToast(data);
        }
      }
    } catch(err) {
      console.warn("Autonomous evolution cycle skipped:", err);
    } finally {
      isExecutingCycle = false;
    }
  };

  // Setup Activity Listeners
  ["pointerdown", "keydown", "scroll", "touchstart"].forEach(evt => {
    window.addEventListener(evt, () => {
      lastActivityTime = Date.now();
    }, { passive: true });
  });

  // Background idle checking loop
  setInterval(() => {
    const idleDuration = Date.now() - lastActivityTime;
    const timeSinceLastCycle = Date.now() - lastCycleTime;

    if(idleDuration >= IDLE_THRESHOLD_MS && timeSinceLastCycle >= MIN_CYCLE_INTERVAL_MS && hasValidSession()) {
      window.akiraRunAutonomousEvolution(false);
    }
  }, 30000);

  // Visibility change watchdog (returning after idle tab)
  document.addEventListener("visibilitychange", () => {
    if(!document.hidden) {
      const idleDuration = Date.now() - lastActivityTime;
      const timeSinceLastCycle = Date.now() - lastCycleTime;
      if(idleDuration >= IDLE_THRESHOLD_MS && timeSinceLastCycle >= MIN_CYCLE_INTERVAL_MS && hasValidSession()) {
        window.akiraRunAutonomousEvolution(false);
      }
      lastActivityTime = Date.now();
    }
  });

  // Inject styles
  (function injectStyles(){
    if(document.getElementById("akira-evolve-styles")) return;
    const st = document.createElement("style");
    st.id = "akira-evolve-styles";
    st.textContent = `
      .ak-evolve-overlay {
        position: fixed;
        inset: 0;
        z-index: 99998;
        background: rgba(4, 7, 14, 0.85);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }
      .ak-evolve-dialog {
        background: #0b0f1a;
        border: 2px solid #7c3aed;
        border-radius: 12px;
        box-shadow: 0 0 32px rgba(124, 58, 237, 0.3);
        width: 95vw;
        max-width: 620px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .ak-evolve-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: #111827;
        border-bottom: 1px solid rgba(124, 58, 237, 0.3);
      }
      .ak-evolve-title {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .ak-evolve-icon { font-size: 22px; }
      .ak-evolve-title strong { color: #fff; font-size: 13px; display: block; }
      .ak-evolve-title small { color: #a78bfa; font-size: 10px; display: block; }
      .ak-evolve-close {
        background: rgba(239, 68, 68, 0.2);
        border: 1px solid #ef4444;
        color: #ef4444;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 700;
      }
      .ak-evolve-body {
        padding: 16px;
        overflow-y: auto;
      }
      .ak-evolve-badge-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }
      .ak-evolve-badge {
        font-family: 'Press Start 2P', monospace;
        font-size: 8px;
        color: #00f0ff;
        background: rgba(0, 240, 255, 0.12);
        padding: 4px 8px;
        border-radius: 4px;
      }
      .ak-evolve-status-pill {
        font-family: 'Press Start 2P', monospace;
        font-size: 8px;
        color: #39ff14;
        background: rgba(57, 255, 20, 0.12);
        padding: 4px 8px;
        border-radius: 4px;
      }
      .ak-evolve-desc {
        color: #cbd5e1;
        font-size: 12px;
        line-height: 1.5;
        margin-bottom: 14px;
      }
      .ak-evolve-stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        margin-bottom: 14px;
      }
      .ak-evolve-stat-card {
        background: #111827;
        border: 1px solid rgba(124, 58, 237, 0.3);
        border-radius: 8px;
        padding: 12px;
        text-align: center;
      }
      .ak-stat-icon { font-size: 18px; display: block; margin-bottom: 4px; }
      .ak-evolve-stat-card strong { display: block; font-size: 20px; color: #a78bfa; margin-bottom: 2px; }
      .ak-evolve-stat-card small { display: block; font-size: 10px; color: #94a3b8; }
      .ak-evolve-message-card {
        display: flex;
        align-items: center;
        background: rgba(124, 58, 237, 0.12);
        border: 1px solid rgba(124, 58, 237, 0.4);
        border-radius: 6px;
        padding: 10px 14px;
        color: #e2e8f0;
        font-size: 12px;
        margin-bottom: 12px;
      }
      .ak-evolve-meta-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 10px;
        color: #64748b;
        padding-top: 6px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
      }
      .ak-evolve-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        padding: 12px 16px;
        background: #111827;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
      .ak-evolve-btn-sec {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #cbd5e1;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
      }
      .ak-evolve-btn-pri {
        background: linear-gradient(135deg, #7c3aed, #00f0ff);
        border: none;
        color: #fff;
        font-weight: 700;
        font-size: 12px;
        padding: 7px 16px;
        border-radius: 6px;
        cursor: pointer;
      }

      /* TOAST NOTIFICATION */
      .ak-idle-toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 99997;
        background: #0d121f;
        border: 2px solid #7c3aed;
        border-radius: 10px;
        box-shadow: 0 4px 24px rgba(124, 58, 237, 0.4);
        padding: 12px 16px;
        max-width: 380px;
        animation: akToastSlide 0.3s ease;
      }
      @keyframes akToastSlide { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      .ak-idle-toast-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .ak-toast-moon { font-size: 24px; }
      .ak-idle-toast-content strong { color: #fff; font-size: 12px; display: block; margin-bottom: 2px; }
      .ak-idle-toast-content small { color: #94a3b8; font-size: 10px; display: block; }
      .ak-toast-btn {
        background: #7c3aed;
        border: none;
        color: #fff;
        font-size: 10px;
        font-weight: 700;
        padding: 5px 10px;
        border-radius: 4px;
        cursor: pointer;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(st);
  })();

})();
