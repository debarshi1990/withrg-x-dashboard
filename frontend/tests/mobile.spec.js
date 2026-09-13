import { test, expect } from '@playwright/test';
const owner = { id: '000000000000000000000001', name: 'WithRG Owner', email: 'owner@example.com', role: 'super_admin', isActive: true, access: [], mustChangePassword: false };
const handles = [{ _id: '000000000000000000000010', username: 'WithRGTest', displayName: 'WithRG Test', status: 'active', followersCount: 1200, postsCount: 32, lastConnectedAt: '2026-09-13T00:00:00Z' }];
async function fixture(page, user = owner) {
  await page.addInitScript(user => { localStorage.setItem('withrg_x_session', 'mock-session'); }, user);
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let body;
    if (path === '/api/auth/me') body = user;
    else if (path === '/api/handles') body = handles;
    else if (path === '/api/dashboard') body = { totalAccounts: 1, totalTeam: 2, postsPublished: 0, periodLabel: 'Last 30 days' };
    else if (path === '/api/activity' || path === '/api/posts/history') body = [];
    else if (path === '/api/team/members') body = [{ ...owner, _id: owner.id }, { _id: '000000000000000000000002', id: '000000000000000000000002', name: 'Poster One', email: 'poster@example.com', role: 'poster', access: [], isActive: true }];
    else if (path === '/api/setup') body = { database: 'connected', xConfigured: true, googleConfigured: false, callbackUrl: 'https://backend.example/api/handles/callback' };
    else if (path === '/api/auth/config') body = { googleClientId: null };
    else body = { message: 'Test endpoint not configured' };
    await route.fulfill({ status: body.message ? 400 : 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
}
async function menu(page, name) {
  await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  await page.getByRole('button', { name, exact: true }).first().click();
}
test('invalid login shows a visible error on a phone', async ({ page }) => {
  await page.route('**/api/auth/config', route => route.fulfill({ contentType: 'application/json', body: '{"googleClientId":null}' }));
  await page.route('**/api/auth/login', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"Incorrect email or password"}' }));
  await page.goto('/');
  await page.getByLabel('Email address').fill('wrong@example.com');
  await page.getByLabel('Password', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'Sign in securely' }).click();
  await expect(page.getByRole('alert')).toHaveText('Incorrect email or password');
});
test('phone screens fit and settings are reachable', async ({ page }) => {
  await fixture(page); await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hello, WithRG' })).toBeVisible();
  for (const tab of ['home', 'compose', 'accounts', 'activity', 'team', 'history', 'engage', 'settings']) {
    await page.goto(`/?tab=${tab}`);
    await expect(page.locator('.main-content')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.getByRole('button', { name: 'Your settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
});
test('small 320px screens and desktop stay within the viewport', async ({ page }) => {
  await fixture(page);
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const tab of ['home', 'compose', 'accounts', 'team']) {
      await page.goto(`/?tab=${tab}`); await expect(page.locator('.main-content')).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
});
test('draft survives navigation; request key is retained after ambiguous network result', async ({ page }) => {
  await fixture(page);
  let requests = [];
  await page.route('**/api/posts', async route => { requests.push(route.request().postDataJSON()); if (requests.length === 1) await route.abort('failed'); else await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ published: 1, failed: 0, results: [{ handleId: handles[0]._id, username: handles[0].username, success: true, postId: '123456', url: 'https://x.com/WithRGTest/status/123456' }] }) }); });
  await page.goto('/?tab=compose');
  await page.getByRole('button', { name: '@WithRGTest' }).click();
  await page.getByLabel('Message').fill('Draft saved on my phone');
  await page.getByRole('button', { name: 'Your settings' }).click();
  await page.locator('.bottom-nav').getByRole('button', { name: 'Post', exact: true }).click();
  await expect(page.getByLabel('Message')).toHaveValue('Draft saved on my phone');
  await page.getByRole('button', { name: 'Publish now' }).click();
  await expect(page.getByRole('alert')).toContainText('Cannot reach');
  await expect(page.getByRole('button', { name: 'Check request' })).toBeVisible();
  await page.getByRole('button', { name: 'Check request' }).click();
  await expect(page.getByRole('link', { name: 'View post', exact: true })).toBeVisible();
  expect(requests).toHaveLength(2); expect(requests[0].requestId).toBe(requests[1].requestId);
  await expect(page.getByLabel('Message')).toHaveValue('');
});
test('partial failure keeps content and shows each account outcome', async ({ page }) => {
  await fixture(page);
  await page.route('**/api/posts', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ published: 0, failed: 1, results: [{ handleId: handles[0]._id, username: handles[0].username, success: false, uncertain: false, message: 'X rate limit reached.' }] }) }));
  await page.goto('/?tab=compose'); await page.getByRole('button', { name: '@WithRGTest' }).click(); await page.getByLabel('Message').fill('Keep this draft');
  await page.getByRole('button', { name: 'Publish now' }).click();
  await expect(page.getByText('X rate limit reached.')).toBeVisible();
  await expect(page.getByLabel('Message')).toHaveValue('Keep this draft');
  await expect(page.getByLabel('Message')).toBeDisabled();
});
test('temporary-password users are guided to change it before working', async ({ page }) => {
  await fixture(page, { ...owner, mustChangePassword: true }); await page.goto('/?tab=compose');
  await expect(page.getByRole('heading', { name: 'Replace your temporary password' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publish now' })).toHaveCount(0);
});
test('poster cannot see team administration and read-only accounts cannot publish', async ({ page }) => {
  await fixture(page, { ...owner, role: 'poster', access: [{ handleId: handles[0]._id, canPublish: false }] }); await page.goto('/?tab=compose');
  await expect(page.locator('.bottom-nav').getByRole('button', { name: 'Team', exact: true })).toHaveCount(0);
  await expect(page.getByText(/No accounts with publishing permission/)).toBeVisible();
});
test('production service worker precaches hashed assets and never caches API requests', async ({ page }) => {
  await fixture(page); await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  const entries = await page.evaluate(async () => { const keys = await caches.keys(); const cache = await caches.open(keys.find(k => k.startsWith('withrg-x-shell-'))); return (await cache.keys()).map(r => new URL(r.url).pathname); });
  expect(entries.some(p => p.endsWith('.js'))).toBe(true); expect(entries.some(p => p.endsWith('.css'))).toBe(true);
  expect(entries.some(p => p.startsWith('/api/'))).toBe(false);
});
