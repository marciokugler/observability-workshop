# Build Sequence

## Current local build order

1. Copy `.env.example` to `.env`.
2. Set a unique `INSTANCE`.
3. Start Docker.
4. Build/check Node workspaces with `docker compose run --rm build-node`.
5. Build/check the Python remediation agent with `docker compose run --rm build-agent`.
6. Start the full lab stack with `docker compose up --wait`.
7. Open the portal and operator console.
8. Trigger `cache-disk-pressure`.
9. Reproduce the incident in the portal.
10. Use the operator console to create the incident, explain evidence, propose action, approve, and validate.
11. Stop with `docker compose down`.
12. Fully remove lab containers, networks, volumes, and service images with `docker compose down --volumes --remove-orphans --rmi all`.

## Verification order

1. Collector accepts host OTLP traffic on `14318`.
2. Portal loads on `18080`.
3. Operator console loads on `18081`.
4. API gateway responds on `18100`.
5. Scenario controller toggles state on `18104`.
6. Splunk receives APM service metrics and host filesystem metrics.
7. MCP evidence intake produces a policy result.
8. Agent evaluation produces `clean_claims_knowledge_cache`.
9. Approval executes and validates.
10. Terraform validates with `terraform -chdir=infra/terraform validate`.

## Remaining integration work

1. Validate SignalFlow queries against the target Splunk tenant.
2. Apply dashboards and detectors against live default signals.
3. Rehearse the shared-account `INSTANCE` filtering path with multiple student values.
