---
title: 1. Define the Chargeback Model
weight: 1
---

Chargeback works only when the telemetry answers the same questions that finance,
platform engineering, and application teams are asking. Before opening a dashboard,
define the dimensions and cost rules that every chart will use.

## Tokenomics vs. Chargeback

**Tokenomics** explains how tokens are consumed: prompt tokens, completion tokens,
requests, model mix, latency, context size, and user or tenant behavior.

**Chargeback** maps that consumption to an owner and a rate card. In this workshop, that
owner is a team, tenant, cost center, workload, and model. Your organization might use
different names, but the pattern is the same.

## Required Dimensions

Use low-cardinality, stable dimensions. Do not put prompt text, user email addresses,
session IDs, request IDs, or raw account names on metric dimensions or span attributes.

| Dimension | Purpose | Example |
| --- | --- | --- |
| `ai.team` | Team accountable for cost | `support-ai` |
| `ai.cost_center` | Finance allocation code | `cc-ml-1200` |
| `ai.tenant.id` | Customer, business unit, or internal tenant | `tenant-enterprise` |
| `ai.workload.name` | AI application or workflow | `support-rag` |
| `ai.product_area` | Product or business capability | `customer-support` |
| `gen_ai.request.model` | Model used for the request | `llama3.2:1b` |
| `deployment.environment` | Environment boundary | `local-workshop` |
| `host.name` or `k8s.cluster.name` | Infrastructure boundary | `mk-laptop` |

## Cost Pools

Separate cost pools by how the cost is created:

* **Token cost** - input and output tokens multiplied by a model rate card.
* **Accelerator capacity cost** - GPU-hours, laptop/workstation amortization,
  reservation cost, or internal platform rate.
* **Energy cost** - optional energy allocation from measured or estimated power draw.
* **Platform overhead** - shared collector, vector database, storage, networking, and
  operational overhead.

## Where Rate Card Values Come From

A workshop rate card should be simple, but it should not be random. Use one of these
sources depending on how the AI workload is hosted:

| Hosting model | Where to get the rate | Workshop use |
| --- | --- | --- |
| Managed API model | Provider pricing page with input, cached input, output, tool, and request rates | Direct token cost |
| GitHub Copilot-style usage | Model token rates converted into credits or dollars | Example of token-based internal billing |
| Hugging Face Inference Providers | Provider pass-through token rates and usage breakdown | Managed model showback |
| Hugging Face Inference Endpoints | GPU instance hourly rates, billed by running endpoint time | Dedicated GPU pool cost |
| Local Ollama, llama.cpp, vLLM, or NIM | Observed token throughput plus an hourly accelerator cost model | Internal token economics |
| Self-hosted NIM or vLLM on a cluster | Cloud GPU hourly cost, reserved capacity cost, license cost, and platform overhead | Shared GPU allocation |

This workshop demonstrates three cards:

| Card | Source | Purpose |
| --- | --- | --- |
| Managed online | Public provider pricing page | Compare against an API model with published `$ / 1M` token prices |
| Local Ollama | Local benchmark, watts, electricity, and optional amortization | Estimate laptop or workstation economics |
| On-prem GPU pool | Customer cost pool, GPU-hours, utilization target, and token throughput | Estimate Cisco AI Pods or similar data-center economics |

The workshop includes a starter file you can copy and edit:

```text
workshop/ai-tokenomics-chargeback/rate-card-example.yaml
```

It also includes a model decision card:

```text
workshop/ai-tokenomics-chargeback/model-decision-card-example.yaml
```

Use the model decision card when price is not enough. It keeps the model-card facts,
leaderboard snapshot, rate-card economics, observed workload behavior, and placement
rationale in one reviewable artifact.

## Rankings and Model Cards

Leaderboards are useful, but they are not model cards and they are not rate cards. Use
them as dated evaluation snapshots:

| Source | What it helps answer | Workshop use |
| --- | --- | --- |
| LMArena / Chatbot Arena | Which model do users prefer for broad interactive tasks? | General quality and user preference signal |
| Hugging Face Open LLM Leaderboard | How do open-weight models compare on reproducible benchmark suites? | Open model comparison |
| Stanford HELM | How does a model behave across specific scenarios, safety, robustness, and transparency dimensions? | Scenario-specific risk and capability review |
| Internal evaluation | Does the model perform well on this customer's prompts, retrieval data, and outcome criteria? | Final production decision |

Capture leaderboard data with the source URL, capture date, task, metric name, rank,
and score. Do not copy a leaderboard rank into the model card as if it were permanent.
Ranks change, benchmark coverage differs, and a high general ranking does not guarantee
good performance for a specific support, coding, legal, healthcare, or retrieval task.

{{% notice title="Exercise" style="green" icon="running" %}}

Create a simple workshop rate card before continuing. For this lab, derive the token
rates from local throughput instead of copying a managed API token price.

Use the cheapest honest model first: energy-only cost on the local Mac. This answers
"what did this one Ollama call add to my electric bill?" It is a lower bound, not a
production chargeback rate.

Keep the rate card in per-million-token units. The per-request number is useful for
intuition, but per-million input and output token rates are the normalized units used by
the app, dashboard, simulator, and chargeback model.

1. Pick a local model, for example `llama3.2:1b`.
2. Measure or choose the local load power in watts while the model is answering.
3. Measure or choose the idle baseline in watts.
4. Use the latest U.S. average residential electricity price from EIA. The workshop
   default is `$0.1856/kWh`, from EIA March 2026 data.
5. Set hardware, support, and overhead to zero for the energy-only lower bound.
6. Confirm the currency is `USD`.
7. Confirm the rate-card version, for example `workshop-2026-06`.

For a short lab, this is enough:

| Input | Workshop value | Why this value exists |
| --- | --- |
| Local model | `llama3.2:1b` | Small local model that runs on a laptop with Ollama |
| Load power | `30 W` | Example measured or estimated system draw while the model responds |
| Idle power | `6.88 W` | Apple-published idle display-on value for a 16-inch 2023 MacBook Pro at 115V |
| Incremental power | `23.12 W` | `30 W - 6.88 W`; the extra power attributed to the local request |
| Electricity rate | `$0.1856/kWh` | EIA U.S. residential average for March 2026 |
| Hardware cost | `$0.00/hour` | Zero for energy-only; add amortization later for chargeback |
| Support cost | `$0.00/hour` | Zero for energy-only; add platform support later for chargeback |
| Overhead | `0%` | Zero for energy-only; use `15%` only for fully loaded platform cost |
| Derived input token rate | Calculated by the benchmark | Based on prompt tokens and prompt evaluation time |
| Derived output token rate | Calculated by the benchmark | Based on completion tokens and completion time |

Do not use the `140 W` power adapter rating as the workload power. Adapter wattage is
maximum capacity, not actual draw. Use measured wall power, measured macOS system power,
or a clearly labeled estimate.

## Calculation Inputs

The benchmark uses this formula:

```text
energy_hourly_usd =
  load_power_watts / 1000 * electricity_usd_per_kwh

incremental_energy_hourly_usd =
  (load_power_watts - idle_power_watts) / 1000 * electricity_usd_per_kwh

effective_hourly_cost =
  (accelerator_hourly_usd + support_hourly_usd + energy_hourly_usd)
  * (1 + overhead_percent / 100)

input_usd_per_1m =
  effective_hourly_cost * (prompt_eval_seconds / 3600)
  / prompt_tokens * 1,000,000

output_usd_per_1m =
  effective_hourly_cost * (completion_eval_seconds / 3600)
  / completion_tokens * 1,000,000

energy_cost_per_request =
  load_power_watts / 1000 * average_wall_seconds / 3600
  * electricity_usd_per_kwh
```

Every constant in the formula has a narrow meaning:

| Constant | Meaning |
| --- | --- |
| `1000` | Converts watts to kilowatts, because electricity is priced per kWh |
| `3600` | Converts seconds to hours, because hourly cost is dollars per hour |
| `1,000,000` | Scales a tiny per-token cost into a readable per-1M-token rate |
| `load_power_watts` | Average system or wall draw while the Ollama call is running |
| `idle_power_watts` | Baseline draw before the model call; subtract it for incremental cost |
| `electricity_usd_per_kwh` | Local electricity price; use EIA U.S. average only for the workshop default |
| `accelerator_hourly_usd` | Optional cloud GPU, amortized hardware, or internal capacity rate |
| `support_hourly_usd` | Optional license, support, or platform labor allocation |
| `overhead_percent` | Optional shared platform overhead; use `0` for pure energy-only cost |
| `prompt_eval_seconds` | Ollama-reported time spent processing input tokens |
| `completion_eval_seconds` | Ollama-reported time spent generating output tokens |

Then decide which attribution dimensions are mandatory for your lab:

1. Choose one primary owner dimension: `ai.team` or `ai.tenant.id`.
2. Choose one finance dimension: `ai.cost_center`.
3. Choose one workload dimension: `ai.workload.name`.
4. Choose the model dimension: `gen_ai.request.model`.
5. Write down the default value you will use when an application does not provide one.

{{% /notice %}}

{{< tabs >}}
{{% tab title="Question" %}}
**Why not use `user.id` as the main chargeback dimension?**
{{% /tab %}}
{{% tab title="Answer" %}}
**It usually creates high-cardinality telemetry and weak finance ownership. Use stable
team, tenant, workload, and cost center dimensions for chargeback.**
{{% /tab %}}
{{< /tabs >}}
