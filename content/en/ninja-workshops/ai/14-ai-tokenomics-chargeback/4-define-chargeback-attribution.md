---
title: 4. Define Chargeback Attribution
weight: 4
---

This section turns the workshop model into telemetry standards. The standard should be
small enough that application teams can implement it consistently, and strict enough
that platform and finance teams can trust the dashboards.

## Out-of-the-Box First

Start with the product signals before adding anything custom:

* AI request traces and spans show what the workload called.
* AI Agent Monitoring shows token usage and estimated cost when the framework or
  instrumentation provides that data.
* Infrastructure Monitoring shows host, Kubernetes, and optional GPU health.
* Service maps and APM context show where the AI workload sits in the application.

Do not create a second token metric namespace just because the workshop needs
chargeback. First confirm what Splunk already receives from the AI instrumentation.

## Attribute Contract

Use the same low-cardinality business attributes on spans and logs wherever possible:

```text
ai.team
ai.business_unit
ai.cost_center
ai.tenant.id
ai.user.id
ai.workload.name
ai.product_area
ai.outcome.category
gen_ai.request.model
deployment.environment
k8s.cluster.name
service.name
```

For request traces, add the attributes to the current span before or immediately after
the LLM call. These attributes answer the questions the platform cannot infer from a
token count: who owns the request, what business area used it, and what outcome it
produced.

## Optional Metric Fallback

Custom metrics are not the default path for this workshop. Use them only when one of
these is true:

* The local model or framework does not produce the built-in AI token/cost signals you
  need.
* You need a metric detector that cannot be expressed from the built-in AI signal in
  your Splunk environment.
* Finance wants a centrally owned internal rate-card metric that is intentionally
  different from provider list pricing.
* You are generating synthetic lab data before connecting a real workload.

If you deliberately need the fallback, use bounded metric names such as:

| Metric | Type | Unit | Purpose |
| --- | --- | --- | --- |
| `ai.tokens.input` | Counter | `{token}` | Prompt tokens attributed to owner dimensions |
| `ai.tokens.output` | Counter | `{token}` | Completion tokens attributed to owner dimensions |
| `ai.tokens.total` | Counter | `{token}` | Total tokens attributed to owner dimensions |
| `ai.request.estimated_cost_usd` | Counter | `USD` | Estimated request cost from the workshop rate card |
| `ai.request.count` | Counter | `{request}` | Requests included in chargeback |

{{% notice title="Exercise" style="green" icon="running" %}}

Create an attribution checklist for your application:

1. Confirm where tenant or business unit is known: request header, JWT claim, API key,
   route, namespace, or deployment.
2. Confirm where user identity is safe to use. In a workshop, `ai.user.id` is bounded.
   In production, use a hash, cohort, or log-only strategy if user cardinality is high.
3. Confirm where team and cost center are known: deployment metadata, environment
   variable, service catalog, or configuration file.
4. Confirm where model name is known: application configuration, LLM client response,
   span attributes, or NIM metric labels.
5. Confirm where token usage is visible in built-in AI monitoring: framework
   instrumentation, LLM response metadata, OpenTelemetry GenAI span attributes, or NIM
   metrics.
6. Confirm what outcome means: `accepted`, `needs-review`, `draft-created`, `failed`,
   or another controlled category.
7. Mark any field that is unknown at request time. Unknown values must use a controlled
   value such as `unknown`, not a blank string.

{{% /notice %}}

## Cardinality Guardrails

Tokenomics data can become expensive if every request carries unique dimensions. Apply
these rules before sending telemetry:

* Use controlled `ai.user.id` values only when the population is bounded. For large
  production user populations, keep per-user attribution in logs or traces and aggregate
  metrics by BU, tenant, or cohort.
* Use `ai.tenant.id`, not raw account names.
* Use a normalized workload name, not a URL path with IDs.
* Use model family and model name; avoid dynamic deployment IDs unless they are bounded.
* Keep prompt category if useful, but never send prompt text as a metric dimension.
* Put high-cardinality details in traces or logs only when security policy allows it.

{{% notice title="Production Note" style="info" %}}
The sample instrumentation records an internal cost estimate as a span attribute for
the local Ollama lab. In production, prefer the built-in AI Agent Monitoring cost view
where it matches your billing model. Add custom metrics only for gaps such as internal
amortized GPU rates, unsupported local models, or finance-owned chargeback rollups.
{{% /notice %}}
