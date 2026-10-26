/**
 * AKIRA COLMENA AGENT STUDIO v1.0
 * Zero-Cost ($0.00 COP/USD) visual agent creator and neural graph weaver.
 * Creates custom specialist agents, registers them into Colmena, and weaves them into the 2D Cytoscape membrane.
 */
(function(){
  "use strict";

  const CUSTOM_AGENTS_KEY = "akira_custom_specialists";

  function loadCustomAgents(){
    try {
      const saved = localStorage.getItem(CUSTOM_AGENTS_KEY);
      if(saved) return JSON.parse(saved);
    } catch(e){}
    return [];
  }

  function saveCustomAgents(agents){
    try {
      localStorage.setItem(CUSTOM_AGENTS_KEY, JSON.stringify(agents));
    } catch(e){}
  }

  let customAgents = loadCustomAgents();

  window.akiraCreateSpecialist = function(agentData){
    const newAgent = {
      id: "agent_" + Date.now().toString(36),
      name: agentData.name || "Especialista",
      title: agentData.title || "Consultor Técnico",
      division: agentData.division || "Código & Backend",
      commander: agentData.commander || "Nexo",
      directive: agentData.directive || "Resolver tareas con máxima calidad y rigor técnico.",
      skills: Array.isArray(agentData.skills) ? agentData.skills : (agentData.skills || "").split(",").map(s => s.trim()).filter(Boolean),
      color: agentData.color || "#00f0ff",
      created: new Date().toISOString()
    };

    customAgents.unshift(newAgent);
    saveCustomAgents(customAgents);

    // Weave into Cytoscape 2D membrane if available
    if(window.cy && typeof window.cy.add === "function"){
      try {
        const nodeId = "spec_" + newAgent.id;
        window.cy.add({
          group: "nodes",
          data: {
            id: nodeId,
            label: newAgent.name,
            title: newAgent.title,
            type: "specialist",
            division: newAgent.division
          }
        });
        // Connect edge to Commander or Division node
        window.cy.add({
          group: "edges",
          data: {
            id: "edge_" + nodeId,
            source: nodeId,
            target: "colmena_nexo"
          }
        });
        window.cy.layout({ name: "cose", animate: true, animationDuration: 500 }).run();
      } catch(e){
        console.log("[Akira Agent Studio] Nodo registrado en memoria local.");
      }
    }

    alert(`¡Agente "${newAgent.name}" creado y tejido con éxito en la Colmena!`);
    window.akiraRenderAgentStudioModal();
    return newAgent;
  };

  /**
   * UI Modal for Agent Studio
   */
  function ensureAgentStudioModal(){
    let modal = document.getElementById("akiraAgentStudioModal");
    if(modal) return modal;

    modal = document.createElement("div");
    modal.id = "akiraAgentStudioModal";
    modal.className = "ak-agent-overlay";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="ak-agent-dialog">
        <div class="ak-agent-header">
          <div class="ak-agent-title-wrap">
            <span class="ak-agent-icon">🧩</span>
            <div>
              <strong style="color:#fff;font-size:14px;display:block;">Constructor Visual de Agentes Especialistas (Colmena Studio)</strong>
              <small style="color:#94a3b8;font-size:11px;">Crea y afina agentes tácticos autónomos para misiones y licitaciones ($0.00 COP)</small>
            </div>
          </div>
          <button type="button" class="ak-agent-close-btn" onclick="window.akiraCloseAgentStudioModal()">✕</button>
        </div>

        <div class="ak-agent-body">
          <div class="ak-agent-form-pane">
            <h4 style="color:#00f0ff;margin:0 0 10px;font-size:13px;">Nuevo Agente Especialista</h4>
            <div class="form-row">
              <label>Nombre del Agente:</label>
              <input type="text" id="akAgName" class="ak-agent-input" placeholder="ej. Vortex, Chronos, Sentinel">
            </div>
            <div class="form-row">
              <label>Rol / Título Profesional:</label>
              <input type="text" id="akAgTitle" class="ak-agent-input" placeholder="ej. Ingeniero de Micro-servicios Rust &amp; WASM">
            </div>
            <div class="form-row-grid">
              <div>
                <label>División Táctica:</label>
                <select id="akAgDivision" class="ak-agent-select">
                  <option value="Código & Backend">💻 Código &amp; Backend</option>
                  <option value="Ventas & Upwork Bidding">💼 Ventas &amp; Bidding</option>
                  <option value="Arquitectura & Cloud">🏛️ Arquitectura &amp; Cloud</option>
                  <option value="QA, Auditoría & Seguridad">🛡️ QA &amp; Seguridad</option>
                  <option value="Frontend & UX">🎨 Frontend &amp; UX</option>
                  <option value="Inteligencia & RAG">🧠 RAG &amp; Datos</option>
                </select>
              </div>
              <div>
                <label>Comandante Supervisor:</label>
                <select id="akAgCommander" class="ak-agent-select">
                  <option value="Nexo">Nexo (Orquestador Central)</option>
                  <option value="Athena">Athena (Lógica &amp; Estrategia)</option>
                  <option value="Cipher">Cipher (Seguridad &amp; Cripto)</option>
                  <option value="Lumina">Lumina (Investigación &amp; RAG)</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <label>Habilidades Clave (separadas por comas):</label>
              <input type="text" id="akAgSkills" class="ak-agent-input" placeholder="ej. Rust, WebAssembly, Memory Optimization, Actix">
            </div>
            <div class="form-row">
              <label>Directiva de Comportamiento (Prompt del Agente):</label>
              <textarea id="akAgDirective" class="ak-agent-textarea" placeholder="Escribe la directiva que define cómo piensa y responde este especialista..."></textarea>
            </div>
            <button type="button" class="ak-agent-submit-btn" onclick="submitNewSpecialist()">
              ⚡ Registrar en la Colmena &amp; Tejer en Membrana
            </button>
          </div>

          <div class="ak-agent-list-pane">
            <h4 style="color:#f8fafc;margin:0 0 10px;font-size:13px;">Especialistas Personalizados (${customAgents.length})</h4>
            <div class="ak-custom-agents-list" id="akCustomAgentsList">
              <!-- Rendered dynamically -->
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      if(e.target === modal) window.akiraCloseAgentStudioModal();
    });

    return modal;
  }

  function submitNewSpecialist(){
    const name = document.getElementById("akAgName").value.trim();
    const title = document.getElementById("akAgTitle").value.trim();
    const division = document.getElementById("akAgDivision").value;
    const commander = document.getElementById("akAgCommander").value;
    const skills = document.getElementById("akAgSkills").value.trim();
    const directive = document.getElementById("akAgDirective").value.trim();

    if(!name || !title){
      alert("Por favor ingresa al menos el Nombre y el Título del agente.");
      return;
    }

    window.akiraCreateSpecialist({
      name,
      title,
      division,
      commander,
      skills,
      directive
    });

    // Clear inputs
    document.getElementById("akAgName").value = "";
    document.getElementById("akAgTitle").value = "";
    document.getElementById("akAgSkills").value = "";
    document.getElementById("akAgDirective").value = "";
  }

  window.akiraOpenAgentStudioModal = function(){
    const modal = ensureAgentStudioModal();
    window.akiraRenderAgentStudioModal();
    modal.style.display = "flex";
  };

  window.akiraCloseAgentStudioModal = function(){
    const modal = document.getElementById("akiraAgentStudioModal");
    if(modal) modal.style.display = "none";
  };

  window.akiraRenderAgentStudioModal = function(){
    const box = document.getElementById("akCustomAgentsList");
    if(!box) return;

    if(customAgents.length === 0){
      box.innerHTML = `<div style="text-align:center;color:#64748b;font-size:11px;padding:30px 0;">No has creado especialistas personalizados aún. Usa el formulario para registrar uno nuevo.</div>`;
      return;
    }

    box.innerHTML = customAgents.map(ag => `
      <div class="custom-ag-card">
        <div class="custom-ag-header">
          <strong style="color:#00f0ff;font-size:12px;">${ag.name}</strong>
          <span class="custom-ag-div">${ag.division}</span>
        </div>
        <div style="font-size:11px;color:#cbd5e1;margin:2px 0;">${ag.title}</div>
        <div style="font-size:10px;color:#94a3b8;font-style:italic;">"${ag.directive.slice(0, 80)}..."</div>
        <div class="custom-ag-skills">
          ${ag.skills.map(s => `<span class="skill-tag">${s}</span>`).join("")}
        </div>
      </div>
    `).join("");
  };

  // Inject styles
  (function injectStyles(){
    if(document.getElementById("akira-agent-styles")) return;
    const st = document.createElement("style");
    st.id = "akira-agent-styles";
    st.textContent = `
      .ak-agent-overlay {
        position: fixed; inset: 0; z-index: 99998;
        background: rgba(4, 7, 14, 0.85); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center; padding: 16px;
      }
      .ak-agent-dialog {
        background: #0b1120; border: 2px solid #00f0ff; border-radius: 12px;
        box-shadow: 0 0 35px rgba(0, 240, 255, 0.25); width: 95vw; max-width: 980px;
        height: 88vh; display: flex; flex-direction: column; overflow: hidden;
      }
      .ak-agent-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px 18px; background: #0e1526; border-bottom: 1px solid rgba(0, 240, 255, 0.2);
      }
      .ak-agent-title-wrap { display: flex; align-items: center; gap: 10px; }
      .ak-agent-icon { font-size: 22px; }
      .ak-agent-close-btn {
        background: rgba(239,68,68,0.2); border: 1px solid #ef4444; color: #ef4444;
        font-size: 13px; font-weight: 700; padding: 4px 10px; border-radius: 5px; cursor: pointer;
      }
      .ak-agent-body { flex: 1; display: flex; overflow: hidden; }
      .ak-agent-form-pane {
        flex: 1.2; padding: 16px; border-right: 1px solid rgba(255,255,255,0.08); overflow-y: auto;
      }
      .ak-agent-list-pane {
        flex: 1; padding: 16px; overflow-y: auto; background: #070a13;
      }
      .form-row { margin-bottom: 10px; display: flex; flex-direction: column; gap: 4px; }
      .form-row label { font-size: 11px; color: #94a3b8; font-weight: 600; }
      .form-row-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
      .form-row-grid label { font-size: 11px; color: #94a3b8; font-weight: 600; display: block; margin-bottom: 4px; }
      .ak-agent-input, .ak-agent-select, .ak-agent-textarea {
        background: #0f172a; border: 1px solid rgba(255,255,255,0.12); color: #fff;
        font-size: 12px; padding: 7px 10px; border-radius: 6px; outline: none;
      }
      .ak-agent-input:focus, .ak-agent-select:focus, .ak-agent-textarea:focus { border-color: #00f0ff; }
      .ak-agent-textarea { height: 75px; resize: none; line-height: 1.4; }
      .ak-agent-submit-btn {
        width: 100%; background: #00f0ff; color: #04070e; font-weight: 700; border: none;
        padding: 9px; border-radius: 6px; cursor: pointer; font-size: 12px; margin-top: 6px;
      }
      .custom-ag-card {
        background: #0f182d; border: 1px solid rgba(0,240,255,0.18); border-radius: 6px;
        padding: 10px; margin-bottom: 8px;
      }
      .custom-ag-header { display: flex; justify-content: space-between; align-items: center; }
      .custom-ag-div { font-size: 9px; color: #38bdf8; background: rgba(56,189,248,0.1); padding: 2px 6px; border-radius: 3px; }
      .custom-ag-skills { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
      .skill-tag { font-size: 9px; background: #1e293b; color: #cbd5e1; padding: 1px 5px; border-radius: 3px; }
    `;
    document.head.appendChild(st);
  })();

})();
