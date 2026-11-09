'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
let now=1800001200;const storage=new Map();
class Clock extends Date{constructor(...a){super(...(a.length?a:[now*1000]));}static now(){return now*1000;}}
const context=vm.createContext({Date:Clock,document:{getElementById:()=>null},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},console});
for(const name of ['akira_tick_probability','akira_manual_spike_plan','akira_manual_spike_ui'])vm.runInContext(fs.readFileSync('js/'+name+'.js','utf8'),context);
const app={selectedMarket:'BOOM500',accountSize:50,scalpPracticeEnabled:false,anticipationMonitor:{ready:true,bars:Array.from({length:20},(_,i)=>({epoch:now-1200+i*60,high:101,low:99}))}};
const api=context.AkiraManualSpikePlan,c=new context.AkiraManualSpikeUI.Controller(app);c.select(app.selectedMarket);
const p=api.makePlan({marketId:app.selectedMarket,price:100,epoch:now,bars:app.anticipationMonitor.bars,changes:Array(300).fill(-.01)});
c.plan={...p,sizing:api.sizePlan(p,50)};c.journal.push(c.plan);c.last={price:100,epoch:now};c.select('BOOM500');assert.equal(c.plan.entry,100);
now+=5;c.tick(100.1,now);assert.equal(c.tracking.entry,100.1);assert.equal(c.plan.sizing.lot,null);
now++;c.tick(103,now);assert.equal(c.tracking.scenarios.tp1.status,'target');assert.equal(c.tracking.scenarios.tp2.status,'tracking');
c.pause();assert.equal(c.plan.simulation.scenarios.tp1.status,'target');assert.equal(c.plan.simulation.scenarios.tp2.status,'data_gap');
app.selectedMarket='CRASH500';c.select('CRASH500');assert.equal(c.plan,null);assert.equal(c.last,null);
// Reload may never imply observation while the page was closed.
storage.set('akira_manual_spikes_v1',JSON.stringify([{id:'old',signalEpoch:now,simulation:{scenarios:{tp1:{status:'tracking'}}}}]));
const reload=new context.AkiraManualSpikeUI.Controller(app);assert.equal(reload.journal[0].simulation.scenarios.tp1.status,'data_gap');
// Daily guard uses the realized exit day, including an entry made yesterday.
reload.journal=[{id:'overnight',signalEpoch:now-86400,type:'BUY',sizing:{balance:50,lot:1,priceValueProfitPerLot:1,priceValueLossPerLot:1,costPerLot:0},simulation:{entry:100,selectedTarget:'tp1',scenarios:{tp1:{exitEpoch:now,exitPrice:99}}}}];assert.equal(reload.dailyLocked(),true);
console.log('PASS manual scanner lifecycle: M1/M5 preservation, independent outcomes, gap/reload censoring, frozen levels, no invented lot, realized daily loss');
