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
- **Install Required Software** - Install local prerequisites, configure Splunk credentials, student identity, RUM, and MCP settings.
- **Run the Lab Stack** - Start the Splunk OpenTelemetry Collector and app services, then create a healthy baseline.
- **Investigate Filesystem Pressure** - Trigger the incident and navigate from RUM to APM traces to infrastructure metrics.
- **Use MCP Evidence and Resolve** - Configure the app as an MCP client, gather Splunk evidence, compare it with the UI investigation, and execute a controlled cache cleanup.

