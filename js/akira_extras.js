// AKIRA EXTRAS V8-B5 - Implementacion real de los botones huerfanos de H-03
// Esta version SOLO hace lo que puede hacer de verdad y gratis. Nada de placeholders.
//   🎤 toggleVoice()        - dictado por voz (Web Speech API, gratis)
//   📄 uploadFileToAkira()  - leer TXT/MD/CSV en navegador, PDF via backend
//   📝 createFileAkira()    - crear y descargar archivo de texto
// El boton de video se OCULTA desde index.html porque no se puede hacer bien y gratis.

// -------- helper: buffer -> base64 por chunks (evita stack overflow en archivos grandes) --------
function _arrayBufferToBase64(buffer){
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for(let i = 0; i < bytes.length; i += chunk){
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// -------- 🎤 Dictado por voz --------
let _recognition = null;
let _voiceActive = false;

function toggleVoice(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    alert("Tu navegador no soporta dictado por voz. Prueba Chrome o Edge.");
    return;
  }
  const btn = document.getElementById("micBtn");
  if(_voiceActive && _recognition){
    try{ _recognition.stop(); }catch(e){}
    return;
  }
  const rec = new SR();
  rec.lang = "es-CO";
  rec.continuous = false;
  rec.interimResults = true;
  rec.onstart = () => {
    _voiceActive = true;
    if(btn){ btn.style.background = "#ef4444"; btn.title = "Grabando... clic para detener"; }
  };
  rec.onresult = (event) => {
    let finalText = "";
    for(let i = event.resultIndex; i < event.results.length; i++){
      if(event.results[i].isFinal){
        finalText += event.results[i][0].transcript;
      }
    }
    const ta = document.getElementById("msg");
    if(ta && finalText){
      ta.value = (ta.value + " " + finalText).trim();
    }
  };
  rec.onerror = (e) => {
    console.log("voice error", e.error);
    _voiceActive = false;
    if(btn){ btn.style.background = ""; btn.title = "Dictado por voz"; }
  };
  rec.onend = () => {
    _voiceActive = false;
    if(btn){ btn.style.background = ""; btn.title = "Dictado por voz"; }
    _recognition = null;
  };
  _recognition = rec;
  try{ rec.start(); }catch(e){ console.log("no se pudo iniciar", e); }
}

// -------- 📄 Subir archivo --------
async function uploadFileToAkira(event){
  const file = event.target.files[0];
  if(!file) return;
  if(file.size > 5*1024*1024){
    alert("Archivo muy grande (max 5MB)");
    event.target.value = "";
    return;
  }
  const name = file.name.toLowerCase();
  const okExt = name.endsWith(".pdf") || name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".csv");
  if(!okExt){
    alert("Solo PDF, TXT, MD o CSV");
    event.target.value = "";
    return;
  }
  const ta = document.getElementById("msg");
  const originalPlaceholder = ta ? ta.placeholder : "";
  if(ta) ta.placeholder = "⏳ Procesando archivo...";
  try{
    if(name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".csv")){
      const text = await file.text();
      if(ta){
        const block = `[Archivo: ${file.name}]\n${text.slice(0, 20000)}\n[Fin archivo]`;
        ta.value = (ta.value ? ta.value + "\n\n" : "") + block;
      }
    } else {
      // PDF: se manda al backend, que lo procesa con PyMuPDF
      const buf = await file.arrayBuffer();
      const b64 = _arrayBufferToBase64(buf);
      const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
      const h = (typeof akiraAuthHeaders === 'function') ? akiraAuthHeaders() : {"Content-Type":"application/json"};
      const r = await fetch(backend + "/api/extract-file", {
        method: "POST",
        headers: h,
        body: JSON.stringify({filename: file.name, content_base64: b64})
      });
      const d = await r.json();
      if(!d.ok){
        alert("No se pudo leer el PDF: " + (d.reason || "error"));
        return;
      }
      if(ta){
        const block = `[Archivo: ${file.name}]\n${d.text.slice(0, 20000)}\n[Fin archivo]`;
        ta.value = (ta.value ? ta.value + "\n\n" : "") + block;
      }
    }
  }catch(e){
    alert("Error procesando archivo: " + e.message);
  }finally{
    if(ta) ta.placeholder = originalPlaceholder;
    event.target.value = "";
  }
}

// -------- 📝 Crear archivo --------
function createFileAkira(){
  const ta = document.getElementById("msg");
  const contenido = ta ? ta.value.trim() : "";
  if(!contenido){
    alert("Escribe primero el contenido del archivo en el cuadro de texto");
    return;
  }
  const nombre = prompt("Nombre del archivo (ej: notas.txt):", "akira_" + Date.now() + ".txt");
  if(!nombre) return;
  const blob = new Blob([contenido], {type: "text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
  if(ta) ta.value = "";
}
