# Prerequisites

Use this pre-flight checklist before debugging application code.

## Required software

### Node.js 22 and npm

Install Node.js 22 and npm before checking versions. Ubuntu's default `nodejs` package can install Node 18, which is too old for this app.

Ubuntu or Debian workshop VM:

```bash
sudo apt update
sudo apt install -y curl
sudo apt install -y ca-certificates
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

```bash
node --version
npm --version
```

### Python 3

Install Python and venv support before checking versions on Ubuntu or Debian:

```bash
sudo apt update
sudo apt install -y python3
sudo apt install -y python3-venv
sudo apt install -y python3-pip
```

```bash
python3 --version
python3 -m pip --version
```

### Docker

Required for the local collector and Docker Compose flow.

Ubuntu or Debian workshop VM:

```bash
sudo apt install -y docker.io
sudo apt install -y docker-compose-v2
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

Close and reopen the terminal after adding your user to the `docker` group, or run `newgrp docker`.

```bash
docker --version
docker compose version
docker info
```

### Optional: cloudflared

Only needed for optional live detector webhook delivery.

```bash
cloudflared --version
```

## Credentials

Recommended for a realistic workshop:

| Variable | Use |
| --- | --- |
| `SPLUNK_ACCESS_TOKEN` | Sends collector telemetry to Splunk Observability Cloud and enables live Splunk evidence lookup. |
| `SPLUNK_REALM` | Splunk realm for API and ingest endpoints, such as `us1`. |
| `VITE_SPLUNK_RUM_TOKEN` | Browser RUM token for the claims portal. |
| `OPENAI_API_KEY` | Optional model-backed remediation agent decisions. |
| `GALILEO_API_KEY_FILE` | Optional path to a Galileo key file; preferred when you do not want the key in shell history. |
| `GALILEO_API_KEY` | Optional direct Galileo key for local agent monitoring. |

If credentials are missing:

- the local app still runs
- telemetry export to Splunk is absent or partial
- the remediation agent uses fallback logic when no OpenAI key is present
- Galileo agent monitoring is disabled when no Galileo key is present

## Ports

Default local layout:

- `18080` claims portal
- `18081` operator console
- `18082` docs, when served with the workshop command
- `18100` API gateway
- `18101` assistant service
- `18102` case service
- `18103` knowledge service
- `18104` scenario controller
- `18110` remediation orchestrator
- `18800` remediation agent
- `14318` collector OTLP HTTP on host

Check for collisions:

```bash
lsof -i :18080 -i :18081 -i :18082 -i :18100 -i :18101 -i :18102 -i :18103 -i :18104 -i :18110 -i :18800 -i :14318
```

## Required local files

- repo checked out locally
- `.env` if using real credentials
- `apps/remediation-agent/.venv` after Python setup

## Presenter setup

Recommended windows:

- claims portal
- operator console
- Splunk Observability Cloud
- terminal running the app stack
- terminal running the collector, if telemetry export is enabled

## Final go/no-go checklist

- Node and npm work
- Python 3 and venv support work
- Docker is running if collector is needed
- dependencies are installed
- remediation agent virtual environment exists
- each student has a unique `INSTANCE`
- intended local ports are free
