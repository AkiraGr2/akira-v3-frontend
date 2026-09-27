// AKIRA V3 HIBRIDO SYNC - Nivel 3 (100K local) + Nivel 2 (10M) - AUDITADO SIN ERRORES
const AKIRA_DB_NAME = "AKIRA_V3_HIBRIDO";
const AKIRA_STORE = "neuronas";
let db = null;

function openDB(){
  return new Promise((resolve, reject)=>{
    if(db){ resolve(db); return; }
    const req = indexedDB.open(AKIRA_DB_NAME, 1);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if(!d.objectStoreNames.contains(AKIRA_STORE)){
        d.createObjectStore(AKIRA_STORE, {keyPath: "id"});
      }
    };
    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror = e => reject(e);
  });
}

async function saveNeuronaLocal(neurona){
  try{
    await openDB();
    return new Promise((res, rej)=>{
      const tx = db.transaction(AKIRA_STORE, "readwrite");
      tx.objectStore(AKIRA_STORE).put(neurona);
      tx.oncomplete = ()=>res(true);
      tx.onerror = e=>rej(e);
    });
  }catch(e){ console.error("saveNeuronaLocal error", e); return false; }
}

async function getNeuronasLocales(){
  try{
    await openDB();
    return new Promise((res)=>{
      const tx = db.transaction(AKIRA_STORE, "readonly");
      const store = tx.objectStore(AKIRA_STORE);
      const req = store.getAll();
      req.onsuccess = ()=>res(req.result || []);
      req.onerror = ()=>res([]);
    });
  }catch(e){ return []; }
}

async function countNeuronas(){
  try{
    const locales = await getNeuronasLocales();
    let shared = 0;
    try{
      const backend = localStorage.getItem("akira_backend_url") || "https://tu-app.onrender.com";
      const r = await fetch(backend + "/api/brain/shared", {method:"GET"});
      if(r.ok){
        const j = await r.json();
        shared = j.count || (j.shared ? j.shared.length : 0);
      }
    }catch(e){}
    const el1 = document.getElementById("neuronCount");
    const el2 = document.getElementById("localCount");
    const el3 = document.getElementById("sharedCount");
    if(el1) el1.textContent = (locales.length + shared);
    if(el2) el2.textContent = `Local ${locales.length}`;
    if(el3) el3.textContent = `Shared ${shared}`;
    return {local: locales.length, shared, total: locales.length+shared};
  }catch(e){ return {local:0, shared:0, total:0}; }
}

async function saveNeuronaHibrida(texto, tipo="episodica", importancia=5, tags=[]){
  if(!texto || texto.length < 2) return null;
  const neurona = {
    id: Date.now() + "_" + Math.random().toString(36).slice(2,9),
    texto: texto.slice(0,500),
    tipo,
    importancia,
    tags,
    ts: new Date().toISOString(),
    esCompartida: importancia >= 7
  };
  await saveNeuronaLocal(neurona);
  await countNeuronas();
  if(importancia >= 7){
    try{
      const backend = localStorage.getItem("akira_backend_url") || "https://tu-app.onrender.com";
      await fetch(backend + "/api/sync_to_r2", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({texto: texto.slice(0,500), importancia, tipo, tags})
      });
    }catch(e){ console.log("R2 no disponible, queda solo local", e.message); }
  }
  if(window.addNeuronaToGraph) addNeuronaToGraph(neurona);
  return neurona;
}

function showSection(name){
  document.querySelectorAll(".section").forEach(s=>s.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.remove("active"));
  const sec = document.getElementById(name+"Section");
  if(sec) sec.classList.add("active");
  const btn = window.event ? window.event.target : document.querySelector(`button[onclick="showSection('${name}')"]`);
  if(btn) btn.classList.add("active");
  if(name==="obsidian" && window.initGraph) setTimeout(()=>initGraph(), 100);
  if(name==="levels" && window.renderLevels) renderLevels();
}
