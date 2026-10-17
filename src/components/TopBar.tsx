import { currentStreak, dailyXp } from '../store/save';
import { useAccount } from '../store/account';
import { useProgress } from '../store/progress';

export function TopBar() {
  const save = useProgress((s) => s.save);
  const signedIn = useAccount((s) => Boolean(s.user));
  const status = useAccount((s) => s.status);
  const now = Date.now();
  const streak = currentStreak(save, now);
  const today = dailyXp(save, now);
  const goal = save.settings.dailyGoal;
  const frac = Math.min(1, today / goal);
  const r = 9;
  const c = 2 * Math.PI * r;
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a className="brand" href="#/">
          Stugbyn
        </a>
        <span className="stat" title="Days in a row">
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="var(--falu)">
            <path d="M12 2s5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 1-3.5S9 11 11 11c0-4 1-9 1-9z" />
          </svg>
          <strong>{streak}</strong>
          <span className="sr-only">day streak</span>
        </span>
        <span className="stat" title={`Today: ${today} of ${goal} XP`}>
          <svg className="goal-ring" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r={r} fill="none" stroke="var(--line)" strokeWidth="4" />
            <circle
              cx="12"
              cy="12"
              r={r}
              fill="none"
              stroke="var(--ochre)"
              strokeWidth="4"
              strokeDasharray={`${frac * c} ${c}`}
              transform="rotate(-90 12 12)"
              strokeLinecap="round"
            />
          </svg>
          <strong>{today}</strong>
          <span>/ {goal} XP</span>
        </span>
        {signedIn && (
          <a
            className="btn-icon sync-icon"
            href="#/settings"
            data-status={status}
            aria-label={status === 'synced' ? 'Progress saved to your account' : status === 'syncing' ? 'Syncing' : 'Not synced yet'}
            title={status === 'synced' ? 'Saved to your account' : status === 'syncing' ? 'Syncing…' : 'Not synced yet'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4 4 0 0 1-.5 9.5z" />
              {status === 'synced' && <path d="m9.5 13 2 2 3.5-3.5" />}
              {(status === 'error' || status === 'offline') && <path d="M12 11v3m0 2.5v.01" />}
            </svg>
          </a>
        )}
        <a className="btn-icon" href="#/settings" aria-label="Settings">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <path d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" transform="translate(-1 0)" />
          </svg>
        </a>
      </div>
    </header>
  );
}
