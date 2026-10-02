
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

  function updateStats(){
    const el = document.getElementById("brainStats");
    if(!el) return;
    const selected = selectedNodeId ? graphData.links.filter(isRelatedLink).length : 0;
    el.innerHTML = "<strong>" + graphData.nodes.length + "</strong> NODOS · <strong>" +
      graphData.links.length + "</strong> RELACIONES" +
      (selected ? " · <strong>" + selected + "</strong> EN FOCO" : "");
  }

  function updateOrbitUI(){
    const b = document.getElementById("brainOrbitBtn");
    if(b) b.classList.toggle("active-orbit", autoOrbit);
  }

  function hudText(){
    const hud = document.getElementById("brainHud");
    if(!hud) return;
    if(!selectedNodeId){
      hud.textContent = "Selecciona un nodo para explorar sus conexiones.";
      return;
    }
    const n = graphData.nodes.find(x => String(x.id) === String(selectedNodeId));
    const label = n ? String(n.label || n.id) : selectedNodeId;
    const degree = graphData.links.filter(l => isRelatedLink(l)).length;
    hud.innerHTML = "<strong>" + escapeHtml(label) + "</strong> · " + degree + " conexiones";
    updateStats();
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
      .backgroundColor("#09090c")
      .nodeColor(n => {
        const id = String(n.id);
        if(id === String(selectedNodeId)) return "#ffffff";
        if(String(n.label || "").trim().toLowerCase() === "akira") return "#ff6b6b";
        return colorForNode(n, hoveredNodeId && id === String(hoveredNodeId));
      })
      .nodeVal(n => {
        if(String(n.label || "").trim().toLowerCase() === "akira") return 12;
        const reuse = Number(n.reuse_count) || 0;
        const weight = Number(n.weight) || 0;
        return Math.max(2.5, 3 + Math.min(10, reuse * 0.8 + weight * 1.2));
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
        return "<div style='padding:6px 8px;background:rgba(10,10,13,.94);border:1px solid #3b3b4a;font-family:monospace;font-size:11px;color:#fff'><b>" + label + "</b><br><span style='color:#9ca3af'>" + type + " · reuse " + reuse + "</span></div>";
      })
      .nodeResolution(10)
      .nodeRelSize(5.5)
      .nodeVisibility(true)
      .linkColor(l => isRelatedLink(l) ? "#c4b5fd" : "#3f4650")
      .linkWidth(l => isRelatedLink(l) ? Math.min(5, 1.5 + (Number(l.weight)||0.5)) : Math.min(1.6, 0.35 + (Number(l.weight)||0.5) * 0.4))
      .linkOpacity(l => selectedNodeId && !isRelatedLink(l) ? 0.10 : 0.46)
      .linkDirectionalArrowLength(l => isRelatedLink(l) ? 4 : 0)
      .linkDirectionalArrowColor(l => isRelatedLink(l) ? "#ddd6fe" : "#5b6470")
      .linkDirectionalParticles(l => isRelatedLink(l) ? 4 : (selectedNodeId ? 0 : 1))
      .linkDirectionalParticleWidth(l => isRelatedLink(l) ? 1.7 : 0.8)
      .linkDirectionalParticleColor(l => isRelatedLink(l) ? "#ffffff" : "#7c8795")
      .linkDirectionalParticleSpeed(l => isRelatedLink(l) ? 0.025 : 0.009)
      .linkPositionUpdate((linkObj, coords, link) => {
        // Keep default link geometry; this callback is intentionally a no-op hook.
        return false;
      })
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
      if(window.AkiraMembrane && window.AkiraMembrane.resizeMembrane) window.AkiraMembrane.resizeMembrane();
    },650);
  });
})();
