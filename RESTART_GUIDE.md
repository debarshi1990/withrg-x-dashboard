# WithRG X — restart and launch guide

Updated: 13 September 2026.

The mobile dashboard and Node backend now share one API. The current work is on `agent/mobile-app-v2` in both repositories and is proposed in PR #1 in each. **A working production deployment and a real X publishing test have not yet been verified.**

## Start here

1. Regenerate the credentials previously committed in the old backend: X client secret, MongoDB database-user password, and the old Google OAuth client secret (or disable that old Google client if it is no longer used). Deleting `.env` from a new commit does not remove it from Git history. Enter replacements directly into the service settings; do not paste them in a chat, issue, or source file.
2. In Render, inspect the existing `withrg-x-backend` service before changing it. The historical URL was `https://withrg-x-backend.onrender.com`; verify the actual URL shown in your account. Check its linked repository, branch, environment-variable names, instance plan and auto-deploy setting. Keep auto-deploy off during configuration.
3. Configure/deploy the reviewed backend branch and the frontend branch using the settings below. The two `render.yaml` files are ready as optional Blueprint inputs. **Do not create a duplicate backend if you can reuse the existing service.** Importing a Blueprint is optional; the settings can also be applied to the existing service.
4. Sign in with `ADMIN_EMAIL` and the temporary `ADMIN_PASSWORD` you chose. The first startup creates the Super Admin only when none exists. Change that password when the app asks, then remove `ADMIN_PASSWORD` from Render. Restarting the server never resets an existing administrator.
5. Connect one X account, add one Poster in Team, and assign that account. The owner completes X's authorization screen; handlers receive only their own dashboard login.
6. Complete the live acceptance checks at the end of this guide. Merge both PRs only when the configuration and launch plan are ready. Then point both Render services at `main`; future deployments can use checks-pass auto-deploy after CI is working.

## Render settings

| Setting | Backend | Dashboard |
|---|---|---|
| Repository | `debarshi1990/withrg-x-backend` | `debarshi1990/withrg-x-dashboard` |
| Service type | Web Service, Node | Static Site |
| Branch for validation | `agent/mobile-app-v2` | `agent/mobile-app-v2` |
| Root directory | leave empty | leave empty |
| Build command | `npm ci --omit=dev` | `npm --prefix frontend ci && npm --prefix frontend run build` |
| Start command | `npm start` | not applicable |
| Publish directory | not applicable | `frontend/dist` |
| Health check | `/health` | not applicable |
| Node major | `22` | `22` |
| Auto-deploy during setup | Off | Off |

The Blueprint's free backend plan is for initial validation. Review current Render plans before choosing an always-on production instance. Free services can sleep, so a cold start can delay sign-in or an OAuth callback. The Blueprint must not be interpreted as authorization to purchase a plan. See [Render free services](https://render.com/docs/free).

Choose the dashboard's actual HTTPS URL before finalizing backend variables. If the URL changes, update `FRONTEND_URL`, `CORS_ORIGINS`, Google authorized JavaScript origins, and any frontend security headers that mention the origin.

### Backend environment variables

| Name | Value/purpose |
|---|---|
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` |
| `MONGODB_URI` | Your Atlas connection string, with the rotated password and a fresh application database name such as `withrg_x_v2` |
| `JWT_SECRET` | A new random session-signing secret, minimum 32 characters |
| `TOKEN_ENCRYPTION_KEY` | Exactly 64 hexadecimal characters, generated once and kept safe |
| `FRONTEND_URL` | The dashboard HTTPS origin, without a trailing path |
| `CORS_ORIGINS` | The same dashboard origin; comma-separated only if genuinely needed |
| `X_CLIENT_ID` | OAuth 2.0 client ID from your X app |
| `X_CLIENT_SECRET` | Rotated OAuth 2.0 client secret from that same app |
| `X_REDIRECT_URI` | Exact backend URL plus `/api/handles/callback` |
| `GOOGLE_CLIENT_ID` | Optional Google Identity Services Web client ID; blank disables the Google button |
| `ADMIN_EMAIL` | Your own email for the first Super Admin |
| `ADMIN_PASSWORD` | Temporary first-login password, at least 12 characters; remove after changing it |
| `ADMIN_NAME` | `Debarshi Majumdar` |
| `TRUST_PROXY_HOPS` | `1` for this direct Render setup |

Do not change `TOKEN_ENCRYPTION_KEY` after accounts are connected without a planned key migration. An unrelated new key cannot decrypt existing tokens; affected X accounts must then be reconnected. Store it privately with your deployment credentials.

Generate the two application secrets privately on your computer, from the backend folder:

```bash
npm run generate-secrets
```

The command prints fresh values for `JWT_SECRET` and `TOKEN_ENCRYPTION_KEY`. Paste them into Render only. This does **not** regenerate X, Google or MongoDB credentials.

Atlas: create/use a database user with access to this application database, and allow the Render service's outbound IP addresses in Atlas Network Access. Preserve a backup of any old database. The prototype's users, Google tokens and LAN/Expo redirects are not migrated into the new login model; reconnect X accounts and add team members through the new app.

### Frontend variable and routing

Set `VITE_API_URL` to the backend **origin**, for example `https://withrg-x-backend.onrender.com` only if that is the service URL Render confirms. Do not append `/api`. Rebuild the static site after changing this variable. Never put an X secret, MongoDB URL, JWT secret or encryption key in a `VITE_` variable.

Use a rewrite from `/*` to `/index.html` for the SPA. Apply the security headers in the dashboard's `render.yaml`; `sw.js` and `index.html` should revalidate. The sample Content Security Policy allows Render backend origins; if you use a custom API domain, add that exact HTTPS origin to `connect-src`.

## X setup

In your [X Developer Console](https://developer.x.com/), configure OAuth 2.0 as a confidential Web App and register the exact callback. If reusing the historical backend hostname, that callback is:

```text
https://withrg-x-backend.onrender.com/api/handles/callback
```

Use a different hostname if Render shows a different service URL. The app requests `tweet.read tweet.write users.read offline.access media.write like.write` so it can connect accounts, refresh authorization, publish, upload images and perform user-selected likes. Accounts connected before the added media/like scopes must authorize again. See [X OAuth 2.0](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code), [media upload](https://docs.x.com/x-api/media/upload-media), and [character counting](https://docs.x.com/fundamentals/counting-characters).

Confirm the X project has working API access and adequate credits in its console. Application tests use mocked provider responses and cannot verify your subscription, billing, granted scopes, account restrictions or a real OAuth redirect.

## Optional Google sign-in

Create/configure a Web OAuth client in Google Cloud and put the dashboard HTTPS origin in Authorized JavaScript origins. Set its client ID as the backend `GOOGLE_CLIENT_ID`. This implementation uses the Google Identity Services button and server-side ID-token verification; it does not use a Google client secret or a Google redirect callback.

An administrator must first add the exact Gmail or Google Workspace email in Team. Google sign-in does not publicly register users or grant admin rights. Non-Gmail/non-Workspace Google identities are not automatically linked by email. Temporary passwords still have to be replaced; administrators should send each person's initial login privately themselves. See [Google ID-token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

## Daily use on a phone

- Home: account and activity overview.
- Post: choose accounts, write a message or reply, optionally attach up to four JPEG/PNG images per post (5 MB each), and publish.
- Accounts: connect/reconnect accounts; refresh counts. Only the Super Admin can disconnect an account.
- Activity: recent successes, failures and unconfirmed attempts.
- Team: add members, reset their temporary passwords, activate/deactivate them and assign accounts. Super Admins can change Admin/Poster roles. Admins can manage Posters; they cannot change peer Admins or the Super Admin.
- Menu → History & insights: recent posts published through this app; request current public post metrics.
- Menu → Like or repost: select one account and one specific post.
- Settings: password change and, for the Super Admin, deployment configuration status.

Install on Android using the browser's Install/Add to Home Screen menu; on iPhone use Safari → Share → Add to Home Screen. This is a PWA, not an App Store/Play Store binary. Publishing needs connectivity. Text drafts stay on that device; attached image files need selecting again after closing the app. Local draft text may remain until replaced/cleared, so use a personal device for account work.

If a publish times out, use **Check request**. The backend remembers the request and will not republish a completed request ID. If a server crash leaves a request pending or X's result is uncertain, inspect Activity and the actual X account before choosing **I checked X — start another post**. This preserves evidence and avoids an automatic duplicate; it is not a guarantee that an interrupted X request failed.

## Live acceptance before launch

Use an account you control and harmless test content. These checks are intentionally manual until live credentials and final URLs are ready.

- `/health` returns HTTP 200 and `database: connected`.
- Initial Super Admin login works and forces replacement of the temporary password.
- Connect one X account through X's real authorization screen; the browser returns to Accounts successfully.
- Publish a text post, reply to it, and upload a small image from a phone. Open the resulting X links to confirm publication.
- Read that post's public metrics. Test a single like/repost if desired.
- Add a Poster, assign one account, sign in as that Poster and verify other accounts and Team administration are unavailable.
- Revoke the assignment and confirm the already-signed-in Poster is denied immediately.
- Verify password reset signs out existing sessions and a temporary password must be changed.
- Verify refresh-token behavior after expiry, and reconnect behavior after revoking the X app.
- Install the PWA and reopen it. Confirm draft preservation and visible offline/error feedback.
- Check real Google sign-in if enabled, including a person who has not been added to Team.

## Scope and remaining work

Implemented and tested locally: role controls, individual credentials, X PKCE connection logic, encrypted token storage, refresh coordination, request receipts, phone layouts, text/image posting, replies, likes/reposts, public metrics, profile/password settings, Google identity verification and deployment helpers.

**Not included in this release:** video/GIF upload, scheduled publishing, supervisor approval queues, bulk/imported X history, private analytics beyond X's returned public metrics, TOTP/2FA inside the dashboard, multi-organization tenancy or native app-store distribution. If those are required for the final rollout, treat them as explicit follow-up milestones. This release must not be described as fully launched until the live acceptance checks pass.

The backend stores in-process rate-limit counters; use a shared rate-limit store before scaling to multiple instances. Publishing receipts and token-refresh locks already use MongoDB. Retain database backups and monitor deployment errors. The previous `.env` remains in historical commits until separately cleaned; credential rotation is still required.

## Validation commands

Backend folder:

```bash
npm ci
npm run check
npm test
npm audit
```

The tests start a temporary MongoDB 7.0.14 for deterministic integration tests and mock X/Google responses. This test-only Mongo version does not select your Atlas production version.

Dashboard repository:

```bash
cd frontend
npm ci
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
```

Google and X external actions are not exercised by these automated tests. CI workflows run the same build, tests and dependency audit on future changes. No secrets are needed for CI.

## Recovery and troubleshooting

| Symptom | Next action |
|---|---|
| Login returns HTML / wrong-server message | Correct `VITE_API_URL` and rebuild frontend |
| CORS/origin error | Match `CORS_ORIGINS` to the actual dashboard origin |
| Callback fails or loops | Match the exact callback in X and `X_REDIRECT_URI`; check cold start, scopes and client type |
| Backend won't start | Check required values; `npm run check-config` validates format without showing secrets |
| Database connection fails | Check rotated database password, selected database and Atlas Network Access |
| Images/likes ask for permission | Reconnect that X account to grant new scopes |
| X returns rate-limit/credit error | Review X usage and billing; do not repeat the same request rapidly |
| Super Admin password lost | Use the explicit recovery command below in a private backend shell |

For Super Admin recovery only, set `ADMIN_EMAIL`, a new temporary `ADMIN_PASSWORD`, and `ADMIN_RECOVERY_CONFIRM=RESET_EXISTING_SUPER_ADMIN` privately in the backend environment, then run `npm run recover-admin`. It resets only an existing matching Super Admin; it never promotes another user. Change the temporary password and remove the recovery variables afterward.

Render configuration sources: [Blueprint reference](https://render.com/docs/blueprint-spec), [environment variables](https://render.com/docs/configure-environment-variables).
