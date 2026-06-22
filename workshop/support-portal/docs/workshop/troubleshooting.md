# Troubleshooting

This page is optimized for workshop-day failures.

## Build checks fail

Check:

- Docker daemon is running
- Docker Compose v2 is installed
- internet access or package registry access
- whether a previous partial install left a corrupted `node_modules` or `python_venv` Docker volume

Action:

1. rerun the failing build check
2. if it still fails, remove Compose volumes and rerun
3. capture the first real error
4. resolve that root issue before changing application code

```bash
docker compose run --rm build-node
```

```bash
docker compose run --rm build-agent
```

```bash
docker compose down --volumes --remove-orphans
```

## Compose stack will not start

Check:

- Docker daemon is running
- your user can access `/var/run/docker.sock`
- Docker Compose v2 is installed
- `.env` is valid if you created one
- host port `14318` is free
- app ports `18080`, `18081`, `18100` through `18104`, `18110`, and `18800` are free

Action:

```bash
sudo systemctl enable --now docker
```

```bash
sudo usermod -aG docker "$USER"
```

```bash
newgrp docker
```

```bash
docker info
```

```bash
docker compose version
```

```bash
test ! -f .env || grep -E '^OTEL_EXPORTER_OTLP_ENDPOINT=' .env
```

```bash
docker compose up --wait
```

If `docker compose version` is not available on Ubuntu:

```bash
sudo apt update
sudo apt install -y docker-compose-v2
```

If your system uses Docker's upstream package repository instead of Ubuntu's `docker.io` package, install `docker-compose-plugin`.

Expected local value:

```dotenv
OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:14318
```

## Portal or console does not load

Check:

- the Compose stack is running
- Vite did not fail due to port conflict
- browser is pointed at the high-port URLs

Action:

```bash
docker compose ps
docker compose logs frontend operator-console
lsof -i :18080 -i :18081
```

## Backend services are inconsistent

Action:

1. reset scenario state
2. refresh both UIs
3. run the three transactions in healthy mode
4. trigger cache pressure again

Useful checks:

```bash
curl -s http://127.0.0.1:18104/scenario/state
curl -s http://127.0.0.1:18103/knowledge/cache/status
```

## The support transaction does not degrade

Check:

- `Trigger Cache Pressure` was clicked
- `AI Support Response` was rerun after the scenario became active
- `SUPPORT_KNOWLEDGE_CACHE_DIR` points at a writable lab directory

Action:

```bash
curl -s http://127.0.0.1:18104/scenario/state
curl -s http://127.0.0.1:18103/knowledge/cache/status
```

## Telemetry is not visible in Splunk

Check locally first:

1. collector is running
2. `.env` has the expected Splunk and RUM values
3. fresh traffic was generated after collector startup
4. `INSTANCE` and `OTEL_RESOURCE_ATTRIBUTES` match the student lab

Look for:

- APM services such as `support-knowledge`, `support-assistant`, and `remediation-agent`
- host filesystem metric `disk.utilization`
- RUM data for the portal if `VITE_SPLUNK_RUM_TOKEN` is set

If the APM trace waterfall shows `Infrastructure (0)`:

1. generate fresh AI Support Response traffic
2. wait for the collector log line `Updated dimension` with `support-knowledge` and `method":"PUT"`
3. open the `support-knowledge` service view or service map
4. use Infrastructure Monitoring filtered to the student `INSTANCE` and mountpoint `/var/cache/support-knowledge`

The trace waterfall can outlive Splunk's current service-to-host related-content relation. The collector is configured with a longer `stale_service_timeout` for the workshop, but the reliable presenter path is still APM service view plus Infrastructure Monitoring.

If RUM sessions are missing:

1. confirm `VITE_SPLUNK_RUM_TOKEN` is configured for the portal container
2. restart the portal
3. generate fresh browser traffic after the restart
4. wait a few minutes, then use `Pages` or `Network Requests` first
5. use `Session Search` only if session replay is enabled and new sessions were generated

Useful check:

```bash
docker compose exec -T frontend env | grep VITE_SPLUNK
```

## Remediation recommendation or execution is missing

Check:

- `Gather MCP Evidence` created an evidence package in the operator console
- the orchestrator built an evidence bundle
- policy mode is visible
- remediation agent is reachable on `18800`

Action:

```bash
curl -s http://127.0.0.1:18800/agent/health
curl -s http://127.0.0.1:18110/remediation/health
```

## Optional webhook delivery does not work

This is not a core lab blocker. The primary workshop path opens a local incident and gathers Splunk evidence through MCP.

If testing webhooks:

1. prove local orchestrator behavior on `127.0.0.1`
2. start the tunnel
3. update `ORCHESTRATOR_PUBLIC_WEBHOOK_URL`
4. verify any shared secret values match

## Full cleanup does not remove everything

Use this when a student needs to leave no lab containers, networks, volumes, or service images behind:

```bash
docker compose down --volumes --remove-orphans --rmi all
```

Confirm the Compose project has no remaining Docker objects:

```bash
docker container ls -a --filter label=com.docker.compose.project=support-portal
docker volume ls --filter label=com.docker.compose.project=support-portal
docker network ls --filter label=com.docker.compose.project=support-portal
```

## Safe fallback

If the live path is unstable:

1. show the portal baseline
2. explain the cache-pressure trigger
3. show the operator console flow with fallback evidence text
4. explain the policy and approval gate
5. close on why validation matters
