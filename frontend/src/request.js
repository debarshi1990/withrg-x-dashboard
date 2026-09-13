export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export async function request(path, options = {}, token = null) {
  const headers = { ...options.headers };
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), path === '/posts' ? 125000 : 45000);
  try {
    const response = await fetch(`${API_BASE}/api${path}`, { ...options, headers, signal: controller.signal });
    const type = response.headers.get('content-type') || '';
    if (!type.includes('application/json')) throw new Error('The app is reaching the wrong server. Ask the administrator to check the API URL.');
    const body = await response.json();
    if (!response.ok) { const error = new Error(body.message || 'The request could not be completed'); error.status = response.status; error.body = body; throw error; }
    return body;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error(path === '/posts' ? 'The server has not confirmed publishing. Use Check request; do not create another copy yet.' : 'The server is taking too long. Please try again shortly.');
    if (error instanceof TypeError) throw new Error('Cannot reach the server. Check your connection and try again.');
    throw error;
  } finally { clearTimeout(timer); }
}
export function safeRead(key, fallback = null) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
export function safeWrite(key, value) { try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(value)); } catch {} }
