/* AKIRA OFFICE — Canonical Living V3.1
 * Visual scene: authored clean V3 artwork.
 * Agents: authored V3 sprite atlas (48px cells, 7 states x 3 frames).
 * Navigation: canonical 32x24 coordinate graph + screen calibration.
 * Backend: read-only truth source for technical agent states.
 *
 * No 3D. No procedural furniture. No fake agent sprites.
 */
(function(){
  "use strict";

  const SCENE_SRC="./assets/office/01_office_scene_clean_v3.png";
  const ATLAS_SRC="./assets/office/02_office_agents_atlas_v3_clean3.png";
  const CONFIG_SRC="./assets/office/office_runtime_v3.json";
  const BACKEND_FALLBACK="https://akira-empresa.onrender.com";
  const POLL_MS=8000;
  const CELL=48;
  const FRAMES_PER_STATE=3;
  const STATE_ORDER=["idle","walk","work","talk","think","use","reaction"];

  let stage,canvas,ctx,scene,atlas,config;
  let initialized=false,raf=0,last=0,paused=false;
  let pollTimer=0;
  let selectedName="";
  let agents=[];
  let tasks=[];
  let truth={loaded:false,total:0,working:0,idle:0,error:0,disabled:0};
  let eventText="Cargando Oficina V3…";

  const el=id=>document.getElementById(id);

  function authHeaders(){
    try{
      return typeof window.akiraAuthHeaders==="function" ? window.akiraAuthHeaders() : {};
    }catch(_){return {};}
  }

  function backendUrl(){
    try{
      return localStorage.getItem("akira_backend_url")||BACKEND_FALLBACK;
    }catch(_){return BACKEND_FALLBACK;}
  }

  function say(msg){
    eventText=String(msg||"");
    const ev=el("officePixelEvent");
    if(ev)ev.textContent=eventText;
  }

  function loadJson(url){
    return fetch(url,{cache:"no-store"}).then(r=>{
      if(!r.ok)throw new Error("HTTP "+r.status+" "+url);
      return r.json();
    });
  }

  function loadImage(src){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(new Error("No se pudo cargar "+src));
      img.src=src+"?v=office-v3-live";
    });
  }

  function buildGraph(edges){
    const g={};
    for(const [a,b] of edges||[]){
      (g[a]||(g[a]=[])).push(b);
      (g[b]||(g[b]=[])).push(a);
    }
    return g;
  }

  function shortestPath(graph,start,end){
    if(start===end)return[start];
    const queue=[start],prev=new Map([[start,null]]);
    while(queue.length){
      const cur=queue.shift();
      for(const next of graph[cur]||[]){
        if(prev.has(next))continue;
        prev.set(next,cur);
        if(next===end){
          const out=[];
          let p=end;
          while(p!==null){out.unshift(p);p=prev.get(p);}
          return out;
        }
        queue.push(next);
      }
    }
    return [start];
  }

  function nearestWaypoint(agent){
    let best="",bestD=Infinity;
    for(const [id,node] of Object.entries(config.waypoints)){
      const d=Math.hypot(node.world[0]-agent.world[0],node.world[1]-agent.world[1]);
      if(d<bestD){bestD=d;best=id;}
    }
    return best;
  }

  function screenPointForAgent(agent){
    const wp=config.waypoints[agent.currentWaypoint];
    if(!wp)return agent.screen;
    return wp.screen;
  }

  function createAgents(){
    agents=config.agents.map(c=>({
      ...c,
      homeWorld:[...c.anchor],
      world:[...c.anchor],
      screen:[...c.screen],
      currentWaypoint:nearestWaypoint({world:c.anchor,screen:c.screen}),
      route:[],
      routeIndex:0,
      state:c.status==="disabled"?"idle":"idle",
      actionState:null,
      actionPhase:"home",
      actionUntil:0,
      nextAmbient:performance.now()/1000 + 3 + Math.random()*6,
      frame:0,
      frameClock:0
    }));
  }

  function backendStateFor(a){
    const s=String(a&&a.status||"").toLowerCase();
    if(s==="disabled")return"disabled";
    if(["error","failed","failure"].includes(s))return"error";
    const n=String(a&&a.name||"").toLowerCase();
    if(["working","running","busy","executing","active"].includes(s))return"working";
    const active=tasks.some(t =>
      String(t&&t.agent_name||"").toLowerCase()===n &&
      ["pending","queued","running","working","executing","in_progress","started","active"].includes(String(t&&t.status||"").toLowerCase())
    );
    return active?"working":"idle";
  }

  async function pollTruth(){
    try{
      const backend=backendUrl();
      const [ar,tr]=await Promise.all([
        fetch(backend+"/api/v8/agents",{headers:authHeaders(),cache:"no-store"}),
        fetch(backend+"/api/v8/tasks?limit=100",{headers:authHeaders(),cache:"no-store"})
      ]);

      if(tr.ok){
        const td=await tr.json();
        tasks=Array.isArray(td&&td.tasks)?td.tasks:[];
      }

      if(ar.ok){
        const ad=await ar.json();
        const real=Array.isArray(ad&&ad.agents)?ad.agents:[];
        const byName=new Map(real.map(a=>[String(a.name||"").toLowerCase(),a]));
        for(const a of agents){
          const live=byName.get(String(a.backend||"").toLowerCase());
          a.backendState=live?backendStateFor(live):"unknown";
          if(a.actionPhase==="home"||!a.actionPhase){
            if(a.backendState==="working")a.state="work";
            else if(a.backendState==="error")a.state="reaction";
            else if(a.backendState==="disabled")a.state="idle";
            else a.state="idle";
          }
        }
        truth.loaded=true;
        truth.total=real.length;
        truth.working=real.filter(a=>backendStateFor(a)==="working").length;
        truth.error=real.filter(a=>backendStateFor(a)==="error").length;
        truth.disabled=real.filter(a=>backendStateFor(a)==="disabled").length;
        truth.idle=truth.total-truth.working-truth.error-truth.disabled;
      }
      renderSidePanel();
      renderHud();
    }catch(_){
      renderHud();
    }
  }

  function renderHud(){
    const hud=el("officePixelHud");
    if(!hud)return;
    if(truth.loaded){
      hud.innerHTML="<strong>AKIRA PROJECT</strong><br>"+
        truth.total+" registrados · "+truth.working+" trabajando · "+truth.idle+" disponibles";
    }else{
      hud.innerHTML="<strong>AKIRA PROJECT · V3</strong><br>Backend pendiente";
    }
    const ev=el("officePixelEvent");
    if(ev)ev.textContent=eventText;
  }

  function renderSidePanel(){
    const total=el("officeTotal");
    const working=el("officeWorking");
    const idle=el("officeIdle");
    const errors=el("officeErrors");
    const sync=el("officeSync");
    const list=el("officeAgentList");

    if(total)total.textContent=truth.loaded?String(truth.total):"—";
    if(working)working.textContent=truth.loaded?String(truth.working):"—";
    if(idle)idle.textContent=truth.loaded?String(truth.idle):"—";
    if(errors)errors.textContent=truth.loaded?String(truth.error):"—";
    if(sync)sync.textContent=truth.loaded?new Date().toLocaleTimeString():"—";

    if(!list)return;
    list.innerHTML=agents.map(a=>{
      const status=a.backendState==="working"?"Trabajando":
        a.backendState==="error"?"Error":
        a.status==="disabled"?"Desactivado":
        a.backendState==="idle"?"Disponible":"Sin confirmar";
      return '<button type="button" class="office-agent-row" data-office-agent="'+a.name+'">'+
        '<span class="office-agent-dot '+(a.backendState||"idle")+'"></span>'+
        '<span>'+a.name+'</span><small>'+status+'</small></button>';
    }).join("");

    list.querySelectorAll("[data-office-agent]").forEach(b=>{
      b.addEventListener("click",()=>{
        selectedName=b.dataset.officeAgent||"";
        const a=agents.find(x=>x.name===selectedName);
        if(a){
          say(a.name+" · "+a.role+" · "+(a.backendState==="working"?"trabajando":"disponible"));
          const detail=el("officeAgentDetail");
          if(detail)detail.innerHTML="<strong>"+a.name+"</strong><br>"+a.role+
            "<br>Coordenada: ("+a.homeWorld[0]+", "+a.homeWorld[1]+")";
        }
      });
    });
  }

  function setRoute(agent,targetWaypoint,state,afterMs=0){
    if(!agent||agent.status==="disabled")return false;
    const from=nearestWaypoint(agent);
    const path=shortestPath(graph,from,targetWaypoint);
    if(path.length<1)return false;
    agent.route=path;
    agent.routeIndex=0;
    agent.actionState=state;
    agent.actionPhase="travelling";
    agent.actionUntil=0;
    agent.state="walk";
    agent.frame=0;
    agent.frameClock=0;
    agent.afterMs=afterMs;
    return true;
  }

  function finishRoute(agent){
    agent.route=[];
    agent.routeIndex=0;
    agent.actionPhase="arrived";
    agent.actionUntil=performance.now()/1000 + ((agent.afterMs||0)/1000);
    agent.state=agent.actionState||"idle";
  }

  function returnHome(agent){
    const home=agent.configHomeWaypoint;
    if(!home)return;
    const path=shortestPath(graph,nearestWaypoint(agent),home);
    agent.route=path;
    agent.routeIndex=0;
    agent.actionState="idle";
    agent.actionPhase="returning";
    agent.state="walk";
  }

  function executeCommand(kind){
    const live=agents.filter(a=>a.status==="active");
    if(kind==="mission"){
      const a=agents.find(x=>x.name==="Akira");
      if(a){
        a.configHomeWaypoint=nearestWaypoint({world:a.homeWorld});
        setRoute(a,"P07_TABLERO","use",7000);
        say("Akira → Tablero de Misiones.");
      }
      return;
    }
    if(kind==="coffee"){
      live.slice(0,3).forEach(a=>{
        a.configHomeWaypoint=nearestWaypoint({world:a.homeWorld});
        setRoute(a,"P08_CAFE","use",5000);
      });
      say("Pausa de café · rutas visuales activadas.");
      return;
    }
    if(kind==="meeting"){
      live.forEach(a=>{
        a.configHomeWaypoint=nearestWaypoint({world:a.homeWorld});
        setRoute(a,"P10_REUNIONES","talk",6000);
      });
      say("Reunión de equipo · 8 agentes en ruta.");
      return;
    }
    if(kind==="print"){
      const a=agents.find(x=>x.name==="Nexo")||live[0];
      if(a){
        a.configHomeWaypoint=nearestWaypoint({world:a.homeWorld});
        setRoute(a,"P09_IMPRESORA","use",4500);
        say(a.name+" → Impresora.");
      }
    }
  }

  function updateAgent(a,dt,now){
    if(a.status==="disabled"){
      a.state="idle";
      a.frameClock+=dt;
      a.frame=(Math.floor(a.frameClock/0.45))%FRAMES_PER_STATE;
      return;
    }

    if(a.actionPhase==="travelling"||a.actionPhase==="returning"){
      const targetId=a.route[a.routeIndex];
      const target=config.waypoints[targetId];
      if(!target){finishRoute(a);return;}
      const dx=target.world[0]-a.world[0],dy=target.world[1]-a.world[1];
      const dist=Math.hypot(dx,dy);
      const speed=dt*3.0;
      a.state="walk";
      a.frameClock+=dt;
      a.frame=(Math.floor(a.frameClock/0.14))%FRAMES_PER_STATE;
      if(dist<0.045){
        a.world=[...target.world];
        a.screen=[...target.screen];
        a.currentWaypoint=targetId;
        if(a.routeIndex<a.route.length-1){
          a.routeIndex++;
        }else if(a.actionPhase==="returning"){
          a.actionPhase="home";
          a.actionState=null;
          a.state=a.backendState==="working"?"work":"idle";
          a.nextAmbient=now+4+Math.random()*7;
        }else{
          finishRoute(a);
        }
        return;
      }
      const k=Math.min(1,speed/Math.max(.001,dist));
      a.world[0]+=dx*k;a.world[1]+=dy*k;
      a.screen[0]+=((target.screen[0]-a.screen[0])*k);
      a.screen[1]+=((target.screen[1]-a.screen[1])*k);
      return;
    }

    if(a.actionPhase==="arrived"){
      if(now<a.actionUntil){
        a.frameClock+=dt;
        a.frame=(Math.floor(a.frameClock/0.32))%FRAMES_PER_STATE;
        return;
      }
      returnHome(a);
      return;
    }

    a.state=a.backendState==="working"?"work":"idle";
    if(a.backendState==="error")a.state="reaction";
    a.frameClock+=dt;
    a.frame=(Math.floor(a.frameClock/0.32))%FRAMES_PER_STATE;

    if(a.backendState==="idle" && now>=a.nextAmbient){
      const node=a.currentWaypoint;
      const options=(graph[node]||[]).filter(id=>id!=="P18_DANTE_WAIT");
      if(options.length){
        const target=options[Math.floor(Math.random()*options.length)];
        a.configHomeWaypoint=nearestWaypoint({world:a.homeWorld});
        a.route=[target,a.configHomeWaypoint];
        a.routeIndex=0;
        a.actionState="idle";
        a.actionPhase="travelling";
        a.state="walk";
        a.frameClock=0;
      }
      a.nextAmbient=now+8+Math.random()*8;
    }
  }

  function drawSprite(a){
    const row=config.agents.findIndex(c=>c.name===a.name);
    if(row<0||!atlas)return;
    let state=a.state||"idle";
    if(a.status==="disabled")state="idle";
    const si=Math.max(0,STATE_ORDER.indexOf(state));
    const fi=Math.max(0,Math.min(FRAMES_PER_STATE-1,a.frame||0));
    const col=si*FRAMES_PER_STATE+fi;
    const sx=col*CELL, sy=row*CELL;
    const p=a.screen;
    const scale=1.33;
    const dw=CELL*scale, dh=CELL*scale;
    ctx.save();
    ctx.globalAlpha=a.status==="disabled"?0.88:1;
    ctx.imageSmoothingEnabled=false;
    ctx.fillStyle="rgba(0,0,0,.28)";
    ctx.beginPath();
    ctx.ellipse(Math.round(p[0]),Math.round(p[1]+21),18,6,0,0,Math.PI*2);
    ctx.fill();
    ctx.drawImage(atlas,sx,sy,CELL,CELL,
      Math.round(p[0]-dw/2),Math.round(p[1]-dh+10),dw,dh);

    if(selectedName===a.name){
      ctx.strokeStyle="#ffd166";
      ctx.lineWidth=2;
      ctx.strokeRect(Math.round(p[0]-22),Math.round(p[1]-61),44,52);
      ctx.font="bold 14px monospace";
      const label=a.name;
      const w=ctx.measureText(label).width+12;
      ctx.fillStyle="rgba(4,8,16,.9)";
      ctx.fillRect(Math.round(p[0]-w/2),Math.round(p[1]-82),Math.round(w),18);
      ctx.fillStyle="#fff";
      ctx.fillText(label,Math.round(p[0]-w/2+6),Math.round(p[1]-69));
    }
    ctx.restore();
  }

  function drawRoute(a){
    if(!a.route||a.route.length<2)return;
    ctx.save();
    ctx.strokeStyle="rgba(99,230,190,.36)";
    ctx.lineWidth=3;
    ctx.setLineDash([8,8]);
    ctx.beginPath();
    ctx.moveTo(a.screen[0],a.screen[1]);
    for(let i=a.routeIndex;i<a.route.length;i++){
      const p=config.waypoints[a.route[i]].screen;
      ctx.lineTo(p[0],p[1]);
    }
    ctx.stroke();
    ctx.restore();
  }

  function draw(){
    if(!ctx)return;
    ctx.clearRect(0,0,1536,1024);
    if(scene)ctx.drawImage(scene,0,0,1536,1024);
    const ordered=[...agents].sort((a,b)=>a.screen[1]-b.screen[1]);
    ordered.forEach(drawRoute);
    ordered.forEach(drawSprite);
  }

  function resize(){
    if(!stage||!canvas)return;
    const r=stage.getBoundingClientRect();
    if(r.width<2||r.height<2)return;
    canvas.width=1536;canvas.height=1024;
    canvas.style.width=r.width+"px";
    canvas.style.height=r.height+"px";
    if(ctx)ctx.imageSmoothingEnabled=false;
  }

  function hitTest(ev){
    const r=canvas.getBoundingClientRect();
    const x=(ev.clientX-r.left)/r.width*1536;
    const y=(ev.clientY-r.top)/r.height*1024;
    let best=null,bestD=999;
    for(const a of agents){
      const d=Math.hypot(a.screen[0]-x,a.screen[1]-y);
      if(d<45&&d<bestD){best=a;bestD=d;}
    }
    selectedName=best?best.name:"";
    if(best){
      say(best.name+" · "+best.role+" · coordenada ("+best.homeWorld[0]+", "+best.homeWorld[1]+")");
      const detail=el("officeAgentDetail");
      if(detail)detail.innerHTML="<strong>"+best.name+"</strong><br>"+best.role+
        "<br>Coordenada actual: ("+best.world[0].toFixed(1)+", "+best.world[1].toFixed(1)+")";
    }
  }

  function loop(ts){
    if(!initialized)return;
    const dt=Math.min(.05,(ts-last)/1000||0);
    const now=ts/1000;
    if(!paused)agents.forEach(a=>updateAgent(a,dt,now));
    draw();
    last=ts;
    raf=requestAnimationFrame(loop);
  }

  async function init(){
    if(initialized){resize();return;}
    stage=el("officePixelStage");canvas=el("officePixelCanvas");
    if(!stage||!canvas)return;
    ctx=canvas.getContext("2d");
    if(!ctx)return;

    [config,scene,atlas]=await Promise.all([
      loadJson(CONFIG_SRC),
      loadImage(SCENE_SRC),
      loadImage(ATLAS_SRC)
    ]);

    graph=buildGraph(config.movement_edges);
    createAgents();
    initialized=true;
    resize();
    renderSidePanel();
    await pollTruth();
    renderSidePanel();
    say("Oficina V3 cargada · escena limpia + sprites reales.");
    resize();
    last=performance.now();
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(loop);
    clearInterval(pollTimer);
    pollTimer=setInterval(pollTruth,POLL_MS);
  }

  let graph={};

  window.initAkiraOfficePixel=init;
  window.resizeAkiraOfficePixel=resize;
  window.setAkiraOfficePixelPaused=v=>{paused=Boolean(v);say(paused?"Animación pausada.":"Animación reanudada.");};
  window.refreshAkiraOfficePixel=async()=>{
    await pollTruth();
    draw();
  };
  window.akiraOfficePixelCommand=executeCommand;
  window.akiraOfficePixelDebug={
    get initialized(){return initialized;},
    get sceneSource(){return SCENE_SRC;},
    get atlasSource(){return ATLAS_SRC;},
    get grid(){return config&&config.grid;},
    get agents(){return agents.map(a=>({name:a.name,world:[...a.world],state:a.state,backendState:a.backendState||"unknown"}));},
    get graph(){return graph;},
    get truth(){return {...truth};}
  };

  document.addEventListener("DOMContentLoaded",()=>{
    [["officePixelMission","mission"],["officePixelCoffee","coffee"],["officePixelMeeting","meeting"],["officePixelPrint","print"]]
      .forEach(([id,kind])=>{
        const b=el(id);
        if(b)b.addEventListener("click",()=>executeCommand(kind));
      });
    if(canvas)canvas.addEventListener("click",hitTest);
    init();
  });
})();