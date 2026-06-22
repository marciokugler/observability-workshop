---
title: Install Required Software
linkTitle: 2. Install Required Software
weight: 2
archetype: chapter
time: 25 minutes
description: Install prerequisites, configure Splunk export, RUM, and student identity.
aliases:
  - /ninja-workshops/infrastructure/16-support-portal-infrastructure-troubleshooting/2-prepare-environment/
---

The lab uses Node.js for the local services, Python for the controlled cleanup worker, Docker for the Splunk OpenTelemetry Collector, and Splunk credentials for live observability evidence.

## Required Software

For Ubuntu or Debian workshop VMs:

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

```bash
sudo apt install -y python3
```

```bash
sudo apt install -y python3-venv
```

```bash
sudo apt install -y python3-pip
```

```bash
sudo apt install -y docker.io
```

```bash
sudo apt install -y docker-compose-v2
```

```bash
sudo systemctl enable --now docker
```

```bash
sudo usermod -aG docker "$USER"
```

Close and reopen the terminal after adding your user to the `docker` group, or run `newgrp docker` in the current terminal.

For macOS laptops, install Node.js 22, Python 3, and Docker Desktop with your approved package manager. For Windows laptops, use WSL2 Ubuntu or a Linux workshop VM. Docker Desktop can provide the Docker daemon for WSL2.

After installation, check your local tools:

```bash
node --version
```

```bash
npm --version
```

```bash
python3 --version
```

```bash
python3 -m pip --version
```

```bash
docker --version
```

```bash
docker compose version
```

```bash
docker info
```

Docker is required for the local collector. 

## Configure the App Copy

The remaining commands on this page assume your terminal is in the app directory:

```bash
cd observability-workshop/workshop/support-portal
```
Create a local environment file:

```bash
test -f .env || cp .env.example .env
```

Edit `.env` and set a unique `INSTANCE` value:

```dotenv
INSTANCE=student-001
OTEL_RESOURCE_ATTRIBUTES=lab.name=support-portal,lab.student.id=student-001,service.instance.id=student-001,host.name=student-001,deployment.environment=demo
```

Use a unique value for every student when sharing one Splunk Observability Cloud organization. This value is what lets you filter RUM, APM, host metrics.

## Splunk Credentials

Minimum values for the full infrastructure troubleshooting path:

```dotenv
SPLUNK_ACCESS_TOKEN=
SPLUNK_REALM=us1
VITE_SPLUNK_RUM_TOKEN=
```

Credential purpose:

| Variable | Use |
| --- | --- |
| `SPLUNK_ACCESS_TOKEN` | Sends collector telemetry to Splunk Observability Cloud and is reused by MCP in session 5. |
| `SPLUNK_REALM` | Splunk realm for API and ingest endpoints, such as `us1`. |
| `VITE_SPLUNK_RUM_TOKEN` | Browser RUM token for the support portal. |

If Splunk credentials are missing:

- The local app still runs.
- Live Splunk export is absent or partial.
- RUM, APM, Infrastructure, and MCP steps cannot show the full evidence chain.

## Install Dependencies

Install Node workspace dependencies:

```bash
npm install
```

Create the cleanup worker virtual environment:

```bash
python3 -m venv apps/remediation-agent/.venv
```

Upgrade `pip`:

```bash
apps/remediation-agent/.venv/bin/python -m pip install --index-url https://pypi.org/simple --upgrade pip
```

Install the local Python package:

```bash
apps/remediation-agent/.venv/bin/python -m pip install --index-url https://pypi.org/simple -e apps/remediation-agent
```

Confirm the package is installed:

```bash
apps/remediation-agent/.venv/bin/python -m pip show support-portal-agent
```
