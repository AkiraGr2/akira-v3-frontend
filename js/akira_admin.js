// AKIRA ADMIN PANEL V1 — Reconstruido desde cero, aislado y honesto.
// Fase 5 (Self-Model) · Fase 6 (Grafo+Aprendizaje) · Fase 7 (Ciclo Cognitivo)
// Fase 8 (Tool Registry) · Fase 9 (Agentes+Tareas) · Dashboard unificado.
// Reglas: no toca chat/membrana/oficina/sync; todos los fetch con timeout;
// errores explican POR QUÉ; sesión se restaura al recargar.

(function(){
  "use strict";

  const BACKEND = () => localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";

  // ---------- helpers ----------
  function _authHeaders(){
    if (typeof window.akiraAuthHeaders === "function") {
      try { return window.akiraAuthHeaders(); } catch(_){}
    }
    const h = { "Content-Type": "application/json" };
    try {
      const t = localStorage.getItem("akira_session_token");
      const exp = parseInt(localStorage.getItem("akira_session_exp") || "0", 10);
      if (t && exp > Math.floor(Date.now() / 1000)) h["Authorization"] = "Bearer " + t;
    } catch(_){}
    return h;
  }

  async function _fetch(path, options, timeoutMs){
    options = options || {};
    timeoutMs = timeoutMs || 20000;
    const url = BACKEND() + path;
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(url, {
        method: options.method || "GET",
        body: options.body,
        headers: Object.assign({}, _authHeaders(), options.headers || {}),
        signal: ctrl.signal,
        cache: "no-store",
      });
      clearTimeout(to);
      let data = null;
      try { data = await r.json(); } catch(_){}
      return { ok: r.ok, status: r.status, data: data };
    } catch(e){
      clearTimeout(to);
      return { ok: false, status: 0,
        error: (e && e.name === "AbortError") ? "timeout" : String((e && e.message) || e) };
    }
  }

  function _errText(res){
    if (res.status === 401) return "Sesión no válida o expirada. Entra a Cuenta e inicia sesión.";
    if (res.status === 403) return "No autorizado (requiere propietario).";
    if (res.status === 503) return "Backend arrancando (persistencia no lista). Reintenta en 10s.";
    if (res.status === 0)   return "Sin conexión o backend frío (" + (res.error || "timeout") + ").";
    if (res.data && res.data.reason) return res.data.reason + " (HTTP " + res.status + ")";
    return "Error HTTP " + res.status;
  }

  function _out(id, content, isError){
    const el = document.getElementById(id);
    if (!el) return;
    const ts = new Date().toLocaleTimeString();
    const prefix = isError === true ? "❌ " : "";
    let body;
    if (typeof content === "string") body = content;
    else body = JSON.stringify(content, null, 2);
    if (body.length > 3200) body = body.slice(0, 3200) + "\n… (truncado)";
    el.style.color = isError === true ? "#ef4444" : "#8a8a93";
    el.textContent = "[" + ts + "] " + prefix + body;
  }

  // ============================================================
  // FASE 5 — Self-Model
  // ============================================================
  window.smGet = async function(){
    _out("smOutput", "Cargando self-model…", false);
    const r = await _fetch("/api/v8/self");
    if (!r.ok || !r.data || !r.data.ok) return _out("smOutput", _errText(r), true);
    const sm = r.data.self_model;
    const caps = sm.capabilities || [];
    _out("smOutput", {
      version: sm.version,
      updated_at: sm.updated_at,
      identity: sm.identity,
      purpose: sm.purpose,
      capabilities_verificadas: caps.filter(c => c.status === "verified").length,
      capabilities_total: caps.length,
      no_implementadas: caps.filter(c => c.status === "not_implemented").map(c => c.name),
      current_state: sm.current_state,
      uncertainties: sm.uncertainties,
    }, false);
  };

  window.smPatch = async function(){
    const raw = prompt('JSON de cambios. Ej: {"uncertainties":["nota desde panel"]}');
    if (!raw) return;
    let changes;
    try { changes = JSON.parse(raw); }
    catch(e){ return _out("smOutput", "JSON inválido: " + e.message, true); }

    const cur = await _fetch("/api/v8/self");
    if (!cur.ok || !cur.data || !cur.data.ok) return _out("smOutput", _errText(cur), true);
    const expected = cur.data.self_model.version;

    _out("smOutput", "Actualizando a version " + (expected + 1) + "…", false);
    const r = await _fetch("/api/v8/self", {
      method: "PATCH",
      body: JSON.stringify({ changes: changes, expected_version: expected }),
    });
    if (!r.ok || !r.data || !r.data.ok) return _out("smOutput", _errText(r), true);
    _out("smOutput", {
      ok: true,
      version_nueva: r.data.self_model.version,
      updated_at: r.data.self_model.updated_at,
    }, false);
  };

  window.smReset = function(){ _out("smOutput", "Salida limpiada.", false); };

  // ============================================================
  // FASE 6 — Grafo + Aprendizaje
  // ============================================================
  window.f6TestFull = async function(){
    _out("f6Output", "Test completo: nodo A → nodo B → arista → aprendizaje…", false);
    const st = Date.now().toString(36);

    const n1 = await _fetch("/api/v8/graph/node", { method: "POST",
      body: JSON.stringify({ node_type: "concept", label: "test_concept_" + st, description: "nodo de prueba" }) });
    if (!n1.ok || !n1.data || !n1.data.ok) return _out("f6Output", "Fallo nodo A: " + _errText(n1), true);

    const n2 = await _fetch("/api/v8/graph/node", { method: "POST",
      body: JSON.stringify({ node_type: "tool", label: "test_tool_" + st, description: "nodo de prueba" }) });
    if (!n2.ok || !n2.data || !n2.data.ok) return _out("f6Output", "Fallo nodo B: " + _errText(n2), true);

    const e1 = await _fetch("/api/v8/graph/edge", { method: "POST",
      body: JSON.stringify({ from_node: n1.data.id, to_node: n2.data.id, relation_type: "related_to", weight: 1.0 }) });
    if (!e1.ok || !e1.data || !e1.data.ok) return _out("f6Output", "Fallo arista: " + _errText(e1), true);

    const l1 = await _fetch("/api/v8/learning", { method: "POST",
      body: JSON.stringify({
        source: "admin_test", event: "test_f6_" + st,
        lesson: "Prueba del panel admin ejecutada correctamente.",
        knowledge_nodes: [n1.data.id, n2.data.id],
        relationships: [e1.data.id],
        confidence: 0.9, outcome: "success",
      }) });
    if (!l1.ok || !l1.data || !l1.data.ok) return _out("f6Output", "Fallo learning: " + _errText(l1), true);

    _out("f6Output", {
      ok: true,
      nodo_a: n1.data.id, nodo_b: n2.data.id,
      arista: e1.data.id, learning: l1.data.id,
      mensaje: "Ciclo completo ejecutado. Todo persistió en Postgres.",
    }, false);
  };

  window.f6ReadAll = async function(){
    _out("f6Output", "Leyendo grafo…", false);
    const ov = await _fetch("/api/v8/graph/overview?limit_nodes=20&limit_edges=20");
    if (!ov.ok || !ov.data || !ov.data.ok) return _out("f6Output", _errText(ov), true);
    _out("f6Output", {
      nodos: ov.data.counts.nodes,
      aristas: ov.data.counts.edges,
      por_tipo: ov.data.counts.by_type,
      por_relacion: ov.data.counts.by_relation,
      generado: ov.data.generated_at,
      nota: "Para ver aprendizajes: no hay endpoint GET /learning lista. Usa tool learning_save por id o filtra por nodo.",
    }, false);
  };

  window.f6Reset = function(){ _out("f6Output", "Salida limpiada.", false); };

  // ============================================================
  // FASE 7 — Ciclo Cognitivo
  // ============================================================
  window.f7Run = async function(){
    const inp = document.getElementById("f7Message");
    const msg = (inp && inp.value || "").trim();
    if (!msg) return _out("f7Output", "Escribe un mensaje para el ciclo.", true);
    _out("f7Output", "Ejecutando ciclo cognitivo (puede tardar 5–15s)…", false);
    const r = await _fetch("/api/v8/cognitive/cycle", {
      method: "POST",
      body: JSON.stringify({ trigger: "admin_panel", input: { message: msg } }),
    }, 40000);
    if (!r.ok || !r.data || !r.data.ok) return _out("f7Output", _errText(r), true);
    _out("f7Output", {
      ok: true,
      cycle_id: r.data.cycle_id,
      events_count: r.data.events_count,
      status: r.data.cycle && r.data.cycle.status,
      answer_preview: (r.data.answer || "").slice(0, 400),
      learning_id: r.data.learning_id,
    }, false);
  };

  window.f7ReadLast = async function(){
    _out("f7Output", "Buscando último ciclo…", false);
    const lst = await _fetch("/api/v8/cognitive/cycles?limit=1");
    if (!lst.ok || !lst.data || !lst.data.ok) return _out("f7Output", _errText(lst), true);
    if (!lst.data.cycles || !lst.data.cycles.length) return _out("f7Output", "Aún no hay ciclos.", false);
    const id = lst.data.cycles[0].id;
    const r = await _fetch("/api/v8/cognitive/cycle/" + id);
    if (!r.ok || !r.data || !r.data.ok) return _out("f7Output", _errText(r), true);
    _out("f7Output", {
      cycle_id: id,
      status: r.data.cycle.status,
      etapa_actual: r.data.cycle.current_stage,
      etapas: (r.data.events || []).map(e => e.stage + ":" + e.status),
      events_count: r.data.events_count,
    }, false);
  };

  window.f7ListCycles = async function(){
    _out("f7Output", "Listando últimos ciclos…", false);
    const r = await _fetch("/api/v8/cognitive/cycles?limit=10");
    if (!r.ok || !r.data || !r.data.ok) return _out("f7Output", _errText(r), true);
    _out("f7Output", {
      total_mostrados: r.data.count,
      ciclos: (r.data.cycles || []).map(c => ({
        id: c.id, trigger: c.trigger, status: c.status, etapa: c.current_stage, cuando: c.created_at,
      })),
    }, false);
  };

  window.f7Reset = function(){ _out("f7Output", "Salida limpiada.", false); };

  // ============================================================
  // FASE 8 — Tool Registry
  // ============================================================
  window.f8ListTools = async function(){
    _out("f8Output", "Listando tools registradas…", false);
    const r = await _fetch("/api/v8/tools");
    if (!r.ok || !r.data || !r.data.ok) return _out("f8Output", _errText(r), true);
    _out("f8Output", {
      total: r.data.count,
      tools: (r.data.tools || []).map(t => ({ name: t.name, category: t.category, status: t.status })),
    }, false);
  };

  window.f8TestWebSearch = async function(){
    const q = prompt("¿Qué buscar en web?", "FastAPI últimas novedades");
    if (!q) return;
    _out("f8Output", 'web_search → "' + q + '"…', false);
    const r = await _fetch("/api/v8/tools/web_search/invoke", {
      method: "POST", body: JSON.stringify({ inputs: { query: q } }),
    }, 25000);
    if (!r.ok || !r.data || !r.data.ok) return _out("f8Output", _errText(r), true);
    _out("f8Output", {
      ok: true, tool: r.data.tool_name, duration_ms: r.data.duration_ms, outputs: r.data.outputs,
    }, false);
  };

  window.f8TestSelfModel = async function(){
    _out("f8Output", "self_model_read…", false);
    const r = await _fetch("/api/v8/tools/self_model_read/invoke", {
      method: "POST", body: JSON.stringify({ inputs: {} }),
    });
    if (!r.ok || !r.data || !r.data.ok) return _out("f8Output", _errText(r), true);
    const sm = (r.data.outputs && r.data.outputs.self_model) || {};
    _out("f8Output", {
      ok: true, duration_ms: r.data.duration_ms,
      self_model_version: sm.version,
      capabilities_verificadas: (sm.capabilities || []).filter(c => c.status === "verified").length,
    }, false);
  };

  window.f8ViewInvocations = async function(){
    _out("f8Output", "Leyendo invocaciones recientes…", false);
    const r = await _fetch("/api/v8/tools/invocations?limit=20");
    if (!r.ok || !r.data || !r.data.ok) return _out("f8Output", _errText(r), true);
    _out("f8Output", {
      mostradas: r.data.count,
      invocaciones: (r.data.invocations || []).map(i => ({
        tool: i.tool_name, status: i.status, duracion_ms: i.duration_ms, cuando: i.created_at,
      })),
    }, false);
  };

  window.f8Reset = function(){ _out("f8Output", "Salida limpiada.", false); };

  // ============================================================
  // FASE 9 — Agentes + Tareas
  // ============================================================
  window.f9ListAgents = async function(){
    _out("f9Output", "Listando agentes…", false);
    const r = await _fetch("/api/v8/agents");
    if (!r.ok || !r.data || !r.data.ok) return _out("f9Output", _errText(r), true);
    _out("f9Output", {
      total: r.data.count,
      agentes: (r.data.agents || []).map(a => ({
        nombre: a.name, rol: a.role, estado: a.status,
        tools: a.allowed_tools,
        completadas: a.tasks_completed, fallidas: a.tasks_failed,
        accion_actual: a.current_action || null,
      })),
    }, false);
  };

  window.f9RunResearcher = async function(){
    const q = prompt("¿Qué investigar?", "FastAPI últimas novedades");
    if (!q) return;
    _out("f9Output", "researcher → web_search…", false);
    const r = await _fetch("/api/v8/agents/researcher/task", {
      method: "POST",
      body: JSON.stringify({ tool_name: "web_search", inputs: { query: q }, model: "gemini-3.8-flash" }),
    }, 30000);
    if (!r.ok || !r.data || !r.data.ok) return _out("f9Output", _errText(r), true);
    _out("f9Output", {
      ok: true, task_id: r.data.task_id, agente: r.data.agent_name, tool: r.data.tool_name,
      duracion_ms: r.data.duration_ms, model: r.data.model, outputs: r.data.outputs,
    }, false);
  };

  window.f9RunMemorizer = async function(){
    const txt = prompt("¿Qué guardar en memoria?", "Prueba desde panel admin " + new Date().toISOString());
    if (!txt) return;
    _out("f9Output", "memorizer → memory_save…", false);
    const r = await _fetch("/api/v8/agents/memorizer/task", {
      method: "POST",
      body: JSON.stringify({ tool_name: "memory_save", inputs: { content: txt, memory_type: "episodic" } }),
    }, 25000);
    if (!r.ok || !r.data || !r.data.ok) return _out("f9Output", _errText(r), true);
    _out("f9Output", {
      ok: true, task_id: r.data.task_id, agente: r.data.agent_name,
      duracion_ms: r.data.duration_ms, outputs: r.data.outputs,
    }, false);
  };

  window.f9RunInternal = async function(){
    _out("f9Output", "internal → self_model_read…", false);
    const r = await _fetch("/api/v8/agents/internal/task", {
      method: "POST", body: JSON.stringify({ tool_name: "self_model_read", inputs: {} }),
    });
    if (!r.ok || !r.data || !r.data.ok) return _out("f9Output", _errText(r), true);
    const sm = (r.data.outputs && r.data.outputs.self_model) || {};
    _out("f9Output", {
      ok: true, task_id: r.data.task_id, agente: r.data.agent_name,
      duracion_ms: r.data.duration_ms,
      self_model_version: sm.version, current_state: sm.current_state,
    }, false);
  };

  window.f9ListTasks = async function(){
    _out("f9Output", "Listando tareas recientes…", false);
    const r = await _fetch("/api/v8/tasks?limit=15");
    if (!r.ok || !r.data || !r.data.ok) return _out("f9Output", _errText(r), true);
    _out("f9Output", {
      total: r.data.count,
      tareas: (r.data.tasks || []).map(t => ({
        id: t.id, agente: t.agent_name, tool: t.tool_name,
        estado: t.status, duracion_ms: t.duration_ms, model: t.model,
        mission_id: t.mission_id, cuando: t.created_at,
      })),
    }, false);
  };

  window.f9TestV8S11 = async function(){
    _out("f9Output", "Test V8 s11: campos del contrato de agentes…", false);
    const missionId = "test_mission_" + Date.now().toString(36);

    const r1 = await _fetch("/api/v8/agents/researcher/task", {
      method: "POST",
      body: JSON.stringify({
        tool_name: "web_search",
        inputs: { query: "AKIRA V8 contrato agentes" },
        model: "gemini-3.8-flash",
        mission_id: missionId,
      }),
    }, 30000);
    if (!r1.ok || !r1.data || !r1.data.ok) return _out("f9Output", "Fallo test: " + _errText(r1), true);

    const t = await _fetch("/api/v8/tasks/" + r1.data.task_id);
    const task = (t.data && t.data.task) || {};
    const campos = ["id","agent_name","tool_name","status","model","mission_id","inputs","outputs","memory_used","started_at","completed_at"];
    const presentes = campos.filter(c => task[c] !== undefined && task[c] !== null);

    const filtro = await _fetch("/api/v8/tasks?mission_id=" + missionId);
    const countMision = (filtro.data && filtro.data.count) || 0;

    _out("f9Output", {
      ok: true,
      task_id: r1.data.task_id,
      mission_id: missionId,
      model_guardado: task.model,
      memory_used: task.memory_used,
      campos_presentes: presentes,
      campos_faltantes: campos.filter(c => presentes.indexOf(c) === -1),
      tareas_en_mision: countMision,
      veredicto: (presentes.length === campos.length) ? "✅ contrato completo" : "⚠️ revisar campos",
    }, false);
  };

  window.f9Reset = function(){ _out("f9Output", "Salida limpiada.", false); };

  // ============================================================
  // Dashboard unificado (reemplaza checkBridgeAdmin roto)
  // ============================================================
  window.adminDashboard = async function(){
    _out("adminMembrana", "Consultando dashboard…", false);
    const res = await Promise.all([
      _fetch("/health"),
      _fetch("/api/v8/me"),
      _fetch("/api/v8/self"),
      _fetch("/api/v8/tools"),
      _fetch("/api/v8/agents"),
      _fetch("/api/v8/tasks?limit=1"),
      _fetch("/api/v8/persistence/status"),
    ]);
    const health = res[0], me = res[1], self = res[2], tools = res[3], agents = res[4], tasks = res[5], pers = res[6];

    const dash = {
      backend: health.ok ? "🟢 OK (" + ((health.data && health.data.version) || "?") + ")" : "🔴 " + _errText(health),
      sesion: (me.ok && me.data && me.data.authenticated)
        ? "🟢 " + me.data.email + (me.data.is_owner ? " (propietario)" : "")
        : "🔴 " + _errText(me),
      self_model: (self.ok && self.data && self.data.ok)
        ? "🟢 v" + self.data.self_model.version + " · " +
          (self.data.self_model.capabilities || []).filter(c => c.status === "verified").length +
          " capacidades verificadas"
        : "🔴 " + _errText(self),
      tools: (tools.ok && tools.data && tools.data.ok) ? "🟢 " + tools.data.count + " registradas" : "🔴 " + _errText(tools),
      agentes: (agents.ok && agents.data && agents.data.ok) ? "🟢 " + agents.data.count + " activos" : "🔴 " + _errText(agents),
      tareas: (tasks.ok && tasks.data && tasks.data.ok) ? "🟢 " + tasks.data.count + " recientes" : "🔴 " + _errText(tasks),
      persistencia: (pers.ok && pers.data) ? "🟢 " + (pers.data.state || "?") : "🔴 " + _errText(pers),
      generado: new Date().toLocaleString(),
    };
    _out("adminMembrana", dash, false);

    const toolsEl = document.getElementById("adminTools");
    if (toolsEl) {
      toolsEl.textContent = (tools.ok && tools.data)
        ? (tools.data.count + " tools registradas")
        : "n/d";
    }
  };

  // reemplaza la función rota del HTML
  window.checkBridgeAdmin = function(){ return window.adminDashboard(); };

  // ============================================================
  // Restauración de sesión al recargar (arregla H-14)
  // ============================================================
  function restoreSession(){
    try {
      const t = localStorage.getItem("akira_session_token");
      const exp = parseInt(localStorage.getItem("akira_session_exp") || "0", 10);
      const email = localStorage.getItem("akira_user_email");
      if (!t || !email) return;
      if (exp <= Math.floor(Date.now() / 1000)) {
        localStorage.removeItem("akira_session_token");
        localStorage.removeItem("akira_session_exp");
        return;
      }
      const av = document.getElementById("userAvatar");
      if (av) av.textContent = email.charAt(0).toUpperCase();
      const i = document.getElementById("userInfo");
      if (i) {
        i.style.display = "block";
        i.textContent = "✅ " + email + " · sesión activa hasta " + new Date(exp * 1000).toLocaleString();
      }
    } catch(_){}
  }

  // ============================================================
  // Init
  // ============================================================
  document.addEventListener("DOMContentLoaded", function(){
    // Fallback por si adminCheckSession no está definido en el HTML.
    if (typeof window.adminCheckSession !== "function") {
      window.adminCheckSession = async function(){
        const status = document.getElementById("adminLoginStatus");
        if (status) status.textContent = "Verificando…";
        const r = await _fetch("/api/v8/me");
        if (r.ok && r.data && r.data.authenticated && r.data.is_owner) {
          if (status) status.textContent = "";
          const l = document.getElementById("adminLogin");
          const p = document.getElementById("adminPanel");
          if (l) l.style.display = "none";
          if (p) p.style.display = "block";
          setTimeout(function(){ window.adminDashboard(); }, 100);
        } else if (status) {
          status.textContent = (r.data && r.data.authenticated)
            ? "⛔ No eres propietario."
            : "⚠️ Inicia sesión con Google en Cuenta.";
        }
      };
    }
    restoreSession();
  });

})();
