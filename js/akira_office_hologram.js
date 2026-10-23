/**
 * AKIRA HOLOGRAPHIC COMMAND BRIDGE (Puente de Mando Holográfico - Next Gen)
 * Real-time Multi-Agent Operations Center.
 * Features:
 *  - 9 Specialized Cybernetic Agent Consoles mapped directly to backend agents
 *  - Real-time bidirectional telemetry: missions (/api/v8/missions) + tasks (/api/v8/tasks) + agents (/api/v8/agents)
 *  - Live cognitive thought streams with reactive visual pulses
 *  - Immediate synchronization when missions are created from any tab
 *  - Direct directive dispatch to any agent with instant auto-execution
 */
(function() {
  "use strict";

  const AGENT_PROFILES = [
    {
      name: "Akira",
      systemName: "internal",
      role: "Líder Cognitiva & Orquestadora",
      desc: "Supervisa la memoria, la toma de decisiones, la introspección y el enrutamiento general del sistema.",
      color: "#00f2fe",
      avatarIcon: "✨",
      quote: "Sincronizando modelos de conocimiento y ciclos de pensamiento continuo.",
      tools: ["self_model_read", "cognitive_cycle"]
    },
    {
      name: "Luna",
      systemName: "researcher",
      role: "Especialista en Investigación & Web",
      desc: "Rastrea fuentes externas, extrae documentación y sintetiza datos verídicos de la red.",
      color: "#38bdf8",
      avatarIcon: "🌐",
      quote: "Explorando la red y verificando fuentes de alta fidelidad.",
      tools: ["web_search", "memory_search", "github_repo_read"]
    },
    {
      name: "Nexo",
      systemName: "developer",
      role: "Arquitecto de Software & Código",
      desc: "Escribe scripts, propone refactorizaciones y valida la lógica de backend.",
      color: "#10b981",
      avatarIcon: "💻",
      quote: "Compilando estructuras y validando contratos de API.",
      tools: ["github_repo_read", "developer_propose"]
    },
    {
      name: "Nova",
      systemName: "tester",
      role: "Auditora de Calidad & QA",
      desc: "Ejecuta suites de pruebas automatizadas y detecta regresiones o fallos.",
      color: "#f59e0b",
      avatarIcon: "🛡️",
      quote: "Supervisando suites de pruebas y verificando contratos de seguridad.",
      tools: ["github_repo_read", "python_test"]
    },
    {
      name: "Orion",
      systemName: "reviewer",
      role: "Revisor de Código & Seguridad",
      desc: "Analiza propuestas de código, dependencias y políticas de control de acceso.",
      color: "#8b5cf6",
      avatarIcon: "👁️",
      quote: "Auditoría de integridad y control de acceso completada.",
      tools: ["github_repo_read", "python_test", "code_review"]
    },
    {
      name: "Kaori",
      systemName: "memorizer",
      role: "Custodia de Memoria & Grafo",
      desc: "Almacena recuerdos episódicos, conexiones y vectores semánticos en el Cerebro.",
      color: "#ec4899",
      avatarIcon: "🧠",
      quote: "Indexando nodos cognitivos y relaciones semánticas en la memoria persistente.",
      tools: ["memory_save", "memory_search"]
    },
    {
      name: "Zeri",
      systemName: "graph_builder",
      role: "Constructora de Redes y Aristas",
      desc: "Traza relaciones neuronales entre conceptos y expande el conocimiento del Cerebro.",
      color: "#6366f1",
      avatarIcon: "⚡",
      quote: "Optimizando la topología de la red neuronal y clústeres semánticos.",
      tools: ["graph_create_node", "graph_create_edge", "graph_related"]
    },
    {
      name: "Lyra",
      systemName: "learner",
      role: "Síntesis & Aprendizaje Autónomo",
      desc: "Convierte experiencias, aciertos y retroalimentación en conocimiento consolidado.",
      color: "#f97316",
      avatarIcon: "📚",
      quote: "Auto-consolidando aprendizajes de alta confianza sin intervención.",
      tools: ["learning_save", "memory_save"]
    },
    {
      name: "Dante",
      systemName: "autonomy_orchestrator",
      role: "Centinela de Seguridad y Colmena",
      desc: "Supervisa la sincronización Ed25519 multi-dispositivo y orquesta la autonomía controlada.",
      color: "#94a3b8",
      avatarIcon: "⚔️",
      quote: "Monitoreando firmas criptográficas y canales de persistencia F15.",
      tools: ["controlled_autonomy_start"]
    }
  ];

  function resolveAgent(nameOrSystem) {
    if (!nameOrSystem) return null;
    const n = String(nameOrSystem).toLowerCase().trim();
    return AGENT_PROFILES.find(p => 
      p.name.toLowerCase() === n || 
      p.systemName.toLowerCase() === n ||
      (n.includes("research") && p.systemName === "researcher") ||
      (n.includes("dev") && p.systemName === "developer") ||
      (n.includes("test") && p.systemName === "tester") ||
      (n.includes("review") && p.systemName === "reviewer") ||
      (n.includes("memory") && p.systemName === "memorizer") ||
      (n.includes("graph") && p.systemName === "graph_builder") ||
      (n.includes("learn") && p.systemName === "learner") ||
      (n.includes("orchestrat") && p.systemName === "autonomy_orchestrator")
    ) || null;
  }

  class AkiraHologramBridge {
    constructor() {
      this.container = null;
      this.selectedAgent = null;
      this.pollInterval = null;
      this.isPolling = false;
      this.activeMissions = [];
    }

    init() {
      this.container = document.getElementById("officeSection");
      if (!this.container) return;

      this.render();
      this.pollData();

      // Faster polling when tab is active (every 4 seconds)
      if (this.pollInterval) clearInterval(this.pollInterval);
      this.pollInterval = setInterval(() => {
        const sec = document.getElementById("officeSection");
        if (sec && sec.classList.contains("active")) {
          this.pollData();
        }
      }, 4000);

      // Reactive event listeners
      window.addEventListener("akira:section-shown", (e) => {
        if (e.detail && e.detail.section === "office") {
          this.pollData();
        }
      });

      window.addEventListener("akira:mission-activity", (e) => {
        this.pollData();
      });

      window.addEventListener("akira:session-valid", () => {
        this.pollData();
      });
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
              <p>Monitoreo reactivo en tiempo real de los 9 especialistas de Akira. Conectado directamente a las misiones tácticas y al motor de persistencia.</p>
            </div>
            <div class="ak-bridge-quick-stats">
              <div class="ak-stat-chip">
                <span>Agentes Activos:</span>
                <strong id="akStatActiveAgents" style="color:var(--accent-cyan);">0/9</strong>
              </div>
              <div class="ak-stat-chip">
                <span>Sincronización:</span>
                <strong style="color:var(--accent-green);">Colmena F15</strong>
              </div>
            </div>
          </div>

          <!-- Dynamic Live Mission Telemetry Banner -->
          <div id="akBridgeLiveBanner" style="display:none;" class="ak-bridge-live-banner">
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="font-size:24px;">🚀</span>
              <div>
                <strong style="color:#ffffff;font-size:14px;" id="akBannerMissionTitle">Misión en Ejecución</strong>
                <p style="color:var(--accent-cyan);font-size:12px;margin:2px 0 0;" id="akBannerMissionGoal">Procesando pasos tácticos con los agentes...</p>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <span class="ak-deck-status-badge status-working" id="akBannerMissionBadge">⚡ En Curso</span>
              <button class="ak-btn secondary small" onclick="window.showSection('missions')">Ver Misión</button>
            </div>
          </div>

          <!-- Holographic Grid of Agents -->
          <div class="ak-bridge-grid" id="akBridgeGrid">
            ${AGENT_PROFILES.map(agent => `
              <div class="ak-agent-deck" id="deck_${agent.name}" data-agent="${agent.name}" style="--agent-color:${agent.color}">
                <div class="ak-deck-glow"></div>
                <div class="ak-deck-top">
                  <div class="ak-avatar-pod" id="pod_${agent.name}">
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

                <div class="ak-thought-beacon" id="beacon_${agent.name}">
                  <span class="beacon-pulse"></span>
                  <div class="beacon-text" id="thought_${agent.name}">"${agent.quote}"</div>
                </div>

                <p class="ak-deck-desc">${agent.desc}</p>

                <div class="ak-deck-footer">
                  <div class="ak-deck-task" id="task_${agent.name}">
                    <span class="task-label">Estado:</span>
                    <span class="task-val" id="taskVal_${agent.name}">En guardia</span>
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
      if (this.isPolling) return;
      this.isPolling = true;

      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : {};

        // 1. Check local storage for immediate zero-lag active mission
        let localMission = null;
        try {
          const raw = localStorage.getItem("akira_last_active_mission");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && (Date.now() - (parsed.timestamp || 0)) < 15 * 60 * 1000) {
              localMission = parsed;
            }
          }
        } catch (_) {}

        // 2. Fetch server telemetry in parallel
        const [agentsRes, tasksRes, missionsRes] = await Promise.all([
          fetch(backend + "/api/v8/agents", { headers }).then(r => r.json()).catch(() => null),
          fetch(backend + "/api/v8/tasks?limit=25", { headers }).then(r => r.json()).catch(() => null),
          fetch(backend + "/api/v8/missions?limit=10", { headers }).then(r => r.json()).catch(() => null)
        ]);

        let missions = (missionsRes && (missionsRes.missions || missionsRes.items)) || [];
        if (localMission && !missions.some(m => m.id === localMission.id)) {
          missions.unshift(localMission);
        }
        this.activeMissions = missions;

        // Check if there is an active mission
        const activeMission = missions.find(m => 
          m.status === "running" || 
          m.status === "in_progress" || 
          m.status === "planning" || 
          m.status === "waiting_approval"
        );

        const banner = document.getElementById("akBridgeLiveBanner");
        if (banner) {
          if (activeMission) {
            banner.style.display = "flex";
            const titleEl = document.getElementById("akBannerMissionTitle");
            const goalEl = document.getElementById("akBannerMissionGoal");
            const badgeEl = document.getElementById("akBannerMissionBadge");
            if (titleEl) titleEl.textContent = activeMission.title || "Misión Táctica en Ejecución";
            if (goalEl) goalEl.textContent = (activeMission.objective || activeMission.goal || "Operando pasos asignados.").slice(0, 85);
            if (badgeEl) {
              badgeEl.textContent = activeMission.status === "planning" ? "🧠 Planificando" : "⚡ En Ejecución";
              badgeEl.className = "ak-deck-status-badge " + (activeMission.status === "planning" ? "status-thinking" : "status-working");
            }
          } else {
            banner.style.display = "none";
          }
        }

        // Active status map per persona
        const activeStates = {};

        // A. Map mission steps to agents
        if (activeMission) {
          const steps = (activeMission.plan && activeMission.plan.steps) || activeMission.steps || [];
          if (Array.isArray(steps) && steps.length) {
            steps.forEach(step => {
              const matched = resolveAgent(step.agent || step.agent_name);
              if (matched) {
                activeStates[matched.name] = {
                  status: activeMission.status === "planning" ? "planning" : "working",
                  label: activeMission.status === "planning" ? "🧠 Planificando" : "⚡ Operando en Misión",
                  thought: step.title || step.description || activeMission.objective || "Ejecutando paso asignado.",
                  task: `Paso #${step.order || 1}: ${step.tool || step.action || 'Operando'}`
                };
              }
            });
          } else {
            // If mission has no detailed steps yet, Akira is planning
            activeStates["Akira"] = {
              status: "planning",
              label: "🧠 Orquestando",
              thought: `Planificando táctica para: "${(activeMission.objective || '').slice(0, 60)}..."`,
              task: "Orquestando agentes"
            };
          }
        }

        // B. Map active tasks to agents
        const tasks = (tasksRes && tasksRes.tasks) || [];
        tasks.forEach(t => {
          const isWorking = t.status === "running" || t.status === "working";
          const matched = resolveAgent(t.agent_name);
          if (matched && isWorking && !activeStates[matched.name]) {
            activeStates[matched.name] = {
              status: "working",
              label: "⚡ Ejecutando Tarea",
              thought: t.goal || `Ejecutando herramienta: ${t.tool_name}`,
              task: `Herramienta: ${t.tool_name}`
            };
          }
        });

        // C. Update every agent's UI card
        let activeAgentCount = 0;
        AGENT_PROFILES.forEach(profile => {
          const deck = document.getElementById("deck_" + profile.name);
          const badge = document.getElementById("statusBadge_" + profile.name);
          const thought = document.getElementById("thought_" + profile.name);
          const taskVal = document.getElementById("taskVal_" + profile.name);

          const state = activeStates[profile.name];

          if (state) {
            activeAgentCount++;
            if (deck) deck.classList.add("deck-active");
            if (badge) {
              badge.textContent = state.label;
              badge.className = "ak-deck-status-badge " + (state.status === "planning" ? "status-thinking" : "status-working");
            }
            if (thought) thought.textContent = `"${state.thought}"`;
            if (taskVal) taskVal.textContent = state.task;
          } else {
            if (deck) deck.classList.remove("deck-active");
            if (badge) {
              badge.textContent = "Disponible";
              badge.className = "ak-deck-status-badge status-idle";
            }
            if (thought) thought.textContent = `"${profile.quote}"`;
            if (taskVal) taskVal.textContent = "En guardia";
          }
        });

        // D. Update Active Agent Counter
        const statActive = document.getElementById("akStatActiveAgents");
        if (statActive) {
          statActive.textContent = `${activeAgentCount}/9`;
          statActive.style.color = activeAgentCount > 0 ? "var(--accent-cyan)" : "var(--accent-green)";
        }

      } catch (err) {
        console.warn("[AkiraHologramBridge] Polling failed:", err);
      } finally {
        this.isPolling = false;
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
                <p style="color:var(--text-muted);font-size:13px;">${profile.role} · <code style="color:var(--agent-color);font-size:11px;">${profile.systemName}</code></p>
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
              <h5>Herramientas Especializadas Asignadas</h5>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
                ${profile.tools.map(t => `<span class="ak-stat-chip" style="font-size:11px;padding:3px 8px;border-color:var(--agent-color);">${t}</span>`).join("")}
              </div>
            </div>

            <div class="ak-inspect-section">
              <h5>Frecuencia Cognitiva</h5>
              <p style="font-style:italic;color:var(--text-secondary);" id="inspectThought_${profile.name}">"${profile.quote}"</p>
            </div>

            <div class="ak-inspect-section" style="background:rgba(255,255,255,0.02);padding:14px;border-radius:var(--radius-md);border:1px solid rgba(255,255,255,0.06);">
              <h5 style="color:var(--accent-cyan);margin-bottom:6px;">Transmitir Orden Directa a ${profile.name}</h5>
              <p style="font-size:12px;color:var(--text-muted);margin-bottom:8px;">Akira planificará y ejecutará inmediatamente esta orden involucrando a ${profile.name}.</p>
              <textarea id="akAgentDirective" class="ak-textarea" style="min-height:70px;margin-bottom:10px;" placeholder="Ej. Analizar fuentes sobre tecnología, auditar código, indexar en memoria..."></textarea>
              <button class="ak-btn primary small" id="akBtnSendDirective" onclick="window.AkiraHologramBridge.sendDirective('${profile.name}')">🚀 Transmitir y Ejecutar Inmediatamente</button>
            </div>
          </div>
        </div>
      `;

      drawer.style.display = "flex";
    }

    async sendDirective(agentName) {
      const inp = document.getElementById("akAgentDirective");
      const btn = document.getElementById("akBtnSendDirective");
      if (!inp || !inp.value.trim()) { alert("Por favor escribe una orden o instrucción."); return; }
      
      const text = inp.value.trim();
      const profile = AGENT_PROFILES.find(a => a.name === agentName);
      if (!profile) return;

      btn.disabled = true;
      btn.textContent = "⏳ Transmitiendo orden a Akira...";

      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : { "Content-Type": "application/json" };
        const objective = `Para ${profile.name} (${profile.systemName}): ${text}`;
        const title = text.slice(0, 60).trim();

        // 1. Create Mission
        const res = await fetch(backend + "/api/v8/missions", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({
            objective: objective,
            title: `[${profile.name}] ${title}`,
            priority: 8
          })
        });
        const data = await res.json();
        const missionId = (data.mission && data.mission.id) || data.mission_id;

        if (missionId) {
          // 2. Approve & Execute immediately
          await fetch(`${backend}/api/v8/missions/${missionId}/approve`, { method: "POST", headers }).catch(() => null);
          await fetch(`${backend}/api/v8/missions/${missionId}/execute`, { method: "POST", headers }).catch(() => null);

          // 3. Cache locally for zero lag
          const missionPayload = {
            id: missionId,
            title: `[${profile.name}] ${title}`,
            objective: objective,
            status: "running",
            steps: [{ agent: profile.systemName, title: text, tool: profile.tools[0] || "operando" }],
            timestamp: Date.now()
          };
          localStorage.setItem("akira_last_active_mission", JSON.stringify(missionPayload));

          // 4. Dispatch event
          window.dispatchEvent(new CustomEvent("akira:mission-activity", { detail: missionPayload }));

          alert(`🚀 ¡Orden transmitida con éxito a ${agentName}! ${agentName} ya ha comenzado a trabajar en tiempo real.`);
          document.getElementById("akInspectorDrawer").style.display = "none";
          this.pollData();
        } else {
          alert("No se pudo iniciar la misión: " + (data.reason || "Error desconocido"));
        }
      } catch (err) {
        alert("Error de conexión: " + err.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "🚀 Transmitir y Ejecutar Inmediatamente";
        }
      }
    }
  }

  window.AkiraHologramBridge = new AkiraHologramBridge();

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      if (window.AkiraHologramBridge) window.AkiraHologramBridge.init();
    }, 450);
  });
})();
