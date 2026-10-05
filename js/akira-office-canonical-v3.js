/* AKIRA OFFICE — Canonical Pixel V3
 * The authored master artwork is the visual source of truth.
 *
 * Runtime policy:
 * - 01_office_master_scene.png is the production scene.
 * - 02..05 are reference/design boards, not runtime substitutes.
 * - No procedural office furniture/rooms.
 * - No 3D/WebGL office renderer.
 * - Backend state is read-only and shown in the existing system panel.
 */
(function(){
  "use strict";

  const ART_W=1536, ART_H=1024;
  const ART_SRC="./assets/office/01_office_master_scene.png";
  const POLL_MS=8000;
  const BACKEND_FALLBACK="https://akira-empresa.onrender.com";

  const IDENTITY=Object.freeze({
    Akira:"internal",
    Luna:"researcher",
    Nexo:"developer",
    Nova:"graph_builder",
    Orion:"reviewer",
    Kaori:"memorizer",
    Zeri:"tester",
    Lyra:"learner",
    Dante:"selftest_agent"
  });

  let stage=null,canvas=null,ctx=null,art=null,initialized=false,raf=0,last=0,paused=false;
  let artSource="",artFailed=false,agents=[],tasks=[],backend="";
  let truth={loaded:false,total:0,working:0,idle:0,error:0,disabled:0};

  const el=id=>document.getElementById(id);

  function authHeaders(){
    try{
      return typeof window.akiraAuthHeaders==="function" ? window.akiraAuthHeaders() : {};
    }catch(_){ return {}; }
  }

  function backendUrl(){
    try{return localStorage.getItem("akira_backend_url")||BACKEND_FALLBACK;}
    catch(_){return BACKEND_FALLBACK;}
  }

  function stateFor(agent){
    const s=String(agent&&agent.status||"").toLowerCase();
    if(s==="disabled") return "disabled";
    if(["error","failed","failure"].includes(s)) return "error";
    if(["working","running","busy","executing"].includes(s)) return "working";
    const n=String(agent&&agent.name||"").toLowerCase();
    const active=tasks.some(t=>
      String(t&&t.agent_name||"").toLowerCase()===n &&
      ["pending","queued","running","working","executing","in_progress","started","active"].includes(String(t&&t.status||"").toLowerCase())
    );
    return active?"working":"idle";
  }

  async function pollTruth(){
    backend=backendUrl();
    try{
      const [ar,tr]=await Promise.all([
        fetch(backend+"/api/v8/agents",{headers:authHeaders(),cache:"no-store"}),
        fetch(backend+"/api/v8/tasks?limit=100",{headers:authHeaders(),cache:"no-store"})
      ]);

      if(ar.ok){
        const data=await ar.json();
        const real=Array.isArray(data&&data.agents)?data.agents:[];
        agents=real.map(a=>({
          name:String(a.name||""),
          state:stateFor(a),
          visualName:Object.entries(IDENTITY).find(([,v])=>v.toLowerCase()===String(a.name||"").toLowerCase())?.[0]||String(a.name||"")
        }));
        truth.loaded=true;
      }

      if(tr.ok){
        const data=await tr.json();
        tasks=Array.isArray(data&&data.tasks)?data.tasks:[];
      }

      if(truth.loaded){
        agents=agents.map(a=>({...a,state:stateFor({name:a.name,status:a.state})}));
        truth.total=agents.length;
        truth.working=agents.filter(a=>a.state==="working").length;
        truth.error=agents.filter(a=>a.state==="error").length;
        truth.disabled=agents.filter(a=>a.state==="disabled").length;
        truth.idle=truth.total-truth.working-truth.error-truth.disabled;
      }
      return true;
    }catch(_){
      return false;
    }
  }

  function resize(){
    if(!stage||!canvas||!ctx)return;
    const r=stage.getBoundingClientRect();
    if(r.width<2||r.height<2)return;
    canvas.width=ART_W;
    canvas.height=ART_H;
    canvas.style.width=r.width+"px";
    canvas.style.height=r.height+"px";
    ctx.imageSmoothingEnabled=false;
  }

  function draw(ts){
    if(!ctx)return;
    ctx.clearRect(0,0,ART_W,ART_H);
    if(art)ctx.drawImage(art,0,0,ART_W,ART_H);
    if(!art && artFailed){
      ctx.fillStyle="#080b12";
      ctx.fillRect(0,0,ART_W,ART_H);
      ctx.fillStyle="#fff";
      ctx.font="bold 22px monospace";
      ctx.fillText("No se pudo cargar el arte oficial de la Oficina.",48,64);
    }

    /*
     * Only a very small live-state indicator is painted outside the authored
     * scene. We deliberately do not redraw furniture, characters or labels:
     * those belong to the master artwork.
     */
    if(art && truth.loaded){
      const active=truth.working>0;
      ctx.save();
      ctx.fillStyle=active?"#63e6be":"#9ca7b8";
      ctx.fillRect(20,1000,8,8);
      ctx.fillStyle="rgba(3,8,18,.82)";
      ctx.fillRect(34,990,300,28);
      ctx.fillStyle="#eef4ff";
      ctx.font="bold 14px monospace";
      ctx.fillText(truth.working+" trabajando · "+truth.idle+" disponibles",48,1009);
      ctx.restore();
    }
  }

  function loop(ts){
    if(!initialized)return;
    if(!paused)draw(ts);
    last=ts;
    raf=requestAnimationFrame(loop);
  }

  function loadArtwork(){
    return new Promise((resolve)=>{
      const img=new Image();
      img.onload=()=>{
        art=img;
        artSource="01_office_master_scene.png";
        artFailed=false;
        resolve(true);
      };
      img.onerror=()=>{
        art=null;
        artSource="";
        artFailed=true;
        resolve(false);
      };
      img.src=ART_SRC+"?v=office-canonical-v3";
    });
  }

  window.initAkiraOfficePixel=async function(){
    if(initialized){resize();return;}
    stage=el("officePixelStage");
    canvas=el("officePixelCanvas");
    if(!stage||!canvas)return;
    ctx=canvas.getContext("2d");
    if(!ctx)return;

    initialized=true;
    resize();
    await Promise.all([loadArtwork(),pollTruth()]);
    resize();
    draw(performance.now());
    last=performance.now();
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(loop);

    window.akiraOfficePixelDebug={
      get initialized(){return initialized;},
      get artSource(){return artSource;},
      get artFailed(){return artFailed;},
      get renderMode(){return "authored-master-image";},
      get noOffice3d(){return true;},
      get truthSummary(){return {...truth};},
      get identityMap(){return {...IDENTITY};},
      get states(){return Object.fromEntries(agents.map(a=>[a.visualName,a.state]));}
    };
  };

  window.resizeAkiraOfficePixel=resize;
  window.setAkiraOfficePixelPaused=function(v){
    paused=Boolean(v);
    if(!paused)draw(performance.now());
  };
  window.refreshAkiraOfficePixel=async function(){
    await loadArtwork();
    await pollTruth();
    resize();
    draw(performance.now());
  };
})();