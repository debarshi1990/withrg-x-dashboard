import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
export default defineConfig({
  plugins: [react(), {
    name: 'withrg-offline-shell',
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle).filter(name => /\.(js|css)$/.test(name)).map(name => '/' + name);
      const version = createHash('sha256').update(JSON.stringify(assets)).digest('hex').slice(0, 12);
      const paths = ['/', '/manifest.json', '/icons/icon-192x192.png', '/icons/icon-512x512.png', ...assets];
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: `
const CACHE = 'withrg-x-shell-${version}';
const ASSETS = ${JSON.stringify(paths)};
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('withrg-x-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  const request = event.request; const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') { event.respondWith(fetch(request).catch(() => caches.match('/'))); return; }
  if (ASSETS.includes(url.pathname)) event.respondWith(caches.match(request).then(hit => hit || fetch(request)));
});` });
    }
  }],
  server: { port: 3000, strictPort: true, proxy: { '/api': 'http://127.0.0.1:10000', '/health': 'http://127.0.0.1:10000' } },
  preview: { port: 4173, strictPort: true }
});
