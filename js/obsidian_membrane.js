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

async function _fetchJson(url) {
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
let membraneLayoutRunning = false;
let _communityState = null;
let membraneBrainFilterGroup = "all";
let membraneBrainRelationFilter = "all";
let membraneSelectedBrainNodeId = null;

const MEMBRANE_REFRESH_MS = 7000;
const MIN_EDGE_WEIGHT_VISIBLE = 0.4;
const MAX_EDGES_PER_NODE = 4;
const MAX_NODES_PER_CLUSTER = 10;

const _positionCache = new Map();
let _lastGraphSignature = "";

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
  const W = cyMembrane.width() || 800;
  const H = cyMembrane.height() || 600;
  const cx = W / 2;
  const cy = H / 2;
  const positions = {};

  if (coreId) {
    positions[coreId] = { x: cx, y: cy };
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
    if (n.id === coreId) continue;
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
      const n = nodes.find(x => x.id === id);
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

function _placeNearHub(
  nodeId,
  hubId,
  centerPos
) {
  if (
    !hubId ||
    !_positionCache.has(hubId)
  ) {
    const angle =
      Math.random() *
      Math.PI *
      2;

    const r =
      70 +
      Math.random() * 40;

    return {
      x:
        centerPos.x +
        r * Math.cos(angle),

      y:
        centerPos.y +
        r * Math.sin(angle)
    };
  }

  const hub =
    _positionCache.get(hubId);

  const angle =
    Math.random() *
    Math.PI *
    2;

  const r =
    50 +
    Math.random() * 30;

  return {
    x:
      hub.x +
      r * Math.cos(angle),

    y:
      hub.y +
      r * Math.sin(angle)
  };
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

  if (
    sig !== _lastGraphSignature
  ) {
    _lastGraphSignature = sig;
    _positionCache.clear();
  }

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

    for (const n of missing) {
      if (n.id === coreId) {
        _positionCache.set(
          n.id,
          centerPos
        );

        const el =
          cyMembrane.getElementById(
            n.id
          );

        if (
          el &&
          !el.empty()
        ) {
          el.position(centerPos);
        }

        continue;
      }

      const g =
        _detectGroup(n);

      const pos =
        _placeNearHub(
          n.id,
          hubByGroup[g],
          centerPos
        );

      _positionCache.set(
        n.id,
        pos
      );

      const el =
        cyMembrane.getElementById(
          n.id
        );

      if (
        el &&
        !el.empty()
      ) {
        el.position(pos);
      }
    }

    return false;
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
          "data(color)",

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
          "data(color)",

        "shadow-opacity":
          0.55,

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
          22,

        "shadow-opacity":
          0.75,
      }
    },

    {
      selector: "node.core",
      style: {
        "background-color":
          "#ff6b6b",

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
          50,

        "shadow-color":
          "#ff6b6b",

        "shadow-opacity":
          1.0,
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
          "#484f58",

        "curve-style":
          "straight",

        "opacity":
          0.35,

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
          "#ff8a8a",

        "opacity":
          0.6,

        "width":
          1.4
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
          0.85,

        "line-color":
          "#b8b8d0"
      }
    },

    {
      selector:
        "edge.dimmed",

      style: {
        "opacity":
          0.04
      }
    }
  ];
}

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
    cyMembrane.resize();
    refreshMembrane(true);
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

    cyMembrane.on(
      "tap",
      "node",
      (evt) => {
        _highlightNeighbors(
          evt.target
        );
        try {
          window.dispatchEvent(new CustomEvent("akira:brain-select", {
            detail: { nodeId: evt.target.id() }
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
            if (cyMembrane) {
              cyMembrane.resize();
            }
          }
        );

      ro.observe(container);
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

  try {
    const data =
      await _fetchJson(
        "/api/v8/graph/overview"
      );

    if (
      data &&
      data.ok
    ) {
      _applyGraphToCy(data);
      membraneError = null;
    }
  } catch (e) {
    membraneError =
      String(
        e &&
        e.message
          ? e.message
          : e
      );
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
      n.id === coreId
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
      n.id === coreId;

    const isHub =
      hubIds.has(n.id);

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

  const seedRan =
    _applySeedPositions(
      nodesForSeed,
      edges,
      coreId
    );

  // Preserve the deterministic community flower. The previous force-directed
  // relax was mathematically valid but visually collapsed the petals into a
  // ring on dense graphs.
  if (
    seedRan
  ) {
    try {
      cyMembrane.fit(undefined, 80);
      const coreEl = cyMembrane.nodes(".core");
      if(coreEl && coreEl.length) cyMembrane.center(coreEl);
    } catch(_) {}
  } else if (
    !seedRan &&
    !membraneLayoutRunning
  ) {
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

  el.textContent =
    (c.nodes || 0) +
    " nodos · " +
    (c.edges || 0) +
    " aristas · " +
    clusterCount +
    " clusters";
}

// ===========================================================================
// BRAIN 2D/3D — SINCRONIZACION DE SELECCION
// ===========================================================================
window.addEventListener("akira:brain-navigation", function(ev){
  try {
    const detail = ev && ev.detail ? ev.detail : {};
    const id = detail.nodeId ? String(detail.nodeId) : null;
    if(!id || !cyMembrane) return;

    const node = cyMembrane.getElementById(id);
    if(node && node.length){
      cyMembrane.nodes().unselect();
      node.select();
      cyMembrane.animate({
        center:{eles:node},
        duration:500
      });
    }
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

    if(nodeIds.size){
      const routeNodes = cyMembrane.nodes().filter(
        n => nodeIds.has(String(n.id()))
      );
      if(routeNodes.length){
        cyMembrane.fit(routeNodes, 70);
      }
    }
  } catch(_) {}
});

window.addEventListener("akira:brain-select", function(ev){
  if (!cyMembrane) return;
  const nodeId = ev && ev.detail ? ev.detail.nodeId : null;
  try {
    membraneSelectedBrainNodeId = nodeId ? String(nodeId) : null;
    if (!nodeId) {
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

      try {
        window.dispatchEvent(new CustomEvent("akira:brain-navigation", {
          detail:{nodeId:String(nodeId)}
        }));
      } catch(_) {}
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
        setTimeout(
          () => {
            if (cyMembrane) {
              cyMembrane.resize();
            }
          },
          100
        );
      }
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
        if (cyMembrane) cyMembrane.resize();
      } catch(_) {}
    },
  reorganize:
    window.reorganizeMembrane,
};
