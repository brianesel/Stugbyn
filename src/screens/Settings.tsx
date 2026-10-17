import { useRef, useState } from 'react';
import { AccountPanel } from '../components/AccountPanel';
import { useAccount } from '../store/account';
import type { SpeechRate, Theme } from '../store/save';
import { useProgress } from '../store/progress';

const THEMES: [Theme, string][] = [
  ['system', 'System'],
  ['light', 'Light'],
  ['dark', 'Dark'],
];
const RATES: [SpeechRate, string][] = [
  [0.7, 'Slow'],
  [0.9, 'Normal'],
  [1, 'Fast'],
];

export function Settings() {
  const { save, updateSettings, exportJson, importJson, reset } = useProgress();
  const s = save.settings;
  const file = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');

  const doExport = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stugbyn-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Progress exported.');
  };

  const doImport = async (f: File | undefined) => {
    if (!f) return;
    try {
      importJson(await f.text());
      setMessage('Progress imported and merged.');
    } catch {
      setMessage('That file couldn’t be read. Choose a Stugbyn export (.json).');
    }
    if (file.current) file.current.value = '';
  };

  return (
    <div className="stack">
      <a className="back" href="#/">
        ‹ Village
      </a>
      <h1>Settings</h1>

      <AccountPanel />

      <section className="card stack">
        <fieldset className="field">
          <legend>Theme</legend>
          <div className="segmented">
            {THEMES.map(([v, label]) => (
              <label key={v}>
                <input type="radio" name="theme" checked={s.theme === v} onChange={() => updateSettings({ theme: v })} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Speech speed</legend>
          <div className="segmented">
            {RATES.map(([v, label]) => (
              <label key={v}>
                <input type="radio" name="rate" checked={s.rate === v} onChange={() => updateSettings({ rate: v })} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="switch">
          <input type="checkbox" checked={s.autoAdvance} onChange={(e) => updateSettings({ autoAdvance: e.target.checked })} />
          Move on automatically after a correct answer
        </label>

        <div className="field">
          <label htmlFor="goal">Daily goal (XP)</label>
          <select id="goal" value={s.dailyGoal} onChange={(e) => updateSettings({ dailyGoal: Number(e.target.value) })}>
            {[30, 50, 100, 150, 200].map((g) => (
              <option key={g} value={g}>
                {g} XP
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="lesson">Latest class lesson</label>
          <input
            id="lesson"
            type="number"
            min={1}
            max={99}
            value={s.lessonReached}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isInteger(n) && n >= 1) updateSettings({ lessonReached: n });
            }}
          />
          <span className="small muted">Highlights the matching cabin and unlocks later regions.</span>
        </div>
      </section>

      <section className="card stack" aria-labelledby="backup-title">
        <h2 id="backup-title">Backup</h2>
        <p className="small muted" style={{ margin: 0 }}>
          Progress is stored on this device only. Export it to keep a copy or move it to another device; importing merges
          by item, keeping the most recent answer.
        </p>
        <div className="btn-row">
          <button type="button" className="btn" onClick={doExport}>
            Export progress
          </button>
          <button type="button" className="btn" onClick={() => file.current?.click()}>
            Import progress
          </button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => doImport(e.target.files?.[0])} />
        </div>
        <button
          type="button"
          className="btn"
          style={{ borderColor: 'var(--bad)', color: 'var(--bad)' }}
          onClick={async () => {
            const signedIn = Boolean(useAccount.getState().user);
            const question = signedIn
              ? 'Reset all progress on this device and in your account? Export first if you want a copy.'
              : 'Reset all progress on this device? Export first if you want a copy.';
            if (window.confirm(question)) {
              await reset();
              if (signedIn) await useAccount.getState().overwriteRemote();
              setMessage('Progress reset.');
            }
          }}
        >
          Reset progress
        </button>
        <p role="status" className="small" style={{ margin: 0 }}>
          {message}
        </p>
      </section>
      <p className="small muted">Content version {save.contentVersion}</p>
    </div>
  );
}
