# Viewing the demo frontend (visual preview)

The preview runs entirely in the browser with **synthetic data and a simulated backend**
(mock mode). Nothing connects to a real backend, PBX or AI model, and nothing needs to be
downloaded besides the npm packages.

## Run it on your computer

Requirements: Node.js 24 (24.15 or newer, below 25) and Git.

```bash
git clone https://github.com/mustafaalgbory2022-ux/taqeef-callcenter-demo-frontend.git
cd taqeef-callcenter-demo-frontend
git checkout demo/ord-0035-cloud-stream-1
npm ci
npm run dev
```

Open **http://127.0.0.1:5173/** in the browser. The launch screen already contains a
synthetic one-time code: select **Open local demo session**.

To view the production build instead (same strict security policy as the real build):

```bash
npm run build
npx vite preview --port 4173
```

Then open **http://127.0.0.1:4173/**.

## What to look at

| Area                                                                     | Where                                                                |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| Quality overview (dashboard)                                             | Overview (`/`) — agent and scorecard-version filters                 |
| Individual agent page                                                    | Overview → Agent pages → an agent (`/agents/agt-001`)                |
| Calls list                                                               | Calls (`/calls`)                                                     |
| Call detail: recording, transcript search, evidence, evaluation, history | Calls → DEMO-003 (re-scored) or DEMO-002 (newer transcript revision) |
| Evaluations log                                                          | Evaluations (`/evaluations`)                                         |
| Upload (synthetic WAV only)                                              | Calls → Upload a call                                                |
| Agents (create / retire)                                                 | Administration → Agents                                              |
| Scorecard editor and versions                                            | Administration → Scorecard                                           |
| Language, theme, demo-data reset                                         | Top bar (العربية / English, Theme) and Administration → Settings     |

Tips:

- Keyboard shortcuts on the call page: **K** play/pause, **J/L** back/forward 5 s, **P**
  focus the player (listed under "Keyboard shortcuts").
- A browser reload keeps the session (simulated `GET /api/session`). To start fresh, use
  Settings → reset demo data, or open a new private window.
- Mobile layout: narrow the window or use the browser's device toolbar.

## Known limits of the preview

- All data, audio and AI explanations are synthetic; scores are simulated.
- Routes and response shapes follow contract v0.3 r4 but remain provisional until the local
  backend implements them (see `docs/demo-integration-handoff.md`).
- Not implemented yet: job progress polling, the v0.3 scorecard draft/settings shapes, the
  edit routes, review-flag actions and word-level highlighting.
