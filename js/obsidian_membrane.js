// AKIRA OBSIDIAN MEMBRANE + OFFICE FLOOR - V5.1
// Fix: Pixi con tamano fijo basado en el PNG. CSS lo escala.

const AKIRA_API_BASE = "https://akira-empresa.onrender.com";
const PIXI_CDN = "https://unpkg.com/pixi.js@7.4.2/dist/pixi.min.js";
const OFFICE_BG_URL = "./assets/office/LargePixelOffice.png";
const OFFICE_W = 1024;
const OFFICE_H = 896;

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

function _waitForSize(el, maxMs) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    function check() {
      const r = el.getBoundingClientRect();
      if (r.width >= 50 && r.height >= 50) return resolve(true);
      if (Date.now() - t0 > maxMs) return resolve(false);
      setTimeout(check, 100);
    }
    check();
  });
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
// OFICINA — Pixi.js con tamano fijo
// ===========================================================================

let pixiApp = null;
let officeBgSprite = null;
let officeAgents = [];
let officeLastFetch = 0;
let officeFetching = false;
let officeError = null;
let officeChipLayer = null;
let officeResizeHooked = false;
const OFFICE_REFRESH_MS = 5000;

// Posiciones fijas de los chips en el canvas 1024x896
const CHIP_POSITIONS = [
  [140, 300],
  [340, 300],
  [540, 300],
  [740, 300],
  [940, 300],
];

async function ensurePixiLoaded() {
  if (window.PIXI) return true;
  return new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = PIXI_CDN;
    s.onload = () => resolve(!!window.PIXI);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

async function initOfficeFloor() {
  const canvas = document.getElementById("officeCanvas");
  if (!canvas) return;
  const parent = canvas.parentElement;

  const ok = await _waitForSize(parent, 3000);
  if (!ok) return;

  const loaded = await ensurePixiLoaded();
  if (!loaded) {
    parent.insertAdjacentHTML("beforeend",
      '<div style="color:#ef4444;padding:20px;font-family:monospace;text-align:center">No se pudo cargar Pixi.js</div>');
    return;
  }

  if (pixiApp) {
    _fitOfficeCanvas();
    refreshOffice(true);
    return;
  }

  PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;

  pixiApp = new PIXI.Application({
    view: canvas,
    width: OFFICE_W,
    height: OFFICE_H,
    background: 0x0b0b0e,
    antialias: false,
    resolution: 1,
    autoDensity: false,
  });

  canvas.removeAttribute("style");
  canvas.style.display = "block";
  canvas.style.maxWidth = "100%";
  canvas.style.maxHeight = "100%";
  canvas.style.width = "auto";
  canvas.style.height = "auto";

  try {
    const bgTex = await PIXI.Assets.load(OFFICE_BG_URL);
    officeBgSprite = new PIXI.Sprite(bgTex);
    officeBgSprite.x = 0;
    officeBgSprite.y = 0;
    pixiApp.stage.addChild(officeBgSprite);
  } catch (e) {
    officeError = "No se pudo cargar fondo: " + (e && e.message ? e.message : e);
    parent.insertAdjacentHTML("beforeend",
      '<div style="color:#ef4444;padding:10px;font-family:monospace;text-align:center">' +
      officeError + '</div>');
    return;
  }

  officeChipLayer = new PIXI.Container();
  pixiApp.stage.addChild(officeChipLayer);

  _fitOfficeCanvas();

  if (!officeResizeHooked) {
    officeResizeHooked = true;
    window.addEventListener("resize", _fitOfficeCanvas);
  }

  refreshOffice(true);
}

function _fitOfficeCanvas() {
  const canvas = document.getElementById("officeCanvas");
  if (!canvas) return;
  const parent = canvas.parentElement;
  const pw = parent.clientWidth;
  const ph = parent.clientHeight;
  if (pw < 50 || ph < 50) return;

  const scale = Math.min(pw / OFFICE_W, ph / OFFICE_H);
  canvas.style.width = (OFFICE_W * scale) + "px";
  canvas.style.height = (OFFICE_H * scale) + "px";
}

function createChip(agent) {
  const container = new PIXI.Container();
  const roleColor = AGENT_ROLE_COLOR[agent.role] || "#6366f1";
  const colorInt = parseInt(roleColor.slice(1), 16);

  const bg = new PIXI.Graphics();
  bg.beginFill(0x0b0b0e, 0.95);
  bg.lineStyle(3, colorInt, 1);
  bg.drawRoundedRect(-80, -28, 160, 56, 8);
  bg.endFill();
  container.addChild(bg);

  const dot = new PIXI.Graphics();
  dot.beginFill(colorInt, 1);
  dot.drawCircle(-64, 0, 8);
  dot.endFill();
  container.addChild(dot);

  const nameText = new PIXI.Text(agent.name || "?", {
    fontFamily: "monospace",
    fontSize: 16,
    fill: 0xffffff,
    fontWeight: "bold",
  });
  nameText.x = -50;
  nameText.y = -20;
  container.addChild(nameText);

  const statusText = new PIXI.Text((agent.status || "idle").toUpperCase(), {
    fontFamily: "monospace",
    fontSize: 11,
    fill: 0x8a8a93,
  });
  statusText.x = -50;
  statusText.y = 4;
  container.addChild(statusText);

  return { container, dot, nameText, statusText, bg };
}

function syncAgentChips() {
  if (!pixiApp || !officeChipLayer) return;
  const seen = new Set();

  officeAgents.forEach((a, i) => {
    seen.add(a.name);
    let chip = null;
    for (const c of officeChipLayer.children) {
      if (c._akiraName === a.name) { chip = c; break; }
    }
    if (!chip) {
      const refs = createChip(a);
      refs.container._akiraName = a.name;
      officeChipLayer.addChild(refs.container);
      chip = refs.container;
      chip._chipRefs = refs;
    }
    const refs = chip._chipRefs;
    refs.nameText.text = a.name || "?";
    refs.statusText.text = (a.status || "idle").toUpperCase();
    const roleColor = AGENT_ROLE_COLOR[a.role] || "#6366f1";
    const colorInt = parseInt(roleColor.slice(1), 16);
    refs.dot.clear();
    refs.dot.beginFill(colorInt, 1);
    refs.dot.drawCircle(-64, 0, 8);
    refs.dot.endFill();
    refs.bg.clear();
    refs.bg.beginFill(0x0b0b0e, 0.95);
    refs.bg.lineStyle(3, colorInt, 1);
    refs.bg.drawRoundedRect(-80, -28, 160, 56, 8);
    refs.bg.endFill();

    const pos = CHIP_POSITIONS[i % CHIP_POSITIONS.length];
    chip.x = pos[0];
    chip.y = pos[1];
  });

  for (let k = officeChipLayer.children.length - 1; k >= 0; k--) {
    const c = officeChipLayer.children[k];
    if (c._akiraName && !seen.has(c._akiraName)) {
      officeChipLayer.removeChild(c);
      c.destroy({ children: true });
    }
  }
}

async function refreshOffice(force) {
  if (officeFetching) return;
  if (!force && Date.now() - officeLastFetch < OFFICE_REFRESH_MS) return;
  officeFetching = true;
  officeLastFetch = Date.now();
  try {
    const data = await _fetchJson("/api/v8/agents");
    if (data && data.ok) {
      officeAgents = data.agents || [];
      syncAgentChips();
    }
  } catch (e) {
    officeError = String(e && e.message ? e.message : e);
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
  const c = membraneCounts || { nodes: 0, edges: 0, by_type: {} };
  el.innerHTML = "<b>" + officeAgents.length + " agentes reales</b> · " +
    (c.nodes || 0) + " nodos · " + (c.edges || 0) + " aristas";
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

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
