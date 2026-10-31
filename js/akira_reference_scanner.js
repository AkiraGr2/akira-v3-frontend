"use strict";
// Isolated reconstruction hypothesis. Not loaded by production or a broker adapter.
// Inputs must contain closed candles only; caller supplies explicit timeframe.
function referenceSetup(bars, {marketId, timeframeSeconds}={}) {
  if(!["STEP100","XAUUSD"].includes(marketId)||![60,300,900].includes(timeframeSeconds)||!Array.isArray(bars)||bars.length<60)return null;
  if(bars.some((b,i)=>![b.epoch,b.open,b.high,b.low,b.close].every(Number.isFinite)||b.low>Math.min(b.open,b.close)||b.high<Math.max(b.open,b.close)||(i&&b.epoch!==bars[i-1].epoch+timeframeSeconds)))return null;
  const i=bars.length-1,b=bars[i],reject=bars[i-1],prior=bars.slice(i-21,i-1);
  const resistance=Math.max(...prior.map(x=>x.high)),support=Math.min(...prior.map(x=>x.low));
  const atr=bars.slice(i-15,i-1).reduce((sum,c,k)=>sum+Math.max(c.high-c.low,Math.abs(c.high-bars[i-16+k].close),Math.abs(c.low-bars[i-16+k].close)),0)/14;
  if(!(atr>0))return null;
  const body=Math.abs(reject.close-reject.open),upper=reject.high-Math.max(reject.open,reject.close),lower=Math.min(reject.open,reject.close)-reject.low;
  let direction=0;
  if(reject.high>=resistance&&reject.close<resistance&&upper>=Math.max(body,atr*.25)&&b.close<reject.low&&b.close<b.open)direction=-1;
  if(reject.low<=support&&reject.close>support&&lower>=Math.max(body,atr*.25)&&b.close>reject.high&&b.close>b.open)direction=1;
  if(!direction||b.high-b.low>atr*(marketId==="XAUUSD"?1.8:2.5))return null;
  const buffer=atr*(marketId==="XAUUSD"?.25:.15),stop=direction<0?Math.max(reject.high,b.high)+buffer:Math.min(reject.low,b.low)-buffer;
  const risk=Math.abs(stop-b.close);
  if(risk<atr*.5||risk>atr*3)return null;
  return {marketId,timeframeSeconds,type:direction>0?"BUY":"SELL",signalEpoch:b.epoch+timeframeSeconds,entryReference:b.close,stop,tp1:b.close+direction*risk,tp2:b.close+direction*risk*2,tp3:b.close+direction*risk*3,resistance,support,atr,evidence:"unvalidated_reconstruction",brokerExecution:false,description:"Extremo de 20 velas, rechazo cerrado y ruptura del extremo de rechazo en la vela siguiente. No copia parámetros desconocidos de las capturas."};
}
if(typeof module!=="undefined"&&module.exports)module.exports={referenceSetup};
if(typeof window!=="undefined")window.AkiraReferenceScanner={referenceSetup};
