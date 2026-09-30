// AKIRA OBSIDIAN MEMBRANE + OFFICE FLOOR - V8.2
// Waypoints solo por los 4 pasillos reales (1 horizontal + 3 verticales).

const AKIRA_API_BASE = "https://akira-empresa.onrender.com";
const OFFICE_BG_URL = "./assets/office/LargePixelOffice.png";
const OFFICE_SHEET_URL = "./assets/office/PixelOfficeAssets.png";

const OFFICE_W = 720;
const OFFICE_H = 630;

const SPRITE_RECTS = {
  researcher:    [2, 105, 17, 128],
  memorizer:     [19, 104, 38, 128],
  graph_builder: [40, 107, 53, 128],
  learner:       [3, 132, 20, 155],
  internal:      [22, 132, 39, 155],
};

// Posiciones base (arrancan repartidos por el pasillo horizontal)
const HOME_POSITIONS = {
  researcher:    [110, 305],
  memorizer:     [240, 305],
  graph_builder: [480, 305],
  learner:       [620, 305],
  internal:      [355, 480],
};

// Waypoints SOLO por pasillos (4 pasillos: 1 horizontal arriba + 3 verticales)
const WAYPOINTS = [
  // Pasillo horizontal arriba (Y = 305): de izquierda a derecha
  [60, 305], [140, 305], [220, 305], [300, 305], [380, 305], [460, 305], [540, 305], [620, 305], [680, 305],

  // Pasillo vertical izquierdo (X = 30): baja por el borde izquierdo
  [30, 380], [30, 470], [30, 560], [30, 620],

  // Pasillo vertical central (X = 355): baja entre los 2 bloques de escritorios
  [355, 380], [355, 470], [355, 560], [355, 620],

  // Pasillo vertical derecho (X = 690): baja por el borde derecho
  [690, 380], [690, 470], [690, 560], [690, 620],
];

const SPRITE_SCALE = 2;
const WALK_SPEED = 0.9;
const IDLE_WAIT_MS = 8000;
const BUSY_WAIT_MS = 4000;

// ===========================================================================
// MEMBRANA
// ===========================================================================

let membraneCanvas, membraneCtx;
let membraneNodes = [], membraneEdges = [];
let membraneAnimId = null;
let membraneLastFetch = 0;
let membraneFetching = false;
let membraneError = null;
let membraneCounts = { nodes: 0, edges: 0, by_type: {}, by_relation: {} };
let membranePhysicsOn = true;
const MEMBRANE_REFRESH_MS = 7000;

const NODE_TYPE_COLORS = {
  concept:    "#8b5cf6",
  person:     "#ec4899",
  project:    "#f59e0b",
  tool:       "#06b6d4",
  experience: "#10b981",
  document:   "#a78bfa",
  skill:      "#facc15",
  error:      "#ef4444",
  solution:   "#22c55e",
  mission:    "#fb923c",
};

const AGENT_ROLE_COLOR = {
  researcher: "#06b6d4",
  memorizer: "#8b5cf6",
  graph_builder: "#6366f1",
  learner: "#10b981",
  internal: "#a78bfa",
  generic: "#6366f1",
};

function _authHeaders() {
  if (typeof window.akiraAuthHeaders === "function") {
    try { return window.akiraAuthHeaders(); } catch (_) { return {}; }
  }
  return {};
}

async function _fetchJson(url) {
  const full = url.indexOf("http") === 0 ? url : (AKIRA_API_BASE + url);
  const bust = full + (full.indexOf("?") >= 0 ? "&" : "?") + "_=" + Date.now();
  const r = await fetch(bust, { headers: _authHeaders() });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return await r.json();
}

function initMembraneGraph() {
  membraneCanvas = document.getElementById("membraneCanvas");
  if (!membraneCanvas) return;
  const parent = membraneCanvas.parentElement;
  const rect = parent.getBoundingClientRect();
  if (rect.width < 50 || rect.height < 50) return;

  membraneCtx = membraneCanvas.getContext("2d");
  membraneCanvas.width = Math.max(320, Math.floor(rect.width));
  membraneCanvas.height = Math.max(320, Math.floor(rect.height));
  membraneCtx.imageSmoothingEnabled = false;

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
      const W = membraneCanvas ? membraneCanvas.width : 800;
      const H = membraneCanvas ? membraneCanvas.height : 600;
      const cx = W / 2, cy = H / 2;

      membraneNodes = (data.nodes || []).map((n, i) => {
        const prev = prevById.get(n.id);
        const r = 8 + Math.min((n.reuse_count || 0) * 1.5, 12) + Math.min((n.weight || 0) * 1.2, 8);
        if (prev) return Object.assign({}, prev, n, { r: r, fx: 0, fy: 0 });
        const total = Math.max((data.nodes || []).length, 1);
        const angle = (i / total) * Math.PI * 2;
        const radius = 60 + (i % 3) * 40;
        return Object.assign({}, n, {
          x: cx + Math.cos(angle) * radius,
          y: cy + Math.sin(angle) * radius,
          vx: 0, vy: 0, fx: 0, fy: 0,
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

function stepMembranePhysics() {
  const W = membraneCanvas.width, H = membraneCanvas.height;
  const cx = W / 2, cy = H / 2;
  const n = membraneNodes.length;
  if (n === 0) return;

  for (const nd of membraneNodes) { nd.fx = 0; nd.fy = 0; }

  const rep = 2500;
  const minD = 40;
  const maxRepForce = 6;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = membraneNodes[i], b = membraneNodes[j];
      let dx = b.x - a.x, dy = b.y - a.y;
      let d = Math.sqrt(dx * dx + dy * dy);
      if (d < 0.001) { dx = 1; dy = 0; d = 1; }
      const dEff = Math.max(d, minD);
      let f = rep / (dEff * dEff);
      if (f > maxRepForce) f = maxRepForce;
      const fx = (dx / d) * f, fy = (dy / d) * f;
      a.fx -= fx; a.fy -= fy;
      b.fx += fx; b.fy += fy;
    }
  }

  const springK = 0.004;
  const restLen = 140;
  const byId = new Map(membraneNodes.map(nd => [nd.id, nd]));
  for (const e of membraneEdges) {
    const a = byId.get(e.from_node), b = byId.get(e.to_node);
    if (!a || !b) continue;
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const f = springK * (d - restLen);
    const fx = (dx / d) * f, fy = (dy / d) * f;
    a.fx += fx; a.fy += fy;
    b.fx -= fx; b.fy -= fy;
  }

  const gk = 0.012;
  for (const nd of membraneNodes) {
    nd.fx += (cx - nd.x) * gk;
    nd.fy += (cy - nd.y) * gk;
  }

  const damp = 0.7;
  const maxV = 8;
  for (const nd of membraneNodes) {
    nd.vx = (nd.vx + nd.fx) * damp;
    nd.vy = (nd.vy + nd.fy) * damp;
    if (nd.vx > maxV) nd.vx = maxV;
    if (nd.vx < -maxV) nd.vx = -maxV;
    if (nd.vy > maxV) nd.vy = maxV;
    if (nd.vy < -maxV) nd.vy = -maxV;
    nd.x += nd.vx;
    nd.y += nd.vy;
    if (nd.x < nd.r) { nd.x = nd.r; nd.vx = 0; }
    if (nd.x > W - nd.r) { nd.x = W - nd.r; nd.vx = 0; }
    if (nd.y < nd.r) { nd.y = nd.r; nd.vy = 0; }
    if (nd.y > H - nd.r) { nd.y = H - nd.r; nd.vy = 0; }
  }
}

function drawMembrane() {
  if (!membraneCtx) return;
  const W = membraneCanvas.width, H = membraneCanvas.height;

  membraneCtx.fillStyle = "#0b0b0e";
  membraneCtx.fillRect(0, 0, W, H);
  membraneCtx.strokeStyle = "rgba(35, 35, 42, 0.5)";
  membraneCtx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) {
    membraneCtx.beginPath(); membraneCtx.moveTo(x, 0); membraneCtx.lineTo(x, H); membraneCtx.stroke();
  }
  for (let y = 0; y < H; y += 40) {
    membraneCtx.beginPath(); membraneCtx.moveTo(0, y); membraneCtx.lineTo(W, y); membraneCtx.stroke();
  }

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

  if (membranePhysicsOn) stepMembranePhysics();

  const byId = new Map(membraneNodes.map(nd => [nd.id, nd]));

  membraneCtx.lineCap = "round";
  for (const e of membraneEdges) {
    const a = byId.get(e.from_node), b = byId.get(e.to_node);
    if (!a || !b) continue;
    const w = e.weight || 1;
    const alpha = Math.min(0.7, 0.2 + w * 0.12);
    membraneCtx.strokeStyle = "rgba(150, 160, 240, " + alpha.toFixed(3) + ")";
    membraneCtx.lineWidth = Math.min(3, 0.8 + w * 0.5);
    membraneCtx.beginPath();
    membraneCtx.moveTo(a.x, a.y);
    membraneCtx.lineTo(b.x, b.y);
    membraneCtx.stroke();
  }

  membraneCtx.textAlign = "center";
  for (const nd of membraneNodes) {
    const color = NODE_TYPE_COLORS[nd.node_type] || "#6366f1";
    const glowR = nd.r + 6;
    const gradient = membraneCtx.createRadialGradient(nd.x, nd.y, nd.r * 0.5, nd.x, nd.y, glowR);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    membraneCtx.fillStyle = gradient;
    membraneCtx.beginPath();
    membraneCtx.arc(nd.x, nd.y, glowR, 0, Math.PI * 2);
    membraneCtx.fill();

    membraneCtx.fillStyle = color;
    membraneCtx.beginPath();
    membraneCtx.arc(nd.x, nd.y, nd.r, 0, Math.PI * 2);
    membraneCtx.fill();

    membraneCtx.strokeStyle = "#0b0b0e";
    membraneCtx.lineWidth = 2;
    membraneCtx.stroke();

    const label = String(nd.label || nd.id || "").slice(0, 22);
    if (label) {
      membraneCtx.font = "10px monospace";
      const tw = membraneCtx.measureText(label).width;
      const lx = nd.x, ly = nd.y + nd.r + 14;
      membraneCtx.fillStyle = "rgba(11, 11, 14, 0.85)";
      membraneCtx.fillRect(lx - tw / 2 - 4, ly - 9, tw + 8, 13);
      membraneCtx.fillStyle = "#ececf1";
      membraneCtx.fillText(label, lx, ly);
    }
  }

  membraneCtx.textAlign = "right";
  membraneCtx.font = "11px monospace";
  membraneCtx.fillStyle = "#8a8a93";
  membraneCtx.fillText(
    (membraneCounts.nodes || 0) + " nodos · " + (membraneCounts.edges || 0) + " aristas",
    W - 12, H - 12
  );

  refreshMembrane(false);
  membraneAnimId = requestAnimationFrame(drawMembrane);
}

function addNeuronaToGraph() { /* no-op */ }

// ===========================================================================
// OFICINA
// ===========================================================================

let officeCanvas, officeCtx;
let officeBgImage = null;
let officeSheetImage = null;
let officeBgLoaded = false;
let officeSheetLoaded = false;
let officeLoadError = null;
let officeAgents = [];
let officeLastFetch = 0;
let officeFetching = false;
let officeAnimId = null;
const OFFICE_REFRESH_MS = 5000;

const spriteCache = {};

function initOfficeFloor() {
  officeCanvas = document.getElementById("officeCanvas");
  if (!officeCanvas) return;
  const parent = officeCanvas.parentElement;
  const rect = parent.getBoundingClientRect();
  if (rect.width < 50 || rect.height < 50) return;

  officeCtx = officeCanvas.getContext("2d");
  officeCanvas.width = OFFICE_W;
  officeCanvas.height = OFFICE_H;
  officeCanvas.style.width = "auto";
  officeCanvas.style.height = "auto";
  officeCanvas.style.maxWidth = "100%";
  officeCanvas.style.maxHeight = "100%";
  officeCanvas.style.display = "block";
  officeCanvas.style.imageRendering = "pixelated";
  officeCtx.imageSmoothingEnabled = false;

  if (officeAnimId) cancelAnimationFrame(officeAnimId);

  if (!officeBgLoaded || !officeSheetLoaded) {
    let pending = 2;
    const done = () => { pending--; if (pending === 0) { officeBgLoaded = true; officeSheetLoaded = true; drawOffice(); } };

    officeBgImage = new Image();
    officeBgImage.onload = done;
    officeBgImage.onerror = () => { officeLoadError = "No se pudo cargar fondo"; pending--; if (pending === 0) drawOffice(); };
    officeBgImage.src = OFFICE_BG_URL + "?v=" + Date.now();

    officeSheetImage = new Image();
    officeSheetImage.onload = () => { buildSpriteCache(); done(); };
    officeSheetImage.onerror = () => { officeLoadError = "No se pudo cargar hoja de sprites"; pending--; if (pending === 0) drawOffice(); };
    officeSheetImage.src = OFFICE_SHEET_URL + "?v=" + Date.now();
  } else {
    drawOffice();
  }

  refreshOffice(true);
}

function buildSpriteCache() {
  const img = officeSheetImage;
  if (!img) return;
  for (const role in SPRITE_RECTS) {
    const r = SPRITE_RECTS[role];
    const w = r[2] - r[0];
    const h = r[3] - r[1];
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const cx = c.getContext("2d");
    cx.imageSmoothingEnabled = false;
    cx.drawImage(img, r[0], r[1], w, h, 0, 0, w, h);
    spriteCache[role] = c;
  }
}

function _pickRandomWaypoint() {
  const wp = WAYPOINTS[Math.floor(Math.random() * WAYPOINTS.length)];
  return [wp[0] + (Math.random() - 0.5) * 20, wp[1] + (Math.random() - 0.5) * 10];
}

function _ensureMovementState(a) {
  if (typeof a.x !== "number") {
    const home = HOME_POSITIONS[a.role] || [360, 305];
    a.x = home[0];
    a.y = home[1];
  }
  if (typeof a.tx !== "number") { a.tx = a.x; a.ty = a.y; }
  if (typeof a.nextMoveAt !== "number") a.nextMoveAt = Date.now() + Math.random() * IDLE_WAIT_MS;
  if (typeof a.facing !== "string") a.facing = "idle";
}

function _updateAgentMovement(a) {
  const now = Date.now();

  if (a.status === "busy") {
    const home = HOME_POSITIONS[a.role] || [a.x, a.y];
    a.tx = home[0];
    a.ty = home[1];
    if (now > a.nextMoveAt) a.nextMoveAt = now + BUSY_WAIT_MS;
  } else {
    if (now > a.nextMoveAt && Math.abs(a.x - a.tx) < 4 && Math.abs(a.y - a.ty) < 4) {
      const target = _pickRandomWaypoint();
      a.tx = target[0];
      a.ty = target[1];
      a.nextMoveAt = now + IDLE_WAIT_MS + Math.random() * 5000;
    }
  }

  const dx = a.tx - a.x;
  const dy = a.ty - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > 2) {
    const step = Math.min(WALK_SPEED, dist);
    a.x += (dx / dist) * step;
    a.y += (dy / dist) * step;
    a.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
  } else {
    a.x = a.tx;
    a.y = a.ty;
    a.facing = "idle";
  }
}

function drawOffice() {
  if (!officeCtx) return;
  const W = OFFICE_W, H = OFFICE_H;

  officeCtx.fillStyle = "#0b0b0e";
  officeCtx.fillRect(0, 0, W, H);

  if (officeLoadError) {
    officeCtx.fillStyle = "#ef4444";
    officeCtx.font = "20px monospace";
    officeCtx.textAlign = "center";
    officeCtx.fillText("Oficina: " + officeLoadError, W/2, H/2);
    return;
  }

  if (!officeBgLoaded || !officeSheetLoaded) {
    officeCtx.fillStyle = "#8a8a93";
    officeCtx.font = "20px monospace";
    officeCtx.textAlign = "center";
    officeCtx.fillText("Cargando oficina...", W/2, H/2);
    officeAnimId = requestAnimationFrame(drawOffice);
    return;
  }

  officeCtx.drawImage(officeBgImage, 0, 0, W, H);

  const sorted = officeAgents.slice().sort((a, b) => {
    _ensureMovementState(a); _ensureMovementState(b);
    return a.y - b.y;
  });

  sorted.forEach(a => {
    _ensureMovementState(a);
    _updateAgentMovement(a);

    const role = a.role || "generic";
    const sprite = spriteCache[role];
    if (!sprite) return;

    const sw = sprite.width * SPRITE_SCALE;
    const sh = sprite.height * SPRITE_SCALE;

    let bob = 0;
    const moving = a.facing && a.facing !== "idle";
    if (moving) {
      bob = Math.sin(Date.now() * 0.02) * 1.2;
    } else if (a.status === "busy") {
      bob = Math.sin(Date.now() * 0.005) * 2;
    }

    const dx = a.x - sw / 2;
    const dy = a.y - sh + bob;

    officeCtx.fillStyle = "rgba(0,0,0,0.35)";
    officeCtx.beginPath();
    officeCtx.ellipse(a.x, a.y + 3, sw * 0.4, 4, 0, 0, Math.PI * 2);
    officeCtx.fill();

    officeCtx.drawImage(sprite, dx, dy, sw, sh);

    let ledColor = "#22c55e";
    if (a.status === "busy") ledColor = "#facc15";
    else if (a.status === "error") ledColor = "#ef4444";
    officeCtx.fillStyle = ledColor;
    officeCtx.fillRect(a.x + sw / 2 - 4, dy - 6, 8, 8);
    officeCtx.strokeStyle = "#0b0b0e";
    officeCtx.lineWidth = 2;
    officeCtx.strokeRect(a.x + sw / 2 - 4, dy - 6, 8, 8);

    officeCtx.fillStyle = "rgba(11, 11, 14, 0.85)";
    const label = (a.name || "?").slice(0, 14);
    officeCtx.font = "bold 11px monospace";
    const tw = officeCtx.measureText(label).width;
    officeCtx.fillRect(a.x - tw / 2 - 4, a.y + 8, tw + 8, 14);
    officeCtx.fillStyle = "#ececf1";
    officeCtx.textAlign = "center";
    officeCtx.fillText(label, a.x, a.y + 19);
  });

  refreshOffice(false);
  officeAnimId = requestAnimationFrame(drawOffice);
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
      officeAgents = (data.agents || []).map(a => {
        const prev = prevByName.get(a.name);
        const merged = Object.assign({}, prev || {}, a);
        _ensureMovementState(merged);
        return merged;
      });
    }
  } catch (e) {
    // silencioso
  } finally {
    officeFetching = false;
  }
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
  el.innerHTML = "<b>" + officeAgents.length + " agentes reales</b>";
}

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(function () {
    if (document.getElementById("membraneCanvas")) initMembraneGraph();
    if (document.getElementById("officeCanvas")) initOfficeFloor();
  }, 500);
});

window.addEventListener("akira:section-shown", function (ev) {
  const section = ev && ev.detail && ev.detail.section;
  if (section === "office" && document.getElementById("officeCanvas")) {
    initOfficeFloor();
  }
  if (section === "membrane" && document.getElementById("membraneCanvas")) {
    initMembraneGraph();
  }
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
