---
title: Workshop Wrap-up
linkTitle: 9. Workshop Wrap-up
weight: 9
archetype: chapter
time: 5 minutes
description: Review the infrastructure troubleshooting workflow and clean up local resources.
aliases:
  - /ninja-workshops/infrastructure/16-support-portal-infrastructure-troubleshooting/8-wrap-up/
---

You have completed the **Support Portal Infrastructure Troubleshooting** workshop.

You practiced how to:

- Run the local support portal and operator console.
- Add browser RUM with the standard frontend snippet.
- Enable backend APM auto instrumentation for the app services.
- Configure the Splunk OpenTelemetry Collector for host, container, and cache filesystem monitoring.
- Add one focused custom API gateway span after the default signals work.
- Use `INSTANCE` and `DEPLOYMENT_ENVIRONMENT` so each student can filter telemetry cleanly.
- Establish a healthy baseline across three customer journeys.
- Trigger a deterministic cache filesystem pressure incident.
- Navigate from Splunk RUM to slow APM traces.
- Identify `support-knowledge` as the slow service in the transaction path.
- Confirm `/var/cache/support-knowledge` pressure with infrastructure metrics.
- Configure MCP communication and collect the same evidence through Splunk MCP.
- Run a controlled `clean_support_knowledge_cache` cleanup.
- Validate recovery through the portal, operator console, and telemetry.

## Adoption Checklist

Before using this pattern with real teams, confirm:

| Area | Ready when |
| --- | --- |
| Customer impact | RUM identifies the affected journey and request. |
| Trace evidence | APM traces identify the slow service path. |
| Infrastructure proof | Host, container, or filesystem metrics identify the affected instance and mountpoint. |
| Identity strategy | `service.instance.id`, `host.name`, and environment attributes let responders isolate the right system. |
| MCP communication | Tool discovery and evidence calls work with the intended Splunk endpoint. |
| Action boundary | Cleanup actions have narrow targets and no broad production blast radius. |
| Policy | Confidence thresholds and approval requirements are deterministic. |
| Auditability | Proposed, approved, executed, and validated states are captured. |
| Measurement | The team tracks time to evidence, time to approval, recovery success, and failed proposals. |

## Key Takeaway

Infrastructure troubleshooting is strongest when customer impact, slow traces, and infrastructure metrics all point to the same root cause. In this lab, the root cause is not just "the app is slow"; it is filesystem pressure on `/var/cache/support-knowledge`.

## Cleanup

Stop the lab before leaving the workshop environment.

1. In the terminal running `docker compose up --wait`, press `Ctrl+C`.
2. In any terminal running browser traffic, press `Ctrl+C`.
3. Close the support portal and operator console browser tabs.

From the app directory:

```bash
cd observability-workshop/workshop/support-portal
```

If you used the ZIP download, use:

```bash
cd observability-workshop-main/workshop/support-portal
```

Stop any collector containers left by Docker Compose:

```bash
docker compose down
```

Load the lab environment file:

```bash
set -a
```

```bash
source .env
```

```bash
set +a
```

Remove the local cache-pressure data:

```bash
rm -rf "$SUPPORT_KNOWLEDGE_CACHE_DIR"
```

Optional storage cleanup:

```bash
docker compose down --volumes --remove-orphans
```
