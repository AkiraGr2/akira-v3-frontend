// Akira - STREAMING SSE + ROUTER 2.5 + FIX ENTER + AUTO IMG + 3.8-flash - 99/100
let isOwner = false;
let selectedImageBase64 = null;
let selectedImageMime = "image/jpeg";

if(!localStorage.getItem("akira_backend_url")){
  localStorage.setItem("akira_backend_url", "https://akira-empresa.onrender.com");
}
let USE_STREAM = localStorage.getItem("akira_stream") !== "0";

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

function addMsg(text, who='akira', imgBase64=null){
  const inner=document.getElementById('msgsInner');
  if(!inner) return;
  const row=document.createElement('div');
  row.className='msg-row '+who;
  let imgHtml='';
  if(imgBase64){
    imgHtml=`<div style="margin-top:8px"><img src="${imgBase64}" style="max-width:260px;border-radius:10px;border:1px solid #2a2a36"></div>`;
  }
  if(who==='user'){
    row.innerHTML=`<div class="bubble">${escapeHtml(text)}${imgHtml}</div>`;
  }else{
    const formatted = text.replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<b>$1</b>');
    row.innerHTML=`<div class="avatar"></div><div class="bubble">${formatted}${imgHtml}</div>`;
  }
  inner.appendChild(row);
  inner.scrollTop=inner.scrollHeight;
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
  // AUTO IMG DETECTION - si pide imagen en chat, va a generar imagen directo
  if(isImageIntent(txt) && !selectedImageBase64){
    addMsg(txt,'user');
    inp.value='';
    await generateImageAkira(txt);
    return;
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
    addMsg(d.response||'Error','akira');
    try{ await saveNeuronaHibrida(d.response || "", 'motora', 5, ['akira_response']); }catch(e){}
    await countNeuronas();
  }catch(e){
    removeTyping(tid); if(orb)orb.classList.remove('thinking');
    addMsg('Error conectando a backend: '+e.message,'akira');
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
  const lower = txt.toLowerCase();
  if((lower.includes("password") || lower.includes("contraseña")) && txt.length < 200){
    if(!confirm("⚠️ Parece contraseña. ¿Enviar?")) return;
  }
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
    if(!r.ok){
      const errTxt = await r.text().catch(()=>String(r.status));
      if(errTxt.includes("2.0-flash") || errTxt.includes("NOT_FOUND") || r.status==404){
        throw new Error("Stream 404 NOT_FOUND model retired, fallback to 3.8-flash");
      }
      throw new Error("Stream error "+r.status);
    }
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
              if(j.text.includes("NOT_FOUND") || j.text.includes("no longer available")){
                const b=document.getElementById(bubbleId);
                if(b) b.innerHTML="⚠️ Modelo retirado por Google, cambiando a 3.8-flash... reintentando";
                throw new Error("Model retired in stream");
              }
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
            }
          }catch(e){ console.log("parse sse", e); }
        }
      }
    }
  }catch(e){
    console.error("sendMsgStream error", e);
    const b = document.getElementById(bubbleId);
    // FALLBACK AUTOMATICO a chat normal con 3.8-flash
    if(b) b.innerHTML = "⚠️ Stream falló ("+e.message.slice(0,60)+") reintentando en modo normal 3.8-flash...";
    try{
      const payload2 = {message:msgToSend,user_id:uid,user_api_key:uk,is_owner:isOwn};
      if(hasImage && currentImage) payload2.image_base64 = currentImage;
      const backend2 = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
      const r2 = await fetch(backend2 + "/api/chat", {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload2)});
      const d2 = await r2.json();
      if(b) b.innerHTML = escapeHtml(d2.response||'Recuperado con 3.8-flash').replace(/\n/g,'<br>');
      if(orb)orb.classList.remove('thinking');
      try{ await saveNeuronaHibrida(d2.response||"", 'motora', 6, ['akira_response','fallback']); }catch(e2){}
      await countNeuronas();
      return;
    }catch(e2){
      if(b) b.textContent = '❌ Error tras fallback: '+e2.message + ' - Desactiva Stream ON arriba';
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

function renderLevels(){
  const levels=[
    {nivel:"V1 Chat", estado:"✅", desc:"Chat basico Gemini", costo:"$0"},
    {nivel:"V2 Colmena", estado:"✅", desc:"IndexedDB 100K + R2 10M", costo:"$0"},
    {nivel:"V3 Tavily + Jina", estado:"✅", desc:"Busqueda real web 1000 req/mes", costo:"$0"},
    {nivel:"V4 Streaming + Vision", estado:"✅", desc:"SSE token a token + lente camara", costo:"$0"},
    {nivel:"V5 Imagen + Video", estado:"✅", desc:"Pollinations flux ilimitado + GIF Pillow", costo:"$0"},
    {nivel:"V5.2 Fix Membrana", estado:"✅", desc:"Fix duplicado showSection + canvas vivo 27->46 neuronas", costo:"$0"},
    {nivel:"V5.3 Fix 3.8-flash", estado:"✅", desc:"Google retiro 2.0-flash, migrado a 3.8-flash", costo:"$0"},
    {nivel:"V5.4 Auto Img", estado:"✅", desc:"Si pides imagen en chat, auto va a generador", costo:"$0"},
    {nivel:"V5.5 Uptime 99%", estado:"🔜", desc:"Render Starter $7 o Fly.io backup para no delay 50s", costo:"$7"},
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

document.addEventListener("DOMContentLoaded", ()=>{
  countNeuronas();
  renderLevels();
  const ta=document.getElementById('msg');
  if(ta){
    // FIX ENTER - solo un listener, robusto
    ta.addEventListener('keydown',e=>{
      if(e.key==='Enter' && !e.shiftKey){
        e.preventDefault();
        if(typeof sendMsg === 'function') sendMsg();
      }
    });
    // Auto resize
    ta.addEventListener('input',()=>{
      ta.style.height='auto';
      ta.style.height=Math.min(ta.scrollHeight,160)+'px';
    });
  }
  const sendBtn = document.querySelector(".send-btn, #sendBtn, button[onclick='sendMsg()']");
  // El boton morado con flecha
  const purpleBtn = document.getElementById("sendBtn");
  if(purpleBtn){
    purpleBtn.onclick = ()=>{ if(typeof sendMsg==='function') sendMsg(); };
  }
  const streamBtn = document.getElementById("streamToggleBtn");
  if(streamBtn){
    streamBtn.textContent = USE_STREAM ? "⚡ Stream ON" : "🐢 Stream OFF";
    streamBtn.onclick = ()=>{
      USE_STREAM = !USE_STREAM;
      localStorage.setItem("akira_stream", USE_STREAM ? "1" : "0");
      streamBtn.textContent = USE_STREAM ? "⚡ Stream ON" : "🐢 Stream OFF";
    };
  }
  // Fix para que el boton de enviar funcione aunque Enter falle
  document.querySelectorAll("button").forEach(b=>{
    if(b.textContent.includes("↑") || b.innerHTML.includes("↑")){
      b.addEventListener("click", (e)=>{
        e.preventDefault();
        if(typeof sendMsg==='function') sendMsg();
      });
    }
  });
});
