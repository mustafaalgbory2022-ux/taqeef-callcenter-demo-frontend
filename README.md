# taqeef-callcenter-demo-frontend

Standalone management-demo frontend for **Taqeef Call Center AI**. Synthetic data only.

```bash
npm ci
npm run dev          # http://localhost:5173 (mock mode)
npm run check        # typecheck + lint + format + unit tests
npm run test:e2e     # Playwright + axe (EN/AR × light/dark × desktop/mobile)
```

Configuration: copy `.env.example` to `.env.local`. `VITE_API_MODE=mock|fastapi`.

Docs: [architecture](docs/architecture.md) · [FastAPI adapter](docs/fastapi-adapter.md) ·
[integration](docs/integration.md) · project rules in [CLAUDE.md](CLAUDE.md).
