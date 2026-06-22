import test from "node:test";
import assert from "node:assert/strict";
import { parseAssistantEvidence } from "../../packages/evidence-parser/src/index.ts";
import { ACTION_TYPES, BUSINESS_TRANSACTIONS } from "../../packages/shared-types/src/index.ts";

test("parseAssistantEvidence extracts cache pressure remediation signals", () => {
  const parsed = parseAssistantEvidence({
    source: "splunk_ai_assistant",
    rawText: `High confidence latency regression detected.
Business transaction: AI Support Response
Service: support-knowledge
Disk utilization: cache mount above 90 percent
Latency evidence: support-knowledge p90 latency is elevated
Recommended action: clean_support_knowledge_cache.`
  });

  assert.equal(parsed.inferredTransaction, BUSINESS_TRANSACTIONS.customerSupportResponse);
  assert.equal(parsed.confidenceBand, "high");
  assert.deepEqual(parsed.candidateActions, [ACTION_TYPES.cleanServiceCache]);
  assert.match(parsed.likelyCause, /cache mount/);
  assert.match(parsed.likelyCause, /support-knowledge/);
});

test("parseAssistantEvidence includes restart only when it is explicitly recommended", () => {
  const parsed = parseAssistantEvidence({
    source: "splunk_ai_assistant",
    rawText: "High confidence service pressure on support-knowledge. Restart the service only if cache cleanup fails."
  });

  assert.equal(parsed.inferredTransaction, BUSINESS_TRANSACTIONS.customerSupportResponse);
  assert.deepEqual(parsed.candidateActions, [
    ACTION_TYPES.cleanServiceCache,
    ACTION_TYPES.restartService
  ]);
});

test("parseAssistantEvidence defaults to cache cleanup and medium confidence when evidence is sparse", () => {
  const parsed = parseAssistantEvidence({
    source: "splunk_ai_assistant",
    rawText: "Something is slow."
  });

  assert.equal(parsed.inferredTransaction, BUSINESS_TRANSACTIONS.customerSupportResponse);
  assert.equal(parsed.confidenceBand, "medium");
  assert.deepEqual(parsed.candidateActions, [ACTION_TYPES.cleanServiceCache]);
});

test("parseAssistantEvidence accepts legacy support aliases and returns support identifiers", () => {
  const parsed = parseAssistantEvidence({
    source: "splunk_ai_assistant",
    rawText: `Business transaction: customer_support_response
Service: support-knowledge
Recommended action: clean_service_cache.`
  });

  assert.equal(parsed.inferredTransaction, BUSINESS_TRANSACTIONS.customerSupportResponse);
  assert.equal(parsed.confidenceBand, "high");
  assert.deepEqual(parsed.candidateActions, [ACTION_TYPES.cleanServiceCache]);
});

test("parseAssistantEvidence honors explicit low confidence from Splunk AI", () => {
  const parsed = parseAssistantEvidence({
    source: "splunk_ai_assistant",
    rawText: `Confidence: low
Affected journey: AI Support Response
Suspect service: support-knowledge
Filesystem signal: No disk.utilization time series matched filters for mountpoint=/var/cache/support-knowledge on student-001 in the last -15m to now (empty result set), so filesystem evidence could not be confirmed from Metric Finder execution.
APM evidence: Unavailable due to APM query timeout, so I cannot provide latency/error evidence for support-knowledge from APM signals right now.
Likely cause: Insufficient signal retrieval.
Recommended action: clean_support_knowledge_cache.`
  });

  assert.equal(parsed.inferredTransaction, BUSINESS_TRANSACTIONS.customerSupportResponse);
  assert.equal(parsed.confidenceBand, "low");
  assert.deepEqual(parsed.candidateActions, [ACTION_TYPES.cleanServiceCache]);
  assert.equal(
    parsed.likelyCause,
    "Splunk AI did not confirm filesystem or APM evidence; keep remediation recommendation-only until signals are verified."
  );
});
