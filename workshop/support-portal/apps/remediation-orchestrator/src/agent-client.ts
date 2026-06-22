import type {
  ActionExecutionResult,
  ActionVerificationResult,
  EvidenceBundle,
  ProposedAction
} from "@support-portal/shared-types";

type AgentEvaluationResponse = {
  incidentId: string;
  recommendedAction: string;
  model: string;
  confidenceBand: "low" | "medium" | "high";
  reasoningSummary: string;
  needsApproval: boolean;
};

export type AgentHealthResponse = {
  status: string;
  model: string;
  telemetry: string;
};

export class RemediationAgentClient {
  constructor(private readonly baseUrl: string) {}

  async health(): Promise<AgentHealthResponse | { status: "unavailable"; error: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/agent/health`);
      if (!response.ok) {
        return {
          status: "unavailable",
          error: `remediation agent returned ${response.status}`
        };
      }
      return response.json() as Promise<AgentHealthResponse>;
    } catch (error) {
      return {
        status: "unavailable",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async evaluate(evidence: EvidenceBundle, policyMode: ProposedAction["policyMode"]): Promise<ProposedAction> {
    const response = await fetch(`${this.baseUrl}/agent/evaluate`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        incidentId: evidence.incidentId,
        candidateActions: evidence.candidateActions,
        likelyCause: evidence.investigation.likelyCause,
        confidenceBand: evidence.investigation.confidenceBand
      })
    });

    const payload = (await response.json()) as AgentEvaluationResponse;

    return {
      actionId: `action-${Date.now()}`,
      incidentId: payload.incidentId,
      type: payload.recommendedAction as ProposedAction["type"],
      target: "support-knowledge-cache",
      confidenceBand: payload.confidenceBand,
      policyMode,
      reasoningSummary: payload.reasoningSummary,
      validationPlan: [
        "Confirm cache filesystem utilization drops in Infrastructure Monitoring",
        "Check support-knowledge latency in APM",
        "Run AI Support Response validation from the portal"
      ],
      status: "proposed"
    };
  }

  async execute(action: ProposedAction): Promise<ActionExecutionResult> {
    const response = await fetch(`${this.baseUrl}/agent/execute/${action.actionId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        incidentId: action.incidentId,
        actionType: action.type,
        target: action.target
      })
    });

    return response.json() as Promise<ActionExecutionResult>;
  }

  async verify(action: ProposedAction): Promise<ActionVerificationResult> {
    const response = await fetch(`${this.baseUrl}/agent/verify/${action.actionId}`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        incidentId: action.incidentId,
        actionType: action.type,
        target: action.target
      })
    });

    return response.json() as Promise<ActionVerificationResult>;
  }
}
