/**
 * AKIRA REST API TESTER & MOCK SERVER v1.0
 * Zero-Cost ($0.00 COP/USD) client-side HTTP request builder and sandbox mock server.
 * Allows testing endpoints, inspecting JSON responses, headers, status codes, and mock data.
 */
(function(){
  "use strict";

  const MOCK_STORAGE_KEY = "akira_mock_endpoints";

  function loadMocks(){
    try {
      const saved = localStorage.getItem(MOCK_STORAGE_KEY);
      if(saved) return JSON.parse(saved);
    } catch(e){}
    return [
      {
        path: "/api/mock/users",
        method: "GET",
        status: 200,
        response: JSON.stringify([
          { id: 1, name: "Jhon Grimm", role: "Creator & Architect", status: "active" },
          { id: 2, name: "Akira Enterprise", role: "Cognitive Swarm", status: "online" }
        ], null, 2)
      },
      {
        path: "/api/mock/checkout",
        method: "POST",
        status: 201,
        response: JSON.stringify({ ok: true, orderId: "ORD-98234", amount: 450, currency: "USD" }, null, 2)
      }
    ];
  }

  function saveMocks(mocks){
    try {
      localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(mocks));
    } catch(e){}
  }

  let activeMocks = loadMocks();

  /**
   * Execute API Request (or match mock server)
   */
  window.akiraExecuteApiRequest = async function(config){
    const { method = "GET", url = "", headers = {}, body = null } = config;
    const startTime = performance.now();

    // Check Mock Server first
    const mock = activeMocks.find(m => m.method === method && url.includes(m.path));
    if(mock){
      await new Promise(r => setTimeout(r, 80)); // simulate 80ms latency
      return {
        status: mock.status,
        statusText: mock.status === 200 ? "OK (MOCK)" : (mock.status === 201 ? "Created (MOCK)" : "MOCK"),
        durationMs: Math.round(performance.now() - startTime),
        isMock: true,
        headers: { "content-type": "application/json", "x-powered-by": "Akira Mock Server" },
        data: JSON.parse(mock.response)
      };
    }

    try {
      const fetchOpts = {
        method,
        headers: { ...headers }
      };
      if(method !== "GET" && method !== "HEAD" && body){
        fetchOpts.body = typeof body === "string" ? body : JSON.stringify(body);
      }

      const res = await fetch(url, fetchOpts);
      const durationMs = Math.round(performance.now() - startTime);
      let data = null;
      const text = await res.text();
      try {
        data = JSON.parse(text);
      } catch(e){
        data = text;
      }

      const resHeaders = {};
      res.headers.forEach((v, k) => { resHeaders[k] = v; });

      return {
        status: res.status,
        statusText: res.statusText,
        durationMs,
        isMock: false,
        headers: resHeaders,
        data
      };
    } catch(err){
      return {
        status: 0,
        statusText: "Network Error",
        durationMs: Math.round(performance.now() - startTime),
        isMock: false,
        headers: {},
        error: err.message || String(err)
      };
    }
  };

  /**
   * UI Modal for API Tester
   */
  function ensureApiTesterModal(){
    let modal = document.getElementById("akiraApiTesterModal");
    if(modal) return modal;

    modal = document.createElement("div");
    modal.id = "akiraApiTesterModal";
    modal.className = "ak-api-overlay";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="ak-api-dialog">
        <div class="ak-api-header">
          <div class="ak-api-title-wrap">
            <span class="ak-api-icon">🔌</span>
            <div>
              <strong style="color:#fff;font-size:14px;display:block;">Probador de APIs REST &amp; Servidor Mock</strong>
              <small style="color:#94a3b8;font-size:11px;">Cliente HTTP interactivo y simulación de endpoints en vivo ($0.00 COP)</small>
            </div>
          </div>
          <button type="button" class="ak-api-close-btn" onclick="window.akiraCloseApiTesterModal()">✕</button>
        </div>

        <div class="ak-api-req-bar">
          <select id="akApiMethod" class="ak-api-select">
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </select>
          <input type="text" id="akApiUrl" class="ak-api-url-input" placeholder="https://api.ejemplo.com/v1/recurso o /api/mock/users" value="/api/mock/users">
          <button type="button" class="ak-api-send-btn" onclick="sendActiveApiRequest()">▶ Enviar</button>
        </div>

        <div class="ak-api-body">
          <div class="ak-api-pane left-pane">
            <div class="ak-api-tabs">
              <button class="tab-btn active" data-tab="tabHeaders">Headers</button>
              <button class="tab-btn" data-tab="tabBody">Body (JSON)</button>
              <button class="tab-btn" data-tab="tabMocks">Servidor Mock (${activeMocks.length})</button>
            </div>
            <div class="tab-content" id="tabContentWrap">
              <div id="tabHeaders" class="tab-box active">
                <textarea id="akApiHeadersInput" class="ak-api-textarea" placeholder="Headers en JSON:\n{\n  &quot;Content-Type&quot;: &quot;application/json&quot;\n}">{\n  "Content-Type": "application/json"\n}</textarea>
              </div>
              <div id="tabBody" class="tab-box">
                <textarea id="akApiBodyInput" class="ak-api-textarea" placeholder="Cuerpo de la petición en JSON..."></textarea>
              </div>
              <div id="tabMocks" class="tab-box">
                <div style="font-size:11px;color:#94a3b8;margin-bottom:8px;">Endpoints mockeados disponibles para prototipos:</div>
                ${activeMocks.map(m => `
                  <div class="mock-card">
                    <span class="mock-method">${m.method}</span>
                    <span class="mock-path">${m.path}</span>
                    <span class="mock-status">${m.status}</span>
                  </div>
                `).join("")}
              </div>
            </div>
          </div>

          <div class="ak-api-pane right-pane">
            <div class="res-header">
              <span style="font-size:11px;color:#94a3b8;">Respuesta del Servidor:</span>
              <div id="akResMeta" style="display:flex;gap:6px;align-items:center;">
                <span class="res-status-badge badge-idle">Listo</span>
              </div>
            </div>
            <pre id="akApiResponseViewer" class="ak-api-res-viewer">// Presiona 'Enviar' para probar el endpoint...</pre>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      if(e.target === modal) window.akiraCloseApiTesterModal();
    });

    // Tab switching
    modal.querySelectorAll(".tab-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        modal.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        modal.querySelectorAll(".tab-box").forEach(bx => bx.classList.remove("active"));
        btn.classList.add("active");
        const box = modal.querySelector("#" + btn.dataset.tab);
        if(box) box.classList.add("active");
      });
    });

    return modal;
  }

  async function sendActiveApiRequest(){
    const method = document.getElementById("akApiMethod").value;
    const url = document.getElementById("akApiUrl").value.trim();
    const headersText = document.getElementById("akApiHeadersInput").value;
    const bodyText = document.getElementById("akApiBodyInput").value;
    const viewer = document.getElementById("akApiResponseViewer");
    const metaBox = document.getElementById("akResMeta");

    if(!url){
      alert("Por favor ingresa una URL válida.");
      return;
    }

    let headers = {};
    try {
      if(headersText.trim()) headers = JSON.parse(headersText);
    } catch(e){}

    viewer.innerText = "Enviando petición...";
    metaBox.innerHTML = `<span class="res-status-badge badge-idle">Cargando...</span>`;

    const res = await window.akiraExecuteApiRequest({
      method,
      url,
      headers,
      body: bodyText.trim() ? bodyText : null
    });

    const isSuccess = res.status >= 200 && res.status < 300;
    const statusClass = isSuccess ? "badge-success" : "badge-err";

    metaBox.innerHTML = `
      <span class="res-status-badge ${statusClass}">${res.status} ${res.statusText}</span>
      <span class="res-time-badge">${res.durationMs}ms</span>
      ${res.isMock ? '<span class="res-mock-badge">MOCK</span>' : ''}
    `;

    if(res.error){
      viewer.innerText = "Error: " + res.error;
    } else {
      viewer.innerText = typeof res.data === "object" ? JSON.stringify(res.data, null, 2) : String(res.data);
    }
  }

  window.akiraOpenApiTesterModal = function(defaultUrl = ""){
    const modal = ensureApiTesterModal();
    if(defaultUrl) document.getElementById("akApiUrl").value = defaultUrl;
    modal.style.display = "flex";
  };

  window.akiraCloseApiTesterModal = function(){
    const modal = document.getElementById("akiraApiTesterModal");
    if(modal) modal.style.display = "none";
  };

  // Inject styles
  (function injectStyles(){
    if(document.getElementById("akira-api-styles")) return;
    const st = document.createElement("style");
    st.id = "akira-api-styles";
    st.textContent = `
      .ak-api-overlay {
        position: fixed; inset: 0; z-index: 99998;
        background: rgba(4, 7, 14, 0.85); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center; padding: 16px;
      }
      .ak-api-dialog {
        background: #0b1120; border: 2px solid #00f0ff; border-radius: 12px;
        box-shadow: 0 0 35px rgba(0, 240, 255, 0.25); width: 95vw; max-width: 1000px;
        height: 85vh; display: flex; flex-direction: column; overflow: hidden;
      }
      .ak-api-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 12px 18px; background: #0e1526; border-bottom: 1px solid rgba(0, 240, 255, 0.2);
      }
      .ak-api-title-wrap { display: flex; align-items: center; gap: 10px; }
      .ak-api-icon { font-size: 22px; }
      .ak-api-close-btn {
        background: rgba(239,68,68,0.2); border: 1px solid #ef4444; color: #ef4444;
        font-size: 13px; font-weight: 700; padding: 4px 10px; border-radius: 5px; cursor: pointer;
      }
      .ak-api-req-bar {
        display: flex; gap: 8px; padding: 10px 16px; background: #070a13;
        border-bottom: 1px solid rgba(255,255,255,0.08);
      }
      .ak-api-select {
        background: #1e293b; color: #00f0ff; font-weight: 700; border: 1px solid rgba(0,240,255,0.3);
        border-radius: 6px; padding: 6px 12px; font-size: 12px; outline: none;
      }
      .ak-api-url-input {
        flex: 1; background: #0f172a; border: 1px solid rgba(255,255,255,0.15); color: #fff;
        font-family: monospace; font-size: 13px; padding: 6px 12px; border-radius: 6px; outline: none;
      }
      .ak-api-send-btn {
        background: #00f0ff; color: #04070e; font-weight: 700; border: none; font-size: 12px;
        padding: 6px 16px; border-radius: 6px; cursor: pointer;
      }
      .ak-api-body { flex: 1; display: flex; overflow: hidden; }
      .ak-api-pane { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
      .left-pane { border-right: 1px solid rgba(255,255,255,0.08); }
      .ak-api-tabs { display: flex; background: #090e1a; border-bottom: 1px solid rgba(255,255,255,0.06); }
      .tab-btn {
        background: transparent; border: none; color: #94a3b8; font-size: 11px; padding: 8px 14px;
        cursor: pointer; border-bottom: 2px solid transparent;
      }
      .tab-btn.active { color: #00f0ff; border-bottom-color: #00f0ff; font-weight: 700; }
      .tab-content { flex: 1; display: flex; overflow: hidden; padding: 10px; }
      .tab-box { display: none; width: 100%; height: 100%; }
      .tab-box.active { display: flex; flex-direction: column; }
      .ak-api-textarea {
        flex: 1; background: #04070e; border: 1px solid rgba(255,255,255,0.08); color: #cbd5e1;
        font-family: monospace; font-size: 12px; padding: 10px; border-radius: 6px; resize: none; outline: none;
      }
      .mock-card {
        background: #0f172a; border: 1px solid rgba(255,255,255,0.08); border-radius: 4px;
        padding: 6px 10px; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; font-size: 11px;
      }
      .mock-method { color: #00f0ff; font-weight: 700; }
      .mock-path { color: #f1f5f9; flex: 1; font-family: monospace; }
      .mock-status { color: #10b981; font-weight: 700; }
      .res-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 8px 14px; background: #090e1a; border-bottom: 1px solid rgba(255,255,255,0.06);
      }
      .res-status-badge { font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
      .badge-idle { background: #334155; color: #cbd5e1; }
      .badge-success { background: rgba(16,185,129,0.2); color: #10b981; }
      .badge-err { background: rgba(239,68,68,0.2); color: #ef4444; }
      .res-time-badge { font-size: 10px; color: #38bdf8; background: #1e293b; padding: 2px 6px; border-radius: 4px; }
      .res-mock-badge { font-size: 9px; font-weight: 700; background: rgba(168,85,247,0.2); color: #c084fc; padding: 2px 6px; border-radius: 4px; }
      .ak-api-res-viewer {
        flex: 1; margin: 0; background: #020408; color: #a7f3d0; font-family: monospace;
        font-size: 12px; padding: 12px; overflow: auto; white-space: pre-wrap; word-break: break-all;
      }
    `;
    document.head.appendChild(st);
  })();

})();
