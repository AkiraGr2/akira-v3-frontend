// AKIRA OBSIDIAN MEMBRANE + OFFICE FLOOR - V3.0 - DATOS REALES
// Cierra H-10. Cumple D009: el Office muestra estados reales, no actividad simulada.
// Membrana -> GET /api/v8/graph/overview  (Fase 6: graph_nodes + graph_edges)
// Oficina  -> GET /api/v8/agents          (Fase 9: 5 agentes reales)
// Refresco: Membrana 7s, Oficina 5s. Sin simulacion, sin agentes inventados.

let membraneCanvas, membraneCtx;
let membraneNodes = [], membraneEdges = [];
let membraneAnimId = null;
let membraneLastFetch = 0;
let membraneFetching = false;
let membraneError = null;
let membraneCounts = { nodes: 0, edges: 0, by_type: {}, by_relation: {} };

let officeCanvas, officeCtx, officeAnimId = null;
let officeAgents = [];
let officeLastFetch = 0;
let officeFetching = false;
let officeError = null;

const MEMBRANE_REFRESH_MS = 7000;
const OFFICE_REFRESH_MS = 5000;

// Colores por los 10 NODE_TYPES reales (core.py)
const NODE_TYPE_COLORS = {
  concept:    "#6366f1",
  person:     "#ec4899",
  project:    "#f59e0b",
  tool:       "#06b6d4",
  experience: "#10b981",
  document:   "#8b5cf6",
  skill:      "#facc15",
  error:      "#ef4444",
  solution:   "#22c55e",
  mission:    "#a78bfa",
};

const AGENT_ROLE_EMOJI = {
  researcher: "🔍",
  memorizer: "📚",
  graph_builder: "🕸️",
  learner: "🧠",
  internal: "👁️",
  generic: "🤖",
};

const AGENT_ROLE_COLOR = {
  researcher: "#06b6d4",
  memorizer: "#8b5cf6",
  graph_builder: "#6366f1",
  learner: "#10b981",
  internal: "#a78bfa",
  generic: "#6366f1",
};

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

function _authHeaders() {
  // akiraAuthHeaders() esta definido en akira_brain.js / hybrid_sync.js (B1 VERIFICADO)
  if (typeof window.akiraAuthHeaders === "function") {
    try { return window.akiraAuthHeaders(); } catch (_) { return {}; }
  }
  return {};
}

async function _fetchJson(url) {
  // Cache-busting obligatorio: Chrome Android cachea 401 agresivamente (H-09)
  const bust = url + (url.indexOf("?") >= 0 ? "&" : "?") + "_=" + Date.now();
  const r = await fetch(bust, { headers: _authHeaders() });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return await r.json();
}

// ---------------------------------------------------------------------------
// MEMBRANA — graph/overview real
// ---------------------------------------------------------------------------

function initMembraneGraph() {
  membraneCanvas = document.getElementById("membraneCanvas");
  if (!membraneCanvas) return;
  membraneCtx = membraneCanvas.getContext("2d");
  const parent = membraneCanvas.parentElement;
  const rect = parent.getBoundingClientRect();
  membraneCanvas.width = Math.max(320, Math.floor(rect.width));
  membraneCanvas.height = 480; // handoff: 480 px alto, ancho completo

  if (membraneAnimId) cancelAnimationFrame(membraneAnimId);
  drawMembrane();
  refreshMembrane(true);
}

async function refreshMembrane(force) {
  if (membraneFetching) return;
  if (!force && Date.now() - membraneLastFetch < MEMBRANE_REFRESH_MS) return;
  membraneFetching = true;
  membraneLastFetch = Date.now();
  try {
    const data = await _fetchJson("/api/v8/graph/overview");
    if (data && data.ok) {
      const prevById = new Map(membraneNodes.map(n => [n.id, n]));
      const W = membraneCanvas ? membraneCanvas.width : 400;
      const H = membraneCanvas ? membraneCanvas.height : 400;
      membraneNodes = (data.nodes || []).map(n => {
        const prev = prevById.get(n.id);
        const r = _nodeRadius(n);
        if (prev) {
          return Object.assign({}, prev, n, { r: r });
        }
        return Object.assign({}, n, {
          x: W * (0.15 + Math.random() * 0.7),
          y: H * (0.15 + Math.random() * 0.7),
          vx: (Math.random() - 0.5) * 0.35,
          vy: (Math.random() - 0.5) * 0.35,
          r: r,
        });
      });
      const nodeIds = new Set(membraneNodes.map(n => n.id));
      membraneEdges = (data.edges || []).filter(e =>
        nodeIds.has(e.from_node) && nodeIds.has(e.to_node)
      );
      membraneCounts = data.counts || { nodes: 0, edges: 0, by_type: {}, by_relation: {} };
      membraneError = null;
    }
  } catch (e) {
    membraneError = String(e && e.message ? e.message : e);
  } finally {
    membraneFetching = false;
  }
}

function _nodeRadius(n) {
  // Radio proporcional a reuse_count y weight reales. Minimo 4, maximo ~22.
  const base = 4;
  const bonusReuse = Math.min((n.reuse_count || 0) * 0.8, 12);
  const bonusWeight = Math.min((n.weight || 0) * 0.6, 6);
  return base + bonusReuse + bonusWeight;
}

function drawMembrane() {
  if (!membraneCtx) return;
  const W = membraneCanvas.width, H = membraneCanvas.height;

  membraneCtx.fillStyle = "#0b0b0e";
  membraneCtx.fillRect(0, 0, W, H);

  if (membraneError) {
    membraneCtx.fillStyle = "#8a8a93";
    membraneCtx.font = "12px monospace";
    membraneCtx.textAlign = "center";
    membraneCtx.fillText("Membrana: " + membraneError, W / 2, H / 2);
    membraneAnimId = requestAnimationFrame(drawMembrane);
    return;
  }

  if (!membraneNodes.length) {
    membraneCtx.fillStyle = "#8a8a93";
    membraneCtx.font = "12px monospace";
    membraneCtx.textAlign = "center";
    membraneCtx.fillText("Membrana vacia — sin nodos reales en graph_nodes", W / 2, H / 2);
    refreshMembrane(false);
    membraneAnimId = requestAnimationFrame(drawMembrane);
    return;
  }

  const nodeById = new Map(membraneNodes.map(n => [n.id, n]));

  // Aristas reales (solo las que existen en graph_edges)
  membraneCtx.lineWidth = 1;
  for (let i = 0; i < membraneEdges.length; i++) {
    const e = membraneEdges[i];
    const a = nodeById.get(e.from_node);
    const b = nodeById.get(e.to_node);
    if (!a || !b) continue;
    const alpha = Math.min(0.55, 0.15 + (e.weight || 0) * 0.08);
    membraneCtx.strokeStyle = "rgba(120, 130, 220, " + alpha.toFixed(3) + ")";
    membraneCtx.beginPath();
    membraneCtx.moveTo(a.x, a.y);
    membraneCtx.lineTo(b.x, b.y);
    membraneCtx.stroke();
  }

  // Nodos reales
  for (let i = 0; i < membraneNodes.length; i++) {
    const n = membraneNodes[i];
    n.x += n.vx || 0;
    n.y += n.vy || 0;
    if (n.x < n.r || n.x > W - n.r) n.vx = -(n.vx || 0);
    if (n.y < n.r || n.y > H - n.r) n.vy = -(n.vy || 0);
    if (n.x < n.r) n.x = n.r;
    if (n.x > W - n.r) n.x = W - n.r;
    if (n.y < n.r) n.y = n.r;
    if (n.y > H - n.r) n.y = H - n.r;

    const color = NODE_TYPE_COLORS[n.node_type] || "#6366f1";
    membraneCtx.shadowBlur = 10;
    membraneCtx.shadowColor = color;
    membraneCtx.fillStyle = color;
    membraneCtx.beginPath();
    membraneCtx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    membraneCtx.fill();
  }
  membraneCtx.shadowBlur = 0;

  // Leyenda compacta
  const types = Object.keys(membraneCounts.by_type || {});
  if (types.length) {
    membraneCtx.font = "10px monospace";
    membraneCtx.textAlign = "left";
    let x = 10;
    const y = H - 12;
    for (let i = 0; i < types.length; i++) {
      const t = types[i];
      const c = NODE_TYPE_COLORS[t] || "#6366f1";
      membraneCtx.fillStyle = c;
      membraneCtx.beginPath();
      membraneCtx.arc(x, y - 3, 4, 0, Math.PI * 2);
      membraneCtx.fill();
      membraneCtx.fillStyle = "#8a8a93";
      const label = t + ":" + (membraneCounts.by_type[t] || 0);
      membraneCtx.fillText(label, x + 7, y);
      x += 8 + membraneCtx.measureText(label).width + 10;
      if (x > W - 60) break;
    }
  }

  refreshMembrane(false);
  membraneAnimId = requestAnimationFrame(drawMembrane);
}

// Conservada por compatibilidad: si akira_brain.js la llama, ya no simula.
function addNeuronaToGraph() { /* no-op: la membrana ahora lee del backend real */ }

// ---------------------------------------------------------------------------
// OFICINA — agentes reales
// ---------------------------------------------------------------------------

function initOfficeFloor() {
  officeCanvas = document.getElementById("officeCanvas");
  if (!officeCanvas) return;
  officeCtx = officeCanvas.getContext("2d");
  const parent = officeCanvas.parentElement;
  const rect = parent.getBoundingClientRect();
  officeCanvas.width = Math.max(320, Math.floor(rect.width) - 32);
  officeCanvas.height = 520; // handoff: 520 px alto, canvas + panel lateral

  if (officeAnimId) cancelAnimationFrame(officeAnimId);
  drawOffice();
  refreshOffice(true);
}

async function refreshOffice(force) {
  if (officeFetching) return;
  if (!force && Date.now() - officeLastFetch < OFFICE_REFRESH_MS) return;
  officeFetching = true;
  officeLastFetch = Date.now();
  try {
    const data = await _fetchJson("/api/v8/agents");
    if (data && data.ok) {
      const prevByName = new Map(officeAgents.map(a => [a.name, a]));
      const W = officeCanvas ? officeCanvas.width : 400;
      const H = officeCanvas ? officeCanvas.height : 400;
      const list = data.agents || [];
      officeAgents = list.map((a, i) => {
        const prev = prevByName.get(a.name);
        const slotX = W * (0.18 + ((i % 3) * 0.32));
        const slotY = H * (0.35 + (Math.floor(i / 3) * 0.28));
        return Object.assign({}, prev || {}, a, {
          x: prev ? prev.x : slotX,
          y: prev ? prev.y : slotY,
          // despues de mapear, si el agente esta idle, se queda quieto; si esta busy, se mueve
          tx: slotX,
          ty: slotY,
        });
      });
      officeError = null;
    }
  } catch (e) {
    officeError = String(e && e.message ? e.message : e);
  } finally {
    officeFetching = false;
  }
}

function drawOffice() {
  if (!officeCtx) return;
  const W = officeCanvas.width, H = officeCanvas.height;

  officeCtx.fillStyle = "#0b0b0e";
  officeCtx.fillRect(0, 0, W, H);

  // Grid 32x32 (estilo Munder Difflin: unidades de 32)
  officeCtx.strokeStyle = "rgba(35, 35, 42, 0.45)";
  officeCtx.lineWidth = 1;
  for (let x = 0; x < W; x += 32) {
    officeCtx.beginPath(); officeCtx.moveTo(x, 0); officeCtx.lineTo(x, H); officeCtx.stroke();
  }
  for (let y = 0; y < H; y += 32) {
    officeCtx.beginPath(); officeCtx.moveTo(0, y); officeCtx.lineTo(W, y); officeCtx.stroke();
  }

  if (officeError) {
    officeCtx.fillStyle = "#8a8a93";
    officeCtx.font = "12px monospace";
    officeCtx.textAlign = "center";
    officeCtx.fillText("Oficina: " + officeError, W / 2, H / 2);
    officeAnimId = requestAnimationFrame(drawOffice);
    return;
  }

  if (!officeAgents.length) {
    officeCtx.fillStyle = "#8a8a93";
    officeCtx.font = "12px monospace";
    officeCtx.textAlign = "center";
    officeCtx.fillText("Oficina vacia — sin agentes reales en /api/v8/agents", W / 2, H / 2);
    refreshOffice(false);
    officeAnimId = requestAnimationFrame(drawOffice);
    return;
  }

  for (let i = 0; i < officeAgents.length; i++) {
    const a = officeAgents[i];
    const status = a.status || "idle";
    const color = AGENT_ROLE_COLOR[a.role] || "#6366f1";
    const emoji = AGENT_ROLE_EMOJI[a.role] || "🤖";

    // Movimiento sutil: solo si esta busy, se mueve un poco cerca de su slot.
    if (status === "busy") {
      const t = Date.now() * 0.001 + i;
      a.x += (a.tx + Math.sin(t) * 12 - a.x) * 0.05;
      a.y += (a.ty + Math.cos(t * 0.8) * 8 - a.y) * 0.05;
    } else {
      a.x += (a.tx - a.x) * 0.06;
      a.y += (a.ty - a.y) * 0.06;
    }

    // Anillo de estado
    let ringColor = "#8a8a93";
    if (status === "busy") ringColor = "#facc15";
    else if (status === "error") ringColor = "#ef4444";
    else if (status === "idle") ringColor = "#22c55e";

    officeCtx.strokeStyle = ringColor;
    officeCtx.lineWidth = 2;
    officeCtx.beginPath();
    officeCtx.arc(a.x, a.y, 24, 0, Math.PI * 2);
    officeCtx.stroke();

    // Avatar
    officeCtx.shadowBlur = 12;
    officeCtx.shadowColor = color;
    officeCtx.fillStyle = color;
    officeCtx.beginPath();
    officeCtx.arc(a.x, a.y, 18, 0, Math.PI * 2);
    officeCtx.fill();
    officeCtx.shadowBlur = 0;

    officeCtx.fillStyle = "#0b0b0e";
    officeCtx.font = "14px sans-serif";
    officeCtx.textAlign = "center";
    officeCtx.textBaseline = "middle";
    officeCtx.fillText(emoji, a.x, a.y);

    // Nombre
    officeCtx.fillStyle = "#ececf1";
    officeCtx.font = "bold 11px monospace";
    officeCtx.textBaseline = "alphabetic";
    officeCtx.fillText(a.name || "?", a.x, a.y + 34);

    // Rol
    officeCtx.fillStyle = "#8a8a93";
    officeCtx.font = "9px monospace";
    officeCtx.fillText(a.role || "?", a.x, a.y + 46);

    // Estado + current_action si aplica
    officeCtx.fillStyle = ringColor;
    officeCtx.font = "10px monospace";
    officeCtx.fillText(status, a.x, a.y + 58);

    if (a.current_action) {
      officeCtx.fillStyle = "#8a8a93";
      officeCtx.font = "9px monospace";
      const txt = String(a.current_action).slice(0, 22);
      officeCtx.fillText(txt, a.x, a.y + 70);
    }

    // Contadores reales
    const done = a.tasks_completed || 0;
    const fail = a.tasks_failed || 0;
    if (done || fail) {
      officeCtx.fillStyle = "#8a8a93";
      officeCtx.font = "9px monospace";
      officeCtx.fillText("✓" + done + " · ✗" + fail, a.x, a.y + 82);
    }
  }

  refreshOffice(false);
  officeAnimId = requestAnimationFrame(drawOffice);
}

function addOfficeLog(text, type) {
  const el = document.getElementById("officeLog");
  if (!el) return;
  const div = document.createElement("div");
  div.style.cssText = "font-size:11px;padding:4px 8px;border-bottom:1px solid #23232a;color:" +
    (type === "agent" ? "#10b981" : "#8a8a93");
  div.textContent = new Date().toLocaleTimeString() + " - " + text;
  el.prepend(div);
  if (el.children.length > 80) el.removeChild(el.lastChild);
}

function updateOfficeStats() {
  const el = document.getElementById("officeStats");
  if (!el) return;
  const c = membraneCounts || { nodes: 0, edges: 0, by_type: {} };
  const typesTxt = Object.keys(c.by_type || {})
    .map(k => k + ":" + c.by_type[k])
    .join(" · ") || "—";
  el.innerHTML = "<b>" + (c.nodes || 0) + " nodos</b> · <b>" + (c.edges || 0) +
    " aristas</b> · " + typesTxt + " · <b>" + officeAgents.length + " agentes reales</b>";
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

window.addEventListener("resize", function () {
  if (document.getElementById("membraneCanvas")) initMembraneGraph();
  if (document.getElementById("officeCanvas")) initOfficeFloor();
});

// Autoarranque: espera un momento a que el resto del panel cargue.
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(function () {
    if (document.getElementById("membraneCanvas")) initMembraneGraph();
    if (document.getElementById("officeCanvas")) initOfficeFloor();
  }, 500);
});

window.AkiraMembrane = {
  initMembraneGraph: initMembraneGraph,
  initOfficeFloor: initOfficeFloor,
  refreshMembrane: refreshMembrane,
  refreshOffice: refreshOffice,
  addOfficeLog: addOfficeLog,
  updateOfficeStats: updateOfficeStats,
  addNeuronaToGraph: addNeuronaToGraph,
};
