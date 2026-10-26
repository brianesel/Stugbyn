import { Cabin } from '../components/Cabin';
import { Meter } from '../components/Meter';
import { library } from '../content/load';
import { countDue, isMastered, isSeen, mastery } from '../engine/srs';
import { useProgress } from '../store/progress';
import { poolFor } from '../store/session';

export function RegionScreen({ id }: { id: string }) {
  const save = useProgress((s) => s.save);
  const region = library.regions.find((r) => r.id === id);
  if (!region) return <NotFound />;

  const ids = poolFor(region.id);
  const bossKinds = new Set(poolFor(region.id, 'boss').map((id) => library.items.get(id)?.kind));
  const bossStyle = bossKinds.has('order') && !bossKinds.has('type') ? ', mostly word order' : bossKinds.has('type') ? ', mostly typed' : '';
  const beaten = Boolean(save.bosses[region.id]);
  const m = mastery(ids, save.items);
  const seen = ids.filter((i) => isSeen(save.items[i])).length;
  const mastered = ids.filter((i) => isMastered(save.items[i])).length;
  const due = countDue(ids, save.items, Date.now());
  const enc = encodeURIComponent(region.id);

  return (
    <div className="stack">
      <a className="back" href="#/">
        ‹ Village
      </a>
      <div className="region-head">
        <Cabin colour={region.colour} mastery={m} boss={beaten} title={`${region.name} cabin`} />
        <div>
          <h1 lang="sv">{region.name}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {region.subtitle}
          </p>
          <p className="small muted" style={{ margin: 0 }}>
            Lessons {region.lessons.join(', ')}
          </p>
        </div>
      </div>

      <div className="card stack" style={{ gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <strong>Mastery</strong>
          <span>{Math.round(m * 100)}%</span>
        </div>
        <Meter value={m} label={`${region.name} mastery`} />
        <div className="stats">
          <div>
            <strong>{seen}</strong>
            <span className="small muted">seen of {ids.length}</span>
          </div>
          <div>
            <strong>{mastered}</strong>
            <span className="small muted">mastered</span>
          </div>
          <div>
            <strong>{due}</strong>
            <span className="small muted">due now</span>
          </div>
        </div>
      </div>

      <div className="stack" style={{ gap: 12 }}>
        <a className="btn btn-block" href={`#/rules/${enc}`}>
          Rules · {region.ruleCards.length} cards
        </a>
        <a className="btn btn-primary btn-block" href={`#/play/practice/${enc}`}>
          Practice · 10 items
        </a>
        <a className="btn btn-block" href={`#/play/boss/${enc}`} aria-describedby="boss-note">
          Boss battle{beaten ? ' · beaten ✓' : ''}
        </a>
        <p id="boss-note" className="small muted" style={{ margin: 0, textAlign: 'center' }}>
          10 harder items{bossStyle}, 3 lives. Win for +50 XP and a cabin decoration.
        </p>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="stack">
      <h1>Not found</h1>
      <a className="btn" href="#/">
        Back to the village
      </a>
    </div>
  );
}
