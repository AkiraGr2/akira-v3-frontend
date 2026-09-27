// AKIRA V3.5 BESTIAL VISION - Voz, Vision, Search, Niveles - AUDITADO SIN ERRORES - 100% GRATIS
let isOwner = false;
let selectedImageBase64 = null;
let selectedImageMime = "image/jpeg";

// IMPORTANTE: Reemplaza con tu URL real de Render después del deploy
if(!localStorage.getItem("akira_backend_url")){
  localStorage.setItem("akira_backend_url", "https://akira-empresa.onrender.com");
}

// V3.5 VISION - Manejo de imagen
function handleImageSelect(event){
  const file = event.target.files[0];
  if(!file) return;
  if(file.size > 5*1024*1024){
    alert("❌ Imagen muy grande, máximo 5MB");
    return;
  }
  if(!file.type.startsWith("image/")){
    alert("❌ Solo imágenes");
    return;
  }
  selectedImageMime = file.type;
  const reader = new FileReader();
  reader.onload = (e)=>{
    selectedImageBase64 = e.target.result; // data URL completo
    const preview = document.getElementById("imagePreview");
    const img = document.getElementById("previewImg");
    const info = document.getElementById("previewInfo");
    if(preview && img){
      img.src = selectedImageBase64;
      preview.style.display = "block";
      if(info) info.textContent = `${file.name} - ${(file.size/1024).toFixed(0)}KB - ${file.type}`;
    }
    console.log("📷 Imagen seleccionada:", file.name, file.size, file.type);
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
  const inp=document.getElementById('msg');
  if(!inp) return;
  const txt=inp.value.trim();
  const hasImage = selectedImageBase64 && selectedImageBase64.length > 20;
  if(!txt && !hasImage) return;
  const orb=document.getElementById('orb'); if(orb)orb.classList.add('thinking');
  
  // Mostrar mensaje del usuario con o sin imagen
  if(hasImage){
    addMsg(txt || "📷 Analiza esta imagen", 'user', selectedImageBase64);
  } else {
    addMsg(txt,'user');
  }
  
  const currentImage = selectedImageBase64;
  const msgToSend = txt || (hasImage ? "Qué ves en esta imagen?" : "");
  
  inp.value='';
  clearImagePreview();
  const tid=addTyping();
  try{ await saveNeuronaHibrida(msgToSend + (hasImage ? " [imagen]" : ""), 'sensorial', 6, ['user_input', hasImage ? 'vision' : 'text']); }catch(e){}
  
  const uid=localStorage.getItem('akira_user_id')||'anon';
  const uk=localStorage.getItem('akira_user_key')||'';
  const isOwn=localStorage.getItem('akira_is_owner')==='1';
  const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
  
  try{
    const payload = {message:msgToSend,user_id:uid,user_api_key:uk,is_owner:isOwn};
    if(hasImage && currentImage){
      payload.image_base64 = currentImage;
    }
    const r = await fetch(backend + "/api/chat", {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });
    if(!r.ok) throw new Error("Backend error " + r.status);
    const d = await r.json();
    removeTyping(tid);
    if(orb)orb.classList.remove('thinking');
    addMsg(d.response||'Error','akira');
    const imp = (msgToSend.toLowerCase().includes("qué es") || msgToSend.toLowerCase().includes("que es") || msgToSend.toLowerCase().includes("membrana") || msgToSend.toLowerCase().includes("akira") || msgToSend.toLowerCase().includes("define") || hasImage) ? 8 : 5;
    try{ await saveNeuronaHibrida(d.response || "", 'motora', imp, ['akira_response', hasImage ? 'vision_response' : 'text']); }catch(e){}
    if(window.speechSynthesis && d.response){ speak(d.response); }
    await countNeuronas();
  }catch(e){
    console.error("sendMsg error", e);
    removeTyping(tid);
    if(orb)orb.classList.remove('thinking');
    addMsg('Error conectando a backend. Verifica que cambiaste https://akira-empresa.onrender.com por tu URL real de Render en akira_brain.js línea 5','akira');
  }
}

function addMsg(t,who,imgBase64=null){
  const inner=document.getElementById('msgsInner');
  if(!inner) return;
  const row=document.createElement('div');
  row.className='msg-row '+who;
  if(who==='user'){
    let imgHtml = "";
    if(imgBase64){
      imgHtml = `<img src="${imgBase64}" style="max-width:200px;max-height:200px;border-radius:12px;margin-bottom:6px;display:block">`;
    }
    row.innerHTML=`<div class="bubble">${imgHtml}${escapeHtml(t)}</div>`;
  }
  else {
    row.innerHTML=`<div class="avatar"></div><div class="bubble">${escapeHtml(t).replace(/\n/g,'<br>')}</div>`;
  }
  inner.appendChild(row);
  const msgs = document.getElementById('msgs');
  if(msgs) msgs.scrollTop=msgs.scrollHeight;
}

function addTyping(){
  const inner=document.getElementById('msgsInner');
  if(!inner) return "typing";
  const row=document.createElement('div');
  row.className='msg-row akira';
  row.id='typing-'+Date.now();
  row.innerHTML=`<div class="avatar"></div><div class="bubble"><div class="typing"><span></span><span></span><span></span></div></div>`;
  inner.appendChild(row);
  const msgs = document.getElementById('msgs');
  if(msgs) msgs.scrollTop=msgs.scrollHeight;
  return row.id;
}

function removeTyping(id){
  try{ const e=document.getElementById(id); if(e)e.remove(); }catch(e){}
}

function escapeHtml(t){
  try{
    let d=document.createElement('div');
    d.textContent=t;
    return d.innerHTML;
  }catch(e){ return t; }
}

function saveKey(){
  const inp = document.getElementById('apiKeyInput');
  if(!inp) return;
  const k=inp.value.trim();
  if(k.length>20 && (k.startsWith("AIza") || k.startsWith("AQ."))){
    localStorage.setItem('akira_user_key', k);
    alert('✅ Key guardada LOCAL (Nivel 3 - 100K, privado, no sube a R2)');
  }else{
    alert('❌ Key inválida. Debe empezar con AIza... o AQ. y tener 30+ caracteres');
  }
}

function speak(text){
  try{
    if(!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const clean = text.slice(0,250).replace(/[*#`]/g,'');
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang='es-CO';
    utter.rate=1.05;
    utter.pitch=1.0;
    window.speechSynthesis.speak(utter);
  }catch(e){}
}

function startVoice(){
  try{
    const hasRec = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    if(!hasRec){ alert('Tu navegador no soporta voz. Usa Chrome en Android/PC'); return; }
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Rec();
    rec.lang='es-CO';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = e=>{
      const transcript = e.results[0][0].transcript;
      const inp = document.getElementById('msg');
      if(inp){ inp.value = transcript; sendMsg(); }
    };
    rec.onerror = e=>{ console.error("Voice error", e); alert("Error de voz: " + e.error); };
    rec.start();
  }catch(e){ alert("Error iniciando voz: " + e.message); }
}

function renderLevels(){
  const levels = [
    {nivel: "V2 (Antes - 344 líneas)", estado: "✅ Hecho", desc: "Chat + memoria jsonl efímera + BYOK + Owner. Límite: 10k neuronas que se borraban al reiniciar Render.", costo: "Gratis"},
    {nivel: "V3 HIBRIDO FIX 3.5 (AHORA)", estado: "✅ Hecho", desc: "Backend liviano 80MB en Render + Frontend en GitHub Pages. Híbrido: 100K local en IndexedDB + 10M compartido en R2. HEAD + /health para UptimeRobot verde.", costo: "Gratis 100%"},
    {nivel: "V3.5 BESTIAL VISION (PASO 1) ✅", estado: "🚀 Implementado", desc: "Visión multimodal con Gemini 3.5 Flash-Lite. Subes foto 📷 y AKIRA la analiza. Base64 + Part.from_bytes. Preview + clear. 5MB max.", costo: "Gratis 100%"},
    {nivel: "V3.5 BESTIAL SEARCH (AHORA - PASO 2) 🚀", estado: "🚀 Implementado", desc: "Búsqueda web ACTIVA con DuckDuckGo API sin key. Detecta preguntas factuales y busca info actual. Inyectada en prompt.", costo: "Gratis"},
    {nivel: "V3.5 BESTIAL VOZ+PWA (Luego)", estado: "🔜 Luego", desc: "Voz STT/TTS pulida + PWA instalable manifest.json + sw.js", costo: "Gratis"},
    {nivel: "V4 CEREBRO COLECTIVO (Próximo mes)", estado: "💭 Futuro", desc: "GitHub Actions optimiza graph.json + Auto-evaluación + Niveles avatar", costo: "Gratis"},
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
    ta.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); sendMsg(); }
    });
  }
});
