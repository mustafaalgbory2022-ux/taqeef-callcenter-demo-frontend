# Production frontend roadmap and status

Baseline: management demo `860ffa9` (branch `claude/affectionate-ritchie-cr40s7`, tag
`ord-0035-demo-v1` to be published locally). Development branch: `feature/taqeef-full-frontend`.

Status legend: ✅ done & tested · 🟡 partial · ⬜ not started. Every simulated workflow is
labelled in the UI; real operations are performed by the backend (see each module's notes).

## Gap analysis against the demo baseline

| #   | Module                 | Demo baseline                                        | Gap to close                                                                                 | Phase             |
| --- | ---------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------- |
| 1   | Executive dashboard    | Quality KPIs, criteria, agents (5 calls)             | Date ranges, PBX/SLA & queue metrics (6001/6002), trends                                     | A                 |
| 2   | Agent performance      | Agent dashboard, profiles                            | PBX KPIs per agent, trends over time, side-by-side comparison                                | A                 |
| 3   | Live call center       | —                                                    | Queue status, agent availability, live calls                                                 | A                 |
| 4   | Calls & recordings     | List, player, transcript, attribution                | Filters, pagination, masked caller numbers, review workflow                                  | A                 |
| 5   | AI quality             | Evaluations, evidence, scorecards, re-score, history | Reuse; extend in Phase B                                                                     | A/B               |
| 6   | Customer insights      | —                                                    | Call reasons, complaints, service requests, classifications                                  | A                 |
| 7   | Reports                | —                                                    | Weekly/monthly/yearly, queue + agent reports, Excel export, audio sampling, management email | A (+B scheduling) |
| 8   | Agent & queue admin    | Agent admin                                          | Queue administration ✅                                                                      | B                 |
| 9   | AI administration      | Planned page                                         | Models, jobs, prompts, dictionaries, Iraqi dialect corrections                               | B                 |
| 10  | PBX administration     | Planned page                                         | Yeastar connection, ingestion start date, sync, vendor adapters                              | B                 |
| 11  | Notifications          | Planned page                                         | Quality alerts, schedules, Microsoft 365 sender, templates                                   | B                 |
| 12  | Users & security       | Launch-code session only                             | Roles, accounts, mandatory TOTP MFA, verified email, recovery                                | C                 |
| 13  | Storage & backups      | Planned page                                         | Retention, recoverable deletion, backup/restore, migration                                   | C                 |
| 14  | System administration  | Planned page                                         | Health, GPU/RAM, queues, errors, audit logs, services                                        | C                 |
| 15  | General administration | Theme/language settings                              | Branding, language, application configuration                                                | C                 |

## Progress

| Phase                         | Scope                                                              | Status |
| ----------------------------- | ------------------------------------------------------------------ | ------ |
| A — Operations                | Executive dashboard, live center, agents, calls, insights, reports | ✅     |
| B — AI & integrations         | AI admin, dictionary, PBX admin, notifications, report scheduling  | ✅     |
| C — Security & infrastructure | Users, roles, MFA, backups, monitoring, audit                      | ⬜     |
| D — QA & handoff              | Accessibility, contracts, docs, tests                              | ⬜     |

## Phase A checkpoint

- ✅ Executive dashboard: date range presets/custom, queue/agent/version filters, PBX KPIs
  (incoming, answered, missed, abandoned, SLA, waits), daily trends, queue table, weekly quality trend.
- ✅ Agent performance: comparison page (alphabetical, sample sizes, sparklines, hide/show),
  agent dashboard with date range, agent PBX figures (no per-agent SLA) and quality trend.
- ✅ Live center: queue status, agent availability, live calls with masked callers (simulated, 5 s polling).
- ✅ Calls: filters (date, queue, agent, reason, score band, review, search) in the URL, pagination,
  masked caller numbers, classification badges, supervisor review with validation.
- ✅ Customer insights: reasons, complaints, service requests, weekly complaint trend, drill-through.
- ✅ Reports: weekly/monthly/yearly/custom, queue + agent reports, .xlsx export (dependency-free),
  audited random audio sample (5 × ≥ 60 s per agent), report history, simulated management email.
- Data: ~280 deterministic synthetic PBX-ingested calls (Aug–Oct 2026), synthetic Yeastar daily statistics.
- Tests: 76 unit, 142 Playwright (desktop + mobile, axe on 12 pages × EN/AR × light/dark).

## Phase B checkpoint

All Phase B screens are GUI-managed API resources (`src/shared/api/adapters/*`), validated on
the client and by the simulated backend (422 mapped to fields), permission-gated, confirmed when
destructive (server 409 without `confirm`), and audited in the append-only log
(`GET /admin/audit`, `AuditTrail`). Everything is labelled simulated/synthetic.

- ✅ Queue administration (`/admin/queues`): add, edit, disable (never delete); renumbering,
  disabling and removing agents need confirmation; agent assignments; per-queue history. New
  queues get no invented PBX statistics.
- ✅ AI administration (`/admin/ai`): local model catalogue (unavailable/incompatible models
  rejected), language and speaker separation, dictionary use, processing limits, job queue
  (pause/resume, retry within the limit, cancel), evaluation rules with latest/pinned scorecard
  binding, prompt templates with placeholder validation, immutable configuration versions,
  simulated service status.
- ✅ Iraqi Arabic dictionary (`/admin/dictionary`): dialect expressions, spelling variants and
  product terms; normalized Arabic search; add, edit, disable; immutable per-entry versions;
  supervised corrections with a four-eyes review (approved spellings become variants).
- ✅ PBX administration (`/admin/pbx`): Yeastar P550 connector from a replaceable vendor
  form-adapter registry, write-only secret, queues 6001/6002, ingestion start date and
  polling interval (confirmation for changes), simulated connection test, ingestion on/off,
  manual synchronization with history. Starts unconfigured — nothing invented.
- ✅ Notifications and email (`/admin/notifications`): dedicated Microsoft 365 sender
  (write-only secret, simulated test and test email), low-quality notification rules,
  management report email options, versioned templates with preview, delivery history
  (emailing a saved report records a simulated delivery).
- ✅ Report configuration (`/admin/reports`): versioned sampling policy (approved 5 × ≥ 60 s;
  departures warned and audited), default queues/agents, delivery option, manual weekly or
  custom-range generation; automatic scheduling locked (server 403).
- Tests: 111 unit; Playwright adds one spec per module and axe on the six new pages
  (EN/AR × light/dark, desktop + mobile).
