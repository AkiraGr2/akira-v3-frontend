const assert=require('node:assert/strict'),core=require('./js/akira_scalp_research_core'),api=require('./js/akira_manual_spike_plan');
const start=Date.parse('2026-11-11T00:00:00Z')/1000;
const down=Array.from({length:240},(_,i)=>({epoch:start+i*60,open:100-i*.01,close:100-(i+1)*.01,high:100-i*.01+.001,low:100-(i+1)*.01-.001}));
for(const marketId of ['BOOM300N','CRASH300N','BOOM500','CRASH500','BOOM1000','CRASH1000']){
const buy=marketId.startsWith('BOOM'),bars=buy?down:down.map(b=>({...b,open:200-b.open,close:200-b.close,high:200-b.low,low:200-b.high}));
const input={marketId,bars,epoch:start+240*60},p=api.makeRegularDemoPlan(input,core);assert.ok(p,marketId);assert.equal(p.type,buy?'BUY':'SELL');assert.equal(p.eligibleForOrders,false);
const sign=buy?1:-1;assert.ok(sign*(p.entry-p.sl)>0);assert.ok(sign*(p.tp1-p.entry)>0&&sign*(p.tp2-p.tp1)>0&&sign*(p.tp3-p.tp2)>0);
assert.deepEqual(api.makeRegularDemoPlan({...input,bars:[...bars,{epoch:input.epoch,open:1,high:999,low:1,close:999}]},core),p);
assert.equal(api.makeRegularDemoPlan({...input,epoch:input.epoch+6},core),null);
assert.equal(api.makeRegularDemoPlan({...input,bars:bars.slice(1)},core),null);
assert.equal(api.makeRegularDemoPlan({...input,bars:bars.map((b,i)=>i===50?{...b,epoch:b.epoch+1}:b)},core),null);
}
for(const marketId of ['XAUUSD','EURUSD','BTCUSDT','STEP100','BOOM100'])assert.equal(api.makeRegularDemoPlan({marketId,bars:down,epoch:start+14400},core),null);
const flat=down.map(b=>({...b,open:100,close:100,high:100,low:100}));assert.equal(api.makeRegularDemoPlan({marketId:'BOOM500',bars:flat,epoch:start+14400},core),null);
console.log('PASS regular demo: all six markets, mirrored prices, closed M1/M5, gaps, warmup, stale data, future invariance, flat rejection, other markets excluded');
const vm=require('node:vm'),fs=require('node:fs');let now=start+14400;class Clock extends Date{static now(){return now*1000;}}
const ctx=vm.createContext({Date:Clock,document:{getElementById:()=>null},localStorage:{getItem:()=>null,setItem:()=>{}},console});
for(const name of ['akira_scalp_research_core','akira_tick_probability','akira_manual_spike_plan','akira_manual_spike_ui'])vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),ctx);
const app={selectedMarket:'BOOM300N',accountSize:50,scalpPracticeEnabled:true,anticipationMonitor:{ready:true,bars:down}};
const c=new ctx.AkiraManualSpikeUI.Controller(app);c.select('BOOM300N');c.tick(down.at(-1).close,now);assert.equal(c.journal.length,1);assert.equal(c.plan.strategy,'spike-regular-demo-v1');
now++;c.tick(down.at(-1).close,now);assert.equal(c.journal.length,1);now+=4;c.tick(down.at(-1).close,now);assert.ok(c.tracking);assert.equal(c.tracking.executionMode,'local_simulation');
app.selectedMarket='XAUUSD';c.select('XAUUSD');assert.equal(c.plan,null);assert.equal(c.supports(),false);
console.log('PASS controller creates a demo signal without a probability model, deduplicates, tracks manual simulation and clears on market change');
