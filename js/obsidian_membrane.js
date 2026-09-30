// AKIRA OBSIDIAN MEMBRANE + OFFICE FLOOR - V13.2
// Cambios V13.2:
//   - Layout robusto: delay de 50ms antes de correr (fix apelotonamiento inicial).
//   - nodeRepulsion 60000, idealEdgeLength 150, componentSpacing 200.
//   - Filtro top-N aristas por nodo (menos maraña, solo las relaciones mas fuertes).
//   - Labels cortos para memories/learnings (📝 abc123 en vez de memory:mem_abc123...).
//   - window.reorganizeMembrane() expuesto para boton.
// Cambios V13.1:
//   - Aristas mas visibles (opacidad 0.55, color #5a5a70).

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

// Filtro visual: aristas con weight menor a esto no se muestran.
const MIN_EDGE_WEIGHT_VISIBLE = 0.5;
// Cuantas aristas como maximo por nodo (las mas fuertes por peso).
const MAX_EDGES_PER_NODE = 5;

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

// Acorta labels largos de memoria/learning a algo legible.
function _abbreviateLabel(label) {
  if (!label) return "";
  const s = String(label);
  if (s.startsWith("memory:mem_")) return "📝 " + s.slice(-6);
  if (s.startsWith("learning:")) return "💡 " + s.slice(-6);
  if (s.startsWith("agent:")) return s.slice(6);
  if (s.startsWith("tool:")) return s.slice(5);
  if (s.length > 28) return s.slice(0, 26) + "…";
  return s;
}

// Filtra aristas: solo las top-N por peso de cada nodo. Reduce maraña.
function _filterEdgesByRelevance(edges, nodeIds) {
  const byNode = new Map();
  for (const e of edges) {
    if (!nodeIds.has(e.from_node) || !nodeIds.has(e.to_node)) continue;
    const w = Number(e.weight) || 0;
    if (w < MIN_EDGE_WEIGHT_VISIBLE) continue;
    for (const nid of [e.from_node, e.to_node]) {
      if (!byNode.has(nid)) byNode.set(nid, []);
      byNode.get(nid).push({ edge: e, weight: w });
    }
  }
  const keep = new Set();
  byNode.forEach(list => {
    list.sort((a, b) => b.weight - a.weight);
    list.slice(0, MAX_EDGES_PER_NODE).forEach(item => keep.add(item.edge.id));
  });
  return edges.filter(e => keep.has(e.id));
}

// ===========================================================================
// CEREBRO AKIRA (MEMBRANA) — Cytoscape.js V13.2
// ===========================================================================

let cyMembrane = null;
let membraneLastFetch = 0;
let membraneFetching = false;
let membraneCounts = { nodes: 0, edges: 0, by_type: {}, by_relation: {} };
let membraneError = null;
let membraneHasRunLayoutOnce = false;
let membraneLayoutTimer = null;
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
        'color': '#c8c8d0',
        'font-family': 'monospace',
        'font-size': 9,
        'font-weight': 300,
        'text-valign': 'bottom',
        'text-halign': 'center',
        'text-margin-y': 5,
        'text-opacity': 0.55,
        'text-wrap': 'wrap',
        'text-max-width': 110,
        'border-width': 0,
        'transition-property': 'opacity, border-width, shadow-blur, shadow-opacity',
        'transition-duration': '180ms',
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
        'font-size': 11,
        'shadow-blur': 24,
        'shadow-color': '#ffffff',
        'shadow-opacity': 0.4,
      }
    },
    {
      selector: 'node.highlighted',
      style: {
        'border-width': 1.5,
        'border-color': '#ffffff',
        'text-opacity': 1,
        'color': '#ffffff',
        'shadow-blur': 16,
        'shadow-color': '#ffffff',
        'shadow-opacity': 0.3,
      }
    },
    {
      selector: 'node.dimmed',
      style: {
        'opacity': 0.15,
        'text-opacity': 0.1,
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 'data(width)',
        'line-color': '#5a5a70',
        'curve-style': 'straight',
        'opacity': 0.55,
        'transition-property': 'opacity, line-color',
        'transition-duration': '180ms',
      }
    },
    {
      selector: 'edge.highlighted',
      style: {
        'opacity': 0.9,
        'line-color': '#b8b8d0',
      }
    },
    {
      selector: 'edge.dimmed',
      style: {
        'opacity': 0.08,
      }
    },
  ];
}

function _layoutOptions(animate) {
  return {
    name: 'cose',
    animate: !!animate,
    animationDuration: 900,
    animationEasing: 'ease-out',
    randomize: true,            // aleatorio cada vez: evita quedar atrapado en apelotonamiento
    nodeRepulsion: 60000,       // fuerza fuerte
    idealEdgeLength: 150,       // distancia objetivo
    edgeElasticity: 0.4,
    nestingFactor: 0.1,
    gravity: 0.2,
    numIter: 2500,
    initialTemp: 300,
    coolingFactor: 0.95,
    minTemp: 1.0,
    fit: true,
    padding: 70,
    nodeOverlap: 40,
    componentSpacing: 200,      // grupos desconectados bien separados
  };
}

// Corre el layout con un delay minimo para que Cytoscape registre bien los nodos.
function _runLayoutSafely(animate) {
  if (membraneLayoutTimer) { clearTimeout(membraneLayoutTimer); membraneLayoutTimer = null; }
  membraneLayoutTimer = setTimeout(() => {
    if (!cyMembrane) return;
    try {
      const layout = cyMembrane.layout(_layoutOptions(animate));
      layout.run();
    } catch (e) {
      console.warn("[membrane] layout fallo:", e);
    }
    membraneLayoutTimer = null;
  }, 60);
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
    cyMembrane.resize();
    refreshMembrane(true);
    return;
  }

  try {
    cyMembrane = window.cytoscape({
      container: container,
      style: _cytoscapeStyle(),
      layout: { name: 'preset' },
      minZoom: 0.2,
      maxZoom: 4.0,
      wheelSensitivity: 0.25,
      boxSelectionEnabled: false,
      selectionType: 'single',
      autounselectify: false,
      autoungrabify: false,
    });

    cyMembrane.on('tap', 'node', (evt) => {
      const node = evt.target;
      _highlightNeighbors(node);
    });

    cyMembrane.on('mouseover', 'node', (evt) => {
      if (cyMembrane.elements(':selected').length > 0) return;
      _highlightNeighbors(evt.target, true);
    });

    cyMembrane.on('mouseout', 'node', () => {
      if (cyMembrane.elements(':selected').length > 0) return;
      cyMembrane.elements().removeClass('dimmed').removeClass('highlighted');
    });

    cyMembrane.on('tap', (evt) => {
      if (evt.target === cyMembrane) {
        cyMembrane.elements().unselect();
        cyMembrane.elements().removeClass('dimmed').removeClass('highlighted');
      }
    });

    cyMembrane.on('dbltap', (evt) => {
      if (evt.target === cyMembrane) {
        cyMembrane.fit(undefined, 60);
        cyMembrane.center();
      }
    });

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

function _highlightNeighbors(node, soft) {
  if (!cyMembrane) return;
  const neighborhood = node.closedNeighborhood();
  cyMembrane.elements().removeClass('highlighted').removeClass('dimmed');

  cyMembrane.elements().forEach(el => {
    if (neighborhood.contains(el)) {
      el.addClass('highlighted');
    } else {
      el.addClass('dimmed');
    }
  });
}

// Funcion global: reorganiza el grafo (usada por el boton "🔄 Reorganizar").
window.reorganizeMembrane = function () {
  if (!cyMembrane) return;
  _runLayoutSafely(true);
};

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
    const baseR = 12;
    const bonusReuse = Math.min((n.reuse_count || 0) * 1.2, 8);
    const bonusWeight = Math.min((n.weight || 0) * 1.8, 14);
    const radius = baseR + bonusReuse + bonusWeight;
    cyElements.push({
      group: 'nodes',
      data: {
        id: n.id,
        label: _abbreviateLabel(n.label),
        node_type: n.node_type,
        color: typeColor,
        weight: n.weight || 0,
        reuse_count: n.reuse_count || 0,
        radius: radius,
      }
    });
  }

  const visibleEdges = _filterEdgesByRelevance(edges, nodeIds);
  for (const e of visibleEdges) {
    const w = Number(e.weight) || 0;
    cyElements.push({
      group: 'edges',
      data: {
        id: e.id,
        source: e.from_node,
        target: e.to_node,
        weight: w,
        width: Math.min(3.0, 0.5 + w * 0.7),
        relation_type: e.relation_type,
      }
    });
  }

  const existingIds = new Set();
  cyMembrane.elements().forEach(el => existingIds.add(el.id()));
  const newIds = new Set(cyElements.map(e => e.data.id));

  let addedNodes = 0;
  cyMembrane.batch(() => {
    existingIds.forEach(id => {
      if (!newIds.has(id)) {
        const el = cyMembrane.getElementById(id);
        if (el && !el.empty()) el.remove();
      }
    });
    const toAdd = cyElements.filter(e => !existingIds.has(e.data.id));
    if (toAdd.length > 0) {
      cyMembrane.add(toAdd);
      toAdd.forEach(e => { if (e.group === 'nodes') addedNodes++; });
    }
    cyElements.forEach(e => {
      if (existingIds.has(e.data.id)) {
        const el = cyMembrane.getElementById(e.data.id);
        if (el && !el.empty()) el.data(e.data);
      }
    });
  });

  const totalNodes = cyMembrane.nodes().length;
  const shouldLayout = totalNodes > 0 && (!membraneHasRunLayoutOnce || addedNodes > 0);

  if (shouldLayout) {
    _runLayoutSafely(true);
    membraneHasRunLayoutOnce = true;
  }

  membraneCounts = data.counts || { nodes: 0, edges: 0, by_type: {}, by_relation: {} };
  _updateMembraneStats();
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
// OFICINA — sin cambios respecto a V12
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

window.AkiraMembrane = {
  initMembraneGraph: initMembraneGraph,
  initOfficeFloor: initOfficeFloor,
  refreshMembrane: refreshMembrane,
  refreshOffice: refreshOffice,
  addOfficeLog: addOfficeLog,
  updateOfficeStats: updateOfficeStats,
  reorganize: window.reorganizeMembrane,
};
