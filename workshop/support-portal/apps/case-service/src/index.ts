import cors from "@fastify/cors";
import Fastify from "fastify";
import { defaultPorts, localServicePort } from "@support-portal/runtime-config";
import { BUSINESS_TRANSACTIONS } from "@support-portal/shared-types";
import {
  annotateServerEntrySpan,
  buildNodeTelemetryConfig,
  buildTelemetryAttributes,
  createServiceLogger,
  initSplunkNodeTelemetry
} from "@support-portal/telemetry";

export const caseService = {
  name: "support-case-service",
  businessTransaction: BUSINESS_TRANSACTIONS.caseStatusLookup,
  telemetry: buildTelemetryAttributes(BUSINESS_TRANSACTIONS.caseStatusLookup)
};

export function buildServer() {
  const app = Fastify({ loggerInstance: createServiceLogger(caseService.name) });
  void buildNodeTelemetryConfig({ serviceName: caseService.name });
  void app.register(cors, { origin: true });
  app.addHook("preHandler", async (request) => {
    const routePath = request.routeOptions.url;
    annotateServerEntrySpan({
      method: request.method,
      route: routePath,
      transaction: routePath === "/cases/:caseId" ? caseService.businessTransaction : undefined,
      attributes: routePath === "/cases/:caseId" ? caseService.telemetry : undefined
    });
    request.log.info(
      {
        http: { method: request.method, url: request.url },
        params: request.params,
        query: request.query,
        body: request.body
      },
      "request received"
    );
  });
  app.addHook("onResponse", async (request, reply) => {
    request.log.info(
      {
        http: { method: request.method, url: request.url, status_code: reply.statusCode }
      },
      "request completed"
    );
  });

  app.get("/cases/health", async () => ({ status: "ok", service: caseService.name }));
  app.get("/cases/:caseId", async (request) => {
    const caseId = (request.params as { caseId: string }).caseId;
    const payload = {
      transaction: BUSINESS_TRANSACTIONS.caseStatusLookup,
      telemetry: caseService.telemetry,
      caseId,
      accountId: caseId,
      accountStatus: "Account is active and eligible for standard support",
      nextStep: "Support review remains on schedule"
    };
    request.log.info({ caseId, payload }, "account status lookup served");
    return payload;
  });

  return app;
}

if (process.env.NODE_ENV !== "test") {
  initSplunkNodeTelemetry(caseService.name);
  const port = localServicePort(process.env, "CASE_SERVICE_PORT", defaultPorts.caseService);
  const server = buildServer();
  server.log.info({ caseService }, "case-service scaffold ready");
  server.listen({ port, host: "0.0.0.0" }).catch((error) => {
    server.log.error(error);
    process.exit(1);
  });
}
