---
title: 8. Build Dashboards and Detectors
weight: 8
---

The final workshop artifact is a dashboard and a small set of detectors. The dashboard
answers "where is cost going?" The detectors answer "when should someone act?"

## Dashboard Layout

Use five sections:

1. **Executive summary** - total estimated cost, token cost, allocated GPU cost, total
   requests, and cost per request.
2. **Consumer breakdown** - cost and tokens by BU, user, team, tenant, cost center,
   workload, outcome, and model.
3. **Value view** - cost per accepted answer, cost per draft created, and cost for
   requests needing review.
4. **Model economics** - input/output token mix, request latency, cost per useful
   outcome, and model comparison.
5. **Placement and health** - local vs cloud cost, latency, errors, optional GPU
   utilization, power, idle capacity, and saturated capacity.

{{% notice title="Exercise" style="green" icon="running" %}}

Refine the dashboard:

1. Put owner filters at the top: `ai.business_unit`, `ai.user.id`, `ai.team`,
   `ai.tenant.id`, `ai.cost_center`, and `gen_ai.request.model`.
2. Add a markdown note that identifies the rate card version.
3. Add a chart for the built-in estimated-cost signal by `ai.business_unit` if that
   attribute is available as a metric dimension.
4. Add a chart for cost by controlled `ai.user.id`.
5. Add a chart for input vs. output tokens by model.
6. Add a chart for cost by `ai.outcome.category`.
7. Add latency, error, and optional GPU utilization charts.
8. Save the dashboard into a shared dashboard group.

<!-- TODO screenshot: Completed dashboard with executive, owner, model, and GPU sections. -->
![Completed AI tokenomics and chargeback dashboard](images/completed-tokenomics-chargeback-dashboard.png)

{{% /notice %}}

## Detector Patterns

Create detectors only when the signal maps to an action. Start with these:

| Detector | Signal | Owner |
| --- | --- | --- |
| Budget burn spike | Built-in estimated-cost signal above expected rate | Application owner |
| BU budget overrun | BU cost exceeds budget burn rate | BU owner |
| User misuse | One controlled user consumes abnormal token share | Application owner |
| Cost per request regression | Cost per request increases after deployment | Application owner |
| Poor value ratio | Cost per accepted outcome increases | Product owner |
| Token context explosion | Input tokens per request increases sharply | Application owner |
| GPU idle waste | Low `DCGM_FI_DEV_GPU_UTIL` while GPU capacity is allocated | Platform owner |
| GPU saturation | High GPU utilization and request latency | Platform owner |
| Unknown attribution | Cost where `ai.team` or `ai.cost_center` is `unknown` | Platform governance |

{{% notice title="Exercise" style="green" icon="running" %}}

Create a detector for unknown attribution:

1. Start from the built-in estimated-cost signal, or from the optional fallback metric
   if your local lab does not expose cost as a metric.
2. Filter `ai.team` to `unknown`.
3. Sum across all other dimensions.
4. Alert when the value is greater than zero for more than 15 minutes.
5. Set the runbook to the attribution checklist from this workshop.

Then create one cost detector and one GPU efficiency detector that match your lab.

{{% /notice %}}

{{< tabs >}}
{{% tab title="Question" %}}
**Why should unknown attribution be a detector?**
{{% /tab %}}
{{% tab title="Answer" %}}
**Unattributed AI cost becomes platform overhead by default. Alerting on unknown values
keeps telemetry quality from silently decaying.**
{{% /tab %}}
{{< /tabs >}}
