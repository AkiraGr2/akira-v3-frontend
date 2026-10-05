/* AKIRA OFFICE — Pixel Living V2
 * Canonical Office view: 2D pixel-art asset scene only.
 * The visual ground truth is the authored office artwork stored in
 * assets/office/LargePixelOffice.png, with PixelOffice.png as fallback.
 *
 * Runtime truth:
 * - /api/v8/agents and /api/v8/tasks are read-only sources of state.
 * - The office never writes backend state.
 * - The artwork is not procedurally replaced by generic furniture.
 * - Agent coordinates follow the authored 32x24 design map.
 */
(function(){
  "use strict";

  const GRID_W=32,GRID_H=24;
  const ART_W=688,ART_H=630;
  const POLL_MS=8000;
  const BACKEND_FALLBACK="https://akira-empresa.onrender.com";
  const ART_PRIMARY="./assets/office/LargePixelOffice.png";
  const ART_FALLBACK="./assets/office/PixelOffice.png";

  const DESIGN=[
    {name:"Akira",role:"Supervisor",color:"#c7a6ff",home:[12,4]},
    {name:"Luna",role:"Investigación",color:"#ff72ae",home:[6,6]},
    {name:"Nexo",role:"Desarrollo",color:"#78b7ff",home:[10,8]},
    {name:"Nova",role:"Creatividad",color:"#e8d7ff",home:[16,6]},
    {name:"Orion",role:"Análisis",color:"#d69a68",home:[6,12]},
    {name:"Kaori",role:"Organización",color:"#d7d7ff",home:[14,12]},
    {name:"Zeri",role:"Soporte",color:"#9eafff",home:[20,12]},
    {name:"Lyra",role:"Estrategia",color:"#62d8d0",home:[26,8]},
    {name:"Dante",role:"Desactivado",color:"#6d7185",home:[4,16],disabled:true}
  ];

  /* Explicit visual-persona <-> backend-agent identity map. */
  const BACKEND_FOR_DESIGN=Object.freeze({
    Akira:"internal",
    Luna:"researcher",
    Nexo:"developer",
    Nova:"graph_builder",
    Orion:"reviewer",
    Kaori:"memorizer",
    Zeri:"tester",
    Lyra:"learner",
    Dante:"selftest_agent"
  });
  const DESIGN_FOR_BACKEND=Object.freeze(
    Object.fromEntries(Object.entries(BACKEND_FOR_DESIGN).map(([visual,backend])=>[backend,visual]))
  );

  /* Coordinates taken from the authored Office V3.0 design map. */
  const NODES={
    entrada:[28,16],
    sur:[24,16],
    lounge:[4,16],
    centro:[16,10],
    norte:[16,4],
    akira:[12,4],
    tablero:[20,3],
    cafe:[26,2],
    impresora:[18,14],
    reunion:[20,4],
    luna:[6,6],
    nexo:[10,8],
    nova:[16,6],
    orion:[6,12],
    kaori:[14,12],
    zeri:[20,12],
    lyra:[26,8],
    dante:[4,16]
  };

  const EDGES=[
    ["entrada","sur"],["sur","zeri"],["zeri","reunion"],["reunion","norte"],
    ["norte","akira"],["norte","tablero"],["tablero","cafe"],
    ["norte","impresora"],["impresora","kaori"],["kaori","lyra"],
    ["kaori","zeri"],["norte","nova"],["nova","nexo"],["nexo","luna"],
    ["nexo","orion"],["orion","lounge"],["lounge","dante"]
  ];
  const PATHS={};
  EDGES.forEach(([a,b])=>{
    (PATHS[a]||(PATHS[a]=[])).push(b);
    (PATHS[b]||(PATHS[b]=[])).push(a);
  });

  let canvas,ctx,stage,initialized=false,raf=0,last=0,paused=false,selected="";
  let officeArt=null,artSource="",artFailed=false;
  let agents=DESIGN.map(d=>({...d,status:d.disabled?"disabled":"idle",real:false,task:null,pos:{x:d.home[0],y:d.home[1]},route:[],routeIndex:0,wait:0}));
  let tasks=[];
  let backend;
  let truthSummary={loaded:false,total:0,working:0,idle:0,error:0,disabled:0};
  let eventText="Cargando arte de la Oficina…";

  const el=id=>document.getElementById(id);

  function backendUrl(){
    try{return localStorage.getItem("akira_backend_url")||BACKEND_FALLBACK;}
    catch(_){return BACKEND_FALLBACK;}
  }

  function authHeaders(){
    try{
      return typeof window.akiraAuthHeaders==="function" ? window.akiraAuthHeaders() : {};
    }catch(_){return {};}
  }

  function say(text){
    eventText=String(text||"");
    const ev=el("officePixelEvent");
    if(ev) ev.textContent=eventText;
  }

  function findDesign(name){
    return DESIGN.find(d=>String(d.name).toLowerCase()===String(name).toLowerCase());
  }

  function truthState(a){
    const s=String(a&&a.status||"").toLowerCase();
    if(s==="disabled") return "disabled";
    if(["error","failed","failure"].includes(s)) return "error";
    const name=String(a&&a.name||"").toLowerCase();
    const active=tasks.find(t=>
      String(t&&t.agent_name||"").toLowerCase()===name &&
      ["pending","queued","running","working","executing","in_progress","started","active"].includes(String(t&&t.status||"").toLowerCase())
    );
    if(active || ["working","running","busy","executing"].includes(s)) return "working";
    return "idle";
  }

  function syncTruth(){
    agents=agents.map(a=>{
      const backendName=String(a.backendName||BACKEND_FOR_DESIGN[a.name]||a.name).toLowerCase();
      const backendAgent=backendName ? {name:backendName,status:a.status} : null;
      const task=tasks.find(t=>String(t&&t.agent_name||"").toLowerCase()===backendName)||null;
      if(!a.real && !a.disabled) return {...a,task:null};
      return {...a,status:backendAgent?truthState(backendAgent):a.status,real:a.real,task};
    });
  }

  async function poll(){
    backend=backendUrl();
    try{
      const [ar,tr]=await Promise.all([
        fetch(backend+"/api/v8/agents",{headers:authHeaders(),cache:"no-store"}),
        fetch(backend+"/api/v8/tasks?limit=100",{headers:authHeaders(),cache:"no-store"})
      ]);

      if(ar.ok){
        const data=await ar.json();
        const real=Array.isArray(data&&data.agents)?data.agents:[];
        const realByName=new Map(real.map(r=>[String(r.name||"").toLowerCase(),r]));
        agents=DESIGN.map(d=>{
          const backendName=BACKEND_FOR_DESIGN[d.name];
          const r=realByName.get(String(backendName||"").toLowerCase());
          return {
            ...d,
            backendName:backendName||d.name,
            status:r?truthState(r):(d.disabled?"disabled":"idle"),
            real:Boolean(r),
            task:null,
            pos:{x:d.home[0],y:d.home[1]},
            route:[],
            routeIndex:0,
            wait:0
          };
        });
        truthSummary.loaded=true;
        last=Date.now();
      }

      if(tr.ok){
        const data=await tr.json();
        tasks=Array.isArray(data&&data.tasks)?data.tasks:[];
      }

      syncTruth();

      if(truthSummary.loaded){
        const real=agents.filter(a=>a.real);
        truthSummary.total=real.length;
        truthSummary.working=real.filter(a=>a.status==="working").length;
        truthSummary.error=real.filter(a=>a.status==="error").length;
        truthSummary.disabled=real.filter(a=>a.status==="disabled").length;
        truthSummary.idle=real.length-truthSummary.working-truthSummary.error-truthSummary.disabled;
      }

      renderHud();
    }catch(_){
      renderHud();
      say("Arte local activo · estado del backend no confirmado.");
    }
  }

  function shortestPath(from,to){
    if(from===to)return[from];
    const q=[from],prev=new Map([[from,null]]);
    while(q.length){
      const cur=q.shift();
      for(const nx of(PATHS[cur]||[])){
        if(prev.has(nx))continue;
        prev.set(nx,cur);
        if(nx===to){
          const out=[];let x=to;
          while(x){out.unshift(x);x=prev.get(x);}
          return out;
        }
        q.push(nx);
      }
    }
    return[from];
  }

  function nearestNode(p){
    let best="centro",bd=Infinity;
    Object.entries(NODES).forEach(([name,v])=>{
      const d=Math.hypot(v[0]-p.x,v[1]-p.y);
      if(d<bd){bd=d;best=name;}
    });
    return best;
  }

  function assignRoute(agent,target){
    if(!agent)return;
    const from=nearestNode(agent.pos);
    const nodes=shortestPath(from,target);
    agent.route=nodes.map(n=>({x:NODES[n][0],y:NODES[n][1]}));
    agent.routeIndex=0;
  }

  function command(action){
    if(action==="mission"){
      const a=agents.find(x=>x.name==="Akira");
      assignRoute(a,"tablero");
      selected="Akira";
      say("Akira → Tablero de Misiones · representación visual.");
    }else if(action==="coffee"){
      agents.filter(a=>!a.disabled).slice(0,3).forEach(a=>assignRoute(a,"cafe"));
      say("Ruta visual → Cocina / Café.");
    }else if(action==="meeting"){
      agents.filter(a=>!a.disabled).forEach(a=>assignRoute(a,"reunion"));
      say("Ruta visual → Sala de Reuniones.");
    }else if(action==="pet"){
      say("Kiro · mascota de la Oficina.");
    }
  }

  function updateAgent(a,dt){
    if(paused||a.disabled||!a.route.length)return;
    const target=a.route[Math.min(a.routeIndex,a.route.length-1)];
    const dx=target.x-a.pos.x,dy=target.y-a.pos.y;
    const dist=Math.hypot(dx,dy);
    if(dist<0.05){
      a.pos.x=target.x;a.pos.y=target.y;
      if(a.routeIndex<a.route.length-1)a.routeIndex++;
      else a.route=[];
      return;
    }
    const step=Math.min(dist,dt*(a.status==="working"?0.55:0.45));
    a.pos.x+=(dx/dist)*step;
    a.pos.y+=(dy/dist)*step;
  }

  function mapPoint(pos){
    return {x:(pos.x/GRID_W)*ART_W,y:(pos.y/GRID_H)*ART_H};
  }

  function drawStatusMarker(a,t){
    const p=mapPoint(a.pos);
    const pulse=2+Math.sin(t*.005+(a.name.length))*1.2;
    ctx.save();
    ctx.globalAlpha=a.real?1:.5;
    ctx.strokeStyle=a.status==="error"?"#ff5d8f":a.status==="working"?"#63e6be":a.disabled?"#ff5d8f":a.color;
    ctx.lineWidth=2;
    ctx.strokeRect(Math.round(p.x-6-pulse/2),Math.round(p.y-9-pulse/2),Math.round(12+pulse),Math.round(15+pulse));
    ctx.fillStyle=ctx.strokeStyle;
    ctx.fillRect(Math.round(p.x-2),Math.round(p.y-15),4,3);
    if(a.status==="working"){
      ctx.fillRect(Math.round(p.x+7),Math.round(p.y-5),3,3);
    }
    if(a.status==="error"){
      ctx.fillRect(Math.round(p.x+7),Math.round(p.y-5),3,3);
    }
    if(selected===a.name){
      ctx.fillStyle="#ffd166";
      ctx.fillRect(Math.round(p.x-10),Math.round(p.y-21),20,2);
      ctx.font="bold 10px monospace";
      const label=a.name+" · "+(a.status==="working"?"trabajando":a.disabled?"inactivo":a.real?"disponible":"diseño");
      const w=ctx.measureText(label).width+10;
      ctx.fillStyle="rgba(5,9,20,.92)";
      ctx.fillRect(Math.round(p.x-w/2),Math.round(p.y-39),Math.round(w),15);
      ctx.strokeStyle="#ffd166";
      ctx.strokeRect(Math.round(p.x-w/2)+.5,Math.round(p.y-38.5),Math.round(w-1),14);
      ctx.fillStyle="#fff";
      ctx.fillText(label,Math.round(p.x-w/2+5),Math.round(p.y-28));
    }
    ctx.restore();
  }

  function drawPetMarker(t){
    const p=mapPoint({x:21.5,y:17.0});
    const bob=Math.sin(t*.004)*2;
    ctx.save();
    ctx.fillStyle="#ff7a90";
    ctx.globalAlpha=.85;
    ctx.fillRect(Math.round(p.x-2),Math.round(p.y-16+bob),4,4);
    ctx.fillRect(Math.round(p.x-8),Math.round(p.y-12+bob),4,4);
    ctx.fillRect(Math.round(p.x+4),Math.round(p.y-12+bob),4,4);
    ctx.restore();
  }

  function drawScene(t){
    ctx.clearRect(0,0,ART_W,ART_H);
    if(officeArt){
      ctx.drawImage(officeArt,0,0,ART_W,ART_H);
    }else{
      ctx.fillStyle="#08101a";
      ctx.fillRect(0,0,ART_W,ART_H);
      ctx.fillStyle="#fff";
      ctx.font="bold 14px monospace";
      ctx.fillText("No se pudo cargar el arte de la Oficina.",24,40);
    }

    agents.forEach(a=>drawStatusMarker(a,t));
    drawPetMarker(t);

    if(artFailed){
      ctx.fillStyle="rgba(5,9,20,.9)";
      ctx.fillRect(18,ART_H-58,ART_W-36,38);
      ctx.fillStyle="#ffccd7";
      ctx.font="bold 10px monospace";
      ctx.fillText("ERROR: arte local no disponible",28,ART_H-35);
    }
  }

  function renderHud(){
    const hud=el("officePixelHud");
    const ev=el("officePixelEvent");
    if(hud){
      if(truthSummary.loaded){
        hud.innerHTML="<strong>AKIRA PROJECT</strong><br>"+
          truthSummary.total+" registrados · "+truthSummary.working+
          " trabajando · "+truthSummary.idle+" disponibles";
      }else{
        hud.innerHTML="<strong>AKIRA PROJECT · ARTE LOCAL</strong><br>Estado backend pendiente";
      }
    }
    if(ev)ev.textContent=eventText;
  }

  function selectAt(ev){
    const r=canvas.getBoundingClientRect();
    const x=(ev.clientX-r.left)/r.width*ART_W;
    const y=(ev.clientY-r.top)/r.height*ART_H;
    let hit=null,distBest=Infinity;
    agents.forEach(a=>{
      const p=mapPoint(a.pos),d=Math.hypot(p.x-x,p.y-y);
      if(d<24&&d<distBest){distBest=d;hit=a;}
    });
    selected=hit?hit.name:"";
    if(hit){
      say(hit.name+" · "+hit.role+" · "+(
        hit.status==="working"?"trabajando":
        hit.status==="disabled"?"inactivo":
        hit.real?"disponible":"diseño"
      ));
    }
  }

  function loadImage(url){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(new Error("image_load_failed:"+url));
      img.src=url+"?v=office-pixel-v2";
    });
  }

  async function loadArtwork(){
    try{
      officeArt=await loadImage(ART_PRIMARY);
      artSource="LargePixelOffice.png";
      artFailed=false;
    }catch(_){
      try{
        officeArt=await loadImage(ART_FALLBACK);
        artSource="PixelOffice.png";
        artFailed=false;
      }catch(_){
        officeArt=null;
        artSource="";
        artFailed=true;
      }
    }
    say(officeArt
      ? "Arte de Oficina cargado · "+artSource
      : "No se pudo cargar el arte local de la Oficina.");
    renderHud();
  }

  function resize(){
    if(!canvas||!stage||!ctx)return;
    const rect=stage.getBoundingClientRect();
    if(rect.width<2||rect.height<2)return;
    canvas.width=ART_W;
    canvas.height=ART_H;
    canvas.style.width=rect.width+"px";
    canvas.style.height=rect.height+"px";
    ctx.imageSmoothingEnabled=false;
  }

  function loop(ts){
    if(!initialized)return;
    const dt=Math.min(.05,(ts-last)/1000||0);
    if(!paused)agents.forEach(a=>updateAgent(a,dt));
    drawScene(ts);
    last=ts;
    raf=requestAnimationFrame(loop);
  }

  function bind(){
    [["officePixelMission","mission"],["officePixelCoffee","coffee"],["officePixelMeeting","meeting"],["officePixelPet","pet"]]
      .forEach(([id,action])=>{
        const b=el(id);
        if(b)b.addEventListener("click",()=>command(action));
      });
    if(canvas)canvas.addEventListener("click",selectAt);
    window.addEventListener("resize",resize,{passive:true});
  }

  window.initAkiraOfficePixel=async function(){
    if(initialized){resize();return;}
    stage=el("officePixelStage");
    canvas=el("officePixelCanvas");
    if(!stage||!canvas)return;
    ctx=canvas.getContext("2d");
    if(!ctx)return;
    backend=backendUrl();
    bind();
    initialized=true;
    resize();
    renderHud();
    await Promise.all([loadArtwork(),poll()]);
    resize();
    last=performance.now();
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(loop);
  };

  window.resizeAkiraOfficePixel=resize;
  window.setAkiraOfficePixelPaused=v=>{paused=Boolean(v);};
  window.refreshAkiraOfficePixel=async function(){
    await loadArtwork();
    await poll();
    resize();
  };

  window.akiraOfficePixelDebug={
    get initialized(){return initialized;},
    get artSource(){return artSource;},
    get artFailed(){return artFailed;},
    get agentCount(){return agents.filter(a=>a.real).length;},
    get designCount(){return DESIGN.length;},
    get states(){return Object.fromEntries(agents.map(a=>[a.name,a.status]));},
    get identityMap(){return {...BACKEND_FOR_DESIGN};},
    get truthSummary(){return {...truthSummary};}
  };
})();