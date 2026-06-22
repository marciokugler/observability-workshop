---
title: Configure the Collector
linkTitle: 4. Configure Collector
weight: 4
archetype: chapter
time: 40 minutes
description: Build the Splunk OpenTelemetry Collector config from a minimal working file to the complete lab configuration.
aliases:
  - /ninja-workshops/infrastructure/16-support-portal-infrastructure-troubleshooting/3-run-lab-stack/
---

This is the main configuration exercise for the lab. You will start with a clean, minimal Splunk OpenTelemetry Collector config, then add the pieces that make the infrastructure troubleshooting story work.

By the end of this session, you should understand:

- how Docker Compose passes environment variables into the collector container
- how the collector config reads those values with `${VARIABLE}` syntax
- how app telemetry enters through OTLP
- how host and filesystem metrics are collected
- how student identity is added to traces and metrics
- how the final config can be restored from a complete reference if something is mistyped

## How Compose Starts The Collector

Open `compose.yaml` and find the `splunk-otel-collector` service.

Important lines:

```yaml
environment:
  SPLUNK_ACCESS_TOKEN: ${SPLUNK_ACCESS_TOKEN:-}
  SPLUNK_REALM: ${SPLUNK_REALM:-us1}
  DEPLOYMENT_ENVIRONMENT: ${DEPLOYMENT_ENVIRONMENT:-demo}
  INSTANCE: ${INSTANCE:-student-001}
  OTEL_RESOURCE_ATTRIBUTES: ${OTEL_RESOURCE_ATTRIBUTES:-lab.name=support-portal,lab.student.id=student-001,service.instance.id=student-001,host.name=student-001,deployment.environment=demo}
command:
  - "--config=${OTEL_COLLECTOR_CONFIG:-/etc/otel/config-local.yaml}"
volumes:
  - ./observability/otel-collector/config.yaml:/etc/otel/config.yaml:ro
  - ./observability/otel-collector/config-local.yaml:/etc/otel/config-local.yaml:ro
  - /:/hostfs:ro
  - support_knowledge_cache:/var/cache/support-knowledge:ro
```

What this means:

| Value | Where it comes from | Where it is used |
| --- | --- | --- |
| `SPLUNK_ACCESS_TOKEN` | `.env`, then Compose | Collector exporters and MCP session later in the lab. |
| `SPLUNK_REALM` | `.env`, then Compose | Builds Splunk API and ingest URLs. |
| `DEPLOYMENT_ENVIRONMENT` | `.env`, then Compose | Added as `deployment.environment` and `sf_environment`. |
| `INSTANCE` | `.env`, then Compose | Added as `service.instance.id`, `host.name`, and `lab.student.id`. |
| `OTEL_COLLECTOR_CONFIG` | `.env`, then Compose | Chooses `/etc/otel/config.yaml` for live Splunk export or `/etc/otel/config-local.yaml` for local debug output. |
| `/hostfs` | Docker volume mount | Lets the collector read host filesystem metrics safely. |
| `/var/cache/support-knowledge` | Docker volume mount | Exposes the bounded cache volume to the collector as a filesystem metric source. |

For the live lab path, add this value to `.env`:

```dotenv
OTEL_COLLECTOR_CONFIG=/etc/otel/config.yaml
```

The collector config file can now use environment variables like this:

```yaml
realm: ${SPLUNK_REALM}
value: ${INSTANCE}
```

The collector resolves those placeholders inside the container after Compose passes the values in.

## Start From A Clean Collector Config

Open:

```text
observability/otel-collector/config.yaml
```

For the exercise, replace the file with this minimal working config:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
  batch:

exporters:
  signalfx:
    access_token: ${SPLUNK_ACCESS_TOKEN}
    realm: ${SPLUNK_REALM}

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [signalfx]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [signalfx]
```

This config does only three things:

1. Receives OTLP traces and metrics on ports `4317` and `4318`.
2. Protects the collector with `memory_limiter` and batches telemetry with `batch`.
3. Exports telemetry to Splunk Observability Cloud using `SPLUNK_ACCESS_TOKEN` and `SPLUNK_REALM`.

It does not collect host filesystem metrics yet. It also does not add student identity yet.

## Add Host Metrics

Add a `hostmetrics` receiver under `receivers`:

```yaml
  hostmetrics:
    collection_interval: 30s
    root_path: /hostfs
    scrapers:
      cpu:
      disk:
      filesystem:
      load:
      memory:
      network:
      paging:
      processes:
```

Why this matters:

- `root_path: /hostfs` matches the Compose mount `/:/hostfs:ro`.
- The collector can read host-style metrics without writing to the host filesystem.
- The `filesystem` scraper gives the lab its infrastructure signal.

Add a pipeline for host metrics:

```yaml
    metrics/infrastructure:
      receivers: [hostmetrics]
      processors: [memory_limiter, batch]
      exporters: [signalfx]
```

## Add Student Identity

Add `resourcedetection` and `resource/lab_identity` under `processors`:

```yaml
  resourcedetection:
    detectors: [env, system]
    timeout: 2s
    override: true
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
        value: support-portal
      - action: upsert
        key: lab.student.id
        value: ${INSTANCE}
```

How the environment variables are used:

| Attribute | Source | Why it matters |
| --- | --- | --- |
| `deployment.environment` | `DEPLOYMENT_ENVIRONMENT` | Separates workshop telemetry from other environments. |
| `service.instance.id` | `INSTANCE` | Gives students a stable filter across traces and metrics. |
| `host.name` and `host` | `INSTANCE` | Prevents random container or laptop names from becoming the main host identity. |
| `lab.name` | hard-coded as `support-portal` | Identifies this workshop. |
| `lab.student.id` | `INSTANCE` | Makes shared Splunk org filtering predictable. |

Then update all pipelines so they include `resourcedetection` and `resource/lab_identity`:

```yaml
processors: [memory_limiter, resourcedetection, resource/lab_identity, batch]
```

## Add The Cache Filesystem Receiver

The general hostmetrics receiver sees many filesystems. The lab needs one specific signal: the bounded `support-knowledge` cache volume.

Add this receiver under `receivers`:

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
            - /var/cache/support-knowledge
        metrics:
          system.filesystem.usage:
            enabled: true
          system.filesystem.utilization:
            enabled: true
```

Why these settings matter:

- `support_knowledge_cache` is mounted into the collector at `/var/cache/support-knowledge`.
- The cache volume is a `tmpfs`, so `include_virtual_filesystems: true` is required.
- `collection_interval: 15s` makes the lab respond quickly during demos.
- `system.filesystem.utilization` is the infrastructure signal students will inspect in Splunk.

Add the dedicated pipeline:

```yaml
    metrics/cache_volume:
      receivers: [hostmetrics/cache_volume]
      processors: [memory_limiter, resourcedetection, resource/lab_identity, batch]
      exporters: [signalfx]
```

## Add Service-To-Infrastructure Context

For the workshop, students should be able to connect the `support-knowledge` service to the cache filesystem pressure.

Add this processor:

```yaml
  resource/support_knowledge_infra_relation:
    attributes:
      - action: upsert
        key: sf_service
        value: support-knowledge
      - action: upsert
        key: service.name
        value: support-knowledge
      - action: upsert
        key: service.namespace
        value: support-portal
      - action: upsert
        key: sf_environment
        value: ${DEPLOYMENT_ENVIRONMENT}
```

Then add it only to the infrastructure pipelines:

```yaml
processors: [memory_limiter, resourcedetection, resource/lab_identity, resource/support_knowledge_infra_relation, batch]
```

This does not create a custom metric. It adds entity context to default host filesystem metrics so the lab story is easier to follow.

## Add Explicit Splunk Endpoints

The minimal `signalfx` exporter can infer endpoint details from the realm. For teaching, make the URLs explicit so students can see how `SPLUNK_REALM` is used:

```yaml
exporters:
  signalfx:
    access_token: ${SPLUNK_ACCESS_TOKEN}
    realm: ${SPLUNK_REALM}
    api_url: https://api.${SPLUNK_REALM}.observability.splunkcloud.com
    ingest_url: https://ingest.${SPLUNK_REALM}.observability.splunkcloud.com
    root_path: /hostfs
    sync_host_metadata: true
    correlation:
      stale_service_timeout: 2h
      log_updates: true
  otlp_http/traces:
    traces_endpoint: https://ingest.${SPLUNK_REALM}.observability.splunkcloud.com/v2/trace/otlp
    headers:
      X-SF-Token: ${SPLUNK_ACCESS_TOKEN}
```

What each environment variable does here:

- `SPLUNK_ACCESS_TOKEN` becomes the Splunk token used by the exporters.
- `SPLUNK_REALM` becomes part of the API, ingest, and OTLP trace endpoint hostnames.
- `root_path: /hostfs` matches the Compose mount used for host metadata.

Update the trace pipeline to use both trace exporters:

```yaml
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, resource/lab_identity, batch]
      exporters: [otlp_http/traces, signalfx]
```

## Complete Reference Config

If your config does not start, replace `observability/otel-collector/config.yaml` with this complete reference and continue the lab:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
  hostmetrics:
    collection_interval: 30s
    root_path: /hostfs
    scrapers:
      cpu:
      disk:
      filesystem:
      load:
      memory:
      network:
      paging:
      processes:
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
            - /var/cache/support-knowledge
        metrics:
          system.filesystem.usage:
            enabled: true
          system.filesystem.utilization:
            enabled: true
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
  batch:
  resourcedetection:
    detectors: [env, system]
    timeout: 2s
    override: true
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
        value: support-portal
      - action: upsert
        key: lab.student.id
        value: ${INSTANCE}
  resource/support_knowledge_infra_relation:
    attributes:
      - action: upsert
        key: sf_service
        value: support-knowledge
      - action: upsert
        key: service.name
        value: support-knowledge
      - action: upsert
        key: service.namespace
        value: support-portal
      - action: upsert
        key: sf_environment
        value: ${DEPLOYMENT_ENVIRONMENT}

exporters:
  signalfx:
    access_token: ${SPLUNK_ACCESS_TOKEN}
    realm: ${SPLUNK_REALM}
    api_url: https://api.${SPLUNK_REALM}.observability.splunkcloud.com
    ingest_url: https://ingest.${SPLUNK_REALM}.observability.splunkcloud.com
    root_path: /hostfs
    sync_host_metadata: true
    correlation:
      stale_service_timeout: 2h
      log_updates: true
  otlp_http/traces:
    traces_endpoint: https://ingest.${SPLUNK_REALM}.observability.splunkcloud.com/v2/trace/otlp
    headers:
      X-SF-Token: ${SPLUNK_ACCESS_TOKEN}
  debug:
    verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, resource/lab_identity, batch]
      exporters: [otlp_http/traces, signalfx]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, resource/lab_identity, batch]
      exporters: [signalfx]
    metrics/infrastructure:
      receivers: [hostmetrics]
      processors: [memory_limiter, resourcedetection, resource/lab_identity, resource/support_knowledge_infra_relation, batch]
      exporters: [signalfx]
    metrics/cache_volume:
      receivers: [hostmetrics/cache_volume]
      processors: [memory_limiter, resourcedetection, resource/lab_identity, resource/support_knowledge_infra_relation, batch]
      exporters: [signalfx]
```

## Start the Lab Stack

Return to the app directory:

```bash
cd observability-workshop/workshop/support-portal
```

Start the full Compose stack:

```bash
docker compose up --wait
```

This starts the Splunk OpenTelemetry Collector, backend services, cleanup worker, support portal, and operator console. The host OTLP HTTP endpoint is:

```text
http://127.0.0.1:14318
```

If the collector fails to start, restore the complete reference config above and rerun:

```bash
docker compose up --wait
```

## Verify Local Endpoints

Open:

- Support portal: `http://127.0.0.1:18080`
- Operator console: `http://127.0.0.1:18081`

Expected result:

- Portal loads.
- Operator console loads.
- The portal shows the healthy support journey state.

## Establish a Healthy Baseline

In the support portal, run each journey once:

1. Click `AI Support Response`
2. Click `Account Status Lookup`
3. Click `Help Article Search`

Confirm:

- All three journeys return successful responses.
- `AI Support Response` is not noticeably slower than the comparison journeys.

## Generate Customer Browser Traffic

Run browser traffic before moving on. This simulates many customers using the portal during the winter storm and keeps the lab evidence grounded in real browser journeys.

```bash
RUM_SIMULATOR_USERS=6 RUM_SIMULATOR_ROUNDS=6 RUM_SIMULATOR_BROWSERS=chromium RUM_SIMULATOR_CONCURRENCY=2 docker compose run --rm rum-simulator
```

Expected result:

- The simulator opens headless browser sessions against the support portal.
- Each session clicks `AI Support Response`, `Account Status Lookup`, and `Help Article Search`.
- Backend services receive traffic through the same browser and API gateway path a customer uses.

## Baseline Splunk Checks

In Splunk APM, confirm these services appear:

- `support-portal-api`
- `support-assistant`
- `support-knowledge`
- `support-case-service`
- `scenario-controller`
- `remediation-orchestrator`
- `remediation-agent`

In Splunk RUM, confirm Digital Experience activity for:

```text
support-portal
```

In Metric Finder, confirm the cache filesystem metric is present for your instance:

```text
system.filesystem.utilization
mountpoint=/var/cache/support-knowledge
service.instance.id=<INSTANCE>
```
