# Splunk Objects

## Dashboards to provision as code

- Executive Story
- APM Service Requests
- Digital Experience
- Service Health
- Remediation Operations

## Detectors to provision as code

- Claims Knowledge Cache Filesystem Pressure
- Claims Knowledge APM Latency
- Claims Knowledge APM Error Rate

## Signal source

Use default Splunk Observability signals:

- `disk.utilization`
- `service.request`
- `service.request.duration.ns`
- RUM and browser spans
- remediation service spans

## Provisioning direction

Use `infra/splunk/specs` as the source of truth for dashboard and detector authoring. Render and apply those specs with `infra/splunk/sync_splunk_objects.py`.
