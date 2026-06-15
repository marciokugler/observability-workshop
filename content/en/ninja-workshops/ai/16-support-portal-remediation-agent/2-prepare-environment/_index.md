---
title: Install Required Software
linkTitle: 2. Install Required Software
weight: 2
archetype: chapter
time: 20 minutes
description: Install prerequisites first, then configure credentials, student identity, and local port checks.
---

## Required Software

Install the required software before running any `npm` commands.

For Ubuntu or Debian workshop VMs:

```bash
sudo apt update
sudo apt install -y curl
sudo apt install -y ca-certificates
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo apt install -y python3
sudo apt install -y python3-venv
sudo apt install -y python3-pip
sudo apt install -y docker.io
sudo apt install -y docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

Close and reopen the terminal after adding your user to the `docker` group, or run `newgrp docker` in the current terminal. If your laptop uses Homebrew, Chocolatey, `winget`, Docker Desktop, or an existing corporate image, install the equivalent packages with your approved package manager.

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

Docker is required for the local collector and Docker Compose path. `cloudflared` is optional and is only needed if you test live detector webhook delivery.

## Configure the App Copy

The remaining commands on this page assume your terminal is in the app directory:

```bash
cd observability-workshop/workshop/support-portal-remediation-agent
```

If you used the ZIP download, use `cd observability-workshop-main/workshop/support-portal-remediation-agent` instead.

Create a local environment file:

```bash
test -f .env || cp .env.example .env
```

Edit `.env` and set a unique `INSTANCE` value:

```dotenv
INSTANCE=student-001
OTEL_RESOURCE_ATTRIBUTES=lab.name=ciscolive26,lab.student.id=student-001,service.instance.id=student-001,host.name=student-001,deployment.environment=demo
```

Use a unique value for every student when sharing one Splunk Observability Cloud organization. This keeps traces, metrics, dashboards, and detector filters separated.

## Credentials

Recommended values for the full workshop:

```dotenv
SPLUNK_ACCESS_TOKEN=
SPLUNK_REALM=us1
SPLUNK_MCP_ENABLED=true
SPLUNK_MCP_URL=
SPLUNK_MCP_AUTH_TOKEN=
SPLUNK_MCP_TENANT=
SPLUNK_MCP_TIMEOUT_MS=8000
VITE_SPLUNK_RUM_TOKEN=
OPENAI_API_KEY=
```

Credential purpose:

| Variable | Use |
| --- | --- |
| `SPLUNK_ACCESS_TOKEN` | Sends collector telemetry to Splunk Observability Cloud and enables live Splunk evidence lookup. |
| `SPLUNK_REALM` | Splunk realm for API and ingest endpoints, such as `us1`. |
| `SPLUNK_MCP_ENABLED` | Enables Splunk MCP evidence gathering in the remediation orchestrator. |
| `SPLUNK_MCP_URL` | Optional MCP endpoint override. Leave blank for the direct Observability endpoint. |
| `SPLUNK_MCP_AUTH_TOKEN` | Optional bearer token for hosted MCP Gateway or Splunk platform plus Observability setups. |
| `SPLUNK_MCP_TENANT` | Optional Splunk tenant header for hosted MCP Gateway setups. |
| `SPLUNK_MCP_TIMEOUT_MS` | Timeout for MCP tool discovery and tool calls. |
| `VITE_SPLUNK_RUM_TOKEN` | Browser RUM token for the claims portal. |
| `OPENAI_API_KEY` | Optional model-backed remediation agent decisions. Without it, the agent uses fallback logic. |

If credentials are missing:

- The local app still runs.
- Splunk telemetry export is absent or partial.
- The remediation agent uses fallback logic when no OpenAI key is present.

## Exercise: Configure Splunk MCP Evidence

The lab app is an MCP client. Students are not building an MCP server. The operator console asks the remediation orchestrator to call Splunk Observability Cloud MCP, collect evidence, and convert the tool responses into the lab evidence model.

Official Splunk MCP references:

- [Interact with your observability data using the Splunk MCP server](https://help.splunk.com/en/splunk-observability-cloud/splunk-ai-assistant/interact-with-your-observability-data-using-the-splunk-mcp-server)
- [Performing the primary health check](https://help.splunk.com/en/splunk-observability-cloud/splunk-ai-assistant/performing-the-primary-health-check)
- [Individual tool testing](https://help.splunk.com/en/splunk-observability-cloud/splunk-ai-assistant/individual-tool-testing)

The direct Observability MCP endpoint is:

```text
https://api.<realm>.signalfx.com/v2/mcp
```

For this lab, `SPLUNK_REALM=us1` and `SPLUNK_ACCESS_TOKEN=<token>` are the minimum required values. The app builds the endpoint from the realm when `SPLUNK_MCP_URL` is blank:

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

Use the hosted gateway settings only if your instructor gives you a gateway URL, tenant, and bearer token. Otherwise leave those fields blank.

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

Open `apps/remediation-orchestrator/src/splunk-mcp-client.ts`. The client discovers available MCP tools, then calls the tools that can prove the cache-pressure story:

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

Then the app interprets MCP tool output as evidence:

```ts
const confidenceBand = filesystemPressureConfirmed && latencyElevated
  ? "high"
  : affectedServices.length > 0 && (filesystemPressureConfirmed || latencyElevated)
    ? "medium"
    : "low";
```

The important design point is that MCP supplies observability evidence, but the lab app still owns the remediation decision. The orchestrator converts MCP responses into an `EvidenceBundle`; policy logic decides whether `clean_claims_knowledge_cache` can be proposed for approval.

{{% notice title="Exercise" style="green" icon="running" %}}

Answer these before starting the lab stack:

1. Which two `.env` values are required for the direct Splunk Observability MCP endpoint?
2. Why can `SPLUNK_MCP_URL` stay blank in this lab?
3. What JSON-RPC method confirms that MCP tool discovery works?
4. Which two evidence conditions must both be true for high confidence?

{{% /notice %}}

## Install Dependencies

Install Node workspace dependencies:

```bash
npm install
```

Create the remediation agent virtual environment:

```bash
python3 -m venv apps/remediation-agent/.venv
```

```bash
apps/remediation-agent/.venv/bin/python -m pip install --index-url https://pypi.org/simple --upgrade pip
```

```bash
apps/remediation-agent/.venv/bin/python -m pip install --index-url https://pypi.org/simple -e apps/remediation-agent
```

```bash
apps/remediation-agent/.venv/bin/python -m pip show ibobs-remediation-agent
```

## Check Ports

The default local layout is:

| Port | Service |
| --- | --- |
| `18080` | claims portal |
| `18081` | operator console |
| `18100` | API gateway |
| `18101` | assistant service |
| `18102` | case service |
| `18103` | knowledge service |
| `18104` | scenario controller |
| `18110` | remediation orchestrator |
| `18800` | remediation agent |
| `14318` | collector OTLP HTTP endpoint |

Check for collisions:

```bash
lsof -i :18080 -i :18081 -i :18100 -i :18101 -i :18102 -i :18103 -i :18104 -i :18110 -i :18800 -i :14318
```

Resolve any conflicting process before starting the lab.
