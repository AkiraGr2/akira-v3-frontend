/**
 * AKIRA LIVE WEB SEARCH & REAL-TIME URL EXTRACTOR v1.0
 * Zero-Cost ($0.00 COP/USD) connection to live internet data.
 * Dual-engine: DuckDuckGo live HTML + Wikipedia OpenSearch fallback + Universal URL reader.
 */
(function(){
  "use strict";

  // Always active in background - 100% autonomous without requiring manual switches
  function isWebEnabled(){
    return true;
  }

  function setWebEnabled(enabled){
    // No-op: Always enabled
  }

  function updatePillVisuals(){
    // No-op: Silent automatic background operation
  }

  // Live Web Engine Client
  class AkiraLiveWebEngine {
    constructor(){
      this.apiBase = window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1")
        ? "https://akira-empresa.onrender.com"
        : "";
    }

    async search(query, maxResults = 5){
      if(!query || !query.trim()) return { ok: false, error: "Consulta vacía", results: [] };
      try {
        const resp = await fetch(`${this.apiBase}/api/v8/web/search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: query.trim(), max_results: maxResults })
        });
        if(resp.ok){
          const data = await resp.json();
          if(data.ok && data.results && data.results.length > 0) return data;
        }
      } catch(e){
        console.warn("[AkiraLiveWeb] Backend search error, falling back to direct Wikipedia API:", e);
      }

      // Direct Client-Side Fallback (Wikipedia OpenSearch) if backend is asleep
      return this.clientSideWikipediaSearch(query, maxResults);
    }

    async clientSideWikipediaSearch(query, maxResults = 5){
      try {
        const u = `https://es.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=${maxResults}&namespace=0&format=json&origin=*`;
        const r = await fetch(u);
        const data = await r.json();
        const results = [];
        if(data && data.length >= 4){
          const titles = data[1] || [];
          const snippets = data[2] || [];
          const links = data[3] || [];
          for(let i = 0; i < titles.length; i++){
            results.append ? null : results.push({
              title: titles[i],
              link: links[i],
              snippet: snippets[i] || `Artículo en vivo sobre ${titles[i]} en Wikipedia.`
            });
          }
        }
        return {
          ok: true,
          query,
          provider: "wikipedia_client_fallback",
          results,
          count: results.length,
          timestamp: new Date().toISOString()
        };
      } catch(e){
        return { ok: false, error: String(e), results: [], count: 0 };
      }
    }

    async fetchUrl(url, maxChars = 3500){
      if(!url || !url.trim()) return { ok: false, error: "URL vacía" };
      try {
        const resp = await fetch(`${this.apiBase}/api/v8/web/fetch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim(), max_chars: maxChars })
        });
        if(resp.ok){
          return await resp.json();
        }
      } catch(e){
        console.warn("[AkiraLiveWeb] Backend URL fetch error:", e);
      }
      return { ok: false, error: "No se pudo extraer contenido del enlace en este momento." };
    }
  }

  const engine = new AkiraLiveWebEngine();

  /**
   * UI Modal for Live Web Search & URL Reader
   */
  function ensureWebModal(){
    let modal = document.getElementById("akiraWebModal");
    if(modal) return modal;

    modal = document.createElement("div");
    modal.id = "akiraWebModal";
    modal.className = "ak-web-overlay";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="ak-web-dialog">
        <div class="ak-web-header">
          <div class="ak-web-title-wrap">
            <span class="ak-web-icon">🌐</span>
            <div>
              <strong style="color:#fff;font-size:14px;display:block;">Motor de Conexión Web en Tiempo Real</strong>
              <small style="color:#94a3b8;font-size:11px;">Búsqueda web en vivo (DuckDuckGo/Wikipedia) y lector de URLs ($0.00 COP)</small>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <button type="button" class="ak-web-close-btn" onclick="window.AkiraLiveWeb.closeWebModal()">✕</button>
          </div>
        </div>

        <div class="ak-web-tabs">
          <button class="ak-web-tab-btn active" id="akWebTabSearch" onclick="window.AkiraLiveWeb.switchTab('search')">🔍 Búsqueda en la Red</button>
          <button class="ak-web-tab-btn" id="akWebTabUrl" onclick="window.AkiraLiveWeb.switchTab('url')">🔗 Lector Universal de URLs</button>
        </div>

        <div class="ak-web-body">
          <!-- Search View -->
          <div id="akWebViewSearch">
            <div class="ak-web-search-box">
              <input type="text" id="akWebSearchInput" class="ak-web-input" placeholder="Escribe lo que deseas buscar en la web en vivo...">
              <button class="ak-web-search-btn" id="akWebBtnSearch" onclick="window.AkiraLiveWeb.triggerSearch()">Buscar en Vivo</button>
            </div>
            <div id="akWebSearchStatus" style="font-size:11.5px;color:#94a3b8;margin:8px 0;display:none;"></div>
            <div id="akWebSearchResults" class="ak-web-results-list"></div>
          </div>

          <!-- URL View -->
          <div id="akWebViewUrl" style="display:none;">
            <div class="ak-web-search-box">
              <input type="url" id="akWebUrlInput" class="ak-web-input" placeholder="Pega cualquier enlace (https://...) para que Akira lo lea...">
              <button class="ak-web-search-btn" id="akWebBtnFetch" onclick="window.AkiraLiveWeb.triggerFetch()">Leer Página</button>
            </div>
            <div id="akWebUrlStatus" style="font-size:11.5px;color:#94a3b8;margin:8px 0;display:none;"></div>
            <div id="akWebUrlResult" class="ak-web-url-card" style="display:none;"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      if(e.target === modal) window.AkiraLiveWeb.closeWebModal();
    });

    const searchInput = modal.querySelector("#akWebSearchInput");
    searchInput.addEventListener("keydown", (e) => {
      if(e.key === "Enter") window.AkiraLiveWeb.triggerSearch();
    });

    const urlInput = modal.querySelector("#akWebUrlInput");
    urlInput.addEventListener("keydown", (e) => {
      if(e.key === "Enter") window.AkiraLiveWeb.triggerFetch();
    });

    return modal;
  }

  // Public Interface
  window.AkiraLiveWeb = {
    isLiveWebEnabled: isWebEnabled,
    toggleLiveWeb: function(){
      const current = isWebEnabled();
      setWebEnabled(!current);
    },
    openWebModal: function(initialQuery = ""){
      const modal = ensureWebModal();
      updatePillVisuals();
      modal.style.display = "flex";
      if(initialQuery){
        const inp = modal.querySelector("#akWebSearchInput");
        if(inp){
          inp.value = initialQuery;
          this.triggerSearch();
        }
      }
    },
    closeWebModal: function(){
      const modal = document.getElementById("akiraWebModal");
      if(modal) modal.style.display = "none";
    },
    switchTab: function(tab){
      const vSearch = document.getElementById("akWebViewSearch");
      const vUrl = document.getElementById("akWebViewUrl");
      const tSearch = document.getElementById("akWebTabSearch");
      const tUrl = document.getElementById("akWebTabUrl");
      if(!vSearch || !vUrl) return;

      if(tab === "search"){
        vSearch.style.display = "block";
        vUrl.style.display = "none";
        tSearch.classList.add("active");
        tUrl.classList.remove("active");
      } else {
        vSearch.style.display = "none";
        vUrl.style.display = "block";
        tSearch.classList.remove("active");
        tUrl.classList.add("active");
      }
    },
    triggerSearch: async function(){
      const input = document.getElementById("akWebSearchInput");
      const status = document.getElementById("akWebSearchStatus");
      const container = document.getElementById("akWebSearchResults");
      if(!input || !container) return;

      const q = input.value.trim();
      if(!q) return;

      status.style.display = "block";
      status.innerHTML = `<span style="color:#00f0ff;">⏳ Consultando la web en tiempo real a costo $0.00 COP...</span>`;
      container.innerHTML = "";

      const res = await engine.search(q, 6);
      status.style.display = "block";

      if(!res.ok || !res.results || res.results.length === 0){
        status.innerHTML = `<span style="color:#ef4444;">No se encontraron resultados en vivo para "${q}".</span>`;
        return;
      }

      status.innerHTML = `<span style="color:#10b981;">✓ ${res.results.length} resultados en vivo obtenidos vía ${res.provider}</span>`;

      container.innerHTML = res.results.map((r, i) => `
        <div class="ak-web-card">
          <div class="ak-web-card-top">
            <span class="ak-web-num">#${i+1}</span>
            <a href="${r.link}" target="_blank" rel="noopener noreferrer" class="ak-web-title-link">${escapeHtml(r.title)} ↗</a>
          </div>
          <div class="ak-web-url-text">${escapeHtml(r.link)}</div>
          <p class="ak-web-snippet">${escapeHtml(r.snippet || "Sin resumen previo disponible.")}</p>
          <div class="ak-web-card-actions">
            <button class="ak-web-action-btn" onclick="window.AkiraLiveWeb.sendToChat('${escapeQuotes(r.title)}', '${escapeQuotes(r.link)}', '${escapeQuotes(r.snippet)}')">💬 Enviar al Chat como Contexto</button>
          </div>
        </div>
      `).join("");
    },
    triggerFetch: async function(){
      const input = document.getElementById("akWebUrlInput");
      const status = document.getElementById("akWebUrlStatus");
      const resultBox = document.getElementById("akWebUrlResult");
      if(!input || !resultBox) return;

      const url = input.value.trim();
      if(!url) return;

      status.style.display = "block";
      status.innerHTML = `<span style="color:#00f0ff;">⏳ Conectando con la URL y limpiando contenido...</span>`;
      resultBox.style.display = "none";

      const res = await engine.fetchUrl(url, 3000);
      status.style.display = "none";

      if(!res.ok){
        alert(res.error || "No se pudo extraer el contenido de la URL.");
        return;
      }

      resultBox.style.display = "block";
      resultBox.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:8px;margin-bottom:8px;">
          <strong style="color:#00f0ff;font-size:13px;">${escapeHtml(res.title)}</strong>
          <span style="font-size:11px;color:#94a3b8;">${res.char_count} caracteres extraídos</span>
        </div>
        <div class="ak-web-extracted-content">${escapeHtml(res.content)}</div>
        <div style="margin-top:10px;display:flex;gap:8px;">
          <button class="ak-web-action-btn" onclick="window.AkiraLiveWeb.sendUrlToChat('${escapeQuotes(res.title)}', '${escapeQuotes(res.url)}')">💬 Analizar con Akira</button>
        </div>
      `;
    },
    sendToChat: function(title, link, snippet){
      const chatInput = document.getElementById("chatInput");
      if(chatInput){
        chatInput.value = `Akira, analiza esta fuente en tiempo real sobre "${title}":\nFuente: ${link}\nResumen: ${snippet}`;
        chatInput.focus();
        this.closeWebModal();
      }
    },
    sendUrlToChat: function(title, url){
      const chatInput = document.getElementById("chatInput");
      if(chatInput){
        chatInput.value = `Akira, por favor lee y analiza a fondo el contenido de este enlace:\n${url}\nTítulo: ${title}`;
        chatInput.focus();
        this.closeWebModal();
      }
    }
  };

  function escapeHtml(str){
    if(!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeQuotes(str){
    if(!str) return "";
    return String(str).replace(/'/g, "\\'").replace(/"/g, "\\\"").replace(/\n/g, " ");
  }

  // Inject styles
  (function injectStyles(){
    if(document.getElementById("akira-live-web-styles")) return;
    const st = document.createElement("style");
    st.id = "akira-live-web-styles";
    st.textContent = `
      .ak-web-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 16px;
      }
      .ak-web-dialog {
        background: #090e1a; border: 1px solid rgba(0, 240, 255, 0.3); border-radius: 12px;
        width: 100%; max-width: 760px; max-height: 90vh; display: flex; flex-direction: column;
        box-shadow: 0 10px 40px rgba(0,0,0,0.8), 0 0 20px rgba(0,240,255,0.15); overflow: hidden;
      }
      .ak-web-header {
        display: flex; align-items: center; justify-content: space-between; padding: 14px 18px;
        border-bottom: 1px solid rgba(255,255,255,0.08); background: #0c1222;
      }
      .ak-web-title-wrap { display: flex; align-items: center; gap: 10px; }
      .ak-web-icon { font-size: 22px; }
      .ak-web-close-btn { background: none; border: none; color: #94a3b8; font-size: 18px; cursor: pointer; }
      .ak-web-close-btn:hover { color: #fff; }
      .ak-web-tabs { display: flex; border-bottom: 1px solid rgba(255,255,255,0.08); background: #0a0f1e; }
      .ak-web-tab-btn {
        flex: 1; padding: 10px; background: none; border: none; color: #94a3b8; font-size: 12px;
        cursor: pointer; border-bottom: 2px solid transparent; font-weight: 600;
      }
      .ak-web-tab-btn.active { color: #00f0ff; border-bottom-color: #00f0ff; background: rgba(0,240,255,0.04); }
      .ak-web-body { padding: 16px; overflow-y: auto; flex: 1; }
      .ak-web-search-box { display: flex; gap: 8px; }
      .ak-web-input {
        flex: 1; background: #040711; border: 1px solid #1e293b; color: #fff; padding: 10px 14px;
        border-radius: 6px; font-size: 13px; outline: none;
      }
      .ak-web-input:focus { border-color: #00f0ff; box-shadow: 0 0 8px rgba(0,240,255,0.3); }
      .ak-web-search-btn {
        background: #0284c7; color: #fff; border: none; border-radius: 6px; padding: 0 16px;
        font-size: 12px; font-weight: 600; cursor: pointer;
      }
      .ak-web-search-btn:hover { background: #0369a1; }
      .ak-web-results-list { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
      .ak-web-card {
        background: #0d1527; border: 1px solid rgba(255,255,255,0.07); border-radius: 8px;
        padding: 12px; display: flex; flex-direction: column; gap: 6px;
      }
      .ak-web-card-top { display: flex; align-items: center; gap: 8px; }
      .ak-web-num { color: #00f0ff; font-weight: bold; font-size: 12px; }
      .ak-web-title-link { color: #38bdf8; font-size: 13px; font-weight: 600; text-decoration: none; }
      .ak-web-title-link:hover { text-decoration: underline; color: #7dd3fc; }
      .ak-web-url-text { font-size: 11px; color: #64748b; word-break: break-all; }
      .ak-web-snippet { font-size: 12px; color: #cbd5e1; line-height: 1.45; margin: 0; }
      .ak-web-card-actions { margin-top: 4px; }
      .ak-web-action-btn {
        background: rgba(0,240,255,0.1); border: 1px solid rgba(0,240,255,0.3); color: #00f0ff;
        border-radius: 4px; padding: 4px 10px; font-size: 11px; cursor: pointer;
      }
      .ak-web-action-btn:hover { background: rgba(0,240,255,0.2); }
      .ak-web-extracted-content {
        background: #040711; border: 1px solid #1e293b; border-radius: 6px; padding: 12px;
        color: #e2e8f0; font-size: 12px; line-height: 1.5; max-height: 250px; overflow-y: auto; white-space: pre-wrap;
      }
    `;
    document.head.appendChild(st);
  })();

  // Initialize pills on DOM load
  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", updatePillVisuals);
  } else {
    updatePillVisuals();
  }
})();
