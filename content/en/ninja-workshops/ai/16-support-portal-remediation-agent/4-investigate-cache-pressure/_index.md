---
title: Investigate Cache Pressure
linkTitle: 4. Investigate Cache Pressure
weight: 4
archetype: chapter
time: 25 minutes
description: Trigger the cache-pressure incident, reproduce the degraded transaction, and validate the evidence in Splunk Observability Cloud.
---

Prove the incident with telemetry before approving any remediation action. Separate customer impact, service behavior, and infrastructure cause.

## Trigger the Incident

Use the portal or operator console button named `Trigger Cache Pressure`.

Expected result:

- The portal or operator console shows that cache pressure is active.
- `AI Claim Status` begins using the degraded path after the next browser request.

## Reproduce Customer Impact

In the claims portal:

1. Run `AI Claim Status`.
2. Run `Policy Coverage Lookup`.
3. Run `Claims FAQ Search`.

Expected result:

- `AI Claim Status` is slower or partially degraded.
- `Policy Coverage Lookup` and `Claims FAQ Search` remain healthier comparison journeys.
- The whole application is not down.

## Drive Degraded Traffic

Use browser traffic to create more telemetry points. The simulator clicks the portal journeys instead of calling backend APIs directly.

```bash
RUM_SIMULATOR_USERS=8 RUM_SIMULATOR_ROUNDS=8 RUM_SIMULATOR_BROWSERS=chromium RUM_SIMULATOR_CONCURRENCY=2 npm run simulate:rum
```

## Validate in Splunk

Filter by the student identity:

```text
service.instance.id=<INSTANCE>
deployment.environment=demo
lab.name=ciscolive26
lab.student.id=<INSTANCE>
```

Use these checks:

| Area | What to open | Expected evidence |
| --- | --- | --- |
| Digital Experience | RUM app `ibobs-claims-portal` | Portal activity and slower `/api/support/respond` requests when RUM is configured. |
| APM | `claims-knowledge` service | `service.request.duration.ns` increases for the claim status path. |
| APM traces | Slow `AI Claim Status` trace | Waterfall includes `claims-portal-api`, `claims-assistant`, and `claims-knowledge`. |
| Infrastructure | Host or container filesystem metrics filtered by `INSTANCE` | Filesystem utilization rises for `/var/cache/claims-knowledge`. |
| Business comparison | Policy Coverage and FAQ paths | Comparison journeys remain healthier than `AI Claim Status`. |

## Evidence Statement

Write a short evidence statement before moving to remediation:

```text
AI Claim Status is degraded for <INSTANCE>. APM shows elevated claims-knowledge duration, and infrastructure metrics show cache filesystem pressure for /var/cache/claims-knowledge. Policy Coverage Lookup and Claims FAQ Search remain healthier comparison journeys. The narrow recommended action is clean_claims_knowledge_cache.
```
