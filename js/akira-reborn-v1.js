/* AKIRA REBORN — Interface v1
   New visual shell over the existing functional runtime.
   No fabricated telemetry. Navigation delegates to the existing real modules.
*/
(function(){
  "use strict";
  const BACKEND_FALLBACK="https://akira-empresa.onrender.com";
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const backend=()=>{try{return localStorage.getItem("akira_backend_url")||BACKEND_FALLBACK}catch(_){return BACKEND_FALLBACK}};
  const auth=()=>{try{return typeof window.akiraAuthHeaders==="function"?window.akiraAuthHeaders():{}}catch(_){return{}}};
  let originalShowSection=null;
  let gateway=null;
  const MODULES=new Set(["chat","membrane","missions","office"]);
  const TITLES={chat:"CONVERSACIÓN",membrane:"CEREBRO",missions:"MISIONES",office:"OFICINA"};
  function moduleHost(){return document.getElementById("arModuleHost")}
  function restoreModule(){
    const host=moduleHost();
    const current=host?.querySelector(".section");
    if(!current)return;
    const main=document.querySelector(".main");
    if(main)main.appendChild(current);
    current.classList.remove("ar-reborn-mounted");
  }
  function mountModule(name){
    if(!MODULES.has(name))return;
    const host=moduleHost(), sec=document.getElementById(name+"Section");
    if(!host||!sec)return;
    if(sec.parentElement!==host)host.appendChild(sec);
    sec.classList.add("ar-reborn-mounted");
    host.dataset.module=name;
    host.querySelector("[data-ar-module-title]")?.replaceChildren(document.createTextNode(TITLES[name]||name.toUpperCase()));
    document.getElementById("akiraRebornShell")?.classList.add("module-mode");
    document.querySelectorAll("[data-ar-go]").forEach(x=>x.classList.toggle("active",x.getAttribute("data-ar-go")===name));
    setTimeout(()=>{
      try{
        if(name==="membrane"&&window.resizeMembrane)window.resizeMembrane();
        if(name==="office"&&window.resizeAkiraOfficePixel)window.resizeAkiraOfficePixel();
      }catch(_){}
    },80);
  }
  function showHome(){
    restoreModule();
    const s=document.getElementById("akiraRebornShell");
    s?.classList.remove("module-mode");
    document.querySelectorAll("[data-ar-go]").forEach(x=>x.classList.toggle("active",x.getAttribute("data-ar-go")==="home"));
    refreshTruth();
  }
  function go(name){
    if(name==="home"){showHome();return}
    try{
      if(typeof window.showSection==="function")window.showSection(name);
      else mountModule(name);
    }catch(e){console.warn(e)}
  }
  function installSectionBridge(){
    if(typeof window.showSection!=="function" || window.showSection.__akiraRebornWrapped)return;
    originalShowSection=window.showSection;
    const wrapped=function(name){
      const result=originalShowSection.apply(this,arguments);
      if(MODULES.has(name))mountModule(name);
      return result;
    };
    wrapped.__akiraRebornWrapped=true;
    window.showSection=wrapped;
  }
  const items=[
    ["chat","⌁","Conversación"],["membrane","◈","Memoria"],["missions","◇","Misiones"],["office","✦","Oficina"]
  ];
  let contextOpen=false;

  function shell(){
    if(document.getElementById("akiraRebornShell"))return;
    document.body.classList.add("ar-reborn-active");
    const nav=items.map((x,i)=>'<button type="button" class="'+(i===0?"active":"")+'" data-ar-go="'+x[0]+'" aria-label="'+x[2]+'" title="'+x[2]+'">'+x[1]+"</button>").join("");
    const html='<div id="akiraRebornShell" role="application" aria-label="Akira">'+
      '<div class="ar-noise"></div>'+
      '<header class="ar-top"><div class="ar-brand"><div class="ar-mark"></div><strong>AKIRA</strong><span>/ cognitive system</span></div><div class="ar-top-status"><i class="ar-live-dot"></i><span id="arConnection">verificando conexión</span></div></header>'+
      '<main class="ar-main">'+
        '<nav class="ar-rail" aria-label="Navegación">'+nav+'<div class="ar-spacer"></div><button type="button" data-ar-context="true" title="Contexto">＋</button></nav>'+
        '<section class="ar-stage">'+
          '<div class="ar-grid"></div>'+
          '<div class="ar-home-content ar-content">'+
            '<div class="ar-kicker">presencia / ahora</div>'+
            '<h1 class="ar-title">¿Qué vamos a <em>construir</em>?</h1>'+
            '<p class="ar-sub" id="arSub">Punto de entrada al sistema cognitivo de Akira: conversación, memoria, conocimiento y ejecución, según lo que el sistema puede verificar. Esta interfaz no inventa capacidades.</p>'+
            '<div class="ar-core-wrap" aria-label="Presencia de Akira"><div class="ar-orbit one"></div><div class="ar-orbit two"></div><div class="ar-orbit three"></div><div class="ar-core"></div><div class="ar-core-label" id="arState">presencia activa</div></div>'+
            '<div class="ar-actions"><button class="ar-action primary" data-ar-go="chat">Hablar con Akira</button><button class="ar-action" data-ar-go="missions">Abrir una misión</button><button class="ar-action" data-ar-go="membrane">Explorar memoria</button></div>'+
          '</div>'+
        '<div class="ar-module-host" id="arModuleHost">'+
          '<div class="ar-module-bar"><span>AKIRA /</span><strong data-ar-module-title>—</strong><button type="button" data-ar-go="home">Volver a presencia</button></div>'+
        '</div>'+
        '</section>'+
        '<aside class="ar-context" id="arContext"><div class="ar-context-head"><div><h2>Contexto vivo</h2><small>solo información disponible</small></div><button class="ar-action" data-ar-context-close="true">Cerrar</button></div>'+
          '<div class="ar-context-box"><h3>Conexión</h3><p id="arConnectionDetail">Consultando el backend real de Akira.</p><div class="ar-truth" id="arTruth"><i></i><span>sin verificar</span></div></div>'+
          '<div class="ar-context-box"><h3>Sesión</h3><p id="arSession">No se ha consultado una sesión en esta vista.</p></div>'+
          '<div class="ar-context-box"><h3>Acciones</h3><p>La memoria, las misiones, la oficina y la administración siguen conectadas a sus módulos reales.</p></div>'+
          '<div class="ar-feed" id="arFeed"></div>'+
        '</aside>'+
      '</main>'+
      '<footer class="ar-dock"><form class="ar-command" id="arCommand"><span>↯</span><input id="arInput" autocomplete="off" placeholder="Escribe una intención para Akira…" /><button>Enviar</button></form></footer>'+
    '</div>';
    document.body.insertAdjacentHTML("afterbegin",html);
    gateway=document.createElement("button");
    gateway.id="akiraRebornReturn";
    gateway.type="button";
    gateway.className="ar-return-gateway";
    gateway.textContent="AKIRA";
    gateway.title="Volver a la presencia de Akira";
    gateway.setAttribute("aria-label","Volver a la presencia de Akira");
    gateway.hidden=true;
    gateway.addEventListener("click",showHome);
    document.body.appendChild(gateway);
    bind();
    installSectionBridge();
    refreshTruth();
  }

  function bind(){
    document.querySelectorAll("[data-ar-go]").forEach(b=>b.addEventListener("click",()=>{
      const name=b.getAttribute("data-ar-go");
      document.querySelectorAll(".ar-rail button").forEach(x=>x.classList.toggle("active",x.getAttribute("data-ar-go")===name));
      go(name);
    }));
    const open=()=>{contextOpen=true;document.getElementById("arContext").classList.add("open")};
    const close=()=>{contextOpen=false;document.getElementById("arContext").classList.remove("open")};
    document.querySelector("[data-ar-context]")?.addEventListener("click",()=>contextOpen?close():open());
    document.querySelector("[data-ar-context-close]")?.addEventListener("click",close);
    document.getElementById("arCommand")?.addEventListener("submit",e=>{
      e.preventDefault();const input=document.getElementById("arInput");const value=String(input.value||"").trim();if(!value)return;
      input.value="";go("chat");
      setTimeout(()=>{
        const msg=document.getElementById("msg");const send=document.getElementById("sendBtn");
        if(msg){msg.value=value;msg.dispatchEvent(new Event("input",{bubbles:true}))}
        if(typeof window.sendMsgStream==="function"){try{window.sendMsgStream()}catch(_){}}
        else if(send){try{send.click()}catch(_){}}
      },120);
      feed("Intención enviada","Akira recibió tu entrada y la entregó al módulo de conversación.");
    });
  }

  function feed(title,body){
    const f=document.getElementById("arFeed");if(!f)return;
    const d=document.createElement("div");d.className="ar-feed-item";d.innerHTML="<b>"+esc(title)+"</b>"+esc(body);f.prepend(d);
    while(f.children.length>5)f.lastChild.remove();
  }

  async function refreshTruth(){
    const conn=document.getElementById("arConnection"),detail=document.getElementById("arConnectionDetail"),truth=document.getElementById("arTruth");
    try{
      const r=await fetch(backend()+"/health",{cache:"no-store"});
      if(!r.ok)throw new Error("HTTP "+r.status);
      conn.textContent="backend conectado";detail.textContent="El backend respondió correctamente al chequeo de salud.";truth.className="ar-truth ok";truth.innerHTML="<i></i><span>verificado ahora</span>";
      document.getElementById("arState").textContent="presencia / conectada";
      feed("Backend verificado","/health respondió correctamente.");
    }catch(e){
      conn.textContent="backend no disponible";detail.textContent="No se pudo verificar el backend en este momento.";truth.className="ar-truth";truth.innerHTML="<i></i><span>no verificado</span>";
      document.getElementById("arState").textContent="presencia / sin conexión";
      feed("Conexión","El backend no respondió al chequeo actual.");
    }
    try{
      const token=localStorage.getItem("akira_session_token");
      const exp=Number(localStorage.getItem("akira_session_exp")||0);
      const sessionEl=document.getElementById("arSession");
      if(token && exp>Date.now()/1000){
        const r=await fetch(backend()+"/api/v8/me",{headers:auth(),cache:"no-store"});
        const d=await r.json().catch(()=>null);
        if(r.ok&&d&&d.authenticated===true){
          sessionEl.textContent=d.is_owner?"Sesión verificada como propietaria.":"Sesión verificada.";
          feed("Sesión verificada",d.email?String(d.email):"Identidad autenticada.");
        }else sessionEl.textContent="Hay una credencial local, pero la sesión no pudo verificarse.";
      }else sessionEl.textContent="No hay una sesión autenticada en este navegador.";
    }catch(_){document.getElementById("arSession").textContent="No se pudo consultar la sesión ahora."}
  }

  let resizeFrame=0;
  window.addEventListener("resize",()=>{
    if(resizeFrame)cancelAnimationFrame(resizeFrame);
    resizeFrame=requestAnimationFrame(()=>{
      try{
        const host=moduleHost();
        if(host?.dataset.module==="office" && typeof window.resizeAkiraOfficePixel==="function"){
          window.resizeAkiraOfficePixel();
        }
        if(host?.dataset.module==="membrane" && typeof window.resizeMembrane==="function"){
          window.resizeMembrane();
        }
      }catch(_){}
    });
  });
  window.addEventListener("akira:session-valid",refreshTruth);
  window.addEventListener("akira:session-invalid",refreshTruth);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",shell,{once:true});else shell();
})();
