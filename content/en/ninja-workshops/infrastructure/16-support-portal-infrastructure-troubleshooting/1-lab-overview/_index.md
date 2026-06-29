---
title: Lab Overview
linkTitle: 1. Lab Overview
weight: 1
archetype: chapter
time: 15 minutes
description: Understand the support portal, monitoring path, filesystem incident, service topology, and evidence path.
aliases:
  - /ninja-workshops/infrastructure/16-support-portal-infrastructure-troubleshooting/1-lab-overview/
---

Connect customer impact to backend traces and infrastructure evidence. Find the root cause with the standard Splunk signals first.

## Use Case

The lab application is a simple support portal. During a peak usage, many customers are checking support requests, account status, and support articles at the same time. Users are complaining the submit support request button is slow and we will learn how to troubleshoot the application end to end.

The setup goal is intentionally simple:

1. Add Splunk RUM to the frontend with the browser snippet.
2. Add Splunk APM to every backend service with auto instrumentation.
3. Add infrastructure monitoring for the host, lab containers, and the bounded cache filesystem.
4. Add one custom API gateway span.

## Local Source Copy

The runnable app lives inside the full workshop repository. Follow the standard workshop instructions or clone the repository if needed, then commands from the app directory:

```bash
git clone https://github.com/marciokugler/observability-workshop.git
```

```bash
cd observability-workshop
```

```bash
cd workshop/support-portal
```

Run all app commands from `workshop/support-portal`.

## App Components

| Component | Purpose |
| --- | --- |
| `apps/frontend` | Customer-facing support portal. |
| `apps/operator-console` | Evidence, MCP, policy, approval, and validation console. |
| `apps/api-gateway` | Main backend entry point for the portal. |
| `apps/assistant-service` | Support response workflow. |
| `apps/case-service` | Account status lookup workflow. |
| `apps/knowledge-service` | Knowledge search and controlled cache-pressure source. |
| `apps/scenario-controller` | Deterministic incident trigger and reset service. |
| `apps/remediation-orchestrator` | Evidence intake, MCP enrichment, policy, proposal, approval, and validation coordinator. |
| `apps/remediation-agent` | Python cleanup worker with a limited toolset for the lab cache action. |

## Observability Signals

- Splunk RUM for browser sessions, page activity, and slow network requests.
- Splunk APM auto instrumentation for service latency, request count, errors, trace waterfall, and service map context.
- Splunk OpenTelemetry Collector host and container metrics for infrastructure context.
- Standard filesystem metrics for `/var/cache/support-knowledge`.
- Splunk MCP tools for evidence discovery and structured confirmation.
- Cleanup workflow spans for auditability after the root cause has been proven.
