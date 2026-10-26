import { useHasSwedishVoice } from '../audio/speak';
import { Cabin } from '../components/Cabin';
import { InstallHint } from '../components/InstallHint';
import { Meter } from '../components/Meter';
import { library } from '../content/load';
import type { LibraryRegion } from '../content/library';
import { countDue, mastery } from '../engine/srs';
import { poolFor } from '../store/session';
import { useAccount } from '../store/account';
import { useProgress } from '../store/progress';

/** The region for the latest lesson reached: the one whose lessons include the highest number ≤ lessonReached. */
function currentRegionId(regions: LibraryRegion[], lessonReached: number): string | null {
  let best: { id: string; lesson: number } | null = null;
  for (const r of regions) {
    for (const l of r.lessons) if (l <= lessonReached && (!best || l > best.lesson)) best = { id: r.id, lesson: l };
  }
  return best?.id ?? null;
}

export function Village() {
  const save = useProgress((s) => s.save);
  const markSeen = useProgress((s) => s.markNoVoiceNoteSeen);
  const hasVoice = useHasSwedishVoice();
  const account = { configured: useAccount((s) => s.configured), user: useAccount((s) => s.user) };
  const hasProgress = Object.keys(save.items).length > 0;
  const now = Date.now();
  const due = countDue(poolFor(null), save.items, now);
  const highlight = currentRegionId(library.regions, save.settings.lessonReached);

  return (
    <div className="stack">
      <section className="card daily" aria-labelledby="daily-title">
        <div>
          <h1 id="daily-title">Daily review</h1>
          <p className="muted" style={{ margin: 0 }}>
            {due > 0 ? (
              <>
                <span className="daily-count">{due}</span> {due === 1 ? 'item is' : 'items are'} due
              </>
            ) : (
              'Nothing due right now. Play a region to learn new items.'
            )}
          </p>
        </div>
        <a
          className="btn btn-primary"
          href={due > 0 ? '#/play/review' : undefined}
          aria-disabled={due === 0}
          style={due === 0 ? { opacity: 0.55, pointerEvents: 'none' } : undefined}
        >
          Start review
        </a>
      </section>

      <InstallHint />

      {account.configured && !account.user && hasProgress && (
        <section className="card note small" style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <span>Progress is saved on this device only. Sign in with your email to keep it safe and use other devices.</span>
          <a className="btn" href="#/settings">
            Sign in
          </a>
        </section>
      )}

      {hasVoice === false && !save.noVoiceNoteSeen && (
        <section className="card note" role="note">
          <h2>No Swedish voice found</h2>
          <p>
            Audio buttons are hidden because this device has no Swedish text-to-speech voice. To add one: on iPhone, go to
            Settings → Accessibility → Spoken Content → Voices → Swedish; on Android, Settings → Text-to-speech → install
            Swedish; on a computer, add Swedish in the system’s speech or language settings. Then reload the app.
          </p>
          <button type="button" className="btn" onClick={markSeen}>
            OK, got it
          </button>
        </section>
      )}

      {library.decks.length > 0 && (
        <a className="card exam-hall" href="#/words" style={{ textDecoration: 'none', color: 'inherit' }}>
          <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
            <rect x="10" y="8" width="36" height="42" rx="4" fill="var(--surface-2)" stroke="var(--ochre)" strokeWidth="2" />
            <rect x="16" y="16" width="24" height="4" rx="2" fill="var(--ochre)" />
            <rect x="16" y="25" width="20" height="3" rx="1.5" fill="var(--muted)" />
            <rect x="16" y="32" width="22" height="3" rx="1.5" fill="var(--muted)" />
            <rect x="16" y="39" width="14" height="3" rx="1.5" fill="var(--muted)" />
          </svg>
          <div>
            <h2 style={{ marginBottom: 2 }}>Word bank</h2>
            <p className="muted small" style={{ margin: 0 }}>
              {library.decks.reduce((n, d) => n + d.entries.length, 0)} words in {library.decks.length} themes from class. Search, listen
              and practise each theme as a deck.
            </p>
          </div>
        </a>
      )}

      <section aria-labelledby="village-title" className="stack">
        <h2 id="village-title">The village</h2>
        <div className="village">
          {library.regions.map((r) => {
            const ids = poolFor(r.id);
            const m = mastery(ids, save.items);
            const locked = r.unlockLesson !== undefined && save.settings.lessonReached < r.unlockLesson;
            const current = r.id === highlight;
            return (
              <a
                key={r.id}
                href={locked ? undefined : `#/region/${encodeURIComponent(r.id)}`}
                className={`cabin-card${current ? ' current' : ''}${locked ? ' locked' : ''}`}
                aria-disabled={locked || undefined}
              >
                <Cabin colour={r.colour} mastery={m} boss={Boolean(save.bosses[r.id])} title={`${r.name} cabin`} />
                {current && <span className="tag">Latest lesson</span>}
                <span className="cabin-name" lang="sv">
                  {r.name}
                </span>
                <span className="cabin-sub">{locked ? `Unlocks at lesson ${r.unlockLesson}` : r.subtitle}</span>
                <Meter value={m} label={`${r.name} mastery`} />
              </a>
            );
          })}
        </div>
      </section>

      <section className="card exam-hall" aria-labelledby="exam-title">
        <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
          <path d="M6 22 28 8l22 14z" fill="var(--lake)" />
          <rect x="10" y="22" width="36" height="26" fill="var(--surface-2)" stroke="var(--lake)" strokeWidth="2" />
          <rect x="15" y="27" width="4" height="17" fill="var(--lake)" />
          <rect x="26" y="27" width="4" height="17" fill="var(--lake)" />
          <rect x="37" y="27" width="4" height="17" fill="var(--lake)" />
        </svg>
        <div>
          <h2 id="exam-title">Exam Hall</h2>
          <p className="muted small" style={{ margin: 0 }}>
            YKI practice for reading, listening, writing and speaking. Opens in a later update.
          </p>
        </div>
      </section>
    </div>
  );
}
