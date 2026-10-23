/**
 * AKIRA MODERN TACTICAL MISSIONS PANEL
 * Replaces the technical cryptic missions table with an executive, high-polish dashboard:
 *  - 4 Quick-Launch Mission Templates
 *  - Clear step-by-step lifecycle with human diagnosis
 *  - Direct execution and approval workflows
 */
(function() {
  "use strict";

  const TEMPLATES = [
    {
      title: "🧠 Auditoría del Cerebro",
      goal: "Auditar los 58 nodos y 261 relaciones del Cerebro, verificando la consistencia semántica y el estado de la memoria persistente.",
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
                  <button class="ak-btn primary" id="akBtnCreateMission" style="align-self:flex-end;">🚀 Crear y Ejecutar Misión</button>
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
      // Template clicks
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
        if (!goal) { alert("Escribe un objetivo para la misión."); return; }
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
        const res = await fetch(backend + "/api/v8/missions/recent?limit=15", { headers });
        const data = await res.json();
        const items = data.missions || data.items || [];
        this.missions = items;

        if (!items.length) {
          listEl.innerHTML = `<div class="ak-empty-msg">No hay misiones recientes. ¡Crea tu primera misión con una plantilla!</div>`;
          return;
        }

        listEl.innerHTML = items.map(m => {
          const statusMap = {
            completed: { label: "Completada", cls: "status-idle", color: "#10b981" },
            in_progress: { label: "En Curso", cls: "status-working", color: "#00f2fe" },
            awaiting_approval: { label: "Requiere Aprobación", cls: "status-thinking", color: "#f59e0b" },
            failed: { label: "Revisar", cls: "status-disabled", color: "#f43f5e" }
          };
          const st = statusMap[m.status] || { label: m.status || "Desconocido", cls: "status-idle", color: "#cbd5e1" };

          return `
            <div class="ak-mission-item" onclick="window.AkiraMissionsModern.viewDetail('${m.id}')">
              <div class="ak-mission-item-head">
                <span class="ak-item-goal">${(m.goal || "Misión sin título").slice(0, 65)}...</span>
                <span class="ak-deck-status-badge ${st.cls}" style="border-color:${st.color};color:${st.color}">${st.label}</span>
              </div>
              <div class="ak-mission-item-meta">
                <span>Prioridad: <strong>${m.priority || "Normal"}</strong></span>
                <span>Pasos: <strong>${(m.steps && m.steps.length) || 0}</strong></span>
              </div>
            </div>
          `;
        }).join("");
      } catch (err) {
        listEl.innerHTML = `<div class="ak-error">Error al cargar misiones: ${err.message}</div>`;
      }
    }

    async createMission(goal, priority) {
      const btn = document.getElementById("akBtnCreateMission");
      btn.disabled = true;
      btn.textContent = "⏳ Creando misión...";

      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : { "Content-Type": "application/json" };
        
        const res = await fetch(backend + "/api/v8/missions", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ goal, priority })
        });
        const data = await res.json();

        if (data.ok && data.mission) {
          alert("¡Misión creada exitosamente! Akira y sus agentes han comenzado la planificación.");
          document.getElementById("akMissionGoal").value = "";
          await this.loadMissions();
          this.viewDetail(data.mission.id);
        } else {
          alert("No se pudo crear la misión: " + (data.reason || "Error desconocido"));
        }
      } catch (err) {
        alert("Error de red al crear la misión: " + err.message);
      } finally {
        btn.disabled = false;
        btn.textContent = "🚀 Crear y Ejecutar Misión";
      }
    }

    viewDetail(missionId) {
      const m = this.missions.find(x => x.id === missionId);
      if (!m) return;

      const card = document.getElementById("akMissionDetailCard");
      const title = document.getElementById("akDetailTitle");
      const statusBadge = document.getElementById("akDetailStatusBadge");
      const body = document.getElementById("akDetailBody");
      const actions = document.getElementById("akDetailActions");

      card.style.display = "block";
      title.textContent = `Misión: ${m.id.slice(0, 16)}...`;
      statusBadge.textContent = m.status;

      let stepsHtml = "";
      if (Array.isArray(m.steps) && m.steps.length) {
        stepsHtml = `
          <h5 style="margin:14px 0 8px;color:#fff;">Pasos Planificados y Ejecutados:</h5>
          <div class="ak-steps-timeline">
            ${m.steps.map((s, i) => `
              <div class="ak-timeline-step">
                <span class="step-num">${i + 1}</span>
                <div class="step-info">
                  <strong>${s.title || s.action || "Paso " + (i+1)}</strong>
                  <p style="font-size:12.5px;color:var(--text-muted);margin-top:2px;">${s.description || s.result || "En ejecución"}</p>
                </div>
              </div>
            `).join("")}
          </div>
        `;
      } else {
        stepsHtml = `<p style="color:var(--text-muted);font-size:13px;margin-top:10px;">Esta misión está esperando que el planificador genere los pasos de acción.</p>`;
      }

      body.innerHTML = `
        <div style="background:rgba(255,255,255,0.03);padding:14px;border-radius:var(--radius-md);margin-bottom:12px;">
          <strong style="color:var(--accent-cyan);font-size:12px;text-transform:uppercase;">Objetivo Principal:</strong>
          <p style="color:#ffffff;font-size:14px;margin-top:4px;line-height:1.5;">${m.goal}</p>
        </div>
        ${stepsHtml}
      `;

      let actionButtons = "";
      if (m.status === "awaiting_approval") {
        actionButtons = `
          <button class="ak-btn primary small" onclick="window.AkiraMissionsModern.approve('${m.id}')">✓ Aprobar Ejecución</button>
          <button class="ak-btn secondary small" onclick="window.AkiraMissionsModern.cancel('${m.id}')">✕ Cancelar</button>
        `;
      } else if (m.status === "failed") {
        actionButtons = `
          <button class="ak-btn primary small" onclick="window.AkiraMissionsModern.retry('${m.id}')">↻ Reintentar Misión</button>
        `;
      }
      actions.innerHTML = actionButtons;
    }

    async approve(id) {
      const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
      const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : {};
      await fetch(`${backend}/api/v8/missions/${id}/approve`, { method: "POST", headers });
      alert("¡Misión aprobada! Los agentes han recibido la orden de ejecución.");
      this.loadMissions();
    }

    async cancel(id) {
      const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
      const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : {};
      await fetch(`${backend}/api/v8/missions/${id}/cancel`, { method: "POST", headers });
      alert("Misión cancelada.");
      this.loadMissions();
    }

    async retry(id) {
      alert("Re-encolando misión para nueva resolución...");
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
