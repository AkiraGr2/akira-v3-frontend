(function(root){
  "use strict";
  const VERSION="market-specific-research-v2";
  const FAMILIES=Object.freeze(["trend_pullback","range_reversion","momentum_breakout"]);
  // Policies are explicit hypotheses, not fitted winners. Unknown products fail closed.
  const PROFILES=Object.freeze({
    forex:Object.freeze({id:"forex",label:"Forex · retroceso o rango",families:Object.freeze(["trend_pullback","range_reversion"]),description:"EUR/USD, GBP/USD y USD/JPY: retroceso EMA/RSI con tendencia M5, o regreso a Bollinger cuando ADX indica rango. Ventana fija 07:00–17:00 UTC entre semana; no representa sesiones ajustadas al horario de verano. Salida TP1, stop o 5 minutos. Sin filtro automático de noticias."}),
    gold:Object.freeze({id:"gold",label:"Oro · ruptura confirmada",families:Object.freeze(["momentum_breakout"]),description:"XAU/USD: cierre que rompe las 20 velas anteriores, a favor de EMA20/50 M5 y ADX ≥ 25. Vela entre 0,8 y 1,8 ATR; descarta movimientos ya extendidos. Ventana fija 12:00–17:00 UTC entre semana. TP1 a 1,5R, stop o 3 minutos. No hay calendario de noticias integrado."}),
    crypto:Object.freeze({id:"crypto",label:"Criptomonedas · continuación",families:Object.freeze(["trend_pullback","momentum_breakout"]),description:"BTC/USD y ETH/USD: retroceso o ruptura a favor de tendencia M5; ADX ≥ 25, ATR entre 0,01% y 1% del precio y vela ≤ 2 ATR. Sin reversión de rango. Funciona 24/7; TP1 a 1,5R, stop o 3–5 minutos. No utiliza volumen inventado ni detecta liquidaciones."}),
    synthetic:Object.freeze({id:"synthetic",label:"Boom/Crash · rechazo a favor del spike",families:Object.freeze(["range_reversion"]),description:"Boom 1000: solo compras tras rechazo inferior; Crash 1000: solo ventas tras rechazo superior. Bollinger y RSI confirman retorno al rango, ADX M5 < 20. No entra por tiempo transcurrido ni después de una vela > 2 ATR. TP1 a 1R, stop o 3 minutos. Es una hipótesis experimental: no predice cuándo llegará un spike."}),
    unsupported:Object.freeze({id:"unsupported",label:"Sin estrategia para este producto",families:Object.freeze([]),description:"No se aplican reglas de otro mercado. Binarias requieren contrato, vencimiento y pago específicos; este motor CFD no las evalúa ni emite señales para ellas."})
  });
  function marketProfile(id){return PROFILES[({EURUSD:"forex",GBPUSD:"forex",USDJPY:"forex",XAUUSD:"gold",BTCUSDT:"crypto",ETHUSDT:"crypto",BOOM1000:"synthetic",CRASH1000:"synthetic"})[id]||"unsupported"];}
  function profileAllows(ctx,i,family,sign){
    if(!ctx.marketId)return true; // Generic mathematical fixtures only; production always supplies marketId.
    const profile=marketProfile(ctx.marketId),b=ctx.bars[i],atr=ctx.atr[i],h=ctx.hMap[i],adx=ctx.hAdx[h];
    if(!profile.families.includes(family))return false;
    const date=new Date((b.epoch+60)*1000),hour=date.getUTCHours(),day=date.getUTCDay();
    if(profile.id==="forex" && (day===0||day===6||hour<7||hour>=17))return false;
    if(profile.id==="gold" && (day===0||day===6||hour<12||hour>=17||adx<25||b.high-b.low>1.8*atr))return false;
    if(profile.id==="crypto" && (adx<25||atr/b.close<.0001||atr/b.close>.01||b.high-b.low>2*atr))return false;
    if(profile.id==="synthetic" && (sign!==(ctx.marketId==="BOOM1000"?1:-1)||b.high-b.low>2*atr))return false;
    return true;
  }
  function ema(values,n){let prior=null;return values.map(v=>{if(!Number.isFinite(v))return null;prior=prior===null?v:prior+(v-prior)*2/(n+1);return prior;});}
  function rsi(bars,n=14){const out=Array(bars.length).fill(null);let up=0,down=0;for(let i=1;i<bars.length;i++){const d=bars[i].close-bars[i-1].close;if(i<=n){up+=Math.max(d,0)/n;down+=Math.max(-d,0)/n;}else{up=(up*(n-1)+Math.max(d,0))/n;down=(down*(n-1)+Math.max(-d,0))/n;}if(i>=n)out[i]=down===0?(up===0?50:100):100-100/(1+up/down);}return out;}
  function volatility(bars,n=14){const atr=Array(bars.length).fill(null),dx=Array(bars.length).fill(null),adx=Array(bars.length).fill(null);let tr=0,plus=0,minus=0,adxSum=0;
    for(let i=1;i<bars.length;i++){const a=bars[i],b=bars[i-1],u=a.high-b.high,d=b.low-a.low;const t=Math.max(a.high-a.low,Math.abs(a.high-b.close),Math.abs(a.low-b.close));const p=u>d&&u>0?u:0,m=d>u&&d>0?d:0;
      if(i<=n){tr+=t;plus+=p;minus+=m;}else{tr=tr-tr/n+t;plus=plus-plus/n+p;minus=minus-minus/n+m;}
      if(i>=n){atr[i]=tr/n;dx[i]=plus+minus>0?100*Math.abs(plus-minus)/(plus+minus):0;if(i<2*n){adxSum+=dx[i];if(i===2*n-1)adx[i]=adxSum/n;}else adx[i]=(adx[i-1]*(n-1)+dx[i])/n;}}
    return {atr,adx};}
  function validateBars(bars){if(!Array.isArray(bars)||bars.length<2)throw Error("Histórico insuficiente");for(let i=0;i<bars.length;i++){const b=bars[i];if(![b.epoch,b.open,b.high,b.low,b.close].every(Number.isFinite)||b.high<Math.max(b.open,b.close)||b.low>Math.min(b.open,b.close)||b.high<b.low||b.epoch%60!==0||(i&&b.epoch<=bars[i-1].epoch))throw Error("OHLC inválido o desordenado");}return bars;}
  function aggregateM5(bars){const result=[];let bucket=[];for(const b of bars){if(!bucket.length){if(b.epoch%300!==0)continue;bucket=[b];}else if(b.epoch===bucket.at(-1).epoch+60)bucket.push(b);else{bucket=b.epoch%300===0?[b]:[];}
    if(bucket.length===5){result.push({epoch:bucket[0].epoch,open:bucket[0].open,high:Math.max(...bucket.map(x=>x.high)),low:Math.min(...bucket.map(x=>x.low)),close:b.close});bucket=[];}}return result;}
  function buildContext(bars){validateBars(bars);const close=bars.map(b=>b.close),higher=aggregateM5(bars),hClose=higher.map(b=>b.close),hv=volatility(higher),map=[];let h=-1;
    for(let i=0;i<bars.length;i++){while(h+1<higher.length&&higher[h+1].epoch+300<=bars[i].epoch+60)h++;map.push(h);}
    const bands=close.map((_,i)=>{if(i<19)return null;const window=close.slice(i-19,i+1),mean=window.reduce((a,b)=>a+b,0)/20,sd=Math.sqrt(window.reduce((a,b)=>a+(b-mean)**2,0)/20);return {low:mean-2*sd,high:mean+2*sd};});
    return {bars,e9:ema(close,9),e20:ema(close,20),rsi:rsi(bars),atr:volatility(bars).atr,bands,higher,h20:ema(hClose,20),h50:ema(hClose,50),hAdx:hv.adx,hMap:map};}
  function setupAt(ctx,i,family){if(!FAMILIES.includes(family)||i<299||i>=ctx.bars.length)return null;const {bars}=ctx,b=bars[i],p=bars[i-1],h=ctx.hMap[i],atr=ctx.atr[i];if(h<49||!atr||bars.slice(i-4,i+1).some((x,k,a)=>k&&x.epoch-a[k-1].epoch!==60))return null;
    const up=ctx.h20[h]>ctx.h50[h],adx=ctx.hAdx[h],r=ctx.rsi[i];let sign=0,rr=1.5,hold=5;
    if(family==="trend_pullback"&&adx>=20){if(up&&p.close<=ctx.e9[i-1]&&b.close>ctx.e9[i]&&r>=50&&r<=68&&b.close-ctx.e20[i]<=atr)sign=1;else if(!up&&p.close>=ctx.e9[i-1]&&b.close<ctx.e9[i]&&r<=50&&r>=32&&ctx.e20[i]-b.close<=atr)sign=-1;}
    if(family==="range_reversion"&&adx<20&&ctx.bands[i-1]&&ctx.bands[i]){rr=1; if(p.close<ctx.bands[i-1].low&&b.close>=ctx.bands[i].low&&ctx.rsi[i-1]<35&&r>ctx.rsi[i-1])sign=1;else if(p.close>ctx.bands[i-1].high&&b.close<=ctx.bands[i].high&&ctx.rsi[i-1]>65&&r<ctx.rsi[i-1])sign=-1;}
    if(family==="momentum_breakout"&&adx>=20){hold=3;const previous=bars.slice(i-20,i),high=Math.max(...previous.map(x=>x.high)),low=Math.min(...previous.map(x=>x.low));if(b.high-b.low<=atr*2&&b.high-b.low>=atr*.8){if(up&&b.close>high&&r>=55&&r<=75)sign=1;else if(!up&&b.close<low&&r<=45&&r>=25)sign=-1;}}
    if(!sign||!profileAllows(ctx,i,family,sign))return null;if(ctx.marketId&&marketProfile(ctx.marketId).id==="synthetic")hold=3;const local=bars.slice(i-4,i+1),extreme=sign===1?Math.min(...local.map(x=>x.low)):Math.max(...local.map(x=>x.high));const risk=Math.max(atr*1.2,Math.abs(b.close-extreme)+atr*.15);if(risk>atr*2.5)return null;
    return {family,strategy:"multi_scalp_v1",type:sign===1?"BUY":"SELL",entry:b.close,sl:b.close-sign*risk,tp1:b.close+sign*risk*rr,tp2:b.close+sign*risk*2,tp3:b.close+sign*risk*3,risk,rr,maxHoldBars:hold,maxHoldSeconds:hold*60,entryWindowSeconds:20,signalCandleEpoch:b.epoch,entryEpoch:b.epoch+60,indicators:{ema9:ctx.e9[i],ema20:ctx.e20[i],rsi14:r,atr14:atr,m5Adx14:adx,m5Ema20:ctx.h20[h],m5Ema50:ctx.h50[h]},confluences:[family,"Contexto M5 cerrado",`RSI ${r.toFixed(1)} · ADX M5 ${adx.toFixed(1)}`]};}
  function costPrice(cost,multiplier=1){if(!cost||![cost.spread,cost.slippagePerSide,cost.commissionRoundTrip].every(x=>Number.isFinite(x)&&x>=0))throw Error("Costes explícitos requeridos");return (cost.spread+cost.slippagePerSide*2+cost.commissionRoundTrip)*multiplier;}
  function simulate(ctx,family,cost,lo=0,hi=ctx.bars.length,multiplier=1){const bars=ctx.bars,trades=[];let nextDecision=Math.max(299,lo),censored=0;const charge=costPrice(cost,multiplier);
    for(let i=nextDecision;i<hi-1;i++){if(i<nextDecision)continue;const s=setupAt(ctx,i,family);if(!s||costPrice(cost)/s.risk>.25)continue;const j=i+1,entry=bars[j].open,sign=s.type==="BUY"?1:-1;if(bars[j].epoch!==bars[i].epoch+60||Math.abs(entry-s.entry)>s.risk*.25||(entry-s.sl)*sign<=0||(s.tp1-entry)*sign<=0)continue;
      const deadline=bars[j].epoch+s.maxHoldSeconds,risk=Math.abs(entry-s.sl);let exit=null;
      for(let k=j;k<hi;k++){const b=bars[k],stop=sign===1?b.low<=s.sl:b.high>=s.sl,target=sign===1?b.high>=s.tp1:b.low<=s.tp1;let price=null,outcome="";
        if(b.epoch>=deadline){price=b.open;outcome="TIME_EXIT_GAP";}else if(stop){price=sign===1?Math.min(s.sl,b.open):Math.max(s.sl,b.open);outcome=target?"AMBIGUOUS_STOP_FIRST":"STOP";}else if(target){price=s.tp1;outcome="TARGET";}else if(b.epoch+60>=deadline){price=b.close;outcome="TIME_EXIT";}
        if(price!==null){exit={decisionIndex:i,entryIndex:j,exitIndex:k,entryEpoch:bars[j].epoch,exitEpoch:Math.min(b.epoch+60,Math.max(b.epoch,deadline)),type:s.type,entry,stop:s.sl,target:s.tp1,exit:price,grossR:(price-entry)*sign/risk,costR:charge/risk,outcome};exit.netR=exit.grossR-exit.costR;break;}}
      if(!exit){censored++;break;}trades.push(exit);nextDecision=exit.exitIndex+2; // two complete closes before another entry
    }return {trades,censored};}
  function summarize(trades){const n=trades.length;let sum=0,peak=0,dd=0,win=0,loss=0,wins=0;for(const t of trades){sum+=t.netR;peak=Math.max(peak,sum);dd=Math.max(dd,peak-sum);if(t.netR>0){win+=t.netR;wins++;}else loss-=t.netR;}
    return {trades:n,winRate:n?wins/n:null,expectancyR:n?sum/n:null,netR:sum,profitFactor:loss?win/loss:win?null:0,maxDrawdownR:dd,meanCostR:n?trades.reduce((s,t)=>s+t.costR,0)/n:null,days:new Set(trades.map(t=>Math.floor(t.entryEpoch/86400))).size};}
  function dailyBootstrapLower(trades,alpha=.00625){const groups=new Map();for(const t of trades){const day=Math.floor(t.entryEpoch/86400);if(!groups.has(day))groups.set(day,[]);groups.get(day).push(t.netR);}const days=[...groups.values()];if(days.length<10)return null;let seed=2718281829;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const means=[];for(let k=0;k<2000;k++){let sum=0,n=0;for(let j=0;j<days.length;j++){const sample=days[Math.floor(rand()*days.length)];sum+=sample.reduce((a,b)=>a+b,0);n+=sample.length;}means.push(sum/n);}means.sort((a,b)=>a-b);return means[Math.floor(alpha*means.length)];}
  function validateMarket(bars,options){const ctx=buildContext(bars),a=Math.floor(bars.length*.5),b=Math.floor(bars.length*.75),cost=options.cost;
    ctx.marketId=options.marketId;
    const profile=marketProfile(options.marketId);
    const training=profile.families.map(family=>({family,...summarize(simulate(ctx,family,cost,0,a).trades)}));
    const ranked=training.filter(s=>s.trades>=30).sort((x,y)=>(y.expectancyR??-Infinity)-(x.expectancyR??-Infinity));
    const selected=ranked[0]?.family||null;
    const reasons=[];let validation=null,holdout=null,stress=null,lower=null;
    if(selected){validation=summarize(simulate(ctx,selected,cost,a,b).trades);const held=simulate(ctx,selected,cost,b,bars.length).trades;holdout=summarize(held);stress=summarize(simulate(ctx,selected,cost,b,bars.length,2).trades);lower=dailyBootstrapLower(held);
      if(!(ranked[0].expectancyR>0))reasons.push("Selección inicial con expectativa no positiva");
      if(validation.trades<30||holdout.trades<30)reasons.push("Muestra posterior insuficiente: mínimo 30 operaciones por tramo");
      if(!(validation.expectancyR>0&&holdout.expectancyR>0))reasons.push("Expectativa neta no positiva en validación o prueba final");
      if(!(validation.profitFactor>=1.2&&holdout.profitFactor>=1.2))reasons.push("Factor de beneficio posterior inferior a 1.20");
      if(holdout.days<10||lower===null)reasons.push("Prueba final con menos de diez días operados");
      else if(lower<=0)reasons.push("Límite inferior por bloques diarios no positivo");
      if(!(stress.expectancyR>0))reasons.push("No supera costes duplicados");
      if(holdout.maxDrawdownR>10)reasons.push("Caída máxima de prueba superior a 10R");
    }else reasons.push("Ninguna familia con 30 operaciones de selección");
    const statisticalPass=selected!==null&&reasons.length===0;
    if(cost.verified!==true)reasons.push("Costes son escenarios; falta spread/comisión real del broker");
    const historicalCandidate=statisticalPass&&cost.verified===true;
    reasons.push("Falta prueba prospectiva demo independiente; no habilita recomendaciones");
    return {marketId:options.marketId,profileId:profile.id,profileLabel:profile.label,version:VERSION,bars:bars.length,from:bars[0].epoch,to:bars.at(-1).epoch,cost,training,selected,selectedBy:"Mayor expectativa de entrenamiento; sin reoptimizar después",validation,holdout,stress,bootstrapLowerR:lower,statisticalPass,historicalCandidate,eligibleForAlerts:false,reasons,split:{trainingEnd:a,validationEnd:b},assumptions:["Entrada en apertura de la vela siguiente, no en un precio retrospectivo", "M5 solo cerrado; stop primero en velas ambiguas", "Costes en unidades de precio: spread + dos deslizamientos + comisión", "Sin volumen real ni orden book; no se inventan", "La selección compara solo familias permitidas por mercado; bootstrap diario con alfa 0.05/8", "La prueba final nunca elige ni reajusta parámetros", "Simulación de señales; no aplica el cortacircuito diario del saldo local"]};}
  const api={VERSION,FAMILIES,PROFILES,marketProfile,profileAllows,ema,rsi,volatility,validateBars,aggregateM5,buildContext,setupAt,costPrice,simulate,summarize,dailyBootstrapLower,validateMarket};root.AkiraScalpResearchCore=api;if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:this);
