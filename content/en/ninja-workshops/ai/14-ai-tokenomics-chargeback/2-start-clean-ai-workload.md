---
title: 2. Start With a Clean AI Workload
weight: 2
---

Start with an application that can answer questions, but cannot yet answer the platform
questions that matter:

* What does this AI workload cost?
* Who is consuming it?
* Is the infrastructure healthy?
* Should it run locally, on-prem, or in cloud?

The clean workload is intentionally incomplete. It calls Ollama and returns token usage
from the model response, but it does not emit OpenTelemetry traces, owner metadata,
outcome data, or chargeback signals.

## Run the Clean App

{{% notice title="Exercise" style="green" icon="running" %}}

Start Ollama:

```bash
ollama pull llama3.2:1b
ollama serve
```

In another terminal, run the clean app:

```bash
cd workshop/ai-tokenomics-chargeback/clean-llm-app
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Send a normal request:

```bash
curl -s http://localhost:8080/ask \
  -H "content-type: application/json" \
  -d '{"question":"How should we explain AI chargeback to app teams?"}' | jq
```

Send a runaway-agent style request:

```bash
curl -s http://localhost:8080/ask \
  -H "content-type: application/json" \
  -d '{"question":"Summarize the customer context and produce a detailed plan.","scenario":"surge","num_predict":240}' | jq
```

{{% /notice %}}

## What You Can See

The clean app returns basic usage values in the HTTP response:

```json
{
  "usage": {
    "prompt_tokens": 123,
    "completion_tokens": 80
  }
}
```

This is useful for a developer looking at one request. It is not enough for platform
operations.

{{< tabs >}}
{{% tab title="Question" %}}
**Which of the four platform questions can the clean app answer by itself?**
{{% /tab %}}
{{% tab title="Answer" %}}
**Almost none. It can show token usage for one response, but it cannot calculate cost,
attribute usage to a BU or user, show infrastructure health, or compare local and cloud
placement.**
{{% /tab %}}
{{< /tabs >}}

## Instrumentation Backlog

Before continuing, write down the missing telemetry:

| Question | Missing signal |
| --- | --- |
| What does it cost? | Token rates, estimated request cost, local/cloud hourly cost |
| Who consumes it? | `ai.business_unit`, `ai.user.id`, `ai.team`, `ai.cost_center`, `ai.tenant.id` |
| What did we get? | `ai.outcome.category`, request count, accepted answers, cost per accepted answer |
| Is infrastructure healthy? | Latency, errors, model duration, local host or GPU health |
| Should it run local/on-prem/cloud? | Local derived token rate, cloud proxy rate, utilization, reliability, latency |

The rest of the workshop adds these signals one layer at a time.
