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

  function resolveTerminalOutcome(tp3Index, stopIndex) {
    const hasTarget = Number.isInteger(tp3Index) && tp3Index >= 0;
    const hasStop = Number.isInteger(stopIndex) && stopIndex >= 0;
    const ambiguousSameBar = hasTarget && hasStop && tp3Index === stopIndex;
    const tp3Hit = hasTarget && (!hasStop || tp3Index < stopIndex);
    const stopHit = hasStop && (!hasTarget || stopIndex <= tp3Index);
    return { tp3Hit, stopHit, ambiguousSameBar };
  }

  const api = { averageTrueRange, findConfirmedSwings, detectHarmonicPattern, rejectionDirection, spikeCycleStats, validateEntryConditions, resolveTerminalOutcome, validateHarmonicSequence: projectPattern };
  root.AkiraTradingScannerCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
