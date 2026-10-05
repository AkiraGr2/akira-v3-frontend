/* AKIRA OFFICE — Living V3.2
 * Clean V3 scene + clean4 high-resolution sprite atlas.
 * 9 agents, role-aware ambient behavior, collision-guarded navigation.
 * No 3D, no procedural furniture, no fake sprites.
 */
(function(){
  "use strict";

  const CONFIG_SRC="./assets/office/office_runtime_v3.json";
  const SCENE_SRC="./assets/office/01_office_scene_clean_v3.png";
  const ATLAS_SRC="./assets/office/02_office_agents_atlas_v3_clean4.png";
  const BACKEND_FALLBACK="https://akira-empresa.onrender.com";
  const FRAME_X=[62.6,144.4,221.8,308.2,380.2,447.9,533.5,616.9,695.6,770.1,846.4,923.3,1000.1,1078.1,1152.7,1231.5,1312.5,1389.9,1467.5];
  const FRAME_Y=[71.3,178.9,285.3,402.9,510.6,627.5,735.7,844.3,952.7];
  const STATES=[
    {name:"idle",count:3,start:0},
    {name:"walk",count:3,start:3},
    {name:"work",count:3,start:6},
    {name:"talk",count:3,start:9},
    {name:"think",count:2,start:12},
    {name:"use",count:3,start:14},
    {name:"reaction",count:2,start:17}
  ];
  const STATE_BY_NAME=Object.fromEntries(STATES.map(x=>[x.name,x]));

  let stage=null,canvas=null,ctx=null,scene=null,atlas=null,config=null;
  let initialized=false,raf=0,last=0,paused=false,pollTimer=0;
  let graph={},invalidEdges=[];
  let agents=[],tasks=[];
  let truth={loaded:false,total:0,working:0,idle:0,error:0,disabled:0};
  let selectedName="";
  let eventText="Cargando Oficina V3…";

  const el=id=>document.getElementById(id);
  const key=(x,y)=>x+","+y;

  function authHeaders(){
    try{return typeof window.akiraAuthHeaders==="function"?window.akiraAuthHeaders():{};}
    catch(_){return{};}
  }
  function backendUrl(){
    try{return localStorage.getItem("akira_backend_url")||BACKEND_FALLBACK;}
    catch(_){return BACKEND_FALLBACK;}
  }
  function say(msg){
    eventText=String(msg||"");
    const e=el("officePixelEvent");
    if(e)e.textContent=eventText;
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
      img.src=src+"?v=office-v3-runtime";
    });
  }

  function pointInsideBlock(p,b){
    return p[0]>=b.x && p[0]<=b.x+b.w && p[1]>=b.y && p[1]<=b.y+b.h;
  }

  function segmentTouchesBlock(a,b,block){
    const steps=Math.max(12,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*10));
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      const p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
      if(pointInsideBlock(p,block))return true;
    }
    return false;
  }

  function edgeAllowed(a,b){
    const A=config.waypoints[a]?.world,B=config.waypoints[b]?.world;
    if(!A||!B)return false;
    return !(config.collision_blocks||[]).some(block=>segmentTouchesBlock(A,B,block));
  }

  function buildGraph(){
    graph={};invalidEdges=[];
    for(const [a,b] of config.movement_edges||[]){
      if(!edgeAllowed(a,b)){
        invalidEdges.push([a,b]);
        continue;
      }
      (graph[a]||(graph[a]=[])).push(b);
      (graph[b]||(graph[b]=[])).push(a);
    }
  }

  function shortestPath(start,end){
    if(start===end)return[start];
    const q=[start],prev=new Map([[start,null]]);
    while(q.length){
      const cur=q.shift();
      for(const next of graph[cur]||[]){
        if(prev.has(next))continue;
        prev.set(next,cur);
        if(next===end){
          const out=[];let p=end;
          while(p!==null){out.unshift(p);p=prev.get(p);}
          return out;
        }
        q.push(next);
      }
    }
    return[];
  }

  function homeVisual(name){
    return config.homes[name]||null;
  }
  function nodeScreen(id){
    return config.waypoints[id]?.screen||[0,0];
  }
  function nodeWorld(id){
    return config.waypoints[id]?.world||[0,0];
  }

  function makeAgents(){
    agents=config.agents.map(c=>{
      const home=config.homes[c.name]||{visual:[0,0],nav:"P05_CENTRO_NORTE"};
      const nav=home.nav;
      return {
        ...c,
        homeVisual:[...home.visual],
        homeNav:nav,
        node:nav,
        world:[...nodeWorld(nav)],
        screen:[...home.visual],
        route:[],
        routeIndex:0,
        actionState:null,
        actionPhase:"home",
        actionUntil:0,
        afterMs:0,
        frame:0,
        frameClock:0,
        backendState:"unknown",
        nextAmbient:performance.now()/1000+5+Math.random()*7
      };
    });
  }

  function backendStateFor(a){
    const s=String(a&&a.status||"").toLowerCase();
    if(s==="disabled")return"disabled";
    if(["error","failed","failure"].includes(s))return"error";
    if(["working","running","busy","executing","active"].includes(s))return"working";
    const n=String(a&&a.name||"").toLowerCase();
    return tasks.some(t=>
      String(t&&t.agent_name||"").toLowerCase()===n &&
      ["pending","queued","running","working","executing","in_progress","started","active"].includes(String(t&&t.status||"").toLowerCase())
    )?"working":"idle";
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
        agents.forEach(a=>{
          const live=byName.get(String(a.backend||"").toLowerCase());
          a.backendState=live?backendStateFor(live):"unknown";
          if(a.actionPhase==="home"){
            a.state=a.backendState==="working"?"work":a.backendState==="error"?"reaction":"idle";
          }
        });
        truth.loaded=true;
        truth.total=real.length;
        truth.working=real.filter(a=>backendStateFor(a)==="working").length;
        truth.error=real.filter(a=>backendStateFor(a)==="error").length;
        truth.disabled=real.filter(a=>backendStateFor(a)==="disabled").length;
        truth.idle=truth.total-truth.working-truth.error-truth.disabled;
      }
      renderSidePanel();
      renderHud();
    }catch(_){renderHud();}
  }

  function renderHud(){
    const hud=el("officePixelHud");
    if(hud){
      hud.innerHTML=truth.loaded
        ? "<strong>AKIRA PROJECT</strong><br>"+truth.total+" registrados · "+truth.working+" trabajando · "+truth.idle+" disponibles"
        : "<strong>AKIRA PROJECT · V3</strong><br>Estado backend pendiente";
    }
    const ev=el("officePixelEvent");
    if(ev)ev.textContent=eventText;
  }

  function renderSidePanel(){
    const total=el("officeTotal"),working=el("officeWorking"),idle=el("officeIdle"),errors=el("officeErrors"),sync=el("officeSync"),list=el("officeAgentList");
    if(total)total.textContent=truth.loaded?String(truth.total):"—";
    if(working)working.textContent=truth.loaded?String(truth.working):"—";
    if(idle)idle.textContent=truth.loaded?String(truth.idle):"—";
    if(errors)errors.textContent=truth.loaded?String(truth.error):"—";
    if(sync)sync.textContent=truth.loaded?new Date().toLocaleTimeString():"—";
    if(!list)return;
    list.innerHTML=agents.map(a=>{
      const status=a.backendState==="working"?"Trabajando":a.backendState==="error"?"Error":a.status==="disabled"?"Desactivado":a.backendState==="idle"?"Disponible":"Sin confirmar";
      return '<button type="button" class="office-agent-row" data-office-agent="'+a.name+'">'+
        '<span class="office-agent-dot '+(a.backendState||"idle")+'"></span>'+
        '<span>'+a.name+'</span><small>'+status+'</small></button>';
    }).join("");
    list.querySelectorAll("[data-office-agent]").forEach(b=>{
      b.addEventListener("click",()=>{
        selectedName=b.dataset.officeAgent||"";
        const a=agents.find(x=>x.name===selectedName);
        if(a){
          say(a.name+" · "+a.role+" · ("+a.world[0].toFixed(1)+", "+a.world[1].toFixed(1)+")");
          const detail=el("officeAgentDetail");
          if(detail)detail.innerHTML="<strong>"+a.name+"</strong><br>"+a.role+"<br>Coordenada actual: ("+a.world[0].toFixed(1)+", "+a.world[1].toFixed(1)+")";
        }
      });
    });
  }

  function pathTo(agent,targetId){
    const path=shortestPath(agent.node,targetId);
    if(!path.length)return null;
    return path;
  }

  function startRoute(agent,targetId,state,duration){
    if(!agent||agent.status!=="active")return false;
    const path=pathTo(agent,targetId);
    if(!path)return false;

    // First visual leg: leave the workstation/seat and arrive at the approved walk tile.
    const route=[];
    const exitId=agent.homeNav;
    if(agent.actionPhase==="home" && exitId){
      route.push({id:exitId,screen:nodeScreen(exitId),world:nodeWorld(exitId),kind:"exit"});
    }
    path.slice(1).forEach(id=>route.push({id,screen:nodeScreen(id),world:nodeWorld(id),kind:"walk"}));

    agent.route=route;
    agent.routeIndex=0;
    agent.actionState=state||"idle";
    agent.actionPhase="travelling";
    agent.actionUntil=0;
    agent.afterMs=duration||0;
    agent.frame=0;
    agent.frameClock=0;
    return true;
  }

  function beginHomeReturn(agent){
    const path=shortestPath(agent.node,agent.homeNav);
    if(!path.length)return false;
    agent.route=path.map(id=>({id,screen:nodeScreen(id),world:nodeWorld(id),kind:"return"}));
    agent.routeIndex=0;
    agent.actionState="idle";
    agent.actionPhase="returning";
    agent.frame=0;
    agent.frameClock=0;
    return true;
  }

  function finishAtHome(agent){
    agent.node=agent.homeNav;
    agent.world=[...nodeWorld(agent.homeNav)];
    agent.screen=[...agent.homeVisual];
    agent.route=[];
    agent.routeIndex=0;
    agent.actionPhase="home";
    agent.actionState=null;
    agent.state=agent.backendState==="working"?"work":agent.backendState==="error"?"reaction":"idle";
    agent.nextAmbient=performance.now()/1000+8+Math.random()*10;
  }

  function finishAction(agent,now){
    agent.route=[];
    agent.routeIndex=0;
    agent.actionPhase="arrived";
    agent.actionUntil=now+(agent.afterMs||0)/1000;
    agent.state=agent.actionState||"idle";
  }

  function actionForTarget(id){
    if(id==="P07_TABLERO_STAND")return"use";
    if(id==="P08_CAFE_STAND")return"use";
    if(id==="P09_IMPRESORA_STAND")return"use";
    if(id.startsWith("M"))return"talk";
    return"idle";
  }

  function executeCommand(kind){
    const live=agents.filter(a=>a.status==="active");
    if(kind==="mission"){
      const a=agents.find(x=>x.name==="Akira");
      if(a&&startRoute(a,config.interactions.mission, "use",6500))say("Akira → Tablero de Misiones.");
      return;
    }
    if(kind==="coffee"){
      const picks=live.slice(0,3);
      picks.forEach(a=>startRoute(a,config.interactions.coffee,"use",4500));
      say("Pausa de café · rutas seguras activadas.");
      return;
    }
    if(kind==="print"){
      const a=agents.find(x=>x.name==="Nexo")||live[0];
      if(a&&startRoute(a,config.interactions.print,"use",4500))say(a.name+" → Impresora.");
      return;
    }
    if(kind==="meeting"){
      const slots=config.interactions.meeting||[];
      live.forEach((a,i)=>{
        if(slots[i])startRoute(a,slots[i],"talk",5500);
      });
      say("Reunión de equipo · posiciones alrededor de la mesa.");
    }
  }

  function updateAgent(a,dt,now){
    if(a.status==="disabled"){
      a.state="idle";
      a.frameClock+=dt;
      a.frame=(Math.floor(a.frameClock/0.45))%3;
      return;
    }

    if(a.actionPhase==="travelling"||a.actionPhase==="returning"){
      const target=a.route[a.routeIndex];
      if(!target){finishAtHome(a);return;}
      const tx=target.world[0],ty=target.world[1];
      const dx=tx-a.world[0],dy=ty-a.world[1];
      const dist=Math.hypot(dx,dy);
      const step=Math.min(dist,dt*3.1);

      a.state="walk";
      a.frameClock+=dt;
      a.frame=Math.floor(a.frameClock/0.14)%3;

      if(dist<0.045){
        a.world=[tx,ty];
        a.node=target.id;
        a.screen=[...target.screen];
        if(a.routeIndex<a.route.length-1){
          a.routeIndex++;
        }else if(a.actionPhase==="returning"){
          finishAtHome(a);
        }else{
          finishAction(a,now);
        }
        return;
      }

      const k=step/Math.max(.0001,dist);
      a.world[0]+=dx*k;
      a.world[1]+=dy*k;
      a.screen[0]+=(target.screen[0]-a.screen[0])*k;
      a.screen[1]+=(target.screen[1]-a.screen[1])*k;
      return;
    }

    if(a.actionPhase==="arrived"){
      if(now<a.actionUntil){
        const st=STATE_BY_NAME[a.actionState]||STATE_BY_NAME.idle;
        a.frameClock+=dt;
        a.frame=Math.floor(a.frameClock/0.30)%st.count;
        return;
      }
      beginHomeReturn(a);
      return;
    }

    a.state=a.backendState==="working"?"work":a.backendState==="error"?"reaction":"idle";
    const st=STATE_BY_NAME[a.state]||STATE_BY_NAME.idle;
    a.frameClock+=dt;
    a.frame=Math.floor(a.frameClock/0.32)%st.count;

    if(a.backendState==="idle" && now>=a.nextAmbient && Array.isArray(a.ambient)&&a.ambient.length){
      const candidates=a.ambient.filter(id=>id!==a.node && graph[id]);
      if(candidates.length){
        const target=candidates[Math.floor(Math.random()*candidates.length)];
        const action=actionForTarget(target);
        if(startRoute(a,target,action,action==="talk"?3500:3000)){
          say(a.name+" → "+target.replace(/^P\d+_/,"").replace(/_/g," ")+" · rutina de "+a.role+".");
          a.nextAmbient=now+14+Math.random()*12;
        }
      }else{
        a.nextAmbient=now+5;
      }
    }
  }

  function frameRect(row,col){
    const xCenters=FRAME_X;
    const yCenters=FRAME_Y;
    const x0=col===0?0:Math.round((xCenters[col-1]+xCenters[col])/2);
    const x1=col===xCenters.length-1?1536:Math.round((xCenters[col]+xCenters[col+1])/2);
    const y0=row===0?0:Math.round((yCenters[row-1]+yCenters[row])/2);
    const y1=row===yCenters.length-1?1024:Math.round((yCenters[row]+yCenters[row+1])/2);
    return [x0,y0,x1-x0,y1-y0];
  }

  function spriteFrame(a){
    const row=config.atlas.row_order.indexOf(a.name);
    if(row<0)return null;
    const state=STATE_BY_NAME[a.state]||STATE_BY_NAME.idle;
    const fi=Math.max(0,Math.min(state.count-1,a.frame||0));
    return frameRect(row,state.start+fi);
  }

  function drawSprite(a){
    const src=spriteFrame(a);
    if(!src||!atlas)return;
    const p=a.screen;
    const scale=.82;
    const dw=src[2]*scale,dh=src[3]*scale;
    const left=Math.round(p[0]-dw/2);
    const top=Math.round(p[1]-dh+6);

    ctx.save();
    ctx.imageSmoothingEnabled=false;
    ctx.globalAlpha=a.status==="disabled"?.86:1;
    ctx.drawImage(atlas,src[0],src[1],src[2],src[3],left,top,dw,dh);

    if(selectedName===a.name){
      ctx.strokeStyle="#ffd166";
      ctx.lineWidth=2;
      ctx.strokeRect(Math.round(p[0]-dw/2-3),Math.round(top-3),Math.round(dw+6),Math.round(dh+6));
    }
    ctx.restore();
  }

  function drawRoutes(){
    agents.forEach(a=>{
      if(!a.route.length)return;
      ctx.save();
      ctx.strokeStyle="rgba(99,230,190,.30)";
      ctx.lineWidth=3;
      ctx.setLineDash([7,7]);
      ctx.beginPath();
      ctx.moveTo(a.screen[0],a.screen[1]);
      for(let i=a.routeIndex;i<a.route.length;i++){
        const p=a.route[i].screen;
        ctx.lineTo(p[0],p[1]);
      }
      ctx.stroke();
      ctx.restore();
    });
  }

  function draw(){
    if(!ctx)return;
    ctx.clearRect(0,0,1536,1024);
    if(scene)ctx.drawImage(scene,0,0,1536,1024);
    drawRoutes();
    [...agents].sort((a,b)=>a.screen[1]-b.screen[1]).forEach(drawSprite);
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
    let hit=null,best=Infinity;
    for(const a of agents){
      const d=Math.hypot(a.screen[0]-x,a.screen[1]-y);
      if(d<70&&d<best){best=d;hit=a;}
    }
    selectedName=hit?hit.name:"";
    if(hit)say(hit.name+" · "+hit.role+" · ("+hit.world[0].toFixed(1)+", "+hit.world[1].toFixed(1)+")");
  }

  function render(){
    renderHud();
    renderSidePanel();
    draw();
  }

  async function init(){
    if(initialized){resize();return;}
    stage=el("officePixelStage");
    canvas=el("officePixelCanvas");
    if(!stage||!canvas)return;
    ctx=canvas.getContext("2d");
    if(!ctx)return;

    try{
      [config,scene,atlas]=await Promise.all([
        loadJson(CONFIG_SRC),
        loadImage(SCENE_SRC),
        loadImage(ATLAS_SRC)
      ]);
      buildGraph();
      makeAgents();
      initialized=true;
      resize();
      await pollTruth();
      render();
      say("Oficina V3 · escena limpia + atlas clean4 + navegación segura.");
      last=performance.now();
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(loop);
      clearInterval(pollTimer);
      pollTimer=setInterval(pollTruth,8000);
    }catch(err){
      eventText="Error cargando Oficina V3: "+err.message;
      render();
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

  window.initAkiraOfficePixel=init;
  window.resizeAkiraOfficePixel=resize;
  window.setAkiraOfficePixelPaused=v=>{
    paused=Boolean(v);
    say(paused?"Animación pausada.":"Animación reanudada.");
  };
  window.refreshAkiraOfficePixel=async()=>{
    await pollTruth();
    draw();
  };
  window.akiraOfficePixelCommand=executeCommand;
  window.akiraOfficePixelDebug={
    get initialized(){return initialized;},
    get sceneSource(){return SCENE_SRC;},
    get atlasSource(){return ATLAS_SRC;},
    get atlasLayout(){return {rows:9,framesPerRow:19,states:STATES.map(x=>({...x}))};},
    get agents(){return agents.map(a=>({name:a.name,node:a.node,world:[...a.world],screen:[...a.screen],state:a.state,backendState:a.backendState,phase:a.actionPhase}));},
    get invalidEdges(){return invalidEdges.map(x=>x.slice());},
    get graph(){return Object.fromEntries(Object.entries(graph).map(([k,v])=>[k,[...v]]));},
    get truth(){return {...truth};}
  };

  document.addEventListener("DOMContentLoaded",()=>{
    [["officePixelMission","mission"],["officePixelCoffee","coffee"],["officePixelMeeting","meeting"],["officePixelPrint","print"]]
      .forEach(([id,kind])=>{
        const b=el(id);
        if(b)b.addEventListener("click",()=>executeCommand(kind));
      });
    canvas && canvas.addEventListener("click",hitTest);
    init();
  });
})();