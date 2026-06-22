---
title: Troubleshooting
linkTitle: 6. Troubleshooting
weight: 6
archetype: chapter
time: 10 minutes
description: Recover from common local setup, telemetry, MCP, and filesystem monitoring issues during the workshop.
aliases:
  - /ninja-workshops/ai/16-support-portal-remediation-agent/7-troubleshooting/
---

Recover common setup, telemetry, MCP, and local app issues without changing the learning objective.

## `npm install` Fails

Check:

- If the shell says `npm: command not found`, install Node.js 22 first:

```bash
sudo apt update
```

```bash
sudo apt install -y curl
```

```bash
sudo apt install -y ca-certificates
```

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
```

```bash
sudo apt install -y nodejs
```

- Internet access or package registry access.
- Node version compatibility. If `npm install` prints `EBADENGINE` with current Node `v18.x`, Ubuntu installed an older Node package. Install Node 22, then rerun `npm install`.
- Whether a previous partial install left a corrupted `node_modules`.

Action:

```bash
npm install
```

Capture the first real error and fix that root issue before changing application code.

## Python Cleanup Worker Setup Fails

If `apps/remediation-agent/.venv` does not exist, the virtual environment creation failed. On Debian or Ubuntu, install Python venv support first:

```bash
sudo apt update
```

```bash
sudo apt install -y python3-venv
```

```bash
sudo apt install -y python3-pip
```

Recreate the virtual environment only when you intend to replace it:

```bash
rm -rf apps/remediation-agent/.venv
```

```bash
python3 -m venv apps/remediation-agent/.venv
```

```bash
apps/remediation-agent/.venv/bin/python -m pip install --index-url https://pypi.org/simple --upgrade pip
```

```bash
apps/remediation-agent/.venv/bin/python -m pip install --index-url https://pypi.org/simple -e apps/remediation-agent
```

```bash
apps/remediation-agent/.venv/bin/python -m pip show ibobs-remediation-agent
```

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
grep -E '^OTEL_EXPORTER_OTLP_ENDPOINT=' .env
```

```bash
npm run dev:collector
```

If `docker compose version` is not available on Ubuntu, install the Compose package used by your Docker installation:

```bash
sudo apt update
```

```bash
sudo apt install -y docker-compose-v2
```

If your system uses Docker's upstream package repository instead of Ubuntu's `docker.io` package, install `docker-compose-plugin`.

Expected local endpoint:

```dotenv
OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:14318
```

## Portal or Console Does Not Load

Check:

- `npm run dev` is still running.
- Vite did not fail because of a port conflict.
- Browser is pointed at the high-port URLs.

Action:

```bash
lsof -i :18080 -i :18081
```

## Claim Status Does Not Degrade

Check:

- `Trigger Cache Pressure` was clicked.
- `AI Claim Status` was rerun after the scenario became active.
- `CLAIMS_KNOWLEDGE_CACHE_DIR` points at a writable lab directory.

Action:

1. Confirm the portal or operator console shows cache pressure as active.
2. Rerun `AI Claim Status` from the claims portal.
3. Generate fresh browser traffic with `npm run simulate:rum`.
4. Compare `AI Claim Status` to `Policy Coverage Lookup` and `Claims FAQ Search`.

## Filesystem Metrics Are Missing

Check:

- The collector is running.
- `infra/otel-collector/config.yaml` includes `hostmetrics/cache_volume`.
- The `metrics/cache_volume` pipeline includes `hostmetrics/cache_volume`.
- `.env` has the expected `INSTANCE` value.
- The cache mountpoint is `/var/cache/claims-knowledge`.

Look for:

```text
system.filesystem.utilization
mountpoint=/var/cache/claims-knowledge
service.instance.id=<INSTANCE>
```

If the metric is missing, restart the collector after confirming the configuration:

```bash
npm run dev:collector
```

## Telemetry Is Not Visible in Splunk

Check locally first:

1. Collector is running.
2. App processes started with `.env` loaded.
3. Fresh browser traffic was generated after collector startup.
4. `INSTANCE` and `OTEL_RESOURCE_ATTRIBUTES` match the student lab.

Look for:

- APM services such as `claims-knowledge`, `claims-assistant`, and `remediation-agent`.
- Filesystem utilization for `/var/cache/claims-knowledge`.
- RUM data for the portal if `VITE_SPLUNK_RUM_TOKEN` is set.

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
- `tools/list` works from the setup page.
- The operator console can reach `remediation-orchestrator`.

Action:

1. Refresh the operator console.
2. Click `Gather MCP Evidence`.
3. Click `Explain`.
4. Click `Propose`.
5. If evidence is still missing, inspect the terminal running `npm run dev` for the first failing service.
