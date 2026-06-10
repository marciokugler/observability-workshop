---
title: 1. Check Alert Prerequisites
weight: 1
---

The AI troubleshooting agent runs from the alert experience. Start by choosing an alert with clear ownership, a known affected service or Kubernetes object, and enough telemetry for an evidence-based investigation.

{{% notice title="Exercise" style="green" icon="running" %}}

* Navigate to **Alerts & Detectors** and open **Active Alerts**.
* Find an alert that comes from one of these domains:
  * A Splunk APM service detector.
  * A Kubernetes detector in Infrastructure Monitoring.
* Prefer standard APM or Kubernetes detector signals for this lab because they make the evidence path easier to follow.
* Record the following in your incident notes:

| Field | Value |
|-------|-------|
| Alert name | |
| Detector name | |
| Domain | `APM service` or `Kubernetes Infrastructure Monitoring` |
| Service, workload, pod, node, or cluster | |
| Environment | |
| Alert start time | |

{{< tabs >}}
{{% tab title="Question" %}}
**Why is a custom metric detector a weaker fit for this workshop?**
{{% /tab %}}
{{% tab title="Answer" %}}
**A custom metric can alert correctly but may not carry the same service, workload, trace, log, and Kubernetes context students need for the evidence review.**
{{% /tab %}}
{{< /tabs >}}

{{% /notice %}}

{{% notice title="Instructor Note" style="info" %}}
If the organization does not have an active supported alert, use a pre-captured alert for the investigation chapters and run the remediation discussion as a tabletop exercise. Do not lower production detector thresholds just to create an alert.
{{% /notice %}}
