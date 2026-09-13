import React, { useEffect, useRef, useState } from 'react';
import { request } from './request';
export default function GoogleSignIn({ onLogin, busy, onError }) {
  const container = useRef(null);
  const callback = useRef(onLogin);
  const failure = useRef(onError);
  callback.current = onLogin; failure.current = onError;
  const [clientId, setClientId] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { let active = true; request('/auth/config').then(data => { if (active) setClientId(data.googleClientId); }).catch(() => {}); return () => { active = false; }; }, []);
  useEffect(() => {
    if (!clientId) return;
    let active = true;
    const init = async () => {
      try {
        const challenge = await request('/auth/google/challenge', { method: 'POST' });
        if (!active) return;
        window.google.accounts.id.initialize({ client_id: clientId, nonce: challenge.nonce, auto_select: false, callback: async response => { await callback.current({ credential: response.credential, challenge: challenge.challenge }, true); if (active) setAttempt(current => current + 1); } });
        window.google.accounts.id.renderButton(container.current, { theme: 'outline', size: 'large', width: 260, text: 'signin_with' });
      } catch (error) { if (active) failure.current(error.message); }
    };
    let script = document.querySelector('script[data-google-signin]');
    if (window.google?.accounts?.id) init();
    else {
      if (!script) { script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.dataset.googleSignin = 'true'; document.head.appendChild(script); }
      script.addEventListener('load', init);
    }
    return () => { active = false; script?.removeEventListener('load', init); };
  }, [clientId, attempt]);
  return clientId ? <div className="google-signin" aria-disabled={busy}><span>Or sign in with your team Google account</span><div ref={container} style={{ pointerEvents: busy ? 'none' : 'auto' }} /></div> : null;
}
