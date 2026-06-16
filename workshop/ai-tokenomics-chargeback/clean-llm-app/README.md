# Clean Local LLM App

This is the starter workload for the AI Tokenomics and GPU Chargeback workshop. It
calls a local Ollama model but does not include OpenTelemetry, AI span enrichment,
chargeback dimensions, dashboards, or detectors.

Students start here, then manually install packages and edit the app to add the
instrumentation shown in `../local-llm-app`.

## Run

```bash
ollama pull llama3.2:1b
ollama serve
```

In another terminal:

```bash
cd workshop/ai-tokenomics-chargeback/clean-llm-app
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Send a request:

```bash
curl -s http://localhost:8080/ask \
  -H "content-type: application/json" \
  -d '{"question":"How should we explain AI chargeback to app teams?"}' | jq
```

At this point the app can answer questions, but the platform cannot yet answer:

* What does this AI workload cost?
* Who is consuming it?
* Is the infrastructure healthy?
* Should this workload run locally, on-prem, or in cloud?
