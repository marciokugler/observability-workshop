---
title: Support Portal Infrastructure Troubleshooting
linkTitle: Support Portal Infrastructure Troubleshooting
weight: 16
layout: chapter
time: 2 hours
authors: ["Marcio Kugler Rodrigues"]
description: Monitor a specific cache filesystem, use Splunk RUM, APM, Infrastructure, and MCP evidence, and resolve a slow support portal transaction.
draft: false
hidden: false
product: "Observability Cloud"
aliases:
  - /ninja-workshops/infrastructure/16-support-portal-infrastructure-troubleshooting/
---

In this workshop, you will troubleshoot a realistic infrastructure failure that starts as a customer experience problem. One transaction slows down, but the application is not fully down. Your job is to follow the evidence from Splunk RUM to APM traces, then to infrastructure metrics that identify the root cause.

## Workshop Overview

In this hands-on session, you will:

- **Understand the Lab** - Review the support portal, service topology, filesystem failure, and evidence path.
- **Install Required Software** - Install Docker and confirm the host can run Docker Compose.
- **Generate Splunk Lab Tokens** - Create the Splunk Observability Cloud tokens needed for collector ingest, MCP evidence, and browser RUM.
- **Configure Collector** - Build the Splunk OpenTelemetry Collector config from a minimal working file to the complete lab configuration, then start the lab stack.
- **Investigate Filesystem Pressure** - Trigger the incident and navigate from RUM to APM traces to infrastructure metrics.
- **Configure Splunk MCP Communication** - Configure and verify the local app's MCP path to Splunk Observability Cloud.
- **Use MCP Evidence and Resolve** - Gather Splunk evidence, compare it with the UI investigation, and execute a controlled cache cleanup.
