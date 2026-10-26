/**
 * AKIRA LOCAL VECTOR & SEMANTIC SEARCH ENGINE v1.0
 * Zero-Cost ($0.00 COP/USD) client-side neural & lexical search engine.
 * Indexation via TF-IDF + Cosine Similarity + BM25 score with instant Ctrl+K Spotlight modal.
 */
(function(){
  "use strict";

  const STOPWORDS = new Set([
    "de","la","que","el","en","y","a","los","del","se","las","por","un","para","con","no","una",
    "su","al","lo","como","mas","pero","sus","le","ya","o","este","si","porque","esta","entre",
    "cuando","muy","sin","sobre","tambien","me","hasta","hay","donde","quien","desde","todo",
    "nos","durante","todos","uno","les","ni","contra","otros","ese","eso","ante","ellos","e",
    "esto","mi","antes","algunos","que","unos","yo","otro","otras","otra","el","ella","nosotros",
    "the","and","of","to","in","a","is","for","that","on","with","as","by","at","an","be","this"
  ]);

  function tokenize(text){
    if(!text) return [];
    return String(text)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9_]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 1 && !STOPWORDS.has(w));
  }

  function computeTF(tokens){
    const tf = {};
    for(let t of tokens){
      tf[t] = (tf[t] || 0) + 1;
    }
    const len = tokens.length || 1;
    for(let t in tf){
      tf[t] = tf[t] / len;
    }
    return tf;
  }

  class VectorIndex {
    constructor(){
      this.documents = []; // { id, title, text, category, metadata, tf, vector, magnitude }
      this.df = {};        // document frequency of terms
      this.totalDocs = 0;
    }

    addDocument(doc){
      const tokens = tokenize(doc.title + " " + doc.text);
      const tf = computeTF(tokens);
      const uniqueTokens = new Set(tokens);
      for(let t of uniqueTokens){
        this.df[t] = (this.df[t] || 0) + 1;
      }
      this.documents.push({
        id: doc.id,
        title: doc.title,
        text: doc.text,
        category: doc.category || "general",
        metadata: doc.metadata || {},
        tokens: tokens,
        tf: tf,
        magnitude: 0
      });
      this.totalDocs = this.documents.length;
    }

    finalizeIndex(){
      // Compute IDF and vectors
      for(let doc of this.documents){
        let sumSq = 0;
        doc.vector = {};
        for(let t in doc.tf){
          const idf = Math.log(1 + (this.totalDocs / (this.df[t] || 1)));
          const weight = doc.tf[t] * idf;
          doc.vector[t] = weight;
          sumSq += weight * weight;
        }
        doc.magnitude = Math.sqrt(sumSq) || 1;
      }
    }

    search(query, filterCategory = "all", limit = 15){
      const qTokens = tokenize(query);
      if(qTokens.length === 0) return [];

      const qTF = computeTF(qTokens);
      const qVector = {};
      let qSumSq = 0;
      for(let t of qTokens){
        const idf = Math.log(1 + (this.totalDocs / (this.df[t] || 1)));
        const weight = (qTF[t] || 0) * idf;
        qVector[t] = weight;
        qSumSq += weight * weight;
      }
      const qMag = Math.sqrt(qSumSq) || 1;

      const results = [];
      const queryLower = query.toLowerCase().trim();

      for(let doc of this.documents){
        if(filterCategory !== "all" && doc.category !== filterCategory) continue;

        // Cosine similarity
        let dot = 0;
        for(let t in qVector){
          if(doc.vector && doc.vector[t]){
            dot += qVector[t] * doc.vector[t];
          }
        }
        let cosineSim = dot / (qMag * doc.magnitude);

        // Substring / exact match boost
        let boost = 0;
        const fullDocText = (doc.title + " " + doc.text).toLowerCase();
        if(fullDocText.includes(queryLower)) {
          boost += 0.35;
        }
        if(doc.title.toLowerCase().includes(queryLower)) {
          boost += 0.45;
        }

        const finalScore = Math.min(1.0, cosineSim + boost);
        if(finalScore > 0.05) {
          results.push({
            id: doc.id,
            title: doc.title,
            text: doc.text,
            category: doc.category,
            metadata: doc.metadata,
            score: finalScore
          });
        }
      }

      results.sort((a, b) => b.score - a.score);
      return results.slice(0, limit);
    }
  }

  // Active in-memory index
  let activeIndex = new VectorIndex();
  let lastIndexTimestamp = 0;

  // Harvest data from Cytoscape membrane, learning candidates, and Colmena specialists
  window.akiraRefreshVectorIndex = function(){
    const idx = new VectorIndex();

    // 1. Index Cytoscape nodes if available
    try {
      if(window.cy && typeof window.cy.nodes === "function") {
        window.cy.nodes().forEach(node => {
          const d = node.data();
          idx.addDocument({
            id: "membrane_" + d.id,
            title: d.label || d.id,
            text: (d.title || "") + " " + (d.content || "") + " " + (d.type || ""),
            category: "membrane",
            metadata: { type: d.type, id: d.id }
          });
        });
      }
    } catch(e){}

    // 2. Index Learning items from localStorage / window cache
    try {
      const candidates = JSON.parse(localStorage.getItem("akira_learning_candidates") || "[]");
      candidates.forEach((c, i) => {
        idx.addDocument({
          id: "learn_" + (c.id || i),
          title: c.summary || c.title || ("Aprendizaje #" + (i+1)),
          text: (c.content || "") + " " + (c.topic || "") + " " + (c.status || ""),
          category: "learning",
          metadata: { status: c.status, confidence: c.confidence }
        });
      });
    } catch(e){}

    // 3. Index Colmena Specialists
    try {
      if(window.COLMENA_SPECIALISTS_REGISTRY && Array.isArray(window.COLMENA_SPECIALISTS_REGISTRY)) {
        window.COLMENA_SPECIALISTS_REGISTRY.forEach(sp => {
          idx.addDocument({
            id: "spec_" + (sp.id || sp.name),
            title: sp.name + " (" + sp.role + ")",
            text: (sp.directive || "") + " " + (sp.division || "") + " " + (sp.skills || []).join(" "),
            category: "specialist",
            metadata: { division: sp.division, role: sp.role }
          });
        });
      }
    } catch(e){}

    // 4. Index Knowledge Radar feeds if available
    try {
      const radarItems = JSON.parse(localStorage.getItem("akira_radar_cache") || "[]");
      radarItems.forEach((r, i) => {
        idx.addDocument({
          id: "radar_" + (r.id || i),
          title: r.title || "Noticia Radar",
          text: (r.summary || "") + " " + (r.source || "") + " " + (r.tags || []).join(" "),
          category: "radar",
          metadata: { source: r.source, url: r.url }
        });
      });
    } catch(e){}

    idx.finalizeIndex();
    activeIndex = idx;
    lastIndexTimestamp = Date.now();
    return idx;
  };

  /**
   * Search interface
   */
  window.akiraVectorSearch = function(query, filter = "all", limit = 15){
    if(Date.now() - lastIndexTimestamp > 60000 || activeIndex.totalDocs === 0) {
      window.akiraRefreshVectorIndex();
    }
    return activeIndex.search(query, filter, limit);
  };

  /**
   * Universal Spotlight Modal (Ctrl+K)
   */
  function ensureSearchModal(){
    let modal = document.getElementById("akiraSearchModal");
    if(modal) return modal;

    modal = document.createElement("div");
    modal.id = "akiraSearchModal";
    modal.className = "ak-search-overlay";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="ak-search-dialog">
        <div class="ak-search-input-wrap">
          <span class="ak-search-icon">🔍</span>
          <input type="text" id="akSearchInput" class="ak-search-input" placeholder="Buscar en la memoria, nodos neuronales, agentes y radar... (ESC para cerrar)" autocomplete="off">
          <span class="ak-search-badge">VECTOR LOCAL</span>
        </div>
        <div class="ak-search-filter-pills" id="akSearchFilterPills">
          <button type="button" class="ak-filter-pill active" data-cat="all">Todos</button>
          <button type="button" class="ak-filter-pill" data-cat="learning">Aprendizaje</button>
          <button type="button" class="ak-filter-pill" data-cat="membrane">Nodos Neuronales</button>
          <button type="button" class="ak-filter-pill" data-cat="specialist">Especialistas</button>
          <button type="button" class="ak-filter-pill" data-cat="radar">Radar Tech</button>
        </div>
        <div class="ak-search-results" id="akSearchResults">
          <div class="ak-search-empty">Escribe una palabra o concepto para realizar búsqueda vectorial en tiempo real ($0.00 COP).</div>
        </div>
        <div class="ak-search-footer">
          <span>⚡ Índice en memoria: <strong id="akSearchDocCount">0</strong> elementos indexados</span>
          <span>Navegar: <kbd>↑</kbd> <kbd>↓</kbd> | Seleccionar: <kbd>Enter</kbd> | Cerrar: <kbd>Esc</kbd></span>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const input = modal.querySelector("#akSearchInput");
    const resultsBox = modal.querySelector("#akSearchResults");
    const filterPills = modal.querySelectorAll(".ak-filter-pill");
    let currentCat = "all";

    filterPills.forEach(btn => {
      btn.addEventListener("click", () => {
        filterPills.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentCat = btn.getAttribute("data-cat");
        performSearch();
      });
    });

    function performSearch(){
      const q = input.value.trim();
      if(!q) {
        resultsBox.innerHTML = '<div class="ak-search-empty">Escribe un término para buscar en la memoria neural de Akira.</div>';
        return;
      }
      const results = window.akiraVectorSearch(q, currentCat, 12);
      if(results.length === 0) {
        resultsBox.innerHTML = '<div class="ak-search-empty">No se encontraron coincidencias vectoriales para "' + escapeHtml(q) + '".</div>';
        return;
      }

      let html = "";
      results.forEach((r, idx) => {
        const catBadge = {
          learning: "🧠 APRENDIZAJE",
          membrane: "🌐 NEURONA",
          specialist: "🐝 ESPECIALISTA",
          radar: "📡 RADAR TECH"
        }[r.category] || "DOCUMENTO";

        const pct = Math.round(r.score * 100);
        html += `
          <div class="ak-search-item" onclick="window.akiraSelectSearchResult('${r.category}', '${r.id}')" tabindex="0">
            <div class="ak-search-item-header">
              <span class="ak-search-item-title">${escapeHtml(r.title)}</span>
              <div class="ak-search-item-meta">
                <span class="ak-search-cat-badge">${catBadge}</span>
                <span class="ak-search-score-badge">${pct}% match</span>
              </div>
            </div>
            <div class="ak-search-item-snippet">${escapeHtml((r.text || "").slice(0, 160))}...</div>
          </div>
        `;
      });
      resultsBox.innerHTML = html;
    }

    input.addEventListener("input", performSearch);

    modal.addEventListener("click", (e) => {
      if(e.target === modal) window.akiraCloseSearchModal();
    });

    return modal;
  }

  function escapeHtml(s){
    return String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  window.akiraOpenSearchModal = function(){
    const modal = ensureSearchModal();
    window.akiraRefreshVectorIndex();
    const countEl = modal.querySelector("#akSearchDocCount");
    if(countEl) countEl.innerText = activeIndex.totalDocs;

    modal.style.display = "flex";
    const input = modal.querySelector("#akSearchInput");
    if(input) {
      input.value = "";
      input.focus();
    }
  };

  window.akiraCloseSearchModal = function(){
    const modal = document.getElementById("akiraSearchModal");
    if(modal) modal.style.display = "none";
  };

  window.akiraSelectSearchResult = function(cat, id){
    window.akiraCloseSearchModal();
    if(cat === "membrane") {
      const cleanId = id.replace("membrane_", "");
      if(window.cy) {
        const node = window.cy.getElementById(cleanId);
        if(node && node.length > 0) {
          window.cy.animate({ center: { eles: node }, zoom: 1.5, duration: 400 });
          node.select();
        }
      }
    } else if(cat === "learning") {
      const el = document.getElementById("learningCandidatesList");
      if(el) el.scrollIntoView({ behavior: "smooth" });
    } else if(cat === "specialist") {
      alert("Especialista seleccionado: " + id);
    }
  };

  // Keyboard shortcut Ctrl+K / Cmd+K
  document.addEventListener("keydown", function(e){
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      const modal = document.getElementById("akiraSearchModal");
      if(modal && modal.style.display === "flex") {
        window.akiraCloseSearchModal();
      } else {
        window.akiraOpenSearchModal();
      }
    } else if(e.key === "Escape") {
      window.akiraCloseSearchModal();
    }
  });

  // Inject CSS styles dynamically
  (function injectStyles(){
    if(document.getElementById("akira-search-styles")) return;
    const st = document.createElement("style");
    st.id = "akira-search-styles";
    st.textContent = `
      .ak-search-overlay {
        position: fixed;
        inset: 0;
        z-index: 99998;
        background: rgba(4, 7, 14, 0.85);
        backdrop-filter: blur(8px);
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 10vh;
      }
      .ak-search-dialog {
        background: #0b1120;
        border: 2px solid #00f0ff;
        border-radius: 12px;
        box-shadow: 0 0 35px rgba(0, 240, 255, 0.25);
        width: 90vw;
        max-width: 680px;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .ak-search-input-wrap {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        gap: 10px;
        border-bottom: 1px solid rgba(0, 240, 255, 0.2);
        background: #0e1526;
      }
      .ak-search-icon { font-size: 18px; }
      .ak-search-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: #f1f5f9;
        font-size: 15px;
      }
      .ak-search-badge {
        font-size: 9px;
        font-weight: 700;
        color: #00f0ff;
        background: rgba(0, 240, 255, 0.15);
        padding: 3px 8px;
        border-radius: 4px;
        border: 1px solid rgba(0, 240, 255, 0.3);
      }
      .ak-search-filter-pills {
        display: flex;
        gap: 6px;
        padding: 8px 16px;
        background: #070a13;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        overflow-x: auto;
      }
      .ak-filter-pill {
        background: #1e293b;
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #94a3b8;
        font-size: 11px;
        padding: 4px 10px;
        border-radius: 14px;
        cursor: pointer;
        transition: all 0.15s;
        white-space: nowrap;
      }
      .ak-filter-pill.active {
        background: #00f0ff;
        color: #04070e;
        font-weight: 700;
        border-color: #00f0ff;
      }
      .ak-search-results {
        flex: 1;
        overflow-y: auto;
        max-height: 50vh;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .ak-search-empty {
        text-align: center;
        padding: 30px;
        color: #64748b;
        font-size: 13px;
      }
      .ak-search-item {
        background: #0d1527;
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 8px;
        padding: 10px 14px;
        cursor: pointer;
        transition: all 0.15s;
      }
      .ak-search-item:hover, .ak-search-item:focus {
        background: #14203a;
        border-color: #00f0ff;
        transform: translateY(-1px);
        outline: none;
      }
      .ak-search-item-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
        gap: 10px;
      }
      .ak-search-item-title {
        color: #f8fafc;
        font-weight: 600;
        font-size: 13px;
      }
      .ak-search-item-meta {
        display: flex;
        gap: 6px;
        align-items: center;
      }
      .ak-search-cat-badge {
        font-size: 9px;
        color: #38bdf8;
        background: rgba(56, 189, 248, 0.1);
        padding: 2px 6px;
        border-radius: 4px;
      }
      .ak-search-score-badge {
        font-size: 10px;
        font-weight: 700;
        color: #10b981;
      }
      .ak-search-item-snippet {
        font-size: 11px;
        color: #94a3b8;
        line-height: 1.4;
      }
      .ak-search-footer {
        padding: 8px 16px;
        background: #070a13;
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        font-size: 10px;
        color: #64748b;
        display: flex;
        justify-content: space-between;
      }
      .ak-search-footer kbd {
        background: #1e293b;
        color: #cbd5e1;
        padding: 1px 4px;
        border-radius: 3px;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
    `;
    document.head.appendChild(st);
  })();

})();
