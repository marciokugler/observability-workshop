---
title: Use MCP Evidence and Resolve
linkTitle: 7. MCP Evidence and Resolve
weight: 7
archetype: chapter
time: 25 minutes
description: Gather MCP evidence, compare it to the manual Splunk UI investigation, run the controlled cleanup, and validate recovery.
aliases:
  - /ninja-workshops/infrastructure/16-support-portal-infrastructure-troubleshooting/5-govern-remediation/
---

Use MCP after you have manually followed the incident in Splunk and configured MCP communication. The goal is to show how the same observability evidence can be collected programmatically and used to support a controlled infrastructure cleanup workflow.

## Gather MCP Evidence

Open the operator console:

```text
http://127.0.0.1:18081
```

Use the primary path:

1. Leave `Evidence Intake` blank.
2. Click `Gather MCP Evidence`.
3. Click `Explain`.
4. Click `Propose`.
5. Review the evidence, policy, proposal, and validation panels.

Expected evidence package:

- Source is Splunk MCP when configured.
- Suspect service is `support-knowledge`.
- Affected transaction is `support_response`.
- Customer impact points to `/api/support/respond`.
- Backend impact shows elevated `support-knowledge` latency.
- Infrastructure impact shows cache filesystem utilization above threshold.
- Confidence is high only when latency and cache pressure are both confirmed.
- Proposed action is `clean_support_knowledge_cache`.
- Policy mode is `approval_required`.

## Compare MCP Evidence to the UI Investigation

Map the operator console output back to the Splunk UI:

| Evidence in console | Where students already proved it |
| --- | --- |
| Customer impact on `/api/support/respond` | Splunk RUM network request or page activity. |
| `support-knowledge` suspect service | APM trace waterfall and service view. |
| Elevated latency | APM service latency and slow trace duration. |
| Cache filesystem pressure | Infrastructure or Metric Finder for `system.filesystem.utilization`. |
| High confidence | Both service latency and filesystem pressure are confirmed in the same incident window. |

This comparison is the key learning point. MCP is not replacing the Splunk UI investigation. It is a way to collect the same observability evidence through a AI tool interface.

## Review the Cleanup Policy

Before approving, answer:

| Question | Expected answer |
| --- | --- |
| What resource changes? | The lab cache-pressure scenario for `support-knowledge`. |
| What action runs? | `clean_support_knowledge_cache`. |
| Is the action limited to the lab scenario? | Yes, it targets only the lab cache cleanup. |
| Is there a validation plan? | Yes, rerun the support response journey and check scenario state plus telemetry. |
| Is human approval required? | Yes, for the state-changing cleanup path. |

{{% notice title="Control Rule" style="warning" %}}
MCP provides evidence. Deterministic policy and human approval decide whether the local cleanup action is allowed to execute.
{{% /notice %}}

## Approve and Execute

Approve the action in the operator console when:

- RUM confirms customer impact.
- APM confirms the slow `support-knowledge` path.
- Infrastructure metrics confirm `/var/cache/support-knowledge` pressure.
- MCP evidence agrees with the manual investigation.
- Policy mode allows approval.
- The proposed action is `clean_support_knowledge_cache`.

Expected result:

- The cleanup worker executes the cache cleanup path.
- The scenario controller returns the scenario to healthy.
- The operator console updates the validation state.

## Validate Recovery

Validate from the browser first:

1. Confirm the operator console shows the scenario returned to healthy.
2. In the support portal, run `AI Support Response`.
3. Run `Account Status Lookup`.
4. Run `Help Article Search`.
