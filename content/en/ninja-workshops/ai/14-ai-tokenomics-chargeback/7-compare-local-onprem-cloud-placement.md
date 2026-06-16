---
title: 7. Compare Local, On-Prem, and Cloud Placement
weight: 7
---

Token cost is directly attributable when the application reports owner dimensions.
Accelerator cost can be local, on-prem, or cloud-based. A laptop GPU might serve one
developer, an on-prem GPU pool might serve many business units, and a cloud endpoint
might charge by running GPU-hour. Your placement decision must consider cost,
utilization, reliability, latency, and operational control.

## Allocation Options

| Model | Best for | Tradeoff |
| --- | --- | --- |
| Reservation-based | Dedicated GPU quotas or namespaces | Simple, but charges idle capacity to the owner |
| Token-weighted | Shared model serving with good token telemetry | Fair for LLM serving, but ignores non-token GPU work |
| Request-time weighted | Request traces include model latency and owner | Better for mixed request cost, but needs consistent traces |
| Energy-weighted | DCGM power or energy data is trusted | Good for sustainability reporting, but still needs attribution |
| Local throughput | Laptop/workstation model benchmark | No cluster needed, but it is a rate-card estimate rather than fleet telemetry |
| Cloud proxy | Public endpoint or cloud GPU hourly rate | Good for placement comparison, but not a negotiated internal price |

For the local workshop, start with throughput-derived rates from the benchmark and
compare them with a public cloud proxy:

```text
local_cost_per_1m_tokens = benchmark-derived local blended rate
cloud_cost_per_1m_tokens = cloud hourly proxy / observed or expected cloud throughput
placement_delta = cloud_cost_per_1m_tokens - local_cost_per_1m_tokens
```

For a shared GPU workshop, use token-weighted allocation:

```text
team_gpu_cost = gpu_pool_cost * team_tokens / all_tokens
```

For production, decide whether idle GPU capacity is platform overhead, charged to
reserved tenants, or allocated proportionally across active consumers.

## Infrastructure Health Signals

Use these signals to decide whether the workload is healthy enough to stay where it is:

| Signal | Local source | Cloud/on-prem source |
| --- | --- | --- |
| Request latency | App traces and Ollama durations | App traces and endpoint latency |
| Error rate | HTTP status and trace errors | HTTP status, endpoint health, pod restarts |
| Token throughput | Benchmark and live token metrics | NIM/vLLM token metrics |
| Utilization | Local GPU tools or host metrics | DCGM GPU metrics |
| Power and energy | Estimated watts or local telemetry | DCGM power and energy metrics |
| Cost efficiency | Cost per accepted outcome | Cost per accepted outcome |

## Optional GPU Metrics to Review

The Cisco AI Pods collector examples already include the GPU metrics used for
allocation and efficiency:

* `DCGM_FI_DEV_GPU_UTIL`
* `DCGM_FI_DEV_FB_USED`
* `DCGM_FI_DEV_POWER_USAGE`
* `DCGM_FI_DEV_TOTAL_ENERGY_CONSUMPTION`
* `DCGM_FI_PROF_GR_ENGINE_ACTIVE`
* `DCGM_FI_PROF_PIPE_TENSOR_ACTIVE`

{{% notice title="Exercise" style="green" icon="running" %}}

Build a GPU pool view:

1. Open the `Cisco AI PODs Dashboard`.
2. Filter to your cluster.
3. Note the number of GPUs and average GPU utilization.
4. In Metric Finder, open `DCGM_FI_DEV_GPU_UTIL` and group by node or GPU identifier.
5. Open `DCGM_FI_DEV_POWER_USAGE` and compare power use with utilization.
6. Record the workshop GPU platform rate from your rate card.

<!-- TODO screenshot: GPU utilization and power usage grouped by GPU or node. -->
![GPU utilization and power grouped by GPU](images/gpu-utilization-power.png)

{{% /notice %}}

## Make the Placement Decision

In a dashboard, show the placement decision in three steps:

1. Local or on-prem cost:

```text
local_cost = local_token_rate * tokens + local_overhead
```

2. Cloud proxy cost:

```text
cloud_cost = cloud_token_rate_or_gpu_hourly_proxy * usage
```

3. Decision:

```text
run_local_when = lower cost + healthy infrastructure + acceptable latency
run_cloud_when = better reliability, scale, latency, compliance, or lower fully loaded cost
```

{{% notice title="Exercise" style="green" icon="running" %}}

Add placement charts to the dashboard:

1. Add a single value for local estimated cost.
2. Add a single value for cloud proxy cost.
3. Add a delta chart showing local vs cloud cost per 1M tokens.
4. Add latency and error charts next to the cost comparison.
5. Add a table that shows BU, user, tokens, estimated cost, outcome category, and cost
   per useful outcome.

{{% /notice %}}

{{< tabs >}}
{{% tab title="Question" %}}
**Why show GPU utilization next to chargeback cost?**
{{% /tab %}}
{{% tab title="Answer" %}}
**It separates cost ownership from efficiency. A team can be charged for usage while the
platform team still sees idle or saturated GPU capacity.**
{{% /tab %}}
{{< /tabs >}}
