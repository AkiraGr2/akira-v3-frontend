// AKIRA OBSIDIAN MEMBRANE + OFFICE FLOOR - V16.0
// V16.0: Layout tipo Obsidian (Graph Spawn) — nucleo al centro, grupos en anillo,
//        satelites en espiral alrededor de su hub. Colores por grupo. Labels selectivos.
// Backend: nada que tocar. Frontend: solo este archivo + cache-busting en index.html.

const AKIRA_API_BASE = "https://akira-empresa.onrender.com";
const OFFICE_BG_URL = "./assets/office/LargePixelOffice.png";
const OFFICE_SHEET_URL = "./assets/office/PixelOfficeAssets.png";
const OFFICE_W = 720, OFFICE_H = 630;

const SPRITE_RECTS = {
  researcher: [2, 105, 17, 128], memorizer: [19, 104, 38, 128],
  graph_builder: [40, 107, 53, 128], learner: [3, 132, 20, 155], internal: [22, 132, 39, 155],
};
const H_Y = 355, VL_X = 49, VC_X = 362, VR_X = 675;
const H_POINTS = [60, 130, 200, 270, 340, 410, 480, 550, 620, 690];
const V_POINTS = [380, 440, 500, 560, 610];
const HOME_POSITIONS = {
  researcher: [VL_X, 420], memorizer: [VC_X, 420], graph_builder: [VR_X, 420],
  learner: [180, H_Y], internal: [540, H_Y],
};
const SPRITE_SCALE = 2, WALK_SPEED = 0.9, IDLE_WAIT_MS = 8000, BUSY_WAIT_MS = 4000;

// Colores por grupo (asignados por label prefix + node_type).
const GROUP_COLORS = {
  memory:   "#10b981",  // verde
  learning: "#14b8a6",  // verde-cyan
  agent:    "#ec4899",  // rosa
  tool:     "#06b6d4",  // cyan
  concept:  "#8b5cf6",  // morado
  project:  "#f59e0b",  // naranja
  document: "#a78bfa",  // lila
  skill:    "#facc15",  // amarillo
  error:    "#ef4444",  // rojo
  solution: "#22c55e",  // verde claro
  mission:  "#fb923c",  // naranja claro
  other:    "#6366f1",  // indigo
};

function _detectGroup(node) {
  const s = String(node.label || "");
  if (s.startsWith("memory:")) return "memory";
  if (s.startsWith("learning:")) return "learning";
  if (s.startsWith("agent:")) return "agent";
  if (s.startsWith("tool:")) return "tool";
  const t = String(node.node_type || "");
  if (GROUP_COLORS[t]) return t;
  return "other";
}

(function _registerCoseBilkent(){
  try {
    if (typeof window.cytoscape !== "undefined" && typeof window.cytoscapeCoseBilkent === "function") {
      window.cytoscape.use(window.cytoscapeCoseBilkent);
      console.log("[membrane] cose-bilkent registrado (fallback)");
    }
  } catch(e) { console.warn("[membrane] cose-bilkent registro fallo:", e); }
})();

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
// CEREBRO AKIRA — V16.0 (layout tipo Obsidian)
// ===========================================================================
let cyMembrane = null;
let membraneLastFetch = 0, membraneFetching = false;
let membraneCounts = { nodes: 0, edges: 0, by_type: {}, by_relation: {} };
let membraneError = null;
let membraneLayoutTimer = null;
const MEMBRANE_REFRESH_MS = 7000;
const MIN_EDGE_WEIGHT_VISIBLE = 0.5;
const MAX_EDGES_PER_NODE = 4;

// Cache de posiciones por id. Persiste entre renders.
const _positionCache = new Map();

let _labelCounter = null, _labelMax = 0;
function _getLabelCounter() {
  if (_labelCounter) return _labelCounter;
  try { _labelCounter = JSON.parse(localStorage.getItem("akira_label_counter") || "{}"); }
  catch(_) { _labelCounter = {}; }
  return _labelCounter;
}
function _saveLabelCounter() {
  try { localStorage.setItem("akira_label_counter", JSON.stringify(_labelCounter)); } catch(_){}
}
function _labelForId(id, fallback) {
  const counter = _getLabelCounter();
  if (!counter[id]) {
    const vals = Object.values(counter).map(Number);
    _labelMax = (vals.length ? Math.max.apply(null, vals) : 0) + 1;
    counter[id] = _labelMax;
    _saveLabelCounter();
  }
  return counter[id] + (fallback ? " · " + fallback : "");
}
function _abbreviateLabel(id, label) {
  if (!label && !id) return "";
  const s = String(label || ""); const i = String(id || "");
  if (s.trim().toLowerCase() === "akira") return "Akira";
  if (s.startsWith("memory:mem_")) return _labelForId(i, "mem");
  if (s.startsWith("learning:")) return _labelForId(i, "learn");
  if (s.startsWith("agent:")) return _labelForId(i, s.slice(6));
  if (s.startsWith("tool:")) return _labelForId(i, s.slice(5));
  if (i.startsWith("node_")) return _labelForId(i, s.slice(0, 14));
  if (s.length > 20) return s.slice(0, 18) + "…";
  return s;
}

// Filtra aristas: top-N por nodo (excepto el core que muestra todas).
function _filterEdgesByRelevance(edges, nodeIds, coreId) {
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
  byNode.forEach((list, nid) => {
    list.sort((a, b) => b.weight - a.weight);
    if (nid === coreId) list.forEach(item => keep.add(item.edge.id));
    else list.slice(0, MAX_EDGES_PER_NODE).forEach(item => keep.add(item.edge.id));
  });
  return edges.filter(e => keep.has(e.id));
}

// ============================================================
// Algoritmo tipo "Graph Spawn" (Obsidian):
// 1. Nucleo Akira al centro.
// 2. Hubs de cada grupo en un anillo alrededor del nucleo.
// 3. Satelites en espiral alrededor de su hub.
// ============================================================
function _computeSeedPositions(nodes, edges, coreId) {
  const W = cyMembrane.width() || 800;
  const H = cyMembrane.height() || 600;
  const cx = W / 2, cy = H / 2;

  // 1. Agrupar por tipo.
  const groups = new Map();
  for (const n of nodes) {
    if (n.id === coreId) continue;
    const key = _detectGroup(n);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(n.id);
  }

  // 2. Calcular grado por nodo.
  const degree = new Map();
  for (const e of edges) {
    degree.set(e.from_node, (degree.get(e.from_node) || 0) + 1);
    degree.set(e.to_node, (degree.get(e.to_node) || 0) + 1);
  }

  // 3. Ordenar grupos por tamaño (mayor primero).
  const groupList = Array.from(groups.entries());
  groupList.sort((a, b) => b[1].length - a[1].length);

  const positions = {};

  // 4. Nucleo al centro.
  if (coreId) positions[coreId] = { x: cx, y: cy };

  // 5. Anillo para hubs.
  const N = groupList.length;
  const R = Math.min(W, H) * 0.32;

  groupList.forEach(([key, ids], i) => {
    // Hubs distribuidos uniformemente, empezando arriba.
    const angle = (i / Math.max(N, 1)) * 2 * Math.PI - Math.PI / 2;
    const hubX = cx + R * Math.cos(angle);
    const hubY = cy + R * Math.sin(angle);

    // Elegir hub: el nodo con mas grado del grupo.
    let hubId = ids[0], hubDeg = -1;
    for (const id of ids) {
      const d = degree.get(id) || 0;
      if (d > hubDeg) { hubDeg = d; hubId = id; }
    }
    positions[hubId] = { x: hubX, y: hubY };

    // Satelites: espiral de angulo dorado.
    const satellites = ids.filter(id => id !== hubId);
    const Nsat = satellites.length;
    if (Nsat === 0) return;

    const clusterR = Math.min(140, 40 + Math.log2(1 + Nsat) * 24);
    const golden = Math.PI * (3 - Math.sqrt(5));
    satellites.forEach((sid, j) => {
      const t = (j + 1) / Nsat;
      const r = clusterR * Math.sqrt(t);
      const theta = j * golden + angle; // rota el cluster segun su sector
      positions[sid] = {
        x: hubX + r * Math.cos(theta),
        y: hubY + r * Math.sin(theta),
      };
    });
  });

  return positions;
}

// Coloca un nodo nuevo cerca de su hub (o del nucleo si es el primero).
function _placeNewNode(nodeId, group, hubId, centerPos) {
  if (!hubId || !_positionCache.has(hubId)) {
    // Sin hub conocido: cerca del centro con offset aleatorio.
    const angle = Math.random() * Math.PI * 2;
    const r = 60 + Math.random() * 40;
    return { x: centerPos.x + r * Math.cos(angle), y: centerPos.y + r * Math.sin(angle) };
  }
  const hub = _positionCache.get(hubId);
  const angle = Math.random() * Math.PI * 2;
  const r = 40 + Math.random() * 30;
  return { x: hub.x + r * Math.cos(angle), y: hub.y + r * Math.sin(angle) };
}

// Aplica posiciones a los nodos: usa cache, calcula nuevos si hacen falta.
function _applySeedPositions(nodes, edges, coreId, forceAll) {
  // 1. Si forceAll: limpiar cache y recomputar todo.
  if (forceAll) _positionCache.clear();

  // 2. Detectar nodos sin posicion.
  const missing = nodes.filter(n => !_positionCache.has(n.id));
  const needFullSeed = missing.length > 0 && (_positionCache.size === 0 || forceAll);

  if (needFullSeed) {
    // Calcular posiciones para TODOS de una vez (determinista).
    const seedPositions = _computeSeedPositions(nodes, edges, coreId);
    for (const id in seedPositions) _positionCache.set(id, seedPositions[id]);
  } else if (missing.length > 0) {
    // Solo faltan algunos: colocarlos cerca de su hub.
    const W = cyMembrane.width() || 800, H = cyMembrane.height() || 600;
    const centerPos = _positionCache.get(coreId) || { x: W/2, y: H/2 };
    // Indice de hub por grupo.
    const hubByGroup = {};
    const groupsMap = new Map();
    for (const n of nodes) {
      if (n.id === coreId) continue;
      const g = _detectGroup(n);
      if (!groupsMap.has(g)) groupsMap.set(g, []);
      groupsMap.get(g).push(n);
    }
    // Elegir hub del grupo: el que ya tenga posicion cacheada.
    groupsMap.forEach((groupNodes, g) => {
      for (const n of groupNodes) {
        if (_positionCache.has(n.id)) { hubByGroup[g] = n.id; break; }
      }
    });
    for (const n of missing) {
      if (n.id === coreId) { _positionCache.set(n.id, centerPos); continue; }
      const g = _detectGroup(n);
      const pos = _placeNewNode(n.id, g, hubByGroup[g], centerPos);
      _positionCache.set(n.id, pos);
    }
  }

  // 3. Aplicar al cyMembrane.
  cyMembrane.nodes().forEach(n => {
    const p = _positionCache.get(n.id());
    if (p) n.position(p);
  });
}

function _cytoscapeStyle() {
  return [
    { selector: 'node', style: {
      'background-color': 'data(color)',
      'width': 'data(radius)', 'height': 'data(radius)',
      'label': 'data(label)',
      'color': '#d0d0d8', 'font-family': 'monospace', 'font-size': 9, 'font-weight': 400,
      'text-valign': 'bottom', 'text-halign': 'center', 'text-margin-y': 4,
      'text-opacity': 0,  // por defecto oculto
      'text-wrap': 'wrap', 'text-max-width': 90,
      'border-width': 0,
      'transition-property': 'opacity, border-width, shadow-blur, shadow-opacity',
      'transition-duration': '180ms',
    }},
    // Hubs: labels visibles, tamaño mediano, glow suave.
    { selector: 'node.hub', style: {
      'label': 'data(label)',
      'text-opacity': 0.9,
      'font-size': 11,
      'font-weight': 'bold',
      'shadow-blur': 18,
      'shadow-opacity': 0.4,
    }},
    // Nucleo Akira: rojo, grande, glow fuerte.
    { selector: 'node.core', style: {
      'background-color': '#ef4444', 'background-opacity': 1.0,
      'width': 60, 'height': 60,
      'label': 'data(label)',
      'text-opacity': 1,
      'color': '#ffffff', 'font-size': 14, 'font-weight': 'bold',
      'border-width': 3, 'border-color': '#ffffff',
      'shadow-blur': 45, 'shadow-color': '#ef4444', 'shadow-opacity': 0.9,
    }},
    // Hover / seleccion.
    { selector: 'node:selected', style: {
      'border-width': 2, 'border-color': '#ffffff',
      'text-opacity': 1, 'color': '#ffffff', 'font-weight': 'bold', 'font-size': 12,
      'shadow-blur': 24, 'shadow-color': '#ffffff', 'shadow-opacity': 0.5,
    }},
    { selector: 'node.highlighted', style: {
      'border-width': 1.5, 'border-color': '#ffffff',
      'text-opacity': 1, 'color': '#ffffff',
      'shadow-blur': 16, 'shadow-color': '#ffffff', 'shadow-opacity': 0.35,
    }},
    { selector: 'node.dimmed', style: { 'opacity': 0.15, 'text-opacity': 0.05 }},
    // Aristas.
    { selector: 'edge', style: {
      'width': 'data(width)', 'line-color': '#5a5a70',
      'curve-style': 'straight', 'opacity': 0.4,
      'transition-property': 'opacity, line-color', 'transition-duration': '180ms',
    }},
    { selector: 'edge.to-core', style: { 'line-color': '#8a5a5a', 'opacity': 0.45 }},
    { selector: 'edge.highlighted', style: { 'opacity': 0.9, 'line-color': '#b8b8d0' }},
    { selector: 'edge.dimmed', style: { 'opacity': 0.05 }},
  ];
}

// Layout de fallback si el usuario pulsa "Reorganizar".
function _layoutFallbackOptions(animate) {
  if (typeof window.cytoscapeCoseBilkent === "function") {
    return {
      name: 'cose-bilkent', animate: !!animate ? 'end' : false,
      animationDuration: 800, animationEasing: 'ease-out', quality: 'default',
      nodeRepulsion: 40000, idealEdgeLength: 160, edgeElasticity: 0.35,
      nestingFactor: 0.1, gravity: 0.1, numIter: 2500, tile: false,
      randomize: false, nodeDimensionsIncludeLabels: false, fit: true, padding: 60,
    };
  }
  return {
    name: 'cose', animate: !!animate, animationDuration: 600, animationEasing: 'ease-out',
    randomize: false, nodeRepulsion: 80000, idealEdgeLength: 150, edgeElasticity: 0.4,
    nestingFactor: 0.1, gravity: 0.3, numIter: 1500, initialTemp: 200,
    coolingFactor: 0.95, minTemp: 1.0, fit: true, padding: 60,
    nodeOverlap: 20, componentSpacing: 80,
  };
}

function initMembraneGraph() {
  const container = document.getElementById('membraneCy');
  if (!container) return;
  const rect = container.parentElement.getBoundingClientRect();
  if (rect.width < 50 || rect.height < 50) return;
  if (typeof window.cytoscape === 'undefined') {
    container.innerHTML = '<div style="color:#ef4444;padding:20px;font-family:monospace;text-align:center">No se pudo cargar Cytoscape.js</div>';
    return;
  }
  if (cyMembrane) { cyMembrane.resize(); refreshMembrane(true); return; }
  try {
    cyMembrane = window.cytoscape({
      container: container, style: _cytoscapeStyle(),
      layout: { name: 'preset' },
      minZoom: 0.15, maxZoom: 4.0, wheelSensitivity: 0.25,
      boxSelectionEnabled: false, selectionType: 'single',
      autounselectify: false, autoungrabify: false,
    });
    cyMembrane.on('tap', 'node', (evt) => { _highlightNeighbors(evt.target); });
    cyMembrane.on('mouseover', 'node', (evt) => {
      if (cyMembrane.elements(':selected').length > 0) return;
      _highlightNeighbors(evt.target);
      evt.target.style('text-opacity', 1);
    });
    cyMembrane.on('mouseout', 'node', (evt) => {
      if (cyMembrane.elements(':selected').length > 0) return;
      cyMembrane.elements().removeClass('dimmed').removeClass('highlighted');
      // restaura opacidad de label segun clase
      cyMembrane.nodes().forEach(n => {
        if (n.hasClass('core') || n.hasClass('hub')) n.style('text-opacity', n.hasClass('core') ? 1 : 0.9);
        else n.style('text-opacity', 0);
      });
    });
    cyMembrane.on('tap', (evt) => {
      if (evt.target === cyMembrane) {
        cyMembrane.elements().unselect();
        cyMembrane.elements().removeClass('dimmed').removeClass('highlighted');
        cyMembrane.nodes().forEach(n => {
          if (n.hasClass('core') || n.hasClass('hub')) n.style('text-opacity', n.hasClass('core') ? 1 : 0.9);
          else n.style('text-opacity', 0);
        });
      }
    });
    cyMembrane.on('dbltap', (evt) => {
      if (evt.target === cyMembrane) { cyMembrane.fit(undefined, 60); cyMembrane.center(); }
    });
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => { if (cyMembrane) cyMembrane.resize(); });
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
  cyMembrane.elements().removeClass('highlighted').removeClass('dimmed');
  cyMembrane.elements().forEach(el => {
    if (neighborhood.contains(el)) el.addClass('highlighted');
    else el.addClass('dimmed');
  });
}

// "Reorganizar": vuelve a ejecutar el seed desde cero (como Graph Spawn).
window.reorganizeMembrane = function () {
  if (!cyMembrane) return;
  _positionCache.clear();
  refreshMembrane(true);
};

// Opcional: layout de fuerzas sobre las posiciones ya sembradas (por si se quiere "respirar").
window.forceRelaxMembrane = function () {
  if (!cyMembrane) return;
  try {
    const layout = cyMembrane.layout(_layoutFallbackOptions(true));
    layout.run();
    layout.on('layoutstop', function(){ try { cyMembrane.fit(undefined, 60); } catch(_){} });
  } catch (e) { console.warn("[membrane] forceRelax fallo:", e); }
};

async function refreshMembrane(force) {
  if (!cyMembrane || membraneFetching) return;
  if (!force && Date.now() - membraneLastFetch < MEMBRANE_REFRESH_MS) return;
  membraneFetching = true; membraneLastFetch = Date.now();
  try {
    const data = await _fetchJson("/api/v8/graph/overview");
    if (data && data.ok) { _applyGraphToCy(data); membraneError = null; }
  } catch (e) { membraneError = String(e && e.message ? e.message : e); }
  finally { membraneFetching = false; }
}

function _applyGraphToCy(data) {
  if (!cyMembrane) return;
  const nodes = data.nodes || [], edges = data.edges || [];

  // Detectar nucleo Akira por label.
  let coreId = null;
  for (const n of nodes) {
    if (String(n.label || "").trim().toLowerCase() === "akira") { coreId = n.id; break; }
  }

  // Grado de cada nodo (para elegir hubs y calcular tamaños).
  const degree = {};
  for (const e of edges) {
    degree[e.from_node] = (degree[e.from_node] || 0) + 1;
    degree[e.to_node] = (degree[e.to_node] || 0) + 1;
  }

  // Detectar hubs: nodo de mayor grado por grupo.
  const groupsMap = new Map();
  for (const n of nodes) {
    if (n.id === coreId) continue;
    const g = _detectGroup(n);
    if (!groupsMap.has(g)) groupsMap.set(g, []);
    groupsMap.get(g).push(n);
  }
  const hubIds = new Set();
  groupsMap.forEach(groupNodes => {
    let best = null, bestDeg = -1;
    for (const n of groupNodes) {
      const d = degree[n.id] || 0;
      if (d > bestDeg) { bestDeg = d; best = n.id; }
    }
    if (best) hubIds.add(best);
  });

  // Construir elementos de Cytoscape.
  const nodeIds = new Set();
  const cyElements = [];
  for (const n of nodes) {
    nodeIds.add(n.id);
    const isCore = (n.id === coreId);
    const isHub = hubIds.has(n.id);
    const group = _detectGroup(n);
    const color = isCore ? "#ef4444" : (GROUP_COLORS[group] || GROUP_COLORS.other);
    const deg = degree[n.id] || 0;

    let radius;
    if (isCore) radius = 60;
    else if (isHub) radius = Math.min(34, 22 + Math.min(deg, 8));
    else {
      // Satelite: tamaño segun grado (interpolacion).
      const baseR = 11;
      const bonus = Math.min(deg * 1.2, 10);
      radius = Math.min(24, baseR + bonus);
    }

    let classes = [];
    if (isCore) classes.push('core');
    if (isHub) classes.push('hub');

    cyElements.push({
      group: 'nodes',
      data: {
        id: n.id,
        label: _abbreviateLabel(n.id, n.label),
        group: group,
        node_type: n.node_type,
        color: color,
        weight: n.weight || 0,
        reuse_count: n.reuse_count || 0,
        radius: radius,
        is_hub: isHub,
        is_core: isCore,
      },
      classes: classes.join(' '),
    });
  }

  const visibleEdges = _filterEdgesByRelevance(edges, nodeIds, coreId);
  for (const e of visibleEdges) {
    const w = Number(e.weight) || 0;
    const toCore = coreId && (e.to_node === coreId || e.from_node === coreId);
    cyElements.push({
      group: 'edges',
      data: {
        id: e.id, source: e.from_node, target: e.to_node,
        weight: w, width: Math.min(3.0, 0.5 + w * 0.7),
        relation_type: e.relation_type,
      },
      classes: toCore ? 'to-core' : '',
    });
  }

  // Aplicar al grafo (diff).
  const existingIds = new Set();
  cyMembrane.elements().forEach(el => existingIds.add(el.id()));
  const newIds = new Set(cyElements.map(e => e.data.id));

  cyMembrane.batch(() => {
    existingIds.forEach(id => {
      if (!newIds.has(id)) {
        const el = cyMembrane.getElementById(id);
        if (el && !el.empty()) el.remove();
      }
    });
    const toAdd = cyElements.filter(e => !existingIds.has(e.data.id));
    if (toAdd.length > 0) cyMembrane.add(toAdd);
    cyElements.forEach(e => {
      if (existingIds.has(e.data.id)) {
        const el = cyMembrane.getElementById(e.data.id);
        if (el && !el.empty()) {
          el.data(e.data);
          // Actualizar clases dinamicamente.
          if (e.group === 'nodes') {
            el.classes = [];
            if (e.classes.indexOf('core') >= 0) el.addClass('core');
            if (e.classes.indexOf('hub') >= 0) el.addClass('hub');
          }
        }
      }
    });
  });

  // Calcular y aplicar posiciones (seed tipo Obsidian).
  const nodesForSeed = cyMembrane.nodes().map(n => ({ id: n.id(), label: n.data('label'), node_type: n.data('node_type') }));
  _applySeedPositions(nodesForSeed, edges, coreId, false);

  // Ajustar vista.
  try { cyMembrane.fit(undefined, 60); } catch(_) {}

  // Actualizar stats.
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
    else setTimeout(() => { if (cyMembrane) cyMembrane.resize(); }, 100);
  }
  if (section === "office" && document.getElementById("officeCanvas")) initOfficeFloor();
});
document.addEventListener("DOMContentLoaded", function () {
  setTimeout(function () {
    if (document.getElementById("membraneCy")) initMembraneGraph();
    if (document.getElementById("officeCanvas")) initOfficeFloor();
  }, 500);
});

// ===========================================================================
// OFICINA — sin cambios respecto a versiones anteriores
// ===========================================================================
let officeCanvas, officeCtx;
let officeBgImage = null, officeSheetImage = null;
let officeBgLoaded = false, officeSheetLoaded = false, officeLoadError = null;
let officeAgents = [], officeLastFetch = 0, officeFetching = false, officeAnimId = null;
const OFFICE_REFRESH_MS = 5000;
const spriteCache = {};

function initOfficeFloor() {
  officeCanvas = document.getElementById("officeCanvas");
  if (!officeCanvas) return;
  const rect = officeCanvas.parentElement.getBoundingClientRect();
  if (rect.width < 50 || rect.height < 50) return;
  officeCtx = officeCanvas.getContext("2d");
  officeCanvas.width = OFFICE_W; officeCanvas.height = OFFICE_H;
  officeCanvas.style.width = "auto"; officeCanvas.style.height = "auto";
  officeCanvas.style.maxWidth = "100%"; officeCanvas.style.maxHeight = "100%";
  officeCanvas.style.display = "block"; officeCanvas.style.imageRendering = "pixelated";
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
  } else drawOffice();
  refreshOffice(true);
}
function buildSpriteCache() {
  const img = officeSheetImage; if (!img) return;
  for (const role in SPRITE_RECTS) {
    const r = SPRITE_RECTS[role], w = r[2] - r[0], h = r[3] - r[1];
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const cx = c.getContext("2d");
    cx.imageSmoothingEnabled = false;
    cx.drawImage(img, r[0], r[1], w, h, 0, 0, w, h);
    spriteCache[role] = c;
  }
}
function _corridorOf(x, y) {
  const dh = Math.abs(y - H_Y), dl = Math.abs(x - VL_X);
  const dc = Math.abs(x - VC_X), dr = Math.abs(x - VR_X);
  const m = Math.min(dh, dl, dc, dr);
  if (m === dh) return "H"; if (m === dl) return "VL"; if (m === dc) return "VC"; return "VR";
}
function _vX(kind) { return kind === "VL" ? VL_X : (kind === "VC" ? VC_X : VR_X); }
function _buildPath(cx, cy, tx, ty) {
  const cCorr = _corridorOf(cx, cy), tCorr = _corridorOf(tx, ty), path = [];
  if (cCorr === "H" && tCorr === "H") path.push([tx, H_Y]);
  else if (cCorr === "H" && tCorr !== "H") { const vx = _vX(tCorr); path.push([vx, H_Y]); path.push([vx, ty]); }
  else if (cCorr !== "H" && tCorr === "H") { const vx = _vX(cCorr); path.push([vx, H_Y]); path.push([tx, H_Y]); }
  else {
    const vxC = _vX(cCorr), vxT = _vX(tCorr);
    if (vxC === vxT) path.push([vxC, ty]);
    else { path.push([vxC, H_Y]); path.push([vxT, H_Y]); path.push([vxT, ty]); }
  }
  return path;
}
function _pickRandomTarget() {
  const r = Math.random();
  if (r < 0.5) return [H_POINTS[Math.floor(Math.random() * H_POINTS.length)], H_Y];
  const vk = ["VL","VC","VR"][Math.floor(Math.random() * 3)];
  const vx = _vX(vk); const y = V_POINTS[Math.floor(Math.random() * V_POINTS.length)];
  return [vx, y];
}
function _ensureMovementState(a) {
  if (typeof a.x !== "number") { const h = HOME_POSITIONS[a.role] || [VC_X, 420]; a.x = h[0]; a.y = h[1]; }
  if (!a.path) a.path = [];
  if (typeof a.nextMoveAt !== "number") a.nextMoveAt = Date.now() + Math.random() * IDLE_WAIT_MS;
  if (typeof a.facing !== "string") a.facing = "idle";
}
function _updateAgentMovement(a) {
  const now = Date.now();
  if (a.status === "busy") {
    const home = HOME_POSITIONS[a.role] || [a.x, a.y];
    if (a.path.length === 0 && (Math.abs(a.x - home[0]) > 3 || Math.abs(a.y - home[1]) > 3))
      a.path = _buildPath(a.x, a.y, home[0], home[1]);
    if (a.path.length === 0 && now > a.nextMoveAt) a.nextMoveAt = now + BUSY_WAIT_MS;
  } else {
    if (a.path.length === 0 && now > a.nextMoveAt) {
      const t = _pickRandomTarget();
      a.path = _buildPath(a.x, a.y, t[0], t[1]);
      a.nextMoveAt = now + IDLE_WAIT_MS + Math.random() * 5000;
    }
  }
  if (a.path.length === 0) { a.facing = "idle"; return; }
  const target = a.path[0], dx = target[0] - a.x, dy = target[1] - a.y;
  const dist = Math.sqrt(dx*dx + dy*dy);
  if (dist < 2) { a.x = target[0]; a.y = target[1]; a.path.shift(); if (a.path.length === 0) a.facing = "idle"; return; }
  const step = Math.min(WALK_SPEED, dist);
  a.x += (dx/dist)*step; a.y += (dy/dist)*step;
  if (Math.abs(dx) > Math.abs(dy)) a.facing = dx > 0 ? "right" : "left";
  else a.facing = dy > 0 ? "down" : "up";
}
function drawOffice() {
  if (!officeCtx) return;
  const W = OFFICE_W, H = OFFICE_H;
  officeCtx.fillStyle = "#0b0b0e"; officeCtx.fillRect(0, 0, W, H);
  if (officeLoadError) {
    officeCtx.fillStyle = "#ef4444"; officeCtx.font = "20px monospace";
    officeCtx.textAlign = "center";
    officeCtx.fillText("Oficina: " + officeLoadError, W/2, H/2); return;
  }
  if (!officeBgLoaded || !officeSheetLoaded) {
    officeCtx.fillStyle = "#8a8a93"; officeCtx.font = "20px monospace";
    officeCtx.textAlign = "center";
    officeCtx.fillText("Cargando oficina...", W/2, H/2);
    officeAnimId = requestAnimationFrame(drawOffice); return;
  }
  officeCtx.drawImage(officeBgImage, 0, 0, W, H);
  const sorted = officeAgents.slice().sort((a, b) => {
    _ensureMovementState(a); _ensureMovementState(b); return a.y - b.y;
  });
  sorted.forEach(a => {
    _ensureMovementState(a); _updateAgentMovement(a);
    const role = a.role || "generic";
    const sprite = spriteCache[role];
    if (!sprite) return;
    const sw = sprite.width * SPRITE_SCALE, sh = sprite.height * SPRITE_SCALE;
    let bob = 0;
    const moving = a.facing && a.facing !== "idle";
    if (moving) bob = Math.sin(Date.now() * 0.02) * 1.2;
    else if (a.status === "busy") bob = Math.sin(Date.now() * 0.005) * 2;
    const dx = a.x - sw/2, dy = a.y - sh + bob;
    officeCtx.fillStyle = "rgba(0,0,0,0.35)";
    officeCtx.beginPath(); officeCtx.ellipse(a.x, a.y + 3, sw*0.4, 4, 0, 0, Math.PI*2); officeCtx.fill();
    officeCtx.drawImage(sprite, dx, dy, sw, sh);
    let ledColor = "#22c55e";
    if (a.status === "busy") ledColor = "#facc15";
    else if (a.status === "error") ledColor = "#ef4444";
    officeCtx.fillStyle = ledColor;
    officeCtx.fillRect(a.x + sw/2 - 4, dy - 6, 8, 8);
    officeCtx.strokeStyle = "#0b0b0e"; officeCtx.lineWidth = 2;
    officeCtx.strokeRect(a.x + sw/2 - 4, dy - 6, 8, 8);
    officeCtx.fillStyle = "rgba(11, 11, 14, 0.85)";
    const label = (a.name || "?").slice(0, 14);
    officeCtx.font = "bold 11px monospace";
    const tw = officeCtx.measureText(label).width;
    officeCtx.fillRect(a.x - tw/2 - 4, a.y + 8, tw + 8, 14);
    officeCtx.fillStyle = "#ececf1"; officeCtx.textAlign = "center";
    officeCtx.fillText(label, a.x, a.y + 19);
  });
  refreshOffice(false);
  officeAnimId = requestAnimationFrame(drawOffice);
}
async function refreshOffice(force) {
  if (officeFetching) return;
  if (!force && Date.now() - officeLastFetch < OFFICE_REFRESH_MS) return;
  officeFetching = true; officeLastFetch = Date.now();
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
  } catch (e) {} finally { officeFetching = false; }
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
  initMembraneGraph, initOfficeFloor, refreshMembrane, refreshOffice,
  addOfficeLog, updateOfficeStats,
  reorganize: window.reorganizeMembrane,
  forceRelax: window.forceRelaxMembrane,
};
