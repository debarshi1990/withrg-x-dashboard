# Validation record — 13 September 2026

- Backend: 24/24 integration tests passed using MongoDB 7.0.14 and mocked X/Google provider responses.
- Backend: all application/test JavaScript syntax checks passed.
- Dashboard: production Vite build passed.
- Dashboard: 8/8 browser tests passed in Chromium, including 320, 390, 768 and 1440 pixel widths; login errors, draft survival, stable retry IDs, failed results, password gate, role views and PWA asset caching were checked.
- Phone home, composer and accounts screens were visually inspected with a clearly separate test fixture.
- Backend and frontend npm audits reported 0 known vulnerabilities at validation time.
- Current source files were checked against the historical uploaded .env values: no matches. This does not clean historical Git commits or establish that credentials were rotated.

Not verified: real X OAuth callback, current X API credits/permissions, actual posting/media/likes against X, real Google login, Atlas production connection, live Render deployment and installation on the user's physical phone. Render is connected and service tools are available. Render requires the user to confirm the workspace before service inspection or deployment; that confirmation is pending. No live deployment was changed.

Automated provider mocks exist only in tests. The shipped app has no demo-account or simulated-publishing fallback. The release scope and live acceptance procedure are in RESTART_GUIDE.md.
