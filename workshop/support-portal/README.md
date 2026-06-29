# Support Portal Workshop App

This directory contains the generic support portal workshop app and supporting Splunk Observability telemetry.

Standard workshop setup clones the full workshop repository:

```bash
git clone https://github.com/marciokugler/observability-workshop.git
cd observability-workshop
```

Run app commands from this directory. From the cloned repository root, enter it with:

```bash
cd workshop/support-portal
```

If your prompt already ends in `workshop/support-portal`, stay there and run the app commands directly.

## Workspaces

- `apps/frontend`: customer-facing AI support portal
- `apps/operator-console`: presenter-facing evidence and approval console
- `apps/api-gateway`: primary backend entrypoint
- `apps/assistant-service`: support response workflow
- `apps/case-service`: account status workflow
- `apps/knowledge-service`: help article workflow and cache-pressure source
- `apps/remediation-orchestrator`: evidence intake, enrichment, policy, and action management
- `apps/scenario-controller`: deterministic incident trigger/reset
- `apps/remediation-agent`: Python remediation agent with model-backed action selection
- `packages/shared-types`: evidence, policy, action, and store contracts
- `packages/policy-engine`: deterministic policy logic
- `packages/evidence-parser`: optional operator-note and AI Assistant text parsing into normalized evidence
- `packages/telemetry`: shared Splunk telemetry helpers
- `packages/runtime-config`: shared local URL and port helpers

## Run The Lab

Prerequisites:

- Docker Desktop or another Docker daemon with Docker Compose v2
- `cloudflared`, only if you want to test the optional live Splunk webhook delivery path

Optional setup for credentials, student identity, or other overrides:

```bash
test -f .env || cp .env.example .env
```

The workshop path intentionally starts with `observability/otel-collector/config.yaml` empty and builds that file in the Configure Monitoring chapter. If you only want a developer smoke test before doing the workshop steps, remove `OTEL_COLLECTOR_CONFIG` from `.env` so Compose uses `observability/otel-collector/config-local.yaml`.

Build and check the code inside Docker:

```bash
docker compose run --rm build-node
```

```bash
docker compose run --rm build-agent
```

Start the full lab stack and wait for health checks:

```bash
docker compose up --wait
```

The Compose stack installs npm dependencies into a named Docker volume, installs the Python remediation agent into a named Docker volume, starts the Splunk OTel Collector, and starts each app service in its own container.

If Docker is missing on an Ubuntu or Debian workshop VM, install it before running Compose:

```bash
sudo apt update
sudo apt install -y docker.io
sudo apt install -y docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

Close and reopen the terminal after adding your user to the `docker` group, or run `newgrp docker`.

The app stack can run without credentials. Add `OPENAI_API_KEY`, `SPLUNK_ACCESS_TOKEN`, `SPLUNK_REALM`, and `VITE_SPLUNK_RUM_TOKEN` when you want model-backed remediation, live Splunk export, and browser RUM.

Follow logs when needed:

```bash
docker compose logs -f
```

Stop the lab:

```bash
docker compose down
```

Delete the lab containers, networks, volumes, and service images:

```bash
docker compose down --volumes --remove-orphans --rmi all
```

Key local URLs:

- support portal: `http://127.0.0.1:18080`
- operator console: `http://127.0.0.1:18081`
- API gateway: `http://127.0.0.1:18100`
- assistant service: `http://127.0.0.1:18101`
- case service: `http://127.0.0.1:18102`
- knowledge service: `http://127.0.0.1:18103`
- scenario controller: `http://127.0.0.1:18104`
- remediation orchestrator: `http://127.0.0.1:18110`
- remediation agent: `http://127.0.0.1:18800`
- collector OTLP HTTP on the host: `http://127.0.0.1:14318`

## Demo Scenario

The demo is metric-driven and starts with out-of-the-box Splunk Observability signals:

- Splunk RUM and browser spans show the customer journey.
- Splunk APM service metrics show request duration, request count, and errors.
- Splunk OTel Collector host and container metrics show infrastructure context.
- Standard filesystem metrics show cache pressure.
- One custom API gateway span isolates the downstream support-response forwarding call after the default signals work.
- The remediation agent emits OpenTelemetry spans for action selection, execution, and recovery validation.

The deterministic incident is `cache-disk-pressure`. The scenario controller asks `support-knowledge` to fill a controlled cache directory or tmpfs mount. That creates filesystem pressure visible through infrastructure metrics and slows the AI Support Response path through normal APM spans. Account Status Lookup and Help Article Search remain available as healthy comparison journeys.

The controlled remediation action is `clean_support_knowledge_cache`. Approval calls the remediation agent, which resets the scenario through the scenario controller and verifies recovery by running a post-remediation support response request.

## Student Isolation

For a shared Splunk Observability Cloud account, each student should set a unique `INSTANCE` value and use the same value for `DEPLOYMENT_ENVIRONMENT`:

```dotenv
INSTANCE=student-001
DEPLOYMENT_ENVIRONMENT=student-001
```

Splunk views can filter by `deployment.environment` plus `service.instance.id` so multiple students can share one Splunk Observability Cloud account. The collector and service startup code map those two `.env` values into the resource attributes used by Splunk; students do not need to maintain a manual `OTEL_RESOURCE_ATTRIBUTES` string.

## Docker Compose

The repo includes a root Compose file at [compose.yaml](compose.yaml). This is the recommended workshop runtime.

```bash
docker compose up --wait
```

Each major app component runs in a separate container. Compose reads `.env` when present, overrides service-to-service URLs to Docker DNS names, and keeps browser-facing URLs on `127.0.0.1`.

Stop the stack without deleting dependency/cache volumes:

```bash
docker compose down
```

The compose path mounts a shared 128 MiB tmpfs at `/var/cache/support-knowledge` for the knowledge service and the collector. The cache-pressure scenario fills that tmpfs, which gives the collector a real filesystem signal without risking the host disk.

## Primary Lab Flow

The workshop does not depend on live detector webhook delivery. The presenter opens a local incident in the operator console, and the orchestrator gathers evidence from Splunk Observability Cloud through MCP when `SPLUNK_ACCESS_TOKEN` is configured. Optional operator notes can still be entered in the console, but pasted Splunk AI Assistant text is no longer required.

Optional webhook delivery is still available at `POST /webhooks/splunk/detector` when `ORCHESTRATOR_PUBLIC_WEBHOOK_URL` points to a public URL. If `SPLUNK_WEBHOOK_SHARED_SECRET` is set, the orchestrator requires `x-support-portal-webhook-secret`.
