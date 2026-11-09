'use strict';
const assert=require('node:assert/strict'),api=require('./js/akira_tick_probability');
function fixture(market='BOOM500'){const t=new api.Tracker(market),sign=market.startsWith('BOOM')?-1:1;for(let i=0;i<=300;i++)t.tick(1000+i*sign,1000+i);return t;}
let t=fixture();assert.equal(t.features(1300),null);assert.equal(t.tick(710,1301).event,true);const f=t.features(1301);assert.ok(f);assert.equal(f.values[0],0);
t.tick(709,1302);const before=t.features(1302);assert.equal(before.values[0],1/500);t.tick(709,1302);assert.deepEqual(t.features(1302),before);
assert.equal(t.tick(800,1301).accepted,false);assert.deepEqual(t.features(1302),before);
assert.equal(t.features(1308),null);t.tick(708,1310);assert.equal(t.features(1310),null);assert.equal(t.changes.length,0);
t=fixture('CRASH500');assert.ok(t.tick(1290,1301).event);assert.ok(t.features(1301));t.tick(1291,1301);assert.equal(t.features(1301),null);
t=fixture();t.tick(710,1301);const fresh=t.features(1301);t.select('BOOM500');assert.deepEqual(t.features(1301),fresh);t.select('CRASH500');assert.equal(t.features(1301),null);
const m={featureVersion:api.VERSION,means:[0,0,0,0],scales:[1,1,1,1],weights:[[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],temperature:1,classPriors:[.2,.3,.5]};
const artifact={version:api.VERSION,models:{BOOM500:m}},p=api.predict(artifact,'BOOM500',f);assert.equal(p.within60,1/3);assert.equal(p.within300,2/3);assert.equal(p.eligibleForEntry,false);assert.equal(p.probabilityOfProfit,null);
assert.equal(api.predict(artifact,'XAUUSD',f),null);assert.equal(api.predict(artifact,'BOOM500',{values:[1,NaN,2,3]}),null);
assert.equal(api.predict(artifact,'BOOM500',{values:[1,2,3,4]}),null);
assert.equal(api.predict(artifact,'BOOM500',{epoch:1301,values:{length:4}}),null);
assert.equal(api.predict({...artifact,version:'wrong'},'BOOM500',f),null);
assert.equal(api.predict({version:api.VERSION,models:{BOOM500:{...m,scales:[0,1,1,1]}}},'BOOM500',f),null);
assert.ok(api.softmax([10000,10001,10002]).every(Number.isFinite));
console.log('PASS tick probability: causal common detector, signed changes, gaps, duplicates, same-market preservation, probability coherence and fail-closed artifact');
