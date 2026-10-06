let _brainContextDragBound = false;
let _brainContextManualNodeId = null;

function _bindBrainContextDragging(){
  if(_brainContextDragBound) return;
  const panel = document.getElementById("brainContext");
  const stage = document.querySelector(".brain-stage");
  const head = panel && panel.querySelector(".brain-context-head");
  if(!panel || !stage || !head) return;
  _brainContextDragBound = true;

  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  head.addEventListener("pointerdown", function(ev){
    if(ev.target && ev.target.closest(".brain-context-close")) return;
    try { head.setPointerCapture(ev.pointerId); } catch(_) {}
    const panelRect = panel.getBoundingClientRect();
    offsetX = ev.clientX - panelRect.left;
    offsetY = ev.clientY - panelRect.top;
    dragging = true;
    head.classList.add("is-dragging");
    panel.dataset.brainDragging = "1";
    ev.preventDefault();
  });

  head.addEventListener("pointermove", function(ev){
    if(!dragging) return;
    const stageRect = stage.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();

    const minLeft = 8;
    const minTop = 8;
    const maxLeft = Math.max(minLeft, stageRect.width - panelRect.width - 8);
    const maxTop = Math.max(minTop, stageRect.height - panelRect.height - 8);

    const rawLeft = ev.clientX - stageRect.left - offsetX;
    const rawTop = ev.clientY - stageRect.top - offsetY;

    const left = Math.max(minLeft, Math.min(maxLeft, rawLeft));
    const top = Math.max(minTop, Math.min(maxTop, rawTop));

    panel.style.left = left + "px";
    panel.style.top = top + "px";
    panel.style.right = "auto";
    panel.style.bottom = "auto";
    panel.dataset.brainManualPosition = "1";
    _brainContextManualNodeId = panel.dataset.brainNodeId || null;
    ev.preventDefault();
  });

  const finishDrag = function(ev){
    if(!dragging) return;
    dragging = false;
    head.classList.remove("is-dragging");
    panel.dataset.brainDragging = "0";
    try { head.releasePointerCapture(ev.pointerId); } catch(_) {}
  };

  head.addEventListener("pointerup", finishDrag);
  head.addEventListener("pointercancel", finishDrag);
}

// AKIRA OBSIDIAN MEMBRANE + OFFICE FLOOR - V18.2 + OFFICE V1
// V18.2:
//   - MIN_EDGE_WEIGHT_VISIBLE bajado a 0.4.
//   - Excepcion: aristas al core SIEMPRE visibles.
//   - Layout relax con randomize:false despues del seed (respeta las flores).
//   - Orden correcto: seed -> relax -> fit -> center (fix de bug de orden).
//   - Variable membraneLayoutRunning para evitar dobles ejecuciones.
// V18.1: centerOnCore con cy.center(el), cache con firma, drags respetados.
// OFFICE V1:
//   - Seleccion tactil de agentes.
//   - Ficha C integrada dentro de la escena.
//   - Datos de ficha provenientes de /api/v8/agents.
//   - Movimiento visual NO representa actividad real del agente.

const AKIRA_API_BASE = "https://akira-empresa.onrender.com";
const OFFICE_BG_URL = "./assets/office/LargePixelOffice.png";
const OFFICE_SHEET_URL = "./assets/office/PixelOfficeAssets.png";
const OFFICE_W = 720, OFFICE_H = 630;

const SPRITE_RECTS = {
  researcher: [2, 105, 17, 128],
  memorizer: [19, 104, 38, 128],
  graph_builder: [40, 107, 53, 128],
  learner: [3, 132, 20, 155],
  internal: [22, 132, 39, 155],
};

const H_Y = 355, VL_X = 49, VC_X = 362, VR_X = 675;

const H_POINTS = [
  60, 130, 200, 270, 340,
  410, 480, 550, 620, 690
];

const V_POINTS = [
  380, 440, 500, 560, 610
];

const HOME_POSITIONS = {
  researcher: [VL_X, 420],
  memorizer: [VC_X, 420],
  graph_builder: [VR_X, 420],
  learner: [180, H_Y],
  internal: [540, H_Y],
};

const SPRITE_SCALE = 2;
const WALK_SPEED = 0.9;
const IDLE_WAIT_MS = 8000;
const BUSY_WAIT_MS = 4000;

const GROUP_COLORS = {
  memory:   "#7ee787",
  learning: "#56d4dd",
  agent:    "#f778ba",
  tool:     "#79c0ff",
  concept:  "#a78bfa",
  project:  "#ffa657",
  document: "#d2a8ff",
  skill:    "#ffd866",
  error:    "#ff7b72",
  solution: "#56d364",
  mission:  "#ffb86c",
  other:    "#8b949e",
};

// 2D shares the 3D neural language: cool luminous nodes, with Akira as the
// violet plasma nucleus. Semantic groups remain in the data; this palette is
// only the visual encoding for the 2D presentation.
const NEURAL_2D_PALETTE = [
  "#e8f7ff", "#cfeeff", "#d9d6ff", "#eee5ff",
  "#c8f4e2", "#f1f4ff", "#bfe8f5"
];

/*
 * Adaptive performance governor for the 2D Brain.
 * It never removes real data. It only reduces simulation work as the
 * number of rendered nodes grows. The current <=750-node profile preserves
 * the D.28 baseline exactly; larger graphs progressively use lighter physics.
 */
function _obsidianPerfProfile(nodeCount){
  const n=Math.max(0,Number(nodeCount)||0);
  if(n<=750){
    return {iterations: n>300 ? 2 : 3, gridRange:3, maxDistance:420, softDistance:220, radialSteps:52};
  }
  if(n<=1200){
    return {iterations:1, gridRange:3, maxDistance:380, softDistance:205, radialSteps:46};
  }
  if(n<=1800){
    return {iterations:1, gridRange:2, maxDistance:340, softDistance:190, radialSteps:40};
  }
  return {iterations:1, gridRange:2, maxDistance:300, softDistance:175, radialSteps:34};
}
function _neural2DColor(n, isCore){
  if(isCore) return "#7b61ff";
  const id = String(n && (n.id || n.label) || "");
  let hash = 0;
  for(let i=0;i<id.length;i++) hash=((hash<<5)-hash+id.charCodeAt(i))|0;
  return NEURAL_2D_PALETTE[Math.abs(hash)%NEURAL_2D_PALETTE.length];
}

function _brainFilterNodeVisible(cyNode) {
  if (!cyNode) return false;
  if (membraneBrainFilterGroup === "all") return true;
  if (cyNode.hasClass("core")) return true;
  if (String(cyNode.id()) === String(membraneSelectedBrainNodeId || "")) return true;
  return String(cyNode.data("group") || _detectGroup(cyNode.data())) === membraneBrainFilterGroup;
}

function _brainRelationFilterMatches(cyEdge) {
  if (!cyEdge) return false;
  if (membraneBrainRelationFilter === "all") return true;
  return String(cyEdge.data("relation_type") || "related_to").toLowerCase() === membraneBrainRelationFilter;
}

function _brainActiveNodeVisible(cyNode) {
  if (!_brainFilterNodeVisible(cyNode)) return false;
  if (membraneBrainRelationFilter === "all" || cyNode.hasClass("core") ||
      String(cyNode.id()) === String(membraneSelectedBrainNodeId || "")) return true;
  return cyMembrane && cyMembrane.edges().some(e =>
    _brainRelationFilterMatches(e) &&
    (String(e.data("source")) === String(cyNode.id()) ||
     String(e.data("target")) === String(cyNode.id()))
  );
}

let membraneExploreDepth = 0;
let membraneExploreVisibleNodeIds = new Set();
let membraneExploreVisibleLinkIds = new Set();

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
    if (
      typeof window.cytoscape !== "undefined" &&
      typeof window.cytoscapeCoseBilkent === "function"
    ) {
      window.cytoscape.use(window.cytoscapeCoseBilkent);
    }
  } catch(e) {
    console.warn(
      "[membrane] cose-bilkent registro fallo:",
      e
    );
  }
})();

function _authHeaders() {
  if (typeof window.akiraAuthHeaders === "function") {
    try {
      return window.akiraAuthHeaders();
    } catch (_) {
      return {};
    }
  }

  return {};
}

async function _fetchPublicJson(url) {
  const full =
    url.indexOf("http") === 0
      ? url
      : (AKIRA_API_BASE + url);
  const bust =
    full +
    (full.indexOf("?") >= 0 ? "&" : "?") +
    "_=" +
    Date.now();
  // Keep the public graph request a simple GET: no custom headers means
  // browsers can avoid an unnecessary CORS preflight on the public fallback.
  const r = await fetch(bust, {
    cache: "no-store"
  });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return await r.json();
}

async function _fetchJson(url, handleAuthFailure = true) {
  const full =
    url.indexOf("http") === 0
      ? url
      : (AKIRA_API_BASE + url);

  const bust =
    full +
    (full.indexOf("?") >= 0 ? "&" : "?") +
    "_=" +
    Date.now();

  const r = await fetch(
    bust,
    {
      headers: _authHeaders()
    }
  );

  if (!r.ok) {
    try {
      if (handleAuthFailure && r.status === 401 && typeof window.akiraHandleAuthFailure === "function") {
        window.akiraHandleAuthFailure(401);
      }
    } catch (_) {}
    throw new Error("HTTP " + r.status);
  }

  return await r.json();
}

// ===========================================================================
// CEREBRO AKIRA — V18.2
// ===========================================================================

let cyMembrane = null;

let membraneLastFetch = 0;
let membraneFetching = false;

let membraneCounts = {
  nodes: 0,
  edges: 0,
  by_type: {},
  by_relation: {}
};

let membraneError = null;
let membranePublicMode = false;
let membraneLayoutRunning = false;
let _communityState = null;
let membraneBrainFilterGroup = "all";
let membraneBrainRelationFilter = "all";
let membraneSelectedBrainNodeId = null;
let membraneResizeTimer = null;
let membraneCorePulseTimer = null;

const MEMBRANE_REFRESH_MS = 7000;
const MIN_EDGE_WEIGHT_VISIBLE = 0;
const MAX_EDGES_PER_NODE = 9999;
const MAX_NODES_PER_CLUSTER = 10;

const _positionCache = new Map();
let _lastGraphSignature = "";

// Obsidian-style force graph state. Cytoscape remains the renderer and
// interaction surface; d3-force supplies the global physics simulation.
let _obsidianForceSimulation = null;
let _obsidianForceNodeById = new Map();
let _obsidianPhysicsBound = false;
let _obsidianForceGeneration = 0;
let _obsidianSyncRaf = null;
let _obsidianInitialFitDone = false;
const OBSIDIAN_FORCE_DEFAULTS = {
  center: 0.010,
  repel: -240,
  linkForce: 0.075,
  linkDistance: 155,
  collisionGap: 30
};

let _labelCounter = null;
let _labelMax = 0;

function _getLabelCounter() {
  if (_labelCounter) return _labelCounter;

  try {
    _labelCounter = JSON.parse(
      localStorage.getItem("akira_label_counter") || "{}"
    );
  } catch(_) {
    _labelCounter = {};
  }

  return _labelCounter;
}

function _saveLabelCounter() {
  try {
    localStorage.setItem(
      "akira_label_counter",
      JSON.stringify(_labelCounter)
    );
  } catch(_) {}
}

function _labelForId(id, fallback) {
  const counter = _getLabelCounter();

  if (!counter[id]) {
    const vals = Object.values(counter).map(Number);

    _labelMax =
      (vals.length
        ? Math.max.apply(null, vals)
        : 0) + 1;

    counter[id] = _labelMax;

    _saveLabelCounter();
  }

  return counter[id] +
    (fallback ? " · " + fallback : "");
}

function _abbreviateLabel(id, label) {
  if (!label && !id) return "";

  const s = String(label || "");
  const i = String(id || "");

  if (s.trim().toLowerCase() === "akira") {
    return "Akira";
  }

  if (s.startsWith("memory:mem_")) {
    return _labelForId(i, "mem");
  }

  if (s.startsWith("learning:")) {
    return _labelForId(i, "learn");
  }

  if (s.startsWith("agent:")) {
    return _labelForId(i, s.slice(6));
  }

  if (s.startsWith("tool:")) {
    return _labelForId(i, s.slice(5));
  }

  if (i.startsWith("node_")) {
    return _labelForId(
      i,
      s.slice(0, 14)
    );
  }

  if (s.length > 20) {
    return s.slice(0, 18) + "…";
  }

  return s;
}

// V18.2: excepcion para aristas del core
// siempre visibles, sin importar el peso.
function _filterEdgesByRelevance(
  edges,
  nodeIds,
  coreId
) {
  const byNode = new Map();

  for (const e of edges) {
    if (
      !nodeIds.has(e.from_node) ||
      !nodeIds.has(e.to_node)
    ) {
      continue;
    }

    const w = Number(e.weight) || 0;

    const isCoreEdge =
      coreId &&
      (
        e.from_node === coreId ||
        e.to_node === coreId
      );

    if (
      w < MIN_EDGE_WEIGHT_VISIBLE &&
      !isCoreEdge
    ) {
      continue;
    }

    for (const nid of [
      e.from_node,
      e.to_node
    ]) {
      if (!byNode.has(nid)) {
        byNode.set(nid, []);
      }

      byNode.get(nid).push({
        edge: e,
        weight: w
      });
    }
  }

  const keep = new Set();

  byNode.forEach((list, nid) => {
    list.sort(
      (a, b) => b.weight - a.weight
    );

    if (nid === coreId) {
      list.forEach(item => {
        keep.add(item.edge.id);
      });
    } else {
      list
        .slice(0, MAX_EDGES_PER_NODE)
        .forEach(item => {
          keep.add(item.edge.id);
        });
    }
  });

  return edges.filter(e => keep.has(e.id));
}

function _subdivideGroup(ids) {
  if (
    ids.length <= MAX_NODES_PER_CLUSTER
  ) {
    return [ids];
  }

  const nSub =
    Math.ceil(
      ids.length / MAX_NODES_PER_CLUSTER
    );

  const perSub =
    Math.ceil(ids.length / nSub);

  const subs = [];

  for (
    let i = 0;
    i < nSub;
    i++
  ) {
    const slice =
      ids.slice(
        i * perSub,
        (i + 1) * perSub
      );

    if (slice.length) {
      subs.push(slice);
    }
  }

  return subs;
}

function _computeSeedPositions(
  nodes,
  edges,
  coreId
) {
  try { cyMembrane.resize(); } catch(_) {}
  const normalizedCoreId = coreId == null ? null : String(coreId);
  const W = cyMembrane.width() || 800;
  const H = cyMembrane.height() || 600;
  const cx = W / 2;
  const cy = H / 2;
  const positions = {};

  if (coreId) {
    positions[normalizedCoreId] = { x: cx, y: cy };
  }

  const assignments =
    _communityState &&
    _communityState.assignments instanceof Map
      ? _communityState.assignments
      : null;

  const degree = new Map();
  for (const e of edges) {
    degree.set(e.from_node, (degree.get(e.from_node) || 0) + 1);
    degree.set(e.to_node, (degree.get(e.to_node) || 0) + 1);
  }

  const clustersMap = new Map();
  for (const n of nodes) {
    if (String(n.id) === normalizedCoreId) continue;
    const key = assignments
      ? (assignments.get(String(n.id)) || _detectGroup(n))
      : _detectGroup(n);
    if (!clustersMap.has(key)) clustersMap.set(key, []);
    clustersMap.get(key).push(n.id);
  }

  const clusters = [...clustersMap.entries()].map(([key, ids]) => ({key, ids}));
  clusters.sort(
    (a, b) =>
      b.ids.length - a.ids.length ||
      String(a.key).localeCompare(String(b.key))
  );

  const N = clusters.length;
  const baseRadius = Math.max(0.42 * Math.min(W, H), 150);
  const petalGap = Math.min(54, Math.max(24, 180 / Math.max(N, 1)));

  clusters.forEach(({key, ids}, i) => {
    const angle =
      (i / Math.max(N, 1)) * 2 * Math.PI - Math.PI / 2 +
      (i % 2 ? 0.035 : -0.02);
    const radialPulse = 1 + 0.06 * Math.sin(i * 2.17);
    const clusterR =
      Math.min(230, 48 + Math.sqrt(Math.max(ids.length, 1)) * 18);
    const petalDistance =
      baseRadius + Math.min(90, ids.length * 1.6) + petalGap;
    const hubX =
      cx + petalDistance * radialPulse * Math.cos(angle);
    const hubY =
      cy + petalDistance * radialPulse * Math.sin(angle);

    let hubId = ids[0];
    let hubScore = -1;
    for (const id of ids) {
      const d = degree.get(id) || 0;
      const n = nodes.find(x => String(x.id) === String(id));
      const score = d + (Number(n && n._importance) || 0) * 2;
      if (score > hubScore) {
        hubScore = score;
        hubId = id;
      }
    }

    positions[hubId] = {x: hubX, y: hubY};

    const satellites = ids.filter(id => id !== hubId);
    const golden = Math.PI * (3 - Math.sqrt(5));

    satellites.forEach((sid, j) => {
      const node = nodes.find(x => x.id === sid);
      const importance = Number(node && node._importance) || 0.25;
      const t = (j + 1) / Math.max(satellites.length, 1);
      const ring = clusterR * (0.58 + 0.42 * t);
      const r = ring *
        (1 - Math.min(0.16, importance * 0.10));
      const theta = j * golden + angle;

      positions[sid] = {
        x: hubX + r * Math.cos(theta),
        y: hubY + r * Math.sin(theta)
      };
    });
  });

  return positions;
}

function _obsidianHash(id){
  let h=2166136261;
  const s=String(id||"");
  for(let i=0;i<s.length;i++){
    h^=s.charCodeAt(i);
    h=Math.imul(h,16777619);
  }
  return h>>>0;
}

function _obsidianInitialPosition(id,index,center,total){
  const h=_obsidianHash(id);
  const golden=Math.PI*(3-Math.sqrt(5));
  const jitter=((h%1000)/1000-0.5)*0.12;
  const angle=index*golden + jitter;
  const scale=Math.max(1,Math.sqrt(Number(total)||1));
  // Virtual space grows with graph size. There is intentionally no viewport
  // clamp: Cytoscape is the camera, not the physical boundary of the Brain.
  const radius=150 + 78*Math.sqrt(index+1) + 24*scale;
  return {
    x:center.x + Math.cos(angle)*radius,
    y:center.y + Math.sin(angle)*radius
  };
}

function _seedObsidianGraph(nodes, coreId, center, edges){
  if(!cyMembrane) return;
  const list=nodes||[];
  const core=coreId==null ? null : String(coreId);
  const relations=edges||[];
  const edgeByNode=new Map();

  relations.forEach(e=>{
    const a=String(e.from_node);
    const b=String(e.to_node);
    if(a===b) return;

    if(!edgeByNode.has(a)) edgeByNode.set(a,[]);
    if(!edgeByNode.has(b)) edgeByNode.set(b,[]);

    const w=Math.max(0.02,Number(e.weight)||0.5);
    edgeByNode.get(a).push({id:b,weight:w});
    edgeByNode.get(b).push({id:a,weight:w});
  });

  const positionForId=id=>{
    const sim=_obsidianForceNodeById.get(String(id));
    if(sim && Number.isFinite(sim.x) && Number.isFinite(sim.y)){
      return {x:sim.x,y:sim.y};
    }

    const cached=_positionCache.get(String(id));
    if(cached && Number.isFinite(cached.x) && Number.isFinite(cached.y)){
      return {x:cached.x,y:cached.y};
    }

    const el=cyMembrane.getElementById(String(id));
    if(el && !el.empty()){
      const p=el.position();
      if(p && Number.isFinite(p.x) && Number.isFinite(p.y) &&
         Math.abs(p.x-center.x)+Math.abs(p.y-center.y)>3){
        return {x:p.x,y:p.y};
      }
    }

    return null;
  };

  try{
    list.forEach((raw,index)=>{
      const id=String(raw.id);
      const el=cyMembrane.getElementById(id);
      if(!el || el.empty()) return;

      if(id===core){
        el.position({x:center.x,y:center.y});
        return;
      }

      const prior=_obsidianForceNodeById.get(id);
      const cached=_positionCache.get(id);

      // Stable nodes never get reseeded.
      if(prior && Number.isFinite(prior.x) && Number.isFinite(prior.y)){
        el.position({x:prior.x,y:prior.y});
        return;
      }
      if(cached && Number.isFinite(cached.x) && Number.isFinite(cached.y)){
        el.position({x:cached.x,y:cached.y});
        return;
      }

      const neighbors=edgeByNode.get(id)||[];
      const validNeighbors=neighbors
        .map(rel=>({rel,pos:positionForId(rel.id)}))
        .filter(item=>item.pos);

      let p=null;

      if(validNeighbors.length){
        let sx=0, sy=0, sw=0;
        validNeighbors.forEach(item=>{
          const w=item.rel.weight;
          sx+=item.pos.x*w;
          sy+=item.pos.y*w;
          sw+=w;
        });

        const baseX=sx/(sw||1);
        const baseY=sy/(sw||1);
        const h=_obsidianHash(id);
        const golden=Math.PI*(3-Math.sqrt(5));
        const angle=(h%100000)/100000*Math.PI*2 + index*golden*0.07;
        const distance=core && validNeighbors.some(item=>String(item.rel.id)===core)
          ? 175 + (h%60)
          : 125 + (h%90);

        p={
          x:baseX+Math.cos(angle)*distance,
          y:baseY+Math.sin(angle)*distance
        };
      }else{
        p=_obsidianInitialPosition(id,index,center,list.length);
      }

      el.position(p);
      _positionCache.set(id,p);
    });
  }catch(e){
    console.warn("[membrane] Obsidian seed failed:",e);
  }
}

function _buildObsidianPhysicalLinks(edges, simById, maxPerNode=3){
  const ranked=new Map();

  (edges||[]).forEach(e=>{
    const a=String(e.from_node);
    const b=String(e.to_node);
    if(a===b || !simById.has(a) || !simById.has(b)) return;

    const item={
      source:a,
      target:b,
      id:String(e.id),
      weight:Math.max(0.02,Number(e.weight)||0.5)
    };

    if(!ranked.has(a)) ranked.set(a,[]);
    if(!ranked.has(b)) ranked.set(b,[]);

    ranked.get(a).push(item);
    ranked.get(b).push(item);
  });

  ranked.forEach(list=>list.sort((a,b)=>b.weight-a.weight));

  const keep=new Map();
  ranked.forEach(list=>{
    list.slice(0,Math.max(1,maxPerNode)).forEach(item=>{
      keep.set(item.id,item);
    });
  });

  return [...keep.values()];
}

function _syncObsidianNodesToCy(){
  if(!cyMembrane) return;
  if(_obsidianSyncRaf) return;
  _obsidianSyncRaf=requestAnimationFrame(()=>{
    _obsidianSyncRaf=null;
    try{
      cyMembrane.batch(()=>{
        _obsidianForceNodeById.forEach((n,id)=>{
          const el=cyMembrane.getElementById(String(id));
          if(el && !el.empty() && Number.isFinite(n.x) && Number.isFinite(n.y)){
            el.position({x:n.x,y:n.y});
          }
        });
      });
    }catch(_){}
  });
}

function _updateObsidianLabelFade(){
  if(!cyMembrane) return;
  const zoom=Number(cyMembrane.zoom()) || 1;
  const base=Math.max(0,Math.min(1,(zoom-0.62)/0.58));
  cyMembrane.nodes().forEach(n=>{
    if(n.hasClass("core")) {
      n.style("text-opacity",1);
    } else if(n.selected() || n.hasClass("highlighted") || n.hasClass("route")) {
      n.style("text-opacity",1);
    } else if(n.hasClass("hub")) {
      n.style("text-opacity",Math.max(0.22,Math.min(0.95,base+0.20)));
    } else {
      n.style("text-opacity",Math.max(0,Math.min(0.78,base)));
    }
  });
}

function _bindObsidianPhysicsInteractions(){
  if(_obsidianPhysicsBound || !cyMembrane) return;
  _obsidianPhysicsBound=true;

  // Pointer drag is intentionally owned by the lightweight elastic controller
  // below. This prevents D3 and Cytoscape from fighting over the same node.
  cyMembrane.on("zoom",()=>_updateObsidianLabelFade());
}


function _runObsidianFallbackPhysics(nodes, edges, coreId, restart=true){
  if(!cyMembrane) return false;

  try{ cyMembrane.resize(); }catch(_){}

  const W=cyMembrane.width()||800;
  const H=cyMembrane.height()||600;
  const center={x:W/2,y:H/2};
  const core=coreId ? String(coreId) : null;

  if(_obsidianForceSimulation){
    try{ _obsidianForceSimulation.stop(); }catch(_){}
  }
  if(_obsidianSyncRaf){
    try{ cancelAnimationFrame(_obsidianSyncRaf); }catch(_){}
    _obsidianSyncRaf=null;
  }

  const priorNodes=new Map(_obsidianForceNodeById);

  const simNodes=(nodes||[]).map((raw,index)=>{
    const id=String(raw.id);
    const el=cyMembrane.getElementById(id);
    const prior=priorNodes.get(id);
    const cached=_positionCache.get(id);
    const existing=el && !el.empty() ? el.position() : null;

    let p=null;

    if(prior && Number.isFinite(prior.x) && Number.isFinite(prior.y)){
      p={x:prior.x,y:prior.y};
    }else if(cached && Number.isFinite(cached.x) && Number.isFinite(cached.y)){
      p={x:cached.x,y:cached.y};
    }else if(existing && Number.isFinite(existing.x) && Number.isFinite(existing.y) &&
             Math.abs(existing.x-center.x)+Math.abs(existing.y-center.y)>2){
      p=existing;
    }else{
      p=_obsidianInitialPosition(id,index,center,nodes.length);
    }

    const degree=el && !el.empty() ? el.connectedEdges().length : 0;
    const radius=Math.max(8,Math.min(34,
      Number(el && el.data("radius")) || (10 + Math.min(degree*0.9,9))
    ));

    const sim={
      id,
      x:p.x,
      y:p.y,
      r:radius,
      degree,
      isCore:id===core,
      vx:0,
      vy:0,
      fx:null,
      fy:null,
      __raw:raw
    };

    if(sim.isCore){
      sim.fx=center.x;
      sim.fy=center.y;
      sim.x=center.x;
      sim.y=center.y;
    }

    return sim;
  });

  const simById=new Map(simNodes.map(n=>[n.id,n]));
  const simLinks=_buildObsidianPhysicalLinks(edges,simById,3);

  const neighbors=new Map();
  simNodes.forEach(n=>neighbors.set(n.id,[]));

  simLinks.forEach(l=>{
    const a=simById.get(l.source);
    const b=simById.get(l.target);
    if(!a || !b) return;

    neighbors.get(a.id).push({node:b,weight:l.weight});
    neighbors.get(b.id).push({node:a,weight:l.weight});
  });

  const generation=++_obsidianForceGeneration;

  let alpha=restart ? 1 : 0.001;
  let alphaTarget=0;
  let stopped=!restart;
  let frameId=null;
  let coolingFrames=0;

  const controller={
    __backend:"akira-fallback-force",
    alphaTarget(value){
      if(arguments.length===0) return alphaTarget;
      alphaTarget=Math.max(0,Math.min(1,Number(value)||0));
      return controller;
    },
    restart(){
      if(generation!==_obsidianForceGeneration) return controller;
      stopped=false;
      alpha=Math.max(alpha,0.24);
      coolingFrames=0;
      schedule();
      return controller;
    },
    stop(){
      stopped=true;
      if(frameId){
        try{ cancelAnimationFrame(frameId); }catch(_){}
        frameId=null;
      }
      return controller;
    }
  };

  const gridCell=108;
  const gridRange=3;

  function step(){
    if(stopped || generation!==_obsidianForceGeneration) return false;

    const forces=new Map(
      simNodes.map(n=>[n.id,{x:0,y:0}])
    );
    const perf=_obsidianPerfProfile(simNodes.length);
    const gridRange=perf.gridRange;

    const grid=new Map();

    simNodes.forEach(n=>{
      const gx=Math.floor(n.x/gridCell);
      const gy=Math.floor(n.y/gridCell);
      const key=gx+","+gy;

      if(!grid.has(key)) grid.set(key,[]);
      grid.get(key).push(n);
    });

    // Local repulsion + collision. The viewport is deliberately not a wall:
    // the physical graph is free to expand beyond the visible camera.
    simNodes.forEach(a=>{
      const gx=Math.floor(a.x/gridCell);
      const gy=Math.floor(a.y/gridCell);

      for(let ox=-gridRange;ox<=gridRange;ox++){
        for(let oy=-gridRange;oy<=gridRange;oy++){
          const bucket=grid.get((gx+ox)+","+(gy+oy));
          if(!bucket) continue;

          for(const b of bucket){
            if(a.id>=b.id) continue;

            let dx=b.x-a.x;
            let dy=b.y-a.y;
            let d2=dx*dx+dy*dy;

            if(d2<0.0001){
              const h=_obsidianHash(a.id+"::"+b.id);
              const ang=(h%62831)/10000;
              dx=Math.cos(ang);
              dy=Math.sin(ang);
              d2=1;
            }

            const d=Math.sqrt(d2);
            if(d>perf.maxDistance) continue;

            const ux=dx/d;
            const uy=dy/d;

            const desired=a.r+b.r+34;

            if(d<desired){
              const overlap=desired-d;
              const push=(0.92 + overlap*0.012) * alpha;

              forces.get(a.id).x-=ux*push;
              forces.get(a.id).y-=uy*push;
              forces.get(b.id).x+=ux*push;
              forces.get(b.id).y+=uy*push;

            }else if(d<perf.softDistance){
              const soft=((perf.softDistance-d)/perf.softDistance)*0.020*alpha;
              forces.get(a.id).x-=ux*soft;
              forces.get(a.id).y-=uy*soft;
              forces.get(b.id).x+=ux*soft;
              forces.get(b.id).y+=uy*soft;
            }
          }
        }
      }
    });

    // Real links act like springs. Stronger links stay a little tighter.
    simLinks.forEach(link=>{
      const a=simById.get(link.source);
      const b=simById.get(link.target);
      if(!a || !b) return;

      let dx=b.x-a.x;
      let dy=b.y-a.y;
      const d=Math.sqrt(dx*dx+dy*dy)||1;

      const ideal=Math.max(
        72,
        OBSIDIAN_FORCE_DEFAULTS.linkDistance - Math.min(24,link.weight*18)
      );

      const stretch=d-ideal;
      const strength=0.0048*(0.75+Math.min(1.25,link.weight));

      const force=Math.max(-1.9,Math.min(1.9,stretch*strength))*alpha;
      const ux=dx/d;
      const uy=dy/d;

      forces.get(a.id).x+=ux*force;
      forces.get(a.id).y+=uy*force;
      forces.get(b.id).x-=ux*force;
      forces.get(b.id).y-=uy*force;
    });

    // Soft central gravity / centering. No rectangular boundary.
    simNodes.forEach(n=>{
      if(n.isCore) return;

      const dx=center.x-n.x;
      const dy=center.y-n.y;
      const d=Math.sqrt(dx*dx+dy*dy)||1;

      // The closer the graph is to the center, the softer the correction.
      const centerForce=Math.min(0.75,Math.max(0.01,(d-180)*0.0005))*alpha;

      forces.get(n.id).x+=dx/d*centerForce;
      forces.get(n.id).y+=dy/d*centerForce;

      // Slight degree-aware repulsion prevents hubs from swallowing leaves.
      const degree=Math.min(18,n.degree||0);
      const radialExtra=(0.010 + degree*0.0018)*alpha;
      forces.get(n.id).x-=dx/d*radialExtra;
      forces.get(n.id).y-=dy/d*radialExtra;
    });

    simNodes.forEach(n=>{
      if(n.isCore){
        n.x=center.x;
        n.y=center.y;
        n.vx=0;
        n.vy=0;
        return;
      }

      if(n.fx!=null){
        n.x=n.fx;
      }
      if(n.fy!=null){
        n.y=n.fy;
      }

      if(n.fx==null && n.fy==null){
        const f=forces.get(n.id);
        n.vx=(n.vx + f.x) * 0.80;
        n.vy=(n.vy + f.y) * 0.80;

        const speed=Math.sqrt(n.vx*n.vx+n.vy*n.vy);
        if(speed>12){
          const k=12/speed;
          n.vx*=k;
          n.vy*=k;
        }

        n.x+=n.vx;
        n.y+=n.vy;
      }else{
        n.vx*=0.45;
        n.vy*=0.45;
      }
    });

    alpha += (alphaTarget-alpha)*0.14;
    alpha*=0.94;

    _syncObsidianNodesToCy();

    if(alpha<0.004 && alphaTarget===0){
      stopped=true;
      return false;
    }

    return true;
  }

  function schedule(){
    if(frameId || stopped || generation!==_obsidianForceGeneration) return;

    frameId=requestAnimationFrame(()=>{
      frameId=null;
      if(stopped || generation!==_obsidianForceGeneration) return;

      // A few physics micro-steps per paint keeps convergence quick without
      // forcing a heavy full-frame loop on mobile.
      const iterations=_obsidianPerfProfile(simNodes.length).iterations;
      let alive=true;

      for(let i=0;i<iterations && alive;i++){
        alive=step();
      }

      if(alive){
        coolingFrames++;
        if(alpha<0.025 && alphaTarget===0 && coolingFrames>120){
          stopped=true;
        }else{
          schedule();
        }
      }
    });
  }

  _obsidianForceNodeById=simById;
  _obsidianForceSimulation=controller;

  if(restart){
    schedule();
  }

  // Match the D3 path's initial graph completion behavior.
  if(restart){
    setTimeout(()=>{
      if(generation!==_obsidianForceGeneration) return;

      const finish=()=>{
        if(generation!==_obsidianForceGeneration) return;

        try{
          simNodes.forEach(n=>_positionCache.set(n.id,{x:n.x,y:n.y}));
          _normalizeObsidianCloudAroundCore(core);
        }catch(_){}

        if(!_obsidianInitialFitDone){
          _obsidianInitialFitDone=true;
          setTimeout(()=>{
            try{
              if(cyMembrane){
                // Same camera rule as D3: never fit the graph and then
                // re-center Akira, because that makes the cloud appear on
                // one side of the viewport.
                if(core){
                  const el=cyMembrane.getElementById(core);
                  if(el && !el.empty()) cyMembrane.center(el);
                }
                _updateObsidianLabelFade();
              }
            }catch(_){}
          },80);
        }
      };

      // Give the controller enough time to cool. If the user interacts before
      // then, position cache is refreshed by subsequent ticks.
      const check=()=>{
        if(generation!==_obsidianForceGeneration) return;
        if(!stopped){
          setTimeout(check,120);
          return;
        }
        finish();
      };
      check();
    },40);
  }

  return true;
}


// Keep the non-core cloud visually centered on Akira after force convergence.
// D3 forceCenter centers the mean of all simulation nodes; with a pinned core
// and uneven topology, the visible non-core cloud can still be biased to one
// side. This translates the settled cloud as a whole without reseeding it.
function _normalizeObsidianCloudAroundCore(coreId){
  if(!cyMembrane || !_obsidianForceNodeById || !_obsidianForceNodeById.size){
    return false;
  }

  const coreIdString = coreId == null ? null : String(coreId);
  const core = coreIdString
    ? _obsidianForceNodeById.get(coreIdString)
    : [..._obsidianForceNodeById.values()].find(n=>n.isCore);

  if(!core || !Number.isFinite(core.x) || !Number.isFinite(core.y)){
    return false;
  }

  const movable = [..._obsidianForceNodeById.values()]
    .filter(n =>
      !n.isCore &&
      Number.isFinite(n.x) &&
      Number.isFinite(n.y)
    );

  if(movable.length < 2) return false;

  let sx = 0;
  let sy = 0;
  movable.forEach(n=>{
    sx += n.x;
    sy += n.y;
  });

  const centroid = {
    x: sx / movable.length,
    y: sy / movable.length
  };

  let dx = core.x - centroid.x;
  let dy = core.y - centroid.y;
  const magnitude = Math.sqrt(dx*dx + dy*dy);

  if(!Number.isFinite(magnitude) || magnitude < 2){
    return false;
  }

  // Avoid a huge visible teleport if a pathological graph arrives.
  const maxShift = 420;
  const scale = magnitude > maxShift ? maxShift / magnitude : 1;
  dx *= scale;
  dy *= scale;

  cyMembrane.batch(()=>{
    movable.forEach(n=>{
      n.x += dx;
      n.y += dy;
      n.vx = (Number(n.vx)||0) * 0.25;
      n.vy = (Number(n.vy)||0) * 0.25;

      _positionCache.set(n.id,{x:n.x,y:n.y});

      const el = cyMembrane.getElementById(String(n.id));
      if(el && !el.empty()){
        el.position({x:n.x,y:n.y});
      }
    });
  });

  return true;
}

function _runObsidianPhysics(nodes, edges, coreId, restart=true){
  if(!cyMembrane) return false;

  const hasD3=!!window.d3 &&
    typeof window.d3.forceSimulation==="function" &&
    typeof window.d3.forceManyBody==="function" &&
    typeof window.d3.forceLink==="function" &&
    typeof window.d3.forceCenter==="function" &&
    typeof window.d3.forceCollide==="function";

  try{ _bindObsidianPhysicsInteractions(); }catch(_){}
  try{ cyMembrane.resize(); }catch(_){}

  // Build a guaranteed visual seed before any optional physics backend.
  // This removes the "all nodes at 0,0" failure mode entirely.
  const W0=cyMembrane.width()||800;
  const H0=cyMembrane.height()||600;
  _seedObsidianGraph(nodes, coreId, {x:W0/2,y:H0/2}, edges);

  // D3 is preferred, but it is not a single point of failure.
  if(!hasD3){
    console.warn("[membrane] d3-force unavailable; using local Akira force engine");
    return _runObsidianFallbackPhysics(nodes, edges, coreId, restart);
  }
  const W=cyMembrane.width()||800;
  const H=cyMembrane.height()||600;
  const center={x:W/2,y:H/2};
  const core=coreId ? String(coreId) : null;

  if(_obsidianForceSimulation){
    try{ _obsidianForceSimulation.stop(); }catch(_){}
  }
  if(_obsidianSyncRaf){
    try{ cancelAnimationFrame(_obsidianSyncRaf); }catch(_){}
    _obsidianSyncRaf=null;
  }

  const priorNodes=new Map(_obsidianForceNodeById);
  const simNodes=(nodes||[]).map((raw,index)=>{
    const id=String(raw.id);
    const el=cyMembrane.getElementById(id);
    const prior=priorNodes.get(id);
    const cached=_positionCache.get(id);
    const existing=el && !el.empty() ? el.position() : null;
    let p=null;
    if(prior && Number.isFinite(prior.x) && Number.isFinite(prior.y)){
      p={x:prior.x,y:prior.y};
    }else if(cached && Number.isFinite(cached.x) && Number.isFinite(cached.y)){
      p={x:cached.x,y:cached.y};
    }else if(existing && Number.isFinite(existing.x) && Number.isFinite(existing.y) &&
             Math.abs(existing.x-center.x)+Math.abs(existing.y-center.y)>2){
      p=existing;
    }else{
      p=_obsidianInitialPosition(id,index,center);
    }

    const degree=el && !el.empty() ? el.connectedEdges().length : 0;
    const radius=Math.max(8,Math.min(34,
      Number(el && el.data("radius")) || (10 + Math.min(degree*0.9,9))
    ));
    const sim={
      id,
      x:p.x,
      y:p.y,
      r:radius,
      degree,
      isCore:id===core,
      __raw:raw
    };
    if(sim.isCore){
      sim.fx=center.x;
      sim.fy=center.y;
      sim.x=center.x;
      sim.y=center.y;
    }
    return sim;
  });

  const simById=new Map(simNodes.map(n=>[n.id,n]));
  const simLinks=_buildObsidianPhysicalLinks(edges,simById,3);

  const generation=++_obsidianForceGeneration;

  let simulation=null;
  try{
    simulation=window.d3.forceSimulation(simNodes)
      .force("link",
        window.d3.forceLink(simLinks)
          .id(d=>d.id)
          .distance(()=>{
            return OBSIDIAN_FORCE_DEFAULTS.linkDistance;
          })
          .strength(d=>{
            const a=d.source, b=d.target;
            const minDegree=Math.max(1,Math.min(a.degree||1,b.degree||1));
            return OBSIDIAN_FORCE_DEFAULTS.linkForce / minDegree;
          })
      )
      .force("charge",
        window.d3.forceManyBody()
          .strength(d=>{
            const degree=Math.min(18,d.degree||0);
            return OBSIDIAN_FORCE_DEFAULTS.repel * (1 + degree*0.018);
          })
          .distanceMin(18)
      )
      .force("center",
        window.d3.forceCenter(center.x,center.y)
      )
      // Very soft anchor: keeps the global cloud around Akira while the
      // stronger repel/collision forces preserve personal space.
      .force("anchor-x",
        window.d3.forceX(center.x).strength(0.0035)
      )
      .force("anchor-y",
        window.d3.forceY(center.y).strength(0.0035)
      )
      .force("collide",
        window.d3.forceCollide(d=>d.r + OBSIDIAN_FORCE_DEFAULTS.collisionGap)
          .strength(0.95)
          .iterations(2)
      )
      .velocityDecay(0.78)
      .alpha(1)
      .alphaDecay(nodes.length>300 ? 0.085 : 0.060)
      .alphaMin(0.015);
  }catch(e){
    console.warn("[membrane] d3-force runtime failure; using local Akira force engine:",e);
    return _runObsidianFallbackPhysics(nodes, edges, coreId, restart);
  }

  _obsidianForceNodeById=simById;
  _obsidianForceSimulation=simulation;

  simulation.on("tick",()=>{
    if(generation!==_obsidianForceGeneration) return;
    _syncObsidianNodesToCy();
  });

  simulation.on("end",()=>{
    if(generation!==_obsidianForceGeneration) return;
    _syncObsidianNodesToCy();
    try{
      simNodes.forEach(n=>_positionCache.set(n.id,{x:n.x,y:n.y}));

      // Final geometry correction: Akira remains the visual nucleus while
      // preserving all relative force-generated relationships.
      _normalizeObsidianCloudAroundCore(core);

      const finishCamera=()=>{
        try{
          if(!cyMembrane) return;
          const coreEl=core ? cyMembrane.getElementById(core) : cyMembrane.nodes(".core").first();
          if(coreEl && !coreEl.empty()){
            if(!_obsidianInitialFitDone){
              // Do NOT fit and then re-center: that combination changes the
              // camera origin after the force layout and makes the graph look
              // "volted". Akira is the stable visual anchor; zoom is manual.
              _obsidianInitialFitDone=true;
            }
            cyMembrane.center(coreEl);

            // Correct any residual pan introduced by a mobile/fullscreen resize.
            const rp=coreEl.renderedPosition();
            const w=cyMembrane.width()||800;
            const h=cyMembrane.height()||600;
            const dx=(w/2)-rp.x;
            const dy=(h/2)-rp.y;
            if(Math.abs(dx)>2 || Math.abs(dy)>2){
              const pan=cyMembrane.pan();
              cyMembrane.pan({x:pan.x+dx,y:pan.y+dy});
            }
          }
          _updateObsidianLabelFade();
        }catch(_){}
      };
      setTimeout(finishCamera,80);
    }catch(_){}
  });

  if(!restart){
    try{ simulation.stop(); }catch(_){}
  }

  return true;
}


function _installBrain2dE2EDebug() {
  try {
    if (
      typeof window === "undefined" ||
      !window.localStorage ||
      window.localStorage.getItem("akira_e2e_debug") !== "1"
    ) {
      return;
    }

    window.__akiraBrain2dDebug = function() {
      const stage = document.getElementById("brainStage");
      const width = cyMembrane ? (cyMembrane.width() || 0) : 0;
      const height = cyMembrane ? (cyMembrane.height() || 0) : 0;
      const nodes = cyMembrane
        ? cyMembrane.nodes().map(node => {
            const p = node.position();
            const rp = node.renderedPosition();
            return {
              id: String(node.id()),
              label: String(node.data("label") || ""),
              x: Number(p && p.x),
              y: Number(p && p.y),
              renderedX: Number(rp && rp.x),
              renderedY: Number(rp && rp.y),
              isCore: node.hasClass("core"),
            };
          }).filter(item =>
            Number.isFinite(item.x) &&
            Number.isFinite(item.y)
          )
        : [];

      const core = nodes.find(item => item.isCore) || null;
      const finiteDistances = core
        ? nodes
            .filter(item => !item.isCore)
            .map(item => Math.hypot(item.x - core.x, item.y - core.y))
            .filter(Number.isFinite)
        : [];

      return {
        engine:
          _obsidianForceSimulation &&
          typeof _obsidianForceSimulation.alpha === "function"
            ? "d3-force"
            : (_obsidianForceNodeById.size ? "akira-fallback-force" : "none"),
        simulationAlpha:
          _obsidianForceSimulation &&
          typeof _obsidianForceSimulation.alpha === "function"
            ? Number(_obsidianForceSimulation.alpha())
            : null,
        width,
        height,
        stageWidth: stage ? stage.getBoundingClientRect().width : 0,
        stageHeight: stage ? stage.getBoundingClientRect().height : 0,
        core,
        maxCoreDistance: finiteDistances.length
          ? Math.max(...finiteDistances)
          : 0,
        minCoreDistance: finiteDistances.length
          ? Math.min(...finiteDistances)
          : 0,
        nodes,
        selectedNodeId: membraneSelectedBrainNodeId,
        exploreDepth: membraneExploreDepth,
        visibleNodeCount: cyMembrane
          ? cyMembrane.nodes().filter(node => node.style("display") !== "none").length
          : 0,
        visibleEdgeCount: cyMembrane
          ? cyMembrane.edges().filter(edge => edge.style("display") !== "none").length
          : 0,
        publicMode: membranePublicMode,
      };
    };

    window.__akiraBrain2dNodePosition = function(id) {
      try {
        if(!cyMembrane) return null;
        const node = cyMembrane.getElementById(String(id));
        if(!node || node.empty()) return null;
        const p = node.position();
        return {
          id:String(node.id()),
          x:Number(p && p.x),
          y:Number(p && p.y)
        };
      } catch(_) {
        return null;
      }
    };

    window.__akiraBrain2dPausePhysics = function() {
      try {
        if(_obsidianForceSimulation && typeof _obsidianForceSimulation.stop === "function"){
          _obsidianForceSimulation.stop();
          return true;
        }
      } catch(_) {}
      // A completed D3 simulation is already stable; there is nothing to pause.
      return true;
    };

    window.__akiraBrain2dResumePhysics = function() {
      try {
        if(_obsidianForceSimulation && typeof _obsidianForceSimulation.alpha === "function"){
          _obsidianForceSimulation.alpha(0.12).restart();
          return true;
        }
      } catch(_) {}
      return false;
    };
  } catch (_) {}
}

function _forceFlowerPositions(nodes, edges, coreId, forceSeed=false) {
  if(!cyMembrane) return false;
  try { cyMembrane.resize(); } catch(_) {}

  const normalizedCoreId = coreId == null ? null : String(coreId);
  const W = cyMembrane.width() || 800;
  const H = cyMembrane.height() || 600;
  const cx = W / 2;
  const cy = H / 2;
  const coreEl = normalizedCoreId
    ? cyMembrane.getElementById(normalizedCoreId)
    : cyMembrane.nodes(".core").first();

  if(!coreEl || coreEl.empty()) return false;

  coreEl.position({x:cx,y:cy});

  // Preserve existing positions on ordinary graph growth. A full radial
  // reseed is reserved for explicit forceSeed calls (initial/resize rebuilds).
  if(!forceSeed && _positionCache.size > 0){
    return false;
  }

  const assignments = _communityState && _communityState.assignments instanceof Map
    ? _communityState.assignments
    : new Map();

  const score = n =>
    (Number(n.weight)||0) * 1.15 +
    (Number(n.reuse_count)||0) * 0.40 +
    (Number(n.confidence)||0) * 1.20 +
    (Number(n._importance)||0) * 2.0;

  // Radial hierarchy follows the real graph distance from Akira:
  // 1-hop knowledge stays closest, 2-hop knowledge goes farther, etc.
  // Within each hop we still sort by importance so the strongest nodes get
  // the cleanest positions. This makes "distance from Akira" meaningful
  // instead of being an arbitrary visual ordering.
  const adjacency = new Map();
  (edges || []).forEach(e=>{
    const a=String(e.from_node), b=String(e.to_node);
    if(!adjacency.has(a)) adjacency.set(a,[]);
    if(!adjacency.has(b)) adjacency.set(b,[]);
    adjacency.get(a).push(b);
    adjacency.get(b).push(a);
  });

  const hop = new Map();
  if(normalizedCoreId){
    hop.set(normalizedCoreId,0);
    const queue=[normalizedCoreId];
    for(let qi=0; qi<queue.length; qi++){
      const cur=queue[qi];
      const next=(adjacency.get(cur)||[]);
      for(const other of next){
        if(hop.has(other)) continue;
        hop.set(other,(hop.get(cur)||0)+1);
        queue.push(other);
      }
    }
  }

  const list = nodes
    .filter(n => String(n.id) !== normalizedCoreId)
    .slice()
    .sort((a,b)=>{
      const ha=hop.get(String(a.id)) ?? 99;
      const hb=hop.get(String(b.id)) ?? 99;
      return ha-hb || score(b)-score(a) || String(a.id).localeCompare(String(b.id));
    });

  if(!list.length) return false;

  const groups = new Map();
  list.forEach(n=>{
    const g=String(assignments.get(String(n.id)) || _detectGroup(n) || "other");
    if(!groups.has(g)) groups.set(g,[]);
    groups.get(g).push(n);
  });

  const groupEntries=[...groups.entries()]
    .sort((a,b)=>b[1].length-a[1].length || String(a[0]).localeCompare(String(b[0])));

  const groupAngles=new Map();
  groupEntries.forEach(([g],i)=>{
    groupAngles.set(
      g,
      -Math.PI/2 + (i / Math.max(1,groupEntries.length))*Math.PI*2
    );
  });

  const minDim=Math.max(360,Math.min(W,H));
  // Virtual graph space: the Brain is allowed to grow well beyond the
  // viewport. The viewport is a camera, not a physical wall.
  const spacing=Math.max(52,Math.min(60,minDim*0.0625));
  const coreSafe=155;
  const golden=Math.PI*(3-Math.sqrt(5));

  let ring=0;
  let usedInRing=0;
  const positions={};
  const preferredRadius=new Map();

  list.forEach((n,index)=>{
    const nodeHop=hop.get(String(n.id)) ?? 99;

    // Keep real graph layers separated. Nodes in the same hop can occupy
    // several concentric rings when that layer is dense.
    const desiredLayer = Math.max(0, Math.min(8, nodeHop-1));
    if(desiredLayer > ring){
      ring=desiredLayer;
      usedInRing=0;
    }

    let radiusForRing=Math.max(
      coreSafe + spacing,
      coreSafe + (ring+1)*spacing
    );
    let capacity=Math.max(
      8,
      Math.floor((2*Math.PI*radiusForRing)/(spacing*0.95))
    );

    if(usedInRing>=capacity){
      ring++;
      usedInRing=0;
      radiusForRing=coreSafe+(ring+1)*spacing;
      capacity=Math.max(
        8,
        Math.floor((2*Math.PI*radiusForRing)/(spacing*0.95))
      );
    }

    const r=coreSafe+(ring+1)*spacing;
    const ringCount=Math.max(8,capacity);
    const ringAngle=-Math.PI/2 + ((usedInRing + 0.37*Math.sin(index*golden))/ringCount)*Math.PI*2;
    const g=String(assignments.get(String(n.id)) || _detectGroup(n) || "other");
    const gAngle=groupAngles.get(g) ?? ringAngle;

    // Only a soft community bias is used. The global ring position still
    // distributes nodes around the full circumference.
    // Community identity is only a soft preference. Most of the angular
    // position comes from the global radial packing, so nodes distribute
    // around Akira instead of piling into one sector.
    let angle=ringAngle*0.90 + gAngle*0.10;

    // Tiny deterministic perturbation breaks rows without making the layout
    // noisy or random on every refresh.
    angle += 0.035*Math.sin(index*golden*7.0);

    positions[String(n.id)] = {
      x:cx + r*Math.cos(angle),
      y:cy + r*Math.sin(angle)
    };
    preferredRadius.set(String(n.id),r);

    usedInRing++;
  });

  positions[normalizedCoreId]={x:cx,y:cy};

  nodes.forEach(n=>{
    const id=String(n.id);
    const p=positions[id];
    if(!p) return;
    const el=cyMembrane.getElementById(id);
    if(el && !el.empty()) el.position(p);
    _positionCache.set(id,{x:p.x,y:p.y});
  });

  window.__akiraRadialTargets = {
    signature:_lastGraphSignature,
    coreId:normalizedCoreId,
    center:{x:cx,y:cy},
    groupAngles,
    preferredRadius,
    spacing,
    coreSafe
  };

  try { coreEl.position({x:cx,y:cy}); } catch(_) {}
  return true;
}

let _radialPhysicsRun = 0;
let _radialPhysicsTimer = null;

function _runFlowerPhysics(nodes, edges, coreId){
  if(!cyMembrane) return;
  const runId=++_radialPhysicsRun;

  if(_radialPhysicsTimer){
    try { cancelAnimationFrame(_radialPhysicsTimer); } catch(_) {}
    _radialPhysicsTimer=null;
  }

  const state=window.__akiraRadialTargets;
  if(!state) return;

  const normalizedCoreId=coreId == null ? null : String(coreId);
  const W=cyMembrane.width() || 800;
  const H=cyMembrane.height() || 600;
  const center=state.center || {x:W/2,y:H/2};
  const preferredRadius=state.preferredRadius instanceof Map
    ? state.preferredRadius
    : new Map();
  const groupAngles=state.groupAngles instanceof Map
    ? state.groupAngles
    : new Map();
  const coreSafe=Number(state.coreSafe)>0 ? Number(state.coreSafe) : 155;
  const spacing=Number(state.spacing)>0 ? Number(state.spacing) : 52;
  const assignments=_communityState && _communityState.assignments instanceof Map
    ? _communityState.assignments
    : new Map();

  const active=nodes.map(n=>{
    const id=String(n.id);
    if(id===normalizedCoreId) return null;
    const el=cyMembrane.getElementById(id);
    if(!el || el.empty()) return null;
    const p=el.position();
    const group=String(assignments.get(id) || _detectGroup(n) || "other");
    return {
      id,
      el,
      group,
      x:Number(p.x)||0,
      y:Number(p.y)||0,
      vx:0,
      vy:0,
      radius:Math.max(4,Math.min(24,(Number(el.width())||12)/2)),
      preferred:preferredRadius.get(id) || Math.max(
        110,
        Math.min(900, Math.sqrt(
          (Number(p.x)-center.x)*(Number(p.x)-center.x) +
          (Number(p.y)-center.y)*(Number(p.y)-center.y)
        ))
      )
    };
  }).filter(Boolean);

  if(active.length<2) return;

  const byId=new Map(active.map(n=>[n.id,n]));

  /*
   * Only the strongest few real links participate in the physics. The full
   * graph is still drawn; this sparse physical graph prevents 1200 springs
   * from collapsing the radial geometry.
   */
  const ranked=new Map();
  (edges||[]).forEach(e=>{
    const a=String(e.from_node);
    const b=String(e.to_node);
    const na=byId.get(a);
    const nb=byId.get(b);
    if(!na || !nb) return;

    const w=Number(e.weight)||0;
    if(!ranked.has(a)) ranked.set(a,[]);
    if(!ranked.has(b)) ranked.set(b,[]);
    ranked.get(a).push({other:b,weight:w});
    ranked.get(b).push({other:a,weight:w});
  });

  const physicalLinks=[];
  const seenLinks=new Set();
  ranked.forEach((list,id)=>{
    list.sort((a,b)=>b.weight-a.weight);
    list.slice(0,3).forEach(item=>{
      const key=[id,item.other].sort().join("::");
      if(seenLinks.has(key)) return;
      seenLinks.add(key);
      physicalLinks.push({
        a:byId.get(id),
        b:byId.get(item.other),
        weight:item.weight
      });
    });
  });

  // Core relations act as a soft radial anchor, not as a hard circle.
  const coreIdString=normalizedCoreId;
  const coreLinks=new Map();
  (edges||[]).forEach(e=>{
    if(!coreIdString) return;
    const a=String(e.from_node);
    const b=String(e.to_node);
    if(a!==coreIdString && b!==coreIdString) return;
    const other=a===coreIdString?b:a;
    const w=Number(e.weight)||0;
    const old=coreLinks.get(other);
    if(!old || w>old) coreLinks.set(other,w);
  });

  const STEPS=_obsidianPerfProfile(active.length).radialSteps;
  let step=0;

  const tick=()=>{
    if(runId!==_radialPhysicsRun || !cyMembrane) return;
    step++;

    const forces=new Map(active.map(n=>[n.id,{x:0,y:0}]));

    /*
     * Spatial grid: each node only checks nearby cells. This keeps the
     * repulsion scalable when the brain grows beyond the current 369 nodes.
     */
    const cellSize=52;
    const grid=new Map();
    active.forEach(n=>{
      const gx=Math.floor(n.x/cellSize);
      const gy=Math.floor(n.y/cellSize);
      const key=gx+","+gy;
      if(!grid.has(key)) grid.set(key,[]);
      grid.get(key).push(n);
    });

    // Every node owns a personal exclusion zone.
    active.forEach(a=>{
      const gx=Math.floor(a.x/cellSize);
      const gy=Math.floor(a.y/cellSize);

      for(let ox=-1;ox<=1;ox++){
        for(let oy=-1;oy<=1;oy++){
          const bucket=grid.get((gx+ox)+","+(gy+oy))||[];
          for(const b of bucket){
            if(a.id>=b.id) continue;

            let dx=b.x-a.x;
            let dy=b.y-a.y;
            let d=Math.sqrt(dx*dx+dy*dy);

            if(d<0.001){
              const seed=((a.id.length+11)*92821+(b.id.length+17)*68917)%6283;
              const ang=seed/1000;
              dx=Math.cos(ang);
              dy=Math.sin(ang);
              d=1;
            }

            // Small final breathing-room increase. The global radial
            // layout stays unchanged; only local node spacing gets wider.
            const desired=a.radius+b.radius+20;
            if(d<desired){
              const overlap=desired-d;
              const strength=0.72+Math.min(0.55,overlap/20);
              const ux=dx/d, uy=dy/d;
              forces.get(a.id).x-=ux*overlap*strength;
              forces.get(a.id).y-=uy*overlap*strength;
              forces.get(b.id).x+=ux*overlap*strength;
              forces.get(b.id).y+=uy*overlap*strength;
            } else if(d<desired+32){
              const soft=(desired+32-d)*0.025;
              const ux=dx/d, uy=dy/d;
              forces.get(a.id).x-=ux*soft;
              forces.get(a.id).y-=uy*soft;
              forces.get(b.id).x+=ux*soft;
              forces.get(b.id).y+=uy*soft;
            }
          }
        }
      }
    });

    active.forEach(n=>{
      const f=forces.get(n.id);
      const dx=n.x-center.x;
      const dy=n.y-center.y;
      const r=Math.sqrt(dx*dx+dy*dy)||1;

      // Radial equilibrium around Akira.
      let desired=n.preferred;
      const cw=coreLinks.get(n.id);
      if(cw!=null){
        // A real direct link may pull a node slightly inward, but it must
        // never collapse a whole layer toward Akira.
        desired=Math.max(
          coreSafe + spacing,
          desired - Math.min(80, Math.max(0,cw)*30)
        );
      }

      const radialError=desired-r;
      const radialForce=Math.max(-42,Math.min(42,radialError))*0.055;
      f.x+=(dx/r)*radialForce;
      f.y+=(dy/r)*radialForce;

      // Soft community orbiting force. It rotates a group toward its sector,
      // but it never creates a hard boundary or a pre-drawn petal.
      const ga=groupAngles.get(n.group);
      if(typeof ga==="number" && r>1){
        const current=Math.atan2(dy,dx);
        let diff=ga-current;
        while(diff>Math.PI) diff-=Math.PI*2;
        while(diff<-Math.PI) diff+=Math.PI*2;
        const tangential=Math.max(-0.08,Math.min(0.08,diff))*r*0.012;
        f.x+=(-dy/r)*tangential;
        f.y+=(dx/r)*tangential;
      }

      // Akira's exclusion radius is absolute.
      const minR=155+n.radius;
      if(r<minR){
        const push=(minR-r)*0.80;
        f.x+=(dx/r)*push;
        f.y+=(dy/r)*push;
      }
    });

    // Strong real relations create local cohesion.
    physicalLinks.forEach(link=>{
      const a=link.a, b=link.b;
      if(!a || !b) return;

      let dx=b.x-a.x;
      let dy=b.y-a.y;
      const d=Math.sqrt(dx*dx+dy*dy)||1;
      const ideal=72-Math.min(24,link.weight*16);
      const spring=Math.max(-2.5,Math.min(2.5,(d-ideal)*0.006));
      const ux=dx/d, uy=dy/d;

      forces.get(a.id).x+=ux*spring;
      forces.get(a.id).y+=uy*spring;
      forces.get(b.id).x-=ux*spring;
      forces.get(b.id).y-=uy*spring;
    });

    // Integrate with heavy damping: physical response, then stable rest.
    active.forEach(n=>{
      const f=forces.get(n.id);
      n.vx=(n.vx+f.x)*0.66;
      n.vy=(n.vy+f.y)*0.66;
      n.x+=n.vx;
      n.y+=n.vy;

      // No viewport clamp: coordinates may expand beyond the visible
      // canvas. Cytoscape's camera/pan/zoom handles what the user sees.
      n.el.position({x:n.x,y:n.y});
    });

    const coreEl=normalizedCoreId
      ? cyMembrane.getElementById(normalizedCoreId)
      : cyMembrane.nodes(".core").first();

    if(coreEl && !coreEl.empty()){
      coreEl.position({x:W/2,y:H/2});
    }

    if(step<STEPS){
      _radialPhysicsTimer=requestAnimationFrame(tick);
      return;
    }

    _radialPhysicsTimer=null;
    _positionCache.clear();
    active.forEach(n=>_positionCache.set(n.id,{x:n.x,y:n.y}));
    if(coreEl && !coreEl.empty()){
      coreEl.position({x:W/2,y:H/2});
      _positionCache.set(coreEl.id(),{x:W/2,y:H/2});
    }

    try{
      if(coreEl && !coreEl.empty()){
        coreEl.position({x:center.x,y:center.y});

        // On the first global build only, choose a comfortable camera zoom.
        // Do not call fit(): fitting the whole graph would compress an
        // expanding Brain back into the viewport.
        if(!window.__akiraRadialInitialViewportDone){
          const targetZoom = Math.max(
            0.45,
            Math.min(0.60, cyMembrane.maxZoom())
          );
          cyMembrane.zoom(targetZoom);
          cyMembrane.center(coreEl);
          window.__akiraRadialInitialViewportDone = true;
        }
      }
    }catch(_){}
  };

  _radialPhysicsTimer=requestAnimationFrame(tick);
}

function _brainContextEscape(value){
  return String(value ?? "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

function _renderBrainNodePortrait(node){
  if(!node) return "";
  const id=String(node.id || "");
  const label=String(node.label || node.id || "nodo");
  const group=String(_detectGroup(node) || "other");
  const isCore=label.trim().toLowerCase()==="akira";
  const accent=isCore ? "#7b61ff" : (GROUP_COLORS[group] || _neural2DColor(node,false));
  const importance=Math.max(0,Math.min(1,Number(node._importance)||0));
  const weight=Math.max(0,Number(node.weight)||0);
  const reuse=Math.max(0,Number(node.reuse_count)||0);
  const graph=window.__akiraMembraneGraphData;
  const degree=graph && Array.isArray(graph.edges) ? graph.edges.filter(e=>String(e.from_node)===id || String(e.to_node)===id).length : 0;
  const coreSize=isCore ? 28 : 18 + Math.min(10,importance*10);
  const ring1=34 + Math.min(14,degree*1.8);
  const ring2=48 + Math.min(18,reuse*2);
  const hash=_hashId(id);
  const phase=(hash%6283)/1000;
  const dot1x=75+Math.cos(phase)*ring1;
  const dot1y=50+Math.sin(phase)*ring1*0.52;
  const dot2x=75+Math.cos(phase+1.9)*ring2;
  const dot2y=50+Math.sin(phase+1.9)*ring2*0.52;
  const short=_brainContextEscape(label.length>24 ? label.slice(0,22)+"…" : label);
  const title=_brainContextEscape(label);
  return `
    <div style="margin:0 0 10px;padding:8px;border:2px solid var(--border);background:radial-gradient(circle at 50% 48%,rgba(123,97,255,.18),rgba(8,10,18,.96) 72%);border-radius:10px;overflow:hidden" title="Retrato visual de ${title}">
      <svg viewBox="0 0 150 100" width="100%" height="100" role="img" aria-label="Retrato visual de ${title}" style="display:block">
        <defs>
          <radialGradient id="bg-${hash}" cx="50%" cy="50%" r="70%"><stop offset="0%" stop-color="${accent}" stop-opacity=".20"/><stop offset="70%" stop-color="#111522" stop-opacity=".50"/><stop offset="100%" stop-color="#090b12" stop-opacity="1"/></radialGradient>
          <filter id="glow-${hash}" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <rect x="0" y="0" width="150" height="100" rx="8" fill="url(#bg-${hash})"/>
        <circle cx="75" cy="50" r="${ring2.toFixed(1)}" fill="none" stroke="${accent}" stroke-opacity=".14" stroke-width="1"/>
        <circle cx="75" cy="50" r="${ring1.toFixed(1)}" fill="none" stroke="${accent}" stroke-opacity=".24" stroke-width="1"/>
        <path d="M75 50 L${dot1x.toFixed(1)} ${dot1y.toFixed(1)} M75 50 L${dot2x.toFixed(1)} ${dot2y.toFixed(1)}" stroke="${accent}" stroke-opacity=".34" stroke-width="1"/>
        <circle cx="${dot1x.toFixed(1)}" cy="${dot1y.toFixed(1)}" r="4" fill="${accent}" fill-opacity=".68"/>
        <circle cx="${dot2x.toFixed(1)}" cy="${dot2y.toFixed(1)}" r="3" fill="#dfe7ff" fill-opacity=".72"/>
        <circle cx="75" cy="50" r="${coreSize.toFixed(1)}" fill="${accent}" fill-opacity="${isCore ? ".30" : ".18"}" filter="url(#glow-${hash})"/>
        <circle cx="75" cy="50" r="${Math.max(9,coreSize-5).toFixed(1)}" fill="#0b0d15" stroke="${accent}" stroke-width="2.2"/>
        <circle cx="75" cy="50" r="${Math.max(4,coreSize-11).toFixed(1)}" fill="${accent}" fill-opacity=".92"/>
        <text x="75" y="84" text-anchor="middle" fill="#f1f4ff" font-size="7.5" font-family="monospace" letter-spacing=".4">${short}</text>
        <text x="75" y="94" text-anchor="middle" fill="#8a8f9d" font-size="5.8" font-family="monospace">${group.toUpperCase()} · ${degree} CONEXIONES · ${weight.toFixed(2)} PESO</text>
      </svg>
    </div>
  `;
}
function _updateMembraneContextPanel(nodeId){
  const panel=document.getElementById("brainContext");
  if(!panel) return;

  const graph=window.__akiraMembraneGraphData;
  const id=nodeId == null ? null : String(nodeId);

  if(!id || !graph || !Array.isArray(graph.nodes)){
    panel.classList.add("is-hidden");
    panel.dataset.brainNodeId="";
    return;
  }

  const node=graph.nodes.find(n=>String(n.id)===id);
  if(!node){
    panel.classList.add("is-hidden");
    return;
  }

  const type=document.getElementById("brainContextType");
  const title=document.getElementById("brainContextTitle");
  const visual=document.getElementById("brainContextVisual");
  const meta=document.getElementById("brainContextMeta");
  const rels=document.getElementById("brainContextRelations");

  panel.classList.remove("is-hidden");
  if(visual) visual.innerHTML=_renderBrainNodePortrait(node);
  if(type) type.textContent=String(node.node_type || _detectGroup(node) || "nodo").toUpperCase();
  if(title) title.textContent=String(node.label || node.id);

  const importance=Math.round((Number(node._importance)||0)*100);
  const clusterId=graph.community && graph.community.assignments instanceof Map
    ? (graph.community.assignments.get(id) || "—")
    : "—";

  if(meta){
    meta.innerHTML=
      "<div>PESO<b>"+(Number(node.weight)||0).toFixed(2)+"</b></div>"+
      "<div>REUTILIZACIÓN<b>"+(Number(node.reuse_count)||0)+"</b></div>"+
      "<div>CONFIANZA<b>"+(Number(node.confidence)||0).toFixed(2)+"</b></div>"+
      "<div>IMPORTANCIA<b>"+importance+"%</b></div>"+
      "<div>GRUPO<b>"+_brainContextEscape(_detectGroup(node))+"</b></div>"+
      "<div>CLUSTER<b>"+_brainContextEscape(clusterId)+"</b></div>";
  }

  const relations=(graph.edges||[])
    .filter(e=>String(e.from_node)===id || String(e.to_node)===id)
    .map(e=>{
      const otherId=String(e.from_node)===id ? String(e.to_node) : String(e.from_node);
      const other=graph.nodes.find(n=>String(n.id)===otherId);
      return {
        nodeId:otherId,
        label:String(other?.label || otherId),
        type:String(e.relation_type || "related_to"),
        weight:Number(e.weight)||0
      };
    })
    .sort((a,b)=>b.weight-a.weight)
    .slice(0,12);

  if(rels){
    rels.innerHTML=relations.length
      ? relations.map(r=>
          "<button type='button' class='brain-relation brain-relation-btn' data-brain-nav='"+
          _brainContextEscape(r.nodeId)+"'><span>"+
          _brainContextEscape(r.label)+"</span><span>"+
          _brainContextEscape(r.type)+"</span></button>"
        ).join("")
      : "<div style='color:#8a8a93;font-size:10px'>Sin relaciones visibles.</div>";

    if(rels.dataset.brainNavBound!=="1"){
      rels.dataset.brainNavBound="1";
      rels.addEventListener("click",ev=>{
        const btn=ev.target.closest("[data-brain-nav]");
        if(!btn) return;
        const targetId=btn.getAttribute("data-brain-nav");
        if(!targetId) return;
        try{
          window.dispatchEvent(new CustomEvent("akira:brain-navigation",{
            detail:{nodeId:String(targetId)}
          }));
        }catch(_){}
      });
    }
  }

  _bindBrainContextDragging();
  _position2dContext(id);
}

let membraneNavigationHistory = [];
let membraneNavigationIndex = -1;
const MEMBRANE_MAX_NAV_HISTORY = 40;

function _brain2dApplyExplore(depth, rootId){
  if(!cyMembrane) return {depth:0, visibleNodeIds:new Set(), visibleLinkIds:new Set()};
  const d=Math.max(0,Math.min(3,Number(depth)||0));
  const root = rootId
    ? String(rootId)
    : (membraneSelectedBrainNodeId
        ? String(membraneSelectedBrainNodeId)
        : String(cyMembrane.nodes(".core").first().id() || ""));
  const distance=new Map();
  if(!root){
    distance.clear();
  }else{
    distance.set(root,0);
    const adjacency=new Map();
    cyMembrane.edges().forEach(e=>{
      const a=String(e.data("source"));
      const b=String(e.data("target"));
      if(a===b) return;
      if(!adjacency.has(a)) adjacency.set(a,[]);
      if(!adjacency.has(b)) adjacency.set(b,[]);
      adjacency.get(a).push(b);
      adjacency.get(b).push(a);
    });
    if(d>0){
      const queue=[root];
      while(queue.length){
        const current=queue.shift();
        const currentDistance=distance.get(current)||0;
        if(currentDistance>=d) continue;
        for(const other of adjacency.get(current)||[]){
          if(!distance.has(other)){
            distance.set(other,currentDistance+1);
            queue.push(other);
          }
        }
      }
    }else{
      cyMembrane.nodes().forEach(n=>distance.set(String(n.id()),0));
    }
  }

  const visibleNodeIds=new Set(distance.keys());
  const visibleLinkIds=new Set();
  cyMembrane.edges().forEach(e=>{
    const a=String(e.data("source"));
    const b=String(e.data("target"));
    if(visibleNodeIds.has(a) && visibleNodeIds.has(b)){
      visibleLinkIds.add(String(e.id()));
    }
  });

  membraneExploreDepth=d;
  membraneExploreVisibleNodeIds=visibleNodeIds;
  membraneExploreVisibleLinkIds=visibleLinkIds;

  cyMembrane.nodes().forEach(n=>{
    const visible=_brainActiveNodeVisible(n) &&
      (d===0 || visibleNodeIds.has(String(n.id())));
    n.style("display",visible ? "element" : "none");
  });

  cyMembrane.edges().forEach(e=>{
    const source=cyMembrane.getElementById(String(e.data("source")));
    const target=cyMembrane.getElementById(String(e.data("target")));
    const visible=source.length && target.length &&
      _brainActiveNodeVisible(source) && _brainActiveNodeVisible(target) &&
      (d===0 || visibleLinkIds.has(String(e.id())));
    e.style("display",visible ? "element" : "none");
  });

  const status=document.getElementById("brainExploreStatus");
  if(status){
    status.textContent=d===0 ? "MEMORIA · TODO" : "MEMORIA · "+d+" SALTO"+(d===1 ? "" : "S");
  }

  const visible=cyMembrane.nodes().filter(n=>n.style("display")!=="none");
  if(visible.length){
    try{ cyMembrane.fit(visible,70); }catch(_){}
  }

  return {depth:d,visibleNodeIds,visibleLinkIds};
}

function _record2dNavigation(nodeId){
  const id=nodeId ? String(nodeId) : "";
  if(!id) return;
  if(
    membraneNavigationIndex >= 0 &&
    membraneNavigationHistory[membraneNavigationIndex] === id
  ){
    _update2dNavigationUI();
    return;
  }
  membraneNavigationHistory=membraneNavigationHistory
    .slice(0,membraneNavigationIndex+1);
  membraneNavigationHistory.push(id);
  if(membraneNavigationHistory.length>MEMBRANE_MAX_NAV_HISTORY){
    membraneNavigationHistory.shift();
  }
  membraneNavigationIndex=membraneNavigationHistory.length-1;
  _update2dNavigationUI();
}

function _render2dNavigationTrail(){
  const el=document.getElementById("brainNavTrail");
  if(!el) return;
  if(!membraneNavigationHistory.length){
    el.innerHTML="";
    return;
  }
  const start=Math.max(0,membraneNavigationHistory.length-6);
  const ids=membraneNavigationHistory.slice(start);
  el.innerHTML=ids.map((id,i)=>{
    const n=cyMembrane ? cyMembrane.getElementById(id) : null;
    const label=n && !n.empty() ? String(n.data("label")||id) : id;
    const active=(start+i)===membraneNavigationIndex;
    return (i ? "<span class='brain-trail-arrow'>›</span>" : "") +
      "<button type='button' class='brain-trail-node"+(active ? " active" : "")+
      "' data-brain-history='"+_brainContextEscape(id)+"' data-brain-history-index='"+(start+i)+
      "' title='"+_brainContextEscape(label)+"'>"+
      _brainContextEscape(label)+"</button>";
  }).join("");
}

function _update2dNavigationUI(){
  const back=document.getElementById("brainNavBack");
  const forward=document.getElementById("brainNavForward");
  if(back) back.disabled=membraneNavigationIndex<=0;
  if(forward) forward.disabled=membraneNavigationIndex<0 || membraneNavigationIndex>=membraneNavigationHistory.length-1;
  _render2dNavigationTrail();
}

document.addEventListener("click", function(ev){
  const btn=ev.target.closest("#brainNavTrail [data-brain-history-index]");
  if(!btn) return;
  const target=Number(btn.getAttribute("data-brain-history-index"));
  if(!Number.isInteger(target)) return;
  if(target<0 || target>=membraneNavigationHistory.length) return;
  membraneNavigationIndex=target;
  _select2dNode(membraneNavigationHistory[target], false);
  _update2dNavigationUI();
});

function _select2dNode(nodeId, pushHistory=true){
  if(!cyMembrane) return false;
  const id=nodeId ? String(nodeId) : "";
  if(!id) return false;
  const node=cyMembrane.getElementById(id);
  if(!node || node.empty()) return false;

  membraneSelectedBrainNodeId=id;
  if(pushHistory) _record2dNavigation(id);

  cyMembrane.nodes().unselect();
  node.select();
  _highlightNeighbors(node);
  node.style("display","element");
  node.style("opacity",1);
  node.style("background-opacity",1);
  node.removeClass("dimmed");
  _updateMembraneContextPanel(id);

  try{
    cyMembrane.center(node);
  }catch(_){}

  return true;
}

function _navigate2dHistory(delta){
  const target=membraneNavigationIndex+Number(delta||0);
  if(target<0 || target>=membraneNavigationHistory.length) return false;
  membraneNavigationIndex=target;
  const id=membraneNavigationHistory[target];
  const ok=_select2dNode(id,false);
  _update2dNavigationUI();
  return ok;
}

window.akiraBrainNavigateBack=function(){
  _navigate2dHistory(-1);
};

window.akiraBrainNavigateForward=function(){
  _navigate2dHistory(1);
};

window.akiraBrainExploreDepth=function(depth){
  if(!cyMembrane) return;
  const rootId=membraneSelectedBrainNodeId ||
    String(cyMembrane.nodes(".core").first().id() || "");
  _brain2dApplyExplore(depth,rootId);
};

window.akiraBrainExploreAll=function(){
  if(!cyMembrane) return;
  _brain2dApplyExplore(0,null);
};

function _clearMembraneSelection(){
  membraneSelectedBrainNodeId=null;
  if(!cyMembrane) return;

  cyMembrane.elements()
    .unselect()
    .removeClass("highlighted")
    .removeClass("dimmed")
    .removeClass("route");

  cyMembrane.nodes().forEach(n=>{
    const visible=_brainFilterNodeVisible(n) &&
      (membraneExploreDepth===0 || membraneExploreVisibleNodeIds.has(String(n.id())));
    n.style("display",visible ? "element" : "none");
    n.style("text-opacity",(n.hasClass("core") || n.hasClass("hub"))
      ? (n.hasClass("core") ? 1 : 0.95) : 0);
  });

  cyMembrane.edges().forEach(e=>{
    const source=cyMembrane.getElementById(String(e.data("source")));
    const target=cyMembrane.getElementById(String(e.data("target")));
    const visible=source.length && target.length &&
      _brainFilterNodeVisible(source) && _brainFilterNodeVisible(target) &&
      (membraneExploreDepth===0 || membraneExploreVisibleLinkIds.has(String(e.id())));
    e.style("display",visible ? "element" : "none");
  });

  const panel=document.getElementById("brainContext");
  if(panel){
    panel.classList.add("is-hidden");
    panel.dataset.brainNodeId="";
  }
}

window.akiraBrainClearSelection=function(){
  _clearMembraneSelection();
  try{
    if(typeof window.akiraBrainClearSelection3D === "function"){
      window.akiraBrainClearSelection3D();
    }
  }catch(_){}
  try{
    window.dispatchEvent(new CustomEvent("akira:brain-select",{
      detail:{nodeId:null,source:"all"}
    }));
  }catch(_){}
}

function _position2dContext(nodeId){
  _bindBrainContextDragging();
  if(!cyMembrane) return;
  const panel=document.getElementById("brainContext");
  if(!panel) return;

  const currentNodeId = String(nodeId);
  if(panel.dataset.brainManualPosition === "1" &&
     panel.dataset.brainNodeId === currentNodeId){
    return;
  }
  panel.dataset.brainNodeId = currentNodeId;
  panel.dataset.brainManualPosition = "0";
  const el=cyMembrane.getElementById(String(nodeId));
  if(!el || el.empty()) return;

  try{
    const p=el.renderedPosition();
    const width=cyMembrane.width()||800;
    const height=cyMembrane.height()||600;
    const isMobile = window.innerWidth <= 650;
    const gap=18;
    const panelWidth = Math.min(330, Math.max(250, width-20));
    const measuredHeight = panel.scrollHeight || 330;
    const panelHeight = Math.min(measuredHeight, Math.max(180, height-20));

    if(isMobile){
      // Mobile drawer: choose the half of the stage farthest from the node.
      const topCenter = panelHeight / 2;
      const bottomCenter = height - panelHeight / 2;
      const useTop = Math.abs(p.y-bottomCenter) >= Math.abs(p.y-topCenter);

      panel.style.width = panelWidth+"px";
      panel.style.left = "10px";
      panel.style.right = "auto";
      panel.style.bottom = "auto";
      panel.style.top = (useTop ? 10 : Math.max(10,height-panelHeight-10))+"px";
      return;
    }

    let left=p.x+gap;
    if(left+panelWidth>width-10) left=p.x-panelWidth-gap;
    left=Math.max(10,Math.min(left,width-panelWidth-10));

    let top=p.y-18;
    if(top+panelHeight>height-10) top=height-panelHeight-10;
    top=Math.max(10,top);

    panel.style.width = panelWidth+"px";
    panel.style.left=left+"px";
    panel.style.right="auto";
    panel.style.top=top+"px";
    panel.style.bottom="auto";
  }catch(_){}
}
function _hashId(value){
  const s=String(value||"");
  let h=2166136261;
  for(let i=0;i<s.length;i++){
    h ^= s.charCodeAt(i);
    h = Math.imul(h,16777619);
  }
  return h >>> 0;
}

function _findFreeSeedPosition(nodeId, anchor, centerPos, occupied){
  const baseX=Number(anchor.x)||centerPos.x;
  const baseY=Number(anchor.y)||centerPos.y;
  const seed=_hashId(nodeId);
  const baseAngle=(seed % 360) * Math.PI / 180;
  const minNodeGap=48;
  const minCoreGap=180;

  // Spiral search: near the chosen community first, then progressively farther
  // out. A candidate is accepted only when it respects every existing node.
  for(let ring=0;ring<18;ring++){
    const radius=70 + ring*34;
    const samples=12 + ring*4;
    const offset=(seed % samples) / samples * Math.PI*2;

    for(let j=0;j<samples;j++){
      const angle=baseAngle + offset + (j/samples)*Math.PI*2;
      const x=baseX + radius*Math.cos(angle);
      const y=baseY + radius*Math.sin(angle);

      const coreDx=x-centerPos.x;
      const coreDy=y-centerPos.y;
      if(Math.sqrt(coreDx*coreDx+coreDy*coreDy) < minCoreGap) continue;

      let free=true;
      for(const p of occupied){
        const dx=x-p.x, dy=y-p.y;
        if(Math.sqrt(dx*dx+dy*dy) < minNodeGap){
          free=false;
          break;
        }
      }
      if(free) return {x,y};
    }
  }

  // Last-resort expansion: never stack the new node on an existing one.
  const farAngle=baseAngle;
  return {
    x:baseX + 650*Math.cos(farAngle),
    y:baseY + 650*Math.sin(farAngle)
  };
}

function _placeNearHub(
  nodeId,
  hubId,
  centerPos,
  occupied=[]
) {
  let anchor=centerPos;
  if(hubId && _positionCache.has(hubId)){
    anchor=_positionCache.get(hubId);
  }
  return _findFreeSeedPosition(nodeId,anchor,centerPos,occupied);
}


// V18.2: solo aplica a nodos nuevos.
function _applySeedPositions(
  nodes,
  edges,
  coreId
) {
  const nodeSig =
    nodes
      .map(n => n.id)
      .sort()
      .join(",");

  const edgeSig =
    edges
      .map(e =>
        String(e.id) +
        ":" +
        String(e.from_node) +
        ">" +
        String(e.to_node)
      )
      .sort()
      .join(",");

  const sig =
    nodeSig +
    "||" +
    edgeSig;

  // Graph changes must be incremental. A new node or edge must never
  // erase the stable positions of nodes that already exist.
  const graphChanged = sig !== _lastGraphSignature;
  _lastGraphSignature = sig;

  const missing =
    nodes.filter(
      n =>
        !_positionCache.has(n.id)
    );

  if (missing.length === 0) {
    return false;
  }

  if (
    _positionCache.size === 0
  ) {
    const seedPositions =
      _computeSeedPositions(
        nodes,
        edges,
        coreId
      );

    for (
      const id in seedPositions
    ) {
      _positionCache.set(
        id,
        seedPositions[id]
      );
    }

    cyMembrane.nodes().forEach(
      n => {
        const p =
          _positionCache.get(
            n.id()
          );

        if (p) {
          n.position(p);
        }
      }
    );

    return true;
  } else {
    const W =
      cyMembrane.width() || 800;

    const H =
      cyMembrane.height() || 600;

    const centerPos =
      _positionCache.get(coreId) ||
      {
        x: W / 2,
        y: H / 2
      };

    const hubByGroup = {};
    const groupsMap = new Map();

    for (const n of nodes) {
      if (n.id === coreId) continue;

      const g =
        _detectGroup(n);

      if (!groupsMap.has(g)) {
        groupsMap.set(g, []);
      }

      groupsMap.get(g).push(n);
    }

    groupsMap.forEach(
      (groupNodes, g) => {
        for (
          const n of groupNodes
        ) {
          if (
            _positionCache.has(
              n.id
            )
          ) {
            hubByGroup[g] = n.id;
            break;
          }
        }
      }
    );

    const occupied = [..._positionCache.values()]
      .map(p=>({x:Number(p.x)||0,y:Number(p.y)||0}));

    for (const n of missing) {
      if (n.id === coreId) {
        _positionCache.set(n.id,centerPos);

        const el=cyMembrane.getElementById(n.id);
        if(el && !el.empty()) el.position(centerPos);

        occupied.push(centerPos);
        continue;
      }

      const g=_detectGroup(n);
      const pos=_placeNearHub(
        n.id,
        hubByGroup[g],
        centerPos,
        occupied
      );

      _positionCache.set(n.id,pos);

      const el=cyMembrane.getElementById(n.id);
      if(el && !el.empty()) el.position(pos);

      occupied.push(pos);
    }

    return true;
  }
}

// V18.2: layout relax.
function _runLayoutRelax() {
  if (
    !cyMembrane ||
    membraneLayoutRunning
  ) {
    return;
  }

  if (
    typeof window.cytoscapeCoseBilkent !==
    "function"
  ) {
    return;
  }

  membraneLayoutRunning = true;

  try {
    const layout =
      cyMembrane.layout({
        name: "cose-bilkent",
        animate: "end",
        animationDuration: 900,
        animationEasing: "ease-out",
        quality: "default",
        randomize: false,
        nodeRepulsion: 45000,
        idealEdgeLength: 180,
        edgeElasticity: 0.4,
        nestingFactor: 0.1,
        gravity: 0.08,
        numIter: 2500,
        tile: false,
        nodeDimensionsIncludeLabels: false,
        fit: false,
        padding: 60,
      });

    layout.on(
      "layoutstop",
      function(){
        membraneLayoutRunning = false;

        try {
          cyMembrane.fit(
            undefined,
            80
          );

          const coreEl =
            cyMembrane.nodes(
              ".core"
            );

          if (
            coreEl &&
            coreEl.length > 0
          ) {
            cyMembrane.center(
              coreEl
            );
          }
        } catch(_) {}
      }
    );

    layout.run();
  } catch(e) {
    membraneLayoutRunning = false;

    console.warn(
      "[membrane] layout relax fallo:",
      e
    );
  }
}

function _cytoscapeStyle() {
  return [
    {
      selector: "node",
      style: {
        "background-color":
          "data(neural_color)",

        "width":
          "data(radius)",

        "height":
          "data(radius)",

        "label":
          "data(label)",

        "color":
          "#c9d1d9",

        "font-family":
          "monospace",

        "font-size":
          10,

        "font-weight":
          300,

        "text-valign":
          "bottom",

        "text-halign":
          "center",

        "text-margin-y":
          5,

        "text-opacity":
          0,

        "text-wrap":
          "wrap",

        "text-max-width":
          100,

        "border-width":
          0,

        "shadow-blur":
          14,

        "shadow-color":
          "data(neural_color)",

        "shadow-opacity":
          0.48,

        "shadow-offset-x":
          0,

        "shadow-offset-y":
          0,

        "transition-property":
          "opacity, border-width, shadow-blur, shadow-opacity",

        "transition-duration":
          "180ms",
      }
    },

    {
      selector: "node.hub",
      style: {
        "label":
          "data(label)",

        "text-opacity":
          0.95,

        "font-size":
          11,

        "font-weight":
          "bold",

        "shadow-blur":
          24,

        "shadow-opacity":
          0.72,

        "border-width":
          1.5,

        "border-color":
          "rgba(255,255,255,.28)",
      }
    },

    {
      selector: "node.core",
      style: {
        "background-color":
          "#7b61ff",

        "background-opacity":
          1.0,

        "width":
          64,

        "height":
          64,

        "label":
          "data(label)",

        "text-opacity":
          1,

        "color":
          "#ffffff",

        "font-size":
          14,

        "font-weight":
          "bold",

        "border-width":
          2,

        "border-color":
          "#ffffff",

        "shadow-blur":
          58,

        "shadow-color":
          "#7b61ff",

        "shadow-opacity":
          1.0,

        "overlay-opacity":
          0
      }
    },

    {
      selector:
        "node:selected",

      style: {
        "border-width":
          2,

        "border-color":
          "#ffffff",

        "text-opacity":
          1,

        "color":
          "#ffffff",

        "font-weight":
          "bold",

        "font-size":
          12,

        "shadow-blur":
          30,

        "shadow-opacity":
          0.9,
      }
    },

    {
      selector:
        "node.highlighted",

      style: {
        "border-width":
          1.5,

        "border-color":
          "#ffffff",

        "text-opacity":
          1,

        "color":
          "#ffffff",

        "shadow-blur":
          20,

        "shadow-opacity":
          0.8,
      }
    },

    {
      selector:
        "node.dimmed",

      style: {
        "opacity":
          0.12,

        "text-opacity":
          0.05
      }
    },

    {
      selector:
        "edge",

      style: {
        "width":
          "data(width)",

        "line-color":
          "#a9b8d0",

        "curve-style":
          "straight",

        "opacity":
          0.14,

        "transition-property":
          "opacity, line-color",

        "transition-duration":
          "180ms",
      }
    },

    {
      selector:
        "edge.to-core",

      style: {
        "line-color":
          "#b39cff",

        "opacity":
          0.18,

        "width":
          0.7
      }
    },

    {
      selector:
        "node.route",

      style: {
        "border-width":
          2,

        "border-color":
          "#ffffff",

        "text-opacity":
          1,

        "shadow-blur":
          28,

        "shadow-opacity":
          0.92
      }
    },

    {
      selector:
        "edge.route",

      style: {
        "opacity":
          0.95,

        "line-color":
          "#ffffff",

        "width":
          2.2
      }
    },

    {
      selector:
        "edge.highlighted",

      style: {
        "opacity":
          0.72,

        "line-color":
          "#dfe7ff"
      }
    },

    {
      selector:
        "edge.dimmed",

      style: {
        "opacity":
          0.025
      }
    },

    {
      selector:
        "node.drag-root",

      style: {
        "border-width":
          3,
        "border-color":
          "#ffffff",
        "shadow-blur":
          34,
        "shadow-opacity":
          1
      }
    },

    {
      selector:
        "node.drag-neighbor",

      style: {
        "border-width":
          1.5,
        "border-color":
          "#ffffff",
        "shadow-blur":
          24,
        "shadow-opacity":
          0.9,
        "opacity":
          1
      }
    },

    {
      selector:
        "edge.drag-active",

      style: {
        "opacity":
          0.88,
        "line-color":
          "#ffffff",
        "width":
          1.8
      }
    }
  ];
}

function _restoreObsidianAfterViewportResize() {
  if (!cyMembrane) return;
  if (membraneExploreDepth !== 0) return;
  if (membraneBrainFilterGroup !== "all") return;
  if (membraneBrainRelationFilter !== "all") return;

  try{
    cyMembrane.resize();

    const core=cyMembrane.nodes(".core").first();
    if(!core || core.empty()) return;

    // Resize is a camera event, not a reason to recompute the entire Brain.
    // World coordinates remain untouched, so the graph cannot collapse or
    // "jump" merely because the mobile chrome/visual viewport changed.
    cyMembrane.center(core);

    const rp=core.renderedPosition();
    const w=cyMembrane.width()||800;
    const h=cyMembrane.height()||600;
    const dx=(w/2)-rp.x;
    const dy=(h/2)-rp.y;

    if(Math.abs(dx)>2 || Math.abs(dy)>2){
      const pan=cyMembrane.pan();
      cyMembrane.pan({x:pan.x+dx,y:pan.y+dy});
    }

    _updateObsidianLabelFade();
  }catch(e){
    console.warn("[membrane] Obsidian camera resize recovery failed:",e);
  }
}

function _scheduleFlowerViewportRestore() {
  if (membraneResizeTimer) {
    clearTimeout(membraneResizeTimer);
  }

  membraneResizeTimer = setTimeout(() => {
    membraneResizeTimer = null;
    try {
      if (cyMembrane) cyMembrane.resize();
    } catch(_) {}
    _restoreObsidianAfterViewportResize();
  }, 120);
}

_installBrain2dE2EDebug();

function initMembraneGraph() {
  const container =
    document.getElementById(
      "membraneCy"
    );

  if (!container) return;

  const rect =
    container.parentElement
      .getBoundingClientRect();

  if (
    rect.width < 50 ||
    rect.height < 50
  ) {
    return;
  }

  if (
    typeof window.cytoscape ===
    "undefined"
  ) {
    container.innerHTML =
      '<div style="color:#ef4444;padding:20px;font-family:monospace;text-align:center">No se pudo cargar Cytoscape.js</div>';

    return;
  }

  if (cyMembrane) {
    // Repeated section boot calls are expected on navigation/resizing.
    // Do not refetch/rebuild the graph just because the existing Cytoscape
    // instance was asked to initialize again; callers that need fresh data
    // invoke refreshMembrane(true) explicitly. This prevents lifecycle races
    // from replacing a stable graph while the user is interacting with it.
    try { cyMembrane.resize(); } catch(_) {}
    return;
  }

  try {
    cyMembrane =
      window.cytoscape({
        container: container,

        style:
          _cytoscapeStyle(),

        layout: {
          name: "preset"
        },

        minZoom:
          0.15,

        maxZoom:
          4.0,

        wheelSensitivity:
          0.25,

        boxSelectionEnabled:
          false,

        selectionType:
          "single",

        autounselectify:
          false,

        autoungrabify:
          false,
      });

    _bindElasticNodeInteraction();
    _bindObsidianPhysicsInteractions();
    _updateObsidianLabelFade();

    // Very light 2D core "breathing" effect. It is intentionally timer based,
    // not a full per-frame animation, so it does not compete with graph physics.
    try{
      clearInterval(membraneCorePulseTimer);
      membraneCorePulseTimer = setInterval(() => {
        if(!cyMembrane) return;
        const core = cyMembrane.nodes(".core").first();
        if(!core || core.empty()) return;
        const phase = (Date.now() % 2400) / 2400;
        const pulse = (Math.sin(phase * Math.PI * 2) + 1) / 2;
        core.style({
          "shadow-blur": 52 + pulse * 12,
          "shadow-opacity": 0.88 + pulse * 0.12
        });
      }, 180);
    }catch(_){}

    cyMembrane.on(
      "tap",
      "node",
      (evt) => {
        _select2dNode(evt.target.id(), true);
        try {
          window.dispatchEvent(new CustomEvent("akira:brain-select", {
            detail: { nodeId: evt.target.id(), source:"2d" }
          }));
        } catch(_) {}
      }
    );

    cyMembrane.on(
      "mouseover",
      "node",
      (evt) => {
        if (
          cyMembrane
            .elements(":selected")
            .length > 0
        ) {
          return;
        }

        _highlightNeighbors(
          evt.target
        );

        evt.target.style(
          "text-opacity",
          1
        );
      }
    );

    cyMembrane.on(
      "mouseout",
      "node",
      () => {
        if (
          cyMembrane
            .elements(":selected")
            .length > 0
        ) {
          return;
        }

        cyMembrane
          .elements()
          .removeClass("dimmed")
          .removeClass("highlighted");

        cyMembrane.nodes().forEach(
          n => {
            if (
              n.hasClass("core") ||
              n.hasClass("hub")
            ) {
              n.style(
                "text-opacity",
                n.hasClass("core")
                  ? 1
                  : 0.95
              );
            } else {
              n.style(
                "text-opacity",
                0
              );
            }
          }
        );
      }
    );

    cyMembrane.on(
      "tap",
      (evt) => {
        if (
          evt.target ===
          cyMembrane
        ) {
          cyMembrane
            .elements()
            .unselect();

          cyMembrane
            .elements()
            .removeClass(
              "dimmed"
            )
            .removeClass(
              "highlighted"
            );

          const panel=document.getElementById("brainContext");
          if(panel) panel.classList.add("is-hidden");

          cyMembrane
            .nodes()
            .forEach(n => {
              if (
                n.hasClass("core") ||
                n.hasClass("hub")
              ) {
                n.style(
                  "text-opacity",
                  n.hasClass("core")
                    ? 1
                    : 0.95
                );
              } else {
                n.style(
                  "text-opacity",
                  0
                );
              }
            });
          try {
            window.dispatchEvent(new CustomEvent("akira:brain-select", {
              detail: { nodeId: null }
            }));
          } catch(_) {}
        }
      }
    );

    cyMembrane.on(
      "dbltap",
      (evt) => {
        if (
          evt.target ===
          cyMembrane
        ) {
          cyMembrane.fit(
            undefined,
            60
          );

          cyMembrane.center();
        }
      }
    );

    if (
      window.ResizeObserver
    ) {
      const ro =
        new ResizeObserver(
          () => {
            _scheduleFlowerViewportRestore();
          }
        );

      ro.observe(container);
    }

    if (
      window.visualViewport &&
      typeof window.visualViewport.addEventListener === "function"
    ) {
      window.visualViewport.addEventListener(
        "resize",
        _scheduleFlowerViewportRestore,
        {passive:true}
      );
    }

    refreshMembrane(true);

  } catch (e) {
    container.innerHTML =
      '<div style="color:#ef4444;padding:20px;font-family:monospace;text-align:center">Error Cytoscape: ' +
      (
        e &&
        e.message
          ? e.message
          : e
      ) +
      "</div>";
  }
}

let membraneElasticDragState = null;

function _buildElasticDragState(node){
  if(!cyMembrane || !node || node.empty()) return null;

  const rootId = String(node.id());
  const adjacency = new Map();

  cyMembrane.edges().forEach(e=>{
    const a = String(e.data("source"));
    const b = String(e.data("target"));
    if(!adjacency.has(a)) adjacency.set(a,[]);
    if(!adjacency.has(b)) adjacency.set(b,[]);
    adjacency.get(a).push({id:b,edge:e});
    adjacency.get(b).push({id:a,edge:e});
  });

  const distance = new Map([[rootId,0]]);
  const queue = [rootId];

  while(queue.length){
    const current = queue.shift();
    const d = distance.get(current) || 0;
    if(d >= 2) continue;

    for(const item of adjacency.get(current) || []){
      if(!distance.has(item.id)){
        distance.set(item.id,d+1);
        queue.push(item.id);
      }
    }
  }

  const home = new Map();
  _positionCache.forEach((p,id)=>{
    home.set(String(id),{x:Number(p.x)||0,y:Number(p.y)||0});
  });

  const rootPosition = node.position();
  const affected = [];


  for(const [id,d] of distance.entries()){
    if(id === rootId) continue;
    const el = cyMembrane.getElementById(id);
    if(!el || el.empty()) continue;
    const hp = home.get(id) || el.position();
    affected.push({
      id,
      distance:d,
      element:el,
      home:{x:hp.x,y:hp.y}
    });
  }

  return {
    rootId,
    rootStart:{x:Number(rootPosition.x)||0,y:Number(rootPosition.y)||0},
    affected,
    startedAt:Date.now()
  };
}

function _updateElasticDrag(node){
  const state = membraneElasticDragState;
  if(!state || !cyMembrane || !node) return;

  const p = node.position();
  state.pendingDx = (Number(p.x)||0) - state.rootStart.x;
  state.pendingDy = (Number(p.y)||0) - state.rootStart.y;

  // Pointer events can arrive faster than the phone can paint. Coalesce them
  // into one visual update per frame so dragging stays responsive.
  if(state.framePending) return;
  state.framePending=true;

  requestAnimationFrame(()=>{
    state.framePending=false;
    if(membraneElasticDragState!==state || !cyMembrane) return;

    const dx=state.pendingDx||0;
    const dy=state.pendingDy||0;
    const magnitude=Math.sqrt(dx*dx+dy*dy);
    const scale=magnitude > 260 ? 260/magnitude : 1;

    cyMembrane.batch(()=>{
      state.affected.forEach(item=>{
        const damping = item.distance === 1 ? 0.34 : 0.12;
        item.element.position({
          x:item.home.x + dx*damping*scale,
          y:item.home.y + dy*damping*scale
        });
      });
    });
  });
}

function _finishElasticDrag(){
  const state = membraneElasticDragState;
  if(!state || !cyMembrane) return;

  membraneElasticDragState = null;

  if(state.framePending){
    state.framePending=false;
  }

  const affected = state.affected.slice();
  const root = cyMembrane.getElementById(state.rootId);
  const homeRoot = state.rootStart;

  const duration=300;

  try{
    if(root && !root.empty()){
      root.stop(true,false);
      root.animate(
        {position:homeRoot},
        {duration,easing:"ease-out"}
      );
    }
  }catch(_){
    try{ if(root && !root.empty()) root.position(homeRoot); }catch(__){}
  }

  affected.forEach(item=>{
    try{
      item.element.stop(true,false);
      item.element.animate(
        {position:item.home},
        {duration,easing:"ease-out"}
      );
    }catch(_){
      try { item.element.position(item.home); } catch(__){}
    }
  });

  try{
    cyMembrane.nodes().removeClass("drag-root").removeClass("drag-neighbor");
    cyMembrane.edges().removeClass("drag-active");
  }catch(_){}

  // Keep the stable world coordinates authoritative after the return animation.
  // Resume the existing D3 simulation gently from its original world coordinates.
  setTimeout(()=>{
    if(!cyMembrane) return;
    try{
      if(root && !root.empty()){
        root.position(homeRoot);
        _positionCache.set(state.rootId,homeRoot);
      }
      affected.forEach(item=>{
        item.element.position(item.home);
        _positionCache.set(item.id,item.home);
      });
      if(_obsidianForceSimulation && typeof _obsidianForceSimulation.alpha === "function"){
        _obsidianForceSimulation.alpha(0.12).restart();
      }
    }catch(_){}
  },duration+20);
}

function _bindElasticNodeInteraction(){
  if(!cyMembrane || cyMembrane._akiraElasticDragBound) return;
  cyMembrane._akiraElasticDragBound = true;

  cyMembrane.on("grab","node",evt=>{
    try{
      _finishElasticDrag();

      // While a node is being dragged, the user owns its position. Pause the
      // active D3 simulation so it cannot fight the pointer. The same simulation
      // is gently restarted after the elastic return animation completes.
      if(_obsidianForceSimulation && typeof _obsidianForceSimulation.stop === "function"){
        try { _obsidianForceSimulation.stop(); } catch(_) {}
      }
      _radialPhysicsRun++;
      if(_radialPhysicsTimer){
        try { cancelAnimationFrame(_radialPhysicsTimer); } catch(_){}
        _radialPhysicsTimer=null;
      }

      const node = evt.target;
      membraneElasticDragState = _buildElasticDragState(node);
      if(!membraneElasticDragState) return;

      node.addClass("drag-root");
      membraneElasticDragState.affected.forEach(item=>item.element.addClass("drag-neighbor"));

      cyMembrane.edges().forEach(edge=>{
        const source = String(edge.data("source"));
        const target = String(edge.data("target"));
        if(source === membraneElasticDragState.rootId || target === membraneElasticDragState.rootId){
          edge.addClass("drag-active");
        }
      });
    }catch(_){}
  });

  cyMembrane.on("drag","node",evt=>{
    try { _updateElasticDrag(evt.target); } catch(_) {}
  });

  cyMembrane.on("free","node",()=>{
    try { _finishElasticDrag(); } catch(_) {}
  });
}

function _highlightNeighbors(node) {
  if (!cyMembrane) return;

  const neighborhood =
    node.closedNeighborhood();

  cyMembrane
    .elements()
    .removeClass(
      "highlighted"
    )
    .removeClass(
      "dimmed"
    );

  cyMembrane
    .elements()
    .forEach(el => {
      if (
        neighborhood.contains(el)
      ) {
        el.addClass(
          "highlighted"
        );
      } else {
        el.addClass(
          "dimmed"
        );
      }
    });
}

window.reorganizeMembrane =
  function () {
    if (!cyMembrane) return;

    _positionCache.clear();
    _lastGraphSignature = "";

    refreshMembrane(true);
  };

function _hasValidLocalSession() {
  try {
    const token = String(localStorage.getItem("akira_session_token") || "").trim();
    const exp = Number(localStorage.getItem("akira_session_exp") || 0);
    return Boolean(
      token &&
      Number.isFinite(exp) &&
      exp > Math.floor(Date.now() / 1000)
    );
  } catch (_) {
    return false;
  }
}

async function _loadPublicMembrane() {
  const publicData = await _fetchPublicJson(
    "/api/v8/graph/public-overview"
  );
  if (
    !publicData ||
    publicData.ok !== true ||
    publicData.public !== true
  ) {
    throw new Error("Vista pública no disponible");
  }
  return publicData;
}

async function refreshMembrane(
  force
) {
  if (
    !cyMembrane ||
    membraneFetching
  ) {
    return;
  }

  if (
    !force &&
    Date.now() -
      membraneLastFetch <
      MEMBRANE_REFRESH_MS
  ) {
    return;
  }

  membraneFetching = true;
  membraneLastFetch =
    Date.now();

  const hasSession = _hasValidLocalSession();

  try {
    // Anonymous users should never preflight the private graph route.
    // Owners use the private route; if transport/authentication fails, the
    // safe public topology remains available instead of leaving a blank Brain.
    const data = hasSession
      ? await _fetchJson(
          "/api/v8/graph/overview?limit_nodes=750&limit_edges=2000&_=" + Date.now(),
          false
        )
      : await _loadPublicMembrane();

    membranePublicMode = !hasSession;
    _applyGraphToCy(data);
    membraneError = null;
  } catch (e) {
    const message = String(
      e && e.message
        ? e.message
        : e
    );

    try {
      // Public topology is deliberately static and contains no private graph
      // records, so it is a safe availability fallback for CORS/network/auth
      // failures on the private route.
      const publicData = await _loadPublicMembrane();
      membranePublicMode = true;
      _applyGraphToCy(publicData);
      membraneError = null;
      _updateMembraneStats();
    } catch (publicError) {
      membraneError = String(
        publicError && publicError.message
          ? publicError.message
          : (hasSession ? message : publicError)
      );
      _updateMembraneStats();
    }
  } finally {
    membraneFetching =
      false;
  }
}

function _applyGraphToCy(
  data
) {
  if (!cyMembrane) return;

  const nodes =
    data.nodes || [];

  const edges =
    data.edges || [];

  // Keep a local graph snapshot so the 2D view can own selection/context
  // without depending on the hidden 3D renderer being initialized.
  window.__akiraMembraneGraphData = {
    nodes,
    edges,
    coreId: null
  };

  let coreId = null;

  for (const n of nodes) {
    if (
      String(
        n.label || ""
      )
        .trim()
        .toLowerCase() ===
      "akira"
    ) {
      coreId = n.id;
      break;
    }
  }

  let community = null;
  if (typeof window.AkiraBrainCommunity === "function") {
    try {
      community = window.AkiraBrainCommunity(nodes, edges, coreId);
    } catch (e) {
      console.warn("[membrane] community analysis failed:", e);
    }
  }

  const assignments =
    community && community.assignments instanceof Map
      ? community.assignments
      : null;

  _communityState = community || null;

  if(window.__akiraMembraneGraphData){
    window.__akiraMembraneGraphData.coreId = coreId;
    window.__akiraMembraneGraphData.community = community || null;
  }

  const degree = {};

  for (const e of edges) {
    degree[e.from_node] =
      (degree[e.from_node] || 0) + 1;

    degree[e.to_node] =
      (degree[e.to_node] || 0) + 1;
  }

  const groupsMap =
    new Map();

  for (const n of nodes) {
    if (
      String(n.id) === String(coreId)
    ) {
      continue;
    }

    const g =
      assignments
        ? (assignments.get(String(n.id)) || _detectGroup(n))
        : _detectGroup(n);

    if (
      !groupsMap.has(g)
    ) {
      groupsMap.set(
        g,
        []
      );
    }

    groupsMap
      .get(g)
      .push(n);
  }

  let hubIds = new Set();

  if (
    _communityState &&
    _communityState.hubs instanceof Set
  ) {
    hubIds = new Set(
      [..._communityState.hubs].map(
        id => String(id)
      )
    );
  } else {
    groupsMap.forEach(
      groupNodes => {
        const ids =
          groupNodes.map(
            n => n.id
          );

        const subs =
          _subdivideGroup(ids);

        subs.forEach(
          subIds => {
            let best = null;
            let bestDeg = -1;

            subIds.forEach(
              id => {
                const d =
                  degree[id] || 0;

                if (
                  d > bestDeg
                ) {
                  bestDeg = d;
                  best = id;
                }
              }
            );

            if (best) {
              hubIds.add(best);
            }
          }
        );
      }
    );
  }

  const nodeIds =
    new Set();

  const cyElements = [];

  for (const n of nodes) {
    nodeIds.add(n.id);

    const isCore =
      String(n.id) === String(coreId);

    const isHub =
      hubIds.has(String(n.id));

    const group =
      _detectGroup(n);

    const color =
      isCore
        ? "#ff6b6b"
        : (
            GROUP_COLORS[group] ||
            GROUP_COLORS.other
          );

    const deg =
      degree[n.id] || 0;

    let radius;

    const importance =
      Math.max(
        0,
        Math.min(
          1,
          Number(n._importance) || 0
        )
      );

    if (isCore) {
      radius = 64;
    } else if (isHub) {
      radius =
        Math.min(
          34,
          20 +
            Math.min(
              deg,
              7
            ) +
            importance * 5
        );
    } else {
      const baseR = 10;
      const bonus =
        Math.min(
          deg * 1.05,
          9
        );

      radius =
        Math.min(
          23,
          baseR + bonus + importance * 3
        );
    }

    let classes = [];

    if (isCore) {
      classes.push(
        "core"
      );
    }

    if (isHub) {
      classes.push(
        "hub"
      );
    }

    cyElements.push({
      group: "nodes",

      data: {
        id: n.id,

        label:
          _abbreviateLabel(
            n.id,
            n.label
          ),

        group: group,

        node_type:
          n.node_type,

        color: color,
        neural_color: _neural2DColor(n, isCore),

        weight:
          n.weight || 0,

        reuse_count:
          n.reuse_count || 0,

        radius:
          radius,

        is_hub:
          isHub,

        is_core:
          isCore,

        cluster:
          assignments
            ? (assignments.get(String(n.id)) || "—")
            : "—",

        importance:
          importance,
      },

      classes:
        classes.join(" ")
    });
  }

  const visibleEdges =
    _filterEdgesByRelevance(
      edges,
      nodeIds,
      coreId
    );

  for (
    const e of visibleEdges
  ) {
    const w =
      Number(e.weight) || 0;

    const toCore =
      coreId &&
      (
        e.to_node === coreId ||
        e.from_node === coreId
      );

    cyElements.push({
      group: "edges",

      data: {
        id: e.id,

        source:
          e.from_node,

        target:
          e.to_node,

        weight:
          w,

        width:
          toCore
            ? 1.4
            : Math.min(
                3.0,
                0.5 +
                  w * 0.7
              ),

        relation_type:
          e.relation_type,
      },

      classes:
        toCore
          ? "to-core"
          : ""
    });
  }

  const existingIds =
    new Set();

  cyMembrane
    .elements()
    .forEach(
      el =>
        existingIds.add(
          el.id()
        )
    );

  const newIds =
    new Set(
      cyElements.map(
        e => e.data.id
      )
    );

  cyMembrane.batch(
    () => {
      existingIds.forEach(
        id => {
          if (
            !newIds.has(id)
          ) {
            const el =
              cyMembrane
                .getElementById(
                  id
                );

            if (
              el &&
              !el.empty()
            ) {
              el.remove();
            }
          }
        }
      );

      const toAdd =
        cyElements.filter(
          e =>
            !existingIds.has(
              e.data.id
            )
        );

      if (
        toAdd.length > 0
      ) {
        cyMembrane.add(
          toAdd
        );
      }

      cyElements.forEach(
        e => {
          if (
            existingIds.has(
              e.data.id
            )
          ) {
            const el =
              cyMembrane
                .getElementById(
                  e.data.id
                );

            if (
              el &&
              !el.empty()
            ) {
              el.data(
                e.data
              );

              if (
                e.group ===
                "nodes"
              ) {
                el.removeClass(
                  "core hub"
                );

                if (
                  e.classes.indexOf(
                    "core"
                  ) >= 0
                ) {
                  el.addClass(
                    "core"
                  );
                }

                if (
                  e.classes.indexOf(
                    "hub"
                  ) >= 0
                ) {
                  el.addClass(
                    "hub"
                  );
                }
              }
            }
          }
        }
      );
    }
  );

  const nodesForSeed =
    cyMembrane
      .nodes()
      .map(
        n => ({
          id: n.id(),
          label:
            n.data("label"),
          node_type:
            n.data("node_type"),
          weight:
            Number(n.data("weight")) || 0,
          reuse_count:
            Number(n.data("reuse_count")) || 0,
          confidence:
            Number(n.data("confidence")) || 0,
        })
      );

  // Final authoritative 2D placement: radial brain structure + soft physics.
  // This preserves the proven Akira-centered composition: a clear breathing
  // zone around the nucleus, a mixed global cloud, and no viewport wall.
  try {
    cyMembrane.resize();

    const graphSignature =
      nodesForSeed.map(n=>String(n.id)).sort().join(",") +
      "||" +
      edges.map(e=>
        String(e.id)+":"+
        String(e.from_node)+">"+
        String(e.to_node)+":"+
        String(Number(e.weight)||0)
      ).sort().join(",");

    const graphChanged =
      graphSignature !== _lastGraphSignature;

    _lastGraphSignature = graphSignature;

    const coreEl = cyMembrane.nodes(".core");

    const hasExistingLayout =
      _positionCache.size > 1 ||
      _obsidianForceNodeById.size > 1;

    if(coreEl && coreEl.length && (graphChanged || !hasExistingLayout)){
      const center = {
        x:(cyMembrane.width()||800)/2,
        y:(cyMembrane.height()||600)/2
      };

      // D3 force is the authoritative 2D Brain layout. Existing coordinates
      // are preserved; only genuinely new nodes receive neighbor-aware seeds.
      _seedObsidianGraph(
        nodesForSeed,
        coreId,
        center,
        edges
      );

      // Establish the camera once. The world itself is not fit/reseeded on
      // later refreshes, so graph growth does not destroy the current layout.
      if(!window.__akiraObsidianInitialViewportDone){
        try{
          const nucleus=coreEl.first();
          if(nucleus && !nucleus.empty()){
            cyMembrane.zoom(
              Math.max(
                0.50,
                Math.min(0.54, cyMembrane.maxZoom())
              )
            );
            cyMembrane.center(nucleus);
            window.__akiraObsidianInitialViewportDone=true;
          }
        }catch(_){}
      }

      _runObsidianPhysics(
        nodesForSeed,
        edges,
        coreId,
        true
      );
    }
  } catch(e) {
    console.warn("[membrane] graph application/physics failure:", e);
  }


  membraneCounts =
    data.counts || {
      nodes: 0,
      edges: 0,
      by_type: {},
      by_relation: {}
    };

  cyMembrane.nodes().forEach(n => {
    const visible = _brainFilterNodeVisible(n) &&
      (membraneExploreDepth === 0 || membraneExploreVisibleNodeIds.has(String(n.id())));
    n.style("display", visible ? "element" : "none");
  });
  cyMembrane.edges().forEach(e => {
    const source = cyMembrane.getElementById(String(e.data("source")));
    const targetNode = cyMembrane.getElementById(String(e.data("target")));
    const visible = source.length && targetNode.length &&
      _brainActiveNodeVisible(source) && _brainActiveNodeVisible(targetNode) &&
      (membraneExploreDepth === 0 || membraneExploreVisibleLinkIds.has(String(e.id())));
    e.style("display", visible ? "element" : "none");
  });

  _updateMembraneStats();
}

function _updateMembraneStats() {
  const el =
    document.getElementById(
      "membraneStats"
    );

  if (!el) return;

  const c =
    membraneCounts || {
      nodes: 0,
      edges: 0
    };

  const clusterCount =
    _communityState &&
    Number(_communityState.count) > 0
      ? Number(_communityState.count)
      : 0;

  const nodesCount = c.nodes || 0;
  const edgesCount = c.edges || 0;

  if (membraneError) {
    el.textContent =
      "⚠ CEREBRO 2D · " + String(membraneError).slice(0, 140) +
      " · reintento automático";
  } else {
    el.textContent =
      (membranePublicMode ? "VISTA PÚBLICA · " : "") +
      nodesCount +
      " nodos · " +
      edgesCount +
      " aristas · " +
      clusterCount +
      " clusters";
  }

  // Keep the shared Brain HUD synchronized with the live 2D membrane.
  // This also covers the initialization-order case where brain_3d.js
  // rendered its legacy snapshot before the 2D graph arrived.
  try{
    if(window.__akiraBrainCurrentMode === "2d" || !window.__akiraBrainCurrentMode){
      const hud = document.getElementById("brainStats");
      if(hud){
        hud.innerHTML =
          (membranePublicMode ? "<strong>VISTA PÚBLICA</strong> · " : "") +
          "<strong>" + nodesCount + "</strong> NODOS · <strong>" +
          edgesCount + "</strong> RELACIONES · <strong>" +
          clusterCount + "</strong> CLUSTERS";
      }
    }
  }catch(_){}
}

// Core focus follows the documented graph-view interaction model: center
// the selected node, then zoom enough to inspect its immediate neighborhood.
// ===========================================================================
// BRAIN 2D/3D — SINCRONIZACION DE SELECCION
// ===========================================================================
window.addEventListener("akira:brain-navigation", function(ev){
  try {
    const detail = ev && ev.detail ? ev.detail : {};
    const id = detail.nodeId ? String(detail.nodeId) : null;
    if(!id || !cyMembrane) return;
    _select2dNode(id, true);
  } catch(_) {}
});

window.addEventListener("akira:brain-relation-filter", function(ev){
  if (!cyMembrane) return;
  try {
    membraneBrainRelationFilter = ev && ev.detail ? String(ev.detail.relation || "all").toLowerCase() : "all";

    cyMembrane.nodes().forEach(n => {
      const visible = _brainActiveNodeVisible(n) &&
        (membraneExploreDepth === 0 || membraneExploreVisibleNodeIds.has(String(n.id())));
      n.style("display", visible ? "element" : "none");
    });

    cyMembrane.edges().forEach(e => {
      const source = cyMembrane.getElementById(String(e.data("source")));
      const target = cyMembrane.getElementById(String(e.data("target")));
      const visible = source.length && target.length &&
        _brainActiveNodeVisible(source) && _brainActiveNodeVisible(target) &&
        _brainRelationFilterMatches(e) &&
        (membraneExploreDepth === 0 || membraneExploreVisibleLinkIds.has(String(e.id())));
      e.style("display", visible ? "element" : "none");
    });

    const visibleNodes = cyMembrane.nodes().filter(n => n.style("display") !== "none");
    if(visibleNodes.length) cyMembrane.fit(visibleNodes, 70);
  } catch(_) {}
});

window.addEventListener("akira:brain-filter", function(ev){
  if (!cyMembrane) return;
  try {
    const group = ev && ev.detail ? String(ev.detail.group || "all") : "all";
    membraneBrainFilterGroup = group || "all";

    cyMembrane.nodes().forEach(n => {
      const visible = _brainActiveNodeVisible(n) &&
        (membraneExploreDepth === 0 || membraneExploreVisibleNodeIds.has(String(n.id())));
      n.style("display", visible ? "element" : "none");
    });

    cyMembrane.edges().forEach(e => {
      const source = cyMembrane.getElementById(String(e.data("source")));
      const target = cyMembrane.getElementById(String(e.data("target")));
      const visible = source.length && target.length &&
        _brainActiveNodeVisible(source) && _brainActiveNodeVisible(target) &&
        (membraneExploreDepth === 0 || membraneExploreVisibleLinkIds.has(String(e.id())));
      e.style("display", visible ? "element" : "none");
    });

    const visibleNodes = cyMembrane.nodes().filter(n => n.style("display") !== "none");
    if(visibleNodes.length) cyMembrane.fit(visibleNodes, 70);
  } catch(_) {}
});

window.addEventListener("akira:brain-explore", function(ev){
  if (!cyMembrane) return;

  try {
    const detail = ev && ev.detail ? ev.detail : {};
    const visibleNodeIds = new Set(
      Array.isArray(detail.visibleNodeIds)
        ? detail.visibleNodeIds.map(id => String(id))
        : []
    );
    const visibleLinkIds = new Set(
      Array.isArray(detail.visibleLinkIds)
        ? detail.visibleLinkIds.map(id => String(id))
        : []
    );
    const depth = Number(detail.depth) || 0;
    membraneExploreDepth = depth;
    membraneExploreVisibleNodeIds = visibleNodeIds;
    membraneExploreVisibleLinkIds = visibleLinkIds;

    cyMembrane.nodes().forEach(n => {
      const visible =
        _brainFilterNodeVisible(n) &&
        (depth === 0 || visibleNodeIds.has(String(n.id())));

      n.style("display", visible ? "element" : "none");
    });

    cyMembrane.edges().forEach(e => {
      const source = cyMembrane.getElementById(String(e.data("source")));
      const target = cyMembrane.getElementById(String(e.data("target")));
      const visible = source.length && target.length &&
        _brainFilterNodeVisible(source) && _brainFilterNodeVisible(target) &&
        (depth === 0 || visibleLinkIds.has(String(e.id())));

      e.style("display", visible ? "element" : "none");
    });

    if(depth === 0){
      cyMembrane.fit(undefined, 80);
    } else {
      const visible = cyMembrane.nodes().filter(
        n => n.style("display") !== "none"
      );
      if(visible.length){
        cyMembrane.fit(visible, 70);
      }
    }
  } catch(_) {}
});

window.addEventListener("akira:brain-route", function(ev){
  if (!cyMembrane) return;

  try {
    const detail = ev && ev.detail ? ev.detail : {};
    const nodeIds = new Set(
      Array.isArray(detail.nodeIds)
        ? detail.nodeIds.map(id => String(id))
        : []
    );
    const linkIds = new Set(
      Array.isArray(detail.linkIds)
        ? detail.linkIds.map(id => String(id))
        : []
    );

    cyMembrane.elements()
      .removeClass("route");

    cyMembrane.nodes().forEach(n => {
      if(nodeIds.has(String(n.id()))){
        n.addClass("route");
      }
    });

    cyMembrane.edges().forEach(e => {
      if(linkIds.has(String(e.id()))){
        e.addClass("route");
      }
    });

    // A semantic route is a highlight signal, not an implicit camera command.
    // Selection/navigation must never zoom or pan the 2D Brain unexpectedly.
    // Explicit focus remains available through the dedicated FOCO control.
  } catch(_) {}
});

window.addEventListener("akira:brain-select", function(ev){
  if (!cyMembrane) return;
  const nodeId = ev && ev.detail ? ev.detail.nodeId : null;
  try {
    membraneSelectedBrainNodeId = nodeId ? String(nodeId) : null;
    if (!nodeId) {
      _updateMembraneContextPanel(null);
      cyMembrane.elements()
        .unselect()
        .removeClass("highlighted")
        .removeClass("dimmed")
        .removeClass("route")
        .forEach(el => el.style("display","element"));
      cyMembrane.nodes().forEach(n => {
        const visible = _brainFilterNodeVisible(n) &&
          (membraneExploreDepth === 0 || membraneExploreVisibleNodeIds.has(String(n.id())));
        n.style("display", visible ? "element" : "none");
        n.style("text-opacity", (n.hasClass("core") || n.hasClass("hub")) ? (n.hasClass("core") ? 1 : 0.95) : 0);
      });
      cyMembrane.edges().forEach(e => {
        const source = cyMembrane.getElementById(String(e.data("source")));
        const target = cyMembrane.getElementById(String(e.data("target")));
        const visible = source.length && target.length &&
          _brainFilterNodeVisible(source) && _brainFilterNodeVisible(target) &&
          (membraneExploreDepth === 0 || membraneExploreVisibleLinkIds.has(String(e.id())));
        e.style("display", visible ? "element" : "none");
      });
      return;
    }
    const node = cyMembrane.getElementById(String(nodeId));
    if (node && !node.empty()) {
      cyMembrane.elements().unselect();
      node.select();
      _highlightNeighbors(node);

      // The selected node itself must never be dimmed/hidden, even when it has
      // no visible relations. This is especially important for the core.
      node.style("display","element");
      node.style("opacity",1);
      node.style("background-opacity",1);
      node.removeClass("dimmed");

      try {
        window.dispatchEvent(new CustomEvent("akira:brain-navigation", {
          detail:{nodeId:String(nodeId)}
        }));
      } catch(_) {}

      _updateMembraneContextPanel(String(nodeId));
    }
  } catch(_) {}
});

// ===========================================================================
// NAVEGACION
// ===========================================================================

window.addEventListener(
  "akira:section-shown",
  function (ev) {
    const section =
      ev &&
      ev.detail &&
      ev.detail.section;

    if (
      section === "membrane"
    ) {
      if (!cyMembrane) {
        initMembraneGraph();
      } else {
        try { cyMembrane.resize(); } catch(_) {}
      }

      // The Brain section can become visible after auth/session startup. Give
      // the layout one frame to acquire its real mobile dimensions, but do not
      // refetch the graph here: initialization already owns the data fetch.
      // This prevents duplicate refreshes from racing with the active 2D layout.
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (!cyMembrane) initMembraneGraph();
          if (cyMembrane) {
            try { cyMembrane.resize(); } catch(_) {}
          }
        }, 250);
      });
    }

    if (
      section === "office" &&
      document.getElementById(
        "officeCanvas"
      )
    ) {
      initOfficeFloor();
    }
  }
);

document.addEventListener(
  "DOMContentLoaded",
  function () {
    setTimeout(
      function () {
        if (
          document.getElementById(
            "membraneCy"
          )
        ) {
          initMembraneGraph();
        }

        if (
          document.getElementById(
            "officeCanvas"
          )
        ) {
          initOfficeFloor();
        }
      },
      500
    );
  }
);

// ===========================================================================
// OFICINA V1
// ===========================================================================

let officeCanvas;
let officeCtx;

let officeBgImage = null;
let officeSheetImage = null;

let officeBgLoaded = false;
let officeSheetLoaded = false;
let officeLoadError = null;

let officeAgents = [];
let officeLastFetch = 0;
let officeFetching = false;
let officeAnimId = null;

let officeSelectedAgent = null;
let officeClickBound = false;

const OFFICE_REFRESH_MS = 5000;

const spriteCache = {};

function initOfficeFloor() {
  officeCanvas =
    document.getElementById(
      "officeCanvas"
    );

  if (!officeCanvas) {
    return;
  }

  const rect =
    officeCanvas.parentElement
      .getBoundingClientRect();

  if (
    rect.width < 50 ||
    rect.height < 50
  ) {
    return;
  }

  officeCtx =
    officeCanvas.getContext(
      "2d"
    );

  officeCanvas.width =
    OFFICE_W;

  officeCanvas.height =
    OFFICE_H;

  officeCanvas.style.width =
    "auto";

  officeCanvas.style.height =
    "auto";

  officeCanvas.style.maxWidth =
    "100%";

  officeCanvas.style.maxHeight =
    "100%";

  officeCanvas.style.display =
    "block";

  officeCanvas.style.imageRendering =
    "pixelated";

  officeCtx.imageSmoothingEnabled =
    false;

  _bindOfficeClick();

  if (
    !officeBgLoaded ||
    !officeSheetLoaded
  ) {
    let pending = 2;

    const done = () => {
      pending--;

      if (
        pending === 0
      ) {
        officeBgLoaded =
          true;

        officeSheetLoaded =
          true;

        drawOffice();
      }
    };

    officeBgImage =
      new Image();

    officeBgImage.onload =
      done;

    officeBgImage.onerror =
      () => {
        officeLoadError =
          "No se pudo cargar fondo";

        pending--;

        if (
          pending === 0
        ) {
          drawOffice();
        }
      };

    officeBgImage.src =
      OFFICE_BG_URL +
      "?v=" +
      Date.now();

    officeSheetImage =
      new Image();

    officeSheetImage.onload =
      () => {
        buildSpriteCache();
        done();
      };

    officeSheetImage.onerror =
      () => {
        officeLoadError =
          "No se pudo cargar hoja de sprites";

        pending--;

        if (
          pending === 0
        ) {
          drawOffice();
        }
      };

    officeSheetImage.src =
      OFFICE_SHEET_URL +
      "?v=" +
      Date.now();

  } else {
    drawOffice();
  }

  refreshOffice(true);
}

function buildSpriteCache() {
  const img =
    officeSheetImage;

  if (!img) {
    return;
  }

  for (
    const role in SPRITE_RECTS
  ) {
    const r =
      SPRITE_RECTS[role];

    const w =
      r[2] - r[0];

    const h =
      r[3] - r[1];

    const c =
      document.createElement(
        "canvas"
      );

    c.width = w;
    c.height = h;

    const cx =
      c.getContext(
        "2d"
      );

    cx.imageSmoothingEnabled =
      false;

    cx.drawImage(
      img,
      r[0],
      r[1],
      w,
      h,
      0,
      0,
      w,
      h
    );

    spriteCache[role] =
      c;
  }
}

function _corridorOf(
  x,
  y
) {
  const dh =
    Math.abs(
      y - H_Y
    );

  const dl =
    Math.abs(
      x - VL_X
    );

  const dc =
    Math.abs(
      x - VC_X
    );

  const dr =
    Math.abs(
      x - VR_X
    );

  const m =
    Math.min(
      dh,
      dl,
      dc,
      dr
    );

  if (m === dh) {
    return "H";
  }

  if (m === dl) {
    return "VL";
  }

  if (m === dc) {
    return "VC";
  }

  return "VR";
}

function _vX(kind) {
  return kind === "VL"
    ? VL_X
    : (
        kind === "VC"
          ? VC_X
          : VR_X
      );
}

function _buildPath(
  cx,
  cy,
  tx,
  ty
) {
  const cCorr =
    _corridorOf(
      cx,
      cy
    );

  const tCorr =
    _corridorOf(
      tx,
      ty
    );

  const path = [];

  if (
    cCorr === "H" &&
    tCorr === "H"
  ) {
    path.push([
      tx,
      H_Y
    ]);

  } else if (
    cCorr === "H" &&
    tCorr !== "H"
  ) {
    const vx =
      _vX(tCorr);

    path.push([
      vx,
      H_Y
    ]);

    path.push([
      vx,
      ty
    ]);

  } else if (
    cCorr !== "H" &&
    tCorr === "H"
  ) {
    const vx =
      _vX(cCorr);

    path.push([
      vx,
      H_Y
    ]);

    path.push([
      tx,
      H_Y
    ]);

  } else {
    const vxC =
      _vX(cCorr);

    const vxT =
      _vX(tCorr);

    if (
      vxC === vxT
    ) {
      path.push([
        vxC,
        ty
      ]);

    } else {
      path.push([
        vxC,
        H_Y
      ]);

      path.push([
        vxT,
        H_Y
      ]);

      path.push([
        vxT,
        ty
      ]);
    }
  }

  return path;
}

function _pickRandomTarget() {
  const r =
    Math.random();

  if (r < 0.5) {
    return [
      H_POINTS[
        Math.floor(
          Math.random() *
          H_POINTS.length
        )
      ],
      H_Y
    ];
  }

  const vk =
    [
      "VL",
      "VC",
      "VR"
    ][
      Math.floor(
        Math.random() * 3
      )
    ];

  const vx =
    _vX(vk);

  const y =
    V_POINTS[
      Math.floor(
        Math.random() *
        V_POINTS.length
      )
    ];

  return [
    vx,
    y
  ];
}

function _ensureMovementState(a) {
  if (
    typeof a.x !==
    "number"
  ) {
    const h =
      HOME_POSITIONS[
        a.role
      ] ||
      [
        VC_X,
        420
      ];

    a.x = h[0];
    a.y = h[1];
  }

  if (!a.path) {
    a.path = [];
  }

  if (
    typeof a.nextMoveAt !==
    "number"
  ) {
    a.nextMoveAt =
      Date.now() +
      Math.random() *
        IDLE_WAIT_MS;
  }

  if (
    typeof a.facing !==
    "string"
  ) {
    a.facing =
      "idle";
  }
}

function _updateAgentMovement(a) {
  const now =
    Date.now();

  // IMPORTANTE:
  // Este movimiento es solamente visual.
  // No representa actividad real del agente.

  if (
    a.status === "busy"
  ) {
    const home =
      HOME_POSITIONS[
        a.role
      ] ||
      [
        a.x,
        a.y
      ];

    if (
      a.path.length === 0 &&
      (
        Math.abs(
          a.x - home[0]
        ) > 3 ||
        Math.abs(
          a.y - home[1]
        ) > 3
      )
    ) {
      a.path =
        _buildPath(
          a.x,
          a.y,
          home[0],
          home[1]
        );
    }

    if (
      a.path.length === 0 &&
      now > a.nextMoveAt
    ) {
      a.nextMoveAt =
        now +
        BUSY_WAIT_MS;
    }

  } else {
    if (
      a.path.length === 0 &&
      now > a.nextMoveAt
    ) {
      const t =
        _pickRandomTarget();

      a.path =
        _buildPath(
          a.x,
          a.y,
          t[0],
          t[1]
        );

      a.nextMoveAt =
        now +
        IDLE_WAIT_MS +
        Math.random() *
          5000;
    }
  }

  if (
    a.path.length === 0
  ) {
    a.facing =
      "idle";

    return;
  }

  const target =
    a.path[0];

  const dx =
    target[0] -
    a.x;

  const dy =
    target[1] -
    a.y;

  const dist =
    Math.sqrt(
      dx * dx +
      dy * dy
    );

  if (
    dist < 2
  ) {
    a.x =
      target[0];

    a.y =
      target[1];

    a.path.shift();

    if (
      a.path.length === 0
    ) {
      a.facing =
        "idle";
    }

    return;
  }

  const step =
    Math.min(
      WALK_SPEED,
      dist
    );

  a.x +=
    (dx / dist) *
    step;

  a.y +=
    (dy / dist) *
    step;

  if (
    Math.abs(dx) >
    Math.abs(dy)
  ) {
    a.facing =
      dx > 0
        ? "right"
        : "left";
  } else {
    a.facing =
      dy > 0
        ? "down"
        : "up";
  }
}

// ===========================================================================
// OFFICE V1 — INTERACCION Y FICHA C
// ===========================================================================

function _officeAgentAt(
  x,
  y
) {
  let hit = null;
  let best = Infinity;

  for (
    const a of officeAgents
  ) {
    if (
      typeof a.x !==
        "number" ||
      typeof a.y !==
        "number"
    ) {
      continue;
    }

    const sprite =
      spriteCache[
        a.role
      ];

    if (!sprite) {
      continue;
    }

    const sw =
      sprite.width *
      SPRITE_SCALE;

    const sh =
      sprite.height *
      SPRITE_SCALE;

    const radiusX =
      Math.max(
        18,
        sw * 0.7
      );

    const radiusY =
      Math.max(
        24,
        sh * 0.8
      );

    const dx =
      Math.abs(
        x - a.x
      );

    const dy =
      Math.abs(
        y -
        (
          a.y -
          sh * 0.45
        )
      );

    if (
      dx <= radiusX &&
      dy <= radiusY
    ) {
      const d =
        dx * dx +
        dy * dy;

      if (
        d < best
      ) {
        best = d;
        hit = a;
      }
    }
  }

  return hit;
}

function _officeStatusLabel(
  status
) {
  const s =
    String(
      status || ""
    ).toLowerCase();

  if (
    s === "busy" ||
    s === "working" ||
    s === "running"
  ) {
    return [
      "TRABAJANDO",
      "#60a5fa"
    ];
  }

  if (
    s === "error" ||
    s === "failed"
  ) {
    return [
      "ERROR",
      "#ef4444"
    ];
  }

  if (
    s === "disconnected" ||
    s === "offline"
  ) {
    return [
      "DESCONECTADO",
      "#9ca3af"
    ];
  }

  return [
    "DISPONIBLE",
    "#22c55e"
  ];
}

function _officeText(
  value,
  fallback
) {
  const s =
    value === null ||
    value === undefined
      ? ""
      : String(value)
          .trim();

  return (
    s ||
    (
      fallback ||
      "—"
    )
  );
}

function _officeDrawText(
  text,
  x,
  y,
  maxWidth,
  lineHeight
) {
  const words =
    String(text).split(
      /\s+/
    );

  let line = "";

  for (
    const word of words
  ) {
    const test =
      line
        ? line +
          " " +
          word
        : word;

    if (
      officeCtx.measureText(
        test
      ).width >
        maxWidth &&
      line
    ) {
      officeCtx.fillText(
        line,
        x,
        y
      );

      line =
        word;

      y +=
        lineHeight;

    } else {
      line =
        test;
    }
  }

  if (line) {
    officeCtx.fillText(
      line,
      x,
      y
    );
  }

  return y;
}

function _drawAgentFicha(a) {
  if (
    !a ||
    !officeCtx
  ) {
    return;
  }

  const W =
    OFFICE_W;

  const H =
    OFFICE_H;

  // Ventana C mediana, integrada
  // dentro del escenario.
  const ww = 450;
  const wh = 300;

  const wx =
    (W - ww) / 2;

  const wy =
    (H - wh) / 2;

  const status =
    _officeStatusLabel(
      a.status
    );

  const statusLabel =
    status[0];

  const statusColor =
    status[1];

  // Oscurecer la escena,
  // pero conservarla visible.
  officeCtx.fillStyle =
    "rgba(0,0,0,0.72)";

  officeCtx.fillRect(
    0,
    0,
    W,
    H
  );

  // Marco principal.
  officeCtx.fillStyle =
    "#0e0e12";

  officeCtx.fillRect(
    wx,
    wy,
    ww,
    wh
  );

  officeCtx.strokeStyle =
    "#8a8a93";

  officeCtx.lineWidth =
    4;

  officeCtx.strokeRect(
    wx,
    wy,
    ww,
    wh
  );

  // Segundo borde pixel-art.
  officeCtx.strokeStyle =
    "#23232a";

  officeCtx.lineWidth =
    2;

  officeCtx.strokeRect(
    wx + 8,
    wy + 8,
    ww - 16,
    wh - 16
  );

  // Nombre.
  officeCtx.textAlign =
    "left";

  officeCtx.font =
    "bold 17px monospace";

  officeCtx.fillStyle =
    "#ececf1";

  officeCtx.fillText(
    _officeText(
      a.name,
      a.role || "AGENTE"
    ).toUpperCase(),
    wx + 22,
    wy + 34
  );

  // Separador.
  officeCtx.fillStyle =
    "#202027";

  officeCtx.fillRect(
    wx + 22,
    wy + 48,
    ww - 44,
    2
  );

  // Estado.
  officeCtx.fillStyle =
    statusColor;

  officeCtx.fillRect(
    wx + 22,
    wy + 66,
    10,
    10
  );

  officeCtx.font =
    "bold 12px monospace";

  officeCtx.fillText(
    statusLabel,
    wx + 40,
    wy + 76
  );

  // Campos.
  officeCtx.font =
    "11px monospace";

  officeCtx.fillStyle =
    "#a8a8b3";

  const left =
    wx + 22;

  const valueX =
    wx + 150;

  const rows = [
    [
      "MODELO",
      _officeText(
        a.model
      )
    ],
    [
      "ACCIÓN",
      _officeText(
        a.current_action
      )
    ],
    [
      "TOOL",
      _officeText(
        a.tool
      )
    ],
    [
      "MISIÓN",
      _officeText(
        a.mission
      )
    ],
    [
      "MEMORIA",
      _officeText(
        a.memory_used
      )
    ]
  ];

  let yy =
    wy + 105;

  for (
    const [
      label,
      value
    ] of rows
  ) {
    officeCtx.fillStyle =
      "#777784";

    officeCtx.fillText(
      label,
      left,
      yy
    );

    officeCtx.fillStyle =
      "#e1e1e8";

    _officeDrawText(
      value,
      valueX,
      yy,
      ww - 175,
      15
    );

    yy += 34;
  }

  // Pie.
  officeCtx.fillStyle =
    "#202027";

  officeCtx.fillRect(
    wx + 22,
    wy + wh - 48,
    ww - 44,
    2
  );

  officeCtx.font =
    "10px monospace";

  officeCtx.fillStyle =
    "#777784";

  officeCtx.fillText(
    "DATOS DEL AGENTE • API V8",
    wx + 22,
    wy + wh - 27
  );

  // Botón X.
  const closeX =
    wx + ww - 42;

  const closeY =
    wy + 16;

  officeCtx.fillStyle =
    "#25252d";

  officeCtx.fillRect(
    closeX,
    closeY,
    24,
    24
  );

  officeCtx.strokeStyle =
    "#777784";

  officeCtx.strokeRect(
    closeX,
    closeY,
    24,
    24
  );

  officeCtx.fillStyle =
    "#ececf1";

  officeCtx.font =
    "bold 14px monospace";

  officeCtx.textAlign =
    "center";

  officeCtx.fillText(
    "X",
    closeX + 12,
    closeY + 17
  );

  officeCtx.textAlign =
    "left";
}

function _bindOfficeClick() {
  if (
    officeClickBound ||
    !officeCanvas
  ) {
    return;
  }

  officeClickBound =
    true;

  const handler =
    (ev) => {
      if (!officeCanvas) {
        return;
      }

      const rect =
        officeCanvas
          .getBoundingClientRect();

      if (
        !rect.width ||
        !rect.height
      ) {
        return;
      }

      // Convierte coordenadas
      // reales de pantalla a
      // coordenadas internas
      // 720x630 del canvas.
      const x =
        (
          ev.clientX -
          rect.left
        ) *
        (
          OFFICE_W /
          rect.width
        );

      const y =
        (
          ev.clientY -
          rect.top
        ) *
        (
          OFFICE_H /
          rect.height
        );

      // Si ya hay ficha abierta.
      if (
        officeSelectedAgent
      ) {
        const ww = 450;
        const wh = 300;

        const wx =
          (OFFICE_W - ww) /
          2;

        const wy =
          (OFFICE_H - wh) /
          2;

        // Botón X.
        if (
          x >= wx + ww - 58 &&
          x <= wx + ww &&
          y >= wy &&
          y <= wy + 50
        ) {
          officeSelectedAgent =
            null;

          return;
        }

        // Tocar dentro de la
        // ventana no hace nada.
        if (
          x >= wx &&
          x <= wx + ww &&
          y >= wy &&
          y <= wy + wh
        ) {
          return;
        }

        // Tocar fuera cierra.
        officeSelectedAgent =
          null;

        return;
      }

      // Si no hay ficha,
      // buscamos agente.
      const agent =
        _officeAgentAt(
          x,
          y
        );

      if (agent) {
        officeSelectedAgent =
          agent;
      }
    };

  officeCanvas.addEventListener(
    "pointerup",
    handler,
    {
      passive: true
    }
  );
}

function drawOffice() {
  if (!officeCtx) {
    return;
  }

  const W =
    OFFICE_W;

  const H =
    OFFICE_H;

  officeCtx.fillStyle =
    "#0b0b0e";

  officeCtx.fillRect(
    0,
    0,
    W,
    H
  );

  if (
    officeLoadError
  ) {
    officeCtx.fillStyle =
      "#ef4444";

    officeCtx.font =
      "20px monospace";

    officeCtx.textAlign =
      "center";

    officeCtx.fillText(
      "Oficina: " +
        officeLoadError,
      W / 2,
      H / 2
    );

    return;
  }

  if (
    !officeBgLoaded ||
    !officeSheetLoaded
  ) {
    officeCtx.fillStyle =
      "#8a8a93";

    officeCtx.font =
      "20px monospace";

    officeCtx.textAlign =
      "center";

    officeCtx.fillText(
      "Cargando oficina...",
      W / 2,
      H / 2
    );

    officeAnimId =
      requestAnimationFrame(
        drawOffice
      );

    return;
  }

  // Fondo.
  officeCtx.drawImage(
    officeBgImage,
    0,
    0,
    W,
    H
  );

  const sorted =
    officeAgents
      .slice()
      .sort(
        (a, b) => {
          _ensureMovementState(a);
          _ensureMovementState(b);

          return (
            a.y -
            b.y
          );
        }
      );

  sorted.forEach(
    a => {
      _ensureMovementState(a);

      _updateAgentMovement(a);

      const role =
        a.role ||
        "generic";

      const sprite =
        spriteCache[
          role
        ];

      if (!sprite) {
        return;
      }

      const sw =
        sprite.width *
        SPRITE_SCALE;

      const sh =
        sprite.height *
        SPRITE_SCALE;

      let bob = 0;

      const moving =
        a.facing &&
        a.facing !==
          "idle";

      if (moving) {
        bob =
          Math.sin(
            Date.now() *
              0.02
          ) * 1.2;

      } else if (
        a.status ===
        "busy"
      ) {
        bob =
          Math.sin(
            Date.now() *
              0.005
          ) * 2;
      }

      const dx =
        a.x -
        sw / 2;

      const dy =
        a.y -
        sh +
        bob;

      // Sombra.
      officeCtx.fillStyle =
        "rgba(0,0,0,0.35)";

      officeCtx.beginPath();

      officeCtx.ellipse(
        a.x,
        a.y + 3,
        sw * 0.4,
        4,
        0,
        0,
        Math.PI * 2
      );

      officeCtx.fill();

      // Sprite.
      officeCtx.drawImage(
        sprite,
        dx,
        dy,
        sw,
        sh
      );

      // Indicador de estado.
      let ledColor =
        "#22c55e";

      if (
        a.status ===
        "busy"
      ) {
        ledColor =
          "#60a5fa";

      } else if (
        a.status ===
        "error"
      ) {
        ledColor =
          "#ef4444";
      }

      officeCtx.fillStyle =
        ledColor;

      officeCtx.fillRect(
        a.x +
          sw / 2 -
          4,
        dy - 6,
        8,
        8
      );

      officeCtx.strokeStyle =
        "#0b0b0e";

      officeCtx.lineWidth =
        2;

      officeCtx.strokeRect(
        a.x +
          sw / 2 -
          4,
        dy - 6,
        8,
        8
      );

      // Nombre.
      officeCtx.fillStyle =
        "rgba(11, 11, 14, 0.85)";

      const label =
        (
          a.name ||
          "?"
        ).slice(
          0,
          14
        );

      officeCtx.font =
        "bold 11px monospace";

      const tw =
        officeCtx.measureText(
          label
        ).width;

      officeCtx.fillRect(
        a.x -
          tw / 2 -
          4,
        a.y + 8,
        tw + 8,
        14
      );

      officeCtx.fillStyle =
        "#ececf1";

      officeCtx.textAlign =
        "center";

      officeCtx.fillText(
        label,
        a.x,
        a.y + 19
      );
    }
  );

  // Ficha C encima
  // del escenario.
  if (
    officeSelectedAgent
  ) {
    const live =
      officeAgents.find(
        a =>
          (
            a.id &&
            officeSelectedAgent.id &&
            a.id ===
              officeSelectedAgent.id
          ) ||
          (
            a.agent_id &&
            officeSelectedAgent.agent_id &&
            a.agent_id ===
              officeSelectedAgent.agent_id
          ) ||
          (
            a.name &&
            officeSelectedAgent.name &&
            a.name ===
              officeSelectedAgent.name
          )
      );

    if (live) {
      officeSelectedAgent =
        live;
    }

    _drawAgentFicha(
      officeSelectedAgent
    );
  }

  refreshOffice(false);

  officeAnimId =
    requestAnimationFrame(
      drawOffice
    );
}

async function refreshOffice(
  force
) {
  if (
    officeFetching
  ) {
    return;
  }

  if (
    !force &&
    Date.now() -
      officeLastFetch <
      OFFICE_REFRESH_MS
  ) {
    return;
  }

  officeFetching =
    true;

  officeLastFetch =
    Date.now();

  try {
    const data =
      await _fetchJson(
        "/api/v8/agents"
      );

    if (
      data &&
      data.ok
    ) {
      const prevByName =
        new Map(
          officeAgents.map(
            a => [
              a.name,
              a
            ]
          )
        );

      officeAgents =
        (
          data.agents ||
          []
        ).map(
          a => {
            const prev =
              prevByName.get(
                a.name
              );

            const merged =
              Object.assign(
                {},
                prev || {},
                a
              );

            _ensureMovementState(
              merged
            );

            return merged;
          }
        );
    }
  } catch (e) {
    // Mantener los datos
    // anteriores si el backend
    // no responde.
  } finally {
    officeFetching =
      false;
  }
}

function addOfficeLog(
  text,
  type
) {
  const el =
    document.getElementById(
      "officeLog"
    );

  if (!el) {
    return;
  }

  const div =
    document.createElement(
      "div"
    );

  div.style.cssText =
    "font-size:11px;padding:4px 8px;border-bottom:1px solid #23232a;color:" +
    (
      type === "agent"
        ? "#10b981"
        : "#8a8a93"
    );

  div.textContent =
    new Date().toLocaleTimeString() +
    " - " +
    text;

  el.prepend(div);

  if (
    el.children.length >
    80
  ) {
    el.removeChild(
      el.lastChild
    );
  }
}

function updateOfficeStats() {
  const el =
    document.getElementById(
      "officeStats"
    );

  if (!el) {
    return;
  }

  el.innerHTML =
    "<b>" +
    officeAgents.length +
    " agentes reales</b>";
}

// ===========================================================================
// API PUBLICA
// ===========================================================================

window.AkiraMembrane = {
  initMembraneGraph,
  initOfficeFloor,
  refreshMembrane,
  refreshOffice,
  addOfficeLog,
  updateOfficeStats,
  resizeMembrane:
    function(){
      try {
        if (cyMembrane) {
          cyMembrane.resize();
          _scheduleFlowerViewportRestore();
        }
      } catch(_) {}
    },
  reorganize:
    window.reorganizeMembrane,
};
