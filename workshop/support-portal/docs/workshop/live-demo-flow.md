# Live Demo Flow

This is the presenter script in operational form.

## Demo objective

Show a clear path from customer impact to governed remediation using default Splunk Observability signals.

The audience should leave understanding five points:

1. customer experience is the first signal
2. APM shows which service is slow
3. host filesystem metrics explain the infrastructure condition
4. the remediation path is bounded and governed
5. recovery is validated and auditable

## Demo sequence

### 1. Set the baseline

Say:

> We start in a healthy state with three customer journeys. Only one will degrade during the incident.

Show:

- the support portal
- one successful run of each transaction

### 2. Explain the application side

Say:

> This portal is what a customer or support representative would use to get an AI-generated support answer, check a case, or search a knowledge base. A portal like this matters because customers do not see microservices. They see whether the support experience works.

Show:

- `AI Support Response`
- `Account Status Lookup`
- `Help Article Search`

### 3. Trigger the fault

Click `Trigger Cache Pressure`.

Then run `AI Support Response` again.

Narrate:

> We are filling a bounded cache volume used by the support knowledge service. This creates real filesystem pressure in the lab environment and slows the support response path.

### 4. Show healthy comparison journeys

Re-run:

- `Account Status Lookup`
- `Help Article Search`

Narrate:

> The whole application is not down. We have one degraded journey and two healthy comparison journeys. That helps operators avoid broad, risky remediation.

### 5. Move to Splunk Observability

Keep this simple for students:

1. In RUM or Digital Experience, open the support portal application and confirm page or network activity if browser data is available.
2. In APM, open the service map or service list and find `support-knowledge`.
3. Open the `support-knowledge` service view before using related infrastructure. The trace waterfall can keep showing an old trace after service-to-host correlation has aged out.
4. In Infrastructure Monitoring, filter to the student `INSTANCE`.
5. Inspect filesystem utilization for `/var/cache/support-knowledge`.
6. Use APM and Infrastructure as the required proof path; keep `Account Status Lookup` and `Help Article Search` visible as healthy comparisons.

Use [Splunk Validation](splunk-validation.md) during rehearsal for the full checklist of expected RUM, APM, infrastructure, MCP, and remediation evidence.

Narrate:

> We are not relying on logs or custom demo metrics. We are using the default signals students should expect in a real environment: browser experience, APM service health, and host filesystem metrics from the collector.

Optional RUM click path:

1. Open `Digital Experience`.
2. Open the RUM application named `support-portal`.
3. Stay on `UX Metrics` or `Pages` only long enough to prove page traffic is arriving.
4. Click `Network Requests` and open `/api/support/respond` if it appears.
5. Treat `Custom Workflows` and `Session Search` as optional extras only; do not depend on them for the live proof.

### 6. Gather evidence

The preferred path is the operator console `Gather MCP Evidence` action. It opens a local incident and queries Splunk Observability Cloud MCP for alert, APM, trace, dependency, and metric evidence.

Use Splunk AI Assistant only as a fallback presenter path. If MCP is unavailable, use this prompt and paste the result as optional operator notes:

```text
Investigate the support portal incident over the last 15 minutes.

Scope the investigation to:
- service.instance.id = $INSTANCE
- deployment.environment = demo
- affected journey or business transaction = AI Support Response
- likely service = support-knowledge
- cache mountpoint = /var/cache/support-knowledge

Use default Splunk Observability signals only: RUM or browser experience, APM service latency/error evidence, and host filesystem metrics. Do not use logs and do not invent custom metrics.

Return a concise incident summary that includes:
- whether AI Support Response is degraded
- whether Account Status Lookup and Help Article Search remain healthy
- the likely affected service
- the filesystem signal for the cache mount or student instance
- the APM evidence that supports the finding
- confidence level
- one narrow recommended remediation action

End with exactly this remediation recommendation if the evidence supports it:
Recommended action: clean_support_knowledge_cache.
```

Fallback evidence if AI Assistant is unavailable:

```text
High confidence that support-knowledge cache filesystem pressure degraded the AI Support Response transaction.
Host filesystem utilization for the student instance is above threshold, and APM shows elevated support-knowledge request duration.
Account Status Lookup and Help Article Search remain healthy comparison journeys.
Recommended action: clean_support_knowledge_cache.
```

### 7. Open the evidence package

In the operator console:

1. leave `Evidence Intake` blank unless you are using fallback operator notes
2. click `Gather MCP Evidence`
3. click `Explain`
4. click `Propose`
5. review the evidence handoff, policy, and validation panels

Narrate:

> The orchestrator is the governance layer. It converts investigation context into structured evidence before the remediation agent is asked to act.

### 8. Explain the proposed action

Expected direction:

- confidence is high
- policy mode is approval required
- action is `clean_support_knowledge_cache`

Narrate:

> This is not arbitrary automation. The agent has a bounded toolset, the policy check gates execution, and the operator approves before action.

### 9. Approve and execute

Click the approval button when it is enabled.

Narrate:

> Approval calls the remediation agent. In this lab, the action clears the support-knowledge cache pressure through the scenario controller.

### 10. Validate recovery

Re-run `AI Support Response`.

Show:

- the portal response recovers
- the operator console validation panel updates
- Splunk APM and filesystem signals begin moving back toward normal

Narrate:

> The workshop ends on validation, not recommendation. If you cannot verify recovery, the remediation story is incomplete.

## Presenter pitfalls to avoid

- do not start with backend internals before showing customer impact
- do not imply Splunk directly invokes arbitrary external actions
- do not call the flow fully autonomous
- do not rely on logs for the main story
- do not mention custom demo metrics as the detector source
- do not skip recovery validation
