---
title: Govern Remediation
linkTitle: 5. Govern Remediation
weight: 5
archetype: chapter
time: 25 minutes
description: Gather evidence in the operator console, evaluate policy, approve the controlled action, and validate recovery.
---

Keep model reasoning, deterministic policy, approval, execution, and validation separate before allowing a state-changing remediation.

## Gather Evidence

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
- Suspect service is `claims-knowledge`.
- Affected transaction is `claim_status_response`.
- Customer impact points to `/api/support/respond`.
- Backend impact shows elevated `claims-knowledge` latency.
- Infrastructure impact shows cache filesystem utilization above threshold.
- Confidence is high only when latency and cache pressure are both confirmed.
- Proposed action is `clean_claims_knowledge_cache`.
- Policy mode is `approval_required`.

## Review Policy

Before approving, answer:

| Question | Expected answer |
| --- | --- |
| What resource changes? | The lab cache-pressure scenario for `claims-knowledge`. |
| What action runs? | `clean_claims_knowledge_cache`. |
| Is the action limited to the lab scenario? | Yes, it targets only the lab cache cleanup. |
| Is there a validation plan? | Yes, rerun `AI Claim Status` and check scenario state plus telemetry. |
| Is human approval required? | Yes, for the state-changing remediation path. |

{{% notice title="Governance Rule" style="warning" %}}
The model can recommend an action, but deterministic policy and human approval decide what is allowed to execute.
{{% /notice %}}

## Approve and Execute

Approve the action in the operator console when:

- The evidence supports cache filesystem pressure.
- Policy mode allows approval.
- The proposed action is `clean_claims_knowledge_cache`.
- You can validate recovery after execution.

Expected result:

- The remediation agent executes the cleanup path.
- The scenario controller returns the scenario to healthy.
- The operator console updates the validation state.

## Validate Recovery

Validate from the browser first:

1. Confirm the operator console shows the scenario returned to healthy.
2. In the claims portal, run `AI Claim Status`.
3. Run `Policy Coverage Lookup`.
4. Run `Claims FAQ Search`.

Then generate fresh customer browser traffic:

```bash
RUM_SIMULATOR_USERS=4 RUM_SIMULATOR_ROUNDS=4 RUM_SIMULATOR_BROWSERS=chromium RUM_SIMULATOR_CONCURRENCY=2 npm run simulate:rum
```

Then validate:

- The portal and operator console show the scenario is healthy.
- `AI Claim Status` latency improves.
- Operator console validation status is `validated`.
- Filesystem utilization drops or stops rising.
- Comparison journeys remain healthy.

Remediation is complete only when the customer journey and telemetry recover, not when a command returns successfully.
