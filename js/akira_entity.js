/* AKIRA PLASMA NUCLEUS V8
 * Rebuilt from zero from the approved plasma-nucleus concept.
 * The nucleus is the identity: fluid interior, heat, expelled plasma,
 * self-forming face, autonomous life and pointer/cognitive reactions.
 */
(function(){
  "use strict";

  const STATES={
    idle:{label:"En calma",energy:1},
    thinking:{label:"Pensando",energy:1.16},
    searching:{label:"Explorando",energy:1.32},
    learning:{label:"Aprendiendo",energy:1.08},
    remembering:{label:"Recordando",energy:.94},
    executing:{label:"Ejecutando",energy:1.28},
    success:{label:"Listo",energy:1.10},
    uncertain:{label:"Con cautela",energy:.82},
    error:{label:"Atención",energy:.90},
    playful:{label:"Juguetona",energy:1.24}
  };

  const EXPRESSIONS=["soft","curious","joy","surprised","wink","sleepy","playful","blink"];
  let uid=0;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const rand=(a,b)=>a+Math.random()*(b-a);
  const normalizeState=s=>STATES[s]?s:"idle";

  function markup(){
    const id="akv8"+(++uid);
    return '<svg class="akira-v8-nucleus" viewBox="0 0 520 520" role="presentation" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'+
      '<defs>'+
        '<radialGradient id="'+id+'core" cx="38%" cy="28%" r="76%">'+
          '<stop offset="0" stop-color="#eaffff" stop-opacity=".98"/><stop offset=".12" stop-color="#73f4ff" stop-opacity=".96"/><stop offset=".32" stop-color="#397fff" stop-opacity=".82"/><stop offset=".56" stop-color="#743fff" stop-opacity=".72"/><stop offset=".76" stop-color="#b52bff" stop-opacity=".52"/><stop offset="1" stop-color="#17143f" stop-opacity=".20"/>'+
        '</radialGradient>'+
        '<radialGradient id="'+id+'heat" cx="50%" cy="58%" r="50%">'+
          '<stop offset="0" stop-color="#fff4b8" stop-opacity=".94"/><stop offset=".22" stop-color="#ffb45c" stop-opacity=".70"/><stop offset=".48" stop-color="#ff4fc5" stop-opacity=".34"/><stop offset=".72" stop-color="#7b54ff" stop-opacity=".14"/><stop offset="1" stop-color="#000" stop-opacity="0"/>'+
        '</radialGradient>'+
        '<linearGradient id="'+id+'flow" x1="0" y1="0" x2="1" y2="1">'+
          '<stop stop-color="#fff8d6"/><stop offset=".15" stop-color="#ffb35c"/><stop offset=".34" stop-color="#ff55cf"/><stop offset=".56" stop-color="#9a5cff"/><stop offset=".76" stop-color="#36dfff"/><stop offset="1" stop-color="#b8ffff"/>'+
        '</linearGradient>'+
        '<linearGradient id="'+id+'cool" x1="1" y1="0" x2="0" y2="1">'+
          '<stop stop-color="#c9ffff"/><stop offset=".28" stop-color="#44e8ff"/><stop offset=".58" stop-color="#5d6cff"/><stop offset=".82" stop-color="#d14cff"/><stop offset="1" stop-color="#ff9b67"/>'+
        '</linearGradient>'+
        '<radialGradient id="'+id+'cheek"><stop stop-color="#ff8bcb" stop-opacity=".95"/><stop offset=".45" stop-color="#ff4fa9" stop-opacity=".55"/><stop offset="1" stop-color="#ff4fa9" stop-opacity="0"/></radialGradient>'+
        '<filter id="'+id+'glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
        '<filter id="'+id+'hot" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="13"/></filter>'+
        '<filter id="'+id+'warp" x="-25%" y="-25%" width="150%" height="150%"><feTurbulence type="fractalNoise" baseFrequency=".014" numOctaves="2" seed="17" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="B"/></filter>'+
      '</defs>'+
      '<g class="v8-aura">'+
        '<circle cx="260" cy="260" r="188" fill="url(#'+id+'heat)" opacity=".22" filter="url(#'+id+'hot)"/>'+
        '<circle class="v8-heat-core" cx="260" cy="285" r="122" fill="url(#'+id+'heat)" opacity=".44" filter="url(#'+id+'hot)"/>'+
        '<ellipse class="v8-ground-glow" cx="260" cy="475" rx="112" ry="19" fill="url(#'+id+'heat)" opacity=".50" filter="url(#'+id+'hot)"/>'+
      '</g>'+
      '<g class="v8-ejected-plasma" fill="none" stroke-linecap="round" filter="url(#'+id+'glow)">'+
        '<path class="tendril t1" d="M174 125 C126 91 91 65 92 27 C117 52 145 47 162 20 C171 57 198 73 219 84" stroke="url(#'+id+'flow)" stroke-width="13"/>'+
        '<path class="tendril t2" d="M309 96 C342 57 384 39 415 57 C384 72 383 101 408 118 C372 129 337 119 318 108" stroke="url(#'+id+'cool)" stroke-width="11"/>'+
        '<path class="tendril t3" d="M388 167 C430 139 475 143 489 175 C459 166 441 187 447 215 C414 208 397 191 382 179" stroke="url(#'+id+'flow)" stroke-width="12"/>'+
        '<path class="tendril t4" d="M405 319 C451 310 484 332 481 365 C458 343 434 353 425 381 C399 363 392 341 400 324" stroke="url(#'+id+'cool)" stroke-width="13"/>'+
        '<path class="tendril t5" d="M319 416 C346 448 384 465 408 445 C393 425 405 401 432 398 C424 433 399 461 366 473 C339 465 321 445 310 425" stroke="url(#'+id+'flow)" stroke-width="12"/>'+
        '<path class="tendril t6" d="M183 421 C161 460 128 476 104 456 C122 439 115 414 90 405 C106 383 137 386 160 405" stroke="url(#'+id+'cool)" stroke-width="11"/>'+
        '<path class="tendril t7" d="M116 330 C72 350 35 338 30 308 C55 318 74 301 72 275 C102 283 119 300 126 317" stroke="url(#'+id+'flow)" stroke-width="13"/>'+
        '<path class="tendril t8" d="M118 192 C75 183 39 157 45 127 C66 145 90 135 97 109 C121 128 131 153 126 180" stroke="url(#'+id+'cool)" stroke-width="11"/>'+
        '<path class="tendril t9" d="M221 91 C230 54 255 26 283 31 C263 51 270 75 295 87 C273 103 247 103 225 96" stroke="url(#'+id+'flow)" stroke-width="9"/>'+
        '<path class="tendril t10" d="M338 381 C364 396 379 418 369 440 C348 425 328 432 317 449 C306 420 314 397 338 381" stroke="url(#'+id+'cool)" stroke-width="9"/>'+
      '</g>'+
      '<g class="v8-droplets" fill="url(#'+id+'flow)" filter="url(#'+id+'glow)">'+
        '<circle class="drop d1" cx="72" cy="83" r="7"/><circle class="drop d2" cx="424" cy="93" r="6"/><circle class="drop d3" cx="466" cy="255" r="8"/><circle class="drop d4" cx="93" cy="382" r="6"/><circle class="drop d5" cx="266" cy="24" r="5"/><circle class="drop d6" cx="441" cy="414" r="7"/><circle class="drop d7" cx="48" cy="245" r="5"/><circle class="drop d8" cx="164" cy="474" r="6"/>'+
      '</g>'+
      '<g class="v8-shell" filter="url(#'+id+'warp)">'+
        '<path class="shell-fill" d="M260 109 C314 99 370 122 398 162 C425 201 426 260 414 312 C401 369 362 408 311 425 C261 442 201 431 160 403 C116 373 94 323 99 270 C104 214 123 169 164 139 C191 119 224 108 260 109 Z" fill="url(#'+id+'core)" opacity=".82"/>'+
        '<path class="shell-rim rim-a" d="M260 105 C320 96 379 123 407 168 C430 207 428 267 414 319 C397 378 354 416 305 430 C249 445 189 430 149 397 C109 364 92 314 99 263 C106 208 128 164 169 135 C194 117 228 106 260 105 Z" fill="none" stroke="url(#'+id+'flow)" stroke-width="8" opacity=".92"/>'+
        '<path class="shell-rim rim-b" d="M253 118 C307 108 357 130 386 168 C411 202 414 254 402 305 C388 358 353 393 307 411 C255 431 204 417 166 390 C129 363 110 322 114 274 C118 226 136 184 174 153 C195 136 224 123 253 118 Z" fill="none" stroke="url(#'+id+'cool)" stroke-width="3" opacity=".72"/>'+
      '</g>'+
      '<g class="v8-currents" fill="none" stroke-linecap="round" filter="url(#'+id+'glow)">'+
        '<path class="current c1" d="M131 260 C167 219 191 172 245 170 C299 168 329 198 314 229 C299 260 250 251 258 214 C265 180 315 158 358 188 C386 207 395 238 402 269" stroke="url(#'+id+'flow)" stroke-width="9" opacity=".86"/>'+
        '<path class="current c2" d="M121 307 C155 273 192 256 227 270 C260 283 266 320 242 338 C218 356 183 339 193 308 C202 281 240 272 276 285 C312 298 334 324 365 316" stroke="url(#'+id+'cool)" stroke-width="8" opacity=".76"/>'+
        '<path class="current c3" d="M170 151 C204 130 244 131 272 151 C296 169 292 194 270 205 C245 218 218 200 228 176 C239 151 279 142 314 155" stroke="url(#'+id+'flow)" stroke-width="7" opacity=".82"/>'+
        '<path class="current c4" d="M158 355 C193 331 223 347 246 369 C272 394 313 393 347 363" stroke="url(#'+id+'cool)" stroke-width="7" opacity=".74"/>'+
        '<path class="current c5" d="M146 218 C174 246 211 249 235 228 C263 203 291 204 321 224 C348 242 368 244 389 229" stroke="url(#'+id+'flow)" stroke-width="5" opacity=".70"/>'+
        '<path class="current c6" d="M183 397 C207 369 240 362 270 378 C299 393 328 385 349 363" stroke="url(#'+id+'cool)" stroke-width="5" opacity=".68"/>'+
      '</g>'+
      '<g class="v8-microcurrents" fill="none" stroke-linecap="round" opacity=".72">'+
        '<path d="M151 288 C175 300 179 326 162 342" stroke="#7af4ff" stroke-width="3"/>'+
        '<path d="M286 135 C274 157 278 179 299 188" stroke="#ff75d2" stroke-width="3"/>'+
        '<path d="M340 271 C318 255 313 232 328 213" stroke="#ffd06a" stroke-width="3"/>'+
        '<path d="M214 390 C224 365 246 354 269 361" stroke="#6f8cff" stroke-width="3"/>'+
      '</g>'+
      '<g class="v8-particles" fill="#e9ffff" filter="url(#'+id+'glow)">'+
        '<circle cx="125" cy="218" r="2.5"/><circle cx="146" cy="118" r="3"/><circle cx="332" cy="128" r="2.5"/><circle cx="407" cy="250" r="3"/><circle cx="367" cy="344" r="2.5"/><circle cx="210" cy="423" r="2.5"/><circle cx="112" cy="334" r="2"/><circle cx="287" cy="445" r="2"/>'+
      '</g>'+
      '<g class="v8-face" transform="translate(0 4)">'+
        '<g class="v8-cheeks" filter="url(#'+id+'glow)">'+
          '<circle class="cheek cheek-l" cx="178" cy="302" r="25" fill="url(#'+id+'cheek)" opacity=".88"/>'+
          '<circle class="cheek cheek-r" cx="342" cy="302" r="25" fill="url(#'+id+'cheek)" opacity=".88"/>'+
        '</g>'+
        '<g class="face-expr expr-soft" fill="none" stroke="#f3ffff" stroke-linecap="round" stroke-linejoin="round">'+
          '<path class="eye eye-l" d="M166 260 Q191 230 216 260" stroke-width="13"/><path class="eye eye-r" d="M304 260 Q329 230 354 260" stroke-width="13"/><path class="mouth" d="M210 296 Q260 333 310 296" stroke="#ffb6ef" stroke-width="9"/>'+
        '</g>'+
        '<g class="face-expr expr-curious" fill="none" stroke="#f3ffff" stroke-linecap="round" stroke-linejoin="round">'+
          '<path class="eye eye-l" d="M166 263 Q191 239 216 258" stroke-width="12"/><path class="eye eye-r" d="M304 256 Q329 229 354 260" stroke-width="13"/><path class="mouth" d="M226 300 Q260 315 294 299" stroke="#ffb6ef" stroke-width="8"/>'+
        '</g>'+
        '<g class="face-expr expr-joy" fill="none" stroke="#f3ffff" stroke-linecap="round" stroke-linejoin="round">'+
          '<path class="eye eye-l" d="M165 262 Q191 224 218 260" stroke-width="15"/><path class="eye eye-r" d="M302 260 Q329 224 356 262" stroke-width="15"/><path class="mouth" d="M204 294 Q260 350 316 294" stroke="#ffd1f4" stroke-width="10"/>'+
        '</g>'+
        '<g class="face-expr expr-surprised" fill="none" stroke="#f3ffff" stroke-linecap="round" stroke-linejoin="round">'+
          '<path class="eye eye-l" d="M168 260 Q191 228 215 260" stroke-width="14"/><path class="eye eye-r" d="M305 260 Q329 228 352 260" stroke-width="14"/><ellipse class="mouth" cx="260" cy="306" rx="23" ry="29" stroke="#ffb6ef" stroke-width="8"/>'+
        '</g>'+
        '<g class="face-expr expr-wink" fill="none" stroke="#f3ffff" stroke-linecap="round" stroke-linejoin="round">'+
          '<path class="eye eye-l" d="M167 260 Q192 229 216 260" stroke-width="13"/><path class="eye eye-r" d="M304 266 Q329 248 353 264" stroke-width="10"/><path class="mouth" d="M211 299 Q260 337 309 298" stroke="#ffb6ef" stroke-width="9"/>'+
        '</g>'+
        '<g class="face-expr expr-sleepy" fill="none" stroke="#f3ffff" stroke-linecap="round" stroke-linejoin="round">'+
          '<path class="eye eye-l" d="M166 263 Q191 275 216 263" stroke-width="11"/><path class="eye eye-r" d="M304 263 Q329 275 354 263" stroke-width="11"/><path class="mouth" d="M220 304 Q260 321 300 304" stroke="#ffb6ef" stroke-width="8"/>'+
        '</g>'+
        '<g class="face-expr expr-playful" fill="none" stroke="#f3ffff" stroke-linecap="round" stroke-linejoin="round">'+
          '<path class="eye eye-l" d="M167 261 Q191 230 216 259" stroke-width="13"/><path class="eye eye-r" d="M305 258 Q330 229 354 264" stroke-width="14"/><path class="mouth" d="M211 297 Q255 336 306 293" stroke="#ffb6ef" stroke-width="9"/>'+
        '</g>'+
        '<g class="face-expr expr-blink" fill="none" stroke="#f3ffff" stroke-linecap="round">'+
          '<path class="eye eye-l" d="M166 264 Q191 275 216 264" stroke-width="11"/><path class="eye eye-r" d="M304 264 Q329 275 354 264" stroke-width="11"/><path class="mouth" d="M218 303 Q260 320 302 303" stroke="#ffb6ef" stroke-width="8"/>'+
        '</g>'+
        '<g class="v8-face-sparkles" fill="#fff4d0" filter="url(#'+id+'glow)"><circle cx="157" cy="291" r="3"/><circle cx="364" cy="291" r="3"/></g>'+
      '</g>'+
      '<ellipse class="v8-ground-ring" cx="260" cy="477" rx="98" ry="11" fill="none" stroke="url(#'+id+'cool)" stroke-width="3" opacity=".70"/>'+
      '<ellipse class="v8-ground-ring inner" cx="260" cy="477" rx="54" ry="6" fill="none" stroke="#ff88dd" stroke-width="2" opacity=".55"/>'+
    '</svg>';
  }

  function setExpression(host,expr){
    const svg=host.querySelector(".akira-v8-nucleus");
    if(!svg)return;
    const normalized=EXPRESSIONS.includes(expr)?expr:"soft";
    svg.dataset.expression=normalized;
    svg.querySelectorAll(".face-expr").forEach(g=>g.classList.toggle("is-active",g.classList.contains("expr-"+normalized)));
  }

  function pulse(host,kind){
    const svg=host&&host.querySelector(".akira-v8-nucleus");
    if(!svg)return;
    svg.classList.remove("v8-reaction");
    svg.dataset.reaction=kind||"pulse";
    void svg.getBoundingClientRect();
    svg.classList.add("v8-reaction");
    clearTimeout(host.__akiraEntity&&host.__akiraEntity.__pulseTimer);
    if(host.__akiraEntity)host.__akiraEntity.__pulseTimer=setTimeout(()=>svg.classList.remove("v8-reaction"),1150);
  }

  function startLife(host){
    if(host.__akiraLife)return;
    const svg=host.querySelector(".akira-v8-nucleus");
    if(!svg)return;
    let alive=true,exprTimer=0,burstTimer=0,particleTimer=0;

    function nextExpression(forced){
      if(!alive)return;
      const e=forced||EXPRESSIONS[Math.floor(Math.random()*EXPRESSIONS.length)];
      setExpression(host,e);
      clearTimeout(exprTimer);
      exprTimer=setTimeout(()=>nextExpression(Math.random()<.18?"blink":"soft"),rand(800,2200));
    }
    function burst(){
      if(!alive)return;
      const tendrils=[...svg.querySelectorAll(".tendril")];
      const currents=[...svg.querySelectorAll(".current")];
      const drops=[...svg.querySelectorAll(".drop")];
      const t=tendrils[Math.floor(Math.random()*tendrils.length)];
      if(t){t.classList.remove("v8-burst");void t.getBoundingClientRect();t.classList.add("v8-burst");setTimeout(()=>t.classList.remove("v8-burst"),1050);}
      if(Math.random()<.62){const c=currents[Math.floor(Math.random()*currents.length)];if(c){c.classList.remove("v8-current-burst");void c.getBoundingClientRect();c.classList.add("v8-current-burst");setTimeout(()=>c.classList.remove("v8-current-burst"),1200);}}
      if(Math.random()<.35){const d=drops[Math.floor(Math.random()*drops.length)];if(d){d.classList.remove("v8-drop-burst");void d.getBoundingClientRect();d.classList.add("v8-drop-burst");setTimeout(()=>d.classList.remove("v8-drop-burst"),1300);}}
      burstTimer=setTimeout(burst,rand(900,2600));
    }
    function particlePulse(){
      if(!alive)return;
      svg.classList.remove("v8-particle-wave");void svg.getBoundingClientRect();svg.classList.add("v8-particle-wave");
      particleTimer=setTimeout(particlePulse,rand(2800,5200));
    }

    const pointerMove=ev=>{
      const rect=host.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      const x=clamp((ev.clientX-rect.left)/rect.width-.5,-.5,.5);
      const y=clamp((ev.clientY-rect.top)/rect.height-.5,-.5,.5);
      svg.style.setProperty("--v8-look-x",(x*13).toFixed(2)+"px");
      svg.style.setProperty("--v8-look-y",(y*9).toFixed(2)+"px");
      if(Math.abs(x)>.22||Math.abs(y)>.20)nextExpression("curious");
    };
    const pointerLeave=()=>{svg.style.setProperty("--v8-look-x","0px");svg.style.setProperty("--v8-look-y","0px");};
    const pointerDown=()=>{pulse(host,"touch");nextExpression(Math.random()<.5?"joy":"surprised");};

    host.addEventListener("pointermove",pointerMove,{passive:true});
    host.addEventListener("pointerleave",pointerLeave,{passive:true});
    host.addEventListener("pointerdown",pointerDown,{passive:true});
    setExpression(host,"soft");
    nextExpression("soft");
    burst();
    particlePulse();

    host.__akiraLife={destroy(){
      alive=false;clearTimeout(exprTimer);clearTimeout(burstTimer);clearTimeout(particleTimer);
      host.removeEventListener("pointermove",pointerMove);host.removeEventListener("pointerleave",pointerLeave);host.removeEventListener("pointerdown",pointerDown);
    }};
  }

  function applyState(host,state){
    const info=STATES[state];
    host.dataset.state=state;
    host.setAttribute("aria-label","Akira · "+info.label+" · núcleo plasmático vivo");
    const svg=host.querySelector(".akira-v8-nucleus");
    if(!svg)return;
    svg.dataset.state=state;
    svg.style.setProperty("--v8-energy",info.energy);
  }

  function mountOne(host){
    if(!host)return null;
    if(host.__akiraEntity)return host.__akiraEntity;
    host.classList.add("akira-entity-slot","is-akira-entity","akira-v8-slot");
    host.setAttribute("role","img");
    const size=Number(host.dataset.size||0);
    if(size){host.style.width=host.style.width||size+"px";host.style.height=host.style.height||size+"px";}
    host.innerHTML=markup();
    let state=normalizeState(host.dataset.state||"idle");
    let alive=true,timer=0;
    const controller={
      setState(next,opts){
        state=normalizeState(next);applyState(host,state);pulse(host,state);
        if(state==="success"&&!(opts&&opts.persist)){clearTimeout(timer);timer=setTimeout(()=>alive&&controller.setState("idle"),1600);}
      },
      getState:()=>state,
      react:(expr,duration)=>{setExpression(host,expr);pulse(host,expr);if(duration){clearTimeout(controller.__reactionTimer);controller.__reactionTimer=setTimeout(()=>setExpression(host,"soft"),duration);}},
      resize:()=>{},
      destroy(){
        alive=false;clearTimeout(timer);clearTimeout(controller.__reactionTimer);clearTimeout(controller.__pulseTimer);
        if(host.__akiraLife){host.__akiraLife.destroy();host.__akiraLife=null;}
        host.__akiraEntity=null;host.innerHTML="";
      }
    };
    host.__akiraEntity=controller;
    applyState(host,state);startLife(host);
    return controller;
  }

  function mountAll(root){
    const base=root||document;
    const list=base.querySelectorAll?base.querySelectorAll("[data-akira-entity],.akira-entity-slot"):[];
    list.forEach(mountOne);return list.length;
  }
  function setState(next,target){
    const list=typeof target==="string"?document.querySelectorAll(target):document.querySelectorAll("[data-akira-entity],.akira-entity-slot");
    list.forEach(el=>{const c=mountOne(el);if(c)c.setState(next);});
  }
  function reactAll(expr,duration,target){
    const list=target?document.querySelectorAll(target):document.querySelectorAll("[data-akira-entity],.akira-entity-slot");
    list.forEach(el=>{const c=mountOne(el);if(c)c.react(expr,duration);});
  }

  function wireConversationReactions(){
    if(document.__akiraV8ConversationReactions)return;
    document.__akiraV8ConversationReactions=true;
    const react=expr=>reactAll(expr,1100);
    document.addEventListener("click",ev=>{if(ev.target&&ev.target.closest&&ev.target.closest("#sendBtn"))react("curious");},true);
    document.addEventListener("keydown",ev=>{if(ev.key==="Enter"&&!ev.shiftKey&&ev.target&&ev.target.closest&&ev.target.closest("#msg"))react("curious");},true);
    const msgs=document.getElementById("msgsInner");
    if(msgs){
      const observer=new MutationObserver(mutations=>{
        let user=false,akira=false;
        mutations.forEach(m=>m.addedNodes&&Array.from(m.addedNodes).forEach(n=>{
          if(!(n instanceof HTMLElement))return;
          if(n.classList.contains("user")||n.querySelector(".msg-row.user"))user=true;
          if(n.classList.contains("akira")||n.querySelector(".msg-row.akira"))akira=true;
        }));
        if(user)react("curious");if(akira)react("joy");
      });
      observer.observe(msgs,{childList:true,subtree:true});
    }
    ["akira:chat-user-message","akira:chat-response-start","akira:chat-response-done","akira:chat-error"].forEach(name=>document.addEventListener(name,()=>react(({"akira:chat-user-message":"curious","akira:chat-response-start":"curious","akira:chat-response-done":"joy","akira:chat-error":"surprised"})[name]||"soft")));
  }

  window.AkiraEntity={states:Object.keys(STATES),expressions:EXPRESSIONS.slice(),mount:mountOne,mountAll,setState,react:reactAll,stateInfo:s=>STATES[normalizeState(s)]};
  window.akiraEntitySetState=setState;window.akiraEntityMount=mountOne;window.akiraEntityReact=reactAll;
  document.addEventListener("DOMContentLoaded",()=>{mountAll(document);wireConversationReactions();window.dispatchEvent(new CustomEvent("akira:entity-ready"));});
})();