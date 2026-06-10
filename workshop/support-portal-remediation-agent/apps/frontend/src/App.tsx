import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  FileSearch,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Zap
} from "lucide-react";
import { currentBrowserAppConfig } from "@ibobs/runtime-config/browser";
import { setJourneyContext, trackBusinessTransaction } from "./rum";
import "./App.css";

type ActionKey =
  | "support"
  | "case"
  | "article"
  | "pressure"
  | "reset"
  | "refresh"
  | null;

type CustomerResult = {
  title: string;
  body: string;
  detail?: string;
  tone: "idle" | "success" | "error";
};

function formatScenarioLabel(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatActionError(error: unknown, action: Exclude<ActionKey, null>) {
  const message = error instanceof Error ? error.message : String(error);
  if (message === "Failed to fetch") {
    return action === "support" || action === "case" || action === "article"
      ? "API gateway unavailable for this transaction."
      : "Scenario controller unavailable.";
  }

  return message;
}

function IconButton({
  children,
  icon: Icon,
  onClick,
  disabled,
  variant = "secondary"
}: {
  children: string;
  icon: typeof Send;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <button className={`button button-${variant}`} onClick={onClick} disabled={disabled}>
      <Icon size={17} aria-hidden="true" />
      <span>{children}</span>
    </button>
  );
}

export function App() {
  const { apiBaseUrl, scenarioControllerBaseUrl } = currentBrowserAppConfig();
  const [supportPrompt, setSupportPrompt] = useState(
    "My auto claim status has not updated and I need to know what is delaying payment."
  );
  const [caseId, setCaseId] = useState("POL-4821");
  const [articleQuery, setArticleQuery] = useState("rental reimbursement deductible");
  const [customerResult, setCustomerResult] = useState<CustomerResult>({
    title: "Claims support response",
    body: "Submit a claim question, policy lookup, or FAQ search to see customer-ready guidance here.",
    tone: "idle"
  });
  const [activeScenario, setActiveScenario] = useState("healthy");
  const [scenarioMessage, setScenarioMessage] = useState("No scenario active.");
  const [busyAction, setBusyAction] = useState<ActionKey>(null);

  const isIncidentActive = activeScenario !== "healthy";

  useEffect(() => {
    setJourneyContext({
      "app.active_scenario": activeScenario
    });
  }, [activeScenario]);

  useEffect(() => {
    void refreshScenario();
  }, []);

  async function runAction(action: Exclude<ActionKey, null>, fn: () => Promise<void>) {
    setBusyAction(action);

    try {
      await fn();
    } catch (error) {
      const message = formatActionError(error, action);
      if (action === "support" || action === "case" || action === "article") {
        setCustomerResult({
          title: "Request unavailable",
          body: message,
          tone: "error"
        });
      } else {
        setScenarioMessage(message);
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function callSupportResponse() {
    await runAction("support", async () => {
      const payload = await trackBusinessTransaction(
        "claim_status_response",
        "claim_status_submit",
        {
          "app.business_transaction": "claim_status_response",
          "app.transaction_name": "AI Claim Status",
          "app.active_scenario": activeScenario,
          "app.ui_surface": "claims_portal"
        },
        async () => {
          const response = await fetch(`${apiBaseUrl}/api/support/respond`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ prompt: supportPrompt })
          });

          if (!response.ok) {
            throw new Error(`Claim status request failed with status ${response.status}`);
          }

          return response.json();
        }
      ) as { response?: string; dependency?: { answer?: string; error?: string } };

      setCustomerResult({
        title: "Claim status guidance",
        body: payload.response ?? payload.dependency?.answer ?? "Your claim status request was received.",
        detail: payload.dependency?.error,
        tone: payload.dependency?.error ? "error" : "success"
      });
    });
  }

  async function callCaseLookup() {
    await runAction("case", async () => {
      const payload = await trackBusinessTransaction(
        "policy_coverage_lookup",
        "policy_coverage_lookup",
        {
          "app.business_transaction": "policy_coverage_lookup",
          "app.transaction_name": "Policy Coverage Lookup",
          "app.active_scenario": activeScenario,
          "app.ui_surface": "claims_portal"
        },
        async () => {
          const response = await fetch(`${apiBaseUrl}/api/cases/${encodeURIComponent(caseId)}`);
          if (!response.ok) {
            throw new Error(`Policy coverage lookup failed with status ${response.status}`);
          }
          return response.json();
        }
      ) as { coverageStatus?: string; nextStep?: string; policyId?: string };

      setCustomerResult({
        title: `Policy ${payload.policyId ?? caseId}`,
        body: payload.coverageStatus ?? "Coverage information is available for this policy.",
        detail: payload.nextStep,
        tone: "success"
      });
    });
  }

  async function callArticleSearch() {
    await runAction("article", async () => {
      const payload = await trackBusinessTransaction(
        "claims_faq_search",
        "claims_faq_search",
        {
          "app.business_transaction": "claims_faq_search",
          "app.transaction_name": "Claims FAQ Search",
          "app.active_scenario": activeScenario,
          "app.ui_surface": "claims_portal"
        },
        async () => {
          const response = await fetch(`${apiBaseUrl}/api/articles/search?q=${encodeURIComponent(articleQuery)}`);
          if (!response.ok) {
            throw new Error(`Claims FAQ search failed with status ${response.status}`);
          }
          return response.json();
        }
      ) as { answer?: string; error?: string };

      setCustomerResult({
        title: "Claims help center",
        body: payload.answer ?? "Claims FAQ lookup completed.",
        detail: payload.error,
        tone: payload.error ? "error" : "success"
      });
    });
  }

  async function refreshScenario() {
    try {
      const response = await fetch(`${scenarioControllerBaseUrl}/scenario/state`);
      const payload = (await response.json()) as { activeScenario: string };
      setActiveScenario(payload.activeScenario);
      setScenarioMessage(
        payload.activeScenario === "healthy"
          ? "No scenario active."
          : `Scenario active: ${formatScenarioLabel(payload.activeScenario)}`
      );
    } catch (error) {
      setScenarioMessage(formatActionError(error, "refresh"));
    }
  }

  async function activateScenario(scenarioId: string) {
    await runAction("pressure", async () => {
      const response = await fetch(`${scenarioControllerBaseUrl}/scenario/activate/${scenarioId}`, {
        method: "POST"
      });
      const payload = (await response.json()) as { activeScenario: string };
      setActiveScenario(payload.activeScenario);
      setScenarioMessage(`Scenario active: ${formatScenarioLabel(payload.activeScenario)}`);
    });
  }

  async function resetScenario() {
    await runAction("reset", async () => {
      const response = await fetch(`${scenarioControllerBaseUrl}/scenario/reset`, {
        method: "POST"
      });
      const payload = (await response.json()) as { activeScenario: string };
      setActiveScenario(payload.activeScenario);
      setScenarioMessage("Scenario reset to healthy.");
    });
  }

  return (
    <main className="portal-shell">
      <nav className="portal-nav" aria-label="Claims portal">
        <strong>Northstar Mutual Insurance</strong>
        <div>
          <span>Claims</span>
          <span>Coverage</span>
          <span>Support</span>
        </div>
      </nav>

      <header className="portal-hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <Sparkles size={16} aria-hidden="true" />
            Customer claims support
          </span>
          <h1>AI Claims Portal</h1>
          <p>
            Check claim progress, confirm policy coverage, and search claims guidance from one insurance service
            portal.
          </p>
        </div>

        <div className="command-card">
          <div className="command-card-header">
            <span>Scenario State</span>
            <span className={`status-pill ${isIncidentActive ? "status-risk" : "status-healthy"}`}>
              {isIncidentActive ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
              {formatScenarioLabel(activeScenario)}
            </span>
          </div>
          <p>{scenarioMessage}</p>
          <div className="command-actions">
            <IconButton
              icon={Zap}
              onClick={() => activateScenario("cache-disk-pressure")}
              disabled={busyAction !== null}
              variant="danger"
            >
              Trigger Cache Pressure
            </IconButton>
            <IconButton icon={RotateCcw} onClick={resetScenario} disabled={busyAction !== null}>
              Reset
            </IconButton>
            <IconButton icon={RefreshCw} onClick={refreshScenario} disabled={busyAction !== null}>
              Refresh
            </IconButton>
          </div>
        </div>
      </header>

      <section className="workspace-grid">
        <article className="workspace-primary">
          <div className="section-heading">
            <div>
              <span className="section-kicker">Primary customer journey</span>
              <h2>AI Claim Status</h2>
            </div>
            <span className={`status-pill ${isIncidentActive ? "status-risk" : "status-healthy"}`}>
              {isIncidentActive ? "At risk" : "Healthy"}
            </span>
          </div>
          <p className="panel-copy">
            Ask for a payment update, claim milestone, document requirement, or next step. This journey represents the
            customer-facing claim status experience.
          </p>
          <label className="field-label" htmlFor="support-prompt">
            Claim question
          </label>
          <textarea
            id="support-prompt"
            value={supportPrompt}
            onChange={(event) => setSupportPrompt(event.target.value)}
            rows={7}
            className="textarea"
          />
          <div className="panel-footer">
            <IconButton
              icon={Send}
              onClick={callSupportResponse}
              disabled={busyAction !== null}
              variant="primary"
            >
              Submit Claim Status
            </IconButton>
            <span>Secure claim assistance</span>
          </div>
          <div className={`customer-response response-${customerResult.tone}`} role="status">
            <span className="section-kicker">Latest response</span>
            <h3>{customerResult.title}</h3>
            <p>{customerResult.body}</p>
            {customerResult.detail ? <small>{customerResult.detail}</small> : null}
          </div>
        </article>

        <aside className="side-stack">
          <article className="compact-panel">
            <div className="compact-title">
              <FileSearch size={20} aria-hidden="true" />
              <h3>Policy Coverage Lookup</h3>
            </div>
            <p>Confirm active coverage and next steps for a policy tied to an open claim.</p>
            <label className="field-label" htmlFor="case-id">
              Policy ID
            </label>
            <input
              id="case-id"
              className="input"
              value={caseId}
              onChange={(event) => setCaseId(event.target.value)}
            />
            <IconButton icon={ArrowRight} onClick={callCaseLookup} disabled={busyAction !== null}>
              Check Coverage
            </IconButton>
          </article>

          <article className="compact-panel">
            <div className="compact-title">
              <BookOpenText size={20} aria-hidden="true" />
              <h3>Claims FAQ Search</h3>
            </div>
            <p>Search common claim questions such as rental reimbursement, deductibles, and repair timelines.</p>
            <label className="field-label" htmlFor="article-query">
              Search query
            </label>
            <input
              id="article-query"
              className="input"
              value={articleQuery}
              onChange={(event) => setArticleQuery(event.target.value)}
            />
            <IconButton icon={Search} onClick={callArticleSearch} disabled={busyAction !== null}>
              Search FAQ
            </IconButton>
          </article>
        </aside>
      </section>
    </main>
  );
}
