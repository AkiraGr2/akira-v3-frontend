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
// Plot the signal at its observed candle, not retroactively at the latest candle.
app.selectedMarket='BOOM500';app.getMarketDecimals=()=>3;c.select('BOOM500');c.plan={...p};c.last={price:100,epoch:now};
const texts=[],ctx={canvas:{height:500},save(){},restore(){},beginPath(){},rect(){},clip(){},fillRect(){},strokeRect(){},moveTo(){},lineTo(){},stroke(){},setLineDash(){},measureText:t=>({width:t.length*6}),fillText:t=>texts.push(t)};
c.draw(ctx,v=>450-(v-97)*30,320,{entryX:100,height:500});
assert.equal(texts.filter(t=>/^(Entrada|SL|TP[123]) /.test(t)).length,5);assert.ok(texts.includes('✓'));
texts.length=0;app.showLevels=false;c.draw(ctx,v=>v,320,{entryX:100,height:500});assert.equal(texts.length,0);
app.showLevels=true;c.draw(ctx,v=>v,320,{entryX:NaN,height:500});assert.equal(texts.length,0,'no marker outside the visible candle range');
console.log('PASS chart overlays: five prices, candle marker, hidden levels and no invented offscreen entry');
// Personal chart levels never rewrite the scanner's entry, expiry or simulated results.
app.showLevels=true;c.plan={...p};const original=JSON.stringify(c.plan);
assert.equal(c.editLevels({sl:90,tp1:110,tp2:120,tp3:130}),null);
assert.equal(c.viewPlan().sl,90);assert.equal(c.plan.sl,JSON.parse(original).sl);
assert.equal(c.viewPlan().risk,c.plan.risk,'Editing must not extend entry price validity');
assert.equal(c.viewPlan().signalEpoch,c.plan.signalEpoch);
assert.ok(c.editLevels({sl:101,tp1:110,tp2:120,tp3:130}));
assert.ok(c.editLevels({sl:90,tp1:120,tp2:110,tp3:130}));
assert.ok(c.editLevels({sl:NaN,tp1:110,tp2:120,tp3:130}));
texts.length=0;c.draw(ctx,v=>v,320,{entryX:100,height:500});assert.ok(texts.some(t=>t==='SL 90.000 *'));
c.market='CRASH500';app.selectedMarket=c.market;c.plan={...p,marketId:c.market,type:'SELL'};
assert.equal(c.editLevels({sl:110,tp1:90,tp2:80,tp3:70}),null);
assert.ok(c.editLevels({sl:90,tp1:110,tp2:120,tp3:130}));
console.log('PASS editable levels: directional ordering, invalid values, immutable original, chart annotations');
delete c.plan.customLevels;c.tracking={scenarios:{tp1:{status:'target'},tp2:{status:'tracking'},tp3:{status:'tracking'}}};texts.length=0;
c.draw(ctx,v=>v,320,{entryX:100,height:500});assert.ok(texts.some(t=>t.startsWith('TP1 ')&&t.endsWith(' ✓')));assert.ok(texts.some(t=>t.startsWith('TP2 ')&&!t.endsWith(' ✓')));
c.plan.customLevels={sl:110,tp1:90,tp2:80,tp3:70};texts.length=0;c.draw(ctx,v=>v,320,{entryX:100,height:500});assert.ok(texts.some(t=>t.startsWith('TP1 ')&&t.endsWith(' *')));assert.ok(!texts.some(t=>t.startsWith('TP1 ')&&t.endsWith(' ✓')));
console.log('PASS reached-target markers: simulated original targets only, custom levels never inherit results');
