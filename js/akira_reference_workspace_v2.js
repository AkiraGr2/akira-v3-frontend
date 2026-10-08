/* AKIRA REFERENCE DESIGN V2 — desktop + Android workspace shell
 * Data contract: the home surface is presentation-only until the frontend
 * can read the corresponding value from the real runtime. No invented
 * percentages, fake counts, timestamps, mission progress or agent states.
 */
(function(){
  "use strict";
  const navMap=[
    ["home","⌂ Inicio"],["chat","▢ Chat"],["membrane","✣ Cerebro"],
    ["office","◇ Oficina"],["missions","◎ Misiones"],["levels","▥ Niveles"],
    ["upwork","▱ Upwork"],["keys","♙ Cuenta"],["admin","⚙ Admin"]
  ];
  function qs(s,r){return (r||document).querySelector(s)}
  function qsa(s,r){return Array.from((r||document).querySelectorAll(s))}
  function clickSection(name){if(typeof window.showSection==="function")window.showSection(name)}
  function backend(){return localStorage.getItem("akira_backend_url")||"https://akira-empresa.onrender.com"}
  function authHeaders(){
    try{
      return typeof window.akiraAuthHeaders==="function" ? window.akiraAuthHeaders() : {"Content-Type":"application/json"};
    }catch(_){return {"Content-Type":"application/json"}}
  }
  async function apiGet(path){
    try{
      const r=await fetch(backend()+path,{method:"GET",headers:authHeaders(),cache:"no-store"});
      let data=null; try{data=await r.json()}catch(_){}
      return {ok:r.ok,status:r.status,data:data};
    }catch(error){
      return {ok:false,status:0,data:null,error:String((error&&error.message)||error)};
    }
  }
  function esc(value){
    return String(value==null?"":value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;");
  }
  function count(value){
    const n=Number(value);
    return Number.isFinite(n)&&n>=0 ? n.toLocaleString("es-CO") : "n/d";
  }
  function hasSession(){
    try{
      const t=localStorage.getItem("akira_session_token");
      const exp=Number(localStorage.getItem("akira_session_exp")||0);
      return Boolean(t&&exp>Math.floor(Date.now()/1000));
    }catch(_){return false}
  }
  function statusLabel(status){
    const s=String(status||"").toLowerCase();
    const map={
      active:"Activo",idle:"Disponible",busy:"Ocupado",working:"Trabajando",
      running:"En ejecución",executing:"Ejecutando",in_progress:"En curso",
      disabled:"Deshabilitado",error:"Error",pending:"Pendiente",created:"Creada",
      planning:"Planificando",waiting_approval:"Esperando aprobación",approved:"Aprobada",
      completed:"Completada",failed:"Fallida",cancelled:"Cancelada",canceled:"Cancelada",rejected:"Rechazada"
    };
    return map[s]||String(status||"Estado no informado");
  }
  function missionProgress(m){
    const raw=m&&m.progress&&typeof m.progress==="object" ? (m.progress.percent!=null?m.progress.percent:(m.progress.percentage!=null?m.progress.percentage:null)) : (m&&m.progress!=null?m.progress:(m&&m.percentage!=null?m.percentage:null));
    const n=Number(raw);
    return Number.isFinite(n)&&n>=0&&n<=100 ? Math.round(n) : null;
  }
  function isRunningMission(m){
    return ["running","executing","in_progress","working","started","active"].includes(String((m&&m.status)||"").toLowerCase());
  }
  function renderDateTime(home){
    const date=home.querySelector("#akRefDate"), time=home.querySelector("#akRefTime"), now=new Date();
    if(date)date.textContent=new Intl.DateTimeFormat("es-CO",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(now);
    if(time)time.textContent=new Intl.DateTimeFormat("es-CO",{hour:"2-digit",minute:"2-digit"}).format(now);
  }
  function setText(home,id,value){const el=home.querySelector("#"+id);if(el)el.textContent=String(value)}
  function setHtml(home,id,html){const el=home.querySelector("#"+id);if(el)el.innerHTML=html}

  function homeMarkup(){
    return [
      '<div class="ak-ref-scroll">',
        '<section class="ak-ref-hero" aria-label="Espacio de trabajo cognitivo de Akira">',
          '<div class="ak-ref-room-grid"></div>',
          '<div class="ak-ref-greeting"><div class="ak-ref-kicker">Cognitive Workspace</div><h2>Hola,<br>soy <span>Akira</span></h2><p>Un espacio para conversar, consultar el Cerebro y ejecutar acciones verificables.</p><div class="ak-ref-actions"><button class="ak-ref-btn primary" data-ak-ref-go="chat">Conversar</button><button class="ak-ref-btn" data-ak-ref-go="missions">Planificar</button><button class="ak-ref-btn" data-ak-ref-go="office">Ejecutar</button><button class="ak-ref-btn" data-ak-ref-go="membrane">Explorar</button></div></div>',
          '<div class="ak-ref-orb-stage"><div class="akira-entity-slot akira-ref-orb" data-akira-entity data-state="idle" data-size="560" aria-label="Akira · En calma"></div></div>',
          '<div id="akRefHeroBrain" class="ak-ref-floating memory"><strong><span class="ak-ref-status cyan"></span>Memoria</strong><span>Consultando datos del Cerebro…</span></div>',
          '<div id="akRefHeroMissions" class="ak-ref-floating executing"><strong><span class="ak-ref-status cyan"></span>Ejecución</strong><span>Consultando misiones reales…</span></div>',
          '<div id="akRefHeroSystem" class="ak-ref-floating thinking"><strong><span class="ak-ref-status purple"></span>Servidor</strong><span>Comprobando disponibilidad…</span></div>',
          '<div id="akRefHeroLearning" class="ak-ref-floating learning"><strong><span class="ak-ref-status yellow"></span>Agentes</strong><span>El estado se muestra solo cuando el registro del backend responde.</span></div>',
          '<aside class="ak-ref-date-card"><div id="akRefDate" class="date">—</div><div id="akRefTime" class="time">—:—</div><p>Datos y estados mostrados desde el runtime cuando están disponibles.</p></aside>',
        '</section>',
        '<div class="ak-ref-lower">',
          '<article class="ak-ref-card"><h3>Estado del sistema <span id="akRefSystemPill" class="ak-ref-pill">● comprobando</span></h3><div class="ak-ref-stat-grid"><div class="ak-ref-stat"><div class="ring"><b id="akRefMetricNodes">—</b></div><small>Nodos</small></div><div class="ak-ref-stat"><div class="ring"><b id="akRefMetricEdges">—</b></div><small>Relaciones</small></div><div class="ak-ref-stat"><div class="ring"><b id="akRefMetricAgents">—</b></div><small>Agentes</small></div><div class="ak-ref-stat"><div class="ring"><b id="akRefMetricMissions">—</b></div><small>En curso</small></div></div><p id="akRefSystemNote" class="ak-ref-truth-note">Las métricas se derivan del backend; no se usan porcentajes ficticios.</p></article>',
          '<article class="ak-ref-card"><h3>Actividad reciente <span>Datos reales</span></h3><div id="akRefActivity"><div class="ak-ref-empty">Consultando actividad…</div></div></article>',
          '<article class="ak-ref-card"><h3>Misiones recientes <span data-ak-ref-go="missions" style="cursor:pointer">Ver todas</span></h3><div id="akRefMissions"><div class="ak-ref-empty">Consultando misiones…</div></div></article>',
          '<article class="ak-ref-card ak-ref-chat-mini"><h3>Conversar con Akira <span data-ak-ref-go="chat" style="cursor:pointer">Abrir chat</span></h3><div class="ak-ref-chat-box">La conversación real vive en el módulo Chat. Este panel no simula mensajes ni actividad.</div><div class="ak-ref-chat-footer"><div class="ak-ref-mini-orb"><div class="akira-entity-slot" data-akira-entity data-state="idle" data-size="34" aria-label="Akira · En calma"></div></div><button class="ak-ref-btn primary" data-ak-ref-go="chat">Hablar con Akira</button></div></article>',
          '<article class="ak-ref-card"><h3>Cerebro <span data-ak-ref-go="membrane" style="cursor:pointer">Explorar</span></h3><p>Mapa de conocimiento y conexiones disponibles para esta sesión.</p><div class="ak-ref-progress"><i id="akRefBrainBar" style="width:0"></i></div><p id="akRefBrainNodes" style="margin-top:6px">Consultando datos reales…</p></article>',
          '<article class="ak-ref-card"><h3>Agentes registrados <span data-ak-ref-go="office" style="cursor:pointer">Ver oficina</span></h3><div id="akRefAgents"><div class="ak-ref-empty">Consultando agentes…</div></div></article>',
        '</div>',
        '<div class="ak-ref-quick"><button data-ak-ref-go="chat"><strong>＋ Nueva conversación</strong><small>Habla con Akira</small></button><button data-ak-ref-go="missions"><strong>◎ Crear misión</strong><small>Define un objetivo</small></button><button data-ak-ref-go="membrane"><strong>✣ Explorar cerebro</strong><small>Conocimiento y conexiones</small></button><button data-ak-ref-go="office"><strong>◇ Abrir oficina</strong><small>Ve a los agentes registrados</small></button><button data-ak-ref-go="levels"><strong>▥ Ver niveles</strong><small>Tu evolución</small></button></div>',
        '<nav class="ak-ref-mobile-nav" aria-label="Navegación móvil"><button data-ak-ref-go="home">⌂<br>Inicio</button><button data-ak-ref-go="chat">▢<br>Chat</button><button data-ak-ref-go="membrane">✣<br>Cerebro</button><button data-ak-ref-go="missions">◎<br>Misiones</button><button data-ak-ref-go="admin">•••<br>Más</button></nav>',
      '</div>'
    ].join("");
  }

  async function hydrateHome(home){
    renderDateTime(home);
    const signed=hasSession();
    const graphPath=signed ? "/api/v8/graph/overview?limit_nodes=750&limit_edges=2000&_=" + Date.now() : "/api/v8/graph/public-overview";
    const results=await Promise.all([
      apiGet("/health"),
      apiGet(graphPath),
      signed ? apiGet("/api/v8/me") : Promise.resolve({ok:false,status:0,data:null}),
      apiGet("/api/v8/agents"),
      apiGet("/api/v8/missions/recent?limit=4"),
      apiGet("/api/v8/tasks?limit=4")
    ]);
    const health=results[0], graph=results[1], me=results[2], agents=results[3], missions=results[4], tasks=results[5];
    const serverOK=health.ok===true;
    setText(home,"akRefSystemPill",serverOK?"● servidor disponible":"● servidor no disponible");
    const pill=home.querySelector("#akRefSystemPill"); if(pill)pill.classList.toggle("is-error",!serverOK);
    setText(home,"akRefHeroSystem",serverOK?"Servidor disponible":"Servidor no disponible");

    const graphData=graph.ok&&graph.data?graph.data:null, counts=graphData&&graphData.counts?graphData.counts:{};
    const nodes=Number(counts.nodes), edges=Number(counts.edges);
    setText(home,"akRefMetricNodes",Number.isFinite(nodes)?count(nodes):"n/d");
    setText(home,"akRefMetricEdges",Number.isFinite(edges)?count(edges):"n/d");
    const isOwner=Boolean(me&&me.ok&&me.data&&me.data.authenticated===true&&me.data.is_owner===true);
    const scopeLabel=signed ? (isOwner?"vista del propietario · pública + privada":"vista de sesión") : "vista pública";
    setText(home,"akRefBrainNodes",Number.isFinite(nodes)?count(nodes)+" nodos · "+scopeLabel:"Nodos no disponibles");
    const brainBar=home.querySelector("#akRefBrainBar");
    if(brainBar&&Number.isFinite(nodes)){
      const visual=Math.min(100,Math.max(8,Math.round(Math.log10(Math.max(nodes,1)+1)*24)));
      brainBar.style.width=visual+"%";
    }

    const agentList=agents.ok&&agents.data&&Array.isArray(agents.data.agents)?agents.data.agents:[];
    const agentCount=agentList.length>0?agentList.length:Number(agents.data&&agents.data.count);
    setText(home,"akRefMetricAgents",Number.isFinite(agentCount)?count(agentCount):"n/d");
    if(agentList.length){
      let html="";
      agentList.slice(0,5).forEach(function(a){
        html+='<div class="ak-ref-row"><div class="label">'+esc(a&&a.name?a.name:"Agente")+'</div><div class="value">'+esc(statusLabel(a&&a.status))+'</div></div>';
      });
      if(agentList.length>5)html+='<div class="ak-ref-empty">+ '+count(agentList.length-5)+' agentes más</div>';
      setHtml(home,"akRefAgents",html);
    }else{
      setHtml(home,"akRefAgents",(agents.status===401||agents.status===403)
        ? '<div class="ak-ref-empty">Los agentes requieren una sesión para mostrar su estado real.</div>'
        : '<div class="ak-ref-empty">No hay datos de agentes disponibles.</div>');
    }
    setText(home,"akRefHeroLearning",(agents.status===401||agents.status===403)
      ? "Inicia sesión para consultar los estados privados de los agentes."
      : "Los estados visibles provienen del registro del backend.");

    const missionList=missions.ok&&missions.data
      ? (Array.isArray(missions.data.missions)?missions.data.missions:(Array.isArray(missions.data.items)?missions.data.items:(Array.isArray(missions.data.results)?missions.data.results:[])))
      : [];
    const running=missionList.filter(isRunningMission);
    setText(home,"akRefMetricMissions",count(running.length));
    setText(home,"akRefHeroMissions",running.length
      ? count(running.length)+" misión"+(running.length===1?"":"es")+" en ejecución"
      : ((missions.status===401||missions.status===403)?"Inicia sesión para ver tus misiones.":"No hay misiones en ejecución registradas."));
    if(missionList.length){
      let html="";
      missionList.slice(0,4).forEach(function(m){
        const p=missionProgress(m), status=statusLabel(m&&m.status), value=p===null?status:p+"%";
        const title=(m&&m.title)||(m&&m.objective)||(m&&m.goal)||(m&&m.name)||"Misión";
        html+='<div class="ak-ref-row"><div class="label">'+esc(title)+'</div><div class="value">'+esc(value)+'</div></div>';
      });
      setHtml(home,"akRefMissions",html);
    }else{
      setHtml(home,"akRefMissions",(missions.status===401||missions.status===403)
        ? '<div class="ak-ref-empty">Las misiones son privadas; inicia sesión para ver su estado.</div>'
        : '<div class="ak-ref-empty">No hay misiones recientes disponibles.</div>');
    }

    const taskList=tasks.ok&&tasks.data
      ? (Array.isArray(tasks.data.tasks)?tasks.data.tasks:(Array.isArray(tasks.data.items)?tasks.data.items:(Array.isArray(tasks.data.results)?tasks.data.results:[])))
      : [];
    if(taskList.length){
      let html="";
      taskList.slice(0,4).forEach(function(t){
        const title=(t&&t.title)||(t&&t.name)||(t&&t.tool_name)||"Tarea";
        const agent=t&&t.agent_name?t.agent_name:"";
        html+='<div class="ak-ref-row"><div class="label">'+esc(title)+(agent?" · "+esc(agent):"")+'</div><div class="value">'+esc(statusLabel(t&&t.status))+'</div></div>';
      });
      setHtml(home,"akRefActivity",html);
    }else{
      setHtml(home,"akRefActivity",(tasks.status===401||tasks.status===403)
        ? '<div class="ak-ref-empty">La actividad de tareas requiere una sesión.</div>'
        : '<div class="ak-ref-empty">No hay actividad reciente disponible.</div>');
    }

    setText(home,"akRefHeroBrain",Number.isFinite(nodes)
      ? count(nodes)+" nodos · "+(Number.isFinite(edges)?count(edges):"n/d")+" relaciones · "+scopeLabel
      : "Datos del Cerebro no disponibles.");
    setText(home,"akRefSystemNote",serverOK
      ? "Servidor consultado en tiempo real. El Cerebro usa datos públicos sin sesión y datos de sesión cuando están disponibles."
      : "No se pudo verificar el servidor. No se muestran cifras de respaldo.");
  }

  function setupNav(){
    const brand=qs(".brand");
    if(brand){
      brand.innerHTML='<div class="ak-ref-logo-mark akira-entity-slot" data-akira-entity data-state="idle" data-size="44" aria-label="Akira · Núcleo vivo"></div><div><h1>AKIRA</h1><p>Cognitive Workspace</p></div>';
    }
    const nav=qs("#sidebar .nav"); if(!nav)return;
    navMap.forEach(function(item){
      const name=item[0], label=item[1];
      let btn=qs("#btn-"+name,nav);
      if(!btn){
        btn=document.createElement("button");
        btn.className="nav-btn"; btn.id="btn-"+name; btn.type="button";
        btn.addEventListener("click",function(){clickSection(name)});
      }
      btn.textContent=label; nav.appendChild(btn);
    });
    const brandP=qs(".brand p"); if(brandP)brandP.textContent="Cognitive Workspace";
    const brandH=qs(".brand h1"); if(brandH)brandH.textContent="AKIRA";\n    if(window.AkiraEntity&&window.AkiraEntity.mountAll)window.AkiraEntity.mountAll(brand);
    navMap.map(function(x){return qs("#btn-"+x[0],nav)}).filter(Boolean).forEach(function(b){nav.appendChild(b)});
  }

  function setupTopbar(){const model=qs(".topbar .model-pill");if(model)model.textContent="Pregunta algo a Akira..."}

  function mountHome(){
    const main=qs(".main"); if(!main)return;
    let home=qs("#homeSection");
    if(!home){
      home=document.createElement("div"); home.id="homeSection"; home.className="section ak-reference-home";
      const chat=qs("#chatSection"); if(chat)main.insertBefore(home,chat); else main.appendChild(home);
    }
    home.innerHTML=homeMarkup();
    qsa("[data-ak-ref-go]",home).forEach(function(el){el.addEventListener("click",function(){clickSection(el.getAttribute("data-ak-ref-go"))})});
    if(window.AkiraEntity&&window.AkiraEntity.mountAll)window.AkiraEntity.mountAll(home);
    hydrateHome(home).catch(function(error){
      setText(home,"akRefSystemPill","● datos no disponibles");
      setText(home,"akRefSystemNote","No se pudieron consultar los datos del runtime; no se usa contenido de relleno.");
      setText(home,"akRefHeroSystem","Sin datos verificables");
      console.warn("[Akira home] live hydration failed:",error);
    });
  }

  document.addEventListener("DOMContentLoaded",function(){
    document.body.classList.add("ak-reference-mode");
    setupNav(); setupTopbar(); mountHome();\n    if(window.AkiraEntity&&window.AkiraEntity.mountAll)window.AkiraEntity.mountAll(document);
    if(typeof window.showSection==="function"&&!qsa(".section.active").some(function(s){return s.id&&s.id!=="chatSection"}))window.showSection("home");
  });

  window.AkiraReferenceWorkspace={mountHome:mountHome,setupNav:setupNav,setupTopbar:setupTopbar,hydrateHome:hydrateHome};
})();
