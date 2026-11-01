'use strict';
// Existing data are exploratory. Nothing in this report authorizes real orders.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const api=require('../js/akira_spike_anticipation'),core=require('../js/akira_scalp_research_core');
const dir=process.argv[2]||path.resolve(__dirname,'../../.akira-market-research/spike-ticks-v1/data');
const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
function stats(rows,cost=0){const trades=rows.filter(s=>Number.isFinite(s.resultR)&&!s.hadDataGap),r=trades.map(s=>s.resultR-cost);let equity=0,peak=0,dd=0;for(const v of r){equity+=v;peak=Math.max(peak,equity);dd=Math.max(dd,peak-equity);}return {signals:rows.length,trades:r.length,cancelled:rows.filter(s=>s.resultR===null).length,unresolved:rows.filter(s=>!s.completedAt||s.hadDataGap).length,winRate:r.length?r.filter(x=>x>0).length/r.length:null,netR:equity,expectancyR:r.length?equity/r.length:null,maxDrawdownR:dd};}
function run(ticks,candidates,delay){let active=null,next=0,lastExit=-Infinity;const rows=[];for(const [epoch,price] of ticks){if(active){api.advance(active,price,epoch);if(active.completedAt){lastExit=epoch;active=null;}}
  while(next<candidates.length&&candidates[next].signalEpoch<=epoch){const c=candidates[next++];if(active||epoch<lastExit+120||epoch>c.signalEpoch+20)continue;active={...c,latencySeconds:delay};rows.push(active);api.advance(active,price,epoch);if(active.completedAt){lastExit=epoch;active=null;}}}return rows;}
let seed=20261101;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const days=[],excluded=[];
for(const file of manifest.files){
  const raw=fs.readFileSync(path.join(dir,file.name));
  const data=JSON.parse(raw);
  if(crypto.createHash('sha256').update(JSON.stringify(data.ticks)).digest('hex')!==file.sha256)throw Error('Hash mismatch: '+file.name);
  if(!data.quality.complete||data.quality.maxGap>5){excluded.push(file.name);continue;}
  const bars=[],setups=[],controls=[];let last=null;
  for(const [epoch,price] of data.ticks){const bucket=Math.floor(epoch/60)*60;
    if(!last||bucket>last.epoch){
      if(last){bars.push(last);const hour=new Date(bucket*1000).getUTCHours();if(hour>=13&&epoch<=data.end-321&&bars.length>=75){
        const signal=api.setup(bars,data.symbol,core);if(signal)setups.push(signal);
        const atr=core.volatility(bars.slice(-180)).atr.at(-1),sign=data.symbol.startsWith('BOOM')?1:-1;
        if(atr>0)controls.push({id:'control:'+bucket,version:api.VERSION,marketId:data.symbol,signalEpoch:bucket,type:sign===1?'BUY':'SELL',status:'available',entry:last.close,risk:2*atr,sl:last.close-sign*2*atr,tp1:last.close+sign*3*atr});
      }}last={epoch:bucket,open:price,high:price,low:price,close:price};
    }else{last.close=price;last.high=Math.max(last.high,price);last.low=Math.min(last.low,price);}
  }
  const row={day:data.day,marketId:data.symbol,models:{}};
  for(const model of ['zone_rsi','zone_divergence','combined']){
    const candidates=setups.filter(s=>model==='combined'||s.causes.includes(model));
    const shuffled=controls.map(c=>({c,r:random()})).sort((a,b)=>a.r-b.r).slice(0,candidates.length).map(x=>x.c).sort((a,b)=>a.signalEpoch-b.signalEpoch);
    row.models[model]={};
    for(const latency of [5,10,20]){const trades=run(data.ticks,candidates,latency),baseline=run(data.ticks,shuffled,latency);
      row.models[model][latency]={gross:stats(trades),cost025:stats(trades,.25),cost050:stats(trades,.5),randomControl:stats(baseline,.25),trades};
    }
  }
  days.push(row);
}
const summary=[];
for(const marketId of manifest.symbols)for(const model of ['zone_rsi','zone_divergence','combined'])for(const latency of [5,10,20]){
  const subset=days.filter(d=>d.marketId===marketId),trades=subset.flatMap(d=>d.models[model][latency].trades);
  summary.push({marketId,model,latency,days:subset.length,signalsPerDay:subset.length?trades.length/subset.length:0,gross:stats(trades),cost025:stats(trades,.25),cost050:stats(trades,.5),daysWith8Signals:subset.filter(d=>d.models[model][latency].gross.signals>=8).length});
}
const report={version:api.VERSION,generatedAt:new Date().toISOString(),eligibleForAlerts:false,exploratory:true,forwardDemoVerified:false,brokerCostsVerified:false,session:'08:00â€“16:00 America/Bogota',source:'Deriv reference ticks; not MT5 bid/ask',excluded,summary,days,limitations:['Previously examined history is development data, not an independent holdout.','0.25R and 0.50R are hypothetical round-trip costs, not observed broker fees.','Per-market opportunities overlap; totals are not a feasible single-position portfolio.','Random controls match attempted candidate counts and holding/risk rules; realized counts can differ after cooldown.','Prospective validation still requires 14 sessions and 100 trades.']};
fs.writeFileSync(path.resolve(dir,'../anticipation-v1-trades.json'),JSON.stringify(days)+'\n');
for(const day of days)for(const model of Object.values(day.models))for(const [latency,result] of Object.entries(model))model[latency]={signals:result.gross.signals,trades:result.gross.trades,netR025:result.cost025.netR,randomTrades:result.randomControl.trades,randomNetR025:result.randomControl.netR};
fs.writeFileSync(path.resolve(__dirname,'../research/anticipation-exploratory.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({files:days.length,excluded:excluded.length,summary:summary.filter(r=>r.latency===5&&r.model==='combined')},null,2));
