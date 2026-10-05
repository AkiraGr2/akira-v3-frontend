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
    business: "https://static.poly.pizza/e599abbe-7d73-488c-9d7e-3ead281e705c.glb",
    woman: "https://static.poly.pizza/ba7a1955-ea51-4cb9-a561-188bdef0a6c7.glb",
    hoodie: "https://static.poly.pizza/bcd66ec5-5e81-4901-a222-47abc875fe2a.glb",
    worker: "https://static.poly.pizza/3a5f3056-ffe6-42eb-bd52-122afcbd22b2.glb"
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

  function stationFor(agent){
    const key=normalizedName(agent);
    const s=STATIONS[key] || [0,0.2,0];
    return new THREE.Vector3(s[0],s[1],s[2]);
  }

  function workZoneFor(agent){
    const key=normalizedName(agent);
    const s=WORK_ZONES[key] || [0,0.2,0];
    return new THREE.Vector3(s[0],s[1],s[2]);
  }

  function briefingPoint(){
    return new THREE.Vector3(0,0.25,0.9);
  }

  function randomIdleTarget(actor){
    const base=stationFor(actor.agent);
    const radius=1.1;
    return new THREE.Vector3(
      base.x + (Math.random()*2-1)*radius,
      0.2,
      base.z + (Math.random()*2-1)*radius
    );
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
      '<div class="office-detail-block"><span>Movimiento</span><b>'+esc(s==="working"||s==="briefing"?"Actividad sincronizada con tarea":"Movimiento ambiental de presencia")+'</b></div>';
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
    scene.background=new THREE.Color("#071018");
    scene.fog=new THREE.Fog("#071018",22,44);

    const ambient=new THREE.HemisphereLight("#d8e8ff","#0a0e16",1.75);
    scene.add(ambient);

    const key=new THREE.DirectionalLight("#fff5df",2.5);
    key.position.set(7,13,8);
    if(!profile.mobile){
      key.castShadow=true;
      key.shadow.mapSize.set(1024,1024);
    }
    scene.add(key);

    const rim=new THREE.PointLight("#7c9cff",7,26,2);
    rim.position.set(0,6,-5);
    scene.add(rim);

    const warm=new THREE.PointLight("#ffb36b",6,18,2);
    warm.position.set(-7,4,4);
    scene.add(warm);

    const floor=new THREE.Mesh(
      new THREE.PlaneGeometry(28,24),
      makeMaterial("#0b1420",0.82,0.18,false,1)
    );
    floor.rotation.x=-Math.PI/2;
    floor.receiveShadow=!profile.mobile;
    scene.add(floor);

    const floorGlow=new THREE.Mesh(
      new THREE.CircleGeometry(6.2,64),
      new THREE.MeshBasicMaterial({color:"#2b225d",transparent:true,opacity:.18})
    );
    floorGlow.rotation.x=-Math.PI/2;
    floorGlow.position.y=0.012;
    scene.add(floorGlow);

    const backWall=addBox(scene,[26,9,0.35],[0,4.5,-10.7],makeMaterial("#101b2a",.72,.16,false,1));
    backWall.receiveShadow=!profile.mobile;

    // Glass-like side structures.
    const glassMat=new THREE.MeshStandardMaterial({
      color:new THREE.Color("#5b6ee1"),
      roughness:.3,metalness:.45,transparent:true,opacity:.055,depthWrite:false
    });
    addBox(scene,[0.16,7,22],[-11.8,3.5,0],glassMat);
    addBox(scene,[0.16,7,22],[11.8,3.5,0],glassMat);

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

    // Ceiling light bands.
    for(let i=0;i<5;i++){
      const line=new THREE.Mesh(
        new THREE.BoxGeometry(3.4,0.045,0.10),
        new THREE.MeshBasicMaterial({color:i%2?"#6e7cff":"#63e6be",transparent:true,opacity:.75})
      );
      line.position.set(-7+i*3.5,6.2,0.5);
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

      const baseMat=makeMaterial(index%2?"#17243a":"#1a2031",.64,.35,false,1);
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
          color:"#101b2a",emissive:"#3d64f3",emissiveIntensity:1.0,
          roughness:.38,metalness:.55
        })
      );
      screen.position.set(0,1.52,-.28);
      screen.rotation.x=-.08;
      g.add(screen);
      ambientObjects.push({type:"screen",mesh:screen,phase:index*.8});

      const chair=new THREE.Mesh(
        new THREE.BoxGeometry(.74,.12,.70),
        makeMaterial("#2b3146",.56,.30,false,1)
      );
      chair.position.set(0,.72,.85);
      g.add(chair);

      scene.add(g);
    });
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
    const idle=chooseAnimation(template.animations,["idle","idle_2"]);
    const walk=chooseAnimation(template.animations,["walk","run"]);
    const work=chooseAnimation(template.animations,["work","typing","interact","use","talk","idle_2","idle"]);
    const talk=chooseAnimation(template.animations,["talk","talking","idle_2","idle"]);

    const actor={
      agent,
      root,
      model,
      mixer,
      clips:{idle,walk,work,talk},
      action:null,
      target:stationFor(agent),
      targetMode:"station",
      desiredState:agentState(agent),
      speed:1.9+(agents.indexOf(agent)%3)*.18,
      roamAt:0,
      lastState:null,
      baseScale:.92
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

  function updateActorGoal(actor,now){
    const s=agentState(actor.agent);
    actor.desiredState=s;

    if(s==="disabled"){
      actor.root.visible=false;
      actor.target=null;
      return;
    }
    actor.root.visible=true;

    if(s==="briefing"){
      actor.target=briefingPoint();
      actor.targetMode="briefing";
      return;
    }
    if(s==="working"){
      actor.target=workZoneFor(actor.agent);
      actor.targetMode="work";
      return;
    }

    actor.targetMode="roam";
    if(!actor.target || actor.roamAt<now || distance(actor.root.position,actor.target)<.45){
      actor.target=randomIdleTarget(actor);
      actor.roamAt=now+5500+Math.random()*6000;
    }
  }

  function updateActor(actor,delta,now){
    updateActorGoal(actor,now);
    const s=actor.desiredState;

    if(s==="disabled"){
      actor.mixer.stopAllAction();
      return;
    }

    const target=actor.target;
    if(target){
      const dist=distance(actor.root.position,target);
      if(dist>.38){
        const step=Math.min(dist,actor.speed*delta);
        actor.root.position.lerp(target,step/Math.max(dist,.0001));
        orientToward(actor,target,Math.min(1,delta*7));
        playActorClip(actor,"walk",true,.18);
      }else{
        orientToward(actor, s==="briefing"?briefingPoint():workZoneFor(actor.agent),Math.min(1,delta*4));
        if(s==="working") playActorClip(actor,"work",true,.22);
        else if(s==="briefing") playActorClip(actor,"talk",true,.22);
        else playActorClip(actor,"idle",true,.32);
      }
    }

    if(s==="idle" && reducedMotion===false){
      actor.root.position.y=.2+Math.sin(now*.0016+agents.indexOf(actor.agent))*.012;
    }else{
      actor.root.position.y=.2;
    }

    // Tiny natural body sway. It is presentation, never used as state.
    const sway=reducedMotion?0:Math.sin(now*.0011+agents.indexOf(actor.agent)*.71)*.012;
    actor.model.rotation.z=sway;

    if(actor.root.userData.selected){
      actor.root.scale.setScalar(actor.baseScale*(1+(.025+Math.sin(now*.004)*.012)));
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

  function updateCoreLinks(){
    // Recreate only a small, lightweight connection field.
    const old=scene.getObjectByName("officeCoreLinks");
    if(old) scene.remove(old);
    const group=new THREE.Group();
    group.name="officeCoreLinks";
    actors.forEach((actor,i)=>{
      if(!actor.root.visible) return;
      const active=actor.desiredState==="working"||actor.desiredState==="briefing";
      const color=new THREE.Color(active?AGENT_COLORS[i%AGENT_COLORS.length]:"#2c3b58");
      const points=[new THREE.Vector3(0,1.25,0),actor.root.position.clone().setY(1.0)];
      const geom=new THREE.BufferGeometry().setFromPoints(points);
      const line=new THREE.Line(
        geom,
        new THREE.LineBasicMaterial({color,transparent:true,opacity:active?.46:.10})
      );
      group.add(line);
    });
    scene.add(group);
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
      renderer.toneMappingExposure=1.08;

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
