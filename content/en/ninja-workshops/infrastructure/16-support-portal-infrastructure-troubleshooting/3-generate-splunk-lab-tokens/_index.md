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
| `SPLUNK_ACCESS_TOKEN` | Splunk Observability Cloud access token | Authenticates collector export. When the token also has the instructor-provided API role, it also authenticates MCP evidence requests. |
| `VITE_SPLUNK_RUM_TOKEN` | RUM access token | Lets the browser support portal send RUM telemetry. |
| `SPLUNK_REALM` | Realm, such as `us1` | Builds the Splunk ingest, API, and MCP endpoints. |
| `OTEL_COLLECTOR_CONFIG` | Collector config path | Uses the live Splunk exporter config instead of the local debug config. |

{{% notice title="Token Handling" style="warning" %}}
Treat `SPLUNK_ACCESS_TOKEN` as sensitive. The RUM token is designed for browser ingestion, but use a lab-specific token so it can be rotated after the workshop.
{{% /notice %}}

## Open Access Tokens

In Splunk Observability Cloud:

1. Open **Settings** from the left navigation.
2. In the Settings panel, under **Access**, select **Access tokens**.
3. Select **Create Token**.

![Access Tokens page with Create Token button](../images/screenshot-splunk-o11y-settings-token-menu.png?width=70vw)

## Create the Lab Access Token

Create a token for the backend and collector path.

Recommended naming pattern:

```text
support-portal-<student-id>-lab-access
```

On the **Name & Scope** screen:

1. Enter the token name.
2. Select **INGEST token**.
3. If your instructor tells you to use the same token for MCP evidence, also select **API token with roles** and choose the provided role.
4. Select **Next**.


![Create an ingest access token](../images/screenshot-splunk-o11y-create-new-token-ingestion.png?width=45vw)

On the **Permission** screen, keep **Only admins can read**.

![Access token read permissions](../images/screenshot-splunk-o11y-create-new-token-permissions.png?width=45vw)

On the **Expiration** screen, set a future date then select **Create**.

![Access token expiration date](../images/screenshot-splunk-o11y-create-new-token-exp-date.png?width=45vw)

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

Select **Create Token** again. On the **Name & Scope** screen:

1. Enter the token name.
2. Select **RUM token**.
3. Select **Next**.

Use the same permission and expiration choices from the lab access token.

![Create a RUM access token](../images/screenshot-splunk-o11y-create-new-token.png?width=45vw)

After creating the token, copy the value into `.env`:

```dotenv
VITE_SPLUNK_RUM_TOKEN=<your-rum-token>
```

## Confirm Realm and Student Identity

Confirm the Splunk realm for your organization, then update `.env`:

```dotenv
INSTANCE=student-00x
DEPLOYMENT_ENVIRONMENT=student-00x
OTEL_COLLECTOR_CONFIG=/etc/otel/config.yaml
SPLUNK_REALM=us1
SPLUNK_ACCESS_TOKEN=<your-lab-access-token>
VITE_SPLUNK_RUM_TOKEN=<your-rum-token>
```

Use a unique `INSTANCE` value for every student when sharing one Splunk Observability Cloud organization. Set `DEPLOYMENT_ENVIRONMENT`.

`OTEL_COLLECTOR_CONFIG=/etc/otel/config.yaml` tells Docker Compose to start the collector with the live Splunk export configuration.

## Checkpoint

Before starting the lab stack:

- `.env` exists in `workshop/support-portal`.
- `INSTANCE` is unique for the student.
- `DEPLOYMENT_ENVIRONMENT` matches `INSTANCE`.
- `OTEL_COLLECTOR_CONFIG` is set to `/etc/otel/config.yaml`.
- `SPLUNK_REALM` matches the Splunk Observability Cloud organization.
- `SPLUNK_ACCESS_TOKEN` is set.
- `VITE_SPLUNK_RUM_TOKEN` is set.
