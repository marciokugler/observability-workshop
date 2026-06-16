# Local LLM Tokenomics App

This is the runnable app for the AI Tokenomics and GPU Chargeback workshop. It calls a
local Ollama model, records OpenTelemetry traces, and adds chargeback attributes for
team, tenant, cost center, workload, outcome, and model. Use Splunk AI Agent Monitoring
for built-in token and cost views where supported; this local app adds the business
context and an internal cost estimate for the lab.

## Prerequisites

Install and start Ollama:

```bash
ollama pull llama3.2:1b
ollama serve
```

Run a local OpenTelemetry Collector or Splunk OpenTelemetry Collector on
`localhost:4317`, or set `OTEL_EXPORTER_OTLP_ENDPOINT` to your collector endpoint.

## Run the App

```bash
cd workshop/ai-tokenomics-chargeback/local-llm-app
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OLLAMA_MODEL=llama3.2:1b
export INPUT_USD_PER_1M=0.20
export OUTPUT_USD_PER_1M=1.25

python app.py
```

## Send Normal Traffic

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

## Simulate Token Surge

```bash
curl -s http://localhost:8080/ask \
  -H "content-type: application/json" \
  -H "x-ai-team: support-ai" \
  -H "x-ai-business-unit: customer-success" \
  -H "x-ai-cost-center: cc-ml-1200" \
  -H "x-ai-tenant-id: tenant-local" \
  -H "x-ai-user-id: user-1042" \
  -H "x-ai-outcome-category: needs-review" \
  -d '{"question":"Summarize the customer context and produce a detailed plan.","scenario":"surge","num_predict":240}' | jq
```

## Simulate Misuse

```bash
curl -s http://localhost:8080/ask \
  -H "content-type: application/json" \
  -H "x-ai-team: field-ai" \
  -H "x-ai-business-unit: sales" \
  -H "x-ai-cost-center: cc-ml-3100" \
  -H "x-ai-tenant-id: tenant-field-lab" \
  -H "x-ai-user-id: user-2048" \
  -H "x-ai-outcome-category: draft-created" \
  -d '{"question":"Generate a complete customer proposal with pricing and implementation details.","scenario":"misuse","num_predict":400}' | jq
```

## Simulate Unknown Attribution

```bash
curl -s http://localhost:8080/ask \
  -H "content-type: application/json" \
  -d '{"question":"Run this request without team or cost-center headers.","scenario":"unknown","num_predict":120}' | jq
```

The app enriches the active AI span with these attributes:

* `ai.team`
* `ai.business_unit`
* `ai.cost_center`
* `ai.tenant.id`
* `ai.user.id`
* `ai.workload.name`
* `ai.outcome.category`
* `gen_ai.request.model`
* `gen_ai.usage.prompt_tokens`
* `gen_ai.usage.completion_tokens`
* `gen_ai.usage.total_tokens`
* `ai.request.estimated_cost_usd`
