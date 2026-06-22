# Splunk Objects

## Dashboards to provision as code

- Executive Story
- APM Service Requests
- Digital Experience
- Service Health
- Remediation Operations

## Detectors to provision as code

- Support Knowledge Cache Filesystem Pressure
- Support Knowledge APM Latency
- Support Knowledge APM Error Rate

## Signal source

Use default Splunk Observability signals:

- `disk.utilization`
- `service.request`
- `service.request.duration.ns`
- RUM and browser spans
- remediation service spans

## Provisioning direction

Use `infra/splunk/specs` as the source of truth for dashboard and detector authoring. Render and apply those specs with `infra/splunk/sync_splunk_objects.py`.
