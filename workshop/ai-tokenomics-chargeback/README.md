# AI Tokenomics and GPU Chargeback Workshop Assets

These files support the workshop at:

```text
content/en/ninja-workshops/ai/14-ai-tokenomics-chargeback
```

The assets are intentionally small. They show an out-of-the-box-first telemetry flow:
use Splunk AI Agent Monitoring for AI request traces, token usage, and estimated cost,
then add only the business context needed for chargeback. The local throughput
benchmark helps derive an internal rate card without requiring a Kubernetes cluster.
The Cisco AI Pods path remains useful when you have shared GPU infrastructure telemetry.

## Files

* `instrumentation/tokenomics_instrumentation.py` - Python helper that enriches the
  active AI span with business context, token usage, and an internal cost estimate.
* `clean-llm-app/` - Starter Flask/Ollama app with no tokenomics instrumentation.
* `local-llm-app/` - Runnable Flask app that calls local Ollama and emits AI spans with
  chargeback attributes.
* `k8s/llm-app-chargeback-patch.yaml` - Kubernetes patch that adds default owner
  metadata to the sample `llm-app` deployment.
* `collector/otel-collector-chargeback-values.yaml` - Collector processor additions
  and metric allowlist examples for chargeback dimensions.
* `dashboards/signalflow-examples.md` - SignalFlow snippets for dashboards and
  detectors.
* `rate-card-example.yaml` - Public-source-backed workshop rate card examples for
  token and GPU-hour pricing.
* `model-decision-card-example.yaml` - Combines model-card facts, leaderboard
  snapshots, local/on-prem/online rates, and placement rationale.
* `scripts/benchmark_ollama.py` - Local Ollama benchmark that derives input, output,
  and blended token rates from observed throughput and an hourly cost model.
* `scripts/compare_rate_cards.py` - Compares the local benchmark output with managed
  online model pricing and optional on-prem rate-card values.
* `scripts/simulate_token_cost_risk.py` - Synthetic event generator for token surge,
  tenant misuse, unknown attribution, and chargeback alarm labs.

## Recommended Flow

### Local Model Path

1. Start with `clean-llm-app/` and confirm the app can answer questions.
2. Run `scripts/benchmark_ollama.py` against the local model.
3. Start with energy-only cost: load watts, idle watts, and electricity price.
4. Use the derived per-million-token rates as the workshop rate card.
5. Compare the local rate with a managed online model price using
   `scripts/compare_rate_cards.py`.
6. Capture a ranking/evaluation snapshot in `model-decision-card-example.yaml`.
7. Manually add OpenTelemetry packages to the clean app.
8. Add the span-enrichment helper and owner/outcome dimensions.
9. Compare your result with `local-llm-app/`.
10. Optionally compare against hardware amortization, on-prem GPU rates, or a public
   cloud proxy.
11. Run `scripts/simulate_token_cost_risk.py` to practice proactive cost alarms.

### Shared GPU Path

1. Deploy the Cisco AI Pods workshop collector and LLM application.
2. Confirm AI Agent Monitoring, DCGM, NIM, Kubernetes, and APM data in Splunk
   Observability Cloud.
3. Add the attribution defaults from `k8s/llm-app-chargeback-patch.yaml`.
4. Add business attribution attributes to the application spans.
5. Confirm the built-in AI token usage and estimated-cost signals in AI monitoring and
   Metric Finder.
6. If a local or unsupported workload has a metric gap, review the optional fallback
   examples in `collector/otel-collector-chargeback-values.yaml`.
7. Build dashboards and detectors with the SignalFlow examples.

The local and on-prem rate card values in these files are workshop examples. Managed
online rates must be verified on the provider pricing page, and production chargeback
should use the customer's approved internal rate card.
