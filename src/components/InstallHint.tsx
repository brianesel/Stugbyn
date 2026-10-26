import { useState } from 'react';

const KEY = 'stugbyn:install-hint-dismissed';

/** True when running as an installed home-screen app. */
export function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia?.('(display-mode: standalone)').matches === true;
}

/** iPhone/iPad, including iPadOS which reports itself as a Mac with touch. */
export function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

function dismissed(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

/** The steps, shared by the village card and Settings. */
export function InstallSteps() {
  return (
    <ol className="small" style={{ margin: 0, paddingLeft: 20 }}>
      <li>
        Open Stugbyn in <strong>Safari</strong>.
      </li>
      <li>
        Tap the <strong>Share</strong> button{' '}
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: '-2px' }}>
          <path d="M12 3v12M8 7l4-4 4 4M5 11v9h14v-9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>{' '}
        (at the bottom of the screen, or behind ••• in newer iOS).
      </li>
      <li>
        Choose <strong>Add to Home Screen</strong>, keep “Open as Web App” on, and tap <strong>Add</strong>.
      </li>
      <li>Open Stugbyn from the home screen and sign in under Settings → Account, using the 6-digit code from the email.</li>
    </ol>
  );
}

/** One-time card in iPhone Safari explaining how to install, since iOS has no install prompt. */
export function InstallHint() {
  const [hidden, setHidden] = useState(() => dismissed() || !isIos() || isStandalone());
  if (hidden) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(KEY, '1');
    } catch {
      /* fine: shows again next time */
    }
    setHidden(true);
  };
  return (
    <section className="card note stack" style={{ gap: 10 }} aria-labelledby="install-title">
      <h2 id="install-title">Put Stugbyn on your home screen</h2>
      <p className="small" style={{ margin: 0 }}>
        It then opens like an app, full screen, and works offline.
      </p>
      <InstallSteps />
      <button type="button" className="btn" onClick={dismiss}>
        Got it
      </button>
    </section>
  );
}
