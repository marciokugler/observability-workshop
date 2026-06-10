---
title: Troubleshooting
linkTitle: 7. Troubleshooting
weight: 7
archetype: chapter
time: 10 minutes
description: Recover from common local setup, telemetry, and remediation issues during the workshop.
---

Recover common setup, telemetry, and remediation issues without changing the learning objective.

## `npm install` Fails

Check:

- If the shell says `npm: command not found`, install Node.js 22 first:

```bash
sudo apt update
sudo apt install -y curl
sudo apt install -y ca-certificates
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
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

## Python Agent Setup Fails

If `apps/remediation-agent/.venv` does not exist, the virtual environment creation failed. On Debian or Ubuntu, install Python venv support first:

```bash
sudo apt update
sudo apt install -y python3-venv
sudo apt install -y python3-pip
```

Recreate the virtual environment only when you intend to replace it:

```bash
rm -rf apps/remediation-agent/.venv
python3 -m venv apps/remediation-agent/.venv
apps/remediation-agent/.venv/bin/python -m pip install --index-url https://pypi.org/simple --upgrade pip
apps/remediation-agent/.venv/bin/python -m pip install --index-url https://pypi.org/simple -e apps/remediation-agent
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
sudo usermod -aG docker "$USER"
newgrp docker
docker info
docker compose version
grep -E '^OTEL_EXPORTER_OTLP_ENDPOINT=' .env
npm run dev:collector
```

If `docker compose version` is not available on Ubuntu, install the Compose package used by your Docker installation:

```bash
sudo apt update
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

## The Support Transaction Does Not Degrade

Check:

- `Trigger Cache Pressure` was clicked.
- `AI Claim Status` was rerun after the scenario became active.
- `CLAIMS_KNOWLEDGE_CACHE_DIR` points at a writable lab directory.

Useful checks:

```bash
curl -s http://127.0.0.1:18104/scenario/state
curl -s http://127.0.0.1:18103/knowledge/cache/status
```

## Telemetry Is Not Visible in Splunk

Check locally first:

1. Collector is running.
2. App processes started with `.env` loaded.
3. Fresh traffic was generated after collector startup.
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

## Remediation Recommendation Is Missing

Check:

- `Gather MCP Evidence` created an evidence package.
- The orchestrator built an evidence bundle.
- Policy mode is visible.
- The remediation agent is reachable on `18800`.

Action:

```bash
curl -s http://127.0.0.1:18800/agent/health
curl -s http://127.0.0.1:18110/remediation/health
```

## Safe Fallback

If the live path is unstable:

1. Show the portal baseline.
2. Explain and trigger cache pressure.
3. Use the fallback evidence text in the operator console.
4. Explain policy and approval.
5. Approve the controlled action if the local services are healthy.
6. Close on validation and auditability.
