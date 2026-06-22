---
title: "Appendix: Remediation Spans"
linkTitle: "Appendix: Remediation Spans"
weight: 99
archetype: chapter
time: 20 minutes
description: Optional Splunk span inspection for the cleanup workflow.
aliases:
  - /ninja-workshops/ai/16-support-portal-remediation-agent/6-observe-agent/
---

This appendix is optional. Use it only after the infrastructure troubleshooting path is complete. The core workshop is RUM, APM, Infrastructure, MCP evidence, and validated cleanup.

## Inspect Splunk Spans

After approval, open Splunk APM and inspect traces for:

- `remediation-orchestrator`
- `remediation-agent`

Look for route or span names such as:

- `remediation.agent_evaluate`
- `remediation.evaluate`
- `remediation.execute_action`
- `remediation.verify_action`
- `remediation.verify_recovery`

Expected attributes include:

```text
action.type=clean_claims_knowledge_cache
action.target=claims-knowledge-cache
app.business_transaction=remediation_decision
```

## Discussion

Answer this before finishing the appendix:

```text
What evidence would you need before allowing this cleanup action to run automatically in a lower environment?
```

Expected themes:

- Clear customer impact.
- Slow trace evidence.
- Cache filesystem pressure on the specific mountpoint.
- Limited tool permissions.
- Deterministic policy.
- Human approval for production.
- Verified recovery.
- Audit trail for proposed, approved, executed, and validated steps.
