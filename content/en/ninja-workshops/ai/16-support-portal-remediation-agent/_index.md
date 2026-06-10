---
title: Support Portal Remediation Agent
linkTitle: Support Portal Remediation Agent
weight: 16
layout: chapter
time: 2 hours
authors: ["Marcio Kugler Rodrigues"]
description: Run an AI support portal incident, gather Splunk Observability evidence, and approve a controlled remediation agent action with validation and auditability.
draft: false
hidden: false
product: "Observability Cloud"
---

Customer-facing AI workflows need observability that starts with the digital experience and ends with a governed action. In this workshop, you will run an AI claims support portal, trigger a deterministic cache-pressure incident, gather evidence from Splunk Observability Cloud, and approve a narrow remediation action through a human-in-the-loop operator console.

The runnable lab app is included in this repository at `workshop/support-portal-remediation-agent`.

## Workshop Overview

In this hands-on session, you will cover:

- **Lab Overview** - Understand the support portal, operator console, service topology, and governed remediation path.
- **Install Required Software** - Install local prerequisites, configure credentials, student identity, and port checks.
- **Run the Lab Stack** - Start the collector and app services, then create a healthy baseline.
- **Investigate Cache Pressure** - Trigger the `cache-disk-pressure` scenario and validate customer, APM, and infrastructure evidence.
- **Govern Remediation** - Gather evidence, explain the incident, propose `clean_claims_knowledge_cache`, approve execution, and validate recovery.
- **Troubleshoot the Lab** - Recover from common workshop-day failures without changing the story.
- **Appendix: Galileo** - Optional agent monitoring showcase and experiments.

{{% notice title="Workshop Scope" style="info" %}}
This workshop demonstrates a separate remediation workflow that uses Splunk Observability Cloud as the evidence and investigation layer. It does not imply that Splunk directly invokes arbitrary external actions. The action is policy-checked, operator-approved, limited to the lab cache-cleanup scenario, and validated after execution.
{{% /notice %}}

## Incident Flow

```mermaid
flowchart LR
    Baseline["Healthy support journeys"] --> Trigger["Trigger cache pressure"]
    Trigger --> Impact["AI Claim Status slows"]
    Impact --> Evidence["Gather Splunk evidence"]
    Evidence --> Policy["Apply policy and confidence checks"]
    Policy --> Proposal["Propose clean_claims_knowledge_cache"]
    Proposal --> Approval["Operator approval"]
    Approval --> Execute["Remediation agent executes"]
    Execute --> Validate["Validate portal and telemetry recovery"]
```

## What You Need

- Node.js 22 and npm.
- Python 3.11 or newer.
- Docker Desktop or another Docker daemon if you want the local Splunk OpenTelemetry Collector or Docker Compose flow.
- A Splunk Observability Cloud organization and access token for live telemetry export.
- A browser RUM token if you want frontend RUM evidence.
- Optional OpenAI credentials for model-backed remediation.
- A unique `INSTANCE` value for each student when sharing one Splunk Observability Cloud organization.

You can run the local app without credentials. Missing Splunk or OpenAI credentials reduce the live evidence and model-backed paths, but the browser-driven lab flow still runs.
