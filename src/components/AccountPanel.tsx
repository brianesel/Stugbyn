import { useState } from 'react';
import { useAccount } from '../store/account';
import { isIos, isStandalone } from './InstallHint';

const STATUS_TEXT = {
  off: '',
  'signed-out': '',
  syncing: 'Syncing…',
  synced: 'Saved to your account',
  offline: 'Offline — will sync when you’re back online',
  error: 'Sync failed',
} as const;

function timeAgo(t: number | null): string {
  if (!t) return '';
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  return new Date(t).toLocaleString();
}

/** Email login (magic link or 6-digit code) and sync status. Hidden when the build has no Supabase settings. */
export function AccountPanel() {
  const a = useAccount();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [link, setLink] = useState('');
  const canReadClipboard = typeof navigator !== 'undefined' && Boolean(navigator.clipboard?.readText);
  const [busy, setBusy] = useState(false);
  // In an installed iPhone app, email links open in Safari, so only the code can sign the app in.
  const codeOnly = isIos() && isStandalone();

  if (!a.configured) {
    return (
      <section className="card stack" aria-labelledby="account-title">
        <h2 id="account-title">Account</h2>
        <p className="small muted" style={{ margin: 0 }}>
          Accounts aren’t set up in this build, so progress is saved on this device only. Use Export below to keep a copy.
        </p>
      </section>
    );
  }

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch {
      /* the store keeps the error message */
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card stack" aria-labelledby="account-title">
      <h2 id="account-title">Account</h2>

      {a.user ? (
        <>
          <p style={{ margin: 0 }}>
            Signed in as <strong>{a.user.email}</strong>
          </p>
          <p role="status" className="small muted" style={{ margin: 0 }}>
            {STATUS_TEXT[a.status]}
            {a.status === 'synced' && a.lastSyncedAt ? ` · ${timeAgo(a.lastSyncedAt)}` : ''}
            {a.error ? ` — ${a.error}` : ''}
          </p>
          <div className="btn-row">
            <button type="button" className="btn" disabled={a.status === 'syncing'} onClick={() => void a.syncNow()}>
              Sync now
            </button>
            <button type="button" className="btn" onClick={() => void run(a.signOut)}>
              Sign out
            </button>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            Your progress stays on this device too, and keeps working offline. Signing in on another device merges both, keeping
            the most recent answer for each item.
          </p>
          <button
            type="button"
            className="btn"
            style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}
            onClick={() => {
              if (window.confirm('Delete your account and the progress saved in it? Progress on this device is kept.')) {
                void run(a.deleteAccount);
              }
            }}
          >
            Delete account
          </button>
        </>
      ) : a.pendingEmail ? (
        <div className="stack" style={{ gap: 12 }}>
          <p style={{ margin: 0 }}>
            We sent an email to <strong>{a.pendingEmail}</strong>.
          </p>
          {codeOnly ? (
            <ol className="small" style={{ margin: 0, paddingLeft: 20 }}>
              <li>
                In the email, <strong>press and hold</strong> the sign-in link (don’t tap it: that opens Safari, not this app).
              </li>
              <li>
                Choose <strong>Copy Link</strong>.
              </li>
              <li>Come back here and paste it below.</li>
            </ol>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>
              Tap the link in the email, or copy the link and paste it below.
            </p>
          )}
          <form
            className="stack"
            style={{ gap: 10 }}
            onSubmit={(e) => {
              e.preventDefault();
              void run(() => a.signInWithLink(link));
            }}
          >
            <div className="field">
              <label htmlFor="signin-link">Sign-in link from the email</label>
              <input
                id="signin-link"
                className="text-input"
                style={{ fontSize: '1rem', fontWeight: 400 }}
                inputMode="url"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="https://…supabase.co/auth/v1/verify?…"
                value={link}
                onChange={(e) => setLink(e.target.value)}
              />
            </div>
            <div className="btn-row">
              {canReadClipboard && (
                <button
                  type="button"
                  className="btn"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      setLink(text);
                      if (text) void run(() => a.signInWithLink(text));
                    } catch {
                      /* clipboard refused: the learner can paste into the field instead */
                    }
                  }}
                >
                  Paste and sign in
                </button>
              )}
              <button type="submit" className="btn btn-primary" disabled={busy || !link.trim()}>
                Sign in
              </button>
            </div>
          </form>
          {a.error && (
            <p role="alert" className="small" style={{ margin: 0, color: 'var(--bad)' }}>
              {a.error}
            </p>
          )}
          <details className="small">
            <summary>The email has a code instead</summary>
            <form
              className="stack"
              style={{ gap: 10, marginTop: 8 }}
              onSubmit={(e) => {
                e.preventDefault();
                void run(() => a.verifyCode(code));
              }}
            >
              <div className="field">
                <label htmlFor="code">Code from the email</label>
                <input
                  id="code"
                  className="text-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                />
              </div>
              <button type="submit" className="btn" disabled={busy || code.length < 6}>
                Sign in with the code
              </button>
            </form>
          </details>
          <button type="button" className="btn" onClick={a.cancelLogin}>
            Use another email
          </button>
        </div>
      ) : (
        <form
          className="stack"
          style={{ gap: 10 }}
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => a.sendLink(email.trim()));
          }}
        >
          <p className="small muted" style={{ margin: 0 }}>
            Sign in with your email to save progress to an account and use it on other devices. No password: we email you a
            sign-in link and code.
          </p>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="text-input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {a.error && (
            <p role="alert" className="small" style={{ margin: 0, color: 'var(--bad)' }}>
              {a.error}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={busy || !email.includes('@')}>
            Email me a sign-in link
          </button>
          <p className="small muted" style={{ margin: 0 }}>
            Stored: your email and your learning progress (answers, XP, streak, settings), in the EU. Voice recordings never leave
            this device.
          </p>
        </form>
      )}
    </section>
  );
}
