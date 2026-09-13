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
import { request } from './request';
import GoogleSignIn from './GoogleSignIn';
import { ComposeScreen, HistoryScreen, EngageScreen, SettingsScreen } from './WorkflowScreens';

const TOKEN_KEY = 'withrg_x_session';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('tab');
    return ['home', 'compose', 'accounts', 'activity', 'team', 'history', 'engage', 'settings'].includes(requested)
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

  const api = useCallback(async (path, options = {}) => {
    try { return await request(path, options, token); }
    catch (error) {
      if (error.status === 401) { localStorage.removeItem(TOKEN_KEY); setToken(null); setUser(null); }
      if (error.body?.code === 'PASSWORD_CHANGE_REQUIRED') setTab('settings');
      throw error;
    }
  }, [token]);
  function acceptSession(result) {
    localStorage.setItem(TOKEN_KEY, result.token);
    setUser(result.user); setToken(result.token);
    if (result.user.mustChangePassword) setTab('settings');
  }

  const isAdmin = user && ['super_admin', 'admin'].includes(user.role);

  const refreshApp = useCallback(
    async (resolvedUser = user) => {
      if (!resolvedUser || resolvedUser.mustChangePassword) return;
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
        if (me.mustChangePassword) setTab('settings');
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
    if (!toast || !user) return undefined;
    const timeout = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [toast, user]);

  const signOut = async () => {
    if (busy) return;
    try { await api('/auth/logout', { method: 'POST' }); } catch {}
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setTab('home');
    setHandles([]); setMembers([]); setDashboard(null); setActivities([]);
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
    if (busy) { setToast({ type: 'info', text: 'Please wait for the current action to finish.' }); return; }
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
    return <Login busy={busy} error={toast?.text} onError={text => setToast({ type: 'error', text })} onLogin={async (credentials, google = false) => {
      setBusy(true); setToast(null);
      try { acceptSession(await request(google ? '/auth/google' : '/auth/login', { method: 'POST', body: JSON.stringify(credentials) })); }
      catch (error) { setToast({ type: 'error', text: error.message }); }
      finally { setBusy(false); }
    }} />;
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
            <button className="profile-button" aria-label="Your settings" onClick={() => goTo('settings')}>
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
          <button onClick={() => goTo('history')}>History & insights</button>
          <button onClick={() => goTo('engage')}>Like or repost</button>
          <button onClick={() => goTo('settings')}><Settings size={18} /> Settings</button>
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
        {tab === 'home' && !user.mustChangePassword && (
          <HomeScreen
            user={user}
            dashboard={dashboard}
            handles={handles}
            onNavigate={goTo}
          />
        )}
        {tab === 'compose' && !user.mustChangePassword && <ComposeScreen user={user} handles={handles} api={api} online={online} onPublished={refreshApp} onBusy={setBusy} />}
        {(tab === 'settings' || user.mustChangePassword) && <SettingsScreen user={user} api={api} onSession={acceptSession} />}
        {tab === 'history' && !user.mustChangePassword && <HistoryScreen handles={handles} api={api} />}
        {tab === 'engage' && !user.mustChangePassword && <EngageScreen user={user} handles={handles} api={api} onDone={refreshApp} />}
        {tab === 'accounts' && !user.mustChangePassword && (
          <AccountsScreen
            handles={handles}
            isAdmin={isAdmin}
            isSuperAdmin={user.role === 'super_admin'}
            onRefresh={async handle => { try { await api(`/handles/${handle._id}/refresh`, { method: 'POST' }); await refreshApp(); } catch (error) { setToast({ type: 'error', text: error.message }); } }}
            onDisconnect={async handle => { if (!window.confirm(`Disconnect @${handle.username} and remove all handler access?`)) return; try { const result = await api(`/handles/${handle._id}`, { method: 'DELETE' }); setToast({ type: 'info', text: result.message }); await refreshApp(); } catch (error) { setToast({ type: 'error', text: error.message }); } }}
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
        {tab === 'activity' && !user.mustChangePassword && <ActivityScreen activities={activities} />}
        {tab === 'team' && isAdmin && !user.mustChangePassword && (
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
            onResetPassword={async (member, password) => {
              try { const result = await api(`/team/members/${member._id}/password`, { method: 'POST', body: JSON.stringify({ password }) }); setToast({ type: 'success', text: result.message }); return true; }
              catch (error) { setToast({ type: 'error', text: error.message }); return false; }
            }}
            onChangeRole={async (member, role) => {
              try { await api(`/team/members/${member._id}`, { method: 'PATCH', body: JSON.stringify({ role }) }); await refreshApp(); }
              catch (error) { setToast({ type: 'error', text: error.message }); }
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

function Login({ busy, onLogin, error, onError }) {
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
        {error && <p className="inline-warning" role="alert">{error}</p>}
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
        <GoogleSignIn onLogin={onLogin} busy={busy} onError={onError} />
        <p className="login-help">Use your own dashboard login. Ask an administrator if you need access or a password reset.</p>
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

function AccountsScreen({ handles, isAdmin, isSuperAdmin, busy, onConnect, onRefresh, onDisconnect }) {
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
              <small>Counts updated {new Date(handle.metricsUpdatedAt || handle.lastConnectedAt).toLocaleString()}</small>
              <div className="action-row">
                {handle.status !== 'disconnected' && <button className="text-button" onClick={() => onRefresh(handle)}>Refresh counts</button>}
                {isSuperAdmin && handle.status !== 'disconnected' && <button className="text-button danger" onClick={() => onDisconnect(handle)}>Disconnect</button>}
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
        <p>Recent publishing and access actions, including failed or unconfirmed attempts.</p>
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
                  {activity.details?.message && <p className="activity-detail">{activity.details.message}</p>}
                  {activity.postId && <a href={`https://x.com/i/web/status/${activity.postId}`} target="_blank" rel="noreferrer">View post</a>}
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
  onToggleActive,
  onResetPassword,
  onChangeRole
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
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
                    <p>Posters use assigned accounts. Admins can access all accounts.</p>
                  </div>
                  {member._id !== currentUser.id && member.role !== 'super_admin' && (currentUser.role === 'super_admin' || member.role === 'poster') && (
                    <button
                      className={`status-toggle ${member.isActive ? '' : 'off'}`}
                      disabled={busy}
                      onClick={() => onToggleActive(member)}
                    >
                      {member.isActive ? 'Active' : 'Inactive'}
                    </button>
                  )}
                </div>
                {member.role !== 'super_admin' && (currentUser.role === 'super_admin' || member.role === 'poster') && <>
                  {currentUser.role === 'super_admin' && <label>Role<select aria-label={`Role for ${member.name}`} value={member.role} onChange={event => onChangeRole(member, event.target.value)}><option value="poster">Poster</option><option value="admin">Admin — all accounts</option></select></label>}
                  <form onSubmit={async event => { event.preventDefault(); if (await onResetPassword(member, resetPassword)) setResetPassword(''); }}><label>Reset temporary password<input type="password" autoComplete="new-password" minLength={12} required value={resetPassword} onChange={event => setResetPassword(event.target.value)} /></label><button className="secondary-button" disabled={busy}>Reset password</button></form>
                </>}
                <div className="assignment-grid">
                  {handles.map((handle) => {
                    const assigned = hasAccess(member, handle._id);
                    return (
                      <button
                        key={handle._id}
                        disabled={busy || member.role !== 'poster'}
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
                  minLength={12}
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
