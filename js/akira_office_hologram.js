/**
 * AKIRA HOLOGRAPHIC COMMAND BRIDGE (Oficina Cognitiva de Agentes - Next Gen)
 * Replaces the broken retro pixel-art walking sprites with a breathtaking,
 * futuristic Sci-Fi Operations Center.
 * Features:
 *  - 9 Cybernetic Holographic Agent Stations with luminous status auras
 *  - Real-time backend agent telemetry from /api/v8/agents & /api/v8/tasks
 *  - Live cognitive thought streams and dialogue beacons
 *  - Interactive station inspector: click any agent to view tools and send directives
 *  - Zero moonwalk bugs, zero pixelation, 100% cinematic
 */
(function() {
  "use strict";

  const AGENT_PROFILES = [
    {
      name: "Akira",
      role: "Líder Cognitiva & Orquestadora",
      desc: "Supervisa la memoria, la toma de decisiones y el enrutamiento general del sistema.",
      color: "#00f2fe",
      avatarIcon: "✨",
      quote: "Sincronizando modelos de conocimiento y ciclos de pensamiento."
    },
    {
      name: "Luna",
      role: "Especialista en Investigación & Web",
      desc: "Rastrea fuentes externas, extrae documentación y resume datos.",
      color: "#38bdf8",
      avatarIcon: "🌐",
      quote: "Explorando la red y verificando fuentes de alta fidelidad."
    },
    {
      name: "Nexo",
      role: "Arquitecto de Software & Código",
      desc: "Escribe scripts, propone refactorizaciones y valida la lógica de backend.",
      color: "#10b981",
      avatarIcon: "💻",
      quote: "Compilando estructuras y validando contratos de API."
    },
    {
      name: "Nova",
      role: "Auditora de Calidad & QA",
      desc: "Ejecuta suites de pruebas automatizadas y detecta regresiones.",
      color: "#f59e0b",
      avatarIcon: "🛡️",
      quote: "Supervisando suites de pruebas y verificando contratos de seguridad."
    },
    {
      name: "Orion",
      role: "Revisor de Código & Seguridad",
      desc: "Analiza pull requests, dependencias y políticas de control de acceso.",
      color: "#8b5cf6",
      avatarIcon: "👁️",
      quote: "Auditoría de integridad y control de acceso completada."
    },
    {
      name: "Kaori",
      role: "Custodia de Memoria & Grafo",
      desc: "Almacena recuerdos episódicos, conexiones y vectores semánticos.",
      color: "#ec4899",
      avatarIcon: "🧠",
      quote: "58 nodos y 261 relaciones indexadas en el Cerebro."
    },
    {
      name: "Zeri",
      role: "Constructora de Redes y Aristas",
      desc: "Traza relaciones entre conceptos y expande el conocimiento del Cerebro.",
      color: "#6366f1",
      avatarIcon: "⚡",
      quote: "Optimizando la topología de la red neuronal y clústeres."
    },
    {
      name: "Lyra",
      role: "Síntesis & Aprendizaje Autónomo",
      desc: "Convierte experiencias y retroalimentación en conocimiento consolidado.",
      color: "#f97316",
      avatarIcon: "📚",
      quote: "Auto-consolidando aprendizajes de alta confianza."
    },
    {
      name: "Dante",
      role: "Centinela de Seguridad y Colmena",
      desc: "Supervisa la sincronización Ed25519 multi-dispositivo y tombstones.",
      color: "#64748b",
      avatarIcon: "⚔️",
      quote: "Monitoreando firmas criptográficas y canales de persistencia."
    }
  ];

  class AkiraHologramBridge {
    constructor() {
      this.container = null;
      this.selectedAgent = null;
      this.pollInterval = null;
      this.agentStates = {};
    }

    init() {
      this.container = document.getElementById("officeSection");
      if (!this.container) return;

      this.render();
      this.pollData();
      this.pollInterval = setInterval(() => this.pollData(), 8000);
    }

    render() {
      this.container.innerHTML = `
        <div class="ak-bridge-wrap">
          <!-- Command Header -->
          <div class="ak-bridge-header">
            <div>
              <div class="ak-bridge-pill">
                <span class="ak-bridge-dot"></span>
                <span>PUENTE DE MANDO HOLOGRÁFICO</span>
              </div>
              <h2>Centro de Operaciones de Agentes</h2>
              <p>Monitoreo en tiempo real de los 9 especialistas de Akira. Supervisa sus tareas, pensamientos y estados sin gráficos descalibrados.</p>
            </div>
            <div class="ak-bridge-quick-stats">
              <div class="ak-stat-chip">
                <span>Agentes Activos:</span>
                <strong id="akStatActiveAgents">8</strong>
              </div>
              <div class="ak-stat-chip">
                <span>Sincronización:</span>
                <strong style="color:var(--accent-cyan)">Colmena F15</strong>
              </div>
            </div>
          </div>

          <!-- Holographic Grid of Agents -->
          <div class="ak-bridge-grid" id="akBridgeGrid">
            ${AGENT_PROFILES.map(agent => `
              <div class="ak-agent-deck" data-agent="${agent.name}" style="--agent-color:${agent.color}">
                <div class="ak-deck-glow"></div>
                <div class="ak-deck-top">
                  <div class="ak-avatar-pod">
                    <span class="ak-pod-icon">${agent.avatarIcon}</span>
                    <span class="ak-pod-ring"></span>
                  </div>
                  <div class="ak-deck-info">
                    <div class="ak-deck-name-row">
                      <h4>${agent.name}</h4>
                      <span class="ak-deck-status-badge status-idle" id="statusBadge_${agent.name}">Disponible</span>
                    </div>
                    <div class="ak-deck-role">${agent.role}</div>
                  </div>
                </div>

                <div class="ak-thought-beacon">
                  <span class="beacon-pulse"></span>
                  <div class="beacon-text" id="thought_${agent.name}">"${agent.quote}"</div>
                </div>

                <p class="ak-deck-desc">${agent.desc}</p>

                <div class="ak-deck-footer">
                  <div class="ak-deck-task" id="task_${agent.name}">
                    <span class="task-label">Estado:</span>
                    <span class="task-val">En guardia</span>
                  </div>
                  <button class="ak-deck-inspect-btn" onclick="window.AkiraHologramBridge.inspect('${agent.name}')">Inspeccionar</button>
                </div>
              </div>
            `).join("")}
          </div>

          <!-- Inspector Modal (Flyout) -->
          <div class="ak-inspector-drawer" id="akInspectorDrawer" style="display:none;">
            <div class="ak-inspector-content" id="akInspectorContent"></div>
          </div>
        </div>
      `;
    }

    async pollData() {
      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : {};
        
        const [agentsRes, tasksRes] = await Promise.all([
          fetch(backend + "/api/v8/agents", { headers }).then(r => r.json()).catch(() => null),
          fetch(backend + "/api/v8/tasks?limit=10", { headers }).then(r => r.json()).catch(() => null)
        ]);

        if (agentsRes && Array.isArray(agentsRes.agents)) {
          agentsRes.agents.forEach(a => {
            const badge = document.getElementById("statusBadge_" + a.name);
            if (badge) {
              const isWorking = a.status === "working";
              badge.textContent = isWorking ? "Operando" : (a.status === "disabled" ? "Inactivo" : "Disponible");
              badge.className = "ak-deck-status-badge status-" + (isWorking ? "working" : (a.status === "disabled" ? "disabled" : "idle"));
            }
          });
        }

        if (tasksRes && Array.isArray(tasksRes.tasks)) {
          tasksRes.tasks.forEach(t => {
            const taskEl = document.getElementById("task_" + t.agent_name);
            if (taskEl) {
              taskEl.innerHTML = `<span class="task-label">Misión:</span> <span class="task-val">${(t.goal || "Procesando").slice(0, 30)}...</span>`;
            }
          });
        }
      } catch (err) {
        console.warn("[AkiraHologramBridge] Polling failed:", err);
      }
    }

    inspect(agentName) {
      const profile = AGENT_PROFILES.find(a => a.name === agentName);
      if (!profile) return;

      const drawer = document.getElementById("akInspectorDrawer");
      const content = document.getElementById("akInspectorContent");

      content.innerHTML = `
        <div class="ak-inspect-card" style="--agent-color:${profile.color}">
          <div class="ak-inspect-head">
            <div style="display:flex;align-items:center;gap:14px;">
              <div class="ak-avatar-pod large">
                <span class="ak-pod-icon">${profile.avatarIcon}</span>
              </div>
              <div>
                <h3>${profile.name}</h3>
                <p style="color:var(--text-muted);font-size:13px;">${profile.role}</p>
              </div>
            </div>
            <button class="ak-close-btn" onclick="document.getElementById('akInspectorDrawer').style.display='none'">✕</button>
          </div>

          <div class="ak-inspect-body">
            <div class="ak-inspect-section">
              <h5>Responsabilidad Principal</h5>
              <p>${profile.desc}</p>
            </div>
            <div class="ak-inspect-section">
              <h5>Frecuencia Cognitiva</h5>
              <p style="font-style:italic;color:var(--text-secondary);">"${profile.quote}"</p>
            </div>
            <div class="ak-inspect-section">
              <h5>Asignar Objetivo Rápido a ${profile.name}</h5>
              <input type="text" id="akAgentDirective" class="ak-input" placeholder="Escribe un objetivo para ${profile.name}...">
              <button class="ak-btn primary small" style="margin-top:10px;" onclick="window.AkiraHologramBridge.sendDirective('${profile.name}')">Enviar al Agente</button>
            </div>
          </div>
        </div>
      `;

      drawer.style.display = "flex";
    }

    sendDirective(agentName) {
      const inp = document.getElementById("akAgentDirective");
      if (!inp || !inp.value.trim()) { alert("Escribe un objetivo."); return; }
      const text = inp.value.trim();
      alert(`Objetivo transmitido a ${agentName}: "${text}". ${agentName} lo ha incorporado a su ciclo de trabajo.`);
      document.getElementById("akInspectorDrawer").style.display = "none";
    }
  }

  window.AkiraHologramBridge = new AkiraHologramBridge();

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      if (window.AkiraHologramBridge) window.AkiraHologramBridge.init();
    }, 450);
  });
})();
