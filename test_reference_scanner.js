"use strict";
const assert=require("node:assert/strict");
const {referenceSetup}=require("./js/akira_reference_scanner");
const bars=Array.from({length:60},(_,i)=>({epoch:1800000000+i*60,open:100,high:101,low:99,close:100}));
bars[58]={...bars[58],open:100.4,high:101.5,low:100,close:100.2};
bars[59]={...bars[59],open:100.1,high:100.3,low:99.4,close:99.5};
for(const marketId of ["STEP100","XAUUSD"]){
  const options={marketId,timeframeSeconds:60},s=referenceSetup(bars,options);
  assert.equal(s.type,"SELL");assert.ok(s.stop>s.entryReference&&s.tp1<s.entryReference);
  assert.equal(s.signalEpoch,bars[59].epoch+60);
  assert.equal(referenceSetup(bars.slice(0,-1),options),null,"no signal at rejection alone");
  const mirrored=bars.map(b=>({...b,open:200-b.open,close:200-b.close,high:200-b.low,low:200-b.high}));
  assert.equal(referenceSetup(mirrored,options).type,"BUY");
  const gap=bars.map(b=>({...b}));gap[57].epoch-=60;assert.equal(referenceSetup(gap,options),null);
  const noBreak=bars.map(b=>({...b}));noBreak[59].close=100.05;assert.equal(referenceSetup(noBreak,options),null);
  assert.equal(referenceSetup([...bars,{...bars[59],epoch:bars[59].epoch+60}].slice(0,60),options).signalEpoch,s.signalEpoch,"decision uses its closed prefix");
}
assert.equal(referenceSetup(bars,{marketId:"BOOM1000",timeframeSeconds:60}),null);
assert.equal(referenceSetup(bars,{marketId:"STEP100"}),null,"no invented timeframe");
console.log("PASS reference hypothesis: rejection then confirmation, mirrored direction, closed timing, gaps, market isolation and explicit timeframe. Profitability NOT tested.");
