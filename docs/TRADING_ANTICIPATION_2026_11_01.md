# Automatic market profiles and anticipatory spikes — 2026-11-01

## Delivery and evidence

User authorized visible experimental demo signals. No broker orders, credential changes, external messages or database migrations. Strategies are assigned by explicit instrument identifiers; old manual selection is ignored. Unknown/binary products fail closed. Boom/Crash 300, 500 and 1000 are now in the chart catalogue. Gold/Forex/crypto retain their existing market policies and adverse/insufficient evidence, not a new profitability claim. Step retains its separate confirmation model.

A single Deriv socket carries the chart subscriptions plus a one-time M1 history request. The dedicated M1 buffer is updated from real ticks, with M5 context built only from complete bars; changing chart timeframe does not alter entry rules. Live monitoring covers the selected chart, not six markets simultaneously. A market change cancels pending entries and marks active monitored positions interrupted, with no invented exit. Reloading preserves and deduplicates the browser-local journal. This is not an always-on server or an MT5 account connection.

## Frozen hypotheses

Version `spike-anticipation-v1`. M1 Wilder RSI14 and ATR14 use a causal trailing 180-bar context. M5 range uses twelve completed bars. Boom buys in its bottom 20%; Crash sells in its top 20%. Model A requires RSI <=15 / >=85. Model B compares the two most recent strict pivots (two bars on each side), separated 5–60 bars, with a lower low/higher RSI or higher high/lower RSI. Signal timestamps are confirmation times, never pivot times. A model combination records both causes, with one position per market and 120-second cooldown after closure.

Entry expires after 20 seconds and rejects >0.2R price movement; the local forward monitor assumes a five-second reaction after the observed alert. Stop 2 ATR, TP1 1.5R, maximum hold 300 seconds after fill. Target fills are capped at TP1 conservatively; adverse gaps use observed prices. TP2/TP3 are references only. Missing-data intervals flag outcomes as uncertain and exclude them from the observed-result total. Costs and MT5 execution remain unknown.

The journal includes time, version, conditions, cancellations, stops, target/time exits and gaps; export is JSON to the user's device. Storage failure is surfaced. No journal is sent to GitHub, Telegram or a third party.

## Exploratory historical results

Reproducible CLI: `node scripts/run_anticipation_research.js <data-directory>`. Data are the existing six-symbol 2026-10-04–2026-10-31 reference-tick cache, hash-checked. 162 market-days / 27 days; six files on Oct 28 excluded for a gap. Two-hour warmup, session 08:00–16:00 Colombia. Three models (A, B, combined), 5/10/20-second reaction assumptions, zero/0.25R/0.50R round-trip cost scenarios. Random controls match attempted candidate counts, direction, duration and risk rules; cooldown can change realized trade counts. Per-market results cannot be summed into a feasible single-position portfolio.

| Market | Combined alerts/day, 5 s reaction | Mean per trade after assumed 0.25R cost |
|---|---:|---:|
| BOOM300N | 5.52 | -0.687 R |
| CRASH300N | 5.00 | -0.501 R |
| BOOM500 | 8.26 | -0.766 R |
| CRASH500 | 10.85 | -0.779 R |
| BOOM1000 | 18.48 | -0.988 R |
| CRASH1000 | 24.22 | -1.008 R |

All combined variants above are adverse, including before costs under conservative TP1 fills. This implementation does not achieve profitability. Some instruments exceed eight daily alerts on average; that is not eight winning trades or a guaranteed daily frequency. Individual-model and random-control results, zero-signal days and exclusions remain in `research/anticipation-exploratory.json`; detailed trade records remain in the local research cache beside the prior study.

Previously examined data are development data, not a new independent holdout. No model was selected by picking the final-period winner. Prospective validation still needs at least fourteen sessions and one hundred demo trades, with actual broker costs/execution evidence; cannot be completed in this release.

## Verification and release

Local tests: anticipation rules and causal timing; mirrored Boom/Crash direction; latency/expiry/price-chasing; target cap/adverse gaps; persistence/dedup; M5 chart with M1 analysis; existing connection/scanner/reference/scalping suites and twelve frontend guards. Mobile browser test covers 390px panel width, old preference migration, automatic profiles, demo visibility and absence of JS exceptions. CI runs the new module and browser checks alongside existing suites. See the PR and continuity handoff for publication evidence; source code presence alone is not deployment proof.

## Research provenance

- https://fxnx.com/en/blog/boom-crash-spike-detector-5-mechanical-entry-rules/ — published zone/RSI hypothesis, not verified performance.
- https://www.metatrader5.com/en/terminal/help/indicators/oscillators/rsi — RSI and divergence definitions.
- https://www.mql5.com/en/market/product/94646 — vendor description, not independently validated results.
- https://deriv.com/derived-indices/crash-boom-indices — average event frequencies, not a countdown.
- https://traders-academy.deriv.com/trading-guides/stop-loss-execution-boom-crash-indices — execution gaps and non-guaranteed stop prices.

No claim to reproduce the friend's proprietary indicator or financial results.
