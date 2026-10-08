/* AKIRA ENTITY V4 — living plasma core with autonomous expressions and burst-like tendrils */
(function(){
"use strict";

const STATES={
  idle:{label:"En calma",speed:1},
  thinking:{label:"Pensando",speed:1.35},
  searching:{label:"Explorando",speed:1.55},
  learning:{label:"Aprendiendo",speed:1.08},
  remembering:{label:"Recordando",speed:.82},
  executing:{label:"Ejecutando",speed:1.45},
  success:{label:"Listo",speed:.9},
  uncertain:{label:"Con cautela",speed:.68},
  error:{label:"Atención",speed:.72},
  playful:{label:"Juguetona",speed:1.2}
};

const EXPRESSIONS=["happy","curious","surprised","wink","sleepy","playful","smileSoft","blink"];
let uid=0;

function norm(s){return STATES[s]?s:"idle";}
function svgMarkup(){
  const n="ak"+(++uid);
  return '<svg class="akira-entity-reference" viewBox="0 0 420 420" role="presentation" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'+
  '<defs>'+
    '<radialGradient id="'+n+'core" cx="36%" cy="24%" r="80%"><stop stop-color="#1b2757"/><stop offset=".34" stop-color="#0a1230"/><stop offset=".72" stop-color="#03081d"/><stop offset="1" stop-color="#01030d"/></radialGradient>'+
    '<radialGradient id="'+n+'halo"><stop stop-color="#9a6cff" stop-opacity=".48"/><stop offset=".42" stop-color="#41dcff" stop-opacity=".16"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>'+
    '<linearGradient id="'+n+'violet" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ff66da"/><stop offset=".34" stop-color="#ad69ff"/><stop offset=".66" stop-color="#628aff"/><stop offset="1" stop-color="#3fe9ff"/></linearGradient>'+
    '<linearGradient id="'+n+'warm" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#ff71ad"/><stop offset=".34" stop-color="#ff9e56"/><stop offset=".64" stop-color="#ffd35d"/><stop offset="1" stop-color="#9b6fff"/></linearGradient>'+
    '<filter id="'+n+'blur" x="-90%" y="-90%" width="280%" height="280%"><feGaussianBlur stdDeviation="8"/></filter>'+
    '<filter id="'+n+'glow" x="-90%" y="-90%" width="280%" height="280%"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
    '<filter id="'+n+'strong" x="-120%" y="-120%" width="340%" height="340%"><feGaussianBlur stdDeviation="12" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
    '<filter id="'+n+'spark" x="-160%" y="-160%" width="420%" height="420%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
  '</defs>'+
  '<ellipse cx="210" cy="365" rx="134" ry="24" fill="url(#'+n+'halo)" filter="url(#'+n+'blur)"/>'+

  '<g class="akira-plasma-waves" fill="none" stroke-linecap="round">'+
    '<circle class="plasma-wave wave-1" cx="210" cy="207" r="118" stroke="url(#'+n+'violet)" stroke-width="3" opacity=".15"/>'+
    '<circle class="plasma-wave wave-2" cx="210" cy="207" r="128" stroke="url(#'+n+'warm)" stroke-width="2.5" opacity=".12"/>'+
    '<circle class="plasma-wave wave-3" cx="210" cy="207" r="139" stroke="url(#'+n+'violet)" stroke-width="2" opacity=".08"/>'+
    '<ellipse class="plasma-wave wave-4" cx="210" cy="207" rx="156" ry="94" stroke="url(#'+n+'warm)" stroke-width="2" opacity=".10"/>'+
  '</g>'+
  '<g class="akira-plasma-filaments" fill="none" stroke-linecap="round" filter="url(#'+n+'glow)">'+
    '<path class="plasma-filament filament-1" d="M210 92 C188 72 172 51 184 25 C195 43 213 42 221 24 C229 49 244 63 266 78" stroke="url(#'+n+'violet)" stroke-width="3.5" opacity=".58"/>'+
    '<path class="plasma-filament filament-2" d="M315 205 C341 190 367 181 397 194 C378 207 379 225 399 236 C367 241 344 232 320 219" stroke="url(#'+n+'warm)" stroke-width="3.2" opacity=".52"/>'+
    '<path class="plasma-filament filament-3" d="M104 207 C77 191 52 183 23 196 C43 208 40 225 21 237 C52 242 76 232 100 220" stroke="url(#'+n+'violet)" stroke-width="3.2" opacity=".52"/>'+
    '<path class="plasma-filament filament-4" d="M211 318 C190 340 178 364 189 393 C201 374 218 378 229 397 C234 366 244 344 263 327" stroke="url(#'+n+'warm)" stroke-width="3.5" opacity=".50"/>'+
  '</g>'+
  '<g class="akira-plasma-bursts" fill="none" stroke-linecap="round" filter="url(#'+n+'glow)">'+
    '<path class="plasma-burst burst-a" d="M210 103 C207 81 205 61 210 34" stroke="url(#'+n+'violet)" stroke-width="4"/>'+
    '<path class="plasma-burst burst-b" d="M290 131 C310 111 327 95 348 76" stroke="url(#'+n+'violet)" stroke-width="4"/>'+
    '<path class="plasma-burst burst-c" d="M313 208 C342 205 366 198 392 187" stroke="url(#'+n+'warm)" stroke-width="4"/>'+
    '<path class="plasma-burst burst-d" d="M298 284 C323 297 345 311 364 330" stroke="url(#'+n+'violet)" stroke-width="4"/>'+
    '<path class="plasma-burst burst-e" d="M210 311 C211 334 212 354 210 385" stroke="url(#'+n+'warm)" stroke-width="4"/>'+
    '<path class="plasma-burst burst-f" d="M130 284 C109 299 89 316 69 339" stroke="url(#'+n+'violet)" stroke-width="4"/>'+
    '<path class="plasma-burst burst-g" d="M106 208 C80 206 56 199 31 190" stroke="url(#'+n+'warm)" stroke-width="4"/>'+
    '<path class="plasma-burst burst-h" d="M130 132 C109 111 92 95 71 75" stroke="url(#'+n+'violet)" stroke-width="4"/>'+
  '</g>'+
  '<g class="akira-plasma-burst-sparks" filter="url(#'+n+'spark)" fill="#dffcff">'+
    '<circle class="spark-1" cx="44" cy="148" r="3"/><circle class="spark-2" cx="79" cy="97" r="2.5"/><circle class="spark-3" cx="337" cy="103" r="3"/><circle class="spark-4" cx="369" cy="165" r="2.5"/>'+
    '<circle class="spark-5" cx="352" cy="287" r="3"/><circle class="spark-6" cx="83" cy="313" r="3"/><circle class="spark-7" cx="116" cy="348" r="2.5"/><circle class="spark-8" cx="290" cy="351" r="2.5"/>'+
  '</g>'+
  '<g class="akira-reference-ribbons" fill="none" stroke-linecap="round" filter="url(#'+n+'glow)">'+
    '<path d="M61 270 C14 231 31 178 79 188 C116 196 118 229 88 241 C61 252 49 215 68 181 C90 143 129 118 177 109" stroke="url(#'+n+'violet)" stroke-width="9" opacity=".88"/>'+
    '<path d="M52 304 C17 328 22 365 61 361 C95 357 98 326 76 312 C53 298 37 330 52 355 C77 391 126 392 166 369" stroke="url(#'+n+'warm)" stroke-width="7" opacity=".78"/>'+
    '<path d="M158 75 C195 23 255 30 249 72 C244 104 206 101 206 73 C206 48 232 30 270 38" stroke="url(#'+n+'violet)" stroke-width="8" opacity=".84"/>'+
    '<path d="M255 78 C315 34 368 54 347 95 C331 126 296 111 300 82 C304 53 337 40 374 59" stroke="url(#'+n+'warm)" stroke-width="7" opacity=".76"/>'+
    '<path d="M51 159 C97 105 152 79 199 111 C231 133 221 170 190 173 C157 176 143 142 159 119 C182 87 233 87 274 108 C319 131 349 171 359 216" stroke="url(#'+n+'violet)" stroke-width="8" opacity=".8"/>'+
    '<path d="M48 250 C91 221 122 180 164 180 C210 180 233 219 209 247 C185 273 151 254 154 224 C158 193 191 176 236 169 C284 161 323 184 350 220" stroke="url(#'+n+'warm)" stroke-width="6" opacity=".68"/>'+
    '<path d="M84 334 C130 294 165 285 202 306 C239 326 269 358 307 353 C338 348 359 326 368 296" stroke="url(#'+n+'violet)" stroke-width="7" opacity=".72"/>'+
    '<path d="M111 117 C139 77 170 57 192 68 C208 76 197 99 180 101" stroke="url(#'+n+'violet)" stroke-width="4.5" opacity=".54"/>'+
    '<path d="M228 347 C260 375 304 382 331 361 C344 350 339 336 323 335" stroke="url(#'+n+'warm)" stroke-width="4.5" opacity=".5"/>'+
  '</g>'+
  '<g class="akira-reference-particles" filter="url(#'+n+'strong)" fill="#98eeff">'+
    '<circle cx="72" cy="153" r="4"/><circle cx="104" cy="95" r="3"/><circle cx="302" cy="119" r="4"/><circle cx="365" cy="194" r="3"/><circle cx="65" cy="283" r="3"/><circle cx="324" cy="294" r="4"/><circle cx="119" cy="337" r="3"/><circle cx="282" cy="342" r="3"/>'+
  '</g>'+
  '<g class="akira-reference-core">'+
    '<circle cx="210" cy="207" r="114" fill="#6f56ff" opacity=".15" filter="url(#'+n+'strong)"/>'+
    '<circle cx="210" cy="207" r="103" fill="url(#'+n+'core)" stroke="#8c7aff" stroke-opacity=".44" stroke-width="2.5"/>'+
    '<ellipse cx="181" cy="165" rx="66" ry="43" fill="#8bb7ff" opacity=".055"/>'+
    '<path d="M127 154 C146 125 175 111 208 111 C243 111 275 126 293 156" fill="none" stroke="url(#'+n+'violet)" stroke-width="4" opacity=".62"/>'+
    '<path d="M128 257 C151 288 181 301 211 301 C247 301 278 285 294 255" fill="none" stroke="url(#'+n+'warm)" stroke-width="4" opacity=".5"/>'+
  '</g>'+
  '<g class="akira-reference-face face-happy" fill="none" stroke="#effcff" stroke-linecap="round">'+
    '<path class="eye" d="M149 197 Q168 175 188 196" stroke-width="10"/><path class="eye" d="M232 196 Q252 175 271 197" stroke-width="10"/>'+
    '<path d="M194 218 Q210 229 226 218" stroke="#73eaff" stroke-width="5"/><path d="M173 238 Q210 270 247 238" stroke-width="9"/>'+
  '</g>'+
  '<g class="akira-reference-face face-curious" fill="none" stroke="#effcff" stroke-linecap="round">'+
    '<path d="M149 193 Q170 179 190 196" stroke-width="9"/><path d="M233 195 Q252 183 271 198" stroke-width="8"/>'+
    '<path d="M204 219 Q214 226 223 218" stroke="#73eaff" stroke-width="5"/><path d="M185 246 Q207 258 231 243" stroke-width="7"/>'+
  '</g>'+
  '<g class="akira-reference-face face-surprised" fill="none" stroke="#effcff" stroke-linecap="round">'+
    '<path d="M149 193 Q169 175 190 194" stroke-width="10"/><path d="M232 194 Q251 175 271 193" stroke-width="10"/>'+
    '<circle cx="210" cy="245" r="13" stroke="#73eaff" stroke-width="5"/>'+
  '</g>'+
  '<g class="akira-reference-face face-wink" fill="none" stroke="#effcff" stroke-linecap="round">'+
    '<path d="M150 196 Q170 178 190 196" stroke-width="10"/><path d="M232 198 Q249 187 270 196" stroke-width="10"/>'+
    '<path d="M205 219 Q212 224 220 219" stroke="#73eaff" stroke-width="4"/><path d="M177 239 Q210 269 244 239" stroke-width="9"/>'+
  '</g>'+
  '<g class="akira-reference-face face-sleepy" fill="none" stroke="#effcff" stroke-linecap="round">'+
    '<path d="M150 198 Q169 207 189 198" stroke-width="8"/><path d="M232 198 Q251 207 271 198" stroke-width="8"/>'+
    '<path d="M191 240 Q210 247 229 240" stroke="#73eaff" stroke-width="4"/><path d="M183 247 Q210 260 237 247" stroke-width="7"/>'+
  '</g>'+
  '<g class="akira-reference-face face-playful" fill="none" stroke="#effcff" stroke-linecap="round">'+
    '<path d="M150 196 Q169 180 188 195" stroke-width="9"/><path d="M232 195 Q252 181 271 199" stroke-width="10"/>'+
    '<path d="M198 217 Q210 227 223 216" stroke="#73eaff" stroke-width="5"/><path d="M172 240 Q206 269 247 234" stroke-width="9"/><path d="M244 234 l10 5" stroke="#73eaff" stroke-width="4"/>'+
  '</g>'+
  '<g class="akira-reference-face face-smileSoft" fill="none" stroke="#effcff" stroke-linecap="round">'+
    '<path d="M151 197 Q168 180 188 196" stroke-width="9"/><path d="M232 196 Q251 180 270 197" stroke-width="9"/>'+
    '<path d="M193 218 Q210 229 227 218" stroke="#73eaff" stroke-width="5"/><path d="M179 242 Q210 260 241 242" stroke-width="8"/>'+
  '</g>'+
  '<g class="akira-reference-face face-blink" fill="none" stroke="#effcff" stroke-linecap="round">'+
    '<path d="M149 198 Q168 205 189 198" stroke-width="8"/><path d="M231 198 Q251 205 271 198" stroke-width="8"/><path d="M181 246 Q210 259 239 246" stroke-width="8"/>'+
  '</g>'+
  '<g class="akira-gaze-dot" fill="#76eaff"><circle cx="189" cy="195" r="3"/><circle cx="231" cy="195" r="3"/></g>'+
  '<ellipse cx="210" cy="355" rx="94" ry="13" fill="none" stroke="#9b68ff" stroke-opacity=".54" stroke-width="3"/>'+
  '<ellipse cx="210" cy="355" rx="68" ry="8" fill="none" stroke="#45dfff" stroke-opacity=".62" stroke-width="2"/>'+
  '</svg>';
}

function setExpression(host,expr){
  const svg=host.querySelector(".akira-entity-reference");
  if(!svg)return;
  svg.dataset.expression=expr;
  const faces=svg.querySelectorAll(".akira-reference-face");
  faces.forEach(face=>face.classList.toggle("is-visible",face.classList.contains("face-"+expr)));
}

function randomBetween(a,b){return a+Math.random()*(b-a);}

function startLife(host){
  if(host.__akiraLife)return;
  let alive=true, expressionTimer=0, blinkTimer=0, burstTimer=0, resumeTimer=0;
  const svg=host.querySelector(".akira-entity-reference");
  if(!svg)return;

  function nextExpression(force){
    if(!alive)return;
    const expr=force||EXPRESSIONS[Math.floor(Math.random()*EXPRESSIONS.length)];
    setExpression(host,expr);
    clearTimeout(expressionTimer);
    const duration=(expr==="blink"?180:randomBetween(620,1450));
    expressionTimer=setTimeout(()=>{
      if(!alive)return;
      setExpression(host,"happy");
      scheduleExpression();
    },duration);
  }
  function scheduleExpression(){
    clearTimeout(blinkTimer);
    blinkTimer=setTimeout(()=>nextExpression(),randomBetween(1300,4300));
  }
  function scheduleBurst(){
    if(!alive)return;
    clearTimeout(burstTimer);
    burstTimer=setTimeout(()=>{
      const bursts=svg.querySelectorAll(".plasma-burst");
      const filaments=svg.querySelectorAll(".plasma-filament");
      const waves=svg.querySelectorAll(".plasma-wave");
      const burstCount=Math.random()<.18?2:1;
      for(let i=0;i<burstCount;i++){
        const el=bursts[Math.floor(Math.random()*bursts.length)];
        if(!el)continue;
        el.classList.remove("burst-now");
        void el.getBoundingClientRect();
        el.classList.add("burst-now");
        setTimeout(()=>el.classList.remove("burst-now"),760);
      }
      const filament=filaments[Math.floor(Math.random()*filaments.length)];
      if(filament){
        filament.classList.remove("filament-now");
        void filament.getBoundingClientRect();
        filament.classList.add("filament-now");
        setTimeout(()=>filament.classList.remove("filament-now"),1100);
      }
      const wave=waves[Math.floor(Math.random()*waves.length)];
      if(wave){
        wave.classList.remove("wave-now");
        void wave.getBoundingClientRect();
        wave.classList.add("wave-now");
        setTimeout(()=>wave.classList.remove("wave-now"),1200);
      }
      const sparks=svg.querySelectorAll(".akira-plasma-burst-sparks circle");
      for(let i=0;i<sparks.length;i++)sparks[i].style.setProperty("--spark-delay",randomBetween(0,260)+"ms");
      scheduleBurst();
    },randomBetween(1700,4300));
  }

  const pointerMove=(event)=>{
    const r=host.getBoundingClientRect();
    if(!r.width||!r.height)return;
    const x=(event.clientX-r.left)/r.width-.5;
    const y=(event.clientY-r.top)/r.height-.5;
    const gx=Math.max(-5,Math.min(5,x*10));
    const gy=Math.max(-4,Math.min(4,y*7));
    svg.style.setProperty("--gaze-x",gx+"px");
    svg.style.setProperty("--gaze-y",gy+"px");
    setExpression(host,Math.abs(x)>0.22?"curious":"happy");
    clearTimeout(resumeTimer);
    resumeTimer=setTimeout(scheduleExpression,1100);
  };
  const pointerLeave=()=>{
    svg.style.setProperty("--gaze-x","0px");
    svg.style.setProperty("--gaze-y","0px");
    clearTimeout(resumeTimer);
    resumeTimer=setTimeout(scheduleExpression,500);
  };
  const activate=()=>{
    setExpression(host,"playful");
    clearTimeout(resumeTimer);
    resumeTimer=setTimeout(scheduleExpression,1150);
  };

  host.addEventListener("pointermove",pointerMove,{passive:true});
  host.addEventListener("pointerleave",pointerLeave,{passive:true});
  host.addEventListener("pointerdown",activate,{passive:true});

  setExpression(host,"happy");
  scheduleExpression();
  scheduleBurst();

  host.__akiraLife={
    destroy(){
      alive=false;
      clearTimeout(expressionTimer);clearTimeout(blinkTimer);clearTimeout(burstTimer);clearTimeout(resumeTimer);
      host.removeEventListener("pointermove",pointerMove);
      host.removeEventListener("pointerleave",pointerLeave);
      host.removeEventListener("pointerdown",activate);
    }
  };
}

function apply(host,state){
  host.dataset.state=state;
  host.setAttribute("aria-label","Akira · "+STATES[state].label);
  const svg=host.querySelector(".akira-entity-reference");
  if(!svg)return;
  svg.dataset.state=state;
  svg.style.setProperty("--akira-speed",STATES[state].speed);
  svg.classList.remove("state-thinking","state-searching","state-learning","state-remembering","state-executing","state-success","state-uncertain","state-error","state-playful");
  if(state!=="idle")svg.classList.add("state-"+state);
}

function mountOne(host){
  if(!host)return null;
  if(host.__akiraEntity)return host.__akiraEntity;
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

  const setState=(next,opts)=>{
    state=norm(next);apply(host,state);
    if(state==="success"&&!(opts&&opts.persist)){
      clearTimeout(stateTimer);
      stateTimer=setTimeout(()=>alive&&setState("idle"),1500);
    }
  };

  const c={
    setState,
    getState:()=>state,
    resize:()=>{},
    destroy:()=>{
      alive=false;
      clearTimeout(stateTimer);
      if(host.__akiraLife){host.__akiraLife.destroy();host.__akiraLife=null;}
      host.__akiraEntity=null;
      host.innerHTML="";
    }
  };

  host.__akiraEntity=c;
  apply(host,state);
  startLife(host);
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
    ?document.querySelectorAll(target)
    :document.querySelectorAll("[data-akira-entity],.akira-entity-slot");
  list.forEach(el=>{const c=mountOne(el);if(c)c.setState(next);});
}

window.AkiraEntity={
  states:Object.keys(STATES),
  expressions:EXPRESSIONS.slice(),
  mount:mountOne,
  mountAll,
  setState,
  stateInfo:s=>STATES[norm(s)]
};
window.akiraEntitySetState=setState;
window.akiraEntityMount=mountOne;

document.addEventListener("DOMContentLoaded",()=>{
  mountAll(document);
  window.dispatchEvent(new CustomEvent("akira:entity-ready"));
});
})();