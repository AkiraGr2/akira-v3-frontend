
/* AKIRA REFERENCE DESIGN V2 — desktop + Android workspace shell */
(function(){
  "use strict";
  const navMap=[["home","⌂ Inicio"],["chat","▢ Chat"],["membrane","✣ Cerebro"],["office","◇ Oficina"],["missions","◎ Misiones"],["levels","▥ Niveles"],["upwork","▱ Upwork"],["keys","♙ Cuenta"],["admin","⚙ Admin"]];
  function qs(s,r=document){return r.querySelector(s)}
  function qsa(s,r=document){return Array.from(r.querySelectorAll(s))}
  function clickSection(name){if(typeof window.showSection==="function")window.showSection(name)}
  function homeMarkup(){return `
    <div class="ak-ref-scroll">
      <section class="ak-ref-hero" aria-label="Espacio de trabajo cognitivo de Akira">
        <div class="ak-ref-room-grid"></div>
        <div class="ak-ref-greeting"><div class="ak-ref-kicker">Cognitive Workspace</div><h2>Hola,<br>soy <span>Akira</span></h2><p>“Hoy es un buen día para explorar algo nuevo.”</p><div class="ak-ref-actions"><button class="ak-ref-btn primary" data-ak-ref-go="chat">Conversar</button><button class="ak-ref-btn" data-ak-ref-go="missions">Planificar</button><button class="ak-ref-btn" data-ak-ref-go="office">Ejecutar</button><button class="ak-ref-btn" data-ak-ref-go="membrane">Explorar</button></div></div>
        <div class="ak-ref-orb-stage"><div class="akira-entity-slot akira-ref-orb" data-akira-entity data-state="idle" data-size="560" aria-label="Akira · En calma"></div></div>
        <div class="ak-ref-floating thinking"><strong><span class="ak-ref-status purple"></span>Pensando...</strong><span>Analizando contexto<br>Buscando en memoria<br>Conectando ideas...</span></div>
        <div class="ak-ref-floating memory"><strong><span class="ak-ref-status cyan"></span>Memoria</strong><span>3 conexiones encontradas</span></div>
        <div class="ak-ref-floating executing"><strong><span class="ak-ref-status cyan"></span>Ejecutando</strong><span>Agentes trabajando<br>70% completado</span><div class="ak-ref-progress"><i style="width:70%"></i></div></div>
        <div class="ak-ref-floating learning"><strong><span class="ak-ref-status yellow"></span>Aprendiendo</strong><span>Nuevo conocimiento<br>en proceso...</span></div>
        <aside class="ak-ref-date-card"><div class="date">Martes, 7 de octubre de 2026</div><div class="time">18:24</div><p>“El conocimiento conecta ideas, las ideas crean oportunidades.”<br><br>— Akira</p></aside>
      </section>
      <div class="ak-ref-lower">
        <article class="ak-ref-card"><h3>Estado del sistema <span class="ak-ref-pill">● Operativo</span></h3><div class="ak-ref-stat-grid"><div class="ak-ref-stat"><div class="ring" style="background:conic-gradient(#9b6dff 0 72%,rgba(255,255,255,.08) 72% 100%)"><b>72%</b></div><small>Memoria</small></div><div class="ak-ref-stat"><div class="ring" style="background:conic-gradient(#32c6ff 0 68%,rgba(255,255,255,.08) 68% 100%)"><b>68%</b></div><small>Agentes</small></div><div class="ak-ref-stat"><div class="ring" style="background:conic-gradient(#28e0af 0 54%,rgba(255,255,255,.08) 54% 100%)"><b>54%</b></div><small>Misiones</small></div><div class="ak-ref-stat"><div class="ring" style="background:conic-gradient(#ffb94c 0 81%,rgba(255,255,255,.08) 81% 100%)"><b>81%</b></div><small>Conocimiento</small></div></div></article>
        <article class="ak-ref-card"><h3>Actividad reciente <span>Ver todo</span></h3><div class="ak-ref-row"><div class="label"><span class="dot" style="color:#9b6dff;background:#9b6dff"></span>Memoria actualizada</div><div class="value">Hace 5 min</div></div><div class="ak-ref-row"><div class="label"><span class="dot" style="color:#28e0af;background:#28e0af"></span>Agente completó tarea</div><div class="value">Hace 12 min</div></div><div class="ak-ref-row"><div class="label"><span class="dot" style="color:#ffb94c;background:#ffb94c"></span>Análisis de mercado</div><div class="value">Hace 28 min</div></div><div class="ak-ref-row"><div class="label"><span class="dot" style="color:#32c6ff;background:#32c6ff"></span>Nuevo conocimiento</div><div class="value">Hace 1 h</div></div></article>
        <article class="ak-ref-card"><h3>Misiones en curso <span data-ak-ref-go="missions" style="cursor:pointer">Ver todas</span></h3><div class="ak-ref-row"><div class="label">Investigar oportunidades en Forex</div><div class="value">70%</div></div><div class="ak-ref-row"><div class="label">Guardar y recuperar recuerdo</div><div class="value">100%</div></div><div class="ak-ref-row"><div class="label">Analizar tendencias del mercado</div><div class="value">40%</div></div></article>
        <article class="ak-ref-card ak-ref-chat-mini"><h3>Conversar con Akira <span data-ak-ref-go="chat" style="cursor:pointer">Abrir chat</span></h3><div class="ak-ref-chat-box">Escribe tu mensaje aquí...<br><br>La conversación real sigue en el módulo Chat; este panel es el acceso visual del workspace.</div><div class="ak-ref-chat-footer"><div class="ak-ref-mini-orb"><div class="akira-entity-slot" data-akira-entity data-state="idle" data-size="34" aria-label="Akira · En calma"></div></div><button class="ak-ref-btn primary" data-ak-ref-go="chat">Hablar con Akira</button></div></article>
        <article class="ak-ref-card"><h3>Cerebro <span data-ak-ref-go="membrane" style="cursor:pointer">Explorar</span></h3><p>Mapa de conocimiento, conexiones y memoria de Akira.</p><div class="ak-ref-progress" style="margin-top:20px"><i style="width:78%"></i></div><p style="margin-top:6px">1.428 nodos de conocimiento</p></article>
        <article class="ak-ref-card"><h3>Agentes activos <span data-ak-ref-go="office" style="cursor:pointer">Ver agentes</span></h3><div class="ak-ref-row"><div class="label">Researcher</div><div class="value">Analizando</div></div><div class="ak-ref-row"><div class="label">Developer</div><div class="value">En ejecución</div></div><div class="ak-ref-row"><div class="label">Analyst</div><div class="value">Procesando</div></div><div class="ak-ref-row"><div class="label">Strategist</div><div class="value">En espera</div></div></article>
      </div>
      <div class="ak-ref-quick"><button data-ak-ref-go="chat"><strong>＋ Nueva conversación</strong><small>Habla con Akira</small></button><button data-ak-ref-go="missions"><strong>◎ Crear misión</strong><small>Define un objetivo</small></button><button data-ak-ref-go="membrane"><strong>✣ Explorar cerebro</strong><small>Conocimiento y conexiones</small></button><button data-ak-ref-go="office"><strong>◇ Abrir oficina</strong><small>Ve a tus agentes</small></button><button data-ak-ref-go="levels"><strong>▥ Ver niveles</strong><small>Tu evolución</small></button></div>
      <nav class="ak-ref-mobile-nav" aria-label="Navegación móvil"><button data-ak-ref-go="home">⌂<br>Inicio</button><button data-ak-ref-go="chat">▢<br>Chat</button><button data-ak-ref-go="membrane">✣<br>Cerebro</button><button data-ak-ref-go="missions">◎<br>Misiones</button><button data-ak-ref-go="admin">•••<br>Más</button></nav>
    </div>
  `}

  function ensureMobileChrome(){
    let header=document.querySelector(".ak-mobile-reference-header");
    let nav=document.querySelector(".ak-mobile-reference-nav");
    if(!header){
      header=document.createElement("header");
      header.className="ak-mobile-reference-header";
      header.innerHTML='<button class="ak-mobile-back" type="button" aria-label="Volver">←</button><div class="ak-mobile-title">AKIRA</div><button class="ak-mobile-bell" type="button" aria-label="Notificaciones">♧</button>';
      document.body.appendChild(header);
    }
    if(!nav){
      nav=document.createElement("nav");
      nav.className="ak-mobile-reference-nav";
      nav.setAttribute("aria-label","Navegación móvil");
      const items=[["home","⌂","Inicio"],["chat","▢","Chat"],["membrane","✣","Cerebro"],["missions","◎","Misiones"],["more","•••","Más"]];
      nav.innerHTML=items.map(([name,icon,label])=>'<button type="button" data-ak-mobile-go="'+name+'"><span>'+icon+'</span><small>'+label+'</small></button>').join("");
      document.body.appendChild(nav);
    }
    if(!nav.dataset.wired){
      nav.querySelectorAll("[data-ak-mobile-go]").forEach(btn=>{
        btn.addEventListener("click",()=>{
          const target=btn.getAttribute("data-ak-mobile-go");
          if(target==="more"){toggleSidebar();return;}
          clickSection(target);
        });
      });
      nav.dataset.wired="1";
    }
    const back=header.querySelector(".ak-mobile-back");
    if(back&&!back.dataset.wired){
      back.addEventListener("click",()=>{
        const active=qsa(".section.active").find(x=>x.id);
        if(active&&active.id==="homeSection"){toggleSidebar();return;}
        clickSection("home");
      });
      back.dataset.wired="1";
    }
    if(!document.body.__akiraMobileChromeObserved){
      const observer=new MutationObserver(syncMobileChrome);
      observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:["class"]});
      document.body.__akiraMobileChromeObserved=true;
    }
    syncMobileChrome();
  }
  function syncMobileChrome(){
    const header=document.querySelector(".ak-mobile-reference-header");
    const nav=document.querySelector(".ak-mobile-reference-nav");
    if(!header||!nav)return;
    const active=qsa(".section.active").find(x=>x.id);
    const id=active?active.id:"homeSection";
    const map={
      homeSection:["AKIRA",false],
      chatSection:["Chat con Akira",true],
      membraneSection:["Cerebro",true],
      officeSection:["Oficina",true],
      missionsSection:["Misiones",true],
      levelsSection:["Niveles",true],
      upworkSection:["Upwork",true],
      keysSection:["Cuenta",true],
      adminSection:["Admin",true]
    };
    const entry=map[id]||["AKIRA",false];
    const title=header.querySelector(".ak-mobile-title");
    const back=header.querySelector(".ak-mobile-back");
    if(title)title.textContent=entry[0];
    if(back){
      back.textContent=entry[1]?"←":"☰";
      back.setAttribute("aria-label",entry[1]?"Volver al inicio":"Abrir menú");
      back.onclick=entry[1]?()=>clickSection("home"):()=>clickSection("admin");
    }
    nav.querySelectorAll("button").forEach(b=>{
      const t=b.getAttribute("data-ak-mobile-go");
      const activeKey=t==="more"?"admin":t;
      b.classList.toggle("active",activeKey===({homeSection:"home",chatSection:"chat",membraneSection:"membrane",missionsSection:"missions"}[id]||""));
    });
  }
  function ensureMobileChatIntro(){
    const chat=qs("#chatSection"), inner=qs("#msgsInner",chat);
    if(!chat||!inner||inner.querySelector(".ak-chat-reference-intro"))return;
    const intro=document.createElement("div");
    intro.className="ak-chat-reference-intro";
    intro.innerHTML='<div class="ak-chat-reference-orb"><div class="akira-entity-slot" data-akira-entity data-state="idle" data-size="220" aria-label="Akira · En calma"></div></div>'+
      '<h2>Hola,<br>soy <span>Akira</span></h2>'+
      '<p>¿Qué te gustaría explorar hoy?</p>'+
      '<div class="ak-chat-reference-actions">'+
        '<button type="button" data-chat-action="message">↗ Analizar un tema</button>'+
        '<button type="button" data-chat-action="missions">⊙ Crear una misión</button>'+
        '<button type="button" data-chat-action="brain">✣ Explorar mi memoria</button>'+
        '<button type="button" data-chat-action="office">◈ Consultar agentes</button>'+
      '</div>';
    inner.insertBefore(intro,inner.firstChild);
    const legacy=Array.from(inner.querySelectorAll(".msg-row.akira")).find(el=>/Hola, soy Akira/i.test(el.textContent||""));
    if(legacy)legacy.classList.add("ak-reference-legacy-intro");
    intro.querySelectorAll("[data-chat-action]").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const action=btn.getAttribute("data-chat-action");
        if(action==="missions")return clickSection("missions");
        if(action==="brain")return clickSection("membrane");
        if(action==="office")return clickSection("office");
        const msg=qs("#msg");
        if(msg){
          msg.value="Analicemos un tema";
          msg.focus();
          msg.dispatchEvent(new Event("input",{bubbles:true}));
        }
      });
    });
    if(window.AkiraEntity&&window.AkiraEntity.mountAll)window.AkiraEntity.mountAll(intro);
  }

  function setupNav(){
    const brand=qs(".brand");
    if(brand){
      brand.innerHTML='<div class="ak-ref-logo-mark" aria-hidden="true"><svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke-linecap="round"><path d="M22 4v10M22 30v10M4 22h10M30 22h10" stroke="#9b74ff" stroke-width="2"/><path d="M9 9l7 7M28 28l7 7M35 9l-7 7M16 28l-7 7" stroke="#43dfff" stroke-width="2"/><circle cx="22" cy="22" r="7" stroke="#ff63d7" stroke-width="2"/><circle cx="22" cy="22" r="2.5" fill="#fff" stroke="none"/></g></svg></div><div><h1>AKIRA</h1><p>Cognitive Workspace</p></div>';
    }
    const nav=qs("#sidebar .nav");
    if(!nav)return;
    nav.innerHTML="";
    navMap.forEach(([name,label])=>{
      const btn=document.createElement("button");
      btn.className="nav-btn";
      btn.id="btn-"+name;
      btn.type="button";
      btn.textContent=label;
      btn.addEventListener("click",()=>clickSection(name));
      nav.appendChild(btn);
    });
    const active=qsa(".section.active").find(x=>x.id);
    const activeName=active&&active.id.endsWith("Section")?active.id.slice(0,-7):"home";
    const activeBtn=qs("#btn-"+activeName,nav);
    if(activeBtn)activeBtn.classList.add("active");
  }
  function setupTopbar(){const model=qs(".topbar .model-pill");if(model)model.textContent="Pregunta algo a Akira..."}
  function mountHome(){const main=qs(".main");if(!main)return;let home=qs("#homeSection");if(!home){home=document.createElement("div");home.id="homeSection";home.className="section ak-reference-home";const chat=qs("#chatSection");if(chat)main.insertBefore(home,chat);else main.appendChild(home)}home.innerHTML=homeMarkup();qsa("[data-ak-ref-go]",home).forEach(el=>el.addEventListener("click",()=>clickSection(el.getAttribute("data-ak-ref-go"))));if(window.AkiraEntity&&window.AkiraEntity.mountAll)window.AkiraEntity.mountAll(home)}
   document.addEventListener("DOMContentLoaded",function(){document.body.classList.add("ak-reference-mode");ensureMobileChrome();setupNav();setupTopbar();mountHome();ensureMobileChatIntro();if(typeof window.showSection==="function" && !qsa(".section.active").some(s=>s.id && s.id!=="chatSection"))window.showSection("home")});
    window.addEventListener("akira:section-shown",function(event){
    if(!event||!event.detail||event.detail.section!=="office")return;
    requestAnimationFrame(function(){
      try{
        if(typeof window.initAkiraOfficePixel==="function")window.initAkiraOfficePixel();
        if(typeof window.resizeAkiraOfficePixel==="function")window.resizeAkiraOfficePixel();
      }catch(_){}
    });
  });
  window.AkiraReferenceWorkspace={mountHome,setupNav};
})();