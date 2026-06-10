---
title: Run the Lab Stack
linkTitle: 3. Run the Lab Stack
weight: 3
archetype: chapter
time: 20 minutes
description: Start the collector and application stack, verify local endpoints, and create a healthy baseline.
---

Create a healthy baseline before introducing the failure. Confirm the portal, backend services, telemetry path, and operator console all work.

All commands on this page run from the app directory:

```bash
cd observability-workshop/workshop/support-portal-remediation-agent
```

If you used the ZIP download, use `cd observability-workshop-main/workshop/support-portal-remediation-agent` instead.

If your prompt already ends in `workshop/support-portal-remediation-agent`, stay there and run the commands directly.

## Exercise: Explain the Collector Configuration

Before starting the collector, open:

```text
infra/otel-collector/config.yaml
```

This file controls how the local Splunk OpenTelemetry Collector receives telemetry, adds workshop identity, collects host metrics, and sends the data to Splunk Observability Cloud.

### Add the Cache Filesystem Receiver

Find the `receivers:` section. Add or verify this receiver:

```yaml
  hostmetrics/cache_volume:
    collection_interval: 15s
    scrapers:
      filesystem:
        include_virtual_filesystems: true
        include_fs_types:
          match_type: strict
          fs_types:
            - tmpfs
        include_mount_points:
          match_type: strict
          mount_points:
            - /var/cache/claims-knowledge
        metrics:
          system.filesystem.usage:
            enabled: true
          system.filesystem.utilization:
            enabled: true
```

Why this receiver exists:

- The incident is cache filesystem pressure, so students need a specific infrastructure signal for `/var/cache/claims-knowledge`.
- The cache mount can be a `tmpfs` volume in the local lab, so `include_virtual_filesystems: true` and `fs_types: [tmpfs]` keep that filesystem visible.
- The strict mount-point filter keeps the workshop focused on the cache used by `claims-knowledge`, instead of every filesystem on the laptop.
- The `15s` interval gives faster feedback during the demo than the general host metrics interval.
- `system.filesystem.usage` and `system.filesystem.utilization` are standard host metrics. The workshop uses default infrastructure telemetry, not custom demo metrics, to prove the root cause.

### Add the Lab Identity Processor

Find the `processors:` section. Add or verify this processor:

```yaml
  resource/lab_identity:
    attributes:
      - action: upsert
        key: deployment.environment
        value: ${DEPLOYMENT_ENVIRONMENT}
      - action: upsert
        key: service.instance.id
        value: ${INSTANCE}
      - action: upsert
        key: host.name
        value: ${INSTANCE}
      - action: upsert
        key: host
        value: ${INSTANCE}
      - action: upsert
        key: lab.name
        value: ciscolive26
      - action: upsert
        key: lab.student.id
        value: ${INSTANCE}
```

How it works:

- `resource/lab_identity` is a resource processor. It adds attributes to telemetry before export.
- `action: upsert` means the collector creates the attribute if it is missing, or replaces the existing value if it is already present.
- `${DEPLOYMENT_ENVIRONMENT}` and `${INSTANCE}` come from `.env` through Docker Compose.

What these settings bring:

| Attribute | Why it matters |
| --- | --- |
| `deployment.environment` | Separates workshop telemetry from other environments. |
| `service.instance.id` | Gives every student a stable filter across services, traces, and metrics. |
| `host.name` and `host` | Make host and filesystem metrics use the student instance name instead of a random laptop or container host name. |
| `lab.name` | Identifies the workshop dataset. |
| `lab.student.id` | Lets dashboards, detectors, and searches isolate one student's telemetry. |

### Wire the Receiver into a Pipeline

Find `service.pipelines`. Add or verify this pipeline:

```yaml
    metrics/cache_volume:
      receivers: [hostmetrics/cache_volume]
      processors: [memory_limiter, resourcedetection, resource/lab_identity, resource/claims_knowledge_infra_relation, batch]
      exporters: [signalfx]
```

This pipeline says:

- Collect only the cache filesystem receiver.
- Add normal system resource attributes.
- Add the student lab identity.
- Add the `claims-knowledge` relationship metadata used in the workshop.
- Export the resulting infrastructure metrics to Splunk Observability Cloud.

Also confirm `resource/lab_identity` appears in the `traces`, `metrics`, and `metrics/infrastructure` pipelines. That keeps browser, APM, application metrics, and infrastructure metrics filterable by the same student identity.

{{% notice title="Exercise" style="green" icon="running" %}}

Answer these before starting the collector:

1. Which metric proves the cache filesystem is filling?
2. Which attribute lets you filter the data to your own student instance?
3. Why does the workshop use a browser traffic simulator instead of direct backend calls?

{{% /notice %}}

## Start the Collector

Use this when you want Splunk APM, RUM, and host metric export:

`npm run dev:collector` is a shortcut defined in this app's `package.json`. It checks for Docker Compose, then starts only the `splunk-otel-collector` service from `infra/docker/docker-compose.yml` with values from `.env`. It does not start the portal or backend services.

```bash
set -a
source .env
set +a
npm run dev:collector
```

The host OTLP HTTP endpoint is:

```text
http://127.0.0.1:14318
```

Leave the collector running in its terminal.

## Start the Application

Open a second terminal:

```bash
cd observability-workshop/workshop/support-portal-remediation-agent
set -a
source .env
set +a
npm run dev
```

This starts the backend services, remediation agent, claims portal, and operator console.

## Verify Local Endpoints

Open:

- Claims portal: `http://127.0.0.1:18080`
- Operator console: `http://127.0.0.1:18081`

Expected result:

- Portal loads.
- Operator console loads.
- The portal shows the healthy support journey state.
- The operator console loads without a stale incident blocking the flow.

## Establish a Healthy Baseline

In the claims portal, run each journey once:

1. `AI Claim Status`
2. `Policy Coverage Lookup`
3. `Claims FAQ Search`

Confirm:

- All three journeys return successful responses.
- `AI Claim Status` is not noticeably slower than the comparison journeys.
- The operator console has no stale incident blocking the flow.

## Generate Customer Browser Traffic

Run browser traffic before moving on. This simulates many customers using the portal and keeps the lab evidence grounded in real browser journeys. Do not use direct backend API load for this workshop path.

```bash
RUM_SIMULATOR_USERS=6 RUM_SIMULATOR_ROUNDS=6 RUM_SIMULATOR_BROWSERS=chromium RUM_SIMULATOR_CONCURRENCY=2 npm run simulate:rum
```

Expected result:

- The simulator opens headless browser sessions against the claims portal.
- Each session clicks `AI Claim Status`, `Policy Coverage Lookup`, and `Claims FAQ Search`.
- Backend services receive traffic through the same browser and API gateway path a customer uses.

For longer demos, keep browser sessions running in a separate terminal:

```bash
RUM_SIMULATOR_USERS=4 RUM_SIMULATOR_ROUNDS=60 RUM_SIMULATOR_BROWSERS=chromium RUM_SIMULATOR_CONCURRENCY=2 npm run simulate:rum
```

## Baseline Splunk Checks

In Splunk APM, confirm these services appear:

- `claims-portal-api`
- `claims-assistant`
- `claims-knowledge`
- `claims-policy-service`
- `scenario-controller`
- `remediation-orchestrator`
- `remediation-agent`

If RUM is configured, confirm Digital Experience activity for:

```text
ibobs-claims-portal
```
