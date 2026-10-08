// AKIRA ULTRA V2.3 - AUTO STREAM 100% INTERNO - SIN BOTON - AUTO-REPARABLE SEPT 2026
// B1: cabeceras con sesion firmada (usa akiraAuthHeaders de index.html; si no existe, cabecera basica)
// V8-B5-fix (H-05): ya NO se envia is_owner desde el cliente. El backend lo resuelve
// unicamente por sesion firmada. El residuo anterior era inofensivo pero confuso.
// Fase 10.7.2: envia y recibe conversation_id para persistir chats en el servidor.
// Fase 11.0 (2026-10-01): guardado de chat crudo DESHABILITADO. Las 5 llamadas a
//   saveNeuronaHibrida quedan comentadas. Razón: el chat crudo se estaba guardando
//   como "memoria", llenando la base de ruido y violando P1 del Contrato V8.
//   Se reactivará con extractor real de hechos en Fase 11. Ver Handoff Maestro.
function _akiraH(){ return (typeof akiraAuthHeaders==='function') ? akiraAuthHeaders() : {'Content-Type':'application/json'}; }
let selectedImageBase64 = null;
let selectedImageMime = "image/jpeg";

if(!localStorage.getItem("akira_backend_url")){
  localStorage.setItem("akira_backend_url", "https://akira-empresa.onrender.com");
}
// 100% AUTO INTERNO - Akira decide sola sin selector visible
let USE_STREAM = true;
let BACKEND_HEALTHY = false;
let LAST_LATENCY = 9999;
let STREAM_FAIL_COUNT = 0;
let AUTO_REPAIR_LOG = [];

function _newChatExchangeId(){
  try{
    if(window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
  }catch(_){ }
  return 'chat_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,10);
}

function logAutoRepair(action){
  try{
    AUTO_REPAIR_LOG.push({ts: new Date().toISOString(), action, latency: LAST_LATENCY, healthy: BACKEND_HEALTHY, stream: USE_STREAM});
    if(AUTO_REPAIR_LOG.length>20) AUTO_REPAIR_LOG.shift();
    console.log(`[AKIRA AUTO-REPAIR] ${action} | lat ${LAST_LATENCY}ms | healthy ${BACKEND_HEALTHY} | stream ${USE_STREAM}`);
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
        logAutoRepair("Stream pausado hasta recibir una prueba real de stream OK");
        return false;
      }
      // /health demuestra disponibilidad del backend, NO la salud del canal SSE.
      // La reactivación de USE_STREAM ocurre exclusivamente cuando /api/chat/stream
      // entrega un evento done correctamente.
      return true;
    }
    BACKEND_HEALTHY = false;
    USE_STREAM = false;
    logAutoRepair(`Health no ok ${r.status} -> AUTO OFF`);
    return false;
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
  row.innerHTML=`<div class="avatar akira-entity-slot" data-akira-entity data-state="thinking" data-size="42" aria-label="Akira · Pensando"></div><div class="bubble"><span class="typing-copy">Akira está pensando…</span><span class="cursor">▌</span></div>`;
  try{const entity=row.querySelector("[data-akira-entity]");if(entity&&window.akiraEntityMount)window.akiraEntityMount(entity);}catch(_){}
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
  try{window.akiraEntitySetState&&window.akiraEntitySetState('thinking',".akira-global-entity");}catch(_){}
  const hasImage = selectedImageBase64 && selectedImageBase64.length > 20;
  if(hasImage) addMsg(txt || "📷 Analiza esta imagen", 'user', selectedImageBase64);
  else addMsg(txt,'user');
  const currentImage = selectedImageBase64;
  const msgToSend = txt || (hasImage ? "Qué ves en esta imagen?" : "");
  const exchangeId = _newChatExchangeId();
  inp.value=''; clearImagePreview();
  const tid=addTyping();
  // FASE 11.0 (2026-10-01): guardado de mensaje del usuario DESHABILITADO.
  // Razón: el chat crudo no es memoria. Ver Handoff Maestro PARTE 16.
  // try{ await saveNeuronaHibrida(msgToSend + (hasImage ? " [imagen]" : ""), 'sensorial', 6, ['user_input', hasImage ? 'vision' : 'text']); }catch(e){}
  const uid=localStorage.getItem('akira_user_id')||'anon';
  const uk=localStorage.getItem('akira_user_key')||'';
  const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
  try{
    // H-05: el cliente ya NO envia is_owner. El backend lo resuelve por sesion firmada.
    // Fase 10.7.2: envia conversation_id si hay una activa.
    const payload = {message:msgToSend,user_id:uid,user_api_key:uk,chat_exchange_id:exchangeId};
    if(hasImage && currentImage) payload.image_base64 = currentImage;
    try {
      const _cid = (window.akiraConversations && window.akiraConversations.getConversationIdForRequest) ? window.akiraConversations.getConversationIdForRequest() : null;
      if (_cid) payload.conversation_id = _cid;
    } catch(_){}
    const r = await fetch(backend + "/api/chat", {method:'POST',headers:_akiraH(),body:JSON.stringify(payload)});
    if(!r.ok){ if(r.status===401 && window.akiraHandleAuthFailure) window.akiraHandleAuthFailure(401); throw new Error("Backend error " + r.status); }
    const d = await r.json();
    try {
      if (d && d.conversation_id && window.akiraConversations && window.akiraConversations.onConversationIdReceived) {
        window.akiraConversations.onConversationIdReceived(d.conversation_id, d.conversation_message_count);
      }
    } catch(_){}
    removeTyping(tid); if(orb)orb.classList.remove('thinking');
    try{window.akiraEntitySetState&&window.akiraEntitySetState((d.response||'Error')!=='Error'?'success':'error',".akira-global-entity");}catch(_){}
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
    // FASE 11.0 (2026-10-01): guardado de respuesta de Akira DESHABILITADO.
    // try{ await saveNeuronaHibrida(d.response || "", 'motora', 5, ['akira_response']); }catch(e){}
    await countNeuronas();
  }catch(e){
    removeTyping(tid); if(orb)orb.classList.remove('thinking');
    try{window.akiraEntitySetState&&window.akiraEntitySetState('error',".akira-global-entity");setTimeout(()=>window.akiraEntitySetState&&window.akiraEntitySetState('idle',".akira-global-entity"),1600);}catch(_){}
    BACKEND_HEALTHY = false;
    logAutoRepair(`Error chat ${e.message} -> AUTO OFF y reintento`);
    try{window.akiraEntitySetState&&window.akiraEntitySetState('error',".akira-global-entity");setTimeout(()=>window.akiraEntitySetState&&window.akiraEntitySetState('idle',".akira-global-entity"),1600);}catch(_){}
    addMsg('⏳ Akira está reconectando el backend. Puedes reintentar en unos segundos.','akira');
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
  const exchangeId = _newChatExchangeId();
  inp.value=''; clearImagePreview();
  // FASE 11.0 (2026-10-01): guardado de mensaje del usuario (stream) DESHABILITADO.
  // try{ await saveNeuronaHibrida(msgToSend + (hasImage ? " [imagen]" : ""), 'sensorial', 6, ['user_input']); }catch(e){}
  const uid=localStorage.getItem('akira_user_id')||'anon';
  const uk=localStorage.getItem('akira_user_key')||'';
  const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
  const inner=document.getElementById('msgsInner');
  const row=document.createElement('div');
  row.className='msg-row akira';
  const bubbleId = 'stream_'+Date.now();
  row.innerHTML=`<div class="avatar akira-entity-slot" data-akira-entity data-state="thinking" data-size="42" aria-label="Akira · Pensando"></div><div class="bubble" id="${bubbleId}"><span class="typing-copy">Akira está pensando…</span><span class="cursor">▌</span></div>`;
  try{const entity=row.querySelector("[data-akira-entity]");if(entity&&window.akiraEntityMount)window.akiraEntityMount(entity);}catch(_){}
  if(inner) inner.appendChild(row);
  if(inner) inner.scrollTop = inner.scrollHeight;
  let fullText = "";
  try{
    // H-05: el cliente ya NO envia is_owner. El backend lo resuelve por sesion firmada.
    // Fase 10.7.2: envia conversation_id si hay una activa.
    const payload = {message:msgToSend,user_id:uid,user_api_key:uk,chat_exchange_id:exchangeId};
    if(hasImage && currentImage) payload.image_base64 = currentImage;
    try {
      const _cid = (window.akiraConversations && window.akiraConversations.getConversationIdForRequest) ? window.akiraConversations.getConversationIdForRequest() : null;
      if (_cid) payload.conversation_id = _cid;
    } catch(_){}
    const r = await fetch(backend + "/api/chat/stream", {method:'POST',headers:_akiraH(),body:JSON.stringify(payload)});
    if(!r.ok){ if(r.status===401 && window.akiraHandleAuthFailure) window.akiraHandleAuthFailure(401); throw new Error("Stream error "+r.status); }
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
              try{const entity=row.querySelector("[data-akira-entity]");if(entity&&entity.__akiraEntity)entity.__akiraEntity.setState("success");}catch(_){}
              try{window.akiraEntitySetState&&window.akiraEntitySetState("success",".akira-global-entity");}catch(_){}
              const b = document.getElementById(bubbleId);
              if(b){
                let finalHtml = escapeHtml(fullText).replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<b>$1</b>');
                b.innerHTML = finalHtml;
              }
              try {
                if (j.conversation_id && window.akiraConversations && window.akiraConversations.onConversationIdReceived) {
                  window.akiraConversations.onConversationIdReceived(j.conversation_id, j.conversation_message_count);
                }
              } catch(_){}
              // FASE 11.0 (2026-10-01): guardado de respuesta de Akira (stream) DESHABILITADO.
              // try{ await saveNeuronaHibrida(fullText, 'motora', 6, ['akira_response','stream']); }catch(e){}
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
    try{const entity=row.querySelector("[data-akira-entity]");if(entity&&entity.__akiraEntity)entity.__akiraEntity.setState("uncertain");}catch(_){}
    try{window.akiraEntitySetState&&window.akiraEntitySetState("uncertain",".akira-global-entity");}catch(_){}
    const b = document.getElementById(bubbleId);
    if(b) b.innerHTML = "🔄 Akira está cambiando a un modo estable…";
    try{
      const payload2 = {message:msgToSend,user_id:uid,user_api_key:uk,chat_exchange_id:exchangeId};
      if(hasImage && currentImage) payload2.image_base64 = currentImage;
      try {
        const _cid2 = (window.akiraConversations && window.akiraConversations.getConversationIdForRequest) ? window.akiraConversations.getConversationIdForRequest() : null;
        if (_cid2) payload2.conversation_id = _cid2;
      } catch(_){}
      const r2 = await fetch(backend + "/api/chat", {method:'POST',headers:_akiraH(),body:JSON.stringify(payload2)});
      const d2 = await r2.json();
      try {
        if (d2 && d2.conversation_id && window.akiraConversations && window.akiraConversations.onConversationIdReceived) {
          window.akiraConversations.onConversationIdReceived(d2.conversation_id, d2.conversation_message_count);
        }
      } catch(_){}
      let resp2 = d2.response||'Conexión restablecida';
      try{const entity=row.querySelector("[data-akira-entity]");if(entity&&entity.__akiraEntity)entity.__akiraEntity.setState("success");}catch(_){}
      try{window.akiraEntitySetState&&window.akiraEntitySetState("success",".akira-global-entity");}catch(_){}
      if(b) b.innerHTML = escapeHtml(resp2).replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<b>$1</b>');
      if(orb)orb.classList.remove('thinking');
      // FASE 11.0 (2026-10-01): guardado de respuesta de Akira (fallback) DESHABILITADO.
      // try{ await saveNeuronaHibrida(d2.response||"", 'motora', 6, ['akira_response','fallback_auto']); }catch(e2){}
      await countNeuronas();
      return;
    }catch(e2){
      if(b) b.innerHTML = '⏳ Akira reconectando colmena... reintento automático en 3s';
      setTimeout(async ()=>{
        try{
          const payload3 = {message:msgToSend,user_id:uid,user_api_key:uk,chat_exchange_id:exchangeId};
          try {
            const _cid3 = (window.akiraConversations && window.akiraConversations.getConversationIdForRequest) ? window.akiraConversations.getConversationIdForRequest() : null;
            if (_cid3) payload3.conversation_id = _cid3;
          } catch(_){}
          const r3 = await fetch(backend + "/api/chat", {method:'POST',headers:_akiraH(),body:JSON.stringify(payload3)});
          const d3 = await r3.json();
          try {
            if (d3 && d3.conversation_id && window.akiraConversations && window.akiraConversations.onConversationIdReceived) {
              window.akiraConversations.onConversationIdReceived(d3.conversation_id, d3.conversation_message_count);
            }
          } catch(_){}
          try{const entity=row.querySelector("[data-akira-entity]");if(entity&&entity.__akiraEntity)entity.__akiraEntity.setState("success");}catch(_){}
          try{window.akiraEntitySetState&&window.akiraEntitySetState("success",".akira-global-entity");}catch(_){}
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
    row.innerHTML=`<div class="avatar akira-entity-slot" data-akira-entity data-state="success" data-size="42" aria-label="Akira · Lista"></div><div class="bubble">${formatted}${imgHtml}</div>`;
    try{const entity=row.querySelector("[data-akira-entity]");if(entity&&window.akiraEntityMount)window.akiraEntityMount(entity);}catch(_){}
  }
  inner.appendChild(row);
  inner.scrollTop=inner.scrollHeight;
}
async function sendFeedback(tipo, texto, btn){
  try{
    const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
    const uid=localStorage.getItem('akira_user_id')||'anon';
    await fetch(backend + "/api/feedback", {method:"POST",headers:_akiraH(),body:JSON.stringify({tipo, texto: texto.slice(0,300), user_id: uid})});
    if(btn){ btn.textContent = tipo==="like" ? "👍 Gracias!" : "👎 Aprendido"; btn.disabled=true; }
  }catch(e){}
}

async function generateImageAkira(prompt){
  try{
    const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
    addMsg(`🎨 Generando imagen: ${prompt.slice(0,80)}...`, 'akira');
    const r = await fetch(backend + "/api/generate/image", {
      method: "POST",
      headers: _akiraH(),
      body: JSON.stringify({prompt, user_id: localStorage.getItem('akira_user_id')||'anon'})
    });
    const d = await r.json();
    if(r.status===401 && window.akiraHandleAuthFailure) window.akiraHandleAuthFailure(401);
    if(!r.ok){
      addMsg("⚠️ Generación de imagen no disponible: " + (d.message || d.reason || ("HTTP " + r.status)), 'akira');
      return;
    }
    if(d.image_url || d.url){
      const src = String(d.image_url || d.url || "");
      const allowed = src.startsWith("https://") || src.startsWith("data:image/png;base64,") || src.startsWith("data:image/jpeg;base64,") || src.startsWith("data:image/webp;base64,");
      if(!allowed){
        addMsg("⚠️ El proveedor devolvió una referencia de imagen no permitida.", 'akira');
        return;
      }
      const row = document.createElement("div");
      row.className = "msg-row akira";
      const avatar = document.createElement("div");
      avatar.className = "avatar";
      const bubble = document.createElement("div");
      bubble.className = "bubble";
      const img = document.createElement("img");
      img.src = src;
      img.alt = "Imagen generada por Akira";
      img.style.maxWidth = "100%";
      img.style.borderRadius = "12px";
      img.style.marginTop = "8px";
      bubble.appendChild(img);
      row.appendChild(avatar);
      row.appendChild(bubble);
      const inner = document.getElementById("msgsInner");
      if(inner){ inner.appendChild(row); inner.scrollTop = inner.scrollHeight; }
    } else if(d.response){
      addMsg(d.response, 'akira');
    } else {
      addMsg("⚠️ El proveedor no devolvió una imagen.", 'akira');
    }
  }catch(e){
    addMsg("❌ Error generando imagen: " + e.message, 'akira');
  }
}


document.addEventListener("DOMContentLoaded", async ()=>{
  countNeuronas();
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
    if(b === purpleBtn) return;
    if(b.textContent.includes("↑") || b.innerHTML.includes("↑")){
      b.addEventListener("click", (e)=>{
        e.preventDefault();
        if(typeof sendMsg==='function') sendMsg();
      });
    }
  });
});
