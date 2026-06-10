---
title: Lab Overview
linkTitle: 1. Lab Overview
weight: 1
archetype: chapter
time: 15 minutes
description: Understand the AI support portal, deterministic incident, service topology, and governed remediation path.
---

Connect customer impact to backend evidence, then decide whether the controlled cache-cleanup action is safe to approve.

## Use Case

The lab application is an AI claims support portal. A customer uses it to check claim status, look up policy coverage, or search support articles. During the incident, the cache volume used by the knowledge service fills up. The `AI Claim Status` journey slows down because it depends on that service, while `Policy Coverage Lookup` and `Claims FAQ Search` stay available as comparison journeys.

The goal is not full autonomous remediation. The goal is a governed workflow:

1. Detect customer impact.
2. Validate the affected service path.
3. Prove cache filesystem pressure with standard infrastructure metrics.
4. Build an evidence package.
5. Apply deterministic policy.
6. Require approval for the state-changing action.
7. Validate recovery after execution.

## Local Source Copy

The runnable app lives inside the full workshop repository. Standard workshop instructions assume you clone the repository, then run app commands from the app directory:

```bash
git clone https://github.com/marciokugler/observability-workshop.git
cd observability-workshop
cd workshop/support-portal-remediation-agent
```

If Git is not available, download the repository ZIP instead:

```bash
curl -L https://github.com/marciokugler/observability-workshop/archive/refs/heads/main.zip -o observability-workshop.zip
unzip observability-workshop.zip
cd observability-workshop-main/workshop/support-portal-remediation-agent
```

Run all app commands from `workshop/support-portal-remediation-agent` unless a step says otherwise.

## App Components

| Component | Purpose |
| --- | --- |
| `apps/frontend` | Customer-facing AI claims portal. |
| `apps/operator-console` | Presenter and operator console for evidence, policy, approval, and validation. |
| `apps/api-gateway` | Main backend entry point for the portal. |
| `apps/assistant-service` | Claim status workflow. |
| `apps/case-service` | Policy coverage lookup workflow. |
| `apps/knowledge-service` | Knowledge search and controlled cache-pressure source. |
| `apps/scenario-controller` | Deterministic incident trigger and reset service. |
| `apps/remediation-orchestrator` | Evidence intake, enrichment, policy, proposal, approval, and validation coordinator. |
| `apps/remediation-agent` | Python remediation agent with a limited toolset and model-backed action selection. |

## Observability Signals

The primary story uses default Splunk Observability signals:

- Splunk RUM and browser spans for the portal journey.
- Splunk APM service metrics for latency, count, and errors.
- Splunk OpenTelemetry Collector host metrics for filesystem utilization.
- Remediation orchestrator and remediation agent spans for action auditability.

{{% notice title="Key Rule" style="info" %}}
Do not make logs or custom demo metrics the required proof path. Use browser experience, APM service health, and host filesystem metrics as the main evidence chain.
{{% /notice %}}
