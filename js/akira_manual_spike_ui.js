(function(root){
 'use strict';
 const KEY='akira_manual_spikes_v1',SPEC='akira_manual_contracts_v1';
 const supported=id=>/^(BOOM|CRASH)(300N|500|1000)$/.test(id);
 const el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 class Controller{
  constructor(app){this.app=app;this.market=null;this.plan=null;this.tracking=null;this.changes=[];this.last=null;this.prediction=null;this.model=null;this.target=1;this.journal=[];this.specs={};
   try{const j=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(j))this.journal=j.filter(x=>x&&typeof x.id==='string'&&Number.isFinite(x.signalEpoch)).slice(-500);const s=JSON.parse(localStorage.getItem(SPEC)||'{}');if(s&&typeof s==='object'&&!Array.isArray(s))this.specs=s;}catch(_){}
   for(const p of this.journal)for(const v of Object.values(p.simulation?.scenarios||{}))if(v.status==='tracking'){p.closed='interrupted';Object.assign(v,{status:'data_gap',exitPrice:null,resultR:null});}
   this.practiceMode='regular';try{if(localStorage.getItem('akira_spike_practice_mode')==='selective')this.practiceMode='selective';}catch(_){}
   this.save();
  }
  supports(){return supported(this.app.selectedMarket);}
  viewPlan(){const p=this.plan;if(!p||!p.customLevels)return p;const view={...p,...p.customLevels};view.sizing=root.AkiraManualSpikePlan.sizePlan(view,p.sizing?.balance||this.app.accountSize||50,p.specification);return view;}
  editLevels(values){
   const p=this.plan;if(!p||p.marketId!==this.market)return 'Primero debe aparecer un aviso.';
   const keys=['sl','tp1','tp2','tp3'];if(keys.some(k=>!Number.isFinite(values[k])||values[k]<=0))return 'Escribe cuatro precios positivos válidos.';
   const s=p.type==='BUY'?1:-1;if(s*(p.entry-values.sl)<=0||s*(values.tp1-p.entry)<=0||s*(values.tp2-values.tp1)<=0||s*(values.tp3-values.tp2)<=0)return 'En compra: SL < entrada < TP1 < TP2 < TP3. En venta, el orden es inverso.';
   if(p.specification?.minStopDistance>Math.abs(p.entry-values.sl))return 'El stop queda demasiado cerca según la especificación de tu cuenta.';
   p.customLevels=Object.fromEntries(keys.map(k=>[k,values[k]]));p.customLevelsEditedAt=Date.now()/1000;this.save();this.render();return null;
  }
  active(){return Boolean(this.tracking&&Object.values(this.tracking.scenarios).some(s=>s.status==='tracking'));}
  select(id){if(id===this.market)return;this.pause();this.market=id;this.plan=null;this.changes=[];this.last=null;this.lastPlanAt=0;this.prediction=null;this.tracker=supported(id)&&root.AkiraTickProbability?new root.AkiraTickProbability.Tracker(id):null;this.populateSpec();this.render();}
  pause(){if(this.plan&&!this.plan.closed){if(this.active()){for(const s of Object.values(this.tracking.scenarios))if(s.status==='tracking')Object.assign(s,{status:'data_gap',exitPrice:null,resultR:null});this.plan.simulation=this.tracking;}this.plan.closed='interrupted';this.save();}this.tracking=null;this.last=null;this.changes=[];this.prediction=null;if(this.market&&root.AkiraTickProbability)this.tracker=new root.AkiraTickProbability.Tracker(this.market);this.render();}
  populateSpec(){if(!this.specInputs)return;const spec=this.specs[this.market]||{};for(const[k,n]of Object.entries(this.specInputs))n.value=Number.isFinite(spec[k])?String(spec[k]):'';this.specConfirm.checked=false;this.specMessage.textContent='Símbolo: '+this.market;}
  save(){try{localStorage.setItem(KEY,JSON.stringify(this.journal.slice(-500)));}catch(_){this.storageError=true;}}
  tick(price,epoch){
   if(!supported(this.market)||!Number.isFinite(price)||!Number.isFinite(epoch)||Math.abs(Date.now()/1000-epoch)>5)return;
   if(this.last&&epoch<this.last.epoch)return;
   if(this.last&&epoch===this.last.epoch){if(price!==this.last.price)this.pause();return;}
   if(this.last&&epoch-this.last.epoch>5)this.pause();
   if(this.last){this.changes.push(price-this.last.price);this.changes=this.changes.slice(-300);}this.last={price,epoch};
   const observed=this.tracker?.tick(price,epoch);
   if(!this.prediction||observed?.event||epoch-(this.predictionAt||0)>=10){this.predictionAt=epoch;this.prediction=this.model&&this.tracker?root.AkiraTickProbability.predict(this.model,this.market,this.tracker.features(epoch)):null;}
   if(this.tracking){this.tracking=root.AkiraManualSpikePlan.advanceTracking(this.tracking,price,epoch);this.plan.simulation=this.tracking;this.save();}
   const api=root.AkiraManualSpikePlan;
   if(this.plan&&api.state(this.plan,price,epoch)!=='available')this.plan.expired=true;
   // Every candidate gets the same five-second hypothetical reaction, including losses.
   if(this.plan&&!this.tracking&&!this.plan.expired&&!this.plan.closed&&epoch>=this.plan.signalEpoch+5)this.start();
   // Fixed research trigger; it is NOT an economically validated recommendation.
   const sign=this.market.startsWith('BOOM')?1:-1,med=a=>{const b=a.slice().sort((x,y)=>x-y);return b.length?(b[(b.length-1)>>1]+b[b.length>>1])/2:0;};
   const bars=(this.app.anticipationMonitor?.bars||[]).filter(b=>b.epoch+60<=epoch);
   const drift=this.changes.slice(-60).filter(d=>sign*d<0).length>=45;
   const slow=med(this.changes.slice(-20).map(Math.abs))<=.8*med(this.changes.slice(-80,-20).map(Math.abs));
   const edge=this.prediction&&(this.prediction.within60>this.prediction.baseline60+.05||this.prediction.within300>this.prediction.baseline300+.05);
   const active=this.active();
   const regular=this.practiceMode==='regular',candidate=regular||this.market==='BOOM300N';
   const lastExit=Math.max(0,...Object.values(this.tracking?.scenarios||{}).map(s=>s.exitEpoch||0));
   const freshBar=bars.at(-1)?.epoch!==this.candidateBar;
   const eligible=candidate?freshBar&&epoch>=lastExit+120:!observed?.event&&this.changes.length===300&&bars.length>=20&&drift&&slow&&edge&&epoch-(this.lastPlanAt||0)>=300;
   if(!active&&!this.dailyLocked()&&this.app.anticipationMonitor?.ready&&this.app.scalpPracticeEnabled!==false&&eligible){
    if(candidate)this.candidateBar=bars.at(-1)?.epoch;
    const p=regular?api.makeRegularDemoPlan({marketId:this.market,bars,epoch,selectedTarget:'tp'+this.target},root.AkiraScalpResearchCore):candidate?api.makeBoom300Candidate({marketId:this.market,bars,epoch,selectedTarget:'tp'+this.target},root.AkiraScalpResearchCore):api.makePlan({marketId:this.market,price,epoch,bars,changes:this.changes,spec:this.specs[this.market],selectedTarget:'tp'+this.target});
    if(p&&this.journal.some(s=>s.id===p.id))return;
    if(p){this.tracking=null;this.plan={...p,probability:{...this.prediction},fillPolicy:'first_tick_after_5_seconds_max_20_seconds',specification:this.specs[this.market]?{...this.specs[this.market]}:null,sizing:api.sizePlan(p,this.app.accountSize||50,this.specs[this.market])};this.lastPlanAt=epoch;this.journal.push(this.plan);this.journal=this.journal.slice(-500);this.save();}
   }
   this.render();
  }
  mount(){const anchor=document.getElementById('chartTradePlan');if(!anchor||document.getElementById('manualSpikeCard'))return;
   const card=el('section');card.id='manualSpikeCard';card.className='ak-simple-details';
   const style=el('style');style.textContent='#manualSpikeCard{padding:16px;border:1px solid #334155;border-radius:12px;background:#101827;color:#e2e8f0;line-height:1.5}#manualSpikeCard button,#manualSpikeCard input,#manualSpikeCard select{background:#172638;color:#e2e8f0;border:1px solid #436176;border-radius:6px;padding:7px;max-width:100%;font:inherit}#manualSpikeCard button{cursor:pointer}#manualSpikeCard button:disabled{opacity:.45;cursor:default}#manualSpikeCard details{margin-top:12px}#manualSpikeLevels span{font-variant-numeric:tabular-nums;align-self:center}';card.append(style);
   card.append(el('strong','Entradas para copiar a MetaTrader'));
   const modeLabel=el('label','Modo de práctica '),mode=el('select');for(const[value,label]of [['regular','Demo por zonas extremas'],['selective','Escáner anterior']]){const option=el('option',label);option.value=value;mode.append(option);}mode.value=this.practiceMode;mode.addEventListener('change',()=>{this.pause();this.plan=null;this.candidateBar=null;this.practiceMode=mode.value;try{localStorage.setItem('akira_spike_practice_mode',this.practiceMode);}catch(_){}this.app.assignAutomaticProfile?.();this.render();});modeLabel.append(mode);card.append(modeLabel);
   card.append(el('p','Modo demo por zonas extremas: las pruebas anteriores de esta familia tuvieron pérdidas. Sirve para practicar avisos, no acredita rentabilidad. Cada señal usa una vela cerrada; no hay frecuencia garantizada.'));
   const info=el('p','Práctica demo · tú colocas la operación. Akira no opera tu cuenta.');info.style.color='#fcd58a';card.append(info);
   const evidence=el('details');evidence.append(el('summary','Resultado de las pruebas'));evidence.append(el('p','Boom 300 usa la candidata EMA200/RSI M1: positiva en seis sesiones recientes, negativa en octubre. En la comprobación posterior del 9 de noviembre dio 4 entradas y 4 pérdidas; no está validada para dinero real. Otros Boom/Crash conservan el disparador por ticks: 27 avisos en el histórico estudiado, 3 resultados positivos y 24 stops con TP1. El conjunto perdió incluso antes de costes. No es una estrategia validada para ganar dinero.'));card.append(evidence);
   const probability=el('p');probability.id='manualSpikeProbability';card.append(probability);
   const status=el('p');status.id='manualSpikeStatus';card.append(status);
   const balanceLabel=el('label','Saldo USD '),balance=el('input');balance.type='number';balance.min='1';balance.step='.01';balance.value=String(this.app.accountSize||50);balance.style.width='100px';balance.addEventListener('change',()=>{const n=Number(balance.value);if(n>0&&Number.isFinite(n)){this.app.accountSize=n;localStorage.setItem('akira_trading_custom_capital',String(n));this.render();}});balanceLabel.append(balance);card.append(balanceLabel);
   const targetLabel=el('label',' Objetivo para el próximo aviso '),select=el('select');for(let i=1;i<=3;i++){const o=el('option','TP'+i);o.value=String(i);select.append(o);}select.addEventListener('change',()=>{this.target=Number(select.value);this.render();});targetLabel.append(select);card.append(targetLabel);
   const levels=el('div');levels.id='manualSpikeLevels';levels.style.cssText='display:grid;grid-template-columns:1fr auto;gap:8px;margin:12px 0';card.append(levels);
   const editor=el('details');editor.id='manualLevelEditor';editor.append(el('summary','Ajustar mi stop y mis objetivos'));
   editor.append(el('p','Cambias los niveles dibujados y copiados para este aviso. La entrada original y su vencimiento se conservan. El historial sigue evaluando la propuesta original; estos ajustes no modifican MetaTrader.'));
   this.levelInputs={};for(const k of ['sl','tp1','tp2','tp3']){const row=el('label',k.toUpperCase()+' '),input=el('input');input.id='manualEdit_'+k;input.type='number';input.step='any';input.min='0';input.style.width='100%';row.style.cssText='display:block;margin:8px 0';row.append(input);editor.append(row);this.levelInputs[k]=input;}
   const editMessage=el('p');editMessage.id='manualEditMessage';editMessage.setAttribute('role','status');
   const apply=el('button','Aplicar al gráfico');apply.type='button';apply.addEventListener('click',()=>{if(this.editorPlanId!==this.plan?.id){editMessage.textContent='El aviso cambió. Revisa los precios nuevos.';return;}const error=this.editLevels(Object.fromEntries(Object.entries(this.levelInputs).map(([k,n])=>[k,n.value.trim()===''?NaN:Number(n.value)])));editMessage.textContent=error||'Ajustes personales aplicados. La propuesta original queda guardada.';});
   const reset=el('button','Restaurar propuesta');reset.type='button';reset.addEventListener('click',()=>{if(!this.plan)return;delete this.plan.customLevels;delete this.plan.customLevelsEditedAt;this.editorPlanId=null;this.save();this.render();editMessage.textContent='Niveles originales restaurados.';});editor.append(apply,reset,editMessage);card.append(editor);
   const risk=el('p');risk.id='manualSpikeRisk';card.append(risk);
   card.append(el('p','El historial sigue cada aviso con 5 segundos de reacción simulada y hasta 5 minutos de duración. Tu operación real se coloca y se cierra desde MetaTrader.'));
   const result=el('p');result.id='manualSpikeOutcome';card.append(result);
   const configuration=el('details');configuration.append(el('summary','Configurar contrato de mi cuenta MT5'));
   configuration.append(el('p','Copia estos datos de la especificación del símbolo de tu cuenta demo. Sin ellos no se calcula un lote. Los costes son estimaciones que debes verificar; no compartas contraseñas.'));
   const fields={tickSize:'Tamaño del tick',tickValueLoss:'USD por tick y lote (pérdida)',tickValueProfit:'USD por tick y lote (ganancia)',minLot:'Lote mínimo',lotStep:'Paso de lote',maxLot:'Lote máximo',minStopDistance:'Distancia mínima del SL en precio',spreadPrice:'Spread en precio',slippagePrice:'Margen de deslizamiento en precio',roundTripCommissionPerLot:'Comisión total USD por lote',marginPerLot:'Margen USD por lote'};
   fields.pipSize='Tamaño del pip (opcional, solo si MT5 lo especifica)';
   const inputs={};for(const [key,label]of Object.entries(fields)){const row=el('label',label+' ');row.style.cssText='display:block;margin:8px 0';const input=el('input');input.type='number';input.min='0';input.step='any';input.required=key!=='pipSize';input.style.cssText='width:100%;box-sizing:border-box';inputs[key]=input;row.append(input);configuration.append(row);}
   const confirmLabel=el('label'),confirm=el('input');confirm.type='checkbox';confirmLabel.append(confirm,document.createTextNode(' Confirmo que corresponden al símbolo seleccionado y a mi cuenta en USD.'));configuration.append(confirmLabel);
   const save=el('button','Guardar especificaciones');save.type='button';save.addEventListener('click',()=>{if(!confirm.checked||Object.values(inputs).some(n=>(n.required&&n.value==='')||!n.checkValidity())){message.textContent='Completa todos los datos y confirma el símbolo.';return;}const spec={verified:true,currency:'USD',marketId:this.market,source:'user_mt5_specification',verifiedAt:Date.now()/1000};for(const[k,n]of Object.entries(inputs))if(n.value!=='')spec[k]=Number(n.value);this.specs[this.market]=spec;try{localStorage.setItem(SPEC,JSON.stringify(this.specs));message.textContent='Datos guardados para los próximos avisos; declarados por ti, no consultados al broker.';}catch(_){message.textContent='No se pudo guardar.';}this.render();});configuration.append(save);const message=el('p');configuration.append(message);card.append(configuration);
   this.specInputs=inputs;this.specConfirm=confirm;this.specMessage=message;this.populateSpec();
   const exportButton=el('button','Descargar historial de avisos');exportButton.type='button';exportButton.addEventListener('click',()=>{const u=URL.createObjectURL(new Blob([JSON.stringify({version:1,source:'local_demo_not_mt5',journal:this.journal},null,2)],{type:'application/json'}));const a=el('a');a.href=u;a.download='akira-entradas-manuales.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);});card.append(exportButton);
   const details=el('details');details.id='manualSpikeDetails';details.append(el('summary','Precios, historial y configuración'));
   for(const node of Array.from(card.children))if(node!==status&&node!==style)details.append(node);
   const badge=el('small','Escáner experimental · operación manual');badge.style.color='#fcd58a';card.prepend(badge);
   const copy=el('button','Copiar entrada y objetivos');copy.id='manualCopyAll';copy.type='button';copy.addEventListener('click',async()=>{const p=this.viewPlan(),now=Date.now()/1000;if(!p||p.closed||p.expired||!this.last||now-this.last.epoch>5||root.AkiraManualSpikePlan.state(p,this.last.price,now)!=='available')return;try{await navigator.clipboard.writeText([this.market+' '+(p.type==='BUY'?'COMPRA':'VENTA'),...['entry','sl','tp1','tp2','tp3'].map(k=>k.toUpperCase()+': '+p[k].toFixed(this.app.getMarketDecimals(this.market)))].join('\n'));copy.textContent='Precios copiados';}catch(_){details.open=true;}});const edit=el('button','Ajustar SL / TP');edit.id='manualEditOpen';edit.type='button';edit.addEventListener('click',()=>{const outer=document.getElementById('simpleTradingDetails');if(outer)outer.open=true;details.open=true;editor.open=true;editor.scrollIntoView({block:'nearest',behavior:'smooth'});});card.append(copy,edit,details);
   anchor.after(card);this.interval ||= setInterval(()=>this.render(),1000);
   if(!this.loading){this.loading=true;fetch('./research/tick-probability-v1.json?v=20261103').then(r=>{if(!r.ok)throw Error();return r.json();}).then(m=>{this.model=m;}).catch(()=>{this.modelError=true;});}
   this.render();
  }
  dailyLocked(){
   const day=e=>new Date(e*1000).toLocaleDateString('en-CA',{timeZone:'America/Bogota'}),today=day(Date.now()/1000);let net=0,balance=null;
   for(const p of this.journal){const z=p.sizing,t=p.simulation,v=t?.scenarios?.[t.selectedTarget];if(!z?.lot||!Number.isFinite(v?.exitPrice)||!Number.isFinite(v?.exitEpoch)||day(v.exitEpoch)!==today)continue;balance??=z.balance;const delta=(v.exitPrice-t.entry)*(p.type==='BUY'?1:-1);net+=(delta*(delta>=0?z.priceValueProfitPerLot:z.priceValueLossPerLot)-z.costPerLot)*z.lot;}
   return balance!==null&&net<=-.02*balance;
  }
  start(){
   if(!this.plan||!this.last||this.tracking||this.plan.expired||this.plan.closed||this.dailyLocked())return;
   const api=root.AkiraManualSpikePlan,now=Date.now()/1000;
   if(now<this.last.epoch||now-this.last.epoch>5||this.last.epoch<this.plan.signalEpoch+5||api.state(this.plan,this.last.price,now)!=='available')return;
   this.plan.sizing=api.sizePlan({...this.plan,entry:this.last.price},this.plan.sizing?.balance||50,this.plan.specification);
   this.tracking=api.startTracking(this.plan,this.last.price,this.last.epoch);this.plan.simulation=this.tracking;this.save();this.render();
  }
  render(){const card=document.getElementById('manualSpikeCard');if(!card)return;card.hidden=!supported(this.app.selectedMarket);const extra=document.getElementById('manualSpikeDetails');if(extra)extra.hidden=card.hidden;if(card.hidden)return;
   const now=Date.now()/1000,live=this.last&&now>=this.last.epoch&&now-this.last.epoch<=5,p=this.viewPlan(),api=root.AkiraManualSpikePlan;
   const editor=document.getElementById('manualLevelEditor');if(editor)editor.hidden=!p;
   if(p&&this.levelInputs&&this.editorPlanId!==p.id){this.editorPlanId=p.id;for(const[k,n]of Object.entries(this.levelInputs))n.value=String(p[k]);const m=document.getElementById('manualEditMessage');if(m)m.textContent='';}
   const probability=document.getElementById('manualSpikeProbability');probability.textContent=this.practiceMode==='regular'?'Modo demo por zonas extremas. No se asigna un porcentaje de acierto.':live&&this.prediction?`Estimación experimental: próximo minuto ${(this.prediction.within60*100).toFixed(0)} % · próximos 5 min ${(this.prediction.within300*100).toFixed(0)} %. Probabilidad de salto, no de ganar.`:'Probabilidad: preparando datos o sin estimación disponible.';
   const state=p&&live&&!p.closed&&!p.expired?api.state(p,this.last.price,now):'paused';
   const edit=document.getElementById('manualEditOpen');if(edit)edit.hidden=!p;const copy=document.getElementById('manualCopyAll');if(copy){copy.hidden=!p;copy.disabled=state!=='available';}
   document.getElementById('manualSpikeStatus').textContent=!live?'Esperando precios recientes.':this.dailyLocked()?'Pausa de práctica: pérdida diaria simulada del 2 % alcanzada.':!p?(this.practiceMode==='regular'?'Demo de spikes · esperando zona extrema y RSI. Revisa cada cierre M1; requiere 240 velas completas del historial.':this.market==='BOOM300N'?'Boom 300 · candidata de compras M1. Esperando tendencia y retroceso; sesión 08:00–16:00 Colombia, con calentamiento.':'Buscando condiciones por ticks. No hay una entrada disponible.'):p.closed?'Seguimiento interrumpido: recorrido incompleto.':state==='available'?`Entrada experimental ${p.type==='BUY'?'COMPRA':'VENTA'} · ${this.market} · ${new Date(p.signalEpoch*1000).toLocaleTimeString()} · válida ${Math.max(0,Math.ceil(p.signalEpoch+20-now))} s`:(this.active()?'Aviso vencido para entrar; el seguimiento del aviso continúa.':'Entrada vencida: no entrar tarde. Niveles conservados para revisar.');
   const levels=document.getElementById('manualSpikeLevels');const signature=p?`${p.id}:${state}:${p.sl}:${p.tp1}:${p.tp2}:${p.tp3}`:'none';
   if(levels.dataset.signature!==signature){levels.dataset.signature=signature;levels.replaceChildren();if(p)for(const[k,label]of [['entry','Entrada'],['sl','SL'],['tp1','TP1'],['tp2','TP2'],['tp3','TP3']]){const value=p[k].toFixed(this.app.getMarketDecimals(this.market));levels.append(el('span',`${label}: ${value}`));const b=el('button','Copiar '+label);b.type='button';b.disabled=state!=='available';b.addEventListener('click',async()=>{try{if(p.closed||p.expired||!this.last||Date.now()/1000-this.last.epoch>5||api.state(p,this.last.price,Date.now()/1000)!=='available')return;await navigator.clipboard.writeText(value);b.textContent='Copiado';}catch(_){b.textContent='Selecciona el precio';}});levels.append(b);}}
   const size=p?.sizing||null;
   const distance=p?Math.abs(p.entry-p.sl):null,spec=p?.specification;
   const distanceText=distance===null?'':` Distancia al SL: ${distance.toFixed(this.app.getMarketDecimals(this.market))} en precio`+(spec?.pipSize>0?` (${(distance/spec.pipSize).toFixed(1)} pips según tu especificación).`:'.');
   document.getElementById('manualSpikeRisk').textContent=`Presupuesto de riesgo: $${((size?.balance||this.app.accountSize||50)*.01).toFixed(2)} (1 %). `+(size?.lot?`Lote: ${size.lot} · pérdida planificada $${size.plannedLoss.toFixed(2)} · objetivos netos estimados: TP1 $${size.netTargets.tp1.toFixed(2)}, TP2 $${size.netTargets.tp2.toFixed(2)}, TP3 $${size.netTargets.tp3.toFixed(2)}. No son ganancias garantizadas.`:(size?.reason||'Lote pendiente de especificaciones MT5.'))+' El cierre real puede superar el riesgo planificado.';
   const labels={tracking:'en seguimiento',target:'objetivo alcanzado',stop:'stop alcanzado',time_exit:'plazo agotado',data_gap:'datos incompletos'};
   document.getElementById('manualSpikeRisk').textContent+=distanceText+(p?.customLevels?' Ajustes personales: el lote estimado se recalcula; el historial conserva los niveles originales.':'');
   document.getElementById('manualSpikeOutcome').textContent=this.tracking?'Seguimiento hipotético del aviso, no resultado MT5: '+Object.entries(this.tracking.scenarios).map(([k,s])=>`${k.toUpperCase()}: ${labels[s.status]||s.status}`).join(' · '):'TP1, TP2 y TP3 son alternativas; no se suman. Ninguna configuración tiene rentabilidad acreditada.';
  }
  draw(ctx,getY,width,view={}){
   const p=this.viewPlan();if(!p||p.marketId!==this.app.selectedMarket||this.app.showLevels===false)return;
   const x=view.entryX,height=view.height||ctx.canvas.height;
   if(!Number.isFinite(x)||x<0||x>width)return;
   const live=this.last&&Date.now()/1000-this.last.epoch<=5;
   const valid=live&&!p.expired&&!p.closed&&root.AkiraManualSpikePlan.state(p,this.last.price,Date.now()/1000)==='available';
   ctx.save();ctx.beginPath();ctx.rect(0,0,width,height);ctx.clip();ctx.font='bold 11px sans-serif';ctx.textAlign='left';ctx.textBaseline='alphabetic';
   ctx.globalAlpha=valid?1:.65;
   const entryY=getY(p.entry),slY=getY(p.sl),tpY=getY(p.tp3);
   ctx.fillStyle='rgba(244,63,94,.10)';ctx.fillRect(x,Math.min(entryY,slY),width-x,Math.abs(entryY-slY));
   ctx.fillStyle='rgba(16,185,129,.09)';ctx.fillRect(x,Math.min(entryY,tpY),width-x,Math.abs(entryY-tpY));
   const rows=[['entry','#e2e8f0','Entrada'],['sl','#fb7185','SL'],['tp1','#34d399','TP1'],['tp2','#2dd4bf','TP2'],['tp3','#38bdf8','TP3']].map(([key,color,label])=>({key,color,label,y:getY(p[key])})).sort((a,b)=>a.y-b.y);
   let previous=5;for(let i=0;i<rows.length;i++){const r=rows[i];r.labelY=Math.max(previous,Math.min(height-24-(rows.length-1-i)*23,r.y-10));previous=r.labelY+23;}
   for(const r of rows){const text=r.label+' '+p[r.key].toFixed(this.app.getMarketDecimals(this.market))+(p.customLevels&&r.key!=='entry'?' *':''),boxW=Math.min(width-8,ctx.measureText(text).width+16),left=width-boxW-4;
    ctx.strokeStyle=r.color;ctx.fillStyle=r.color;ctx.lineWidth=r.key==='entry'?2:1;ctx.setLineDash(r.key==='entry'?[]:[5,4]);ctx.beginPath();ctx.moveTo(x,r.y);ctx.lineTo(width,r.y);ctx.stroke();ctx.setLineDash([]);
    ctx.beginPath();ctx.moveTo(left,r.y);ctx.lineTo(left,r.labelY+10);ctx.stroke();ctx.fillStyle='#101827';ctx.fillRect(left,r.labelY,boxW,21);ctx.strokeRect(left,r.labelY,boxW,21);ctx.fillStyle=r.color;ctx.fillText(text,left+7,r.labelY+14);
   }
   if(this.app.showSniper!==false){ctx.font='bold 18px sans-serif';ctx.fillStyle=valid?'#34d399':'#94a3b8';ctx.fillText('✓',Math.max(3,x-8),Math.max(20,Math.min(height-30,entryY+(p.type==='BUY'?25:-16))));ctx.font='bold 11px sans-serif';ctx.fillText((p.type==='BUY'?'COMPRA':'VENTA')+(valid?'':' · vencida'),Math.max(4,Math.min(x,width-125)),Math.max(14,Math.min(height-12,entryY+(p.type==='BUY'?40:-30))));}
   ctx.restore();
  }
 }
 root.AkiraManualSpikeUI={Controller};
})(typeof window!=='undefined'?window:globalThis);
