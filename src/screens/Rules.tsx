import { useRef, useState } from 'react';
import { AudioButton } from '../components/AudioButton';
import { InfoTip } from '../components/InfoTip';
import { library } from '../content/load';
import { NotFound } from './Region';

export function RulesScreen({ id }: { id: string }) {
  const region = library.regions.find((r) => r.id === id);
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  if (!region) return <NotFound />;
  const cards = region.ruleCards;

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(cards.length - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    setIndex(next);
  };

  return (
    <div className="stack">
      <a className="back" href={`#/region/${encodeURIComponent(region.id)}`}>
        ‹ <span lang="sv">{region.name}</span>
      </a>
      <h1>Rules</h1>
      <div
        ref={track}
        className="rules"
        tabIndex={0}
        aria-label="Rule cards, swipe or use the arrow keys"
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            go(index + 1);
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            go(index - 1);
          }
        }}
      >
        {cards.map((c, i) => (
          <article key={c.title} className="card rule-card" aria-label={`Card ${i + 1} of ${cards.length}: ${c.title}`}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <h2>{c.title}</h2>
              <InfoTip fun={c.fun} />
            </div>
            <p style={{ margin: 0 }}>{c.rule}</p>
            <ul className="examples">
              {c.examples.map((ex) => {
                const sv = ex.slice(0, -1);
                const en = ex[ex.length - 1];
                return (
                  <li key={ex.join('|')}>
                    <span className="sv" lang="sv">
                      {sv.join(' → ')}
                    </span>
                    <span className="en">{en}</span>
                    <AudioButton text={sv.join(', ')} />
                  </li>
                );
              })}
            </ul>
            {c.watch && (
              <p className="watch" style={{ margin: 0 }}>
                <strong>Watch out: </strong>
                {c.watch}
              </p>
            )}
          </article>
        ))}
      </div>
      <div className="dots" aria-hidden="true">
        {cards.map((c, i) => (
          <span key={c.title} className={i === index ? 'on' : ''} />
        ))}
      </div>
      <div className="btn-row">
        <button type="button" className="btn" onClick={() => go(index - 1)} disabled={index === 0}>
          ‹ Previous
        </button>
        {index < cards.length - 1 ? (
          <button type="button" className="btn" onClick={() => go(index + 1)}>
            Next ›
          </button>
        ) : (
          <a className="btn btn-primary" href={`#/play/practice/${encodeURIComponent(region.id)}`}>
            Practise now
          </a>
        )}
      </div>
    </div>
  );
}
