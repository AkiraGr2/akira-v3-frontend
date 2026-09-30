// AKIRA OBSIDIAN MEMBRANE + OFFICE FLOOR - V12.0
// Membrana: Cytoscape.js (física d3-force, zoom/pan/pinch nativos).
// Oficina: igual que V11.0 (Canvas 2D + routing por pasillos).

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

const H_Y = 355;
const VL_X = 49;
const VC_X = 362;
const VR_X = 675;

const H_POINTS = [60, 130, 200, 270, 340, 410, 480, 550, 620, 690];
const V_POINTS = [380, 440, 500, 560, 610];

const HOME_POSITIONS = {
  researcher:    [VL_X, 420],
  memorizer:     [VC_X, 420],
  graph_builder: [VR_X, 420],
  learner:       [180, H_Y],
  internal:      [540, H_Y],
};

const SPRITE_SCALE = 2;
const WALK_SPEED = 0.9;
const IDLE_WAIT_MS = 8000;
const BUSY_WAIT_MS = 4000;

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

// ===========================================================================
// MEMBRANA — Cytoscape.js
// ===========================================================================

let cyMembrane = null;
let membraneLastFetch = 0;
let membraneFetching = false;
let membraneCounts = { nodes: 0, edges: 0, by_type: {}, by_relation: {} };
let membraneError = null;
const MEMBRANE_REFRESH_MS = 7000;

function _cytoscapeStyle() {
  return [
    {
      selector: 'node',
      style: {
        'background-color': 'data(color)',
        'width': 'data(radius)',
        'height': 'data(radius)',
        'label': 'data(label)',
        'color': '#d0d0d8',
        'font-family': 'monospace',
        'font-size': 10,
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 4,
        'text-opacity': 0.55,
        'border-width': 0,
        'transition-property': 'opacity, border-width',
        'transition-duration': '150ms',
      }
    },
    {
      selector: 'node:selected',
      style: {
        'border-width': 2,
        'border-color': '#ffffff',
        'text-opacity': 1,
        'color': '#ffffff',
        'font-weight': 'bold',
        'font-size': 12,
      }
    },
    {
      selector: 'node.dimmed',
      style: {
        'opacity': 0.18,
        'text-opacity': 0.12,
      }
    },
    {
      selector: 'node.highlighted',
      style: {
        'border-width': 1.5,
        'border-color': '#ffffff',
        'text-opacity': 1,
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 'data(width)',
        'line-color': '#505060',
        'curve-style': 'straight',
        'opacity': 0.4,
        'transition-property': 'opacity',
        'transition-duration': '150ms',
      }
    },
    {
      selector: 'edge.dimmed',
      style: {
        'opacity': 0.05,
      }
    },
  ];
}

function initMembraneGraph() {
  const container = document.getElementById('membraneCy');
  if (!container) return;

  const parent = container.parentElement;
  const rect = parent.getBoundingClientRect();
  if (rect.width < 50 || rect.height < 50) return;

  if (typeof window.cytoscape === 'undefined') {
    container.innerHTML = '<div style="color:#ef4444;padding:20px;font-family:monospace;text-align:center">No se pudo cargar Cytoscape.js</div>';
    return;
  }

  if (cyMembrane) {
    // Ya inicializado: solo asegurar tamaño correcto
    cyMembrane.resize();
    refreshMembrane(true);
    return;
  }

  try {
    cyMembrane = window.cytoscape({
      container: container,
      style: _cytoscapeStyle(),
      layout: { name: 'preset' },  // Los nodos se posicionan al añadirlos
      minZoom: 0.3,
      maxZoom: 3.0,
      wheelSensitivity: 0.25,
      boxSelectionEnabled: false,
      selectionType: 'single',
      autounselectify: false,
      autoungrabify: false,
    });

    // Click en nodo: resaltar vecinos
    cyMembrane.on('tap', 'node', (evt) => {
      const node = evt.target;
      _highlightNeighbors(node);
    });

    // Click en fondo: deseleccionar todo
    cyMembrane.on('tap', (evt) => {
      if (evt.target === cyMembrane) {
        cyMembrane.elements().unselect();
        cyMembrane.elements().removeClass('dimmed');
        cyMembrane.elements().removeClass('highlighted');
      }
    });

    // Doble click en fondo: resetear vista
    cyMembrane.on('dbltap', (evt) => {
      if (evt.target === cyMembrane) {
        cyMembrane.fit(undefined, 40);
        cyMembrane.center();
      }
    });

    // Redimensionar al cambiar el contenedor
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => {
        if (cyMembrane) cyMembrane.resize();
      });
      ro.observe(container);
    }

    refreshMembrane(true);
  } catch (e) {
    container.innerHTML = '<div style="color:#ef4444;padding:20px;font-family:monospace;text-align:center">Error Cytoscape: ' + (e && e.message ? e.message : e) + '</div>';
  }
}

function _highlightNeighbors(node) {
  if (!cyMembrane) return;
  const neighborhood = node.closedNeighborhood();
  cyMembrane.elements().removeClass('highlighted');
  cyMembrane.elements().removeClass('dimmed');

  cyMembrane.elements().forEach(el => {
    if (neighborhood.contains(el)) {
      el.addClass('highlighted');
    } else {
      el.addClass('dimmed');
    }
  });
}

async function refreshMembrane(force) {
  if (!cyMembrane) return;
  if (membraneFetching) return;
  if (!force && Date.now() - membraneLastFetch < MEMBRANE_REFRESH_MS) return;
  membraneFetching = true;
  membraneLastFetch = Date.now();

  try {
    const data = await _fetchJson("/api/v8/graph/overview");
    if (data && data.ok) {
      _applyGraphToCy(data);
      membraneError = null;
    }
  } catch (e) {
    membraneError = String(e && e.message ? e.message : e);
  } finally {
    membraneFetching = false;
  }
}

function _applyGraphToCy(data) {
  if (!cyMembrane) return;

  const nodes = data.nodes || [];
  const edges = data.edges || [];
  const nodeIds = new Set();

  const cyElements = [];

  for (const n of nodes) {
    nodeIds.add(n.id);
    const typeColor = NODE_TYPE_COLORS[n.node_type] || '#6366f1';
    // Radius estilo Obsidian: 14-42px (mapea weight/reuse a un rango visual)
    const baseR = 14;
    const bonusReuse = Math.min((n.reuse_count || 0) * 1.5, 12);
    const bonusWeight = Math.min((n.weight || 0) * 2.0, 16);
    const radius = baseR + bonusReuse + bonusWeight;
    cyElements.push({
      group: 'nodes',
      data: {
        id: n.id,
        label: String(n.label || n.id || '').slice(0, 24),
        node_type: n.node_type,
        color: typeColor,
        weight: n.weight || 0,
        reuse_count: n.reuse_count || 0,
        radius: radius,
      }
    });
  }

  for (const e of edges) {
    if (!nodeIds.has(e.from_node) || !nodeIds.has(e.to_node)) continue;
    const w = e.weight || 1;
    cyElements.push({
      group: 'edges',
      data: {
        id: e.id,
        source: e.from_node,
        target: e.to_node,
        weight: w,
        width: Math.min(2.5, 0.6 + w * 0.4),
        relation_type: e.relation_type,
      }
    });
  }

  // Diff: eliminar los que ya no están, agregar nuevos, actualizar existentes.
  const existingIds = new Set();
  cyMembrane.elements().forEach(el => existingIds.add(el.id()));

  const newIds = new Set(cyElements.map(e => e.data.id));

  cyMembrane.batch(() => {
    // Eliminar los que se fueron
    existingIds.forEach(id => {
      if (!newIds.has(id)) {
        const el = cyMembrane.getElementById(id);
        if (el && !el.empty()) el.remove();
      }
    });
    // Agregar nuevos
    const toAdd = cyElements.filter(e => !existingIds.has(e.data.id));
    if (toAdd.length > 0) {
      cyMembrane.add(toAdd);
    }
    // Actualizar datos de los existentes
    cyElements.forEach(e => {
      if (existingIds.has(e.data.id)) {
        const el = cyMembrane.getElementById(e.data.id);
        if (el && !el.empty()) el.data(e.data);
      }
    });
  });

  // Aplicar layout solo si hay nodos y son nuevos (evitar re-layout constante)
  const nodeCount = cyMembrane.nodes().length;
  const needLayout = toCountNewNodesDiff(existingIds, cyElements);

  if (nodeCount > 0 && needLayout) {
    const layout = cyMembrane.layout({
      name: 'cose',
      animate: true,
      animationDuration: 600,
      randomize: false,
      nodeRepulsion: 8000,
      idealEdgeLength: 130,
      edgeElasticity: 0.45,
      gravity: 0.3,
      numIter: 800,
      fit: true,
      padding: 40,
      nodeOverlap: 20,
    });
    layout.run();
  }

  membraneCounts = data.counts || { nodes: 0, edges: 0, by_type: {}, by_relation: {} };
  _updateMembraneStats();
}

function toCountNewNodesDiff(existingIds, cyElements) {
  // Devuelve true si hay nodos nuevos (contando solo nodos, no aristas)
  for (const e of cyElements) {
    if (e.group !== 'nodes') continue;
    if (!existingIds.has(e.data.id)) return true;
  }
  return false;
}

function _updateMembraneStats() {
  const el = document.getElementById('membraneStats');
  if (!el) return;
  const c = membraneCounts || { nodes: 0, edges: 0 };
  el.textContent = (c.nodes || 0) + ' nodos · ' + (c.edges || 0) + ' aristas';
}

window.addEventListener("akira:section-shown", function (ev) {
  const section = ev && ev.detail && ev.detail.section;
  if (section === "membrane") {
    if (!cyMembrane) initMembraneGraph();
    else {
      // Asegurar que el contenedor ya tiene tamaño real
      setTimeout(() => {
        if (cyMembrane) cyMembrane.resize();
      }, 100);
    }
  }
  if (section === "office" && document.getElementById("officeCanvas")) {
    initOfficeFloor();
  }
});

document.addEventListener("DOMContentLoaded", function () {
  setTimeout(function () {
    if (document.getElementById("membraneCy")) initMembraneGraph();
    if (document.getElementById("officeCanvas")) initOfficeFloor();
  }, 500);
});

// ===========================================================================
// OFICINA — sin cambios
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

function _corridorOf(x, y) {
  const dh = Math.abs(y - H_Y);
  const dl = Math.abs(x - VL_X);
  const dc = Math.abs(x - VC_X);
  const dr = Math.abs(x - VR_X);
  const m = Math.min(dh, dl, dc, dr);
  if (m === dh) return "H";
  if (m === dl) return "VL";
  if (m === dc) return "VC";
  return "VR";
}

function _vX(kind) {
  if (kind === "VL") return VL_X;
  if (kind === "VC") return VC_X;
  return VR_X;
}

function _buildPath(cx, cy, tx, ty) {
  const cCorr = _corridorOf(cx, cy);
  const tCorr = _corridorOf(tx, ty);
  const path = [];

  if (cCorr === "H" && tCorr === "H") {
    path.push([tx, H_Y]);
  } else if (cCorr === "H" && tCorr !== "H") {
    const vx = _vX(tCorr);
    path.push([vx, H_Y]);
    path.push([vx, ty]);
  } else if (cCorr !== "H" && tCorr === "H") {
    const vx = _vX(cCorr);
    path.push([vx, H_Y]);
    path.push([tx, H_Y]);
  } else {
    const vxC = _vX(cCorr);
    const vxT = _vX(tCorr);
    if (vxC === vxT) {
      path.push([vxC, ty]);
    } else {
      path.push([vxC, H_Y]);
      path.push([vxT, H_Y]);
      path.push([vxT, ty]);
    }
  }
  return path;
}

function _pickRandomTarget() {
  const r = Math.random();
  if (r < 0.5) {
    const x = H_POINTS[Math.floor(Math.random() * H_POINTS.length)];
    return [x, H_Y];
  }
  const vk = ["VL", "VC", "VR"][Math.floor(Math.random() * 3)];
  const vx = _vX(vk);
  const y = V_POINTS[Math.floor(Math.random() * V_POINTS.length)];
  return [vx, y];
}

function _ensureMovementState(a) {
  if (typeof a.x !== "number") {
    const home = HOME_POSITIONS[a.role] || [VC_X, 420];
    a.x = home[0];
    a.y = home[1];
  }
  if (!a.path) a.path = [];
  if (typeof a.nextMoveAt !== "number") a.nextMoveAt = Date.now() + Math.random() * IDLE_WAIT_MS;
  if (typeof a.facing !== "string") a.facing = "idle";
}

function _updateAgentMovement(a) {
  const now = Date.now();

  if (a.status === "busy") {
    const home = HOME_POSITIONS[a.role] || [a.x, a.y];
    if (a.path.length === 0 && (Math.abs(a.x - home[0]) > 3 || Math.abs(a.y - home[1]) > 3)) {
      a.path = _buildPath(a.x, a.y, home[0], home[1]);
    }
    if (a.path.length === 0) {
      if (now > a.nextMoveAt) a.nextMoveAt = now + BUSY_WAIT_MS;
    }
  } else {
    if (a.path.length === 0 && now > a.nextMoveAt) {
      const t = _pickRandomTarget();
      a.path = _buildPath(a.x, a.y, t[0], t[1]);
      a.nextMoveAt = now + IDLE_WAIT_MS + Math.random() * 5000;
    }
  }

  if (a.path.length === 0) {
    a.facing = "idle";
    return;
  }

  const target = a.path[0];
  const dx = target[0] - a.x;
  const dy = target[1] - a.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 2) {
    a.x = target[0];
    a.y = target[1];
    a.path.shift();
    if (a.path.length === 0) a.facing = "idle";
    return;
  }

  const step = Math.min(WALK_SPEED, dist);
  a.x += (dx / dist) * step;
  a.y += (dy / dist) * step;
  if (Math.abs(dx) > Math.abs(dy)) {
    a.facing = dx > 0 ? "right" : "left";
  } else {
    a.facing = dy > 0 ? "down" : "up";
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

// API pública
window.AkiraMembrane = {
  initMembraneGraph: initMembraneGraph,
  initOfficeFloor: initOfficeFloor,
  refreshMembrane: refreshMembrane,
  refreshOffice: refreshOffice,
  addOfficeLog: addOfficeLog,
  updateOfficeStats: updateOfficeStats,
};
