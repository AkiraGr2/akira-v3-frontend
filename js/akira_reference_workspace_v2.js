/* AKIRA WORKSPACE V1
 * Cloud-like workbench ergonomics with Akira's own identity.
 * Existing backend contracts and modules remain untouched.
 */
(function(){
  "use strict";
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const go=name=>{if(typeof window.showSection==="function")window.showSection(name)};
  const backend=()=>localStorage.getItem("akira_backend_url")||"https://akira-empresa.onrender.com";
  const nav=[
    ["chat","💬","Chat","Habla con Akira"],["membrane","🧠","Cerebro","Memoria y conexiones"],
    ["office","◇","Oficina","Agentes trabajando"],["missions","◎","Misiones","Objetivos y ejecución"],
    ["levels","▥","Estado","Capacidades verificadas"],["upwork","◈","Trabajo","Upwork y proyectos"],
    ["keys","♙","Cuenta","Sesión y proveedores"],["admin","⚙","Admin","Centro de control"]
  ];
  function logo(){return '<div class="ak-ref-logo-mark" aria-hidden="true"><svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke-linecap="round"><path d="M22 3v11M22 30v11M3 22h11M30 22h11" stroke="#a477ff" stroke-width="2"/><path d="M9 9l7 7M28 28l7 7M35 9l-7 7M16 28l-7 7" stroke="#48e2ff" stroke-width="2"/><circle cx="22" cy="22" r="7" stroke="#ff65d5" stroke-width="2"/><circle cx="22" cy="22" r="2.5" fill="#fff" stroke="none"/></g></svg></div>';}
  function card(id,icon,title,desc,action){return '<article class="ak-ws-card"><h4>'+icon+' '+title+'</h4><p>'+desc+'</p><button type="button" data-ws-go="'+id+'">'+action+' →</button></article>';}
  function homeMarkup(){
    return '<div class="ak-ws-scroll"><div class="ak-ws-grid"><main class="ak-ws-main">'+
      '<div class="ak-ws-eyebrow">AKIRA · COGNITIVE WORKSPACE</div><h1 class="ak-ws-title">Hola. Soy <span>Akira</span>.</h1>'+
      '<p class="ak-ws-sub">Un espacio de trabajo cognitivo donde conversación, memoria, herramientas, agentes y misiones viven juntos. Pregunta, crea o continúa algo que ya estabas haciendo.</p>'+
      '<section class="ak-ws-command" aria-label="Preguntar a Akira"><div class="ak-ws-command-top"><div class="ak-ws-command-orb"><div class="akira-entity-slot" data-akira-entity data-state="idle" data-size="64" aria-label="Akira · En calma"></div></div><textarea id="akWorkspacePrompt" placeholder="¿Qué quieres que hagamos juntos?"></textarea></div><div class="ak-ws-command-bottom"><div class="ak-ws-tools"><button class="ak-ws-tool" type="button" data-ws-go="missions">◎ Misión</button><button class="ak-ws-tool" type="button" data-ws-go="membrane">🧠 Cerebro</button><button class="ak-ws-tool" type="button" data-ws-go="office">◇ Agentes</button><button class="ak-ws-tool" type="button" id="akWorkspaceFile">＋ Archivo</button></div><button class="ak-ws-submit" type="button" id="akWorkspaceSend">Enviar a Akira ↗</button></div></section>'+
      '<div class="ak-ws-prompts"><button class="ak-ws-prompt" type="button" data-ws-prompt="Analiza el estado actual de Akira y dime qué debería revisar primero."><strong>Auditar el sistema</strong><small>Usa el contexto real disponible y señala lo que aún necesita verificación.</small></button><button class="ak-ws-prompt" type="button" data-ws-prompt="Ayúdame a convertir esta idea en una misión clara y verificable."><strong>Crear una misión</strong><small>Pasar de una intención a un objetivo que Akira pueda ejecutar y supervisar.</small></button><button class="ak-ws-prompt" type="button" data-ws-prompt="Explícame qué sabe Akira actualmente sobre sí misma y qué cosas siguen sin estar verificadas."><strong>Conocer a Akira</strong><small>Separar capacidades verificadas, parciales y pendientes.</small></button></div>'+
      '<section class="ak-ws-section"><div class="ak-ws-section-head"><h3>Espacios de Akira</h3><span>Los módulos reales de la aplicación</span></div><div class="ak-ws-cards>'+
      card("chat","💬","Conversación","Habla con Akira y conserva el contexto de la conversación.","Abrir chat")+
      card("membrane","🧠","Cerebro","Explora memoria, conocimiento y relaciones persistentes.","Explorar cerebro")+
      card("missions","◎","Misiones","Convierte objetivos grandes en trabajo planificado y supervisable.","Abrir misiones")+
      card("office","◇","Oficina","Observa a los agentes y sus tareas en el espacio cognitivo.","Ver agentes")+
      card("levels","▥","Estado","Consulta el estado de las capacidades desde el registro real.","Ver estado")+
      card("admin","⚙","Centro de control","Audita pensamiento, herramientas, agentes, datos y autonomía.","Abrir Admin")+
      '</div></section></main>'+
      '<aside class="ak-ws-side" aria-label="Contexto vivo de Akira">'+
      '<section class="ak-ws-panel"><div class="ak-ws-identity"><div class="ak-ws-identity-orb"><div class="akira-entity-slot" data-akira-entity data-state="idle" data-size="52" aria-label="Akira · En calma"></div></div><div><strong>Akira</strong><small>Colmena cognitiva personal</small></div></div></section>'+
      '<section class="ak-ws-panel"><h3>Estado vivo</h3><div id="akWorkspaceStatus"><div class="ak-ws-status"><span><i class="ak-ws-dot"></i>Conectando...</span><b>—</b></div></div></section>'+
      '<section class="ak-ws-panel"><h3>Evidencia reciente</h3><div id="akWorkspaceEvidence" class="ak-ws-evidence">Consultando el registro de capacidades...</div></section>'+
      '<section class="ak-ws-panel"><h3>Ir directamente</h3><div class="ak-ws-navgrid">'+nav.slice(0,6).map(x=>'<button type="button" data-ws-go="'+x[0]+'">'+x[1]+' '+x[2]+'</button>').join("")+'</div></section>'+
      '</aside></div><nav class="ak-ws-mobile-bottom" aria-label="Navegación rápida"><button type="button" data-ws-go="chat">💬<br>Chat</button><button type="button" data-ws-go="membrane">🧠<br>Cerebro</button><button type="button" data-ws-go="missions">◎<br>Misiones</button><button type="button" data-ws-go="office">◇<br>Oficina</button></nav></div>';
  }
  function setupSidebar(){
    const brand=q(".brand"),navEl=q("#sidebar .nav");
    if(brand)brand.innerHTML=logo()+'<div><h1>AKIRA</h1><p>Cognitive Workspace</p></div>';
    if(!navEl)return;
    navEl.innerHTML="";
    nav.forEach(([id,icon,title,desc])=>{const b=document.createElement("button");b.type="button";b.id="btn-"+id;b.className="nav-btn";b.textContent=icon+" "+title;b.title=desc;b.addEventListener("click",()=>go(id));navEl.appendChild(b);});
  }
  function setupTopbar(){const pill=q(".topbar .model-pill");if(pill)pill.textContent="Pregunta algo a Akira...";}
  function sendPrompt(value){
    const text=String(value||"").trim();if(!text)return;go("chat");
    const input=q("#msg");if(!input)return;input.value=text;input.dispatchEvent(new Event("input",{bubbles:true}));
    const btn=q("#sendBtn");if(btn)setTimeout(()=>btn.click(),40);
  }
  async function loadLiveContext(){
    const status=q("#akWorkspaceStatus"),evidence=q("#akWorkspaceEvidence");if(!status||!evidence)return;
    try{
      const runtime=await fetch(backend()+"/api/v8/runtime/capabilities",{cache:"no-store"}).then(r=>r.ok?r.json():null);
      const rows=[];
      if(runtime)rows.push(["Runtime","ok","disponible"]);else rows.push(["Runtime","warn","no disponible"]);
      let self=null;
      try{const h=typeof window.akiraAuthHeaders==="function"?window.akiraAuthHeaders():{};const r=await fetch(backend()+"/api/v8/self",{headers:h,cache:"no-store"});if(r.ok)self=await r.json();}catch(_){}
      if(self&&Array.isArray(self.capabilities_registry)){
        ["persistent_memory","memory_recall","learning_persistent","graph_persistent","tool_registry","agents_persistent","missions","self_knowledge_runtime","repair_engine_v1","evolution_engine_v1","controlled_autonomy_v1","cognitive_cycle_persistent"].forEach(n=>{
          const c=self.capabilities_registry.find(x=>x.name===n);if(c){const raw=c.effective_state||c.status||"unknown";rows.push([n,raw==="verified"?"ok":raw==="partial"||raw==="stale"?"warn":"bad",raw]);}
        });
      }else rows.push(["Sesión","warn","inicia sesión para contexto privado"]);
      status.innerHTML=rows.slice(0,9).map(x=>'<div class="ak-ws-status"><span><i class="ak-ws-dot '+x[1]+'"></i>'+x[0]+'</span><b>'+x[2]+'</b></div>').join("");
      const verified=rows.filter(x=>x[1]==="ok").length,warn=rows.filter(x=>x[1]==="warn").length;
      evidence.innerHTML='<strong>'+verified+' señales operativas verificadas</strong><br>'+warn+' señales requieren atención o contexto adicional.<br><br>La interfaz no inventa porcentajes: el estado viene del runtime cuando está disponible.';
    }catch(e){status.innerHTML='<div class="ak-ws-status"><span><i class="ak-ws-dot warn"></i>Backend</span><b>no disponible</b></div>';evidence.textContent="No se pudo consultar el estado vivo. Los módulos siguen disponibles.";}
  }
  function mountHome(){
    const home=q("#homeSection");if(!home)return;home.classList.add("ak-workspace-home");home.innerHTML=homeMarkup();
    qa("[data-ws-go]",home).forEach(b=>b.addEventListener("click",()=>go(b.getAttribute("data-ws-go"))));
    qa("[data-ws-prompt]",home).forEach(b=>b.addEventListener("click",()=>sendPrompt(b.getAttribute("data-ws-prompt"))));
    const send=q("#akWorkspaceSend"),ta=q("#akWorkspacePrompt");if(send)send.addEventListener("click",()=>sendPrompt(ta&&ta.value));
    if(ta)ta.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send.click();}});
    const file=q("#akWorkspaceFile");if(file)file.addEventListener("click",()=>{const input=q("#fileInput");if(input)input.click();else go("chat");});
    if(window.AkiraEntity&&window.AkiraEntity.mountAll)window.AkiraEntity.mountAll(home);loadLiveContext();
  }
  document.addEventListener("DOMContentLoaded",function(){document.body.classList.add("ak-reference-mode");setupSidebar();setupTopbar();mountHome();});
  window.addEventListener("akira:section-shown",function(e){if(e&&e.detail&&e.detail.section==="office")requestAnimationFrame(()=>{try{window.initAkiraOfficePixel&&window.initAkiraOfficePixel();window.resizeAkiraOfficePixel&&window.resizeAkiraOfficePixel();}catch(_){}});});
  window.AkiraReferenceWorkspace={mountHome,loadLiveContext};
})();