---
title: Investigate Filesystem Pressure
linkTitle: 4. Investigate Filesystem Pressure
weight: 4
archetype: chapter
time: 30 minutes
description: Trigger the cache filesystem incident and prove the root cause from RUM, APM traces, and Infrastructure metrics.
aliases:
  - /ninja-workshops/ai/16-support-portal-remediation-agent/4-investigate-cache-pressure/
---

Prove the incident with telemetry. Separate customer impact, service behavior, and infrastructure cause.

## Trigger the Incident

Use the portal or operator console button named `Trigger Cache Pressure`.

Expected result:

- The portal or operator console shows that cache pressure is active.
- The next browser request to `AI Claim Status` starts using the degraded path.
- The comparison journeys remain available.

## Reproduce Customer Impact

In the claims portal:

1. Run `AI Claim Status`.
2. Run `Policy Coverage Lookup`.
3. Run `Claims FAQ Search`.

Expected result:

- `AI Claim Status` is slower or partially degraded.
- `Policy Coverage Lookup` and `Claims FAQ Search` remain healthier comparison journeys.
- The whole application is not down.

## Drive Degraded Browser Traffic

Use browser traffic to create more RUM and APM data points. The simulator clicks the portal journeys instead of calling backend APIs directly.

```bash
RUM_SIMULATOR_USERS=8 RUM_SIMULATOR_ROUNDS=8 RUM_SIMULATOR_BROWSERS=chromium RUM_SIMULATOR_CONCURRENCY=2 npm run simulate:rum
```

## Start in Splunk RUM

Open Splunk Observability Cloud and start with the customer experience.

1. Go to **Digital Experience**.
2. Open the RUM application named `ibobs-claims-portal`.
3. Set the time range to the last 15 minutes.
4. Open network requests or page activity for the claims portal.
5. Find the slow request for `/api/support/respond`.

What you are proving:

- The customer-facing portal is receiving traffic.
- The slow path starts at a browser journey, not a synthetic backend call.
- The affected request is the claim status support path.

Use these filters when available:

```text
deployment.environment=demo
service.instance.id=<INSTANCE>
lab.name=ciscolive26
lab.student.id=<INSTANCE>
```

## Open the Slow Trace

From the slow RUM request, open the linked trace or trace waterfall when available. If the direct link is not available, copy the trace ID from RUM and search for it in APM Trace Analyzer.

In the trace waterfall, follow the service path:

```text
browser -> claims-portal-api -> claims-assistant -> claims-knowledge
```

Expected trace evidence:

- The request route is related to `/api/support/respond`.
- `claims-knowledge` is the slow backend service.
- The delay is concentrated in the claim status path.
- The comparison journeys are not showing the same degradation pattern.

## Confirm the Affected Service in APM

Open Splunk APM and inspect `claims-knowledge`.

Use the same time range and student filters:

```text
deployment.environment=demo
service.instance.id=<INSTANCE>
```

Confirm:

- Service latency increased after cache pressure was triggered.
- Request count exists for the degraded window.
- Error rate is not the primary signal.
- The service map connects the portal path to `claims-knowledge`.

The APM conclusion should be narrow:

```text
The slow customer journey reaches claims-knowledge, and claims-knowledge latency is elevated for this student instance.
```

## Confirm the Filesystem Root Cause

Now move from APM to Infrastructure or Metric Finder.

Search for:

```text
system.filesystem.utilization
```

Filter to:

```text
mountpoint=/var/cache/claims-knowledge
service.instance.id=<INSTANCE>
deployment.environment=demo
```

Expected infrastructure evidence:

- Filesystem utilization rises after the scenario is triggered.
- The mountpoint is `/var/cache/claims-knowledge`.
- The instance matches your `INSTANCE` value.
- The filesystem signal lines up with the slow trace time window.

If you use SignalFlow, the query shape is:

```text
data("system.filesystem.utilization",
  filter=filter("mountpoint", "/var/cache/claims-knowledge")
    and filter("service.instance.id", "<INSTANCE>")
    and filter("deployment.environment", "demo")
).max().publish()
```

## Evidence Statement

Write a short evidence statement before moving to MCP evidence and cleanup:

```text
The claim status support journey is degraded for <INSTANCE>. RUM shows slow /api/support/respond requests. APM traces show the slow path reaches claims-knowledge. Infrastructure metrics show system.filesystem.utilization rising for /var/cache/claims-knowledge on the same instance. The root cause is cache filesystem pressure, not a full portal outage.
```

{{% notice title="Checkpoint" style="green" icon="running" %}}

Do not move on until you can point to one RUM signal, one slow trace, and one filesystem metric that all describe the same incident window.

{{% /notice %}}
