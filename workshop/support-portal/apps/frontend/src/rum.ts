import SplunkRum from "@splunk/otel-web";
import SplunkRumRecorder from "@splunk/otel-web-session-recorder";
import { currentBrowserAppConfig } from "@support-portal/runtime-config/browser";
import { buildRumConfig } from "@support-portal/telemetry/browser";

declare global {
  interface Window {
    __supportPortalRumStarted?: boolean;
  }
}

export function initRum() {
  if (typeof window === "undefined" || window.__supportPortalRumStarted) {
    return;
  }

  const config = buildRumConfig("support-portal");
  const appConfig = currentBrowserAppConfig();
  if (!config.rumTokenConfigured) {
    console.info("[telemetry:frontend] RUM disabled:", config.deactivatedReason);
    return;
  }

  SplunkRum.init({
    realm: config.realm,
    rumAccessToken: import.meta.env.VITE_SPLUNK_RUM_TOKEN,
    applicationName: config.applicationName,
    deploymentEnvironment: config.deploymentEnvironment,
    instrumentations: {
      fetch: {
        propagateTraceHeaderCorsUrls: appConfig.tracePropagationUrls
      },
      xhr: {
        propagateTraceHeaderCorsUrls: appConfig.tracePropagationUrls
      }
    },
    spaMetrics: {
      quietTime: 800
    }
  });

  SplunkRum.setGlobalAttributes({
    "app.name": "support-portal",
    "deployment.environment": config.deploymentEnvironment
  });

  if (config.sessionReplayEnabled) {
    SplunkRumRecorder.init({
      realm: config.realm,
      rumAccessToken: import.meta.env.VITE_SPLUNK_RUM_TOKEN
    });
  }

  window.__supportPortalRumStarted = true;
}
