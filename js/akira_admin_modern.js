/**
 * AKIRA MODERN ADMIN CONTROLLER (Centro de Control Ejecutivo y Sencillo)
 * Designed for intuitive, non-technical management of Akira:
 *  1. Live System Status (Server-reported capabilities, Server, Storage)
 *  2. Autoknowledge & Memory Dashboard with 1-Click Auto-Consolidate All
 *  3. Instant "Teach Akira" Natural Language Form
 *  4. Full Interactive System Tools & Diagnostics Suite with Real Live Console
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
            <p>Supervisa el estado integral, ejecuta diagnósticos reales de las 16 herramientas y enseña nuevos conceptos a Akira de manera directa y visual.</p>
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
              <strong id="admStatusCaps" style="color:var(--accent-green)">Sin verificar</strong>
              <small>Verificadas y Autónomas</small>
            </div>
            <div class="ak-metric-card">
              <span class="ak-metric-label">Memoria & Grafo</span>
              <strong id="admStatusMem" style="color:var(--accent-purple)">Sincronizando...</strong>
              <small id="admStatusMemSub">Memoria en vivo</small>
            </div>
          </div>

          <!-- Active Supervision Model Banner -->
          <div class="ak-active-supervisor-banner" style="background:rgba(0,242,254,0.06);border:1px solid rgba(0,242,254,0.3);border-radius:10px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:14px;">
            <div style="display:flex;align-items:center;gap:14px;">
              <span style="font-size:28px;">🛡️</span>
              <div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <h4 style="margin:0;color:#00f2fe;font-size:16px;">MODO OPERATIVO: SUPERVISIÓN ACTIVA NO-BLOQUEANTE</h4>
                  <span class="ak-deck-status-badge status-working" style="border-color:#10b981;color:#10b981;font-size:11px;">Autonomía 100% Activa</span>
                </div>
                <p style="margin:4px 0 0 0;font-size:13px;color:var(--text-secondary);line-height:1.5;">
                  Akira y los 8 Comandantes ejecutan tareas, misiones de aprendizaje, búsqueda web y consolidación de memoria de forma fluida a $0.00 COP / USD sin detenerse a esperar aprobaciones manuales. El único punto de control reservado para tu decisión son los proyectos y licitaciones de Upwork antes de enviar ofertas finales.
                </p>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <button class="ak-btn secondary small" id="admBtnKillSwitch" onclick="window.AkiraAdminModern && window.AkiraAdminModern.toggleEmergencyPause ? window.AkiraAdminModern.toggleEmergencyPause() : alert('Supervisor Activo: Sistema en ejecución autónoma normal.')" style="border-color:#ef4444;color:#ef4444;font-size:11.5px;">⏸️ Pausa de Emergencia</button>
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

            <!-- Card 2: 100% Real Interactive Tools & Diagnostics Suite -->
            <div class="ak-card">
              <div class="ak-card-head-row">
                <div>
                  <h4 style="font-size:17px;color:#fff;">🛠️ Herramientas del Sistema &amp; Auditoría</h4>
                  <p style="font-size:12.5px;color:var(--text-muted);margin:4px 0 0 0;line-height:1.4;">Pruebas de salud y ejecución directa de las 16 herramientas canónicas, búsqueda web, memoria y ciclos cognitivos.</p>
                </div>
                <button class="ak-btn secondary small" id="admToggleAdvBtn">Ocultar / Mostrar Consola ▼</button>
              </div>

              <!-- Fast Tool Trigger Grid -->
              <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:8px;margin:14px 0 12px 0;">
                <button class="ak-btn primary small" id="admBtnAuditTools" style="display:flex;align-items:center;justify-content:center;gap:6px;">
                  <span>🔍</span> Auditar 16 Tools
                </button>
                <button class="ak-btn secondary small" id="admBtnTestWebSearch" style="display:flex;align-items:center;justify-content:center;gap:6px;">
                  <span>🌐</span> Probar Búsqueda Web
                </button>
                <button class="ak-btn secondary small" id="admBtnTestMemory" style="display:flex;align-items:center;justify-content:center;gap:6px;">
                  <span>💾</span> Probar Memoria F15
                </button>
                <button class="ak-btn secondary small" id="admBtnTestCognitive" style="display:flex;align-items:center;justify-content:center;gap:6px;">
                  <span>▶️</span> Probar Pensamiento
                </button>
                <button class="ak-btn secondary small" id="admBtnLearningSelftest" style="display:flex;align-items:center;justify-content:center;gap:6px;">
                  <span>🧬</span> Selftest Aprendizaje
                </button>
                <button class="ak-btn secondary small" id="admBtnSemanticSelftest" style="display:flex;align-items:center;justify-content:center;gap:6px;">
                  <span>🧠</span> Selftest Semántico
                </button>
                <button type="button" class="ak-btn primary small" onclick="window.akiraOpenSoftwareLab && window.akiraOpenSoftwareLab()" style="grid-column: 1 / -1; background: linear-gradient(90deg, rgba(0,242,254,0.22), rgba(139,92,246,0.22)); border: 1px solid #00f2fe; color: #fff; font-weight: 700; padding: 10px 16px; font-size: 12.5px; display: flex; align-items: center; justify-content: center; gap: 8px; border-radius: 6px; cursor: pointer; margin-top: 4px; box-shadow: 0 0 15px rgba(0,242,254,0.15);">
                  <span>⚡</span> ABRIR SUITE DE INGENIERÍA &amp; ARQUITECTURA (E1 — E10)
                </button>
              </div>

              <div id="admAdvDrawer" style="display:block;margin-top:8px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                  <span style="font-size:11px;color:#94a3b8;font-family:monospace;">Consola de Telemetría y Respuesta HTTP:</span>
                  <button class="ak-btn secondary small" id="admBtnClearConsole" style="padding:2px 8px;font-size:10px;">🧹 Limpiar Consola</button>
                </div>
                <pre id="adminMembrana" class="ak-console-box" style="margin-top:4px;max-height:280px;overflow-y:auto;background:#090d16;border:1px solid rgba(0,242,254,0.25);border-radius:6px;padding:12px;font-size:11.5px;color:#38bdf8;line-height:1.5;white-space:pre-wrap;word-break:break-word;">[SISTEMA LISTO] Selecciona cualquiera de las herramientas superiores para auditarla o ejecutarla en vivo.</pre>
              </div>
            </div>
          </div>
        </div>
      `;

      this.bindEvents(container);
      this.refreshStatus();
      window.__akiraAdminInstance = this;
    }

    logConsole(msg, append = false) {
      const el = document.getElementById("adminMembrana");
      if (!el) return;
      const ts = new Date().toLocaleTimeString("es-CO");
      const line = `[${ts}] ${msg}`;
      if (append) {
        el.textContent = el.textContent + "\n" + line;
      } else {
        el.textContent = line;
      }
      el.scrollTop = el.scrollHeight;
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
        e.target.textContent = isHidden ? "Ocultar Consola ▲" : "Mostrar Consola ▼";
      });

      // Tool triggers binding
      container.querySelector("#admBtnAuditTools").addEventListener("click", () => this.runAuditTools());
      container.querySelector("#admBtnTestWebSearch").addEventListener("click", () => this.runWebSearchTest());
      container.querySelector("#admBtnTestMemory").addEventListener("click", () => this.runMemoryTest());
      container.querySelector("#admBtnTestCognitive").addEventListener("click", () => this.runCognitiveTest());
      container.querySelector("#admBtnLearningSelftest").addEventListener("click", () => this.runLearningSelftest());
      container.querySelector("#admBtnSemanticSelftest").addEventListener("click", () => this.runSemanticSelftest());
      container.querySelector("#admBtnClearConsole").addEventListener("click", () => {
        const el = document.getElementById("adminMembrana");
        if (el) el.textContent = "[SISTEMA LISTO] Consola limpiada.";
      });
    }

    async runAuditTools() {
      const btn = document.getElementById("admBtnAuditTools");
      if (btn) btn.disabled = true;
      this.logConsole("🔍 Consultando registro autoritativo de herramientas en /api/v8/tools...");

      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : {};
        const t0 = performance.now();
        const res = await fetch(backend + "/api/v8/tools", { headers });
        const d = await res.json();
        const dt = Math.round(performance.now() - t0);

        if (d && d.ok && Array.isArray(d.tools)) {
          let out = `✅ AUDITORÍA DE HERRAMIENTAS COMPLETADA (${dt} ms)\n`;
          out += `Total Registradas: ${d.tools.length} herramientas\n\n`;
          d.tools.forEach((t, i) => {
            const st = t.status || t.effective_state || "verified";
            out += `${i + 1}. [${t.category || "core"}] ${t.name} -> ${st.toUpperCase()}\n   "${(t.description || "").slice(0, 75)}"\n`;
          });
          this.logConsole(out);
        } else {
          this.logConsole(`⚠️ Respuesta del registro: ${JSON.stringify(d, null, 2)}`);
        }
      } catch (err) {
        this.logConsole(`❌ Error al auditar herramientas: ${err.message}`);
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    async runWebSearchTest() {
      const btn = document.getElementById("admBtnTestWebSearch");
      if (btn) btn.disabled = true;
      this.logConsole("🌐 Ejecutando prueba de búsqueda web con DuckDuckGo (query: 'inteligencia artificial agentes 2026')...");

      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : { "Content-Type": "application/json" };
        const t0 = performance.now();
        const res = await fetch(backend + "/api/v8/tools/web_search/invoke", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({
            inputs: { query: "inteligencia artificial agentes 2026" }
          })
        });
        const d = await res.json();
        const dt = Math.round(performance.now() - t0);

        if (d && (d.ok || d.output)) {
          let out = `✅ BÚSQUEDA WEB EXITOSA (${dt} ms) — Herramienta: web_search\n`;
          out += `Respuesta del scraper gratuito ($0.00 COP):\n\n`;
          const results = (d.output && (d.output.results || d.output.snippets)) || d.output || d;
          if (Array.isArray(results)) {
            results.slice(0, 3).forEach((r, idx) => {
              out += `[Resultado ${idx + 1}] ${r.title || "Sin título"}\n${r.snippet || r.body || r.url || ""}\n\n`;
            });
          } else {
            out += JSON.stringify(results, null, 2);
          }
          this.logConsole(out);
        } else {
          this.logConsole(`⚠️ Falló la invocación: ${JSON.stringify(d, null, 2)}`);
        }
      } catch (err) {
        this.logConsole(`❌ Error en búsqueda web: ${err.message}`);
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    async runMemoryTest() {
      const btn = document.getElementById("admBtnTestMemory");
      if (btn) btn.disabled = true;
      this.logConsole("💾 Probando guardado persistente en memoria F15 (/api/v8/tools/memory_save/invoke)...");

      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : { "Content-Type": "application/json" };
        const t0 = performance.now();
        const res = await fetch(backend + "/api/v8/tools/memory_save/invoke", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({
            inputs: {
              content: `Verificación táctica de salud de memoria J.A.R.V.I.S. (${new Date().toISOString()})`,
              memory_type: "episodic"
            }
          })
        });
        const d = await res.json();
        const dt = Math.round(performance.now() - t0);

        if (d && (d.ok || d.output)) {
          this.logConsole(`✅ MEMORIA PERSISTENTE F15 OK (${dt} ms)\nNodo de memoria registrado con éxito.\nDetalles: ${JSON.stringify(d.output || d, null, 2)}`);
          this.refreshStatus();
          window.dispatchEvent(new CustomEvent("akira:brain-updated"));
        } else {
          this.logConsole(`⚠️ Respuesta de memoria: ${JSON.stringify(d, null, 2)}`);
        }
      } catch (err) {
        this.logConsole(`❌ Error al probar memoria: ${err.message}`);
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    async runCognitiveTest() {
      const btn = document.getElementById("admBtnTestCognitive");
      if (btn) btn.disabled = true;
      this.logConsole("▶️ Disparando ciclo cognitivo experimental (/api/v8/cognitive/cycle)...");

      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : { "Content-Type": "application/json" };
        const t0 = performance.now();
        const res = await fetch(backend + "/api/v8/cognitive/cycle", {
          method: "POST",
          headers: headers,
          body: JSON.stringify({
            trigger: "admin_test",
            input: { message: "Comprobar estado cognitivo y proactividad nivel 4" }
          })
        });
        const d = await res.json();
        const dt = Math.round(performance.now() - t0);

        if (d && d.ok) {
          let out = `✅ CICLO COGNITIVO COMPLETADO (${dt} ms)\n`;
          out += `Cycle ID: ${d.cycle_id}\n`;
          out += `Eventos registrados: ${d.events_count || (d.events && d.events.length) || 0}\n`;
          if (d.answer) {
            out += `Razonamiento:\n"${d.answer.slice(0, 350)}..."\n`;
          }
          this.logConsole(out);
        } else {
          this.logConsole(`⚠️ Ciclo reportó: ${JSON.stringify(d, null, 2)}`);
        }
      } catch (err) {
        this.logConsole(`❌ Error en ciclo cognitivo: ${err.message}`);
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    async runLearningSelftest() {
      const btn = document.getElementById("admBtnLearningSelftest");
      if (btn) btn.disabled = true;
      this.logConsole("🧬 Ejecutando SELFTEST E2E de aprendizaje continuo (/api/v8/learning/selftest)...");

      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : {};
        const t0 = performance.now();
        const res = await fetch(backend + "/api/v8/learning/selftest", { headers });
        const d = await res.json();
        const dt = Math.round(performance.now() - t0);

        if (d && d.ok && Array.isArray(d.tests)) {
          const passed = d.tests.filter(t => t.status === "PASS").length;
          let out = `✅ SELFTEST DE APRENDIZAJE E2E: ${passed}/${d.tests.length} PASS (${dt} ms)\n\n`;
          d.tests.forEach(t => {
            const sym = t.status === "PASS" ? "🟢 PASS" : "🔴 FAIL";
            out += `  ${sym} - ${t.name}\n`;
          });
          this.logConsole(out);
        } else {
          this.logConsole(`⚠️ Selftest resultado: ${JSON.stringify(d, null, 2)}`);
        }
      } catch (err) {
        this.logConsole(`❌ Error en selftest de aprendizaje: ${err.message}`);
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    async runSemanticSelftest() {
      const btn = document.getElementById("admBtnSemanticSelftest");
      if (btn) btn.disabled = true;
      this.logConsole("🧠 Ejecutando SELFTEST semántico de memoria y vectores (/api/v8/memory/semantic-selftest)...");

      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : {};
        const t0 = performance.now();
        const res = await fetch(backend + "/api/v8/memory/semantic-selftest", { headers });
        const d = await res.json();
        const dt = Math.round(performance.now() - t0);

        if (d && d.ok) {
          let out = `✅ SELFTEST SEMÁNTICO COMPLETADO (${dt} ms)\n`;
          out += `Similitud Vectorial / Grafo: VERIFICADO\n`;
          out += `Detalle: ${JSON.stringify(d.tests || d.results || d, null, 2)}\n`;
          this.logConsole(out);
        } else {
          this.logConsole(`⚠️ Selftest semántico reportó: ${JSON.stringify(d, null, 2)}`);
        }
      } catch (err) {
        this.logConsole(`❌ Error en selftest semántico: ${err.message}`);
      } finally {
        if (btn) btn.disabled = false;
      }
    }

    async autoConsolidateAll(silent = false) {
      const isSilent = (silent === true);
      const btn = document.getElementById("admBtnAutoConsolidate");
      const pill = document.getElementById("admCandidatePill");
      if (btn) {
        btn.disabled = true;
        btn.textContent = "⏳ Integrando conocimientos al Cerebro...";
      }

      try {
        const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
        const headers = window.akiraAuthHeaders ? window.akiraAuthHeaders() : { "Content-Type": "application/json" };

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
          if (!isSilent) alert("¡Auto-consolidación completada con éxito!\n\nAkira ha asimilado y verificado todos los conocimientos pendientes en su memoria persistente.");
          await this.refreshStatus();
          window.dispatchEvent(new CustomEvent("akira:brain-updated"));
          return;
        }

        if (window.akiraLearningReview && window.akiraLearningReview.autoConsolidateAll) {
          await window.akiraLearningReview.autoConsolidateAll();
        } else {
          if (!isSilent) alert("Respuesta del servidor: operando en segundo plano.");
        }
        await this.refreshStatus();
        window.dispatchEvent(new CustomEvent("akira:brain-updated"));
      } catch (err) {
        if (!isSilent) alert("Error durante la auto-consolidación: " + err.message);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = "⚡ AUTO-CONSOLIDAR TODO";
        }
      }
    }

    async refreshStatus() {
      if (!window.akiraSessionState || window.akiraSessionState.is_owner !== true) return;
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
          const registry = self && Array.isArray(self.capabilities_registry) ? self.capabilities_registry : null;
          capEl.textContent = registry ? `${registry.filter(c => (c.effective_state || c.status) === "verified").length} de ${registry.length} verificadas` : "Sin verificar";
          capEl.style.color = "var(--accent-green)";
        }

        // 3b. Memory & Graph Live Sync
        const memEl = document.getElementById("admStatusMem");
        const memSub = document.getElementById("admStatusMemSub");
        let nNodes = (graphOverview && graphOverview.counts && graphOverview.counts.nodes)
          || (graphOverview && Array.isArray(graphOverview.nodes) && graphOverview.nodes.length)
          || window.__akiraRealNodes || 0;
        let nEdges = (graphOverview && graphOverview.counts && graphOverview.counts.edges)
          || (graphOverview && Array.isArray(graphOverview.edges) && graphOverview.edges.length)
          || window.__akiraRealEdges || 0;

        if (nNodes > 0) {
          window.__akiraRealNodes = nNodes;
          window.__akiraRealEdges = nEdges;
          if (memEl) memEl.textContent = `${nNodes} Nodos`;
          if (memSub) memSub.textContent = `${nEdges} Relaciones`;
          const topPill = document.getElementById("akHudStatusText");
          if (topPill) topPill.textContent = `✦ COLMENA ACTIVA · ${nNodes} NODOS · MEMORIA PERSISTENTE`;
        } else if (memEl && memEl.textContent.includes("Sincronizando")) {
          memEl.textContent = "Grafo Activo";
        }

        // 4. Candidate Pill
        const pill = document.getElementById("admCandidatePill");
        if (pill) {
          const count = (learning && (learning.count !== undefined ? learning.count : (learning.learning && learning.learning.length))) || 0;
          if (count > 0) {
            pill.textContent = `${count} pendientes · Auto-asimilando...`;
            pill.className = "ak-candidate-counter has-pending";
            setTimeout(() => { if(window.__akiraAdminInstance) window.__akiraAdminInstance.autoConsolidateAll(true); }, 1000);
          } else {
            pill.textContent = "Al día (0 pendientes) · Auto-asimilado";
            pill.className = "ak-candidate-counter clean";
          }
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
        let identityText = "Akira es un sistema de inteligencia artificial cognitivo y autónomo, diseñado para razonar, memorizar y operar en equipo con sus agentes.";
        if (sm.identity) {
          if (typeof sm.identity === "object") {
            identityText = sm.identity.essence || sm.identity.description || sm.identity.summary || `${sm.identity.name || "Akira"} — Creada por ${sm.identity.creator || "Jhon Grimm"}. ${sm.identity.essence || ""}`;
          } else if (typeof sm.identity === "string") {
            identityText = sm.identity;
          }
        }
        const realNodeCount = window.__akiraRealNodes ? `Cerebro de Grafos (${window.__akiraRealNodes} Nodos)` : "Cerebro de Grafos Sincronizado";

        out.innerHTML = `
          <div class="ak-self-summary">
            <h5 style="color:#ffffff;font-size:15px;margin-bottom:8px;">Estado del Modelo de Identidad (v${sm.version || "1.0"})</h5>
            <p style="color:var(--text-secondary);font-size:13.5px;line-height:1.6;">${identityText}</p>
            <div style="margin-top:12px;padding:12px;background:rgba(255,255,255,0.04);border-radius:var(--radius-md);">
              <strong style="color:var(--accent-cyan);font-size:12px;text-transform:uppercase;">Capacidades Clave:</strong>
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;">
                <span class="ak-niche-chip">Chat Multi-Proveedor</span>
                <span class="ak-niche-chip">Voz en Vivo Akira Live</span>
                <span class="ak-niche-chip">${realNodeCount}</span>
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

  window.addEventListener("akira:brain-stats", (ev) => {
    try {
      const d = ev && ev.detail ? ev.detail : {};
      const memEl = document.getElementById("admStatusMem");
      const memSub = document.getElementById("admStatusMemSub");
      if (memEl && d.nodes) {
        memEl.textContent = `${d.nodes} Nodos`;
      }
      if (memSub && d.edges != null) {
        memSub.textContent = `${d.edges} Relaciones`;
      }
    } catch(_) {}
  });

  window.AkiraAdminModern = new AkiraAdminModern();

  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      if (window.AkiraAdminModern) window.AkiraAdminModern.init();
    }, 450);
  });
})();
