/* AKIRA LIVING SYNAPTIC ORB — CANVAS V1.6
 * New visual direction: compact living nucleus + synaptic activity + inner galaxy.
 *
 * Design rule:
 * - the object must read as ONE NUCLEUS first
 * - life comes from internal circulation, synaptic firing, breathing and growth
 * - no face, no horror, no black eye sockets
 * - no geometric orbit decorations
 *
 * Runtime:
 * - Canvas 2D native
 * - requestAnimationFrame with real dt
 * - ResizeObserver + capped DPR
 * - pauses only when document is hidden
 */
(function(){
  "use strict";

  const STATES={
    idle:{label:"En calma",energy:1.00},
    thinking:{label:"Pensando",energy:1.16},
    searching:{label:"Explorando",energy:1.30},
    learning:{label:"Aprendiendo",energy:1.10},
    remembering:{label:"Recordando",energy:.96},
    executing:{label:"Ejecutando",energy:1.25},
    success:{label:"Listo",energy:1.15},
    uncertain:{label:"Con cautela",energy:.88},
    error:{label:"Atención",energy:.98},
    playful:{label:"Juguetona",energy:1.22}
  };

  const EXPRESSIONS=["soft","curious","joy","surprised","wink","sleepy","playful","blink"];

  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const rand=(a,b)=>a+Math.random()*(b-a);

  const CORE_COLORS={
    cyan:"#70efff",
    cyan2:"#29bfe9",
    blue:"#5e77ff",
    violet:"#8b48ff",
    pink:"#e656d7",
    hot:"#ff76c7",
    gold:"#ffc46b",
    white:"#f7ffff"
  };

  function hash(n){
    const x=Math.sin(n*127.1+311.7)*43758.5453123;
    return x-Math.floor(x);
  }

  function noise(t,seed){
    const a=Math.floor(t), f=t-a, s=f*f*(3-2*f);
    return lerp(hash(a+seed),hash(a+seed+1),s);
  }

  function dpr(){
    return clamp(window.devicePixelRatio||1,1,2.2);
  }

  function blobPath(ctx,cx,cy,rx,ry,rot,seed,t,warp){
    const count=24;
    const pts=[];
    const c=Math.cos(rot),s=Math.sin(rot);
    for(let i=0;i<count;i++){
      const a=Math.PI*2*i/count;
      const n=noise(t*.48+i*.31,seed);
      const wave=Math.sin(t*.91+seed*.53+i*1.37);
      const r=1+warp*((n-.5)*1.55+wave*.34);
      const x=Math.cos(a)*rx*r;
      const y=Math.sin(a)*ry*(1+warp*.22*Math.sin(t*.67+i*1.1+seed))*r;
      pts.push({x:cx+x*c-y*s,y:cy+x*s+y*c});
    }
    ctx.beginPath();
    for(let i=0;i<count;i++){
      const p=pts[i], q=pts[(i+1)%count];
      const mx=(p.x+q.x)/2,my=(p.y+q.y)/2;
      if(i===0) ctx.moveTo(mx,my);
      ctx.quadraticCurveTo(p.x,p.y,mx,my);
    }
    ctx.closePath();
  }

  function fillBlob(ctx,x,y,rx,ry,rot,seed,t,stops,alpha,warp){
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(rot);
    const g=ctx.createRadialGradient(-rx*.24,-ry*.28,0,0,0,Math.max(rx,ry)*1.12);
    g.addColorStop(0,stops[0]);
    g.addColorStop(.26,stops[1]);
    g.addColorStop(.58,stops[2]);
    g.addColorStop(1,stops[3]);
    ctx.globalAlpha=alpha;
    ctx.fillStyle=g;
    blobPath(ctx,0,0,rx,ry,0,seed,t,warp);
    ctx.fill();
    ctx.restore();
  }

  function drawGlow(ctx,x,y,r,inner,mid,outer,alpha){
    const g=ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,inner);
    g.addColorStop(.28,mid);
    g.addColorStop(1,outer);
    ctx.globalAlpha=alpha;
    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fill();
  }

  function drawRibbon(ctx,cx,cy,r,phase,energy,opacity){
    // Ribbons are broad, filled and softly blurred in perception; they are
    // intentionally organic rather than decorative geometric rings.
    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(phase);

    const turns=1.55;
    const pts=[];
    const steps=18;
    for(let i=0;i<=steps;i++){
      const u=i/steps;
      const a=u*Math.PI*2*turns;
      const rad=r*(.10+.68*u);
      const wobble=1+.045*Math.sin(u*9+phase*2.1);
      pts.push({
        x:Math.cos(a)*rad*wobble,
        y:Math.sin(a)*rad*wobble*.92
      });
    }

    ctx.globalCompositeOperation="screen";
    ctx.globalAlpha=opacity;
    ctx.lineWidth=Math.max(2,r*.055);
    ctx.lineCap="round";
    const grad=ctx.createLinearGradient(-r*.65,-r*.2,r*.70,r*.24);
    grad.addColorStop(0,"rgba(57,213,255,0)");
    grad.addColorStop(.22,"rgba(78,218,255,.55)");
    grad.addColorStop(.52,"rgba(214,91,255,.70)");
    grad.addColorStop(.76,"rgba(255,102,198,.48)");
    grad.addColorStop(1,"rgba(255,189,91,0)");
    ctx.strokeStyle=grad;
    ctx.beginPath();
    pts.forEach((p,i)=>{
      if(i===0) ctx.moveTo(p.x,p.y);
      else ctx.lineTo(p.x,p.y);
    });
    ctx.stroke();

    ctx.globalAlpha=opacity*.26;
    ctx.lineWidth=Math.max(5,r*.09);
    ctx.strokeStyle="rgba(103,235,255,.8)";
    ctx.stroke();
    ctx.restore();
  }

  function drawSynapse(ctx,x,y,r,phase,hot,alpha){
    const pulse=.75+.25*Math.sin(phase);
    drawGlow(ctx,x,y,r*2.6,
      hot?"rgba(255,238,194,.92)":"rgba(200,251,255,.88)",
      hot?"rgba(255,132,90,.42)":"rgba(53,193,255,.30)",
      "rgba(92,62,255,0)",alpha*.28);

    ctx.globalAlpha=alpha*(.72+.28*pulse);
    ctx.fillStyle=hot?"#ffd77f":"#9ff7ff";
    ctx.beginPath();
    ctx.arc(x,y,r*(.72+.18*pulse),0,Math.PI*2);
    ctx.fill();

    ctx.globalAlpha=alpha*.75;
    ctx.fillStyle="#ffffff";
    ctx.beginPath();
    ctx.arc(x-r*.16,y-r*.18,r*.20,0,Math.PI*2);
    ctx.fill();
  }

  function chooseNodeAngle(engine,i){
    // Semi-stable anchors keep the object coherent while their phase drifts.
    return i*1.257 + engine.orbitSeed[i] + Math.sin(engine.time*.13+i)*.08;
  }

  function spawnPulse(engine,strong){
    if(engine.pulses.length>14) return;
    engine.pulses.push({
      age:0,
      life:strong?rand(.75,1.15):rand(.95,1.45),
      radius:0,
      speed:strong?1.08:0.72,
      hue:Math.random(),
      phase:rand(0,Math.PI*2),
      strong:!!strong
    });
  }

  function spawnParticle(engine,strong){
    if(engine.particles.length>36) return;
    const a=rand(0,Math.PI*2);
    engine.particles.push({
      age:0,
      life:rand(1.8,3.8),
      a,
      dist:rand(.45,.96),
      speed:rand(-.20,.22)*(strong?1.25:1),
      size:rand(.008,.026),
      hot:Math.random()<.28
    });
  }

  function drawPulse(ctx,engine,r,p){
    const t=clamp(p.age/p.life,0,1);
    const ease=t*t*(3-2*t);
    const rr=r*(.28+.70*ease);
    ctx.save();
    ctx.globalCompositeOperation="screen";
    ctx.globalAlpha=(1-t)*(.16+(p.strong?.12:0));
    ctx.strokeStyle=p.hue>.55?"rgba(229,86,215,.82)":"rgba(82,225,255,.86)";
    ctx.lineWidth=Math.max(1.5,r*.018*(1-t*.5));
    ctx.beginPath();
    ctx.ellipse(engine.cx,engine.cy,rr,rr*(.78+.09*Math.sin(engine.time*1.1+p.phase)),0,0,Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }

  function draw(engine){
    const ctx=engine.ctx,w=engine.cssW,h=engine.cssH;
    if(!ctx||w<=0||h<=0)return;

    const d=engine.dpr;
    ctx.setTransform(d,0,0,d,0,0);
    ctx.clearRect(0,0,w,h);

    const base=Math.min(w,h);
    const r=Math.max(14,base*.34);
    engine.cx=w*.5+engine.lookX*base*.018;
    engine.cy=h*.49+engine.lookY*base*.012;

    const reaction=engine.reaction;
    const e=engine.energy*(1+reaction*.12);
    const breath=Math.sin(engine.time*.74+Math.sin(engine.time*.21)*.35);
    const pulseScale=1+breath*.028*e+Math.sin(engine.time*1.38)*.010*e+reaction*.042;
    const rx=r*1.02*pulseScale;
    const ry=r*.99*(1+Math.sin(engine.time*.81+1.6)*.025);

    // Ambient field
    ctx.save();
    ctx.globalCompositeOperation="screen";
    drawGlow(ctx,engine.cx,engine.cy,r*1.55,
      "rgba(73,232,255,.18)","rgba(117,70,255,.13)",
      "rgba(216,62,201,0)",.9);
    ctx.restore();

    // Soft outer membrane. One body, not a constellation of pieces.
    const shellGrad=ctx.createRadialGradient(
      engine.cx-r*.25,engine.cy-r*.28,0,
      engine.cx,engine.cy,r*1.16
    );
    shellGrad.addColorStop(0,"rgba(241,255,255,.92)");
    shellGrad.addColorStop(.16,"rgba(91,236,255,.88)");
    shellGrad.addColorStop(.38,"rgba(76,134,255,.78)");
    shellGrad.addColorStop(.62,"rgba(133,75,255,.64)");
    shellGrad.addColorStop(.82,"rgba(226,69,196,.45)");
    shellGrad.addColorStop(1,"rgba(10,12,30,.12)");

    ctx.save();
    ctx.globalCompositeOperation="source-over";
    blobPath(ctx,engine.cx,engine.cy,rx,ry,
      Math.sin(engine.time*.27)*.08,44,engine.time,.16);
    ctx.globalAlpha=.92;
    ctx.fillStyle=shellGrad;
    ctx.fill();
    ctx.clip();

    // Deep translucent tissue
    fillBlob(ctx,
      engine.cx+Math.sin(engine.time*.31)*r*.07,
      engine.cy+Math.cos(engine.time*.27)*r*.05,
      rx*.89,ry*.84,-.12,101,engine.time,
      ["rgba(228,255,255,.90)","rgba(46,212,246,.68)","rgba(88,69,255,.53)","rgba(227,62,194,.12)"],
      .74,.20
    );

    // Inner galaxy: broad flowing ribbons, not a perfect geometric ring.
    const ribbonCount=w<120?3:5;
    for(let i=0;i<ribbonCount;i++){
      drawRibbon(ctx,engine.cx,engine.cy,r*(.84+.035*i),
        engine.time*(.045+.008*(i%2))+i*1.18,
        e,.27-i*.025);
    }

    // Living chambers: soft internal masses that drift and breathe.
    const chambers=[
      [-.34,-.14,.26,2.6,1],
      [.24,-.18,.25,5.2,2],
      [.29,.16,.22,.6,0],
      [-.18,.23,.24,4.1,3],
      [.02,.02,.29,1.8,0]
    ];
    chambers.forEach((m,i)=>{
      const driftX=Math.sin(engine.time*(.36+.04*i)+i)*r*.06+engine.lookX*r*.055;
      const driftY=Math.cos(engine.time*(.31+.03*i)+i*.7)*r*.055+engine.lookY*r*.04;
      const rr=r*m[2]*(1+.10*Math.sin(engine.time*.72+i));
      const palette=m[4]===1
        ? ["rgba(228,255,255,.82)","rgba(63,221,255,.56)","rgba(91,72,255,.38)","rgba(16,15,45,0)"]
        : m[4]===2
          ? ["rgba(255,238,205,.78)","rgba(255,136,205,.50)","rgba(103,69,255,.38)","rgba(16,15,45,0)"]
          : ["rgba(215,255,255,.80)","rgba(49,197,245,.48)","rgba(192,75,245,.40)","rgba(16,15,45,0)"];
      fillBlob(ctx,
        engine.cx+m[0]*r+driftX,
        engine.cy+m[1]*r+driftY,
        rr*1.20,rr*.80,m[3]+Math.sin(engine.time*.23+i)*.25,
        300+i*23,engine.time*.72+i,palette,.11*e,.36);
    });

    // Central life source / micro-galaxy
    const centerR=r*(.23+.025*Math.sin(engine.time*1.05)+reaction*.045);
    drawGlow(ctx,engine.cx,engine.cy,centerR*2.7,
      "rgba(255,252,219,.96)","rgba(255,123,191,.43)",
      "rgba(120,57,255,0)",.75);
    fillBlob(ctx,
      engine.cx-engine.lookX*r*.02,
      engine.cy-engine.lookY*r*.01,
      centerR*1.25,centerR*.98,
      engine.time*.10,700,engine.time,
      ["#fff9dd","#ffca82","#ff69c8","#7d4cff"],
      .48,.30);

    // Synaptic firing layer. Nodes stay close to the body and move subtly.
    const nodeCount=w<120?10:16;
    for(let i=0;i<nodeCount;i++){
      const a=chooseNodeAngle(engine,i);
      const radial=r*(.52+.11*Math.sin(engine.time*.34+i*1.7));
      const wobble=1+.028*Math.sin(engine.time*.88+i);
      const x=engine.cx+Math.cos(a)*radial*wobble;
      const y=engine.cy+Math.sin(a)*radial*.92*wobble;
      const hot=(i%5===0)||Math.sin(engine.time*.52+i*1.2)>.93;
      const phase=engine.time*(1.7+.11*(i%4))+i*1.7;
      drawSynapse(ctx,x,y,r*.022*(i%4===0?1.22:1),phase,hot,.72*e);

      // Short organic neural link into the next node.
      if(i<nodeCount-1){
        const a2=chooseNodeAngle(engine,i+1);
        const rad2=r*(.52+.11*Math.sin(engine.time*.34+(i+1)*1.7));
        const x2=engine.cx+Math.cos(a2)*rad2;
        const y2=engine.cy+Math.sin(a2)*rad2*.92;
        ctx.save();
        ctx.globalCompositeOperation="screen";
        ctx.globalAlpha=.18*e;
        ctx.strokeStyle=hot?"rgba(255,151,207,.80)":"rgba(94,221,255,.70)";
        ctx.lineWidth=Math.max(1,r*.008);
        ctx.beginPath();
        ctx.moveTo(x,y);
        ctx.quadraticCurveTo(engine.cx+(x+x2-engine.cx*2)*.18,
          engine.cy+(y+y2-engine.cy*2)*.18,x2,y2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Tiny internal sparks travel through the tissue.
    const sparks=w<120?12:24;
    for(let i=0;i<sparks;i++){
      const t=engine.time*(.34+.018*(i%5))+i*2.19;
      const x=engine.cx+Math.sin(t*1.11+i*.71)*r*.64;
      const y=engine.cy+Math.cos(t*.83+i*.44)*r*.57;
      const s=r*(.006+.004*(i%3));
      const hot=i%7===0;
      drawGlow(ctx,x,y,s*2.8,
        hot?"rgba(255,234,190,.9)":"rgba(196,251,255,.8)",
        hot?"rgba(255,116,173,.5)":"rgba(64,205,255,.38)",
        "rgba(103,63,255,0)",.30*e);
    }

    ctx.restore();

    // A few living particles can leave the body and fade, rather than explode.
    for(let i=engine.particles.length-1;i>=0;i--){
      const p=engine.particles[i];
      p.age+=engine.dt;
      if(p.age>=p.life){engine.particles.splice(i,1);continue;}
      const q=clamp(p.age/p.life,0,1);
      const a=p.a+p.speed*engine.time;
      const dist=r*(p.dist+.08*Math.sin(engine.time*1.1+p.a));
      const x=engine.cx+Math.cos(a)*dist;
      const y=engine.cy+Math.sin(a)*dist*.88;
      drawSynapse(ctx,x,y,r*p.size*(1+q*.25),
        engine.time*2+p.a,p.hot,(1-q)*.42);
    }

    // Pulse waves reveal that the whole nucleus is breathing.
    for(let i=engine.pulses.length-1;i>=0;i--){
      const p=engine.pulses[i];
      p.age+=engine.dt;
      if(p.age>=p.life){engine.pulses.splice(i,1);continue;}
      drawPulse(ctx,engine,r,p);
    }

    // A very soft ground echo, only to anchor the orb spatially.
    ctx.save();
    ctx.globalCompositeOperation="screen";
    ctx.globalAlpha=.12+.06*reaction;
    const g=ctx.createRadialGradient(engine.cx,engine.cy+r*.78,0,
      engine.cx,engine.cy+r*.78,r*.62);
    g.addColorStop(0,"rgba(70,226,255,.65)");
    g.addColorStop(.36,"rgba(157,78,255,.30)");
    g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.ellipse(engine.cx,engine.cy+r*.78,r*.58,r*.09,0,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function schedulePulse(engine,strong){
    if(!engine.alive)return;
    spawnPulse(engine,strong);
    clearTimeout(engine.pulseTimer);
    const base=engine.state==="thinking"||engine.state==="executing"?1.35:
      engine.state==="searching"||engine.state==="playful"?1.20:1;
    engine.pulseTimer=setTimeout(()=>schedulePulse(engine,false),rand(1900,3600)/base);
  }

  function scheduleParticles(engine){
    if(!engine.alive)return;
    spawnParticle(engine,Math.random()<.28);
    clearTimeout(engine.particleTimer);
    engine.particleTimer=setTimeout(()=>scheduleParticles(engine),rand(240,720));
  }

  function scheduleExpression(engine,forced){
    if(!engine.alive)return;
    engine.expression=forced||"soft";
    clearTimeout(engine.expressionTimer);
    engine.expressionTimer=setTimeout(()=>{
      if(!engine.alive)return;
      engine.expression=EXPRESSIONS[Math.floor(Math.random()*EXPRESSIONS.length)];
      engine.expressionTimer=setTimeout(()=>scheduleExpression(engine,"soft"),
        rand(900,2400));
    },rand(1800,4200));
  }

  function createEngine(host,canvas){
    const ctx=canvas.getContext("2d",{alpha:true,desynchronized:true});
    if(!ctx)return null;

    const engine={
      host,canvas,ctx,
      cssW:0,cssH:0,dpr:1,
      state:STATES[host.dataset.state]?host.dataset.state:"idle",
      energy:1,
      expression:"soft",
      time:0,dt:.016,lastTs:0,frame:0,alive:true,
      cx:0,cy:0,
      lookX:0,lookY:0,targetLookX:0,targetLookY:0,
      reaction:0,
      pulses:[],particles:[],
      pulseTimer:0,particleTimer:0,expressionTimer:0,
      reactionTimer:0,
      orbitSeed:Array.from({length:24},(_,i)=>rand(-.12,.12))
    };

    function resize(){
      const rect=host.getBoundingClientRect();
      const w=Math.max(1,rect.width||host.clientWidth||1);
      const h=Math.max(1,rect.height||host.clientHeight||w);
      engine.cssW=w;engine.cssH=h;engine.dpr=dpr();
      canvas.width=Math.max(1,Math.round(w*engine.dpr));
      canvas.height=Math.max(1,Math.round(h*engine.dpr));
      canvas.style.width=w+"px";
      canvas.style.height=h+"px";
    }

    engine.resize=resize;
    engine.setState=function(next){
      engine.state=STATES[next]?next:"idle";
      engine.energy=STATES[engine.state].energy;
      engine.reaction=Math.max(engine.reaction,.45);
      spawnPulse(engine,true);
      for(let i=0;i<Math.min(3,engine.particles.length<30?3:0);i++) spawnParticle(engine,true);
      host.dataset.state=engine.state;
      host.setAttribute("aria-label","Akira · "+STATES[engine.state].label+" · núcleo sináptico vivo");
    };

    engine.react=function(expr,duration){
      if(EXPRESSIONS.includes(expr)) engine.expression=expr;
      engine.reaction=Math.max(engine.reaction,.92);
      spawnPulse(engine,true);
      spawnPulse(engine,true);
      for(let i=0;i<2;i++)spawnParticle(engine,true);
      clearTimeout(engine.reactionTimer);
      if(duration){
        engine.reactionTimer=setTimeout(()=>{
          if(engine.alive)engine.expression="soft";
        },duration);
      }
    };

    engine.destroy=function(){
      engine.alive=false;
      cancelAnimationFrame(engine.frame);
      clearTimeout(engine.pulseTimer);
      clearTimeout(engine.particleTimer);
      clearTimeout(engine.expressionTimer);
      clearTimeout(engine.reactionTimer);
      if(engine.resizeObserver){
        try{engine.resizeObserver.disconnect();}catch(_){}
        engine.resizeObserver=null;
      }
      window.removeEventListener("resize",resize);
      canvas.removeEventListener("pointermove",onPointerMove);
      canvas.removeEventListener("pointerleave",onPointerLeave);
      canvas.removeEventListener("pointerdown",onPointerDown);
    };

    function onPointerMove(ev){
      const rect=canvas.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      engine.targetLookX=clamp((ev.clientX-rect.left)/rect.width-.5,-.5,.5);
      engine.targetLookY=clamp((ev.clientY-rect.top)/rect.height-.5,-.5,.5);
    }
    function onPointerLeave(){
      engine.targetLookX=0;engine.targetLookY=0;
    }
    function onPointerDown(){
      engine.reaction=1;
      spawnPulse(engine,true);
      for(let i=0;i<3;i++)spawnParticle(engine,true);
    }

    canvas.addEventListener("pointermove",onPointerMove,{passive:true});
    canvas.addEventListener("pointerleave",onPointerLeave,{passive:true});
    canvas.addEventListener("pointerdown",onPointerDown,{passive:true});
    canvas.style.touchAction="manipulation";

    if("ResizeObserver" in window){
      engine.resizeObserver=new ResizeObserver(resize);
      engine.resizeObserver.observe(host);
    }else{
      window.addEventListener("resize",resize,{passive:true});
    }

    resize();
    schedulePulse(engine,false);
    scheduleParticles(engine);
    scheduleExpression(engine,"soft");

    function frame(ts){
      if(!engine.alive)return;
      if(document.visibilityState==="hidden"){
        engine.lastTs=ts;
        engine.frame=requestAnimationFrame(frame);
        return;
      }
      if(!engine.lastTs)engine.lastTs=ts;
      engine.dt=clamp((ts-engine.lastTs)/1000,.008,.05);
      engine.lastTs=ts;
      engine.time+=engine.dt;

      engine.lookX+=(engine.targetLookX-engine.lookX)*Math.min(1,engine.dt*4.8);
      engine.lookY+=(engine.targetLookY-engine.lookY)*Math.min(1,engine.dt*4.8);
      engine.reaction=Math.max(0,engine.reaction-engine.dt*.72);

      draw(engine);
      engine.frame=requestAnimationFrame(frame);
    }

    engine.frame=requestAnimationFrame(frame);
    return engine;
  }

  function mountOne(host){
    if(!host)return null;
    if(host.__akiraEntity)return host.__akiraEntity;

    host.classList.add("akira-entity-slot","is-akira-entity","akira-plasma-canvas-slot");
    host.setAttribute("role","img");

    const size=Number(host.dataset.size||0);
    if(size){
      host.style.width=host.style.width||size+"px";
      host.style.height=host.style.height||size+"px";
    }

    const canvas=document.createElement("canvas");
    canvas.className="akira-plasma-canvas";
    canvas.setAttribute("aria-hidden","true");
    canvas.setAttribute("draggable","false");
    host.innerHTML="";
    host.appendChild(canvas);

    const engine=createEngine(host,canvas);
    if(!engine)return null;

    const controller={
      setState(next,opts){
        engine.setState(next);
        if(STATES[next]&&next==="success"&&!(opts&&opts.persist)){
          clearTimeout(controller.__successTimer);
          controller.__successTimer=setTimeout(()=>{
            if(engine.alive)controller.setState("idle");
          },1600);
        }
      },
      getState:()=>engine.state,
      react:(expr,duration)=>engine.react(expr,duration),
      resize:()=>engine.resize(),
      destroy(){
        clearTimeout(controller.__successTimer);
        engine.destroy();
        host.__akiraEntity=null;
        host.innerHTML="";
      }
    };

    host.__akiraEntity=controller;
    engine.energy=STATES[engine.state].energy;
    host.setAttribute("aria-label","Akira · "+STATES[engine.state].label+" · núcleo sináptico vivo");
    return controller;
  }

  function mountAll(root){
    const base=root||document;
    const list=base.querySelectorAll?
      base.querySelectorAll("[data-akira-entity],.akira-entity-slot"):[];
    list.forEach(mountOne);
    return list.length;
  }

  function setState(next,target){
    const list=typeof target==="string"
      ?document.querySelectorAll(target)
      :document.querySelectorAll("[data-akira-entity],.akira-entity-slot");
    list.forEach(el=>{
      const c=mountOne(el);
      if(c)c.setState(next);
    });
  }

  function reactAll(expr,duration,target){
    const list=target
      ?document.querySelectorAll(target)
      :document.querySelectorAll("[data-akira-entity],.akira-entity-slot");
    list.forEach(el=>{
      const c=mountOne(el);
      if(c)c.react(expr,duration);
    });
  }

  function wireConversationReactions(){
    if(document.__akiraSynapticOrbReactions)return;
    document.__akiraSynapticOrbReactions=true;

    const react=expr=>reactAll(expr,1100);

    document.addEventListener("click",ev=>{
      if(ev.target&&ev.target.closest&&ev.target.closest("#sendBtn"))react("curious");
    },true);

    document.addEventListener("keydown",ev=>{
      if(ev.key==="Enter"&&!ev.shiftKey&&ev.target&&ev.target.closest&&ev.target.closest("#msg"))react("curious");
    },true);

    const msgs=document.getElementById("msgsInner");
    if(msgs&&window.MutationObserver){
      const observer=new MutationObserver(mutations=>{
        let user=false,akira=false;
        mutations.forEach(m=>{
          Array.from(m.addedNodes||[]).forEach(n=>{
            if(!(n instanceof HTMLElement))return;
            if(n.classList.contains("user")||n.querySelector(".msg-row.user"))user=true;
            if(n.classList.contains("akira")||n.querySelector(".msg-row.akira"))akira=true;
          });
        });
        if(user)react("curious");
        if(akira)react("joy");
      });
      observer.observe(msgs,{childList:true,subtree:true});
    }

    [
      "akira:chat-user-message",
      "akira:chat-response-start",
      "akira:chat-response-done",
      "akira:chat-error"
    ].forEach(name=>{
      document.addEventListener(name,()=>{
        const map={
          "akira:chat-user-message":"curious",
          "akira:chat-response-start":"curious",
          "akira:chat-response-done":"joy",
          "akira:chat-error":"surprised"
        };
        react(map[name]||"soft");
      });
    });
  }

  window.AkiraEntity={
    states:Object.keys(STATES),
    expressions:EXPRESSIONS.slice(),
    mount:mountOne,
    mountAll,
    setState,
    react:reactAll,
    stateInfo:s=>STATES[s]||STATES.idle
  };
  window.akiraEntitySetState=setState;
  window.akiraEntityMount=mountOne;
  window.akiraEntityReact=reactAll;

  document.addEventListener("DOMContentLoaded",()=>{
    mountAll(document);
    wireConversationReactions();
    window.dispatchEvent(new CustomEvent("akira:entity-ready"));
  });
})();