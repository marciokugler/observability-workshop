# Environment Setup

This page explains the small `.env` surface used by the workshop.

## 1. Optional `.env`

```bash
cp .env.example .env
```

The Compose stack starts without `.env` by using defaults in [compose.yaml](../../compose.yaml) and application code. Create `.env` only when you need credentials, a unique student identity, or optional webhook delivery.

## 2. Values to keep

```dotenv
INSTANCE=student-001
DEPLOYMENT_ENVIRONMENT=demo
SPLUNK_REALM=us1
SPLUNK_ACCESS_TOKEN=...
VITE_SPLUNK_RUM_TOKEN=...
OPENAI_API_KEY=...
```

| Variable | Use |
| --- | --- |
| `INSTANCE` | Separates each student's telemetry in shared Splunk searches and dashboards. |
| `DEPLOYMENT_ENVIRONMENT` | Environment dimension for Splunk filters; `demo` is the default. |
| `SPLUNK_REALM` | Splunk realm for API and ingest endpoints, such as `us1`. |
| `SPLUNK_ACCESS_TOKEN` | Sends collector telemetry to Splunk Observability Cloud and enables live Splunk evidence lookup. |
| `VITE_SPLUNK_RUM_TOKEN` | Browser RUM token for the claims portal. |
| `OPENAI_API_KEY` | Optional model-backed remediation agent decisions. |

The stack can run without credentials, but live Splunk export, MCP evidence intake, browser RUM, and model-backed remediation will be limited.

## 3. Values we do not keep in `.env.example`

These are intentionally left out because Compose or the app code already owns the defaults:

- local ports and service URLs
- `OTEL_EXPORTER_OTLP_*` and `OTEL_PROPAGATORS`
- `OTEL_RESOURCE_ATTRIBUTES`
- cache directory, quota, mountpoint, and metric names
- `SPLUNK_API_BASE_URL` and MCP endpoint settings
- frontend local API URLs and session replay defaults

The collector maps `INSTANCE` and `DEPLOYMENT_ENVIRONMENT` to `service.instance.id`, `host.name`, `lab.student.id`, and `deployment.environment`, so students do not need to maintain a long resource-attribute string manually.

## 4. Optional public webhook

The primary lab flow opens incidents from the local operator console and does not require a public webhook. Start a tunnel only if you explicitly want Splunk detector delivery into the local orchestrator:

```bash
cloudflared tunnel --url http://127.0.0.1:18110
```

Then add these values to `.env`:

```dotenv
ORCHESTRATOR_PUBLIC_WEBHOOK_URL=
SPLUNK_WEBHOOK_SHARED_SECRET=
```
