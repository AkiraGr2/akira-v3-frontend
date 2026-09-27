// Akira - STREAMING SSE + ROUTER 2.5 + ADMIN Grimm/Akirakey1994 + OFFICE + UPWORK - 96/100 - FIX ENTER + NIVELES + MEMBRANA
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

async function sendMsg(){
  if(USE_STREAM) return sendMsgStream();
  const inp=document.getElementById('msg');
  if(!inp) return;
  let txt=inp.value.trim();
  const hasImage = selectedImageBase64 && selectedImageBase64.length > 20;
  if(!txt && !hasImage) return;
  if(txt.length > 1500){ txt = txt.slice(0,1500); inp.value = txt; }
  const orb=document.getElementById('orb'); if(orb)orb.classList.add('thinking');
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
    const imp = (msgToSend.toLowerCase().includes("qué es") || hasImage) ? 8 : 5;
    try{ await saveNeuronaHibrida(d.response || "", 'motora', imp, ['akira_response']); }catch(e){}
    if(window.speechSynthesis && d.response && localStorage.getItem('akira_voice')!=='0') speak(d.response);
    await countNeuronas();
    if(window.addOfficeLog) addOfficeLog(`💬 Chat: ${msgToSend.slice(0,30)}... -> ${d.model||'Akira'}`, "info");
  }catch(e){
    removeTyping(tid); if(orb)orb.classList.remove('thinking');
    addMsg('Error conectando a backend. Verifica URL Render: '+e.message,'akira');
  }
}

async function sendMsgStream(){
  const inp=document.getElementById('msg');
  if(!inp) return;
  let txt=inp.value.trim();
  const hasImage = selectedImageBase64 && selectedImageBase64.length > 20;
  if(!txt && !hasImage) return;
  if(txt.length > 1500){ txt = txt.slice(0,1500); inp.value = txt; }
  const lower = txt.toLowerCase();
  if((lower.includes("password") || lower.includes("contraseña")) && txt.length < 200){
    if(!confirm("⚠️ Parece contraseña. ¿Enviar?")) return;
  }
  const orb=document.getElementById('orb'); if(orb)orb.classList.add('thinking');
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
              if(b) b.innerHTML = fullText.replace(/\n/g,'<br>');
              if(inner) inner.scrollTop = inner.scrollHeight;
            }
          }catch(e){}
        }
      }
    }
    if(orb) orb.classList.remove('thinking');
    try{ await saveNeuronaHibrida(fullText, 'motora', 6, ['akira_response','stream']); }catch(e){}
    await countNeuronas();
    if(window.speechSynthesis && fullText && localStorage.getItem('akira_voice')!=='0') speak(fullText);
  }catch(e){
    if(orb) orb.classList.remove('thinking');
    const b=document.getElementById(bubbleId);
    if(b) b.innerHTML = '❌ Error stream: '+e.message;
  }
}

function saveKey(){
  const inp=document.getElementById('apiKeyInput');
  if(!inp) return;
  let k=inp.value.trim();
  if(!k){ alert('Pega tu key'); return; }
  if(k.length<8){ alert('Key muy corta'); return; }
  // Acepta AIza, AQ., gsk_ y cualquier BYOK
  if(k.startsWith('AIza') || k.startsWith('AQ.') || k.startsWith('gsk_') || k.length>20){
    localStorage.setItem('akira_user_key', k);
    const el=document.getElementById('keyStatus');
    if(el) el.textContent='✅ Key guardada '+k.slice(0,10)+'...';
    addMsg('🔑 Key guardada '+k.slice(0,12)+'...','akira');
    if(window.addAdminLog) addAdminLog('Key guardada '+k.slice(0,10));
  }else{
    alert('Key no válida, debe empezar con AIza, AQ. o gsk_ o tener +20 chars');
  }
}

function speak(text){
  if(!window.speechSynthesis) return;
  try{
    const u=new SpeechSynthesisUtterance(text.slice(0,600));
    u.lang='es-CO';
    u.rate=1.0;
    speechSynthesis.speak(u);
  }catch(e){}
}
function toggleVoice(){
  const cur=localStorage.getItem('akira_voice')!=='0';
  localStorage.setItem('akira_voice', cur?'0':'1');
  alert('Voz '+(cur?'OFF':'ON'));
}
function startVoice(){
  const btn=document.getElementById('voiceBtn');
  if(!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)){ alert('Voz no soportada en este navegador, usa Chrome'); return; }
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  const rec=new SR();
  rec.lang='es-CO';
  rec.interimResults=false;
  rec.maxAlternatives=1;
  if(btn) btn.classList.add('recording');
  rec.onresult=e=>{
    const t=e.results[0][0].transcript;
    const inp=document.getElementById('msg');
    if(inp){ inp.value=t; inp.focus(); }
    if(btn) btn.classList.remove('recording');
  };
  rec.onerror=()=>{ if(btn) btn.classList.remove('recording'); };
  rec.onend=()=>{ if(btn) btn.classList.remove('recording'); };
  rec.start();
}

function renderLevels(){
  const levels = [
    {nivel: "V2 (344 líneas)", estado: "✅ FIXED", desc: "Chat + memoria efímera BYOK + Owner. Enter + flecha funcionando.", costo: "Gratis"},
    {nivel: "V3 HIBRIDO", estado: "✅ FIXED", desc: "100K local + 10M R2 + HEAD/health + UptimeRobot 5m. hybrid_sync sin duplicado.", costo: "Gratis"},
    {nivel: "V3.5 BESTIAL", estado: "✅ 95/100", desc: "VISION + SEARCH DuckDuckGo + VOZ es-CO + PWA + 7 PARCHES + Groq fallback. Botón 🎤 agregado.", costo: "Gratis"},
    {nivel: "V5.1 STREAMING+ROUTER (AHORA) 🚀", estado: "🚀 99/100", desc: "SSE streaming token a token + Router gemini-2.5-flash/pro/thinking + UX ChatGPT. Membrana y niveles arreglados.", costo: "Gratis"},
    {nivel: "V5.2 TAVILY+SCRAPING", estado: "✅", desc: "Búsqueda real Tavily API 1000 req/mes + Jina scraping + wttr.in clima.", costo: "Gratis"},
    {nivel: "V5.3 OFICINA - Munder Difflin Clone", estado: "🆕 NEW", desc: "Oficina 👥 con 6 agentes avatar caminando, sobres volando, GOD Michael orquesta. Clon harnessmd.com - 100% canvas gratis.", costo: "Gratis"},
    {nivel: "V5.4 ADMIN PRIVADO", estado: "🆕 NEW", desc: "Panel 👑 solo Grimm / Akirakey1994 - limpiar DB, sync R2, test modelos, ver neuronas, export backup.", costo: "Gratis"},
    {nivel: "V5.5 Upwork + TOOLS", estado: "🆕 NEW", desc: "Upwork proposals con Akira, generar archivo, imagen IA Pollinations, video GIF, upload PDF.", costo: "Gratis"},
    {nivel: "V5.6 Uptime 99%", estado: "🔜", desc: "2 monitores + Render Starter $7 o Fly.io backup.", costo: "$7"},
  ];
  const container = document.getElementById("levelsList");
  if(!container) return;
  container.innerHTML = levels.map(l=>`
    <div style="background:#16161b;border:1px solid var(--border);border-radius:12px;padding:14px;transition:all .2s" onmouseover="this.style.borderColor='#6366f1'" onmouseout="this.style.borderColor='var(--border)'">
      <div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:14px">${l.nivel}</b><span style="font-size:10px;background:#1e1e26;padding:3px 8px;border-radius:10px;border:1px solid #2a2a36">${l.estado}</span></div>
      <div style="font-size:12.5px;color:var(--muted);margin-top:8px;line-height:1.5">${l.desc}</div>
      <div style="font-size:11px;color:#10b981;margin-top:8px;font-weight:600">Costo: ${l.costo}</div>
    </div>
  `).join("");
}

// V5.2 UPLOAD PDF/TXT GRATIS - SIN ROMPER
async function uploadFileToAkira(event){
  const file = event.target.files[0];
  if(!file) return;
  if(file.name.toLowerCase().endsWith(".svg")){ alert("SVG bloqueado"); return; }
  if(file.size > 10*1024*1024){ alert("Max 10MB"); return; }
  const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
  const form = new FormData();
  form.append("file", file);
  addMsg(`📄 Subiendo ${file.name} ${(file.size/1024).toFixed(0)}KB...`, 'user');
  const tid=addTyping();
  try{
    const r = await fetch(backend + "/api/upload", {method:"POST", body: form});
    const d = await r.json();
    removeTyping(tid);
    if(d.ok){
      addMsg(`✅ Archivo ${d.filename} subido. ${d.chars} chars, ${d.chunks} chunks absorbidos en colmena R2. Preview: ${d.preview.slice(0,200)}`, 'akira');
      await saveNeuronaHibrida(`Archivo ${d.filename} absorbido ${d.chars} chars`, 'file', 7, ['upload']);
    } else {
      addMsg(`❌ Error upload: ${d.error}`, 'akira');
    }
  }catch(e){
    removeTyping(tid);
    addMsg(`❌ Error subiendo: ${e.message}`, 'akira');
  }
  event.target.value="";
}

async function createFileAkira(){
  const name = prompt("Nombre del archivo? ej: tarea.md, datos.csv, idea.txt");
  if(!name) return;
  if(name.includes("..") || name.includes("/") || name.toLowerCase().endsWith(".svg")){ alert("Nombre inválido o SVG bloqueado"); return; }
  const content = prompt("Contenido del archivo (puedes pegar texto largo):");
  if(content===null) return;
  const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
  const tid=addTyping();
  try{
    const r = await fetch(backend + "/api/create_file", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({name, content})});
    const d = await r.json();
    removeTyping(tid);
    if(d.ok){
      addMsg(`✅ Archivo creado ${d.name} ${d.size} bytes en R2 key ${d.r2_key}. Descarga: ${backend}${d.download_url}`, 'akira');
    } else {
      addMsg(`❌ Error creando: ${d.error}`, 'akira');
    }
  }catch(e){
    removeTyping(tid);
    addMsg(`❌ Error: ${e.message}`, 'akira');
  }
}

// V5.4 IMAGE + VIDEO IA FREE
async function generateImageAkira(){
  const p = document.getElementById('msg')?.value.trim();
  const prompt = p || prompt("Qué imagen? ej: cyberpunk cat Bogotá neon");
  if(!prompt) return;
  const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
  addMsg(`🎨 Generando imagen: ${prompt}`, 'user');
  const tid=addTyping();
  try{
    const r = await fetch(backend + "/api/generate/image", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({prompt})});
    const d = await r.json();
    removeTyping(tid);
    if(d.ok){
      addMsg(`✅ Imagen ${d.filename} - ${prompt}`, 'akira', d.base64);
      const inner=document.getElementById('msgsInner');
      const row=document.createElement('div');
      row.className='msg-row akira';
      row.innerHTML=`<div class="avatar"></div><div class="bubble"><a href="${d.base64}" download="${d.filename}" style="color:#6366f1">⬇️ Descargar ${d.filename}</a> | <a href="${backend}${d.download_url}" target="_blank" style="color:#10b981">Ver R2</a><br><small>${d.size} bytes Pollinations free</small></div>`;
      inner.appendChild(row);
      inner.scrollTop=inner.scrollHeight;
      await saveNeuronaHibrida(`Imagen ${prompt} ${d.filename}`, 'image', 7, ['image_gen']);
      await countNeuronas();
    } else addMsg(`❌ Error imagen: ${d.error}`, 'akira');
  }catch(e){ removeTyping(tid); addMsg(`❌ Error: ${e.message}`, 'akira'); }
}
async function generateVideoAkira(){
  const p = document.getElementById('msg')?.value.trim();
  const prompt = p || prompt("Qué video? ej: Bogotá futurista drone");
  if(!prompt) return;
  const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
  addMsg(`🎬 Generando video GIF: ${prompt} (20-40s, 3 imgs IA)`, 'user');
  const tid=addTyping();
  try{
    const r = await fetch(backend + "/api/generate/video", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({prompt})});
    const d = await r.json();
    removeTyping(tid);
    if(d.ok){
      addMsg(`✅ Video GIF ${d.filename} - ${d.prompts.join(' | ')}`, 'akira', d.base64);
      const inner=document.getElementById('msgsInner');
      const row=document.createElement('div');
      row.className='msg-row akira';
      row.innerHTML=`<div class="avatar"></div><div class="bubble"><a href="${d.base64}" download="${d.filename}" style="color:#6366f1">⬇️ Descargar ${d.filename}</a><br><small>${d.size} bytes - ${d.type} Pollinations+Pillow free</small></div>`;
      inner.appendChild(row);
      inner.scrollTop=inner.scrollHeight;
      await saveNeuronaHibrida(`Video ${prompt} ${d.filename}`, 'video', 8, ['video_gen']);
      await countNeuronas();
    } else addMsg(`❌ Error video: ${d.error}`, 'akira');
  }catch(e){ removeTyping(tid); addMsg(`❌ Error video: ${e.message}`, 'akira'); }
}

document.addEventListener("DOMContentLoaded", ()=>{
  countNeuronas();
  renderLevels();
  const ta=document.getElementById('msg');
  if(ta){
    ta.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMsg(); } });
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
});
