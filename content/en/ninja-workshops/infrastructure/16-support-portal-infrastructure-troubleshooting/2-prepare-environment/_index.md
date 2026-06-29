---
title: Install Required Software
linkTitle: 2. Install Required Software
weight: 2
archetype: chapter
time: 10 minutes
description: Install Docker and confirm the host can run Docker Compose.
aliases:
  - /ninja-workshops/infrastructure/16-support-portal-infrastructure-troubleshooting/2-prepare-environment/
---

## Required Software

Install these tools on the host:

| Tool | Why it is needed |
| --- | --- |
| Docker with Compose v2 | Runs the support portal, backend services, remediation agent, simulators, and collector. |
| Git | Clones the workshop repository. |
| Browser | Opens the support portal, operator console, and Splunk Observability Cloud. |

For Ubuntu or Debian workshop VMs, install Docker and download tools:

```bash
sudo apt update
```

```bash
sudo apt install -y git curl ca-certificates docker.io docker-compose-v2
```

```bash
sudo systemctl enable --now docker
```

```bash
sudo usermod -aG docker "$USER"
```

Close and reopen the terminal after adding your user to the `docker` group, or run `newgrp docker` in the current terminal.

For macOS laptops, install Docker Desktop and Git. For Windows laptops, use WSL2 Ubuntu or a Linux workshop VM. Docker Desktop can provide the Docker daemon for WSL2.

After installation, check the required tools:

```bash
git --version
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

## Confirm the App Directory

The remaining workshop commands assume your terminal is in the app directory:

```bash
cd observability-workshop/workshop/support-portal
```

Create a local environment file. You will fill in the Splunk token values in the next session.

```bash
test -f .env || cp .env.example .env
```
