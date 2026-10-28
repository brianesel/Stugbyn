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
        <form
          className="stack"
          style={{ gap: 10 }}
          onSubmit={(e) => {
            e.preventDefault();
            void run(() => a.verifyCode(code));
          }}
        >
          <p style={{ margin: 0 }}>
            We sent an email to <strong>{a.pendingEmail}</strong>.{' '}
            {codeOnly ? (
              <>
                Type the <strong>code</strong> from the email here. Don’t tap the link: on iPhone it opens Safari, not this app.
              </>
            ) : (
              'Tap the link in it, or type the code here.'
            )}
          </p>
          <div className="field">
            <label htmlFor="code">Code from the email</label>
            <input
              id="code"
              className="text-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
              autoFocus
            />
            <span className="small muted">No code in the email? It may be in another email from Supabase, or the email settings need the code added (see DEPLOY.md, step 4).</span>
          </div>
          {a.error && (
            <p role="alert" className="small" style={{ margin: 0, color: 'var(--bad)' }}>
              {a.error}
            </p>
          )}
          <div className="btn-row">
            <button type="submit" className="btn btn-primary" disabled={busy || code.length < 6}>
              Sign in
            </button>
            <button type="button" className="btn" onClick={a.cancelLogin}>
              Use another email
            </button>
          </div>
        </form>
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
            {codeOnly ? 'Email me a sign-in code' : 'Email me a sign-in link'}
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
