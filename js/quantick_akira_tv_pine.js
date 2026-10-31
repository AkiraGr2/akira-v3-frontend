// TradingView companion for the Trading Lab scanner. The indicator uses confirmed bars;
// the UI calls this source through window.QUANTICK_AKIRA_PINE_SCRIPT.
(function () {
  "use strict";
  window.QUANTICK_AKIRA_PINE_SCRIPT = String.raw`//@version=5
indicator("Akira Trading Lab · Confirmed Sniper & Harmonic", shorttitle="Akira Sniper", overlay=true, max_lines_count=100, max_boxes_count=100, max_labels_count=100)

groupMarket = "Mercado"
marketMode = input.string("Auto", "Modo", options=["Auto", "Boom", "Crash", "General"], group=groupMarket)
pipSize = input.float(0.01, "Tamaño de punto del símbolo", minval=0.000001, group=groupMarket)

groupScan = "Filtros Sniper"
enableSniper = input.bool(true, "Activar Sniper", group=groupScan)
showLevels = input.bool(true, "Dibujar SL y objetivos", group=groupScan)
emaZoneAtr = input.float(0.25, "Distancia máxima a EMA (ATR)", minval=0.05, maxval=1.0, group=groupScan)

groupHarmonic = "Escáner armónico"
enableHarmonics = input.bool(true, "Activar XABCD", group=groupHarmonic)
pivotDepth = input.int(4, "Barras para confirmar pivote", minval=2, maxval=20, group=groupHarmonic)

string ticker = str.upper(syminfo.ticker)
bool isBoom = marketMode == "Boom" or (marketMode == "Auto" and (str.contains(ticker, "BOOM") or str.contains(ticker, "B1000") or str.contains(ticker, "B500") or str.contains(ticker, "B300")))
bool isCrash = marketMode == "Crash" or (marketMode == "Auto" and (str.contains(ticker, "CRASH") or str.contains(ticker, "C1000") or str.contains(ticker, "C500") or str.contains(ticker, "C300")))
bool isGeneral = not isBoom and not isCrash

float atr = ta.atr(14)
float ema20 = ta.ema(close, 20)
float ema50 = ta.ema(close, 50)
float rsi14 = ta.rsi(close, 14)
float candleRange = math.max(high - low, syminfo.mintick)
float lowerWick = math.min(open, close) - low
float upperWick = high - math.max(open, close)
bool bullishRejection = close > open and lowerWick / candleRange >= 0.35
bool bearishRejection = close < open and upperWick / candleRange >= 0.35
bool nearEmaZone = low <= ema20 + atr * emaZoneAtr and high >= ema20 - atr * emaZoneAtr or low <= ema50 and high >= ema50
bool trendBull = bar_index > 50 and ema20 > ema50 and close > ema20 and rsi14 >= 50
bool trendBear = bar_index > 50 and ema20 < ema50 and close < ema20 and rsi14 <= 50

// Count observed spike intervals from this symbol's actual confirmed bars.
var int lastSpikeBar = na
var int[] spikeIntervals = array.new_int()
float spikeThreshold = math.max(pipSize * 20.0, atr * 2.5)
bool observedSpike = barstate.isconfirmed and ((isBoom and close > open and close - open >= spikeThreshold) or (isCrash and close < open and open - close >= spikeThreshold))
if observedSpike
    if not na(lastSpikeBar)
        array.push(spikeIntervals, bar_index - lastSpikeBar)
        if array.size(spikeIntervals) > 100
            array.shift(spikeIntervals)
    lastSpikeBar := bar_index
int driftCount = na(lastSpikeBar) ? 0 : bar_index - lastSpikeBar
int intervalCount = array.size(spikeIntervals)
float medianInterval = na
float upperQuartileInterval = na
if intervalCount >= 3
    int[] sortedIntervals = array.copy(spikeIntervals)
    array.sort(sortedIntervals, order.ascending)
    medianInterval := array.get(sortedIntervals, int(math.floor((intervalCount - 1) * 0.5)))
    upperQuartileInterval := array.get(sortedIntervals, int(math.floor((intervalCount - 1) * 0.75)))
float cycleThreshold = na(upperQuartileInterval) ? na : math.max(1.0, math.floor(upperQuartileInterval * 0.75))
float recentRange = ta.highest(high, 3) - ta.lowest(low, 3)
float medianBarRange = ta.percentile_nearest_rank(high - low, 30, 50)
bool compressed = not na(medianBarRange) and recentRange < medianBarRange * 2.0

// Confirmed high/low pivots. Consecutive pivots of one type are reduced to the more extreme point.
var float[] pivotPrices = array.new_float()
var int[] pivotBars = array.new_int()
var int[] pivotKinds = array.new_int()
float pivotHigh = ta.pivothigh(high, pivotDepth, pivotDepth)
float pivotLow = ta.pivotlow(low, pivotDepth, pivotDepth)
if barstate.isconfirmed and enableHarmonics
    if not na(pivotHigh) and na(pivotLow)
        int n = array.size(pivotKinds)
        int idx = bar_index - pivotDepth
        if n > 0 and array.get(pivotKinds, n - 1) == 1
            if pivotHigh > array.get(pivotPrices, n - 1)
                array.set(pivotPrices, n - 1, pivotHigh)
                array.set(pivotBars, n - 1, idx)
        else
            array.push(pivotPrices, pivotHigh)
            array.push(pivotBars, idx)
            array.push(pivotKinds, 1)
    if not na(pivotLow) and na(pivotHigh)
        int n = array.size(pivotKinds)
        int idx = bar_index - pivotDepth
        if n > 0 and array.get(pivotKinds, n - 1) == -1
            if pivotLow < array.get(pivotPrices, n - 1)
                array.set(pivotPrices, n - 1, pivotLow)
                array.set(pivotBars, n - 1, idx)
        else
            array.push(pivotPrices, pivotLow)
            array.push(pivotBars, idx)
            array.push(pivotKinds, -1)
    while array.size(pivotKinds) > 5
        array.shift(pivotPrices)
        array.shift(pivotBars)
        array.shift(pivotKinds)

bool enoughPivots = array.size(pivotPrices) == 5
float x = enoughPivots ? array.get(pivotPrices, 0) : na
float a = enoughPivots ? array.get(pivotPrices, 1) : na
float b = enoughPivots ? array.get(pivotPrices, 2) : na
float c = enoughPivots ? array.get(pivotPrices, 3) : na
float d = enoughPivots ? array.get(pivotPrices, 4) : na
int xKind = enoughPivots ? array.get(pivotKinds, 0) : 0
int aKind = enoughPivots ? array.get(pivotKinds, 1) : 0
int bKind = enoughPivots ? array.get(pivotKinds, 2) : 0
int cKind = enoughPivots ? array.get(pivotKinds, 3) : 0
int dKind = enoughPivots ? array.get(pivotKinds, 4) : 0
int dBar = enoughPivots ? array.get(pivotBars, 4) : na
float xa = enoughPivots ? math.abs(a - x) : na
float ab = enoughPivots ? math.abs(b - a) : na
float bc = enoughPivots ? math.abs(c - b) : na
float cd = enoughPivots ? math.abs(d - c) : na
float ratioB = enoughPivots and xa > 0 ? ab / xa : na
float ratioBC = enoughPivots and ab > 0 ? bc / ab : na
float ratioCD = enoughPivots and bc > 0 ? cd / bc : na
float ratioAD = enoughPivots and xa > 0 ? math.abs(a - d) / xa : na
float ratioCDAB = enoughPivots and ab > 0 ? cd / ab : na
bool alternating = enoughPivots and xKind != aKind and aKind != bKind and bKind != cKind and cKind != dKind
bool bullishShape = alternating and xKind == -1 and dKind == -1 and x < b and b < a and b < c and c < a and d < c and (ratioAD < 1 ? d > x : d < x)
bool bearishShape = alternating and xKind == 1 and dKind == 1 and x > b and b > a and b > c and c > a and d > c and (ratioAD < 1 ? d < x : d > x)

bool bcRetracementValid = ratioBC >= 0.382 and ratioBC <= 0.886
bool gartley = enoughPivots and bcRetracementValid and ratioB >= 0.58 and ratioB <= 0.66 and math.abs(ratioAD - 0.786) <= 0.045 and ratioCD >= 1.13 and ratioCD <= 1.618 and ratioCDAB >= 0.90 and ratioCDAB <= 1.30
bool bat = enoughPivots and bcRetracementValid and ratioB >= 0.382 and ratioB <= 0.618 and math.abs(ratioAD - 0.886) <= 0.045 and ratioCD >= 1.618 and ratioCD <= 2.618 and ratioCDAB >= 1.00 and ratioCDAB <= 1.618
bool butterfly = enoughPivots and bcRetracementValid and ratioB >= 0.74 and ratioB <= 0.82 and math.abs(ratioAD - 1.272) <= 0.055 and ratioCD >= 1.618 and ratioCD <= 2.618 and ratioCDAB >= 1.00 and ratioCDAB <= 1.618
bool crab = enoughPivots and bcRetracementValid and ratioB >= 0.382 and ratioB <= 0.618 and math.abs(ratioAD - 1.618) <= 0.055 and ratioCD >= 2.24 and ratioCD <= 3.618 and ratioCDAB >= 1.27 and ratioCDAB <= 2.00
bool patternValid = enableHarmonics and (gartley or bat or butterfly or crab) and (bullishShape or bearishShape) and not na(dBar) and bar_index - dBar <= pivotDepth * 2
bool harmonicBull = patternValid and bullishShape
bool harmonicBear = patternValid and bearishShape
float dRatio = gartley ? 0.786 : bat ? 0.886 : butterfly ? 1.272 : crab ? 1.618 : na
float bcProjectionRatio = gartley ? 1.374 : (bat or butterfly) ? 2.118 : crab ? 2.929 : na
float abcdProjectionRatio = gartley ? 1.0 : crab ? 1.618 : 1.27
float xaProjection = patternValid ? (harmonicBull ? a - xa * dRatio : a + xa * dRatio) : na
float bcProjection = patternValid ? (harmonicBull ? c - bc * bcProjectionRatio : c + bc * bcProjectionRatio) : na
float abcdProjection = patternValid ? (harmonicBull ? c - ab * abcdProjectionRatio : c + ab * abcdProjectionRatio) : na
float projectionSpread = patternValid ? math.max(xaProjection, math.max(bcProjection, abcdProjection)) - math.min(xaProjection, math.min(bcProjection, abcdProjection)) : na
bool projectionsAgree = patternValid and projectionSpread <= math.max(atr * 0.75, xa * 0.05)
float przTolerance = math.max(atr * 0.15, nz(xa, 0.0) * 0.006)
float przLow = projectionsAgree ? math.min(xaProjection, math.min(bcProjection, abcdProjection)) - przTolerance : na
float przHigh = projectionsAgree ? math.max(xaProjection, math.max(bcProjection, abcdProjection)) + przTolerance : na
bool harmonicAtPrz = projectionsAgree and close >= przLow and close <= przHigh
string patternName = gartley ? "Gartley · 0.786" : bat ? "Bat · 0.886" : butterfly ? "Butterfly · 1.272" : crab ? "Crab · 1.618" : "Sin patrón validado"

bool bullZone = nearEmaZone or (harmonicAtPrz and harmonicBull)
bool bearZone = nearEmaZone or (harmonicAtPrz and harmonicBear)
bool enoughCycleHistory = intervalCount >= 3 and not na(cycleThreshold)
bool spikeSetup = enoughCycleHistory and driftCount >= cycleThreshold
bool sniperBuy = isBoom ? (spikeSetup and bullishRejection and bullZone) : (isGeneral and trendBull and bullishRejection and bullZone)
bool sniperSell = isCrash ? (spikeSetup and bearishRejection and bearZone) : (isGeneral and trendBear and bearishRejection and bearZone)
bool confirmedBuy = barstate.isconfirmed and enableSniper and sniperBuy
bool confirmedSell = barstate.isconfirmed and enableSniper and sniperSell

plot(ema20, "EMA 20", color=color.new(color.aqua, 15))
plot(ema50, "EMA 50", color=color.new(color.purple, 5), linewidth=2)
plot(patternValid and projectionsAgree ? przLow : na, "PRZ inferior confirmada", color=color.new(color.yellow, 20), style=plot.style_linebr)
plot(patternValid and projectionsAgree ? przHigh : na, "PRZ superior confirmada", color=color.new(color.yellow, 20), style=plot.style_linebr)
plotshape(confirmedBuy, title="Sniper BUY confirmado", style=shape.labelup, location=location.belowbar, color=color.new(color.green, 0), text="✓ BUY", textcolor=color.white, size=size.tiny)
plotshape(confirmedSell, title="Sniper SELL confirmado", style=shape.labeldown, location=location.abovebar, color=color.new(color.red, 0), text="✓ SELL", textcolor=color.white, size=size.tiny)

float stopDistance = math.max(atr * 0.75, confirmedBuy ? close - (ta.lowest(low, 5) - atr * 0.2) : confirmedSell ? (ta.highest(high, 5) + atr * 0.2) - close : atr * 0.75)
if (confirmedBuy or confirmedSell) and showLevels
    bool isLong = confirmedBuy
    float entry = close
    float stop = isLong ? entry - stopDistance : entry + stopDistance
    float target = isLong ? entry + stopDistance * 3 : entry - stopDistance * 3
    box.new(left=bar_index, top=isLong ? target : entry, right=bar_index + 12, bottom=isLong ? entry : target, bgcolor=color.new(color.green, 88), border_color=color.new(color.green, 30))
    box.new(left=bar_index, top=isLong ? entry : stop, right=bar_index + 12, bottom=isLong ? stop : entry, bgcolor=color.new(color.red, 88), border_color=color.new(color.red, 30))
    label.new(bar_index, entry, (isLong ? "BUY" : "SELL") + " · SL " + str.tostring(stop, format.mintick) + " · TP 3R", style=isLong ? label.style_label_up : label.style_label_down, color=isLong ? color.green : color.red, textcolor=color.white)

var table hud = table.new(position.top_right, 2, 7, bgcolor=color.new(color.black, 15))
if barstate.islast
    table.cell(hud, 0, 0, "AKIRA · ESCÁNER", text_color=color.white)
    table.cell(hud, 1, 0, syminfo.ticker + " · " + timeframe.period, text_color=color.aqua)
    table.cell(hud, 0, 1, "Feed", text_color=color.gray)
    table.cell(hud, 1, 1, barstate.isconfirmed ? "Cierre confirmado" : "Vela en formación", text_color=barstate.isconfirmed ? color.green : color.orange)
    table.cell(hud, 0, 2, "Tendencia", text_color=color.gray)
    table.cell(hud, 1, 2, trendBull ? "Alcista" : trendBear ? "Bajista" : "Sin filtro", text_color=trendBull ? color.green : trendBear ? color.red : color.gray)
    table.cell(hud, 0, 3, "Deriva / ciclo mediano", text_color=color.gray)
    table.cell(hud, 1, 3, enoughCycleHistory ? str.tostring(driftCount) + " / " + str.tostring(medianInterval, "#.0") + " velas" : "Histórico de spikes insuficiente", text_color=color.white)
    table.cell(hud, 0, 4, "Ciclos observados", text_color=color.gray)
    table.cell(hud, 1, 4, str.tostring(intervalCount), text_color=color.white)
    table.cell(hud, 0, 5, "Armónico", text_color=color.gray)
    table.cell(hud, 1, 5, harmonicAtPrz ? patternName + " · en PRZ" : patternValid ? patternName + " · fuera PRZ" : patternName, text_color=color.aqua)
    table.cell(hud, 0, 6, "Señal", text_color=color.gray)
    table.cell(hud, 1, 6, confirmedBuy ? "BUY" : confirmedSell ? "SELL" : "Esperando filtros", text_color=confirmedBuy ? color.green : confirmedSell ? color.red : color.gray)

alertcondition(confirmedBuy, title="Akira Sniper BUY", message="Akira: BUY confirmado al cierre en {{ticker}} · {{interval}} · {{close}}")
alertcondition(confirmedSell, title="Akira Sniper SELL", message="Akira: SELL confirmado al cierre en {{ticker}} · {{interval}} · {{close}}")
`;
})();
