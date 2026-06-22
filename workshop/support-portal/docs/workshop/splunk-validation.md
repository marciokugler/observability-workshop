# Splunk Validation

Use this page after the stack is running and before a live workshop rehearsal. The goal is to prove that Splunk Observability Cloud shows the same story the operator console uses for remediation.

## Preconditions

Set these values in `.env` before starting the stack:

```dotenv
INSTANCE=student-001
DEPLOYMENT_ENVIRONMENT=demo
SPLUNK_REALM=us1
SPLUNK_ACCESS_TOKEN=...
VITE_SPLUNK_RUM_TOKEN=...
```

Use a unique `INSTANCE` per student. In Splunk, filter by:

- `service.instance.id=<INSTANCE>`
- `deployment.environment=demo`
- `lab.name=support-portal`
- `lab.student.id=<INSTANCE>`

The frontend RUM application name is `support-portal`.

## 1. Confirm local services

Check the local endpoints that have health or deterministic state routes:

```bash
curl -s http://127.0.0.1:18100/api/health
curl -s http://127.0.0.1:18104/scenario/state
curl -s http://127.0.0.1:18110/remediation/health
curl -s http://127.0.0.1:18800/agent/health
```

Open:

- support portal: `http://127.0.0.1:18080`
- operator console: `http://127.0.0.1:18081`
- workshop docs: `http://127.0.0.1:18082`

## 2. Generate a healthy baseline

Run balanced backend traffic long enough for APM service metrics:

```bash
SIMULATOR_SCENARIO=healthy SIMULATOR_DURATION_SECONDS=300 SIMULATOR_INTERVAL_MS=750 SIMULATOR_MIX=balanced docker compose run --rm traffic-simulator
```

Generate browser traffic when RUM is configured:

```bash
RUM_SIMULATOR_USERS=3 RUM_SIMULATOR_ROUNDS=4 RUM_SIMULATOR_BROWSERS=chromium docker compose run --rm rum-simulator
```

In Splunk APM, confirm these services appear:

- `support-portal-api`
- `support-assistant`
- `support-knowledge`
- `support-case-service`
- `scenario-controller`
- `remediation-orchestrator`
- `remediation-agent`

In Digital Experience, confirm RUM activity for `support-portal`.

## 3. Verify baseline Splunk signals

In APM, verify the three business transactions are visible through spans and service activity:

| Journey | API route | Attribute |
| --- | --- | --- |
| AI Support Response | `/api/support/respond` | `app.business_transaction=support_response` |
| Account Status Lookup | `/api/cases/:caseId` | `app.business_transaction=account_status_lookup` |
| Help Article Search | `/api/articles/search` | `app.business_transaction=help_article_search` |

In Metric Finder or dashboards, check:

- `service.request.duration.ns` for `support-knowledge`
- `service.request` for request volume
- `system.filesystem.utilization` for `/var/cache/support-knowledge`
- `system.filesystem.usage` for `/var/cache/support-knowledge`

Expected baseline:

- all three journeys return successful responses
- `support-knowledge` latency is normal
- cache filesystem utilization is below the detector threshold
- RUM page and network activity exist for the portal if `VITE_SPLUNK_RUM_TOKEN` is set

## 4. Trigger the cache-pressure incident

Use the operator console or portal `Trigger Cache Pressure` button, or run:

```bash
curl -X POST http://127.0.0.1:18104/scenario/activate/cache-disk-pressure
```

Drive degraded support-response traffic:

```bash
SIMULATOR_SCENARIO=current SIMULATOR_DURATION_SECONDS=300 SIMULATOR_INTERVAL_MS=750 SIMULATOR_MIX=support-heavy docker compose run --rm traffic-simulator
```

Keep comparison traffic visible:

```bash
SIMULATOR_SCENARIO=current SIMULATOR_DURATION_SECONDS=180 SIMULATOR_INTERVAL_MS=1000 SIMULATOR_MIX=balanced docker compose run --rm traffic-simulator
```

## 5. Validate the incident in Splunk

In Splunk, prove the incident with these checks:

| Area | What to open | Expected evidence |
| --- | --- | --- |
| Digital Experience | `support-portal` pages and network requests | `/api/support/respond` is slower or shows degraded user activity |
| APM | `support-knowledge` service | `service.request.duration.ns` increases for the support response path |
| APM traces | a slow AI Support Response trace | waterfall includes `support-portal-api`, `support-assistant`, and `support-knowledge` |
| Infrastructure | host or container metrics filtered by `service.instance.id` | `system.filesystem.utilization` rises for `/var/cache/support-knowledge` |
| Business comparison | Account Status and Help Article paths | comparison journeys remain healthier than AI Support Response |

Do not use logs as the required proof path. Logs are optional supporting context only.

## 6. Validate Splunk MCP evidence intake

Open the operator console:

1. Leave optional operator notes blank.
2. Click `Gather MCP Evidence`.
3. Click `Explain`.
4. Click `Propose`.

Expected evidence package:

- source is `splunk_mcp`
- suspect service is `support-knowledge`
- affected transaction is `support_response`
- customer impact shows the RUM/network endpoint `POST /api/support/respond` as slow
- backend impact shows `support-knowledge` p95 latency above threshold and no apparent APM error spike
- infrastructure impact shows cache filesystem utilization for `/var/cache/support-knowledge` above threshold
- impact chain connects `POST /api/support/respond` to `support-portal-api`, `support-assistant`, `support-knowledge`, and cache filesystem pressure
- confidence is `high` when both latency and cache pressure are confirmed
- proposed action is `clean_support_knowledge_cache`
- policy mode is `approval_required`

If MCP cannot reach Splunk, the policy should fall back to lower confidence or recommendation-only handling until signals are verified.

## 7. Validate remediation spans

Approve the proposed action from the operator console.

In Splunk APM, open `remediation-orchestrator` and `remediation-agent` traces. Confirm these spans or route-level operations appear:

- `remediation.agent_evaluate`
- `remediation.execute_action`
- `remediation.verify_action`
- `remediation.evaluate`
- `remediation.execute_action`
- `remediation.verify_recovery`

Expected attributes:

- `action.type=clean_support_knowledge_cache`
- `action.target=support-knowledge-cache`
- `app.business_transaction=remediation_decision`

## 8. Validate recovery

After approval, run:

```bash
curl -s http://127.0.0.1:18104/scenario/state
SIMULATOR_SCENARIO=current SIMULATOR_DURATION_SECONDS=180 SIMULATOR_INTERVAL_MS=750 SIMULATOR_MIX=balanced docker compose run --rm traffic-simulator
```

Expected recovery:

- scenario state is `healthy`
- operator console validation status is `validated`
- AI Support Response latency improves
- `system.filesystem.utilization` for `/var/cache/support-knowledge` drops or stops rising
- comparison journeys remain healthy

## Splunk search checklist

Use these filters and names during rehearsal:

| Check | Filter or value |
| --- | --- |
| Student isolation | `service.instance.id=<INSTANCE>` |
| Environment | `deployment.environment=demo` |
| RUM app | `support-portal` |
| Degraded service | `support-knowledge` |
| Cache mount | `/var/cache/support-knowledge` |
| Support transaction | `app.business_transaction=support_response` |
| Account transaction | `app.business_transaction=account_status_lookup` |
| Help article transaction | `app.business_transaction=help_article_search` |
| Remediation action | `clean_support_knowledge_cache` |

## Pass criteria

The Splunk validation passes only when:

- RUM or browser traffic proves portal activity
- APM shows service latency for the degraded support-response path
- Infrastructure metrics show cache filesystem pressure
- Splunk MCP evidence creates an approval-required action
- the remediation action executes and verifies recovery
