// AKIRA LEARNING ENGINE UI V1
(function(){
  "use strict";

  const BACKEND = () => localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
  const SOURCE = "explicit_user_teaching";

  function H(){
    if(typeof window.akiraAuthHeaders === "function"){
      try{return window.akiraAuthHeaders();}catch(_){}
    }
    return {"Content-Type":"application/json"};
  }

  function esc(s){
    return String(s == null ? "" : s)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }

  function label(status){
    const map = {
      candidate:"CANDIDATO", verified:"VERIFICADO", consolidated:"CONSOLIDADO",
      conflicted:"CONFLICTIVO", obsolete:"OBSOLETO", discarded:"DESCARTADO"
    };
    return map[status] || String(status || "—").toUpperCase();
  }

  async function request(path, options){
    options = options || {};
    const ctrl = new AbortController();
    const timer = setTimeout(function(){ctrl.abort();}, 15000);
    try{
      const r = await fetch(BACKEND()+path, {
        method: options.method || "GET",
        headers: Object.assign({}, H(), options.headers || {}),
        body: options.body,
        cache: "no-store",
        signal: ctrl.signal
      });
      let data = null;
      try{data = await r.json();}catch(_){}
      return {ok:r.ok, status:r.status, data:data};
    }catch(e){
      return {ok:false, status:0, error:String((e && e.message) || e)};
    }finally{
      clearTimeout(timer);
    }
  }

  function reviewRoot(){
    return document.getElementById("learningReviewList");
  }

  function statusClass(status){
    return " learning-status-" + esc(status || "unknown");
  }

  function actionButtons(item){
    const id = esc(item.id);
    const v = Number(item.version || 1);
    const status = item.status || "candidate";
    const buttons = [];
    if(status === "candidate"){
      buttons.push('<button class="learning-action" data-learning-action="investigate" data-learning-id="'+id+'" data-learning-version="'+v+'">🔎 INVESTIGAR</button>');
      buttons.push('<button class="learning-action" data-learning-action="evaluate" data-learning-id="'+id+'" data-learning-version="'+v+'">🧪 EVALUAR</button>');
      buttons.push('<button class="learning-action" data-learning-action="verified" data-learning-id="'+id+'" data-learning-version="'+v+'">✓ VERIFICAR</button>');
      buttons.push('<button class="learning-action" data-learning-action="conflicted" data-learning-id="'+id+'" data-learning-version="'+v+'">⚠ CONFLICTO</button>');
      buttons.push('<button class="learning-action danger" data-learning-action="discarded" data-learning-id="'+id+'" data-learning-version="'+v+'">✕ DESCARTAR</button>');
    }else if(status === "verified"){
      buttons.push('<button class="learning-action primary" data-learning-action="consolidated" data-learning-id="'+id+'" data-learning-version="'+v+'">★ CONSOLIDAR</button>');
      buttons.push('<button class="learning-action" data-learning-action="conflicted" data-learning-id="'+id+'" data-learning-version="'+v+'">⚠ CONFLICTO</button>');
      buttons.push('<button class="learning-action" data-learning-action="obsolete" data-learning-id="'+id+'" data-learning-version="'+v+'">OBSOLETO</button>');
    }else if(status === "consolidated"){
      buttons.push('<button class="learning-action" data-learning-action="obsolete" data-learning-id="'+id+'" data-learning-version="'+v+'">MARCAR OBSOLETO</button>');
      buttons.push('<button class="learning-action" data-learning-action="conflicted" data-learning-id="'+id+'" data-learning-version="'+v+'">⚠ CONFLICTO</button>');
    }else if(status === "conflicted"){
      buttons.push('<button class="learning-action" data-learning-action="verified" data-learning-id="'+id+'" data-learning-version="'+v+'">✓ VALIDAR</button>');
      buttons.push('<button class="learning-action danger" data-learning-action="discarded" data-learning-id="'+id+'" data-learning-version="'+v+'">✕ DESCARTAR</button>');
    }else if(status === "obsolete"){
      buttons.push('<button class="learning-action" data-learning-action="verified" data-learning-id="'+id+'" data-learning-version="'+v+'">REVALIDAR</button>');
      buttons.push('<button class="learning-action danger" data-learning-action="discarded" data-learning-id="'+id+'" data-learning-version="'+v+'">✕ DESCARTAR</button>');
    }
    return buttons.join("");
  }

  function render(rows){
    const root = reviewRoot();
    const count = document.getElementById("learningReviewCount");
    if(!root) return;

    const list = Array.isArray(rows) ? rows : [];
    const pending = list.filter(function(x){return (x.status || "candidate") === "candidate";}).length;
    if(count) count.textContent = pending + " candidatos";

    if(!list.length){
      root.innerHTML = '<div class="learning-empty">No hay enseñanzas explícitas registradas todavía.</div>';
      return;
    }

    root.innerHTML = list.map(function(item){
      const status = item.status || "candidate";
      const lesson = String(item.lesson || "").trim();
      const source = String(item.source || "unknown");
      const conf = Math.round(Number(item.confidence || 0) * 100);
      const nodes = Array.isArray(item.knowledge_nodes) ? item.knowledge_nodes.length : 0;
      const evidence = Array.isArray(item.evidence) ? item.evidence : [];
      const analysis = item.verification_analysis && typeof item.verification_analysis === "object" ? item.verification_analysis : null;
      const verdict = analysis ? String(analysis.verdict || "insufficient").toUpperCase() : "";
      const analysisHtml = analysis
        ? '<div class="learning-analysis">'
          + '<div class="learning-analysis-head">🧪 EVALUACIÓN · '+esc(verdict)+'</div>'
          + '<div class="learning-analysis-summary">'+esc(String(analysis.summary || "Sin resumen."))+'</div>'
          + '<div class="learning-analysis-meta">confianza evaluador: '+Math.round(Number(analysis.confidence || 0) * 100)+'% · evaluado: '+esc(String(analysis.evaluated_at || "—"))+'</div>'
          + '</div>'
        : "";
      return ''
        + '<article class="learning-card">'
        +   '<div class="learning-card-head">'
        +     '<div class="learning-status'+statusClass(status)+'">'+esc(label(status))+'</div>'
        +     '<div class="learning-confidence">CONF. '+conf+'%</div>'
        +   '</div>'
        +   '<div class="learning-lesson">'+esc(lesson).replace(/\n/g,"<br>")+'</div>'
        +   '<div class="learning-meta">'
        +      'fuente: '+esc(source)+' · nodos: '+nodes+' · evidencia: '+evidence.length+' · reutilizado: '+Number(item.reuse_count || 0)+' veces'
        +   '</div>'
        +   analysisHtml
        +   '<div class="learning-actions">'+actionButtons(item)+'</div>'
        + '</article>';
    }).join("");

    root.querySelectorAll(".learning-action").forEach(function(btn){
      btn.addEventListener("click", async function(){
        const id = btn.dataset.learningId;
        const status = btn.dataset.learningAction;
        const version = Number(btn.dataset.learningVersion || 1);
        if(!id || !status) return;

        btn.disabled = true;
        let workingVersion = version;
        if(status === "investigate"){
          await investigate(id, version);
          btn.disabled = false;
          await api.load();
          return;
        }
        if(status === "evaluate"){
          await evaluate(id, version);
          btn.disabled = false;
          await api.load();
          return;
        }
        if(status === "verified" && !await addEvidence(id, workingVersion)){
          btn.disabled = false;
          return;
        }
        if(status === "verified"){
          const latest = await request("/api/v8/learning/"+encodeURIComponent(id));
          if(latest.ok && latest.data && latest.data.learning){
            workingVersion = Number(latest.data.learning.version || workingVersion);
          }
        }
        const r = await request("/api/v8/learning/"+encodeURIComponent(id)+"/status", {
          method:"PATCH",
          body:JSON.stringify({status:status, expected_version:workingVersion})
        });
        btn.disabled = false;

        if(!r.ok || !r.data || !r.data.ok){
          alert("No se pudo actualizar el aprendizaje: " + ((r.data && r.data.reason) || ("HTTP "+r.status)));
          return;
        }
        await api.load();
      });
    });
  }

  async function evaluate(id, version){
    const r = await request("/api/v8/learning/"+encodeURIComponent(id)+"/evaluate", {
      method:"POST",
      body:JSON.stringify({expected_version:version})
    });
    if(!r.ok || !r.data || !r.data.ok){
      alert("No se pudo evaluar: " + ((r.data && r.data.reason) || ("HTTP "+r.status)));
      return;
    }
    await api.load();
  }

  async function investigate(id, version){
    const current = await request("/api/v8/learning/"+encodeURIComponent(id));
    const lesson = current.ok && current.data && current.data.learning ? current.data.learning.lesson : "";
    const query = prompt("Tema para investigar:", lesson || "");
    if(query === null) return;
    const q = String(query).trim();
    if(!q) return;
    const r = await request("/api/v8/learning/"+encodeURIComponent(id)+"/investigate", {
      method:"POST",
      body:JSON.stringify({query:q, max_sources:5, expected_version:version})
    });
    if(!r.ok || !r.data || !r.data.ok){
      alert("No se pudo investigar: " + ((r.data && r.data.reason) || ("HTTP "+r.status)));
      return;
    }
    const sources = Array.isArray(r.data.evidence) ? r.data.evidence : [];
    if(!sources.length){
      alert("La investigación no encontró fuentes utilizables. El conocimiento sigue como candidato.");
      return;
    }
    const report = sources.map(function(e, i){
      return (i+1)+". "+(e.title || "Fuente")+"\\n"+(e.reference || "")+(e.note ? "\\n"+e.note : "");
    }).join("\\n\\n");
    alert("Fuentes encontradas:\\n\\n"+report+"\\n\\nEl aprendizaje NO fue verificado automáticamente.");
  }

  async function addEvidence(id, version){
    const title = prompt("Título de la evidencia:", "Fuente de verificación");
    if(title === null) return null;
    const t = String(title).trim();
    if(!t) return false;
    const reference = prompt("Referencia o URL:", "");
    if(reference === null) return null;
    const ref = String(reference).trim();
    if(!ref) return false;
    const note = prompt("Nota breve (opcional):", "") || "";
    const r = await request("/api/v8/learning/"+encodeURIComponent(id)+"/evidence", {
      method:"POST",
      body:JSON.stringify({
        expected_version:version,
        evidence:[{
          type:"manual_verification",
          title:t,
          reference:ref,
          note:String(note).trim()
        }]
      })
    });
    if(!r.ok || !r.data || !r.data.ok){
      alert("No se pudo guardar la evidencia: " + ((r.data && r.data.reason) || ("HTTP "+r.status)));
      return false;
    }
    return r.data.learning || null;
  }

  const api = {
    async load(){
      const root = reviewRoot();
      if(!root) return;
      root.innerHTML = '<div class="learning-empty">Cargando conocimiento…</div>';
      const r = await request("/api/v8/learning?source="+encodeURIComponent(SOURCE)+"&limit=40");
      if(!r.ok || !r.data || !r.data.ok){
        root.innerHTML = '<div class="learning-empty">No se pudo cargar la revisión: '+esc((r.data && r.data.reason) || r.error || ("HTTP "+r.status))+'</div>';
        return;
      }
      render(r.data.learning || []);
    }
  };

  function injectStyles(){
    if(document.getElementById("akira-learning-styles")) return;
    const style = document.createElement("style");
    style.id = "akira-learning-styles";
    style.textContent = ''
      + '.learning-review{border:3px solid var(--border);background:#101016;padding:10px;margin-bottom:10px;}'
      + '.learning-review-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;}'
      + '.learning-review-title{font-family:"Press Start 2P",monospace;font-size:10px;color:#fff;}'
      + '.learning-review-count{font-size:9px;color:var(--muted);margin-left:8px;}'
      + '.learning-review-refresh{background:#17171e;border:2px solid var(--border);color:#fff;padding:5px 8px;font:9px "Pixelify Sans",sans-serif;cursor:pointer;}'
      + '.learning-review-refresh:hover{background:#20202a;}'
      + '.learning-review-note{font-size:10px;color:var(--muted);line-height:1.45;margin-bottom:9px;}'
      + '#learningReviewList{display:flex;flex-direction:column;gap:7px;max-height:280px;overflow:auto;}'
      + '.learning-card{border:2px solid var(--border);background:#15151c;padding:9px;}'
      + '.learning-card-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;}'
      + '.learning-status{display:inline-block;border:2px solid var(--border);padding:4px 6px;font:8px "Press Start 2P",monospace;color:#fff;background:#1d1d25;}'
      + '.learning-status-candidate{border-color:#b78b2e;}'
      + '.learning-status-verified{border-color:#4cae7a;}'
      + '.learning-status-consolidated{border-color:#6366f1;}'
      + '.learning-status-conflicted{border-color:#d46a6a;}'
      + '.learning-status-obsolete{border-color:#6f727c;}'
      + '.learning-status-discarded{border-color:#ff7b72;}'
      + '.learning-confidence{font:8px "Press Start 2P",monospace;color:var(--muted);}'
      + '.learning-lesson{font-size:12px;line-height:1.5;color:#fff;word-break:break-word;}'
      + '.learning-meta{font-size:9px;color:var(--muted);margin-top:7px;line-height:1.4;}'
      + '.learning-analysis{margin-top:7px;padding:7px;border:1px solid #3b3b48;background:#101017;}'
      + '.learning-analysis-head{font:10px "Pixelify Sans",sans-serif;color:#fff;letter-spacing:.03em;margin-bottom:4px;}'
      + '.learning-analysis-summary{font-size:11px;color:#d9d9e2;line-height:1.4;}'
      + '.learning-analysis-meta{margin-top:4px;color:var(--muted);font-size:9px;}'
      + '.learning-actions{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px;}'
      + '.learning-action{border:2px solid var(--border);background:#111116;color:#ddd;padding:5px 7px;font:8px "Pixelify Sans",sans-serif;cursor:pointer;}'
      + '.learning-action:hover{background:#20202a;color:#fff;}'
      + '.learning-action.primary{border-color:var(--accent);}'
      + '.learning-action.danger{border-color:#6d3030;color:#ff9a9a;}'
      + '.learning-action:disabled{opacity:.45;cursor:default;}'
      + '.learning-empty{padding:12px;color:var(--muted);font-size:10px;text-align:center;}'
      + '@media(max-width:650px){#learningReviewList{max-height:220px;}}';
    document.head.appendChild(style);
  }

  window.akiraLearningReview = api;

  document.addEventListener("DOMContentLoaded", function(){
    injectStyles();
    window.addEventListener("akira:section-shown", function(ev){
      if(ev && ev.detail && ev.detail.section === "membrane") api.load();
    });
    setTimeout(api.load, 700);
  });
})();