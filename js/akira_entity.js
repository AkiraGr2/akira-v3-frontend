(function(){
"use strict";

/*
 * AKIRA LIVING PLASMA ENTITY V2
 * Runtime animation is procedural and local:
 * - no video asset
 * - no external AI call
 * - irregular "wander" targets instead of a fixed motion loop
 * - autonomous blinking / expression changes
 * - pointer-aware micro response
 * - respects prefers-reduced-motion and document visibility
 */

const STATES={
  idle:{label:"En calma",speed:1.00,drift:1.00,expressionCadence:1.00},
  thinking:{label:"Pensando",speed:1.12,drift:1.10,expressionCadence:.86},
  searching:{label:"Explorando",speed:1.30,drift:1.35,expressionCadence:.76},
  learning:{label:"Aprendiendo",speed:1.06,drift:1.08,expressionCadence:.92},
  remembering:{label:"Recordando",speed:.92,drift:.78,expressionCadence:1.08},
  executing:{label:"Ejecutando",speed:1.22,drift:1.48,expressionCadence:.74},
  success:{label:"Listo",speed:.98,drift:1.05,expressionCadence:.90},
  uncertain:{label:"Con cautela",speed:.90,drift:.72,expressionCadence:1.14},
  error:{label:"Atención",speed:.86,drift:.58,expressionCadence:1.20},
  playful:{label:"Juguetona",speed:1.16,drift:1.34,expressionCadence:.72}
};

const EXPRESSIONS=[
  {name:"neutral",weight:5},
  {name:"soft-smile",weight:4},
  {name:"curious",weight:3},
  {name:"wink",weight:1},
  {name:"amused",weight:1}
];

let uid=0;

function norm(s){return STATES[s]?s:"idle";}

function expressionForState(state){
  if(state==="error"||state==="thinking"||state==="searching")return "curious";
  if(state==="success")return "soft-smile";
  if(state==="playful")return "amused";
  if(state==="uncertain")return "neutral";
  return null;
}

function pickExpression(){
  const total=EXPRESSIONS.reduce((sum,x)=>sum+x.weight,0);
  let n=Math.random()*total;
  for(const item of EXPRESSIONS){
    n-=item.weight;
    if(n<=0)return item.name;
  }
  return "neutral";
}

function svgMarkup(){
  const n="ak"+(++uid);
  return '<svg class="akira-entity-reference" viewBox="0 0 420 420" role="presentation" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'+
  '<defs>'+
  '<radialGradient id="'+n+'core" cx="42%" cy="36%" r="78%"><stop stop-color="#8fe8ff" stop-opacity=".34"/><stop offset=".22" stop-color="#6e7cff" stop-opacity=".28"/><stop offset=".55" stop-color="#241a55" stop-opacity=".78"/><stop offset="1" stop-color="#020514" stop-opacity="1"/></radialGradient>'+
  '<radialGradient id="'+n+'energy" cx="50%" cy="45%" r="65%"><stop stop-color="#d7fbff" stop-opacity=".95"/><stop offset=".28" stop-color="#74b9ff" stop-opacity=".44"/><stop offset=".72" stop-color="#a36bff" stop-opacity=".10"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>'+
  '<linearGradient id="'+n+'plasma" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ff7acb"/><stop offset=".28" stop-color="#a36cff"/><stop offset=".57" stop-color="#54b6ff"/><stop offset=".78" stop-color="#60f3dd"/><stop offset="1" stop-color="#ffc56b"/></linearGradient>'+
  '<linearGradient id="'+n+'warm" x1="1" y1="1" x2="0" y2="0"><stop stop-color="#ff6ca7"/><stop offset=".46" stop-color="#ffb15d"/><stop offset=".75" stop-color="#7e7aff"/><stop offset="1" stop-color="#5df3eb"/></linearGradient>'+
  '<filter id="'+n+'glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
  '<filter id="'+n+'soft" x="-90%" y="-90%" width="280%" height="280%"><feGaussianBlur stdDeviation="12"/></filter>'+
  '<filter id="'+n+'plasma" x="-100%" y="-100%" width="300%" height="300%">'+
    '<feTurbulence type="fractalNoise" baseFrequency=".017 .026" numOctaves="3" seed="17" result="noise"><animate attributeName="baseFrequency" dur="12s" values=".017 .026;.022 .014;.014 .024;.017 .026" repeatCount="indefinite"/></feTurbulence>'+
    '<feDisplacementMap in="SourceGraphic" in2="noise" scale="19" xChannelSelector="R" yChannelSelector="B"/>'+
  '</filter>'+
  '</defs>'+
  '<g class="akira-plasma-live-motion">'+
    '<g class="akira-plasma-aura" filter="url(#'+n+'soft)" opacity=".55"><ellipse cx="208" cy="206" rx="128" ry="124" fill="url(#'+n+'energy)"/></g>'+
    '<g class="akira-plasma-field" fill="none" stroke-linecap="round" filter="url(#'+n+'glow)">'+
      '<path class="akira-plasma-ribbon r1" d="M80 214 C70 148 125 84 187 92 C231 98 248 127 230 153 C207 188 159 154 173 122 C190 84 260 71 313 116 C347 145 353 194 329 227" stroke="url(#'+n+'plasma)" stroke-width="8" opacity=".7"/>'+
      '<path class="akira-plasma-ribbon r2" d="M92 292 C62 254 72 217 111 218 C147 220 160 259 130 279 C100 299 73 268 92 238 C117 198 190 193 243 228 C294 261 316 321 280 338" stroke="url(#'+n+'warm)" stroke-width="6" opacity=".56"/>'+
      '<path class="akira-plasma-ribbon r3" d="M151 75 C194 42 264 51 285 91 C303 125 279 153 253 137 C229 122 240 91 272 84 C306 76 346 98 363 131" stroke="url(#'+n+'plasma)" stroke-width="5" opacity=".5"/>'+
    '</g>'+
    '<g class="akira-plasma-particles" fill="#b8f8ff" filter="url(#'+n+'glow)">'+
      '<circle cx="95" cy="171" r="3.4"/><circle cx="122" cy="103" r="2.6"/><circle cx="315" cy="125" r="3.2"/><circle cx="342" cy="235" r="2.8"/><circle cx="94" cy="302" r="2.5"/><circle cx="300" cy="312" r="3.2"/><circle cx="145" cy="347" r="2.5"/><circle cx="238" cy="65" r="2.2"/>'+
    '</g>'+
    '<g class="akira-plasma-core" filter="url(#'+n+'plasma)">'+
      '<path class="akira-plasma-blob" d="M209 98 C255 94 301 124 310 169 C319 214 300 258 270 286 C239 315 193 318 155 296 C116 274 95 232 104 189 C113 145 150 103 209 98 Z" fill="url(#'+n+'core)" stroke="url(#'+n+'plasma)" stroke-opacity=".64" stroke-width="3"/>'+
      '<path class="akira-plasma-current c1" d="M131 199 C146 150 191 129 235 139 C263 145 282 166 286 194" fill="none" stroke="#8dd8ff" stroke-opacity=".24" stroke-width="9"/>'+
      '<path class="akira-plasma-current c2" d="M136 257 C171 281 224 284 268 252" fill="none" stroke="#ff9fd7" stroke-opacity=".18" stroke-width="11"/>'+
      '<ellipse cx="176" cy="149" rx="70" ry="45" fill="#9dc7ff" opacity=".08"/>'+
    '</g>'+
    '<g class="akira-face" fill="none" stroke="#e9fbff" stroke-linecap="round" stroke-linejoin="round">'+
      '<path class="akira-eye eye-left" d="M148 198 Q167 178 187 198" stroke-width="10"/>'+
      '<path class="akira-eye eye-right" d="M233 198 Q253 178 272 198" stroke-width="10"/>'+
      '<path class="akira-brow brow-left" d="M148 176 Q168 164 188 171" stroke="#a8d8ff" stroke-width="4" opacity=".32"/>'+
      '<path class="akira-brow brow-right" d="M232 171 Q252 164 272 176" stroke="#a8d8ff" stroke-width="4" opacity=".32"/>'+
      '<path class="akira-mouth" d="M178 239 Q210 264 242 239" stroke-width="8"/>'+
      '<path class="akira-smile-accent" d="M195 221 Q210 230 225 221" stroke="#6de8ff" stroke-width="4" opacity=".78"/>'+
    '</g>'+
    '<g class="akira-expression-detail" fill="none" stroke-linecap="round">'+
      '<path class="akira-cheek left" d="M151 230 Q160 235 166 230" stroke="#ff9ed5" stroke-width="3" opacity=".18"/>'+
      '<path class="akira-cheek right" d="M254 230 Q260 235 269 230" stroke="#ff9ed5" stroke-width="3" opacity=".18"/>'+
    '</g>'+
  '</g>'+
  '<ellipse class="akira-ground" cx="210" cy="349" rx="82" ry="10" fill="none" stroke="#6cd8ff" stroke-opacity=".24" stroke-width="2"/>'+
  '<ellipse class="akira-ground" cx="210" cy="349" rx="58" ry="6" fill="none" stroke="#c07dff" stroke-opacity=".34" stroke-width="2"/>'+
  '</svg>';
}

function apply(host,state){
  host.dataset.state=state;
  host.setAttribute("aria-label","Akira · "+STATES[state].label);
  const svg=host.querySelector(".akira-entity-reference");
  if(!svg)return;
  svg.dataset.state=state;
  svg.style.setProperty("--akira-speed",STATES[state].speed);
  svg.classList.remove(
    "state-thinking","state-searching","state-learning","state-remembering",
    "state-executing","state-success","state-uncertain","state-error","state-playful"
  );
  if(state!=="idle")svg.classList.add("state-"+state);
}

function setExpression(host,name){
  const svg=host.querySelector(".akira-entity-reference");
  if(!svg)return;
  svg.classList.remove("expr-neutral","expr-soft-smile","expr-blink","expr-curious","expr-wink","expr-amused");
  svg.classList.add("expr-"+name);
  svg.dataset.expression=name;
}

function mountOne(host){
  if(!host||host.__akiraEntity)return host&&host.__akiraEntity;

  host.classList.add("akira-entity-slot","is-akira-entity");
  host.setAttribute("role","img");

  const size=Number(host.dataset.size||0);
  if(size){
    host.style.width=host.style.width||size+"px";
    host.style.height=host.style.height||size+"px";
  }

  host.innerHTML=svgMarkup();

  let state=norm(host.dataset.state||"idle");
  let alive=true;
  let stateTimer=0;
  let expressionTimer=0;
  let blinkTimer=0;
  let raf=0;
  let lastTime=0;
  let hidden=document.visibilityState==="hidden";
  let reducedMotion=false;

  const motionGroup=host.querySelector(".akira-plasma-live-motion");
  const face=host.querySelector(".akira-face");
  const svg=host.querySelector(".akira-entity-reference");

  try{
    reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }catch(_){}

  const motion={
    current:{x:0,y:0,rotation:0,scale:1},
    target:{x:0,y:0,rotation:0,scale:1},
    pointer:{x:0,y:0},
    nextTargetAt:0
  };

  function rand(min,max){return min+Math.random()*(max-min);}
  function lerp(a,b,t){return a+(b-a)*t;}

  function chooseMotionTarget(now){
    const profile=STATES[state];
    const drift=profile.drift;
    motion.target.x=rand(-5.5,5.5)*drift;
    motion.target.y=rand(-4.2,4.2)*drift;
    motion.target.rotation=rand(-2.25,2.25)*drift;
    motion.target.scale=1+rand(-.018,.024)*drift;
    motion.nextTargetAt=now+rand(900,3200)/profile.speed;
  }

  function applyMotion(now,dt){
    if(!motionGroup||reducedMotion)return;

    if(now>=motion.nextTargetAt)chooseMotionTarget(now);

    const profile=STATES[state];
    const follow=Math.min(1,dt*(1.8+profile.speed));
    motion.current.x=lerp(motion.current.x,motion.target.x,follow);
    motion.current.y=lerp(motion.current.y,motion.target.y,follow);
    motion.current.rotation=lerp(motion.current.rotation,motion.target.rotation,follow);
    motion.current.scale=lerp(motion.current.scale,motion.target.scale,follow);

    const breathe=Math.sin(now/1000*1.31)+0.42*Math.sin(now/1000*2.07+1.8);
    const sway=Math.sin(now/1000*.83+0.7)*1.25;
    const px=motion.pointer.x*2.2;
    const py=motion.pointer.y*1.8;
    const totalScale=motion.current.scale+(breathe*.0042);

    motionGroup.setAttribute(
      "transform",
      "translate("+(motion.current.x+px).toFixed(2)+" "+(motion.current.y+py).toFixed(2)+") "+
      "rotate("+(motion.current.rotation+sway).toFixed(2)+" 210 210) "+
      "scale("+totalScale.toFixed(4)+" "+totalScale.toFixed(4)+")"
    );

    if(face){
      const faceX=motion.pointer.x*1.8+Math.sin(now/1000*.71)*.65;
      const faceY=motion.pointer.y*.9+Math.cos(now/1000*.59)*.45;
      face.setAttribute("transform","translate("+faceX.toFixed(2)+" "+faceY.toFixed(2)+")");
    }
  }

  function frame(now){
    if(!alive||hidden){
      raf=0;
      return;
    }
    if(!lastTime)lastTime=now;
    const dt=Math.min(.05,Math.max(.001,(now-lastTime)/1000));
    lastTime=now;
    applyMotion(now,dt);
    raf=window.requestAnimationFrame(frame);
  }

  function startMotion(){
    if(reducedMotion||hidden||!alive)return;
    if(!raf){
      lastTime=0;
      raf=window.requestAnimationFrame(frame);
    }
  }

  function stopMotion(){
    if(raf){
      window.cancelAnimationFrame(raf);
      raf=0;
    }
  }

  function scheduleBlink(){
    clearTimeout(blinkTimer);
    if(!alive||reducedMotion)return;
    const profile=STATES[state];
    const wait=rand(2800,7600)*profile.expressionCadence;
    blinkTimer=setTimeout(function(){
      if(!alive||hidden){scheduleBlink();return;}
      setExpression(host,"blink");
      const duration=rand(90,190);
      setTimeout(function(){
        if(!alive)return;
        setExpression(host,"neutral");
        if(Math.random()<.18){
          setTimeout(function(){
            if(!alive||hidden)return;
            setExpression(host,"blink");
            setTimeout(function(){if(alive)setExpression(host,"neutral");},rand(80,170));
          },rand(80,240));
        }
        scheduleBlink();
      },duration);
    },wait);
  }

  function scheduleExpression(){
    clearTimeout(expressionTimer);
    if(!alive)return;

    const preferred=expressionForState(state);
    const wait=rand(5200,11800)*STATES[state].expressionCadence;

    expressionTimer=setTimeout(function(){
      if(!alive||hidden){scheduleExpression();return;}

      const next=preferred&&Math.random()<.68?preferred:pickExpression();
      setExpression(host,next);

      const hold={
        "soft-smile":rand(1500,3300),
        curious:rand(1800,3600),
        wink:rand(700,1500),
        amused:rand(1600,3200),
        neutral:rand(900,1800)
      }[next]||1400;

      setTimeout(function(){if(alive)setExpression(host,"neutral");},hold);
      scheduleExpression();
    },wait);
  }

  function setState(next,opts){
    state=norm(next);
    apply(host,state);
    chooseMotionTarget(performance.now());

    const preferred=expressionForState(state);
    if(preferred)setExpression(host,preferred);
    else if(Math.random()<.55)setExpression(host,pickExpression());

    scheduleExpression();
    scheduleBlink();
    startMotion();

    if(state==="success"&&!(opts&&opts.persist)){
      clearTimeout(stateTimer);
      stateTimer=setTimeout(function(){if(alive)setState("idle");},1500);
    }
  }

  function pointerMove(ev){
    if(!host.isConnected)return;
    const rect=host.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    const x=((ev.clientX-rect.left)/rect.width-.5)*2;
    const y=((ev.clientY-rect.top)/rect.height-.5)*2;
    motion.pointer.x=Math.max(-1,Math.min(1,x));
    motion.pointer.y=Math.max(-1,Math.min(1,y));
  }

  function pointerLeave(){
    motion.pointer.x=lerp(motion.pointer.x,0,.35);
    motion.pointer.y=lerp(motion.pointer.y,0,.35);
  }

  function onVisibility(){
    hidden=document.visibilityState==="hidden";
    if(hidden){
      stopMotion();
      return;
    }
    chooseMotionTarget(performance.now());
    startMotion();
    scheduleBlink();
  }

  motion.nextTargetAt=performance.now()+rand(600,1900);
  apply(host,state);
  setExpression(host,expressionForState(state)||"neutral");

  host.addEventListener("pointermove",pointerMove,{passive:true});
  host.addEventListener("pointerleave",pointerLeave,{passive:true});
  document.addEventListener("visibilitychange",onVisibility,{passive:true});

  scheduleExpression();
  scheduleBlink();
  startMotion();

  const c={
    setState,
    getState:()=>state,
    resize:()=>{},
    destroy:()=>{
      alive=false;
      stopMotion();
      clearTimeout(stateTimer);
      clearTimeout(expressionTimer);
      clearTimeout(blinkTimer);
      host.removeEventListener("pointermove",pointerMove);
      host.removeEventListener("pointerleave",pointerLeave);
      document.removeEventListener("visibilitychange",onVisibility);
      host.__akiraEntity=null;
      host.innerHTML="";
    }
  };

  host.__akiraEntity=c;
  return c;
}

function mountAll(root){
  const b=root||document;
  const list=b.querySelectorAll?b.querySelectorAll("[data-akira-entity],.akira-entity-slot"):[];
  list.forEach(mountOne);
  return list.length;
}

function setState(next,target){
  const list=typeof target==="string"
    ? document.querySelectorAll(target)
    : document.querySelectorAll("[data-akira-entity],.akira-entity-slot");
  list.forEach(function(el){
    const c=mountOne(el);
    if(c)c.setState(next);
  });
}

window.AkiraEntity={
  states:Object.keys(STATES),
  mount:mountOne,
  mountAll,
  setState,
  stateInfo:s=>STATES[norm(s)]
};
window.akiraEntitySetState=setState;
window.akiraEntityMount=mountOne;

document.addEventListener("DOMContentLoaded",function(){
  mountAll(document);
  window.dispatchEvent(new CustomEvent("akira:entity-ready"));
});
})();
