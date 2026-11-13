(function(root){
 'use strict';
 const VERSION='turn-demo-v1',supported=id=>/^(BOOM|CRASH)(300N|500|1000)$/.test(id);
 const positive=x=>Number.isFinite(x)&&x>0;
 const median=a=>{const s=[...a].sort((a,b)=>a-b);return (s[(s.length-1)>>1]+s[s.length>>1])/2;};
 function makePlan({marketId,bars,epoch,variant='rejection',selectedTarget='tp1',eventEpochs=[],eventCoverageFrom=null}={},core){
  if(!supported(marketId)||!core||!Array.isArray(bars)||!Number.isFinite(epoch)||!['rejection','confirmation'].includes(variant))return null;
  const b=bars.filter(x=>x&&Number.isFinite(x.epoch)&&x.epoch+60<=epoch).slice(-75);
  if(b.length<65||epoch-b.at(-1).epoch-60>5||b.some((x,i)=>x.epoch%60!==0||![x.open,x.high,x.low,x.close].every(positive)||x.low>Math.min(x.open,x.close)||x.high<Math.max(x.open,x.close)||(i&&x.epoch!==b[i-1].epoch+60)))return null;
  const i=b.length-1,j=i-(variant==='confirmation'?1:0),r=b[j],current=b[i],buy=marketId.startsWith('BOOM'),sign=buy?1:-1;
  const prior=b.slice(j-20,j),low=Math.min(...prior.map(x=>x.low)),high=Math.max(...prior.map(x=>x.high));
  const ranges=b.slice(j-14,j).map((x,k)=>Math.max(x.high-x.low,Math.abs(x.high-b[j-15+k].close),Math.abs(x.low-b[j-15+k].close))),scale=median(ranges);
  if(!(scale>0))return null;
  const body=Math.abs(r.close-r.open),wick=buy?Math.min(r.open,r.close)-r.low:r.high-Math.max(r.open,r.close);
  if(wick<body||wick<.25*scale||(buy?!(r.low<low&&r.close>low):!(r.high>high&&r.close<high)))return null;
  if(variant==='confirmation'&&(buy?current.close<=r.high:current.close>=r.low))return null;
  const higher=core.aggregateM5(b.filter(x=>x.epoch+60<=r.epoch+60)).slice(-12);if(higher.length!==12)return null;
  const entry=current.close,sl=buy?Math.min(r.low,current.low)-.15*scale:Math.max(r.high,current.high)+.15*scale,risk=sign*(entry-sl);
  if(!(risk>0))return null;
  const tp1=entry+sign*risk,tp2=entry+sign*2*risk,tp3=entry+sign*3*risk;if(![sl,tp1,tp2,tp3].every(positive))return null;
  const signalEpoch=current.epoch+60;
  const priorEvents=eventEpochs.filter(t=>Number.isFinite(t)&&t>=r.epoch&&t<=epoch);
  const spikeTiming=priorEvents.length?'after_spike':Number.isFinite(eventCoverageFrom)&&eventCoverageFrom<=r.epoch?'no_prior_spike_observed':'unknown';
  return {id:`${VERSION}:${marketId}:${variant}:${signalEpoch}`,version:VERSION,strategy:VERSION,variant,marketId,type:buy?'BUY':'SELL',signalEpoch,detectedAt:epoch,rejectionEpoch:r.epoch,entry,sl,tp1,tp2,tp3,risk,entryValidUntil:(signalEpoch+20)*1000,maxHoldSeconds:300,selectedTarget:['tp1','tp2','tp3'].includes(selectedTarget)?selectedTarget:'tp1',spikeTiming,priorSpikeEpochs:priorEvents,scale,context:{support:low,resistance:high,m5Low:Math.min(...higher.map(x=>x.low)),m5High:Math.max(...higher.map(x=>x.high))},experimental:true,executionMode:'manual',eligibleForOrders:false};
 }
 const api={VERSION,makePlan};root.AkiraTurnScanner=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
