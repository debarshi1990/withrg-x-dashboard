# WithRG X — mobile dashboard

React + Vite PWA for individually authorized WithRG X account handlers.

Start with [RESTART_GUIDE.md](RESTART_GUIDE.md) for the current state, exact Render settings, credentials, account setup and live launch checks. Companion backend: [withrg-x-backend](https://github.com/debarshi1990/withrg-x-backend).

## Local development

Use Node 22. Run the backend on port 10000, then:

```bash
cd frontend
npm ci
npm run dev
```

Open `http://localhost:3000`. Vite proxies `/api` to the local backend. For a separate deployed API, configure `frontend/.env` from `frontend/.env.example`; the only frontend variable is the public API origin.

## Verification

```bash
cd frontend
npm ci
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

Tests use API fixtures; real X/Google authorization and live publishing are separate acceptance checks. Production service-worker assets are generated during the build. API responses and X tokens are never cached by the service worker.

The `render.yaml` file defines a static site with SPA routing and security headers. Existing code/deployments are not automatically replaced by merely adding this file.
