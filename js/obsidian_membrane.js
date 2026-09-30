// AKIRA OBSIDIAN MEMBRANE + OFFICE FLOOR - V11.0
// Membrana: estilo Obsidian puro, máquina de estados limpia para gestos.
// Fix bugs V10.0: listeners duplicados, detección tap, doble-tap, limpieza de gesto.
// Oficina: igual que V10.0.

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

// ===========================================================================
// MEMBRANA — Obsidian puro con máquina de estados
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

// ---- Viewport ----
let mPanX = 0, mPanY = 0;
let mZoom = 1.0;
const M_ZOOM_MIN = 0.35;
const M_ZOOM_MAX = 3.0;
const M_ZOOM_DEFAULT = 1.0;

// ---- Selección ----
let mSelectedNode = null;

// ---- Máquina de estados de gesto ----
// Estados posibles:
//   null        -> sin gesto activo
//   "pending"   -> dedo bajado, aún sin decidir si es tap/pan/drag
//   "panning"   -> moviendo el lienzo
//   "dragging"  -> moviendo un nodo
//   "pinching"  -> zoom con 2 dedos
let mGestureState = null;
let mGestureStart = { x: 0, y: 0 };      // posición inicial (canvas coords)
let mGestureLast = { x: 0, y: 0 };       // última posición (canvas coords)
let mGestureNode = null;                  // nodo siendo arrastrado
let mGestureMoved = false;                // se movió lo suficiente para no ser tap

// Doble tap
let mLastTapTime = 0;
let mLastTapX = 0;
let mLastTapY = 0;
const M_TAP_MAX_MS = 300;
const M_TAP_MAX_MOVE = 10;                // px en canvas coords
const M_TAP_MAX_DIST = 40;                // entre taps para contar como doble
const M_DOUBLE_TAP_MS = 350;

// Pinch
let mPinchStartDist = 0;
let mPinchStartZoom = 1.0;
let mPinchAnchorWorld = { x: 0, y: 0 };   // punto del mundo bajo el punto medio
let mPinchAnchorCanvas = { x: 0, y: 0 };  // posición inicial del punto medio

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

  _bindMembraneInteractions();

  if (membraneAnimId) cancelAnimationFrame(membraneAnimId);
  drawMembrane();
  refreshMembrane(true);
}

// ---------------------------------------------------------------- helpers
function _evToCanvas(clientX, clientY) {
  const r = membraneCanvas.getBoundingClientRect();
  const sx = membraneCanvas.width / r.width;
  const sy = membraneCanvas.height / r.height;
  return {
    x: (clientX - r.left) * sx,
    y: (clientY - r.top) * sy,
  };
}

function _canvasToWorld(px, py) {
  return {
    x: (px - mPanX) / mZoom,
    y: (py - mPanY) / mZoom,
  };
}

function _hitNode(px, py) {
  const w = _canvasToWorld(px, py);
  let best = null, bestD = Infinity;
  for (const nd of membraneNodes) {
    const d = Math.hypot(nd.x - w.x, nd.y - w.y);
    const threshold = nd.r + 8 / mZoom;
    if (d < threshold && d < bestD) { best = nd; bestD = d; }
  }
  return best;
}

function _touchDist(t1, t2) {
  return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
}

function _touchMid(t1, t2) {
  return {
    clientX: (t1.clientX + t2.clientX) / 2,
    clientY: (t1.clientY + t2.clientY) / 2,
  };
}

function _resetGesture() {
  mGestureState = null;
  mGestureNode = null;
  mGestureMoved = false;
}

// ---------------------------------------------------------------- interacciones
function _bindMembraneInteractions() {
  if (!membraneCanvas || membraneCanvas._akiraBound) return;
  membraneCanvas._akiraBound = true;

  // ---- TOUCH ----
  membraneCanvas.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      mGestureState = "pinching";
      mGestureNode = null;
      const mid = _touchMid(e.touches[0], e.touches[1]);
      const midCanvas = _evToCanvas(mid.clientX, mid.clientY);
      mPinchStartDist = _touchDist(e.touches[0], e.touches[1]) || 1;
      mPinchStartZoom = mZoom;
      mPinchAnchorCanvas = midCanvas;
      mPinchAnchorWorld = _canvasToWorld(midCanvas.x, midCanvas.y);
      return;
    }

    if (e.touches.length === 1) {
      const p = _evToCanvas(e.touches[0].clientX, e.touches[0].clientY);
      mGestureStart = p;
      mGestureLast = p;
      mGestureMoved = false;

      const hit = _hitNode(p.x, p.y);
      if (hit) {
        mGestureState = "pending";
        mGestureNode = hit;
      } else {
        mGestureState = "pending";
        mGestureNode = null;
      }
    }
  }, { passive: false });

  membraneCanvas.addEventListener("touchmove", (e) => {
    if (mGestureState === "pinching" && e.touches.length === 2) {
      e.preventDefault();
      const newDist = _touchDist(e.touches[0], e.touches[1]) || 1;
      let newZoom = mPinchStartZoom * (newDist / mPinchStartDist);
      newZoom = Math.max(M_ZOOM_MIN, Math.min(M_ZOOM_MAX, newZoom));

      // Anclar: el punto del mundo bajo el centro actual debe quedar bajo el centro actual.
      const mid = _touchMid(e.touches[0], e.touches[1]);
      const midCanvasNow = _evToCanvas(mid.clientX, mid.clientY);

      mZoom = newZoom;
      mPanX = midCanvasNow.x - mPinchAnchorWorld.x * mZoom;
      mPanY = midCanvasNow.y - mPinchAnchorWorld.y * mZoom;
      return;
    }

    if (e.touches.length === 1 && (mGestureState === "pending" || mGestureState === "panning" || mGestureState === "dragging")) {
      const p = _evToCanvas(e.touches[0].clientX, e.touches[0].clientY);
      const dx = p.x - mGestureStart.x;
      const dy = p.y - mGestureStart.y;
      const moved = Math.hypot(dx, dy);

      // Decidir tipo de gesto si estábamos pending y ya nos movimos
      if (mGestureState === "pending" && moved > 6) {
        if (mGestureNode) mGestureState = "dragging";
        else mGestureState = "panning";
        mGestureMoved = true;
      }

      if (mGestureState === "dragging" && mGestureNode) {
        // Mover el nodo
        const w = _canvasToWorld(p.x, p.y);
        mGestureNode.x = w.x;
        mGestureNode.y = w.y;
        mGestureNode.vx = 0;
        mGestureNode.vy = 0;
      } else if (mGestureState === "panning") {
        mPanX += p.x - mGestureLast.x;
        mPanY += p.y - mGestureLast.y;
      }

      mGestureLast = p;
      if (e.cancelable) e.preventDefault();
    }
  }, { passive: false });

  const endTouch = (e) => {
    // Si quedan dedos activos, actualizar estado
    if (e.touches.length === 2) {
      // Se acaba de soltar uno y quedan 2: poco probable pero por si acaso
      mGestureState = "pinching";
      const mid = _touchMid(e.touches[0], e.touches[1]);
      const midCanvas = _evToCanvas(mid.clientX, mid.clientY);
      mPinchStartDist = _touchDist(e.touches[0], e.touches[1]) || 1;
      mPinchStartZoom = mZoom;
      mPinchAnchorCanvas = midCanvas;
      mPinchAnchorWorld = _canvasToWorld(midCanvas.x, midCanvas.y);
      return;
    }
    if (e.touches.length === 1) {
      // Quedan 1 dedo. Reiniciar como pending (por ejemplo si veníamos de pinch).
      const p = _evToCanvas(e.touches[0].clientX, e.touches[0].clientY);
      mGestureState = "pending";
      mGestureStart = p;
      mGestureLast = p;
      mGestureNode = _hitNode(p.x, p.y);
      mGestureMoved = false;
      return;
    }

    // 0 dedos: gesto terminado
    if (mGestureState === "pending" && !mGestureMoved) {
      // Fue un tap
      const now = Date.now();
      const dt = now - mLastTapTime;
      const dd = Math.hypot(mGestureStart.x - mLastTapX, mGestureStart.y - mLastTapY);

      if (dt < M_DOUBLE_TAP_MS && dd < M_TAP_MAX_DIST) {
        // Doble tap -> resetear vista y deseleccionar
        mZoom = M_ZOOM_DEFAULT;
        mPanX = 0;
        mPanY = 0;
        mSelectedNode = null;
        mLastTapTime = 0;
      } else {
        // Tap simple
        const hit = _hitNode(mGestureStart.x, mGestureStart.y);
        if (hit) {
          // Toggle: si el mismo nodo ya estaba seleccionado, deseleccionar
          if (mSelectedNode === hit.id) mSelectedNode = null;
          else mSelectedNode = hit.id;
        } else {
          mSelectedNode = null;
        }
        mLastTapTime = now;
        mLastTapX = mGestureStart.x;
        mLastTapY = mGestureStart.y;
      }
    }

    _resetGesture();
  };

  membraneCanvas.addEventListener("touchend", endTouch, { passive: true });
  membraneCanvas.addEventListener("touchcancel", endTouch, { passive: true });

  // ---- POINTER (desktop) ----
  membraneCanvas.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") return;
    const p = _evToCanvas(e.clientX, e.clientY);
    mGestureStart = p;
    mGestureLast = p;
    mGestureMoved = false;

    const hit = _hitNode(p.x, p.y);
    if (hit) {
      mGestureState = "pending";
      mGestureNode = hit;
    } else {
      mGestureState = "pending";
      mGestureNode = null;
    }
  });

  membraneCanvas.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    if (mGestureState !== "pending" && mGestureState !== "panning" && mGestureState !== "dragging") return;

    const p = _evToCanvas(e.clientX, e.clientY);
    const moved = Math.hypot(p.x - mGestureStart.x, p.y - mGestureStart.y);

    if (mGestureState === "pending" && moved > 6) {
      if (mGestureNode) mGestureState = "dragging";
      else mGestureState = "panning";
      mGestureMoved = true;
    }

    if (mGestureState === "dragging" && mGestureNode) {
      const w = _canvasToWorld(p.x, p.y);
      mGestureNode.x = w.x;
      mGestureNode.y = w.y;
      mGestureNode.vx = 0;
      mGestureNode.vy = 0;
    } else if (mGestureState === "panning") {
      mPanX += p.x - mGestureLast.x;
      mPanY += p.y - mGestureLast.y;
    }

    mGestureLast = p;
  });

  const endPointer = (e) => {
    if (e.pointerType === "touch") return;

    if (mGestureState === "pending" && !mGestureMoved) {
      const now = Date.now();
      const dt = now - mLastTapTime;
      const dd = Math.hypot(mGestureStart.x - mLastTapX, mGestureStart.y - mLastTapY);

      if (dt < M_DOUBLE_TAP_MS && dd < M_TAP_MAX_DIST) {
        mZoom = M_ZOOM_DEFAULT;
        mPanX = 0;
        mPanY = 0;
        mSelectedNode = null;
        mLastTapTime = 0;
      } else {
        const hit = _hitNode(mGestureStart.x, mGestureStart.y);
        if (hit) {
          if (mSelectedNode === hit.id) mSelectedNode = null;
          else mSelectedNode = hit.id;
        } else {
          mSelectedNode = null;
        }
        mLastTapTime = now;
        mLastTapX = mGestureStart.x;
        mLastTapY = mGestureStart.y;
      }
    }

    _resetGesture();
  };

  membraneCanvas.addEventListener("pointerup", endPointer);
  membraneCanvas.addEventListener("pointercancel", endPointer);
  membraneCanvas.addEventListener("pointerleave", () => {
    if (mGestureState !== "pinching") _resetGesture();
  });
}

// ---------------------------------------------------------------- datos
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
        const r = 5 + Math.min((n.reuse_count || 0) * 0.8, 8) + Math.min((n.weight || 0) * 0.5, 4);
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

// ---------------------------------------------------------------- fisica
function stepMembranePhysics() {
  const W = membraneCanvas.width, H = membraneCanvas.height;
  const cx = W / 2, cy = H / 2;
  const n = membraneNodes.length;
  if (n === 0) return;

  for (const nd of membraneNodes) { nd.fx = 0; nd.fy = 0; }

  const rep = 3000;
  const minD = 50;
  const maxRepForce = 5;
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

  const springK = 0.005;
  const restLen = 120;
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

  const gk = 0.018;
  for (const nd of membraneNodes) {
    nd.fx += (cx - nd.x) * gk;
    nd.fy += (cy - nd.y) * gk;
  }

  const damp = 0.75;
  const maxV = 6;
  const dragged = (mGestureState === "dragging" && mGestureNode) ? mGestureNode : null;
  for (const nd of membraneNodes) {
    if (nd === dragged) { nd.vx = 0; nd.vy = 0; continue; }
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

// ---------------------------------------------------------------- dibujo
function drawMembrane() {
  if (!membraneCtx) return;
  const W = membraneCanvas.width, H = membraneCanvas.height;

  // Fondo
  membraneCtx.fillStyle = "#0a0a0d";
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

  if (membranePhysicsOn) stepMembranePhysics();

  const byId = new Map(membraneNodes.map(nd => [nd.id, nd]));

  const neighbors = new Set();
  if (mSelectedNode) {
    neighbors.add(mSelectedNode);
    for (const e of membraneEdges) {
      if (e.from_node === mSelectedNode) neighbors.add(e.to_node);
      if (e.to_node === mSelectedNode) neighbors.add(e.from_node);
    }
  }

  // Vista con pan/zoom
  membraneCtx.save();
  membraneCtx.translate(mPanX, mPanY);
  membraneCtx.scale(mZoom, mZoom);

  // Aristas rectas
  membraneCtx.lineCap = "round";
  for (const e of membraneEdges) {
    const a = byId.get(e.from_node), b = byId.get(e.to_node);
    if (!a || !b) continue;

    const connected = !mSelectedNode ||
      (e.from_node === mSelectedNode || e.to_node === mSelectedNode);

    const w = e.weight || 1;
    let alpha = Math.min(0.55, 0.15 + w * 0.08);
    if (!connected) alpha = 0.05;

    membraneCtx.strokeStyle = "rgba(160, 170, 200, " + alpha.toFixed(3) + ")";
    membraneCtx.lineWidth = Math.min(2, 0.6 + w * 0.3);
    membraneCtx.beginPath();
    membraneCtx.moveTo(a.x, a.y);
    membraneCtx.lineTo(b.x, b.y);
    membraneCtx.stroke();
  }

  // Nodos solidos
  membraneCtx.textAlign = "center";
  for (const nd of membraneNodes) {
    const color = NODE_TYPE_COLORS[nd.node_type] || "#6366f1";
    const isSelected = mSelectedNode === nd.id;
    const isNeighbor = mSelectedNode && neighbors.has(nd.id);
    const dimmed = mSelectedNode && !isNeighbor;

    const opacity = dimmed ? 0.15 : 1.0;

    membraneCtx.globalAlpha = opacity;
    membraneCtx.fillStyle = color;
    membraneCtx.beginPath();
    membraneCtx.arc(nd.x, nd.y, nd.r, 0, Math.PI * 2);
    membraneCtx.fill();

    if (isSelected) {
      membraneCtx.strokeStyle = "#ffffff";
      membraneCtx.lineWidth = 1.5 / mZoom;
      membraneCtx.beginPath();
      membraneCtx.arc(nd.x, nd.y, nd.r + 3 / mZoom, 0, Math.PI * 2);
      membraneCtx.stroke();
    }
    membraneCtx.globalAlpha = 1;

    const label = String(nd.label || nd.id || "").slice(0, 24);
    if (label) {
      const isHighlight = isSelected || (isNeighbor && mSelectedNode);
      const labelAlpha = dimmed ? 0.12 : (isHighlight ? 1 : 0.55);
      const fontSize = isHighlight ? 12 : 10;
      membraneCtx.font = (isHighlight ? "bold " : "") + fontSize + "px monospace";
      const lx = nd.x, ly = nd.y + nd.r + 12;

      membraneCtx.globalAlpha = labelAlpha;
      membraneCtx.fillStyle = isHighlight ? "#ffffff" : "#d0d0d8";
      membraneCtx.fillText(label, lx, ly);
      membraneCtx.globalAlpha = 1;
    }
  }

  membraneCtx.restore();

  // HUD
  membraneCtx.textAlign = "right";
  membraneCtx.font = "11px monospace";
  membraneCtx.fillStyle = "#7a7a83";
  membraneCtx.fillText(
    (membraneCounts.nodes || 0) + " nodos · " + (membraneCounts.edges || 0) + " aristas",
    W - 14, H - 14
  );

  membraneCtx.textAlign = "left";
  membraneCtx.font = "10px monospace";
  membraneCtx.fillStyle = "#4a4a53";
  if (mSelectedNode) {
    const sel = byId.get(mSelectedNode);
    const selLabel = sel ? (sel.label || sel.id) : mSelectedNode;
    membraneCtx.fillStyle = "#facc15";
    membraneCtx.fillText("Seleccionado: " + String(selLabel).slice(0, 30), 14, 22);
    membraneCtx.fillStyle = "#4a4a53";
    membraneCtx.fillText("Toca fuera para deseleccionar", 14, 38);
  } else {
    membraneCtx.fillText("Tap: seleccionar · Arrastra: mover · Pinch: zoom · Doble tap: reset", 14, 22);
  }

  if (Math.abs(mZoom - 1.0) > 0.01) {
    membraneCtx.textAlign = "right";
    membraneCtx.font = "10px monospace";
    membraneCtx.fillStyle = "#4a4a53";
    membraneCtx.fillText(mZoom.toFixed(2) + "x", W - 14, 22);
  }

  refreshMembrane(false);
  membraneAnimId = requestAnimationFrame(drawMembrane);
}

function addNeuronaToGraph() { /* no-op */ }

// ===========================================================================
// OFICINA (igual que V10.0)
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
