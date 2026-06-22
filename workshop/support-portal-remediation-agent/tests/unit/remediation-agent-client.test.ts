import test from "node:test";
import assert from "node:assert/strict";
import { RemediationAgentClient } from "../../apps/remediation-orchestrator/src/agent-client.ts";
import {
  ACTION_TYPES,
  BUSINESS_TRANSACTIONS,
  POLICY_MODES,
  type EvidenceBundle
} from "../../packages/shared-types/src/index.ts";

function buildEvidence(): EvidenceBundle {
  return {
    incidentId: "incident-agent-client",
    scenarioId: "cache-disk-pressure",
    detector: {
      detectorId: "detector-cache",
      detectorName: "Claims Knowledge Cache Volume Pressure",
      severity: "critical",
      triggeredAt: "2026-06-03T12:00:00Z",
      dimensions: {
        service: "claims-knowledge",
        environment: "demo"
      }
    },
    browserExperience: {
      affectedSessions: 4,
      frustrationSignals: ["rage_click"],
      affectedJourney: BUSINESS_TRANSACTIONS.customerSupportResponse
    },
    serviceImpact: {
      affectedServices: ["claims-knowledge"],
      suspectService: "claims-knowledge",
      p95LatencyMs: 2400,
      affectedTransactions: [BUSINESS_TRANSACTIONS.customerSupportResponse]
    },
    investigation: {
      likelyCause: "claims-knowledge cache filesystem pressure",
      confidenceBand: "high"
    },
    candidateActions: [ACTION_TYPES.cleanServiceCache],
    sourceNotes: {
      enrichmentApplied: true,
      apiEnrichmentSources: ["mcp:get_apm_service_latency", "mcp:execute_signalflow_program"]
    }
  };
}

test("RemediationAgentClient reports agent health failures as unavailable", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response("nope", { status: 503 })) as typeof fetch;

  try {
    const client = new RemediationAgentClient("http://agent.local");
    assert.deepEqual(await client.health(), {
      status: "unavailable",
      error: "remediation agent returned 503"
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("RemediationAgentClient maps agent evaluation into a bounded proposed action", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody: unknown;

  globalThis.fetch = (async (url, init) => {
    assert.equal(String(url), "http://agent.local/agent/evaluate");
    requestBody = JSON.parse(String(init?.body));
    return new Response(
      JSON.stringify({
        incidentId: "incident-agent-client",
        recommendedAction: "clean_claims_knowledge_cache",
        model: "gpt-4.1-mini",
        confidenceBand: "high",
        reasoningSummary: "Clean the bounded claims knowledge cache.",
        needsApproval: true
      })
    );
  }) as typeof fetch;

  try {
    const client = new RemediationAgentClient("http://agent.local");
    const action = await client.evaluate(buildEvidence(), POLICY_MODES.approvalRequired);

    assert.deepEqual(requestBody, {
      incidentId: "incident-agent-client",
      candidateActions: ["clean_claims_knowledge_cache"],
      likelyCause: "claims-knowledge cache filesystem pressure",
      confidenceBand: "high"
    });
    assert.equal(action.incidentId, "incident-agent-client");
    assert.equal(action.type, ACTION_TYPES.cleanServiceCache);
    assert.equal(action.target, "claims-knowledge-cache");
    assert.equal(action.policyMode, POLICY_MODES.approvalRequired);
    assert.equal(action.status, "proposed");
    assert.ok(action.validationPlan.some((step) => /claims-knowledge latency/.test(step)));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
