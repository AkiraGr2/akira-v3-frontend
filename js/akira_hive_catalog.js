/**
 * AKIRA HIVE AGENTS CATALOG & AUTO-SELECTION ENGINE
 * Manages 267+ specialized agent personas across 18 divisions.
 * 100% local-first, zero-cost, high performance.
 */
(function() {
  "use strict";

  class AkiraHiveCatalog {
    constructor() {
      this.catalog = null;
      this.activeDivision = "all";
      this.searchQuery = "";
      this.init();
    }

    async init() {
      try {
        const res = await fetch("./data/hive_agents_catalog.json");
        if (res.ok) {
          this.catalog = await res.json();
          window.__akiraHiveCatalog = this.catalog;
          console.log(`[AkiraHive] Loaded ${this.catalog.total_agents} agents across ${Object.keys(this.catalog.divisions).length} divisions.`);
          window.dispatchEvent(new CustomEvent("akira:hive-loaded", { detail: this.catalog }));
        }
      } catch (e) {
        console.warn("[AkiraHive] Failed to load catalog JSON:", e);
      }
    }

    autoSelect(task, limit = 3) {
      if (!this.catalog || !this.catalog.agents || !task) return [];
      const normTask = task.toLowerCase();
      const words = normTask.match(/\b\w{3,}\b/g) || [];

      const scored = [];
      for (const agent of this.catalog.agents) {
        let score = 0;
        const nameNorm = agent.name.toLowerCase();
        const descNorm = (agent.description || "").toLowerCase();
        const vibeNorm = (agent.vibe || "").toLowerCase();
        const keywords = (agent.keywords || []).map(k => k.toLowerCase());

        for (const w of words) {
          if (nameNorm.includes(w)) score += 20;
          else if (keywords.some(k => k.startsWith(w.slice(0, 4)) || w.startsWith(k.slice(0, 4)))) score += 10;
          else if (descNorm.includes(w)) score += 4;
          else if (vibeNorm.includes(w)) score += 2;
        }

        if (nameNorm && normTask.includes(nameNorm)) score += 40;

        if (score > 0) {
          scored.push({ agent, score });
        }
      }

      scored.sort((a, b) => b.score - a.score);
      const results = [];
      const seen = new Set();
      for (const item of scored) {
        if (!seen.has(item.agent.id)) {
          seen.add(item.agent.id);
          results.push(item.agent);
          if (results.length >= limit) break;
        }
      }
      return results;
    }

    openCatalogModal(selectedAgentCallback) {
      let modal = document.getElementById("akiraHiveModal");
      if (!modal) {
        modal = document.createElement("div");
        modal.id = "akiraHiveModal";
        modal.className = "ak-hive-modal-backdrop";
        document.body.appendChild(modal);
      }

      modal.innerHTML = `
        <div class="ak-hive-modal-card">
          <div class="ak-hive-modal-header">
            <div>
              <div class="ak-hive-pill-tag">COLMENA TÁCTICA // 267 ESPECIALISTAS</div>
              <h3 style="font-size:20px;color:#fff;margin:4px 0 0 0;">Catálogo de Agentes Autónomos</h3>
              <p style="font-size:12.5px;color:var(--text-muted);margin:3px 0 0 0;">Selecciona un especialista para asignarlo a una misión o consultar su procedimiento operativo.</p>
            </div>
            <button class="ak-hive-close-btn" id="akHiveCloseBtn">✕</button>
          </div>

          <div class="ak-hive-modal-toolbar">
            <input type="text" id="akHiveSearchInput" class="ak-hive-search-input" placeholder="🔍 Buscar agente por nombre, especialidad o palabra clave..." value="${this.searchQuery}">
          </div>

          <div class="ak-hive-divisions-bar" id="akHiveDivisionsBar">
            <button class="ak-hive-div-chip ${this.activeDivision === 'all' ? 'active' : ''}" data-div="all">Todos (267)</button>
            ${this.catalog && this.catalog.divisions ? Object.entries(this.catalog.divisions).map(([key, d]) => `
              <button class="ak-hive-div-chip ${this.activeDivision === key ? 'active' : ''}" data-div="${key}" style="--div-color:${d.color}">
                ${d.label}
              </button>
            `).join("") : ""}
          </div>

          <div class="ak-hive-agents-grid" id="akHiveAgentsGrid">
            <div class="ak-loading-pulse">Cargando agentes...</div>
          </div>
        </div>
      `;

      modal.style.display = "flex";

      // Events
      modal.querySelector("#akHiveCloseBtn").addEventListener("click", () => {
        modal.style.display = "none";
      });
      modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.style.display = "none";
      });

      const searchInput = modal.querySelector("#akHiveSearchInput");
      searchInput.addEventListener("input", (e) => {
        this.searchQuery = e.target.value.trim().toLowerCase();
        this.renderAgentCards(modal, selectedAgentCallback);
      });

      modal.querySelectorAll(".ak-hive-div-chip").forEach(btn => {
        btn.addEventListener("click", () => {
          modal.querySelectorAll(".ak-hive-div-chip").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          this.activeDivision = btn.dataset.div;
          this.renderAgentCards(modal, selectedAgentCallback);
        });
      });

      this.renderAgentCards(modal, selectedAgentCallback);
    }

    renderAgentCards(modal, callback) {
      const grid = modal.querySelector("#akHiveAgentsGrid");
      if (!grid || !this.catalog) return;

      let agents = this.catalog.agents || [];
      if (this.activeDivision !== "all") {
        agents = agents.filter(a => a.division === this.activeDivision);
      }
      if (this.searchQuery) {
        agents = agents.filter(a => 
          a.name.toLowerCase().includes(this.searchQuery) ||
          (a.description && a.description.toLowerCase().includes(this.searchQuery)) ||
          (a.vibe && a.vibe.toLowerCase().includes(this.searchQuery)) ||
          (a.keywords && a.keywords.some(k => k.toLowerCase().includes(this.searchQuery)))
        );
      }

      if (agents.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);">No se encontraron especialistas para los criterios seleccionados.</div>`;
        return;
      }

      grid.innerHTML = agents.map(ag => `
        <div class="ak-hive-agent-card" style="border-top:3px solid ${ag.division_color || '#6366f1'}">
          <div class="ak-hive-card-top">
            <div class="ak-hive-card-emoji">${ag.emoji || '🤖'}</div>
            <div class="ak-hive-card-title-wrap">
              <h4 class="ak-hive-agent-name">${ag.name}</h4>
              <span class="ak-hive-div-tag" style="background:${ag.division_color}22;color:${ag.division_color};border-color:${ag.division_color}44">
                ${ag.division_label || ag.division}
              </span>
            </div>
          </div>
          <p class="ak-hive-agent-vibe">${ag.vibe || ag.description || 'Especialista táctico de la Colmena.'}</p>
          <div class="ak-hive-card-footer">
            <button class="ak-btn primary small ak-hive-invoke-btn" data-agent-id="${ag.id}">
              ⚡ Invocar Especialista
            </button>
          </div>
        </div>
      `).join("");

      grid.querySelectorAll(".ak-hive-invoke-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const agentId = btn.dataset.agentId;
          const agent = this.catalog.agents.find(a => a.id === agentId);
          modal.style.display = "none";
          if (callback && agent) {
            callback(agent);
          } else if (agent) {
            // Default: paste into chat or mission
            const goalEl = document.getElementById("akMissionGoal");
            if (goalEl) {
              goalEl.value = `[Especialista: ${agent.name}] ` + (goalEl.value || "");
              window.showSection("missions");
            } else {
              window.sendSuggestedPrompt && window.sendSuggestedPrompt(`Akira, convoca a tu especialista ${agent.name} (${agent.division_label}) para asistirme.`);
            }
          }
        });
      });
    }
  }

  window.AkiraHive = new AkiraHiveCatalog();
})();
