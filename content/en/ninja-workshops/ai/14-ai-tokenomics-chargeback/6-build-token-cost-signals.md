---
title: 6. Build Token Cost Signals
weight: 6
---

Once AI spans carry owner dimensions, Splunk can connect built-in AI monitoring signals
to chargeback questions. The default workflow is:

1. Use AI Agent Monitoring for token usage, estimated cost, traces, latency, and errors.
2. Use the business attributes from the previous lab to filter traces and group
   dashboard views.
3. Add custom metrics only when a local or unsupported model path has a real signal
   gap.

## Validate Built-In AI Signals

{{% notice title="Exercise" style="green" icon="running" %}}

Confirm that the out-of-the-box AI data is arriving:

1. Open the AI monitoring overview for your Splunk Observability Cloud organization.
2. Confirm that the workload appears with request traces, token usage, estimated cost,
   latency, and errors.
3. Open a trace for the local app and confirm that the span contains token usage
   attributes and the business attributes from this lab.
4. Open **Metric Finder** and search for the token and estimated-cost metrics produced
   by your AI instrumentation.
5. Filter to your `deployment.environment` or `service.name`.
6. Confirm which business attributes are available for grouping in metrics. If a
   dimension is only on traces, use trace search or APM views for that question.

<!-- TODO screenshot: AI monitoring overview showing token usage and estimated cost for the workshop workload. -->
![Metric Finder token total grouped by team](images/metric-finder-token-total-by-team.png)

{{% /notice %}}

## SignalFlow Building Blocks

Use Metric Finder to copy the actual metric names from your environment. The names can
vary by provider, framework, and instrumentation version, so the snippets below use
placeholders.

```python
# Replace AI_BUILTIN_TOTAL_TOKENS with the total-token metric shown in Metric Finder.
data('AI_BUILTIN_TOTAL_TOKENS',
     filter=filter('deployment.environment', 'ai-tokenomics-workshop')).sum(by=['service.name']).publish(label='Tokens')
```

```python
# Replace AI_BUILTIN_ESTIMATED_COST_USD with the estimated-cost metric shown in Metric Finder.
data('AI_BUILTIN_ESTIMATED_COST_USD',
     filter=filter('deployment.environment', 'ai-tokenomics-workshop')).sum(by=['service.name', 'gen_ai.request.model']).publish(label='Estimated cost')
```

```python
# Cost per request by service or workload.
cost = data('AI_BUILTIN_ESTIMATED_COST_USD').sum(by=['service.name'])
requests = data('AI_BUILTIN_REQUEST_COUNT').sum(by=['service.name'])
(cost / requests).publish(label='Cost per request')
```

The companion file `workshop/ai-tokenomics-chargeback/dashboards/signalflow-examples.md`
contains more examples for dashboard charts and detectors.

## Tokenomics Views

Build charts that answer these questions:

| Question | Metric pattern |
| --- | --- |
| Which teams use the most tokens? | Built-in total-token signal grouped by `ai.team`, if available |
| Which business units consume the most? | Built-in estimated-cost signal grouped by `ai.business_unit`, if available |
| Which users are the largest consumers? | Trace search or bounded metric grouping by controlled `ai.user.id` |
| Which tenants drive output-heavy responses? | Built-in output-token signal grouped by `ai.tenant.id`, if available |
| Which model is most expensive? | Built-in estimated-cost signal grouped by `gen_ai.request.model` |
| Which workload has high cost per request? | Estimated cost divided by request count |
| What did we get for the spend? | cost divided by accepted or useful outcomes |
| Which requests have large context windows? | input tokens divided by request count |

{{% notice title="Exercise" style="green" icon="running" %}}

Create a draft dashboard named `AI Tokenomics and Chargeback - Workshop`:

1. Add a dashboard variable for `deployment.environment`.
2. Add a dashboard variable for `ai.team`.
3. Add dashboard variables for `ai.business_unit`, `ai.user.id`, and
   `gen_ai.request.model`.
4. Add a single value chart for total estimated cost from the built-in AI signal.
5. Add a stacked area chart for total tokens by BU where the BU attribute is available.
6. Add a table chart for cost by BU, user, tenant, workload, outcome, and model.
7. Add a chart for cost per accepted answer by workload.

<!-- TODO screenshot: Draft tokenomics dashboard with cost, tokens by team, cost table, and cost per request charts. -->
![Draft tokenomics dashboard](images/tokenomics-dashboard-draft.png)

{{% /notice %}}
