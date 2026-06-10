---
title: Workshop Wrap-up
linkTitle: 7. Workshop Wrap-up
weight: 7
archetype: chapter
time: 5 minutes
description: Review the support portal remediation workflow and identify next adoption steps.
---

You have completed the **Support Portal Remediation Agent** workshop.

You practiced how to:

- Run the local AI support portal and operator console.
- Establish a healthy baseline across three customer journeys.
- Trigger a deterministic `cache-disk-pressure` incident.
- Prove the incident with browser, APM, and filesystem evidence.
- Build a structured remediation evidence package.
- Keep model reasoning, deterministic policy, approval, execution, and validation separate.
- Approve the controlled `clean_claims_knowledge_cache` action.
- Validate recovery through the portal, operator console, and telemetry.

## Adoption Checklist

Before using this pattern with real teams, confirm:

| Area | Ready when |
| --- | --- |
| Evidence quality | Customer impact, service path, and infrastructure cause can be validated independently. |
| Ownership | The affected service and approval owner are clear. |
| Action boundary | The remediation action has a narrow target and no broad production blast radius. |
| Policy | Confidence thresholds and approval requirements are deterministic. |
| Auditability | Proposed, approved, executed, and validated states are captured. |
| Rollback | A responder knows how to stop or reverse the action path. |
| Measurement | The team tracks time to evidence, time to approval, recovery success, and failed proposals. |

## Key Takeaway

AI-assisted remediation is useful only when the organization can trust the evidence, inspect the agent, control execution, and prove recovery.

## Cleanup

Stop the lab before leaving the workshop environment.

1. In the terminal running `npm run dev`, press `Ctrl+C`.
2. In the terminal running `npm run dev:collector`, press `Ctrl+C`.
3. In any terminal running browser traffic, press `Ctrl+C`.
4. Close the claims portal and operator console browser tabs.

From the app directory:

```bash
cd observability-workshop/workshop/support-portal-remediation-agent
```

If you used the ZIP download, use:

```bash
cd observability-workshop-main/workshop/support-portal-remediation-agent
```

Stop any collector containers left by Docker Compose:

```bash
docker compose --env-file .env -f infra/docker/docker-compose.yml down
```

Load the lab environment file:

```bash
set -a
```

```bash
source .env
```

```bash
set +a
```

Remove the local cache-pressure data:

```bash
rm -rf "$CLAIMS_KNOWLEDGE_CACHE_DIR"
```

Optional storage cleanup:

```bash
rm -rf apps/remediation-agent/.venv
```

```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules
```
