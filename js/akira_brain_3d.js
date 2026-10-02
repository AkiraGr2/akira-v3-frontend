
// AKIRA BRAIN 2D/3D — V1
// Vista 3D sobre el mismo grafo de conocimiento que alimenta el Brain 2D.
// Motor: 3d-force-graph (Three.js/WebGL), licencia MIT.
// No crea ni duplica datos: consume /api/v8/graph/overview.

(function(){
  "use strict";

  const API = "https://akira-empresa.onrender.com";
  const REFRESH_MS = 7000;
  const MAX_NODES = 500;
  const MAX_EDGES = 1000;

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
  let threeLoading = null;
  const glowNodeObjects = new Map();
  let communityState = {
    assignments: new Map(),
    centers: new Map(),
    count: 0
  };

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

  function loadThree(){
    if(window.THREE) return Promise.resolve(window.THREE);
    if(threeLoading) return threeLoading;
    threeLoading = new Promise((resolve,reject) => {
      const existing = document.querySelector('script[data-akira-three="1"]');
      if(existing){
        existing.addEventListener("load", () => resolve(window.THREE), {once:true});
        existing.addEventListener("error", reject, {once:true});
        return;
      }
      const s = document.createElement("script");
      s.src = "https://unpkg.com/three@0.180.0/build/three.min.js";
      s.async = true;
      s.dataset.akiraThree = "1";
      s.onload = () => window.THREE ? resolve(window.THREE) : reject(new Error("THREE no disponible"));
      s.onerror = () => reject(new Error("No se pudo cargar Three.js"));
      document.head.appendChild(s);
    }).finally(() => { threeLoading = null; });
    return threeLoading;
  }

  function hexColor(hex){
    try { return Number.parseInt(String(hex).replace("#",""),16); } catch(_) { return 0xffffff; }
  }

  function nodeIsRelated(n){
    if(!selectedNodeId) return true;
    const id = String(n.id);
    if(id === String(selectedNodeId)) return true;
    return graphData.links.some(l => {
      const a = nodeId(l.source), b = nodeId(l.target);
      return (a === String(selectedNodeId) && b === id) || (b === String(selectedNodeId) && a === id);
    });
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
    const dim = !!selectedNodeId && !selected && !related;
    const body = group.userData.body;
    const glow = group.userData.glow;
    const ring = group.userData.ring;

    if(body && body.material){
      body.material.color.setHex(selected ? 0xffffff : (core ? 0xff6b6b : color));
      body.material.emissive.setHex(selected ? 0xffffff : (core ? 0x551111 : color));
      body.material.emissiveIntensity = selected ? 1.8 : (core ? 1.25 : 0.75);
      body.material.opacity = dim ? 0.16 : 1;
      body.material.transparent = dim;
    }
    if(glow && glow.material){
      glow.material.color.setHex(selected ? 0xffffff : color);
      glow.material.opacity = dim ? 0.025 : (selected ? 0.25 : (core ? 0.18 : 0.09));
    }
    if(ring){
      ring.visible = core || selected;
      if(ring.material){
        ring.material.color.setHex(selected ? 0xffffff : 0xff6b6b);
        ring.material.opacity = dim ? 0.08 : 0.7;
      }
    }
    if(group.userData.renderRadius){
      const targetRadius = nodeVisualRadius(n);
      const scale = targetRadius / group.userData.renderRadius;
      group.scale.setScalar(Math.max(0.55, Math.min(1.65, scale)));
    }
    group.userData.nodeId = String(n.id);
    group.userData.dimmed = dim;
  }

  function syncAllGlowNodes(){
    glowNodeObjects.forEach((group, id) => {
      const n = graphData.nodes.find(x => String(x.id) === String(id));
      if(n) syncGlowNodeVisual(group, n);
    });
  }

  function makeGlowNode(n){
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

  function computeCommunities(nodes, links, coreId){
    const ids = nodes.map(n => String(n.id)).sort();
    const labels = new Map(ids.map(id => [id, id]));
    const adjacency = new Map(ids.map(id => [id, []]));

    for(const l of links){
      const a = nodeId(l.source);
      const b = nodeId(l.target);
      if(a === b || !adjacency.has(a) || !adjacency.has(b)) continue;
      let w = Number(l.weight) || 0.5;
      if(a === String(coreId) || b === String(coreId)) w *= 0.08;
      adjacency.get(a).push([b, w]);
      adjacency.get(b).push([a, w]);
    }

    for(let iter=0; iter<7; iter++){
      let changed = 0;
      for(const id of ids){
        if(id === String(coreId)) continue;
        const scores = new Map();
        for(const [other, w] of adjacency.get(id) || []){
          const lab = labels.get(other);
          scores.set(lab, (scores.get(lab) || 0) + w);
        }
        if(!scores.size) continue;

        const current = labels.get(id);
        const currentScore = scores.get(current) || 0;
        let best = current;
        let bestScore = currentScore;

        for(const [lab, score] of scores){
          if(score > bestScore + 0.0001 || (Math.abs(score-bestScore) <= 0.0001 && String(lab) < String(best))){
            best = lab;
            bestScore = score;
          }
        }

        if(best !== current && bestScore > Math.max(0.12, currentScore * 1.08)){
          labels.set(id, best);
          changed++;
        }
      }
      if(!changed) break;
    }

    const groups = new Map();
    for(const [id, label] of labels){
      if(!groups.has(label)) groups.set(label, []);
      groups.get(label).push(id);
    }

    const ordered = [...groups.entries()].sort((a,b) => b[1].length - a[1].length || String(a[0]).localeCompare(String(b[0])));
    const assignments = new Map();
    ordered.forEach(([label, members], index) => {
      const clusterId = "c" + String(index + 1);
      members.forEach(id => assignments.set(id, clusterId));
    });

    if(coreId && assignments.has(String(coreId))){
      assignments.set(String(coreId), "core");
    }

    const degree = new Map();
    const maxes = {weight:0,reuse:0,degree:0};
    for(const n of nodes){
      degree.set(String(n.id), 0);
      maxes.weight = Math.max(maxes.weight, Number(n.weight)||0);
      maxes.reuse = Math.max(maxes.reuse, Number(n.reuse_count)||0);
    }
    for(const l of links){
      const a=nodeId(l.source), b=nodeId(l.target);
      if(degree.has(a)) degree.set(a, degree.get(a)+1);
      if(degree.has(b)) degree.set(b, degree.get(b)+1);
    }
    maxes.degree = Math.max(1, ...degree.values());

    const importance = new Map();
    for(const n of nodes){
      const id=String(n.id);
      const weight = maxes.weight ? (Number(n.weight)||0)/maxes.weight : 0;
      const reuse = maxes.reuse ? (Number(n.reuse_count)||0)/maxes.reuse : 0;
      const confidence = Math.max(0, Math.min(1, Number(n.confidence)||0));
      const deg = (degree.get(id)||0)/maxes.degree;
      const score = Math.max(0, Math.min(1, 0.28*weight + 0.27*reuse + 0.18*confidence + 0.27*deg));
      n._importance = id === String(coreId) ? 1 : score;
      n._degree = degree.get(id)||0;
    }

    const clusters = new Map();
    assignments.forEach((clusterId,id) => {
      if(clusterId === "core") return;
      if(!clusters.has(clusterId)) clusters.set(clusterId, []);
      clusters.get(clusterId).push(id);
    });

    const centers = new Map();
    const clusterList = [...clusters.entries()].sort((a,b) => b[1].length-a[1].length || a[0].localeCompare(b[0]));
    const ring = Math.max(95, Math.min(260, 90 + Math.sqrt(Math.max(nodes.length,1))*8));
    const golden = Math.PI * (3 - Math.sqrt(5));

    clusterList.forEach(([clusterId,members],index)=>{
      const a = (index / Math.max(clusterList.length,1)) * Math.PI * 2;
      const z = ((index % 3) - 1) * Math.min(90, ring*0.24);
      const r = ring + Math.min(130, members.length * 2.2);
      centers.set(clusterId,{x:Math.cos(a)*r,y:Math.sin(a)*r,z,angle:a});
      members.forEach((id,j)=>{
        const n=nodes.find(x=>String(x.id)===id);
        if(!n) return;
        n._clusterAngle = a + (j * golden);
      });
    });

    communityState = {assignments, centers, count: clusterList.length};
    return communityState;
  }

  function makeCommunityForce(){
    const currentState = communityState;
    let nodes = [];
    const force = function(alpha){
      for(const n of nodes){
        const id=String(n.id);
        if(n._isCore){
          n.vx += (0-n.x) * 0.16 * alpha;
          n.vy += (0-n.y) * 0.16 * alpha;
          n.vz += (0-n.z) * 0.16 * alpha;
          continue;
        }
        const clusterId = currentState.assignments.get(id);
        const center = currentState.centers.get(clusterId);
        if(!center) continue;
        const strength = 0.055 + (Number(n._importance)||0) * 0.055;
        n.vx += (center.x-n.x) * strength * alpha;
        n.vy += (center.y-n.y) * strength * alpha;
        const targetZ = center.z + ((Number(n._importance)||0)-0.45) * 150;
        n.vz += (targetZ-n.z) * strength * alpha;
      }
    };
    force.initialize = _nodes => { nodes = _nodes || []; };
    return force;
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
        return {label:String(other?.label || otherId), type:String(l.relation_type || "related_to"), weight:Number(l.weight)||0};
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
        ? relations.map(r => "<div class='brain-relation'><span>" + escapeHtml(r.label) + "</span><span>" + escapeHtml(r.type) + "</span></div>").join("")
        : "<div style='color:#8a8a93;font-size:10px'>Sin relaciones visibles.</div>";
    }
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
    if(!hud) return;
    if(!selectedNodeId){
      hud.textContent = "Selecciona un nodo para explorar sus conexiones.";
      return;
    }
    const n = graphData.nodes.find(x => String(x.id) === String(selectedNodeId));
    const label = n ? String(n.label || n.id) : selectedNodeId;
    const degree = graphData.links.filter(l => isRelatedLink(l)).length;
    hud.innerHTML = "<strong>" + escapeHtml(label) + "</strong> · " + degree + " conexiones · " + communitySummary();
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

  function apply3dRuntime(){
    if(!fg) return;
    fg
      .backgroundColor("#05060a")
      .d3Force("charge").strength(-78)
      .d3Force("community", makeCommunityForce())
      .nodeColor(n => {
        const id = String(n.id);
        if(id === String(selectedNodeId)) return "#ffffff";
        if(String(n.label || "").trim().toLowerCase() === "akira") return "#ff6b6b";
        return colorForNode(n, hoveredNodeId && id === String(hoveredNodeId));
      })
      .nodeVal(n => {
        if(String(n.label || "").trim().toLowerCase() === "akira") return 12;
        return Math.max(2.5, 2.7 + (Number(n._importance)||0.25) * 10.5);
      })
      .nodeOpacity(n => {
        if(!selectedNodeId) return 0.82;
        const id = String(n.id);
        if(id === String(selectedNodeId)) return 1;
        const related = graphData.links.some(l => isRelatedLink(l) && (nodeId(l.source) === id || nodeId(l.target) === id));
        return related ? 0.95 : 0.16;
      })
      .nodeLabel(n => {
        const type = escapeHtml(n.node_type || "concept");
        const label = escapeHtml(n.label || n.id);
        const reuse = Number(n.reuse_count) || 0;
        const importance = Math.round((Number(n._importance)||0) * 100);
        return "<div style='padding:6px 8px;background:rgba(10,10,13,.94);border:1px solid #3b3b4a;font-family:monospace;font-size:11px;color:#fff'><b>" + label + "</b><br><span style='color:#9ca3af'>" + type + " · reuse " + reuse + " · importancia " + importance + "%</span></div>";
      })
      .nodeResolution(10)
      .nodeRelSize(5.5)
      .nodeVisibility(true)
      .nodeThreeObject(n => makeGlowNode(n) || undefined)
      .nodeThreeObjectExtend(false)
      .linkColor(l => isRelatedLink(l) ? "#c4b5fd" : linkClusterType(l))
      .linkWidth(l => isRelatedLink(l) ? Math.min(5, 1.5 + (Number(l.weight)||0.5)) : Math.min(1.6, 0.35 + (Number(l.weight)||0.5) * 0.4))
      .linkOpacity(l => {
        if(selectedNodeId && !isRelatedLink(l)) return 0.10;
        const a = nodeId(l.source), b = nodeId(l.target);
        const ca = communityState.assignments.get(a);
        const cb = communityState.assignments.get(b);
        if(ca && cb && ca === cb && ca !== "core") return 0.32;
        const na = graphData.nodes.find(x => String(x.id) === a);
        const nb = graphData.nodes.find(x => String(x.id) === b);
        if(na?._isCore || nb?._isCore) return 0.42;
        return 0.18;
      })
      .linkDirectionalArrowLength(l => isRelatedLink(l) ? 4 : 0)
      .linkDirectionalArrowColor(l => isRelatedLink(l) ? "#ddd6fe" : "#5b6470")
      .linkDirectionalParticles(l => isRelatedLink(l) ? 4 : (selectedNodeId ? 0 : 1))
      .linkDirectionalParticleWidth(l => isRelatedLink(l) ? 1.7 : 0.8)
      .linkDirectionalParticleColor(l => isRelatedLink(l) ? "#ffffff" : "#7c8795")
      .linkDirectionalParticleSpeed(l => isRelatedLink(l) ? 0.025 : 0.009)
      .showNavInfo(false)
      .controlType("orbit")
      .enablePointerInteraction(true)
      .cooldownTime(graphData.nodes.length > 280 ? 8500 : 6500)
      .warmupTicks(graphData.nodes.length > 280 ? 120 : 80)
      .cooldownTicks(220);

    try {
      const controls = fg.controls();
      if(controls) {
        controls.rotateSpeed = 0.45;
        controls.zoomSpeed = 0.7;
        controls.enablePan = true;
        controls.autoRotate = autoOrbit;
      }
    } catch(_) {}
    syncAllGlowNodes();
  }

  async function ensure3d(){
    if(initialized && fg) {
      apply3dRuntime();
      fetchGraph();
      return;
    }

    const container = document.getElementById("membrane3d");
    if(!container) return;
    try {
      await loadThree();
    } catch(e) {
      container.innerHTML = '<div style="padding:24px;color:#ff7b72;font-family:monospace;text-align:center">No se pudo cargar Three.js.</div>';
      console.warn("[akira-brain-3d] three", e);
      return;
    }
    if(typeof window.ForceGraph3D !== "function"){
      container.innerHTML = '<div style="padding:24px;color:#ff7b72;font-family:monospace;text-align:center">No se pudo cargar el motor 3D.</div>';
      return;
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
          selectedNodeId = String(node.id);
          hudText();
          apply3dRuntime();
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
          hudText();
          apply3dRuntime();
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
              obj.userData.ring.rotation.z += 0.003;
            }
            if(obj.userData && obj.userData.glow){
              const pulse = 0.96 + (Math.sin(t * 1.15 + phase) + 1) * 0.07;
              obj.userData.glow.scale.setScalar(pulse);
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
    hudText();
    apply3dRuntime();
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
    hudText();
    updateContextPanel();
    apply3dRuntime();
    try { window.dispatchEvent(new CustomEvent("akira:brain-select",{detail:{nodeId:null}})); } catch(_) {}
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
      fetchGraph();
      if(window.AkiraMembrane && window.AkiraMembrane.resizeMembrane) window.AkiraMembrane.resizeMembrane();
    },650);
  });
})();
