/* AKIRA OFFICE — Living V6
 * Semantic office choreography: calibrated home seats, role stations, physical-door routing,
 * deterministic meeting seats, contextual object interactions, and backend-authoritative state.
 * Reimplemented for Akira with Akira-only scene + sprite assets.
 * 9 agents total: 8 active + Dante disabled.
 */
(function(){
  "use strict";

  const CONFIG_SRC="./assets/office/office_runtime_v5.json";
  const SCENE_SRC="./assets/office/01_akira_office_floor_v5_doors.png";
  const ATLAS_SRC="./assets/office/02_office_agents_atlas_v3_clean4.png";
  const DIRECTIONAL_ATLAS_SRC="./assets/office/02_akira_agents_walk_directional_v8_transparent.png";
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

  let stage=null,canvas=null,ctx=null,scene=null,atlas=null,directionalAtlas=null,config=null;
  let directionalFrames=null;
  let initialized=false,raf=0,last=0,paused=false,pollTimer=0;
  let agents=[],tasks=[];
  let truth={loaded:false,total:0,working:0,idle:0,error:0,disabled:0};
  let selectedName="";
  let eventText="Cargando Oficina V6…";
  let navMap=null,assetSheet=null,officeClock=0;
  const doorPulse=Object.create(null);
  // Keep the front/back relationship stable while avatars overlap. Sorting only
  // by raw Y lets two crossing agents swap painter's order frame-by-frame,
  // producing the exact "front half behind / back half in front" illusion seen
  // in the review video. A small hysteresis band prevents that visual zipper.
  const depthRank=new Map();
  const DEPTH_HYSTERESIS_PX=18;

  function depthCompare(a,b){
    const dy=a.screen[1]-b.screen[1];
    if(Math.abs(dy)>DEPTH_HYSTERESIS_PX)return dy;
    const ra=depthRank.get(a.name);
    const rb=depthRank.get(b.name);
    if(ra!=null&&rb!=null&&ra!==rb)return ra-rb;
    if(dy!==0)return dy;
    return String(a.name||"").localeCompare(String(b.name||""));
  }

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
      img.src=src+"?v=office-v6-runtime";
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

    // The office uses a four-direction sprite contract. A clear Euclidean line
    // is NOT enough: it would make the avatar physically move diagonally while
    // the renderer can only show up/down/left/right. Prefer a safe cardinal
    // two-leg shortcut when possible; otherwise fall back to the grid.
    if(startPx[0]===targetPx[0] || startPx[1]===targetPx[1]){
      if(segmentClear(startPx,targetPx))return [targetPx];
    }else{
      const horizontal=[targetPx[0],startPx[1]];
      const vertical=[startPx[0],targetPx[1]];
      if(segmentClear(startPx,horizontal) && segmentClear(horizontal,targetPx)){
        return [horizontal,targetPx];
      }
      if(segmentClear(startPx,vertical) && segmentClear(vertical,targetPx)){
        return [vertical,targetPx];
      }
    }

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

        // Keep the BFS path cardinal. The previous simplifier could connect
        // two non-collinear nodes whenever their Euclidean segment was clear,
        // silently reintroducing diagonal movement even with diagonal=false.
        const out=nodes.slice(1).map(p=>[...p]);

        // The real avatar position can be a few pixels off the nearest grid
        // center. Bridge that offset cardinally too; otherwise the first tick
        // after a route starts could still contain a tiny diagonal segment.
        const startCenter=nodes[0];
        if(startPx[0]!==startCenter[0] && startPx[1]!==startCenter[1]){
          const horizontal=[startCenter[0],startPx[1]];
          const vertical=[startPx[0],startCenter[1]];
          if(segmentClear(startPx,horizontal) && segmentClear(horizontal,startCenter)){
            out.unshift([...startCenter]);
            out.unshift(horizontal);
          }else if(segmentClear(startPx,vertical) && segmentClear(vertical,startCenter)){
            out.unshift([...startCenter]);
            out.unshift(vertical);
          }else{
            return null;
          }
        }else if(startPx[0]!==startCenter[0] || startPx[1]!==startCenter[1]){
          if(!segmentClear(startPx,startCenter))return null;
          out.unshift([...startCenter]);
        }

        if(!out.length){
          if(segmentClear(startPx,targetPx))return [targetPx];
          return null;
        }

        const last=out[out.length-1];
        if(last[0]===targetPx[0] || last[1]===targetPx[1]){
          if(segmentClear(last,targetPx)) out.push([...targetPx]);
          return out;
        }

        // The authored interaction point can sit a few pixels off a grid
        // center. Finish through one axis at a time, but only when both legs
        // are actually clear. Otherwise the last safe grid cell is the
        // destination; callers already tolerate the calibrated station radius.
        const horizontal=[targetPx[0],last[1]];
        const vertical=[last[0],targetPx[1]];
        if(segmentClear(last,horizontal) && segmentClear(horizontal,targetPx)){
          out.push(horizontal,[...targetPx]);
        }else if(segmentClear(last,vertical) && segmentClear(vertical,targetPx)){
          out.push(vertical,[...targetPx]);
        }

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
  function homeSeat(name){return config.homes[name]?.seat||homeVisual(name);}
  function homeExit(name){return config.homes[name]?.nav||null;}

  function interactionPoint(id){
    const p=config.interaction_points&&config.interaction_points[id];
    return Array.isArray(p)?p:nodeScreen(id);
  }

  function roleStationForAgent(agent){
    const rp=config.role_profiles&&config.role_profiles[agent&&agent.name];
    if(!rp)return null;
    const st=config.stations&&config.stations[rp.primary];
    if(st&&st.id)return st.id;
    if(st&&Array.isArray(st.ids))return st.ids[0]||null;
    return null;
  }

  function roleWorkStateForAgent(agent){
    const rp=config.role_profiles&&config.role_profiles[agent&&agent.name];
    return rp&&rp.work_state ? rp.work_state : "think";
  }

  function makeAgents(){
    agents=(config.agents||[]).map(c=>{
      const h=config.homes[c.name]||{visual:[0,0],nav:"P05_CENTRO_NORTE"};
      return {
        ...c,
        homeVisual:[...h.visual],
        homeSeat:[...(h.seat||h.visual||[0,0])],
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
        direction:"down",
        lastDirection:null,
        waitingForAgent:false,
        seed:(String(c.name||"").split("").reduce((n,ch)=>n+ch.charCodeAt(0),0)%997)
      };
    });
  }

  function findReachableRoute(start, target, maxRadius=128){
    if(!Array.isArray(start)||!Array.isArray(target))return null;
    const direct=aStar(start,target);
    if(direct&&direct.length)return {points:direct,target:[...target]};
    const radii=[16,32,48,64,80,96,112,128];
    const offsets=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
    for(const radius of radii){
      if(radius>maxRadius)break;
      for(const [ox,oy] of offsets){
        const candidate=[target[0]+ox*radius,target[1]+oy*radius];
        const path=aStar(start,candidate);
        if(path&&path.length)return {points:path,target:candidate};
      }
    }
    return null;
  }

  function routePoints(agent,targetId){
    const target=interactionPoint(targetId);
    if(!target)return null;

    const exit=nodeScreen(agent.homeNav);
    const legs=[];
    let cursor=[...agent.screen];

    // Home -> authored exit. If a calibrated point is obstructed by
    // clearance, search a small deterministic ring for the nearest safe
    // approach instead of silently cancelling the button action.
    if(exit && Math.hypot(cursor[0]-exit[0],cursor[1]-exit[1])>8){
      const toExit=findReachableRoute(cursor,exit,96);
      if(!toExit)return null;
      legs.push(...toExit.points);
      cursor=[...toExit.points[toExit.points.length-1]];
    }

    // Rooms have an explicit doorway approach. This keeps agents in the visible
    // corridors instead of letting the grid choose visually awkward shortcuts.
    const accessMap=(config.station_access||{});
    let accessId=accessMap[targetId];
    if(!accessId && /^M\d+$/.test(targetId))accessId=config.meeting_access;
    const access=accessId?nodeScreen(accessId):null;

    if(access && Math.hypot(cursor[0]-access[0],cursor[1]-access[1])>8){
      const toDoor=findReachableRoute(cursor,access,96);
      if(!toDoor)return null;
      legs.push(...toDoor.points);
      cursor=[...toDoor.points[toDoor.points.length-1]];
    }

    const toTarget=findReachableRoute(cursor,target,160);
    if(!toTarget)return null;
    legs.push(...toTarget.points);

    // Collapse collinear/grid micro-segments for natural walking.
    const out=[];
    for(const p of legs){
      if(!out.length){
        out.push([...p]);
        continue;
      }
      const q=out[out.length-1];
      if(Math.hypot(q[0]-p[0],q[1]-p[1])<=3)continue;
      if(out.length>=2){
        const prev=out[out.length-2];
        const ax=Math.sign(q[0]-prev[0]), ay=Math.sign(q[1]-prev[1]);
        const bx=Math.sign(p[0]-q[0]), by=Math.sign(p[1]-q[1]);
        if(ax===bx && ay===by){
          out[out.length-1]=[...p];
          continue;
        }
      }
      out.push([...p]);
    }
    return out;
  }

  function startRoute(agent,targetId,kind,returnState="working",duration=0,holdAtStation=false){
    if(!agent||agent.status!=="active"||!targetId)return false;
    const target=interactionPoint(targetId);
    const points=routePoints(agent,targetId);
    if(!target||!points||!points.length){
      say(agent.name+" no tiene una ruta segura hacia "+targetId+".");
      agent.visualState="reaction";
      return false;
    }

    agent.routeTargetId=targetId;
    agent.route=points.map((p,i)=>({
      screen:[...p],
      id:i===points.length-1?targetId:null
    }));
    agent.routeIndex=0;
    agent.machine="walking";
    agent.visualState="walk";
    agent.actionState=kind||"use";
    agent.returnState=returnState;
    const finalDir = (config.meeting_seats&&config.meeting_seats[targetId]&&config.meeting_seats[targetId].direction)
      || (config.interaction_directions&&config.interaction_directions[targetId]);
    agent.routeFinalDirection=finalDir||null;
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
    const exitRoute=exit?findReachableRoute(agent.screen,exit,96):null;
    let route=exitRoute
      ? exitRoute.points.map((p,i)=>({screen:[...p],id:i===exitRoute.points.length-1?agent.homeNav:null}))
      : [];

    const seat=homeSeat(agent.name);
    if(seat){
      const from=route.length?route[route.length-1].screen:agent.screen;
      const toSeat=findReachableRoute(from,seat,128);
      if(toSeat) route=route.concat(toSeat.points.map((p,i)=>({screen:[...p],id:i===toSeat.points.length-1?agent.homeNav:null,seat:i===toSeat.points.length-1})));
      else if(route.length) route.push({screen:[...seat],id:agent.homeNav,seat:true});
    } else if(route.length) {
      route.push({screen:[...agent.homeVisual],id:agent.homeNav,seat:true});
    }

    if(!route.length){
      finishHome(agent);
      return;
    }

    agent.route=route;
    agent.routeIndex=0;
    agent.machine="returning";
    agent.visualState="walk";
    agent.returnFinalDirection=(config.home_directions&&config.home_directions[agent.name])||"down";
    agent.frame=0;
    agent.frameClock=0;
  }

  function finishHome(agent){
    agent.node=agent.homeNav;
    agent.world=[...nodeWorld(agent.homeNav)];
    agent.screen=[...(agent.homeSeat||agent.homeVisual)];
    agent.route=[];
    agent.routeTargetId=null;
    agent.routeIndex=0;
    agent.machine=agent.backendState==="working"?"working":"idle";
    agent.visualState=agent.backendState==="working"?"work":agent.backendState==="error"?"reaction":"idle";
    agent.intentKey="";
    agent.actionState=null;
    agent.routeFinalDirection=null;
    agent.waitingForAgent=false;
  }

  function finishStation(agent,now){
    agent.route=[];
    agent.routeTargetId=null;
    agent.routeIndex=0;
    agent.machine="station";
    if(agent.routeFinalDirection) agent.direction=agent.routeFinalDirection;
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
      const target=desiredStation||roleStationForAgent(agent);
      if(target){
        const key=target+"|backend";
        const atTarget=agent.node===target && Math.hypot(agent.screen[0]-nodeScreen(target)[0],agent.screen[1]-nodeScreen(target)[1])<18;
        if(!atTarget && agent.intentKey!==key && agent.machine!=="walking"){
          const roleState=desiredStation ? "think" : roleWorkStateForAgent(agent);
          if(startRoute(agent,target,roleState,"working",0,true)){
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
    if(!agent||agent.status!=="active")return false;
    if(agent.machine==="walking" && agent.routeTargetId===targetId)return true;
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
      const claimed=new Set();
      let moved=0;
      live.forEach((a,i)=>{
        const preferred=slots[i]||null;
        const candidates=preferred
          ? [preferred,...slots.filter(id=>id!==preferred)]
          : slots;
        let selected=null;
        for(const slot of candidates){
          if(claimed.has(slot))continue;
          if(routePoints(a,slot)){selected=slot;break;}
        }
        if(!selected){
          for(const slot of slots){
            if(routePoints(a,slot)){selected=slot;break;}
          }
        }
        if(selected){
          claimed.add(selected);
          const seat=config.meeting_seats&&config.meeting_seats[selected];
          if(seat) a.direction=seat.direction||"down";
          if(beginExplicitRoute(a,selected,"talk",6500,""))moved++;
        }
      });
      say("Reunión de equipo · "+moved+" agente(s) con ruta segura.");
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
      if(Math.abs(dy)>=Math.abs(dx)*0.72){
        a.direction=dy<0?"up":"down";
        // The legacy atlas has no rear-facing rows; do not retain a stale
        // left/right mirror while moving vertically.
        a.facing=1;
      }else{
        a.direction=dx<0?"left":"right";
        a.facing=dx<0?-1:1;
      }
      if(a.machine==="returning" && a.returnFinalDirection && a.route.length-a.routeIndex<=2){
        a.direction=a.returnFinalDirection;
        a.facing=1;
      }
      const dist=Math.hypot(dx,dy);
      if(a.lastDirection!==a.direction){
        a.lastDirection=a.direction;
        a.frameClock=0;
        a.frame=0;
      }
      const step=Math.min(dist,dt*Number(config.navigation.speed_px_per_second||80));

      a.visualState="walk";
      a.frameClock+=dt*1000;
      // The directional atlas has four frames for each of the four directions.
      // Resolve the frame count from the same directional layout used by the
      // renderer so the animation cannot address non-existent horizontal frames.
      const layout=a.direction==="up"
        ? config.directional_walk&&config.directional_walk.vertical_back
        : a.direction==="down"
          ? config.directional_walk&&config.directional_walk.vertical_front
          : a.direction==="left"
            ? config.directional_walk&&config.directional_walk.horizontal_left
            : config.directional_walk&&config.directional_walk.horizontal_right;
      const cycle=Array.isArray(layout&&layout.cycle)&&layout.cycle.length
        ? layout.cycle.map(Number) : null;
      const walkCount=cycle ? cycle.length : Number(layout&&layout.count||4);
      a.frame=Math.floor(a.frameClock/Number(config.navigation.walk_frame_ms||125))
        %Math.max(1,walkCount);

      if(dist<=0.75){
        a.screen=[...target.screen];
        if(target.id){
          a.node=target.id;
          a.world=[...nodeWorld(target.id)];
        }
        if(target.seat && a.routeFinalDirection) a.direction=a.routeFinalDirection;
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
      const desired=[a.screen[0]+dx*k,a.screen[1]+dy*k];
      const safe=safeDynamicStep(a,desired,dt);
      a.waitingForAgent=Boolean(safe.waiting);

      a.screen[0]=safe.screen[0];
      a.screen[1]=safe.screen[1];
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

  function prepareDirectionalFrames(){
    if(!directionalAtlas||!config||!config.directional_walk)return null;

    const d=config.directional_walk;
    const centersX=(d.frame_centers_x||[]).map(Number);
    const centersY=(d.row_centers_y||[]).map(Number);
    const rows=centersY.length;
    const framesPerRow=Number(d.actual_poses_per_row||centersX.length||14);
    if(rows!==9||centersX.length!==framesPerRow)return null;

    const cropW=Math.max(1,Number(d.frame_crop_px&&d.frame_crop_px[0]||112));
    const cropH=Math.max(1,Number(d.frame_crop_px&&d.frame_crop_px[1]||112));
    const frameW=Number(d.frame_canvas_px&&d.frame_canvas_px[0]||112);
    const frameH=Number(d.frame_canvas_px&&d.frame_canvas_px[1]||112);
    const padX=Math.round((frameW-cropW)/2);
    const padY=Math.round(Number(d.frame_canvas_offset_y||0));

    const scratch=document.createElement("canvas");
    scratch.width=directionalAtlas.naturalWidth;
    scratch.height=directionalAtlas.naturalHeight;
    const sctx=scratch.getContext("2d",{willReadFrequently:true});
    if(!sctx)return null;
    sctx.imageSmoothingEnabled=false;
    sctx.drawImage(directionalAtlas,0,0);
    const pixels=sctx.getImageData(0,0,scratch.width,scratch.height).data;

    // Precompute the nearest real sprite center for every source column.
    // This is the critical separation step: adjacent poses in V8 are not on
    // the nominal 16-column grid and some hair touches neighboring poses.
    const ownerByX=new Int16Array(scratch.width);
    for(let sx=0;sx<scratch.width;sx++){
      let best=0,bestDist=Infinity;
      for(let i=0;i<centersX.length;i++){
        const dist=Math.abs(sx-Math.round(centersX[i]));
        if(dist<bestDist){bestDist=dist;best=i;}
      }
      ownerByX[sx]=best;
    }

    const result=Array.from({length:rows},()=>Array(framesPerRow).fill(null));

    for(let row=0;row<rows;row++){
      const cy=Math.round(centersY[row]);
      const srcY0=Math.max(0,Math.min(scratch.height-cropH,Math.round(cy-cropH/2)));
      const buffers=Array.from({length:framesPerRow},()=>new Uint8ClampedArray(frameW*frameH*4));
      const centerRounded=centersX.map(Math.round);

      for(let sy=srcY0;sy<srcY0+cropH && sy<scratch.height;sy++){
        const rowBase=sy*scratch.width*4;
        const localY=padY+(sy-srcY0);
        if(localY<0||localY>=frameH)continue;

        for(let sx=0;sx<scratch.width;sx++){
          const frameIndex=ownerByX[sx];
          const sourceX0=Math.round(centerRounded[frameIndex]-cropW/2);
          const localX=padX+(sx-sourceX0);
          if(localX<0||localX>=frameW)continue;

          const si=rowBase+sx*4;
          if(pixels[si+3]===0)continue;

          const di=(localY*frameW+localX)*4;
          const out=buffers[frameIndex];
          out[di]=pixels[si];
          out[di+1]=pixels[si+1];
          out[di+2]=pixels[si+2];
          out[di+3]=pixels[si+3];
        }
      }

      for(let i=0;i<framesPerRow;i++){
        const fc=document.createElement("canvas");
        fc.width=frameW;
        fc.height=frameH;
        const fctx=fc.getContext("2d");
        if(!fctx)continue;
        fctx.putImageData(new ImageData(buffers[i],frameW,frameH),0,0);
        result[row][i]=fc;
      }
    }

    return result;
  }

  function directionalFrameCanvas(a){
    if(!directionalFrames||!config||!config.directional_walk)return null;
    const d=config.directional_walk;
    const row=(d.row_order||[]).indexOf(a.name);
    if(row<0||!directionalFrames[row])return null;

    let layout=null;
    if(a.direction==="up") layout=d.vertical_back;
    else if(a.direction==="down") layout=d.vertical_front;
    else if(a.direction==="left") layout=d.horizontal_left;
    else layout=d.horizontal_right;
    if(!layout)return null;

    const count=Number(layout.count||1);
    const fi=Math.max(0,Math.min((Array.isArray(layout.cycle)&&layout.cycle.length
      ? layout.cycle.length : count)-1,a.frame||0));
    const slot=(Array.isArray(layout.cycle)&&layout.cycle.length)
      ? Number(layout.cycle[fi]??0) : fi;
    const frameIndex=layout.start+Math.max(0,Math.min(count-1,slot));
    return directionalFrames[row][frameIndex]||null;
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

    const moving=a.machine==="walking"||a.machine==="returning";
    const directional= moving ? null : (config.atlas.directional_rows&&config.atlas.directional_rows[a.name]);
    if(directional){
      const dir=directional[a.direction]||directional.down||directional.front;
      if(dir){
        const state=dir[a.visualState]||dir.idle;
        if(state){
          const fi=Math.max(0,Math.min((state.count||1)-1,a.frame||0));
          return frameRect(Number(state.row),Number(state.start||0)+fi);
        }
      }
    }

    const state=STATE_BY_NAME[a.visualState]||STATE_BY_NAME.idle;
    const fi=Math.max(0,Math.min(state.count-1,a.frame||0));
    return frameRect(row,state.start+fi);
  }

  function drawSprite(a){
    const moving=a.machine==="walking"||a.machine==="returning";
    const directionalCanvas=moving?directionalFrameCanvas(a):null;
    const src=directionalCanvas?null:spriteFrame(a);
    const sourceAtlas=directionalCanvas||atlas;
    if(!sourceAtlas)return;
    const p=a.screen;
    const idleBob=!moving?Math.sin(officeClock*2+(a.seed||0)*0.017)*0.8:0;
    const walkBob=moving?Math.round(Math.sin((a.frame+0.5)*Math.PI/2)):0;
    const scale=.82;
    const baseW=directionalCanvas
      ? Number(config.directional_walk&&config.directional_walk.frame_canvas_px&&config.directional_walk.frame_canvas_px[0]||112)
      : (src&&src[2]||0);
    const baseH=directionalCanvas
      ? Number(config.directional_walk&&config.directional_walk.frame_canvas_px&&config.directional_walk.frame_canvas_px[1]||112)
      : (src&&src[3]||0);
    if(baseW<=0||baseH<=0)return;
    const dw=baseW*scale,dh=baseH*scale;
    const left=Math.round(p[0]-dw/2);
    const top=Math.round(p[1]-dh+6+walkBob+idleBob);

    ctx.save();
    ctx.imageSmoothingEnabled=false;
    ctx.globalAlpha=a.status==="disabled"?.86:1;
    // Directional frames are pre-isolated into their own canvases, so there is
    // no neighboring-pose texture to sample at render time.
    if(!directionalCanvas && a.facing<0){
      ctx.translate(Math.round(p[0]*2),0);
      ctx.scale(-1,1);
    }
    if(directionalCanvas){
      ctx.drawImage(sourceAtlas,left,top,dw,dh);
    }else if(src){
      ctx.drawImage(sourceAtlas,src[0],src[1],src[2],src[3],left,top,dw,dh);
    }
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
    if(!(config.debug&&config.debug.show_routes))return;
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
      const p=interactionPoint(s.id);
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

  function objectSpriteRect(kind){
    const r=config.object_sprites&&config.object_sprites[kind];
    return Array.isArray(r)&&r.length===4?r:null;
  }

  function drawObjectInteractionBadges(){
    if(!assetSheet)return;
    const oc=config.object_interaction||{};
    if(oc.station_badges===false)return;

    const maxDist=Number(oc.active_distance_px||92);
    agents.forEach(a=>{
      if(a.status==="disabled")return;

      let kind=null, active=false;
      if(a.machine==="station"){
        kind=stationKindForAgent(a);
        active=true;
      }else if(a.machine==="working" && oc.working_home_monitor && a.node===a.homeNav){
        kind="workstation_monitor";
        active=true;
      }
      if(!active||!kind)return;

      const src=objectSpriteRect(kind);
      if(!src)return;

      const pulse=.84+.16*Math.sin(officeClock*4+(a.seed||0)*.01);
      const bw=68,bh=52;
      const x=Math.max(6,Math.min(1536-bw-6,a.screen[0]+24));
      const y=Math.max(8,a.screen[1]-64);

      ctx.save();
      ctx.globalAlpha=.92;
      ctx.fillStyle="rgba(8,16,29,.88)";
      ctx.strokeStyle="#39D4C6";
      ctx.lineWidth=1;
      ctx.fillRect(Math.round(x),Math.round(y),bw,bh);
      ctx.strokeRect(Math.round(x),Math.round(y),bw,bh);

      ctx.globalAlpha=pulse;
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(assetSheet,src[0],src[1],src[2],src[3],
        Math.round(x+6),Math.round(y+6),56,36);
      ctx.restore();
    });
  }

  function drawActiveObjectCue(){
    if(!selectedName||!assetSheet)return;
    const a=agents.find(x=>x.name===selectedName);
    if(!a||a.machine!=="station")return;

    const kind=stationKindForAgent(a);
    const rect=config.asset_previews&&config.asset_previews[kind||"development"];
    if(!rect)return;

    const maxW=72,maxH=48;
    const scale=Math.min(maxW/rect[2],maxH/rect[3]);
    const dw=rect[2]*scale,dh=rect[3]*scale;
    const x=Math.min(1536-dw-12,Math.max(12,a.screen[0]+26));
    const y=Math.max(14,a.screen[1]-dh-54);

    ctx.save();
    ctx.fillStyle="rgba(8,16,29,.92)";
    ctx.strokeStyle="#39D4C6";
    ctx.lineWidth=1;
    ctx.fillRect(Math.round(x-5),Math.round(y-5),Math.round(dw+10),Math.round(dh+10));
    ctx.strokeRect(Math.round(x-5),Math.round(y-5),Math.round(dw+10),Math.round(dh+10));
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(assetSheet,rect[0],rect[1],rect[2],rect[3],Math.round(x),Math.round(y),Math.round(dw),Math.round(dh));
    ctx.restore();
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

    const ordered=[...agents].sort(depthCompare);
    ordered.forEach((a,i)=>depthRank.set(a.name,i));
    ordered.forEach(drawSprite);

    drawObjectInteractionBadges();
    drawActiveObjectCue();
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

  // Dynamic collision is a runtime safety constraint, not a visual afterthought.
  // Agents are NOT hard static obstacles in the A* map because they move, but
  // their predicted next positions are treated as dynamic obstacles before a
  // movement step is committed. This prevents sprite overlap without pushing
  // an avatar into a wall, desk, doorway, or furniture block.
  const AGENT_MIN_GAP_PX=38;
  const AGENT_COLLISION_PREDICTION_PAD_PX=6;
  const AGENT_SIDE_STEP_PX=12;
  const AGENT_EMERGENCY_GAP_PX=24;
  const AGENT_EMERGENCY_PUSH_PX=2;

  function agentPriority(a){
    const seed=Number(a&&a.seed)||0;
    const name=String(a&&a.name||"");
    return seed*10000 + name.split("").reduce((n,ch)=>n+ch.charCodeAt(0),0);
  }

  function predictAgentNextPosition(a,dt){
    if(!a||a.status!=="active"||!Array.isArray(a.screen))return a&&a.screen?[...a.screen]:[0,0];
    if(a.machine!=="walking"&&a.machine!=="returning")return [...a.screen];
    const target=a.route&&a.route[a.routeIndex];
    if(!target||!Array.isArray(target.screen))return [...a.screen];
    const dx=target.screen[0]-a.screen[0];
    const dy=target.screen[1]-a.screen[1];
    const dist=Math.hypot(dx,dy);
    if(dist<=0.001)return [...a.screen];
    const speed=Number(config&&config.navigation&&config.navigation.speed_px_per_second)||80;
    const step=Math.min(dist,dt*speed);
    return [
      a.screen[0]+dx/dist*step,
      a.screen[1]+dy/dist*step
    ];
  }

  function candidateIsSafeAgainstAgents(agent,candidate,dt,population=agents){
    const required=AGENT_MIN_GAP_PX+Math.min(
      AGENT_COLLISION_PREDICTION_PAD_PX,
      (Number(config&&config.navigation&&config.navigation.speed_px_per_second)||80)*dt*0.5
    );
    for(const other of population){
      if(!other||other===agent||other.status!=="active"||!Array.isArray(other.screen))continue;
      const future=predictAgentNextPosition(other,dt);
      if(Math.hypot(candidate[0]-future[0],candidate[1]-future[1])<required)return false;
    }
    return true;
  }

  function safeDynamicStep(agent,desired,dt,population=agents){
    if(!agent||!Array.isArray(agent.screen)||!Array.isArray(desired))return [...agent?.screen||desired];

    const current=[...agent.screen];
    const step=Math.hypot(desired[0]-current[0],desired[1]-current[1]);
    if(step<=0.001){
      return {
        screen:current,
        waiting:false
      };
    }

    const staticSafe=point=>{
      return segmentClear(current,point) && candidateIsSafeAgainstAgents(agent,point,dt,population);
    };

    if(staticSafe(desired)){
      return {screen:[...desired],waiting:false};
    }

    // Prefer a perpendicular one-axis sidestep. The preferred side is
    // deterministic, so two agents approaching each other do not make random
    // mirrored decisions on different frames.
    const dx=desired[0]-current[0];
    const dy=desired[1]-current[1];
    const horizontal=Math.abs(dx)>=Math.abs(dy);
    const side=agentPriority(agent)%2===0?1:-1;
    const primary=horizontal
      ? [current[0],current[1]+side*AGENT_SIDE_STEP_PX]
      : [current[0]+side*AGENT_SIDE_STEP_PX,current[1]];
    const secondary=horizontal
      ? [current[0],current[1]-side*AGENT_SIDE_STEP_PX]
      : [current[0]-side*AGENT_SIDE_STEP_PX,current[1]];

    if(staticSafe(primary))return {screen:primary,waiting:false};
    if(staticSafe(secondary))return {screen:secondary,waiting:false};

    // No safe bypass exists in the current frame: yield instead of overlapping.
    return {screen:current,waiting:true};
  }

  function resolveAgentOverlap(){
    const all=agents.filter(a=>
      a.status==="active" &&
      Array.isArray(a.screen)
    );
    for(let i=0;i<all.length;i++){
      for(let j=i+1;j<all.length;j++){
        const a=all[i], b=all[j];
        let dx=b.screen[0]-a.screen[0];
        let dy=b.screen[1]-a.screen[1];
        let dist=Math.hypot(dx,dy);
        if(dist>=AGENT_EMERGENCY_GAP_PX)continue;
        if(dist<0.001){
          const angle=((agentPriority(a)+agentPriority(b))%360)*Math.PI/180;
          dx=Math.cos(angle); dy=Math.sin(angle); dist=1;
        }

        // Emergency correction is deliberately tiny and only happens when a
        // teleport/reconciliation/arrival has already produced an overlap.
        // Every proposed correction must remain inside the static collision map.
        const nx=dx/dist,ny=dy/dist;
        const moveA=agentPriority(a)>agentPriority(b)?a:b;
        const candidate=[
          moveA.screen[0]+(moveA===a?-nx:nx)*AGENT_EMERGENCY_PUSH_PX,
          moveA.screen[1]+(moveA===a?-ny:ny)*AGENT_EMERGENCY_PUSH_PX
        ];
        if(segmentClear(moveA.screen,candidate)){
          moveA.screen=[...candidate];
        }
      }
    }
  }

  function runCollisionProbe(){
    if(!config||!navMap){
      return {ok:false,reason:"office_not_initialized"};
    }
    const a={
      name:"__probe_a",
      seed:11,
      status:"active",
      machine:"walking",
      screen:[500,330],
      route:[{screen:[650,330]}],
      routeIndex:0
    };
    const b={
      name:"__probe_b",
      seed:22,
      status:"active",
      machine:"walking",
      screen:[548,330],
      route:[{screen:[400,330]}],
      routeIndex:0
    };
    const desired=[512,330];
    const result=safeDynamicStep(a,desired,1/60,[a,b]);
    const nextB=predictAgentNextPosition(b,1/60);
    const nextGap=Math.hypot(result.screen[0]-nextB[0],result.screen[1]-nextB[1]);
    return {
      ok:true,
      currentGap:Math.hypot(a.screen[0]-b.screen[0],a.screen[1]-b.screen[1]),
      desiredGap:Math.hypot(desired[0]-nextB[0],desired[1]-nextB[1]),
      nextGap,
      minGap:AGENT_MIN_GAP_PX,
      waiting:result.waiting,
      prevented:nextGap>=AGENT_MIN_GAP_PX
    };
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
      [config,scene,atlas,assetSheet,directionalAtlas]=await Promise.all([
        loadJson(CONFIG_SRC),
        loadImage(SCENE_SRC),
        loadImage(ATLAS_SRC),
        loadImage(ASSET_SHEET_SRC),
        loadImage(DIRECTIONAL_ATLAS_SRC).catch(()=>null)
      ]);
      navMap=buildNavMap();
      directionalFrames=prepareDirectionalFrames();
      if(!directionalFrames)console.warn("[OfficeFloor] directional atlas preprocessing unavailable; using direct frame fallback.");
      makeAgents();
      canvas.addEventListener("click",hitTest);
      initialized=true;
      resize();
      await pollTruth();
      render();
      say("Oficina V6 · estaciones semánticas + puertas + rutas seguras + estados reales.");
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
    if(!paused){
      agents.forEach(a=>updateAgent(a,dt,now));
      resolveAgentOverlap();
    }
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
    get directionalAtlasSource(){return DIRECTIONAL_ATLAS_SRC;},
    get directionalAtlasLoaded(){return Boolean(directionalAtlas);},
    get assetSheetSource(){return ASSET_SHEET_SRC;},
    get doors(){return (config&&config.doors||[]).map(d=>({...d}));},
    get atlasLayout(){return {
      rows:9,framesPerRow:19,
      states:STATES.map(x=>({...x})),
      directionalReady:Boolean(config&&config.directional_walk),
      directionalSource:config&&config.directional_walk ? {...config.directional_walk} : null,
      directionalFrameModel:config&&config.directional_walk ? {
        actualPosesPerRow:Number(config.directional_walk.actual_poses_per_row||0),
        frameCentersX:Array.isArray(config.directional_walk.frame_centers_x)
          ? [...config.directional_walk.frame_centers_x] : [],
        rowCentersY:Array.isArray(config.directional_walk.row_centers_y)
          ? [...config.directional_walk.row_centers_y] : [],
        cropPx:Array.isArray(config.directional_walk.frame_crop_px)
          ? [...config.directional_walk.frame_crop_px] : [],
        canvasPx:Array.isArray(config.directional_walk.frame_canvas_px)
          ? [...config.directional_walk.frame_canvas_px] : [],
        preprocessing:config.directional_walk.preprocessing||"none",
        framesPrepared:Boolean(directionalFrames)
      } : null,
      characterAliases:(config&&config.atlas&&config.atlas.character_aliases)||{}
    };},
    get navigationMode(){return "grid-a-star-semantic-v6";},
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
    get objectCatalog(){return {...((config&&config.object_catalog)||{})};},
    get objectSprites(){return {...((config&&config.object_sprites)||{})};},
    get truth(){return {...truth};},
    get collisionContract(){return {
      enabled:true,
      minGapPx:AGENT_MIN_GAP_PX,
      dynamicPrediction:true,
      staticCollisionAware:true,
      sideStepPx:AGENT_SIDE_STEP_PX
    };},
    runCollisionProbe
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
