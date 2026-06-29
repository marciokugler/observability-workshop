---
title: 3. Measure Local and Cloud Model Economics
weight: 3
---

This lab measures local model throughput and converts that throughput into per-million
token rates. You will also calculate the cost of one Ollama call so the numbers feel
real, then compare the local energy-only lower bound with public online model pricing.
No Kubernetes cluster is required.

## Why Local Throughput Matters

Managed API providers publish token prices because they own the infrastructure and
already know their cost model. For local or self-hosted inference, you have to derive
the economics:

```text
token economics = hourly accelerator cost / observed token throughput
```

That hourly cost can be a public market proxy, an internal amortized hardware cost, an
energy-only lower bound, or a fully loaded platform cost. Online providers usually
publish direct per-million-token prices. The workshop keeps per-million token rates
because they are easier to compare across local, on-prem, and online choices than a
single request cost.

## Know the Local Machine

Use the local machine as a real input, not an anonymous laptop. On macOS, collect the
hardware facts:

```bash
system_profiler SPHardwareDataType SPDisplaysDataType SPPowerDataType
```

For example, the instructor machine used to validate this lab is a 16-inch 2023
MacBook Pro with Apple M2 Pro, 12 CPU cores, 19 GPU cores, 16 GB memory, and a 140W
power adapter. The 140W adapter is capacity, not workload draw. Do not use it as the
Ollama power number.

For power inputs:

| Value | Source | Workshop default |
| --- | --- | --- |
| Load power | Measured wall power, macOS power telemetry, or a documented estimate while Ollama runs | `30 W` |
| Idle power | Baseline before the model call. Apple publishes `6.88 W` idle display-on at 115V for 16-inch MacBook Pro 2023 | `6.88 W` |
| Electricity price | EIA U.S. residential average, or your local utility rate | `$0.1856/kWh` |
| Incremental power | `load_power_watts - idle_power_watts` | `23.12 W` |

If you can use sudo, macOS can show estimated subsystem power:

```bash
sudo powermetrics -i 1000 -n 10 --samplers gpu_power,cpu_power
```

Use `powermetrics` for optimization and for separating CPU/GPU behavior. For billing
math, prefer wall or system load watts because an Ollama call uses more than just GPU:
CPU, memory, storage, display, fans, and adapter losses can all contribute.

## Run Ollama Locally

Ollama's API returns usage metrics that are useful for this lab, including
`prompt_eval_count`, `eval_count`, `prompt_eval_duration`, `eval_duration`, and
`total_duration`.

{{% notice title="Exercise" style="green" icon="running" %}}

Start a local model:

```bash
ollama pull llama3.2:1b
ollama serve
```

In another terminal, run the benchmark with the energy-only lower bound:

```bash
python3 workshop/ai-tokenomics-chargeback/scripts/benchmark_ollama.py \
  --model llama3.2:1b \
  --load-power-watts 30 \
  --idle-power-watts 6.88 \
  --electricity-usd-per-kwh 0.1856 \
  --overhead-percent 0 \
  --iterations 3 \
  --json-out /tmp/local-llm-tokenomics.json
```

If you do not have Ollama installed, pair with another attendee or use the sample JSON
provided by the instructor. The economics model is the same.

{{% /notice %}}

## Choose the Hourly Cost Model

Use one of these models during the lab:

| Cost model | Formula | When to use |
| --- | --- | --- |
| Market proxy | Public GPU endpoint hourly price | Local-vs-cloud comparison across mixed laptops |
| Hardware amortization | `((purchase_price * gpu_allocation_ratio) - residual_value) / useful_life_hours` | Owned laptop or workstation |
| Energy-only | `watts / 1000 * electricity_rate` | Demonstrating the absolute lower bound |
| Fully loaded platform | Hardware + energy + support + license + platform overhead | Production showback or chargeback |

The benchmark prints two kinds of numbers:

| Output | What it means | Where to use it |
| --- | --- | --- |
| Energy cost per request | The estimated electric-bill cost of one average Ollama call | Explanation and sanity checks |
| Energy cost per 1K requests | Same cost scaled to a small batch | Explanation and demos |
| Input rate per 1M tokens | Normalized prompt token cost | Rate card and app setting |
| Output rate per 1M tokens | Normalized completion token cost | Rate card and app setting |
| Blended rate per 1M tokens | Combined rate across input and output | Local-vs-cloud comparison |

On the M2 Pro validation run, using `30 W` load power and `$0.1856/kWh`, the benchmark
produced this energy-only lower bound:

```text
Effective hourly cost: $0.005568
Prompt throughput: 1198.37 tokens/sec
Output throughput: 98.16 tokens/sec
Energy cost/request: about $0.00000319 total load
Derived input rate: $0.001291 per 1M tokens
Derived output rate: $0.015756 per 1M tokens
Derived blended rate: $0.017207 per 1M tokens
```

Those numbers are intentionally tiny. That is the point: electricity-only cost is real,
but it is not a complete chargeback rate. It excludes hardware purchase, useful life,
support, software, idle capacity, and platform overhead.

## Compare With Online Model Pricing

Now compare the local rate card with a public managed online model. Use a current
provider pricing page and enter the input/output rates exactly as published. For
example, Mistral's public pricing page states that Mistral Large is charged per million
input and output tokens.

{{% notice title="Exercise" style="green" icon="running" %}}

Compare your local Ollama rate card with a managed online rate card:

```bash
python3 workshop/ai-tokenomics-chargeback/scripts/compare_rate_cards.py \
  --local-json /tmp/local-llm-tokenomics.json \
  --online-model mistral-large-public-example \
  --online-input-usd-per-1m 2.00 \
  --online-output-usd-per-1m 6.00 \
  --json-out /tmp/local-vs-online-tokenomics.json
```

The script uses the average prompt and completion tokens from your local benchmark.
You can also compare a specific request shape:

```bash
python3 workshop/ai-tokenomics-chargeback/scripts/compare_rate_cards.py \
  --local-json /tmp/local-llm-tokenomics.json \
  --online-model mistral-large-public-example \
  --online-input-usd-per-1m 2.00 \
  --online-output-usd-per-1m 6.00 \
  --prompt-tokens 650 \
  --completion-tokens 180
```

Record the price-only winner, but do not stop there. A local model can be cheaper and
still be the wrong placement if quality, latency, resilience, data governance, or
operational support are worse. A managed online model can be more expensive and still
be the right placement when the workload needs higher quality, larger context, global
scale, or lower operations burden.

{{% /notice %}}

## Add a Ranking Snapshot

Before choosing a placement, capture one quality signal. Use a public leaderboard when
the model appears there, or use an internal evaluation when it does not.

{{% notice title="Exercise" style="green" icon="running" %}}

Open the model decision card:

```text
workshop/ai-tokenomics-chargeback/model-decision-card-example.yaml
```

Fill in one `ranking_snapshots` entry:

1. Choose a source such as LMArena, Hugging Face Open LLM Leaderboard, Stanford HELM,
   or an internal evaluation.
2. Record the `captured_at` date.
3. Record the task or scenario being evaluated.
4. Record the rank and score if the model appears on the leaderboard.
5. Add a short note that explains whether the ranking is relevant to this workload.

For the local `llama3.2:1b` lab, it is acceptable if a public leaderboard does not list
the exact Ollama tag. In that case, leave rank and score blank and write the reason in
`notes`. The decision card is still useful because it documents that price was measured
but quality still needs a task-specific check.

{{% /notice %}}

{{% notice title="Exercise" style="green" icon="running" %}}

Run the benchmark again using a fully loaded local model:

```bash
python3 workshop/ai-tokenomics-chargeback/scripts/benchmark_ollama.py \
  --model llama3.2:1b \
  --accelerator-hourly-usd 0.125 \
  --support-hourly-usd 0.05 \
  --load-power-watts 30 \
  --idle-power-watts 6.88 \
  --electricity-usd-per-kwh 0.1856 \
  --overhead-percent 15
```

Compare the derived input, output, and blended per-million token rates with the
energy-only run. The per-request energy number will remain tiny, but the per-million
rates will increase once hardware and support are included.

{{% /notice %}}

{{< tabs >}}
{{% tab title="Question" %}}
**Why is energy-only cost usually too low for chargeback?**
{{% /tab %}}
{{% tab title="Answer" %}}
**It ignores hardware purchase cost, useful life, support, licenses, idle capacity,
operations, and platform overhead. It is useful as a lower bound, not as a production
rate.**
{{% /tab %}}
{{< /tabs >}}

## Optional Shared GPU Path

If you have a monitored GPU cluster, you can supplement the local benchmark with
out-of-the-box telemetry:

* **GPU utilization and capacity** - `DCGM_FI_DEV_GPU_UTIL`, `DCGM_FI_DEV_FB_USED`,
  `DCGM_FI_DEV_FB_FREE`, `DCGM_FI_PROF_GR_ENGINE_ACTIVE`, and
  `DCGM_FI_PROF_PIPE_TENSOR_ACTIVE`.
* **GPU power and energy** - `DCGM_FI_DEV_POWER_USAGE` and
  `DCGM_FI_DEV_TOTAL_ENERGY_CONSUMPTION`.
* **NIM request and token metrics** - `prompt_tokens_total`,
  `generation_tokens_total`, `request_prompt_tokens`, `request_generation_tokens`,
  `time_to_first_token_seconds`, and `time_per_output_token_seconds`.
* **APM and AI traces** - spans that show LLM calls, model names, latency, and token
  details when AI instrumentation is enabled.

The local benchmark produces the rate card. The shared GPU telemetry helps validate
utilization and allocation at platform scale.

## Source Notes

Use current source data when teaching the lab:

* Apple technical specs identify the 16-inch 2023 MacBook Pro M2 Pro configuration,
  including 12 CPU cores, 19 GPU cores, 100Wh battery, and 140W adapter:
  <https://support.apple.com/en-us/111838>.
* Apple's 16-inch MacBook Pro Product Environmental Report publishes idle display-on
  power for the 2023 model and documents how Apple measures power:
  <https://www.apple.com/environment/pdf/products/notebooks/16-inch_MacBook_Pro_PER_Jan2023.pdf>.
* EIA Electric Power Monthly Table 5.6.A publishes U.S. average electricity prices by
  sector and state. The March 2026 U.S. residential average is `18.56` cents/kWh:
  <https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_6_a>.
* Mistral's pricing page explains that it charges per million tokens processed and
  gives public input/output token prices for managed online models:
  <https://mistral.ai/pricing/>.
* OpenAI publishes API prices per 1M tokens and notes that tokens are billed at the
  chosen model's input and output rates:
  <https://developers.openai.com/api/docs/pricing>.
