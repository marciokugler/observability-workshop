---
title: Configure Monitoring
linkTitle: 4. Configure Monitoring
weight: 4
archetype: chapter
time: 45 minutes
description: Add out-of-the-box RUM, APM, and infrastructure monitoring.
aliases:
  - /ninja-workshops/infrastructure/16-support-portal-infrastructure-troubleshooting/3-run-lab-stack/
---

We will start with a normal app, then add monitoring in the same order you would use for a real service:

1. Browser RUM for customer experience.
2. APM auto instrumentation for backend services.
3. Infrastructure monitoring for the host, containers, and the lab cache filesystem.
4. One custom API gateway span after the out-of-the-box signals already work.

## 1. Configure Browser RUM

Open `apps/frontend/src/main.tsx`. The frontend starts RUM before React renders:

```ts
import { initRum } from "./rum";

initRum();
```

Open `apps/frontend/src/rum.ts`. The important browser snippet is:

```ts
SplunkRum.init({
  realm: config.realm,
  rumAccessToken: import.meta.env.VITE_SPLUNK_RUM_TOKEN,
  applicationName: config.applicationName,
  deploymentEnvironment: config.deploymentEnvironment,
  instrumentations: {
    fetch: {
      propagateTraceHeaderCorsUrls: appConfig.tracePropagationUrls
    },
    xhr: {
      propagateTraceHeaderCorsUrls: appConfig.tracePropagationUrls
    }
  },
  spaMetrics: {
    quietTime: 800
  }
});
```

What this gives you:

- Browser sessions in Splunk RUM.
- Page and network request timing.
- Trace headers on browser calls to the local API services.
- RUM-to-APM links when the backend trace reaches Splunk APM.

The browser reads these values from `.env` through Vite:

```yaml
frontend:
  environment:
    VITE_DEPLOYMENT_ENVIRONMENT: ${VITE_DEPLOYMENT_ENVIRONMENT:-${DEPLOYMENT_ENVIRONMENT:-${INSTANCE:-student-001}}}
    VITE_SPLUNK_REALM: ${VITE_SPLUNK_REALM:-${SPLUNK_REALM:-us1}}
    VITE_SPLUNK_RUM_TOKEN: ${VITE_SPLUNK_RUM_TOKEN:-}
    VITE_SPLUNK_SESSION_REPLAY_ENABLED: ${VITE_SPLUNK_SESSION_REPLAY_ENABLED:-true}
```

Let RUM collect the page, session, fetch, and XHR signals out of the box.

## 2. Enable Backend APM Auto Instrumentation

Each Node.js backend starts through a small bootstrap file. Open `apps/api-gateway/src/bootstrap.ts`:

```ts
import { initSplunkNodeTelemetry } from "@support-portal/telemetry";

initSplunkNodeTelemetry("support-portal-api");
void import("./index.js");
```

The same pattern exists for:

- `apps/assistant-service/src/bootstrap.ts`
- `apps/case-service/src/bootstrap.ts`
- `apps/knowledge-service/src/bootstrap.ts`
- `apps/scenario-controller/src/bootstrap.ts`
- `apps/remediation-orchestrator/src/bootstrap.ts`

The bootstrap starts the Splunk Node.js OpenTelemetry SDK before the service imports the application code. That is what allows HTTP server and HTTP client spans to be captured automatically.

The Node services send telemetry to the collector:

```yaml
environment:
  OTEL_EXPORTER_OTLP_ENDPOINT: http://splunk-otel-collector:4318
  OTEL_EXPORTER_OTLP_PROTOCOL: http/protobuf
  OTEL_PROPAGATORS: tracecontext,baggage,b3
```

The Python remediation agent follows the same idea in `apps/remediation-agent/app/telemetry.py`:

```py
init_splunk_otel()
FastAPIInstrumentor.instrument_app(app)
HTTPXClientInstrumentor().instrument()
```

Expected APM behavior before any custom spans:

```text
support-portal-api: POST /api/support/respond
support-assistant: POST /assistant/respond
support-knowledge: POST /knowledge/query
```

That is enough for the core RUM-to-APM trace path.

## 3. Configure Infrastructure Monitoring

Open `compose.yaml` and find the collector service:

```yaml
splunk-otel-collector:
  image: quay.io/signalfx/splunk-otel-collector:0.147.1
  env_file: *optional-env-file
  environment:
    SPLUNK_ACCESS_TOKEN: ${SPLUNK_ACCESS_TOKEN:-}
    SPLUNK_REALM: ${SPLUNK_REALM:-us1}
    INSTANCE: ${INSTANCE:-student-001}
    DEPLOYMENT_ENVIRONMENT: ${DEPLOYMENT_ENVIRONMENT:-${INSTANCE:-student-001}}
  command:
    - "--config=${OTEL_COLLECTOR_CONFIG:-/etc/otel/config-local.yaml}"
  volumes:
    - ./observability/otel-collector/config.yaml:/etc/otel/config.yaml:ro
    - ./observability/otel-collector/config-local.yaml:/etc/otel/config-local.yaml:ro
    - /var/run/docker.sock:/var/run/docker.sock:ro
    - /:/hostfs:ro
    - support_knowledge_cache:/var/cache/support-knowledge:ro
```

The key mounts are:

| Mount | Why it exists |
| --- | --- |
| `/var/run/docker.sock` | Lets the `docker_stats` receiver collect container metrics for the lab containers. |
| `/hostfs` | Lets the `hostmetrics` receiver read host metrics from inside the collector container. |
| `/var/cache/support-knowledge` | Exposes the bounded lab cache volume so the collector can measure the incident filesystem. |

Open `observability/otel-collector/config.yaml`. The workshop starts with this file empty. Add the collector config in these blocks.

### Receive Application Telemetry

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
```

### Collect Host And Container Metrics

```yaml
  docker_stats:
    endpoint: unix:///var/run/docker.sock
    collection_interval: 30s
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

`docker_stats` gives container-level metrics for the Compose stack. `hostmetrics` gives host-level CPU, memory, disk, filesystem, and process metrics.

### Add The Lab Cache Filesystem

The lab cache is a Docker `tmpfs` mounted at `/var/cache/support-knowledge`.

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

This is still standard hostmetrics filesystem collection.

### Add Processors And Exporters

```yaml
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
  otlphttp/splunk:
    traces_endpoint: https://ingest.${SPLUNK_REALM}.observability.splunkcloud.com/v2/trace/otlp
    headers:
      X-SF-Token: ${SPLUNK_ACCESS_TOKEN}
```

`resource/lab_identity` is the only lab identity customization. It keeps shared Splunk organizations clean by giving each student predictable filters.

### Add Pipelines

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, resource/lab_identity, batch]
      exporters: [otlphttp/splunk, signalfx]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, resource/lab_identity, batch]
      exporters: [signalfx]
    metrics/infrastructure:
      receivers: [hostmetrics]
      processors: [memory_limiter, resourcedetection, resource/lab_identity, batch]
      exporters: [signalfx]
    metrics/containers:
      receivers: [docker_stats]
      processors: [memory_limiter, resourcedetection, resource/lab_identity, batch]
      exporters: [signalfx]
    metrics/cache_volume:
      receivers: [hostmetrics/cache_volume]
      processors: [memory_limiter, resourcedetection, resource/lab_identity, batch]
      exporters: [signalfx]
```

The app traces and metrics enter through OTLP. Host, container, and cache filesystem metrics come from collector receivers.

## Complete Reference Config

If your config does not start, replace `observability/otel-collector/config.yaml` with this complete reference and continue:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
  docker_stats:
    endpoint: unix:///var/run/docker.sock
    collection_interval: 30s
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
  otlphttp/splunk:
    traces_endpoint: https://ingest.${SPLUNK_REALM}.observability.splunkcloud.com/v2/trace/otlp
    headers:
      X-SF-Token: ${SPLUNK_ACCESS_TOKEN}

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, resource/lab_identity, batch]
      exporters: [otlphttp/splunk, signalfx]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resourcedetection, resource/lab_identity, batch]
      exporters: [signalfx]
    metrics/infrastructure:
      receivers: [hostmetrics]
      processors: [memory_limiter, resourcedetection, resource/lab_identity, batch]
      exporters: [signalfx]
    metrics/containers:
      receivers: [docker_stats]
      processors: [memory_limiter, resourcedetection, resource/lab_identity, batch]
      exporters: [signalfx]
    metrics/cache_volume:
      receivers: [hostmetrics/cache_volume]
      processors: [memory_limiter, resourcedetection, resource/lab_identity, batch]
      exporters: [signalfx]
```

## 4. Start The Stack

Start or recreate the full Compose stack:

```bash
docker compose up --force-recreate --wait
```

Open:

- Support portal: `http://127.0.0.1:18080`
- Operator console: `http://127.0.0.1:18081`

Run each healthy journey once by clicking the buttons:

1. `AI Support Response`
2. `Account Status Lookup`
3. `Help Article Search`

Then generate browser traffic:

```bash
RUM_SIMULATOR_USERS=6 RUM_SIMULATOR_ROUNDS=6 RUM_SIMULATOR_BROWSERS=chromium RUM_SIMULATOR_CONCURRENCY=2 docker compose run --rm rum-simulator
```

## 5. Verify Out-Of-The-Box Correlation

In Splunk RUM, confirm:

- Application name is `support-portal`.
- Browser sessions and network requests exist.
- `/api/support/respond` appears as a network request.

In Splunk APM, confirm:

- `support-portal-api`
- `support-assistant`
- `support-knowledge`
- `support-case-service`
- `scenario-controller`
- `remediation-orchestrator`
- `remediation-agent`

Open a trace from the RUM request. The core path should be visible from automatic browser and backend instrumentation:

```text
RUM network request
  support-portal-api: POST /api/support/respond
    support-assistant: POST /assistant/respond
      support-knowledge: POST /knowledge/query
```

In Infrastructure or Metric Finder, confirm:

```text
system.filesystem.utilization
mountpoint=/var/cache/support-knowledge
service.instance.id=<INSTANCE>
```

Also confirm container metrics from `docker_stats` are present for the Compose services.

## 6. Add One Custom Gateway Span

Out-of-the-box monitoring is enabled but we still want to add a custom span. We only do this when it answers a specific question that automatic spans do not isolate clearly.

In this lab, the custom span is in `apps/api-gateway/src/index.ts`:

```ts
const downstream = await runInSpan("support.gateway.forward_support_response", routes()[0].telemetry, () =>
  fetch(`${assistantServiceBaseUrl}/assistant/respond`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(request.body ?? {})
  })
);
```

This span isolates one operation: the API gateway forwarding the support response request to `support-assistant`.

The wrapper is in `packages/telemetry/src/node.ts`:

```ts
export async function runInSpan<T>(
  name: string,
  attributes: Record<string, string | number | boolean | string[]> | undefined,
  fn: () => Promise<T>
) {
  const tracer = trace.getTracer("support-portal");
  return tracer.startActiveSpan(name, async (span) => {
    if (attributes) {
      annotateCurrentSpan(attributes);
    }

    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : "Unknown span failure"
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

The wrapper starts a named active span, adds the same business attributes as the server span, runs the async callback, records success or failure, and always ends the span. Because the `fetch` call runs inside that active span, the auto-instrumented HTTP client span stays under the gateway operation in the trace waterfall.

Read it this way:

- If `support.gateway.forward_support_response` is slow, the gateway is waiting on downstream service work.
- If the server span `POST /api/support/respond` is slow but this custom span is not, the extra time is inside gateway logic outside that downstream call.

## Sources

- [Install the Splunk RUM browser agent](https://help.splunk.com/en/splunk-observability-cloud/manage-data/instrument-front-end-applications/instrument-mobile-and-web-applications-for-splunk-real-user-monitoring-rum/instrument-browser-applications-for-splunk-rum/install-the-splunk-rum-browser-agent)
- [About the Splunk Distribution of OpenTelemetry JS](https://help.splunk.com/en/splunk-observability-cloud/manage-data/instrument-back-end-services/instrument-back-end-applications-to-send-spans-to-splunk-apm/instrument-a-node.js-application/version-2.x-end-of-life/about-splunk-otel-js)
- [OpenTelemetry Docker Stats receiver](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/dockerstatsreceiver/README.md)
- [OpenTelemetry hostmetrics receiver](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/hostmetricsreceiver#file-system)
