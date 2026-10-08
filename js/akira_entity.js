/* AKIRA ENTITY V3 — reference-faithful living orb, one entity at every scale */
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
let uid=0;
function norm(s){return STATES[s]?s:"idle"}
function svgMarkup(){
 const n="ak"+(++uid);
 return '<svg class="akira-entity-reference" viewBox="0 0 420 420" role="presentation" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">'+
 '<defs>'+
 '<radialGradient id="'+n+'core" cx="38%" cy="28%" r="76%"><stop stop-color="#182044"/><stop offset=".42" stop-color="#080d25"/><stop offset=".78" stop-color="#030719"/><stop offset="1" stop-color="#01030b"/></radialGradient>'+
 '<radialGradient id="'+n+'halo"><stop stop-color="#8e72ff" stop-opacity=".38"/><stop offset=".5" stop-color="#3ccfff" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>'+
 '<linearGradient id="'+n+'violet" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ff63d7"/><stop offset=".36" stop-color="#9b65ff"/><stop offset=".68" stop-color="#5d8cff"/><stop offset="1" stop-color="#42e9ff"/></linearGradient>'+
 '<linearGradient id="'+n+'warm" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#ff6eaa"/><stop offset=".45" stop-color="#ffad61"/><stop offset=".72" stop-color="#ffd45f"/><stop offset="1" stop-color="#8b6cff"/></linearGradient>'+
 '<filter id="'+n+'blur" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="8"/></filter>'+
 '<filter id="'+n+'glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
 '<filter id="'+n+'strong" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="13" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
 '</defs>'+
 '<ellipse cx="210" cy="365" rx="130" ry="25" fill="url(#'+n+'halo)" filter="url(#'+n+'blur)"/>'+
 '<g class="akira-reference-ribbons" fill="none" stroke-linecap="round" filter="url(#'+n+'glow)">'+
 '<path d="M65 267 C18 229 33 177 80 188 C116 196 119 227 91 239 C64 251 51 216 70 183 C91 146 132 117 178 109" stroke="url(#'+n+'violet)" stroke-width="9" opacity=".88"/>'+
 '<path d="M55 305 C15 329 23 365 62 361 C95 357 96 326 75 313 C53 299 36 331 51 354 C76 391 126 393 166 368" stroke="url(#'+n+'warm)" stroke-width="7" opacity=".76"/>'+
 '<path d="M159 73 C197 24 255 31 248 71 C243 103 207 101 207 74 C207 48 232 32 270 38" stroke="url(#'+n+'violet)" stroke-width="8" opacity=".82"/>'+
 '<path d="M255 79 C315 34 368 54 348 94 C332 126 296 111 300 82 C304 52 336 40 374 59" stroke="url(#'+n+'warm)" stroke-width="7" opacity=".75"/>'+
 '<path d="M51 159 C98 105 152 79 199 111 C231 133 221 170 191 173 C157 176 143 142 160 119 C183 87 233 87 274 108 C319 131 348 171 359 216" stroke="url(#'+n+'violet)" stroke-width="8" opacity=".78"/>'+
 '<path d="M50 251 C94 220 120 180 164 180 C210 180 233 219 209 247 C185 274 151 254 154 224 C158 193 191 176 235 169 C283 161 323 184 349 220" stroke="url(#'+n+'warm)" stroke-width="6" opacity=".66"/>'+
 '<path d="M83 334 C130 294 163 285 202 306 C239 326 268 358 306 353 C337 348 358 326 367 296" stroke="url(#'+n+'violet)" stroke-width="7" opacity=".7"/>'+
 '</g>'+
 '<g class="akira-reference-particles" filter="url(#'+n+'strong)" fill="#8feaff">'+
 '<circle cx="72" cy="153" r="4"/><circle cx="104" cy="95" r="3"/><circle cx="302" cy="119" r="4"/><circle cx="365" cy="194" r="3"/><circle cx="65" cy="283" r="3"/><circle cx="324" cy="294" r="4"/><circle cx="119" cy="337" r="3"/><circle cx="282" cy="342" r="3"/>'+
 '</g>'+
 '<g class="akira-reference-core">'+
 '<circle cx="210" cy="207" r="108" fill="#6c58ff" opacity=".13" filter="url(#'+n+'strong)"/>'+
 '<circle cx="210" cy="207" r="102" fill="url(#'+n+'core)" stroke="#7c6aff" stroke-opacity=".36" stroke-width="2.5"/>'+
 '<ellipse cx="183" cy="166" rx="62" ry="42" fill="#6f8bff" opacity=".06"/>'+
 '<path d="M128 154 C147 125 173 112 208 112 C243 112 274 126 292 156" fill="none" stroke="url(#'+n+'violet)" stroke-width="4" opacity=".58"/>'+
 '<path d="M129 256 C151 286 181 301 211 301 C247 301 278 285 294 255" fill="none" stroke="url(#'+n+'warm)" stroke-width="4" opacity=".45"/>'+
 '</g>'+
 '<g class="akira-reference-face" fill="none" stroke="#e9fbff" stroke-linecap="round">'+
 '<path d="M150 196 Q169 174 189 195" stroke-width="11"/><path d="M231 195 Q251 174 271 196" stroke-width="11"/>'+
 '<path d="M196 217 Q210 229 224 217" stroke="#71e8ff" stroke-width="5"/>'+
 '<path d="M174 237 Q210 269 246 237" stroke-width="9"/>'+
 '</g>'+
 '<ellipse cx="210" cy="355" rx="92" ry="12" fill="none" stroke="#9b68ff" stroke-opacity=".48" stroke-width="3"/><ellipse cx="210" cy="355" rx="66" ry="8" fill="none" stroke="#45dfff" stroke-opacity=".55" stroke-width="2"/>'+
 '</svg>';
}
function apply(host,state){
 host.dataset.state=state;host.setAttribute("aria-label","Akira · "+STATES[state].label);
 const svg=host.querySelector(".akira-entity-reference"); if(!svg)return;
 svg.dataset.state=state;svg.style.setProperty("--akira-speed",STATES[state].speed);
 svg.classList.remove("state-thinking","state-searching","state-learning","state-remembering","state-executing","state-success","state-uncertain","state-error","state-playful");
 if(state!=="idle")svg.classList.add("state-"+state);
}
function mountOne(host){
 if(!host||host.__akiraEntity)return host&&host.__akiraEntity;
 host.classList.add("akira-entity-slot","is-akira-entity");
 host.setAttribute("role","img");
 const size=Number(host.dataset.size||0);if(size){host.style.width=host.style.width||size+"px";host.style.height=host.style.height||size+"px"}
 host.innerHTML=svgMarkup();
 let state=norm(host.dataset.state||"idle"),alive=true,timer=0;
 const setState=(next,opts)=>{state=norm(next);apply(host,state);if(state==="success"&&!(opts&&opts.persist)){clearTimeout(timer);timer=setTimeout(()=>alive&&setState("idle"),1500)}};
 const c={setState,getState:()=>state,resize:()=>{},destroy:()=>{alive=false;clearTimeout(timer);host.__akiraEntity=null;host.innerHTML=""}};
 host.__akiraEntity=c;apply(host,state);return c;
}
function mountAll(root){const b=root||document;const list=b.querySelectorAll?b.querySelectorAll("[data-akira-entity],.akira-entity-slot"):[];list.forEach(mountOne);return list.length}
function setState(next,target){const list=typeof target==="string"?document.querySelectorAll(target):document.querySelectorAll("[data-akira-entity],.akira-entity-slot");list.forEach(el=>{const c=mountOne(el);if(c)c.setState(next)})}
window.AkiraEntity={states:Object.keys(STATES),mount:mountOne,mountAll,setState,stateInfo:s=>STATES[norm(s)]};
window.akiraEntitySetState=setState;window.akiraEntityMount=mountOne;
document.addEventListener("DOMContentLoaded",()=>{mountAll(document);window.dispatchEvent(new CustomEvent("akira:entity-ready"))});
})();