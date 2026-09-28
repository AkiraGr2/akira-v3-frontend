// AKIRA OBSIDIAN MEMBRANE + OFFICE FLOOR - FIXED V2.2 - Membrana viva + Oficina Munder Difflin clone - 100% gratis canvas 2D
let membraneCanvas, membraneCtx, membraneNodes=[], membraneAnimId=null;
let officeCanvas, officeCtx, officeAnimId=null, officeAgents=[], officeMessages=[], officeStations=[];

function initMembraneGraph(){
  membraneCanvas = document.getElementById("membraneCanvas");
  if(!membraneCanvas) return;
  membraneCtx = membraneCanvas.getContext("2d");
  const rect = membraneCanvas.parentElement.getBoundingClientRect();
  membraneCanvas.width = rect.width;
  membraneCanvas.height = 420;
  
  // Crear 27 nodos como tu log: shared 25, knowledge 2, vectors 2, hive 2, total 27
  membraneNodes = [];
  for(let i=0;i<27;i++){
    membraneNodes.push({
      x: Math.random()*membraneCanvas.width,
      y: Math.random()*membraneCanvas.height,
      vx: (Math.random()-0.5)*0.8,
      vy: (Math.random()-0.5)*0.8,
      r: 4 + Math.random()*6,
      tipo: i<25?"shared":(i<25+2?"knowledge":"hive"),
      color: i<25?"#6366f1":(i<25+2?"#10b981":"#f59e0b")
    });
  }
  if(membraneAnimId) cancelAnimationFrame(membraneAnimId);
  drawMembrane();
}

function drawMembrane(){
  if(!membraneCtx) return;
  const W = membraneCanvas.width, H = membraneCanvas.height;
  membraneCtx.clearRect(0,0,W,H);
  // fondo grid
  membraneCtx.fillStyle="#0e0e12";
  membraneCtx.fillRect(0,0,W,H);
  
  // conexiones
  membraneCtx.strokeStyle="rgba(99,102,241,0.15)";
  membraneCtx.lineWidth=0.8;
  for(let i=0;i<membraneNodes.length;i++){
    for(let j=i+1;j<membraneNodes.length;j++){
      const dx=membraneNodes[i].x-membraneNodes[j].x;
      const dy=membraneNodes[i].y-membraneNodes[j].y;
      const dist=Math.sqrt(dx*dx+dy*dy);
      if(dist<120){
        membraneCtx.globalAlpha = 1 - dist/120;
        membraneCtx.beginPath();
        membraneCtx.moveTo(membraneNodes[i].x, membraneNodes[i].y);
        membraneCtx.lineTo(membraneNodes[j].x, membraneNodes[j].y);
        membraneCtx.stroke();
      }
    }
  }
  membraneCtx.globalAlpha=1;
  // nodos
  membraneNodes.forEach(n=>{
    n.x+=n.vx; n.y+=n.vy;
    if(n.x<0||n.x>W) n.vx*=-1;
    if(n.y<0||n.y>H) n.vy*=-1;
    membraneCtx.fillStyle=n.color;
    membraneCtx.beginPath();
    membraneCtx.arc(n.x,n.y,n.r,0,Math.PI*2);
    membraneCtx.fill();
    // glow
    membraneCtx.shadowBlur=12;
    membraneCtx.shadowColor=n.color;
    membraneCtx.fill();
    membraneCtx.shadowBlur=0;
  });
  membraneAnimId=requestAnimationFrame(drawMembrane);
}

function addNeuronaToGraph(neurona){
  if(!membraneNodes.length) return;
  // añade nodo temporal
  if(membraneCanvas){
    membraneNodes.push({
      x: membraneCanvas.width/2 + (Math.random()-0.5)*100,
      y: membraneCanvas.height/2 + (Math.random()-0.5)*100,
      vx: (Math.random()-0.5),
      vy: (Math.random()-0.5),
      r: 5,
      tipo: neurona.tipo,
      color: neurona.tipo==="knowledge"?"#10b981":(neurona.tipo==="hive"?"#f59e0b":"#6366f1")
    });
    if(membraneNodes.length>60) membraneNodes.shift();
  }
}

// OFFICE FLOOR - Munder Difflin clone
function initOfficeFloor(){
  officeCanvas = document.getElementById("officeCanvas");
  if(!officeCanvas) return;
  officeCtx = officeCanvas.getContext("2d");
  const parent = officeCanvas.parentElement;
  const rect = parent.getBoundingClientRect();
  officeCanvas.width = Math.min(rect.width-32, 900);
  officeCanvas.height = 560;
  
  const W = officeCanvas.width, H = officeCanvas.height;
  officeStations = [
    {id:"orchestrator", name:"Michael Desk", x:W*0.5, y:H*0.2, icon:"👑", color:"#facc15"},
    {id:"knowledge", name:"📚 Knowledge", x:W*0.15, y:H*0.35, icon:"📚", color:"#10b981"},
    {id:"search", name:"🔍 Tavily Search", x:W*0.85, y:H*0.35, icon:"🔍", color:"#06b6d4"},
    {id:"r2", name:"☁️ R2 Bucket", x:W*0.15, y:H*0.75, icon:"☁️", color:"#6366f1"},
    {id:"vision", name:"🖼️ Vision Lab", x:W*0.85, y:H*0.75, icon:"🖼️", color:"#8b5cf6"},
    {id:"chat", name:"💬 Chat Hub", x:W*0.5, y:H*0.55, icon:"💬", color:"#ec4899"},
  ];
  
  officeAgents = [
    {id:"michael", name:"Michael", role:"GOD Orchestrator", emoji:"👑", color:"#facc15", x:W*0.5, y:H*0.2, tx:W*0.5, ty:H*0.2, state:"idle", task:"Coordinando colmena 27 neuronas", tokens:0, latency:0, speed:0.02},
    {id:"gemini", name:"Gemini", role:"Knowledge Agent", emoji:"🔷", color:"#60a5fa", x:W*0.45, y:H*0.45, tx:officeStations[1].x, ty:officeStations[1].y, state:"thinking", station:"knowledge", tokens:3201, latency:312, task:"Buscando en 25 shared", speed:0.015},
    {id:"groq", name:"Groq", role:"Speed Agent", emoji:"⚡", color:"#fbbf24", x:W*0.55, y:H*0.45, tx:officeStations[2].x, ty:officeStations[2].y, state:"working", station:"search", tokens:1800, latency:98, task:"Generando respuesta fallback", speed:0.025},
    {id:"tavily", name:"Tavily", role:"Search Agent", emoji:"🔍", color:"#34d399", x:W*0.35, y:H*0.6, tx:officeStations[2].x, ty:officeStations[2].y, state:"working", station:"search", tokens:890, latency:450, task:"Scraping web real", speed:0.018},
    {id:"r2", name:"R2", role:"Storage Agent", emoji:"☁️", color:"#818cf8", x:W*0.25, y:H*0.65, tx:officeStations[3].x, ty:officeStations[3].y, state:"idle", station:"r2", tokens:0, latency:0, task:"Sync R2 -> local", speed:0.012},
    {id:"vision", name:"Vision", role:"Vision Agent", emoji:"👁️", color:"#a78bfa", x:W*0.75, y:H*0.65, tx:officeStations[4].x, ty:officeStations[4].y, state:"thinking", station:"vision", tokens:2100, latency:620, task:"Analizando imagen", speed:0.016},
  ];
  officeMessages=[];
  if(officeAnimId) cancelAnimationFrame(officeAnimId);
  drawOffice();
}

function drawOffice(){
  if(!officeCtx) return;
  const W=officeCanvas.width, H=officeCanvas.height;
  officeCtx.clearRect(0,0,W,H);
  // fondo oficina
  officeCtx.fillStyle="#14141a";
  officeCtx.fillRect(0,0,W,H);
  // grid suelo
  officeCtx.strokeStyle="rgba(35,35,42,0.5)";
  officeCtx.lineWidth=1;
  for(let x=0;x<W;x+=40){ officeCtx.beginPath(); officeCtx.moveTo(x,0); officeCtx.lineTo(x,H); officeCtx.stroke(); }
  for(let y=0;y<H;y+=40){ officeCtx.beginPath(); officeCtx.moveTo(0,y); officeCtx.lineTo(W,y); officeCtx.stroke(); }
  
  // estaciones
  officeStations.forEach(s=>{
    officeCtx.fillStyle=s.color+"22";
    officeCtx.strokeStyle=s.color;
    officeCtx.lineWidth=1.5;
    officeCtx.beginPath();
    officeCtx.roundRect(s.x-60, s.y-30, 120, 60, 12);
    officeCtx.fill();
    officeCtx.stroke();
    officeCtx.fillStyle="#ececf1";
    officeCtx.font="12px Inter";
    officeCtx.textAlign="center";
    officeCtx.fillText(s.icon+" "+s.name, s.x, s.y+5);
  });
  
  // mensajes volando
  officeMessages.forEach((m,i)=>{
    m.x += (m.tx - m.x)*0.05;
    m.y += (m.ty - m.y)*0.05;
    m.life--;
    officeCtx.fillStyle="#facc15";
    officeCtx.font="16px Inter";
    officeCtx.fillText("📨", m.x, m.y);
  });
  officeMessages = officeMessages.filter(m=>m.life>0 && Math.abs(m.x-m.tx)>2);
  
  // agentes
  officeAgents.forEach(a=>{
    // mover hacia target
    a.x += (a.tx - a.x)*a.speed;
    a.y += (a.ty - a.y)*a.speed;
    // si llego, cambiar target aleatorio
    if(Math.abs(a.x-a.tx)<5 && Math.abs(a.y-a.ty)<5){
      if(Math.random()<0.02){
        const st = officeStations[Math.floor(Math.random()*officeStations.length)];
        a.tx = st.x + (Math.random()-0.5)*30;
        a.ty = st.y + (Math.random()-0.5)*30;
        a.state = ["thinking","working","idle"][Math.floor(Math.random()*3)];
        // crear mensaje
        if(Math.random()<0.6 && a.id!=="michael"){
          const target = officeAgents.find(o=>o.id==="michael") || officeAgents[0];
          officeMessages.push({x:a.x, y:a.y, tx:target.x, ty:target.y, life:120});
          if(window.addOfficeLog) addOfficeLog(`${a.emoji} ${a.name} -> ${target.emoji} ${target.name}: ${a.task}`, "agent");
        }
      }
    }
    // avatar circulo
    officeCtx.fillStyle=a.color;
    officeCtx.beginPath();
    officeCtx.arc(a.x, a.y, 18, 0, Math.PI*2);
    officeCtx.fill();
    officeCtx.fillStyle="#000";
    officeCtx.font="14px Inter";
    officeCtx.textAlign="center";
    officeCtx.textBaseline="middle";
    officeCtx.fillText(a.emoji, a.x, a.y);
    // estado
    officeCtx.fillStyle=a.color;
    officeCtx.font="9px Inter";
    officeCtx.fillText(a.state, a.x, a.y+28);
    // sombra
    officeCtx.shadowBlur=15;
    officeCtx.shadowColor=a.color;
    officeCtx.fill();
    officeCtx.shadowBlur=0;
  });
  
  officeAnimId=requestAnimationFrame(drawOffice);
}

function addOfficeLog(text, type="info"){
  const el=document.getElementById("officeLog");
  if(!el) return;
  const div=document.createElement("div");
  div.style.cssText="font-size:11px;padding:4px 8px;border-bottom:1px solid #23232a;color:"+(type==="agent"?"#10b981":"#8a8a93");
  div.textContent=new Date().toLocaleTimeString()+" - "+text;
  el.prepend(div);
  if(el.children.length>80) el.removeChild(el.lastChild);
}

function updateOfficeStats(stats){
  const el=document.getElementById("officeStats");
  if(!el) return;
  const m=stats.membrana||{};
  el.innerHTML=`<b>${stats.total||27} neuronas</b> • Shared ${stats.shared||25} • Local ${stats.local||2} • Know ${m.knowledge||2} • Hive ${m.hive||2} • Vec ${m.vectors||2} • Agentes 6 activos`;
}

// Init on load
window.addEventListener("resize", ()=>{
  if(document.getElementById("membraneCanvas")) initMembraneGraph();
  if(document.getElementById("officeCanvas")) initOfficeFloor();
});
