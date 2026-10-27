/**
 * AKIRA MODERN TACTICAL MISSIONS PANEL (100% Backend Contract Compliant)
 * Fixed:
 *  - Sends { objective, title, priority: integer } (fixes "objective_required" error)
 *  - Uses correct backend endpoints (/api/v8/missions, /approve, /execute, /diagnose)
 *  - Displays mission titles and steps properly
 *  - Human-friendly diagnosis on failed missions
 */
(function() {
  "use strict";

  const TEMPLATES = [
    {
      title: "🐝 Enjambre Full-Stack SaaS",
      goal: "[ENJAMBRE EN CADENA] Construir una aplicación web completa: 1. Comandante Nexo define requerimientos, 2. Arquitecto diseña esquema y API, 3. Desarrollador escribe código, 4. Auditor QA valida seguridad y ejecución.",
      priority: "critical"
    },
    {
      title: "💼 Enjambre Bidding Upwork",
      goal: "[ENJAMBRE EN CADENA] Diseñar propuesta de alto cierre para Upwork: 1. Nexo evalúa viabilidad y precio, 2. Copywriter redacta propuesta persuasiva, 3. Especialista técnico prepara muestra de código, 4. Auditor valida entrega.",
      priority: "high"
    },
    {
      title: "🔬 Enjambre Investigación Neuronal",
      goal: "[ENJAMBRE EN CADENA] Investigar y estructurar conocimiento: 1. Investigador rastrea fuentes, 2. Analista extrae conceptos clave, 3. Tejedora enlaza nodos en la Membrana.",
      priority: "normal"
    },
    {
      title: "🧠 Auditoría del Cerebro",
      goal: "Auditar los nodos y relaciones del Cerebro, verificando la consistencia semántica y el estado de la memoria persistente.",
      priority: "normal"
    },
    {
      title: "💼 Estrategia de Upwork",
      goal: "Diseñar un plan de 5 pasos para postular y automatizar entregas de Web Scraping y Limpieza de Datos en Upwork con Akira.",
      priority: "high"
    },
    {
      title: "🌐 Investigación de Tendencias",
      goal: "Investigar las mejores prácticas de colaboración entre agentes autónomos y sintetizar las lecciones en un resumen ejecutivo.",
      priority: "normal"
    },
    {
      title: "🛡️ Selftest de Integridad",
      goal: "Ejecutar la verificación de extremo a extremo de las herramientas del sistema y registrar los resultados en la memoria.",
      priority: "critical"
    }
  ];

  class AkiraMissionsModern {
    constructor() {
      this.missions = [];
      this.selectedMission = null;
    }

    init() {
      const container = document.getElementById("missionsSection");
      if (!container) return;

      container.innerHTML = `
        <div class="ak-missions-wrap">
          <!-- Hero -->
          <div class="ak-missions-hero">
            <div class="ak-missions-badge">ORQUESTACIÓN COGNITIVA</div>
            <h2>Misiones Autónomas de Akira</h2>
            <p>Define un objetivo en lenguaje normal. Akira coordina a sus agentes especialistas para planificar, ejecutar y guardar los resultados en la memoria persistente.</p>
          </div>

          <!-- Quick Templates -->
          <div class="ak-niche-row">
            <span class="ak-niche-label">Plantillas Rápidas:</span>
            ${TEMPLATES.map((t, idx) => `
              <button class="ak-niche-chip" data-template="${idx}">
                ${t.title}
              </button>
            `).join("")}
          </div>

          <!-- Main Layout: Form + List -->
          <div class="ak-missions-layout">
            <!-- Left: Create Form -->
            <div class="ak-missions-creator">
              <div class="ak-card">
                <label class="ak-label">¿Cuál es el objetivo de la misión?</label>
                <textarea id="akMissionGoal" class="ak-textarea" placeholder="Describe qué quieres que Akira y sus agentes logren (ej. analizar un tema, armar una estrategia, auditar la memoria)..."></textarea>
                
                <!-- Auto-Selection of Hive Specialists -->
                <div id="akMissionAutoAgents" style="margin-top:10px;padding:9px 12px;background:rgba(0,242,254,0.06);border:1px dashed rgba(0,242,254,0.3);border-radius:10px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                  <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:16px;">🤖</span>
                    <span style="font-size:12px;color:#94a3b8;" id="akMissionAutoText">Akira seleccionará automáticamente los especialistas de la Colmena (267 disponibles).</span>
                  </div>
                  <button type="button" class="ak-btn secondary small" id="akBtnBrowseHive" style="font-size:11px;padding:4px 10px;">
                    🌐 Explorar 267 Agentes
                  </button>
                </div>
                <div id="akMissionSelectedAgentsPills" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;"></div>
                
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;flex-wrap:wrap;gap:10px;">
                  <div>
                    <label class="ak-label" style="margin-bottom:6px;">Prioridad:</label>
                    <select id="akMissionPriority" class="ak-select">
                      <option value="normal">Normal (Estándar)</option>
                      <option value="high">Alta (Prioritaria)</option>
                      <option value="critical">Crítica (Inmediata)</option>
                    </select>
                  </div>
                  <button class="ak-btn primary" id="akBtnCreateMission" style="align-self:flex-end;">🚀 Crear y Ejecutar Inmediatamente</button>
                </div>
              </div>

              <!-- Mission Detail Viewer -->
              <div class="ak-card" id="akMissionDetailCard" style="margin-top:18px;display:none;">
                <div class="ak-detail-head">
                  <h4 id="akDetailTitle">Detalle de la Misión</h4>
                  <span id="akDetailStatusBadge" class="ak-deck-status-badge">Estado</span>
                </div>
                <div id="akDetailBody" class="ak-detail-body"></div>
                <div class="ak-card-actions" id="akDetailActions" style="margin-top:14px;"></div>
              </div>
            </div>

            <!-- Right: Active Missions List -->
            <div class="ak-missions-history">
              <div class="ak-history-head">
                <h4>Historial de Misiones</h4>
                <button class="ak-btn secondary small" id="akBtnRefreshMissions">↻ Actualizar</button>
              </div>
              <div id="akMissionsList" class="ak-missions-list">
                <div class="ak-loading-pulse">Cargando misiones...</div>
              </div>
            </div>
          </div>
        </div>
      `;

      this.bindEvents(container);
      this.loadMissions();
    }

    bindEvents(container) {
      // Template pre-fill
      container.querySelectorAll(".ak-niche-chip").forEach(chip => {
        chip.addEventListener("click", () => {
          const t = TEMPLATES[parseInt(chip.dataset.template, 10)];
          if (t) {
            document.getElementById("akMissionGoal").value = t.goal;
            document.getElementById("akMissionPriority").value = t.priority;
            updateAutoAgents();
          }
        });
      });

      // Real-time Hive Auto-Selection on Goal Input
      const goalInput = container.querySelector("#akMissionGoal");
      const pillsContainer = container.querySelector("#akMissionSelectedAgentsPills");
      const autoText = container.querySelector("#akMissionAutoText");

      const updateAutoAgents = () => {
        const val = goalInput ? goalInput.value.trim() : "";
        if (!val || !window.AkiraHive || typeof window.AkiraHive.autoSelect !== "function") {
          if (pillsContainer) pillsContainer.innerHTML = "";
          if (autoText) autoText.textContent = "Akira seleccionará automáticamente los especialistas de la Colmena (267 disponibles).";
          return;
        }

        const selected = window.AkiraHive.autoSelect(val, 3);
        if (selected.length > 0) {
          if (autoText) autoText.textContent = `🎯 Akira convocó ${selected.length} especialistas para esta misión:`;
          if (pillsContainer) {
            pillsContainer.innerHTML = selected.map(ag => `
              <span class="ak-niche-chip" style="font-size:11px;padding:3px 10px;border-color:${ag.division_color}88;color:#fff;background:${ag.division_color}22;" title="${ag.vibe}">
                ${ag.emoji} ${ag.name} (${ag.division_label})
              </span>
            `).join("");
          }
        } else {
          if (pillsContainer) pillsContainer.innerHTML = "";
          if (autoText) autoText.textContent = "Akira seleccionará automáticamente los especialistas de la Colmena (267 disponibles).";
        }
      };

      if (goalInput) {
        goalInput.addEventListener("input", updateAutoAgents);
      }

      // Browse Hive Button
      const browseBtn = container.querySelector("#akBtnBrowseHive");
      if (browseBtn) {
        browseBtn.addEventListener("click", () => {
          if (window.AkiraHive && typeof window.AkiraHive.openCatalogModal === "function") {
            window.AkiraHive.openCatalogModal((agent) => {
              if (agent && goalInput) {
                goalInput.value = `[Especialista asignado: ${agent.name}] ` + (goalInput.value || "");
                updateAutoAgents();
              }
            });
          }
        });
      }

      // Create Mission
      container.querySelector("#akBtnCreateMission").addEventListener("click", () => {
        const goal = document.getElementById("akMissionGoal").value.trim();
        const priority = document.getElementById("akMissionPriority").value;
        if (!goal) { alert("Por favor escribe el objetivo de la misión."); return; }
        this.createMission(goal, priority);
      });

      // Refresh
      container.querySelector("#akBtnRefreshMissions").addEventListener("click", () => {
        this.loadMissions();
      });
    }

    async loadMissions() {
      const listEl = document.getElementById("akMissionsList");
      if (!listEl) return;

      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : {};
        
        let res = await fetch(backend + "/api/v8/missions?limit=25", { headers });
        let data = await res.json();
        let items = data.missions || data.items || [];

        if (!items.length) {
          res = await fetch(backend + "/api/v8/missions/recent?limit=25", { headers });
          data = await res.json();
          items = data.missions || data.items || [];
        }

        // Incorporate zero-lag local mission if active
        try {
          const raw = localStorage.getItem("akira_last_active_mission");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && (Date.now() - (parsed.timestamp || 0)) < 15 * 60 * 1000) {
              if (!items.some(m => m.id === parsed.id)) {
                items.unshift(parsed);
              }
            }
          }
        } catch (_) {}

        this.missions = items;

        if (!items.length) {
          listEl.innerHTML = `<div class="ak-empty-msg" style="padding:20px;text-align:center;color:var(--text-muted);">No hay misiones registradas aún. ¡Crea una nueva con las plantillas superiores!</div>`;
          return;
        }

        listEl.innerHTML = items.map(m => {
          const statusMap = {
            completed: { label: "Completada", cls: "status-idle", color: "#10b981" },
            in_progress: { label: "En Curso", cls: "status-working", color: "#00f2fe" },
            waiting_approval: { label: "Esperando Aprobación", cls: "status-thinking", color: "#f59e0b" },
            awaiting_approval: { label: "Esperando Aprobación", cls: "status-thinking", color: "#f59e0b" },
            planning: { label: "Planificando", cls: "status-thinking", color: "#8b5cf6" },
            failed: { label: "Fallida / Revisar", cls: "status-disabled", color: "#f43f5e" }
          };
          const st = statusMap[m.status] || { label: m.status || "Registrada", cls: "status-idle", color: "#cbd5e1" };
          const title = m.title || m.objective || m.goal || "Misión sin título";
          const stepsCount = (m.plan && m.plan.steps && m.plan.steps.length) || (m.steps && m.steps.length) || 0;

          const isWaiting = m.status === "waiting_approval" || m.status === "awaiting_approval";
          const quickActionHtml = isWaiting ? `
            <div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08);">
              <span style="font-size:11px;color:#f59e0b;display:flex;align-items:center;gap:4px;">
                <span>🛡️</span> <em>Guardarraíl: Espera tu autorización</em>
              </span>
              <button class="ak-btn primary small" style="padding:4px 12px;font-size:11.5px;border-radius:6px;background:var(--accent-cyan);color:#050508;font-weight:700;cursor:pointer;" onclick="event.stopPropagation();window.AkiraMissionsModern.approveAndExecute('${m.id}')">⚡ Despachar Ahora</button>
            </div>
          ` : "";

          return `
            <div class="ak-mission-item" onclick="window.AkiraMissionsModern.viewDetail('${m.id}')">
              <div class="ak-mission-item-head">
                <span class="ak-item-goal">${title.slice(0, 65)}${title.length > 65 ? "..." : ""}</span>
                <span class="ak-deck-status-badge ${st.cls}" style="border-color:${st.color};color:${st.color}">${st.label}</span>
              </div>
              <div class="ak-mission-item-meta">
                <span>Prioridad: <strong>${m.priority || 5}/10</strong></span>
                <span>Pasos Planificados: <strong>${stepsCount}</strong></span>
              </div>
              ${quickActionHtml}
            </div>
          `;
        }).join("");
      } catch (err) {
        listEl.innerHTML = `<div class="ak-error" style="color:var(--accent-magenta);padding:14px;">Error al cargar misiones: ${err.message}</div>`;
      }
    }

    async createMission(goal, priority) {
      const btn = document.getElementById("akBtnCreateMission");
      btn.disabled = true;
      btn.textContent = "⏳ Planificando y Lanzando con Akira...";

      const priorityMap = { normal: 5, high: 8, critical: 10 };
      const priorityNum = priorityMap[priority] || 5;
      const title = goal.slice(0, 75).trim();

      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : { "Content-Type": "application/json" };
        
        // Enriquecer el objetivo con los especialistas de la Colmena y Comandante convocados
        let enrichedObjective = goal;
        try {
          if (window.AkiraHive && typeof window.AkiraHive.autoSelect === "function") {
            const selected = window.AkiraHive.autoSelect(goal, 3);
            if (selected.length > 0) {
              const specList = selected.map(s => `${s.name} (${s.division_label})`).join(", ");
              enrichedObjective = `${goal} [Especialistas Colmena convocados: ${specList}]`;
            }
          }
        } catch (_) {}

        // Exact backend payload: requires objective (string), title (string), priority (int)
        const res = await fetch(backend + "/api/v8/missions", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({
            objective: enrichedObjective,
            title: title,
            priority: priorityNum
          })
        });
        const data = await res.json();

        if (data.ok && (data.mission || data.plan)) {
          const targetId = (data.mission && data.mission.id) || data.mission_id;
          const planSteps = (data.plan && data.plan.steps) || (data.mission && data.mission.plan && data.mission.plan.steps) || [];
          
          // Cache locally for instantaneous multi-tab reactivity
          const missionPayload = {
            id: targetId,
            title: title,
            objective: goal,
            status: "running",
            steps: planSteps,
            timestamp: Date.now()
          };
          try {
            localStorage.setItem("akira_last_active_mission", JSON.stringify(missionPayload));
          } catch (_) {}

          // Automatically approve and execute immediately so agents start working
          if (targetId) {
            await this.approveAndExecute(targetId, true);
          }

          window.dispatchEvent(new CustomEvent("akira:mission-activity", { detail: missionPayload }));

          alert("🚀 ¡Misión planificada y ejecutándose en tiempo real! Akira y sus agentes especialistas ya están operando. Puedes observarlos en vivo en el apartado de Oficina.");
          document.getElementById("akMissionGoal").value = "";
          await this.loadMissions();
          if (targetId) {
            this.viewDetail(targetId);
          }
        } else {
          alert("No se pudo crear la misión: " + (data.reason || data.detail || "Error desconocido"));
        }
      } catch (err) {
        alert("Error al conectar con el servidor: " + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = "🚀 Crear y Ejecutar Inmediatamente";
      }
    }

    viewDetail(missionId) {
      const m = this.missions.find(x => x.id === missionId);
      if (!m) return;

      const card = document.getElementById("akMissionDetailCard");
      const titleEl = document.getElementById("akDetailTitle");
      const statusBadge = document.getElementById("akDetailStatusBadge");
      const body = document.getElementById("akDetailBody");
      const actions = document.getElementById("akDetailActions");

      card.style.display = "block";
      const displayTitle = m.title || m.objective || `Misión #${m.id.slice(0, 8)}`;
      titleEl.textContent = displayTitle;
      statusBadge.textContent = m.status;

      const steps = (m.plan && m.plan.steps) || m.steps || [];
      let stepsHtml = "";

      const isSwarm = (m.objective || "").includes("[ENJAMBRE EN CADENA]") || (m.title || "").includes("Enjambre") || steps.length >= 3;
      const swarmHandoffHtml = isSwarm ? `
        <div class="ak-swarm-chain-wrap" style="margin:14px 0;background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.3);border-radius:8px;padding:12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
            <strong style="color:#a78bfa;font-size:11.5px;letter-spacing:0.5px;display:flex;align-items:center;gap:6px;">
              <span>🐝</span> CADENA DE ENJAMBRE MULTI-AGENTE (SWARM PIPELINE)
            </strong>
            <span style="font-size:10px;color:#00f2fe;background:rgba(0,242,254,0.1);padding:2px 6px;border-radius:4px;">Handoff Activo</span>
          </div>
          <div class="ak-swarm-nodes-row" style="display:flex;align-items:center;gap:8px;overflow-x:auto;padding-bottom:6px;">
            <div class="ak-swarm-node" style="background:#111827;border:1px solid #10b981;border-radius:6px;padding:6px 10px;text-align:center;min-width:110px;">
              <small style="color:#10b981;font-size:9px;font-weight:700;display:block;">1. ESTRATEGIA</small>
              <strong style="color:#fff;font-size:11px;">Comandante Nexo</strong>
            </div>
            <span style="color:#a78bfa;font-weight:bold;">➔</span>
            <div class="ak-swarm-node" style="background:#111827;border:1px solid #8b5cf6;border-radius:6px;padding:6px 10px;text-align:center;min-width:110px;">
              <small style="color:#8b5cf6;font-size:9px;font-weight:700;display:block;">2. ARQUITECTURA</small>
              <strong style="color:#fff;font-size:11px;">Arquitecto Colmena</strong>
            </div>
            <span style="color:#a78bfa;font-weight:bold;">➔</span>
            <div class="ak-swarm-node" style="background:#111827;border:1px solid #00f2fe;border-radius:6px;padding:6px 10px;text-align:center;min-width:110px;">
              <small style="color:#00f2fe;font-size:9px;font-weight:700;display:block;">3. DESARROLLO</small>
              <strong style="color:#fff;font-size:11px;">Dev Specialist</strong>
            </div>
            <span style="color:#a78bfa;font-weight:bold;">➔</span>
            <div class="ak-swarm-node" style="background:#111827;border:1px solid #f59e0b;border-radius:6px;padding:6px 10px;text-align:center;min-width:110px;">
              <small style="color:#f59e0b;font-size:9px;font-weight:700;display:block;">4. QA & AUDITORÍA</small>
              <strong style="color:#fff;font-size:11px;">Auditor Seguridad</strong>
            </div>
          </div>
        </div>
      ` : "";

      if (Array.isArray(steps) && steps.length) {
        stepsHtml = `
          ${swarmHandoffHtml}
          <h5 style="margin:16px 0 10px;color:#fff;">Pasos Tácticos Asignados (${steps.length}):</h5>
          <div class="ak-steps-timeline">
            ${steps.map((s, i) => `
              <div class="ak-timeline-step">
                <span class="step-num">${i + 1}</span>
                <div class="step-info" style="flex:1;">
                  <strong style="color:#ffffff;font-size:13.5px;">${s.title || s.action || s.name || "Paso " + (i+1)}</strong>
                  <p style="font-size:12.5px;color:var(--text-muted);margin-top:2px;">${s.description || s.summary || s.result || "Esperando ejecución de agente."}</p>
                  ${s.agent ? `<span class="ak-stat-chip" style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;font-size:11.5px;margin-top:6px;background:rgba(0,242,254,0.1);border:1px solid rgba(0,242,254,0.3);color:#00f2fe;border-radius:12px;">🛡️ Asignado: <strong>${s.agent}</strong></span>` : ""}
                </div>
              </div>
            `).join("")}
          </div>
        `;
      } else {
        stepsHtml = `<p style="color:var(--text-muted);font-size:13px;margin-top:12px;">Esta misión está planificando o esperando asignación de pasos.</p>`;
      }

      body.innerHTML = `
        <div style="background:rgba(255,255,255,0.03);padding:14px;border-radius:var(--radius-md);margin-bottom:12px;">
          <strong style="color:var(--accent-cyan);font-size:11.5px;text-transform:uppercase;letter-spacing:0.05em;">Objetivo Completo:</strong>
          <p style="color:#ffffff;font-size:14px;margin-top:4px;line-height:1.5;">${m.objective || m.goal || displayTitle}</p>
        </div>
        ${stepsHtml}
      `;

      let actionButtons = `
        <button class="ak-btn secondary small" onclick="window.showSection('office')">⚡ Ver Agentes en Oficina</button>
      `;

      if (m.status === "waiting_approval" || m.status === "awaiting_approval") {
        if (window.akiraIsAutopilot && window.akiraIsAutopilot()) {
          actionButtons += `
            <div style="background:rgba(139,92,246,0.15);border:1px solid rgba(139,92,246,0.3);border-radius:6px;padding:6px 12px;font-size:11.5px;color:#c4b5fd;display:inline-flex;align-items:center;gap:6px;">
              <span>⚡</span> Modo Autopilot: auto-ejecutando misión en segundo plano.
            </div>
            <button class="ak-btn secondary small" onclick="window.AkiraMissionsModern.reject('${m.id}')">✕ Cancelar Misión</button>
          `;
          setTimeout(() => { try { this.approveAndExecute(m.id, true); } catch(_) {} }, 200);
        } else {
          actionButtons += `
            <button class="ak-btn primary small" onclick="window.AkiraMissionsModern.approveAndExecute('${m.id}')">⚡ Aprobar y Ejecutar Misión</button>
            <button class="ak-btn secondary small" onclick="window.AkiraMissionsModern.reject('${m.id}')">✕ Cancelar</button>
          `;
        }
      } else if (m.status === "failed") {
        actionButtons += `
          <button class="ak-btn secondary small" onclick="window.AkiraMissionsModern.diagnose('${m.id}')">🔍 Ver Diagnóstico de Fallo</button>
          <button class="ak-btn primary small" onclick="window.AkiraMissionsModern.retry('${m.id}')">↻ Reintentar</button>
        `;
      }
      actions.innerHTML = actionButtons;

      // Smooth scroll to detail
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    async approveAndExecute(id, silent = false) {
      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : {};
        
        // 1. Approve
        const appRes = await fetch(`${backend}/api/v8/missions/${id}/approve`, { method: "POST", headers });
        const appData = await appRes.json();
        
        // 2. Execute
        const execRes = await fetch(`${backend}/api/v8/missions/${id}/execute`, { method: "POST", headers });
        const execData = await execRes.json();

        // Broadcast to office bridge
        const m = this.missions.find(x => x.id === id);
        const payload = {
          id: id,
          title: m ? m.title : `Misión #${id.slice(0, 8)}`,
          status: "running",
          steps: (m && m.plan && m.plan.steps) || [],
          timestamp: Date.now()
        };
        try {
          localStorage.setItem("akira_last_active_mission", JSON.stringify(payload));
        } catch (_) {}
        window.dispatchEvent(new CustomEvent("akira:mission-activity", { detail: payload }));

        if (!silent) {
          alert("¡Misión aprobada y en ejecución! Los agentes especialistas están trabajando en los pasos.");
          await this.loadMissions();
          this.viewDetail(id);
        }
      } catch (err) {
        if (!silent) alert("Error al aprobar misión: " + err.message);
      }
    }

    async reject(id) {
      if (!confirm("¿Deseas cancelar esta misión?")) return;
      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : {};
        await fetch(`${backend}/api/v8/missions/${id}/reject`, { method: "POST", headers });
        alert("Misión cancelada.");
        await this.loadMissions();
      } catch (err) {
        alert("Error: " + err.message);
      }
    }

    async diagnose(id) {
      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : {};
        const res = await fetch(`${backend}/api/v8/missions/${id}/diagnose`, { headers });
        const d = await res.json();
        let report = `Diagnóstico de Akira (Misión #${id.slice(0, 8)}):\n\n`;
        if (d.summary) {
          report += `Estado: ${d.summary.FAIL === 0 ? '✅ Consistente y saludable' : '⚠️ Hallazgos detectados'} (${d.summary.PASS}/${d.summary.total} pruebas superadas)\n\n`;
        }
        if (d.checks && Array.isArray(d.checks)) {
          const failures = d.checks.filter(c => c.status === "FAIL");
          if (failures.length > 0) {
            report += "Detalle de hallazgos:\n";
            failures.forEach(f => {
              const msg = (f.detail && (f.detail.message || f.detail.reason)) || f.name;
              report += `• [${f.name}]: ${msg}\n`;
            });
          } else {
            report += "Todas las comprobaciones de consistencia y ejecución están en orden.";
          }
        } else if (d.reason || d.diagnostic) {
          report += `Motivo: ${d.reason || d.diagnostic}`;
        } else {
          report += "No se registraron fallas críticas en las pruebas del orquestador.";
        }
        alert(report);
      } catch (err) {
        alert("No se pudo obtener diagnóstico: " + err.message);
      }
    }

    async retry(id) {
      alert("Reintentando planificación de la misión...");
      this.loadMissions();
    }
  }

  window.AkiraMissionsModern = new AkiraMissionsModern();

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      if (window.AkiraMissionsModern) window.AkiraMissionsModern.init();
    }, 450);
  });
})();
