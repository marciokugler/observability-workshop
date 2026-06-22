# Collector Validation

## Goal

Prove that traces, APM service metrics, RUM data, and host filesystem metrics leave the demo app through the Splunk Distribution of the OpenTelemetry Collector before checking Splunk UI views.

## Preconditions

1. Docker daemon is running.
2. For live Splunk export, `.env` contains:
   - `SPLUNK_ACCESS_TOKEN`
   - `SPLUNK_REALM`
   - `INSTANCE`
   - `OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:14318`
   - `OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf`
3. Docker Compose v2 is available.

## Start order

1. Start the full Compose stack:
   ```bash
   docker compose up --wait
   ```

## Generate traffic

1. Open the portal at `http://127.0.0.1:18080`.
2. Execute all three transactions:
   - AI Support Response
   - Account Status Lookup
   - Help Article Search
3. Trigger `cache-disk-pressure`.
4. Re-run AI Support Response.
5. Create an incident in the operator console and drive the remediation proposal flow.

## What to look for

APM services:

- `support-portal-api`
- `support-assistant`
- `support-knowledge`
- `remediation-orchestrator`
- `remediation-agent`

Metrics:

- `service.request`
- `service.request.duration.ns`
- `disk.utilization`

Browser:

- RUM application for the support portal, if `VITE_SPLUNK_RUM_TOKEN` is set
- browser spans with `app.business_transaction`

## If signals do not appear

1. Confirm app containers started with the intended environment.
2. Confirm the collector host port `14318` is available.
3. Confirm fresh traffic was generated after the collector was already running.
4. Confirm `INSTANCE` and `OTEL_RESOURCE_ATTRIBUTES` match the filter you are using in Splunk.
5. Confirm app services log normal startup without telemetry initialization errors.

## After collector verification

1. Check APM service views.
2. Check Infrastructure Monitoring filesystem utilization.
3. Render Splunk objects with `python3 infra/splunk/sync_splunk_objects.py`.
4. Apply dashboards and detectors only after the live signals exist.

## Related Infrastructure validation

The collector sends service-to-host related-content updates through the SignalFx exporter. For the workshop, `stale_service_timeout` is set long enough for a presenter to pause on a trace and still navigate to infrastructure.

Use these checks before trusting the UI:

```bash
docker compose logs --since 10m splunk-otel-collector 2>&1 \
  | grep -E 'Updated dimension.*support-knowledge.*PUT|Detected host resource ID'
```

Expected:

- host resource ID is `host.name=$INSTANCE`
- `support-knowledge` is updated with `method":"PUT"`
- `disk.utilization` is visible for mountpoint `/var/cache/support-knowledge`

If the trace waterfall still shows `Infrastructure (0)`, use the APM service view or Infrastructure Monitoring filtered to `$INSTANCE`. The trace can remain visible after the current service-to-host relation has aged out.
