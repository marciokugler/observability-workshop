---
title: Configure Splunk MCP Communication
linkTitle: 6. Configure Splunk MCP
weight: 6
archetype: chapter
time: 20 minutes
description: Configure and verify the MCP path from the local remediation orchestrator to Splunk Observability Cloud.
aliases:
  - /ninja-workshops/infrastructure/16-support-portal-infrastructure-troubleshooting/5-configure-splunk-mcp-communication/
---

The lab app is an MCP client. Splunk Observability Cloud provides the MCP endpoint, and the local remediation orchestrator calls it when the operator console asks to gather evidence.

Use this session to configure that communication path before you use MCP evidence for remediation.

## Exercise: Configure Splunk MCP Communication

Official Splunk MCP references:

- [Interact with your observability data using the Splunk MCP server](https://help.splunk.com/en/splunk-observability-cloud/splunk-ai-assistant/interact-with-your-observability-data-using-the-splunk-mcp-server)
- [Performing the primary health check](https://help.splunk.com/en/splunk-observability-cloud/splunk-ai-assistant/performing-the-primary-health-check)
- [Individual tool testing](https://help.splunk.com/en/splunk-observability-cloud/splunk-ai-assistant/individual-tool-testing)

The direct Observability Cloud MCP endpoint is:

```text
https://api.<realm>.signalfx.com/v2/mcp
```

For this lab, `SPLUNK_REALM=us1` and `SPLUNK_ACCESS_TOKEN=<token>` are required values. You generated these values in session 3. The app builds the endpoint from the realm when `SPLUNK_MCP_URL` is blank.

## Configure `.env`

Open `.env` in the app directory:

```bash
cd observability-workshop/workshop/support-portal
```

```bash
test -f .env || cp .env.example .env
```

Add or verify:

```dotenv
SPLUNK_REALM=us1
SPLUNK_ACCESS_TOKEN=<your-splunk-access-token>
SPLUNK_MCP_ENABLED=true
SPLUNK_MCP_URL=
SPLUNK_MCP_AUTH_TOKEN=
SPLUNK_MCP_TENANT=
SPLUNK_MCP_TIMEOUT_MS=8000
```

Leave `SPLUNK_MCP_URL` blank for the direct Splunk Observability Cloud endpoint. Set it only if your instructor provides a hosted MCP gateway.

How the official headers map to this lab:

| MCP concept | Lab setting |
| --- | --- |
| `X-SF-REALM` | `SPLUNK_REALM` |
| `X-SF-TOKEN` | `SPLUNK_ACCESS_TOKEN` |
| Hosted gateway URL | `SPLUNK_MCP_URL` |
| Gateway bearer token | `SPLUNK_MCP_AUTH_TOKEN` |
| Gateway tenant header | `SPLUNK_MCP_TENANT` |

## Verify MCP Tool Discovery

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

## Read the MCP Code Path

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

## Checkpoint

Before moving on:

- `.env` has `SPLUNK_REALM` and `SPLUNK_ACCESS_TOKEN`.
- `SPLUNK_MCP_ENABLED` is either unset or `true`.
- `tools/list` returns MCP tools.
- You know where the orchestrator creates and uses the MCP client.
