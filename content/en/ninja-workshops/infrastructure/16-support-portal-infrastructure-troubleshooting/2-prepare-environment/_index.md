---
title: Install Required Software
linkTitle: 2. Install Required Software
weight: 2
archetype: chapter
time: 25 minutes
description: Install prerequisites, configure Splunk export, RUM, MCP.
aliases:
  - /ninja-workshops/infrastructure/16-support-portal-infrastructure-troubleshooting/2-prepare-environment/
---

The lab uses Node.js for the local services, Python for the controlled cleanup worker, Docker for the Splunk OpenTelemetry Collector, and Splunk credentials for live observability evidence.

## Required Software

For Ubuntu or Debian workshop VMs:

```bash
sudo apt update
```

```bash
sudo apt install -y curl
```

```bash
sudo apt install -y ca-certificates
```

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
```

```bash
sudo apt install -y nodejs
```

```bash
sudo apt install -y python3
```

```bash
sudo apt install -y python3-venv
```

```bash
sudo apt install -y python3-pip
```

```bash
sudo apt install -y docker.io
```

```bash
sudo apt install -y docker-compose-v2
```

```bash
sudo systemctl enable --now docker
```

```bash
sudo usermod -aG docker "$USER"
```

Close and reopen the terminal after adding your user to the `docker` group, or run `newgrp docker` in the current terminal.

For macOS laptops, install Node.js 22, Python 3, and Docker Desktop with your approved package manager. For Windows laptops, use WSL2 Ubuntu or a Linux workshop VM. Docker Desktop can provide the Docker daemon for WSL2.

After installation, check your local tools:

```bash
node --version
```

```bash
npm --version
```

```bash
python3 --version
```

```bash
python3 -m pip --version
```

```bash
docker --version
```

```bash
docker compose version
```

```bash
docker info
```

Docker is required for the local collector. 

## Configure the App Copy

The remaining commands on this page assume your terminal is in the app directory:

```bash
cd observability-workshop/workshop/support-portal
```
Create a local environment file:

```bash
test -f .env || cp .env.example .env
```

Edit `.env` and set a unique `INSTANCE` value:

```dotenv
INSTANCE=student-001
OTEL_RESOURCE_ATTRIBUTES=lab.name=support-portal,lab.student.id=student-001,service.instance.id=student-001,host.name=student-001,deployment.environment=demo
```

Use a unique value for every student when sharing one Splunk Observability Cloud organization. This value is what lets you filter RUM, APM, host metrics.

## Splunk and MCP Credentials

Minimum values for the full infrastructure troubleshooting path:

```dotenv
SPLUNK_ACCESS_TOKEN=
SPLUNK_REALM=us1
SPLUNK_MCP_ENABLED=true
SPLUNK_MCP_URL=
SPLUNK_MCP_AUTH_TOKEN=
SPLUNK_MCP_TENANT=
SPLUNK_MCP_TIMEOUT_MS=8000
VITE_SPLUNK_RUM_TOKEN=
```

Credential purpose:

| Variable | Use |
| --- | --- |
| `SPLUNK_ACCESS_TOKEN` | Sends collector telemetry to Splunk Observability Cloud and authenticates direct Splunk MCP calls. |
| `SPLUNK_REALM` | Splunk realm for API and ingest endpoints, such as `us1`. |
| `SPLUNK_MCP_ENABLED` | Enables Splunk MCP evidence gathering in the operator console workflow. |
| `SPLUNK_MCP_URL` | Optional MCP endpoint override. Leave blank for the direct Observability Cloud endpoint. |
| `SPLUNK_MCP_AUTH_TOKEN` | Optional bearer token for hosted MCP Gateway or Splunk platform plus Observability setups. |
| `SPLUNK_MCP_TENANT` | Optional Splunk tenant header for hosted MCP Gateway setups. |
| `SPLUNK_MCP_TIMEOUT_MS` | Timeout for MCP tool discovery and tool calls. |
| `VITE_SPLUNK_RUM_TOKEN` | Browser RUM token for the support portal. |

If Splunk credentials are missing:

- The local app still runs.
- Live Splunk export is absent or partial.
- RUM, APM, Infrastructure, and MCP steps cannot show the full evidence chain.

## Exercise: Configure Splunk MCP Communication

The lab app is an MCP client. Splunk Observability Cloud provides the MCP endpoint, and the operator console asks the local remediation orchestrator to call it requesting evidence about the file system problem.

Official Splunk MCP references:

- [Interact with your observability data using the Splunk MCP server](https://help.splunk.com/en/splunk-observability-cloud/splunk-ai-assistant/interact-with-your-observability-data-using-the-splunk-mcp-server)
- [Performing the primary health check](https://help.splunk.com/en/splunk-observability-cloud/splunk-ai-assistant/performing-the-primary-health-check)
- [Individual tool testing](https://help.splunk.com/en/splunk-observability-cloud/splunk-ai-assistant/individual-tool-testing)

The direct Observability Cloud MCP endpoint is:

```text
https://api.<realm>.signalfx.com/v2/mcp
```

For this lab, `SPLUNK_REALM=us1` and `SPLUNK_ACCESS_TOKEN=<token>` are required values. The app builds the endpoint from the realm when `SPLUNK_MCP_URL` is blank:

```dotenv
SPLUNK_REALM=us1
SPLUNK_ACCESS_TOKEN=<your-splunk-access-token>
SPLUNK_MCP_ENABLED=true
SPLUNK_MCP_URL=
SPLUNK_MCP_AUTH_TOKEN=
SPLUNK_MCP_TENANT=
SPLUNK_MCP_TIMEOUT_MS=8000
```

How the official headers map to this lab:

| MCP concept | Lab setting |
| --- | --- |
| `X-SF-REALM` | `SPLUNK_REALM` |
| `X-SF-TOKEN` | `SPLUNK_ACCESS_TOKEN` |
| Hosted gateway URL | `SPLUNK_MCP_URL` |
| Gateway bearer token | `SPLUNK_MCP_AUTH_TOKEN` |
| Gateway tenant header | `SPLUNK_MCP_TENANT` |


### Verify MCP Tool Discovery

Load the `.env` values into the current terminal:

```bash
set -a
```

```bash
source .env
```

```bash
set +a
```

Run a direct MCP health check:

```bash
curl --verbose --include -X POST --location "https://api.${SPLUNK_REALM}.signalfx.com/v2/mcp" \
  -H "X-SF-TOKEN:${SPLUNK_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Accept:application/json,text/event-stream" \
  -d '{ "jsonrpc": "2.0", "method": "tools/list", "id":"workshop-health-check" }'
```

Expected result:

- The response returns a JSON-RPC result.
- The result includes a `tools` list.
- Useful workshop tools include `get_apm_service_latency`, `execute_signalflow_program`, `get_apm_exemplar_traces`, and `search_alerts_or_incidents`.

### Read the MCP Code Path

Open `apps/remediation-orchestrator/src/splunk-client.ts`. The orchestrator reads the `.env` values and creates the MCP client:

```ts
this.mcpClient = new SplunkMcpClient({
  enabled: process.env.SPLUNK_MCP_ENABLED !== "false",
  url: process.env.SPLUNK_MCP_URL || defaultSplunkMcpUrl(realm),
  accessToken,
  realm,
  authToken: process.env.SPLUNK_MCP_AUTH_TOKEN,
  tenant: process.env.SPLUNK_MCP_TENANT,
  timeoutMs: Number(process.env.SPLUNK_MCP_TIMEOUT_MS ?? 8000)
});
```

Open `apps/remediation-orchestrator/src/splunk-mcp-client.ts`. The client discovers available MCP tools, then calls the tools that can prove the infrastructure story:

```ts
const tools = await this.listTools(warnings);

const confirmationRecords = await this.callAvailableTools(
  ["get_apm_service_latency", "execute_signalflow_program"],
  tools,
  scope,
  warnings
);
```

The actual MCP request is JSON-RPC over HTTP:

```ts
body: JSON.stringify({
  jsonrpc: "2.0",
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  method,
  params
})
```

Then the app interprets MCP tool output as infrastructure evidence:

```ts
const confidenceBand = filesystemPressureConfirmed && latencyElevated
  ? "high"
  : affectedServices.length > 0 && (filesystemPressureConfirmed || latencyElevated)
    ? "medium"
    : "low";
```

## Install Dependencies

Install Node workspace dependencies:

```bash
npm install
```

Create the cleanup worker virtual environment:

```bash
python3 -m venv apps/remediation-agent/.venv
```

Upgrade `pip`:

```bash
apps/remediation-agent/.venv/bin/python -m pip install --index-url https://pypi.org/simple --upgrade pip
```

Install the local Python package:

```bash
apps/remediation-agent/.venv/bin/python -m pip install --index-url https://pypi.org/simple -e apps/remediation-agent
```

Confirm the package is installed:

```bash
apps/remediation-agent/.venv/bin/python -m pip show support-portal-agent
```
