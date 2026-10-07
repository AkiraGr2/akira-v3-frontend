/* AKIRA COGNITIVE UI V1 — behavior only, no backend contract changes. */
(function(){
  "use strict";
  const GROUPS=[
    {id:"status",icon:"◉",title:"Estado",desc:"Cómo está Akira ahora"},
    {id:"self",icon:"🪞",title:"Autoconocimiento",desc:"Identidad y estado interno"},
    {id:"thinking",icon:"🧠",title:"Pensamiento",desc:"Pruebas del ciclo cognitivo"},
    {id:"tools",icon:"🧰",title:"Herramientas",desc:"Capacidades y comprobaciones"},
    {id:"agents",icon:"🤖",title:"Agentes",desc:"Equipo y tareas"},
    {id:"brain",icon:"🕸️",title:"Cerebro",desc:"Memoria, conexiones y aprendizaje"},
    {id:"missions",icon:"🎯",title:"Misiones",desc:"Trabajos grandes y progreso"},
    {id:"autonomy",icon:"🛡️",title:"Autonomía",desc:"F14 y acciones con aprobación"},
    {id:"data",icon:"💾",title:"Datos",desc:"Copias y datos locales"}
  ];
  let sections=[],tileGrid=null;
  function inferGroup(section){
    if(section.id==="f14Section")return "autonomy";
    const t=(section.querySelector("h4")?.textContent||"").toLowerCase();
    if(t.includes("¿cómo está"))return "status";
    if(t.includes("conocer a akira"))return "self";
    if(t.includes("probar cómo piensa"))return "thinking";
    if(t.includes("herramientas"))return "tools";
    if(t.includes("agentes"))return "agents";
    if(t.includes("cerebro"))return "brain";
    if(t.includes("misiones"))return "missions";
    if(t.includes("cuidar y guardar"))return "data";
    return "status";
  }
  function openGroup(id){
    sections.forEach(s=>s.hidden=s.dataset.adminGroup!==id);
    if(tileGrid)tileGrid.querySelectorAll(".admin-command-tile").forEach(b=>b.setAttribute("aria-current",b.dataset.group===id?"true":"false"));
    const active=sections.find(s=>s.dataset.adminGroup===id);
    if(active)active.scrollIntoView({behavior:"smooth",block:"start"});
  }
  function addHelp(id,html){
    const el=document.getElementById(id);
    if(!el||el.nextElementSibling?.classList.contains("admin-field-help"))return;
    const box=document.createElement("div");box.className="admin-field-help";box.innerHTML=html;el.insertAdjacentElement("afterend",box);
  }
  window.akiraAdminOpenGroup=openGroup;
  window.akiraAdminSetUiState=function(mode){try{window.akiraEntitySetState&&window.akiraEntitySetState(mode,"#orb");}catch(_){}};
  document.addEventListener("DOMContentLoaded",function(){
    const panel=document.getElementById("adminPanel");if(!panel)return;
    sections=[...panel.querySelectorAll(".admin-v2-section")];
    sections.forEach(s=>{s.dataset.adminGroup=inferGroup(s);s.hidden=true;});
    tileGrid=document.createElement("div");tileGrid.className="admin-command-grid";tileGrid.setAttribute("aria-label","Áreas del centro de control");
    GROUPS.forEach(g=>{
      const b=document.createElement("button");b.type="button";b.className="admin-command-tile";b.dataset.group=g.id;
      b.innerHTML='<span class="tile-kicker">'+g.icon+' Centro de control</span><strong>'+g.title+'</strong><small>'+g.desc+'</small>';
      b.addEventListener("click",()=>openGroup(g.id));tileGrid.appendChild(b);
    });
    const review=document.getElementById("learningReviewPanel");
    panel.insertBefore(tileGrid,review||panel.firstElementChild);
    addHelp("f7Message","<b>¿Qué pongo aquí?</b> Escribe una instrucción corta para probar el pensamiento de Akira. <b>Ejemplo:</b> “Analiza el estado de mi sistema y dime qué revisar primero.”");
    addHelp("missionPanelGoal","<b>¿Qué pongo aquí?</b> Explica el resultado que quieres conseguir. <b>Ejemplo:</b> “Investiga tres opciones para mejorar la velocidad del frontend y compáralas.”");
    addHelp("missionPanelPriority","<b>¿Para qué sirve?</b> Indica qué tan importante es esta misión para ordenar su atención. Normal no significa urgente.");
    openGroup("status");
  });
})();