/* AKIRA OFFICE — Pixel Living V1
 * Canonical 2D production view.
 * Grid: 32x24 tiles, logical tile 32x32. Rendered at 512x384 and upscaled.
 * Uses the same /api/v8/agents + /api/v8/tasks truth sources as the existing
 * 3D office. Ambient motion is explicitly presentation-only.
 */
(function(){
  "use strict";

  const W=32,H=24,T=16,RENDER_W=W*T,RENDER_H=H*T;
  const BACKEND_FALLBACK="https://akira-empresa.onrender.com";
  const POLL_MS=8000;

  const DESIGN=[
    {name:"Akira",role:"Supervisor",color:"#c7a6ff",home:[13,7]},
    {name:"Luna",role:"Investigación",color:"#ff72ae",home:[5,7]},
    {name:"Nexo",role:"Desarrollo",color:"#78b7ff",home:[9,11]},
    {name:"Nova",role:"Creatividad",color:"#e8d7ff",home:[17,11]},
    {name:"Orion",role:"Análisis",color:"#d69a68",home:[18,13]},
    {name:"Kaori",role:"Organización",color:"#d7d7ff",home:[23,12]},
    {name:"Zeri",role:"Soporte",color:"#9eafff",home:[21,16]},
    {name:"Lyra",role:"Estrategia",color:"#62d8d0",home:[25,9]},
    {name:"Dante",role:"Desactivado",color:"#6d7185",home:[6,17],disabled:true}
  ];

  const NODES={
    entrada:[27,18],sur:[22,17],lounge:[10,17],centro:[16,13],norte:[16,9],
    akira:[13,7],tablero:[21,7],cafe:[27,7],impresora:[15,11],reunion:[21,12],
    luna:[5,7],nexo:[9,11],nova:[17,11],orion:[18,13],kaori:[23,12],
    zeri:[21,16],lyra:[25,9],dante:[6,17]
  };

  const EDGES=[
    ["entrada","sur"],["sur","lounge"],["sur","zeri"],["zeri","reunion"],
    ["reunion","orion"],["reunion","norte"],["norte","akira"],["norte","tablero"],
    ["tablero","cafe"],["norte","impresora"],["impresora","nexo"],["nexo","luna"],
    ["nexo","nova"],["norte","kaori"],["kaori","lyra"],["lounge","dante"]
  ];

  const PATHS={};
  EDGES.forEach(([a,b])=>{(PATHS[a]||(PATHS[a]=[])).push(b);(PATHS[b]||(PATHS[b]=[])).push(a);});

  let canvas,ctx,stage,initialized=false,raf=0,last=0,paused=false,selected="";
  let agents=DESIGN.map((a)=>({...a,status:a.disabled?"disabled":"idle",task:null,pos:{x:a.home[0],y:a.home[1]},route:[],routeIndex:0,wait:Math.random()*3}));
  let tasks=[];
  let backend=localStorage.getItem("akira_backend_url")||BACKEND_FALLBACK;
  let truthSummary={loaded:false,total:0,working:0,idle:0,error:0,disabled:0};
  let eventText="Oficina iniciada · movimiento ambiental activado";
  let eventUntil=0;
  let lastPoll=0;

  const el=id=>document.getElementById(id);
  function say(text,ms=3500){eventText=text;eventUntil=performance.now()+ms;renderHud();}

  function authHeaders(){
    try{
      if(typeof window.akiraAuthHeaders==="function") return window.akiraAuthHeaders();
    }catch(_){}
    return {};
  }

  function findDesign(name){
    return DESIGN.find(d=>String(d.name).toLowerCase()===String(name).toLowerCase());
  }

  function truthState(a){
    const s=String(a && a.status || "").toLowerCase();
    if(s==="disabled") return "disabled";
    if(["error","failed","failure"].includes(s)) return "error";
    const active=tasks.find(t=>String(t.agent_name||"").toLowerCase()===String(a.name||"").toLowerCase() &&
      ["running","working","executing","in_progress","active"].includes(String(t.status||"").toLowerCase()));
    if(active || ["working","running","busy","executing"].includes(s)) return "working";
    return "idle";
  }

  function syncTruth(){
    const byName=new Map((agents||[]).map(a=>[String(a.name||"").toLowerCase(),a]));
    agents=agents.map(a=>{
      const real=byName.get(a.name.toLowerCase());
      if(!real) return a;
      const state=truthState(real);
      return {...a,status:state,real:true,task:tasks.find(t=>String(t.agent_name||"").toLowerCase()===a.name.toLowerCase())||null};
    });
  }

  async function poll(){
    try{
      const [ar,tr]=await Promise.all([
        fetch(backend+"/api/v8/agents",{headers:authHeaders(),cache:"no-store"}),
        fetch(backend+"/api/v8/tasks?limit=100",{headers:authHeaders(),cache:"no-store"})
      ]);
      if(ar.ok){
        const data=await ar.json();
        const real=Array.isArray(data&&data.agents)?data.agents:[];
        const mapped=real.map((r,i)=>{
          const d=findDesign(r.name)||DESIGN[i%8];
          return {...d,name:String(r.name||d.name),role:String(r.role||d.role),status:truthState(r),real:true,task:null,
            pos:{x:d.home[0],y:d.home[1]},route:[],routeIndex:0,wait:i*.8};
        });
        // Keep the creative nine-slot preview if the backend returns fewer agents;
        // real records still take precedence for matching names.
        const merged=DESIGN.map(d=>{
          const match=real.find(r=>String(r.name||"").toLowerCase()===d.name.toLowerCase());
          if(!match) return {...d,status:d.disabled?"disabled":"idle",real:false,pos:{x:d.home[0],y:d.home[1]},route:[],routeIndex:0,wait:Math.random()*3};
          return mapped.find(x=>x.name.toLowerCase()===d.name.toLowerCase()) || {...d,real:true};
        });
        agents=merged;
        syncTruth();
        lastPoll=Date.now();
        truthSummary.loaded=true;
      }
      if(tr.ok){
        const data=await tr.json();
        tasks=Array.isArray(data&&data.tasks)?data.tasks:[];
        syncTruth();
      }
      if(truthSummary.loaded){
        const realAgents=agents.filter(a=>a.real===true);
        truthSummary.total=realAgents.length;
        truthSummary.working=realAgents.filter(a=>a.status==="working").length;
        truthSummary.error=realAgents.filter(a=>a.status==="error").length;
        truthSummary.disabled=realAgents.filter(a=>a.status==="disabled").length;
        truthSummary.idle=realAgents.length-truthSummary.working-truthSummary.error-truthSummary.disabled;
      }
      renderHud();
    }catch(_){
      // Visual layer remains usable as a design preview; no fake backend state is claimed.
      agents.forEach(a=>a.real=false);
      renderHud();
    }
  }

  function nodeNameFor(agent){
    const d=findDesign(agent.name);
    if(d) return agent.name.toLowerCase();
    return "centro";
  }

  function nearestNode(p){
    let best="centro",bd=Infinity;
    Object.entries(NODES).forEach(([k,v])=>{const dd=Math.hypot(v[0]-p.x,v[1]-p.y);if(dd<bd){bd=dd;best=k;}});
    return best;
  }

  function shortestPath(from,to){
    if(from===to) return [from];
    const q=[from],prev=new Map([[from,null]]);
    while(q.length){
      const cur=q.shift();
      for(const nx of (PATHS[cur]||[])){
        if(prev.has(nx)) continue;
        prev.set(nx,cur);
        if(nx===to){
          const out=[];let x=to;
          while(x){out.unshift(x);x=prev.get(x);}
          return out;
        }
        q.push(nx);
      }
    }
    return [from];
  }

  function nodeRoute(agent,targetName){
    const from=nearestNode(agent.pos);
    const nodePath=shortestPath(from,targetName);
    const points=[];
    nodePath.forEach(n=>{const p=NODES[n];points.push({x:p[0],y:p[1]});});
    return points;
  }

  function assignRoute(agent,targetName){
    agent.route=nodeRoute(agent,targetName);
    agent.routeIndex=0;
    agent.targetNode=targetName;
  }

  function workTarget(agent){
    if(agent.status==="working") return nodeNameFor(agent);
    return null;
  }

  function ambientTarget(agent,index){
    const pool=["norte","sur","reunion","impresora","lounge","cafe","tablero","centro"];
    return pool[(Math.floor(performance.now()/6500)+index)%pool.length];
  }

  function updateAgent(agent,dt,index){
    if(agent.disabled || agent.status==="disabled") return;

    const work=workTarget(agent);
    if(work){
      if(agent.targetNode!==work || !agent.route.length) assignRoute(agent,work);
    }else if(!agent.route.length || agent.wait<=0){
      const target=ambientTarget(agent,index);
      assignRoute(agent,target);
      agent.wait=4.5+((index*1.7)%4);
    }else{
      agent.wait-=dt;
    }

    if(!agent.route.length) return;
    const target=agent.route[Math.min(agent.routeIndex,agent.route.length-1)];
    const dx=target.x-agent.pos.x,dy=target.y-agent.pos.y;
    const dist=Math.hypot(dx,dy);
    if(dist<.06){
      agent.pos.x=target.x;agent.pos.y=target.y;
      if(agent.routeIndex<agent.route.length-1) agent.routeIndex++;
      else if(!work) agent.route=[];
      return;
    }
    const speed=agent.status==="working"?.95:.62;
    const step=Math.min(dist,dt*speed);
    agent.pos.x+=(dx/dist)*step;
    agent.pos.y+=(dy/dist)*step;
  }

  function tileCenter(x,y){return {x:x*T+T/2,y:y*T+T/2};}

  function drawPixelRect(x,y,w,h,c){
    ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));
  }

  function drawFloor(){
    ctx.fillStyle="#0b1420";ctx.fillRect(0,0,RENDER_W,RENDER_H);
    for(let y=0;y<H;y++) for(let x=0;x<W;x++){
      const alt=(x+y)%2===0;
      drawPixelRect(x*T,y*T,T,T,alt?"#293344":"#252f3e");
    }
    // Rooms/walls
    const rooms=[
      [2,4,10,7,"#151f2d"],[16,4,10,7,"#141f2e"],[28,4,3,7,"#182231"],
      [2,14,10,6,"#142031"],[13,14,9,6,"#142132"],[23,14,8,6,"#152132"]
    ];
    rooms.forEach(r=>{drawPixelRect(r[0]*T,r[1]*T,r[2]*T,r[3]*T,r[4]);
      ctx.strokeStyle="#53617a";ctx.lineWidth=2;ctx.strokeRect(r[0]*T+.5,r[1]*T+.5,r[2]*T-1,r[3]*T-1);});
    // Corridors
    ctx.fillStyle="#3a4659";
    drawPixelRect(12*T,4*T,4*T,16*T,"#364254");
    drawPixelRect(2*T,11*T,29*T,3*T,"#3b4658");
    // Akira sign
    drawPixelRect(3*T,2*T,8*T,2*T,"#121a28");
    drawPixelRect(4*T,2.5*T,6*T,1*T,"#8b72ff");
    // windows
    for(let x=3;x<29;x+=4){
      drawPixelRect(x*T,0,3*T,2*T,(x/4)%2?"#1c3b59":"#203e5b");
      for(let k=0;k<3;k++) drawPixelRect((x+.5)*T,(.25+k*.45)*T,2*T,.12*T,"#6d9bc5");
    }
  }

  function drawFurniture(){
    const desks=[
      [4,6],[8,10],[16,10],[17,12],[22,11],[20,15],[24,8],[12,6]
    ];
    desks.forEach(([x,y],i)=>{
      drawPixelRect(x*T,y*T,3*T,1.3*T,"#5a3e35");
      drawPixelRect((x+.35)*T,(y-.65)*T,1.9*T,.65*T,"#172b40");
      drawPixelRect((x+.55)*T,(y-.53)*T,1.5*T,.42*T,i%2?"#2d8c9a":"#5968c5");
      drawPixelRect((x+.2)*T,(y+1.2)*T,.25*T,.6*T,"#222936");
      drawPixelRect((x+2.55)*T,(y+1.2)*T,.25*T,.6*T,"#222936");
    });
    // meeting table
    drawPixelRect(19*T,5*T,5*T,2*T,"#6a4a3e");
    for(let x=19.5;x<24;x+=1.4){drawPixelRect(x*T,4.4*T,.75*T,.45*T,"#283b55");drawPixelRect(x*T,7*T,.75*T,.45*T,"#283b55");}
    // lounge sofas
    [[4,16],[8,16],[5.5,17.5]].forEach(([x,y])=>{drawPixelRect(x*T,y*T,2.7*T,1.1*T,"#4c4164");drawPixelRect(x*T,(y-.35)*T,2.7*T,.4*T,"#655681");});
    // cafe
    drawPixelRect(26*T,15*T,4*T,1.2*T,"#725344");
    drawPixelRect(27*T,16.4*T,.6*T,.6*T,"#3b2a29");drawPixelRect(29*T,16.4*T,.6*T,.6*T,"#3b2a29");
    // printer
    drawPixelRect(14*T,10*T,1.5*T,1.5*T,"#d0d5dc");drawPixelRect(14.2*T,10.2*T,1.1*T,.35*T,"#4d6178");
    // plants
    [[3,13],[12,13],[25,13],[30,12],[11,5],[27,11]].forEach(([x,y])=>drawPlant(x*T,y*T));
    // mission board
    drawPixelRect(20*T,3*T,6*T,1.6*T,"#1b2940");
    drawPixelRect(20.4*T,3.25*T,5.2*T,1.05*T,"#354f78");
    ctx.fillStyle="#ffd166";ctx.fillRect(21*T,3.55*T,3*T,.12*T);
  }

  function drawPlant(x,y){
    drawPixelRect(x,y+5,6,6,"#765039");
    drawPixelRect(x-3,y,12,7,"#2c9c78");
    drawPixelRect(x+1,y-3,6,8,"#55c48f");
  }

  function drawPet(t){
    const x=14*T+Math.sin(t*.0006)*3*T,y=17*T;
    drawPixelRect(x,y,10,6,"#d98b55");
    drawPixelRect(x+7,y-3,6,7,"#eaa56b");
    drawPixelRect(x+9,y-4,2,2,"#fff");
    drawPixelRect(x+1,y+6,2,3,"#5e3b30");drawPixelRect(x+7,y+6,2,3,"#5e3b30");
    if(Math.sin(t*.004)>0.75) drawPixelRect(x+13,y-5,2,2,"#ff6b9a");
  }

  function drawCharacter(a,t,index){
    const p=tileCenter(a.pos.x,a.pos.y);
    const bob=(a.status==="working"?Math.sin(t*.006+index)*1.2:Math.sin(t*.004+index)*.6);
    const x=Math.round(p.x),y=Math.round(p.y+bob);
    const c=a.color;
    // shadow
    drawPixelRect(x-6,y+7,12,3,"#10151f");
    // legs/body
    drawPixelRect(x-4,y+1,3,7,"#30394b");drawPixelRect(x+1,y+1,3,7,"#30394b");
    drawPixelRect(x-6,y-4,12,7,c);
    // head/hair
    drawPixelRect(x-5,y-11,10,7,"#f0c3a3");
    drawPixelRect(x-6,y-13,12,5,a.name==="Luna"?"#ff5b9f":a.name==="Nova"?"#d9d6ff":a.name==="Lyra"?"#36b9b1":"#222938");
    // eyes
    drawPixelRect(x-3,y-8,2,2,"#111722");drawPixelRect(x+2,y-8,2,2,"#111722");
    if(a.status==="working") drawPixelRect(x+7,y-6,3,3,"#63e6be");
    if(a.status==="error") drawPixelRect(x+7,y-6,3,3,"#ff5d8f");
    if(selected===a.name){ctx.strokeStyle="#ffd166";ctx.lineWidth=2;ctx.strokeRect(x-9,y-15,18,25);}
  }

  function drawDante(t){
    const x=6*T+8,y=17*T+2;
    drawPixelRect(x-9,y+8,18,4,"#111722");
    drawPixelRect(x-7,y-2,14,9,"#6d7185");
    drawPixelRect(x-5,y-10,10,8,"#d4a98d");
    drawPixelRect(x-6,y-12,12,4,"#252b3a");
    // phone / magazine / sleep cycle
    const phase=Math.floor(t/5000)%4;
    if(phase===0) drawPixelRect(x+8,y-1,5,4,"#6d9bc5");
    if(phase===1) drawPixelRect(x+8,y,6,3,"#f0c66a");
    if(phase===2){drawPixelRect(x-12,y-9,4,2,"#eaf2ff");drawPixelRect(x+9,y-13,3,2,"#dbe7ff")}
    if(phase===3){drawPixelRect(x-3,y-16,2,2,"#eef4ff");drawPixelRect(x+2,y-19,3,2,"#eef4ff")}
    if(selected==="Dante"){ctx.strokeStyle="#ff5d8f";ctx.lineWidth=2;ctx.strokeRect(x-12,y-18,24,31);}
  }

  function drawLabels(){
    ctx.font="bold 7px monospace";
    agents.forEach(a=>{
      const p=tileCenter(a.pos.x,a.pos.y);
      const label=a.name+(a.real?"":" · diseño");
      const w=ctx.measureText(label).width+6;
      drawPixelRect(p.x-w/2,p.y-23,w,10,"#0a111d");
      ctx.strokeStyle=a.disabled?"#ff5d8f":"#425574";ctx.strokeRect(p.x-w/2+.5,p.y-22.5,w-1,9);
      ctx.fillStyle="#eef4ff";ctx.fillText(label,p.x-w/2+3,p.y-16);
    });
  }

  function drawScene(t){
    drawFloor();drawFurniture();
    agents.forEach((a,i)=>a.disabled?drawDante(t):drawCharacter(a,t,i));
    drawPet(t);drawLabels();
    // ambient particles
    for(let i=0;i<12;i++){
      const x=(i*83+Math.floor(t*.01))%RENDER_W,y=30+(i*47)%RENDER_H;
      ctx.fillStyle=i%3===0?"#63e6be":"#6d78b4";ctx.fillRect(x,y,1,1);
    }
  }

  function resize(){
    if(!canvas||!stage||!ctx)return;
    const rect=stage.getBoundingClientRect();
    // The office section is hidden during initial DOMContentLoaded. Do not
    // lock the canvas to a 0x0 CSS box; wait for the section to become visible.
    if(rect.width<2 || rect.height<2) return;
    canvas.style.width=rect.width+"px";
    canvas.style.height=rect.height+"px";
    // Keep the logical buffer fixed for crisp nearest-neighbor pixels.
    canvas.width=RENDER_W;
    canvas.height=RENDER_H;
    ctx.imageSmoothingEnabled=false;
  }

  function loop(ts){
    if(!initialized)return;
    const dt=Math.min(.05,(ts-last)/1000||0);last=ts;
    if(!paused){agents.forEach((a,i)=>updateAgent(a,dt,i));}
    drawScene(ts);
    raf=requestAnimationFrame(loop);
  }

  function renderHud(){
    const hud=el("officePixelHud");
    const ev=el("officePixelEvent");
    if(hud){
      if(truthSummary.loaded){
        hud.innerHTML="<strong>AKIRA PROJECT</strong><br>"+truthSummary.total+
          " registrados · "+truthSummary.working+" trabajando · "+truthSummary.idle+
          " disponibles";
      }else{
        const previewActive=agents.filter(a=>!a.disabled).length;
        hud.innerHTML="<strong>AKIRA PROJECT · PREVIEW</strong><br>"+previewActive+
          " activos · 1 en espera · estado backend no confirmado";
      }
    }
    if(ev) ev.textContent=eventText;
  }

  function selectAt(ev){
    if(!canvas)return;
    const r=canvas.getBoundingClientRect();
    const x=(ev.clientX-r.left)/r.width*RENDER_W;
    const y=(ev.clientY-r.top)/r.height*RENDER_H;
    let hit=null,best=18;
    agents.forEach(a=>{
      const p=tileCenter(a.pos.x,a.pos.y),d=Math.hypot(p.x-x,p.y-y);
      if(d<best){best=d;hit=a;}
    });
    if(hit){
      selected=hit.name;
      say(hit.name+" · "+hit.role+(hit.status==="working"?" · trabajando":hit.disabled?" · en espera":" · disponible"));
      return;
    }
    selected="";
  }

  function command(action){
    if(action==="mission"){
      selected="Akira";
      assignRoute(agents.find(a=>a.name==="Akira"),"tablero");
      say("Akira va al tablero de misiones · animación ambiental, no cambio de estado backend.");
    }else if(action==="coffee"){
      const picks=agents.filter(a=>!a.disabled).slice(1,4);
      picks.forEach(a=>assignRoute(a,"cafe"));
      say("Pausa de café · los agentes recorren rutas aprobadas.");
    }else if(action==="meeting"){
      agents.filter(a=>!a.disabled).forEach(a=>assignRoute(a,"reunion"));
      say("Reunión visual · los agentes convergen por el grafo de rutas.");
    }else if(action==="pet"){
      say("Kira corre por el corredor y vuelve al lounge.");
    }
  }

  function bind(){
    ["officePixelMission","officePixelCoffee","officePixelMeeting","officePixelPet"].forEach(id=>{
      const b=el(id);if(b)b.addEventListener("click",()=>command(id.replace("officePixel","").toLowerCase()));
    });
    if(canvas) canvas.addEventListener("click",selectAt);
    window.addEventListener("resize",resize,{passive:true});
  }

  window.initAkiraOfficePixel=async function(){
    if(initialized){
      resize();
      return;
    }
    stage=el("officePixelStage");canvas=el("officePixelCanvas");
    if(!stage||!canvas)return;
    ctx=canvas.getContext("2d");
    if(!ctx)return;
    ctx.imageSmoothingEnabled=false;
    bind();
    initialized=true;
    resize();
    renderHud();
    await poll();
    resize();
    last=performance.now();
    raf=requestAnimationFrame(loop);
  };

  window.resizeAkiraOfficePixel=function(){
    resize();
  };

  window.setAkiraOfficePixelPaused=function(v){
    paused=Boolean(v);
  };

  window.refreshAkiraOfficePixel=async function(){
    resize();
    await poll();
    resize();
    say("Oficina Pixel sincronizada.");
  };
})();
