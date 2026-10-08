/* AKIRA LIVING PLASMA CORE — CANVAS V1
 * Nueva identidad visual construida desde cero.
 * No usa la arquitectura SVG de las versiones anteriores.
 *
 * Principio visual:
 * - ninguna línea ornamental
 * - ninguna órbita
 * - ninguna malla ni anillo
 * - el cuerpo ES una masa de plasma, hecha de volúmenes blandos
 * - las emisiones son pequeñas masas calientes que se desprenden y se evaporan
 * - la cara nace dentro de la luz del plasma, no como sticker
 *
 * Runtime:
 * - Canvas 2D nativo del navegador
 * - requestAnimationFrame con tiempo real (no depende del scroll)
 * - ResizeObserver + DPR limitado para móviles
 * - pausa solo cuando la pestaña está oculta
 */
(function(){
  "use strict";

  const STATES={
    idle:{label:"En calma",energy:1.00},
    thinking:{label:"Pensando",energy:1.16},
    searching:{label:"Explorando",energy:1.28},
    learning:{label:"Aprendiendo",energy:1.08},
    remembering:{label:"Recordando",energy:0.94},
    executing:{label:"Ejecutando",energy:1.24},
    success:{label:"Listo",energy:1.10},
    uncertain:{label:"Con cautela",energy:0.84},
    error:{label:"Atención",energy:0.92},
    playful:{label:"Juguetona",energy:1.22}
  };

  const EXPRESSIONS=[
    "soft","curious","joy","surprised","wink","sleepy","playful","blink"
  ];

  const EXPRESSION_CONFIG={
    soft:{left:.82,right:.82,mouth:"soft"},
    curious:{left:.77,right:1.00,mouth:"small"},
    joy:{left:.96,right:.96,mouth:"joy"},
    surprised:{left:.93,right:.93,mouth:"open"},
    wink:{left:.10,right:.92,mouth:"joy"},
    sleepy:{left:.34,right:.34,mouth:"small"},
    playful:{left:.84,right:.98,mouth:"playful"},
    blink:{left:.08,right:.08,mouth:"small"}
  };

  const PALETTE=[
    ["#d9ffff","#55ecff","#7369ff","#e54cff"],
    ["#fff1bd","#ffb45e","#ff62c9","#8059ff"],
    ["#e6ffff","#6cecff","#4d7dff","#c948ff"],
    ["#fff3ca","#ff884f","#ff4fb4","#6a5cff"]
  ];

  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const rand=(a,b)=>a+Math.random()*(b-a);
  const normalizeState=s=>STATES[s]?s:"idle";

  function hashNoise(n){
    const x=Math.sin(n*12.9898)*43758.5453123;
    return x-Math.floor(x);
  }

  function smoothNoise(t,seed){
    const a=Math.floor(t);
    const f=t-a;
    const s=f*f*(3-2*f);
    return lerp(hashNoise(a+seed),hashNoise(a+seed+1),s);
  }

  function roundDpr(){
    return clamp(window.devicePixelRatio||1,1,2.25);
  }

  function blobPath(ctx,cx,cy,rx,ry,rotation,seed,time,warp){
    const count=18;
    const points=[];
    const c=Math.cos(rotation),s=Math.sin(rotation);
    for(let i=0;i<count;i++){
      const a=(Math.PI*2*i)/count;
      const n1=smoothNoise(time*0.72+i*0.37,seed);
      const n2=Math.sin(time*1.17+seed*0.61+i*1.73);
      const ripple=1 + warp*((n1-.5)*1.35 + n2*.42);
      const x=Math.cos(a)*rx*ripple;
      const y=Math.sin(a)*ry*(1 + warp*.28*Math.sin(time*.91+i*1.11+seed))*ripple;
      points.push({
        x:cx + x*c - y*s,
        y:cy + x*s + y*c
      });
    }

    ctx.beginPath();
    for(let i=0;i<count;i++){
      const p=points[i];
      const next=points[(i+1)%count];
      const midX=(p.x+next.x)/2;
      const midY=(p.y+next.y)/2;
      if(i===0) ctx.moveTo(midX,midY);
      ctx.quadraticCurveTo(p.x,p.y,midX,midY);
    }
    ctx.closePath();
  }

  function fillGradientBlob(ctx,x,y,rx,ry,rotation,seed,time,colors,alpha,warp){
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(rotation);
    const g=ctx.createRadialGradient(
      -rx*.28,-ry*.30,0,
      0,0,Math.max(rx,ry)*1.08
    );
    g.addColorStop(0,colors[0]);
    g.addColorStop(.25,colors[1]);
    g.addColorStop(.58,colors[2]);
    g.addColorStop(1,colors[3]);
    ctx.globalAlpha=alpha;
    ctx.fillStyle=g;
    blobPath(ctx,0,0,rx,ry,0,seed,time,warp);
    ctx.fill();
    ctx.restore();
  }

  function corePath(ctx,cx,cy,rx,ry,time,seed){
    blobPath(ctx,cx,cy,rx,ry,
      Math.sin(time*.31)*.035,
      seed,time,.11
    );
  }

  function drawEye(ctx,x,y,w,h,open,tilt){
    if(open<=.04) return;
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(tilt);
    const oh=Math.max(h*.08,h*open);
    const g=ctx.createRadialGradient(-w*.13,-oh*.18,0,0,0,Math.max(w,oh)*.72);
    g.addColorStop(0,"rgba(255,255,255,.98)");
    g.addColorStop(.42,"rgba(212,255,255,.97)");
    g.addColorStop(1,"rgba(104,236,255,.40)");
    ctx.globalCompositeOperation="lighter";
    ctx.globalAlpha=.92;
    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.moveTo(-w*.52,0);
    ctx.quadraticCurveTo(0,-oh*.72,w*.52,0);
    ctx.quadraticCurveTo(0,oh*.72,-w*.52,0);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha=.78;
    ctx.fillStyle="rgba(255,255,255,.96)";
    ctx.beginPath();
    ctx.ellipse(-w*.10,-oh*.12,w*.14,oh*.18,0,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function drawMouth(ctx,x,y,w,h,type){
    ctx.save();
    ctx.translate(x,y);
    ctx.globalCompositeOperation="lighter";

    if(type==="open"){
      const g=ctx.createRadialGradient(0,-h*.12,0,0,0,w*.75);
      g.addColorStop(0,"rgba(255,238,251,.96)");
      g.addColorStop(.36,"rgba(255,173,229,.96)");
      g.addColorStop(1,"rgba(255,74,188,.08)");
      ctx.fillStyle=g;
      ctx.beginPath();
      ctx.ellipse(0,0,w*.42,h*.62,0,0,Math.PI*2);
      ctx.fill();
      ctx.restore();
      return;
    }

    const depth=type==="joy"?1.16:type==="playful"?1.03:type==="small"?.72:.88;
    const rise=type==="joy"?-2:type==="playful"?-1:0;
    const g=ctx.createRadialGradient(0,-h*.2,0,0,0,w*.82);
    g.addColorStop(0,"rgba(255,235,250,.98)");
    g.addColorStop(.34,"rgba(255,177,228,.96)");
    g.addColorStop(1,"rgba(255,83,190,.08)");
    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.moveTo(-w*.48,0);
    ctx.quadraticCurveTo(0,h*depth+rise,w*.48,0);
    ctx.quadraticCurveTo(0,h*.42+rise,-w*.48,0);
    ctx.closePath();
    ctx.fill();

    if(type==="joy" || type==="playful"){
      ctx.globalAlpha=.68;
      ctx.fillStyle="rgba(255,255,255,.90)";
      ctx.beginPath();
      ctx.ellipse(0,h*.05,w*.18,h*.10,0,0,Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCheek(ctx,x,y,r){
    const g=ctx.createRadialGradient(x-r*.15,y-r*.16,0,x,y,r);
    g.addColorStop(0,"rgba(255,202,237,.74)");
    g.addColorStop(.34,"rgba(255,92,190,.52)");
    g.addColorStop(1,"rgba(255,54,170,0)");
    ctx.globalCompositeOperation="lighter";
    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fill();
  }

  function chooseEmissionAngle(engine){
    if(Math.abs(engine.lookX)+Math.abs(engine.lookY)>.32){
      const toward=Math.atan2(engine.lookY,engine.lookX);
      return toward + rand(-.8,.8);
    }
    return engine.time*0.17 + rand(-Math.PI,Math.PI);
  }

  function spawnEmission(engine,burst){
    if(engine.emissions.length>=12) return;
    const angle=chooseEmissionAngle(engine);
    const thermal=Math.random()<.48;
    engine.emissions.push({
      angle,
      age:0,
      life:rand(.72,burst?1.28:1.14),
      size:rand(.09,.17),
      speed:rand(.21,.38)*(burst?1.24:1),
      wobble:rand(.6,1.4),
      phase:rand(0,Math.PI*2),
      color:thermal?1:Math.random()<.5?0:2,
      hot:thermal
    });
  }

  function spawnBurst(engine,count){
    for(let i=0;i<count;i++) spawnEmission(engine,true);
    engine.reaction=1;
  }

  function drawEmission(ctx,engine,e,r){
    const p=clamp(e.age/e.life,0,1);
    const ease=p*p*(3-2*p);
    const angle=e.angle + Math.sin(engine.time*e.wobble+e.phase)*.12;
    const originR=r*.72;
    const travel=r*(.58*e.speed + .18);
    const dist=originR + travel*ease;
    const x=engine.cx+Math.cos(angle)*dist;
    const y=engine.cy+Math.sin(angle)*dist;
    const s=r*e.size*(1 + .20*Math.sin(p*Math.PI));
    const alpha=(1-p)*(p<.18?lerp(.2,1,p/.18):1);

    const colors=PALETTE[e.color];
    const hotColors=e.hot
      ? ["#fff6c8","#ffcf69","#ff6aaf","#7d61ff"]
      : colors;

    fillGradientBlob(
      ctx,x,y,
      s*(1.10+.28*Math.sin(e.phase+p*7)),
      s*(.86+.20*Math.cos(e.phase+p*6)),
      angle+Math.sin(e.phase)*.2,
      70+Math.round(e.phase*10),
      engine.time*1.4+e.phase,
      hotColors,
      alpha,
      .22
    );

    if(p>.34 && p<.88){
      const haze=1-p;
      fillGradientBlob(
        ctx,
        x-Math.cos(angle)*s*.62,
        y-Math.sin(angle)*s*.62,
        s*.55,s*.42,
        angle,
        190+Math.round(e.phase),
        engine.time*1.6,
        ["#f2ffff","#70eaff","#9c55ff","#ff4fbe"],
        .18*haze,
        .35
      );
    }

    if(p>.72){
      for(let i=0;i<2;i++){
        const drift=(i?1:-1)*s*1.1;
        fillGradientBlob(
          ctx,
          x+Math.cos(angle+1.4)*drift*(p-.7),
          y+Math.sin(angle+1.4)*drift*(p-.7),
          s*.22,s*.18,0,
          240+i*19,
          engine.time*1.9+i,
          ["#ffffff","#9ff7ff","#c45bff","#ff55b7"],
          .16*(1-p),
          .25
        );
      }
    }
  }

  function drawFace(ctx,engine,r){
    const cfg=EXPRESSION_CONFIG[engine.expression]||EXPRESSION_CONFIG.soft;
    const faceScale=r/112;
    const fx=engine.cx+engine.lookX*r*.08;
    const fy=engine.cy+engine.lookY*r*.05;

    drawCheek(ctx,fx-r*.43,fy+r*.20,r*.16);
    drawCheek(ctx,fx+r*.43,fy+r*.20,r*.16);

    const eyeW=r*.35;
    const eyeH=r*.18;
    drawEye(ctx,fx-r*.27,fy-r*.04,eyeW,eyeH,cfg.left,engine.expression==="curious"?-.08:0);
    drawEye(ctx,fx+r*.27,fy-r*.04,eyeW,eyeH,cfg.right,engine.expression==="curious"?.08:0);

    const mouthW=r*.38;
    const mouthH=r*.12*faceScale;
    drawMouth(ctx,fx,fy+r*.23,mouthW,mouthH,cfg.mouth);

    if(engine.expression==="playful"){
      ctx.globalCompositeOperation="lighter";
      ctx.fillStyle="rgba(255,255,255,.78)";
      ctx.beginPath();
      ctx.ellipse(fx-r*.18,fy+r*.08,r*.06,r*.03,0,0,Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(fx+r*.18,fy+r*.08,r*.045,r*.025,0,0,Math.PI*2);
      ctx.fill();
    }
  }

  function draw(engine){
    const ctx=engine.ctx;
    const w=engine.cssW,h=engine.cssH;
    if(!ctx||w<=0||h<=0) return;

    const dpr=engine.dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,w,h);

    const base=Math.min(w,h);
    const r=Math.max(8,base*.34);
    engine.cx=w*.5 + engine.lookX*base*.018;
    engine.cy=h*.49 + engine.lookY*base*.012;
    const energy=engine.energy*(1+engine.reaction*.055);
    const pulse=1 + Math.sin(engine.time*1.35)*.016*energy;
    const rx=r*1.07*pulse;
    const ry=r*.95*(1+Math.sin(engine.time*.91+1.3)*.025);

    ctx.save();
    ctx.globalCompositeOperation="lighter";

    const aura=ctx.createRadialGradient(engine.cx,engine.cy,0,engine.cx,engine.cy,r*1.55);
    aura.addColorStop(0,"rgba(87,225,255,.22)");
    aura.addColorStop(.34,"rgba(146,73,255,.14)");
    aura.addColorStop(.65,"rgba(255,71,188,.06)");
    aura.addColorStop(1,"rgba(255,71,188,0)");
    ctx.fillStyle=aura;
    ctx.beginPath();
    ctx.arc(engine.cx,engine.cy,r*1.55,0,Math.PI*2);
    ctx.fill();
    ctx.restore();

    // Masa periférica: 4 volúmenes superpuestos para evitar la silueta de esfera perfecta.
    const lobes=[
      {a:-2.35,rx:.22,ry:.15,c:2,off:.3},
      {a:-.75,rx:.20,ry:.17,c:0,off:1.9},
      {a:.20,rx:.24,ry:.15,c:1,off:2.6},
      {a:2.65,rx:.21,ry:.16,c:3,off:4.4}
    ];
    lobes.forEach((l,i)=>{
      const a=l.a + Math.sin(engine.time*.4+i)*.035;
      const dist=r*.82;
      fillGradientBlob(
        ctx,
        engine.cx+Math.cos(a)*dist,
        engine.cy+Math.sin(a)*dist,
        r*l.rx*(1+.06*Math.sin(engine.time*.9+l.off)),
        r*l.ry*(1+.08*Math.cos(engine.time*.75+l.off)),
        a+0.5*Math.sin(engine.time*.6+l.off),
        20+i*11,
        engine.time*.72+l.off,
        PALETTE[l.c],
        .42*energy,
        .18
      );
    });

    // Silueta principal irregular.
    const mainColors=engine.state==="error"
      ? ["#fff0dc","#ff9069","#ff4d9f","#6548d9"]
      : ["#eaffff","#62eaff","#6e6dff","#b735ff"];

    const mainGrad=ctx.createRadialGradient(
      engine.cx-r*.24,engine.cy-r*.28,0,
      engine.cx,engine.cy,r*1.18
    );
    mainGrad.addColorStop(0,"rgba(238,255,255,.96)");
    mainGrad.addColorStop(.18,"rgba(100,232,255,.96)");
    mainGrad.addColorStop(.40,engine.state==="error"?"rgba(255,120,103,.70)":"rgba(77,121,255,.80)");
    mainGrad.addColorStop(.66,"rgba(144,61,255,.66)");
    mainGrad.addColorStop(.86,"rgba(226,55,179,.40)");
    mainGrad.addColorStop(1,"rgba(16,16,52,.08)");

    ctx.save();
    corePath(ctx,engine.cx,engine.cy,rx,ry,engine.time,44);
    ctx.globalAlpha=.90;
    ctx.fillStyle=mainGrad;
    ctx.fill();
    ctx.clip();

    // Corrientes internas como VOLUMENES, nunca como trazos.
    const innerCount=w<120 ? 5 : 8;
    for(let i=0;i<innerCount;i++){
      const n=smoothNoise(engine.time*.25+i*.63,300+i);
      const ang=engine.time*(.18+.03*i)+i*1.82;
      const band=r*(.30+.11*Math.sin(i*1.7));
      const x=engine.cx+Math.cos(ang)*band + Math.sin(engine.time*.7+i)*r*.08;
      const y=engine.cy+Math.sin(ang*1.17)*band*.74 + Math.cos(engine.time*.61+i)*r*.07;
      const br=r*(.12+.055*n)*(i%3===0?1.22:1);
      const palette=PALETTE[i%PALETTE.length];
      fillGradientBlob(
        ctx,x,y,
        br*(1.18+.12*Math.sin(engine.time+i)),
        br*(.68+.16*Math.cos(engine.time*.9+i)),
        ang+.35,
        420+i*17,
        engine.time*(.55+.04*i)+i,
        palette,
        .18+.05*n,
        .32
      );
    }

    // Bolsas térmicas: el "calor" se siente por masa, no por líneas.
    const heatPts=[
      [-.18,-.24,.18,1.8],
      [.18,-.10,.13,.7],
      [.08,.18,.17,2.5],
      [-.12,.24,.12,4.2],
      [.28,.20,.10,5.1]
    ];
    heatPts.forEach((p,i)=>{
      const x=engine.cx+p[0]*r + Math.sin(engine.time*.8+i)*r*.025;
      const y=engine.cy+p[1]*r + Math.cos(engine.time*.67+i)*r*.022;
      const rr=r*p[2]*(1+.11*Math.sin(engine.time*1.1+i));
      fillGradientBlob(
        ctx,x,y,rr*1.24,rr*.92,p[3],
        510+i*13,
        engine.time*1.05+i,
        ["#fff5ca","#ffb866","#ff4fae","#784cff"],
        (.14+.055*Math.sin(engine.time*1.2+i))*energy,
        .26
      );
    });

    // Microplasma: pocas partículas blandas que pasan dentro del cuerpo.
    const microCount=w<120?9:15;
    for(let i=0;i<microCount;i++){
      const t=engine.time*(.28+.02*(i%4))+i*1.67;
      const px=engine.cx + Math.sin(t*1.21+i*.27)*r*.64;
      const py=engine.cy + Math.cos(t*.87+i*.41)*r*.54;
      const s=r*(.012+.005*(i%3));
      const col=i%4===0?["#fff7cf","#ffc16b","#ff5ac4","#704cff"]:["#dffeff","#71eaff","#736bff","#dd5aff"];
      fillGradientBlob(
        ctx,px,py,s*1.5,s,0,700+i,
        t,col,.20+.08*Math.sin(t+i),.18
      );
    }
    ctx.restore();

    // Reacción/emisión: materia caliente que se desprende de la masa.
    for(let i=engine.emissions.length-1;i>=0;i--){
      const e=engine.emissions[i];
      e.age+=engine.dt;
      if(e.age>=e.life){engine.emissions.splice(i,1);continue;}
      drawEmission(ctx,engine,e,r);
    }

    // Aura caliente local para que el plasma "respire".
    ctx.save();
    const heat=ctx.createRadialGradient(
      engine.cx+r*.10,engine.cy+r*.18,0,
      engine.cx+r*.10,engine.cy+r*.18,r*.72
    );
    heat.addColorStop(0,engine.state==="error"?"rgba(255,142,111,.28)":"rgba(255,198,105,.20)");
    heat.addColorStop(.34,"rgba(255,76,180,.12)");
    heat.addColorStop(1,"rgba(255,76,180,0)");
    ctx.globalCompositeOperation="lighter";
    ctx.fillStyle=heat;
    ctx.beginPath();
    ctx.arc(engine.cx+r*.10,engine.cy+r*.18,r*.72,0,Math.PI*2);
    ctx.fill();
    ctx.restore();

    drawFace(ctx,engine,r);

    // Puntos de evaporación alrededor: muy pocos y muy suaves.
    ctx.save();
    ctx.globalCompositeOperation="lighter";
    for(let i=0;i<6;i++){
      const a=i*1.37+engine.time*.10;
      const dist=r*(1.0+.22*Math.sin(engine.time*.58+i));
      const x=engine.cx+Math.cos(a)*dist;
      const y=engine.cy+Math.sin(a)*dist;
      const s=r*(.010+.006*((i+2)%3));
      const alpha=.13+.10*(.5+.5*Math.sin(engine.time*1.4+i));
      const g=ctx.createRadialGradient(x,y,0,x,y,s*4);
      g.addColorStop(0,"rgba(240,255,255,"+alpha+")");
      g.addColorStop(1,"rgba(240,255,255,0)");
      ctx.fillStyle=g;
      ctx.beginPath();
      ctx.arc(x,y,s*4,0,Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }

  function scheduleExpression(engine,forced){
    if(!engine.alive) return;
    const next=forced||(
      Math.random()<.16
        ? "blink"
        : Math.random()<.18
          ? (Math.random()<.5?"curious":"playful")
          : "soft"
    );
    engine.expression=EXPRESSIONS.includes(next)?next:"soft";
    clearTimeout(engine.expressionTimer);
    const wait=next==="blink"?rand(420,720):rand(2200,4800);
    engine.expressionTimer=setTimeout(()=>{
      scheduleExpression(engine, next==="blink" ? "soft" : undefined);
    },wait);
  }

  function scheduleEmission(engine){
    if(!engine.alive) return;
    const base=engine.state==="thinking"||engine.state==="executing"?1.25:1;
    spawnEmission(engine,false);
    clearTimeout(engine.emissionTimer);
    engine.emissionTimer=setTimeout(()=>scheduleEmission(engine),rand(1500,3600)/base);
  }

  function createEngine(host,canvas){
    const ctx=canvas.getContext("2d",{alpha:true,desynchronized:true});
    if(!ctx) return null;

    const engine={
      host,canvas,ctx,
      cssW:0,cssH:0,dpr:1,
      state:normalizeState(host.dataset.state||"idle"),
      expression:"soft",
      energy:1,
      time:0,dt:.016,
      cx:0,cy:0,
      lookX:0,lookY:0,
      targetLookX:0,targetLookY:0,
      reaction:0,
      emissions:[],
      alive:true,
      frame:0,
      lastTs:0,
      resizeObserver:null,
      expressionTimer:0,
      emissionTimer:0
    };

    function resize(){
      const rect=host.getBoundingClientRect();
      const w=Math.max(1,rect.width||host.clientWidth||1);
      const h=Math.max(1,rect.height||host.clientHeight||w);
      engine.cssW=w;
      engine.cssH=h;
      engine.dpr=roundDpr();
      canvas.width=Math.max(1,Math.round(w*engine.dpr));
      canvas.height=Math.max(1,Math.round(h*engine.dpr));
      canvas.style.width=w+"px";
      canvas.style.height=h+"px";
    }

    engine.resize=resize;
    engine.setState=function(next){
      engine.state=normalizeState(next);
      engine.energy=STATES[engine.state].energy;
      engine.reaction=Math.max(engine.reaction,.35);
      spawnBurst(engine,engine.state==="executing"||engine.state==="searching"?2:1);
      host.dataset.state=engine.state;
      host.setAttribute("aria-label","Akira · "+STATES[engine.state].label+" · núcleo de plasma vivo");
    };
    engine.react=function(expr,duration){
      if(EXPRESSIONS.includes(expr)) engine.expression=expr;
      engine.reaction=Math.max(engine.reaction,.85);
      spawnBurst(engine,expr==="joy"||expr==="surprised"?2:1);
      clearTimeout(engine.reactionTimer);
      if(duration){
        engine.reactionTimer=setTimeout(()=>{
          if(engine.alive) engine.expression="soft";
        },duration);
      }
    };
    engine.destroy=function(){
      engine.alive=false;
      cancelAnimationFrame(engine.frame);
      clearTimeout(engine.expressionTimer);
      clearTimeout(engine.emissionTimer);
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
      if(!rect.width||!rect.height) return;
      engine.targetLookX=clamp((ev.clientX-rect.left)/rect.width-.5,-.5,.5);
      engine.targetLookY=clamp((ev.clientY-rect.top)/rect.height-.5,-.5,.5);
      if(Math.abs(engine.targetLookX)>.22||Math.abs(engine.targetLookY)>.20){
        engine.expression="curious";
      }
    }
    function onPointerLeave(){
      engine.targetLookX=0;
      engine.targetLookY=0;
    }
    function onPointerDown(){
      engine.expression=Math.random()<.5?"joy":"surprised";
      engine.reaction=.95;
      spawnBurst(engine,2);
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
    scheduleExpression(engine,"soft");
    scheduleEmission(engine);

    function frame(ts){
      if(!engine.alive) return;
      if(document.visibilityState==="hidden"){
        engine.lastTs=ts;
        engine.frame=requestAnimationFrame(frame);
        return;
      }

      if(!engine.lastTs) engine.lastTs=ts;
      engine.dt=clamp((ts-engine.lastTs)/1000,.008,.05);
      engine.lastTs=ts;
      engine.time+=engine.dt;

      engine.lookX += (engine.targetLookX-engine.lookX)*Math.min(1,engine.dt*5.5);
      engine.lookY += (engine.targetLookY-engine.lookY)*Math.min(1,engine.dt*5.5);
      engine.reaction=Math.max(0,engine.reaction-engine.dt*.82);

      draw(engine);
      engine.frame=requestAnimationFrame(frame);
    }

    engine.frame=requestAnimationFrame(frame);
    return engine;
  }

  function mountOne(host){
    if(!host) return null;
    if(host.__akiraEntity) return host.__akiraEntity;

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
    if(!engine) return null;

    const controller={
      setState(next,opts){
        engine.setState(next);
        if(normalizeState(next)==="success" && !(opts&&opts.persist)){
          clearTimeout(controller.__successTimer);
          controller.__successTimer=setTimeout(()=>{
            if(engine.alive) controller.setState("idle");
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
    host.setAttribute("aria-label","Akira · "+STATES[engine.state].label+" · núcleo de plasma vivo");
    return controller;
  }

  function mountAll(root){
    const base=root||document;
    const list=base.querySelectorAll
      ? base.querySelectorAll("[data-akira-entity],.akira-entity-slot")
      : [];
    list.forEach(mountOne);
    return list.length;
  }

  function setState(next,target){
    const list=typeof target==="string"
      ? document.querySelectorAll(target)
      : document.querySelectorAll("[data-akira-entity],.akira-entity-slot");
    list.forEach(el=>{
      const c=mountOne(el);
      if(c) c.setState(next);
    });
  }

  function reactAll(expr,duration,target){
    const list=target
      ? document.querySelectorAll(target)
      : document.querySelectorAll("[data-akira-entity],.akira-entity-slot");
    list.forEach(el=>{
      const c=mountOne(el);
      if(c) c.react(expr,duration);
    });
  }

  function wireConversationReactions(){
    if(document.__akiraCanvasConversationReactions) return;
    document.__akiraCanvasConversationReactions=true;

    const react=expr=>reactAll(expr,1100);

    document.addEventListener("click",ev=>{
      if(ev.target&&ev.target.closest&&ev.target.closest("#sendBtn")) react("curious");
    },true);

    document.addEventListener("keydown",ev=>{
      if(ev.key==="Enter"&&!ev.shiftKey&&ev.target&&ev.target.closest&&ev.target.closest("#msg")) react("curious");
    },true);

    const msgs=document.getElementById("msgsInner");
    if(msgs && window.MutationObserver){
      const observer=new MutationObserver(mutations=>{
        let user=false,akira=false;
        mutations.forEach(m=>{
          if(!m.addedNodes) return;
          Array.from(m.addedNodes).forEach(n=>{
            if(!(n instanceof HTMLElement)) return;
            if(n.classList.contains("user")||n.querySelector(".msg-row.user")) user=true;
            if(n.classList.contains("akira")||n.querySelector(".msg-row.akira")) akira=true;
          });
        });
        if(user) react("curious");
        if(akira) react("joy");
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
    stateInfo:s=>STATES[normalizeState(s)]
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