'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const turn=require('./js/akira_turn_scanner'),core=require('./js/akira_scalp_research_core'),plans=require('./js/akira_manual_spike_plan');
const base=Date.parse('2026-11-13T00:00:00Z')/1000;
function fixture(buy=true,confirmed=false){const bars=Array.from({length:65},(_,i)=>({epoch:base+i*60,open:100,high:101,low:99,close:100}));bars[64]={epoch:base+64*60,open:100,high:100.5,low:98,close:100};if(confirmed)bars.push({epoch:base+65*60,open:100,high:101.5,low:99.8,close:101});return buy?bars:bars.map(b=>({...b,open:200-b.open,close:200-b.close,high:200-b.low,low:200-b.high}));}
for(const marketId of ['BOOM300N','CRASH300N','BOOM500','CRASH500','BOOM1000','CRASH1000'])for(const variant of ['rejection','confirmation']){
 const bars=fixture(marketId.startsWith('BOOM'),variant==='confirmation'),epoch=bars.at(-1).epoch+60,input={marketId,bars,epoch,variant,eventCoverageFrom:base},p=turn.makePlan(input,core);assert.ok(p,marketId+' '+variant);assert.equal(p.signalEpoch,epoch);assert.equal(p.eligibleForOrders,false);assert.equal(p.spikeTiming,'no_prior_spike_observed');
 const sign=marketId.startsWith('BOOM')?1:-1;assert.ok(sign*(p.entry-p.sl)>0);assert.ok(sign*(p.tp1-p.entry)>0&&sign*(p.tp2-p.tp1)>0&&sign*(p.tp3-p.tp2)>0);
 assert.deepEqual(turn.makePlan({...input,bars:[...bars,{epoch,open:1,high:1000,low:1,close:500}]},core),p);
 assert.equal(turn.makePlan({...input,epoch:epoch+6},core),null);
 assert.equal(turn.makePlan({...input,bars:bars.map((b,i)=>i===30?{...b,epoch:b.epoch+1}:b)},core),null);
 assert.equal(turn.makePlan({...input,bars:bars.slice(-30)},core),null);
 assert.equal(turn.makePlan({...input,eventEpochs:[p.rejectionEpoch+10]},core).spikeTiming,'after_spike');
 assert.equal(turn.makePlan({...input,eventCoverageFrom:null},core).spikeTiming,'unknown');
 let tracking=plans.startTracking(p,p.entry,epoch+5);tracking=plans.advanceTracking(tracking,p.tp1,epoch+6);assert.equal(tracking.scenarios.tp1.status,'target');assert.equal(tracking.scenarios.tp2.status,'tracking');
}
const bars=fixture(),epoch=bars.at(-1).epoch+60;
assert.equal(turn.makePlan({marketId:'XAUUSD',bars,epoch},core),null);
assert.equal(turn.makePlan({marketId:'BOOM500',bars,epoch,variant:'confirmation'},core),null);
assert.equal(turn.makePlan({marketId:'BOOM500',bars:bars.map(b=>({...b,low:99,high:101})),epoch},core),null);
let now=epoch;class Clock extends Date{static now(){return now*1000;}}
const storage=new Map([['akira_spike_practice_mode','turn']]);const ctx=vm.createContext({Date:Clock,document:{getElementById:()=>null},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},console});
for(const n of ['akira_scalp_research_core','akira_tick_probability','akira_manual_spike_plan','akira_turn_scanner','akira_manual_spike_ui'])vm.runInContext(fs.readFileSync('js/'+n+'.js','utf8'),ctx);
const app={selectedMarket:'BOOM500',accountSize:50,scalpPracticeEnabled:true,anticipationMonitor:{ready:true,bars}},c=new ctx.AkiraManualSpikeUI.Controller(app);c.select(app.selectedMarket);c.tick(100,now);assert.equal(c.plan.strategy,'turn-demo-v1');assert.equal(c.plan.variant,'rejection');assert.equal(c.plan.spikeTiming,'unknown');
now++;c.tick(100,now);assert.equal(c.journal.length,1);now+=4;c.tick(100,now);assert.ok(c.tracking);c.pause();assert.equal(c.plan.simulation.scenarios.tp1.status,'data_gap');
app.selectedMarket='CRASH500';c.select(app.selectedMarket);assert.equal(c.plan,null);assert.equal(c.eventCoverageFrom,null);
console.log('PASS turns: six markets, both variants, causal close timing, gaps/stale inputs, spike classification, tracking, reload preference and market reset');
