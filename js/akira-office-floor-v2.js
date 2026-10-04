/*
 * AKIRA OFFICE — Cognitive Workspace V2
 * Visual behavior is driven by authoritative agent/task state.
 * No backend writes. Polls read-only owner endpoints.
 */
(function(){
  "use strict";

  const BACKEND_FALLBACK = "https://akira-empresa.onrender.com";
  const POLL_MS = 8000;
  const AGENT_COLORS = [
    "#8b7cff","#5eead4","#60a5fa","#f59e0b","#fb7185",
    "#34d399","#a78bfa","#38bdf8","#c084fc","#f472b6"
  ];
  let canvas, ctx, raf = 0, lastTs = 0, lastPoll = 0;
  let initialized = false;
  let paused = false;
  let agents = [];
  let tasks = [];
  let selectedName = null;
  let fetchBusy = false;

  const state = {
    idle: {label:"Disponible", cls:"idle"},
    working: {label:"Trabajando", cls:"working"},
    error: {label:"Error", cls:"error"},
    disabled: {label:"Inactivo", cls:"disabled"}
  };

  function backend(){
    try { return localStorage.getItem("akira_backend_url") || BACKEND_FALLBACK; }
    catch(_) { return BACKEND_FALLBACK; }
  }

  function authHeaders(){
    try {
      return typeof window.akiraAuthHeaders === "function"
        ? window.akiraAuthHeaders()
        : {"Content-Type":"application/json"};
    } catch(_) {
      return {"Content-Type":"application/json"};
    }
  }

  function esc(value){
    return String(value == null ? "" : value)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  function agentState(agent){
    const name = String(agent && agent.name || "");
    const status = String(agent && agent.status || "").toLowerCase();
    if(status === "disabled") return "disabled";
    const activeTask = tasks.some(t =>
      String(t && t.agent_name || "") === name &&
      ["pending","queued","running","working","in_progress","started"].includes(String(t && t.status || "").toLowerCase())
    );
    if(activeTask || ["working","running","busy","executing"].includes(status)) return "working";
    if(["error","failed","failure"].includes(status)) return "error";
    return "idle";
  }

  function taskFor(name){
    return tasks
      .filter(t => String(t && t.agent_name || "") === String(name))
      .sort((a,b) => String(b && b.created_at || "").localeCompare(String(a && a.created_at || "")))[0] || null;
  }

  function summarize(){
    let working=0, errors=0, idle=0, disabled=0;
    agents.forEach(a=>{
      const s=agentState(a);
      if(s==="working") working++;
      else if(s==="error") errors++;
      else if(s==="disabled") disabled++;
      else idle++;
    });
    return {total:agents.length,working,errors,idle,disabled};
  }

  function setText(id,value){
    const el=document.getElementById(id);
    if(el) el.textContent=String(value == null ? "" : value);
  }

  function renderList(){
    const list=document.getElementById("officeAgentList");
    const detail=document.getElementById("officeAgentDetail");
    if(!list) return;
    if(!agents.length){
      list.innerHTML = '<div class="office-empty">No hay agentes disponibles para esta sesión.</div>';
      if(detail) detail.innerHTML = '<strong>Sin datos en vivo.</strong><span>La Oficina no inventa estados: necesita una sesión válida del propietario para consultar agentes y tareas.</span>';
      return;
    }
    list.innerHTML = agents.map((a,i)=>{
      const s=agentState(a), c=AGENT_COLORS[i%AGENT_COLORS.length], t=taskFor(a.name);
      return '<button class="office-agent-row '+(selectedName===a.name?'is-selected':'')+'" data-agent="'+esc(a.name)+'">'+
        '<span class="office-agent-dot" style="--agent-color:'+c+'"></span>'+
        '<span class="office-agent-row-main"><strong>'+esc(a.name)+'</strong><small>'+esc(state[s].label)+(t && t.tool_name ? " · "+esc(t.tool_name) : "")+'</small></span>'+
        '<span class="office-agent-state '+s+'">'+esc(state[s].label)+'</span>'+
      '</button>';
    }).join("");
    list.querySelectorAll(".office-agent-row").forEach(btn=>{
      btn.addEventListener("click",()=>selectAgent(btn.dataset.agent));
    });
    if(selectedName) updateDetail(selectedName);
  }

  function updateDetail(name){
    const detail=document.getElementById("officeAgentDetail");
    const a=agents.find(x=>String(x.name)===String(name));
    if(!detail || !a) return;
    const s=agentState(a), t=taskFor(name);
    const tools=Array.isArray(a.allowed_tools) ? a.allowed_tools.join(", ") : "No especificadas";
    detail.innerHTML =
      '<div class="office-detail-head"><span class="office-agent-chip '+s+'">'+esc(state[s].label)+'</span><strong>'+esc(a.name)+'</strong></div>'+
      '<div class="office-detail-grid">'+
      '<div><span>Rol</span><b>'+esc(a.role||"—")+'</b></div>'+
      '<div><span>Estado real</span><b>'+esc(a.status||"—")+'</b></div>'+
      '</div>'+
      '<div class="office-detail-block"><span>Tarea reciente</span><b>'+esc(t ? (t.tool_name || t.status || "registrada") : "Sin tarea reciente")+'</b></div>'+
      '<div class="office-detail-block"><span>Herramientas autorizadas</span><b>'+esc(tools)+'</b></div>';
  }

  function selectAgent(name){
    selectedName = name;
    renderList();
    draw();
  }

  function canvasSize(){
    if(!canvas) return {w:720,h:630,dpr:1};
    const rect=canvas.getBoundingClientRect();
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const w=Math.max(320,Math.round(rect.width));
    const h=Math.max(420,Math.round(rect.height));
    if(canvas.width!==Math.round(w*dpr) || canvas.height!==Math.round(h*dpr)){
      canvas.width=Math.round(w*dpr);
      canvas.height=Math.round(h*dpr);
      canvas._cssW=w; canvas._cssH=h; canvas._dpr=dpr;
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    return {w,h,dpr};
  }

  function roundedRect(c,x,y,w,h,r){
    const rr=Math.min(r,w/2,h/2);
    c.beginPath();
    c.moveTo(x+rr,y); c.arcTo(x+w,y,x+w,y+h,rr);
    c.arcTo(x+w,y+h,x,y+h,rr); c.arcTo(x,y+h,x,y,rr);
    c.arcTo(x,y,x+w,y,rr); c.closePath();
  }

  function drawBackground(w,h,t){
    const g=ctx.createRadialGradient(w*.52,h*.44,10,w*.52,h*.46,Math.max(w,h)*.55);
    g.addColorStop(0,"rgba(139,124,255,.12)");
    g.addColorStop(.46,"rgba(17,24,39,.72)");
    g.addColorStop(1,"rgba(4,8,15,.98)");
    ctx.fillStyle=g; ctx.fillRect(0,0,w,h);

    ctx.save();
    ctx.globalAlpha=.14;
    ctx.strokeStyle="#7dd3fc";
    ctx.lineWidth=1;
    const step=Math.max(28,Math.min(48,w/18));
    for(let x=0;x<w;x+=step){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
    for(let y=0;y<h;y+=step){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
    ctx.restore();

    const pulse=.5+.5*Math.sin(t*.0013);
    ctx.save();
    ctx.strokeStyle="rgba(139,124,255,"+(0.12+0.08*pulse)+")";
    ctx.lineWidth=2;
    ctx.beginPath(); ctx.ellipse(w*.5,h*.49,w*.24,h*.23,0,0,Math.PI*2); ctx.stroke();
    ctx.strokeStyle="rgba(94,234,212,.10)";
    ctx.beginPath(); ctx.ellipse(w*.5,h*.49,w*.31,h*.30,0,0,Math.PI*2); ctx.stroke();
    ctx.restore();
  }

  function agentPositions(w,h,count){
    const centerX=w*.5, centerY=h*.49;
    const rx=Math.min(w*.39,340), ry=Math.min(h*.34,210);
    const positions=[];
    const angleStart=-Math.PI/2;
    for(let i=0;i<count;i++){
      const angle=angleStart+(Math.PI*2*i/count);
      const x=centerX+Math.cos(angle)*rx;
      const y=centerY+Math.sin(angle)*ry;
      positions.push({x,y,angle});
    }
    return positions;
  }

  function drawAgent(a,i,pos,t,w,h){
    const s=agentState(a);
    const color=AGENT_COLORS[i%AGENT_COLORS.length];
    const bob=Math.sin(t*.0014+i*.9)*1.8;
    const working=s==="working";
    const disabled=s==="disabled";
    const err=s==="error";
    const selected=selectedName===a.name;
    const x=pos.x, y=pos.y+bob;
    const pw=Math.min(190,Math.max(130,w*.22)), ph=72;

    ctx.save();
    if(selected) {
      ctx.shadowBlur=30; ctx.shadowColor=color;
    }
    ctx.globalAlpha=disabled?.48:1;
    const glow=ctx.createRadialGradient(x,y-8,2,x,y-8,55);
    glow.addColorStop(0,color.replace(")",",.28)").replace("rgb","rgba"));
    glow.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=glow; ctx.beginPath(); ctx.arc(x,y-10,55,0,Math.PI*2); ctx.fill();

    // station
    roundedRect(ctx,x-pw/2,y+8,pw,ph,14);
    ctx.fillStyle="rgba(9,15,26,.88)";
    ctx.fill();
    ctx.strokeStyle=selected?color:"rgba(148,163,184,.20)";
    ctx.lineWidth=selected?2:1;
    ctx.stroke();

    // terminal
    roundedRect(ctx,x-pw*.32,y-36,pw*.64,34,8);
    ctx.fillStyle="rgba(2,6,12,.92)"; ctx.fill();
    ctx.strokeStyle="rgba(148,163,184,.16)"; ctx.stroke();
    const scan=.5+.5*Math.sin(t*.004+i);
    ctx.fillStyle=working?color:"rgba(94,234,212,.32)";
    for(let k=0;k<5;k++){
      ctx.fillRect(x-pw*.25+k*pw*.12,y-25,8,2+scan*4);
    }

    // agent avatar silhouette
    ctx.beginPath(); ctx.arc(x,y-3,17,0,Math.PI*2);
    ctx.fillStyle="rgba(13,19,32,.96)"; ctx.fill();
    ctx.strokeStyle=color; ctx.lineWidth=2; ctx.stroke();
    ctx.beginPath(); ctx.arc(x,y-8,8,0,Math.PI*2);
    ctx.fillStyle=color; ctx.globalAlpha=disabled?.55:0.82; ctx.fill();
    ctx.globalAlpha=disabled?.48:1;

    // working ring
    if(working){
      ctx.save();
      ctx.translate(x,y-3);
      ctx.rotate(t*.0008+i*.2);
      ctx.strokeStyle=color; ctx.globalAlpha=.9; ctx.lineWidth=2;
      ctx.setLineDash([5,4]);
      ctx.beginPath(); ctx.arc(0,0,25,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    }

    // state light
    const sc=err?"#fb7185":disabled?"#64748b":working?color:"#34d399";
    ctx.fillStyle=sc; ctx.shadowBlur=12; ctx.shadowColor=sc;
    ctx.beginPath(); ctx.arc(x+pw/2-13,y+20,4,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;

    ctx.textAlign="center";
    ctx.fillStyle="#f4f7fb";
    ctx.font="700 13px Inter,system-ui,sans-serif";
    ctx.fillText(String(a.name||"agent").toUpperCase(),x,y+31);
    ctx.fillStyle="rgba(148,163,184,.92)";
    ctx.font="11px Inter,system-ui,sans-serif";
    ctx.fillText(state[s].label,x,y+47);

    if(working){
      // data particles = visual activity, not fabricated state
      ctx.globalAlpha=.65;
      for(let p=0;p<4;p++){
        const phase=t*.0018+i+p;
        const px=x+Math.cos(phase)*48;
        const py=y+Math.sin(phase*1.4)*34;
        ctx.fillStyle=color; ctx.beginPath(); ctx.arc(px,py,2.2,0,Math.PI*2); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawCore(w,h,t){
    const x=w*.5, y=h*.49;
    const pulse=.5+.5*Math.sin(t*.0016);
    ctx.save();
    ctx.shadowBlur=34; ctx.shadowColor="rgba(139,124,255,.42)";
    const r=62+5*pulse;
    const g=ctx.createRadialGradient(x,y,8,x,y,r);
    g.addColorStop(0,"rgba(94,234,212,.40)");
    g.addColorStop(.38,"rgba(139,124,255,.32)");
    g.addColorStop(1,"rgba(21,29,45,.04)");
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.strokeStyle="rgba(139,124,255,.75)"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(x,y,47+4*pulse,0,Math.PI*2); ctx.stroke();
    ctx.strokeStyle="rgba(94,234,212,.40)"; ctx.setLineDash([6,5]);
    ctx.beginPath(); ctx.arc(x,y,58,0,Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle="#f8fafc"; ctx.textAlign="center";
    ctx.font="700 22px Inter,system-ui,sans-serif"; ctx.fillText("AKIRA",x,y-3);
    ctx.fillStyle="rgba(148,163,184,.96)";
    ctx.font="11px Inter,system-ui,sans-serif"; ctx.fillText("NÚCLEO COGNITIVO",x,y+17);
    ctx.fillStyle="rgba(94,234,212,.92)";
    ctx.font="10px Inter,system-ui,sans-serif"; ctx.fillText("ORQUESTACIÓN · AUTOCONOCIMIENTO",x,y+34);
    ctx.restore();
  }

  function drawLinks(w,h,t){
    const positions=agentPositions(w,h,agents.length);
    const cx=w*.5, cy=h*.49;
    agents.forEach((a,i)=>{
      const p=positions[i];
      const s=agentState(a);
      ctx.save();
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(p.x,p.y-2);
      ctx.strokeStyle=s==="working"?AGENT_COLORS[i%AGENT_COLORS.length]:"rgba(148,163,184,.14)";
      ctx.globalAlpha=s==="working"?.65:.8; ctx.lineWidth=s==="working"?2:1;
      ctx.stroke(); ctx.restore();
    });
  }

  function draw(ts){
    if(!initialized) return;
    const {w,h}=canvasSize();
    if(!paused || lastTs===0){ lastTs=ts; }
    ctx.clearRect(0,0,w,h);
    drawBackground(w,h,ts);
    drawLinks(w,h,ts);
    drawCore(w,h,ts);
    const positions=agentPositions(w,h,agents.length);
    agents.forEach((a,i)=>drawAgent(a,i,positions[i],ts,w,h));
    // top title + live indicator
    ctx.fillStyle="rgba(244,247,251,.94)"; ctx.textAlign="left";
    ctx.font="700 15px Inter,system-ui,sans-serif"; ctx.fillText("AKIRA · OFICINA COGNITIVA",20,28);
    ctx.fillStyle="rgba(148,163,184,.84)"; ctx.font="11px Inter,system-ui,sans-serif";
    ctx.fillText("Actividad visual sincronizada con agentes y tareas persistentes",20,46);
    const sum=summarize();
    ctx.textAlign="right"; ctx.fillStyle="rgba(148,163,184,.9)";
    ctx.fillText(sum.working+" activos · "+sum.idle+" disponibles · "+sum.total+" registrados",w-20,28);
    ctx.fillStyle=paused?"#fbbf24":"#34d399";
    ctx.beginPath(); ctx.arc(w-26,44,4,0,Math.PI*2); ctx.fill();
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
      if(ar.ok){
        const ad=await ar.json(); agents=Array.isArray(ad.agents)?ad.agents:[];
      }
      if(tr.ok){
        const td=await tr.json(); tasks=Array.isArray(td.tasks)?td.tasks:[];
      }
      renderList();
      updateStats();
    }catch(e){
      const detail=document.getElementById("officeAgentDetail");
      if(detail && !agents.length) detail.innerHTML='<strong>No se pudo leer la actividad.</strong><span>La Oficina está diseñada para degradar con honestidad cuando el backend no responde.</span>';
    }finally{
      fetchBusy=false;
      lastPoll=Date.now();
    }
  }

  function updateStats(){
    const s=summarize();
    setText("officeTotal",s.total);
    setText("officeWorking",s.working);
    setText("officeIdle",s.idle);
    setText("officeErrors",s.errors);
    setText("officeDisabled",s.disabled);
    setText("officeSync",lastPoll?new Date(lastPoll).toLocaleTimeString("es-CO",{hour:"2-digit",minute:"2-digit",second:"2-digit"}):"—");
  }

  function resize(){
    canvasSize();
    draw(performance.now());
  }

  function bind(){
    const btn=document.getElementById("officePause");
    const refresh=document.getElementById("officeRefresh");
    if(btn) btn.onclick=()=>{
      paused=!paused;
      btn.textContent=paused?"Reanudar":"Pausar";
      if(!paused) poll();
    };
    if(refresh) refresh.onclick=()=>poll();
    window.addEventListener("resize",resize,{passive:true});
    canvas.addEventListener("click",e=>{
      const rect=canvas.getBoundingClientRect(), scaleX=canvas.width/(canvas._dpr||1)/rect.width, scaleY=canvas.height/(canvas._dpr||1)/rect.height;
      const mx=(e.clientX-rect.left)*scaleX, my=(e.clientY-rect.top)*scaleY;
      const {w,h}=canvasSize(), pos=agentPositions(w,h,agents.length);
      let best=-1,bd=Infinity;
      pos.forEach((p,i)=>{ const d=Math.hypot(mx-p.x,my-(p.y)); if(d<bd && d<75){bd=d;best=i;} });
      if(best>=0) selectAgent(agents[best].name);
    });
  }

  window.initOfficeFloor = async function(){
    const sec=document.getElementById("officeSection");
    canvas=document.getElementById("officeCanvas");
    if(!sec || !canvas) return;
    if(!initialized){
      ctx=canvas.getContext("2d");
      initialized=true;
      bind();
      renderList();
      draw(performance.now());
    }
    poll();
    if(!raf){
      const loop=(ts)=>{
        raf=requestAnimationFrame(loop);
        draw(ts);
      };
      raf=requestAnimationFrame(loop);
    }
  };

  window.addEventListener("beforeunload",()=>{ if(raf) cancelAnimationFrame(raf); });
})();
