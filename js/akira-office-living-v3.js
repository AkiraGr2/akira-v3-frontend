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

  const WALK_PX_PER_SEC=74;
  const WALK_FRAME_MS=0.24;
  const PATH_CELL=24;
  const AGENT_CLEARANCE=26;
  const WALK_BOUNDS={x:70,y:270,w:1390,h:650};

  function pointInsideBlock(p,b,pad=0){
    return p[0]>=b.x-pad && p[0]<b.x+b.w+pad &&
           p[1]>=b.y-pad && p[1]<b.y+b.h+pad;
  }

  function blockedScreen(p){
    return (config.screen_collision_blocks||[]).some(b=>pointInsideBlock(p,b,AGENT_CLEARANCE));
  }

  function screenGridKey(gx,gy){ return gx+","+gy; }

  function screenToGrid(p){
    return [
      Math.round((p[0]-(WALK_BOUNDS.x+PATH_CELL/2))/PATH_CELL),
      Math.round((p[1]-(WALK_BOUNDS.y+PATH_CELL/2))/PATH_CELL)
    ];
  }

  function gridToScreen(gx,gy){
    return [
      WALK_BOUNDS.x+PATH_CELL/2+gx*PATH_CELL,
      WALK_BOUNDS.y+PATH_CELL/2+gy*PATH_CELL
    ];
  }

  function gridInside(gx,gy){
    const p=gridToScreen(gx,gy);
    return p[0]>=WALK_BOUNDS.x && p[0]<=WALK_BOUNDS.x+WALK_BOUNDS.w &&
           p[1]>=WALK_BOUNDS.y && p[1]<=WALK_BOUNDS.y+WALK_BOUNDS.h;
  }

  function segmentClearScreen(a,b){
    const steps=Math.max(4,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/8));
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      const p=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
      if(blockedScreen(p))return false;
    }
    return true;
  }

  function screenPath(start,end){
    if(!start||!end)return null;
    if(segmentClearScreen(start,end))return[end];

    const s=screenToGrid(start),t=screenToGrid(end);
    const q=[s],came=new Map(),gScore=new Map([[screenGridKey(s[0],s[1]),0]]);
    const fScore=new Map([[screenGridKey(s[0],s[1]),Math.hypot(s[0]-t[0],s[1]-t[1])]]);
    const closed=new Set();
    came.set(screenGridKey(s[0],s[1]),null);

    const dirs=[
      [1,0,1],[-1,0,1],[0,1,1],[0,-1,1],
      [1,1,1.414],[-1,1,1.414],[1,-1,1.414],[-1,-1,1.414]
    ];

    while(q.length){
      let bi=0;
      for(let i=1;i<q.length;i++){
        if((fScore.get(screenGridKey(q[i][0],q[i][1]))??Infinity) <
           (fScore.get(screenGridKey(q[bi][0],q[bi][1]))??Infinity)) bi=i;
      }
      const cur=q.splice(bi,1)[0], ck=screenGridKey(cur[0],cur[1]);
      if(closed.has(ck))continue;
      closed.add(ck);

      if(Math.abs(cur[0]-t[0])<=1 && Math.abs(cur[1]-t[1])<=1){
        const out=[end];
        let k=ck;
        while(k!==screenGridKey(s[0],s[1])){
          const p=came.get(k);
          if(!p)break;
          const [gx,gy]=p;
          out.unshift(gridToScreen(gx,gy));
          k=screenGridKey(gx,gy);
        }
        // Remove unnecessary bends with line-of-sight smoothing.
        const smooth=[];
        let anchor=start;
        for(const p of out){
          if(segmentClearScreen(anchor,p)){
            continue;
          }
          const lastGood=out[Math.max(0,out.indexOf(p)-1)];
          if(lastGood && (!smooth.length || smooth[smooth.length-1][0]!==lastGood[0] || smooth[smooth.length-1][1]!==lastGood[1])){
            smooth.push(lastGood);
            anchor=lastGood;
          }
        }
        smooth.push(end);
        return smooth;
      }

      for(const [dx,dy,cost] of dirs){
        const nx=cur[0]+dx,ny=cur[1]+dy;
        if(!gridInside(nx,ny))continue;
        const np=gridToScreen(nx,ny), from=gridToScreen(cur[0],cur[1]);
        if(blockedScreen(np) || !segmentClearScreen(from,np))continue;
        const nk=screenGridKey(nx,ny);
        if(closed.has(nk))continue;
        const tentative=(gScore.get(ck)??Infinity)+cost;
        if(tentative<(gScore.get(nk)??Infinity)){
          came.set(nk,[cur[0],cur[1]]);
          gScore.set(nk,tentative);
          fScore.set(nk,tentative+Math.hypot(nx-t[0],ny-t[1]));
          q.push([nx,ny]);
        }
      }
    }
    return null;
  }

  function buildGraph(){
    // The legacy semantic graph remains in the manifest for auditability.
    // Runtime navigation now uses screen-space A* with collision clearance.
    graph={};invalidEdges=[];
    for(const [a,b] of config.movement_edges||[]){
      const A=config.waypoints[a]?.screen,B=config.waypoints[b]?.screen;
      if(!A||!B||!segmentClearScreen(A,B)){
        invalidEdges.push([a,b]);
        continue;
      }
      (graph[a]||(graph[a]=[])).push(b);
      (graph[b]||(graph[b]=[])).push(a);
    }
  }

  function shortestPath(start,end){
    // Semantic fallback/debug helper only.
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

  function nodeScreen(id){return config.waypoints[id]?.screen||[0,0];}
  function nodeWorld(id){return config.waypoints[id]?.world||[0,0];}

  function homeVisual(name){return config.homes[name]||null;}

  function makeAgents(){
    agents=config.agents.map(c=>{
      const home=config.homes[c.name]||{visual:[0,0],nav:"P05_CENTRO_NORTE"};
      return {
        ...c,
        homeVisual:[...home.visual],
        homeNav:home.nav,
        node:home.nav,
        world:[...nodeWorld(home.nav)],
        screen:[...home.visual],
        route:[],
        routeIndex:0,
        actionState:null,
        actionPhase:"home",
        actionUntil:0,
        afterMs:0,
        frame:0,
        frameClock:0,
        backendState:"unknown"
      };
    });
  }

  function pathTo(agent,targetId){
    return screenPath(agent.screen,nodeScreen(targetId));
  }

  function startRoute(agent,targetId,state,duration){
    if(!agent||agent.status!=="active")return false;
    const target=nodeScreen(targetId);
    let points=screenPath(agent.screen,target);
    if(agent.actionPhase==="home"){
      const exit=nodeScreen(agent.homeNav);
      const leave=[...exit];
      // Leaving a workstation is allowed through its own station footprint.
      if(Math.hypot(agent.screen[0]-exit[0],agent.screen[1]-exit[1])>2){
        points=[leave,...(screenPath(exit,target)||[])];
      }
    }
    if(!points||!points.length)return false;
    agent.route=points.map((p,i)=>({
      screen:[...p],
      world:i===points.length-1?[...nodeWorld(targetId)]:[...agent.world],
      id:i===points.length-1?targetId:null,
      kind:"walk"
    }));
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
    const exit=nodeScreen(agent.homeNav);
    const points=screenPath(agent.screen,exit);
    if(!points)return false;
    agent.route=points.map((p,i)=>({
      screen:[...p],
      world:i===points.length-1?[...nodeWorld(agent.homeNav)]:[...agent.world],
      id:i===points.length-1?agent.homeNav:null,
      kind:"return"
    }));
    agent.route.push({screen:[...agent.homeVisual],world:[...nodeWorld(agent.homeNav)],id:agent.homeNav,kind:"seat"});
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
  }

  function finishAction(agent,now){
    agent.route=[];
    agent.routeIndex=0;
    agent.actionPhase="arrived";
    agent.actionUntil=now+(agent.afterMs||0)/1000;
    agent.state=agent.actionState||"idle";
  }

  function actionForTarget(id){
    if(id==="P07_TABLERO_STAND"||id==="P08_CAFE_STAND"||id==="P09_IMPRESORA_STAND")return"use";
    if(id&&id.startsWith("M"))return"talk";
    return"idle";
  }

  function executeCommand(kind){
    const live=agents.filter(a=>a.status==="active");
    if(kind==="mission"){
      const a=agents.find(x=>x.name==="Akira");
      if(a&&startRoute(a,config.interactions.mission,"use",6500))say("Akira → Tablero de Misiones.");
      return;
    }
    if(kind==="coffee"){
      live.slice(0,3).forEach(a=>startRoute(a,config.interactions.coffee,"use",5000));
      say("Pausa de café · movimiento seguro.");
      return;
    }
    if(kind==="print"){
      const a=agents.find(x=>x.name==="Nexo")||live[0];
      if(a&&startRoute(a,config.interactions.print,"use",5000))say(a.name+" → Impresora.");
      return;
    }
    if(kind==="meeting"){
      const slots=config.interactions.meeting||[];
      live.forEach((a,i)=>{if(slots[i])startRoute(a,slots[i],"talk",6500);});
      say("Reunión de equipo · desplazamiento por pasillos.");
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
      if(!target){
        finishAtHome(a);
        return;
      }

      const tx=target.screen[0],ty=target.screen[1];
      const dx=tx-a.screen[0],dy=ty-a.screen[1];
      const dist=Math.hypot(dx,dy);
      const step=Math.min(dist,dt*WALK_PX_PER_SEC);

      a.state="walk";
      a.frameClock+=dt;
      a.frame=Math.floor(a.frameClock/WALK_FRAME_MS)%3;

      if(dist<0.5){
        a.screen=[tx,ty];
        if(target.id){
          a.node=target.id;
          a.world=[...target.world];
        }
        if(target.kind==="seat"){
          finishAtHome(a);
          return;
        }
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
      a.screen[0]+=dx*k;
      a.screen[1]+=dy*k;
      return;
    }

    if(a.actionPhase==="arrived"){
      if(now<a.actionUntil){
        const st=STATE_BY_NAME[a.actionState]||STATE_BY_NAME.idle;
        a.frameClock+=dt;
        a.frame=Math.floor(a.frameClock/0.34)%st.count;
        return;
      }
      beginHomeReturn(a);
      return;
    }

    // Backend is authoritative for activity. Available agents do not wander.
    a.state=a.backendState==="working"?"work":a.backendState==="error"?"reaction":"idle";
    const st=STATE_BY_NAME[a.state]||STATE_BY_NAME.idle;
    a.frameClock+=dt;
    a.frame=Math.floor(a.frameClock/(a.state==="work"?0.38:0.34))%st.count;
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
    get navigationMode(){return "screen-a-star";},
    get walkSpeed(){return WALK_PX_PER_SEC;},
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