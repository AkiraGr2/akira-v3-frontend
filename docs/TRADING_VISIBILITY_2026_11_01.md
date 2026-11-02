# Trading visibility correction

The entry check mark was incorrectly conditional on a Sniper channel. Render it independently. Keep the harmonic toggle beside the chart and show explicit no-pattern/offscreen/hidden status. Harmonic confirmation excludes the forming candle; D uses AD/XA (not the nonexistent XD field) and the shaded PRZ uses validated price bounds. No ratio tolerances or strategy entry rules were relaxed.

The simple entry summary distinguishes active tracking from an expired entry window, shows the current wait reason and a local per-market saved-alert count when no current signal exists. Counts are not reconstructed historical signals or profitability evidence.

Browser regression exercises a valid Gartley through the real detector/canvas, a check mark without a channel, visible entry text, tracking after the entry window, and no-pattern/no-signal state. Strategy remains experimental demo with unfavorable historical results. Deployment verification is recorded separately after CI.
