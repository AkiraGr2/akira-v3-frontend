/* AKIRA LIVING SYNAPTIC GALACTIC ORB — CANVAS V2.3 / LIVING SPIRAL
 * Visual rewrite based on the real browser video review.
 *
 * Goal:
 * - one compact nucleus first
 * - clearly alive second
 * - synaptic activity and inner galaxy third
 *
 * Visual language:
 * - no face
 * - no horror
 * - no geometric orbit rings
 * - no static constellation / diagram look
 * - no decorative strokes
 * - all visible structures are filled organic masses or luminous nodes
 *
 * Life model:
 * 1) the membrane breathes and deforms locally
 * 2) the core has a slow internal circulation
 * 3) synapses fire in short-lived cascades
 * 4) a warm inner vortex pulses like a metabolic heart
 * 5) particles follow the internal flow rather than exploding outward
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
    searching:{label:"Explorando",energy:1.28},
    learning:{label:"Aprendiendo",energy:1.10},
    remembering:{label:"Recordando",energy:.96},
    executing:{label:"Ejecutando",energy:1.26},
    success:{label:"Listo",energy:1.14},
    uncertain:{label:"Con cautela",energy:.90},
    error:{label:"Atención",energy:.99},
    playful:{label:"Juguetona",energy:1.20}
  };

  // Kept as a public compatibility surface; the orb itself has no face now.
  const EXPRESSIONS=["soft","curious","joy","surprised","wink","sleepy","playful","blink"];

  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const rand=(a,b)=>a+Math.random()*(b-a);
  const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;

  function smooth(t){
    return t*t*(3-2*t);
  }

  function hash(n){
    const x=Math.sin(n*127.1+311.7)*43758.5453123;
    return x-Math.floor(x);
  }

  function noise(t,seed){
    const a=Math.floor(t);
    const f=t-a;
    return lerp(hash(a+seed),hash(a+seed+1),smooth(f));
  }

  function dpr(){
    return clamp(window.devicePixelRatio||1,1,2.15);
  }

  function blobPath(ctx,cx,cy,rx,ry,rotation,seed,time,warp){
    const count=26;
    const pts=[];
    const c=Math.cos(rotation),s=Math.sin(rotation);

    for(let i=0;i<count;i++){
      const a=(Math.PI*2*i)/count;
      const n=noise(time*.34+i*.17,seed+i*.73);
      const wave=Math.sin(time*.83+seed*.41+i*1.51);
      const local=1+warp*((n-.5)*1.48+wave*.38);
      const x=Math.cos(a)*rx*local;
      const y=Math.sin(a)*ry*(1+warp*.20*Math.sin(time*.67+i*1.17+seed))*local;
      pts.push({
        x:cx+x*c-y*s,
        y:cy+x*s+y*c
      });
    }

    ctx.beginPath();
    for(let i=0;i<count;i++){
      const p=pts[i];
      const q=pts[(i+1)%count];
      const mx=(p.x+q.x)/2;
      const my=(p.y+q.y)/2;
      if(i===0)ctx.moveTo(mx,my);
      ctx.quadraticCurveTo(p.x,p.y,mx,my);
    }
    ctx.closePath();
  }

  function fillBlob(ctx,x,y,rx,ry,rotation,seed,time,stops,alpha,warp){
    if(!Number.isFinite(x)||!Number.isFinite(y)||
       !Number.isFinite(rx)||!Number.isFinite(ry)||
       !Number.isFinite(rotation)||!Number.isFinite(alpha)||
       !Number.isFinite(warp)||rx<=.1||ry<=.1||alpha<=.001)return;
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(rotation);

    const g=ctx.createRadialGradient(
      -rx*.22,-ry*.28,0,
      0,0,Math.max(rx,ry)*1.10
    );
    g.addColorStop(0,stops[0]);
    g.addColorStop(.27,stops[1]);
    g.addColorStop(.60,stops[2]);
    g.addColorStop(1,stops[3]);

    ctx.globalAlpha=alpha;
    ctx.fillStyle=g;
    blobPath(ctx,0,0,rx,ry,0,seed,time,warp);
    ctx.fill();
    ctx.restore();
  }

  function glow(ctx,x,y,r,inner,mid,outer,alpha){
    if(!Number.isFinite(x)||!Number.isFinite(y)||
       !Number.isFinite(r)||!Number.isFinite(alpha)||
       r<=.1||alpha<=.001)return;
    const g=ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,inner);
    g.addColorStop(.30,mid);
    g.addColorStop(1,outer);
    ctx.globalAlpha=alpha;
    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.arc(x,y,r,0,Math.PI*2);
    ctx.fill();
  }

  function organicFilament(ctx,points,width,stops,alpha){
    if(points.length<2||alpha<=.001)return;

    const left=[];
    const right=[];
    for(let i=0;i<points.length;i++){
      const p=points[i];
      const prev=points[Math.max(0,i-1)];
      const next=points[Math.min(points.length-1,i+1)];
      const dx=next.x-prev.x;
      const dy=next.y-prev.y;
      const len=Math.max(.001,Math.hypot(dx,dy));
      const nx=-dy/len;
      const ny=dx/len;
      const taper=(1-Math.abs((i/(points.length-1))-.5)*.28);
      const w=width*taper*(i===0?.65:i===points.length-1?.82:1);
      left.push({x:p.x+nx*w,y:p.y+ny*w});
      right.push({x:p.x-nx*w,y:p.y-ny*w});
    }

    ctx.save();
    const first=points[0];
    const last=points[points.length-1];
    const grad=ctx.createLinearGradient(first.x,first.y,last.x,last.y);
    grad.addColorStop(0,stops[0]);
    grad.addColorStop(.35,stops[1]);
    grad.addColorStop(.72,stops[2]);
    grad.addColorStop(1,stops[3]);

    ctx.globalAlpha=alpha;
    ctx.fillStyle=grad;
    ctx.beginPath();
    ctx.moveTo(left[0].x,left[0].y);
    for(let i=1;i<left.length;i++){
      const p=left[i],q=left[i-1];
      ctx.quadraticCurveTo(q.x,q.y,(q.x+p.x)/2,(q.y+p.y)/2);
    }
    for(let i=right.length-1;i>=0;i--){
      const p=right[i];
      const q=right[Math.min(right.length-1,i+1)];
      ctx.quadraticCurveTo(q.x,q.y,(q.x+p.x)/2,(q.y+p.y)/2);
    }
    ctx.closePath();
    ctx.fill();

    // Fuzzy light alongside a filament, still as a filled volume.
    ctx.globalAlpha=alpha*.10;
    ctx.fillStyle="rgba(132,232,255,.82)";
    ctx.beginPath();
    ctx.ellipse((first.x+last.x)/2,(first.y+last.y)/2,width*1.3,width*.55,0,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function drawVortex(ctx,engine,r,energy){
    const cx=engine.cx, cy=engine.cy;
    const activity=.72+engine.heartbeatPulse*.95+engine.reaction*.42;

    glow(
      ctx,cx,cy,r*.62,
      "rgba(255,249,216,.28)",
      "rgba(255,107,195,.16)",
      "rgba(104,67,255,0)",
      .58*energy
    );

    const warm=[
      "rgba(255,246,214,.94)",
      "rgba(255,181,126,.70)",
      "rgba(255,95,197,.46)",
      "rgba(119,64,255,0)"
    ];
    const cool=[
      "rgba(205,255,255,.90)",
      "rgba(82,226,255,.62)",
      "rgba(105,93,255,.42)",
      "rgba(190,55,235,0)"
    ];

    // El universo entero nace de cuatro corrientes espirales anchas.
    // No son anillos: cada corriente avanza desde el corazón hacia afuera.
    const arms=4;
    for(let i=0;i<arms;i++){
      const pts=[];
      const steps=22;
      const start=engine.time*.10+i*(Math.PI*2/arms)+engine.spiralPhase;
      for(let j=0;j<steps;j++){
        const u=j/(steps-1);
        const ang=start+u*(Math.PI*2*1.18);
        const rr=r*(.055+.88*Math.pow(u,.92));
        const breathe=1+.055*Math.sin(engine.time*.52+i+u*5.4);
        const twist=.035*Math.sin(engine.time*.84+i*1.4+u*7);
        pts.push({
          x:cx+Math.cos(ang+twist)*rr*breathe,
          y:cy+Math.sin(ang+twist)*rr*.84*breathe
        });
      }
      organicFilament(
        ctx,pts,
        r*(.032+.016*activity)*(1+.08*Math.sin(engine.time*.65+i)),
        i%2===0?cool:warm,
        .23+.07*activity
      );
    }

    // Segunda capa: corrientes interiores más finas que giran en sentido opuesto,
    // para producir profundidad de "universo en movimiento".
    for(let i=0;i<3;i++){
      const pts=[];
      const steps=18;
      const start=-engine.time*.075+i*(Math.PI*2/3)+engine.spiralPhase*.4;
      for(let j=0;j<steps;j++){
        const u=j/(steps-1);
        const ang=start-u*(Math.PI*2*.94);
        const rr=r*(.12+.55*u);
        const wobble=1+.07*Math.sin(engine.time*.61+j*.8+i);
        pts.push({
          x:cx+Math.cos(ang)*rr*wobble,
          y:cy+Math.sin(ang)*rr*.68*wobble
        });
      }
      organicFilament(
        ctx,pts,
        r*(.014+.008*activity),
        i===1?warm:cool,
        .16+.05*activity
      );
    }

    if(engine.heartbeatPulse>.08){
      glow(
        ctx,cx,cy,r*.46,
        "rgba(255,249,220,.34)",
        "rgba(255,113,187,.20)",
        "rgba(93,66,255,0)",
        engine.heartbeatPulse*.72*energy
      );
    }

    const corePulse=1+.09*Math.sin(engine.time*1.18)
      +engine.heartbeatPulse*.18+engine.reaction*.20;
    fillBlob(
      ctx,cx,cy,
      r*.19*corePulse,r*.16*corePulse,
      engine.time*.04,
      710,engine.time,
      ["#fffce7","#ffd58a","#ff68c8","#6a47ee"],
      .60*energy,.27
    );

    glow(
      ctx,cx,cy,r*.29*corePulse,
      "rgba(255,252,226,.40)",
      "rgba(255,117,192,.17)",
      "rgba(125,70,255,0)",
      .94*energy
    );
  }

  function drawMembrane(ctx,engine,r,energy){
    const breath=Math.sin(engine.time*.62+Math.sin(engine.time*.17)*.25);
    const localPulse=engine.heartbeatPulse*.055+engine.reaction*.045;

    const rx=r*(1.00+breath*.012+localPulse);
    const ry=r*(.985-breath*.009+localPulse*.72);

    // Short organic buds are deliberately overlapped by the main membrane.
    const buds=[
      [-2.42,.81,.12,2.6,2],
      [-1.80,.90,.105,4.1,3],
      [-1.18,.84,.12,1.4,0],
      [-.54,.91,.10,5.0,1],
      [.16,.84,.12,.4,2],
      [.80,.90,.105,2.2,3],
      [1.42,.84,.11,4.8,0],
      [2.10,.89,.105,1.0,1],
      [2.72,.82,.115,3.4,2]
    ];

    buds.forEach((b,i)=>{
      const a=b[0]+Math.sin(engine.time*.22+i)*.055;
      const dist=r*b[1];
      const growth=1+.10*Math.sin(engine.time*.74+i*1.39+engine.growthPhase);
      const bx=engine.cx+Math.cos(a)*dist;
      const by=engine.cy+Math.sin(a)*dist;
      fillBlob(
        ctx,bx,by,
        r*b[2]*growth,
        r*b[2]*.68*growth,
        a+.35,
        90+i*19,
        engine.time*.65+i,
        i%3===0
          ? ["rgba(220,255,255,.70)","rgba(77,227,255,.52)","rgba(89,88,255,.34)","rgba(120,66,255,0)"]
          : i%3===1
            ? ["rgba(240,255,224,.68)","rgba(99,232,199,.45)","rgba(103,77,255,.35)","rgba(190,55,223,0)"]
            : ["rgba(255,242,212,.68)","rgba(255,129,189,.44)","rgba(117,70,255,.35)","rgba(157,48,205,0)"],
        .20*energy,
        .30
      );
    });

    const shell=ctx.createRadialGradient(
      finite(engine.cx-r*.24),finite(engine.cy-r*.26),0,
      finite(engine.cx),finite(engine.cy),Math.max(.1,finite(r*1.12,.1))
    );
    shell.addColorStop(0,"rgba(235,255,255,.94)");
    shell.addColorStop(.17,"rgba(75,226,245,.80)");
    shell.addColorStop(.38,"rgba(76,133,255,.68)");
    shell.addColorStop(.60,"rgba(124,74,255,.48)");
    shell.addColorStop(.80,"rgba(226,72,194,.28)");
    shell.addColorStop(1,"rgba(13,12,37,.05)");

    ctx.save();
    blobPath(
      ctx,engine.cx,engine.cy,rx,ry,
      Math.sin(engine.time*.22)*.07,
      40,engine.time,.20
    );
    ctx.globalCompositeOperation="source-over";
    ctx.globalAlpha=.92;
    ctx.fillStyle=shell;
    ctx.fill();
    ctx.clip();

    // Cámara interna profunda: le da volumen real al orbe y hace que
    // la actividad parezca ocurrir dentro del organismo.
    const cavity=ctx.createRadialGradient(
      engine.cx-r*.05,engine.cy-r*.02,r*.03,
      engine.cx,engine.cy,r*.56
    );
    cavity.addColorStop(0,"rgba(7,11,35,.72)");
    cavity.addColorStop(.46,"rgba(12,20,58,.52)");
    cavity.addColorStop(.78,"rgba(29,21,79,.22)");
    cavity.addColorStop(1,"rgba(10,8,30,0)");
    ctx.globalAlpha=.62;
    ctx.fillStyle=cavity;
    ctx.beginPath();
    ctx.ellipse(engine.cx,engine.cy,r*.54,r*.47,0,0,Math.PI*2);
    ctx.fill();

    // Thick flowing tissue layers.
    const tissues=[
      {x:-.24,y:-.18,s:.52,a:2.3,c:0},
      {x:.25,y:-.06,s:.46,a:5.1,c:1},
      {x:-.05,y:.26,s:.49,a:1.0,c:2},
      {x:.22,y:.22,s:.35,a:4.1,c:0},
      {x:-.28,y:.06,s:.32,a:3.3,c:1}
    ];

    tissues.forEach((m,i)=>{
      const driftX=Math.sin(engine.time*(.28+.03*i)+i*1.4)*r*.10+engine.lookX*r*.045;
      const driftY=Math.cos(engine.time*(.25+.04*i)+i*.9)*r*.08+engine.lookY*r*.035;
      const rr=r*m.s*(1+.08*Math.sin(engine.time*.55+i));
      const palette=m.c===1
        ? ["rgba(255,245,221,.34)","rgba(255,128,191,.28)","rgba(91,74,255,.25)","rgba(16,13,37,0)"]
        : m.c===2
          ? ["rgba(223,255,255,.38)","rgba(61,226,250,.28)","rgba(76,75,255,.24)","rgba(16,13,37,0)"]
          : ["rgba(239,255,225,.34)","rgba(77,216,201,.25)","rgba(128,69,255,.25)","rgba(16,13,37,0)"];
      fillBlob(
        ctx,
        engine.cx+m.x*r+driftX,
        engine.cy+m.y*r+driftY,
        rr*1.42,rr*.72,
        m.a+Math.sin(engine.time*.22+i)*.25,
        200+i*37,engine.time*.56+i,
        palette,.16*energy,.38
      );
    });

    // A traveling metabolic lobe: this is the main "it is alive" cue.
    const waveCount=engine.lifeWaves.length;
    for(let i=0;i<waveCount;i++){
      const wave=engine.lifeWaves[i];
      const p=clamp(wave.age/wave.life,0,1);
      const eased=smooth(p);
      const a=wave.angle+Math.sin(engine.time*.75+wave.seed)*.10;
      const dist=r*(.10+.78*eased);
      const x=engine.cx+Math.cos(a)*dist;
      const y=engine.cy+Math.sin(a)*dist*.84;
      const wr=r*(.16+.09*(1-p))*wave.power;
      fillBlob(
        ctx,x,y,wr*1.45,wr*.68,
        a+.4,600+i*31,engine.time*1.2+wave.seed,
        wave.hot
          ? ["rgba(255,250,219,.90)","rgba(255,156,120,.56)","rgba(255,74,190,.35)","rgba(127,64,255,0)"]
          : ["rgba(217,255,255,.86)","rgba(61,225,251,.50)","rgba(105,79,255,.34)","rgba(194,57,229,0)"],
        (.16+.11*wave.power)*(1-p),
        .34
      );
    }

    drawVortex(ctx,engine,r,energy);

    // Living synaptic field.
    drawSynapticField(ctx,engine,r,energy);

    // Fine internal sparks: they obey the core's flow field.
    const sparks=engine.mobile?12:24;
    for(let i=0;i<sparks;i++){
      const phase=i*2.07+engine.time*(.39+.018*(i%4));
      const flow=engine.time*.17+i*.7;
      const x=engine.cx+Math.cos(phase+Math.sin(flow)*.35)*r*(.24+.31*((i%5)/5));
      const y=engine.cy+Math.sin(phase*1.15+Math.cos(flow)*.25)*r*(.22+.26*((i%4)/4));
      const s=r*(.006+.003*(i%3));
      glow(
        ctx,x,y,s*4,
        i%6===0?"rgba(255,233,181,.92)":"rgba(197,252,255,.82)",
        i%6===0?"rgba(255,87,178,.46)":"rgba(72,204,255,.40)",
        "rgba(112,68,255,0)",
        .24*energy
      );
    }

    ctx.restore();
  }

  function drawSynapticField(ctx,engine,r,energy){
    const count=engine.mobile?10:18;
    for(let i=0;i<count;i++){
      const n=engine.nodes[i];

      // Cada nodo vive en una posición distinta de una espiral. La fase y la
      // profundidad evitan que parezca una rueda fija.
      const u=.10+(i/(count-1))*.84;
      const ang=n.angle+engine.time*.13
        +u*(Math.PI*2*1.12)
        +Math.sin(engine.time*.31+n.phase)*.055;
      const radial=r*(.18+.72*u);
      const lateral=r*.035*Math.sin(engine.time*(.46+n.speed*.04)+n.phase);

      const x=engine.cx
        +Math.cos(ang)*radial
        +Math.cos(ang+Math.PI*.5)*lateral
        +engine.lookX*r*.042;
      const y=engine.cy
        +Math.sin(ang)*radial*.84
        +Math.sin(ang+Math.PI*.5)*lateral*.78
        +engine.lookY*r*.032;

      const activ=clamp((Math.sin(engine.time*1.75+n.phase)+1)*.5,0,1);
      const cascade=clamp(
        (Math.sin(engine.time*.88+n.phase*1.8)+1)*.5,
        0,1
      );
      const a=(.14+.20*activ+.16*cascade)*energy;

      if(i<count-1){
        const n2=engine.nodes[i+1];
        const u2=.10+((i+1)/(count-1))*.84;
        const ang2=n2.angle+engine.time*.13
          +u2*(Math.PI*2*1.12)
          +Math.sin(engine.time*.31+n2.phase)*.055;
        const radial2=r*(.18+.72*u2);
        const x2=engine.cx+Math.cos(ang2)*radial2+engine.lookX*r*.042;
        const y2=engine.cy+Math.sin(ang2)*radial2*.84+engine.lookY*r*.032;

        const linkActivity=clamp(
          (Math.sin(engine.time*.96+n.phase*1.45+u*4.1)+1)*.5,
          0,1
        );
        if(linkActivity>.60){
          const mid={
            x:(x+x2)/2+Math.sin(engine.time*.82+n.phase)*r*.026,
            y:(y+y2)/2+Math.cos(engine.time*.73+n.phase)*r*.020
          };
          organicFilament(
            ctx,[{x,y},{x:mid.x,y:mid.y},{x:x2,y:y2}],
            r*(.007+.006*linkActivity),
            i%3===0
              ? ["rgba(255,209,139,.72)","rgba(255,112,193,.62)","rgba(92,109,255,.46)","rgba(92,66,255,0)"]
              : ["rgba(207,255,255,.70)","rgba(75,222,248,.54)","rgba(101,78,255,.44)","rgba(192,52,225,0)"],
            .24*linkActivity*energy
          );
        }
      }

      const nodeR=r*(.014+.012*activ+(i%5===0?.008:0));
      drawSynapseNode(ctx,x,y,nodeR,activ,cascade,i%5===0,energy);
    }
  }

  function drawSynapseNode(ctx,x,y,r,activ,cascade,hot,energy){
    const glowR=r*(4.8+2.8*activ);
    glow(
      ctx,x,y,glowR,
      hot?"rgba(255,238,194,.94)":"rgba(206,252,255,.86)",
      hot?"rgba(255,108,182,.42)":"rgba(62,207,255,.34)",
      "rgba(102,65,255,0)",
      (.18+.30*activ)*energy
    );

    ctx.globalAlpha=(.62+.28*activ)*energy;
    ctx.fillStyle=hot?"#ffd48a":"#9ef4ff";
    ctx.beginPath();
    ctx.arc(x,y,r*(.72+.25*activ),0,Math.PI*2);
    ctx.fill();

    if(cascade>.78){
      ctx.globalAlpha=.62*cascade*energy;
      ctx.fillStyle="#ffffff";
      ctx.beginPath();
      ctx.arc(x-r*.16,y-r*.18,r*.22,0,Math.PI*2);
      ctx.fill();
    }
  }

  function updateParticles(engine){
    for(let i=engine.particles.length-1;i>=0;i--){
      const p=engine.particles[i];
      p.age+=engine.dt;
      if(p.age>=p.life){
        engine.particles.splice(i,1);
        continue;
      }

      const t=p.age/p.life;
      p.radius=clamp(p.radius+p.radialSpeed*engine.dt,.14,1.14);
      p.angle += (
        p.angularSpeed*
        (1.10-p.radius*.36) +
        Math.sin(engine.time*.5+p.phase)*.025
      )*engine.dt;

      // Curva espiral: al alejarse, la partícula también cambia su ángulo.
      const spiralTurn=(1-p.radius)*.92;
      const a=p.angle+spiralTurn*(p.radius<.72?1:0);
      const rr=engine.radiusRef*p.radius;
      p.x=engine.cx+Math.cos(a)*rr;
      p.y=engine.cy+Math.sin(a)*rr*.86;
      p.alpha=(1-t)*(t<.12?lerp(.16,1,t/.12):1);
    }
  }

  function drawParticles(ctx,engine,r,energy){
    for(const p of engine.particles){
      const x=p.x;
      const y=p.y;
      const s=r*p.size*(1+.22*Math.sin(engine.time*2+p.phase));
      glow(
        ctx,x,y,s*3.8,
        p.hot?"rgba(255,236,188,.95)":"rgba(207,254,255,.88)",
        p.hot?"rgba(255,99,181,.42)":"rgba(58,205,255,.36)",
        "rgba(102,65,255,0)",
        p.alpha*.42*energy
      );
    }
  }

  function triggerLifeWave(engine,strong){
    if(engine.lifeWaves.length>=6) return;
    engine.lifeWaves.push({
      age:0,
      life:strong?rand(.95,1.40):rand(1.15,1.80),
      angle:rand(0,Math.PI*2),
      seed:rand(0,Math.PI*2),
      hot:Math.random()<.36,
      power:strong?1.18:rand(.72,1)
    });
  }

  function spawnParticle(engine,strong){
    if(engine.particles.length>=28)return;
    const a=rand(0,Math.PI*2);
    engine.particles.push({
      age:0,
      life:rand(1.4,3.2)*(strong?.82:1),
      angle:a,
      angularSpeed:rand(-.7,.85)*(strong?1.28:1),
      radius:rand(.52,.98),
      pxRadius:engine.radiusRef,
      pyRadius:engine.radiusRef*.88,
      x:engine.cx,
      y:engine.cy,
      size:rand(.007,.018)*(strong?1.15:1),
      alpha:1,
      phase:rand(0,Math.PI*2),
      hot:Math.random()<.24
    });
  }

  function resetLifeWaves(engine){
    engine.lifeWaves.length=0;
    engine.particles.length=0;
    for(let i=0;i<3;i++)spawnParticle(engine,false);
    triggerLifeWave(engine,false);
  }

  function scheduleHeartbeat(engine){
    if(!engine.alive)return;
    clearTimeout(engine.heartbeatTimer);
    engine.heartbeatTimer=setTimeout(()=>{
      if(!engine.alive)return;
      engine.heartbeatPulse=1;
      engine.growthPhase+=rand(.6,1.4);
      triggerLifeWave(engine,true);
      for(let i=0;i<2;i++)spawnParticle(engine,true);
      scheduleHeartbeat(engine);
    },rand(3300,5700)/(engine.energy*.95));
  }

  function scheduleBackgroundPulse(engine){
    if(!engine.alive)return;
    clearTimeout(engine.backgroundPulseTimer);
    engine.backgroundPulseTimer=setTimeout(()=>{
      if(!engine.alive)return;
      triggerLifeWave(engine,false);
      if(Math.random()<.68)spawnParticle(engine,false);
      scheduleBackgroundPulse(engine);
    },rand(1600,3100));
  }

  function createEngine(host,canvas){
    const ctx=canvas.getContext("2d",{alpha:true,desynchronized:true});
    if(!ctx)return null;

    const engine={
      host,canvas,ctx,
      cssW:0,cssH:0,dpr:1,
      state:STATES[host.dataset.state]?host.dataset.state:"idle",
      energy:1,
      time:0,dt:.016,lastTs:0,frame:0,alive:true,
      cx:0,cy:0,
      lookX:0,lookY:0,targetLookX:0,targetLookY:0,
      reaction:0,
      heartbeatPulse:0,
      growthPhase:rand(0,Math.PI*2),
      radiusRef:100,
      mobile:false,
      nodes:[],
      lifeWaves:[],
      particles:[],
      pulseTimer:0,
      heartbeatTimer:0,
      backgroundPulseTimer:0,
      reactionTimer:0,
      resizeObserver:null,
      pointerHold:false
    };

    // Stable, irregular synaptic anchors keep the core coherent while their
    // activation changes continuously.
    for(let i=0;i<24;i++){
      engine.nodes.push({
        angle:(Math.PI*2*i)/24+rand(-.16,.16),
        phase:rand(0,Math.PI*2),
        depth:rand(.15,.90),
        speed:rand(.7,1.2)
      });
    }

    function resize(){
      const rect=host.getBoundingClientRect();
      const w=Math.max(1,rect.width||host.clientWidth||1);
      const h=Math.max(1,rect.height||host.clientHeight||w);
      engine.cssW=finite(w,1);
      engine.cssH=finite(h,1);
      engine.dpr=finite(dpr(),1);
      engine.mobile=w<160||h<160;
      canvas.width=Math.max(1,Math.round(w*engine.dpr));
      canvas.height=Math.max(1,Math.round(h*engine.dpr));
      canvas.style.width=w+"px";
      canvas.style.height=h+"px";
      engine.radiusRef=Math.min(w,h)*.37;
    }

    engine.resize=resize;

    engine.setState=function(next){
      engine.state=STATES[next]?next:"idle";
      engine.energy=STATES[engine.state].energy;
      engine.reaction=Math.max(engine.reaction,.55);
      triggerLifeWave(engine,true);
      for(let i=0;i<2;i++)spawnParticle(engine,true);
      host.dataset.state=engine.state;
      host.setAttribute(
        "aria-label",
        "Akira · "+STATES[engine.state].label+" · núcleo sináptico galáctico vivo"
      );
    };

    engine.react=function(expr,duration){
      // Expressions are translated into organic reaction intensity rather
      // than a face change.
      engine.reaction=Math.max(engine.reaction,.92);
      triggerLifeWave(engine,true);
      triggerLifeWave(engine,true);
      for(let i=0;i<2;i++)spawnParticle(engine,true);
      clearTimeout(engine.reactionTimer);
      if(duration){
        engine.reactionTimer=setTimeout(()=>{
          if(engine.alive)engine.reaction=.28;
        },duration);
      }
    };

    function onPointerMove(ev){
      const rect=canvas.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      const px=(ev.clientX-rect.left)/rect.width-.5;
      const py=(ev.clientY-rect.top)/rect.height-.5;
      engine.targetLookX=clamp(finite(px,0),-.5,.5);
      engine.targetLookY=clamp(finite(py,0),-.5,.5);
      if(engine.pointerHold)engine.reaction=Math.max(engine.reaction,.34);
    }

    function onPointerLeave(){
      engine.targetLookX=0;
      engine.targetLookY=0;
      engine.pointerHold=false;
    }

    function onPointerDown(){
      engine.pointerHold=true;
      engine.reaction=1;
      engine.heartbeatPulse=1;
      triggerLifeWave(engine,true);
      triggerLifeWave(engine,true);
      for(let i=0;i<3;i++)spawnParticle(engine,true);
    }

    function onPointerUp(){
      engine.pointerHold=false;
    }

    canvas.addEventListener("pointermove",onPointerMove,{passive:true});
    canvas.addEventListener("pointerleave",onPointerLeave,{passive:true});
    canvas.addEventListener("pointerdown",onPointerDown,{passive:true});
    canvas.addEventListener("pointerup",onPointerUp,{passive:true});
    canvas.addEventListener("pointercancel",onPointerUp,{passive:true});
    canvas.style.touchAction="manipulation";

    if("ResizeObserver" in window){
      engine.resizeObserver=new ResizeObserver(resize);
      engine.resizeObserver.observe(host);
    }else{
      window.addEventListener("resize",resize,{passive:true});
    }

    resize();
    resetLifeWaves(engine);
    scheduleHeartbeat(engine);
    scheduleBackgroundPulse(engine);

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

      engine.lookX+=(engine.targetLookX-engine.lookX)*Math.min(1,engine.dt*4.2);
      engine.lookY+=(engine.targetLookY-engine.lookY)*Math.min(1,engine.dt*4.2);
      engine.reaction=Math.max(0,engine.reaction-engine.dt*.66);
      engine.heartbeatPulse=Math.max(0,engine.heartbeatPulse-engine.dt*1.25);

      for(let i=engine.lifeWaves.length-1;i>=0;i--){
        engine.lifeWaves[i].age+=engine.dt;
        if(engine.lifeWaves[i].age>=engine.life)engine.lifeWaves.splice(i,1);
      }

      updateParticles(engine);
      draw(engine);
      engine.frame=requestAnimationFrame(frame);
    }

    engine.frame=requestAnimationFrame(frame);

    engine.destroy=function(){
      engine.alive=false;
      cancelAnimationFrame(engine.frame);
      clearTimeout(engine.heartbeatTimer);
      clearTimeout(engine.backgroundPulseTimer);
      clearTimeout(engine.reactionTimer);
      if(engine.resizeObserver){
        try{engine.resizeObserver.disconnect();}catch(_){}
        engine.resizeObserver=null;
      }
      window.removeEventListener("resize",resize);
      canvas.removeEventListener("pointermove",onPointerMove);
      canvas.removeEventListener("pointerleave",onPointerLeave);
      canvas.removeEventListener("pointerdown",onPointerDown);
      canvas.removeEventListener("pointerup",onPointerUp);
      canvas.removeEventListener("pointercancel",onPointerUp);
    };

    return engine;
  }

  function draw(engine){
    const ctx=engine.ctx;
    const w=engine.cssW;
    const h=engine.cssH;
    if(!ctx||w<=0||h<=0)return;

    const d=engine.dpr;
    ctx.setTransform(d,0,0,d,0,0);
    ctx.clearRect(0,0,w,h);

    const base=Math.min(w,h);
    const r=Math.max(16,base*.375);
    engine.cx=w*.5+engine.lookX*base*.015;
    engine.cy=h*.49+engine.lookY*base*.010;
    engine.radiusRef=r;

    engine.cx=finite(engine.cx,w*.5);
    engine.cy=finite(engine.cy,h*.49);
    engine.lookX=finite(engine.lookX,0);
    engine.lookY=finite(engine.lookY,0);
    engine.reaction=finite(engine.reaction,0);
    engine.energy=finite(engine.energy,1);

    const energy=engine.energy*(1+engine.reaction*.10);

    ctx.save();
    ctx.globalCompositeOperation="screen";
    glow(
      ctx,engine.cx,engine.cy,r*1.48,
      "rgba(74,228,255,.16)",
      "rgba(112,75,255,.10)",
      "rgba(236,60,195,0)",
      .90
    );
    ctx.restore();

    drawMembrane(ctx,engine,r,energy);
    drawParticles(ctx,engine,r,energy);

    // A few escaping particles fade naturally from the edge of the core.
    ctx.save();
    ctx.globalCompositeOperation="screen";
    for(let i=0;i<4;i++){
      const a=i*1.73+engine.time*.09;
      const dist=r*(.94+.16*Math.sin(engine.time*.42+i));
      const x=engine.cx+Math.cos(a)*dist;
      const y=engine.cy+Math.sin(a)*dist*.90;
      const s=r*(.009+.004*(i%2));
      glow(
        ctx,x,y,s*3.5,
        "rgba(225,255,255,.78)",
        "rgba(86,208,255,.30)",
        "rgba(104,67,255,0)",
        .12+.08*Math.sin(engine.time*1.1+i)
      );
    }
    ctx.restore();
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
      setState(next){
        engine.setState(next);
      },
      getState:()=>engine.state,
      react:(expr,duration)=>engine.react(expr,duration),
      resize:()=>engine.resize(),
      destroy(){
        engine.destroy();
        host.__akiraEntity=null;
        host.innerHTML="";
      }
    };

    host.__akiraEntity=controller;
    engine.energy=STATES[engine.state].energy;
    host.setAttribute(
      "aria-label",
      "Akira · "+STATES[engine.state].label+" · núcleo sináptico galáctico vivo"
    );
    return controller;
  }

  function mountAll(root){
    const base=root||document;
    const list=base.querySelectorAll
      ?base.querySelectorAll("[data-akira-entity],.akira-entity-slot")
      :[];
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
        let user=false;
        let akira=false;
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
