// AKIRA ULTRA SYNC V7.3 AUDITADA - ROBUSTA - NO ROMPE ADMIN
// V8-B3b: las neuronas ahora viajan al backend via /api/memory/ingest.
// Requiere sesion firmada (B1/B2); sin sesion se quedan en IndexedDB.
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
  // V8-B3a: solo se muestran cifras que el servidor demuestra (available===true).
  // Si el backend no responde o dice available:false, se muestra "n/d": nunca cifras inventadas.
  try{
    const locales = await getNeuronasLocales();
    let shared = null;      // null = no disponible
    let knowledge = null;
    let hive = null;
    let serverTotal = null;
    try{
      const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
      const headers = typeof window.akiraAuthHeaders === "function" ? window.akiraAuthHeaders() : {"Content-Type":"application/json"};
      const r = await fetch(backend + "/api/brain/shared", {method:"GET", headers, cache:"no-store"});
      if(r.status === 401 && typeof window.akiraHandleAuthFailure === "function") window.akiraHandleAuthFailure(401);
      if(r.ok){
        const j = await r.json();
        if(j && typeof j.count === "number") serverTotal = j.count;
        if(j && j.membrana && j.membrana.available === true){
          shared = Number(j.membrana.shared ?? 0);
          knowledge = Number(j.membrana.knowledge ?? 0);
          hive = Number(j.membrana.hive ?? 0);
        }
      }
    }catch(e){ console.log("countNeuronas backend no disponible", e.message); }
    const fmt = (v)=> (v === null ? "n/d" : v);
    const el1 = document.getElementById("neuronCount");
    const el2 = document.getElementById("localCount");
    const el3 = document.getElementById("sharedCount");
    const elK = document.getElementById('knowledgeCount');
    const elH = document.getElementById('hiveCount');
    if(el1) el1.textContent = fmt(serverTotal);
    if(el2) el2.textContent = String(locales.length);
    if(el3) el3.textContent = fmt(shared);
    if(elK) elK.textContent = fmt(knowledge);
    if(elH) elH.textContent = `Hive ${fmt(hive)}`;
    return {local: locales.length, shared: shared ?? 0, knowledge: knowledge ?? 0, hive: hive ?? 0, total: serverTotal ?? 0, available: serverTotal !== null};
  }catch(e){
    console.log("countNeuronas error", e);
    const el1 = document.getElementById("neuronCount");
    if(el1) el1.textContent = "n/d";
    return {local:0, shared:0, knowledge:0, hive:0, total:0, available:false};
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
  // V8-B3b: persistencia real en el backend (Postgres via Persistence Service).
  // Requiere sesion firmada (B1/B2). Si no hay sesion o el backend no responde,
  // la neurona se queda en IndexedDB: nunca se pierde, nunca se inventa.
  try{
    const backend = localStorage.getItem("akira_backend_url") || "https://akira-empresa.onrender.com";
    const h = (typeof akiraAuthHeaders === 'function') ? akiraAuthHeaders() : {"Content-Type":"application/json"};
    await fetch(backend + "/api/memory/ingest", {
      method: "POST",
      headers: h,
      body: JSON.stringify({id: neurona.id, texto: neurona.texto, tipo: neurona.tipo, importancia: neurona.importancia, tags: neurona.tags, ts: neurona.ts})
    });
  }catch(e){ console.log("ingest backend no disponible, queda local:", e.message); }
  await countNeuronas();
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
