---
title: Lab Overview
linkTitle: 1. Lab Overview
weight: 1
archetype: chapter
time: 15 minutes
description: Understand the support portal, filesystem incident, service topology, and evidence path.
aliases:
  - /ninja-workshops/infrastructure/16-support-portal-infrastructure-troubleshooting/1-lab-overview/
---

Connect customer impact to backend traces and infrastructure evidence. Find the root cause.

## Use Case

The lab application is a support portal from a support organization. During a winter storm, many customers are checking support requests, account status, and support articles at the same time. Users are complaining the submit support request button is slow and we will learn how to troubleshoot an application end to end.

The troubleshooting goal is:

1. Confirm browser impact in Splunk RUM.
2. Open slow traces in Splunk APM.
3. Identify `support-knowledge` as the slow service.
4. Confirm `/var/cache/support-knowledge` filesystem pressure in Infrastructure or Metric Finder.
5. Use Splunk MCP evidence collection to confirm the same signals programmatically.
6. Execute and validate the controlled cleanup workflow.

## Local Source Copy

The runnable app lives inside the full workshop repository. Standard workshop instructions assume you clone the repository, then run app commands from the app directory:

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

- Splunk RUM for browser sessions and slow network requests.
- Splunk APM for service latency, request count, errors, trace waterfall, and service map context.
- Splunk OpenTelemetry Collector host metrics for filesystem utilization.
- Splunk MCP tools for evidence discovery and structured confirmation.
- Cleanup workflow spans for auditability after the root cause has been proven.
