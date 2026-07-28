# WithRG X Account Management

Mobile-first Progressive Web App for securely managing multiple WithRG X accounts.
Handlers use their own dashboard login and only see the accounts assigned to them.
They never receive an X password or OAuth token.

The production backend lives in
[`debarshi1990/withrg-x-backend`](https://github.com/debarshi1990/withrg-x-backend).
The obsolete FastAPI prototype and its demo setup scripts have been removed from
this repository so there is only one API contract.

## Included workflows

- Individual Super Admin, Admin, and Poster logins
- X OAuth 2.0 with PKCE account connection
- Account-level handler assignments
- Text posts and replies to one or several authorised accounts
- Account and team views designed for narrow phone screens
- Audit activity history
- Installable Android and iPhone PWA
- Offline application shell without caching authenticated API responses

## Run locally

```bash
cd frontend
npm install
VITE_API_URL=http://localhost:10000 npm start
```

If the frontend and API are served from the same origin, `VITE_API_URL` can
be omitted.

## Build

```bash
cd frontend
npm run build
```

Deploy the generated `frontend/dist` directory to a static host. Configure all
unknown paths to serve `index.html` so PWA navigation continues to work.

## Phone installation

- Android Chrome/Edge: open the production HTTPS URL and choose **Install app**.
- iPhone Safari: open the URL, tap **Share**, then **Add to Home Screen**.

PWA installation requires HTTPS in production.

## Security

No X client secret or user token belongs in this frontend repository. The backend
encrypts per-account OAuth tokens and performs all X API requests. Any credentials
that were previously committed to either repository must be rotated before
deployment, because deleting a current `.env` file does not remove values from Git
history.
