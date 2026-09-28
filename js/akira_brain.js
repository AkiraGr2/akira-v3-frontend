// AKIRA ULTRA V2.2 - AUTO STREAM 100% INTERNO - SIN BOTON - AUTO-REPARABLE SEPT 2026
let isOwner = false;
let selectedImageBase64 = null;
let selectedImageMime = "image/jpeg";

if(!localStorage.getItem("akira_backend_url")){
  localStorage.setItem("akira_backend_url", "https://akira-empresa.onrender.com");
}
// 100% AUTO INTERNO - Kira decide sola sin selector visible
let USE_STREAM = true;
let BACKEND_HEALTHY = false;
let LAST_LATENCY = 9999;
let STREAM_FAIL_COUNT = 0;
let AUTO_REPAIR_LOG = [];

function logAutoRepair(action){
  try{
    AUTO_REPAIR_LOG.push({ts: new Date().toISOString(), action, latency: LAST_LATENCY, healthy: BACKEND_HEALTHY, stream: USE_STREAM});
    if(AUTO_REPAIR_LOG.length>20) AUTO_REPAIR_LOG.shift();
    console.log(`[KIRA AUTO-REPAIR] ${action} | lat ${LAST_LATENCY}ms | healthy ${BACKEND_HEALTHY} | stream ${USE_STREAM}`);
    localStorage.setItem("akira_autorepair_log", JSON.stringify(AUTO_REPAIR_LOG.slice(-10)));
  }catch(_){}
}

async function checkBackendHealth(){
  const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
  const start = Date.now();
  try{
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), 6000);
    const r = await fetch(backend + "/health", {method:"GET", signal: ctrl.signal, cache: "no-store"});
    clearTimeout(t);
    const latency = Date.now() - start;
    LAST_LATENCY = latency;
    if(r.ok){
      BACKEND_HEALTHY = true;
      if(latency > 2500){
        if(USE_STREAM){
          logAutoRepair(`Render despertando ${latency}ms -> AUTO OFF interno`);
        }
        USE_STREAM = false;
        setTimeout(async ()=>{
          const ok = await checkBackendHealth();
          if(ok && LAST_LATENCY < 1500){
            USE_STREAM = true;
            STREAM_FAIL_COUNT = 0;
            logAutoRepair(`Backend estable ${LAST_LATENCY}ms -> AUTO ON recuperado`);
          }
        }, 10000);
        return false;
      }
      if(!USE_STREAM && STREAM_FAIL_COUNT===0 && latency < 1500){
        USE_STREAM = true;
        logAutoRepair(`Recuperado estable -> AUTO ON`);
      }
      return true;
    } else {
      BACKEND_HEALTHY = false;
      USE_STREAM = false;
      logAutoRepair(`Health no ok ${r.status} -> AUTO OFF`);
      return false;
    }
  }catch(e){
    BACKEND_HEALTHY = false;
    LAST_LATENCY = 9999;
    USE_STREAM = false;
    logAutoRepair(`Sin conexion ${e.message} -> AUTO OFF`);
    return false;
  }
}

function updateStreamButton(extra=""){
  // YA NO HAY BOTON - solo log interno para autoconciencia
  if(extra) logAutoRepair(`Estado: ${USE_STREAM?'ON':'OFF'} ${extra}`);
}

function handleImageSelect(event){
  const file = event.target.files[0];
  if(!file) return;
  if(file.size > 5*1024*1024){ alert("❌ Imagen muy grande, máximo 5MB"); return; }
  if(file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")){ alert("❌ SVG bloqueado por seguridad. Usa JPG/PNG/WEBP"); return; }
  if(!file.type.startsWith("image/")){ alert("❌ Solo imágenes JPG/PNG/WEBP"); return; }
  if(!["image/jpeg","image/jpg","image/png","image/webp"].includes(file.type)){ alert("❌ Solo JPG/PNG/WEBP por seguridad"); return; }
  selectedImageMime = file.type;
  const reader = new FileReader();
  reader.onload = (e)=>{
    selectedImageBase64 = e.target.result;
    const preview = document.getElementById("imagePreview");
    const img = document.getElementById("previewImg");
    const info = document.getElementById("previewInfo");
    if(preview && img){
      img.src = selectedImageBase64;
      preview.style.display = "block";
      if(info) info.textContent = `${file.name} - ${(file.size/1024).toFixed(0)}KB - ${file.type}`;
    }
  };
  reader.readAsDataURL(file);
}
function clearImagePreview(){
  selectedImageBase64 = null;
  selectedImageMime = "image/jpeg";
  const preview = document.getElementById("imagePreview");
  const input = document.getElementById("imageInput");
  if(preview) preview.style.display = "none";
  if(input) input.value = "";
}
function escapeHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function addTyping(){
  const inner=document.getElementById('msgsInner');
  if(!inner) return 'typing';
  const row=document.createElement('div');
  row.className='msg-row akira';
  const id='typing_'+Date.now();
  row.id=id;
  row.innerHTML=`<div class="avatar"></div><div class="bubble">⏳ Akira pensando...</div>`;
  inner.appendChild(row);
  inner.scrollTop=inner.scrollHeight;
  return id;
}
function removeTyping(id){
  const el=document.getElementById(id);
  if(el) el.remove();
}
function isImageIntent(txt){
  const l = txt.toLowerCase();
  return l.includes("crea la imagen") || l.includes("crear imagen") || l.includes("genera imagen") || l.includes("generar imagen") || l.includes("haz una imagen") || l.includes("imagen de un gato") || l.includes("crea un gato") || (l.includes("imagen") && l.includes("bogot"));
}
async function sendMsg(){
  const inp=document.getElementById('msg');
  if(!inp) return;
  let txt=inp.value.trim();
  if(!txt && !selectedImageBase64) return;
  if(isImageIntent(txt) && !selectedImageBase64){
    addMsg(txt,'user');
    inp.value='';
    await generateImageAkira(txt);
    return;
  }
  // AUTO interno: si backend no sano, verifica antes de intentar stream
  if(USE_STREAM && !BACKEND_HEALTHY){
    const ok = await checkBackendHealth();
    if(!ok){
      USE_STREAM = false;
      logAutoRepair("AUTO OFF - Render frio antes de enviar");
    }
  }
  if(USE_STREAM) return sendMsgStream();
  if(txt.length > 1500){ txt = txt.slice(0,1500); inp.value = txt; }
  const orb=document.getElementById('orb'); if(orb)orb.classList.add('thinking');
  const hasImage = selectedImageBase64 && selectedImageBase64.length > 20;
  if(hasImage) addMsg(txt || "📷 Analiza esta imagen", 'user', selectedImageBase64);
  else addMsg(txt,'user');
  const currentImage = selectedImageBase64;
  const msgToSend = txt || (hasImage ? "Qué ves en esta imagen?" : "");
  inp.value=''; clearImagePreview();
  const tid=addTyping();
  try{ await saveNeuronaHibrida(msgToSend + (hasImage ? " [imagen]" : ""), 'sensorial', 6, ['user_input', hasImage ? 'vision' : 'text']); }catch(e){}
  const uid=localStorage.getItem('akira_user_id')||'anon';
  const uk=localStorage.getItem('akira_user_key')||'';
  const isOwn=localStorage.getItem('akira_is_owner')==='1';
  const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
  try{
    const payload = {message:msgToSend,user_id:uid,user_api_key:uk,is_owner:isOwn};
    if(hasImage && currentImage) payload.image_base64 = currentImage;
    const r = await fetch(backend + "/api/chat", {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!r.ok) throw new Error("Backend error " + r.status);
    const d = await r.json();
    removeTyping(tid); if(orb)orb.classList.remove('thinking');
    let resp = d.response||'Error';
    if(!resp.includes("503") && !resp.includes("UNAVAILABLE")){
      if(LAST_LATENCY < 2000){
        USE_STREAM = true;
        STREAM_FAIL_COUNT = 0;
        logAutoRepair("Mensaje OK en OFF -> recuperado AUTO ON");
      }
      BACKEND_HEALTHY = true;
    }
    addMsg(resp,'akira');
    try{ await saveNeuronaHibrida(d.response || "", 'motora', 5, ['akira_response']); }catch(e){}
    await countNeuronas();
  }catch(e){
    removeTyping(tid); if(orb)orb.classList.remove('thinking');
    BACKEND_HEALTHY = false;
    logAutoRepair(`Error chat ${e.message} -> AUTO OFF y reintento`);
    addMsg('⏳ Akira está despertando el backend, dame 5 segundos y reintenta, tu mensaje quedó guardado en colmena.','akira');
    setTimeout(()=>{ checkBackendHealth(); }, 5000);
  }
}
async function sendMsgStream(){
  const inp=document.getElementById('msg');
  if(!inp) return;
  let txt=inp.value.trim();
  if(!txt && !selectedImageBase64) return;
  if(isImageIntent(txt) && !selectedImageBase64){
    addMsg(txt,'user');
    inp.value='';
    await generateImageAkira(txt);
    return;
  }
  if(txt.length > 1500){ txt = txt.slice(0,1500); inp.value = txt; }
  const orb=document.getElementById('orb'); if(orb)orb.classList.add('thinking');
  const hasImage = selectedImageBase64 && selectedImageBase64.length > 20;
  if(hasImage) addMsg(txt || "📷 Analiza esta imagen", 'user', selectedImageBase64);
  else addMsg(txt,'user');
  const currentImage = selectedImageBase64;
  const msgToSend = txt || (hasImage ? "Qué ves en esta imagen?" : "");
  inp.value=''; clearImagePreview();
  try{ await saveNeuronaHibrida(msgToSend + (hasImage ? " [imagen]" : ""), 'sensorial', 6, ['user_input']); }catch(e){}
  const uid=localStorage.getItem('akira_user_id')||'anon';
  const uk=localStorage.getItem('akira_user_key')||'';
  const isOwn=localStorage.getItem('akira_is_owner')==='1';
  const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
  const inner=document.getElementById('msgsInner');
  const row=document.createElement('div');
  row.className='msg-row akira';
  const bubbleId = 'stream_'+Date.now();
  row.innerHTML=`<div class="avatar"></div><div class="bubble" id="${bubbleId}"><span class="cursor">▌</span></div>`;
  if(inner) inner.appendChild(row);
  if(inner) inner.scrollTop = inner.scrollHeight;
  let fullText = "";
  try{
    const payload = {message:msgToSend,user_id:uid,user_api_key:uk,is_owner:isOwn};
    if(hasImage && currentImage) payload.image_base64 = currentImage;
    const r = await fetch(backend + "/api/chat/stream", {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!r.ok) throw new Error("Stream error "+r.status);
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while(true){
      const {done, value} = await reader.read();
      if(done) break;
      buffer += decoder.decode(value, {stream:true});
      let lines = buffer.split("\n\n");
      buffer = lines.pop();
      for(let line of lines){
        if(line.startsWith("data: ")){
          let dataStr = line.slice(6).trim();
          if(dataStr === "[DONE]") continue;
          try{
            let j = JSON.parse(dataStr);
            if(j.text){
              fullText += j.text;
              const b = document.getElementById(bubbleId);
              if(b){
                b.innerHTML = escapeHtml(fullText).replace(/\n/g,'<br>') + '<span class="cursor">▌</span>';
              }
              if(inner) inner.scrollTop = inner.scrollHeight;
            }
            if(j.done){
              const b = document.getElementById(bubbleId);
              if(b){
                let finalHtml = escapeHtml(fullText).replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<b>$1</b>');
                b.innerHTML = finalHtml;
              }
              try{ await saveNeuronaHibrida(fullText, 'motora', 6, ['akira_response','stream']); }catch(e){}
              await countNeuronas();
              if(orb)orb.classList.remove('thinking');
              BACKEND_HEALTHY = true;
              STREAM_FAIL_COUNT = 0;
              logAutoRepair("Stream OK - estable");
            }
          }catch(e){ console.log("parse sse", e); }
        }
      }
    }
  }catch(e){
    console.error("sendMsgStream error", e);
    STREAM_FAIL_COUNT++;
    BACKEND_HEALTHY = false;
    USE_STREAM = false;
    logAutoRepair(`Fallo stream #${STREAM_FAIL_COUNT} ${e.message} -> AUTO OFF`);
    if(STREAM_FAIL_COUNT >= 2){
      setTimeout(async ()=>{
        await checkBackendHealth();
        if(BACKEND_HEALTHY && LAST_LATENCY < 1500){
          USE_STREAM = true;
          STREAM_FAIL_COUNT = 0;
          logAutoRepair("Recuperado tras 2 fallos -> AUTO ON");
        }
      }, 120000);
    }
    const b = document.getElementById(bubbleId);
    if(b) b.innerHTML = "🔄 Akira cambiando a modo estable...";
    try{
      const payload2 = {message:msgToSend,user_id:uid,user_api_key:uk,is_owner:isOwn};
      if(hasImage && currentImage) payload2.image_base64 = currentImage;
      const r2 = await fetch(backend + "/api/chat", {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload2)});
      const d2 = await r2.json();
      let resp2 = d2.response||'Conexión restablecida';
      if(b) b.innerHTML = escapeHtml(resp2).replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<b>$1</b>');
      if(orb)orb.classList.remove('thinking');
      try{ await saveNeuronaHibrida(d2.response||"", 'motora', 6, ['akira_response','fallback_auto']); }catch(e2){}
      await countNeuronas();
      return;
    }catch(e2){
      if(b) b.innerHTML = '⏳ Akira reconectando colmena... reintento automático en 3s';
      setTimeout(async ()=>{
        try{
          const r3 = await fetch(backend + "/api/chat", {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:msgToSend,user_id:uid,user_api_key:uk,is_owner:isOwn})});
          const d3 = await r3.json();
          if(b) b.innerHTML = escapeHtml(d3.response||'Conexión restablecida').replace(/\n/g,'<br>');
        }catch(_){ if(b) b.innerHTML = '✅ Colmena activa, reintenta en 5s'; }
      }, 3000);
    }
    if(orb)orb.classList.remove('thinking');
  }
}
function addMsg(t,who,imgBase64=null){
  const inner=document.getElementById('msgsInner');
  if(!inner) return;
  const row=document.createElement('div');
  row.className='msg-row '+who;
  let imgHtml='';
  if(imgBase64){
    imgHtml=`<div style="margin-top:8px"><img src="${imgBase64}" style="max-width:260px;border-radius:10px;border:1px solid #2a2a36"></div>`;
  }
  if(who==='user'){
    row.innerHTML=`<div class="bubble">${escapeHtml(t)}${imgHtml}</div>`;
  }else{
    const formatted = t.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<b>$1</b>');
    row.innerHTML=`<div class="avatar"></div><div class="bubble">${formatted}${imgHtml}</div>`;
  }
  inner.appendChild(row);
  inner.scrollTop=inner.scrollHeight;
}
async function sendFeedback(tipo, texto, btn){
  try{
    const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
    const uid=localStorage.getItem('akira_user_id')||'anon';
    await fetch(backend + "/api/feedback", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tipo, texto: texto.slice(0,300), user_id: uid})});
    if(btn){ btn.textContent = tipo==="like" ? "👍 Gracias!" : "👎 Aprendido"; btn.disabled=true; }
  }catch(e){}
}

async function generateImageAkira(prompt){
  try{
    const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
    addMsg(`🎨 Generando imagen: ${prompt.slice(0,80)}...`, 'akira');
    const r = await fetch(backend + "/api/generate/image", {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({prompt, user_id: localStorage.getItem('akira_user_id')||'anon'})
    });
    const d = await r.json();
    if(d.image_url || d.url){
      addMsg(`<img src="${d.image_url||d.url}" style="max-width:100%;border-radius:12px;margin-top:8px">`, 'akira');
    } else if(d.response){
      addMsg(d.response, 'akira');
    } else {
      addMsg("✅ Imagen generada (revisa R2)", 'akira');
    }
  }catch(e){
    addMsg("❌ Error generando imagen: " + e.message, 'akira');
  }
}

function renderLevels(){
  const levels=[
    {nivel:"V1 Chat", estado:"✅", desc:"Chat basico Gemini 3.8-flash Sept 2026", costo:"$0"},
    {nivel:"V2 Colmena", estado:"✅", desc:"IndexedDB 100K + R2 10M", costo:"$0"},
    {nivel:"V3 Tavily + Jina", estado:"✅", desc:"Busqueda real web 1000 req/mes", costo:"$0"},
    {nivel:"V4 Streaming AUTO", estado:"✅", desc:"SSE 100% interno auto-reparable sin botón", costo:"$0"},
    {nivel:"V5 Imagen + Video", estado:"✅", desc:"Pollinations flux + gpt-oss-120b Groq", costo:"$0"},
    {nivel:"V6 Auto-Repair", estado:"✅", desc:"Kira hija autónoma detecta y repara errores", costo:"$0"},
  ];
  const container = document.getElementById("levelsList");
  if(!container) return;
  container.innerHTML = levels.map(l=>`
    <div style="background:#16161b;border:1px solid var(--border);border-radius:12px;padding:14px">
      <div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:14px">${l.nivel}</b><span style="font-size:10px;background:#1e1e26;padding:3px 8px;border-radius:10px;border:1px solid #2a2a36">${l.estado}</span></div>
      <div style="font-size:12.5px;color:var(--muted);margin-top:8px;line-height:1.5">${l.desc}</div>
      <div style="font-size:11px;color:#10b981;margin-top:8px;font-weight:600">Costo: ${l.costo}</div>
    </div>
  `).join("");
}
document.addEventListener("DOMContentLoaded", async ()=>{
  countNeuronas();
  renderLevels();
  logAutoRepair("Inicializando 100% AUTO interno Sept 2026");
  const healthy = await checkBackendHealth();
  if(!healthy){
    logAutoRepair("Backend frio al iniciar -> OFF temporal");
  } else {
    logAutoRepair(`Backend listo latencia ${LAST_LATENCY}ms -> ON`);
  }
  setInterval(async ()=>{
    await checkBackendHealth();
  }, 60000);
  const ta=document.getElementById('msg');
  if(ta){
    ta.addEventListener('keydown',e=>{
      if(e.key==='Enter' && !e.shiftKey){
        e.preventDefault();
        if(typeof sendMsg === 'function') sendMsg();
      }
    });
    ta.addEventListener('input',()=>{
      ta.style.height='auto';
      ta.style.height=Math.min(ta.scrollHeight,160)+'px';
    });
  }
  const purpleBtn = document.getElementById("sendBtn");
  if(purpleBtn){
    purpleBtn.onclick = ()=>{ if(typeof sendMsg==='function') sendMsg(); };
  }
  document.querySelectorAll("button").forEach(b=>{
    if(b.textContent.includes("↑") || b.innerHTML.includes("↑")){
      b.addEventListener("click", (e)=>{
        e.preventDefault();
        if(typeof sendMsg==='function') sendMsg();
      });
    }
  });
});
