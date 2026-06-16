# SignalFlow Examples

These snippets are starting points for workshop dashboards and detectors. Replace
`ai-tokenomics-workshop` with your environment or dashboard variable.

Prefer the built-in AI Agent Monitoring metrics visible in **Metric Finder**. Metric
names can vary by provider, framework, and instrumentation version, so this file uses
placeholders:

* `AI_BUILTIN_TOTAL_TOKENS`
* `AI_BUILTIN_INPUT_TOKENS`
* `AI_BUILTIN_OUTPUT_TOKENS`
* `AI_BUILTIN_ESTIMATED_COST_USD`
* `AI_BUILTIN_REQUEST_COUNT`

Use the optional fallback metric names at the end of this file only when a local or
unsupported workload does not produce the built-in metric you need.

## Dashboard Charts

Total tokens by team:

```python
data('AI_BUILTIN_TOTAL_TOKENS',
     filter=filter('deployment.environment', 'ai-tokenomics-workshop')).sum(by=['ai.team']).publish(label='Tokens by team')
```

Cost by business unit:

```python
data('AI_BUILTIN_ESTIMATED_COST_USD',
     filter=filter('deployment.environment', 'ai-tokenomics-workshop')).sum(by=['ai.business_unit']).publish(label='Cost by BU')
```

Cost by controlled user:

```python
data('AI_BUILTIN_ESTIMATED_COST_USD',
     filter=filter('deployment.environment', 'ai-tokenomics-workshop')).sum(by=['ai.user.id']).publish(label='Cost by user')
```

Estimated cost by team and model:

```python
data('AI_BUILTIN_ESTIMATED_COST_USD',
     filter=filter('deployment.environment', 'ai-tokenomics-workshop')).sum(by=['ai.team', 'gen_ai.request.model']).publish(label='Cost by team and model')
```

Cost per request by workload:

```python
cost = data('AI_BUILTIN_ESTIMATED_COST_USD',
            filter=filter('deployment.environment', 'ai-tokenomics-workshop')).sum(by=['ai.workload.name'])
requests = data('AI_BUILTIN_REQUEST_COUNT',
                filter=filter('deployment.environment', 'ai-tokenomics-workshop')).sum(by=['ai.workload.name'])
(cost / requests).publish(label='Cost per request')
```

Input tokens per request by model:

```python
tokens = data('AI_BUILTIN_INPUT_TOKENS',
              filter=filter('deployment.environment', 'ai-tokenomics-workshop')).sum(by=['gen_ai.request.model'])
requests = data('AI_BUILTIN_REQUEST_COUNT',
                filter=filter('deployment.environment', 'ai-tokenomics-workshop')).sum(by=['gen_ai.request.model'])
(tokens / requests).publish(label='Input tokens per request')
```

Cost per accepted answer by workload:

```python
cost = data('AI_BUILTIN_ESTIMATED_COST_USD',
            filter=filter('ai.outcome.category', 'accepted')).sum(by=['ai.workload.name'])
accepted = data('AI_BUILTIN_REQUEST_COUNT',
                filter=filter('ai.outcome.category', 'accepted')).sum(by=['ai.workload.name'])
(cost / accepted).publish(label='Cost per accepted answer')
```

Local vs cloud proxy cost:

```python
tokens = data('AI_BUILTIN_TOTAL_TOKENS').sum(by=['ai.workload.name'])
local_rate_per_1m = 0.85
cloud_rate_per_1m = 1.20
local_cost = (tokens / 1000000) * local_rate_per_1m
cloud_cost = (tokens / 1000000) * cloud_rate_per_1m
(cloud_cost - local_cost).publish(label='Cloud minus local cost')
```

GPU utilization by node:

```python
data('DCGM_FI_DEV_GPU_UTIL').mean(by=['k8s.node.name']).publish(label='GPU utilization')
```

GPU power by node:

```python
data('DCGM_FI_DEV_POWER_USAGE').mean(by=['k8s.node.name']).publish(label='GPU power')
```

## Detector Starting Points

Unknown attribution:

```python
data('AI_BUILTIN_ESTIMATED_COST_USD',
     filter=filter('ai.team', 'unknown')).sum().publish(label='Unknown team cost')
```

Cost per request regression:

```python
cost = data('AI_BUILTIN_ESTIMATED_COST_USD').sum(by=['ai.workload.name'])
requests = data('AI_BUILTIN_REQUEST_COUNT').sum(by=['ai.workload.name'])
(cost / requests).publish(label='Cost per request')
```

Context window explosion:

```python
tokens = data('AI_BUILTIN_INPUT_TOKENS').sum(by=['ai.workload.name'])
requests = data('AI_BUILTIN_REQUEST_COUNT').sum(by=['ai.workload.name'])
(tokens / requests).publish(label='Input tokens per request')
```

Tenant misuse:

```python
data('AI_BUILTIN_ESTIMATED_COST_USD').sum(by=['ai.tenant.id']).publish(label='Cost by tenant')
```

User token misuse:

```python
data('AI_BUILTIN_ESTIMATED_COST_USD').sum(by=['ai.user.id']).publish(label='Cost by user')
```

Poor value ratio:

```python
cost = data('AI_BUILTIN_ESTIMATED_COST_USD').sum(by=['ai.outcome.category'])
requests = data('AI_BUILTIN_REQUEST_COUNT').sum(by=['ai.outcome.category'])
(cost / requests).publish(label='Cost per request by outcome')
```

GPU idle waste:

```python
data('DCGM_FI_DEV_GPU_UTIL').mean(by=['k8s.node.name']).publish(label='GPU utilization')
```

Use the detector UI to set thresholds, duration, severity, notifications, and runbook
links that match your lab.

## Optional Fallback Metrics

If a local or unsupported workload cannot expose the built-in AI metrics you need, use
a small fallback namespace and document why it exists:

| Fallback metric | Purpose |
| --- | --- |
| `ai.tokens.input` | Input tokens for a local or synthetic workload |
| `ai.tokens.output` | Output tokens for a local or synthetic workload |
| `ai.tokens.total` | Total tokens for a local or synthetic workload |
| `ai.request.count` | Request count for local cost-per-request math |
| `ai.request.estimated_cost_usd` | Internal rate-card estimate when built-in cost is unavailable or not aligned to finance |
