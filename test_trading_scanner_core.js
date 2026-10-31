"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const { buildSpikeScalpSetup, resolveSpikeScalpExit, findConfirmedSwings, detectHarmonicPattern, rejectionDirection, spikeCycleStats, validateEntryConditions, resolveTerminalOutcome, simulateSignalOutcomes, summarizeBacktest, validateHarmonicSequence } = require("./js/akira_trading_scanner_core.js");

function candlesFromPoints(points, length, radius) {
  const candles = Array.from({ length }, (_, index) => ({
    epoch: index * 60,
    open: 149.4,
    high: 150,
    low: 149,
    close: 149.6
  }));
  points.forEach(point => {
    candles[point.index] = {
      epoch: point.index * 60,
      open: point.price,
      high: point.kind === "high" ? point.price : point.price + 1,
      low: point.kind === "low" ? point.price : point.price - 1,
      close: point.price
    };
  });
  // Keep bars on both sides inside the pivot's range.
  points.forEach(point => {
    for (let offset = -radius; offset <= radius; offset += 1) {
      if (offset === 0) continue;
      const index = point.index + offset;
      if (index >= length) continue;
      const candle = candles[index];
      if (point.kind === "high") {
        candle.high = Math.min(candle.high, point.price - 1);
        candle.low = Math.min(candle.low, candle.high - 1);
      } else {
        candle.low = Math.max(candle.low, point.price + 1);
        candle.high = Math.max(candle.high, candle.low + 1);
      }
      candle.open = candle.low + (candle.high - candle.low) * 0.4;
      candle.close = candle.low + (candle.high - candle.low) * 0.6;
    }
  });
  return candles;
}

const pivotFixture = candlesFromPoints([
  { kind: "low", index: 5, price: 100 },
  { kind: "high", index: 10, price: 200 }
], 13, 2);
const confirmed = findConfirmedSwings(pivotFixture, 2);
assert.deepEqual(confirmed.slice(-2).map(point => point.kind), ["low", "high"]);
assert.equal(confirmed.at(-1).index, 10);

const unconfirmedFixture = candlesFromPoints([{ kind: "low", index: 11, price: 100 }], 13, 2);
assert.equal(findConfirmedSwings(unconfirmedFixture, 2).some(point => point.index === 11), false);

const validBullishGartley = [
  { kind: "low", index: 5, price: 100 },
  { kind: "high", index: 10, price: 200 },
  { kind: "low", index: 15, price: 138.2 },
  { kind: "high", index: 20, price: 180 },
  { kind: "low", index: 25, price: 121.4 }
];
const validBars = candlesFromPoints(validBullishGartley, 41, 2);
// The final close is positioned inside the projected PRZ, while the point D stays a historical low.
validBars[40] = { epoch: 2400, open: 121.55, high: 121.7, low: 121.5, close: 121.6 };
const harmonic = detectHarmonicPattern(validBars, { pivotStrength: 2 });
assert.ok(harmonic, "valid confirmed five-point pattern should be detected");
assert.equal(harmonic.isBull, true);
assert.equal(harmonic.patternName, "Gartley 0.786");
assert.ok(harmonic.ratios.AB_XA > 0.58 && harmonic.ratios.AB_XA < 0.66);
const gartleyTemplate = { b: [0.58, 0.66], bc: [0.382, 0.886], d: 0.786, dTol: 0.045, cdBc: [1.13, 1.618], abcd: [0.90, 1.30], abcdTarget: 1.0 };
assert.equal(validateHarmonicSequence([
  { kind: "low", index: 1, price: 100 }, { kind: "high", index: 2, price: 200 },
  { kind: "low", index: 3, price: 138.2 }, { kind: "high", index: 4, price: 194 },
  { kind: "low", index: 5, price: 121.4 }
], gartleyTemplate, 1), null, "a Gartley with BC retracement above 0.886 must be rejected");

const invalidBars = candlesFromPoints([
  ...validBullishGartley.slice(0, 4),
  { kind: "low", index: 25, price: 100 }
], 41, 2);
assert.equal(detectHarmonicPattern(invalidBars, { pivotStrength: 2 }), null, "wrong XA completion must not be called a valid pattern");

assert.equal(rejectionDirection({ open: 10, high: 10.2, low: 9, close: 10.1 }), "BUY");
assert.equal(rejectionDirection({ open: 10, high: 11, low: 9.8, close: 9.9 }), "SELL");
assert.equal(rejectionDirection({ open: 10, high: 10.4, low: 9.8, close: 10.3 }), null);

const spikeHistory = Array.from({ length: 30 }, (_, index) => ({ isSpike: [4, 10, 17, 26].includes(index) }));
const cycleStats = spikeCycleStats(spikeHistory);
assert.equal(cycleStats.observedIntervals, 3);
assert.equal(cycleStats.typicalInterval, 7);
assert.equal(cycleStats.driftCandles, 3);
assert.equal(spikeCycleStats(spikeHistory.slice(0, 20)), null, "fewer than four observed spikes must not produce cycle statistics");

assert.equal(validateEntryConditions({
  direction: "BUY", preferredDirection: "BUY", nearOrderBlock: false, harmonicAtPrz: true,
  harmonicDirection: "BUY", isBoomCrash: false
}).valid, true);
assert.equal(validateEntryConditions({
  direction: "BUY", preferredDirection: "SELL", nearOrderBlock: true, harmonicAtPrz: false,
  isBoomCrash: false
}).valid, false, "a rejection against the trend must not emit a setup");
assert.equal(validateEntryConditions({
  direction: "BUY", preferredDirection: "BUY", nearOrderBlock: false, harmonicAtPrz: false,
  isBoomCrash: false
}).valid, false, "a setup outside both approved zones must be rejected");
assert.equal(validateEntryConditions({
  direction: "BUY", preferredDirection: "BUY", isBoomCrash: true,
  spike: { observedIntervals: 2, isReadyToTrigger: true }
}).valid, false, "a synthetic-index setup requires four observed spikes / three full intervals");
assert.deepEqual(resolveTerminalOutcome(12, 12), { tp3Hit: false, stopHit: true, ambiguousSameBar: true });
assert.deepEqual(resolveTerminalOutcome(11, 12), { tp3Hit: true, stopHit: false, ambiguousSameBar: false });
assert.deepEqual(resolveTerminalOutcome(12, 11), { tp3Hit: false, stopHit: true, ambiguousSameBar: false });

const replayBars = [
  { epoch: 0, open: 100, high: 102, low: 99, close: 101 },
  { epoch: 60, open: 101, high: 104, low: 100.5, close: 103 },
  { epoch: 120, open: 103, high: 106, low: 99, close: 105 },
  { epoch: 180, open: 105, high: 106, low: 104, close: 105 }
];
const replay = simulateSignalOutcomes(replayBars, index => index === 0
  ? { direction: "BUY", entry: 101, stop: 100, target: 105 }
  : null, { maxHoldBars: 3 });
assert.equal(replay.trades.length, 1);
assert.deepEqual(replay.entries, [{ entryIndex: 0, entryEpoch: 0 }], "entry count includes only validated orders, without same-bar re-entry");
const openReplay = simulateSignalOutcomes(replayBars.slice(0, 1), () => ({ direction: "BUY", entry: 101, stop: 90, target: 130 }));
assert.equal(openReplay.trades.length, 0);
assert.equal(openReplay.entries.length, 1, "an entry still open at the end must count toward frequency");
assert.equal(openReplay.ignoredOpenSignal, true);
assert.equal(simulateSignalOutcomes(replayBars, () => ({ direction: "BUY", entry: 101, stop: 102, target: 105 })).entries.length, 0, "invalid orders must not count as entries");
assert.equal(simulateSignalOutcomes(replayBars, () => null).entries.length, 0);

assert.equal(replay.trades[0].outcome, "AMBIGUOUS_BAR_STOP_FIRST");
assert.equal(replay.trades[0].rMultiple, -1);
assert.equal(replay.trades[0].exitIndex, 2);
const gapReplay = simulateSignalOutcomes([
  { epoch: 0, open: 100, high: 102, low: 99, close: 101 },
  { epoch: 60, open: 98, high: 103, low: 97, close: 99 }
], index => index === 0 ? { direction: "BUY", entry: 101, stop: 100, target: 104 } : null);
assert.equal(gapReplay.trades[0].outcome, "STOP");
assert.equal(gapReplay.trades[0].rMultiple, -3, "a gap through the stop must simulate adverse opening-price execution");
const replayStats = summarizeBacktest([
  { rMultiple: 3 }, { rMultiple: -1 }, { rMultiple: 1 }, { rMultiple: -0.5 }
]);
assert.equal(replayStats.trades, 4);
assert.equal(replayStats.winRate, 0.5);
assert.equal(replayStats.expectancyR, 0.625);
assert.equal(replayStats.profitFactor, 4 / 1.5);
assert.equal(replayStats.netR, 2.5);

// Fixed spike-scalp rules must use only the supplied confirmed prefix.
const scalpBars=Array.from({length:60},(_,i)=>({epoch:1700000040+i*60,open:200-i*.1,high:200-i*.1+.1,low:200-i*.1-.2,close:200-i*.1-.1,isSpike:false}));
const scalp=buildSpikeScalpSetup(scalpBars,{marketId:"BOOM1000",timeframe:"M1",decimals:3});
assert.equal(scalp.valid,true);assert.equal(scalp.type,"BUY");
assert.ok(scalp.sl<scalp.entry && scalp.tp1>scalp.entry);
assert.equal(scalp.maxHoldSeconds,180);assert.equal(scalp.entryWindowSeconds,20);
const crashBars=scalpBars.map(b=>({...b,open:400-b.open,close:400-b.close,high:400-b.low,low:400-b.high}));
const crashScalp=buildSpikeScalpSetup(crashBars,{marketId:"CRASH1000",timeframe:"M1",decimals:3});
assert.equal(crashScalp.valid,true);assert.equal(crashScalp.type,"SELL");
assert.ok(crashScalp.sl>crashScalp.entry && crashScalp.tp1<crashScalp.entry);
assert.equal(buildSpikeScalpSetup(scalpBars,{marketId:"BOOM1000",timeframe:"M5"}).valid,false);
assert.equal(buildSpikeScalpSetup(scalpBars,{marketId:"XAUUSD",timeframe:"M1"}).valid,false);
assert.equal(buildSpikeScalpSetup(scalpBars.slice(1),{marketId:"BOOM1000",timeframe:"M1"}).valid,false);
const gapScalp=scalpBars.map(b=>({...b}));gapScalp[20].epoch+=1;
assert.equal(buildSpikeScalpSetup(gapScalp,{marketId:"BOOM1000",timeframe:"M1"}).valid,false);
const chased=scalpBars.map(b=>({...b}));chased.at(-1).isSpike=true;
assert.equal(buildSpikeScalpSetup(chased,{marketId:"BOOM1000",timeframe:"M1"}).valid,false,"never chase an already detected spike");
const wide=scalpBars.map(b=>({...b}));wide.at(-1).high+=10;
assert.equal(buildSpikeScalpSetup(wide,{marketId:"BOOM1000",timeframe:"M1"}).valid,false);
const waitOnly=scalpBars.map((b,i)=>({...b,open:100,close:100,high:100.1,low:99.9,isSpike:i===0}));
assert.equal(buildSpikeScalpSetup(waitOnly,{marketId:"BOOM1000",timeframe:"M1"}).valid,false,"time since a spike alone cannot trigger an entry");
const liveScalp={...scalp,strategy:"spike_scalp_v1"};const start=scalp.entryEpoch;
assert.equal(resolveSpikeScalpExit(scalpBars,liveScalp,scalp.entry,start),null,"entry candle cannot score earlier price extremes");
const tie={epoch:start,open:scalp.entry,high:scalp.tp1+1,low:scalp.sl-1,close:scalp.entry};
assert.equal(resolveSpikeScalpExit([tie],liveScalp,scalp.entry,start+60).status,"AMBIGUOUS_BAR_SL_FIRST");
const quiet=Array.from({length:3},(_,i)=>({epoch:start+i*60,open:scalp.entry,high:scalp.entry+.01,low:scalp.entry-.01,close:scalp.entry}));
assert.equal(resolveSpikeScalpExit(quiet,liveScalp,scalp.entry,start+180).status,"TIME_EXIT");
assert.equal(resolveSpikeScalpExit([...quiet,{epoch:start+180,open:scalp.entry,high:scalp.tp3+1,low:scalp.entry,close:scalp.tp3}],liveScalp,scalp.tp3,start+240).status,"TIME_EXIT","a spike after expiry cannot turn an expired trade into a win");
assert.equal(resolveSpikeScalpExit([{...quiet[0],high:scalp.tp1}],liveScalp,scalp.tp1,start+60).status,"TP1_HIT");
const multiQuick={...liveScalp,strategy:"multi_scalp_v1",maxHoldSeconds:300};
const quietFive=Array.from({length:5},(_,i)=>({...quiet[0],epoch:start+i*60}));
assert.equal(resolveSpikeScalpExit(quietFive,multiQuick,scalp.entry,start+240),null);
assert.equal(resolveSpikeScalpExit(quietFive,multiQuick,scalp.entry,start+300).status,"TIME_EXIT","multipair profile honors its five-minute deadline");
const cooling=simulateSignalOutcomes(Array.from({length:12},(_,i)=>({epoch:i*60,open:100,high:100.1,low:99.9,close:100})),()=>({direction:"BUY",entry:100,stop:99,target:101}),{maxHoldBars:3,cooldownBars:2});
assert.deepEqual(cooling.entries.map(e=>e.entryIndex),[0,6]);
assert.ok(cooling.trades.every(t=>t.exitIndex-t.entryIndex===3));

global.window = global;
require("./js/quantick_akira_tv_pine.js");
const pine = global.QUANTICK_AKIRA_PINE_SCRIPT;
assert.equal(fs.readFileSync("QuantickAkira_TradingView_Pro_v5.pine", "utf8").trim(), pine.trim(), "the downloadable Pine file must match the in-app Pine source");
assert.ok(pine.includes("barstate.isconfirmed"), "TradingView entries must wait for confirmed bars");
assert.ok(pine.includes("ratioCDAB") && pine.includes("ratioAD"), "harmonic validation must check the full ratio set");
assert.ok(pine.includes("bcRetracementValid"), "Pine must enforce the same BC/AB retracement bound as the frontend");
assert.ok(!/weibull|probabilidad de proximidad|certainty/i.test(pine), "unvalidated probability claims must not appear in Pine source");

const tradingLab = fs.readFileSync(require.resolve("./js/akira_trading_lab.js"), "utf8");
const backgroundScanner = tradingLab.match(/scanBackgroundMarketsForTelegram\(\)\s*\{([\s\S]*?)\n    \}/);
assert.ok(backgroundScanner && !backgroundScanner[1].includes("Math.random"), "background alerts must not fabricate market signals");
assert.ok(tradingLab.includes("this.dataFeedKeys[marketId] !== feedKey"), "scanner must reject demo/offline candles");
assert.ok(tradingLab.includes("runScannerBacktest()"), "Trading Lab must offer historical strategy replay");
assert.ok(tradingLab.includes("ScannerCore.simulateSignalOutcomes(source"), "historical replay must use the live signal generator");
assert.ok(tradingLab.includes("operaciones cerradas antes del corte"), "training sample must exclude outcomes that cross into the out-of-sample period");
assert.ok(tradingLab.includes("no incluye parciales, spread, comisiones ni deslizamiento"), "gross backtest must disclose omitted exit behavior and trading costs");
assert.ok(!tradingLab.includes("escáner de alta precisión que usa Sebas Ramírez"), "scanner must not imply unverified endorsement or accuracy");

console.log("Trading scanner checks passed (confirmed pivots, harmonic ratios, entry gates, historical cycles, no fabricated alerts, Pine safeguards).");
