(function (root) {
  "use strict";

  const RATIOS = [
    { name: "Gartley 0.786", b: [0.58, 0.66], bc: [0.382, 0.886], d: 0.786, dTol: 0.045, cdBc: [1.13, 1.618], abcd: [0.90, 1.30], abcdTarget: 1.0 },
    { name: "Bat 0.886", b: [0.382, 0.618], bc: [0.382, 0.886], d: 0.886, dTol: 0.045, cdBc: [1.618, 2.618], abcd: [1.00, 1.618], abcdTarget: 1.27 },
    { name: "Butterfly 1.272", b: [0.74, 0.82], bc: [0.382, 0.886], d: 1.272, dTol: 0.055, cdBc: [1.618, 2.618], abcd: [1.00, 1.618], abcdTarget: 1.27 },
    { name: "Crab 1.618", b: [0.382, 0.618], bc: [0.382, 0.886], d: 1.618, dTol: 0.055, cdBc: [2.24, 3.618], abcd: [1.27, 2.00], abcdTarget: 1.618 }
  ];

  function finite(value) {
    return typeof value === "number" && Number.isFinite(value);
  }

  function median(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function averageTrueRange(candles, period) {
    const n = Math.max(2, Math.min(period || 14, candles.length));
    if (candles.length < n) return null;
    let sum = 0;
    for (let i = candles.length - n; i < candles.length; i += 1) {
      const candle = candles[i];
      const previousClose = i > 0 ? candles[i - 1].close : candle.open;
      sum += Math.max(candle.high - candle.low, Math.abs(candle.high - previousClose), Math.abs(candle.low - previousClose));
    }
    return sum / n;
  }

  function findConfirmedSwings(candles, strength, limit) {
    const bars = Array.isArray(candles) ? candles : [];
    const radius = Math.max(2, Math.floor(strength || 3));
    const swings = [];
    if (bars.length < radius * 2 + 1) return swings;

    // A pivot is emitted only after `radius` bars exist to its right.
    for (let i = radius; i < bars.length - radius; i += 1) {
      const high = Number(bars[i].high);
      const low = Number(bars[i].low);
      if (!finite(high) || !finite(low) || high <= low) continue;
      let pivotHigh = true;
      let pivotLow = true;
      for (let j = i - radius; j <= i + radius; j += 1) {
        if (j === i) continue;
        if (Number(bars[j].high) >= high) pivotHigh = false;
        if (Number(bars[j].low) <= low) pivotLow = false;
        if (!pivotHigh && !pivotLow) break;
      }
      if (pivotHigh === pivotLow) continue;

      const point = {
        kind: pivotHigh ? "high" : "low",
        index: i,
        epoch: finite(bars[i].epoch) ? bars[i].epoch : null,
        price: pivotHigh ? high : low
      };
      const last = swings[swings.length - 1];
      if (last && last.kind === point.kind) {
        const moreExtreme = point.kind === "high" ? point.price > last.price : point.price < last.price;
        if (moreExtreme) swings[swings.length - 1] = point;
      } else {
        swings.push(point);
      }
    }
    return swings.slice(-Math.max(5, limit || 20));
  }

  function between(value, range) {
    return value >= range[0] && value <= range[1];
  }

  function projectPattern(points, template, atr) {
    const [x, a, b, c, d] = points.map(point => point.price);
    const bullish = points[0].kind === "low";
    const xa = Math.abs(a - x);
    const ab = Math.abs(b - a);
    const bc = Math.abs(c - b);
    const cd = Math.abs(d - c);
    if ([xa, ab, bc, cd].some(value => !finite(value) || value < atr * 0.15)) return null;

    const ratioB = ab / xa;
    const ratioBC = bc / ab;
    const ratioCD = cd / bc;
    // The terminal D ratio is measured from A back toward/beyond X, i.e. AD/XA.
    const ratioAD = Math.abs(a - d) / xa;
    const ratioABCD = cd / ab;
    if (!between(ratioB, template.b) || !between(ratioBC, template.bc) || !between(ratioCD, template.cdBc) ||
        !between(ratioABCD, template.abcd) || Math.abs(ratioAD - template.d) > template.dTol) return null;

    const shapeValid = bullish
      ? (x < a && x < b && b < a && b < c && c < a && d < c && (template.d < 1 ? d > x : d < x))
      : (x > a && x > b && b > a && b > c && c > a && d > c && (template.d < 1 ? d < x : d > x));
    if (!shapeValid) return null;

    const direction = bullish ? -1 : 1;
    const projections = [
      a + direction * xa * template.d,
      c + direction * bc * median(template.cdBc),
      c + direction * ab * template.abcdTarget
    ];
    const spread = Math.max(...projections) - Math.min(...projections);
    const maxSpread = Math.max((atr || 0) * 0.75, xa * 0.05);
    if (spread > maxSpread) return null;

    const center = median(projections);
    const tolerance = Math.max((atr || 0) * 0.15, xa * 0.006);
    const low = Math.min(...projections) - tolerance;
    const high = Math.max(...projections) + tolerance;
    return {
      isBull: bullish,
      patternName: template.name,
      points: points.map(point => ({ ...point })),
      idxX: points[0].index, pX_price: x,
      idxA: points[1].index, pA_price: a,
      idxB: points[2].index, pB_price: b,
      idxC: points[3].index, pC_price: c,
      idxD: points[4].index, pD_price: d,
      ratios: { AB: ratioB, BC: ratioBC, CD: ratioCD, AD: ratioAD, AB_XA: ratioB, BC_AB: ratioBC, CD_BC: ratioCD, AD_XA: ratioAD, CD_AB: ratioABCD },
      przZone: { low, high, center, spread, maxSpread },
      completedIndex: points[4].index
    };
  }

  function detectHarmonicPattern(candles, options) {
    const bars = Array.isArray(candles) ? candles : [];
    if (bars.length < 40) return null;
    const cfg = options || {};
    const swings = findConfirmedSwings(bars, cfg.pivotStrength || 3, cfg.maxSwings || 24);
    if (swings.length < 5) return null;
    const atr = averageTrueRange(bars, cfg.atrPeriod || 14);
    if (!finite(atr) || atr <= 0) return null;

    // Evaluate only completed five-swing sequences; choose the latest valid completion.
    for (let end = swings.length - 1; end >= 4; end -= 1) {
      const points = swings.slice(end - 4, end + 1);
      const alternating = points.every((point, i) => i === 0 || point.kind !== points[i - 1].kind);
      if (!alternating) continue;
      for (const template of RATIOS) {
        const result = projectPattern(points, template, atr);
        if (!result) continue;
        result.atr = atr;
        result.isAtPrz = bars[bars.length - 1].close >= result.przZone.low && bars[bars.length - 1].close <= result.przZone.high;
        return result;
      }
    }
    return null;
  }

  function rejectionDirection(candle) {
    if (!candle || ![candle.open, candle.high, candle.low, candle.close].every(finite)) return null;
    const range = candle.high - candle.low;
    if (range <= 0) return null;
    const lowerWick = Math.min(candle.open, candle.close) - candle.low;
    const upperWick = candle.high - Math.max(candle.open, candle.close);
    if (candle.close > candle.open && lowerWick / range >= 0.35) return "BUY";
    if (candle.close < candle.open && upperWick / range >= 0.35) return "SELL";
    return null;
  }

  function spikeCycleStats(candles) {
    const indexes = [];
    (Array.isArray(candles) ? candles : []).forEach((candle, index) => {
      if (candle && candle.isSpike === true) indexes.push(index);
    });
    const intervals = [];
    for (let i = 1; i < indexes.length; i += 1) intervals.push(indexes[i] - indexes[i - 1]);
    if (intervals.length < 3) return null;
    const typicalInterval = median(intervals.slice(-20));
    const lastSpike = indexes[indexes.length - 1];
    return {
      observedSpikes: indexes.length,
      observedIntervals: intervals.length,
      typicalInterval,
      driftCandles: candles.length - 1 - lastSpike,
      intervals: intervals.slice(-20)
    };
  }

  function validateEntryConditions(input) {
    const data = input || {};
    const reasons = [];
    if (!data.direction || data.direction !== data.preferredDirection) {
      reasons.push("No hay rechazo cerrado a favor de la estructura");
    }
    if (data.isBoomCrash) {
      if (!data.spike || data.spike.observedIntervals < 3) reasons.push("Histórico de spikes insuficiente");
      else if (!data.spike.isReadyToTrigger) reasons.push("Deriva, rechazo o zona estructural sin confirmar");
    } else {
      if (!data.nearOrderBlock && !data.harmonicAtPrz) reasons.push("Precio fuera del bloque y de la zona armónica");
      if (data.harmonicDirection && data.harmonicDirection !== data.preferredDirection) {
        reasons.push("El patrón armónico contradice la estructura");
      }
    }
    return { valid: reasons.length === 0, reasons };
  }

  // Experimental, fixed rules; never infer spike probability from elapsed time.
  function buildSpikeScalpSetup(candles, options = {}) {
    const bars = Array.isArray(candles) ? candles : [];
    const market = String(options.marketId || "");
    const buy = market.startsWith("BOOM"), sell = market.startsWith("CRASH");
    const fail = reason => ({ valid: false, reasons: [reason] });
    if ((!buy && !sell) || options.timeframe !== "M1") return fail("Caza spikes demo requiere Boom/Crash en M1");
    if (bars.length < 60) return fail("Esperando 60 velas reales cerradas");
    const recent = bars.slice(-60);
    if (recent.some((b,i) => ![b.epoch,b.open,b.high,b.low,b.close].every(Number.isFinite) || b.high < Math.max(b.open,b.close) || b.low > Math.min(b.open,b.close) || (i && b.epoch-recent[i-1].epoch !== 60))) return fail("Histórico M1 incompleto o inválido; caza pausada");
    const last = recent.at(-1), previous = recent.slice(-6,-1);
    const ranges = recent.slice(0,-3).map(b=>b.high-b.low).filter(r=>r>0);
    const normalRange = median(ranges);
    if (!(normalRange > 0)) return fail("No hay rango suficiente para definir stop y objetivo");
    const sign = buy ? 1 : -1;
    const spikeBar = b => b.isSpike === true || (b.close-b.open)*sign > normalRange*2;
    if (recent.slice(-3).some(spikeBar)) return fail("Spike reciente: no perseguir el salto; esperar una nueva preparación");
    const driftBars = previous.filter(b=>(b.close-b.open)*sign<0).length;
    const driftMove = (previous[0].open-last.close)*sign;
    if (driftBars < 4 || driftMove < normalRange) return fail("Esperando deriva corta contra la dirección del spike");
    const microRange = median(recent.slice(-3).map(b=>b.high-b.low));
    if (microRange > normalRange*1.25 || last.high-last.low > normalRange*1.5) return fail("Esperando compresión; no entrar con expansión ya iniciada");
    const zone = recent.slice(-20), low = Math.min(...zone.map(b=>b.low)), high = Math.max(...zone.map(b=>b.high));
    const location = high>low ? (last.close-low)/(high-low) : 0.5;
    if ((buy && location>0.3) || (sell && location<0.7)) return fail("Precio lejos del extremo de la preparación corta");
    const entry = last.close;
    const stop = buy ? Math.min(...recent.slice(-5).map(b=>b.low))-normalRange*0.25 : Math.max(...recent.slice(-5).map(b=>b.high))+normalRange*0.25;
    const risk = Math.max(Math.abs(entry-stop), normalRange*1.5);
    if (risk>normalRange*4) return fail("Stop demasiado amplio para una operación rápida");
    const decimals = Number.isInteger(options.decimals) ? Math.max(0,Math.min(8,options.decimals)) : 3;
    const round = n=>Number(n.toFixed(decimals));
    const sl=round(entry-sign*risk), tp1=round(entry+sign*risk),tp2=round(entry+sign*risk*2),tp3=round(entry+sign*risk*3);
    if ((entry-sl)*sign<=0 || (tp1-entry)*sign<=0) return fail("Precisión insuficiente para niveles válidos");
    return {valid:true,reasons:[],type:buy?"BUY":"SELL",entry,sl,tp1,tp2,tp3,
      strategy:"spike_scalp_v1",maxHoldBars:3,maxHoldSeconds:180,entryWindowSeconds:20,cooldownBars:2,
      normalRange,driftBars,confluences:["Deriva corta observada", "Compresión de rango", "Precio en extremo local"],
      signalCandleEpoch:last.epoch,entryEpoch:last.epoch+60};
  }

  function resolveSpikeScalpExit(candles, signal, currentPrice, nowEpoch) {
    if (!signal || !["spike_scalp_v1","multi_scalp_v1","reference_sniper_v1"].includes(signal.strategy) || !Number.isFinite(nowEpoch)) return null;
    const entryEpoch=signal.signalCandleEpoch+60, deadline=entryEpoch+Math.min(300,Math.max(180,Number(signal.maxHoldSeconds)||180)), buy=signal.type==="BUY";
    for (const bar of (candles || [])) {
      if (bar.epoch<entryEpoch || bar.epoch>=deadline || bar.epoch>nowEpoch) continue;
      const stop=buy?bar.low<=signal.sl:bar.high>=signal.sl;
      const target=buy?bar.high>=signal.tp1:bar.low<=signal.tp1;
      const at=Math.min(bar.epoch+60,nowEpoch);
      if (stop) return {status:target?"AMBIGUOUS_BAR_SL_FIRST":"SL_HIT",price:buy?Math.min(signal.sl,bar.open):Math.max(signal.sl,bar.open),epoch:at};
      if (target) return {status:"TP1_HIT",price:signal.tp1,epoch:at};
      if (bar.epoch+60===deadline && nowEpoch>=deadline) return {status:"TIME_EXIT",price:bar.close,epoch:deadline};
    }
    if (nowEpoch>=deadline && Number.isFinite(currentPrice)) return {status:"TIME_EXIT",price:currentPrice,epoch:nowEpoch};
    if (nowEpoch>=entryEpoch && Number.isFinite(currentPrice)) {
      if (buy?currentPrice<=signal.sl:currentPrice>=signal.sl) return {status:"SL_HIT",price:currentPrice,epoch:nowEpoch};
      if (buy?currentPrice>=signal.tp1:currentPrice<=signal.tp1) return {status:"TP1_HIT",price:signal.tp1,epoch:nowEpoch};
    }
    return null;
  }

  function resolveTerminalOutcome(tp3Index, stopIndex) {
    const hasTarget = Number.isInteger(tp3Index) && tp3Index >= 0;
    const hasStop = Number.isInteger(stopIndex) && stopIndex >= 0;
    const ambiguousSameBar = hasTarget && hasStop && tp3Index === stopIndex;
    const tp3Hit = hasTarget && (!hasStop || tp3Index < stopIndex);
    const stopHit = hasStop && (!hasTarget || stopIndex <= tp3Index);
    return { tp3Hit, stopHit, ambiguousSameBar };
  }

  function simulateSignalOutcomes(candles, signalAtIndex, options) {
    const bars = Array.isArray(candles) ? candles : [];
    const cfg = options || {};
    const maxHoldBars = Math.max(1, Math.floor(Number(cfg.maxHoldBars) || 100));
    const trades = [];
    const entries = [];
    let active = null;
    let ignoredOpenSignal = false;
    let nextEntryIndex = 0;
    const cooldownBars = Math.max(0,Math.floor(Number(cfg.cooldownBars)||0));
    for (let i = 0; i < bars.length; i += 1) {
      if (!active) {
        if (i < nextEntryIndex) continue;
        const signal = typeof signalAtIndex === "function" ? signalAtIndex(i, bars.slice(0, i + 1)) : null;
        if (!signal || !["BUY", "SELL"].includes(signal.direction)) continue;
        const entry = Number(signal.entry);
        const stop = Number(signal.stop);
        const target = Number(signal.target);
        const risk = Math.abs(entry - stop);
        const directionSign = signal.direction === "BUY" ? 1 : -1;
        if (![entry, stop, target, risk].every(Number.isFinite) || risk <= 0 ||
            (target - entry) * directionSign <= 0 || (stop - entry) * directionSign >= 0) continue;
        active = { direction: signal.direction, entry, stop, target, risk, entryIndex: i, entryEpoch: bars[i]?.epoch ?? null };
        entries.push({ entryIndex: i, entryEpoch: bars[i]?.epoch ?? null });
        continue; // Entry occurs at this bar's close; never score its earlier high/low.
      }

      const bar = bars[i];
      if (!bar || ![bar.open, bar.high, bar.low, bar.close].every(value => Number.isFinite(Number(value)))) continue;
      const buy = active.direction === "BUY";
      const stopTouched = buy ? Number(bar.low) <= active.stop : Number(bar.high) >= active.stop;
      const targetTouched = buy ? Number(bar.high) >= active.target : Number(bar.low) <= active.target;
      const open = Number(bar.open);
      const stopFill = buy ? Math.min(active.stop, open) : Math.max(active.stop, open);
      let exitPrice = null;
      let outcome = "";
      if (stopTouched && targetTouched) {
        exitPrice = stopFill;
        outcome = "AMBIGUOUS_BAR_STOP_FIRST";
      } else if (stopTouched) {
        exitPrice = stopFill;
        outcome = "STOP";
      } else if (targetTouched) {
        exitPrice = active.target;
        outcome = "TARGET";
      } else if (i - active.entryIndex >= maxHoldBars) {
        exitPrice = Number(bar.close);
        outcome = "TIME_EXIT";
      }
      if (exitPrice === null) continue;
      const signedMove = (exitPrice - active.entry) * (buy ? 1 : -1);
      trades.push({
        direction: active.direction,
        entry: active.entry,
        stop: active.stop,
        target: active.target,
        entryIndex: active.entryIndex,
        exitIndex: i,
        entryEpoch: active.entryEpoch,
        outcome,
        rMultiple: signedMove / active.risk
      });
      active = null; // No same-candle re-entry.
      nextEntryIndex = i + cooldownBars + 1;
    }
    if (active) ignoredOpenSignal = true;
    return { trades, entries, ignoredOpenSignal, barCount: bars.length, maxHoldBars };
  }

  function summarizeBacktest(trades) {
    const rows = Array.isArray(trades) ? trades.filter(row => Number.isFinite(Number(row.rMultiple))) : [];
    let grossWins = 0;
    let grossLosses = 0;
    let running = 0;
    let peak = 0;
    let maxDrawdown = 0;
    let wins = 0;
    let losses = 0;
    rows.forEach(row => {
      const r = Number(row.rMultiple);
      if (r > 0) { wins += 1; grossWins += r; }
      else if (r < 0) { losses += 1; grossLosses += Math.abs(r); }
      running += r;
      peak = Math.max(peak, running);
      maxDrawdown = Math.max(maxDrawdown, peak - running);
    });
    const count = rows.length;
    return {
      trades: count,
      wins,
      losses,
      winRate: count ? wins / count : null,
      expectancyR: count ? rows.reduce((sum, row) => sum + Number(row.rMultiple), 0) / count : null,
      profitFactor: grossLosses ? grossWins / grossLosses : (grossWins ? Infinity : null),
      maxDrawdownR: maxDrawdown,
      netR: running
    };
  }

  const api = { buildSpikeScalpSetup, resolveSpikeScalpExit, averageTrueRange, findConfirmedSwings, detectHarmonicPattern, rejectionDirection, spikeCycleStats, validateEntryConditions, resolveTerminalOutcome, simulateSignalOutcomes, summarizeBacktest, validateHarmonicSequence: projectPattern };
  root.AkiraTradingScannerCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
