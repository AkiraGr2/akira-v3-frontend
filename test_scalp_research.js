"use strict";
const assert=require("node:assert/strict"),core=require("./js/akira_scalp_research_core.js");
const bars=Array.from({length:1600},(_,i)=>{const open=100+Math.sin(i/8)*.7+i*.001,close=open+Math.sin(i/3)*.05;return {epoch:1700000100+i*60,open,close,high:Math.max(open,close)+.1,low:Math.min(open,close)-.1};});
const ctx=core.buildContext(bars);
for(const i of [299,511,809,1201]){const prefix=core.buildContext(bars.slice(0,i+1));assert.equal(ctx.higher[ctx.hMap[i]].epoch+300<=bars[i].epoch+60,true,"never use incomplete M5");for(const family of core.FAMILIES)assert.deepEqual(core.setupAt(ctx,i,family),core.setupAt(prefix,i,family),"appending future bars cannot change a past setup");}
assert.equal(core.aggregateM5(bars.slice(0,4)).length,0);assert.equal(core.aggregateM5(bars.slice(0,5)).length,1);
assert.equal(core.aggregateM5([bars[0],...bars.slice(2,6)]).length,0,"a missing minute cannot form a complete M5 candle");
assert.throws(()=>core.buildContext([bars[1],bars[0]]));assert.throws(()=>core.buildContext([{...bars[0],high:0},bars[1]]));
assert.equal(core.setupAt(ctx,298,"trend_pullback"),null);
const costs={spread:.02,slippagePerSide:.005,commissionRoundTrip:.003,verified:false};
assert.ok(Math.abs(core.costPrice(costs)-.033)<1e-12);assert.throws(()=>core.costPrice(null));assert.throws(()=>core.costPrice({...costs,spread:-1}));
function fixture(){const b=Array.from({length:450},(_,i)=>({epoch:1700000100+i*60,open:100,high:100.25,low:99.75,close:100}));b[398].close=99.9;b[399]={...b[399],close:100.1};b[400]={...b[400],open:100.1,high:101,low:100,close:100.5};const c=core.buildContext(b);c.e9.fill(100);c.e20.fill(100);c.rsi.fill(55);c.atr.fill(.3);c.h20.fill(101);c.h50.fill(100);c.hAdx.fill(25);return c;}
const f=fixture(),setup=core.setupAt(f,399,"trend_pullback");assert.equal(setup.type,"BUY");assert.equal(setup.maxHoldSeconds,300);
const replay=core.simulate(f,"trend_pullback",costs,0,450);assert.equal(replay.trades.length,1);const t=replay.trades[0];assert.equal(t.decisionIndex,399);assert.equal(t.entryIndex,400,"fill only after decision candle closes");assert.equal(t.exitIndex,400);assert.equal(t.outcome,"TARGET");assert.ok(t.netR<t.grossR);
const stressed=core.simulate(f,"trend_pullback",costs,0,450,2);assert.equal(stressed.trades.length,1);assert.ok(stressed.trades[0].netR<t.netR);
const ambiguous=fixture();ambiguous.bars[400].low=99;
assert.equal(core.simulate(ambiguous,"trend_pullback",costs).trades[0].outcome,"AMBIGUOUS_STOP_FIRST");
const late=fixture();late.bars[400].open=100.5;assert.equal(core.simulate(late,"trend_pullback",costs).trades.length,0,"do not chase next-bar price gaps");
assert.equal(core.simulate(f,"trend_pullback",costs,0,400).trades.length,0,"no fills across split boundary");
assert.equal(core.simulate(f,"trend_pullback",costs,400,450).trades.length,0,"a previous-fold setup cannot enter the next fold");
const timeout=fixture();for(let i=400;i<timeout.bars.length;i++)timeout.bars[i]={...timeout.bars[i],open:100.1,close:100.1,high:100.2,low:100};
const timed=core.simulate(timeout,"trend_pullback",costs).trades[0];assert.equal(timed.outcome,"TIME_EXIT");assert.equal(timed.exitIndex,404);assert.equal(timed.grossR,0);assert.ok(timed.netR<0,"a flat trade loses its transaction costs");
const days=Array.from({length:30},(_,i)=>({entryEpoch:(20000+Math.floor(i/3))*86400,netR:1,costR:.1}));assert.equal(core.dailyBootstrapLower(days),1);assert.equal(core.dailyBootstrapLower(days.map(t=>({...t,netR:-1}))),-1);assert.equal(core.dailyBootstrapLower(days.slice(0,3)),null);
const report=core.validateMarket(bars,{marketId:"FIXTURE",cost:costs});assert.equal(report.eligibleForAlerts,false);assert.equal(report.historicalCandidate,false);assert.ok(report.reasons.some(s=>s.includes("Costes son escenarios")));assert.ok(report.reasons.some(s=>s.includes("prospectiva")));
const misleading=core.summarize([{netR:.1,costR:0},{netR:.1,costR:0},{netR:-3,costR:0}]);assert.ok(misleading.winRate>.5 && misleading.expectancyR<0,"high hit rate is not profitability");
assert.equal(core.summarize([]).winRate,null);assert.equal(core.summarize([]).expectancyR,null);
console.log("PASS: causal M1/M5 indicators, next-bar fills, explicit costs, stress, gaps, stop-first, deadlines, fold separation, sample sufficiency and blocked unverified profitability.");
// The same mathematical trigger must not leak into an incompatible market/product.
const profiled=fixture();const ix=399;
profiled.bars[ix].epoch=Date.UTC(2026,9,30,13,0)/1000;
profiled.marketId="EURUSD";
assert.ok(core.setupAt(profiled,ix,"trend_pullback")===null,"inconsistent minute sequence is rejected before policy");
assert.equal(core.profileAllows(profiled,ix,"trend_pullback",1),true);
profiled.bars[ix].epoch=Date.UTC(2026,9,31,13,0)/1000;
assert.equal(core.profileAllows(profiled,ix,"trend_pullback",1),false,"Forex weekend blocked");
profiled.bars[ix].epoch=Date.UTC(2026,9,30,20,0)/1000;
assert.equal(core.profileAllows(profiled,ix,"trend_pullback",1),false,"Forex off-hours blocked");
profiled.bars[ix].epoch=Date.UTC(2026,9,30,13,0)/1000;
profiled.marketId="XAUUSD";
assert.equal(core.profileAllows(profiled,ix,"trend_pullback",1),false,"gold never borrows Forex pullback policy");
assert.equal(core.profileAllows(profiled,ix,"momentum_breakout",1),true);
profiled.hAdx.fill(24);assert.equal(core.profileAllows(profiled,ix,"momentum_breakout",1),false);
profiled.hAdx.fill(25);profiled.marketId="BTCUSDT";
assert.equal(core.profileAllows(profiled,ix,"range_reversion",1),false);
assert.equal(core.profileAllows(profiled,ix,"trend_pullback",1),true);
profiled.atr[ix]=.0001;assert.equal(core.profileAllows(profiled,ix,"trend_pullback",1),false,"crypto dead volatility blocked");profiled.atr[ix]=.3;
profiled.marketId="BOOM1000";
assert.equal(core.profileAllows(profiled,ix,"range_reversion",-1),false,"no Boom short from generic range model");
assert.equal(core.profileAllows(profiled,ix,"range_reversion",1),true);
profiled.marketId="CRASH1000";
assert.equal(core.profileAllows(profiled,ix,"range_reversion",1),false);
assert.equal(core.profileAllows(profiled,ix,"range_reversion",-1),true);
profiled.marketId="BINARY";assert.equal(core.profileAllows(profiled,ix,"trend_pullback",1),false);
assert.equal(core.validateMarket(bars,{marketId:"BINARY",cost:costs}).selected,null);
for(const marketId of ["EURUSD","XAUUSD","BTCUSDT","BOOM1000","CRASH1000"]){
  const full=core.buildContext(bars);full.marketId=marketId;
  for(const i of [511,809,1201]){const prefix=core.buildContext(bars.slice(0,i+1));prefix.marketId=marketId;
    for(const family of core.FAMILIES)assert.deepEqual(core.setupAt(full,i,family),core.setupAt(prefix,i,family));}
  const result=core.validateMarket(bars,{marketId,cost:costs});assert.deepEqual(result.training.map(t=>t.family),core.marketProfile(marketId).families);
}
console.log("PASS: distinct market policies, direction, hours, volatility, unknown/binary refusal and causal profile replay.");
