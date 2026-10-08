/* AKIRA PLASMA NUCLEUS V7
 * One living entity shared by Home, Chat and compact surfaces.
 * Continuous life is independent from cognitive states.
 */
(function(){
  "use strict";

  const STATES={
    idle:{label:"En calma",energy:1},
    thinking:{label:"Pensando",energy:1.18},
    searching:{label:"Explorando",energy:1.32},
    learning:{label:"Aprendiendo",energy:1.08},
    remembering:{label:"Recordando",energy:.92},
    executing:{label:"Ejecutando",energy:1.28},
    success:{label:"Listo",energy:1.05},
    uncertain:{label:"Con cautela",energy:.82},
    error:{label:"Atención",energy:.86},
    playful:{label:"Juguetona",energy:1.24}
  };

  const EXPRESSIONS=["smile","curious","surprised","wink","sleepy","playful","soft","blink"];
  let uid=0;

  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const rand=(a,b)=>a+Math.random()*(b-a);
  const normalizeState=s=>STATES[s]?s:"idle";

  function markup(){
    const id="akp"+(++uid);
    return '<svg class="akira-plasma-nucleus" viewBox="0 0 440 440" role="presentation" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'+
      '<defs>'+
        '<radialGradient id="'+id+'hotCore" cx="37%" cy="30%" r="75%">'+
          '<stop offset="0" stop-color="#2c477c"/><stop offset=".34" stop-color="#14244b"/><stop offset=".72" stop-color="#070d22"/><stop offset="1" stop-color="#02040d"/>'+
        '</radialGradient>'+
        '<radialGradient id="'+id+'heat" cx="50%" cy="50%" r="50%">'+
          '<stop offset="0" stop-color="#ffbf66" stop-opacity=".46"/><stop offset=".34" stop-color="#ff72c9" stop-opacity=".18"/><stop offset=".68" stop-color="#7c74ff" stop-opacity=".10"/><stop offset="1" stop-color="#000" stop-opacity="0"/>'+
        '</radialGradient>'+
        '<linearGradient id="'+id+'plasmaA" x1="0" y1="0" x2="1" y2="1">'+
          '<stop stop-color="#ff6fc7"/><stop offset=".25" stop-color="#b06cff"/><stop offset=".55" stop-color="#5f8dff"/><stop offset=".78" stop-color="#42e7ff"/><stop offset="1" stop-color="#ffb15a"/>'+
        '</linearGradient>'+
        '<linearGradient id="'+id+'plasmaB" x1="1" y1="0" x2="0" y2="1">'+
          '<stop stop-color="#ffb15a"/><stop offset=".26" stop-color="#ff6fc7"/><stop offset=".62" stop-color="#8a67ff"/><stop offset="1" stop-color="#3ee7ff"/>'+
        '</linearGradient>'+
        '<filter id="'+id+'glow" x="-100%" y="-100%" width="300%" height="300%">'+
          '<feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>'+
        '</filter>'+
        '<filter id="'+id+'soft" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="12"/></filter>'+
      '</defs>'+
      '<g class="plasma-heat-field">'+
        '<circle class="heat-blob" cx="220" cy="220" r="160" fill="url(#'+id+'heat)" filter="url(#'+id+'soft)"/>'+
        '<ellipse class="heat-ring ring-a" cx="220" cy="220" rx="151" ry="108" fill="none" stroke="url(#'+id+'plasmaB)" stroke-width="3" stroke-dasharray="26 38" opacity=".42"/>'+
        '<ellipse class="heat-ring ring-b" cx="220" cy="220" rx="170" ry="124" fill="none" stroke="url(#'+id+'plasmaA)" stroke-width="2.5" stroke-dasharray="15 48" opacity=".26"/>'+
        '<ellipse class="heat-ring ring-c" cx="220" cy="220" rx="190" ry="142" fill="none" stroke="url(#'+id+'plasmaB)" stroke-width="2" stroke-dasharray="8 56" opacity=".18"/>'+
      '</g>'+
      '<g class="plasma-ripple-field" fill="none" stroke-linecap="round">'+
        '<circle class="ripple ripple-1" cx="220" cy="220" r="118" stroke="url(#'+id+'plasmaA)" stroke-width="2" opacity=".18"/>'+
        '<circle class="ripple ripple-2" cx="220" cy="220" r="132" stroke="url(#'+id+'plasmaB)" stroke-width="2" opacity=".14"/>'+
        '<circle class="ripple ripple-3" cx="220" cy="220" r="146" stroke="url(#'+id+'plasmaA)" stroke-width="2" opacity=".10"/>'+
      '</g>'+
      '<g class="plasma-surge-lines" fill="none" stroke-linecap="round" filter="url(#'+id+'glow)">'+
        '<path class="surge surge-1" d="M220 101 C188 85 156 62 150 25 C175 46 204 39 222 18 C241 45 266 61 300 72" stroke="url(#'+id+'plasmaA)" stroke-width="7" opacity=".7"/>'+
        '<path class="surge surge-2" d="M320 139 C354 112 387 94 416 108 C394 129 397 157 418 171 C387 179 351 167 325 151" stroke="url(#'+id+'plasmaB)" stroke-width="6" opacity=".62"/>'+
        '<path class="surge surge-3" d="M321 252 C356 265 390 284 407 316 C381 305 355 319 347 346 C322 322 306 291 311 263" stroke="url(#'+id+'plasmaA)" stroke-width="6" opacity=".62"/>'+
        '<path class="surge surge-4" d="M220 323 C196 349 176 381 187 415 C204 391 230 396 245 420 C249 382 258 350 277 330" stroke="url(#'+id+'plasmaB)" stroke-width="7" opacity=".56"/>'+
        '<path class="surge surge-5" d="M122 254 C90 266 57 284 42 317 C65 303 91 317 99 343 C124 318 138 289 132 262" stroke="url(#'+id+'plasmaA)" stroke-width="6" opacity=".58"/>'+
        '<path class="surge surge-6" d="M118 142 C89 113 53 97 23 111 C46 127 43 154 22 171 C55 180 88 167 114 150" stroke="url(#'+id+'plasmaB)" stroke-width="7" opacity=".68"/>'+
      '</g>'+
      '<g class="plasma-filaments" fill="none" stroke-linecap="round" filter="url(#'+id+'glow)">'+
        '<path d="M79 259 C33 234 37 193 72 186 C102 180 118 206 103 225 C91 240 67 232 69 208 C72 176 108 135 155 117" stroke="url(#'+id+'plasmaA)" stroke-width="9" opacity=".85"/>'+
        '<path d="M83 309 C42 334 43 376 78 381 C109 385 127 354 108 334 C90 316 65 330 76 354 C94 394 143 401 178 374" stroke="url(#'+id+'plasmaB)" stroke-width="7" opacity=".72"/>'+
        '<path d="M145 80 C168 35 209 23 226 42 C241 59 227 84 205 84 C184 83 177 61 191 48" stroke="url(#'+id+'plasmaA)" stroke-width="5" opacity=".64"/>'+
        '<path d="M277 88 C323 56 365 61 360 91 C356 116 325 124 314 104 C303 85 323 67 348 69" stroke="url(#'+id+'plasmaB)" stroke-width="5" opacity=".60"/>'+
        '<path d="M124 168 C163 127 206 112 243 126 C277 139 289 171 269 190 C250 208 221 190 230 164 C240 134 279 121 315 143 C349 165 362 198 367 227" stroke="url(#'+id+'plasmaA)" stroke-width="8" opacity=".62"/>'+
        '<path d="M78 243 C112 218 140 180 174 177 C215 175 243 207 223 235 C202 263 165 250 170 222 C176 190 214 179 250 181 C299 185 325 207 349 235" stroke="url(#'+id+'plasmaB)" stroke-width="6" opacity=".54"/>'+
        '<path d="M116 338 C156 300 190 288 223 302 C258 316 283 344 313 340 C340 336 359 317 369 286" stroke="url(#'+id+'plasmaA)" stroke-width="7" opacity=".60"/>'+
      '</g>'+
      '<g class="plasma-spark-field" fill="#dffcff" filter="url(#'+id+'glow)">'+
        '<circle cx="46" cy="154" r="4"/><circle cx="73" cy="98" r="3"/><circle cx="105" cy="54" r="2.5"/><circle cx="321" cy="104" r="3.5"/><circle cx="384" cy="180" r="3"/><circle cx="367" cy="286" r="3.5"/><circle cx="319" cy="348" r="2.5"/><circle cx="84" cy="346" r="3"/><circle cx="55" cy="282" r="2.5"/>'+
      '</g>'+
      '<g class="plasma-core-shell">'+
        '<circle cx="220" cy="220" r="118" fill="#7d63ff" opacity=".15" filter="url(#'+id+'soft)"/>'+
        '<circle cx="220" cy="220" r="106" fill="url(#'+id+'hotCore)" stroke="#987cff" stroke-opacity=".44" stroke-width="2.5"/>'+
        '<ellipse cx="188" cy="176" rx="72" ry="48" fill="#9cc9ff" opacity=".06"/>'+
        '<path class="core-hot-line" d="M137 158 C160 131 190 119 222 120 C252 122 280 135 299 160" fill="none" stroke="url(#'+id+'plasmaA)" stroke-width="4" opacity=".62"/>'+
        '<path class="core-hot-line lower" d="M135 277 C160 301 190 313 219 313 C251 312 281 299 300 274" fill="none" stroke="url(#'+id+'plasmaB)" stroke-width="4" opacity=".55"/>'+
        '<circle class="core-pulse" cx="220" cy="220" r="91" fill="none" stroke="#7cefff" stroke-width="1.5" opacity=".12"/>'+
      '</g>'+
      '<g class="plasma-face face face-smile" fill="none" stroke="#effcff" stroke-linecap="round">'+
        '<path d="M156 210 Q174 188 192 209" stroke-width="10"/><path d="M248 209 Q267 188 284 210" stroke-width="10"/><path d="M190 238 Q220 270 250 238" stroke="#71eaff" stroke-width="5"/><path d="M163 251 Q220 298 277 251" stroke-width="9"/>'+
      '</g>'+
      '<g class="plasma-face face face-curious" fill="none" stroke="#effcff" stroke-linecap="round">'+
        '<path d="M157 207 Q176 190 194 208" stroke-width="9"/><path d="M247 205 Q267 194 284 211" stroke-width="8"/><path d="M205 234 Q220 244 234 234" stroke="#71eaff" stroke-width="5"/><path d="M188 254 Q218 268 248 251" stroke-width="7"/>'+
      '</g>'+
      '<g class="plasma-face face face-surprised" fill="none" stroke="#effcff" stroke-linecap="round">'+
        '<path d="M156 207 Q175 186 194 207" stroke-width="10"/><path d="M247 207 Q266 186 284 207" stroke-width="10"/><circle cx="220" cy="253" r="13" stroke="#71eaff" stroke-width="5"/>'+
      '</g>'+
      '<g class="plasma-face face face-wink" fill="none" stroke="#effcff" stroke-linecap="round">'+
        '<path d="M157 208 Q176 188 194 208" stroke-width="10"/><path d="M248 210 Q267 200 284 210" stroke-width="8"/><path d="M205 236 Q220 245 234 236" stroke="#71eaff" stroke-width="4"/><path d="M166 252 Q220 298 272 252" stroke-width="9"/>'+
      '</g>'+
      '<g class="plasma-face face face-sleepy" fill="none" stroke="#effcff" stroke-linecap="round">'+
        '<path d="M157 210 Q176 219 194 210" stroke-width="8"/><path d="M247 210 Q266 219 284 210" stroke-width="8"/><path d="M188 252 Q220 264 252 252" stroke-width="7"/>'+
      '</g>'+
      '<g class="plasma-face face face-playful" fill="none" stroke="#effcff" stroke-linecap="round">'+
        '<path d="M157 207 Q176 190 194 208" stroke-width="9"/><path d="M248 208 Q267 190 284 212" stroke-width="10"/><path d="M206 235 Q219 245 234 234" stroke="#71eaff" stroke-width="5"/><path d="M164 250 Q211 293 274 245" stroke-width="9"/><path d="M269 246 l12 5" stroke="#71eaff" stroke-width="4"/>'+
      '</g>'+
      '<g class="plasma-face face face-soft" fill="none" stroke="#effcff" stroke-linecap="round">'+
        '<path d="M158 209 Q176 190 194 208" stroke-width="9"/><path d="M248 208 Q266 190 284 209" stroke-width="9"/><path d="M198 238 Q220 251 242 238" stroke="#71eaff" stroke-width="5"/><path d="M181 253 Q220 275 259 253" stroke-width="8"/>'+
      '</g>'+
      '<g class="plasma-face face face-blink" fill="none" stroke="#effcff" stroke-linecap="round">'+
        '<path d="M156 210 Q175 218 194 210" stroke-width="8"/><path d="M247 210 Q266 218 284 210" stroke-width="8"/><path d="M188 253 Q220 267 252 253" stroke-width="8"/>'+
      '</g>'+
      '<g class="plasma-gaze" fill="#77eaff"><circle cx="188" cy="208" r="3.2"/><circle cx="252" cy="208" r="3.2"/></g>'+
      '<ellipse class="plasma-base-ring" cx="220" cy="358" rx="104" ry="14" fill="none" stroke="#9c6cff" stroke-width="3" opacity=".55"/>'+
      '<ellipse class="plasma-base-ring cool" cx="220" cy="358" rx="76" ry="8" fill="none" stroke="#48e7ff" stroke-width="2" opacity=".62"/>'+
    '</svg>';
  }

  function setExpression(host,expr){
    const svg=host.querySelector(".akira-plasma-nucleus");
    if(!svg)return;
    svg.dataset.expression=expr;
    svg.querySelectorAll(".face").forEach(f=>{
      f.classList.toggle("is-active",f.classList.contains("face-"+expr));
    });
  }

  function emitReaction(host,expr="playful",duration=900){
    if(!host||!host.__akiraEntity)return;
    const svg=host.querySelector(".akira-plasma-nucleus");
    if(!svg)return;
    setExpression(host,expr);
    svg.classList.remove("reaction-now");
    void svg.getBoundingClientRect();
    svg.classList.add("reaction-now");
    clearTimeout(host.__akiraEntity.__reactionTimer);
    host.__akiraEntity.__reactionTimer=setTimeout(()=>{
      if(host.__akiraEntity)setExpression(host,EXPRESSIONS[Math.floor(Math.random()*EXPRESSIONS.length)]);
    },duration);
  }

  function startLife(host,controller){
    if(host.__akiraLife)return;
    const svg=host.querySelector(".akira-plasma-nucleus");
    if(!svg)return;
    let alive=true,exprTimer=0,blinkTimer=0,burstTimer=0,reactionTimer=0;

    function chooseExpression(forced){
      if(!alive)return;
      const e=forced||EXPRESSIONS[Math.floor(Math.random()*EXPRESSIONS.length)];
      setExpression(host,e);
      clearTimeout(exprTimer);
      exprTimer=setTimeout(()=>chooseExpression("soft"),rand(650,1450));
    }
    function scheduleExpressions(){
      clearTimeout(blinkTimer);
      blinkTimer=setTimeout(()=>{
        chooseExpression();
        if(Math.random()<.28){
          clearTimeout(reactionTimer);
          reactionTimer=setTimeout(()=>chooseExpression("blink"),rand(350,900));
        }
        scheduleExpressions();
      },rand(1300,4300));
    }
    function scheduleBursts(){
      if(!alive)return;
      clearTimeout(burstTimer);
      burstTimer=setTimeout(()=>{
        const svgBursts=svg.querySelectorAll(".surge");
        const ripples=svg.querySelectorAll(".ripple");
        const rings=svg.querySelectorAll(".heat-ring");
        const count=Math.random()<.2?2:1;
        for(let i=0;i<count;i++){
          const el=svgBursts[Math.floor(Math.random()*svgBursts.length)];
          if(!el)continue;
          el.classList.remove("surge-now");void el.getBoundingClientRect();el.classList.add("surge-now");
          setTimeout(()=>el.classList.remove("surge-now"),900);
        }
        const r=ripples[Math.floor(Math.random()*ripples.length)];
        if(r){r.classList.remove("ripple-now");void r.getBoundingClientRect();r.classList.add("ripple-now");setTimeout(()=>r.classList.remove("ripple-now"),1300);}
        const h=rings[Math.floor(Math.random()*rings.length)];
        if(h){h.classList.remove("heat-now");void h.getBoundingClientRect();h.classList.add("heat-now");setTimeout(()=>h.classList.remove("heat-now"),1050);}
        scheduleBursts();
      },rand(1600,4200));
    }

    const pointerMove=ev=>{
      const rect=host.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      const x=clamp((ev.clientX-rect.left)/rect.width-.5,-.5,.5);
      const y=clamp((ev.clientY-rect.top)/rect.height-.5,-.5,.5);
      svg.style.setProperty("--gaze-x",(x*12).toFixed(2)+"px");
      svg.style.setProperty("--gaze-y",(y*8).toFixed(2)+"px");
      if(Math.abs(x)>.20||Math.abs(y)>.20)chooseExpression("curious");
    };
    const pointerLeave=()=>{
      svg.style.setProperty("--gaze-x","0px");
      svg.style.setProperty("--gaze-y","0px");
    };
    const touch=()=>emitReaction(host,Math.random()<.5?"playful":"surprised",1000);

    host.addEventListener("pointermove",pointerMove,{passive:true});
    host.addEventListener("pointerleave",pointerLeave,{passive:true});
    host.addEventListener("pointerdown",touch,{passive:true});

    setExpression(host,"smile");
    scheduleExpressions();
    scheduleBursts();

    host.__akiraLife={destroy(){
      alive=false;
      clearTimeout(exprTimer);clearTimeout(blinkTimer);clearTimeout(burstTimer);clearTimeout(reactionTimer);
      host.removeEventListener("pointermove",pointerMove);
      host.removeEventListener("pointerleave",pointerLeave);
      host.removeEventListener("pointerdown",touch);
    }};
  }

  function applyState(host,state){
    host.dataset.state=state;
    host.setAttribute("aria-label","Akira · "+STATES[state].label);
    const svg=host.querySelector(".akira-plasma-nucleus");
    if(!svg)return;
    svg.dataset.state=state;
    svg.style.setProperty("--akira-energy",STATES[state].energy);
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
    host.innerHTML=markup();
    let state=normalizeState(host.dataset.state||"idle");
    let alive=true;
    let timer=0;
    const controller={
      setState(next,opts){
        state=normalizeState(next);applyState(host,state);
        if(state==="success"&&!(opts&&opts.persist)){
          clearTimeout(timer);
          timer=setTimeout(()=>alive&&controller.setState("idle"),1500);
        }
      },
      getState:()=>state,
      react:(expr,duration)=>emitReaction(host,expr,duration),
      resize:()=>{},
      destroy(){
        alive=false;
        clearTimeout(timer);
        if(host.__akiraLife){host.__akiraLife.destroy();host.__akiraLife=null;}
        clearTimeout(controller.__reactionTimer);
        host.__akiraEntity=null;
        host.innerHTML="";
      }
    };
    host.__akiraEntity=controller;
    applyState(host,state);
    startLife(host,controller);
    return controller;
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

  function reactAll(expr,duration,target){
    const list=target
      ?document.querySelectorAll(target)
      :document.querySelectorAll("[data-akira-entity],.akira-entity-slot");
    list.forEach(el=>{const c=mountOne(el);if(c)c.react(expr,duration);});
  }

  function wireConversationReactions(){
    if(document.__akiraConversationReactions)return;
    document.__akiraConversationReactions=true;

    const react=expr=>reactAll(expr,1100);

    document.addEventListener("click",ev=>{
      const send=ev.target&&ev.target.closest?ev.target.closest("#sendBtn"):null;
      if(send)react("curious");
    },true);

    document.addEventListener("keydown",ev=>{
      if(ev.key!=="Enter"||ev.shiftKey)return;
      const msg=ev.target&&ev.target.closest?ev.target.closest("#msg"):null;
      if(msg)react("curious");
    },true);

    const msgs=document.getElementById("msgsInner");
    if(msgs){
      const observer=new MutationObserver(mutations=>{
        let user=false,akira=false;
        mutations.forEach(m=>{
          m.addedNodes&&Array.from(m.addedNodes).forEach(n=>{
            if(!(n instanceof HTMLElement))return;
            if(n.classList.contains("user")||n.querySelector(".msg-row.user"))user=true;
            if(n.classList.contains("akira")||n.querySelector(".msg-row.akira"))akira=true;
          });
        });
        if(user)react("surprised");
        if(akira)react("smile");
      });
      observer.observe(msgs,{childList:true,subtree:true});
    }

    ["akira:chat-user-message","akira:chat-response-start","akira:chat-response-done","akira:chat-error"].forEach(eventName=>{
      document.addEventListener(eventName,()=>{
        const map={
          "akira:chat-user-message":"curious",
          "akira:chat-response-start":"curious",
          "akira:chat-response-done":"smile",
          "akira:chat-error":"surprised"
        };
        react(map[eventName]||"playful");
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