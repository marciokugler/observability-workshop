---
title: "Appendix: Optional Agent Monitoring"
linkTitle: "Appendix: Agent Monitoring"
weight: 99
archetype: chapter
time: 20 minutes
description: Optional Galileo showcase and experiments for the cleanup workflow.
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
agent.monitoring.provider=galileo
```

The last attribute appears when Galileo is configured.

## Run the Galileo Showcase

Use this path when Galileo credentials are configured:

```bash
cd observability-workshop/workshop/support-portal-remediation-agent
```

```bash
npm run simulate:galileo
```

If you used the ZIP download, use:

```bash
cd observability-workshop-main/workshop/support-portal-remediation-agent
```

You can also run it from the operator console by selecting `Run Showcase` in the Galileo Agent Monitoring area.

In Galileo:

1. Open project `ciscolive26`.
2. Open log stream `remediation-agent`.
3. Group by sessions.
4. Open the newest session for the claim status incident.

Walk through these traces:

| Trace | What to inspect |
| --- | --- |
| `showcase.incident_intake` | Affected journey and customer impact. |
| `showcase.retrieve_observability_context` | RUM, APM, infrastructure, and operator-note sources. |
| `showcase.triage_agent` | Separation of trusted observability evidence from untrusted notes. |
| `showcase.hypothesis_agent` | Comparison of cache pressure, provider latency, dependency, and restart hypotheses. |
| `showcase.guardrail_pre_action_check` | Unsafe restart instruction and fake PII are blocked. |
| `showcase.action_planning_agent` | Selected controlled action is `clean_claims_knowledge_cache`. |
| `showcase.human_approval` | Approval is captured as part of the workflow. |
| `showcase.execute_remediation` | Cleanup tool execution. |
| `showcase.verify_recovery` | Validation latency and healthy scenario state. |
| `showcase.postmortem_agent` | Audit summary and governance highlights. |

## Run Galileo Experiments

The app includes deterministic experiment harnesses for evidence handoff and tool-flow edge cases.

MCP evidence handoff:

```bash
npm run experiment:galileo:mcp
```

Tool and approval flow:

```bash
npm run experiment:galileo:tools
```

All experiment suites:

```bash
npm run experiment:galileo:all
```

Use these rows in a demo:

| Row | Why it matters |
| --- | --- |
| `mcp-complete-cache-pressure` | MCP confirms cache pressure and elevated latency. |
| `mcp-tools-list-failed` | Evidence tools are unavailable and policy should degrade confidence. |
| `mcp-cache-signalflow-empty` | Latency exists but cache pressure is not confirmed. |
| `clean-cache-executes-and-validates` | Approval, execution, and validation succeed. |
| `remediation-agent-execute-fails` | Execution fails and verification is skipped. |
| `recommend-only-blocks-approval` | Low-confidence policy blocks execution. |

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
