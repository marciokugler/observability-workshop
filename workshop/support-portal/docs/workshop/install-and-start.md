# Install and Start

This page is the full bring-up runbook.

Run commands from the app directory:

```bash
cd observability-workshop/workshop/support-portal
```

## Phase 1: build and check

### 1. Confirm Docker

```bash
docker info
```

```bash
docker compose version
```

### 2. Build and check the app code

```bash
docker compose run --rm build-node
```

```bash
docker compose run --rm build-agent
```

The Node build checks the workspace build scripts. The agent build installs the Python remediation agent in the Compose-managed virtual environment and compiles the agent package.

## Phase 2: start Docker Compose

### 3. Start the full lab stack

```bash
docker compose up --wait
```

This starts the app, remediation agent, and Splunk OTel Collector. Compose installs Node dependencies into the `node_modules` Docker volume and installs the Python remediation agent into the `python_venv` Docker volume.

The host OTLP HTTP endpoint is `http://127.0.0.1:14318`.

Follow logs in another terminal when needed:

```bash
docker compose logs -f
```

The stack exposes:

- knowledge service on `18103`
- assistant service on `18101`
- case service on `18102`
- scenario controller on `18104`
- API gateway on `18100`
- remediation orchestrator on `18110`
- remediation agent on `18800`
- support portal on `18080`
- operator console on `18081`

## Phase 3: verify key local endpoints

Open these in your browser:

- `http://127.0.0.1:18080`
- `http://127.0.0.1:18081`

Optional API sanity checks:

```bash
curl -i http://127.0.0.1:18100
curl -i http://127.0.0.1:18104/scenario/state
curl -i http://127.0.0.1:18110/remediation/health
curl -i http://127.0.0.1:18800/agent/health
```

## Phase 4: establish a clean baseline

### 6. Exercise the healthy system

Before failure injection:

1. Open the support portal.
2. Execute `AI Support Response`.
3. Execute `Account Status Lookup`.
4. Execute `Help Article Search`.

What you want to prove:

- the app works at baseline
- the three journeys are distinct
- the audience can later understand that only one degraded

### 7. Check the operator console

Confirm:

- no stale incident is blocking the flow
- policy and remediation panes load
- scenario controls are visible

## Phase 5: trigger and remediate

### 8. Trigger cache pressure

Click `Trigger Cache Pressure`.

The scenario fills the support-knowledge cache directory up to `SUPPORT_KNOWLEDGE_CACHE_QUOTA_BYTES`. In Docker Compose, that directory is also a size-limited tmpfs volume mounted into the collector, so Splunk filesystem metrics see real pressure without risking the host disk.

### 9. Reproduce the degraded transaction

Run `AI Support Response` again.

Expected result:

- support response latency increases
- `support-knowledge` APM duration increases
- filesystem utilization rises for the student instance
- the other two transactions remain usable

### 10. Drive remediation

1. move to the operator console
2. leave `Evidence Intake` blank unless using fallback operator notes
3. click `Gather MCP Evidence`
4. click `Explain`
5. click `Propose`
6. approve `clean_support_knowledge_cache`
7. verify recovery

## Optional traffic simulators

For a manual Splunk investigation, start traffic first and leave the scenario in `current` mode. Then click `Trigger Cache Pressure` yourself from the portal or operator console.

Backend API traffic:

```bash
docker compose run --rm traffic-simulator
```

Cache-pressure backend traffic:

```bash
SIMULATOR_SCENARIO=cache-disk-pressure SIMULATOR_RESET_AFTER_RUN=true docker compose run --rm traffic-simulator
```

Browser traffic:

```bash
RUM_SIMULATOR_USERS=5 RUM_SIMULATOR_ROUNDS=10 docker compose run --rm rum-simulator
```

Presenter-friendly background traffic:

```bash
SIMULATOR_DURATION_SECONDS=3600 SIMULATOR_INTERVAL_MS=750 SIMULATOR_MIX=balanced docker compose run --rm traffic-simulator
```

```bash
RUM_SIMULATOR_USERS=2 RUM_SIMULATOR_ROUNDS=120 RUM_SIMULATOR_BROWSERS=chromium RUM_SIMULATOR_CONCURRENCY=1 docker compose run --rm rum-simulator
```

## Stop and remove

Stop containers while keeping dependency/cache volumes:

```bash
docker compose down
```

Remove the lab containers, networks, volumes, and service images:

```bash
docker compose down --volumes --remove-orphans --rmi all
```

Confirm nothing remains for this Compose project:

```bash
docker container ls -a --filter label=com.docker.compose.project=support-portal
docker volume ls --filter label=com.docker.compose.project=support-portal
docker network ls --filter label=com.docker.compose.project=support-portal
```

## Stop conditions

Do not move into the live workshop until these are true:

- support portal works
- operator console works
- baseline journeys run
- cache pressure can be triggered
- `clean_support_knowledge_cache` can be approved and validated
