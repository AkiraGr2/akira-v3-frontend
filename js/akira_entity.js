/* AKIRA ENTITY V1 — shared cognitive core
 * No external dependency. One visual entity is reused by header, chat and future surfaces.
 */
(function(){
  "use strict";

  const STATES = {
    idle:      { hue: 176, sat: 88, light: 66, speed: .45, radius: 1.00, pulse: .08, jitter: .00, mouth: "neutral", label:"En calma" },
    thinking:  { hue: 258, sat: 92, light: 69, speed: 1.30, radius: 1.08, pulse: .18, jitter: .02, mouth: "neutral", label:"Pensando" },
    searching: { hue: 205, sat: 94, light: 68, speed: 1.85, radius: 1.16, pulse: .22, jitter: .03, mouth: "neutral", label:"Explorando" },
    learning:  { hue: 315, sat: 88, light: 72, speed: 1.05, radius: 1.28, pulse: .25, jitter: .01, mouth: "small", label:"Aprendiendo" },
    remembering:{hue: 286, sat: 84, light: 70, speed: .72, radius: 1.14, pulse: .13, jitter: .00, mouth:"small", label:"Recordando" },
    executing: { hue: 46,  sat: 94, light: 66, speed: 1.55, radius: 1.10, pulse: .28, jitter: .03, mouth: "neutral", label:"Ejecutando" },
    success:   { hue: 156, sat: 82, light: 63, speed: .78, radius: 1.32, pulse: .34, jitter: .00, mouth: "smile", label:"Listo" },
    uncertain: { hue: 36,  sat: 92, light: 67, speed: .50, radius: 1.03, pulse: .12, jitter: .01, mouth: "small", label:"Con cautela" },
    error:     { hue: 350, sat: 88, light: 66, speed: .70, radius: 1.08, pulse: .28, jitter: .05, mouth: "sad", label:"Atención" },
    playful:   { hue: 190, sat: 90, light: 70, speed: 1.05, radius: 1.18, pulse: .22, jitter: .04, mouth: "smile", label:"Juguetona" }
  };

  function normalizeState(s){ return STATES[s] ? s : "idle"; }
  function hsl(h,s,l,a){ return "hsla("+h+","+s+"%,"+l+"%,"+a+")"; }

  function createController(host){
    if(!host || host.__akiraEntity) return host && host.__akiraEntity;
    host.classList.add("is-akira-entity");
    host.setAttribute("role","img");
    const canvas=document.createElement("canvas");
    canvas.className="akira-entity-canvas";
    canvas.setAttribute("aria-hidden","true");
    host.replaceChildren(canvas);
    const ctx=canvas.getContext("2d",{alpha:true});
    if(!ctx) return null;

    let stateName=normalizeState(host.dataset.state||"idle");
    let state=STATES[stateName];
    let width=1,height=1,dpr=1;
    let reduced=!!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    let raf=0,alive=true,started=performance.now(),successTimer=0;

    function resize(){
      const rect=host.getBoundingClientRect();
      width=Math.max(2,Math.round(rect.width||Number(host.dataset.size)||36));
      height=Math.max(2,Math.round(rect.height||Number(host.dataset.size)||36));
      dpr=Math.min(2,Math.max(1,window.devicePixelRatio||1));
      canvas.width=Math.round(width*dpr);
      canvas.height=Math.round(height*dpr);
      canvas.style.width=width+"px";
      canvas.style.height=height+"px";
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }

    function setState(next,opts){
      const name=normalizeState(next);
      stateName=name;
      state=STATES[name];
      host.dataset.state=name;
      host.setAttribute("aria-label",opts&&opts.label?String(opts.label):"Akira · "+state.label);
      if(name==="success" && !(opts&&opts.persist)){
        clearTimeout(successTimer);
        successTimer=setTimeout(function(){if(alive)setState("idle");},1500);
      }
      start();
    }

    function draw(ts){
      const t=(ts-started)/1000;
      const motion=reduced ? .18 : 1;
      const breath=1+Math.sin(t*(1.35+state.speed*.18))*state.pulse*.22*motion;
      const minSide=Math.max(16,Math.min(width,height));
      const cx=width/2,cy=height/2,base=minSide*.20,nucleus=base*breath;
      ctx.clearRect(0,0,width,height);

      const halo=ctx.createRadialGradient(cx,cy,0,cx,cy,nucleus*2.8);
      halo.addColorStop(0,hsl(state.hue,state.sat,state.light,.24));
      halo.addColorStop(.45,hsl(state.hue,state.sat,state.light,.10));
      halo.addColorStop(1,hsl(state.hue,state.sat,state.light,0));
      ctx.fillStyle=halo;
      ctx.beginPath();ctx.arc(cx,cy,nucleus*2.8,0,Math.PI*2);ctx.fill();

      for(let ring=0;ring<3;ring++){
        const rr=base*(1.55+ring*.42)*state.radius;
        const alpha=[.34,.21,.12][ring];
        const phase=t*(.42+ring*.13)*state.speed*(ring%2?-1:1);
        ctx.strokeStyle=hsl(state.hue,state.sat,state.light,alpha);
        ctx.lineWidth=ring===0?1.5:1;
        ctx.beginPath();ctx.arc(cx,cy,rr,phase,phase+Math.PI*(1.15+ring*.22));ctx.stroke();
      }

      const particleCount=width<42?8:12,particles=[];
      for(let i=0;i<particleCount;i++){
        const ring=i%3,rr=base*(1.65+ring*.45)*state.radius;
        const direction=ring===1?-1:1;
        const ang=i/particleCount*Math.PI*2+t*(.48+ring*.19)*state.speed*direction;
        const j=state.jitter*minSide*Math.sin(t*5+i*2.1)*motion;
        particles.push({x:cx+Math.cos(ang)*rr+j,y:cy+Math.sin(ang)*rr-j});
      }

      ctx.lineWidth=1;
      for(let i=0;i<particles.length;i++){
        const p=particles[i];
        if(i%2===0){
          ctx.strokeStyle=hsl(state.hue,state.sat,state.light,.16);
          ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(p.x,p.y);ctx.stroke();
        }
        if(i+1<particles.length){
          const q=particles[i+1];
          if(Math.hypot(p.x-q.x,p.y-q.y)<minSide*.72){
            ctx.strokeStyle=hsl(state.hue,state.sat,state.light,.10);
            ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
          }
        }
      }

      particles.forEach((p,i)=>{
        const pulse=1+Math.sin(t*(2.2+state.speed)+i)*.25*motion;
        const pr=Math.max(1.2,minSide*.028)*pulse;
        ctx.fillStyle=hsl((state.hue+i*11)%360,state.sat,state.light,.78);
        ctx.beginPath();ctx.arc(p.x,p.y,pr,0,Math.PI*2);ctx.fill();
      });

      const core=ctx.createRadialGradient(cx-base*.35,cy-base*.4,nucleus*.08,cx,cy,nucleus*1.35);
      core.addColorStop(0,hsl((state.hue+34)%360,94,88,.96));
      core.addColorStop(.28,hsl(state.hue,state.sat,state.light,.98));
      core.addColorStop(.72,hsl((state.hue+18)%360,state.sat,58,.92));
      core.addColorStop(1,hsl(state.hue,state.sat,44,.10));
      ctx.fillStyle=core;
      ctx.beginPath();ctx.arc(cx,cy,nucleus,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle=hsl(0,0,100,.28);ctx.lineWidth=Math.max(1,minSide*.018);
      ctx.beginPath();ctx.arc(cx,cy,nucleus*.96,0,Math.PI*2);ctx.stroke();

      const eyeY=cy-nucleus*.12,eyeDx=nucleus*.33,eyeR=Math.max(1,minSide*.032);
      ctx.fillStyle=hsl(0,0,100,.88);
      ctx.beginPath();ctx.arc(cx-eyeDx,eyeY,eyeR,0,Math.PI*2);ctx.arc(cx+eyeDx,eyeY,eyeR,0,Math.PI*2);ctx.fill();

      ctx.strokeStyle=hsl(0,0,100,.86);ctx.lineWidth=Math.max(1,minSide*.025);ctx.lineCap="round";ctx.beginPath();
      if(state.mouth==="smile") ctx.arc(cx,cy+nucleus*.10,nucleus*.24,0,Math.PI);
      else if(state.mouth==="sad") ctx.arc(cx,cy+nucleus*.38,nucleus*.24,Math.PI,Math.PI*2);
      else if(state.mouth==="small") ctx.arc(cx,cy+nucleus*.16,nucleus*.10,.15,Math.PI-.15);
      else {ctx.moveTo(cx-nucleus*.15,cy+nucleus*.17);ctx.lineTo(cx+nucleus*.15,cy+nucleus*.17);}
      ctx.stroke();

      if(!reduced||stateName==="success") raf=requestAnimationFrame(draw); else raf=0;
    }

    function start(){if(!raf&&alive)raf=requestAnimationFrame(draw);}
    function stop(){if(raf){cancelAnimationFrame(raf);raf=0;}}

    const ro=window.ResizeObserver?new ResizeObserver(resize):null;
    resize();
    setState(stateName,{persist:true});
    if(ro)ro.observe(host);
    const onResize=()=>resize(),onVisibility=()=>document.hidden?stop():start();
    window.addEventListener("resize",onResize,{passive:true});
    document.addEventListener("visibilitychange",onVisibility);
    if(window.matchMedia){
      try{window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change",()=>{reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;start();});}catch(_){}
    }

    const controller={
      setState,getState:()=>stateName,resize,
      destroy:function(){alive=false;stop();clearTimeout(successTimer);if(ro)ro.disconnect();window.removeEventListener("resize",onResize);document.removeEventListener("visibilitychange",onVisibility);host.__akiraEntity=null;}
    };
    host.__akiraEntity=controller;
    start();
    return controller;
  }

  function mountOne(el){
    if(!el||el.__akiraEntity)return el&&el.__akiraEntity;
    el.classList.add("akira-entity-slot");
    const size=Number(el.dataset.size||0);
    if(size&&!el.style.width)el.style.width=size+"px";
    if(size&&!el.style.height)el.style.height=size+"px";
    return createController(el);
  }

  function mountAll(root){
    const base=root||document;
    const list=base.querySelectorAll?base.querySelectorAll("[data-akira-entity],.akira-entity-slot"):[];
    list.forEach(mountOne);
    return list.length;
  }

  function setState(next,target){
    const list=typeof target==="string"
      ?document.querySelectorAll(target)
      :document.querySelectorAll("[data-akira-entity],.akira-entity-slot");
    list.forEach(el=>{const c=mountOne(el);if(c)c.setState(next);});
  }

  window.AkiraEntity={states:Object.keys(STATES),mount:mountOne,mountAll,setState,stateInfo:(name)=>STATES[normalizeState(name)]};
  window.akiraEntitySetState=setState;
  window.akiraEntityMount=mountOne;
  document.addEventListener("DOMContentLoaded",function(){mountAll(document);window.dispatchEvent(new CustomEvent("akira:entity-ready"));});
})();