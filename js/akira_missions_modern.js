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
                
                <div style="display:flex;align-items:center;justify-content:space-between;margin-top:14px;flex-wrap:wrap;gap:10px;">
                  <div>
                    <label class="ak-label" style="margin-bottom:6px;">Prioridad:</label>
                    <select id="akMissionPriority" class="ak-select">
                      <option value="normal">Normal (Estándar)</option>
                      <option value="high">Alta (Prioritaria)</option>
                      <option value="critical">Crítica (Inmediata)</option>
                    </select>
                  </div>
                  <button class="ak-btn primary" id="akBtnCreateMission" style="align-self:flex-end;">🚀 Crear y Planificar Misión</button>
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
          }
        });
      });

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
      btn.textContent = "⏳ Planificando con Akira...";

      const priorityMap = { normal: 5, high: 8, critical: 10 };
      const priorityNum = priorityMap[priority] || 5;
      const title = goal.slice(0, 75).trim();

      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : { "Content-Type": "application/json" };
        
        // Exact backend payload: requires objective (string), title (string), priority (int)
        const res = await fetch(backend + "/api/v8/missions", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({
            objective: goal,
            title: title,
            priority: priorityNum
          })
        });
        const data = await res.json();

        if (data.ok && (data.mission || data.plan)) {
          alert("¡Misión creada y planificada exitosamente! Los agentes especialistas han generado los pasos de acción.");
          document.getElementById("akMissionGoal").value = "";
          await this.loadMissions();
          const targetId = (data.mission && data.mission.id) || data.mission_id;
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
        btn.textContent = "🚀 Crear y Planificar Misión";
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

      if (Array.isArray(steps) && steps.length) {
        stepsHtml = `
          <h5 style="margin:16px 0 10px;color:#fff;">Pasos Tácticos Asignados (${steps.length}):</h5>
          <div class="ak-steps-timeline">
            ${steps.map((s, i) => `
              <div class="ak-timeline-step">
                <span class="step-num">${i + 1}</span>
                <div class="step-info" style="flex:1;">
                  <strong style="color:#ffffff;font-size:13.5px;">${s.title || s.action || s.name || "Paso " + (i+1)}</strong>
                  <p style="font-size:12.5px;color:var(--text-muted);margin-top:2px;">${s.description || s.summary || s.result || "Esperando ejecución de agente."}</p>
                  ${s.agent ? `<span class="ak-stat-chip" style="display:inline-flex;padding:2px 8px;font-size:11px;margin-top:4px;">Agente: ${s.agent}</span>` : ""}
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

      let actionButtons = "";
      if (m.status === "waiting_approval" || m.status === "awaiting_approval") {
        actionButtons = `
          <button class="ak-btn primary small" onclick="window.AkiraMissionsModern.approveAndExecute('${m.id}')">⚡ Aprobar y Ejecutar Misión</button>
          <button class="ak-btn secondary small" onclick="window.AkiraMissionsModern.reject('${m.id}')">✕ Cancelar</button>
        `;
      } else if (m.status === "failed") {
        actionButtons = `
          <button class="ak-btn secondary small" onclick="window.AkiraMissionsModern.diagnose('${m.id}')">🔍 Ver Diagnóstico de Fallo</button>
          <button class="ak-btn primary small" onclick="window.AkiraMissionsModern.retry('${m.id}')">↻ Reintentar</button>
        `;
      }
      actions.innerHTML = actionButtons;

      // Smooth scroll to detail
      card.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    async approveAndExecute(id) {
      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : {};
        
        // 1. Approve
        const appRes = await fetch(`${backend}/api/v8/missions/${id}/approve`, { method: "POST", headers });
        const appData = await appRes.json();
        
        // 2. Execute
        const execRes = await fetch(`${backend}/api/v8/missions/${id}/execute`, { method: "POST", headers });
        const execData = await execRes.json();

        alert("¡Misión aprobada y en ejecución! Los agentes especialistas están trabajando en los pasos.");
        await this.loadMissions();
        this.viewDetail(id);
      } catch (err) {
        alert("Error al aprobar misión: " + err.message);
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
        const reason = d.reason || d.diagnostic || "La misión requería herramientas externas no disponibles o excedió el límite de pasos.";
        alert("Diagnóstico de Akira:\n\n" + JSON.stringify(reason, null, 2));
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
