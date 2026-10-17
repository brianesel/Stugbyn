import type { Item, NumbersTable } from '../schemas';
import { fill, uniq } from './template';

/** Writes a number 0–1000 in Swedish, one word: 245 → tvåhundrafyrtiofem. */
export function numberWord(n: number, t: NumbersTable): string {
  if (n === 1000) return t.thousand;
  if (t.words[n] !== undefined) return t.words[n];
  if (n < 100) return t.words[n - (n % 10)] + t.words[n % 10];
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return (h === 1 ? '' : t.words[h]) + t.hundred + (rest ? numberWord(rest, t) : '');
}

/** Other accepted spellings: en for a final one, etthundra / ettusen. */
export function numberVariants(n: number, t: NumbersTable): string[] {
  const w = numberWord(n, t);
  const out = [w];
  if (n % 10 === 1 && n % 100 !== 11) out.push(w.replace(/ett$/, 'en'));
  if (n >= 100 && n < 200) out.push(...out.map((x) => 'ett' + x));
  if (n === 1000) out.push('ettusen', 'ett tusen');
  return uniq(out);
}

/** Numbers learners mix up with n: teen ↔ ten (13 ↔ 30), neighbours. */
function confusables(n: number): number[] {
  const out: number[] = [];
  if (n >= 13 && n <= 19) out.push((n - 10) * 10);
  if (n >= 30 && n <= 90 && n % 10 === 0) out.push(n / 10 + 10);
  out.push(n + 1, n - 1, n + 10, n + 2);
  return out.filter((x) => x >= 0 && x <= 1000 && x !== n);
}

export function generateNumberItems(t: NumbersTable): Item[] {
  const items: Item[] = [];
  for (const n of t.practice) {
    const word = numberWord(n, t);
    const others = uniq(confusables(n)).slice(0, 3);
    const explainKey = n >= 13 && n <= 19 ? 'teen' : n >= 20 && n < 100 && n % 10 === 0 ? 'ten' : n > 20 && word.length > 6 ? 'compound' : 'basic';
    const explain = fill(t.explain[explainKey], { n, word });
    const base = { level: t.level, lesson: t.lesson, tags: ['numbers'] };
    items.push(
      {
        ...base,
        id: `numbers:choice:${n}`,
        kind: 'choice',
        ask: 'Which word is this number?',
        prompt: String(n),
        answer: word,
        options: [word, ...others.map((o) => numberWord(o, t))],
        explain,
        say: word,
      },
      {
        ...base,
        id: `numbers:listen:${n}`,
        kind: 'listen',
        ask: 'Which number do you hear?',
        say: word,
        answer: String(n),
        options: [String(n), ...others.map(String)],
        accept: [],
        explain,
      },
      {
        ...base,
        id: `numbers:dictation:${n}`,
        kind: 'listen',
        ask: 'Type the number you hear, in digits.',
        say: word,
        answer: String(n),
        accept: [],
        explain,
        boss: true,
      },
      {
        ...base,
        id: `numbers:type:${n}`,
        kind: 'type',
        ask: 'Write the number in words.',
        prompt: `${n} = ___`,
        answer: word,
        accept: numberVariants(n, t).filter((x) => x !== word),
        explain,
        say: word,
        boss: true,
      },
    );
  }
  return items;
}
