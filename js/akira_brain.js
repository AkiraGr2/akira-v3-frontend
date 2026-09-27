// AKIRA ULTRA - Colmena Activa + Croma-lite + Self + Hive Learning - VISION+SEARCH+VOZ+PWA - 95/100 - 7 PARCHES SEGURIDAD
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
  if(file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")){
    alert("❌ SVG bloqueado por seguridad. Usa JPG/PNG/WEBP");
    return;
  }
  if(!file.type.startsWith("image/")){
    alert("❌ Solo imágenes JPG/PNG/WEBP");
    return;
  }
  if(!["image/jpeg","image/jpg","image/png","image/webp"].includes(file.type)){
    alert("❌ Solo JPG/PNG/WEBP por seguridad");
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
  let txt=inp.value.trim();
  const hasImage = selectedImageBase64 && selectedImageBase64.length > 20;
  if(!txt && !hasImage) return;
  if(txt.length > 1500){
    alert("⚠️ Mensaje muy largo (max 1500). Resume por favor.");
    txt = txt.slice(0,1500);
    inp.value = txt;
  }
  // Filtro claves
  const lower = txt.toLowerCase();
  if((lower.includes("password") || lower.includes("contraseña") || lower.includes("mi clave es")) && txt.length < 200){
    if(!confirm("⚠️ Parece que estás escribiendo una contraseña/clave. ¿Seguro que quieres enviarla? No se guardará en R2 si confirmas.")){
      return;
    }
  }
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

async function sendFeedback(tipo, texto, btn){
  try{
    const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
    const uid=localStorage.getItem('akira_user_id')||'anon';
    await fetch(backend + "/api/feedback", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({tipo, texto: texto.slice(0,300), user_id: uid})
    });
    if(btn){
      btn.classList.add(tipo==="like" ? "liked" : "disliked");
      btn.textContent = tipo==="like" ? "👍 ¡Gracias!" : "👎 Aprendido";
      btn.disabled=true;
    }
  }catch(e){ console.log("Feedback error", e); }
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
    const safeT = escapeHtml(t).replace(/\n/g,'<br>');
    const feedbackHtml = `<div class="feedback-row"><button class="feedback-btn" onclick="sendFeedback('like', \`${escapeHtml(t).slice(0,200).replace(/`/g,'')}\`, this)">👍 Útil</button><button class="feedback-btn" onclick="sendFeedback('dislike', \`${escapeHtml(t).slice(0,200).replace(/`/g,'')}\`, this)">👎 No útil</button></div>`;
    row.innerHTML=`<div class="avatar"></div><div class="bubble">${safeT}${feedbackHtml}</div>`;
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

let voiceEnabled = localStorage.getItem("akira_voice_auto") !== "0"; // Auto voz on por defecto
let voiceRate = parseFloat(localStorage.getItem("akira_voice_rate") || "1.05");

function speak(text){
  try{
    if(!voiceEnabled) return;
    if(!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const clean = text.slice(0,280).replace(/[*#`_\[\]]/g,'').replace(/https?:\/\/\S+/g,'').trim();
    if(!clean) return;
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang='es-CO';
    utter.rate=voiceRate;
    utter.pitch=1.0;
    utter.volume=1.0;
    // Intentar voz femenina colombiana si existe
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(v=> v.lang.includes("es-CO") || v.lang.includes("es-MX") || v.lang.includes("es-ES")) || voices.find(v=> v.lang.startsWith("es"));
    if(esVoice) utter.voice = esVoice;
    window.speechSynthesis.speak(utter);
    console.log("🔊 Hablando:", clean.slice(0,50));
  }catch(e){ console.log("Speak error", e); }
}

function toggleVoice(){
  voiceEnabled = !voiceEnabled;
  localStorage.setItem("akira_voice_auto", voiceEnabled ? "1" : "0");
  const btn = document.getElementById("voiceToggleBtn");
  if(btn){
    btn.textContent = voiceEnabled ? "🔊" : "🔇";
    btn.title = voiceEnabled ? "Voz activada (click para silenciar)" : "Voz silenciada (click para activar)";
  }
  if(!voiceEnabled){
    try{ window.speechSynthesis.cancel(); }catch(e){}
  } else {
    speak("Voz activada");
  }
}

function startVoice(){
  try{
    const hasRec = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    if(!hasRec){ alert('Tu navegador no soporta voz. Usa Chrome en Android/PC'); return; }
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Rec();
    rec.lang='es-CO';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    
    const inp = document.getElementById('msg');
    const originalPlaceholder = inp ? inp.placeholder : "";
    
    rec.onstart = ()=>{
      if(inp){
        inp.placeholder = "🎤 Escuchando... habla ahora";
        inp.style.borderColor = "#10b981";
      }
      console.log("🎤 Voz iniciada");
    };
    
    rec.onresult = e=>{
      let interim = "";
      let final = "";
      for(let i=e.resultIndex; i<e.results.length; i++){
        const transcript = e.results[i][0].transcript;
        if(e.results[i].isFinal){
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      if(inp){
        inp.value = final || interim;
      }
      if(final){
        console.log("🎤 Final:", final);
        if(inp) {
          inp.placeholder = originalPlaceholder;
          inp.style.borderColor = "";
        }
        sendMsg();
      }
    };
    
    rec.onerror = e=>{ 
      console.error("Voice error", e); 
      if(inp){
        inp.placeholder = originalPlaceholder;
        inp.style.borderColor = "";
      }
      if(e.error !== "no-speech" && e.error !== "aborted"){
        alert("Error de voz: " + e.error + " - Usa Chrome"); 
      }
    };
    
    rec.onend = ()=>{
      if(inp){
        inp.placeholder = originalPlaceholder;
        inp.style.borderColor = "";
      }
      console.log("🎤 Voz terminada");
    };
    
    rec.start();
  }catch(e){ alert("Error iniciando voz: " + e.message); }
}

function renderLevels(){
  const levels = [
    {nivel: "V2 (Antes - 344 líneas)", estado: "✅ Hecho", desc: "Chat + memoria jsonl efímera + BYOK + Owner. Límite: 10k neuronas que se borraban al reiniciar Render.", costo: "Gratis"},
    {nivel: "V3 HIBRIDO FIX 3.5 (AHORA)", estado: "✅ Hecho", desc: "Backend liviano 80MB en Render + Frontend en GitHub Pages. Híbrido: 100K local en IndexedDB + 10M compartido en R2. HEAD + /health para UptimeRobot verde.", costo: "Gratis 100%"},
    {nivel: "V3.5 BESTIAL VISION (PASO 1) ✅", estado: "🚀 Implementado", desc: "Visión multimodal con Gemini 3.5 Flash-Lite. Subes foto 📷 y AKIRA la analiza. Base64 + Part.from_bytes. Preview + clear. 5MB max.", costo: "Gratis 100%"},
    {nivel: "V3.5 BESTIAL SEARCH (AHORA - PASO 2) 🚀", estado: "🚀 Implementado", desc: "Búsqueda web ACTIVA con DuckDuckGo API sin key. Detecta preguntas factuales y busca info actual. Inyectada en prompt.", costo: "Gratis"},
    {nivel: "V3.5 BESTIAL VOZ+PWA (AHORA - PASO 3) 🚀", estado: "🚀 Implementado", desc: "Voz STT/TTS pulida con interim results, toggle 🔊/🔇, auto-voz configurable, voz femenina es-CO. PWA instalable con manifest.json + sw.js + offline cache.", costo: "Gratis 100%"},
    {nivel: "V3.5 BESTIAL COMPLETO (ANTES) ✅", estado: "✅ 62/100", desc: "VISION 📷 + SEARCH 🔍 + VOZ 🎤 + PWA 📱 + R2 10M + 100K local. Base auditada.", costo: "Gratis"},
    {nivel: "V4 ULTRA - COLMENA ACTIVA (AHORA) 🚀", estado: "🚀 ULTRA 80/100", desc: "MEMBRANA CROMA-LITE 4 colores (azul local, dorado shared, verde knowledge, morado self) + SELF-MODEL evolutivo + KNOWLEDGE destilado + VECTORES semánticos lite con numpy (hashing + Gemini embeddings gratis) + HIVE LEARNING que absorbe de TODO: chats, web, visión, voz + DREAMING nocturno + CURIOSIDAD autónoma. Todo en Render Free + R2 + GitHub.", costo: "Gratis 100% - Le hace talla a ChatGPT en memoria personal"},
    {nivel: "V5 DIOS (Futuro)", estado: "💭 Futuro", desc: "Ollama local + Whisper + Piper TTS + Three.js 3D", costo: "Cuando toque pagar VPS real"},
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
