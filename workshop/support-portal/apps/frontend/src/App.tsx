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
import { currentBrowserAppConfig } from "@support-portal/runtime-config/browser";
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
    "My support request is taking too long and I need help getting an update."
  );
  const [caseId, setCaseId] = useState("ACCT-4821");
  const [articleQuery, setArticleQuery] = useState("password reset account access");
  const [customerResult, setCustomerResult] = useState<CustomerResult>({
    title: "Support response",
    body: "Submit a support request, account lookup, or help article search to see customer-ready guidance here.",
    tone: "idle"
  });
  const [activeScenario, setActiveScenario] = useState("healthy");
  const [scenarioMessage, setScenarioMessage] = useState("No scenario active.");
  const [busyAction, setBusyAction] = useState<ActionKey>(null);

  const isIncidentActive = activeScenario !== "healthy";

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
      const response = await fetch(`${apiBaseUrl}/api/support/respond`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: supportPrompt })
      });

      if (!response.ok) {
        throw new Error(`Support request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as { response?: string; dependency?: { answer?: string; error?: string } };

      setCustomerResult({
        title: "Support guidance",
        body: payload.response ?? payload.dependency?.answer ?? "Your support response request was received.",
        detail: payload.dependency?.error,
        tone: payload.dependency?.error ? "error" : "success"
      });
    });
  }

  async function callCaseLookup() {
    await runAction("case", async () => {
      const response = await fetch(`${apiBaseUrl}/api/cases/${encodeURIComponent(caseId)}`);
      if (!response.ok) {
        throw new Error(`Account status lookup failed with status ${response.status}`);
      }
      const payload = (await response.json()) as { accountStatus?: string; nextStep?: string; accountId?: string };

      setCustomerResult({
        title: `Account ${payload.accountId ?? caseId}`,
        body: payload.accountStatus ?? "Account status is available.",
        detail: payload.nextStep,
        tone: "success"
      });
    });
  }

  async function callArticleSearch() {
    await runAction("article", async () => {
      const response = await fetch(`${apiBaseUrl}/api/articles/search?q=${encodeURIComponent(articleQuery)}`);
      if (!response.ok) {
        throw new Error(`Help Article search failed with status ${response.status}`);
      }
      const payload = (await response.json()) as { answer?: string; error?: string };

      setCustomerResult({
        title: "Help center",
        body: payload.answer ?? "Help Article lookup completed.",
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
      <nav className="portal-nav" aria-label="Support portal">
          <strong>Northstar Support</strong>
          <div>
          <span>Requests</span>
          <span>Accounts</span>
          <span>Help</span>
        </div>
      </nav>

      <header className="portal-hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <Sparkles size={16} aria-hidden="true" />
            Customer support
          </span>
          <h1>AI Support Portal</h1>
          <p>
            Check support request progress, confirm account status, and search help guidance from one support portal.
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
              <h2>AI Support Response</h2>
            </div>
            <span className={`status-pill ${isIncidentActive ? "status-risk" : "status-healthy"}`}>
              {isIncidentActive ? "At risk" : "Healthy"}
            </span>
          </div>
          <p className="panel-copy">
            Ask for a request update, support milestone, document requirement, or next step. This journey represents the
            customer-facing support response experience.
          </p>
          <label className="field-label" htmlFor="support-prompt">
            Support question
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
              Submit Support Request
            </IconButton>
            <span>Guided support assistance</span>
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
              <h3>Account Status Lookup</h3>
            </div>
            <p>Confirm account health and next steps for an open support case.</p>
            <label className="field-label" htmlFor="case-id">
              Account ID
            </label>
            <input
              id="case-id"
              className="input"
              value={caseId}
              onChange={(event) => setCaseId(event.target.value)}
            />
            <IconButton icon={ArrowRight} onClick={callCaseLookup} disabled={busyAction !== null}>
              Check Account
            </IconButton>
          </article>

          <article className="compact-panel">
            <div className="compact-title">
              <BookOpenText size={20} aria-hidden="true" />
              <h3>Help Article Search</h3>
            </div>
            <p>Search common support questions such as account access, billing, and troubleshooting steps.</p>
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
              Search Articles
            </IconButton>
          </article>
        </aside>
      </section>
    </main>
  );
}
