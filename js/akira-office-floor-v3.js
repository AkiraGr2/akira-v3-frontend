/* 
 * AKIRA OFFICE — Living Workspace V1
 * Three.js/WebGL scene with real animated humanoid GLB assets.
 *
 * Truth model:
 * - /api/v8/agents and /api/v8/tasks remain the only runtime state sources.
 * - The scene never writes backend state.
 * - Movement is presentation: working agents move to their stations; idle agents
 *   can wander locally; shared mission_id may trigger an explicit briefing.
 *
 * Free asset strategy:
 * Quaternius humanoids via Poly Pizza, CC0/Public Domain.
 */

(function(){
  "use strict";

  const BACKEND_FALLBACK = "https://akira-empresa.onrender.com";
  const POLL_MS = 8000;
  const THREE_VERSION = "0.180.0";
  const MODULE_BASE = "https://cdn.jsdelivr.net/npm/three@" + THREE_VERSION;
  const MODEL_SOURCES = Object.freeze({
    business: "https://cdn.jsdelivr.net/gh/techdou/lumen-gallery@1c8a694c5669171b3b6a0f4bffc6f75d0772630a/public/assets/characters/business-man.glb",
    woman: "https://cdn.jsdelivr.net/gh/techdou/lumen-gallery@1c8a694c5669171b3b6a0f4bffc6f75d0772630a/public/assets/characters/casual-woman.glb",
    hoodie: "https://cdn.jsdelivr.net/gh/techdou/lumen-gallery@1c8a694c5669171b3b6a0f4bffc6f75d0772630a/public/assets/characters/casual-man.glb",
    worker: "https://cdn.jsdelivr.net/gh/techdou/lumen-gallery@1c8a694c5669171b3b6a0f4bffc6f75d0772630a/public/assets/characters/worker.glb"
  });

  const AGENT_COLORS = [
    "#7c9cff","#63e6be","#74c0fc","#ffd166","#ff7a90",
    "#69db7c","#b197fc","#4dabf7","#d0a2f7","#ff8fab"
  ];

  const ROLE_MODEL = Object.freeze({
    researcher: "business",
    developer: "hoodie",
    tester: "worker",
    reviewer: "business",
    memorizer: "woman",
    graph_builder: "hoodie",
    learner: "woman",
    internal: "business",
    selftest_agent: "worker"
  });

  const STATIONS = Object.freeze({
    researcher: [-5.8,0.20, 2.2],
    developer:  [-2.0,0.20, 5.3],
    tester:      [2.3,0.20, 5.1],
    reviewer:    [5.9,0.20, 2.1],
    memorizer:   [5.4,0.20,-2.3],
    graph_builder:[1.9,0.20,-5.1],
    learner:    [-2.0,0.20,-5.0],
    internal:   [-5.7,0.20,-2.3],
    selftest_agent:[0.0,0.20, 7.1]
  });

  const WORK_ZONES = Object.freeze({
    researcher:[-5.2,0.2, 0.8],
    developer:[-2.0,0.2, 3.7],
    tester:[2.3,0.2, 3.7],
    reviewer:[5.1,0.2, 0.8],
    memorizer:[4.6,0.2,-1.2],
    graph_builder:[1.5,0.2,-3.6],
    learner:[-1.8,0.2,-3.6],
    internal:[-5.0,0.2,-1.2],
    selftest_agent:[0.0,0.2, 5.9]
  });

  // Purposeful ambient destinations: only one idle agent may make a short trip
  // at a time, so the office reads as a workplace instead of a flock.
  const AMBIENT_POINTS = Object.freeze([
    {name:"coffee", point:[-8.2,0.2,-1.0]},
    {name:"printer", point:[8.0,0.2,-1.1]},
    {name:"window", point:[0.0,0.2,-8.1]}
  ]);
  const IDLE_AMBIENT_GAP_MS = 28000;
  const IDLE_AMBIENT_HOLD_MS = 2200;

  let THREE = null;
  let GLTFLoader = null;
  let OrbitControls = null;
  let skeletonClone = null;
  let canvas = null;
  let stage = null;
  let renderer = null;
  let scene = null;
  let camera = null;
  let controls = null;
  let initialized = false;
  let paused = false;
  let raf = 0;
  let pollTimer = 0;
  let fetchBusy = false;
  let lastPoll = 0;
  let agents = [];
  let tasks = [];
  let actors = new Map();
  let modelTemplates = new Map();
  let selectedName = null;
  let raycaster = null;
  let pointer = null;
  let ambientObjects = [];
  let interactiveObjects = [];
  let coreGroup = null;
  let coreMaterials = [];
  let reducedMotion = false;
  let currentSceneTime = 0;
  let resizeObserver = null;
  let coreLinksGroup = null;
  let coreLinkLines = new Map();

  const stateMeta = {
    idle:{label:"Disponible",cls:"idle"},
    working:{label:"Trabajando",cls:"working"},
    error:{label:"Error",cls:"error"},
    disabled:{label:"Inactivo",cls:"disabled"},
    briefing:{label:"Briefing",cls:"working"}
  };

  function backend(){
    try{return localStorage.getItem("akira_backend_url") || BACKEND_FALLBACK;}
    catch(_){return BACKEND_FALLBACK;}
  }

  function authHeaders(){
    try{
      return typeof window.akiraAuthHeaders === "function"
        ? window.akiraAuthHeaders()
        : {"Content-Type":"application/json"};
    }catch(_){
      return {"Content-Type":"application/json"};
    }
  }

  function esc(value){
    return String(value==null?"":value)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function getAgent(name){
    return agents.find(a=>String(a && a.name)===String(name)) || null;
  }

  function normalizedName(agent){
    return String(agent && agent.name || "").trim().toLowerCase().replace(/\s+/g,"_");
  }

  function taskIsActive(task){
    const s=String(task && task.status || "").toLowerCase();
    return ["pending","queued","running","working","in_progress","started","executing"].includes(s);
  }

  function taskFor(name){
    return tasks
      .filter(t=>String(t && t.agent_name || "")===String(name))
      .sort((a,b)=>String(b && b.created_at || "").localeCompare(String(a && a.created_at || "")))[0] || null;
  }

  function activeTaskFor(name){
    return tasks
      .filter(t=>String(t && t.agent_name || "")===String(name) && taskIsActive(t))
      .sort((a,b)=>String(b && b.created_at || "").localeCompare(String(a && a.created_at || "")))[0] || null;
  }

  function activeTask(agent){
    return activeTaskFor(agent && agent.name);
  }

  function collaborationMap(){
    const groups = new Map();
    tasks.filter(taskIsActive).forEach(t=>{
      const key = t && (t.mission_id || t.parent_task_id || t.task_group_id || t.collaboration_id);
      if(!key) return;
      const bucket=groups.get(String(key)) || [];
      if(t.agent_name && !bucket.includes(String(t.agent_name))) bucket.push(String(t.agent_name));
      groups.set(String(key),bucket);
    });
    return groups;
  }

  function explicitBriefingMembers(){
    const groups=collaborationMap();
    const result=new Map();
    groups.forEach(members=>{
      if(members.length<2) return;
      members.forEach(name=>result.set(name,members));
    });
    return result;
  }

  function agentState(agent){
    const status=String(agent && agent.status || "").toLowerCase();
    if(status==="disabled") return "disabled";
    if(["error","failed","failure"].includes(status)) return "error";
    const active=activeTask(agent);
    if(active || ["working","running","busy","executing"].includes(status)){
      const members=explicitBriefingMembers().get(String(agent && agent.name));
      if(members && members.length>1) return "briefing";
      return "working";
    }
    return "idle";
  }

  function deskFor(agent){
    const key=normalizedName(agent);
    const s=STATIONS[key] || [0,0.2,0];
    return new THREE.Vector3(s[0],0.20,s[2]);
  }

  function stationFor(agent){
    const desk=deskFor(agent);
    return new THREE.Vector3(desk.x,0.20,desk.z+0.92);
  }

  function workZoneFor(agent){
    const key=normalizedName(agent);
    const s=WORK_ZONES[key] || [0,0.2,0];
    return new THREE.Vector3(s[0],s[1],s[2]);
  }

  function briefingPoint(){
    return new THREE.Vector3(0,0.25,0.9);
  }

  function ambientMoverCount(){
    let count=0;
    actors.forEach(actor=>{
      if(actor && (actor.targetMode==="ambient" || actor.targetMode==="ambient-return")) count++;
    });
    return count;
  }

  function ambientPointFor(actor){
    const idx=agents.indexOf(actor.agent);
    const trip=actor.ambientTripCount||0;
    const entry=AMBIENT_POINTS[(Math.max(idx,0)+trip)%AMBIENT_POINTS.length];
    return new THREE.Vector3(entry.point[0],entry.point[1],entry.point[2]);
  }

  function distance(a,b){
    return a.distanceTo(b);
  }

  function setOverlay(message, kind){
    const overlay=document.getElementById("officeLivingStatusOverlay");
    if(!overlay) return;
    overlay.className="office-living-overlay " + (kind || "");
    overlay.textContent=message || "";
    overlay.hidden=!message;
  }

  function updateStats(){
    let working=0,errors=0,idle=0,disabled=0;
    agents.forEach(a=>{
      const s=agentState(a);
      if(s==="working" || s==="briefing") working++;
      else if(s==="error") errors++;
      else if(s==="disabled") disabled++;
      else idle++;
    });
    const values={
      officeTotal:agents.length,
      officeWorking:working,
      officeIdle:idle,
      officeErrors:errors,
      officeDisabled:disabled,
      officeSync:lastPoll?new Date(lastPoll).toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit",second:"2-digit"}):"—"
    };
    Object.keys(values).forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.textContent=String(values[id]);
    });
  }

  function renderList(){
    const list=document.getElementById("officeAgentList");
    if(!list) return;
    if(!agents.length){
      list.innerHTML='<div class="office-empty">No hay agentes disponibles para esta sesión.</div>';
      updateDetail(null);
      return;
    }
    list.innerHTML=agents.map((a,i)=>{
      const s=agentState(a);
      const t=taskFor(a.name);
      const color=AGENT_COLORS[i%AGENT_COLORS.length];
      const extra=t && t.tool_name ? " · " + t.tool_name : "";
      return '<button class="office-agent-row '+(selectedName===a.name?"is-selected":"")+'" data-agent="'+esc(a.name)+'">'+
        '<span class="office-agent-dot" style="--agent-color:'+color+'"></span>'+
        '<span class="office-agent-row-main"><strong>'+esc(a.name)+'</strong><small>'+esc(stateMeta[s].label+extra)+'</small></span>'+
        '<span class="office-agent-state '+s+'">'+esc(stateMeta[s].label)+'</span>'+
      '</button>';
    }).join("");
    list.querySelectorAll(".office-agent-row").forEach(btn=>{
      btn.addEventListener("click",()=>selectAgent(btn.dataset.agent));
    });
    if(selectedName) updateDetail(selectedName);
  }

  function updateDetail(name){
    const detail=document.getElementById("officeAgentDetail");
    if(!detail) return;
    const a=getAgent(name);
    if(!a){
      detail.innerHTML='<div class="office-empty">Selecciona un agente en la Oficina.</div>';
      return;
    }
    const s=agentState(a);
    const task=taskFor(name);
    const tools=Array.isArray(a.allowed_tools)?a.allowed_tools.join(", "):"No especificadas";
    const taskText=task ? (task.tool_name || task.status || "registrada") : "Sin tarea reciente";
    detail.innerHTML=
      '<div class="office-detail-head"><span class="office-agent-chip '+s+'">'+esc(stateMeta[s].label)+'</span><strong>'+esc(a.name)+'</strong></div>'+
      '<div class="office-detail-grid">'+
        '<div><span>Rol</span><b>'+esc(a.role||"—")+'</b></div>'+
        '<div><span>Estado real</span><b>'+esc(a.status||"—")+'</b></div>'+
      '</div>'+
      '<div class="office-detail-block"><span>Tarea reciente</span><b>'+esc(taskText)+'</b></div>'+
      '<div class="office-detail-block"><span>Herramientas autorizadas</span><b>'+esc(tools)+'</b></div>'+
      '<div class="office-detail-block"><span>Movimiento</span><b>'+esc(s==="working"||s==="briefing"?"Actividad sincronizada con tarea":"Presencia en estación + desplazamientos ambientales puntuales")+'</b></div>';
  }

  function selectAgent(name){
    selectedName=name;
    renderList();
    actors.forEach((actor,agentName)=>{
      if(actor.root) actor.root.userData.selected = String(agentName)===String(name);
    });
  }

  async function loadModules(){
    if(THREE && GLTFLoader && OrbitControls && skeletonClone) return;
    setOverlay("Cargando motor visual…","loading");
    const results=await Promise.all([
      import(MODULE_BASE+"/build/three.module.js"),
      import(MODULE_BASE+"/examples/jsm/loaders/GLTFLoader.js"),
      import(MODULE_BASE+"/examples/jsm/controls/OrbitControls.js"),
      import(MODULE_BASE+"/examples/jsm/utils/SkeletonUtils.js")
    ]);
    THREE=results[0];
    GLTFLoader=results[1].GLTFLoader;
    OrbitControls=results[2].OrbitControls;
    skeletonClone=results[3].clone;
  }

  function makeMaterial(color, roughness, metalness, transparent, opacity){
    return new THREE.MeshStandardMaterial({
      color:new THREE.Color(color),
      roughness:roughness==null?0.55:roughness,
      metalness:metalness==null?0.1:metalness,
      transparent:!!transparent,
      opacity:opacity==null?1:opacity,
      depthWrite:transparent?false:true
    });
  }

  function addBox(group,size,pos,mat){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(size[0],size[1],size[2]),mat);
    mesh.position.set(pos[0],pos[1],pos[2]);
    group.add(mesh);
    return mesh;
  }

  function createRoom(profile){
    scene.background=new THREE.Color("#dce5ec");
    scene.fog=new THREE.Fog("#dce5ec",24,48);

    const ambient=new THREE.HemisphereLight("#f7fbff","#68727d",3.0);
    scene.add(ambient);

    const key=new THREE.DirectionalLight("#fffaf0",3.8);
    key.position.set(7,13,8);
    if(!profile.mobile){
      key.castShadow=true;
      key.shadow.mapSize.set(1024,1024);
    }
    scene.add(key);

    const rim=new THREE.PointLight("#9aaeff",3.2,26,2);
    rim.position.set(0,6,-5);
    scene.add(rim);

    const warm=new THREE.PointLight("#ffd29a",3.8,20,2);
    warm.position.set(-7,4,4);
    scene.add(warm);

    const floor=new THREE.Mesh(
      new THREE.PlaneGeometry(28,24),
      makeMaterial("#59636e",0.82,0.08,false,1)
    );
    floor.rotation.x=-Math.PI/2;
    floor.receiveShadow=!profile.mobile;
    scene.add(floor);

    const floorGlow=new THREE.Mesh(
      new THREE.CircleGeometry(6.2,64),
      new THREE.MeshBasicMaterial({color:"#9aa7b6",transparent:true,opacity:.07})
    );
    floorGlow.rotation.x=-Math.PI/2;
    floorGlow.position.y=0.012;
    scene.add(floorGlow);

    const backWall=addBox(scene,[26,9,0.35],[0,4.5,-10.7],makeMaterial("#e6ebef",.74,.06,false,1));
    backWall.receiveShadow=!profile.mobile;

    // Glass-like side structures.
    const glassMat=new THREE.MeshStandardMaterial({
      color:new THREE.Color("#5b6ee1"),
      roughness:.3,metalness:.45,transparent:true,opacity:.055,depthWrite:false
    });
    addBox(scene,[0.16,7,22],[-11.8,3.5,0],glassMat);
    addBox(scene,[0.16,7,22],[11.8,3.5,0],glassMat);

    // A bright, recognizable office interior instead of a dark technical stage.
    addBox(scene,[25.6,3.0,.18],[0,1.65,-10.46],makeMaterial("#c8d1d8",.76,.04,false,1));
    addBox(scene,[25.6,2.1,.20],[0,4.25,-10.46],makeMaterial("#dfe5e9",.76,.03,false,1));
    addBox(scene,[25.6,.14,.22],[0,3.18,-10.32],makeMaterial("#7f91a6",.52,.12,false,1));

    const windowFrame=makeMaterial("#778695",.52,.32,false,1);
    const windowGlass=new THREE.MeshStandardMaterial({color:new THREE.Color("#b9d9e9"),roughness:.18,metalness:.12,transparent:true,opacity:.34,depthWrite:false});
    for(let i=0;i<5;i++){
      const x=-9.8+i*4.9;
      addBox(scene,[4.35,3.7,.05],[x,5.25,-10.42],windowGlass);
      addBox(scene,[.08,3.85,.12],[x-2.2,5.25,-10.34],windowFrame);
      addBox(scene,[.08,3.85,.12],[x+2.2,5.25,-10.34],windowFrame);
    }

    addBox(scene,[26,.16,22],[0,7.0,0],makeMaterial("#f1f3f5",.9,.02,false,1));

    // City silhouette.
    for(let i=0;i<24;i++){
      const x=-10.5+i*0.9;
      const height=1.4+(i%7)*0.72;
      const z=-10.2-(i%3)*0.35;
      const mat=makeMaterial(i%2?"#15243a":"#111d32",.92,.22,false,1);
      const b=addBox(scene,[0.62,height,0.7],[x,height/2+0.35,z],mat);
      ambientObjects.push({type:"building",mesh:b,phase:i*.6});
      const winMat=new THREE.MeshBasicMaterial({color:i%2?"#7be0ff":"#ffd7a1",transparent:true,opacity:.22});
      for(let r=0;r<Math.max(1,Math.floor(height/1.6));r++){
        const w=addBox(scene,[0.08,0.06,0.02],[x-0.12,height-.6-r*.65,z-0.37],winMat);
        ambientObjects.push({type:"window",mesh:w,phase:i*1.1+r*.8});
      }
    }

    // Human-scale wall decor: whiteboards, framed panels and a warm accent strip.
    const boardFrame=makeMaterial("#697786",.5,.18,false,1);
    const board=makeMaterial("#f5f7f8",.86,.02,false,1);
    for(let i=0;i<3;i++){
      const x=-8.0+i*8.0;
      addBox(scene,[3.1,1.65,.08],[x,4.65,-10.20],boardFrame);
      addBox(scene,[2.82,1.37,.04],[x,4.65,-10.14],board);
      for(let j=0;j<4;j++) addBox(scene,[.55,.035,.025],[x-1.0+j*.65,4.45+(j%2)*.24,-10.10],makeMaterial(j%2?"#8aa0b6":"#c59b6b",.7,.04,false,1));
    }
    const accent=makeMaterial("#a7b9c8",.58,.06,false,1);
    addBox(scene,[5.2,1.9,.08],[-8.2,3.55,-10.12],accent);
    addBox(scene,[5.2,1.9,.08],[8.2,3.55,-10.12],makeMaterial("#c9b9a5",.58,.05,false,1));

    // Ceiling light bands.
    for(let i=0;i<5;i++){
      const line=new THREE.Mesh(
        new THREE.BoxGeometry(3.4,0.045,0.10),
        new THREE.MeshBasicMaterial({color:i%2?"#ffffff":"#dff4ff",transparent:true,opacity:.9})
      );
      line.position.set(-7+i*3.5,6.82,0.5);
      line.userData.phase=i*.8;
      scene.add(line);
      ambientObjects.push({type:"ceiling",mesh:line,phase:i*.8});
    }

    // Plants and soft air movement.
    for(let p=0;p<12;p++){
      const x=-9+(p%6)*3.6;
      const z=-7.7+Math.floor(p/6)*4.9;
      const stem=new THREE.Group();
      stem.position.set(x,0,z);
      const pot=addBox(stem,[0.55,0.45,0.55],[0,0.23,0],makeMaterial("#20303b",.65,.15,false,1));
      const green=new THREE.MeshStandardMaterial({color:"#3fbf8f",roughness:.85,metalness:0});
      for(let l=0;l<5;l++){
        const leaf=new THREE.Mesh(new THREE.SphereGeometry(0.24,10,7),green);
        leaf.scale.set(0.55,1.3,0.9);
        leaf.position.set(Math.cos(l*1.4)*.35,.55+l*.18,Math.sin(l*1.4)*.35);
        stem.add(leaf);
        ambientObjects.push({type:"leaf",mesh:leaf,phase:p*.6+l*.37});
      }
      stem.add(pot);
      scene.add(stem);
    }

    createCore(profile);
    createStations(profile);
    createOfficeLife(profile);
    createAmbientParticles(profile);
  }

  function createCore(profile){
    coreGroup=new THREE.Group();
    coreGroup.position.set(0,1.25,0);
    scene.add(coreGroup);

    const orbMat=new THREE.MeshStandardMaterial({
      color:"#6c5ce7",emissive:"#5a49f0",emissiveIntensity:1.7,
      roughness:.2,metalness:.55,transparent:true,opacity:.92
    });
    const orb=new THREE.Mesh(new THREE.SphereGeometry(1.28,profile.mobile?18:28,profile.mobile?18:28),orbMat);
    coreGroup.add(orb);
    coreMaterials.push(orbMat);

    const shellMat=new THREE.MeshStandardMaterial({
      color:"#8e7dff",emissive:"#6c5ce7",emissiveIntensity:.6,
      roughness:.12,metalness:.8,transparent:true,opacity:.17,depthWrite:false
    });
    const shell=new THREE.Mesh(new THREE.SphereGeometry(1.55,profile.mobile?16:24,profile.mobile?16:24),shellMat);
    coreGroup.add(shell);
    coreMaterials.push(shellMat);

    for(let i=0;i<3;i++){
      const ring=new THREE.Mesh(
        new THREE.TorusGeometry(1.72+i*.23,0.018,6,96),
        new THREE.MeshBasicMaterial({color:i===1?"#63e6be":"#8e7dff",transparent:true,opacity:.65})
      );
      ring.rotation.x=Math.PI*.5;
      ring.rotation.z=i*.9;
      coreGroup.add(ring);
      ambientObjects.push({type:"coreRing",mesh:ring,phase:i*.9});
    }

    const point=new THREE.PointLight("#8e7dff",6,9,2);
    coreGroup.add(point);
  }

  function createStations(profile){
    Object.keys(STATIONS).forEach((key,index)=>{
      const s=STATIONS[key];
      const g=new THREE.Group();
      g.position.set(s[0],0,s[2]);
      g.userData.role=key;

      const baseMat=makeMaterial(index%2?"#7b8792":"#687786",.64,.24,false,1);
      const desk=addBox(g,[2.4,0.18,1.25],[0,1.0,0],baseMat);
      desk.castShadow=!profile.mobile;
      desk.receiveShadow=!profile.mobile;

      const legMat=makeMaterial("#101722",.78,.42,false,1);
      addBox(g,[0.12,1.0,0.12],[-1.0,.5,-.45],legMat);
      addBox(g,[0.12,1.0,0.12],[1.0,.5,-.45],legMat);
      addBox(g,[0.12,1.0,0.12],[-1.0,.5,.45],legMat);
      addBox(g,[0.12,1.0,0.12],[1.0,.5,.45],legMat);

      const screen=new THREE.Mesh(
        new THREE.BoxGeometry(1.05,.62,.08),
        new THREE.MeshStandardMaterial({
          color:"#eef4f8",emissive:"#6f9dff",emissiveIntensity:.65,
          roughness:.38,metalness:.55
        })
      );
      screen.position.set(0,1.52,-.28);
      screen.rotation.x=-.08;
      g.add(screen);
      ambientObjects.push({type:"screen",mesh:screen,phase:index*.8});

      const chair=new THREE.Mesh(
        new THREE.BoxGeometry(.74,.12,.70),
        makeMaterial("#566372",.56,.22,false,1)
      );
      chair.position.set(0,.72,.85);
      g.add(chair);

      scene.add(g);
    });
  }

  function createOfficeLife(profile){
    // Small office infrastructure makes the room read as a place where people
    // actually spend time: meeting area, coffee point, printer, glass wall and lights.
    const warmMat=makeMaterial("#7b8793",.62,.18,false,1);
    const metalMat=makeMaterial("#d7dde4",.42,.28,false,1);
    const softMat=makeMaterial("#6f7f91",.68,.14,false,1);

    // Coffee / break corner.
    const coffee=new THREE.Group();
    coffee.position.set(-8.2,0,-1.0);
    addBox(coffee,[1.9,1.05,.78],[0,.53,0],warmMat);
    addBox(coffee,[1.35,.10,.62],[0,1.12,0],metalMat);
    addBox(coffee,[.22,.65,.22],[-.62,1.42,-.12],metalMat);
    addBox(coffee,[.22,.65,.22],[.58,1.42,-.12],metalMat);
    const cupMat=makeMaterial("#c9d3e8",.58,.05,false,1);
    for(let i=0;i<3;i++){
      const cup=new THREE.Mesh(new THREE.CylinderGeometry(.07,.08,.14,10),cupMat);
      cup.position.set(-.4+i*.35,1.19,.05);
      coffee.add(cup);
    }
    scene.add(coffee);

    // Printer / operations station.
    const printer=new THREE.Group();
    printer.position.set(8.0,0,-1.1);
    addBox(printer,[1.25,.78,.88],[0,.40,0],softMat);
    addBox(printer,[.95,.10,.54],[0,.84,0],metalMat);
    addBox(printer,[.60,.05,.35],[0,.90,.04],cupMat);
    scene.add(printer);

    // Small meeting table with chairs.
    const meet=new THREE.Group();
    meet.position.set(0,0,-7.3);
    addBox(meet,[4.1,.18,1.35],[0,.93,0],softMat);
    for(const x of [-1.5,-.75,.75,1.5]){
      addBox(meet,[.55,.12,.55],[x,.63,.0],warmMat);
    }
    scene.add(meet);

    // Soft wall panels + glass meeting room feel.
    const panelMat=new THREE.MeshStandardMaterial({
      color:new THREE.Color("#24354b"),
      roughness:.48,metalness:.18,transparent:true,opacity:.32,depthWrite:false
    });
    for(let i=0;i<4;i++){
      addBox(scene,[2.8,.08,.08],[-4.8+i*3.2,5.0,-10.48],panelMat);
    }
    const glassDoorMat=new THREE.MeshStandardMaterial({
      color:new THREE.Color("#7c9cff"),
      roughness:.22,metalness:.38,transparent:true,opacity:.09,depthWrite:false
    });
    addBox(scene,[5.2,4.0,.08],[0,3.0,-10.3],glassDoorMat);

    // Ceiling fixtures give a readable office ceiling and softer pools of light.
    for(let i=0;i<3;i++){
      const fixture=new THREE.Mesh(
        new THREE.BoxGeometry(3.0,.08,1.05),
        new THREE.MeshBasicMaterial({color:"#eef5ff",transparent:true,opacity:.24})
      );
      fixture.position.set(-5+i*5,6.0,-1.5);
      scene.add(fixture);
      const point=new THREE.PointLight("#e8f3ff",1.15,9,2);
      point.position.set(-5+i*5,5.7,-1.5);
      scene.add(point);
    }
  }

  function createAmbientParticles(profile){
    const count=profile.mobile?260:520;
    const positions=new Float32Array(count*3);
    const speeds=new Float32Array(count);
    for(let i=0;i<count;i++){
      positions[i*3]=(-11)+Math.random()*22;
      positions[i*3+1]=0.5+Math.random()*6.4;
      positions[i*3+2]=(-9)+Math.random()*18;
      speeds[i]=0.04+Math.random()*0.08;
    }
    const geom=new THREE.BufferGeometry();
    geom.setAttribute("position",new THREE.BufferAttribute(positions,3));
    const mat=new THREE.PointsMaterial({color:"#c8d9ff",size:profile.mobile?.045:.055,transparent:true,opacity:profile.mobile?.28:.38,depthWrite:false});
    const points=new THREE.Points(geom,mat);
    points.userData.speeds=speeds;
    scene.add(points);
    ambientObjects.push({type:"air",mesh:points,phase:1});
  }

  function chooseAnimation(animations, patterns){
    if(!Array.isArray(animations) || !animations.length) return null;
    const normalized=animations.map(a=>({clip:a,name:String(a.name||"").toLowerCase()}));
    for(const pattern of patterns){
      const p=String(pattern).toLowerCase();
      const hit=normalized.find(x=>x.name===p || x.name.includes(p));
      if(hit) return hit.clip;
    }
    return animations[0];
  }

  function prepareTemplate(gltf){
    const root=gltf.scene;
    root.traverse(obj=>{
      if(obj.isMesh){
        obj.castShadow=true;
        obj.receiveShadow=true;
      }
    });
    return {
      scene:root,
      animations:Array.isArray(gltf.animations)?gltf.animations:[]
    };
  }

  async function loadModels(){
    const loader=new GLTFLoader();
    const entries=Object.entries(MODEL_SOURCES);
    await Promise.all(entries.map(async ([key,url])=>{
      try{
        const gltf=await new Promise((resolve,reject)=>{
          loader.load(url,resolve,undefined,reject);
        });
        modelTemplates.set(key,prepareTemplate(gltf));
      }catch(err){
        console.warn("[akira-office-living] model failed",key,err);
      }
    }));
    if(!modelTemplates.size){
      throw new Error("No se pudo cargar ningún personaje 3D.");
    }
  }

  function makeActor(agent){
    const key=ROLE_MODEL[normalizedName(agent)] || "business";
    const template=modelTemplates.get(key) || modelTemplates.values().next().value;
    if(!template) return null;

    const root=new THREE.Group();
    root.userData.agentName=String(agent.name||"");
    root.userData.selected=false;
    root.position.copy(stationFor(agent));
    root.position.y=.2;
    root.scale.setScalar(.92);

    const model=skeletonClone(template.scene);
    const tint=AGENT_COLORS[agents.indexOf(agent)%AGENT_COLORS.length];
    model.traverse(obj=>{
      if(!obj.isMesh) return;
      obj.castShadow=!reducedMotion;
      obj.receiveShadow=!reducedMotion;
      if(obj.material && obj.material.color){
        const original=obj.material.color.clone();
        const mixed=original.lerp(new THREE.Color(tint),.12);
        obj.material.color.copy(mixed);
      }
    });
    root.add(model);

    const mixer=new THREE.AnimationMixer(model);
    const idle=chooseAnimation(template.animations,["idle_loop","idle","idle_2"]);
    const walk=chooseAnimation(template.animations,["walk_loop","walk","run"]);
    const work=chooseAnimation(template.animations,["work","typing","interact","use","talk"]);
    const sitEnter=chooseAnimation(template.animations,["sitting_enter","sitdown","sit_down"]);
    const sitIdle=chooseAnimation(template.animations,["sitting_idle","sit_idle","sitting"]);
    const sitTalk=chooseAnimation(template.animations,["sitting_talking","sit_talk","talking"]);
    const sitExit=chooseAnimation(template.animations,["sitting_exit","situp","stand_up"]);
    const talk=chooseAnimation(template.animations,["talk","talking","idle_2","idle"]);

    const actor={
      agent,
      root,
      model,
      mixer,
      clips:{idle,walk,work,sitEnter,sitIdle,sitTalk,sitExit,talk},
      action:null,
      target:stationFor(agent),
      targetMode:"station",
      desiredState:agentState(agent),
      speed:1.15+(agents.indexOf(agent)%3)*.10,
      lastState:null,
      ambientTripCount:0,
      ambientStage:"station",
      ambientHoldUntil:0,
      ambientNextAt:performance.now()+18000+agents.indexOf(agent)*2600,
      baseScale:.92,
      seated:true,
      transitionUntil:0,
      transitionKind:"",
      ambientPath:[],
      ambientPathIndex:0
    };

    root.userData.actor=actor;
    scene.add(root);
    actors.set(String(agent.name),actor);
    playActorClip(actor,"idle",true,.25);
    return actor;
  }

  function playActorClip(actor,kind,loop,crossfade){
    const clip=actor && actor.clips ? actor.clips[kind] : null;
    if(!clip) return;
    if(actor.action && actor.action.getClip && actor.action.getClip()===clip) return;
    const next=actor.mixer.clipAction(clip);
    next.reset();
    next.enabled=true;
    next.setLoop(loop?THREE.LoopRepeat:THREE.LoopOnce,loop?Infinity:1);
    next.clampWhenFinished=!loop;
    if(actor.action){
      next.crossFadeFrom(actor.action,crossfade==null?.25:crossfade,true);
    }
    next.play();
    actor.action=next;
  }

  function orientToward(actor,target,alpha){
    const dx=target.x-actor.root.position.x;
    const dz=target.z-actor.root.position.z;
    if(Math.hypot(dx,dz)<.01) return;
    const angle=Math.atan2(dx,dz);
    let d=angle-actor.root.rotation.y;
    while(d>Math.PI)d-=Math.PI*2;
    while(d<-Math.PI)d+=Math.PI*2;
    actor.root.rotation.y+=d*Math.min(1,alpha);
  }

  function buildAmbientPath(actor,target){
    const p=actor.root.position;
    const t=target;
    const side=t.x>=0?8.9:-8.9;
    const path=[
      new THREE.Vector3(side,0.20,p.z),
      new THREE.Vector3(side,0.20,t.z),
      new THREE.Vector3(t.x,0.20,t.z)
    ];
    return path.filter((v,i)=>i===0 || distance(v,path[i-1])>.5);
  }

  function beginStand(actor,now){
    if(!actor || actor.transitionKind==="stand") return;
    actor.seated=false;
    actor.transitionKind="stand";
    actor.transitionUntil=now+900;
    if(actor.clips.sitExit) playActorClip(actor,"sitExit",false,.12);
  }

  function beginSit(actor,now){
    if(!actor || actor.seated || actor.transitionKind==="sit") return;
    actor.transitionKind="sit";
    actor.transitionUntil=now+900;
    if(actor.clips.sitEnter) playActorClip(actor,"sitEnter",false,.12);
  }

  function updateActorGoal(actor,now){
    const s=agentState(actor.agent);
    const previous=actor.desiredState;
    actor.desiredState=s;

    if(s==="disabled"){
      actor.root.visible=false;
      actor.target=null;
      return;
    }
    actor.root.visible=true;

    if(s==="briefing" && previous==="idle") beginStand(actor,now);

    if(s==="briefing"){
      actor.target=briefingPoint();
      actor.targetMode="briefing";
      actor.ambientPath=[];
      return;
    }
    if(s==="working"){
      actor.target=stationFor(actor.agent);
      actor.targetMode="work";
      actor.ambientPath=[];
      return;
    }

    if(actor.targetMode==="ambient"){
      if(actor.ambientPath.length && actor.ambientPathIndex<actor.ambientPath.length-1 && distance(actor.root.position,actor.ambientPath[actor.ambientPathIndex])<.42){
        actor.ambientPathIndex++;
      }
      actor.target=actor.ambientPath[actor.ambientPathIndex] || ambientPointFor(actor);
      if(distance(actor.root.position,actor.target)<.42 && actor.ambientPathIndex>=actor.ambientPath.length-1){
        actor.targetMode="ambient-return";
        actor.ambientStage="return";
        actor.target=stationFor(actor.agent);
        actor.ambientPath=[];
      }
      return;
    }

    if(actor.targetMode==="ambient-return"){
      actor.target=stationFor(actor.agent);
      if(distance(actor.root.position,actor.target)<.42){
        actor.targetMode="station";
        actor.ambientStage="station";
        actor.ambientNextAt=now+IDLE_AMBIENT_GAP_MS+(agents.indexOf(actor.agent)%3)*5000;
        beginSit(actor,now);
      }
      return;
    }

    actor.targetMode="station";
    actor.target=stationFor(actor.agent);
    if(distance(actor.root.position,actor.target)<.42) beginSit(actor,now);

    if(now>=actor.ambientNextAt && ambientMoverCount()===0 && !reducedMotion && actor.seated){
      actor.ambientTripCount=(actor.ambientTripCount||0)+1;
      const destination=ambientPointFor(actor);
      actor.ambientPath=buildAmbientPath(actor,destination);
      actor.ambientPathIndex=0;
      actor.target=actor.ambientPath[0];
      actor.targetMode="ambient";
      actor.ambientStage="outbound";
      actor.ambientHoldUntil=now+IDLE_AMBIENT_HOLD_MS;
      beginStand(actor,now);
    }
  }

  function updateCore(now){
    if(!coreGroup) return;
    const pulse=.5+.5*Math.sin(now*.0015);
    coreGroup.rotation.y+=(reducedMotion?0:.0022);
    const scale=1+(.025*pulse);
    coreGroup.scale.setScalar(scale);
    coreMaterials.forEach((m,i)=>{
      if(m.emissiveIntensity!==undefined) m.emissiveIntensity=(i===0?1.55:0.55)+pulse*(i===0?.35:.16);
    });
  }

  function updateAmbient(now){
    ambientObjects.forEach(item=>{
      if(!item.mesh) return;
      const phase=item.phase||0;
      if(item.type==="leaf"){
        item.mesh.rotation.z=reducedMotion?0:Math.sin(now*.0014+phase)*.08;
      }else if(item.type==="screen"){
        const m=item.mesh.material;
        if(m && "emissiveIntensity" in m) m.emissiveIntensity=.8+(.45*(.5+.5*Math.sin(now*.003+phase)));
      }else if(item.type==="ceiling"){
        item.mesh.material.opacity=.58+.18*(.5+.5*Math.sin(now*.002+phase));
      }else if(item.type==="coreRing"){
        if(!reducedMotion) item.mesh.rotation.z+=.003*(1+phase);
      }else if(item.type==="air"){
        const pos=item.mesh.geometry.attributes.position;
        const arr=pos.array;
        for(let i=0;i<arr.length;i+=3){
          const baseY=arr[i+1];
          arr[i+1]=0.5+((baseY + now*.00012*(item.mesh.userData.speeds?item.mesh.userData.speeds[i/3]||.06:.06))-0.5)%6.4;
          arr[i]+=reducedMotion?0:Math.sin(now*.0004+i)*.0005;
        }
        pos.needsUpdate=true;
      }else if(item.type==="window"){
        item.mesh.material.opacity=.15+.12*(.5+.5*Math.sin(now*.0017+phase));
      }else if(item.type==="building"){
        if(!reducedMotion) item.mesh.position.y += Math.sin(now*.00035+phase)*.00015;
      }
    });
  }

  function ensureCoreLinks(){
    if(coreLinksGroup) return;
    coreLinksGroup=new THREE.Group();
    coreLinksGroup.name="officeCoreLinks";
    scene.add(coreLinksGroup);
  }

  function removeCoreLink(name){
    const entry=coreLinkLines.get(String(name));
    if(!entry) return;
    try{ entry.geometry.dispose(); }catch(_){}
    try{ entry.material.dispose(); }catch(_){}
    coreLinksGroup.remove(entry);
    coreLinkLines.delete(String(name));
  }

  function updateCoreLinks(){
    // Keep link objects stable and only update their tiny position buffer.
    // Rebuilding geometry on every animation frame is deliberately avoided.
    ensureCoreLinks();
    const liveNames=new Set();

    actors.forEach((actor,i)=>{
      const name=String(actor.agent && actor.agent.name || "");
      if(!name || !actor.root.visible) return;
      liveNames.add(name);

      let line=coreLinkLines.get(name);
      if(!line){
        const positions=new Float32Array(6);
        const geometry=new THREE.BufferGeometry();
        geometry.setAttribute("position",new THREE.BufferAttribute(positions,3));
        const material=new THREE.LineBasicMaterial({
          color:new THREE.Color(AGENT_COLORS[i%AGENT_COLORS.length]),
          transparent:true,
          opacity:.10
        });
        line=new THREE.Line(geometry,material);
        coreLinkLines.set(name,line);
        coreLinksGroup.add(line);
      }

      const attr=line.geometry.getAttribute("position");
      const arr=attr.array;
      arr[0]=0; arr[1]=1.25; arr[2]=0;
      arr[3]=actor.root.position.x;
      arr[4]=1.0;
      arr[5]=actor.root.position.z;
      attr.needsUpdate=true;

      const active=actor.desiredState==="working"||actor.desiredState==="briefing";
      line.material.opacity=active?.46:.10;
      line.material.color.set(active?AGENT_COLORS[i%AGENT_COLORS.length]:"#2c3b58");
    });

    [...coreLinkLines.keys()].forEach(name=>{
      if(!liveNames.has(name)) removeCoreLink(name);
    });
  }

  function handleSelection(event){
    if(!renderer || !camera || !scene) return;
    const rect=canvas.getBoundingClientRect();
    const x=((event.clientX-rect.left)/rect.width)*2-1;
    const y=-((event.clientY-rect.top)/rect.height)*2+1;
    pointer.set(x,y);
    raycaster.setFromCamera(pointer,camera);
    const objects=[];
    actors.forEach(actor=>{
      if(actor.root.visible) actor.root.traverse(o=>{if(o.isMesh) objects.push(o);});
    });
    const hits=raycaster.intersectObjects(objects,true);
    if(!hits.length) return;
    let obj=hits[0].object;
    while(obj && !obj.userData.actor) obj=obj.parent;
    if(obj && obj.userData.actor){
      selectAgent(obj.userData.agentName);
    }
  }

  async function poll(){
    if(fetchBusy || paused) return;
    fetchBusy=true;
    try{
      const headers=authHeaders();
      const [ar,tr]=await Promise.all([
        fetch(backend()+"/api/v8/agents",{headers,cache:"no-store"}),
        fetch(backend()+"/api/v8/tasks?limit=100",{headers,cache:"no-store"})
      ]);
      if(ar.status===401 && typeof window.akiraHandleAuthFailure==="function") window.akiraHandleAuthFailure(401);
      if(tr.status===401 && typeof window.akiraHandleAuthFailure==="function") window.akiraHandleAuthFailure(401);

      if(ar.ok){
        const data=await ar.json();
        agents=Array.isArray(data && data.agents)?data.agents:[];
      }
      if(tr.ok){
        const data=await tr.json();
        tasks=Array.isArray(data && data.tasks)?data.tasks:[];
      }

      if(ar.ok || tr.ok) lastPoll=Date.now();
      updateStats();
      renderList();

      // Add any new agent actor once modules/models are ready.
      agents.forEach(a=>{
        const key=String(a && a.name || "");
        if(key && !actors.has(key)) makeActor(a);
      });

      setOverlay("", "");
      window.dispatchEvent(new CustomEvent("akira:office-living-sync",{detail:{agents:agents.length,tasks:tasks.length,lastPoll}}));
    }catch(err){
      console.warn("[akira-office-living] poll",err);
      if(!actors.size) setOverlay("La Oficina no pudo sincronizar agentes. La escena no inventará estados.","error");
    }finally{
      fetchBusy=false;
    }
  }

  function rendererSize(){
    if(!renderer || !camera || !stage) return;
    const rect=stage.getBoundingClientRect();
    const w=Math.max(320,Math.floor(rect.width));
    const h=Math.max(420,Math.floor(rect.height));
    renderer.setSize(w,h,false);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
  }

  function animate(ts){
    raf=requestAnimationFrame(animate);
    if(!initialized) return;
    if(paused){
      renderer.render(scene,camera);
      return;
    }
    if(!currentSceneTime) currentSceneTime=ts;
    const delta=Math.min(.05,(ts-currentSceneTime)/1000);
    currentSceneTime=ts;

    updateCore(ts);
    updateAmbient(ts);
    actors.forEach(actor=>updateActor(actor,delta,ts));
    updateCoreLinks();

    controls.update();
    renderer.render(scene,camera);
  }

  function installResize(){
    if(typeof ResizeObserver==="function"){
      resizeObserver=new ResizeObserver(rendererSize);
      resizeObserver.observe(stage);
    }else{
      window.addEventListener("resize",rendererSize,{passive:true});
    }
  }

  function installControls(){
    controls=new OrbitControls(camera,renderer.domElement);
    controls.enableDamping=true;
    controls.dampingFactor=.06;
    controls.minDistance=11;
    controls.maxDistance=24;
    controls.target.set(0,1.4,0);
    controls.enablePan=false;
    controls.autoRotate=false;
    controls.touchAction="pan-y";
  }

  function installEvents(){
    raycaster=new THREE.Raycaster();
    pointer=new THREE.Vector2();
    canvas.addEventListener("pointerup",handleSelection,{passive:true});

    const btn=document.getElementById("officePause");
    const refresh=document.getElementById("officeRefresh");
    if(btn){
      btn.onclick=()=>{
        paused=!paused;
        btn.textContent=paused?"Reanudar":"Pausar";
        btn.setAttribute("aria-pressed",paused?"true":"false");
        if(!paused) currentSceneTime=performance.now();
        if(!paused) poll();
      };
    }
    if(refresh) refresh.onclick=()=>poll();

    window.addEventListener("resize",rendererSize,{passive:true});
  }

  function applyReducedMotion(){
    reducedMotion=!!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const mq=window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    if(mq && mq.addEventListener) mq.addEventListener("change",ev=>{reducedMotion=ev.matches;});
  }

  function getProfile(){
    const coarse=window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const narrow=Math.min(window.innerWidth||9999,window.innerHeight||9999)<=900;
    const mobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||"");
    return {
      mobile:!!(coarse && (narrow||mobile)),
      pixelRatio:Math.min(window.devicePixelRatio||1,1.6)
    };
  }

  function exposeDebug(){
    window.akiraOfficeLivingDebug={
      get initialized(){return initialized;},
      get actorCount(){return actors.size;},
      get agentCount(){return agents.length;},
      get states(){
        const out={};
        agents.forEach(a=>{out[String(a.name)]=agentState(a);});
        return out;
      },
      pause(){paused=true;},
      resume(){paused=false;}
    };
  }

  window.initOfficeFloor=async function(){
    const sec=document.getElementById("officeSection");
    stage=document.querySelector("#officeSection .office-v2-stage");
    canvas=document.getElementById("officeCanvas");
    if(!sec || !stage || !canvas) return;
    if(initialized) return;

    try{
      await loadModules();

      if(!document.getElementById("officeLivingStatusOverlay")){
        const overlay=document.createElement("div");
        overlay.id="officeLivingStatusOverlay";
        overlay.className="office-living-overlay";
        overlay.hidden=true;
        stage.appendChild(overlay);
      }

      const profile=getProfile();
      reducedMotion=!!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

      renderer=new THREE.WebGLRenderer({
        canvas,
        antialias:!profile.mobile,
        alpha:false,
        powerPreference:"high-performance"
      });
      renderer.setPixelRatio(profile.pixelRatio);
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure=1.22;

      scene=new THREE.Scene();
      camera=new THREE.PerspectiveCamera(42,1,.1,80);
      camera.position.set(0,9.6,17.8);

      installControls();
      createRoom(profile);
      installEvents();
      applyReducedMotion();
      installResize();
      rendererSize();

      setOverlay("Cargando personajes…","loading");
      await loadModels();

      agents.forEach(a=>makeActor(a));
      updateStats();
      renderList();
      exposeDebug();

      initialized=true;
      currentSceneTime=performance.now();
      setOverlay("", "");

      if(!pollTimer){
        pollTimer=window.setInterval(()=>{
          const current=document.getElementById("officeSection");
          if(current && current.classList.contains("active")) poll();
        },POLL_MS);
      }

      poll();
      if(!raf) raf=requestAnimationFrame(animate);

    }catch(err){
      console.error("[akira-office-living] init",err);
      setOverlay("La vista 3D no pudo iniciarse en este dispositivo. Revisa la consola si persiste.","error");
      if(canvas){
        const ctx=canvas.getContext && canvas.getContext("2d");
        if(ctx){
          ctx.fillStyle="#09111c";
          ctx.fillRect(0,0,canvas.width||720,canvas.height||520);
          ctx.fillStyle="#c8d9ff";
          ctx.font="600 16px system-ui";
          ctx.fillText("Oficina 3D no disponible",24,40);
          ctx.font="13px system-ui";
          ctx.fillStyle="#91a4be";
          ctx.fillText("La interfaz conserva el estado real de agentes y tareas.",24,66);
        }
      }
    }
  };

  window.addEventListener("beforeunload",()=>{
    if(raf) cancelAnimationFrame(raf);
    if(pollTimer) clearInterval(pollTimer);
    if(resizeObserver) resizeObserver.disconnect();
    if(renderer) renderer.dispose();
  });
})();  function updateActor(actor,delta,now){
    const nowMs=performance.now();
    updateActorGoal(actor,nowMs);
    const s=actor.desiredState;

    if(s==="disabled"){
      actor.mixer.stopAllAction();
      return;
    }

    if(actor.transitionKind){
      if(nowMs<actor.transitionUntil){
        playActorClip(actor,actor.transitionKind==="stand"?"sitExit":"sitEnter",false,.08);
        actor.mixer.update(delta);
        return;
      }
      if(actor.transitionKind==="sit") actor.seated=true;
      actor.transitionKind="";
    }

    const target=actor.target;
    if(target){
      const dist=distance(actor.root.position,target);
      if(dist>.38){
        const speedBoost=s==="working"?1.12:(s==="briefing"?1.02:1.0);
        const ambientSpeed=(actor.targetMode==="ambient"||actor.targetMode==="ambient-return") ? 0.70 : speedBoost;
        const step=Math.min(dist,actor.speed*ambientSpeed*delta);
        actor.root.position.lerp(target,step/Math.max(dist,.0001));
        orientToward(actor,target,Math.min(1,delta*7));
        playActorClip(actor,"walk",true,.18);
      }else if(s==="briefing"){
        actor.seated=false;
        orientToward(actor,briefingPoint(),Math.min(1,delta*4));
        playActorClip(actor,actor.clips.talk?"talk":"idle",true,.22);
      }else if(s==="working"){
        actor.seated=true;
        orientToward(actor,deskFor(actor.agent),Math.min(1,delta*4));
        playActorClip(actor,actor.clips.sitIdle?"sitIdle":"work",true,.22);
      }else if(actor.targetMode==="ambient"){
        playActorClip(actor,"idle",true,.32);
      }else{
        actor.seated=true;
        orientToward(actor,deskFor(actor.agent),Math.min(1,delta*4));
        playActorClip(actor,actor.clips.sitIdle?"sitIdle":"idle",true,.25);
      }
    }

    actor.root.position.y=.2;
    const sway=reducedMotion?0:Math.sin(nowMs*.0011+agents.indexOf(actor.agent)*.71)*.008;
    actor.model.rotation.z=sway;
    if(actor.root.userData.selected){
      actor.root.scale.setScalar(actor.baseScale*(1+(.025+Math.sin(nowMs*.004)*.012)));
    }else{
      actor.root.scale.setScalar(actor.baseScale);
    }
    actor.mixer.update(delta);
  }

  function updateCore(now){
    if(!coreGroup) return;
    const pulse=.5+.5*Math.sin(now*.0015);
    coreGroup.rotation.y+=(reducedMotion?0:.0022);
    const scale=1+(.025*pulse);
    coreGroup.scale.setScalar(scale);
    coreMaterials.forEach((m,i)=>{
      if(m.emissiveIntensity!==undefined) m.emissiveIntensity=(i===0?1.55:0.55)+pulse*(i===0?.35:.16);
    });
  }

  function updateAmbient(now){
    ambientObjects.forEach(item=>{
      if(!item.mesh) return;
      const phase=item.phase||0;
      if(item.type==="leaf"){
        item.mesh.rotation.z=reducedMotion?0:Math.sin(now*.0014+phase)*.08;
      }else if(item.type==="screen"){
        const m=item.mesh.material;
        if(m && "emissiveIntensity" in m) m.emissiveIntensity=.8+(.45*(.5+.5*Math.sin(now*.003+phase)));
      }else if(item.type==="ceiling"){
        item.mesh.material.opacity=.58+.18*(.5+.5*Math.sin(now*.002+phase));
      }else if(item.type==="coreRing"){
        if(!reducedMotion) item.mesh.rotation.z+=.003*(1+phase);
      }else if(item.type==="air"){
        const pos=item.mesh.geometry.attributes.position;
        const arr=pos.array;
        for(let i=0;i<arr.length;i+=3){
          const baseY=arr[i+1];
          arr[i+1]=0.5+((baseY + now*.00012*(item.mesh.userData.speeds?item.mesh.userData.speeds[i/3]||.06:.06))-0.5)%6.4;
          arr[i]+=reducedMotion?0:Math.sin(now*.0004+i)*.0005;
        }
        pos.needsUpdate=true;
      }else if(item.type==="window"){
        item.mesh.material.opacity=.15+.12*(.5+.5*Math.sin(now*.0017+phase));
      }else if(item.type==="building"){
        if(!reducedMotion) item.mesh.position.y += Math.sin(now*.00035+phase)*.00015;
      }
    });
  }

  function ensureCoreLinks(){
    if(coreLinksGroup) return;
    coreLinksGroup=new THREE.Group();
    coreLinksGroup.name="officeCoreLinks";
    scene.add(coreLinksGroup);
  }

  function removeCoreLink(name){
    const entry=coreLinkLines.get(String(name));
    if(!entry) return;
    try{ entry.geometry.dispose(); }catch(_){}
    try{ entry.material.dispose(); }catch(_){}
    coreLinksGroup.remove(entry);
    coreLinkLines.delete(String(name));
  }

  function updateCoreLinks(){
    // Keep link objects stable and only update their tiny position buffer.
    // Rebuilding geometry on every animation frame is deliberately avoided.
    ensureCoreLinks();
    const liveNames=new Set();

    actors.forEach((actor,i)=>{
      const name=String(actor.agent && actor.agent.name || "");
      if(!name || !actor.root.visible) return;
      liveNames.add(name);

      let line=coreLinkLines.get(name);
      if(!line){
        const positions=new Float32Array(6);
        const geometry=new THREE.BufferGeometry();
        geometry.setAttribute("position",new THREE.BufferAttribute(positions,3));
        const material=new THREE.LineBasicMaterial({
          color:new THREE.Color(AGENT_COLORS[i%AGENT_COLORS.length]),
          transparent:true,
          opacity:.10
        });
        line=new THREE.Line(geometry,material);
        coreLinkLines.set(name,line);
        coreLinksGroup.add(line);
      }

      const attr=line.geometry.getAttribute("position");
      const arr=attr.array;
      arr[0]=0; arr[1]=1.25; arr[2]=0;
      arr[3]=actor.root.position.x;
      arr[4]=1.0;
      arr[5]=actor.root.position.z;
      attr.needsUpdate=true;

      const active=actor.desiredState==="working"||actor.desiredState==="briefing";
      line.material.opacity=active?.46:.10;
      line.material.color.set(active?AGENT_COLORS[i%AGENT_COLORS.length]:"#2c3b58");
    });

    [...coreLinkLines.keys()].forEach(name=>{
      if(!liveNames.has(name)) removeCoreLink(name);
    });
  }

  function handleSelection(event){
    if(!renderer || !camera || !scene) return;
    const rect=canvas.getBoundingClientRect();
    const x=((event.clientX-rect.left)/rect.width)*2-1;
    const y=-((event.clientY-rect.top)/rect.height)*2+1;
    pointer.set(x,y);
    raycaster.setFromCamera(pointer,camera);
    const objects=[];
    actors.forEach(actor=>{
      if(actor.root.visible) actor.root.traverse(o=>{if(o.isMesh) objects.push(o);});
    });
    const hits=raycaster.intersectObjects(objects,true);
    if(!hits.length) return;
    let obj=hits[0].object;
    while(obj && !obj.userData.actor) obj=obj.parent;
    if(obj && obj.userData.actor){
      selectAgent(obj.userData.agentName);
    }
  }

  async function poll(){
    if(fetchBusy || paused) return;
    fetchBusy=true;
    try{
      const headers=authHeaders();
      const [ar,tr]=await Promise.all([
        fetch(backend()+"/api/v8/agents",{headers,cache:"no-store"}),
        fetch(backend()+"/api/v8/tasks?limit=100",{headers,cache:"no-store"})
      ]);
      if(ar.status===401 && typeof window.akiraHandleAuthFailure==="function") window.akiraHandleAuthFailure(401);
      if(tr.status===401 && typeof window.akiraHandleAuthFailure==="function") window.akiraHandleAuthFailure(401);

      if(ar.ok){
        const data=await ar.json();
        agents=Array.isArray(data && data.agents)?data.agents:[];
      }
      if(tr.ok){
        const data=await tr.json();
        tasks=Array.isArray(data && data.tasks)?data.tasks:[];
      }

      if(ar.ok || tr.ok) lastPoll=Date.now();
      updateStats();
      renderList();

      // Add any new agent actor once modules/models are ready.
      agents.forEach(a=>{
        const key=String(a && a.name || "");
        if(key && !actors.has(key)) makeActor(a);
      });

      setOverlay("", "");
      window.dispatchEvent(new CustomEvent("akira:office-living-sync",{detail:{agents:agents.length,tasks:tasks.length,lastPoll}}));
    }catch(err){
      console.warn("[akira-office-living] poll",err);
      if(!actors.size) setOverlay("La Oficina no pudo sincronizar agentes. La escena no inventará estados.","error");
    }finally{
      fetchBusy=false;
    }
  }

  function rendererSize(){
    if(!renderer || !camera || !stage) return;
    const rect=stage.getBoundingClientRect();
    const w=Math.max(320,Math.floor(rect.width));
    const h=Math.max(420,Math.floor(rect.height));
    renderer.setSize(w,h,false);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
  }

  function animate(ts){
    raf=requestAnimationFrame(animate);
    if(!initialized) return;
    if(paused){
      renderer.render(scene,camera);
      return;
    }
    if(!currentSceneTime) currentSceneTime=ts;
    const delta=Math.min(.05,(ts-currentSceneTime)/1000);
    currentSceneTime=ts;

    updateCore(ts);
    updateAmbient(ts);
    actors.forEach(actor=>updateActor(actor,delta,ts));
    updateCoreLinks();

    controls.update();
    renderer.render(scene,camera);
  }

  function installResize(){
    if(typeof ResizeObserver==="function"){
      resizeObserver=new ResizeObserver(rendererSize);
      resizeObserver.observe(stage);
    }else{
      window.addEventListener("resize",rendererSize,{passive:true});
    }
  }

  function installControls(){
    controls=new OrbitControls(camera,renderer.domElement);
    controls.enableDamping=true;
    controls.dampingFactor=.06;
    controls.minDistance=11;
    controls.maxDistance=24;
    controls.target.set(0,1.4,0);
    controls.enablePan=false;
    controls.autoRotate=false;
    controls.touchAction="pan-y";
  }

  function installEvents(){
    raycaster=new THREE.Raycaster();
    pointer=new THREE.Vector2();
    canvas.addEventListener("pointerup",handleSelection,{passive:true});

    const btn=document.getElementById("officePause");
    const refresh=document.getElementById("officeRefresh");
    if(btn){
      btn.onclick=()=>{
        paused=!paused;
        btn.textContent=paused?"Reanudar":"Pausar";
        btn.setAttribute("aria-pressed",paused?"true":"false");
        if(!paused) currentSceneTime=performance.now();
        if(!paused) poll();
      };
    }
    if(refresh) refresh.onclick=()=>poll();

    window.addEventListener("resize",rendererSize,{passive:true});
  }

  function applyReducedMotion(){
    reducedMotion=!!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const mq=window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    if(mq && mq.addEventListener) mq.addEventListener("change",ev=>{reducedMotion=ev.matches;});
  }

  function getProfile(){
    const coarse=window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const narrow=Math.min(window.innerWidth||9999,window.innerHeight||9999)<=900;
    const mobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||"");
    return {
      mobile:!!(coarse && (narrow||mobile)),
      pixelRatio:Math.min(window.devicePixelRatio||1,1.6)
    };
  }

  function exposeDebug(){
    window.akiraOfficeLivingDebug={
      get initialized(){return initialized;},
      get actorCount(){return actors.size;},
      get agentCount(){return agents.length;},
      get states(){
        const out={};
        agents.forEach(a=>{out[String(a.name)]=agentState(a);});
        return out;
      },
      pause(){paused=true;},
      resume(){paused=false;}
    };
  }

  window.initOfficeFloor=async function(){
    const sec=document.getElementById("officeSection");
    stage=document.querySelector("#officeSection .office-v2-stage");
    canvas=document.getElementById("officeCanvas");
    if(!sec || !stage || !canvas) return;
    if(initialized) return;

    try{
      await loadModules();

      if(!document.getElementById("officeLivingStatusOverlay")){
        const overlay=document.createElement("div");
        overlay.id="officeLivingStatusOverlay";
        overlay.className="office-living-overlay";
        overlay.hidden=true;
        stage.appendChild(overlay);
      }

      const profile=getProfile();
      reducedMotion=!!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

      renderer=new THREE.WebGLRenderer({
        canvas,
        antialias:!profile.mobile,
        alpha:false,
        powerPreference:"high-performance"
      });
      renderer.setPixelRatio(profile.pixelRatio);
      renderer.outputColorSpace=THREE.SRGBColorSpace;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure=1.22;

      scene=new THREE.Scene();
      camera=new THREE.PerspectiveCamera(42,1,.1,80);
      camera.position.set(0,9.6,17.8);

      installControls();
      createRoom(profile);
      installEvents();
      applyReducedMotion();
      installResize();
      rendererSize();

      setOverlay("Cargando personajes…","loading");
      await loadModels();

      agents.forEach(a=>makeActor(a));
      updateStats();
      renderList();
      exposeDebug();

      initialized=true;
      currentSceneTime=performance.now();
      setOverlay("", "");

      if(!pollTimer){
        pollTimer=window.setInterval(()=>{
          const current=document.getElementById("officeSection");
          if(current && current.classList.contains("active")) poll();
        },POLL_MS);
      }

      poll();
      if(!raf) raf=requestAnimationFrame(animate);

    }catch(err){
      console.error("[akira-office-living] init",err);
      setOverlay("La vista 3D no pudo iniciarse en este dispositivo. Revisa la consola si persiste.","error");
      if(canvas){
        const ctx=canvas.getContext && canvas.getContext("2d");
        if(ctx){
          ctx.fillStyle="#09111c";
          ctx.fillRect(0,0,canvas.width||720,canvas.height||520);
          ctx.fillStyle="#c8d9ff";
          ctx.font="600 16px system-ui";
          ctx.fillText("Oficina 3D no disponible",24,40);
          ctx.font="13px system-ui";
          ctx.fillStyle="#91a4be";
          ctx.fillText("La interfaz conserva el estado real de agentes y tareas.",24,66);
        }
      }
    }
  };

  window.addEventListener("beforeunload",()=>{
    if(raf) cancelAnimationFrame(raf);
    if(pollTimer) clearInterval(pollTimer);
    if(resizeObserver) resizeObserver.disconnect();
    if(renderer) renderer.dispose();
  });
})();
