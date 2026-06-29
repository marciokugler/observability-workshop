---
title: Troubleshooting
linkTitle: 8. Troubleshooting
weight: 8
archetype: chapter
time: 10 minutes
description: Recover from common local setup, telemetry, MCP, and filesystem monitoring issues during the workshop.
aliases:
  - /ninja-workshops/infrastructure/16-support-portal-infrastructure-troubleshooting/7-troubleshooting/
---

Recover common setup, telemetry, MCP, and local app issues without changing the learning objective.

## Compose Dependency Install Fails

Check:

- Docker daemon is running.
- Docker Compose v2 is installed.
- Internet access or package registry access is available from containers.
- A previous partial install did not leave a corrupted Docker volume.

Action:

```bash
docker compose run --rm node-deps
```

If dependency state still looks corrupted, remove the Compose-managed dependency volume and reinstall:

```bash
docker compose down --volumes
```

```bash
docker compose run --rm node-deps
```

Capture the first real error and fix that root issue before changing application code.

## Remediation Agent Container Fails

Check the agent build path inside Compose:

```bash
docker compose run --rm build-agent
```

If it fails, capture the first Python package or compile error from the container output. Do not create a host virtual environment for the lab path.


## Collector Will Not Start

Check:

- Docker daemon is running.
- Your user can access `/var/run/docker.sock`.
- Docker Compose v2 is installed.
- `.env` is loaded.
- Host port `14318` is free.

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
docker compose up --wait
```

If `docker compose version` is not available on Ubuntu, install the Compose package used by your Docker installation:

```bash
sudo apt update
```

```bash
sudo apt install -y docker-compose-v2
```

If your system uses Docker's upstream package repository instead of Ubuntu's `docker.io` package, install `docker-compose-plugin`.

Do not add `OTEL_EXPORTER_OTLP_ENDPOINT` to `.env` for the normal Compose lab. Compose sets the app containers to export to `http://splunk-otel-collector:4318`. The host-mapped `http://127.0.0.1:14318` endpoint is only for optional host-side checks.

## Portal or Console Does Not Load

Check:

- `docker compose up --wait` completed successfully.
- Vite did not fail because of a port conflict.
- Browser is pointed at the high-port URLs.

Action:

```bash
lsof -i :18080 -i :18081
```

## Support Response Does Not Degrade

Check:

- `Trigger Cache Pressure` was clicked.
- `AI Support Response` was rerun after the scenario became active.
- `SUPPORT_KNOWLEDGE_CACHE_DIR` points at a writable lab directory.

Action:

1. Confirm the portal or operator console shows cache pressure as active.
2. Rerun `AI Support Response` from the support portal.
3. Generate fresh browser traffic with `docker compose run --rm rum-simulator`.
4. Compare `AI Support Response` to `Account Status Lookup` and `Help Article Search`.

## Filesystem Metrics Are Missing

Check:

- The collector is running.
- `observability/otel-collector/config.yaml` includes `hostmetrics/cache_volume`.
- The `metrics/cache_volume` pipeline includes `hostmetrics/cache_volume`.
- `observability/otel-collector/config.yaml` includes `docker_stats` and the `metrics/containers` pipeline.
- `.env` has the expected `INSTANCE` value.
- The cache mountpoint is `/var/cache/support-knowledge`.

Look for:

```text
system.filesystem.utilization
mountpoint=/var/cache/support-knowledge
service.instance.id=<INSTANCE>
```

If the metric is missing, restart the collector after confirming the configuration:

```bash
docker compose restart splunk-otel-collector
```

If container metrics are missing, confirm the collector has access to Docker:

```bash
docker compose exec -T splunk-otel-collector test -S /var/run/docker.sock
```

## Telemetry Is Not Visible in Splunk

Check locally first:

1. Collector is running.
2. App processes started with `.env` loaded.
3. Fresh browser traffic was generated after collector startup.
4. `INSTANCE` and `DEPLOYMENT_ENVIRONMENT` match the student lab.

Look for:

- APM services such as `support-knowledge`, `support-assistant`, and `remediation-agent`.
- Filesystem utilization for `/var/cache/support-knowledge`.
- RUM data for the portal if `VITE_SPLUNK_RUM_TOKEN` is set.

If APM traces show `ingest.<realm>.signalfx.com` as a child span, an app process started with direct Splunk ingest settings instead of the collector endpoint. Recreate the app containers and confirm the container environment:

```bash
docker compose up --force-recreate --wait
```

```bash
docker compose exec -T api-gateway env | grep OTEL_EXPORTER_OTLP_ENDPOINT
```

Expected value inside app containers:

```text
OTEL_EXPORTER_OTLP_ENDPOINT=http://splunk-otel-collector:4318
```

If RUM sessions are missing:

1. Confirm `VITE_SPLUNK_RUM_TOKEN` is configured.
2. Restart the portal.
3. Generate fresh browser traffic.
4. Wait a few minutes.
5. Use `Pages` or `Network Requests` before relying on Session Search.

## MCP Evidence Is Missing

Check:

- `SPLUNK_ACCESS_TOKEN` is set.
- `SPLUNK_REALM` is correct.
- `SPLUNK_MCP_ENABLED=true`.
- `tools/list` works from the MCP communication session.
- The operator console can reach `remediation-orchestrator`.

Action:

1. Refresh the operator console.
2. Click `Gather MCP Evidence`.
3. Click `Explain`.
4. Click `Propose`.
5. If evidence is still missing, inspect Compose logs for the first failing service:

```bash
docker compose logs remediation-orchestrator splunk-otel-collector
```
