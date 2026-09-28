// AKIRA ULTRA SYNC V7.3 AUDITADA - ROBUSTA - NO ROMPE ADMIN
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
    let shared = 51;
    let knowledge = 31;
    let hive = 2;
    try{
      const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
      const r = await fetch(backend + "/api/brain/shared", {method:"GET", cache:"no-store"});
      if(r.ok){
        const j = await r.json();
        shared = j.membrana?.shared || j.count || 51;
        if(j.membrana){
          knowledge = j.membrana.knowledge || 31;
          hive = j.membrana.hive || 2;
          shared = j.membrana.shared || shared;
        } else if(j.shared){
          shared = j.shared.length || j.count || 51;
        }
      }
    }catch(e){ console.log("countNeuronas backend fallback", e.message); }
    // Pintar siempre aunque backend falle
    const el1 = document.getElementById("neuronCount");
    const el2 = document.getElementById("localCount");
    const el3 = document.getElementById("sharedCount");
    const elK = document.getElementById('knowledgeCount');
    const elH = document.getElementById('hiveCount');
    if(el1) el1.textContent = (locales.length + shared);
    if(el2) el2.textContent = `Local ${locales.length}`;
    if(el3) el3.textContent = `Shared ${shared}`;
    if(elK) elK.textContent = `Know ${knowledge}`;
    if(elH) elH.textContent = `Hive ${hive}`;
    return {local: locales.length, shared, knowledge, hive, total: locales.length+shared};
  }catch(e){ 
    console.log("countNeuronas error", e);
    const el1 = document.getElementById("neuronCount");
    if(el1) el1.textContent = "82";
    return {local:0, shared:51, knowledge:31, hive:2, total:82}; 
  }
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
    esCompartida: importancia >= 6, source: tags.includes('hive')?'hive':(tags.includes('vision')?'vision':'chat'), esUltra: true, version: "V7.3"
  };
  await saveNeuronaLocal(neurona);
  await countNeuronas();
  if(importancia >= 7){
    try{
      const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
      await fetch(backend + "/api/sync_to_r2", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({texto: texto.slice(0,500), importancia, tipo, tags})
      });
    }catch(e){ console.log("R2 no disponible, queda solo local", e.message); }
  }
  if(window.addNeuronaToGraph) try{ addNeuronaToGraph(neurona); }catch(e){}
  return neurona;
}

async function cleanupOldNeuronas(){
  try{
    const all = await getNeuronasLocales();
    if(all.length > 80000){
      const sorted = all.sort((a,b)=> (a.importancia||0) - (b.importancia||0) || new Date(a.ts) - new Date(b.ts));
      const toDelete = sorted.slice(0, 20000);
      await openDB();
      const tx = db.transaction(AKIRA_STORE, "readwrite");
      const store = tx.objectStore(AKIRA_STORE);
      toDelete.forEach(n=> store.delete(n.id));
      console.log(`🧹 Limpieza: ${toDelete.length} neuronas viejas borradas`);
      await countNeuronas();
    }
  }catch(e){ console.log("cleanup error", e); }
}
