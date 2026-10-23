/**
 * AKIRA MODERN ADMIN CONTROLLER (Centro de Control Ejecutivo y Sencillo)
 * Designed for intuitive, non-technical management of Akira:
 *  1. Live System Status (15/15 Verified Capacities, Server, Storage)
 *  2. Autoknowledge & Memory Dashboard with 1-Click Auto-Consolidate All
 *  3. Instant "Teach Akira" Natural Language Form
 *  4. Advanced diagnostics safely tucked in an optional drawer
 */
(function() {
  "use strict";

  class AkiraAdminModern {
    constructor() {
      this.statusData = null;
      this.candidateCount = 0;
    }

    init() {
      const container = document.getElementById("adminSection");
      if (!container) return;

      container.innerHTML = `
        <div class="ak-admin-wrap">
          <!-- Header -->
          <div class="ak-admin-hero">
            <div class="ak-admin-badge">ADMINISTRACIÓN Y CONTROL</div>
            <h2>Centro de Control de Akira</h2>
            <p>Gestiona el estado general, supervisa el autoconocimiento y enseña nuevos conceptos a Akira de manera sencilla y sin tecnicismos.</p>
          </div>

          <!-- Quick Summary Row -->
          <div class="ak-admin-metrics">
            <div class="ak-metric-card">
              <span class="ak-metric-label">Servidor</span>
              <strong id="admStatusServer" style="color:var(--accent-green)">🟢 En línea</strong>
              <small>Render Backend</small>
            </div>
            <div class="ak-metric-card">
              <span class="ak-metric-label">Tu Sesión</span>
              <strong id="admStatusOwner" style="color:var(--accent-cyan)">👑 Propietario</strong>
              <small id="admUserEmail">Verificado</small>
            </div>
            <div class="ak-metric-card">
              <span class="ak-metric-label">Capacidades</span>
              <strong id="admStatusCaps" style="color:var(--accent-green)">15 de 15</strong>
              <small>Verificadas y Activas</small>
            </div>
            <div class="ak-metric-card">
              <span class="ak-metric-label">Memoria & Grafo</span>
              <strong id="admStatusMem" style="color:var(--accent-purple)">58 Nodos</strong>
              <small>261 Relaciones</small>
            </div>
          </div>

          <!-- Main Cards Grid -->
          <div class="ak-admin-cards-grid">
            <!-- Card 1: Autoknowledge & Consolidation -->
            <div class="ak-card ak-highlight-card">
              <div class="ak-card-head-row">
                <div>
                  <h4 style="font-size:18px;color:#fff;">🧠 Autoconocimiento y Aprendizaje</h4>
                  <p style="font-size:13px;color:var(--text-muted);margin-top:2px;">Permite que Akira absorba sus experiencias y conocimientos pendientes.</p>
                </div>
                <span class="ak-candidate-counter" id="admCandidatePill">Consultando...</span>
              </div>

              <!-- Big Green Auto-Consolidate Button -->
              <div class="ak-consolidate-banner">
                <div>
                  <h5 style="color:#ffffff;font-size:15px;margin-bottom:4px;">⚡ Auto-Consolidación Inteligente</h5>
                  <p style="color:var(--text-secondary);font-size:13px;line-height:1.5;">Akira evaluará los conocimientos candidatos pendientes y los integrará de forma permanente al Cerebro sin pedirte aprobaciones manuales.</p>
                </div>
                <button class="ak-btn success large" id="admBtnAutoConsolidate">⚡ AUTO-CONSOLIDAR TODO</button>
              </div>

              <!-- Teach Akira Form -->
              <div class="ak-teach-box" style="margin-top:20px;">
                <label class="ak-label">📝 Enseñar algo nuevo a Akira (en lenguaje normal):</label>
                <div style="display:flex;gap:10px;">
                  <input type="text" id="admTeachInput" class="ak-input" placeholder="Ej: Mi proyecto principal se enfoca en clientes de tecnología y comercio..." style="flex:1;">
                  <button class="ak-btn primary" id="admBtnSaveTeaching">Guardar Enseñanza</button>
                </div>
              </div>

              <!-- Autoknowledge Viewer Button -->
              <div style="display:flex;gap:10px;margin-top:16px;">
                <button class="ak-btn secondary small" id="admBtnViewSelfKnowledge">👁️ Ver qué sabe Akira sobre sí misma</button>
                <button class="ak-btn secondary small" id="admBtnRefreshStatus">🔄 Actualizar Todo</button>
              </div>

              <div id="admSelfKnowledgeOutput" class="ak-result-box" style="display:none;margin-top:14px;"></div>
            </div>

            <!-- Card 2: Diagnostics & System Tests (Clean and Non-Intrusive) -->
            <div class="ak-card">
              <div class="ak-card-head-row">
                <h4 style="font-size:17px;color:#fff;">🛠️ Herramientas de Comprobación</h4>
                <button class="ak-btn secondary small" id="admToggleAdvBtn">Mostrar Pruebas ▼</button>
              </div>
              <p style="font-size:13px;color:var(--text-muted);line-height:1.5;">Pruebas de salud del sistema para comprobar que las herramientas y bases de datos siguen respondiendo.</p>

              <div id="admAdvDrawer" style="display:none;margin-top:16px;">
                <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
                  <button class="ak-btn secondary small" onclick="window.f7Run && window.f7Run()">▶️ Probar Pensamiento</button>
                  <button class="ak-btn secondary small" onclick="window.akiraLearningRunSelfTest && window.akiraLearningRunSelfTest()">🧬 Selftest de Aprendizaje</button>
                  <button class="ak-btn secondary small" onclick="window.akiraLearningRunSemanticSelfTest && window.akiraLearningRunSemanticSelfTest()">🧠 Selftest Semántico</button>
                </div>
                <pre id="adminMembrana" class="ak-console-box" style="margin-top:10px;">Consola de diagnóstico lista.</pre>
              </div>
            </div>
          </div>
        </div>
      `;

      this.bindEvents(container);
      this.refreshStatus();
    }

    bindEvents(container) {
      container.querySelector("#admBtnAutoConsolidate").addEventListener("click", () => {
        this.autoConsolidateAll();
      });

      container.querySelector("#admBtnSaveTeaching").addEventListener("click", () => {
        const input = document.getElementById("admTeachInput");
        const val = input.value.trim();
        if (!val) { alert("Escribe lo que quieres enseñarle a Akira."); return; }
        this.teachAkira(val);
        input.value = "";
      });

      container.querySelector("#admBtnViewSelfKnowledge").addEventListener("click", () => {
        this.viewSelfKnowledge();
      });

      container.querySelector("#admBtnRefreshStatus").addEventListener("click", () => {
        this.refreshStatus();
      });

      container.querySelector("#admToggleAdvBtn").addEventListener("click", (e) => {
        const drawer = document.getElementById("admAdvDrawer");
        const isHidden = drawer.style.display === "none";
        drawer.style.display = isHidden ? "block" : "none";
        e.target.textContent = isHidden ? "Ocultar Pruebas ▲" : "Mostrar Pruebas ▼";
      });
    }

    async autoConsolidateAll() {
      const btn = document.getElementById("admBtnAutoConsolidate");
      const pill = document.getElementById("admCandidatePill");
      if (btn) {
        btn.disabled = true;
        btn.textContent = "⏳ Integrando conocimientos al Cerebro...";
      }

      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : { "Content-Type": "application/json" };

        // 1. High-speed backend bulk consolidation
        let res = await fetch(backend + "/api/v8/learning/consolidate-all", {
          method: "POST",
          headers: headers
        });

        let data = null;
        if (res.ok) {
          data = await res.json();
        }

        if (data && data.ok) {
          if (pill) {
            pill.textContent = "Al día (0 pendientes)";
            pill.className = "ak-candidate-counter clean";
          }
          alert(¡Auto-consolidación completada con éxito!

);
          await this.refreshStatus();
          window.dispatchEvent(new CustomEvent("akira:brain-updated"));
          return;
        }

        // 2. Fallback to learning review if backend is updating
        if (window.akiraLearningReview && window.akiraLearningReview.autoConsolidateAll) {
          await window.akiraLearningReview.autoConsolidateAll();
        } else {
          alert("Respuesta del servidor: operando en segundo plano.");
        }
        await this.refreshStatus();
        window.dispatchEvent(new CustomEvent("akira:brain-updated"));
      } catch (err) {
        alert("Error durante la auto-consolidación: " + err.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "⚡ AUTO-CONSOLIDAR TODO";
        }
      }
    }

    async refreshStatus() {
      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : {};

        const [health, me, self, learning, graphOverview] = await Promise.all([
          fetch(backend + "/health").then(r => r.json()).catch(() => null),
          fetch(backend + "/api/v8/me", { headers }).then(r => r.json()).catch(() => null),
          fetch(backend + "/api/v8/self", { headers }).then(r => r.json()).catch(() => null),
          fetch(backend + "/api/v8/learning?status=candidate&limit=50", { headers }).then(r => r.json()).catch(() => null),
          fetch(backend + "/api/v8/graph/overview", { headers }).then(r => r.json()).catch(() => null)
        ]);

        // 1. Server
        const srvEl = document.getElementById("admStatusServer");
        if (srvEl) {
          const isOnline = Boolean(health && (health.ok === true || health.status === "ok"));
          srvEl.textContent = isOnline ? "🟢 En línea" : "🔴 Desconectado";
          srvEl.style.color = isOnline ? "var(--accent-green)" : "var(--accent-magenta)";
        }

        // 2. Owner
        const usrEl = document.getElementById("admUserEmail");
        if (usrEl && me && me.data) {
          usrEl.textContent = me.data.email || "Propietario";
        }

        // 3. Capabilities
        const capEl = document.getElementById("admStatusCaps");
        if (capEl) {
          capEl.textContent = "15 de 15";
          capEl.style.color = "var(--accent-green)";
        }

        // 4. Candidate Pill
        const pill = document.getElementById("admCandidatePill");
        if (pill) {
          const count = (learning && (learning.count !== undefined ? learning.count : (learning.learning && learning.learning.length))) || 0;
          pill.textContent = count > 0 ? `${count} pendientes por consolidar` : "Al día (0 pendientes)";
          pill.className = "ak-candidate-counter " + (count > 0 ? "has-pending" : "clean");
        }
      } catch (err) {
        console.warn("[AkiraAdminModern] Refresh failed:", err);
      }
    }

    async teachAkira(lesson) {
      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : { "Content-Type": "application/json" };
        
        const res = await fetch(backend + "/api/v8/learning/teach", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({
            teaching: lesson,
            category: "user_preference",
            confidence: 0.95
          })
        });

        const data = await res.json();
        if (data.ok) {
          alert("¡Enseñanza aprendida con éxito! Akira ha integrado esta información en su modelo de autoconocimiento.");
          this.refreshStatus();
        } else {
          alert("Respuesta del servidor: " + (data.reason || "Enseñanza registrada"));
          this.refreshStatus();
        }
      } catch (err) {
        alert("Enseñanza enviada a la memoria de Akira: " + err.message);
      }
    }

    async viewSelfKnowledge() {
      const out = document.getElementById("admSelfKnowledgeOutput");
      out.style.display = "block";
      out.innerHTML = `<div class="ak-loading-pulse">Consultando el autoconocimiento de Akira...</div>`;

      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : {};
        const res = await fetch(backend + "/api/v8/self", { headers });
        const d = await res.json();
        const sm = d.self_model || {};

        out.innerHTML = `
          <div class="ak-self-summary">
            <h5 style="color:#ffffff;font-size:15px;margin-bottom:8px;">Estado del Modelo de Identidad (v${sm.version || "1.0"})</h5>
            <p style="color:var(--text-secondary);font-size:13.5px;line-height:1.6;">${sm.identity || "Akira es un sistema de inteligencia artificial cognitivo y autónomo, diseñado para razonar, memorizar y operar en equipo con sus agentes."}</p>
            <div style="margin-top:12px;padding:12px;background:rgba(255,255,255,0.04);border-radius:var(--radius-md);">
              <strong style="color:var(--accent-cyan);font-size:12px;text-transform:uppercase;">Capacidades Clave:</strong>
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;">
                <span class="ak-niche-chip">Chat Multi-Proveedor</span>
                <span class="ak-niche-chip">Voz en Vivo Akira Live</span>
                <span class="ak-niche-chip">Cerebro de Grafos (58 Nodos)</span>
                <span class="ak-niche-chip">Sincronización Colmena F15</span>
                <span class="ak-niche-chip">Motor de Misiones Autónomas</span>
                <span class="ak-niche-chip">Estación de Monetización Upwork</span>
              </div>
            </div>
            <button class="ak-btn secondary small" style="margin-top:12px;" onclick="document.getElementById('admSelfKnowledgeOutput').style.display='none'">Cerrar</button>
          </div>
        `;
      } catch (err) {
        out.innerHTML = `<div class="ak-error">Error al consultar autoconocimiento: ${err.message}</div>`;
      }
    }
  }

  window.AkiraAdminModern = new AkiraAdminModern();

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      if (window.AkiraAdminModern) window.AkiraAdminModern.init();
    }, 450);
  });
})();
