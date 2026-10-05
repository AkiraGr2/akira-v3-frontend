/* AKIRA OFFICE — Living V5
 * Map / station / state architecture inspired by the public Munder Difflin design.
 * Reimplemented for Akira with Akira-only scene + sprite assets.
 * 9 agents total: 8 active + Dante disabled.
 * V5: Akira floor with physical doors, ambient station life, directional movement, and contextual asset previews.
 */
(function(){
  "use strict";

  const CONFIG_SRC="./assets/office/office_runtime_v5.json";
  const SCENE_SRC="./assets/office/01_akira_office_floor_v5_doors.png";
  const ATLAS_SRC="./assets/office/02_office_agents_atlas_v3_clean4.png";
  const ASSET_SHEET_SRC="./assets/office/02_akira_office_assets_v5.png";
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
  let agents=[],tasks=[];
  let truth={loaded:false,total:0,working:0,idle:0,error:0,disabled:0};
  let selectedName="";
  let eventText="Cargando Oficina V5…";
  let navMap=null,assetSheet=null,officeClock=0;
  const doorPulse=Object.create(null);

  const el=id=>document.getElementById(id);
  const gridKey=(x,y)=>x+","+y;

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
      img.src=src+"?v=office-v5-runtime";
    });
  }

  function backendStateFor(a){
    const s=String(a&&a.status||"").toLowerCase();
    if(s==="disabled")return"disabled";
    if(["error","failed","failure"].includes(s))return"error";
    if(["working","running","busy","executing"].includes(s))return"working";
    const n=String(a&&a.name||"").toLowerCase();
    return tasks.some(t=>
      String(t&&t.agent_name||"").toLowerCase()===n &&
      ["pending","queued","running","working","executing","in_progress","started","active"].includes(String(t&&t.status||"").toLowerCase())
    )?"working":"idle";
  }

  function taskForAgent(agent){
    const name=String(agent&&agent.backend||agent&&agent.name||"").toLowerCase();
    const own=tasks.filter(t=>
      String(t&&t.agent_name||"").toLowerCase()===name ||
      String(t&&t.agent_name||"").toLowerCase()===String(agent&&agent.name||"").toLowerCase()
    );
    return own.find(t=>["pending","queued","running","working","executing","in_progress","started","active"].includes(String(t&&t.status||"").toLowerCase())) || null;
  }

  function normalizeKey(value){
    return String(value||"").trim().toLowerCase().replace(/[\s-]+/g,"_");
  }

  function taskStationId(task){
    if(!task)return null;

    const explicit=[
      task.station,task.station_id,task.destination,task.destination_station,
      task.office_station,task.office_station_id
    ].find(Boolean);
    if(explicit){
      const key=String(explicit);
      if(config.waypoints[key])return key;
      const byStation=config.stations&&config.stations[key];
      if(byStation){
        if(byStation.id)return byStation.id;
        if(Array.isArray(byStation.ids))return byStation.ids[0]||null;
      }
      const wanted=normalizeKey(key);
      const named=Object.entries(config.stations||{}).find(([_,s])=>normalizeKey(s&&s.label)===wanted);
      if(named)return named[1].id || (named[1].ids&&named[1].ids[0]) || null;
    }

    const raw=[task.tool,task.tool_name,task.action,task.type,task.kind,task.category]
      .map(normalizeKey).filter(Boolean);

    for(const k of raw){
      const mapped=config.station_resolution&&config.station_resolution.tool_map&&config.station_resolution.tool_map[k];
      if(!mapped)continue;
      const st=config.stations&&config.stations[mapped];
      if(st&&st.id)return st.id;
      if(st&&Array.isArray(st.ids))return st.ids[0]||null;
    }
    return null;
  }

  function buildNavMap(){
    const nav=config.navigation||{};
    const tile=Number(nav.grid&&nav.grid.tile_px)||32;
    const width=Number(nav.grid&&nav.grid.width)||48;
    const height=Number(nav.grid&&nav.grid.height)||32;
    const origin=(nav.grid&&nav.grid.origin_px)||[0,0];
    const bounds=nav.bounds_px||{x:64,y:256,w:1408,h:704};
    const clearance=Number(nav.agent_clearance_px)||12;

    const blocked=new Set();
    const inBounds=(gx,gy)=>gx>=0&&gy>=0&&gx<width&&gy<height;

    function center(gx,gy){
      return [origin[0]+gx*tile+tile/2,origin[1]+gy*tile+tile/2];
    }
    function pointBlocked(px,py){
      if(px<bounds.x||py<bounds.y||px>bounds.x+bounds.w||py>bounds.y+bounds.h)return true;
      return (config.screen_collision_blocks||[]).some(b=>
        px>=b.x-clearance&&px<=b.x+b.w+clearance&&
        py>=b.y-clearance&&py<=b.y+b.h+clearance
      );
    }

    for(let y=0;y<height;y++){
      for(let x=0;x<width;x++){
        const p=center(x,y);
        if(pointBlocked(p[0],p[1]))blocked.add(gridKey(x,y));
      }
    }

    return {
      tile,width,height,origin,bounds,clearance,blocked,
      center,
      inside:(gx,gy)=>inBounds(gx,gy)&&!blocked.has(gridKey(gx,gy))
    };
  }

  function screenToGrid(p){
    const n=navMap;
    return [
      Math.max(0,Math.min(n.width-1,Math.round((p[0]-n.origin[0]-n.tile/2)/n.tile))),
      Math.max(0,Math.min(n.height-1,Math.round((p[1]-n.origin[1]-n.tile/2)/n.tile)))
    ];
  }

  function nearestOpenCell(g){
    if(navMap.inside(g[0],g[1]))return g;
    for(let radius=1;radius<10;radius++){
      for(let dy=-radius;dy<=radius;dy++){
        for(let dx=-radius;dx<=radius;dx++){
          if(Math.abs(dx)!==radius&&Math.abs(dy)!==radius)continue;
          const x=g[0]+dx,y=g[1]+dy;
          if(navMap.inside(x,y))return[x,y];
        }
      }
    }
    return null;
  }

  function segmentClear(a,b){
    const steps=Math.max(2,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/8));
    const blocks=config.screen_collision_blocks||[];
    const pad=navMap.clearance;
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      const px=a[0]+(b[0]-a[0])*t;
      const py=a[1]+(b[1]-a[1])*t;
      if(px<navMap.bounds.x||py<navMap.bounds.y||
         px>navMap.bounds.x+navMap.bounds.w||py>navMap.bounds.y+navMap.bounds.h)return false;
      if(blocks.some(b=>px>=b.x-pad&&px<=b.x+b.w+pad&&py>=b.y-pad&&py<=b.y+b.h+pad))return false;
    }
    return true;
  }

  function aStar(startPx,targetPx){
    if(!navMap)return null;
    if(segmentClear(startPx,targetPx))return [targetPx];

    const s=nearestOpenCell(screenToGrid(startPx));
    const t=nearestOpenCell(screenToGrid(targetPx));
    if(!s||!t)return null;

    const open=[s];
    const came=new Map([[gridKey(s[0],s[1]),null]]);
    const gScore=new Map([[gridKey(s[0],s[1]),0]]);
    const fScore=new Map([[gridKey(s[0],s[1]),Math.hypot(s[0]-t[0],s[1]-t[1])]]);
    const closed=new Set();
    const dirs=[[1,0],[-1,0],[0,1],[0,-1]];

    while(open.length){
      let bi=0;
      for(let i=1;i<open.length;i++){
        const fi=fScore.get(gridKey(open[i][0],open[i][1]))??Infinity;
        const fb=fScore.get(gridKey(open[bi][0],open[bi][1]))??Infinity;
        if(fi<fb)bi=i;
      }

      const cur=open.splice(bi,1)[0];
      const ck=gridKey(cur[0],cur[1]);
      if(closed.has(ck))continue;
      closed.add(ck);

      if(cur[0]===t[0]&&cur[1]===t[1]){
        const nodes=[];
        let k=ck;
        while(k!==null){
          const parts=k.split(",").map(Number);
          nodes.unshift(navMap.center(parts[0],parts[1]));
          const p=came.get(k);
          k=p?gridKey(p[0],p[1]):null;
        }

        const out=[];
        let anchor=startPx;
        for(let i=1;i<nodes.length;i++){
          const p=nodes[i];
          if(segmentClear(anchor,p))continue;
          const prev=nodes[i-1];
          if(!out.length||out[out.length-1][0]!==prev[0]||out[out.length-1][1]!==prev[1]){
            out.push(prev);
            anchor=prev;
          }
        }
        out.push(targetPx);
        return out;
      }

      for(const [dx,dy] of dirs){
        const nx=cur[0]+dx,ny=cur[1]+dy;
        if(!navMap.inside(nx,ny))continue;
        const nk=gridKey(nx,ny);
        if(closed.has(nk))continue;

        const from=navMap.center(cur[0],cur[1]);
        const to=navMap.center(nx,ny);
        if(!segmentClear(from,to))continue;

        const tentative=(gScore.get(ck)??Infinity)+1;
        if(tentative<(gScore.get(nk)??Infinity)){
          came.set(nk,[cur[0],cur[1]]);
          gScore.set(nk,tentative);
          fScore.set(nk,tentative+Math.hypot(nx-t[0],ny-t[1]));
          open.push([nx,ny]);
        }
      }
    }
    return null;
  }

  function nodeScreen(id){return config.waypoints[id]?.screen||null;}
  function nodeWorld(id){return config.waypoints[id]?.world||[0,0];}

  function homeVisual(name){return config.homes[name]?.visual||[0,0];}
  function homeExit(name){return config.homes[name]?.nav||null;}

  function makeAgents(){
    agents=(config.agents||[]).map(c=>{
      const h=config.homes[c.name]||{visual:[0,0],nav:"P05_CENTRO_NORTE"};
      return {
        ...c,
        homeVisual:[...h.visual],
        homeNav:h.nav,
        node:h.nav,
        world:[...nodeWorld(h.nav)],
        screen:[...h.visual],
        route:[],
        routeIndex:0,
        machine:"idle",
        visualState:"idle",
        intentKey:"",
        actionUntil:0,
        actionState:null,
        frame:0,
        frameClock:0,
        backendState:"unknown",
        task:null,
        holdAtStation:false,
        durationMs:0,
        facing:1,
        seed:(String(c.name||"").split("").reduce((n,ch)=>n+ch.charCodeAt(0),0)%997)
      };
    });
  }

  function routePoints(agent,targetId){
    const target=nodeScreen(targetId);
    if(!target)return null;

    // Always leave the visual home through its authored exit using A*.
    // This prevents the first leg from cutting straight through desks/walls.
    const exit=nodeScreen(agent.homeNav);
    const start=[...agent.screen];
    const legs=[];
    if(exit && Math.hypot(start[0]-exit[0],start[1]-exit[1])>8){
      const toExit=aStar(start,exit);
      if(!toExit)return null;
      legs.push(...toExit);
    }
    const from=legs.length?legs[legs.length-1]:start;
    const toTarget=aStar(from,target);
    if(!toTarget)return null;
    legs.push(...toTarget);

    const out=[];
    for(const p of legs){
      if(!out.length || Math.hypot(out[out.length-1][0]-p[0],out[out.length-1][1]-p[1])>3){
        out.push([...p]);
      }
    }
    return out;
  }

  function startRoute(agent,targetId,kind,returnState="working",duration=0,holdAtStation=false){
    if(!agent||agent.status!=="active"||!targetId)return false;
    const target=nodeScreen(targetId);
    const points=routePoints(agent,targetId);
    if(!target||!points||!points.length){
      say(agent.name+" no tiene una ruta segura hacia "+targetId+".");
      agent.visualState="reaction";
      return false;
    }

    agent.route=points.map((p,i)=>({
      screen:[...p],
      id:i===points.length-1?targetId:null
    }));
    agent.routeIndex=0;
    agent.machine="walking";
    agent.visualState="walk";
    agent.actionState=kind||"use";
    agent.returnState=returnState;
    agent.actionUntil=duration?performance.now()/1000+duration/1000:0;
    agent.holdAtStation=Boolean(holdAtStation);
    agent.durationMs=Number(duration)||0;
    agent.intentKey=targetId+"|"+(kind||"use");
    agent.frame=0;
    agent.frameClock=0;
    return true;
  }

  function beginReturn(agent){
    const exit=nodeScreen(agent.homeNav);
    const points=exit?aStar(agent.screen,exit):null;
    if(!points){finishHome(agent);return;}
    agent.route=points.map((p,i)=>({screen:[...p],id:i===points.length-1?agent.homeNav:null}));
    agent.route.push({screen:[...agent.homeVisual],id:agent.homeNav,seat:true});
    agent.routeIndex=0;
    agent.machine="returning";
    agent.visualState="walk";
    agent.frame=0;
    agent.frameClock=0;
  }

  function finishHome(agent){
    agent.node=agent.homeNav;
    agent.world=[...nodeWorld(agent.homeNav)];
    agent.screen=[...agent.homeVisual];
    agent.route=[];
    agent.routeIndex=0;
    agent.machine=agent.backendState==="working"?"working":"idle";
    agent.visualState=agent.backendState==="working"?"work":agent.backendState==="error"?"reaction":"idle";
    agent.intentKey="";
    agent.actionState=null;
  }

  function finishStation(agent,now){
    agent.route=[];
    agent.routeIndex=0;
    agent.machine="station";
    agent.visualState=(agent.actionState==="talk"?"talk":agent.actionState==="use"?"use":"work");
    agent.actionUntil=now+(Number(agent.durationMs)||0)/1000;
  }

  function reconcileAgent(agent){
    if(agent.status==="disabled"){
      agent.machine="disabled";
      agent.visualState="idle";
      return;
    }

    const activeTask=taskForAgent(agent);
    agent.task=activeTask;
    const desiredStation=taskStationId(activeTask);

    if(agent.backendState==="error"){
      if(agent.machine==="walking"||agent.machine==="station"||agent.machine==="returning"){
        agent.intentKey="";
        beginReturn(agent);
      }else{
        agent.machine="idle";
        agent.visualState="reaction";
      }
      return;
    }

    if(agent.backendState==="working"){
      const target=desiredStation;
      if(target){
        const key=target+"|backend";
        const atTarget=agent.node===target && Math.hypot(agent.screen[0]-nodeScreen(target)[0],agent.screen[1]-nodeScreen(target)[1])<18;
        if(!atTarget && agent.intentKey!==key && agent.machine!=="walking"){
          if(startRoute(agent,target,"think","working",0,true)){
            agent.intentKey=key;
          }
        }
      }else if(agent.machine==="idle"||agent.machine==="returning"||agent.machine==="station"){
        finishHome(agent);
      }else if(agent.machine==="working"){
        agent.visualState="work";
      }
      return;
    }

    // Backend is idle: finish any temporary station visit, then remain at home.
    if(agent.machine==="station"||agent.machine==="walking"||agent.machine==="returning"){
      if(agent.machine!=="returning")beginReturn(agent);
    }else{
      finishHome(agent);
    }
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
          const live=byName.get(String(a.backend||"").toLowerCase())||byName.get(String(a.name||"").toLowerCase());
          a.backendState=live?backendStateFor(live):"unknown";
          if(live)a.backendStatus=live.status||"";
        });
        truth.loaded=true;
        truth.total=real.length;
        truth.working=real.filter(a=>backendStateFor(a)==="working").length;
        truth.error=real.filter(a=>backendStateFor(a)==="error").length;
        truth.disabled=real.filter(a=>backendStateFor(a)==="disabled").length;
        truth.idle=Math.max(0,truth.total-truth.working-truth.error-truth.disabled);
        agents.forEach(reconcileAgent);
      }
      renderSidePanel();
      renderHud();
    }catch(_){
      renderHud();
    }
  }

  function renderHud(){
    const hud=el("officePixelHud");
    if(hud){
      hud.innerHTML=truth.loaded
        ? "<strong>AKIRA PROJECT</strong><br>"+truth.total+" registrados · "+truth.working+" trabajando · "+truth.idle+" disponibles"
        : "<strong>AKIRA PROJECT · V4</strong><br>Estado backend pendiente";
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
          const wx=Number(a.world[0]||0).toFixed(1);
          const wy=Number(a.world[1]||0).toFixed(1);
          say(a.name+" · "+a.role+" · ("+wx+", "+wy+")");
          const detail=el("officeAgentDetail");
          if(detail)detail.innerHTML="<strong>"+a.name+"</strong><br>"+a.role+
            "<br>Estado visual: "+a.visualState+
            "<br>Máquina: "+a.machine+
            "<br>Estación: "+(stationKindForAgent(a)||"home")+
            "<br>Tarea: "+(a.task&&String(a.task.title||a.task.name||a.task.tool||"en ejecución") || "—")+
            "<br>Coordenada: ("+wx+", "+wy+")";
        }
      });
    });
  }

  function beginExplicitRoute(agent,targetId,state,duration,message){
    agent.durationMs=duration||0;
    if(startRoute(agent,targetId,state,"working",duration||0,false)){
      if(message)say(message);
      return true;
    }
    return false;
  }

  function executeCommand(kind){
    const live=agents.filter(a=>a.status==="active");
    if(kind==="mission"){
      const a=agents.find(x=>x.name==="Akira");
      if(a)beginExplicitRoute(a,config.stations.mission.id,"use",6500,"Akira → Tablero de misiones.");
      return;
    }
    if(kind==="coffee"){
      live.slice(0,3).forEach(a=>beginExplicitRoute(a,config.stations.coffee.id,"use",5000,""));
      say("Pausa de café · ruta por la cuadrícula segura.");
      return;
    }
    if(kind==="print"){
      const a=agents.find(x=>x.name==="Nexo")||live[0];
      if(a)beginExplicitRoute(a,config.stations.printer.id,"use",5000,a.name+" → Impresora.");
      return;
    }
    if(kind==="meeting"){
      const slots=(config.stations.meeting&&config.stations.meeting.ids)||[];
      live.forEach((a,i)=>{
        if(slots[i])beginExplicitRoute(a,slots[i],"talk",6500,"");
      });
      say("Reunión de equipo · movimiento por pasillos.");
    }
  }

  function updateAgent(a,dt,now){
    if(a.status==="disabled"){
      a.machine="disabled";
      a.visualState="idle";
      a.frameClock+=dt;
      a.frame=(Math.floor(a.frameClock/450))%3;
      return;
    }

    if(a.machine==="walking"||a.machine==="returning"){
      const target=a.route[a.routeIndex];
      if(!target){
        if(a.machine==="returning"){finishHome(a);return;}
        finishStation(a,now);
        return;
      }

      const dx=target.screen[0]-a.screen[0];
      const dy=target.screen[1]-a.screen[1];
      if(Math.abs(dx)>1)a.facing=dx<0?-1:1;
      const dist=Math.hypot(dx,dy);
      const step=Math.min(dist,dt*Number(config.navigation.speed_px_per_second||80));

      a.visualState="walk";
      a.frameClock+=dt*1000;
      a.frame=Math.floor(a.frameClock/Number(config.navigation.walk_frame_ms||125))%3;

      if(dist<=0.75){
        a.screen=[...target.screen];
        if(target.id){
          a.node=target.id;
          a.world=[...nodeWorld(target.id)];
        }
        if(target.seat){
          finishHome(a);
          return;
        }
        if(a.routeIndex<a.route.length-1){
          a.routeIndex++;
        }else if(a.machine==="returning"){
          finishHome(a);
        }else{
          finishStation(a,now);
        }
        return;
      }

      const k=step/Math.max(.0001,dist);
      a.screen[0]+=dx*k;
      a.screen[1]+=dy*k;
      return;
    }

    if(a.machine==="station"){
      if(a.actionUntil&&now>=a.actionUntil&&(!a.holdAtStation||a.backendState==="idle")){
        beginReturn(a);
        return;
      }
      a.frameClock+=dt*1000;
      const st=STATE_BY_NAME[a.visualState]||STATE_BY_NAME.use;
      a.frame=Math.floor(a.frameClock/(a.visualState==="talk"?170:190))%st.count;
      return;
    }

    if(a.backendState==="working"){
      a.machine="working";
      a.visualState="work";
    }else if(a.backendState==="error"){
      a.machine="idle";
      a.visualState="reaction";
    }else{
      a.machine="idle";
      a.visualState="idle";
    }

    a.frameClock+=dt*1000;
    const st=STATE_BY_NAME[a.visualState]||STATE_BY_NAME.idle;
    const frameMs=a.visualState==="work"?190:a.visualState==="reaction"?240:220;
    a.frame=Math.floor(a.frameClock/frameMs)%st.count;
  }

  function frameRect(row,col){
    const xCenters=FRAME_X,yCenters=FRAME_Y;
    const x0=col===0?0:Math.round((xCenters[col-1]+xCenters[col])/2);
    const x1=col===xCenters.length-1?1536:Math.round((xCenters[col]+xCenters[col+1])/2);
    const y0=row===0?0:Math.round((yCenters[row-1]+yCenters[row])/2);
    const y1=row===yCenters.length-1?1024:Math.round((yCenters[row]+yCenters[row+1])/2);
    return [x0,y0,x1-x0,y1-y0];
  }

  function spriteFrame(a){
    const row=(config.atlas.row_order||[]).indexOf(a.name);
    if(row<0)return null;
    const state=STATE_BY_NAME[a.visualState]||STATE_BY_NAME.idle;
    const fi=Math.max(0,Math.min(state.count-1,a.frame||0));
    return frameRect(row,state.start+fi);
  }

  function drawSprite(a){
    const src=spriteFrame(a);
    if(!src||!atlas)return;
    const p=a.screen;
    const moving=a.machine==="walking"||a.machine==="returning";
    const idleBob=!moving?Math.sin(officeClock*2+(a.seed||0)*0.017)*0.8:0;
    const walkBob=moving?Math.round(Math.sin((a.frame+0.5)*Math.PI/2)):0;
    const scale=.82;
    const dw=src[2]*scale,dh=src[3]*scale;
    const left=Math.round(p[0]-dw/2);
    const top=Math.round(p[1]-dh+6+walkBob+idleBob);

    ctx.save();
    ctx.imageSmoothingEnabled=false;
    ctx.globalAlpha=a.status==="disabled"?.86:1;
    if(a.facing<0){
      ctx.translate(Math.round(p[0]*2),0);
      ctx.scale(-1,1);
    }
    ctx.drawImage(atlas,src[0],src[1],src[2],src[3],left,top,dw,dh);
    ctx.restore();

    ctx.save();
    ctx.textAlign="center";
    ctx.font="10px 'Press Start 2P', monospace";
    const badge=a.backendState==="working" ? (a.visualState==="think"?"…":"WORK") :
      a.backendState==="error" ? "ERR" :
      a.status==="disabled" ? "OFF" :
      a.machine==="station" ? (a.visualState==="talk"?"TALK":"USE") : "";
    if(badge){
      const bw=Math.max(32,ctx.measureText(badge).width+14);
      const by=Math.round(top-17);
      ctx.fillStyle="rgba(8,16,29,.88)";
      ctx.strokeStyle=a.backendState==="error"?"#FF667A":"#39D4C6";
      ctx.lineWidth=1;
      ctx.fillRect(Math.round(p[0]-bw/2),by,bw,16);
      ctx.strokeRect(Math.round(p[0]-bw/2),by,bw,16);
      ctx.fillStyle="#F4F8FF";
      ctx.fillText(badge,Math.round(p[0]),by+11);
    }
    if(selectedName===a.name){
      ctx.strokeStyle="#F4C95D";
      ctx.lineWidth=2;
      ctx.strokeRect(Math.round(p[0]-dw/2-4),Math.round(top-4),Math.round(dw+8),Math.round(dh+8));
    }
    ctx.restore();
  }

  function drawRoutes(){
    agents.forEach(a=>{
      if(!a.route.length)return;
      ctx.save();
      ctx.strokeStyle="rgba(99,230,190,.22)";
      ctx.lineWidth=2;
      ctx.setLineDash([6,6]);
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

  function stationKindForAgent(a){
    const t=a&&a.task;
    const sid=taskStationId(t);
    if(sid){
      const entries=Object.entries(config.stations||{});
      for(const [key,s] of entries){
        if(s&&s.id===sid)return key;
        if(s&&Array.isArray(s.ids)&&s.ids.includes(sid))return key;
      }
    }
    if(a&&a.actionState==="talk")return"meeting";
    if(a&&a.actionState==="use")return a.machine==="station" ? "utility":"mission";
    return null;
  }

  function drawDoorEffects(ts){
    const doors=Array.isArray(config.doors)?config.doors:[];
    doors.forEach(d=>{
      const cx=d.x+d.w/2,cy=d.y+d.h/2;
      let near=false;
      agents.forEach(a=>{
        if(a.status==="disabled")return;
        const dist=Math.hypot(a.screen[0]-cx,a.screen[1]-cy);
        if(dist<62)near=true;
      });
      const k=d.id;
      const target=near?1:0;
      doorPulse[k]=(doorPulse[k]||0)+(target-(doorPulse[k]||0))*0.16;
      const pulse=doorPulse[k];
      if(pulse<.02)return;
      ctx.save();
      ctx.globalAlpha=.18+.35*pulse;
      ctx.strokeStyle="#70E1FF";
      ctx.lineWidth=2;
      ctx.strokeRect(d.x,d.y,d.w,d.h);
      const slide=d.side==="east"||d.side==="west"?Math.round(10*pulse):Math.round(8*pulse);
      ctx.fillStyle="rgba(112,225,255,.12)";
      if(d.side==="east"||d.side==="west"){
        ctx.fillRect(d.x+(d.side==="east"?d.w-slide:slide),d.y,Math.max(2,slide),d.h);
      }else{
        ctx.fillRect(d.x,d.y+(d.side==="south"?d.h-slide:slide),d.w,Math.max(2,slide));
      }
      ctx.restore();
    });
  }

  function drawStationEffects(){
    const pulse=(Math.sin(officeClock*3)+1)/2;
    const stations=config.stations||{};
    const targets=[];
    if(stations.coffee?.id)targets.push({id:stations.coffee.id,kind:"coffee",color:"#F4C95D"});
    if(stations.printer?.id)targets.push({id:stations.printer.id,kind:"printer",color:"#9D7CFF"});
    if(stations.memory?.id)targets.push({id:stations.memory.id,kind:"memory",color:"#E06CFF"});
    if(stations.development?.id)targets.push({id:stations.development.id,kind:"development",color:"#70E1FF"});
    if(stations.meeting?.ids?.[0])targets.push({id:stations.meeting.ids[0],kind:"meeting",color:"#39D4C6"});
    targets.forEach(s=>{
      const p=nodeScreen(s.id);
      if(!p)return;
      const busy=agents.some(a=>stationKindForAgent(a)===s.kind);
      if(!busy)return;
      ctx.save();
      ctx.globalAlpha=.10+.08*pulse;
      ctx.fillStyle=s.color;
      ctx.beginPath();
      ctx.arc(p[0],p[1],24+6*pulse,0,Math.PI*2);
      ctx.fill();
      ctx.globalAlpha=.55;
      ctx.strokeStyle=s.color;
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.arc(p[0],p[1],30+8*pulse,0,Math.PI*2);
      ctx.stroke();
      ctx.restore();
    });

    // Small deterministic ambient station animations.
    ctx.save();
    const steamX=1390,steamY=370;
    for(let i=0;i<3;i++){
      const t=(officeClock*.7+i*.9)%2;
      const y=steamY-t*24;
      ctx.globalAlpha=.15*(1-t/2);
      ctx.strokeStyle="#F4F8FF";
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.arc(steamX+i*8,y,4,Math.PI,Math.PI*2);
      ctx.stroke();
    }
    const paperY=590+Math.sin(officeClock*4)*3;
    ctx.globalAlpha=.5;
    ctx.fillStyle="#D9E6F2";
    ctx.fillRect(1382,paperY,16,5);
    ctx.restore();
  }

  function drawMonitorLife(){
    const monitors=[
      [486,214,74,32],[780,214,74,32],[430,390,82,30],[1085,390,82,30],
      [430,560,82,30],[1085,560,82,30],[1330,702,96,42]
    ];
    monitors.forEach((m,i)=>{
      const glow=.07+.045*(Math.sin(officeClock*2.4+i*.7)+1);
      ctx.save();
      ctx.globalAlpha=glow;
      ctx.fillStyle=i===6?"#70E1FF":i%2?"#9D7CFF":"#39D4C6";
      ctx.fillRect(m[0],m[1],m[2],m[3]);
      ctx.restore();
    });
  }

  function drawSelectedAssetPreview(){
    if(!selectedName||!assetSheet)return;
    const a=agents.find(x=>x.name===selectedName);
    if(!a)return;
    const kind=stationKindForAgent(a);
    const rect=config.asset_previews&&config.asset_previews[kind||"development"];
    if(!rect)return;
    const w=190,h=125,x=16,y=16;
    ctx.save();
    ctx.fillStyle="rgba(8,16,29,.94)";
    ctx.strokeStyle="#395273";
    ctx.lineWidth=2;
    ctx.fillRect(x,y,w,h);
    ctx.strokeRect(x,y,w,h);
    ctx.font="11px 'Press Start 2P', monospace";
    ctx.fillStyle="#70E1FF";
    ctx.textAlign="left";
    ctx.fillText((a.name+" · "+(kind||"home")).toUpperCase(),x+8,y+15);
    const pad=8;
    const scale=Math.min((w-pad*2)/rect[2],(h-28-pad)/rect[3]);
    const dw=rect[2]*scale,dh=rect[3]*scale;
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(assetSheet,rect[0],rect[1],rect[2],rect[3],x+pad,y+22,dw,dh);
    ctx.restore();
  }

  function draw(){
    if(!ctx)return;
    ctx.clearRect(0,0,1536,1024);
    if(scene)ctx.drawImage(scene,0,0,1536,1024);
    drawMonitorLife();
    drawStationEffects();
    drawDoorEffects(officeClock);
    drawRoutes();
    [...agents].sort((a,b)=>a.screen[1]-b.screen[1]).forEach(drawSprite);
    drawSelectedAssetPreview();
  }

  function resize(){
    if(!stage||!canvas)return;
    const r=stage.getBoundingClientRect();
    if(r.width<2||r.height<2)return;
    canvas.width=1536;
    canvas.height=1024;
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
    if(hit)say(hit.name+" · "+hit.role+" · ("+Number(hit.world[0]).toFixed(1)+", "+Number(hit.world[1]).toFixed(1)+")");
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
      [config,scene,atlas,assetSheet]=await Promise.all([
        loadJson(CONFIG_SRC),
        loadImage(SCENE_SRC),
        loadImage(ATLAS_SRC),
        loadImage(ASSET_SHEET_SRC)
      ]);
      navMap=buildNavMap();
      makeAgents();
      canvas.addEventListener("click",hitTest);
      initialized=true;
      resize();
      await pollTruth();
      render();
      say("Oficina V5 · puertas + rutas A* + estaciones vivas + estados reales.");
      last=performance.now();
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(loop);
      clearInterval(pollTimer);
      pollTimer=setInterval(pollTruth,5000);
    }catch(err){
      eventText="Error cargando Oficina V5: "+err.message;
      render();
    }
  }

  function loop(ts){
    if(!initialized)return;
    const dt=Math.min(.05,(ts-last)/1000||0);
    const now=ts/1000;
    officeClock=now;
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
    get assetSheetSource(){return ASSET_SHEET_SRC;},
    get doors(){return (config&&config.doors||[]).map(d=>({...d}));},
    get atlasLayout(){return {rows:9,framesPerRow:19,states:STATES.map(x=>({...x}))};},
    get navigationMode(){return "grid-a-star-stations-v5";},
    get walkSpeed(){return Number(config&&config.navigation&&config.navigation.speed_px_per_second||80);},
    get grid(){
      return navMap?{width:navMap.width,height:navMap.height,tile:navMap.tile,blocked:navMap.blocked.size}:null;
    },
    get agents(){return agents.map(a=>({
      name:a.name,node:a.node,world:[...a.world],screen:[...a.screen],
      state:a.visualState,backendState:a.backendState,machine:a.machine,
      intentKey:a.intentKey,
      route:a.route.map(p=>[...p.screen])
    }));},
    get truth(){return {...truth};}
  };

  document.addEventListener("DOMContentLoaded",()=>{
    [["officePixelMission","mission"],["officePixelCoffee","coffee"],["officePixelMeeting","meeting"],["officePixelPrint","print"]]
      .forEach(([id,kind])=>{
        const b=el(id);
        if(b)b.addEventListener("click",()=>executeCommand(kind));
      });
    init();
  });
})();
