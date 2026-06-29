# Quick Start

This is the shortest reliable path to a working workshop run.

## Outcome

At the end of this flow you should have:

- the local workshop runbooks available
- the app stack running in Docker Compose
- collector telemetry running in the same Compose stack
- the support portal and operator console reachable
- a healthy starting state
- a deterministic cache-pressure incident
- a clear path through approval and recovery

## 1. Confirm tools

You need:

- Docker Desktop or another local Docker daemon with Docker Compose v2
- Splunk and OpenAI credentials if you want live telemetry and model-backed remediation

## 2. Get the source

Standard workshop setup clones the full workshop repository:

```bash
git clone https://github.com/marciokugler/observability-workshop.git
cd observability-workshop/workshop/support-portal
```

If Git is not available, download and unzip the repository:

```bash
curl -L https://github.com/marciokugler/observability-workshop/archive/refs/heads/main.zip -o observability-workshop.zip
unzip observability-workshop.zip
cd observability-workshop-main/workshop/support-portal
```

## 3. Read the workshop docs

From the app directory, start with [the docs index](../index.md). The workshop
runbooks are plain Markdown files and do not require a local documentation
server.

## 4. Optional `.env`

From the app directory:

```bash
cp .env.example .env
```

The stack starts without `.env` by using local defaults. Create `.env` when you need credentials, a unique student identity, or runtime overrides.

Set these for a full shared-account lab:

```dotenv
INSTANCE=student-001
DEPLOYMENT_ENVIRONMENT=student-001
OTEL_COLLECTOR_CONFIG=/etc/otel/config.yaml
SPLUNK_REALM=...
SPLUNK_ACCESS_TOKEN=...
VITE_SPLUNK_RUM_TOKEN=...
OPENAI_API_KEY=...
```

Each student should use a different `INSTANCE`, such as `student-014`.

`SPLUNK_ACCESS_TOKEN` and `SPLUNK_REALM` enable Splunk export and evidence lookup. `VITE_SPLUNK_RUM_TOKEN` enables browser RUM. `OTEL_COLLECTOR_CONFIG=/etc/otel/config.yaml` selects the collector file students build during the workshop. `OPENAI_API_KEY` enables optional model-backed remediation. Ports, service URLs, OTLP routing, cache controls, metric names, and MCP endpoint defaults are already handled by Compose and the app code.

## 5. Build and check the code

The recommended lab path uses the root [compose.yaml](../../compose.yaml). Compose installs app dependencies inside named Docker volumes, so no host Node or Python setup is needed for a normal workshop run.

```bash
docker compose run --rm build-node
```

```bash
docker compose run --rm build-agent
```

## 6. Start the full stack

```bash
docker compose up --wait
```

The collector listens on host OTLP ports `14317` and `14318`. Inside Docker it still listens on standard collector ports `4317` and `4318`.

Expected result:

- the Splunk OTel Collector starts
- backend services bind to high local ports
- the Python remediation agent starts on `18800`
- Vite starts the portal on `18080`
- Vite starts the operator console on `18081`

If you used the ZIP download, run the command from `observability-workshop-main/workshop/support-portal`.

## 7. Inspect or stop the stack

Follow logs:

```bash
docker compose logs -f
```

Stop containers without deleting volumes:

```bash
docker compose down
```

Delete containers, networks, volumes, and service images:

```bash
docker compose down --volumes --remove-orphans --rmi all
```

## 8. Open the two main UIs

- support portal: `http://127.0.0.1:18080`
- operator console: `http://127.0.0.1:18081`

## 9. Establish a healthy baseline

Before showing a fault:

1. Run `AI Support Response`.
2. Run `Account Status Lookup`.
3. Run `Help Article Search`.
4. Confirm the operator console has no stale incident blocking the flow.

## 10. Trigger the incident

Use `Trigger Cache Pressure` from the portal or operator console.

Then:

1. Run `AI Support Response` again.
2. Keep the other two transactions as healthy comparisons.
3. Open Splunk APM and Infrastructure Monitoring.
4. Look for support-knowledge latency and filesystem utilization for the student `INSTANCE`.
5. Open the operator console.
6. Leave `Evidence Intake` blank unless you are using fallback operator notes.
7. Click `Gather MCP Evidence`.
8. Click `Explain`.
9. Click `Propose`.

## 11. Complete the remediation story

The intended live sequence is:

1. Show customer impact first.
2. Show the default Splunk signals: RUM, APM, container metrics, and filesystem metrics.
3. Use [Splunk Validation](splunk-validation.md) to confirm RUM, APM, infrastructure, MCP, and remediation evidence.
4. Walk through orchestrator evidence and confidence.
5. Show approval-required policy.
6. Propose `clean_support_knowledge_cache`.
7. Approve the action.
8. Verify recovery.

## If anything breaks

Go straight to [Troubleshooting](troubleshooting.md).
