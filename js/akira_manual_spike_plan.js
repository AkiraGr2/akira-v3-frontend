(function(root){
  'use strict';
  const VERSION='manual-spike-plan-v1';
  const MARKETS=new Set(['BOOM300N','CRASH300N','BOOM300','CRASH300','BOOM500','CRASH500','BOOM1000','CRASH1000']);
  const TARGETS=Object.freeze(['tp1','tp2','tp3']);
  const finite=n=>typeof n==='number'&&Number.isFinite(n);
  const positive=n=>finite(n)&&n>0;
  const nonnegative=n=>finite(n)&&n>=0;
  function median(a){const b=a.slice().sort((x,y)=>x-y);return (b[(b.length-1)>>1]+b[b.length>>1])/2;}
  function makePlan(input={}){
    const {marketId,price,epoch,bars,changes,spec}=input;
    if(!MARKETS.has(marketId)||!positive(price)||!positive(epoch)||!Array.isArray(bars)||!Array.isArray(changes)||changes.length<300)return null;
    const deltas=changes.slice(-300);
    if(!deltas.every(finite))return null;
    // Never use the current forming candle or a future candle for risk.
    const closed=bars.filter(b=>b&&finite(b.epoch)&&b.epoch+60<=epoch).slice(-20);
    if(closed.length!==20||closed.some((b,i)=>!positive(b.high)||!positive(b.low)||b.high<b.low||(i&&b.epoch!==closed[i-1].epoch+60))||epoch-closed.at(-1).epoch>=120)return null;
    const medianTick=median(deltas.map(Math.abs)),medianRange=median(closed.map(b=>b.high-b.low));
    const validSpec=spec?.verified===true&&spec.source==='user_mt5_specification'&&spec.marketId===marketId&&spec.currency==='USD'&&finite(spec.verifiedAt)&&spec.verifiedAt<=epoch&&epoch-spec.verifiedAt<=7*86400;
    const minimum=validSpec&&nonnegative(spec.minStopDistance)?spec.minStopDistance:0;
    let risk=Math.max(120*medianTick,1.5*medianRange,minimum);
    if(!positive(risk))return null;
    if(validSpec&&positive(spec.tickSize))risk=Math.ceil(risk/spec.tickSize-1e-10)*spec.tickSize;
    const sign=marketId.startsWith('BOOM')?1:-1;
    const sl=price-sign*risk,tp1=price+sign*risk,tp2=price+sign*2*risk,tp3=price+sign*3*risk;
    if(![sl,tp1,tp2,tp3].every(positive))return null;
    return Object.freeze({id:`${VERSION}:${marketId}:${epoch}`,version:VERSION,strategy:VERSION,marketId,type:sign===1?'BUY':'SELL',
      signalEpoch:epoch,entry:price,sl,tp1,tp2,tp3,risk,entryValidUntil:(epoch+20)*1000,maxHoldSeconds:300,
      selectedTarget:TARGETS.includes(input.selectedTarget)?input.selectedTarget:'tp1',
      medianTick,medianRange,experimental:true,executionMode:'manual',eligibleForOrders:false});
  }
  function makeBoom300Candidate({marketId,bars,epoch,selectedTarget='tp1'}={},core){
    if(marketId!=='BOOM300N'||!core||!finite(epoch)||!Array.isArray(bars))return null;
    const midnight=Math.floor(epoch/86400)*86400;
    if(epoch<midnight+13*3600||epoch>midnight+21*3600-321)return null;
    const closed=bars.filter(b=>b.epoch>=midnight+11*3600&&b.epoch+60<=epoch);
    if(closed.length<200||epoch-closed.at(-1).epoch-60>5)return null;
    if(closed.some((b,i)=>![b.open,b.high,b.low,b.close].every(positive)||b.high<Math.max(b.open,b.close)||b.low>Math.min(b.open,b.close)||(i&&b.epoch!==closed[i-1].epoch+60)))return null;
    const i=closed.length-1,b=closed[i],ema=core.ema(closed.map(x=>x.close),200)[i],rsi=core.rsi(closed)[i],atr=core.volatility(closed).atr[i];
    if(!(atr>0&&b.close>ema&&rsi<30&&b.close<b.open&&b.high-b.low<=atr))return null;
    const risk=2*atr,entry=b.close,signalEpoch=b.epoch+60;
    if(entry-risk<=0)return null;
    return {id:`boom300-ema-rsi-v1:${signalEpoch}`,version:'boom300-ema-rsi-v1',strategy:'boom300-ema-rsi-v1',marketId,type:'BUY',signalEpoch,entry,risk,sl:entry-risk,tp1:entry+1.5*risk,tp2:entry+2*risk,tp3:entry+3*risk,entryValidUntil:(signalEpoch+20)*1000,maxHoldSeconds:300,selectedTarget:TARGETS.includes(selectedTarget)?selectedTarget:'tp1',experimental:true,executionMode:'manual',eligibleForOrders:false};
  }
  function makeRegularDemoPlan({marketId,bars,epoch,selectedTarget='tp1'}={},core){
    if(!/^(BOOM|CRASH)(300N|500|1000)$/.test(marketId)||!core||!finite(epoch)||!Array.isArray(bars))return null;
    const closed=bars.filter(b=>b&&finite(b.epoch)&&b.epoch+60<=epoch).slice(-240);
    if(closed.length<240||epoch-closed.at(-1).epoch-60>5)return null;
    if(closed.some((b,i)=>![b.open,b.high,b.low,b.close].every(positive)||b.high<Math.max(b.open,b.close)||b.low>Math.min(b.open,b.close)||b.epoch%60!==0||(i&&b.epoch!==closed[i-1].epoch+60)))return null;
    const higher=core.aggregateM5(closed).slice(-12);if(higher.length!==12)return null;
    const low=Math.min(...higher.map(b=>b.low)),high=Math.max(...higher.map(b=>b.high)),i=closed.length-1,b=closed[i];
    const rsi=core.rsi(closed)[i],atr=core.volatility(closed).atr[i],buy=marketId.startsWith('BOOM');
    if(!(high>low&&atr>0&&finite(rsi)))return null;
    const position=(b.close-low)/(high-low);
    if(buy?position>.2||rsi>20:position<.8||rsi<80)return null;
    const sign=buy?1:-1,entry=b.close,risk=2*atr,signalEpoch=b.epoch+60;
    const sl=entry-sign*risk,tp1=entry+sign*1.5*risk,tp2=entry+sign*2*risk,tp3=entry+sign*3*risk;
    if(![sl,tp1,tp2,tp3].every(positive))return null;
    return {id:`spike-regular-demo-v1:${marketId}:${signalEpoch}`,version:'spike-regular-demo-v1',strategy:'spike-regular-demo-v1',marketId,type:buy?'BUY':'SELL',signalEpoch,entry,risk,sl,tp1,tp2,tp3,entryValidUntil:(signalEpoch+20)*1000,maxHoldSeconds:300,selectedTarget:TARGETS.includes(selectedTarget)?selectedTarget:'tp1',experimental:true,executionMode:'manual',eligibleForOrders:false};
  }
  function state(plan,price,epoch){
    if(!plan||!positive(price)||!finite(epoch)||epoch<plan.signalEpoch)return 'unavailable';
    if(epoch>plan.signalEpoch+20)return 'expired';
    if(Math.abs(price-plan.entry)>.2*plan.risk+1e-10)return 'cancelled_price';
    return 'available';
  }
  function sizePlan(plan,balance=50,spec){
    const result={balance,riskPercent:1,riskBudget:positive(balance)?balance*.01:null,lot:null,plannedLoss:null,plannedRiskPercent:null,
      margin:null,netTargets:null,status:'pending_spec',reason:'Faltan especificaciones y costes verificables del contrato MT5.',executionMode:'manual',guaranteedMaximumLoss:false};
    if(!plan||!positive(balance)){result.status='invalid';result.reason='Saldo o preparación no válido.';return result;}
    const requiredPositive=['tickSize','tickValueLoss','tickValueProfit','minLot','lotStep','maxLot'];
    const requiredNonnegative=['minStopDistance','spreadPrice','slippagePrice','roundTripCommissionPerLot','marginPerLot'];
    if(spec?.verified!==true||spec.source!=='user_mt5_specification'||spec.currency!=='USD'||spec.marketId!==plan.marketId||!requiredPositive.every(k=>positive(spec[k]))||!requiredNonnegative.every(k=>nonnegative(spec[k]))||spec.maxLot<spec.minLot||!finite(spec.verifiedAt)||spec.verifiedAt>plan.signalEpoch||plan.signalEpoch-spec.verifiedAt>7*86400)return result;
    const distance=Math.abs(plan.entry-plan.sl);
    if(distance+1e-10<spec.minStopDistance){result.status='invalid_stop';result.reason='El stop no cumple la distancia mínima del contrato.';return result;}
    const lossPerLot=(distance+spec.spreadPrice+spec.slippagePrice)/spec.tickSize*spec.tickValueLoss+spec.roundTripCommissionPerLot;
    if(!positive(lossPerLot))return result;
    const raw=Math.min(result.riskBudget/lossPerLot,spec.maxLot);
    // Volumes are multiples of the broker step. Never round upward to reach a minimum.
    let lot=Math.floor(raw/spec.lotStep+1e-10)*spec.lotStep;
    lot=Number(lot.toPrecision(12));
    if(lot*lossPerLot>result.riskBudget+1e-10)lot=Number((lot-spec.lotStep).toPrecision(12));
    if(lot<spec.minLot-1e-10||!(lot>0)){result.status='below_minimum';result.reason='El lote mínimo supera el riesgo permitido para este saldo.';return result;}
    const margin=lot*spec.marginPerLot,availableMargin=nonnegative(spec.freeMargin)?Math.min(balance,spec.freeMargin):balance;
    if(margin>availableMargin){result.status='insufficient_margin';result.reason='El margen estimado supera el disponible.';return result;}
    const costs=(spec.spreadPrice+spec.slippagePrice)/spec.tickSize*spec.tickValueLoss+spec.roundTripCommissionPerLot;
    const netTargets=Object.fromEntries(TARGETS.map(k=>[k,(Math.abs(plan[k]-plan.entry)/spec.tickSize*spec.tickValueProfit-costs)*lot]));
    return {...result,lot,plannedLoss:lot*lossPerLot,plannedRiskPercent:lot*lossPerLot/balance*100,margin,netTargets,status:'estimated',
      reason:'Estimación con las especificaciones confirmadas; comprueba lote, margen y precios antes de colocar la operación en MT5.',
      specificationVerifiedAt:spec.verifiedAt,specificationSource:spec.source,costPerLot:costs,priceValueLossPerLot:spec.tickValueLoss/spec.tickSize,priceValueProfitPerLot:spec.tickValueProfit/spec.tickSize};
  }
  function startTracking(plan,price,epoch){
    if(state(plan,price,epoch)!=='available')return null;
    // This is a local hypothetical entry, never evidence of the user's broker execution.
    return {plan:{...plan},entry:price,fillEpoch:epoch,lastEpoch:epoch,lastPrice:price,executionMode:'local_simulation',
      selectedTarget:plan.selectedTarget,scenarios:Object.fromEntries(TARGETS.map(k=>[k,{status:'tracking',target:plan[k],resultR:null}]))};
  }
  function advanceTracking(tracking,price,epoch){
    if(!tracking||!positive(price)||!finite(epoch)||epoch<tracking.lastEpoch)return tracking;
    if(epoch===tracking.lastEpoch&&price===tracking.lastPrice)return tracking;
    const out={...tracking,scenarios:Object.fromEntries(Object.entries(tracking.scenarios).map(([k,s])=>[k,{...s}]))};
    const gap=epoch-tracking.lastEpoch>5||epoch===tracking.lastEpoch;
    const sign=tracking.plan.type==='BUY'?1:-1;
    for(const s of Object.values(out.scenarios)){
      if(s.status!=='tracking')continue;
      const finish=(status,exitPrice)=>Object.assign(s,{status,exitEpoch:epoch,exitPrice,resultR:finite(exitPrice)?(exitPrice-tracking.entry)*sign/tracking.plan.risk:null});
      if(gap)finish('data_gap',null);
      else if(sign*(price-tracking.plan.sl)<=0)finish('stop',price);
      else if(sign*(price-s.target)>=0)finish('target',s.target);
      else if(epoch>=tracking.fillEpoch+tracking.plan.maxHoldSeconds)finish('time_exit',price);
    }
    out.lastEpoch=epoch;out.lastPrice=price;return out;
  }
  function observeLevels(plan,path,price,epoch){
    if(!plan||!positive(price)||!finite(epoch)||epoch<plan.signalEpoch)return path||null;
    if(path&&path.status!=='watching')return path;
    if(path&&epoch<=path.lastEpoch)return path;
    const out=path?{...path,hits:{...path.hits}}:{status:'watching',startedAt:epoch,lastEpoch:epoch,hits:{},kind:'price_observation_not_trade'};
    if(path&&epoch-path.lastEpoch>5){out.status='interrupted';return out;}
    out.lastEpoch=epoch;const sign=plan.type==='BUY'?1:-1;
    if(sign*(price-plan.sl)<=0){out.status='stop';out.stopAt=epoch;return out;}
    for(const key of TARGETS)if(!out.hits[key]&&sign*(price-plan[key])>=0)out.hits[key]=epoch;
    if(out.hits.tp3)out.status='targets';
    return out;
  }
  const api={VERSION,makePlan,makeBoom300Candidate,makeRegularDemoPlan,sizePlan,state,startTracking,advanceTracking,observeLevels};
  root.AkiraManualSpikePlan=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
