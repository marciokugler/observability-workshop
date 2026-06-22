---
title: Generate Splunk Lab Tokens
linkTitle: 3. Generate Lab Tokens
weight: 3
archetype: chapter
time: 15 minutes
description: Create the Splunk Observability Cloud tokens needed for collector ingest, MCP evidence, and browser RUM.
aliases:
  - /ninja-workshops/infrastructure/16-support-portal-infrastructure-troubleshooting/3-generate-splunk-lab-tokens/
---

Create the Splunk Observability Cloud tokens before starting the lab stack. You will add these values to `.env` in the support portal app directory.

## Tokens Needed

| `.env` value | Token or setting | Purpose |
| --- | --- | --- |
| `SPLUNK_ACCESS_TOKEN` | Splunk Observability Cloud access token | Authenticates collector export and MCP evidence requests. |
| `VITE_SPLUNK_RUM_TOKEN` | RUM access token | Lets the browser support portal send RUM telemetry. |
| `SPLUNK_REALM` | Realm, such as `us1` | Builds the Splunk ingest, API, and MCP endpoints. |

{{% notice title="Token Handling" style="warning" %}}
Treat `SPLUNK_ACCESS_TOKEN` as sensitive. The RUM token is designed for browser ingestion, but use a lab-specific token so it can be rotated after the workshop.
{{% /notice %}}

## Open Access Tokens

In Splunk Observability Cloud:

1. Open the main menu.
2. Select **Settings**.
3. Select **Access Tokens**.
4. Select **New Token**.

> Snapshot placeholder: Add a screenshot of **Settings > Access Tokens** with the **New Token** button visible.

## Create the Lab Access Token

Create a token for the backend and collector path.

Recommended naming pattern:

```text
support-portal-<student-id>-lab-access
```

Use the token scope provided by your instructor for the lab tenant. The lab uses this value as `SPLUNK_ACCESS_TOKEN` for:

- Splunk OpenTelemetry Collector export
- Splunk MCP evidence lookup
- local validation requests that call Splunk Observability Cloud

If your Splunk organization separates ingest and API permissions into different tokens, follow the instructor-provided token mapping for your tenant before continuing.

> Snapshot placeholder: Add a screenshot of the access-token setup screen for the lab access token scope.

After creating the token, copy the value into `.env`:

```dotenv
SPLUNK_ACCESS_TOKEN=<your-lab-access-token>
```

## Create the RUM Token

Create a second access token for browser RUM.

Recommended naming pattern:

```text
support-portal-<student-id>-rum
```

Select the **RUM token** scope. This token is used only by the browser-facing support portal.

> Snapshot placeholder: Add a screenshot of the access-token setup screen with **RUM token** selected.

After creating the token, copy the value into `.env`:

```dotenv
VITE_SPLUNK_RUM_TOKEN=<your-rum-token>
```

## Confirm Realm and Student Identity

Confirm the Splunk realm for your organization, then update `.env`:

```dotenv
INSTANCE=student-001
DEPLOYMENT_ENVIRONMENT=demo
SPLUNK_REALM=us1
SPLUNK_ACCESS_TOKEN=<your-lab-access-token>
VITE_SPLUNK_RUM_TOKEN=<your-rum-token>
```

Use a unique `INSTANCE` value for every student when sharing one Splunk Observability Cloud organization. This value is what lets you filter RUM, APM, and host metrics.

> Snapshot placeholder: Add a screenshot that shows where students can confirm the Splunk realm or the instructor-provided realm value.

## Checkpoint

Before starting the lab stack:

- `.env` exists in `workshop/support-portal`.
- `INSTANCE` is unique for the student.
- `SPLUNK_REALM` matches the Splunk Observability Cloud organization.
- `SPLUNK_ACCESS_TOKEN` is set.
- `VITE_SPLUNK_RUM_TOKEN` is set.
