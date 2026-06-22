---
title: Investigate Filesystem Pressure
linkTitle: 5. Investigate Filesystem Pressure
weight: 5
archetype: chapter
time: 30 minutes
description: Trigger the cache filesystem incident and prove the root cause from RUM, APM traces, and Infrastructure metrics.
aliases:
  - /ninja-workshops/infrastructure/16-support-portal-infrastructure-troubleshooting/4-investigate-cache-pressure/
---

Prove the incident with telemetry. Separate customer impact, service behavior, and infrastructure cause.

## Trigger the Incident

Use the portal or operator console button named `Trigger Cache Pressure`.

Expected result:

- The portal or operator console shows that cache pressure is active.
- The next browser request to `AI Support Response` starts using the degraded path.
- The comparison journeys remain available.

## Reproduce Customer Impact

In the support portal:

1. Run `AI Support Response`.
2. Run `Account Status Lookup`.
3. Run `Help Article Search`.

Expected result:

- `AI Support Response` is slower or partially degraded.
- `Account Status Lookup` and `Help Article Search` remain healthier comparison journeys.
- The whole application is not down.

## Drive Degraded Browser Traffic

Use browser traffic to create more RUM and APM data points. The simulator clicks the portal journeys instead of calling backend APIs directly.

```bash
RUM_SIMULATOR_USERS=8 RUM_SIMULATOR_ROUNDS=8 RUM_SIMULATOR_BROWSERS=chromium RUM_SIMULATOR_CONCURRENCY=2 docker compose run --rm rum-simulator
```

## Start in Splunk RUM

Open Splunk Observability Cloud and start with the customer experience.

1. Go to **Digital Experience**.
2. Open the RUM application named `support-portal`.
3. Set the time range to the last 15 minutes.
4. Open network requests or page activity for the support portal.
5. Find the slow request for `/api/support/respond`.

What you are proving:

- The customer-facing portal is receiving traffic.
- The slow path starts at a browser journey, not a synthetic backend call.
- The affected request is the support response path.

Use these filters when available:

```text
deployment.environment=demo
service.instance.id=<INSTANCE>
lab.name=support-portal
lab.student.id=<INSTANCE>
```

## Open the Slow Trace

From the slow RUM request, open the linked trace or trace waterfall when available. If the direct link is not available, copy the trace ID from RUM and search for it in APM Trace Analyzer.

In the trace waterfall, follow the service path:

```text
browser -> support-portal-api -> support-assistant -> support-knowledge
```

Expected trace evidence:

- The request route is related to `/api/support/respond`.
- `support-knowledge` is the slow backend service.
- The delay is concentrated in the support response path.
- The comparison journeys are not showing the same degradation pattern.

## Confirm the Affected Service in APM

Open Splunk APM and inspect `support-knowledge`.

Use the same time range and student filters:

```text
deployment.environment=demo
service.instance.id=<INSTANCE>
```

Confirm:

- Service latency increased after cache pressure was triggered.
- Request count exists for the degraded window.
- Error rate is not the primary signal.
- The service map connects the portal path to `support-knowledge`.

The APM conclusion should be narrow:

```text
The slow customer journey reaches support-knowledge, and support-knowledge latency is elevated for this student instance.
```

## Confirm the Filesystem Root Cause

Now move from APM to Infrastructure or Metric Finder.

Search for:

```text
system.filesystem.utilization
```

Filter to:

```text
mountpoint=/var/cache/support-knowledge
service.instance.id=<INSTANCE>
deployment.environment=demo
```

Expected infrastructure evidence:

- Filesystem utilization rises after the scenario is triggered.
- The mountpoint is `/var/cache/support-knowledge`.
- The instance matches your `INSTANCE` value.
- The filesystem signal lines up with the slow trace time window.

If you use SignalFlow, the query shape is:

```text
data("system.filesystem.utilization",
  filter=filter("mountpoint", "/var/cache/support-knowledge")
    and filter("service.instance.id", "<INSTANCE>")
    and filter("deployment.environment", "demo")
).max().publish()
```

## Evidence Statement

Write a short evidence statement before moving to MCP evidence and cleanup:

```text
The support response journey is degraded for <INSTANCE>. RUM shows slow /api/support/respond requests. APM traces show the slow path reaches support-knowledge. Infrastructure metrics show system.filesystem.utilization rising for /var/cache/support-knowledge on the same instance. The root cause is cache filesystem pressure, not a full portal outage.
```

{{% notice title="Checkpoint" style="green" icon="running" %}}

Do not move on until you can point to one RUM signal, one slow trace, and one filesystem metric that all describe the same incident window.

{{% /notice %}}
