/**
 * AKIRA KNOWLEDGE INGESTION PIPELINE v1.0
 * Mass document ingestion, semantic extraction, and neural graph weaving.
 * Converts PDFs, Markdown, TXT, and articles into verified knowledge records and neural graph nodes at $0.00 COP cost.
 */
(function(){
  "use strict";

  const BACKEND = () => localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";

  function getAuthHeaders(){
    if(typeof window.akiraAuthHeaders === "function"){
      try{ return window.akiraAuthHeaders(); }catch(_){}
    }
    return { "Content-Type": "application/json" };
  }

  function escapeHtml(s){
    return String(s || "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  let selectedFile = null;
  let selectedFileBase64 = null;

  function ensureModal(){
    let modal = document.getElementById("akiraKnowledgeModal");
    if(modal) return modal;

    modal = document.createElement("div");
    modal.id = "akiraKnowledgeModal";
    modal.className = "ak-ingest-overlay";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="ak-ingest-dialog">
        <div class="ak-ingest-topbar">
          <div class="ak-ingest-title">
            <span class="ak-ingest-icon">🧠</span>
            <div>
              <strong>Pipeline de Ingesta & Aprendizaje Masivo</strong>
              <small>Extrae conceptos, teje conexiones neuronales y consolida conocimiento verificado</small>
            </div>
          </div>
          <button type="button" class="ak-ingest-close" onclick="window.akiraCloseKnowledgeIngestModal()">✕</button>
        </div>

        <div class="ak-ingest-body">
          <div class="ak-ingest-tabs">
            <button type="button" class="ak-ingest-tab active" id="akIngestTabFile" onclick="window.akiraSwitchIngestTab('file')">📁 Subir Archivo (PDF, MD, TXT)</button>
            <button type="button" class="ak-ingest-tab" id="akIngestTabDirect" onclick="window.akiraSwitchIngestTab('text')">📝 Pegar Texto o Apuntes</button>
          </div>

          <!-- Tab 1: File Upload -->
          <div class="ak-ingest-panel" id="akIngestPanelFile">
            <div class="ak-ingest-dropzone" id="akIngestDropzone">
              <span class="ak-dropzone-icon">📄</span>
              <p>Arrastra tu archivo aquí o haz clic para seleccionarlo</p>
              <small>Soporta .PDF, .MD, .TXT, .JSON, .CSV (Hasta 5 MB)</small>
              <input type="file" id="akIngestFileInput" accept=".pdf,.txt,.md,.markdown,.json,.csv" style="display:none">
            </div>
            <div id="akIngestSelectedFileInfo" class="ak-ingest-file-info" style="display:none">
              <span id="akIngestFileName">documento.pdf</span>
              <button type="button" class="ak-ingest-remove-file" onclick="window.akiraClearIngestFile()">✕ Quitar</button>
            </div>
          </div>

          <!-- Tab 2: Direct Text -->
          <div class="ak-ingest-panel" id="akIngestPanelText" style="display:none">
            <label class="ak-ingest-label">Título o Tema del Documento:</label>
            <input type="text" id="akIngestDocTitle" class="ak-ingest-input" placeholder="Ej: Fundamentos de Arquitectura Distribuida">
            
            <label class="ak-ingest-label" style="margin-top:10px">Contenido a Ingestar:</label>
            <textarea id="akIngestDocContent" class="ak-ingest-textarea" placeholder="Pega aquí el contenido, lecciones, resumen o apuntes que deseas que Akira aprenda..."></textarea>
          </div>

          <!-- Options -->
          <div class="ak-ingest-options">
            <div class="ak-ingest-opt-field">
              <label class="ak-ingest-label">Dominio / Especialidad:</label>
              <select id="akIngestDomain" class="ak-ingest-select">
                <option value="desarrollo_software">💻 Desarrollo de Software & Arquitectura</option>
                <option value="inteligencia_artificial">🤖 Inteligencia Artificial & Agentes</option>
                <option value="negocios_freelance">💼 Negocios & Freelance</option>
                <option value="filosofia_cognicion">🧠 Filosofía, Cognición & Estrategia</option>
                <option value="conocimiento_general" selected>🌐 Conocimiento General</option>
              </select>
            </div>
            <div class="ak-ingest-opt-check">
              <label class="ak-ingest-checkbox-label">
                <input type="checkbox" id="akIngestWeaveGraph" checked>
                <span>Tejer automáticamente nodos y relaciones en el Cerebro Neuronal</span>
              </label>
            </div>
          </div>

          <!-- Status / Progress -->
          <div id="akIngestStatusBox" class="ak-ingest-status-box" style="display:none">
            <div class="ak-ingest-progress-spinner" id="akIngestSpinner"></div>
            <div id="akIngestStatusMsg" class="ak-ingest-status-msg">Procesando ingesta de conocimiento...</div>
          </div>

          <!-- Results Summary -->
          <div id="akIngestResultBox" class="ak-ingest-result-box" style="display:none">
            <div class="ak-ingest-result-head">
              <span class="ak-result-badge">✅ INGESTA COMPLETADA</span>
              <span id="akResultTime">Ahora</span>
            </div>
            <div class="ak-ingest-stats-grid">
              <div class="ak-result-stat"><strong id="akStatChunks">0</strong><small>Fragmentos Verificados</small></div>
              <div class="ak-result-stat"><strong id="akStatNodes">0</strong><small>Nodos Creados</small></div>
              <div class="ak-result-stat"><strong id="akStatEdges">0</strong><small>Conexiones Tejidas</small></div>
            </div>
            <div class="ak-ingest-concepts-wrap">
              <small style="color:#00f0ff;font-weight:600;display:block;margin-bottom:6px">Conceptos Extraídos y Asimilados:</small>
              <div id="akResultConcepts" class="ak-result-concepts-pills"></div>
            </div>
          </div>
        </div>

        <div class="ak-ingest-footer">
          <button type="button" class="ak-ingest-cancel-btn" onclick="window.akiraCloseKnowledgeIngestModal()">Cerrar</button>
          <button type="button" class="ak-ingest-submit-btn" id="akIngestSubmitBtn" onclick="window.akiraExecuteKnowledgeIngest()">
            <span>🚀 Ingestar en Cerebro</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Setup Drag and Drop
    const dropzone = modal.querySelector("#akIngestDropzone");
    const fileInput = modal.querySelector("#akIngestFileInput");

    dropzone.addEventListener("click", () => fileInput.click());

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if(e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelection(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener("change", (e) => {
      if(e.target.files && e.target.files[0]) {
        handleFileSelection(e.target.files[0]);
      }
    });

    return modal;
  }

  function handleFileSelection(file){
    selectedFile = file;
    const nameEl = document.getElementById("akIngestFileName");
    const infoEl = document.getElementById("akIngestSelectedFileInfo");
    const dropEl = document.getElementById("akIngestDropzone");
    if(nameEl) nameEl.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    if(infoEl) infoEl.style.display = "flex";
    if(dropEl) dropEl.style.display = "none";

    const reader = new FileReader();
    reader.onload = function(e){
      const res = e.target.result;
      if(file.name.toLowerCase().endsWith(".pdf")) {
        // Base64 string without data prefix
        selectedFileBase64 = res.split(",")[1];
      } else {
        selectedFileBase64 = null;
        selectedFile._rawText = res;
      }
    };

    if(file.name.toLowerCase().endsWith(".pdf")) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  }

  window.akiraClearIngestFile = function(){
    selectedFile = null;
    selectedFileBase64 = null;
    const infoEl = document.getElementById("akIngestSelectedFileInfo");
    const dropEl = document.getElementById("akIngestDropzone");
    const input = document.getElementById("akIngestFileInput");
    if(infoEl) infoEl.style.display = "none";
    if(dropEl) dropEl.style.display = "block";
    if(input) input.value = "";
  };

  window.akiraOpenKnowledgeIngestModal = function(){
    const modal = ensureModal();
    modal.style.display = "flex";
    document.getElementById("akIngestStatusBox").style.display = "none";
    document.getElementById("akIngestResultBox").style.display = "none";
  };

  window.akiraCloseKnowledgeIngestModal = function(){
    const modal = document.getElementById("akiraKnowledgeModal");
    if(modal) modal.style.display = "none";
  };

  window.akiraSwitchIngestTab = function(tab){
    const tabFile = document.getElementById("akIngestTabFile");
    const tabText = document.getElementById("akIngestTabDirect");
    const panelFile = document.getElementById("akIngestPanelFile");
    const panelText = document.getElementById("akIngestPanelText");

    if(tab === "file") {
      tabFile.classList.add("active");
      tabText.classList.remove("active");
      panelFile.style.display = "block";
      panelText.style.display = "none";
    } else {
      tabText.classList.add("active");
      tabFile.classList.remove("active");
      panelText.style.display = "block";
      panelFile.style.display = "none";
    }
  };

  window.akiraExecuteKnowledgeIngest = async function(){
    const btn = document.getElementById("akIngestSubmitBtn");
    const statusBox = document.getElementById("akIngestStatusBox");
    const statusMsg = document.getElementById("akIngestStatusMsg");
    const resultBox = document.getElementById("akIngestResultBox");
    const domain = document.getElementById("akIngestDomain").value;
    const autoWeave = document.getElementById("akIngestWeaveGraph").checked;

    let docName = "";
    let content = "";
    let contentB64 = "";

    const isFileTab = document.getElementById("akIngestTabFile").classList.contains("active");

    if(isFileTab) {
      if(!selectedFile) {
        alert("Por favor selecciona un archivo PDF, Markdown o de texto para ingestar.");
        return;
      }
      docName = selectedFile.name;
      if(selectedFileBase64) {
        contentB64 = selectedFileBase64;
      } else if(selectedFile._rawText) {
        content = selectedFile._rawText;
      } else {
        alert("El archivo aún se está cargando. Intenta de nuevo en un segundo.");
        return;
      }
    } else {
      docName = document.getElementById("akIngestDocTitle").value.trim() || "Apuntes y Conocimiento";
      content = document.getElementById("akIngestDocContent").value.trim();
      if(!content) {
        alert("Por favor escribe o pega el contenido a ingestar.");
        return;
      }
    }

    btn.disabled = true;
    statusBox.style.display = "flex";
    resultBox.style.display = "none";
    statusMsg.textContent = "Extrayendo conceptos y preparando ingesta en el Cerebro...";

    const payload = {
      document_name: docName,
      domain: domain,
      auto_weave_graph: autoWeave
    };
    if(contentB64) {
      payload.content_base64 = contentB64;
    } else {
      payload.content = content;
    }

    try {
      const resp = await fetch(BACKEND() + "/api/v8/knowledge/ingest", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if(resp.status === 401 && window.akiraHandleAuthFailure) {
        window.akiraHandleAuthFailure(401);
      }

      const data = await resp.json();

      if(!resp.ok || !data.ok) {
        statusMsg.innerHTML = `<span style="color:#ef4444">❌ Error: ${escapeHtml(data.reason || "Fallo en la ingesta")}</span>`;
        btn.disabled = false;
        return;
      }

      // Success rendering
      statusBox.style.display = "none";
      resultBox.style.display = "block";

      document.getElementById("akStatChunks").textContent = data.knowledge_created || 0;
      document.getElementById("akStatNodes").textContent = data.nodes_created || 0;
      document.getElementById("akStatEdges").textContent = data.edges_created || 0;

      const conceptsEl = document.getElementById("akResultConcepts");
      conceptsEl.innerHTML = "";
      const concepts = data.concepts || [];
      if(concepts.length > 0) {
        concepts.forEach(c => {
          const pill = document.createElement("span");
          pill.className = "ak-concept-pill";
          pill.textContent = c;
          conceptsEl.appendChild(pill);
        });
      } else {
        conceptsEl.innerHTML = "<small style='color:var(--muted)'>Documento asimilado en bloque principal</small>";
      }

      // Live refresh of Brain cytoscape graph and neuron counters
      try {
        if(typeof window.refreshMembrane === "function") {
          window.refreshMembrane(true);
        }
      } catch(_) {}
      try {
        if(typeof window.countNeuronas === "function") {
          window.countNeuronas();
        }
      } catch(_) {}

      btn.disabled = false;
    } catch(err) {
      statusMsg.innerHTML = `<span style="color:#ef4444">❌ Error de red: ${escapeHtml(err.message)}</span>`;
      btn.disabled = false;
    }
  };

  // Inject Styles
  (function injectStyles(){
    if(document.getElementById("akira-ingest-styles")) return;
    const st = document.createElement("style");
    st.id = "akira-ingest-styles";
    st.textContent = `
      .ak-ingest-overlay {
        position: fixed;
        inset: 0;
        z-index: 99998;
        background: rgba(4, 7, 14, 0.85);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }
      .ak-ingest-dialog {
        background: #0b0f1a;
        border: 2px solid #00f0ff;
        border-radius: 12px;
        box-shadow: 0 0 32px rgba(0, 240, 255, 0.25);
        width: 95vw;
        max-width: 680px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .ak-ingest-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: #111827;
        border-bottom: 1px solid rgba(0, 240, 255, 0.25);
      }
      .ak-ingest-title {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .ak-ingest-icon { font-size: 20px; }
      .ak-ingest-title strong { color: #fff; font-size: 13px; display: block; }
      .ak-ingest-title small { color: #94a3b8; font-size: 10px; display: block; }
      .ak-ingest-close {
        background: rgba(239, 68, 68, 0.2);
        border: 1px solid #ef4444;
        color: #ef4444;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 700;
      }
      .ak-ingest-body {
        padding: 16px;
        overflow-y: auto;
        flex: 1;
      }
      .ak-ingest-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        padding-bottom: 8px;
      }
      .ak-ingest-tab {
        background: #141b29;
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #94a3b8;
        font-size: 11px;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .ak-ingest-tab.active {
        background: rgba(0, 240, 255, 0.15);
        border-color: #00f0ff;
        color: #00f0ff;
        font-weight: 600;
      }
      .ak-ingest-dropzone {
        border: 2px dashed rgba(0, 240, 255, 0.35);
        border-radius: 8px;
        padding: 24px;
        text-align: center;
        background: rgba(0, 240, 255, 0.03);
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .ak-ingest-dropzone:hover, .ak-ingest-dropzone.dragover {
        border-color: #00f0ff;
        background: rgba(0, 240, 255, 0.08);
      }
      .ak-dropzone-icon { font-size: 32px; display: block; margin-bottom: 8px; }
      .ak-ingest-dropzone p { color: #fff; font-size: 12px; margin: 0 0 4px; }
      .ak-ingest-dropzone small { color: #94a3b8; font-size: 10px; }
      .ak-ingest-file-info {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #151d2f;
        border: 1px solid #00f0ff;
        padding: 8px 12px;
        border-radius: 6px;
        margin-top: 8px;
      }
      .ak-ingest-remove-file {
        background: transparent;
        border: none;
        color: #ef4444;
        cursor: pointer;
        font-weight: 700;
      }
      .ak-ingest-label {
        display: block;
        color: #cbd5e1;
        font-size: 11px;
        font-weight: 600;
        margin-bottom: 4px;
      }
      .ak-ingest-input {
        width: 100%;
        background: #090d16;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 6px;
        color: #fff;
        padding: 8px 10px;
        font-size: 12px;
      }
      .ak-ingest-textarea {
        width: 100%;
        height: 120px;
        background: #090d16;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 6px;
        color: #fff;
        padding: 8px 10px;
        font-size: 12px;
        font-family: inherit;
        resize: vertical;
      }
      .ak-ingest-options {
        margin-top: 14px;
        background: #0d121f;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 10px 12px;
      }
      .ak-ingest-select {
        width: 100%;
        background: #141b29;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        padding: 6px 8px;
        border-radius: 6px;
        font-size: 11px;
      }
      .ak-ingest-checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #94a3b8;
        font-size: 11px;
        margin-top: 8px;
        cursor: pointer;
      }
      .ak-ingest-status-box {
        display: flex;
        align-items: center;
        gap: 10px;
        background: rgba(0, 240, 255, 0.08);
        border: 1px solid rgba(0, 240, 255, 0.3);
        border-radius: 6px;
        padding: 10px 14px;
        margin-top: 14px;
      }
      .ak-ingest-progress-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(0, 240, 255, 0.3);
        border-top-color: #00f0ff;
        border-radius: 50%;
        animation: akSpin 0.8s linear infinite;
      }
      @keyframes akSpin { to { transform: rotate(360deg); } }
      .ak-ingest-status-msg { font-size: 12px; color: #e2e8f0; }

      .ak-ingest-result-box {
        margin-top: 14px;
        background: #0d1424;
        border: 1px solid #39ff14;
        border-radius: 8px;
        padding: 12px;
      }
      .ak-ingest-result-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
      }
      .ak-result-badge {
        font-family: 'Press Start 2P', monospace;
        font-size: 8px;
        color: #39ff14;
        background: rgba(57, 255, 20, 0.15);
        padding: 3px 6px;
        border-radius: 4px;
      }
      .ak-ingest-stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-bottom: 12px;
      }
      .ak-result-stat {
        background: #131c30;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        padding: 8px;
        text-align: center;
      }
      .ak-result-stat strong { display: block; font-size: 16px; color: #00f0ff; }
      .ak-result-stat small { display: block; font-size: 9px; color: #94a3b8; }
      .ak-result-concepts-pills {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .ak-concept-pill {
        background: rgba(0, 240, 255, 0.1);
        border: 1px solid rgba(0, 240, 255, 0.3);
        color: #00f0ff;
        font-size: 10px;
        padding: 3px 8px;
        border-radius: 4px;
      }

      .ak-ingest-footer {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        padding: 12px 16px;
        background: #111827;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
      .ak-ingest-cancel-btn {
        background: transparent;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #cbd5e1;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
      }
      .ak-ingest-submit-btn {
        background: linear-gradient(135deg, #00f0ff, #7c3aed);
        border: none;
        color: #000;
        font-weight: 700;
        font-size: 12px;
        padding: 7px 16px;
        border-radius: 6px;
        cursor: pointer;
        transition: opacity 0.15s ease;
      }
      .ak-ingest-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    `;
    document.head.appendChild(st);
  })();

})();
