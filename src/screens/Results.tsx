import { useEffect } from 'react';
import { AudioButton } from '../components/AudioButton';
import { library } from '../content/load';
import { expectedText } from '../engine/grading';
import { navigate } from '../router';
import { useSession } from '../store/session';

export function Results() {
  const summary = useSession((s) => s.summary);

  useEffect(() => {
    if (!summary) navigate('/');
  }, [summary]);
  if (!summary) return null;

  const region = summary.regionId ? library.regions.find((r) => r.id === summary.regionId) : null;
  const deck = summary.regionId ? library.decks.find((d) => d.id === summary.regionId) : null;
  const again = summary.mode === 'review' ? '#/play/review' : `#/play/${summary.mode}/${encodeURIComponent(summary.regionId ?? '')}`;
  const boss = summary.mode === 'boss';
  const back = region ? `#/region/${encodeURIComponent(region.id)}` : deck ? `#/words/${encodeURIComponent(deck.theme)}` : '#/';
  const perfect = summary.score === summary.total;

  return (
    <div className="stack">
      <section className="card stack" style={{ gap: 8, textAlign: 'center' }}>
        <h1>
          {boss
            ? summary.won
              ? 'Boss defeated!'
              : 'Out of lives'
            : perfect
              ? 'Perfect round!'
              : summary.score >= summary.total * 0.7
                ? 'Well done!'
                : 'Round complete'}
        </h1>
        <p className="score" aria-label={`Score: ${summary.score} of ${summary.total}`}>
          {summary.score}/{summary.total}
        </p>
        <p className="muted" style={{ margin: 0 }}>
          +{summary.xp + summary.bossXp} XP{summary.bossXp ? ` (incl. +${summary.bossXp} for the win)` : ''}
        </p>
        {boss && (
          <p className="small muted" style={{ margin: 0 }}>
            {summary.won ? 'Your cabin got a golden star.' : 'Practise a little more and try again — no rush.'}
          </p>
        )}
      </section>

      {summary.missed.length > 0 && (
        <section className="card stack" style={{ gap: 10 }} aria-labelledby="missed-title">
          <h2 id="missed-title">Words to review</h2>
          <p className="small muted" style={{ margin: 0 }}>
            These come back sooner in your reviews.
          </p>
          <ul className="missed">
            {summary.missed.map((id) => {
              const item = library.items.get(id);
              if (!item) return null;
              const text = expectedText(item);
              return (
                <li key={id}>
                  <span lang="sv">
                    <strong>{text}</strong>
                  </span>
                  {item.hint && <span className="en">{item.hint}</span>}
                  <AudioButton text={text} itemId={id} />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="btn-row">
        <a className="btn btn-primary" href={again}>
          {summary.mode === 'review' ? 'Review more' : boss ? 'Fight again' : 'Another round'}
        </a>
        <a className="btn" href={back}>
          {region || deck ? (
            <span>
              Back to <span lang="sv">{region?.name ?? deck?.title}</span>
            </span>
          ) : (
            'Back to the village'
          )}
        </a>
      </div>
    </div>
  );
}
