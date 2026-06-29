---
title: Support Portal Infrastructure Troubleshooting
linkTitle: Support Portal Infrastructure Troubleshooting
weight: 16
layout: chapter
time: 2 hours
authors: ["Marcio Kugler Rodrigues"]
description: Instrument a clean support portal with Splunk RUM, APM, and infrastructure monitoring, then use the correlated evidence to resolve a slow transaction.
draft: false
hidden: false
product: "Observability Cloud"
aliases:
  - /ninja-workshops/infrastructure/16-support-portal-infrastructure-troubleshooting/
---

In this workshop, you will start from a clean support portal and add the standard observability path in the order used for real services: browser RUM, backend APM auto instrumentation, and infrastructure monitoring. After those out-of-the-box signals work, you will add one focused API gateway span, trigger a realistic cache filesystem incident, and follow the evidence from Splunk RUM to APM traces and infrastructure metrics.

## Workshop Overview

In this hands-on session, you will:

- **Understand the Lab** - Review the support portal, service topology, filesystem failure, and evidence path.
- **Install Required Software** - Install Docker and confirm the host can run Docker Compose.
- **Generate Splunk Lab Tokens** - Create the Splunk Observability Cloud tokens needed for collector ingest, MCP evidence, and browser RUM.
- **Configure Monitoring** - Add browser RUM, backend APM auto instrumentation, host and container infrastructure monitoring, and one focused gateway span.
- **Investigate Filesystem Pressure** - Trigger the incident and navigate from RUM to APM traces to infrastructure metrics.
- **Configure Splunk MCP Communication** - Configure and verify the local app's MCP path to Splunk Observability Cloud.
- **Use MCP Evidence and Resolve** - Gather Splunk evidence, compare it with the UI investigation, and execute a controlled cache cleanup.
