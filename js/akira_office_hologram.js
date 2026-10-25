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
      rank: "COMANDANTE SUPREMA",
      role: "Comandante Suprema de la Colmena",
      commandMando: "Orquesta a los 8 Comandantes de División y 267 especialistas tácticos.",
      desc: "Núcleo unificado de autoconocimiento, introspección profunda, toma de decisiones ejecutivas y balance de carga.",
      color: "#a855f7",
      avatarIcon: "👑",
      quote: "Sincronizando modelos de autoconocimiento, directivas ejecutivas y los 267 especialistas de la Colmena.",
      tools: ["self_model_read", "cognitive_cycle"]
    },
    {
      name: "Luna",
      systemName: "researcher",
      rank: "COMANDANTE DE DIVISIÓN",
      role: "Comandante de Operaciones & Misiones",
      commandMando: "Mando táctico sobre 33 especialistas (Project Management & Specialized).",
      desc: "Dirige la orquestación de misiones de punta a punta, cronogramas, resolución de dependencias e investigación web.",
      color: "#00f2fe",
      avatarIcon: "🌙",
      quote: "Supervisando despliegue de misiones y coordinando la ejecución de especialistas en campo.",
      tools: ["web_search", "memory_search", "github_repo_read"]
    },
    {
      name: "Nexo",
      systemName: "developer",
      rank: "COMANDANTE DE DIVISIÓN",
      role: "Comandante de Integración & Upwork Bidding",
      commandMando: "Mando táctico sobre 38 especialistas (Ventas, Finanzas, Soporte & Upwork).",
      desc: "Lidera la monetización, generación de propuestas ganadoras en Upwork, análisis de rentabilidad y relaciones con clientes.",
      color: "#10b981",
      avatarIcon: "💼",
      quote: "Estructurando propuestas de alta conversión y maximizando el valor de cada licitación en Upwork.",
      tools: ["github_repo_read", "developer_propose"]
    },
    {
      name: "Atlas",
      systemName: "developer_lead",
      rank: "COMANDANTE DE DIVISIÓN",
      role: "Comandante de Ingeniería & Desarrollo",
      commandMando: "Mando táctico sobre 88 especialistas (Engineering, Cloud, Web3 & Spatial).",
      desc: "Arquitectura de software de alta concurrencia, backend, frontend, microservicios, APIs y cero deuda técnica.",
      color: "#3b82f6",
      avatarIcon: "⚡",
      quote: "Comandando desarrollo full-stack, optimización de algoritmos y arquitectura de producción.",
      tools: ["github_repo_read", "developer_propose"]
    },
    {
      name: "Nova",
      systemName: "tester",
      rank: "COMANDANTE DE DIVISIÓN",
      role: "Comandante de Calidad & QA de Misión Crítica",
      commandMando: "Mando táctico sobre 30 especialistas (Testing Automatizado & Validación Académica).",
      desc: "Supervisa pruebas automatizadas, auditoría de regresión, consistencia lógica y validación de tolerancias.",
      color: "#f59e0b",
      avatarIcon: "🛡️",
      quote: "Validación de tolerancia cero a fallos y verificación estricta de cada contrato del sistema.",
      tools: ["github_repo_read", "python_test"]
    },
    {
      name: "Orion",
      systemName: "reviewer",
      rank: "COMANDANTE DE DIVISIÓN",
      role: "Comandante de Ciberseguridad & Resiliencia",
      commandMando: "Mando táctico sobre 16 especialistas (Pentesting, Criptografía & Hardening).",
      desc: "Audita la seguridad del código, políticas de acceso, blindaje criptográfico de datos y protección del creador.",
      color: "#ef4444",
      avatarIcon: "👁️",
      quote: "Escudo activo: auditoría continua de integridad y blindaje hermético de endpoints sensibles.",
      tools: ["github_repo_read", "python_test", "code_review"]
    },
    {
      name: "Kaori",
      systemName: "memorizer",
      rank: "COMANDANTE DE DIVISIÓN",
      role: "Comandante de Memoria Persistente",
      commandMando: "Custodia absoluta del almacenamiento episódico y recuperación semántica en PostgreSQL.",
      desc: "Indexa y protege recuerdos episódicos, preferencias de Jhon Grimm y estado cognitivo persistente.",
      color: "#ec4899",
      avatarIcon: "🧠",
      quote: "Indexando recuerdos persistentes y garantizando retención semántica a perpetuidad.",
      tools: ["memory_save", "memory_search"]
    },
    {
      name: "Zeri",
      systemName: "graph_builder",
      rank: "COMANDANTE DE DIVISIÓN",
      role: "Comandante de Arquitectura de Grafo",
      commandMando: "Teje las relaciones topológicas entre los 267 especialistas y el Cerebro de Akira.",
      desc: "Construye nodos, aristas y sinapsis semánticas conectando ideas complejas en un mapa multidimensional.",
      color: "#6366f1",
      avatarIcon: "🔮",
      quote: "Optimizando la red neuronal de conocimiento y clústeres conceptuales en tiempo real.",
      tools: ["graph_create_node", "graph_create_edge", "graph_related"]
    },
    {
      name: "Lyra",
      systemName: "learner",
      rank: "COMANDANTE DE DIVISIÓN",
      role: "Comandante de Crecimiento & Marketing Digital",
      commandMando: "Mando táctico sobre 44 especialistas (Marketing, SEO, Copywriting & Paid Media).",
      desc: "Convierte experiencias en aprendizajes permanentes e impulsa estrategias de adquisición, tráfico y conversión.",
      color: "#f97316",
      avatarIcon: "🔥",
      quote: "Absorbiendo aprendizajes de alta confianza y optimizando estrategias de adquisición viral.",
      tools: ["learning_save", "memory_save"]
    },
    {
      name: "Dante",
      systemName: "autonomy_orchestrator",
      rank: "COMANDANTE DE DIVISIÓN",
      role: "Comandante de Autonomía Controlada & Colmena",
      commandMando: "Supervisa la sincronización F15, firmas criptográficas Ed25519 y compuertas de seguridad.",
      desc: "Regula las compuertas de autonomía bajo supervisión de Jhon Grimm asegurando cero riesgo y cero costo.",
      color: "#94a3b8",
      avatarIcon: "⚔️",
      quote: "Monitoreando firmas criptográficas, compuertas de aprobación y canales de sincronización.",
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
      this.currentTab = "core";
      this.hiveCatalog = null;
      this.hiveActiveDivision = "all";
      this.hiveSearchQuery = "";
    }

    init() {
      this.container = document.getElementById("officeSection");
      if (!this.container) return;

      this.render();
      this.setupTabs();
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
              <p>Monitoreo reactivo en tiempo real de los 9 comandantes y los 267 especialistas tácticos de Akira. Conectado a misiones tácticas y persistencia F15.</p>
            </div>
            <div class="ak-bridge-quick-stats">
              <div class="ak-stat-chip">
                <span>Comandantes:</span>
                <strong id="akStatActiveAgents" style="color:var(--accent-cyan);">0/9</strong>
              </div>
              <div class="ak-stat-chip">
                <span>Sincronización:</span>
                <strong style="color:var(--accent-green);">Colmena F15</strong>
              </div>
              <div class="ak-stat-chip" id="akChipHiveTab" style="cursor:pointer;border-color:rgba(139,92,246,0.4);background:rgba(139,92,246,0.15);" onclick="window.AkiraHologramBridge && window.AkiraHologramBridge.switchTab('hive')" title="Explorar los 267 especialistas de la Colmena">
                <span>Colmena Táctica:</span>
                <strong style="color:#c084fc;">267 Agentes 🌐</strong>
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

          <!-- Tactical View Switcher Tabs -->
          <div class="ak-office-view-switcher">
            <div class="ak-office-tabs">
              <button class="ak-office-tab-btn active" id="akBtnTabCore" onclick="window.AkiraHologramBridge.switchTab('core')" title="Ver los 9 comandantes principales de Akira">
                <span class="ak-tab-icon">⚡</span>
                <span class="ak-tab-title">9 Comandantes del Núcleo</span>
                <span class="ak-tab-count">9</span>
              </button>
              <button class="ak-office-tab-btn" id="akBtnTabHive" onclick="window.AkiraHologramBridge.switchTab('hive')" title="Explorar e interactuar con los 267 especialistas tácticos de la Colmena">
                <span class="ak-tab-icon">🌐</span>
                <span class="ak-tab-title">Colmena Completa (267 Especialistas)</span>
                <span class="ak-tab-count" id="akHiveTabCount">267</span>
              </button>
            </div>
          </div>

          <!-- Holographic Grid of Agents (9 Core Commanders) -->
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
                    <div class="ak-deck-role" style="color:${agent.color};font-weight:600;">${agent.role}</div>
                    <div style="font-size:10.5px;color:rgba(255,255,255,0.7);margin-top:2px;">🛡️ ${agent.commandMando}</div>
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

          <!-- Embedded Hive 267 Agents View -->
          <div id="akHiveOfficeView" style="display:none;" class="ak-hive-office-section">
            <div class="ak-hive-office-toolbar">
              <div class="ak-hive-search-box">
                <span class="ak-search-icon">🔍</span>
                <input type="text" id="akHiveOfficeSearch" placeholder="Buscar especialista por nombre, rol o habilidades (ej: devops, seo, crypto, pentester, react)..." />
                <button id="akHiveOfficeSearchClear" class="ak-search-clear" style="display:none;">✕</button>
              </div>
              <div class="ak-hive-stats-counter">
                <span id="akHiveShowingCount">267 Especialistas Disponibles</span>
              </div>
            </div>

            <!-- Division Filter Pills Bar -->
            <div class="ak-hive-divisions-scroll" id="akHiveOfficeDivisions">
              <button class="ak-div-pill active" data-div="all">Todos <span class="pill-badge">267</span></button>
            </div>

            <!-- Dynamic Grid of 267 Agents -->
            <div class="ak-hive-cards-grid" id="akHiveOfficeCardsGrid">
              <div class="ak-loading-pulse">Cargando 267 especialistas de la Colmena...</div>
            </div>
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

    setupTabs() {
      // Tab switcher bindings
      const btnCore = document.getElementById("akBtnTabCore");
      const btnHive = document.getElementById("akBtnTabHive");
      if (btnCore) btnCore.addEventListener("click", () => this.switchTab("core"));
      if (btnHive) btnHive.addEventListener("click", () => this.switchTab("hive"));

      // Search input binding
      const searchInp = document.getElementById("akHiveOfficeSearch");
      const searchClear = document.getElementById("akHiveOfficeSearchClear");
      if (searchInp) {
        searchInp.addEventListener("input", (e) => {
          this.hiveSearchQuery = e.target.value.trim().toLowerCase();
          if (searchClear) searchClear.style.display = this.hiveSearchQuery ? "inline-block" : "none";
          this.renderHiveCards();
        });
      }
      if (searchClear) {
        searchClear.addEventListener("click", () => {
          if (searchInp) searchInp.value = "";
          this.hiveSearchQuery = "";
          searchClear.style.display = "none";
          this.renderHiveCards();
        });
      }

      // Check if Hive catalog is already in window
      if (window.__akiraHiveCatalog) {
        this.hiveCatalog = window.__akiraHiveCatalog;
        const countBadge = document.getElementById("akHiveTabCount");
        if (countBadge && this.hiveCatalog.total_agents) {
          countBadge.textContent = this.hiveCatalog.total_agents;
        }
      } else {
        window.addEventListener("akira:hive-loaded", (e) => {
          if (e.detail) {
            this.hiveCatalog = e.detail;
            const countBadge = document.getElementById("akHiveTabCount");
            if (countBadge && this.hiveCatalog.total_agents) {
              countBadge.textContent = this.hiveCatalog.total_agents;
            }
            if (this.currentTab === "hive") {
              this.renderHiveDivisions();
              this.renderHiveCards();
            }
          }
        });
      }
    }

    switchTab(tab) {
      this.currentTab = tab;
      const btnCore = document.getElementById("akBtnTabCore");
      const btnHive = document.getElementById("akBtnTabHive");
      const gridCore = document.getElementById("akBridgeGrid");
      const viewHive = document.getElementById("akHiveOfficeView");

      if (tab === "hive") {
        if (btnCore) btnCore.classList.remove("active");
        if (btnHive) btnHive.classList.add("active");
        if (gridCore) gridCore.style.display = "none";
        if (viewHive) viewHive.style.display = "flex";
        this.loadHiveCatalogAndRender();
      } else {
        if (btnHive) btnHive.classList.remove("active");
        if (btnCore) btnCore.classList.add("active");
        if (viewHive) viewHive.style.display = "none";
        if (gridCore) gridCore.style.display = "grid";
      }
    }

    async loadHiveCatalogAndRender() {
      if (!this.hiveCatalog) {
        if (window.__akiraHiveCatalog) {
          this.hiveCatalog = window.__akiraHiveCatalog;
        } else {
          try {
            const res = await fetch("./data/hive_agents_catalog.json");
            if (res.ok) {
              this.hiveCatalog = await res.json();
              window.__akiraHiveCatalog = this.hiveCatalog;
            }
          } catch (e) {
            console.warn("[AkiraHologramBridge] Failed to fetch hive catalog:", e);
          }
        }
      }

      if (this.hiveCatalog) {
        const countBadge = document.getElementById("akHiveTabCount");
        if (countBadge && this.hiveCatalog.total_agents) {
          countBadge.textContent = this.hiveCatalog.total_agents;
        }
        this.renderHiveDivisions();
        this.renderHiveCards();
      }
    }

    renderHiveDivisions() {
      const bar = document.getElementById("akHiveOfficeDivisions");
      if (!bar || !this.hiveCatalog || !this.hiveCatalog.divisions) return;

      const total = this.hiveCatalog.total_agents || 267;
      let html = `
        <button class="ak-div-pill ${this.hiveActiveDivision === 'all' ? 'active' : ''}" data-div="all">
          Todos <span class="pill-badge">${total}</span>
        </button>
      `;

      Object.entries(this.hiveCatalog.divisions).forEach(([key, div]) => {
        const isActive = this.hiveActiveDivision === key ? "active" : "";
        html += `
          <button class="ak-div-pill ${isActive}" data-div="${key}" style="--div-color:${div.color || '#6366f1'}">
            <span>${div.label}</span>
            <span class="pill-badge">${div.count || 0}</span>
          </button>
        `;
      });

      bar.innerHTML = html;

      bar.querySelectorAll(".ak-div-pill").forEach(pill => {
        pill.addEventListener("click", () => {
          bar.querySelectorAll(".ak-div-pill").forEach(p => p.classList.remove("active"));
          pill.classList.add("active");
          this.hiveActiveDivision = pill.dataset.div;
          this.renderHiveCards();
        });
      });
    }

    renderHiveCards() {
      const grid = document.getElementById("akHiveOfficeCardsGrid");
      const countEl = document.getElementById("akHiveShowingCount");
      if (!grid || !this.hiveCatalog || !this.hiveCatalog.agents) return;

      let agents = this.hiveCatalog.agents;

      if (this.hiveActiveDivision !== "all") {
        agents = agents.filter(a => a.division === this.hiveActiveDivision);
      }

      if (this.hiveSearchQuery) {
        const q = this.hiveSearchQuery;
        agents = agents.filter(a =>
          a.name.toLowerCase().includes(q) ||
          (a.description && a.description.toLowerCase().includes(q)) ||
          (a.vibe && a.vibe.toLowerCase().includes(q)) ||
          (a.division && a.division.toLowerCase().includes(q)) ||
          (a.keywords && a.keywords.some(k => k.toLowerCase().includes(q))) ||
          (a.tools && a.tools.some(t => t.toLowerCase().includes(q)))
        );
      }

      if (countEl) {
        countEl.textContent = `${agents.length} de ${this.hiveCatalog.total_agents || 267} especialistas`;
      }

      if (agents.length === 0) {
        grid.innerHTML = `
          <div style="grid-column:1/-1;text-align:center;padding:50px 20px;color:var(--text-muted);background:rgba(255,255,255,0.02);border-radius:12px;border:1px dashed rgba(255,255,255,0.08);">
            <div style="font-size:32px;margin-bottom:8px;">🔍</div>
            <strong style="color:#ffffff;">No se encontraron especialistas</strong>
            <p style="font-size:13px;margin-top:4px;">Prueba ajustando la búsqueda o seleccionando otra división.</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = agents.map(ag => {
        const divColor = ag.division_color || "#6366f1";
        const tools = ag.tools || [];
        return `
          <div class="ak-hive-agent-card" style="border-top:3px solid ${divColor};">
            <div class="ak-hive-card-top">
              <div class="ak-hive-card-emoji">${ag.emoji || '🤖'}</div>
              <div class="ak-hive-card-title-wrap">
                <h4 class="ak-hive-agent-name">${ag.name}</h4>
                <span class="ak-hive-div-tag" style="background:${divColor}20;color:${divColor};border-color:${divColor}40">
                  ${ag.division_label || ag.division}
                </span>
              </div>
            </div>

            <p class="ak-hive-agent-vibe">${ag.vibe || ag.description || 'Especialista táctico de la Colmena.'}</p>

            ${tools.length ? `
              <div style="display:flex;gap:4px;flex-wrap:wrap;margin:10px 0 12px;">
                ${tools.slice(0, 3).map(t => `<span style="font-size:10px;font-family:var(--font-mono);background:rgba(255,255,255,0.04);color:#94a3b8;padding:2px 6px;border-radius:4px;border:1px solid rgba(255,255,255,0.06);">${t}</span>`).join('')}
                ${tools.length > 3 ? `<span style="font-size:10px;color:var(--text-muted);padding:2px 4px;">+${tools.length - 3}</span>` : ''}
              </div>
            ` : ''}

            <div class="ak-hive-card-footer" style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;margin-top:auto;">
              <button class="ak-btn secondary small" onclick="window.AkiraHologramBridge.chatWithSpecialist('${ag.id}')" title="Conversar con ${ag.name} en el Chat de Akira">
                💬 Chatear
              </button>
              <button class="ak-btn primary small" onclick="window.AkiraHologramBridge.assignSpecialistToMission('${ag.id}')" title="Asignar a una Misión Táctica">
                🎯 Asignar Misión
              </button>
            </div>
          </div>
        `;
      }).join("");
    }

    chatWithSpecialist(agentId) {
      if (!this.hiveCatalog || !this.hiveCatalog.agents) return;
      const ag = this.hiveCatalog.agents.find(a => a.id === agentId);
      if (!ag) return;

      if (typeof window.showSection === "function") {
        window.showSection("chat");
      }

      setTimeout(() => {
        const msgInp = document.getElementById("msg");
        if (msgInp) {
          msgInp.value = `Akira, convoca a tu especialista ${ag.name} (${ag.division_label || ag.division}) para asistirme en: `;
          msgInp.focus();
          msgInp.selectionStart = msgInp.selectionEnd = msgInp.value.length;
        }
      }, 100);
    }

    assignSpecialistToMission(agentId) {
      if (!this.hiveCatalog || !this.hiveCatalog.agents) return;
      const ag = this.hiveCatalog.agents.find(a => a.id === agentId);
      if (!ag) return;

      if (typeof window.showSection === "function") {
        window.showSection("missions");
      }

      setTimeout(() => {
        const goalInp = document.getElementById("akMissionGoal") || document.getElementById("missionPanelGoal");
        if (goalInp) {
          goalInp.value = `[Especialista: ${ag.name}] `;
          goalInp.focus();
          goalInp.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }, 100);
    }
  }

  window.AkiraHologramBridge = new AkiraHologramBridge();

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      if (window.AkiraHologramBridge) window.AkiraHologramBridge.init();
    }, 450);
  });
})();
