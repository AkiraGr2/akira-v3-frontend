# Chart follow-up — 2026-11-13

Entry validity remains 20 seconds; it is separate from price-level observation. Continuous fresh ticks record crossings of the original or edited SL/TP independently of hypothetical trades. Stops remain stops; gaps and reloads are incomplete observations. No broker orders or profit claim.

Chart levels span the plot at actual prices, with a shaded risk/reward area and separated labels. Right margin protects candles; Ver señal focuses the recent 18 bars. Reconnect is available on stale data.

Deriv server time is sampled every 25 seconds; responses over 2 seconds RTT are rejected. Freshness uses this clock to reduce device-clock discrepancies. This is not cloud synchronization: settings, captured signals and journals remain browser-local; identical signals across devices are not guaranteed.

Validation: connection lifecycle including server-clock skew, plan expiry/stop/targets/gaps, manual UI, regular and turn strategies, Chrome mobile and desktop chart checks. No changes to strategy economics, backend or broker execution.
