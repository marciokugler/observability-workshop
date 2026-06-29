import cors from "@fastify/cors";
import Fastify, { type FastifyRequest } from "fastify";
import { defaultPorts, localServicePort, localServiceUrl } from "@support-portal/runtime-config";
import { type SpanContext, isSpanContextValid, TraceFlags, trace } from "@opentelemetry/api";
import { BUSINESS_TRANSACTIONS } from "@support-portal/shared-types";
import {
  annotateServerEntrySpan,
  annotateCurrentSpan,
  buildNodeTelemetryConfig,
  buildTelemetryAttributes,
  createServiceLogger,
  initSplunkNodeTelemetry,
  runInSpan
} from "@support-portal/telemetry";

export function routes() {
  return [
    {
      method: "POST",
      path: "/api/support/respond",
      businessTransaction: BUSINESS_TRANSACTIONS.customerSupportResponse,
      telemetry: buildTelemetryAttributes(BUSINESS_TRANSACTIONS.customerSupportResponse)
    },
    {
      method: "GET",
      path: "/api/cases/:caseId",
      businessTransaction: BUSINESS_TRANSACTIONS.caseStatusLookup,
      telemetry: buildTelemetryAttributes(BUSINESS_TRANSACTIONS.caseStatusLookup)
    },
    {
      method: "GET",
      path: "/api/articles/search",
      businessTransaction: BUSINESS_TRANSACTIONS.knowledgeArticleSearch,
      telemetry: buildTelemetryAttributes(BUSINESS_TRANSACTIONS.knowledgeArticleSearch)
    }
  ];
}

const assistantServiceBaseUrl = localServiceUrl(process.env, {
  baseUrlEnvVar: "ASSISTANT_SERVICE_BASE_URL",
  portEnvVar: "ASSISTANT_SERVICE_PORT",
  defaultPort: defaultPorts.assistantService
});
const caseServiceBaseUrl = localServiceUrl(process.env, {
  baseUrlEnvVar: "CASE_SERVICE_BASE_URL",
  portEnvVar: "CASE_SERVICE_PORT",
  defaultPort: defaultPorts.caseService
});
const knowledgeServiceBaseUrl = localServiceUrl(process.env, {
  baseUrlEnvVar: "KNOWLEDGE_SERVICE_BASE_URL",
  portEnvVar: "KNOWLEDGE_SERVICE_PORT",
  defaultPort: defaultPorts.knowledgeService
});

function attachServerTimingHeader(reply: { header: (name: string, value: string) => void }) {
  const span = trace.getActiveSpan();
  if (!span) {
    return;
  }

  const spanContext = span.spanContext();
  if (!isSpanContextValid(spanContext)) {
    return;
  }

  const sampled = (spanContext.traceFlags & TraceFlags.SAMPLED) === TraceFlags.SAMPLED;
  const flags = sampled ? "01" : "00";
  reply.header(
    "Server-Timing",
    `traceparent;desc="00-${spanContext.traceId}-${spanContext.spanId}-${flags}"`
  );
}

function attachServerTimingHeaderFromContext(
  reply: { header: (name: string, value: string) => void },
  spanContext: SpanContext
) {
  if (!isSpanContextValid(spanContext)) {
    return;
  }

  const sampled = (spanContext.traceFlags & TraceFlags.SAMPLED) === TraceFlags.SAMPLED;
  const flags = sampled ? "01" : "00";
  reply.header(
    "Server-Timing",
    `traceparent;desc="00-${spanContext.traceId}-${spanContext.spanId}-${flags}"`
  );
}

function extractTraceparentCandidate(request: FastifyRequest) {
  const traceparentHeader = request.headers.traceparent;
  const raw =
    typeof traceparentHeader === "string"
      ? traceparentHeader
      : Array.isArray(traceparentHeader)
        ? traceparentHeader[0]
        : undefined;

  if (!raw) {
    return undefined;
  }

  const match = raw.match(/^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i);
  if (!match) {
    return undefined;
  }

  return `traceparent;desc="${raw.toLowerCase()}"`;
}

function attachServerTimingHeaderForRequest(
  request: FastifyRequest,
  reply: { header: (name: string, value: string) => void },
  spanContext?: SpanContext
) {
  if (spanContext && isSpanContextValid(spanContext)) {
    attachServerTimingHeaderFromContext(reply, spanContext);
    return;
  }

  const traceparent = extractTraceparentCandidate(request);
  if (traceparent) {
    reply.header("Server-Timing", traceparent);
  }
}

export function buildServer() {
  const app = Fastify({ loggerInstance: createServiceLogger("support-portal-api") });
  void buildNodeTelemetryConfig({ serviceName: "support-portal-api" });
  void app.register(cors, {
    origin: true,
    allowedHeaders: ["content-type", "traceparent", "tracestate", "baggage"],
    exposedHeaders: ["Server-Timing"]
  });
  app.addHook("preHandler", async (request) => {
    const routePath = request.routeOptions.url;
    const route = routes().find((candidate) => candidate.method === request.method && candidate.path === routePath);
    annotateServerEntrySpan({
      method: request.method,
      route: routePath,
      transaction: route?.businessTransaction,
      attributes: route?.telemetry
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

  app.get("/api/health", async () => ({ status: "ok", service: "support-portal-api" }));

  app.post("/api/support/respond", async (request, reply) => {
    request.log.info({ supportResponseRequest: request.body }, "forwarding support response request");
    annotateCurrentSpan(routes()[0].telemetry);
    const downstream = await runInSpan("support.gateway.forward_support_response", routes()[0].telemetry, () =>
      fetch(`${assistantServiceBaseUrl}/assistant/respond`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(request.body ?? {})
      })
    );
    const payload = await downstream.json();
    request.log.info({ downstreamStatus: downstream.status, supportResponseResponse: payload }, "support response request completed");

    attachServerTimingHeaderForRequest(request, reply, trace.getActiveSpan()?.spanContext());
    reply.code(downstream.status);
    return payload;
  });

  app.get("/api/cases/:caseId", async (request, reply) => {
    const caseId = (request.params as { caseId: string }).caseId;
    request.log.info({ accountId: caseId }, "looking up account status");
    annotateCurrentSpan({
      ...routes()[1].telemetry,
      "support.account_id": caseId
    });
    const downstream = await fetch(`${caseServiceBaseUrl}/cases/${encodeURIComponent(caseId)}`);
    const payload = await downstream.json();
    request.log.info({ accountId: caseId, downstreamStatus: downstream.status, accountPayload: payload }, "account status lookup completed");
    attachServerTimingHeaderForRequest(request, reply, trace.getActiveSpan()?.spanContext());
    reply.code(downstream.status);
    return payload;
  });

  app.get("/api/articles/search", async (request, reply) => {
    const query = (request.query as { q?: string }).q ?? "";
    request.log.info({ query }, "searching help article");
    annotateCurrentSpan({
      ...routes()[2].telemetry,
      "help_article.query_length": query.length
    });
    const downstream = await fetch(`${knowledgeServiceBaseUrl}/knowledge/query`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        transaction: BUSINESS_TRANSACTIONS.knowledgeArticleSearch,
        query
      })
    });
    const payload = await downstream.json();
    request.log.info({ query, downstreamStatus: downstream.status, articlePayload: payload }, "help article search completed");
    attachServerTimingHeaderForRequest(request, reply, trace.getActiveSpan()?.spanContext());
    reply.code(downstream.status);
    return payload;
  });

  return app;
}

if (process.env.NODE_ENV !== "test") {
  initSplunkNodeTelemetry("support-portal-api");
  const port = localServicePort(process.env, "API_GATEWAY_PORT", defaultPorts.apiGateway);
  const server = buildServer();
  server.log.info({ routes: routes() }, "api-gateway scaffold ready");
  server.listen({ port, host: "0.0.0.0" }).catch((error) => {
    server.log.error(error);
    process.exit(1);
  });
}
