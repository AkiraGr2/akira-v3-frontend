# Manual spike scanner — 2026-11-08

Visual update 2026-11-09: entry checkmark is anchored to the observed candle; entry/SL/TP1–3 labels and translucent risk/target zones render directly on the chart. Expired entries are muted and labeled expired. The Levels toggle controls these overlays, and offscreen signals are not relocated to another candle. Details, sizing, evidence and history are collapsed under one section. The visible strip offers one copy-all action, valid only for a fresh non-expired signal. No strategy or profitability criteria were changed by this visual update. Browser regression covers actual rendering at390px and1280px.

Trading Lab observes the selected Boom/Crash 300/500/1000 market. It displays experimental BUY/SELL, entry, SL and TP1/2/3 for manual placement in MetaTrader. It does not send orders, authorize a broker, or claim to record actual executions. Other market profiles remain separate.

The causal detector compares directional changes with three times the median of the previous 300 absolute tick changes. A regularized three-class model estimates events within 60 seconds, 61–300 seconds, or no event. Elapsed ticks are not a countdown or a probability of profit. Five of six models failed to improve Brier score against base rates; Boom500 improved only marginally. Artifact economicValidation remains false.

The fixed experimental trigger requires 45/60 counter-spike changes, median absolute20 <= 0.8 median previous60, and modeled probability > training baseline + 0.05 for either horizon; no entry on the spike tick. Warmup: 300 observed changes, an observed event, 20 contiguous closed M1 candles. Refresh prediction every10 seconds and on detected events. Same-market M1/M5 view changes retain tick state; gaps >5 seconds reset it.

SL distance is max(120 median absolute300, 1.5 median range20M1, valid contract stop minimum). Targets are alternative full exits at1R/2R/3R. Fixed prices expire after20 seconds or >0.2R displacement. All candidates are observed with a hypothetical5-second reaction, stop at observed price, targets capped, maximum300 seconds. Gaps censor outcomes.

USD sizing uses confirmed per-symbol contract data and costs, 1% budget, floor lot steps, minimum lot and margin checks. Missing specifications leave lot unavailable while price levels remain usable for demo analysis. The 2% daily guard covers only calculable local hypothetical outcomes, never the user's MT5 account. No invented pip-to-dollar conversion.

## Historical result — unfavorable

Known October4–31 history (October28 excluded for gaps) plus previously inspected November1 samples: 1297.19 combined market-hours;27 candidates,27 hypothetical fills. TP1:3 positive,24 stops, gross -19.847R; TP2 gross -16.847R; TP3 gross -16.226R. Assumed0.25R cost yields -26.597R/-23.597R/-22.976R respectively. These are alternative scenarios, not summed profits, not USD and not independent validation. No strategy is promoted to profitable/validated.

Source evaluation and data hashes are archived locally in `.akira-market-research/tick-probability-v1/trigger-results.json` and `EVALUATION_PROTOCOL.md`. Public probability artifact is `research/tick-probability-v1.json`. UI exposure is for experimental demo observations only. Future economic validation requires new data and actual contract costs.
