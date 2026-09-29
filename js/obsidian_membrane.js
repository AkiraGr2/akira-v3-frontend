// AKIRA OBSIDIAN MEMBRANE + OFFICE FLOOR - V5.0
// Membrana: force layout + datos reales (Fase 6). Igual a V4.1.
// Oficina: Pixi.js + escena Pixel Office de 2dPig (CC0).

const AKIRA_API_BASE = "https://akira-empresa.onrender.com";
const PIXI_CDN = "https://unpkg.com/pixi.js@7.4.2/dist/pixi.min.js";
const OFFICE_BG_URL = "./assets/office/LargePixelOffice.png";

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

const AGENT_ROLE_EMOJI = {
  researcher: "🔍",
  memorizer: "📚",
  graph_builder: "🕸️",
  learner: "🧠",
  internal: "👁️",
  generic: "🤖",
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

  const types = Object.keys(membraneCounts.by_type || {});
  if (types.length) {
    membraneCtx.font = "10px monospace";
    membraneCtx.textAlign = "left";
    let x = 12, y = 18;
    for (const t of types) {
      const c = NODE_TYPE_COLORS[t] || "#6366f1";
      membraneCtx.fillStyle = c;
      membraneCtx.fillRect(x, y - 8, 8, 8);
      membraneCtx.fillStyle = "#8a8a93";
      const label = t + " " + (membraneCounts.by_type[t] || 0);
      membraneCtx.fillText(label, x + 12, y);
      x += 12 + membraneCtx.measureText(label).width + 16;
      if (x > W - 100) { x = 12; y += 16; }
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
// OFICINA — Pixi.js
// ===========================================================================

let pixiApp = null;
let officeBgSprite = null;
let officeAgentChips = {};
let officeAgents = [];
let officeLastFetch = 0;
let officeFetching = false;
let officeError = null;
const OFFICE_REFRESH_MS = 5000;

const CHIP_POSITIONS = [
  [0.14, 0.72],
  [0.32, 0.72],
  [0.50, 0.72],
  [0.68, 0.72],
  [0.86, 0.72],
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
  const rect = parent.getBoundingClientRect();
  if (rect.width < 50 || rect.height < 50) return;

  const loaded = await ensurePixiLoaded();
  if (!loaded) {
    const ctx = canvas.getContext("2d");
    canvas.width = Math.max(320, Math.floor(rect.width));
    canvas.height = Math.max(320, Math.floor(rect.height));
    ctx.fillStyle = "#0b0b0e"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ef4444";
    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    ctx.fillText("No se pudo cargar Pixi.js", canvas.width/2, canvas.height/2);
    return;
  }

  PIXI.BaseTexture.defaultOptions.scaleMode = PIXI.SCALE_MODES.NEAREST;

  if (!pixiApp) {
    const w = Math.max(320, Math.floor(rect.width));
    const h = Math.max(320, Math.floor(rect.height));

    pixiApp = new PIXI.Application({
      view: canvas,
      width: w,
      height: h,
      background: 0x0b0b0e,
      antialias: false,
      resolution: 1,
      autoDensity: true,
    });

    try {
      const bgTex = await PIXI.Assets.load(OFFICE_BG_URL);
      officeBgSprite = new PIXI.Sprite(bgTex);
      pixiApp.stage.addChild(officeBgSprite);
    } catch (e) {
      officeError = "No se pudo cargar fondo";
    }

    const ro = new ResizeObserver(() => {
      if (!pixiApp) return;
      const r = parent.getBoundingClientRect();
      const nw = Math.max(320, Math.floor(r.width));
      const nh = Math.max(320, Math.floor(r.height));
      pixiApp.renderer.resize(nw, nh);
      layoutOffice();
    });
    ro.observe(parent);
  } else {
    pixiApp.renderer.resize(
      Math.max(320, Math.floor(rect.width)),
      Math.max(320, Math.floor(rect.height))
    );
  }

  layoutOffice();
  refreshOffice(true);
}

function layoutOffice() {
  if (!pixiApp) return;
  const W = pixiApp.renderer.width / pixiApp.renderer.resolution;
  const H = pixiApp.renderer.height / pixiApp.renderer.resolution;

  if (officeBgSprite) {
    const texW = officeBgSprite.texture.width;
    const texH = officeBgSprite.texture.height;
    const scale = Math.min(W / texW, H / texH);
    officeBgSprite.scale.set(scale);
    officeBgSprite.x = (W - texW * scale) / 2;
    officeBgSprite.y = (H - texH * scale) / 2;
  }

  repositionAgentChips(W, H);
}

function createChip(agent) {
  const container = new PIXI.Container();
  const roleColor = AGENT_ROLE_COLOR[agent.role] || "#6366f1";
  const colorInt = parseInt(roleColor.slice(1), 16);

  const bg = new PIXI.Graphics();
  bg.beginFill(0x0b0b0e, 0.92);
  bg.lineStyle(2, colorInt, 1);
  bg.drawRoundedRect(-72, -24, 144, 48, 6);
  bg.endFill();
  container.addChild(bg);

  const dot = new PIXI.Graphics();
  dot.beginFill(colorInt, 1);
  dot.drawCircle(-58, 0, 6);
  dot.endFill();
  container.addChild(dot);

  const nameText = new PIXI.Text(agent.name || "?", {
    fontFamily: "monospace",
    fontSize: 13,
    fill: 0xffffff,
    fontWeight: "bold",
  });
  nameText.x = -46;
  nameText.y = -16;
  container.addChild(nameText);

  const statusText = new PIXI.Text(agent.status || "idle", {
    fontFamily: "monospace",
    fontSize: 10,
    fill: 0x8a8a93,
  });
  statusText.x = -46;
  statusText.y = 2;
  container.addChild(statusText);

  return { container, dot, nameText, statusText, bg };
}

function syncAgentChips() {
  if (!pixiApp) return;
  const W = pixiApp.renderer.width / pixiApp.renderer.resolution;
  const H = pixiApp.renderer.height / pixiApp.renderer.resolution;
  const seen = new Set();

  officeAgents.forEach((a, i) => {
    seen.add(a.name);
    let chip = officeAgentChips[a.name];
    if (!chip) {
      chip = createChip(a);
      pixiApp.stage.addChild(chip.container);
      officeAgentChips[a.name] = chip;
    } else {
      chip.nameText.text = a.name || "?";
      chip.statusText.text = a.status || "idle";
      const roleColor = AGENT_ROLE_COLOR[a.role] || "#6366f1";
      const colorInt = parseInt(roleColor.slice(1), 16);
      chip.dot.clear();
      chip.dot.beginFill(colorInt, 1);
      chip.dot.drawCircle(-58, 0, 6);
      chip.dot.endFill();
      chip.bg.clear();
      chip.bg.beginFill(0x0b0b0e, 0.92);
      chip.bg.lineStyle(2, colorInt, 1);
      chip.bg.drawRoundedRect(-72, -24, 144, 48, 6);
      chip.bg.endFill();
    }
    const pos = CHIP_POSITIONS[i % CHIP_POSITIONS.length];
    chip.container.x = pos[0] * W;
    chip.container.y = pos[1] * H;
  });

  Object.keys(officeAgentChips).forEach(name => {
    if (!seen.has(name)) {
      const c = officeAgentChips[name].container;
      if (c.parent) c.parent.removeChild(c);
      c.destroy({ children: true });
      delete officeAgentChips[name];
    }
  });
}

function repositionAgentChips(W, H) {
  officeAgents.forEach((a, i) => {
    const chip = officeAgentChips[a.name];
    if (!chip) return;
    const pos = CHIP_POSITIONS[i % CHIP_POSITIONS.length];
    chip.container.x = pos[0] * W;
    chip.container.y = pos[1] * H;
  });
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
      officeError = null;
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
  const typesTxt = Object.keys(c.by_type || {})
    .map(k => k + ":" + c.by_type[k])
    .join(" · ") || "—";
  el.innerHTML = "<b>" + (c.nodes || 0) + " nodos</b> · <b>" + (c.edges || 0) +
    " aristas</b> · " + typesTxt + " · <b>" + officeAgents.length + " agentes reales</b>";
}

window.addEventListener("resize", function () {
  if (document.getElementById("membraneCanvas")) initMembraneGraph();
  if (document.getElementById("officeCanvas") && pixiApp) {
    const parent = document.getElementById("officeCanvas").parentElement;
    const rect = parent.getBoundingClientRect();
    if (rect.width > 50 && rect.height > 50) {
      pixiApp.renderer.resize(Math.floor(rect.width), Math.floor(rect.height));
      layoutOffice();
    }
  }
});

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
