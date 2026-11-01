# Requirement: Full GUI administration (mandatory, product-wide)

Status: **approved requirement.** The current five-call demo implements only the demo scope
below; all other areas are recorded as **future production requirements** and are not
built during the demo.

## Principle

After installation, Taqeef Call Center AI must be fully manageable through its GUI.
Normal administration must never require PowerShell, CMD, SSH, database queries,
configuration-file editing or source-code changes.

## Cross-cutting rules (apply to every management action)

| ID     | Rule                                                                                                                                                                 |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GUI-X1 | **Validation:** client-side with clear field-level messages in AR/EN, and server validation errors (422) mapped to the same fields.                                  |
| GUI-X2 | **Permissions:** each action requires a named permission; the UI hides or disables what the user may not do and explains why. The server is the authority.           |
| GUI-X3 | **Feedback:** every action confirms success or failure; long operations show progress and can be revisited; destructive actions require confirmation.                |
| GUI-X4 | **Audit history:** every change records who, what, when, before/after; visible in the GUI and filterable.                                                            |
| GUI-X5 | **No hidden configuration:** a setting an administrator may need to change must be editable in the GUI and stored server-side, not in build-time variables or files. |
| GUI-X6 | **Bilingual and accessible:** all admin screens meet the same AR/EN, RTL and WCAG 2.2 AA rules as the rest of the app.                                               |

## Administration areas

| ID     | Area                                                              | Demo                                                                   |
| ------ | ----------------------------------------------------------------- | ---------------------------------------------------------------------- |
| ADM-01 | Overall and individual agent performance                          | **Demo**                                                               |
| ADM-02 | Agent profiles, Yeastar extensions and queue assignments          | **Demo (basic)**                                                       |
| ADM-03 | PBX connections and call ingestion                                | Future                                                                 |
| ADM-04 | AI models, prompts, Iraqi dialect dictionary, processing controls | Future                                                                 |
| ADM-05 | KPI scorecards, thresholds, prohibited phrases, re-scoring        | **Demo (scorecard, threshold, re-scoring)**; prohibited phrases future |
| ADM-06 | Calls, transcripts, classifications and corrections               | **Demo (upload and review)**; classifications/corrections future       |
| ADM-07 | Reports, exports and email notifications                          | Future                                                                 |
| ADM-08 | Users, roles, MFA and security                                    | Future                                                                 |
| ADM-09 | Storage, retention, backup and restore                            | Future                                                                 |
| ADM-10 | System health, errors, diagnostics, application settings          | Future                                                                 |
| ADM-11 | English/Arabic localization, branding and themes                  | **Demo (theme and language)**; branding management future              |

## Demo scope (five-call management demo)

1. Overall dashboard (all selected agents, pooled per call).
2. Individual agent dashboards (sample-only).
3. Basic agent management: add, edit, disable; name, Yeastar extension, status, queues.
4. Call upload and review: recording playback, timestamped transcript, evaluation evidence.
5. Editable scorecard: criteria, weights, threshold; saving creates a new version.
6. Re-scoring and evaluation comparison (previous vs current, per call and by agent).
7. Theme and language settings.

Demo treatment of the cross-cutting rules:

- **Validation and feedback:** fully implemented for the demo screens.
- **Permissions:** no authentication in the demo. It runs as one synthetic administrator, clearly
  labelled. The UI is built to check permissions from the start, so roles can be enabled
  later without restructuring.
- **Audit:** scorecard versions and evaluation history are inherently versioned; agent changes
  show a simple change history from mock data. The production audit log (GUI-X4) is future.

## Future production requirements (recorded, not built in the demo)

- **ADM-03 PBX and ingestion:** Yeastar connection setup and test, ingestion schedule and
  status, failed-ingestion queue with retry, CDR/queue-statistics import for missed,
  abandoned and SLA metrics.
- **ADM-04 AI and processing:** model selection, prompt management with versioning, Iraqi
  dialect dictionary (add, edit, import), processing queue controls (pause, resume,
  priority, re-run).
- **ADM-05 extended:** prohibited-phrase lists with matching rules; bulk re-scoring with
  progress.
- **ADM-06 extended:** call classifications, transcript corrections with audit, reviewer
  overrides of AI scores.
- **ADM-07 Reporting:** scheduled and on-demand reports, CSV/XLSX/PDF exports, email
  notification rules and SMTP configuration with a test send.
- **ADM-08 Security:** users, roles and permissions, MFA enrolment and reset, session
  policies, security audit log.
- **ADM-09 Data lifecycle:** storage locations and usage, retention policies, backup
  schedule, restore with confirmation and verification.
- **ADM-10 Operations:** service health dashboard, error log browser, diagnostics bundle
  download, general application settings.
- **ADM-11 extended:** branding management in the GUI (logo upload, brand colours with
  contrast validation), default language and theme for all users, managing translations.

## Frontend architecture implications (applied from now on)

- **Runtime configuration over build-time configuration.** `VITE_*` variables are developer
  settings only (mock/live mode for development). Production builds default to the
  same-origin `/api`, so installation needs no file editing.
- **Branding:** `src/styles/brand.css` and `brand.config.ts` remain the defaults. Production
  branding will be loaded from a settings API at runtime and applied as CSS variables and a logo
  URL (ADM-11), so rebranding needs no code change.
- **Settings are API resources.** Each admin area is a feature module under
  `src/features/admin/<area>/`, using the same ApiClient, validation and error mapping.
- **Permissions model:** a `currentUser.permissions` set from the API (synthetic admin in the demo).
  A `<Can permission="…">` helper and route guards are used for all management actions.
- **Audit-ready mutations:** every mutation goes through one helper that shows feedback and
  invalidates related history views.
- **Navigation** is designed for the full admin area (grouped "Administration" section) even
  though the demo shows only its items.
