#!/usr/bin/env node

const baseUrl = process.env.SIMULATOR_BASE_URL ?? "http://127.0.0.1:18100";
const scenarioControllerUrl = process.env.SIMULATOR_SCENARIO_CONTROLLER_URL ?? "http://127.0.0.1:18104";
const scenarioMode = process.env.SIMULATOR_SCENARIO ?? "current";
const resetScenarioAfterRun = process.env.SIMULATOR_RESET_AFTER_RUN === "true";
const durationSeconds = Number.parseInt(process.env.SIMULATOR_DURATION_SECONDS ?? "120", 10);
const intervalMs = Number.parseInt(process.env.SIMULATOR_INTERVAL_MS ?? "500", 10);
const mix = process.env.SIMULATOR_MIX ?? "support-heavy";

const supportPrompt = {
  prompt: "My support request has not been updated and I need help understanding the next step."
};

const articleQuery = "password reset turnaround";
const caseId = "CASE-4821";

function pickTransaction() {
  const roll = Math.random();

  if (mix === "support-only") {
    return "support";
  }

  if (mix === "balanced") {
    if (roll < 0.34) {
      return "support";
    }

    if (roll < 0.67) {
      return "case";
    }

    return "article";
  }

  if (roll < 0.75) {
    return "support";
  }

  if (roll < 0.9) {
    return "case";
  }

  return "article";
}

async function fireSupportRequest() {
  return fetch(`${baseUrl}/api/support/respond`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(supportPrompt)
  });
}

async function fireCaseLookup() {
  return fetch(`${baseUrl}/api/cases/${caseId}`);
}

async function fireArticleSearch() {
  return fetch(`${baseUrl}/api/articles/search?q=${encodeURIComponent(articleQuery)}`);
}

async function setScenario(mode) {
  if (mode === "current") {
    return;
  }

  const path = mode === "healthy" ? "/scenario/reset" : `/scenario/activate/${encodeURIComponent(mode)}`;
  const response = await fetch(`${scenarioControllerUrl}${path}`, {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(`Scenario request failed with status ${response.status}`);
  }
}

async function runOneRequest() {
  const transaction = pickTransaction();
  const started = Date.now();

  try {
    const response =
      transaction === "support"
        ? await fireSupportRequest()
        : transaction === "case"
          ? await fireCaseLookup()
          : await fireArticleSearch();

    const elapsedMs = Date.now() - started;
    console.log(
      JSON.stringify({
        transaction:
          transaction === "support" ? "support_response" : transaction === "case" ? "account_status" : "help_article",
        status: response.status,
        ok: response.ok,
        elapsedMs
      })
    );
  } catch (error) {
    console.log(
      JSON.stringify({
        transaction:
          transaction === "support" ? "support_response" : transaction === "case" ? "account_status" : "help_article",
        status: 0,
        ok: false,
        elapsedMs: Date.now() - started,
        error: error instanceof Error ? error.message : String(error)
      })
    );
  }
}

async function main() {
  const deadline = Date.now() + durationSeconds * 1000;

  console.log(
    JSON.stringify({
      baseUrl,
      scenarioControllerUrl,
      scenarioMode,
      durationSeconds,
      intervalMs,
      mix
    })
  );

  while (Date.now() < deadline) {
    await runOneRequest();
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

try {
  await setScenario(scenarioMode);
  await main();
} finally {
  if (resetScenarioAfterRun) {
    await setScenario("healthy");
  }
}
