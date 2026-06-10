import { start } from "@splunk/otel";
import { appVersion, deploymentEnvironment, serviceNamespace } from "./config";

declare global {
  var __ibobsTelemetryStarted: boolean | undefined;
}

export function initSplunkNodeTelemetry(serviceName: string) {
  if (globalThis.__ibobsTelemetryStarted) {
    return false;
  }

  const accessToken = process.env.SPLUNK_ACCESS_TOKEN;
  const realm = process.env.SPLUNK_REALM;
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const directSplunkExport = !endpoint || endpoint.includes("signalfx.com");

  if (directSplunkExport && (!accessToken || !realm)) {
    return false;
  }

  const resourceAttributes = [
    process.env.OTEL_RESOURCE_ATTRIBUTES,
    `deployment.environment=${deploymentEnvironment}`,
    `service.namespace=${serviceNamespace}`,
    `service.version=${appVersion}`,
    `app.version=${appVersion}`
  ]
    .filter(Boolean)
    .join(",");

  process.env.OTEL_RESOURCE_ATTRIBUTES = resourceAttributes;
  process.env.SPLUNK_TRACE_RESPONSE_HEADER_ENABLED =
    process.env.SPLUNK_TRACE_RESPONSE_HEADER_ENABLED ?? "true";
  process.env.OTEL_PROPAGATORS = process.env.OTEL_PROPAGATORS ?? "tracecontext,baggage,b3";
  process.env.SPLUNK_PROFILER_ENABLED = process.env.SPLUNK_PROFILER_ENABLED ?? "false";
  process.env.OTEL_METRIC_EXPORT_INTERVAL = process.env.OTEL_METRIC_EXPORT_INTERVAL ?? "5000";

  const options: Parameters<typeof start>[0] = {
    serviceName,
    tracing: true,
    metrics: true,
    profiling: process.env.SPLUNK_PROFILER_ENABLED === "true",
    logging: false
  };

  if (endpoint) {
    options.endpoint = endpoint;
  }

  if (directSplunkExport && accessToken && realm) {
    options.accessToken = accessToken;
    options.realm = realm;
  }

  const originalSplunkRealm = process.env.SPLUNK_REALM;
  const originalSplunkAccessToken = process.env.SPLUNK_ACCESS_TOKEN;
  const localCollectorExport = endpoint && !directSplunkExport;
  const missingDirectCredentials = !accessToken || !realm;

  try {
    if (localCollectorExport && missingDirectCredentials) {
      delete process.env.SPLUNK_REALM;
      delete process.env.SPLUNK_ACCESS_TOKEN;
    }

    start(options);
  } finally {
    if (originalSplunkRealm === undefined) {
      delete process.env.SPLUNK_REALM;
    } else {
      process.env.SPLUNK_REALM = originalSplunkRealm;
    }

    if (originalSplunkAccessToken === undefined) {
      delete process.env.SPLUNK_ACCESS_TOKEN;
    } else {
      process.env.SPLUNK_ACCESS_TOKEN = originalSplunkAccessToken;
    }
  }

  globalThis.__ibobsTelemetryStarted = true;
  return true;
}
