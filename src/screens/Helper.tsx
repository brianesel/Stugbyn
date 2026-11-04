import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { buildContext } from '../assistant/context';
import { library } from '../content/load';
import { useAccount } from '../store/account';
import { useProgress } from '../store/progress';
import { supabase } from '../sync/client';

type Msg = { role: 'user' | 'assistant'; content: string };

/** Conversations per context, kept while the app is open so leaving and coming back doesn’t lose them. */
const conversations = new Map<string, Msg[]>();

/** Only the last turns go to the server, starting with a learner message. */
function recentTurns(msgs: Msg[]): Msg[] {
  const last = msgs.slice(-12);
  const first = last.findIndex((m) => m.role === 'user');
  return first < 0 ? [] : last.slice(first);
}

type Tone = 'fun' | 'informal' | 'formal';
const TONES: { id: Tone; label: string }[] = [
  { id: 'fun', label: 'Fun' },
  { id: 'informal', label: 'Informal' },
  { id: 'formal', label: 'Formal' },
];
const TONE_KEY = 'stugbyn:helper-tone';
function savedTone(): Tone {
  try {
    const t = localStorage.getItem(TONE_KEY);
    return t === 'fun' || t === 'formal' || t === 'informal' ? t : 'informal';
  } catch {
    return 'informal';
  }
}

const QUICK = [
  { label: 'Write a short text with my words', text: 'Write a short text (4–6 sentences) for me, using the words I have practised. Add the English translation.' },
  { label: '5 example sentences', text: 'Give me 5 example sentences with words and grammar from here, each with an English translation.' },
  { label: 'A short dialogue', text: 'Write a short everyday dialogue (6–8 lines) like in the YKI speaking test, using my words. Add the English translation.' },
];

function backLink(key: string): { href: string; label: string } {
  const [kind, id] = key.split(':');
  if (kind === 'region') {
    const r = library.regions.find((x) => x.id === id);
    if (r) return { href: `#/region/${encodeURIComponent(r.id)}`, label: r.name };
  }
  if (kind === 'deck') {
    const d = library.decks.find((x) => x.theme === id);
    if (d) return { href: `#/words/${encodeURIComponent(d.theme)}`, label: d.title };
  }
  return { href: '#/words', label: 'Word bank' };
}

export function Helper({ ctx }: { ctx: string | null }) {
  const key = ctx ?? 'all';
  const progress = useProgress((s) => s.save.items);
  const account = useAccount();
  // The context is read once per visit, so a reply doesn’t change what the helper knows mid-conversation.
  const context = useMemo(() => buildContext(key, progress), [key]);
  const [msgs, setMsgs] = useState<Msg[]>(() => conversations.get(key) ?? []);
  const [text, setText] = useState('');
  const [tone, setTone] = useState<Tone>(savedTone);
  const pickTone = (t: Tone) => {
    setTone(t);
    try {
      localStorage.setItem(TONE_KEY, t);
    } catch {
      // Private mode: the choice just isn’t remembered.
    }
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const back = backLink(key);

  useEffect(() => {
    conversations.set(key, msgs);
    end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [key, msgs]);

  const signedIn = Boolean(account.user);

  async function send(content: string) {
    const trimmed = content.trim();
    if (!trimmed || busy) return;
    setError(null);
    const next: Msg[] = [...msgs, { role: 'user', content: trimmed }];
    setMsgs(next);
    setText('');
    setBusy(true);
    try {
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      if (!token) throw new Error('Sign in under Settings → Account to use the writing helper.');
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: recentTurns(next), context, tone }),
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `The helper didn’t answer (error ${res.status}).`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = '';
      setMsgs([...next, { role: 'assistant', content: '' }]);
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMsgs([...next, { role: 'assistant', content: answer }]);
      }
      if (!answer.trim()) setMsgs(next);
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      setError(/failed to fetch|load failed|network/i.test(m) ? 'Couldn’t reach the helper. Check your connection and try again.' : m);
      // Keep the learner’s message so they can retry with one tap.
      setMsgs(next);
    } finally {
      setBusy(false);
    }
  }

  const lastUser = [...msgs].reverse().find((m) => m.role === 'user');
  const canRetry = Boolean(error && lastUser && msgs[msgs.length - 1]?.role === 'user');

  return (
    <div className="stack">
      <a className="back" href={back.href}>
        ‹ <span lang="sv">{back.label}</span>
      </a>
      <h1>Writing helper</h1>
      <p className="small muted" style={{ margin: 0 }}>
        Using <strong lang="sv">{context.title}</strong>
        {context.words.length > 0 && ` · ${context.words.length} words you’ve practised`}
        {context.kind === 'region' && ' · its rules and your sentences'}
      </p>

      {!account.configured || !signedIn ? (
        <div className="card stack" style={{ gap: 8 }}>
          <p style={{ margin: 0 }}>The writing helper works when you’re signed in, so only you can use it.</p>
          <a className="btn btn-primary btn-block" href="#/settings">
            Go to Settings → Account
          </a>
        </div>
      ) : (
        <>
          <div className="chat" aria-live="polite">
            {msgs.length === 0 && (
              <p className="muted small" style={{ margin: 0 }}>
                Ask for a text with your words, paste English to translate, or write Swedish and tap Check.
              </p>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`bubble ${m.role === 'user' ? 'me' : 'bot'}`}>
                {m.role === 'assistant' ? <RichText text={m.content || '…'} /> : m.content}
              </div>
            ))}
            {busy && msgs[msgs.length - 1]?.role === 'user' && <div className="bubble bot muted">Thinking…</div>}
            <div ref={end} />
          </div>

          {error && (
            <p className="watch" role="alert" style={{ margin: 0 }}>
              {error}{' '}
              {canRetry && lastUser && (
                <button
                  type="button"
                  className="linklike"
                  onClick={() => {
                    setMsgs(msgs.slice(0, -1));
                    void send(lastUser.content);
                  }}
                >
                  Try again
                </button>
              )}
            </p>
          )}

          <div className="tone-row">
            <span className="small muted">Tone</span>
            <div className="chips" role="group" aria-label="Tone">
              {TONES.map((t) => (
                <button key={t.id} type="button" className="chip" aria-pressed={tone === t.id} onClick={() => pickTone(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="chips" role="group" aria-label="Quick requests">
            {QUICK.map((q) => (
              <button key={q.label} type="button" className="chip" disabled={busy} onClick={() => void send(q.text)}>
                {q.label}
              </button>
            ))}
          </div>

          <label className="sr-only" htmlFor="helper-text">
            Your text or question
          </label>
          <textarea
            id="helper-text"
            className="search helper-input"
            rows={3}
            placeholder="Write in Swedish or English…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={3000}
          />
          <div className="helper-actions">
            <button type="button" className="btn" disabled={busy || !text.trim()} onClick={() => void send(`Translate this:\n${text}`)}>
              Translate
            </button>
            <button type="button" className="btn" disabled={busy || !text.trim()} onClick={() => void send(`Check my Swedish:\n${text}`)}>
              Check my Swedish
            </button>
            <button type="button" className="btn btn-primary" disabled={busy || !text.trim()} onClick={() => void send(text)}>
              Ask
            </button>
          </div>
          {msgs.length > 0 && (
            <button type="button" className="linklike small" disabled={busy} onClick={() => setMsgs([])}>
              Start a new conversation
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** **bold** inside a line. */
function inline(line: string): ReactNode[] {
  return line.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

/** The small Markdown subset the helper is asked to use: paragraphs, "- " lists and **bold**. */
export function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).filter((b) => b.trim());
  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split('\n').filter((l) => l.trim());
        if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*[-*•]\s+/, ''))}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}
