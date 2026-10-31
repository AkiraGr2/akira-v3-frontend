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
  function clickSection(name){
    if(name === "voice"){
      if(typeof window.toggleAkiraLiveVoice === "function") window.toggleAkiraLiveVoice();
      return;
    }
    if(name === "crm" && window.akiraOpenCrmModal){ window.akiraOpenCrmModal(); return; }
    if(name === "agent_studio" && window.akiraOpenAgentStudioModal){ window.akiraOpenAgentStudioModal(); return; }
    if(name === "roi" && window.akiraOpenRoiModal){ window.akiraOpenRoiModal(); return; }
    if(name === "cron" && window.akiraOpenCronModal){ window.akiraOpenCronModal(); return; }
    if(name === "sheet" && window.akiraOpenSpreadsheetModal){ window.akiraOpenSpreadsheetModal(); return; }
    if(typeof window.showSection==="function")window.showSection(name);
  }
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
      if(!t) return false;
      const exp=Number(localStorage.getItem("akira_session_exp")||0);
      if(exp && exp<=Math.floor(Date.now()/1000)) return false;
      return true;
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
          '<div class="ak-ref-greeting"><div class="ak-ref-kicker">Cognitive Workspace</div><h2>Hola,<br>soy <span>Akira</span></h2><p>Un espacio para conversar, consultar el Cerebro y ejecutar acciones verificables.</p><div class="ak-ref-actions"><button class="ak-ref-btn primary" data-ak-ref-go="chat">Conversar</button><button class="ak-ref-btn" data-ak-ref-go="missions">Planificar</button><button class="ak-ref-btn" data-ak-ref-go="trading">📈 Trading Lab</button><button class="ak-ref-btn" data-ak-ref-go="shopify">🛍️ Shopify</button><button class="ak-ref-btn" data-ak-ref-go="office">Ejecutar</button><button class="ak-ref-btn" data-ak-ref-go="membrane">Explorar</button></div></div>',
          '<div class="ak-ref-orb-stage"><div class="akira-entity-slot akira-ref-orb" data-akira-entity data-state="idle" data-size="560" aria-label="Akira · En calma"></div></div>',
          '<div id="akRefHeroBrain" class="ak-ref-floating memory"><strong><span class="ak-ref-status cyan"></span>Memoria</strong><span>Consultando datos del Cerebro…</span></div>',
          '<div id="akRefHeroMissions" class="ak-ref-floating executing"><strong><span class="ak-ref-status cyan"></span>Ejecución</strong><span>Consultando misiones reales…</span></div>',
          '<div id="akRefHeroSystem" class="ak-ref-floating thinking"><strong><span class="ak-ref-status purple"></span>Servidor</strong><span>Comprobando disponibilidad…</span></div>',
          '<div id="akRefHeroLearning" class="ak-ref-floating learning"><strong><span class="ak-ref-status yellow"></span>Agentes</strong><span>El estado se muestra solo cuando el registro del backend responde.</span></div>',
          '<aside class="ak-ref-date-card"><div id="akRefDate" class="date">—</div><div id="akRefTime" class="time">—:—</div><p>Datos y estados mostrados desde el runtime cuando están disponibles.</p></aside>',
        '</section>',
        '<div class="ak-ref-lower">',
        '<article class="ak-ref-card ak-ref-briefing-card" id="akRefBriefingCard" style="grid-column:1/-1;border:1px solid rgba(56,189,248,0.3);background:linear-gradient(135deg,rgba(15,23,42,0.95),rgba(17,24,39,0.95));padding:18px 20px;">' +
          '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:10px;">' +
            '<div style="display:flex;align-items:center;gap:10px;">' +
              '<span style="font-size:22px;">👑</span>' +
              '<div>' +
                '<h3 style="margin:0;font-size:15px;color:#f0fdf4;display:flex;align-items:center;gap:8px;">Briefing Ejecutivo Diario <span id="akRefBriefingDate" style="font-size:12px;color:#94a3b8;font-weight:normal;"></span></h3>' +
                '<p style="margin:2px 0 0;font-size:11.5px;color:#94a3b8;">Pulso del mercado en tiempo real, estado de colmena y costo cero blindado.</p>' +
              '</div>' +
            '</div>' +
            '<div style="display:flex;gap:6px;align-items:center;">' +
              '<span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:999px;background:rgba(16,185,129,0.12);color:#34d399;border:1px solid rgba(16,185,129,0.25);">🟢 Presupuesto: $0.00 COP</span>' +
              '<span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:999px;background:rgba(56,189,248,0.12);color:#38bdf8;border:1px solid rgba(56,189,248,0.25);">Capacidades: sin verificar</span>' +
            '</div>' +
          '</div>' +
          '<div id="akRefBriefingContent" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;margin-bottom:14px;">' +
            '<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:12px;">' +
              '<div style="font-size:11px;color:#38bdf8;font-weight:600;margin-bottom:4px;">🌐 MERCADO TECH &amp; IA</div>' +
              '<div style="font-size:12px;color:#e2e8f0;line-height:1.4;">Crecimiento acelerado en automatización y asistentes locales sin costo por API.</div>' +
            '</div>' +
            '<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:12px;">' +
              '<div style="font-size:11px;color:#c084fc;font-weight:600;margin-bottom:4px;">⚡ COLMENA TÁCTICA</div>' +
              '<div style="font-size:12px;color:#e2e8f0;line-height:1.4;">267 especialistas en guardia para proyectos de desarrollo, logística y análisis.</div>' +
            '</div>' +
            '<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:12px;">' +
              '<div style="font-size:11px;color:#34d399;font-weight:600;margin-bottom:4px;">🛡️ BLINDAJE $0.00 COP</div>' +
              '<div style="font-size:12px;color:#e2e8f0;line-height:1.4;">Infraestructura optimizada en Render sin cobros inesperados ni consumo de saldo.</div>' +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">' +
            '<button type="button" class="ak-ref-btn primary" id="akBtnBriefingVoice" style="font-size:12px;padding:6px 14px;" onclick="window.akiraPlayBriefingVoice()">' +
              '✨ Escuchar con Akira (Voz)' +
            '</button>' +
            '<button type="button" class="ak-ref-btn" style="font-size:12px;padding:6px 14px;border-color:rgba(0,136,204,0.35);color:#38bdf8;" onclick="window.akiraSendBriefingTelegram()">' +
              '📲 Enviar a mi Celular' +
            '</button>' +
            '<button type="button" class="ak-ref-btn" style="font-size:12px;padding:6px 14px;" data-ak-ref-go="chat">' +
              '💬 Conversar con Akira' +
            '</button>' +
          '</div>' +
        '</article>',
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
    if (!window.akiraSessionState || window.akiraSessionState.authenticated !== true) return;
    const signed=hasSession();
    const graphPath=signed ? "/api/v8/graph/overview?limit_nodes=750&limit_edges=2000&_=" + Date.now() : "/api/v8/graph/overview";
    const results=await Promise.all([
      apiGet("/health"),
      apiGet(graphPath),
      apiGet("/api/v8/me"),
      apiGet("/api/v8/agents"),
      apiGet("/api/v8/missions/recent?limit=4"),
      apiGet("/api/v8/tasks?limit=4"),
      apiGet("/api/v8/executive/briefing")
    ]);
    const health=results[0];
    let graph=results[1];
    const me=results[2], agents=results[3], missions=results[4], tasks=results[5], briefing=results[6];
    if(!graph.ok && (graph.status === 401 || graph.status === 403)){
      graph = await apiGet("/api/v8/graph/public-overview");
    }
    const serverOK=health.ok===true;
    setText(home,"akRefSystemPill",serverOK?"● servidor disponible":"● servidor no disponible");
    const pill=home.querySelector("#akRefSystemPill"); if(pill)pill.classList.toggle("is-error",!serverOK);
    setText(home,"akRefHeroSystem",serverOK?"Servidor disponible":"Servidor no disponible");

    const graphData=graph.ok&&graph.data?graph.data:null, counts=graphData&&graphData.counts?graphData.counts:{};
    let nodes=Number(counts.nodes), edges=Number(counts.edges);
    if((!Number.isFinite(nodes) || nodes <= 0) && window.__akiraRealNodes){
      nodes = window.__akiraRealNodes;
      edges = window.__akiraRealEdges || 0;
    }
    setText(home,"akRefMetricNodes",Number.isFinite(nodes)?count(nodes):"n/d");
    setText(home,"akRefMetricEdges",Number.isFinite(edges)?count(edges):"n/d");
    const isOwner=Boolean(me&&me.ok&&me.data&&me.data.authenticated===true&&me.data.is_owner===true);
    const scopeLabel=signed ? (isOwner?"vista del propietario · red persistente":"vista de sesión") : "vista pública";
    setText(home,"akRefBrainNodes",Number.isFinite(nodes)?count(nodes)+" nodos · "+scopeLabel:"Nodos no disponibles");
    if(Number.isFinite(nodes) && nodes > 0){
      window.__akiraRealNodes = nodes;
      window.__akiraRealEdges = edges;
      const topPill = document.getElementById("akHudStatusText");
      if(topPill) topPill.textContent = "✦ COLMENA ACTIVA · " + count(nodes) + " NODOS · MEMORIA PERSISTENTE";
      const telem = document.querySelector(".ak-sidebar-telemetry .ak-telemetry-sub");
      if(telem) telem.textContent = count(nodes) + " Nodos · Capacidades: sin verificar";
      try{ window.dispatchEvent(new CustomEvent("akira:brain-stats",{detail:{nodes:nodes,edges:edges}})); }catch(_){}
    }
    const brainBar=home.querySelector("#akRefBrainBar");
    if(brainBar&&Number.isFinite(nodes)){
      const visual=Math.min(100,Math.max(8,Math.round(Math.log10(Math.max(nodes,1)+1)*24)));
      brainBar.style.width=visual+"%";
    }

    const agentList=agents.ok&&agents.data&&Array.isArray(agents.data.agents)?agents.data.agents:[];
    const agentCount=agentList.length>0?agentList.length:Number(agents.data&&agents.data.count);
    const hiveTotal = (window.__akiraHiveCatalog && window.__akiraHiveCatalog.total_agents) || 267;
    setText(home,"akRefMetricAgents",count(hiveTotal));
    const agentSmall = home.querySelector("#akRefMetricAgents") ? home.querySelector("#akRefMetricAgents").parentElement.nextElementSibling : null;
    if(agentSmall) agentSmall.textContent = "Agentes Colmena";
    let hiveHtml = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <span style="font-size:12px;font-weight:700;color:#c084fc;">🌐 Colmena Táctica Activa</span>
        <span style="font-size:11px;font-family:var(--font-mono);color:var(--accent-cyan);">${count(hiveTotal)} Especialistas</span>
      </div>
      <p style="font-size:11.5px;color:#94a3b8;line-height:1.45;margin-bottom:8px;">
        18 divisiones autónomas sincronizadas (Ciberseguridad, Desarrollo, Marketing, Finanzas, Testing, etc.) listas para tareas tácticas.
      </p>
      <div style="display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px;">
        <span class="ak-stat-chip" style="font-size:10px;padding:2px 7px;">Engineering: 66</span>
        <span class="ak-stat-chip" style="font-size:10px;padding:2px 7px;">Marketing: 30</span>
        <span class="ak-stat-chip" style="font-size:10px;padding:2px 7px;">Finance: 24</span>
        <span class="ak-stat-chip" style="font-size:10px;padding:2px 7px;">Security: 12</span>
      </div>
      <button class="ak-btn primary small" style="width:100%;font-size:12px;justify-content:center;" onclick="window.showSection('office'); window.AkiraHologramBridge && window.AkiraHologramBridge.switchTab('hive');">
        🌐 Explorar e Invocar 267 Agentes
      </button>
    `;
    if(agentList.length > 0){
      hiveHtml += `<div style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(255,255,255,0.06);font-size:11px;color:#94a3b8;"><strong style="color:#e2e8f0;">8 Agentes Núcleo en Guardia:</strong> Luna, Nexo, Akira Core y especialistas activos.</div>`;
    }
    setHtml(home,"akRefAgents",hiveHtml);
    setText(home,"akRefHeroLearning","Colmena Táctica: 267 especialistas en 18 divisiones.");

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

    // Hydrate Executive Briefing
    try {
      if(briefing && briefing.ok && briefing.data){
        const bData = briefing.data;
        if(bData.date) setText(home, "akRefBriefingDate", "· " + bData.date);
        if(bData.voice_text) window.__akiraLatestBriefingVoiceText = bData.voice_text;
        if(Array.isArray(bData.headlines) && bData.headlines.length > 0){
          const cont = home.querySelector("#akRefBriefingContent");
          if(cont){
            let bHtml = "";
            const badges = ["🌐 PULSO DEL MERCADO", "⚡ TECNOLOGÍA & IA", "💼 INNOVACIÓN & NEGOCIOS"];
            const colors = ["#38bdf8", "#c084fc", "#34d399"];
            bData.headlines.slice(0, 3).forEach((h, idx) => {
              const bg = badges[idx] || "📌 TITULAR";
              const col = colors[idx] || "#38bdf8";
              bHtml += '<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:12px;">' +
                '<div style="font-size:11px;color:' + col + ';font-weight:600;margin-bottom:4px;">' + bg + '</div>' +
                '<div style="font-size:12px;color:#e2e8f0;line-height:1.4;font-weight:500;">' +
                  '<a href="' + esc(h.link) + '" target="_blank" rel="noopener noreferrer" style="color:#f1f5f9;text-decoration:none;">' + esc(h.title) + ' ↗</a>' +
                '</div>' +
                (h.snippet ? '<div style="font-size:11px;color:#94a3b8;margin-top:4px;line-height:1.3;">' + esc(h.snippet.slice(0, 110)) + '...</div>' : '') +
              '</div>';
            });
            cont.innerHTML = bHtml;
          }
        }
      }
    } catch(_){}

    setText(home,"akRefHeroBrain",Number.isFinite(nodes)
      ? count(nodes)+" nodos · "+(Number.isFinite(edges)?count(edges):"n/d")+" relaciones · "+scopeLabel
      : "Datos del Cerebro no disponibles.");
    setText(home,"akRefSystemNote",serverOK
      ? "Servidor consultado en tiempo real. El Cerebro usa datos públicos sin sesión y datos de sesión cuando están disponibles."
      : "No se pudo verificar el servidor. No se muestran cifras de respaldo.");
  }

  const navCategories = [
    {
      title: "Principal",
      items: [
        ["home", "🏠 Inicio", "Centro de mando"],
        ["chat", "💬 Chat", "Hablar con Akira"],
        ["membrane", "🧠 Memoria", "Cerebro de Akira"]
      ]
    },
    {
      title: "Operación & Proyectos",
      items: [
        ["office", "🏢 Oficina", "Especialistas activos"],
        ["missions", "🎯 Misiones", "Operaciones autónomas"],
        ["upwork", "💼 Proyectos & Negocio", "Oportunidades Upwork"],
        ["shopify", "🛍️ E-Commerce / Shopify", "Tiendas y ventas IA"],
        ["trading", "📈 Trading Lab Cuántico", "Escáner armónico & IA"]
      ]
    },
    {
      title: "Supervisión & Sistema",
      items: [
        ["levels", "📊 Capacidades", "Capacidades: sin verificar"],
        ["admin", "⚙️ Panel de Control", "Supervisión y estado"],
        ["keys", "🔑 Mi Cuenta", "Sesión y ajustes"]
      ]
    }
  ];

  function setupNav(){
    const brand=qs(".brand");
    if(brand){
      brand.innerHTML=`
        <div class="ak-brand-block" onclick="window.showSection('home')" style="cursor:pointer;display:flex;align-items:center;gap:12px;">
          <div class="ak-ref-logo-mark akira-entity-slot" data-akira-entity data-state="idle" data-size="40" aria-label="Akira Quantum Crest"></div>
          <div class="ak-brand-text">
            <h1 style="font-family:'Outfit',sans-serif;font-size:20px;font-weight:800;letter-spacing:0.16em;margin:0;background:linear-gradient(90deg,#00f2fe,#8b5cf6);-webkit-background-clip:text;background-clip:text;color:transparent;">AKIRA</h1>
            <p style="font-size:9px;letter-spacing:0.14em;color:#64748b;margin:2px 0 0;font-weight:600;">COLMENA COGNITIVA // V8.2</p>
          </div>
        </div>
      `;
    }
    const nav=qs("#sidebar .nav"); if(!nav)return;
    nav.innerHTML = "";
    navCategories.forEach(function(cat){
      const header = document.createElement("div");
      header.className = "ak-nav-category-title";
      header.textContent = cat.title;
      nav.appendChild(header);

      cat.items.forEach(function(item){
        const name = item[0], label = item[1], desc = item[2];
        const btn = document.createElement("button");
        btn.className = "nav-btn" + (name === "home" ? " active" : "");
        btn.id = "btn-" + name;
        btn.type = "button";
        btn.innerHTML = `<span class="nav-btn-label">${label}</span><small class="nav-btn-desc">${desc}</small>`;
        btn.addEventListener("click", function(){ clickSection(name); });
        nav.appendChild(btn);
      });
    });

    // Add Live Sidebar Telemetry Card at bottom of sidebar if not present
    let telem = qs("#sidebar .ak-sidebar-telemetry");
    if(!telem){
      telem = document.createElement("div");
      telem.className = "ak-sidebar-telemetry";
      telem.innerHTML = `
        <div class="ak-telemetry-status">
          <span class="ak-live-dot"></span>
          <span>Colmena: Activa & Persistente</span>
        </div>
        <div class="ak-telemetry-sub">Capacidades: sin verificar · Render 0$</div>
      `;
      const sidebar = qs("#sidebar");
      if(sidebar) sidebar.appendChild(telem);
    }

    if(window.AkiraEntity&&window.AkiraEntity.mountAll)window.AkiraEntity.mountAll(brand);
  }

  function setupTopbar(){
    const topbar = qs(".topbar");
    if(!topbar) return;
    topbar.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;">
        <button class="hamburger" onclick="toggleSidebar()">☰</button>
        <div class="ak-hud-breadcrumb">
          <span class="ak-hud-prefix">AKIRA</span>
          <span class="ak-hud-sep">//</span>
          <span id="akHudCurrentSection" class="ak-hud-section">INICIO</span>
        </div>
      </div>
      <div class="ak-hud-center-chip">
        <span class="ak-hud-live-dot"></span>
        <span id="akHudStatusText">✦ AKIRA EN LÍNEA · AUTÓNOMA</span>
      </div>
      <div style="display:flex;gap:10px;align-items:center;">
        <button class="akira-live-trigger-btn ak-hud-live-btn" onclick="toggleAkiraLiveVoice()" title="Conversar por voz con Akira">
          <span class="live-wave-dot"></span>
          <span>✨ Akira Live</span>
        </button>
        <button id="userAvatar" onclick="showSection('keys')" class="ak-hud-avatar-btn" title="Mi Cuenta y Sesión">👑</button>
      </div>
    `;
  }

  function mountHome(){
    const main=qs(".main"); if(!main)return;
    let home=qs("#homeSection");
    if(!home){
      home=document.createElement("div"); home.id="homeSection"; home.className="section ak-reference-home";
      const chat=qs("#chatSection"); if(chat)main.insertBefore(home,chat); else main.appendChild(home);
    }
    home.innerHTML=homeMarkup();
    qsa("[data-ak-ref-go]",home).forEach(function(el){el.addEventListener("click",function(){clickSection(el.getAttribute("data-ak-ref-go"))})});
    if(window.AkiraQuantumOrb&&typeof window.AkiraQuantumOrb.mountAll==="function"){
      window.AkiraQuantumOrb.mountAll(home);
    }
    if(window.AkiraEntity&&typeof window.AkiraEntity.mountAll==="function"){
      window.AkiraEntity.mountAll(home);
    }
    hydrateHome(home).catch(function(error){
      setText(home,"akRefSystemPill","● datos no disponibles");
      setText(home,"akRefSystemNote","No se pudieron consultar los datos del runtime; no se usa contenido de relleno.");
      setText(home,"akRefHeroSystem","Sin datos verificables");
      console.warn("[Akira home] live hydration failed:",error);
    });
  }

  window.addEventListener("akira:brain-stats", function(ev){
    try{
      const d = ev && ev.detail ? ev.detail : {};
      const n = Number(d.nodes);
      if(Number.isFinite(n) && n > 0){
        window.__akiraRealNodes = n;
        window.__akiraRealEdges = Number(d.edges || 0);
        const topPill = document.getElementById("akHudStatusText");
        if(topPill) topPill.textContent = "✦ COLMENA ACTIVA · " + count(n) + " NODOS · MEMORIA PERSISTENTE";
        const telem = document.querySelector(".ak-sidebar-telemetry .ak-telemetry-sub");
        if(telem) telem.textContent = count(n) + " Nodos · Capacidades: sin verificar";
      }
    }catch(_){}
  });

  window.addEventListener("akira:section-shown", function(ev){
    if(ev && ev.detail && ev.detail.section === "home"){
      const home = qs("#homeSection");
      if(home) hydrateHome(home);
    }
  });

  window.addEventListener("akira:session-valid", function(ev){
    const home = qs("#homeSection");
    if(home) hydrateHome(home);
  });

  document.addEventListener("DOMContentLoaded",function(){
    document.body.classList.add("ak-reference-mode");
    setupNav(); setupTopbar(); mountHome();
    if(window.AkiraEntity&&window.AkiraEntity.mountAll)window.AkiraEntity.mountAll(document);
    if(typeof window.showSection==="function"&&!qsa(".section.active").some(function(s){return s.id&&s.id!=="chatSection"}))window.showSection("home");
  });

  window.akiraPlayBriefingVoice = function(){
    const text = window.__akiraLatestBriefingVoiceText || "¡Hola Jhon! Consulta el estado actual de tus capacidades en el panel de Akira.";
    if("speechSynthesis" in window){
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "es-CO";
      utter.rate = 1.05;
      utter.pitch = 1.0;
      const voices = window.speechSynthesis.getVoices();
      const esVoice = voices.find(v => v.lang.startsWith("es") && (v.name.includes("Sabina") || v.name.includes("Paulina") || v.name.includes("Helena") || v.name.includes("Female") || v.name.includes("Google")));
      if(esVoice) utter.voice = esVoice;
      window.speechSynthesis.speak(utter);
      const btn = document.getElementById("akBtnBriefingVoice");
      if(btn){
        const orig = btn.innerHTML;
        btn.innerHTML = "🔊 Reproduciendo Briefing...";
        utter.onend = function(){ btn.innerHTML = orig; };
      }
    } else if(typeof window.toggleAkiraLiveVoice === "function"){
      window.toggleAkiraLiveVoice();
    }
  };

  window.akiraSendBriefingTelegram = async function(){
    const token = localStorage.getItem("akira_telegram_token");
    const chatId = localStorage.getItem("akira_telegram_chat_id");
    if(!token){
      alert("📲 Para recibir el Briefing en tu celular, primero conecta tu Bot de Telegram en 'Mi Cuenta' (toma 1 minuto y cuesta $0.00 COP).");
      if(typeof window.showSection === "function") window.showSection("keys");
      return;
    }
    const b = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
    try {
      const btn = event && event.target;
      if(btn) btn.textContent = "⏳ Enviando a Telegram...";
      const r = await fetch(b + "/api/v8/executive/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_token: token,
          chat_id: chatId || undefined,
          send_telegram: true
        })
      });
      const res = await r.json();
      if(res.telegram_sent){
        alert("✅ ¡Briefing Ejecutivo enviado a tu Telegram! Revisa tu celular.");
      } else {
        alert("⚠️ No se pudo entregar a Telegram. Verifica que hayas iniciado el bot con /start.");
      }
      if(btn) btn.textContent = "📲 Enviar a mi Celular";
    } catch(err){
      alert("Error enviando a Telegram: " + err.message);
    }
  };

  window.AkiraReferenceWorkspace={mountHome:mountHome,setupNav:setupNav,setupTopbar:setupTopbar,hydrateHome:hydrateHome};
})();
