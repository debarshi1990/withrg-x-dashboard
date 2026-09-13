import React, { useEffect, useRef, useState } from 'react';
import { Check, Send, RefreshCw, X, ImagePlus, Settings } from 'lucide-react';
import twitterText from 'twitter-text';
import { safeRead, safeWrite } from './request';
const emptyDraft = { text: '', replyToId: '', selected: [] };
const uploadFile = file => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = () => reject(new Error('Could not read this image')); reader.readAsDataURL(file); });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
export function ComposeScreen({ handles, user, api, online, onPublished, onBusy }) {
  const draftKey = `withrg_draft_${user.id}`;
  const pendingKey = `withrg_pending_${user.id}`;
  const [draft, setDraft] = useState(() => safeRead(draftKey, emptyDraft));
  const [pending, setPending] = useState(() => safeRead(pendingKey));
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const publishing = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => safeWrite(draftKey, draft), [draftKey, draft]);
  const available = handles.filter(h => h.status === 'active' && (user.role !== 'poster' || user.access.some(a => String(a.handleId) === h._id && a.canPublish)));
  const selected = draft.selected.filter(id => available.some(h => h._id === id));
  const remaining = 280 - twitterText.parseTweet(draft.text.trim().normalize('NFC')).weightedLength;
  function update(values) { setDraft(current => ({ ...current, ...values })); setError(''); }
  function remember(value) { safeWrite(pendingKey, value); if (mounted.current) setPending(value); }
  async function accept(response) {
    if (mounted.current) { setResult(response); setError(''); }
    if (response.failed === 0) {
      safeWrite(draftKey, emptyDraft); remember(null);
      if (mounted.current) { setDraft(emptyDraft); setFiles([]); }
    } else {
      // Keep the exact receipt until the user has checked all outcomes.
      remember({ ...safeRead(pendingKey), completed: true });
    }
    try { await onPublished(); } catch { /* Posting result remains authoritative if dashboard refresh fails. */ }
  }
  async function publish() {
    if (publishing.current || pending) return;
    publishing.current = true; setBusy(true); onBusy(true); setError(''); setResult(null);
    try {
      const mediaByHandle = {};
      for (const handleId of selected) {
        mediaByHandle[handleId] = [];
        for (const file of files) {
          const media = await uploadFile(file);
          let item = await api('/media', { method: 'POST', body: JSON.stringify({ handleId, media, mimeType: file.type }) });
          for (let i = 0; ['pending', 'in_progress'].includes(item.state) && i < 15; i++) { await wait(2000); item = await api(`/media/${item.id}`); }
          if (item.state !== 'succeeded') throw new Error('X has not finished processing an image. Try attaching it again.');
          mediaByHandle[handleId].push(item.id);
        }
      }
      const payload = { text: draft.text, replyToId: draft.replyToId, handleIds: selected, mediaByHandle, requestId: crypto.randomUUID() };
      remember({ payload });
      await accept(await api('/posts', { method: 'POST', body: JSON.stringify(payload) }));
    } catch (err) {
      if (err.status && err.status < 500 && err.status !== 409) remember(null);
      if (mounted.current) setError(err.message);
    } finally { publishing.current = false; onBusy(false); if (mounted.current) setBusy(false); }
  }
  async function checkRequest() {
    if (!pending?.payload || publishing.current) return;
    publishing.current = true; setBusy(true); onBusy(true); setError('');
    try {
      // Reusing the original key cannot create a second successful post.
      await accept(await api('/posts', { method: 'POST', body: JSON.stringify(pending.payload) }));
    } catch (err) { setError(err.message); }
    finally { publishing.current = false; setBusy(false); onBusy(false); }
  }
  return <div className="screen narrow-screen">
    <div className="page-heading"><span className="eyebrow">PUBLISH</span><h1>Create a post</h1><p>Your text draft is saved on this device. Images must be attached again if you close the app.</p></div>
    {!online && <p className="inline-warning" role="status">You are offline. You can write a draft; publishing needs an internet connection.</p>}
    <section className="panel compose-panel">
      {error && <p className="inline-warning" role="alert">{error}</p>}
      <fieldset disabled={busy || Boolean(pending)} className="plain-fieldset">
        <legend className="field-label">Post from</legend>
        <div className="account-picker">{available.map(h => <button type="button" key={h._id} className={`account-pill ${selected.includes(h._id) ? 'selected' : ''}`} onClick={() => update({ selected: selected.includes(h._id) ? selected.filter(id => id !== h._id) : [...selected, h._id].slice(0, 5) })} aria-pressed={selected.includes(h._id)}>@{h.username}{selected.includes(h._id) && <Check size={16} />}</button>)}</div>
        {!available.length && <p className="inline-warning">No accounts with publishing permission are available. Ask an administrator to connect and assign an account.</p>}
        <label className="field-label" htmlFor="post-text">Message</label>
        <div className={`composer ${remaining < 0 ? 'invalid' : ''}`}><textarea id="post-text" rows={7} value={draft.text} onChange={e => update({ text: e.target.value })} placeholder="Write your post…" /><span className="character-count" aria-live="polite">{remaining} remaining</span></div>
        <label className="media-input"><ImagePlus size={18} /> Attach up to 4 images<input type="file" accept="image/jpeg,image/png" multiple onChange={e => { const next = [...e.target.files]; e.target.value = ''; if (next.length + files.length > 4 || next.some(f => f.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png'].includes(f.type))) { setError('Choose up to four JPEG or PNG images, each no larger than 5 MB.'); return; } setFiles(current => [...current, ...next]); }} /></label>
        <div className="attachment-list">{files.map((file, i) => <div key={`${file.name}-${i}`}><span>{file.name}</span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles(files.filter((_, n) => n !== i))}><X size={18} /></button></div>)}</div>
        <label>Reply to a post (optional)<input value={draft.replyToId} onChange={e => update({ replyToId: e.target.value })} placeholder="Paste an X post link or numeric ID" /></label>
      </fieldset>
      {pending ? <div className="pending-box"><p>{pending.completed ? 'Review the results below before starting another post.' : 'A publishing request is saved. Check its result before starting another post.'}</p><button className="secondary-button" disabled={busy || !online} onClick={checkRequest}>Check request</button><button className="text-button" disabled={busy} onClick={() => { if (window.confirm('Have you checked Activity and the X account for every uncertain result? Starting again could post a duplicate.')) { remember(null); setResult(null); setFiles([]); } }}>I checked X — start another post</button></div> : <div className="publish-summary"><span>{selected.length} account{selected.length === 1 ? '' : 's'} selected</span><button className="primary-button" disabled={busy || !online || !selected.length || (!draft.text.trim() && !files.length) || remaining < 0} onClick={publish}>{busy ? <RefreshCw size={18} className="spin" /> : <Send size={18} />}{busy ? 'Publishing…' : 'Publish now'}</button></div>}
      {result && <div className="publish-results" role="status">{result.results.map(item => <div key={item.handleId}><strong>@{item.username}: {item.success ? 'Published' : item.uncertain ? 'Not confirmed' : 'Failed'}</strong>{item.success ? <a href={item.url} target="_blank" rel="noreferrer">View post</a> : <p>{item.message}</p>}</div>)}</div>}
    </section>
  </div>;
}
export function HistoryScreen({ handles, api }) {
  const [id, setId] = useState(''); const [items, setItems] = useState([]); const [metrics, setMetrics] = useState({}); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; setItems([]); setMetrics({}); setError(''); if (id) api(`/posts/history?handleId=${id}`).then(data => { if (active) setItems(data); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, [id, api]);
  return <div className="screen narrow-screen"><div className="page-heading"><span className="eyebrow">POST INSIGHTS</span><h1>History & insights</h1><p>Posts published through this app. Metrics load only when you request them.</p></div><section className="panel"><label>X account<select value={id} onChange={e => setId(e.target.value)}><option value="">Choose an account</option>{handles.filter(h => h.status !== 'disconnected').map(h => <option key={h._id} value={h._id}>@{h.username}</option>)}</select></label>{error && <p role="alert" className="inline-warning">{error}</p>}{id && !items.length && <p>No posts recorded for this account yet.</p>}{items.map(item => <article className="history-item" key={item._id}><p className="post-copy">{item.details?.text || 'Image post'}</p><small>{new Date(item.createdAt).toLocaleString()} · {item.userName}</small><div className="action-row"><a href={`https://x.com/${item.handleUsername}/status/${item.postId}`} target="_blank" rel="noreferrer">View on X</a><button className="secondary-button" disabled={busy} onClick={async () => { setBusy(true); setError(''); try { const data = await api(`/posts/${item.postId}/metrics?handleId=${id}`); setMetrics(current => ({ ...current, [item.postId]: data })); } catch (e) { setError(e.message); } finally { setBusy(false); } }}>Refresh metrics</button></div>{metrics[item.postId] && <><dl className="post-metrics">{Object.entries(metrics[item.postId].publicMetrics).map(([key, value]) => <div key={key}><dt>{key.replace(/_count$/, '').replaceAll('_', ' ')}</dt><dd>{value.toLocaleString()}</dd></div>)}</dl><small>Retrieved {new Date(metrics[item.postId].fetchedAt).toLocaleString()}</small></>}</article>)}</section></div>;
}
export function EngageScreen({ handles, api, onDone, user }) {
  const [handleId, setHandleId] = useState(''); const [postId, setPostId] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  async function act(kind) { setBusy(true); setMessage(''); try { await api(`/posts/${kind}`, { method: 'POST', body: JSON.stringify({ handleId, postId }) }); setMessage(kind === 'like' ? 'Post liked.' : 'Post reposted.'); await onDone(); } catch (e) { setMessage(e.message); } finally { setBusy(false); } }
  return <div className="screen narrow-screen"><div className="page-heading"><h1>Like or repost</h1><p>Choose the account and the specific post for this action.</p></div><section className="panel"><label>Act as<select value={handleId} onChange={e => setHandleId(e.target.value)}><option value="">Choose an account</option>{handles.filter(h => h.status === 'active' && (user.role !== 'poster' || user.access.some(a => String(a.handleId) === h._id && a.canPublish))).map(h => <option key={h._id} value={h._id}>@{h.username}</option>)}</select></label><label>X post link or ID<input value={postId} onChange={e => setPostId(e.target.value)} placeholder="https://x.com/…/status/…" /></label><div className="action-row"><button className="primary-button" disabled={busy || !handleId || !postId} onClick={() => act('like')}>Like post</button><button className="secondary-button" disabled={busy || !handleId || !postId} onClick={() => act('retweet')}>Repost</button></div>{message && <p role="status">{message}</p>}</section></div>;
}
export function SettingsScreen({ user, api, onSession }) {
  const [currentPassword, setCurrentPassword] = useState(''); const [newPassword, setNewPassword] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [setup, setSetup] = useState(null);
  useEffect(() => { if (user.role === 'super_admin' && !user.mustChangePassword) api('/setup').then(setSetup).catch(() => {}); }, [api, user.role, user.mustChangePassword]);
  return <div className="screen narrow-screen"><div className="page-heading"><span className="eyebrow">YOUR ACCOUNT</span><h1>Settings</h1><p>{user.name} · {user.email}</p></div><section className="panel"><h2>{user.mustChangePassword ? 'Replace your temporary password' : 'Change password'}</h2><p>Use at least 12 characters. Other signed-in sessions will be signed out.</p><form onSubmit={async e => { e.preventDefault(); setBusy(true); setMessage(''); try { const result = await api('/auth/password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }); onSession(result); setCurrentPassword(''); setNewPassword(''); setMessage('Password updated.'); } catch (err) { setMessage(err.message); } finally { setBusy(false); } }}><label>Current password<input type="password" autoComplete="current-password" value={currentPassword} required onChange={e => setCurrentPassword(e.target.value)} /></label><label>New password<input type="password" autoComplete="new-password" minLength={12} value={newPassword} required onChange={e => setNewPassword(e.target.value)} /></label><button className="primary-button" disabled={busy}>Update password</button></form>{message && <p role="status">{message}</p>}</section>{setup && <section className="panel"><h2>Application setup</h2><dl className="setup-list"><dt>Database</dt><dd>{setup.database}</dd><dt>X authorization</dt><dd>{setup.xConfigured ? 'Configured' : 'Needs configuration'}</dd><dt>Google sign-in</dt><dd>{setup.googleConfigured ? 'Configured' : 'Not configured'}</dd><dt>X callback URL</dt><dd>{setup.callbackUrl || 'Not set'}</dd></dl>{setup.bootstrapPasswordPresent && <p className="inline-warning">Remove ADMIN_PASSWORD from Render environment settings after changing your password.</p>}</section>}</div>;
}
