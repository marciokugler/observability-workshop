---
title: 5. Add Business Context to AI Monitoring
weight: 5
---

The built-in AI monitoring experience tells you what happened inside an AI request:
traces, token usage, estimated cost, latency, and errors. This section adds the missing
business context: who should own the request, which tenant or user consumed it, and what
outcome the request produced. The runnable local app for this workshop is:

```text
workshop/ai-tokenomics-chargeback/local-llm-app
```

## Review the Companion Example

The workshop includes a small Python helper:

```text
workshop/ai-tokenomics-chargeback/instrumentation/tokenomics_instrumentation.py
```

It demonstrates how to:

* Normalize owner dimensions.
* Capture BU, controlled user, and outcome dimensions.
* Estimate request cost from a rate card.
* Attach dimensions, token counts, and internal cost to the active span.

The local app imports this helper, calls Ollama, and enriches the AI span after each
model response. It does not create custom token metrics by default.

{{% notice title="Exercise" style="green" icon="running" %}}

Review the instrumentation helper:

1. Open `workshop/ai-tokenomics-chargeback/instrumentation/tokenomics_instrumentation.py`.
2. Find `REQUIRED_DIMENSIONS`.
3. Confirm that every required dimension has a default value.
4. Find `record_llm_chargeback`.
5. Confirm that token counts are attached to the active span.
6. Find `estimate_request_cost_usd`.
7. Replace the workshop rates with your instructor-provided rate card if needed.

{{% /notice %}}

## Install Required Packages

{{% notice title="Exercise" style="green" icon="running" %}}

The clean app only installs Flask. Add the packages needed for OpenTelemetry traces and
OTLP export:

```bash
cd workshop/ai-tokenomics-chargeback/clean-llm-app
source .venv/bin/activate
pip install opentelemetry-api==1.35.0 \
  opentelemetry-sdk==1.35.0 \
  opentelemetry-exporter-otlp-proto-grpc==1.35.0 \
  opentelemetry-instrumentation-flask==0.56b0
```

Add these packages to `requirements.txt` after the app works.

{{% /notice %}}

## Configure AI Cost Settings

{{% notice title="Exercise" style="green" icon="running" %}}

Set the local model and rate card values from your benchmark:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OLLAMA_MODEL=llama3.2:1b
export INPUT_USD_PER_1M=0.0013
export OUTPUT_USD_PER_1M=0.0158
export AI_TEAM_DEFAULT=support-ai
export AI_BUSINESS_UNIT_DEFAULT=customer-success
export AI_COST_CENTER_DEFAULT=cc-ml-1200
export AI_TENANT_ID_DEFAULT=tenant-local
export AI_USER_ID_DEFAULT=workshop-user-1
export AI_OUTCOME_CATEGORY_DEFAULT=answered
```

`INPUT_USD_PER_1M` and `OUTPUT_USD_PER_1M` are still per-million-token rates. The
example values come from the energy-only local benchmark. If your benchmark produced
different values, use yours.

{{% /notice %}}

## Add the Instrumentation Code

{{% notice title="Exercise" style="green" icon="running" %}}

Update the clean app using `workshop/ai-tokenomics-chargeback/local-llm-app/app.py`
as the reference solution. The required changes are:

1. Configure a `TracerProvider`.
2. Instrument Flask with `FlaskInstrumentor`.
3. Import `record_llm_chargeback`, `dimensions_from_headers`, and `TokenRate`.
4. Build dimensions from request headers and environment defaults.
5. Attach token usage, business context, and estimated cost after the Ollama response
   returns.
6. Add span attributes for model, max tokens, scenario, prompt size, and latency.

Run your instrumented app:

```bash
python app.py
```

Send a request:

```bash
curl -s http://localhost:8080/ask \
  -H "content-type: application/json" \
  -H "x-ai-team: support-ai" \
  -H "x-ai-business-unit: customer-success" \
  -H "x-ai-cost-center: cc-ml-1200" \
  -H "x-ai-tenant-id: tenant-local" \
  -H "x-ai-user-id: user-1042" \
  -H "x-ai-outcome-category: accepted" \
  -d '{"question":"How should we explain AI chargeback to app teams?"}' | jq
```

{{% /notice %}}

## Request Dimensions

Applications usually know the request owner before they call the LLM. In a Flask app,
that might come from headers:

```python
dimensions = dimensions_from_headers(
    request.headers,
    defaults={
        "ai.team": os.getenv("AI_TEAM_DEFAULT", "unknown"),
        "ai.business_unit": os.getenv("AI_BUSINESS_UNIT_DEFAULT", "unknown"),
        "ai.cost_center": os.getenv("AI_COST_CENTER_DEFAULT", "unknown"),
        "ai.user.id": os.getenv("AI_USER_ID_DEFAULT", "unknown"),
        "ai.workload.name": os.getenv("AI_WORKLOAD_NAME", "llm-app"),
        "ai.product_area": os.getenv("AI_PRODUCT_AREA", "unknown"),
        "ai.outcome.category": os.getenv("AI_OUTCOME_CATEGORY_DEFAULT", "unknown"),
        "deployment.environment": os.getenv("DEPLOYMENT_ENVIRONMENT", "workshop"),
    },
)
```

After the LLM call returns, attach the usage and ownership context to the active span:

```python
record_llm_chargeback(
    prompt_tokens=usage.prompt_tokens,
    completion_tokens=usage.completion_tokens,
    model="llama3.2:1b",
    dimensions=dimensions,
)
```

## Kubernetes Defaults

Use Kubernetes metadata for defaults that do not change per request. The companion patch
shows one way to add deployment-level defaults:

```text
workshop/ai-tokenomics-chargeback/k8s/llm-app-chargeback-patch.yaml
```

{{% notice title="Exercise" style="green" icon="running" %}}

Patch the sample application metadata in a lab namespace:

```bash
kubectl -n "$USER_NAME" patch deployment llm-app --patch-file \
  workshop/ai-tokenomics-chargeback/k8s/llm-app-chargeback-patch.yaml
```

Then generate a few requests with different headers:

```bash
curl -X POST "http://$LLM_APP_URL/askquestion" \
  -H "content-type: application/json" \
  -H "x-ai-tenant-id: tenant-enterprise" \
  -H "x-ai-team: support-ai" \
  -H "x-ai-cost-center: cc-ml-1200" \
  -d '{"question":"How much memory does the NVIDIA H200 have?"}'
```

{{% /notice %}}

{{< tabs >}}
{{% tab title="Question" %}}
**Where should prompt text be stored for chargeback?**
{{% /tab %}}
{{% tab title="Answer" %}}
**It should not be a metric dimension. If policy allows prompt capture, keep it in
trace events or logs with redaction and retention controls.**
{{% /tab %}}
{{< /tabs >}}
