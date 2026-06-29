---
title: 9. Simulate Token Surge and Chargeback Alarms
weight: 9
---

Proactive cost control means the platform identifies abnormal AI spend before the
invoice arrives. This lab simulates three failure modes:

* **Token surge** - a prompt change sends full documents to the model instead of
  retrieved chunks.
* **Tenant misuse** - a lab tenant runs a bulk workflow through an interactive endpoint.
* **User misuse** - one controlled workshop user or agent consumes a disproportionate
  share of spend.
* **Unknown attribution** - requests arrive without `ai.team` or `ai.cost_center`.

The goal is not just to chart cost. The goal is to create alarms that lead to a clear
action: throttle, roll back, require attribution, or notify the right owner.

## Generate Synthetic Events

The simulator creates request-level token events with the same dimensions used by the
rest of the workshop.

{{% notice title="Exercise" style="green" icon="running" %}}

Run the simulator with the local rates from your benchmark or the starter values from
the rate card:

```bash
python3 workshop/ai-tokenomics-chargeback/scripts/simulate_token_cost_risk.py \
  --input-usd-per-1m 0.0013 \
  --output-usd-per-1m 0.0158 \
  --minutes 60 \
  --requests-per-minute 12 \
  --out-dir /tmp/ai-tokenomics-simulation
```

The example rates are per-million-token local energy-only rates. Use your own benchmark
values if they differ. For a classroom demo with larger dollar numbers, rerun the same
scenario with a fully loaded or public-proxy rate card.

Open the report:

```bash
cat /tmp/ai-tokenomics-simulation/token-cost-report.json
```

The simulator also writes:

* `/tmp/ai-tokenomics-simulation/token-cost-events.jsonl`
* `/tmp/ai-tokenomics-simulation/token-cost-events.csv`

{{% /notice %}}

## What the Platform Should Detect

Use the simulator output to reason about detector design before creating detectors in
Splunk Observability Cloud.

| Risk | Metric pattern | Proactive action |
| --- | --- | --- |
| Budget burn spike | Cost per minute or cost per request jumps above baseline | Notify owner, throttle endpoint, inspect recent deploy |
| Context window explosion | Input tokens per request increases sharply | Review prompt and retrieval chunking |
| Tenant misuse | One tenant consumes a disproportionate share of cost | Apply rate limit or move workload to batch path |
| User misuse | One user or agent consumes a disproportionate share of cost | Review workflow and apply user quota |
| Unknown attribution | Cost exists where `ai.team` or `ai.cost_center` is `unknown` | Block promotion or route to platform governance |
| Model drift | Cost rises after model switch without quality improvement | Require model approval or rollback |

{{% notice title="Exercise" style="green" icon="running" %}}

Create an alarm policy for the scenario:

1. **Budget burn spike** - alert when estimated cost per request is more than `4x`
   the previous baseline for 10 minutes.
2. **Context window explosion** - alert when input tokens per request are more than
   `4x` baseline.
3. **Tenant misuse** - alert when a tenant consumes more than `25%` of total AI cost
   in a shared environment.
4. **User misuse** - alert when one controlled `ai.user.id` consumes more than `20%`
   of total AI cost.
5. **Poor value ratio** - alert when cost per accepted answer increases faster than
   average request cost.
6. **Unknown attribution** - alert when unattributed cost is greater than zero for
   more than 15 minutes.
7. Add a runbook action for each alarm.

{{% /notice %}}

## Chargeback Alarm Examples

These are example SignalFlow starting points. Replace the placeholder metric names with
the built-in AI token, cost, and request-count metrics shown in Metric Finder for your
environment. If you are running only the simulator output, use the optional fallback
metric names you created for that lab data.

Budget burn by team:

```python
cost = data('AI_BUILTIN_ESTIMATED_COST_USD').sum(by=['ai.team'])
requests = data('AI_BUILTIN_REQUEST_COUNT').sum(by=['ai.team'])
(cost / requests).publish(label='Cost per request by team')
```

Context explosion:

```python
input_tokens = data('AI_BUILTIN_INPUT_TOKENS').sum(by=['ai.workload.name'])
requests = data('AI_BUILTIN_REQUEST_COUNT').sum(by=['ai.workload.name'])
(input_tokens / requests).publish(label='Input tokens per request')
```

Tenant misuse:

```python
data('AI_BUILTIN_ESTIMATED_COST_USD').sum(by=['ai.tenant.id']).publish(label='Cost by tenant')
```

User misuse:

```python
data('AI_BUILTIN_ESTIMATED_COST_USD').sum(by=['ai.user.id']).publish(label='Cost by user')
```

Value by outcome:

```python
cost = data('AI_BUILTIN_ESTIMATED_COST_USD').sum(by=['ai.outcome.category'])
requests = data('AI_BUILTIN_REQUEST_COUNT').sum(by=['ai.outcome.category'])
(cost / requests).publish(label='Cost per request by outcome')
```

Unknown attribution:

```python
data('AI_BUILTIN_ESTIMATED_COST_USD',
     filter=filter('ai.team', 'unknown')).sum().publish(label='Unknown team cost')
```

{{< tabs >}}
{{% tab title="Question" %}}
**How does this help the platform know cost proactively?**
{{% /tab %}}
{{% tab title="Answer" %}}
**The platform turns token counts, owner metadata, and derived rates into live burn-rate
signals. Detectors then catch abnormal spend while the workload is still running, not
after the billing cycle closes.**
{{% /tab %}}
{{< /tabs >}}
