
// AKIRA BRAIN 2D/3D — V1
// Vista 3D sobre el mismo grafo de conocimiento que alimenta el Brain 2D.
// Motor: 3d-force-graph (Three.js/WebGL), licencia MIT.
// No crea ni duplica datos: consume /api/v8/graph/overview.

(function(){
  "use strict";

  const API = "https://akira-empresa.onrender.com";
  const REFRESH_MS = 7000;
  const MAX_NODES = 500;
  const MAX_EDGES = 1200;

  const GROUP_COLORS = {
    memory:"#7ee787", learning:"#56d4dd", agent:"#f778ba",
    tool:"#79c0ff", concept:"#a78bfa", project:"#ffa657",
    document:"#d2a8ff", skill:"#ffd866", error:"#ff7b72",
    solution:"#56d364", mission:"#ffb86c", other:"#8b949e"
  };

  let fg = null;
  let fetching = false;
  let graphData = {nodes:[], links:[]};
  let selectedNodeId = null;
  let hoveredNodeId = null;
  let currentMode = "2d";
  let initialized = false;
  let refreshTimer = null;
  let autoOrbit = false;
  let lastFetchAt = 0;
  let forceGraphLoading = null;
  const EXTERNAL_SCRIPT_TIMEOUT_MS = 10000;
  // 3d-force-graph UMD bundles its Three.js dependency. Do not load a
  // separate global THREE build: Three r161+ removed the UMD build/three.min.js
  // and the graph package already carries the renderer dependency.
  const FORCE_GRAPH_SOURCES = [
    "https://cdn.jsdelivr.net/npm/3d-force-graph@1.80.1/dist/3d-force-graph.min.js",
    "https://unpkg.com/3d-force-graph@1.80.1/dist/3d-force-graph.min.js"
  ];
  const glowNodeObjects = new Map();
  let communityState = {
    assignments: new Map(),
    centers: new Map(),
    hubs: new Set(),
    count: 0
  };

  let semanticRoute = {
    nodeIds: new Set(),
    linkIds: new Set(),
    bridges: 0,
    hops: 0,
    paths: []
  };

  let explorerState = {
    depth: 0,
    visibleNodeIds: new Set(),
    visibleLinkIds: new Set()
  };

  const navigationHistory = [];
  let navigationIndex = -1;
  const MAX_NAV_HISTORY = 40;
  let brainTypeFilter = "all";
  let brainRelationFilter = "all";

  function authHeaders(){
    try {
      return typeof window.akiraAuthHeaders === "function"
        ? window.akiraAuthHeaders()
        : {"Content-Type":"application/json"};
    } catch(_) {
      return {"Content-Type":"application/json"};
    }
  }

  function groupForNode(n){
    const label = String(n && n.label || "");
    if(label.startsWith("memory:")) return "memory";
    if(label.startsWith("learning:")) return "learning";
    if(label.startsWith("agent:")) return "agent";
    if(label.startsWith("tool:")) return "tool";
    const t = String(n && n.node_type || "");
    return GROUP_COLORS[t] ? t : "other";
  }

  function _loadExternalScript(sources, marker, available){
    if(typeof available === "function" && available()) return Promise.resolve();

    const existing = document.querySelector('script[data-akira-script="' + marker + '"]');
    if(existing){
      if(typeof available === "function" && available()) return Promise.resolve();
      try { existing.remove(); } catch(_) {}
    }

    const list = Array.isArray(sources) ? sources.slice() : [];
    let lastError = new Error(marker + " unavailable");

    const tryNext = (index) => new Promise((resolve,reject) => {
      if(index >= list.length){
        reject(lastError);
        return;
      }

      const src = list[index];
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.dataset.akiraScript = marker;

      let settled = false;
      const finish = (ok, err) => {
        if(settled) return;
        settled = true;
        clearTimeout(timer);
        script.onload = null;
        script.onerror = null;
        if(ok){
          resolve();
        }else{
          lastError = err || new Error("No se pudo cargar " + marker);
          try { script.remove(); } catch(_) {}
          tryNext(index + 1).then(resolve).catch(reject);
        }
      };

      const timer = setTimeout(() => {
        finish(false, new Error("Timeout cargando " + src));
      }, EXTERNAL_SCRIPT_TIMEOUT_MS);

      script.onload = () => {
        if(typeof available === "function" && available()){
          finish(true);
        }else{
          finish(false, new Error(marker + " no disponible tras cargar " + src));
        }
      };
      script.onerror = () => {
        finish(false, new Error("Error cargando " + src));
      };

      document.head.appendChild(script);
    });

    return tryNext(0);
  }

  function loadForceGraph3D(){
    if(typeof window.ForceGraph3D === "function") return Promise.resolve(window.ForceGraph3D);
    if(forceGraphLoading) return forceGraphLoading;
    forceGraphLoading = _loadExternalScript(
      FORCE_GRAPH_SOURCES,
      "force-graph-3d",
      () => typeof window.ForceGraph3D === "function"
    ).then(() => window.ForceGraph3D).finally(() => { forceGraphLoading = null; });
    return forceGraphLoading;
  }

  function hexColor(hex){
    try { return Number.parseInt(String(hex).replace("#",""),16); } catch(_) { return 0xffffff; }
  }

  const FILTER_LABELS = {
    all:"TODO", memory:"MEMORIA", learning:"APRENDIZAJE", agent:"AGENTES",
    tool:"TOOLS", concept:"CONCEPTOS", project:"PROYECTOS", document:"DOCUMENTOS",
    skill:"SKILLS", error:"ERRORES", solution:"SOLUCIONES", mission:"MISIONES", other:"OTROS"
  };

  function nodeMatchesTypeFilter(n){
    if(brainTypeFilter === "all") return true;
    const id = String(n && n.id || "");
    return !!(n && (n._isCore || id === String(selectedNodeId) || groupForNode(n) === brainTypeFilter));
  }

  function linkMatchesRelationFilter(l){
    if(brainRelationFilter === "all") return true;
    return String(l && l.relation_type || "").toLowerCase() === brainRelationFilter;
  }

  function nodeMatchesActiveFilters(n){
    if(!n || !nodeMatchesTypeFilter(n)) return false;
    const id = String(n.id);
    if(brainRelationFilter === "all" || n._isCore || id === String(selectedNodeId)) return true;
    return graphData.links.some(l =>
      linkMatchesRelationFilter(l) &&
      (nodeId(l.source) === id || nodeId(l.target) === id)
    );
  }

  function nodeIdPassesActiveFilters(id){
    const n = graphData.nodes.find(x => String(x.id) === String(id));
    return n ? nodeMatchesActiveFilters(n) : false;
  }

  function nodeIdPassesTypeFilter(id){
    const n = graphData.nodes.find(x => String(x.id) === String(id));
    return n ? nodeMatchesTypeFilter(n) : false;
  }

  function updateTypeFilterUI(){
    const el = document.getElementById("brainTypeFilters");
    if(!el) return;
    const counts = new Map();
    graphData.nodes.forEach(n => {
      const g = groupForNode(n);
      counts.set(g, (counts.get(g) || 0) + 1);
    });
    const groups = ["all", ...Object.keys(FILTER_LABELS).filter(g => g !== "all" && counts.has(g))];
    el.innerHTML = groups.map(g => {
      const count = g === "all" ? graphData.nodes.length : (counts.get(g) || 0);
      const active = g === brainTypeFilter;
      return "<button type='button' class='brain-type-filter" + (active ? " active" : "") + "' data-brain-filter='" + g + "'>" +
        FILTER_LABELS[g] + " <span>" + count + "</span></button>";
    }).join("");
    if(el.dataset.bound !== "1"){
      el.dataset.bound = "1";
      el.addEventListener("click", function(ev){
        const btn = ev.target.closest("[data-brain-filter]");
        if(!btn) return;
        setBrainTypeFilter(btn.getAttribute("data-brain-filter") || "all");
      });
    }
  }

  function setBrainTypeFilter(group){
    const valid = group === "all" || Object.prototype.hasOwnProperty.call(FILTER_LABELS, group);
    brainTypeFilter = valid ? group : "all";
    updateTypeFilterUI();
    apply3dRuntime();
    try{
      window.dispatchEvent(new CustomEvent("akira:brain-filter",{detail:{group:brainTypeFilter}}));
    }catch(_){}
    const visible = graphData.nodes.filter(nodeMatchesTypeFilter);
    if(fg && visible.length){
      setTimeout(() => {
        try { fg.zoomToFit(700, 70, n => nodeMatchesTypeFilter(n)); } catch(_) {}
      }, 40);
    }
    hudText();
  }

  window.akiraBrainSetTypeFilter = setBrainTypeFilter;

  function updateRelationFilterUI(){
    const el = document.getElementById("brainRelationFilters");
    if(!el) return;
    const counts = new Map();
    graphData.links.forEach(l => {
      const rel = String(l.relation_type || "related_to").toLowerCase();
      counts.set(rel, (counts.get(rel) || 0) + 1);
    });
    const relations = ["all", ...[...counts.keys()].sort()];
    el.innerHTML = relations.map(rel => {
      const count = rel === "all" ? graphData.links.length : (counts.get(rel) || 0);
      const active = rel === brainRelationFilter;
      const label = rel === "all" ? "TODAS" : rel.replace(/_/g," ").toUpperCase();
      return "<button type='button' class='brain-type-filter" + (active ? " active" : "") +
        "' data-brain-relation-filter='" + escapeHtml(rel) + "'>" + escapeHtml(label) +
        " <span>" + count + "</span></button>";
    }).join("");
    if(el.dataset.bound !== "1"){
      el.dataset.bound = "1";
      el.addEventListener("click", function(ev){
        const btn = ev.target.closest("[data-brain-relation-filter]");
        if(!btn) return;
        setBrainRelationFilter(btn.getAttribute("data-brain-relation-filter") || "all");
      });
    }
  }

  function setBrainRelationFilter(relation){
    const rel = String(relation || "all").toLowerCase();
    brainRelationFilter = rel === "all" ? "all" :
      (graphData.links.some(l => String(l.relation_type || "related_to").toLowerCase() === rel) ? rel : "all");
    updateRelationFilterUI();
    apply3dRuntime();
    try{
      window.dispatchEvent(new CustomEvent("akira:brain-relation-filter",{detail:{relation:brainRelationFilter}}));
    }catch(_){}
    const visible = graphData.nodes.filter(nodeMatchesActiveFilters);
    if(fg && visible.length){
      setTimeout(() => {
        try { fg.zoomToFit(700, 70, n => nodeMatchesActiveFilters(n)); } catch(_) {}
      }, 40);
    }
    hudText();
  }

  window.akiraBrainSetRelationFilter = setBrainRelationFilter;
  window.akiraBrainSetCombinedFilters = function(type, relation){
    setBrainTypeFilter(type || "all");
    setBrainRelationFilter(relation || "all");
  };

  function nodeIsRelated(n){
    if(!selectedNodeId) return true;
    const id = String(n.id);
    if(id === String(selectedNodeId)) return true;
    return graphData.links.some(l => {
      const a = nodeId(l.source), b = nodeId(l.target);
      return (a === String(selectedNodeId) && b === id) || (b === String(selectedNodeId) && a === id);
    });
  }

  function currentNavigationNode(){
    if(navigationIndex < 0) return null;
    return navigationHistory[navigationIndex] || null;
  }

  function updateNavigationUI(){
    const back = document.getElementById("brainNavBack");
    const forward = document.getElementById("brainNavForward");
    const status = document.getElementById("brainNavStatus");
    if(back) back.disabled = navigationIndex <= 0;
    if(forward) forward.disabled = navigationIndex < 0 || navigationIndex >= navigationHistory.length - 1;

    if(status){
      const node = currentNavigationNode();
      const item = node
        ? graphData.nodes.find(n => String(n.id) === String(node))
        : null;
      status.textContent = node
        ? "RECORRIDO · " + String(item?.label || node)
        : "RECORRIDO · —";
    }

    const trail = document.getElementById("brainNavTrail");
    if(trail){
      const start = Math.max(0, navigationHistory.length - 6);
      trail.innerHTML = navigationHistory.slice(start).map((id, offset) => {
        const absolute = start + offset;
        const item = graphData.nodes.find(n => String(n.id) === String(id));
        const label = escapeHtml(String(item?.label || id));
        const active = absolute === navigationIndex;
        return "<button type='button' class='brain-trail-node" + (active ? " active" : "") + "' data-brain-history='" + absolute + "' title='" + label + "'>" + label + "</button>";
      }).join("<span class='brain-trail-arrow'>›</span>");
    }
  }

  function bindNavigationTrail(){
    const trail = document.getElementById("brainNavTrail");
    if(!trail || trail.dataset.bound === "1") return;
    trail.dataset.bound = "1";
    trail.addEventListener("click", function(ev){
      const btn = ev.target.closest("[data-brain-history]");
      if(!btn) return;
      const target = Number(btn.getAttribute("data-brain-history"));
      if(!Number.isInteger(target) || target < 0 || target >= navigationHistory.length) return;
      navigationIndex = target;
      navigateToNode(navigationHistory[target], false);
    });
  }

  function navigateToNode(id, pushHistory){
    const next = id ? String(id) : null;
    if(!next) return;

    const exists = graphData.nodes.some(n => String(n.id) === next);
    if(!exists) return;

    selectedNodeId = next;

    if(pushHistory){
      if(navigationIndex >= 0 && navigationHistory[navigationIndex] === next){
        // same location; do not duplicate
      } else {
        navigationHistory.splice(navigationIndex + 1);
        navigationHistory.push(next);
        if(navigationHistory.length > MAX_NAV_HISTORY){
          navigationHistory.shift();
        }
        navigationIndex = navigationHistory.length - 1;
      }
    }

    computeSemanticRoute();
    setExplorerDepth(1);
    hudText();
    apply3dRuntime();
    dispatchSemanticRoute();
    dispatchExplorerState();
    updateNavigationUI();

    try {
      window.dispatchEvent(new CustomEvent("akira:brain-select", {
        detail:{nodeId:next, navigation:true}
      }));
    } catch(_) {}

    setTimeout(focusSemanticRoute, 90);
  }

  function navigateHistory(delta){
    const target = navigationIndex + Number(delta || 0);
    if(target < 0 || target >= navigationHistory.length) return;

    navigationIndex = target;
    const id = navigationHistory[navigationIndex];
    navigateToNode(id, false);
  }

  function computeExplorerScope(depth){
    const d = Math.max(0, Math.min(3, Number(depth) || 0));

    if(!selectedNodeId || d === 0){
      explorerState = {
        depth: 0,
        visibleNodeIds: new Set(graphData.nodes.map(n => String(n.id))),
        visibleLinkIds: new Set(graphData.links.map(l => String(l.id)))
      };
      return explorerState;
    }

    const root = String(selectedNodeId);
    const distance = new Map([[root, 0]]);
    const byNode = new Map();

    for(const l of graphData.links){
      const a = nodeId(l.source);
      const b = nodeId(l.target);
      if(a === b) continue;
      if(!byNode.has(a)) byNode.set(a, []);
      if(!byNode.has(b)) byNode.set(b, []);
      byNode.get(a).push({other:b});
      byNode.get(b).push({other:a});
    }

    const queue = [root];
    while(queue.length){
      const current = queue.shift();
      const currentDistance = distance.get(current) || 0;
      if(currentDistance >= d) continue;

      for(const item of byNode.get(current) || []){
        if(!distance.has(item.other)){
          distance.set(item.other, currentDistance + 1);
          queue.push(item.other);
        }
      }
    }

    const visibleNodeIds = new Set(distance.keys());
    const visibleLinkIds = new Set();

    for(const l of graphData.links){
      const a = nodeId(l.source);
      const b = nodeId(l.target);
      if(visibleNodeIds.has(a) && visibleNodeIds.has(b)){
        visibleLinkIds.add(String(l.id));
      }
    }

    explorerState = {
      depth: d,
      visibleNodeIds,
      visibleLinkIds
    };
    return explorerState;
  }

  function isExplorerVisibleNode(n){
    return explorerState.depth === 0 || explorerState.visibleNodeIds.has(String(n.id));
  }

  function isExplorerVisibleLink(l){
    return explorerState.depth === 0 || explorerState.visibleLinkIds.has(String(l.id));
  }

  function dispatchExplorerState(){
    computeExplorerScope(explorerState.depth);
    try {
      window.dispatchEvent(new CustomEvent("akira:brain-explore", {
        detail:{
          depth:explorerState.depth,
          visibleNodeIds:[...explorerState.visibleNodeIds],
          visibleLinkIds:[...explorerState.visibleLinkIds],
          visibleNodes:explorerState.visibleNodeIds.size,
          visibleLinks:explorerState.visibleLinkIds.size
        }
      }));
    } catch(_) {}

    const status = document.getElementById("brainExploreStatus");
    if(status){
      status.textContent = explorerState.depth === 0
        ? "MEMORIA · TODO"
        : "MEMORIA · " + explorerState.depth + " SALTO" + (explorerState.depth === 1 ? "" : "S");
    }
  }

  function setExplorerDepth(depth){
    if(!selectedNodeId) return;
    computeExplorerScope(depth);
    apply3dRuntime();
    dispatchExplorerState();
    if(explorerState.depth > 0) setTimeout(focusExplorerScope, 90);
    hudText();
  }

  function focusExplorerScope(){
    if(!fg || explorerState.depth === 0) return;

    const scoped = graphData.nodes.filter(
      n => isExplorerVisibleNode(n) &&
           Number.isFinite(Number(n.x)) &&
           Number.isFinite(Number(n.y)) &&
           Number.isFinite(Number(n.z))
    );
    if(!scoped.length) return;

    let cx=0,cy=0,cz=0;
    for(const n of scoped){
      cx += Number(n.x) || 0;
      cy += Number(n.y) || 0;
      cz += Number(n.z) || 0;
    }
    cx/=scoped.length; cy/=scoped.length; cz/=scoped.length;

    let radius=50;
    for(const n of scoped){
      const dx=(Number(n.x)||0)-cx;
      const dy=(Number(n.y)||0)-cy;
      const dz=(Number(n.z)||0)-cz;
      radius=Math.max(radius,Math.sqrt(dx*dx+dy*dy+dz*dz));
    }

    const distance=Math.max(110,Math.min(520,radius*2.7));
    try{
      fg.cameraPosition(
        {x:cx+distance*0.78,y:cy+distance*0.5,z:cz+distance*0.78},
        {x:cx,y:cy,z:cz},
        700
      );
    }catch(_) {}
  }

  function nodeVisualRadius(n){
    if(n && n._isCore) return 8.5;
    const reuse = Number(n && n.reuse_count) || 0;
    const weight = Number(n && n.weight) || 0;
    const importance = Number(n && n._importance) || 0;
    return Math.max(2.2, Math.min(8.5, 2.2 + reuse * 0.24 + weight * 0.55 + importance * 2.2));
  }

  function syncGlowNodeVisual(group, n){
    if(!group || !n || !group.userData) return;
    const color = hexColor(colorForNode(n,false));
    const selected = String(n.id) === String(selectedNodeId);
    const core = !!n._isCore;
    const related = nodeIsRelated(n);
    const route = isSemanticRouteNode(n);
    const hub = !!n._isCommunityHub;
    const dim = !!selectedNodeId && !selected && !related;
    const body = group.userData.body;
    const glow = group.userData.glow;
    const ring = group.userData.ring;

    if(body && body.material){
      body.material.color.setHex(selected ? 0xffffff : (core ? 0xff6b6b : color));
      body.material.emissive.setHex(selected ? 0xffffff : (core ? 0x551111 : color));
      body.material.emissiveIntensity = selected ? 1.8 : (route ? 1.05 : (core ? 1.25 : 0.75));
      body.material.opacity = dim ? 0.16 : 1;
      body.material.transparent = dim;
    }
    if(glow && glow.material){
      glow.material.color.setHex(selected ? 0xffffff : color);
      glow.material.opacity = dim ? 0.025 : (selected ? 0.25 : (route ? 0.13 : (core ? 0.18 : 0.09)));
    }
    if(ring){
      ring.visible = core || selected || hub;
      if(ring.material){
        ring.material.color.setHex(
          selected ? 0xffffff :
          core ? 0xff6b6b :
          hexColor(colorForNode(n,false))
        );
        ring.material.opacity = dim ? 0.08 : 0.7;
      }
    }
    if(group.userData.renderRadius){
      const targetRadius = nodeVisualRadius(n);
      const scale = targetRadius / group.userData.renderRadius;
      group.scale.setScalar(Math.max(0.55, Math.min(1.65, scale)));
    }
    group.userData.nodeId = String(n.id);
    group.userData.importance = Number(n._importance) || 0.2;
    group.userData.dimmed = dim;
  }

  function syncAllGlowNodes(){
    glowNodeObjects.forEach((group, id) => {
      const n = graphData.nodes.find(x => String(x.id) === String(id));
      if(n) syncGlowNodeVisual(group, n);
    });
  }

  function makeGlowNode(n){
    // The UMD graph owns its Three.js instance. Custom node objects are
    // optional; when no global THREE exists, let the library render its native
    // spheres instead of failing the entire 3D view.
    const THREE = window.THREE;
    if(!THREE) return null;
    const key = String(n.id);
    const cached = glowNodeObjects.get(key);
    if(cached){
      syncGlowNodeVisual(cached,n);
      return cached;
    }
    const group = new THREE.Group();
    const base = groupForNode(n);
    const color = hexColor(colorForNode(n,false));
    const core = !!n._isCore;
    const selected = String(n.id) === String(selectedNodeId);
    const radius = nodeVisualRadius(n);

    const glowMat = new THREE.MeshBasicMaterial({
      color: selected ? 0xffffff : color,
      transparent:true,
      opacity: selected ? 0.20 : (core ? 0.18 : 0.09),
      blending:THREE.AdditiveBlending,
      depthWrite:false
    });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(radius * (core ? 1.9 : 1.65), 16, 16), glowMat);
    group.add(glow);

    const mat = new THREE.MeshStandardMaterial({
      color: selected ? 0xffffff : (core ? 0xff6b6b : color),
      emissive:selected ? 0xffffff : (core ? 0x551111 : color),
      emissiveIntensity:selected ? 1.6 : (core ? 1.25 : 0.75),
      roughness:0.28,
      metalness:0.18,
      transparent:true,
      opacity:1
    });
    const geometry = core
      ? new THREE.IcosahedronGeometry(radius, 2)
      : (base === "agent" || base === "tool"
          ? new THREE.OctahedronGeometry(radius * 0.82, 1)
          : new THREE.SphereGeometry(radius * 0.82, 18, 18));
    const body = new THREE.Mesh(geometry, mat);
    group.add(body);

    const ringMat = new THREE.MeshBasicMaterial({
      color:selected ? 0xffffff : 0xff6b6b,
      transparent:true,
      opacity:0.7,
      blending:THREE.AdditiveBlending,
      depthWrite:false
    });
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 1.35, Math.max(0.35,radius*0.075), 10, 32),
      ringMat
    );
    ring.rotation.x = Math.PI / 2;
    ring.visible = core || selected;
    group.add(ring);

    group.userData.ring = ring;
    group.userData.glow = glow;
    group.userData.body = body;
    group.userData.baseColor = color;
    group.userData.renderRadius = radius;
    glowNodeObjects.set(key, group);
    syncGlowNodeVisual(group,n);
    return group;
  }

  function colorForNode(n, bright){
    const base = GROUP_COLORS[groupForNode(n)] || GROUP_COLORS.other;
    if(bright) return "#ffffff";
    return base;
  }

  function nodeId(x){
    return String((x && typeof x === "object") ? x.id : x);
  }

  function isRelatedLink(l){
    if(!selectedNodeId) return false;
    return nodeId(l.source) === selectedNodeId || nodeId(l.target) === selectedNodeId;
  }

  function isCoreLink(l){
    const a = nodeId(l.source);
    const b = nodeId(l.target);
    return graphData.nodes.some(n => String(n.id) === a && n._isCore) ||
           graphData.nodes.some(n => String(n.id) === b && n._isCore);
  }

  function computeCommunities(nodes, links, coreId){
    const core = String(coreId || "");
    const ids = nodes.map(n => String(n.id)).filter(id => id !== core);
    const adjacency = new Map(ids.map(id => [id, []]));

    for(const l of links){
      const a = nodeId(l.source ?? l.from_node);
      const b = nodeId(l.target ?? l.to_node);
      if(a === b || !adjacency.has(a) || !adjacency.has(b)) continue;
      const w = Math.max(0.02, Number(l.weight) || 0.5);
      adjacency.get(a).push([b, w]);
      adjacency.get(b).push([a, w]);
    }

    // Weighted label propagation. The old threshold left sparse real-world
    // graphs with hundreds of singleton "communities". Lower switching cost
    // lets actual connected neighborhoods coalesce before the visual stage.
    const labels = new Map(ids.map(id => [id, id]));
    for(let iter = 0; iter < 18; iter++){
      let changed = 0;
      for(const id of ids){
        const scores = new Map();
        for(const [other, rawW] of adjacency.get(id) || []){
          const label = labels.get(other);
          if(!label) continue;
          const w = Math.sqrt(rawW);
          scores.set(label, (scores.get(label) || 0) + w);
        }
        if(!scores.size) continue;

        const current = labels.get(id);
        let best = current;
        let bestScore = scores.get(current) || 0;

        for(const [label, score] of scores){
          if(score > bestScore + 0.005 ||
             (Math.abs(score - bestScore) <= 0.005 && String(label) < String(best))){
            best = label;
            bestScore = score;
          }
        }

        const currentScore = scores.get(current) || 0;
        if(best !== current && bestScore >= Math.max(0.03, currentScore * 1.01)){
          labels.set(id, best);
          changed++;
        }
      }
      if(!changed) break;
    }

    const rawGroups = new Map();
    for(const id of ids){
      const label = labels.get(id) || id;
      if(!rawGroups.has(label)) rawGroups.set(label, []);
      rawGroups.get(label).push(id);
    }

    // Merge tiny communities into the strongest neighboring community. This
    // turns isolated label-propagation fragments into a small number of
    // meaningful "petals" without inventing any knowledge nodes.
    const rawClusterOf = new Map();
    rawGroups.forEach((members, key) => members.forEach(id => rawClusterOf.set(id, key)));
    const typeOf = id => {
      const n = nodes.find(x => String(x.id) === id);
      return groupForNode(n || {});
    };
    const clusterMembers = new Map(rawGroups);
    const MIN_COMMUNITY_SIZE = Math.max(4, Math.min(8, Math.round(ids.length / 60)));

    function mergeGroup(fromKey, toKey){
      if(fromKey === toKey) return;
      const from = clusterMembers.get(fromKey) || [];
      const to = clusterMembers.get(toKey) || [];
      if(!from.length) return;
      clusterMembers.set(toKey, to.concat(from));
      clusterMembers.delete(fromKey);
      from.forEach(id => rawClusterOf.set(id, toKey));
    }

    for(let pass = 0; pass < 6; pass++){
      const small = [...clusterMembers.entries()]
        .filter(([,members]) => members.length < MIN_COMMUNITY_SIZE)
        .sort((a,b) => a[1].length - b[1].length);
      if(!small.length) break;

      let merged = false;
      for(const [smallKey, members] of small){
        if(!clusterMembers.has(smallKey) || members.length >= MIN_COMMUNITY_SIZE) continue;
        const scores = new Map();
        for(const id of members){
          for(const [other, w] of adjacency.get(id) || []){
            const otherCluster = rawClusterOf.get(other);
            if(!otherCluster || otherCluster === smallKey || !clusterMembers.has(otherCluster)) continue;
            const typeBonus = typeOf(id) === typeOf(other) ? 0.08 : 0;
            scores.set(otherCluster, (scores.get(otherCluster) || 0) + w + typeBonus);
          }
        }
        let bestKey = null, bestScore = -1;
        for(const [candidate, score] of scores){
          if(score > bestScore || (Math.abs(score-bestScore) < 0.0001 && String(candidate) < String(bestKey))){
            bestKey = candidate;
            bestScore = score;
          }
        }
        if(!bestKey){
          const byType = [...clusterMembers.entries()]
            .filter(([k]) => k !== smallKey)
            .map(([k,m]) => ({k,m,score:m.reduce((acc,id)=>acc+(typeOf(id)===typeOf(members[0])?1:0),0)}))
            .sort((a,b)=>b.score-a.score || b.m.length-a.m.length);
          bestKey = byType[0]?.k || null;
        }
        if(bestKey){
          mergeGroup(smallKey, bestKey);
          merged = true;
        }
      }
      if(!merged) break;
    }

    // Hard cap the number of visual communities. We preserve the strongest
    // inter-community edge whenever possible, otherwise merge the smallest
    // group into the largest one.
    while(clusterMembers.size > 12){
      const entries = [...clusterMembers.entries()].sort((a,b)=>a[1].length-b[1].length);
      const [smallKey, smallMembers] = entries[0];
      const candidates = new Map();

      for(const id of smallMembers){
        for(const [other, w] of adjacency.get(id) || []){
          const otherCluster = rawClusterOf.get(other);
          if(otherCluster && otherCluster !== smallKey && clusterMembers.has(otherCluster)){
            candidates.set(otherCluster, (candidates.get(otherCluster) || 0) + w);
          }
        }
      }

      let target = null, targetScore = -1;
      for(const [k,score] of candidates){
        if(score > targetScore) { target = k; targetScore = score; }
      }
      if(!target) target = entries[entries.length - 1][0];
      mergeGroup(smallKey, target);
    }

    if(!clusterMembers.size && ids.length){
      clusterMembers.set("fallback", ids.slice());
    }

    const ordered = [...clusterMembers.entries()]
      .sort((a,b)=>b[1].length-a[1].length || String(a[0]).localeCompare(String(b[0])));

    const assignments = new Map();
    ordered.forEach(([key, members], index) => {
      const clusterId = "c" + String(index + 1);
      members.forEach(id => assignments.set(id, clusterId));
    });
    if(core && nodes.some(n => String(n.id) === core)){
      assignments.set(core, "core");
    }

    const degree = new Map();
    const maxes = {weight:0,reuse:0,degree:0};
    for(const n of nodes){
      const id = String(n.id);
      degree.set(id, 0);
      maxes.weight = Math.max(maxes.weight, Number(n.weight)||0);
      maxes.reuse = Math.max(maxes.reuse, Number(n.reuse_count)||0);
    }
    for(const l of links){
      const a=nodeId(l.source ?? l.from_node), b=nodeId(l.target ?? l.to_node);
      if(degree.has(a)) degree.set(a, degree.get(a)+1);
      if(degree.has(b)) degree.set(b, degree.get(b)+1);
    }
    maxes.degree = Math.max(1, ...degree.values());

    const importance = new Map();
    for(const n of nodes){
      const id = String(n.id);
      const weight = maxes.weight ? (Number(n.weight)||0)/maxes.weight : 0;
      const reuse = maxes.reuse ? (Number(n.reuse_count)||0)/maxes.reuse : 0;
      const confidence = Math.max(0, Math.min(1, Number(n.confidence)||0));
      const deg = (degree.get(id)||0)/maxes.degree;
      const score = Math.max(0, Math.min(1, 0.28*weight + 0.27*reuse + 0.18*confidence + 0.27*deg));
      n._importance = id === core ? 1 : score;
      n._degree = degree.get(id)||0;
    }

    const clusters = new Map();
    assignments.forEach((clusterId,id) => {
      if(clusterId === "core") return;
      if(!clusters.has(clusterId)) clusters.set(clusterId, []);
      clusters.get(clusterId).push(id);
    });

    const hubs = new Set();
    clusters.forEach(members => {
      let best = null, bestScore = -1;
      for(const id of members){
        const score = (degree.get(id)||0) + (importance.get(id)||0) * 2;
        if(score > bestScore){ bestScore = score; best = id; }
      }
      if(best) hubs.add(best);
    });

    nodes.forEach(n => {
      const id = String(n.id);
      n._isCommunityHub = hubs.has(id);
      n._communitySize = clusters.get(assignments.get(id))?.length || 1;
    });

    const centers = new Map();
    let clusterList = [...clusters.entries()].sort((a,b)=>b[1].length-a[1].length || a[0].localeCompare(b[0]));

    // When the force topology is effectively one dense component, create
    // deterministic graph-based visual petals rather than a single ring.
    // Anchors are chosen by degree + weighted graph distance, so the split
    // still comes from real links, not decorative/random placement.
    if(clusterList.length === 1 && ids.length >= 18){
      const targetPetals = Math.min(7, Math.max(5, Math.round(Math.sqrt(ids.length) / 3)));

      function shortestDistances(startId){
        const dist = new Map(ids.map(id => [id, Infinity]));
        dist.set(startId, 0);
        const used = new Set();
        while(used.size < ids.length){
          let best = null, bestDist = Infinity;
          for(const [id,d] of dist){
            if(!used.has(id) && d < bestDist){ best = id; bestDist = d; }
          }
          if(best === null || !Number.isFinite(bestDist)) break;
          used.add(best);
          for(const [other,w] of adjacency.get(best) || []){
            const cost = 1 / Math.max(0.05, Math.sqrt(w));
            const next = bestDist + cost;
            if(next < (dist.get(other) ?? Infinity)) dist.set(other, next);
          }
        }
        return dist;
      }

      const anchorScore = id => (degree.get(id) || 0) + (Number(nodes.find(n => String(n.id) === id)?._importance) || 0) * 2;
      const firstAnchor = ids.slice().sort((a,b)=>anchorScore(b)-anchorScore(a) || a.localeCompare(b))[0];
      const anchors = firstAnchor ? [firstAnchor] : [];

      while(anchors.length < targetPetals && anchors.length < ids.length){
        const distanceMaps = anchors.map(shortestDistances);
        let candidate = null, candidateScore = -1;
        for(const id of ids){
          if(anchors.includes(id)) continue;
          const minD = distanceMaps.reduce((m,d)=>Math.min(m, d.get(id) ?? Infinity), Infinity);
          const score = (Number.isFinite(minD) ? minD : 0) * (1 + anchorScore(id) / Math.max(1, ids.length));
          if(score > candidateScore || (Math.abs(score-candidateScore) < 0.0001 && String(id) < String(candidate))){
            candidate = id;
            candidateScore = score;
          }
        }
        if(!candidate) break;
        anchors.push(candidate);
      }

      const visualGroups = new Map(anchors.map((a,i)=>["petal_"+i,[]]));
      const distToAnchors = anchors.map(shortestDistances);

      ids.forEach(id=>{
        let best=0, bestDist=Infinity;
        distToAnchors.forEach((d,i)=>{
          const value=d.get(id) ?? Infinity;
          if(value < bestDist - 0.0001){ best=i; bestDist=value; }
        });
        visualGroups.get("petal_"+best).push(id);
      });

      clusters.clear();
      assignments.clear();
      [...visualGroups.values()].forEach((members,i)=>{
        if(!members.length) return;
        const clusterId="c"+String(i+1);
        clusters.set(clusterId,members);
        members.forEach(id=>assignments.set(id,clusterId));
      });
      clusterList=[...clusters.entries()].sort((a,b)=>b[1].length-a[1].length || a[0].localeCompare(b[0]));
    }
    const ring = Math.max(115, Math.min(330, 105 + Math.sqrt(Math.max(nodes.length,1))*10));
    const golden = Math.PI * (3 - Math.sqrt(5));

    clusterList.forEach(([clusterId,members],index)=>{
      const a = (index / Math.max(clusterList.length,1)) * Math.PI * 2 - Math.PI / 2;
      const r = ring + Math.min(145, members.length * 2.4);
      const z = ((index % 3) - 1) * Math.min(110, ring * 0.22);
      centers.set(clusterId,{x:Math.cos(a)*r,y:Math.sin(a)*r,z,angle:a});
      members.forEach((id,j)=>{
        const n=nodes.find(x=>String(x.id)===id);
        if(n) n._clusterAngle = a + j * golden;
      });
    });

    communityState = {assignments, centers, hubs, count: clusterList.length};
    return communityState;
  }

  function makeCommunityForce(){
    const currentState = communityState;
    let nodes = [];
    const force = function(alpha){
      for(const n of nodes){
        const id=String(n.id);
        if(n._isCore){
          n.vx += (0-n.x) * 0.18 * alpha;
          n.vy += (0-n.y) * 0.18 * alpha;
          n.vz += (0-n.z) * 0.18 * alpha;
          continue;
        }

        const clusterId = currentState.assignments.get(id);
        const center = currentState.centers.get(clusterId);
        if(!center) continue;

        const importance = Number(n._importance) || 0.2;
        const hub = !!n._isCommunityHub;
        const strength = hub
          ? 0.085 + importance * 0.045
          : 0.052 + importance * 0.052;

        n.vx += (center.x-n.x) * strength * alpha;
        n.vy += (center.y-n.y) * strength * alpha;

        const targetZ =
          center.z +
          (importance - 0.45) * 155;

        n.vz += (targetZ-n.z) * strength * alpha;

        // Micro-órbita: movimiento tangencial muy suave alrededor
        // del centro comunitario, derivado de la pertenencia al cluster.
        const dx = n.x - center.x;
        const dy = n.y - center.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        const tangent = 0.0028 * (0.55 + importance) * (hub ? 0.35 : 1);
        n.vx += (-dy / dist) * tangent * alpha;
        n.vy += ( dx / dist) * tangent * alpha;
      }
    };
    force.initialize = _nodes => { nodes = _nodes || []; };
    return force;
  }

  function computeSemanticRoute(){
    const empty = {
      nodeIds: new Set(),
      linkIds: new Set(),
      bridges: 0,
      hops: 0,
      paths: []
    };

    if(!selectedNodeId || !graphData.nodes.length || !communityState.assignments.size){
      semanticRoute = empty;
      return semanticRoute;
    }

    const selected = String(selectedNodeId);
    const selectedCluster = communityState.assignments.get(selected);
    if(!selectedCluster){
      semanticRoute = empty;
      return semanticRoute;
    }

    const byNode = new Map();
    for(const l of graphData.links){
      const a = nodeId(l.source), b = nodeId(l.target);
      if(a === b) continue;
      if(!byNode.has(a)) byNode.set(a, []);
      if(!byNode.has(b)) byNode.set(b, []);
      byNode.get(a).push({link:l, other:b});
      byNode.get(b).push({link:l, other:a});
    }

    const routeNodes = new Set([selected]);
    const routeLinks = new Set();
    const candidates = [];

    for(const first of byNode.get(selected) || []){
      const firstId = first.other;
      const firstCluster = communityState.assignments.get(firstId);
      const firstWeight = Number(first.link.weight) || 0.5;

      if(firstCluster && firstCluster !== selectedCluster && communityState.hubs.has(firstId)){
        candidates.push({
          score:firstWeight * 1.25,
          nodes:[selected,firstId],
          links:[String(first.link.id)],
          hops:1
        });
      }

      for(const second of byNode.get(firstId) || []){
        const secondId = second.other;
        if(secondId === selected) continue;

        const secondCluster = communityState.assignments.get(secondId);
        if(!secondCluster || secondCluster === selectedCluster) continue;
        if(!communityState.hubs.has(secondId)) continue;

        const secondWeight = Number(second.link.weight) || 0.5;
        candidates.push({
          score:firstWeight * 0.9 + secondWeight,
          nodes:[selected,firstId,secondId],
          links:[String(first.link.id),String(second.link.id)],
          hops:2
        });
      }
    }

    candidates.sort((a,b) => b.score-a.score || a.hops-b.hops);
    const seenTargetClusters = new Set();
    const chosenCandidates = [];

    for(const candidate of candidates){
      const target = candidate.nodes[candidate.nodes.length - 1];
      const targetCluster = communityState.assignments.get(target) || target;
      if(targetCluster === selectedCluster || seenTargetClusters.has(targetCluster)) continue;

      seenTargetClusters.add(targetCluster);
      chosenCandidates.push(candidate);

      candidate.nodes.forEach(id => routeNodes.add(String(id)));
      candidate.links.forEach(id => routeLinks.add(String(id)));

      if(seenTargetClusters.size >= 5) break;
    }

    semanticRoute = {
      nodeIds: routeNodes,
      linkIds: routeLinks,
      bridges: seenTargetClusters.size,
      hops: chosenCandidates.length
        ? Math.max(...chosenCandidates.map(p => p.hops))
        : 0,
      paths: chosenCandidates.slice(0,5)
    };

    return semanticRoute;
  }


  function isSemanticRouteLink(l){
    return semanticRoute.linkIds.has(String(l.id));
  }

  function isSemanticRouteNode(n){
    return semanticRoute.nodeIds.has(String(n.id));
  }

  function focusSemanticRoute(){
    if(!fg || !semanticRoute.nodeIds.size) return;

    const routeNodes = graphData.nodes.filter(
      n => semanticRoute.nodeIds.has(String(n.id)) &&
           Number.isFinite(Number(n.x)) &&
           Number.isFinite(Number(n.y)) &&
           Number.isFinite(Number(n.z))
    );

    if(!routeNodes.length) return;

    let cx=0,cy=0,cz=0;
    for(const n of routeNodes){
      cx += Number(n.x) || 0;
      cy += Number(n.y) || 0;
      cz += Number(n.z) || 0;
    }
    cx /= routeNodes.length;
    cy /= routeNodes.length;
    cz /= routeNodes.length;

    let radius = 40;
    for(const n of routeNodes){
      const dx=(Number(n.x)||0)-cx;
      const dy=(Number(n.y)||0)-cy;
      const dz=(Number(n.z)||0)-cz;
      radius = Math.max(radius, Math.sqrt(dx*dx+dy*dy+dz*dz));
    }

    const distance = Math.max(120, Math.min(620, radius * 2.8));
    try {
      fg.cameraPosition(
        {x:cx+distance*0.78,y:cy+distance*0.52,z:cz+distance*0.78},
        {x:cx,y:cy,z:cz},
        850
      );
    } catch(_) {}
  }

  function dispatchSemanticRoute(){
    computeSemanticRoute();
    try {
      window.dispatchEvent(new CustomEvent("akira:brain-route", {
        detail:{
          nodeIds:[...semanticRoute.nodeIds],
          linkIds:[...semanticRoute.linkIds],
          bridges:semanticRoute.bridges,
          hops:semanticRoute.hops,
          paths:semanticRoute.paths.map(p => ({
            nodes:p.nodes,
            links:p.links,
            hops:p.hops
          }))
        }
      }));
    } catch(_) {}
  }

  function communitySummary(){
    if(!communityState.count) return "";
    return communityState.count + " CLUSTERS";
  }

  function linkClusterType(l){
    const a = nodeId(l.source);
    const b = nodeId(l.target);
    const ca = communityState.assignments.get(a);
    const cb = communityState.assignments.get(b);
    if(ca && cb && ca === cb && ca !== "core"){
      const n = graphData.nodes.find(x => String(x.id) === a);
      return n ? colorForNode(n,false) : "#59616d";
    }
    if(a === "core" || b === "core"){
      const an = graphData.nodes.find(x => String(x.id) === a);
      const bn = graphData.nodes.find(x => String(x.id) === b);
      if(an?._isCore || bn?._isCore) return "#ff6b6b";
    }
    const na = graphData.nodes.find(x => String(x.id) === a);
    const nb = graphData.nodes.find(x => String(x.id) === b);
    if(na?._isCore || nb?._isCore) return "#ff6b6b";
    return "#3f4650";
  }

  window.AkiraBrainCommunity = function(nodes, links, coreId){
    return computeCommunities(nodes, links, coreId);
  };

  function updateContextPanel(){
    const panel = document.getElementById("brainContext");
    if(!panel) return;
    const node = selectedNodeId
      ? graphData.nodes.find(n => String(n.id) === String(selectedNodeId))
      : null;
    if(!node){
      panel.classList.add("is-hidden");
      return;
    }
    panel.classList.remove("is-hidden");
    const type = document.getElementById("brainContextType");
    const title = document.getElementById("brainContextTitle");
    const meta = document.getElementById("brainContextMeta");
    const rels = document.getElementById("brainContextRelations");
    const relations = graphData.links
      .filter(l => isRelatedLink(l))
      .map(l => {
        const otherId = nodeId(l.source) === String(node.id) ? nodeId(l.target) : nodeId(l.source);
        const other = graphData.nodes.find(n => String(n.id) === otherId);
        return {nodeId:otherId, label:String(other?.label || otherId), type:String(l.relation_type || "related_to"), weight:Number(l.weight)||0};
      })
      .sort((a,b) => b.weight-a.weight)
      .slice(0,12);
    if(type) type.textContent = String(node.node_type || groupForNode(node)).toUpperCase();
    if(title) title.textContent = String(node.label || node.id);
    const clusterId = communityState.assignments.get(String(node.id)) || "—";
    const importance = Math.round((Number(node._importance)||0) * 100);
    if(meta) meta.innerHTML =
      "<div>PESO<b>" + (Number(node.weight)||0).toFixed(2) + "</b></div>" +
      "<div>REUTILIZACIÓN<b>" + (Number(node.reuse_count)||0) + "</b></div>" +
      "<div>CONFIANZA<b>" + (Number(node.confidence)||0).toFixed(2) + "</b></div>" +
      "<div>IMPORTANCIA<b>" + importance + "%</b></div>" +
      "<div>GRUPO<b>" + escapeHtml(groupForNode(node)) + "</b></div>" +
      "<div>CLUSTER<b>" + escapeHtml(clusterId) + "</b></div>";
    if(rels){
      rels.innerHTML = relations.length
        ? relations.map(r => "<button type='button' class='brain-relation brain-relation-btn' data-brain-nav='" + escapeHtml(r.nodeId) + "'><span>" + escapeHtml(r.label) + "</span><span>" + escapeHtml(r.type) + "</span></button>").join("")
        : "<div style='color:#8a8a93;font-size:10px'>Sin relaciones visibles.</div>";
      if(semanticRoute.bridges){
        rels.innerHTML += "<div class='brain-relation'><span>RUTA</span><span>" +
          semanticRoute.bridges + " comunidades · " + semanticRoute.hops + " saltos</span></div>";
        semanticRoute.paths.forEach(path => {
          const labels = path.nodes.map(id => {
            const item = graphData.nodes.find(n => String(n.id) === String(id));
            return escapeHtml(String(item?.label || id));
          });
          rels.innerHTML += "<div class='brain-relation'><span>" +
            labels.join(" → ") +
            "</span><span>" + path.hops + " saltos</span></div>";
        });
      }
    }
  }

  function bindContextNavigation(){
    const rels = document.getElementById("brainContextRelations");
    if(!rels || rels.dataset.brainNavBound === "1") return;
    rels.dataset.brainNavBound = "1";
    rels.addEventListener("click", function(ev){
      const btn = ev.target.closest("[data-brain-nav]");
      if(!btn) return;
      const id = btn.getAttribute("data-brain-nav");
      if(id) navigateToNode(id, true);
    });
  }

  function updateStats(){
    const el = document.getElementById("brainStats");
    if(!el) return;
    const selected = selectedNodeId ? graphData.links.filter(isRelatedLink).length : 0;
    el.innerHTML = "<strong>" + graphData.nodes.length + "</strong> NODOS · <strong>" +
      graphData.links.length + "</strong> RELACIONES · <strong>" +
      (communityState.count || 0) + "</strong> CLUSTERS" +
      (selected ? " · <strong>" + selected + "</strong> EN FOCO" : "");
  }

  function updateOrbitUI(){
    const b = document.getElementById("brainOrbitBtn");
    if(b) b.classList.toggle("active-orbit", autoOrbit);
  }

  function hudText(){
    const hud = document.getElementById("brainHud");
    updateStats();
    updateContextPanel();
    bindContextNavigation();
    if(!hud) return;
    if(!selectedNodeId){
      hud.textContent = "Selecciona un nodo para explorar sus conexiones.";
      return;
    }
    const n = graphData.nodes.find(x => String(x.id) === String(selectedNodeId));
    const label = n ? String(n.label || n.id) : selectedNodeId;
    const degree = graphData.links.filter(l => isRelatedLink(l)).length;
    hud.innerHTML = "<strong>" + escapeHtml(label) + "</strong> · " + degree +
      " conexiones · " + communitySummary() +
      (explorerState.depth ? " · " + explorerState.visibleNodeIds.size + " visibles" : " · red completa");
  }

  function escapeHtml(s){
    return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
  }

  function setModeUI(mode){
    currentMode = mode === "3d" ? "3d" : "2d";
    const v2 = document.getElementById("brainView2d");
    const v3 = document.getElementById("brainView3d");
    const b2 = document.getElementById("brainMode2d");
    const b3 = document.getElementById("brainMode3d");
    const status = document.getElementById("brainModeStatus");
    if(v2) v2.classList.toggle("is-hidden", currentMode !== "2d");
    if(v3) v3.classList.toggle("is-hidden", currentMode !== "3d");
    if(b2) b2.classList.toggle("active", currentMode === "2d");
    if(b3) b3.classList.toggle("active", currentMode === "3d");
    if(status) status.textContent = "BRAIN · " + currentMode.toUpperCase();
    if(currentMode === "3d"){
      ensure3d().then(() => {
        setTimeout(() => { try { if(fg) fg.width(document.getElementById("membrane3d")?.clientWidth || undefined).height(document.getElementById("membrane3d")?.clientHeight || undefined); } catch(_){} }, 60);
      });
    } else {
      try { if(window.AkiraMembrane && window.AkiraMembrane.resizeMembrane) window.AkiraMembrane.resizeMembrane(); } catch(_) {}
    }
  }

  async function fetchGraph(){
    if(fetching) return;
    fetching = true;
    try{
      const r = await fetch(API + "/api/v8/graph/overview?limit_nodes=" + MAX_NODES + "&limit_edges=" + MAX_EDGES + "&_=" + Date.now(), {headers:authHeaders(),cache:"no-store"});
      if(!r.ok) throw new Error("HTTP " + r.status);
      const d = await r.json();
      if(!d || !d.ok) throw new Error((d && d.reason) || "graph_unavailable");

      const nodes = Array.isArray(d.nodes) ? d.nodes.map(n => ({
        ...n,
        _group: groupForNode(n),
        _isCore: String(n.label || "").trim().toLowerCase() === "akira"
      })) : [];
      const nodeSet = new Set(nodes.map(n => String(n.id)));
      const links = (Array.isArray(d.edges) ? d.edges : [])
        .filter(e => nodeSet.has(String(e.from_node)) && nodeSet.has(String(e.to_node)))
        .map(e => ({
          ...e,
          source: e.from_node,
          target: e.to_node,
          _weight: Number(e.weight) || 0.5
        }));

      graphData = {nodes, links};
      const coreNode = nodes.find(n => n._isCore);
      computeCommunities(nodes, links, coreNode ? coreNode.id : null);
      const liveIds = new Set(nodes.map(n => String(n.id)));
      glowNodeObjects.forEach((_, id) => {
        if(!liveIds.has(String(id))) glowNodeObjects.delete(id);
      });
      lastFetchAt = Date.now();
      updateTypeFilterUI();
      updateRelationFilterUI();
      hudText();
      updateStats();

      if(fg){
        fg.graphData(graphData);
        apply3dRuntime();
      }
    }catch(e){
      const hud = document.getElementById("brainHud");
      if(hud && !graphData.nodes.length) hud.textContent = "Brain 3D esperando al backend…";
      console.warn("[akira-brain-3d]", e);
    }finally{
      fetching = false;
    }
  }

  function _set3dMethod(name, ...args){
    try{
      if(fg && typeof fg[name] === "function"){
        fg[name](...args);
      }
    }catch(err){
      console.warn("[akira-brain-3d] method", name, err);
    }
  }

  function apply3dRuntime(){
    if(!fg) return;

    _set3dMethod("backgroundColor", "#05060a");

    try {
      const chargeForce = fg.d3Force("charge");
      if(chargeForce && typeof chargeForce.strength === "function"){
        chargeForce.strength(-78);
      }
    } catch(err) {
      console.warn("[akira-brain-3d] charge", err);
    }

    try {
      if(typeof fg.d3Force === "function"){
        fg.d3Force("community", makeCommunityForce());
      }
    } catch(err) {
      console.warn("[akira-brain-3d] community force", err);
    }

    // Apply each optional API method independently. This keeps the 3D view
    // alive even if a CDN-served build exposes a slightly different API.
    _set3dMethod("nodeColor", n => {
      const id = String(n.id);
      if(id === String(selectedNodeId)) return "#ffffff";
      if(String(n.label || "").trim().toLowerCase() === "akira") return "#ff6b6b";
      return colorForNode(n, hoveredNodeId && id === String(hoveredNodeId));
    });

    _set3dMethod("nodeVal", n => {
      if(String(n.label || "").trim().toLowerCase() === "akira") return 12;
      return Math.max(2.5, 2.7 + (Number(n._importance)||0.25) * 10.5);
    });

    _set3dMethod("nodeOpacity", n => {
      if(!selectedNodeId) return 0.82;
      const id = String(n.id);
      if(id === String(selectedNodeId)) return 1;
      if(isSemanticRouteNode(n)) return 0.84;
      const related = graphData.links.some(l =>
        isRelatedLink(l) &&
        (nodeId(l.source) === id || nodeId(l.target) === id)
      );
      return related ? 0.95 : 0.13;
    });

    _set3dMethod("nodeLabel", n => {
      const type = escapeHtml(n.node_type || "concept");
      const label = escapeHtml(n.label || n.id);
      const reuse = Number(n.reuse_count) || 0;
      const importance = Math.round((Number(n._importance)||0) * 100);
      return "<div style='padding:6px 8px;background:rgba(10,10,13,.94);border:1px solid #3b3b4a;font-family:monospace;font-size:11px;color:#fff'><b>" +
        label + "</b><br><span style='color:#9ca3af'>" + type +
        " · reuse " + reuse + " · importancia " + importance + "%</span></div>";
    });

    // Deliberately omit nodeResolution/nodeRelSize: they are visual tuning
    // only and have varied across CDN-served builds.
    _set3dMethod("nodeVisibility", n =>
      isExplorerVisibleNode(n) && nodeMatchesActiveFilters(n)
    );

    _set3dMethod("nodeThreeObject", n => makeGlowNode(n) || undefined);
    _set3dMethod("nodeThreeObjectExtend", false);

    _set3dMethod("linkVisibility", l =>
      isExplorerVisibleLink(l) &&
      linkMatchesRelationFilter(l) &&
      nodeIdPassesActiveFilters(l.source) &&
      nodeIdPassesActiveFilters(l.target)
    );

    _set3dMethod("linkColor", l =>
      isRelatedLink(l) ? "#c4b5fd" :
      (isSemanticRouteLink(l) ? "#ffffff" : linkClusterType(l))
    );

    _set3dMethod("linkWidth", l => {
      if(isRelatedLink(l)) return Math.min(5, 1.5 + (Number(l.weight)||0.5));
      if(isSemanticRouteLink(l)) return Math.min(3.8, 1.1 + (Number(l.weight)||0.5));
      if(isCoreLink(l)) return 0.55;
      return Math.min(1.6, 0.35 + (Number(l.weight)||0.5) * 0.4);
    });

    _set3dMethod("linkOpacity", l => {
      if(selectedNodeId && isRelatedLink(l)) return 0.90;
      if(selectedNodeId && !isRelatedLink(l) && !isSemanticRouteLink(l)) return 0.08;
      const a = nodeId(l.source), b = nodeId(l.target);
      const ca = communityState.assignments.get(a);
      const cb = communityState.assignments.get(b);
      if(isSemanticRouteLink(l)) return 0.62;
      if(isCoreLink(l)) return 0.12;
      if(ca && cb && ca === cb && ca !== "core") return 0.32;
      return 0.18;
    });

    _set3dMethod("linkDirectionalArrowLength", l =>
      isRelatedLink(l) || isSemanticRouteLink(l) ? 4 : 0
    );
    _set3dMethod("linkDirectionalArrowColor", l =>
      isRelatedLink(l) ? "#ddd6fe" :
      (isSemanticRouteLink(l) ? "#ffffff" : "#ff8a8a")
    );
    _set3dMethod("linkDirectionalParticles", l =>
      isRelatedLink(l) ? 4 :
      (isSemanticRouteLink(l) ? 2 : (selectedNodeId ? 0 : 1))
    );
    _set3dMethod("linkDirectionalParticleWidth", l =>
      isRelatedLink(l) ? 1.7 : (isSemanticRouteLink(l) ? 1.2 : 0.8)
    );
    _set3dMethod("linkDirectionalParticleColor", l =>
      isRelatedLink(l) ? "#ffffff" :
      (isSemanticRouteLink(l) ? "#ffffff" : "#7c8795")
    );
    _set3dMethod("linkDirectionalParticleSpeed", l =>
      isRelatedLink(l) ? 0.025 :
      (isSemanticRouteLink(l) ? 0.017 : 0.009)
    );

    _set3dMethod("showNavInfo", false);
    _set3dMethod("controlType", "orbit");
    _set3dMethod("enablePointerInteraction", true);
    _set3dMethod("cooldownTime", graphData.nodes.length > 280 ? 17000 : 12000);
    _set3dMethod("warmupTicks", graphData.nodes.length > 280 ? 150 : 95);
    _set3dMethod("cooldownTicks", 360);

    try {
      const controls = typeof fg.controls === "function" ? fg.controls() : null;
      if(controls) {
        controls.rotateSpeed = 0.45;
        controls.zoomSpeed = 0.7;
        controls.enablePan = true;
        controls.autoRotate = autoOrbit;
      }
    } catch(err) {
      console.warn("[akira-brain-3d] controls", err);
    }

    try { syncAllGlowNodes(); } catch(err) {
      console.warn("[akira-brain-3d] glow sync", err);
    }
  }

  async function ensure3d(){
    if(initialized && fg) {
      apply3dRuntime();
      fetchGraph();
      return;
    }

    const container = document.getElementById("membrane3d");
    if(!container) return;
    if(typeof window.ForceGraph3D !== "function"){
      try {
        await loadForceGraph3D();
      } catch(e) {
        container.innerHTML =
          '<div style="padding:24px;color:#ff7b72;font-family:monospace;text-align:center">' +
          '<div style="margin-bottom:12px">No se pudo cargar el motor 3D desde los proveedores disponibles. Puedes reintentar.</div>' +
          '<button type="button" class="pixel-btn" onclick="window.akiraBrainRetry3d && akiraBrainRetry3d()">🔄 REINTENTAR 3D</button>' +
          '</div>';
        console.warn("[akira-brain-3d] force-graph", e);
        return;
      }
    }

    try{
      fg = new window.ForceGraph3D(container, {
        controlType:"orbit",
        rendererConfig:{antialias:true,alpha:true}
      });

      fg
        .showNavInfo(false)
        .nodeLabel(n => escapeHtml(n.label || n.id))
        .onNodeClick((node) => {
          navigateToNode(String(node.id), true);
          hudText();
          apply3dRuntime();
          dispatchSemanticRoute();
          try {
            window.dispatchEvent(new CustomEvent("akira:brain-select",{detail:{nodeId:selectedNodeId}}));
          } catch(_) {}
          try{
            if(fg && node.x !== undefined){
              const dist = 110;
              const len = Math.sqrt((node.x||0)**2 + (node.y||0)**2 + (node.z||0)**2) || 1;
              fg.cameraPosition(
                {x:(node.x||0) + dist*(node.x||0)/len, y:(node.y||0) + dist*(node.y||0)/len, z:(node.z||0) + dist*(node.z||0)/len},
                {x:node.x||0,y:node.y||0,z:node.z||0},
                700
              );
            }
          }catch(_) {}
        })
        .onNodeHover((node) => {
          hoveredNodeId = node ? String(node.id) : null;
          apply3dRuntime();
        })
        .onBackgroundClick(() => {
          selectedNodeId = null;
          semanticRoute = {nodeIds:new Set(),linkIds:new Set(),bridges:0,hops:0,paths:[]};
          explorerState = {depth:0,visibleNodeIds:new Set(),visibleLinkIds:new Set()};
          hudText();
          apply3dRuntime();
          dispatchSemanticRoute();
          try {
            window.dispatchEvent(new CustomEvent("akira:brain-select",{detail:{nodeId:null}}));
          } catch(_) {}
        });

      initialized = true;
      try {
        fg.onRenderFramePre(() => {
          const t = performance.now() * 0.002;
          glowNodeObjects.forEach((obj) => {
            const phase = String(obj.userData && obj.userData.nodeId || "").length;
            if(obj.userData && obj.userData.ring){
              const pulse = 1 + Math.sin(t + phase) * 0.06;
              obj.userData.ring.scale.setScalar(pulse);
              obj.userData.ring.rotation.z += obj.userData.nodeId === String(selectedNodeId) ? 0.006 : 0.0025;
            }
            if(obj.userData && obj.userData.glow){
              const importance = Number(obj.userData.importance) || 0.2;
              const pulse = 0.95 + (Math.sin(t * (1.0 + importance * 0.5) + phase) + 1) * (0.055 + importance * 0.035);
              obj.userData.glow.scale.setScalar(pulse);
            }
            if(obj.userData && obj.userData.body){
              const importance = Number(obj.userData.importance) || 0.2;
              obj.userData.body.rotation.y += 0.0008 + importance * 0.0014;
              obj.userData.body.rotation.x += 0.0003 + importance * 0.0005;
            }
          });
        });
      } catch(_) {}
      fetchGraph();
      clearInterval(refreshTimer);
      refreshTimer = setInterval(fetchGraph, REFRESH_MS);
      apply3dRuntime();
    }catch(e){
      console.error("[akira-brain-3d] init",e);
      container.innerHTML = '<div style="padding:24px;color:#ff7b72;font-family:monospace;text-align:center">Error 3D: ' + escapeHtml(e.message || e) + '</div>';
    }
  }

  window.addEventListener("akira:brain-select", function(ev){
    const id = ev && ev.detail ? ev.detail.nodeId : null;
    selectedNodeId = id ? String(id) : null;
    computeSemanticRoute();
    if(selectedNodeId) {
      if(!(ev && ev.detail && ev.detail.navigation)){
        const existingIndex = navigationHistory.lastIndexOf(selectedNodeId);
        if(existingIndex >= 0){
          navigationIndex = existingIndex;
        } else {
          navigationHistory.splice(navigationIndex + 1);
          navigationHistory.push(selectedNodeId);
          if(navigationHistory.length > MAX_NAV_HISTORY) navigationHistory.shift();
          navigationIndex = navigationHistory.length - 1;
        }
      }
      setExplorerDepth(1);
    } else {
      explorerState = {depth:0,visibleNodeIds:new Set(),visibleLinkIds:new Set()};
      dispatchExplorerState();
    }
    hudText();
    apply3dRuntime();
    dispatchSemanticRoute();
    setTimeout(focusSemanticRoute, 90);
    if(fg && selectedNodeId){
      try{
        const node = graphData.nodes.find(n => String(n.id) === selectedNodeId);
        if(node && node.x !== undefined){
          fg.cameraPosition(
            {x:(node.x||0)+90, y:(node.y||0)+65, z:(node.z||0)+90},
            {x:node.x||0,y:node.y||0,z:node.z||0},
            600
          );
        }
      }catch(_) {}
    }
  });

  window.akiraBrainFocus = function(){
    selectedNodeId = null;
    const akira = graphData.nodes.find(n => String(n.label || "").trim().toLowerCase() === "akira");
    if(akira) selectedNodeId = String(akira.id);
    hudText();
    apply3dRuntime();
    if(fg && akira && akira.x !== undefined){
      try {
        fg.cameraPosition(
          {x:(akira.x||0)+130,y:(akira.y||0)+90,z:(akira.z||0)+130},
          {x:akira.x||0,y:akira.y||0,z:akira.z||0},
          900
        );
      } catch(_) {}
    }
    try {
      window.dispatchEvent(new CustomEvent("akira:brain-select",{detail:{nodeId:selectedNodeId}}));
    } catch(_) {}
  };

  window.akiraBrainClearSelection = function(){
    selectedNodeId = null;
    hoveredNodeId = null;
    navigationHistory.length = 0;
    navigationIndex = -1;
    semanticRoute = {nodeIds:new Set(),linkIds:new Set(),bridges:0,hops:0,paths:[]};
    explorerState = {depth:0,visibleNodeIds:new Set(),visibleLinkIds:new Set()};
    hudText();
    updateContextPanel();
    apply3dRuntime();
    dispatchSemanticRoute();
    try { window.dispatchEvent(new CustomEvent("akira:brain-select",{detail:{nodeId:null}})); } catch(_) {}
  };

  window.akiraBrainNavigateBack = function(){
    navigateHistory(-1);
  };

  window.akiraBrainNavigateForward = function(){
    navigateHistory(1);
  };

  window.akiraBrainExploreDepth = function(depth){
    setExplorerDepth(depth);
  };

  window.akiraBrainExploreAll = function(){
    if(selectedNodeId) {
      computeExplorerScope(0);
    } else {
      explorerState = {
        depth:0,
        visibleNodeIds:new Set(graphData.nodes.map(n => String(n.id))),
        visibleLinkIds:new Set(graphData.links.map(l => String(l.id)))
      };
    }
    apply3dRuntime();
    dispatchExplorerState();
    hudText();
  };

  window.akiraBrainToggleOrbit = function(){
    autoOrbit = !autoOrbit;
    updateOrbitUI();
    if(fg){
      try {
        const controls = fg.controls();
        if(controls) controls.autoRotate = autoOrbit;
      } catch(_) {}
    }
  };

  window.akiraBrainRetry3d = function(){
    const container = document.getElementById("membrane3d");
    try{
      document.querySelectorAll('script[data-akira-script="three"],script[data-akira-script="force-graph-3d"]')
        .forEach(el => { try { el.remove(); } catch(_) {} });
    }catch(_) {}
    threeLoading = null;
    forceGraphLoading = null;
    if(container){
      container.innerHTML = '<div style="padding:24px;color:#9ca3af;font-family:monospace;text-align:center">Cargando motor 3D…</div>';
    }
    return ensure3d();
  };

  window.akiraBrainSetMode = function(mode){
    setModeUI(mode);
    if(mode === "3d" && !initialized) ensure3d();
    if(mode === "2d"){
      try { if(window.AkiraMembrane && window.AkiraMembrane.resizeMembrane) window.AkiraMembrane.resizeMembrane(); } catch(_) {}
    }
  };

  window.addEventListener("akira:section-shown", function(ev){
    const section = ev && ev.detail && ev.detail.section;
    if(section === "membrane"){
      if(currentMode === "3d") ensure3d();
      setTimeout(() => {
        try{
          const el = document.getElementById(currentMode === "3d" ? "membrane3d" : "membraneCy");
          if(el) el.dispatchEvent(new Event("resize"));
          if(window.cyMembrane && currentMode === "2d") window.cyMembrane.resize();
        }catch(_) {}
      },120);
    }
  });

  document.addEventListener("DOMContentLoaded", function(){
    setTimeout(() => {
      setModeUI("2d");
      updateOrbitUI();
      updateStats();
      updateNavigationUI();
      fetchGraph();
      if(window.AkiraMembrane && window.AkiraMembrane.resizeMembrane) window.AkiraMembrane.resizeMembrane();
    },650);
  });
})();
