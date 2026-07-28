import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AtSign,
  Check,
  ChevronRight,
  Home,
  KeyRound,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Smartphone,
  Users,
  WifiOff,
  X,
  Zap
} from 'lucide-react';
import './App.css';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'withrg_x_session';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('tab');
    return ['home', 'compose', 'accounts', 'activity', 'team'].includes(requested)
      ? requested
      : 'home';
  });
  const [handles, setHandles] = useState([]);
  const [members, setMembers] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [activities, setActivities] = useState([]);
  const [busy, setBusy] = useState(false);
  const [initializing, setInitializing] = useState(Boolean(token));
  const [toast, setToast] = useState(null);
  const [online, setOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  const api = useCallback(
    async (path, options = {}) => {
      const headers = { ...(options.headers || {}) };
      if (options.body && !(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
      }
      if (token) headers.Authorization = `Bearer ${token}`;

      let response;
      try {
        response = await fetch(`${API_BASE}/api${path}`, { ...options, headers });
      } catch (_error) {
        throw new Error('Cannot reach the server. Check your internet connection.');
      }
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401 && token) {
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        }
        throw new Error(body.message || 'The request could not be completed');
      }
      return body;
    },
    [token]
  );

  const isAdmin = user && ['super_admin', 'admin'].includes(user.role);

  const refreshApp = useCallback(
    async (resolvedUser = user) => {
      if (!resolvedUser) return;
      const requests = [
        api('/dashboard'),
        api('/handles'),
        api('/activity?limit=50')
      ];
      if (['super_admin', 'admin'].includes(resolvedUser.role)) {
        requests.push(api('/team/members'));
      }
      const [dashboardData, handleData, activityData, memberData = []] =
        await Promise.all(requests);
      setDashboard(dashboardData);
      setHandles(handleData);
      setActivities(activityData);
      setMembers(memberData);
    },
    [api, user]
  );

  useEffect(() => {
    if (!token) {
      setInitializing(false);
      return;
    }
    let active = true;
    (async () => {
      try {
        const me = await api('/auth/me');
        if (!active) return;
        setUser(me);
        await refreshApp(me);
      } catch (error) {
        if (active) setToast({ type: 'error', text: error.message });
      } finally {
        if (active) setInitializing(false);
      }
    })();
    return () => {
      active = false;
    };
    // refreshApp is intentionally invoked with the freshly fetched user. Depending
    // on its later user-bound identity here would restart session initialization.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, token]);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState({}, '', url);
  }, [tab]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthStatus = params.get('x');
    if (!oauthStatus || !token) return;
    setToast({
      type: oauthStatus === 'connected' ? 'success' : 'error',
      text:
        oauthStatus === 'connected'
          ? 'X account connected securely.'
          : params.get('message') || 'X authorization failed.'
    });
    params.delete('x');
    params.delete('message');
    window.history.replaceState({}, '', `${window.location.pathname}?${params}`);
    refreshApp().catch(() => {});
  }, [refreshApp, token]);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('beforeinstallprompt', onInstall);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onInstall);
    };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const signOut = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setTab('home');
  };

  const navItems = useMemo(() => {
    const items = [
      { id: 'home', label: 'Home', icon: Home },
      { id: 'compose', label: 'Post', icon: Send },
      { id: 'accounts', label: 'Accounts', icon: AtSign },
      { id: 'activity', label: 'Activity', icon: Activity }
    ];
    if (isAdmin) items.push({ id: 'team', label: 'Team', icon: Users });
    return items;
  }, [isAdmin]);

  const goTo = (nextTab) => {
    setTab(nextTab);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const install = async () => {
    if (!installPrompt) {
      setToast({
        type: 'info',
        text: /iphone|ipad|ipod/i.test(navigator.userAgent)
          ? 'In Safari, tap Share and then Add to Home Screen.'
          : 'Use your browser menu and choose Install app or Add to Home screen.'
      });
      return;
    }
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  if (initializing) return <LoadingScreen />;

  if (!token || !user) {
    return (
      <Login
        busy={busy}
        onLogin={async (credentials) => {
          setBusy(true);
          try {
            const result = await fetch(`${API_BASE}/api/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(credentials)
            });
            const body = await result.json().catch(() => ({}));
            if (!result.ok) throw new Error(body.message || 'Login failed');
            localStorage.setItem(TOKEN_KEY, body.token);
            setUser(body.user);
            setToken(body.token);
          } catch (error) {
            setToast({ type: 'error', text: error.message });
          } finally {
            setBusy(false);
          }
        }}
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <button
            className="icon-button desktop-hidden"
            aria-label="Open menu"
            onClick={() => setMobileMenu(true)}
          >
            <Menu size={22} />
          </button>
          <button className="brand" onClick={() => goTo('home')}>
            <img src="/icons/icon-192x192.png" alt="" />
            <span>
              <strong>WithRG</strong>
              <small>X Management</small>
            </span>
          </button>
          <div className="topbar-actions">
            {!online && (
              <span className="offline-chip">
                <WifiOff size={14} /> Offline
              </span>
            )}
            <button className="install-button" onClick={install}>
              <Smartphone size={17} />
              <span>Install</span>
            </button>
            <button className="profile-button" onClick={() => setMobileMenu(true)}>
              {initials(user.name)}
            </button>
          </div>
        </div>
      </header>

      <aside className={`side-panel ${mobileMenu ? 'open' : ''}`}>
        <div className="side-panel-head">
          <div className="user-avatar">{initials(user.name)}</div>
          <div>
            <strong>{user.name}</strong>
            <span>{roleLabel(user.role)}</span>
          </div>
          <button className="icon-button desktop-hidden" onClick={() => setMobileMenu(false)}>
            <X size={20} />
          </button>
        </div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavButton key={item.id} item={item} active={tab === item.id} onClick={goTo} />
          ))}
        </nav>
        <div className="side-panel-footer">
          <button onClick={install}>
            <Smartphone size={18} /> Install on this phone
          </button>
          <button onClick={signOut}>
            <LogOut size={18} /> Log out
          </button>
        </div>
      </aside>
      {mobileMenu && <button className="backdrop" onClick={() => setMobileMenu(false)} />}

      <main className="main-content">
        {tab === 'home' && (
          <HomeScreen
            user={user}
            dashboard={dashboard}
            handles={handles}
            onNavigate={goTo}
          />
        )}
        {tab === 'compose' && (
          <ComposeScreen
            handles={handles.filter((handle) => handle.status === 'active')}
            busy={busy}
            onPublish={async (payload) => {
              setBusy(true);
              try {
                const result = await api('/posts', {
                  method: 'POST',
                  body: JSON.stringify(payload)
                });
                setToast({
                  type: result.failed ? 'info' : 'success',
                  text: result.failed
                    ? `${result.published} posted; ${result.failed} failed. Check Activity.`
                    : `Published successfully to ${result.published} account${
                        result.published === 1 ? '' : 's'
                      }.`
                });
                await refreshApp();
                return result;
              } catch (error) {
                setToast({ type: 'error', text: error.message });
                return null;
              } finally {
                setBusy(false);
              }
            }}
          />
        )}
        {tab === 'accounts' && (
          <AccountsScreen
            handles={handles}
            isAdmin={isAdmin}
            busy={busy}
            onConnect={async () => {
              setBusy(true);
              try {
                const result = await api('/handles/connect', { method: 'POST' });
                window.location.assign(result.authorizationUrl);
              } catch (error) {
                setToast({ type: 'error', text: error.message });
                setBusy(false);
              }
            }}
          />
        )}
        {tab === 'activity' && <ActivityScreen activities={activities} />}
        {tab === 'team' && isAdmin && (
          <TeamScreen
            currentUser={user}
            members={members}
            handles={handles.filter((handle) => handle.status !== 'disconnected')}
            busy={busy}
            onCreate={async (values) => {
              setBusy(true);
              try {
                await api('/team/members', {
                  method: 'POST',
                  body: JSON.stringify(values)
                });
                setToast({ type: 'success', text: 'Team member created.' });
                await refreshApp();
                return true;
              } catch (error) {
                setToast({ type: 'error', text: error.message });
                return false;
              } finally {
                setBusy(false);
              }
            }}
            onToggleAssignment={async (member, handle, assigned) => {
              setBusy(true);
              try {
                await api('/team/assign', {
                  method: assigned ? 'DELETE' : 'POST',
                  body: JSON.stringify({ userId: member._id, handleId: handle._id })
                });
                setToast({
                  type: 'success',
                  text: assigned ? 'Account access removed.' : 'Account assigned.'
                });
                await refreshApp();
              } catch (error) {
                setToast({ type: 'error', text: error.message });
              } finally {
                setBusy(false);
              }
            }}
            onToggleActive={async (member) => {
              setBusy(true);
              try {
                await api(`/team/members/${member._id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ isActive: !member.isActive })
                });
                await refreshApp();
              } catch (error) {
                setToast({ type: 'error', text: error.message });
              } finally {
                setBusy(false);
              }
            }}
          />
        )}
      </main>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        {navItems.map((item) => (
          <NavButton key={item.id} item={item} active={tab === item.id} onClick={goTo} />
        ))}
      </nav>

      {toast && (
        <div className={`toast ${toast.type}`} role="status">
          {toast.type === 'error' ? <AlertCircle size={19} /> : <Check size={19} />}
          <span>{toast.text}</span>
          <button aria-label="Dismiss message" onClick={() => setToast(null)}>
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}

function Login({ busy, onLogin }) {
  const [values, setValues] = useState({ email: '', password: '' });
  return (
    <div className="login-page">
      <div className="login-brand">
        <img src="/icons/icon-192x192.png" alt="WithRG" />
        <div>
          <strong>WithRG</strong>
          <span>X Account Management</span>
        </div>
      </div>
      <section className="login-card">
        <div className="login-icon">
          <ShieldCheck size={28} />
        </div>
        <h1>Welcome back</h1>
        <p>Manage assigned X accounts without sharing their passwords.</p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onLogin(values);
          }}
        >
          <label>
            Email address
            <input
              type="email"
              autoComplete="email"
              required
              value={values.email}
              onChange={(event) => setValues({ ...values, email: event.target.value })}
              placeholder="name@withrg.in"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={values.password}
              onChange={(event) => setValues({ ...values, password: event.target.value })}
              placeholder="Your dashboard password"
            />
          </label>
          <button className="primary-button full-width" disabled={busy}>
            {busy ? <RefreshCw className="spin" size={18} /> : <KeyRound size={18} />}
            {busy ? 'Signing in…' : 'Sign in securely'}
          </button>
        </form>
        <div className="security-note">
          <ShieldCheck size={17} />
          <span>X passwords and account tokens are never shown to handlers.</span>
        </div>
      </section>
    </div>
  );
}

function HomeScreen({ user, dashboard, handles, onNavigate }) {
  return (
    <div className="screen">
      <div className="welcome-row">
        <div>
          <span className="eyebrow">WITHRG COMMAND CENTRE</span>
          <h1>Hello, {firstName(user.name)}</h1>
          <p>Coordinate your assigned X accounts from one secure place.</p>
        </div>
        <button className="primary-button desktop-cta" onClick={() => onNavigate('compose')}>
          <Plus size={18} /> New post
        </button>
      </div>

      <div className="stats-grid">
        <Stat
          icon={AtSign}
          label="Available accounts"
          value={dashboard?.totalAccounts ?? '—'}
          color="blue"
        />
        <Stat
          icon={Send}
          label="Posts published"
          value={dashboard?.postsPublished ?? '—'}
          sublabel={dashboard?.periodLabel}
          color="orange"
        />
        <Stat
          icon={Users}
          label="Active team"
          value={dashboard?.totalTeam ?? '—'}
          color="green"
        />
      </div>

      <button className="mobile-compose-card" onClick={() => onNavigate('compose')}>
        <span className="compose-card-icon">
          <Zap size={22} />
        </span>
        <span>
          <strong>Create a new post</strong>
          <small>Choose an account and publish securely</small>
        </span>
        <ChevronRight size={21} />
      </button>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Your X accounts</h2>
            <p>Only accounts you are authorised to use appear here.</p>
          </div>
          <button className="text-button" onClick={() => onNavigate('accounts')}>
            View all <ChevronRight size={16} />
          </button>
        </div>
        {handles.length ? (
          <div className="compact-account-list">
            {handles.slice(0, 4).map((handle) => (
              <AccountIdentity key={handle._id} handle={handle} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={AtSign}
            title="No accounts assigned yet"
            text="Ask an administrator to connect an X account and assign it to you."
          />
        )}
      </section>
    </div>
  );
}

function ComposeScreen({ handles, busy, onPublish }) {
  const [text, setText] = useState('');
  const [replyToId, setReplyToId] = useState('');
  const [selected, setSelected] = useState([]);
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    if (handles.length === 1) setSelected([handles[0]._id]);
  }, [handles]);

  const remaining = 280 - [...text].length;
  const toggle = (id) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );

  return (
    <div className="screen narrow-screen">
      <div className="page-heading">
        <span className="eyebrow">PUBLISH</span>
        <h1>Create a post</h1>
        <p>Select exactly where this message should be published.</p>
      </div>
      <section className="panel compose-panel">
        <label className="field-label">Post from</label>
        <div className="account-picker">
          {handles.map((handle) => (
            <button
              key={handle._id}
              type="button"
              className={`account-pill ${selected.includes(handle._id) ? 'selected' : ''}`}
              onClick={() => toggle(handle._id)}
            >
              <Avatar handle={handle} />
              <span>@{handle.username}</span>
              {selected.includes(handle._id) && <Check size={16} />}
            </button>
          ))}
        </div>
        {!handles.length && (
          <div className="inline-warning">No active X accounts are available to you.</div>
        )}

        <label className="field-label" htmlFor="post-text">
          Message
        </label>
        <div className={`composer ${remaining < 0 ? 'invalid' : ''}`}>
          <textarea
            id="post-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="What should WithRG say?"
            rows={7}
          />
          <span className={`character-count ${remaining < 20 ? 'warning' : ''}`}>
            {remaining}
          </span>
        </div>

        <details className="reply-options">
          <summary>Reply to an existing post</summary>
          <label>
            Original post ID
            <input
              inputMode="numeric"
              value={replyToId}
              onChange={(event) => setReplyToId(event.target.value.replace(/\D/g, ''))}
              placeholder="Optional numeric post ID"
            />
          </label>
        </details>

        <div className="publish-summary">
          <span>
            {selected.length
              ? `${selected.length} account${selected.length === 1 ? '' : 's'} selected`
              : 'Select an account'}
          </span>
          <button
            className="primary-button"
            disabled={busy || !text.trim() || remaining < 0 || !selected.length}
            onClick={async () => {
              const result = await onPublish({ text, handleIds: selected, replyToId });
              if (result?.published) {
                setText('');
                setReplyToId('');
                setLastResult(result);
              }
            }}
          >
            {busy ? <RefreshCw className="spin" size={18} /> : <Send size={18} />}
            {busy ? 'Publishing…' : replyToId ? 'Publish reply' : 'Publish now'}
          </button>
        </div>

        {lastResult?.results?.some((result) => result.success) && (
          <div className="result-links">
            {lastResult.results
              .filter((result) => result.success)
              .map((result) => (
                <a key={result.postId} href={result.url} target="_blank" rel="noreferrer">
                  View @{result.username} post <ChevronRight size={15} />
                </a>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}

function AccountsScreen({ handles, isAdmin, busy, onConnect }) {
  return (
    <div className="screen">
      <div className="page-heading heading-with-action">
        <div>
          <span className="eyebrow">SECURE CONNECTIONS</span>
          <h1>X accounts</h1>
          <p>Handlers never see the password or token of any connected account.</p>
        </div>
        {isAdmin && (
          <button className="primary-button" disabled={busy} onClick={onConnect}>
            <Plus size={18} /> Connect account
          </button>
        )}
      </div>

      {handles.length ? (
        <div className="account-grid">
          {handles.map((handle) => (
            <article className="account-card" key={handle._id}>
              <div className="account-card-top">
                <AccountIdentity handle={handle} />
                <Status status={handle.status} />
              </div>
              <div className="account-metrics">
                <span>
                  <strong>{compactNumber(handle.followersCount)}</strong>
                  Followers
                </span>
                <span>
                  <strong>{compactNumber(handle.postsCount)}</strong>
                  Posts
                </span>
              </div>
              <div className="account-security">
                <ShieldCheck size={17} />
                <span>Authorised through X OAuth</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="panel">
          <EmptyState
            icon={AtSign}
            title="No X accounts connected"
            text={
              isAdmin
                ? 'Connect the first account through X. Its password will never enter this app.'
                : 'An administrator has not assigned an account to you yet.'
            }
          />
        </section>
      )}
    </div>
  );
}

function ActivityScreen({ activities }) {
  return (
    <div className="screen narrow-screen">
      <div className="page-heading">
        <span className="eyebrow">AUDIT TRAIL</span>
        <h1>Recent activity</h1>
        <p>Every publishing and access action is recorded.</p>
      </div>
      <section className="panel activity-panel">
        {activities.length ? (
          <div className="activity-list">
            {activities.map((activity) => (
              <article className="activity-row" key={activity._id}>
                <span className={`activity-icon ${activity.success ? '' : 'failed'}`}>
                  {activity.action.includes('post') || activity.action.includes('reply') ? (
                    <Send size={17} />
                  ) : activity.action.includes('account') ? (
                    <AtSign size={17} />
                  ) : (
                    <Settings size={17} />
                  )}
                </span>
                <div>
                  <strong>{activityTitle(activity)}</strong>
                  <p>
                    {activity.userName}
                    {activity.handleUsername ? ` · @${activity.handleUsername}` : ''}
                  </p>
                </div>
                <time>{relativeTime(activity.createdAt)}</time>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Activity}
            title="No activity yet"
            text="Publishing and account-management actions will appear here."
          />
        )}
      </section>
    </div>
  );
}

function TeamScreen({
  currentUser,
  members,
  handles,
  busy,
  onCreate,
  onToggleAssignment,
  onToggleActive
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    role: 'poster'
  });

  const submit = async (event) => {
    event.preventDefault();
    const created = await onCreate(values);
    if (created) {
      setValues({ name: '', email: '', password: '', role: 'poster' });
      setShowCreate(false);
    }
  };

  return (
    <div className="screen">
      <div className="page-heading heading-with-action">
        <div>
          <span className="eyebrow">ACCESS CONTROL</span>
          <h1>Team</h1>
          <p>Create individual logins and assign only the X accounts each person handles.</p>
        </div>
        <button className="primary-button" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> Add member
        </button>
      </div>

      <div className="member-list">
        {members.map((member) => (
          <article className={`member-card ${member.isActive ? '' : 'inactive'}`} key={member._id}>
            <button
              className="member-summary"
              onClick={() => setExpanded(expanded === member._id ? null : member._id)}
            >
              <span className="user-avatar">{initials(member.name)}</span>
              <span className="member-identity">
                <strong>{member.name}</strong>
                <small>{member.email}</small>
              </span>
              <span className={`role-chip ${member.role}`}>{roleLabel(member.role)}</span>
              <ChevronRight className={expanded === member._id ? 'rotate' : ''} size={20} />
            </button>
            {expanded === member._id && (
              <div className="member-access">
                <div className="member-access-heading">
                  <div>
                    <strong>Account access</strong>
                    <p>Tap an account to grant or revoke publishing access.</p>
                  </div>
                  {member._id !== currentUser.id && (
                    <button
                      className={`status-toggle ${member.isActive ? '' : 'off'}`}
                      disabled={busy}
                      onClick={() => onToggleActive(member)}
                    >
                      {member.isActive ? 'Active' : 'Inactive'}
                    </button>
                  )}
                </div>
                <div className="assignment-grid">
                  {handles.map((handle) => {
                    const assigned = hasAccess(member, handle._id);
                    return (
                      <button
                        key={handle._id}
                        disabled={busy || member.role === 'super_admin'}
                        className={assigned ? 'assigned' : ''}
                        onClick={() => onToggleAssignment(member, handle, assigned)}
                      >
                        <Avatar handle={handle} />
                        <span>@{handle.username}</span>
                        {assigned && <Check size={16} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </article>
        ))}
      </div>

      {showCreate && (
        <div className="modal-backdrop" role="presentation">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="new-member">
            <div className="modal-heading">
              <div>
                <span className="eyebrow">NEW LOGIN</span>
                <h2 id="new-member">Add team member</h2>
              </div>
              <button className="icon-button" onClick={() => setShowCreate(false)}>
                <X size={21} />
              </button>
            </div>
            <form onSubmit={submit}>
              <label>
                Full name
                <input
                  required
                  value={values.name}
                  onChange={(event) => setValues({ ...values, name: event.target.value })}
                />
              </label>
              <label>
                Email address
                <input
                  type="email"
                  required
                  value={values.email}
                  onChange={(event) => setValues({ ...values, email: event.target.value })}
                />
              </label>
              <label>
                Temporary password
                <input
                  type="password"
                  minLength={10}
                  required
                  value={values.password}
                  onChange={(event) => setValues({ ...values, password: event.target.value })}
                />
                <small>Use at least 10 characters and send it privately.</small>
              </label>
              {currentUser.role === 'super_admin' && (
                <label>
                  Role
                  <select
                    value={values.role}
                    onChange={(event) => setValues({ ...values, role: event.target.value })}
                  >
                    <option value="poster">Poster</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>
              )}
              <button className="primary-button full-width" disabled={busy}>
                {busy ? <RefreshCw className="spin" size={18} /> : <Users size={18} />}
                Create login
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <img src="/icons/icon-192x192.png" alt="WithRG" />
      <RefreshCw className="spin" size={24} />
    </div>
  );
}

function NavButton({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <button className={active ? 'active' : ''} onClick={() => onClick(item.id)}>
      <Icon size={20} />
      <span>{item.label}</span>
    </button>
  );
}

function Stat({ icon: Icon, label, value, sublabel, color }) {
  return (
    <article className={`stat-card ${color}`}>
      <span className="stat-icon">
        <Icon size={21} />
      </span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        {sublabel && <small>{sublabel}</small>}
      </div>
    </article>
  );
}

function Avatar({ handle }) {
  return handle.profileImageUrl ? (
    <img className="account-avatar" src={handle.profileImageUrl} alt="" />
  ) : (
    <span className="account-avatar fallback">{initials(handle.displayName || handle.username)}</span>
  );
}

function AccountIdentity({ handle }) {
  return (
    <div className="account-identity">
      <Avatar handle={handle} />
      <span>
        <strong>{handle.displayName || handle.username}</strong>
        <small>@{handle.username}</small>
      </span>
    </div>
  );
}

function Status({ status }) {
  return (
    <span className={`status-chip ${status}`}>
      <i />
      {status === 'active' ? 'Connected' : status === 'expired' ? 'Reconnect' : 'Disconnected'}
    </span>
  );
}

function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="empty-state">
      <span>
        <Icon size={27} />
      </span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function initials(value = '') {
  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function firstName(value = '') {
  return value.trim().split(/\s+/)[0] || 'there';
}

function roleLabel(role = '') {
  return role === 'super_admin'
    ? 'Super admin'
    : role === 'admin'
      ? 'Admin'
      : 'Poster';
}

function compactNumber(number = 0) {
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(
    number
  );
}

function hasAccess(member, handleId) {
  if (member.role === 'super_admin' || member.role === 'admin') return true;
  return (member.access || []).some((entry) => String(entry.handleId) === String(handleId));
}

function activityTitle(activity) {
  const labels = {
    post_published: 'Post published',
    reply_published: 'Reply published',
    post_reposted: 'Post reposted',
    post_failed: 'Publishing failed',
    login: 'Signed in',
    account_connected: 'X account connected',
    account_disconnected: 'X account disconnected',
    account_assigned: 'Account assigned',
    account_access_revoked: 'Account access removed',
    team_member_created: 'Team member created',
    team_member_updated: 'Team member updated'
  };
  return labels[activity.action] || activity.action.replaceAll('_', ' ');
}

function relativeTime(value) {
  const timestamp = new Date(value).getTime();
  const difference = Date.now() - timestamp;
  if (!Number.isFinite(difference)) return '';
  const minutes = Math.floor(difference / 60_000);
  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 7
    ? `${days}d`
    : new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(timestamp);
}

export default App;
