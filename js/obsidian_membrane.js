// AKIRA OBSIDIAN MEMBRANE + OFFICE FLOOR - V4.0 - VISUAL REAL
// Cierra H-10 + Paso 2 visual.
// Membrana -> GET /api/v8/graph/overview  (Fase 6)
// Oficina  -> GET /api/v8/agents          (Fase 9)
// Estilo: Obsidian graph view (Membrana) + Munder Difflin pixel-art (Oficina).

const AKIRA_API_BASE = "https://akira-empresa.onrender.com";

let membraneCanvas, membraneCtx;
let membraneNodes = [], membraneEdges = [];
let membraneAnimId = null;
let membraneLastFetch = 0;
let membraneFetching = false;
let membraneError = null;
let membraneCounts = { nodes: 0, edges: 0, by_type: {}, by_relation: {} };
let membranePhysicsOn = true;

let officeCanvas, officeCtx, officeAnimId = null;
let officeAgents = [];
let officeLastFetch = 0;
let officeFetching = false;
let officeError = null;

const MEMBRANE_REFRESH_MS = 7000;
const OFFICE_REFRESH_MS = 5000;

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

// ===========================================================================
// MEMBRANA — Obsidian graph view con force layout
// ===========================================================================

function initMembraneGraph() {
  membraneCanvas = document.getElementById("membraneCanvas");
  if (!membraneCanvas) return;
  membraneCtx = membraneCanvas.getContext("2d");
  const parent = membraneCanvas.parentElement;
  const rect = parent.getBoundingClientRect();
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

      // Radio proporcional a weight + reuse_count (visible)
      membraneNodes = (data.nodes || []).map((n, i) => {
        const prev = prevById.get(n.id);
        const r = 8 + Math.min((n.reuse_count || 0) * 1.5, 12) + Math.min((n.weight || 0) * 1.2, 8);
        if (prev) {
          return Object.assign({}, prev, n, { r: r, fx: 0, fy: 0 });
        }
        // Arranque: en espiral cerca del centro (no en esquinas)
        const angle = (i / Math.max((data.nodes || []).length, 1)) * Math.PI * 2;
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

// Simulación de fuerzas estilo Obsidian:
//  - repulsión entre todos los pares
//  - atracción por aristas (spring)
//  - gravedad al centro
//  - damping
function stepMembranePhysics() {
  const W = membraneCanvas.width, H = membraneCanvas.height;
  const cx = W / 2, cy = H / 2;
  const n = membraneNodes.length;
  if (n === 0) return;

  // Repulsión (O(n²), ok para grafos pequeños)
  const rep = 4000;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = membraneNodes[i], b = membraneNodes[j];
      let dx = b.x - a.x, dy = b.y - a.y;
      let d2 = dx * dx + dy * dy;
      if (d2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d2 = 1; }
      const d = Math.sqrt(d2);
      const f = rep / d2;
      const fx = (dx / d) * f, fy = (dy / d) * f;
      a.fx -= fx; a.fy -= fy;
      b.fx += fx; b.fy += fy;
    }
  }

  // Atracción por aristas
  const springK = 0.006;
  const restLen = 110;
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

  // Gravedad al centro
  const gk = 0.015;
  for (const nd of membraneNodes) {
    nd.fx += (cx - nd.x) * gk;
    nd.fy += (cy - nd.y) * gk;
  }

  // Aplicar con damping
  const damp = 0.82;
  for (const nd of membraneNodes) {
    nd.vx = (nd.vx + nd.fx) * damp;
    nd.vy = (nd.vy + nd.fy) * damp;
    nd.x += nd.vx;
    nd.y += nd.vy;
    // Clamp suave
    if (nd.x < nd.r) { nd.x = nd.r; nd.vx = 0; }
    if (nd.x > W - nd.r) { nd.x = W - nd.r; nd.vx = 0; }
    if (nd.y < nd.r) { nd.y = nd.r; nd.vy = 0; }
    if (nd.y > H - nd.r) { nd.y = H - nd.r; nd.vy = 0; }
  }
}

function drawMembrane() {
  if (!membraneCtx) return;
  const W = membraneCanvas.width, H = membraneCanvas.height;

  // Fondo con subtle grid (estilo Obsidian dark)
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

  // Física
  if (membranePhysicsOn) stepMembranePhysics();

  const byId = new Map(membraneNodes.map(nd => [nd.id, nd]));

  // Aristas primero (debajo de nodos)
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

  // Nodos con glow + label
  membraneCtx.textAlign = "center";
  for (const nd of membraneNodes) {
    const color = NODE_TYPE_COLORS[nd.node_type] || "#6366f1";

    // Glow exterior
    const glowR = nd.r + 6;
    const gradient = membraneCtx.createRadialGradient(nd.x, nd.y, nd.r * 0.5, nd.x, nd.y, glowR);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    membraneCtx.fillStyle = gradient;
    membraneCtx.beginPath();
    membraneCtx.arc(nd.x, nd.y, glowR, 0, Math.PI * 2);
    membraneCtx.fill();

    // Círculo del nodo
    membraneCtx.fillStyle = color;
    membraneCtx.beginPath();
    membraneCtx.arc(nd.x, nd.y, nd.r, 0, Math.PI * 2);
    membraneCtx.fill();

    // Borde oscuro pixel-art
    membraneCtx.strokeStyle = "#0b0b0e";
    membraneCtx.lineWidth = 2;
    membraneCtx.stroke();

    // Label con pill oscuro
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

  // Leyenda por tipo (arriba izquierda)
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

  // Contador abajo derecha
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
// OFICINA — Munder Difflin pixel-art
// ===========================================================================

function initOfficeFloor() {
  officeCanvas = document.getElementById("officeCanvas");
  if (!officeCanvas) return;
  officeCtx = officeCanvas.getContext("2d");
  const parent = officeCanvas.parentElement;
  const rect = parent.getBoundingClientRect();
  officeCanvas.width = Math.max(400, Math.floor(rect.width));
  officeCanvas.height = Math.max(400, Math.floor(rect.height));
  officeCtx.imageSmoothingEnabled = false;

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
      const W = officeCanvas ? officeCanvas.width : 800;
      const H = officeCanvas ? officeCanvas.height : 600;
      const list = data.agents || [];

      // Layout: grid 3 columnas × N filas (arriba) para escritorios
      const cols = W >= 720 ? 3 : 2;
      const rows = Math.ceil(list.length / cols);
      const cellW = W / cols;
      const cellH = H / (rows + 0.5);

      const prevByName = new Map(officeAgents.map(a => [a.name, a]));
      officeAgents = list.map((a, i) => {
        const prev = prevByName.get(a.name);
        const col = i % cols;
        const row = Math.floor(i / cols);
        const slotX = cellW * (col + 0.5);
        const slotY = cellH * (row + 0.9);
        return Object.assign({}, prev || {}, a, {
          x: prev ? prev.x : slotX,
          y: prev ? prev.y : slotY,
          tx: slotX,
          ty: slotY,
          slotIndex: i,
          wobble: (prev && prev.wobble) || Math.random() * Math.PI * 2,
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

// Dibuja el suelo de la oficina: tiles pixel-art con perspectiva sutil
function drawOfficeFloor(ctx, W, H) {
  // Base
  ctx.fillStyle = "#14141a";
  ctx.fillRect(0, 0, W, H);

  // Tiles 32x32 con 2 tonos alternos
  const T = 32;
  for (let y = 0; y < H; y += T) {
    for (let x = 0; x < W; x += T) {
      const dark = ((x / T) + (y / T)) % 2 === 0;
      ctx.fillStyle = dark ? "#181820" : "#1b1b25";
      ctx.fillRect(x, y, T, T);
      // Grid line
      ctx.strokeStyle = "rgba(40, 40, 52, 0.6)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
    }
  }

  // Pared superior con "ventanas" (bloques de color)
  ctx.fillStyle = "#0f0f14";
  ctx.fillRect(0, 0, W, 56);
  ctx.fillStyle = "#1e1e26";
  ctx.fillRect(0, 52, W, 4);
  // Ventanas
  for (let x = 30; x < W - 60; x += 120) {
    ctx.fillStyle = "#1a1a24";
    ctx.fillRect(x, 12, 70, 32);
    ctx.fillStyle = "#4ECDC4";
    ctx.globalAlpha = 0.35;
    ctx.fillRect(x + 4, 16, 28, 24);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#FFD93D";
    ctx.globalAlpha = 0.25;
    ctx.fillRect(x + 36, 16, 30, 24);
    ctx.globalAlpha = 1;
  }
}

// Dibuja un escritorio pixel-art centrado en (cx, cy)
function drawDesk(ctx, cx, cy, color) {
  // Sombra
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  ctx.fillRect(cx - 60, cy + 30, 120, 8);

  // Pata izquierda
  ctx.fillStyle = "#2a2a36";
  ctx.fillRect(cx - 56, cy - 4, 8, 34);
  // Pata derecha
  ctx.fillRect(cx + 48, cy - 4, 8, 34);

  // Tabla del escritorio
  ctx.fillStyle = "#3a3a4a";
  ctx.fillRect(cx - 60, cy - 8, 120, 12);
  // Highlight superior
  ctx.fillStyle = "#4a4a5e";
  ctx.fillRect(cx - 60, cy - 8, 120, 3);

  // Monitor
  ctx.fillStyle = "#1a1a24";
  ctx.fillRect(cx - 22, cy - 34, 44, 28);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.7;
  ctx.fillRect(cx - 19, cy - 31, 38, 22);
  ctx.globalAlpha = 1;
  // Base del monitor
  ctx.fillStyle = "#2a2a36";
  ctx.fillRect(cx - 6, cy - 6, 12, 4);
}

// Avatar pixel-art: cabeza + cuerpo + ojos. Se para al lado del escritorio.
function drawAgentAvatar(ctx, x, y, color, emoji, status) {
  const bob = status === "busy" ? Math.sin(Date.now() * 0.01) * 1.5 : 0;
  const px = 3; // escala pixel

  // Sombra
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath();
  ctx.ellipse(x, y + 30, 18, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  const topY = y - 26 + bob;

  // Cuerpo (traje)
  ctx.fillStyle = color;
  ctx.fillRect(x - 12, topY + 22, 24, 26);
  // Sombra cuerpo
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x + 6, topY + 22, 6, 26);

  // Cabeza
  ctx.fillStyle = "#ffd9b3";
  ctx.fillRect(x - 11, topY + 4, 22, 20);
  // Sombra cabeza
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(x + 5, topY + 4, 6, 20);

  // Pelo (bloque arriba)
  ctx.fillStyle = "#2a2a36";
  ctx.fillRect(x - 11, topY + 2, 22, 6);
  ctx.fillRect(x - 11, topY + 2, 4, 12);
  ctx.fillRect(x + 7, topY + 2, 4, 12);

  // Ojos
  ctx.fillStyle = "#0b0b0e";
  ctx.fillRect(x - 6, topY + 14, 4, 4);
  ctx.fillRect(x + 2, topY + 14, 4, 4);

  // Emoji en el pecho (identidad del agente)
  ctx.font = "14px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, x, topY + 35);
  ctx.textBaseline = "alphabetic";

  // LED de estado (arriba derecha del avatar)
  let ledColor = "#8a8a93";
  if (status === "busy") ledColor = "#facc15";
  else if (status === "error") ledColor = "#ef4444";
  else if (status === "idle") ledColor = "#22c55e";

  // Glow del LED
  ctx.fillStyle = ledColor;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(x + 22, topY - 4, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = ledColor;
  ctx.fillRect(x + 18, topY - 8, 8, 8);
  ctx.strokeStyle = "#0b0b0e";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 18, topY - 8, 8, 8);
}

// Etiqueta de agente debajo del avatar
function drawAgentLabel(ctx, x, y, name, role, status, color) {
  ctx.textAlign = "center";

  // Nombre
  ctx.font = "bold 11px monospace";
  const nameW = ctx.measureText(name).width;
  ctx.fillStyle = "rgba(11, 11, 14, 0.9)";
  ctx.fillRect(x - nameW / 2 - 5, y - 10, nameW + 10, 14);
  ctx.fillStyle = "#ececf1";
  ctx.fillText(name, x, y);

  // Rol
  ctx.font = "9px monospace";
  ctx.fillStyle = "#8a8a93";
  ctx.fillText(role, x, y + 12);

  // Estado con LED
  let ledColor = "#22c55e";
  if (status === "busy") ledColor = "#facc15";
  else if (status === "error") ledColor = "#ef4444";
  ctx.fillStyle = ledColor;
  ctx.fillRect(x - 20, y + 18, 6, 6);
  ctx.fillStyle = ledColor;
  ctx.font = "9px monospace";
  ctx.textAlign = "left";
  ctx.fillText(status, x - 12, y + 24);
  ctx.textAlign = "center";
}

function drawOffice() {
  if (!officeCtx) return;
  const W = officeCanvas.width, H = officeCanvas.height;

  // Suelo + pared
  drawOfficeFloor(officeCtx, W, H);

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

  for (const a of officeAgents) {
    const status = a.status || "idle";
    const color = AGENT_ROLE_COLOR[a.role] || "#6366f1";
    const emoji = AGENT_ROLE_EMOJI[a.role] || "🤖";

    // Movimiento suave hacia slot (o wobble si busy)
    if (status === "busy") {
      a.wobble += 0.05;
      a.x += (a.tx + Math.sin(a.wobble) * 6 - a.x) * 0.06;
      a.y += (a.ty + Math.cos(a.wobble * 0.7) * 4 - a.y) * 0.06;
    } else {
      a.x += (a.tx - a.x) * 0.08;
      a.y += (a.ty - a.y) * 0.08;
    }

    // Escritorio detrás del agente (ligeramente arriba)
    drawDesk(officeCtx, a.x, a.y - 20, color);

    // Avatar
    drawAgentAvatar(officeCtx, a.x + 34, a.y - 4, color, emoji, status);

    // Etiqueta debajo
    drawAgentLabel(officeCtx, a.x + 34, a.y + 60, a.name || "?", a.role || "?", status, color);
  }

  // Encabezado con contador
  officeCtx.textAlign = "left";
  officeCtx.font = "11px monospace";
  officeCtx.fillStyle = "#8a8a93";
  officeCtx.fillText(officeAgents.length + " agentes activos", 12, 84);

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
