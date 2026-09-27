// AKIRA V3 MEMBRANA REAL - Neurona con sinapsis visible - AUDITADO
let Graph = null;
let allGraphData = {nodes:[], links:[]};

function createNeuronaReal(texto, tipo="sensorial", esCompartida=false){
  const colors = {
    sensorial: "#00d4ff",
    memoria: "#8b5cf6",
    interneurona: "#10b981",
    motora: "#f59e0b",
    avatar: "#ffffff",
    episodica: "#00d4ff",
    semantica: "#f59e0b"
  };
  return {
    id: "temp_" + Date.now(),
    label: (texto || "").slice(0,25),
    full: texto || "",
    tipo: tipo,
    color: colors[tipo] || "#8a8a93",
    esCompartida: esCompartida,
    val: tipo==="avatar" ? 12 : (esCompartida ? 5 : 3)
  };
}

async function buildGraphData(){
  try{
    const locales = await getNeuronasLocales();
    let sharedNodes = [];
    try{
      const backend = localStorage.getItem("akira_backend_url") || "https://tu-app.onrender.com";
      const r = await fetch(backend + "/api/brain/shared");
      if(r.ok){
        const j = await r.json();
        const shared = j.shared || [];
        sharedNodes = shared.slice(-50).map(s=>{
          const txt = s.texto || s.full || "";
          const n = createNeuronaReal(txt, s.tipo || "memoria", true);
          n.id = s.id || ("shared_" + Math.random().toString(36).slice(2));
          n.full = txt;
          return n;
        });
      }
    }catch(e){ console.log("Shared no disponible", e.message); }
    
    const avatar = createNeuronaReal("AKIRA AVATAR CENTRAL", "avatar", true);
    avatar.id = "AKIRA";
    avatar.color = "#ffffff";
    avatar.val = 15;
    
    const localNodes = locales.slice(-60).map(l=>{
      const n = createNeuronaReal(l.texto, l.tipo || "sensorial", l.esCompartida || false);
      n.id = l.id;
      n.full = l.texto;
      return n;
    });
    
    const nodes = [avatar, ...localNodes, ...sharedNodes];
    const links = [];
    
    nodes.forEach(n=>{
      if(n.id!=="AKIRA"){
        links.push({source: n.id, target: "AKIRA", esSinapsis: !!n.esCompartida});
      }
    });
    
    const recent = localNodes.slice(-6);
    for(let i=0;i<recent.length-1;i++){
      links.push({source: recent[i].id, target: recent[i+1].id, esSinapsis: true});
    }
    
    return {nodes, links};
  }catch(e){
    console.error("buildGraphData error", e);
    const avatar = createNeuronaReal("AKIRA", "avatar", true);
    avatar.id = "AKIRA";
    return {nodes:[avatar], links:[]};
  }
}

async function initGraph(){
  try{
    const gData = await buildGraphData();
    allGraphData = gData;
    const elem = document.getElementById("graph");
    if(!elem){ console.error("graph element no existe"); return; }
    if(typeof ForceGraph === "undefined"){ console.error("ForceGraph no cargado"); elem.innerHTML = "<p style='padding:20px;color:#8a8a93'>Cargando membrana... verifica internet para force-graph</p>"; return; }
    
    Graph = ForceGraph()(elem)
      .graphData(gData)
      .nodeColor(n=>n.color)
      .nodeVal(n=>n.val)
      .nodeLabel(n=>{
        const tipo = n.esCompartida ? "COMPARTIDA 10M" : "LOCAL 100K";
        return `${n.tipo.toUpperCase()} ${tipo} - ${n.full.slice(0,120)}`;
      })
      .linkColor(l=> l.esSinapsis ? "rgba(0,212,255,0.85)" : "rgba(255,255,255,0.12)")
      .linkWidth(l=> l.esSinapsis ? 2.2 : 0.6)
      .linkDirectionalParticles(l=> l.esSinapsis ? 2 : 0)
      .linkDirectionalParticleSpeed(0.015)
      .onNodeClick(n=>{
        alert(`${n.tipo.toUpperCase()} ${n.esCompartida?"COMPARTIDA 10M (Nivel 2)":"LOCAL 100K (Nivel 3)"}\n\n${n.full}\n\nID: ${n.id}`);
      });
    Graph.d3Force('charge').strength(-80);
  }catch(e){ console.error("initGraph error", e); }
}

function addNeuronaToGraph(neurona){
  try{
    if(!Graph || !allGraphData){ return; }
    const n = createNeuronaReal(neurona.texto, neurona.tipo, neurona.esCompartida);
    n.id = neurona.id;
    n.full = neurona.texto;
    allGraphData.nodes.push(n);
    allGraphData.links.push({source: n.id, target: "AKIRA", esSinapsis: true});
    const palabra = (neurona.texto || "").split(" ")[0] || "";
    if(palabra.length > 3){
      const similares = allGraphData.nodes.filter(x=>x.id!==n.id && x.full.toLowerCase().includes(palabra.toLowerCase())).slice(0,2);
      similares.forEach(s=>{
        allGraphData.links.push({source: n.id, target: s.id, esSinapsis: true});
      });
    }
    Graph.graphData(allGraphData);
  }catch(e){ console.error("addNeuronaToGraph error", e); }
}

function filterGraph(q){
  try{
    if(!Graph || !allGraphData) return;
    q=(q||"").toLowerCase().trim();
    if(!q){ Graph.graphData(allGraphData); return; }
    const filteredNodes = allGraphData.nodes.filter(n=> (n.label&&n.label.toLowerCase().includes(q)) || (n.full&&n.full.toLowerCase().includes(q)) );
    const ids=new Set(filteredNodes.map(n=>n.id)); ids.add('AKIRA');
    const fLinks=allGraphData.links.filter(l=> {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return ids.has(s) && ids.has(t);
    });
    const fNodes=allGraphData.nodes.filter(n=> ids.has(n.id));
    Graph.graphData({nodes:fNodes, links:fLinks});
  }catch(e){ console.error("filterGraph error", e); }
}

function resetGraph(){
  try{
    const inp = document.getElementById('graphSearch');
    if(inp) inp.value='';
    if(Graph&&allGraphData){ Graph.graphData(allGraphData); Graph.zoomToFit(400); }
  }catch(e){}
}
