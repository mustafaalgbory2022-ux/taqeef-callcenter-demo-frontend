# Requirement: Agent dashboards and profiles (mandatory)

Status: **approved requirement, not yet implemented** — scheduled into the phases below once
local frontend integration details (ORD-0035) are confirmed.

Context: four call center agents today, each identified by a Yeastar extension or agent
number. Capacity required for at least seven agents. Demo data: five synthetic recordings.

## Requirements

| ID     | Requirement                                                                                                                   |
| ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| AGT-01 | Overall dashboard combining all selected agents.                                                                              |
| AGT-02 | Individual performance dashboard per agent.                                                                                   |
| AGT-03 | Configurable agent profiles: name, extension/agent number, status, queue assignment.                                          |
| AGT-04 | Filter: _All agents_ or a specific agent, applied consistently across dashboard, calls and evaluations.                       |
| AGT-05 | Per agent: evaluated-call count, average quality score (/10), calls below threshold, criterion-level performance.             |
| AGT-06 | Click-through from an agent dashboard to that agent's calls, transcripts, recordings and evaluation evidence.                 |
| AGT-07 | Historical comparison and re-scoring results by agent.                                                                        |
| AGT-08 | Add or disable agents without code changes; layouts and filters designed and tested for ≥ 7 agents.                           |
| AGT-09 | Missed, abandoned and SLA figures kept separate, shown only when PBX metadata is available; never derived from audio samples. |
| AGT-10 | Synthetic agent identifiers until the real extension numbers are supplied.                                                    |

## Design rules

### Aggregation (AGT-01, AGT-05)

- The overall figures are computed from **pooled call-level data**:
  `overall average = Σ call scores / number of evaluated calls` across the selected agents.
  **Never** the unweighted mean of agent averages.
- Criterion-level averages are pooled the same way: over all evaluated calls where that
  criterion was scored.
- Each call contributes its **current evaluation** (the latest one, not superseded by a re-score).
  Superseded evaluations are used only in history views.
- "Below threshold" = calls whose overall score is below the `passThreshold` of the scorecard
  version that evaluated them.
- If the selection contains evaluations from **different scorecard versions**, the dashboard
  says so and lets the user filter by version; criterion comparisons only match criteria by id
  within compatible versions.
- Every figure states its basis: "n = X evaluated calls".

### Sample-only presentation

- With the demo set (5 calls across 4 agents), every per-agent view shows a persistent
  **"Sample only — n = X calls. Not a performance ranking."** notice.
- **Sample-size warnings stay on for all per-agent results** until an approved reporting
  policy is set. No invented minimum sample size switches them off automatically. When a
  policy is approved, it will be implemented as a server-side reporting setting managed in the
  GUI (see `gui-administration.md`).
- No leaderboards, rank numbers, "best/worst agent" labels, or default sorting by score.
  Agent lists sort by name or extension. Comparing agents side by side is allowed only with
  n shown for each.

### Agent profiles (AGT-03, AGT-08, AGT-10)

- Agents are **data, not code**: loaded from the API, managed in a settings screen
  (create, edit, disable). No agent ids, names or counts in the source code.
- Status: `active` | `inactive`. Disabling hides the agent from default filters but keeps
  their historical calls and evaluations; an "Include inactive agents" toggle shows them.
  Agents are never hard-deleted from the UI.
- An agent can belong to several queues.
- Four agents initially, all configurable; the design must support at least seven.
- Each agent has a **stable internal `id`** and a **configurable Yeastar extension**. Changing
  the extension does not break history.
- Synthetic identifiers until real ones are supplied: names "Agent A–D" / "الموظف أ–د",
  extensions `SYN-101`…`SYN-104`, all flagged `synthetic: true` and labelled in the UI.
  The test suite also uses an 8-agent fixture to verify the ≥ 7 capacity.

### Filters and navigation (AGT-04, AGT-06)

- Agent filter is a searchable select (works with 7+ agents), not tabs.
- Filter state lives in the URL (`?agent=all` | `?agent=<id>`) so views are shareable and
  the back button works; it carries across Dashboard → Calls → Call detail.
- Proposed routes: `/dashboard?agent=`, `/agents`, `/agents/:agentId`,
  `/calls?agent=`, `/calls/:callId` (recording, transcript, evaluations),
  `/calls/:callId?t=<ms>&criterion=<id>` for deep links to evidence timestamps,
  `/settings/agents`.

### History and re-scoring (AGT-07)

- Per agent: list of re-scored calls with previous vs current overall and criterion scores,
  deltas, scorecard versions and dates; trend of the agent's pooled average by evaluation
  date (shown as sample-only while n is small).

### PBX metrics (AGT-09)

- A separate "Call handling (PBX)" section, visually and structurally distinct from
  quality scores. Its data comes only from a PBX metrics endpoint.
- Until PBX metadata exists the section shows "Not available — awaiting PBX data"
  with no numbers or placeholder values. Missed, abandoned and SLA figures are never estimated from
  recordings.
- **Official SLA formula:** `SLA % = (Total incoming − Missed) / Total incoming × 100`.
  - Abandoned calls are a **separate figure** and are not subtracted in this formula.
  - Missed and abandoned are always shown as separate figures, never combined.
  - Total incoming = 0 → SLA shows "Not available", not 0% or 100%.
  - Display one decimal place, with the counts used (total incoming, missed) beside it.

## Proposed contract additions (draft, not yet in code)

See `docs/fastapi-adapter.md` → _Agents (planned)_. Summary:

- `Agent { id, displayName, extension, agentNumber|null, status, queueIds[], synthetic, createdAt, updatedAt }`
- `Queue { id, name {ar,en} }`
- `Call.agentAlias` → `Call.agentId` (reference to `Agent.id`).
- `PbxAgentMetrics` (optional; `null`/404 = not available).
- Aggregation is computed client-side from calls and evaluations by default (correct for the demo
  scale); a server summary endpoint can replace it without UI changes if the backend provides one.

## Phase placement

Demo scope and future administration areas: see `docs/requirements/gui-administration.md`.

| Phase | Agent work                                                                                                                      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Routes incl. `/agents`, URL-based agent filter in the shell                                                                     |
| 2     | Agent + Queue schemas, synthetic agents (4 + 8-agent test fixture), mock handlers, pooled aggregation functions with unit tests |
| 3     | Calls list filtered by agent; call detail shows agent; evidence deep links                                                      |
| 4–5   | Re-score and history views by agent                                                                                             |
| 6     | Overall and per-agent dashboards, sample-only notices, PBX placeholder section                                                  |
| 7     | Agent settings screen (add / edit / disable), a11y + QA review incl. 8-agent layout                                             |
