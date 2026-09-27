// Akira - STREAMING SSE + ROUTER 2.5 - 99/100 - 7 PARCHES
let isOwner = false;
let selectedImageBase64 = null;
let selectedImageMime = "image/jpeg";

if(!localStorage.getItem("akira_backend_url")){
  localStorage.setItem("akira_backend_url", "https://akira-empresa.onrender.com");
}
let USE_STREAM = localStorage.getItem("akira_stream") !== "0"; // ON por defecto

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

async function sendMsg(){
  if(USE_STREAM) return sendMsgStream();
  // fallback old
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
    if(window.speechSynthesis && d.response) speak(d.response);
    await countNeuronas();
  }catch(e){
    removeTyping(tid); if(orb)orb.classList.remove('thinking');
    addMsg('Error conectando a backend. Verifica URL Render','akira');
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
  // crear bubble vacío para streaming
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
                // escape + keep line breaks
                b.innerHTML = escapeHtml(fullText).replace(/\n/g,'<br>') + '<span class="cursor">▌</span>';
                // render markdown simple
                let md = fullText.replace(/\*\*(.*?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
                // no full markdown para no romper stream
              }
              if(inner) inner.scrollTop = inner.scrollHeight;
            }
            if(j.done){
              const b = document.getElementById(bubbleId);
              if(b){
                let finalHtml = escapeHtml(fullText).replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<b>$1</b>');
                finalHtml += `<div style="margin-top:8px;display:flex;gap:6px"><span style="font-size:10px;background:#1e1e26;padding:2px 6px;border-radius:10px;border:1px solid #2a2a36">🧠 ${j.model||''} ${j.route||''}</span></div>`;
                finalHtml += `<div class="feedback-row"><button class="feedback-btn" onclick="sendFeedback('like', \`${fullText.slice(0,200).replace(/`/g,'')}\`, this)">👍</button><button class="feedback-btn" onclick="sendFeedback('dislike', \`${fullText.slice(0,200).replace(/`/g,'')}\`, this)">👎</button></div>`;
                b.innerHTML = finalHtml;
              }
              try{ await saveNeuronaHibrida(fullText, 'motora', 6, ['akira_response','stream']); }catch(e){}
              if(window.speechSynthesis && fullText) speak(fullText);
              await countNeuronas();
              if(orb)orb.classList.remove('thinking');
            }
          }catch(e){ console.log("parse sse", e, dataStr.slice(0,100)); }
        }
      }
    }
  }catch(e){
    console.error("sendMsgStream error", e);
    const b = document.getElementById(bubbleId);
    if(b) b.textContent = 'Error streaming, reintenta. ' + e.message;
    if(orb)orb.classList.remove('thinking');
  }
}

async function sendFeedback(tipo, texto, btn){
  try{
    const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
    const uid=localStorage.getItem('akira_user_id')||'anon';
    await fetch(backend + "/api/feedback", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tipo, texto: texto.slice(0,300), user_id: uid})});
    if(btn){ btn.classList.add(tipo==="like" ? "liked" : "disliked"); btn.textContent = tipo==="like" ? "👍 ¡Gracias!" : "👎 Aprendido"; btn.disabled=true; }
  }catch(e){ console.log("Feedback error", e); }
}

function addMsg(t,who,imgBase64=null){
  const inner=document.getElementById('msgsInner');
  if(!inner) return;
  const row=document.createElement('div');
  row.className='msg-row '+who;
  if(who==='user'){
    let imgHtml = "";
    if(imgBase64) imgHtml = `<img src="${imgBase64}" style="max-width:200px;max-height:200px;border-radius:12px;margin-bottom:6px;display:block">`;
    row.innerHTML=`<div class="bubble">${imgHtml}${escapeHtml(t)}</div>`;
  } else {
    const safeT = escapeHtml(t).replace(/\n/g,'<br>').replace(/\*\*(.*?)\*\*/g,'<b>$1</b>');
    row.innerHTML=`<div class="avatar"></div><div class="bubble">${safeT}<div class="feedback-row"><button class="feedback-btn" onclick="sendFeedback('like', \`${t.slice(0,200).replace(/`/g,'')}\`, this)">👍</button><button class="feedback-btn" onclick="sendFeedback('dislike', \`${t.slice(0,200).replace(/`/g,'')}\`, this)">👎</button></div></div>`;
  }
  inner.appendChild(row);
  inner.scrollTop = inner.scrollHeight;
}
function addTyping(){
  const inner=document.getElementById('msgsInner');
  const id='typing_'+Date.now();
  const row=document.createElement('div');
  row.id=id; row.className='msg-row akira';
  row.innerHTML=`<div class="avatar"></div><div class="bubble" style="color:var(--muted)">AKIRA escribiendo... ▌</div>`;
  inner.appendChild(row); inner.scrollTop = inner.scrollHeight; return id;
}
function removeTyping(id){ const el=document.getElementById(id); if(el) el.remove(); }
function escapeHtml(s){ return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function saveKey(){
  const inp=document.getElementById('apiKeyInput');
  if(!inp) return;
  const v=inp.value.trim();
  if(v.length>20 && (v.startsWith("AIza") || v.startsWith("AQ.") || v.startsWith("gsk_"))){
    localStorage.setItem("akira_user_key", v);
    const tipo = v.startsWith("gsk_") ? "Groq" : "Gemini";
    alert(`✅ Key ${tipo} guardada local. Ahora ilimitado.`);
    const info=document.getElementById("userInfo");
    if(info) info.innerHTML += `<br>🔑 Key ${tipo} local guardada`;
    const status=document.getElementById("keyStatus");
    if(status) status.textContent=`✅ Key ${tipo} guardada: ${v.slice(0,10)}...`;
  } else {
    alert("❌ Key inválida. Usa AIza... (Gemini) o gsk_... (Groq)");
  }
} else alert('❌ Key inválida. Debe empezar con AIza... o AQ.');
}
let voiceEnabled = localStorage.getItem("akira_voice_auto") !== "0";
let voiceRate = parseFloat(localStorage.getItem("akira_voice_rate") || "1.05");
function speak(text){
  try{
    if(!voiceEnabled) return;
    if(!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const clean = text.slice(0,280).replace(/[*#`_\[\]]/g,'').replace(/https?:\/\/\S+/g,'').trim();
    if(!clean) return;
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang='es-CO'; utter.rate=voiceRate; utter.pitch=1.0; utter.volume=1.0;
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(v=> v.lang.includes("es-CO") || v.lang.includes("es-MX") || v.lang.includes("es-ES")) || voices.find(v=> v.lang.startsWith("es"));
    if(esVoice) utter.voice = esVoice;
    window.speechSynthesis.speak(utter);
  }catch(e){}
}
function toggleVoice(){
  voiceEnabled = !voiceEnabled;
  localStorage.setItem("akira_voice_auto", voiceEnabled ? "1" : "0");
  const btn = document.getElementById("voiceToggleBtn");
  if(btn){ btn.textContent = voiceEnabled ? "🔊" : "🔇"; }
  if(!voiceEnabled){ try{ window.speechSynthesis.cancel(); }catch(e){} } else speak("Voz activada");
}
function startVoice(){
  try{
    const hasRec = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    if(!hasRec){ alert('Tu navegador no soporta voz. Usa Chrome'); return; }
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Rec();
    rec.lang='es-CO'; rec.interimResults = true; rec.maxAlternatives = 1; rec.continuous = false;
    const inp = document.getElementById('msg');
    const originalPlaceholder = inp ? inp.placeholder : "";
    rec.onstart = ()=>{ if(inp){ inp.placeholder = "🎤 Escuchando..."; inp.style.borderColor = "#10b981"; } };
    rec.onresult = e=>{
      let interim = ""; let final = "";
      for(let i=e.resultIndex; i<e.results.length; i++){
        const transcript = e.results[i][0].transcript;
        if(e.results[i].isFinal) final += transcript; else interim += transcript;
      }
      if(inp) inp.value = final || interim;
      if(final){
        if(inp){ inp.placeholder = originalPlaceholder; inp.style.borderColor = ""; }
        sendMsg();
      }
    };
    rec.onerror = e=>{ if(inp){ inp.placeholder = originalPlaceholder; inp.style.borderColor = ""; } if(e.error !== "no-speech" && e.error !== "aborted") alert("Error de voz: " + e.error); };
    rec.onend = ()=>{ if(inp){ inp.placeholder = originalPlaceholder; inp.style.borderColor = ""; } };
    rec.start();
  }catch(e){ alert("Error voz: "+e.message); }
}
function renderLevels(){
  const levels = [
    {nivel: "V2 (344 líneas)", estado: "✅", desc: "Chat + memoria efímera BYOK + Owner.", costo: "Gratis"},
    {nivel: "V3 HIBRIDO", estado: "✅", desc: "100K local + 10M R2 + HEAD/health + UptimeRobot 5m.", costo: "Gratis"},
    {nivel: "V3.5 BESTIAL", estado: "✅ 95/100", desc: "VISION + SEARCH DuckDuckGo + VOZ es-CO + PWA + 7 PARCHES + Groq fallback.", costo: "Gratis"},
    {nivel: "V5.1 STREAMING+ROUTER (AHORA) 🚀", estado: "🚀 99/100 interno", desc: "SSE streaming token a token + Router gemini-2.5-flash/pro/thinking + UX ChatGPT. Mantiene 7 parches + R2 + Groq.", costo: "Gratis"},
    {nivel: "V5.2 TAVILY+SCRAPING", estado: "🔜 Siguiente", desc: "Búsqueda real Tavily API + scraping real.", costo: "Gratis 1000 req/mes"},
    {nivel: "V5.3 RAG 768d + PDF", estado: "🔜", desc: "Qdrant Cloud + /api/upload PDF + embeddings 768d real.", costo: "Gratis tier"},
    {nivel: "V5.4 TOOLS", estado: "🔜", desc: "Function calling tools - clima, calculadora, R2 ops.", costo: "Gratis"},
    {nivel: "V5.5 Uptime 99%", estado: "🔜", desc: "2 monitores + Render Starter $7 o Fly.io backup.", costo: "$7"},
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
  const ta=document.getElementById('msg');
  if(ta){
    ta.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMsg(); } });
  }
  // toggle stream btn if exists
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
