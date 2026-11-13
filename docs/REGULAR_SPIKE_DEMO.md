# Demo by extreme zones — 2026-11-13

Default manual-practice mode for BOOM300N/CRASH300N/BOOM500/CRASH500/BOOM1000/CRASH1000. It replaces neither gold nor other financial profiles. The prior scanner remains selectable inside the existing collapsed details section. No broker orders, Telegram, verified profitability or win-rate claims.

Every fresh closed M1 candle: use exactly240 contiguous closed M1 candles, last12 complete M5 candles for range, RSI14 and ATR14 on M1. Boom: lower20% of M5 range and RSI<=20, buy. Crash: upper20% and RSI>=80, sell. No countdown, elapsed-tick trigger or forced minimum cadence. M5 changes the view, not the analysis timeframe. At least240 historical M1 bars are required, not240 minutes of keeping the browser open if history is already loaded.

Fixed signal-close entry, stop2ATR, targets1.5R/2R/3R, manual expiry20s or0.2R displacement. Five-second hypothetical reaction, maximum300s tracking,120s cooldown after all target alternatives complete, no overlapping tracking. No invented lots; existing per-symbol contract checks remain. Daily loss lock only covers calculable local hypothetical results, not actual MT5 account activity.

Research is exploratory on already examined data. The first10/90 RSI implementation produced no Boom300 signals in the sampled interval; thresholds20/80 were chosen to broaden demo practice, not fitted to improve profitability. This is not an independent holdout or a claim of better economics. Related extreme-zone strategies previously lost. Exact-controller frequency/results are recorded separately; do not reuse prior results as performance of this version.

Tests cover all six directions, level ordering, stale/corrupt/gapped data rejection, closed M5, future invariance, warmup, flat market rejection, non-spike market exclusion, controller emission without a probability model, deduplication and market-switch isolation. Existing browser rendering tests cover mobile and desktop.
