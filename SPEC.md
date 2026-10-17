# Stugbyn – Swedish learning game: build spec

Oct 17, 2026 · @Trung

## Brief for the Claude Code agent

Build Stugbyn, a mobile-first web app that teaches Swedish from A1 to A2 through short games, then prepares the learner for the YKI intermediate test (levels 3–4). A playable prototype of one region (plurals) already exists; this spec covers the full app.

Read the whole spec before writing code. Where the spec is silent, choose the simplest option that keeps content and code separate, and record the decision in `DECISIONS.md`.

**Goals**

- Every Swedish rule and every word lives in data files, never in component code. Adding vocabulary or a new exercise must not require touching TypeScript.
- Each grammar topic from the learner’s class becomes a playable region with rule cards, a practice game and a boss battle.
- Spaced repetition decides what comes back and when, across all regions.
- A YKI mode trains the four tested skills with exam-style tasks and timed mock tests.
- Works offline on a phone after the first visit.

**Non-goals for version 1**

- No user accounts, social features or leaderboards. Progress is per device, with JSON export and import.
- No AI-generated content at runtime. All exercises come from the reviewed content library.
- No speech recognition scoring. Speaking practice is recorded and self-assessed.

**Terminology to keep.** Use the learner’s teacher’s terms in the UI and rule cards: plural Groups 1–5, verb groups I–IV, “PocKeTS + X” for -te past forms, “fundament” for the first position, “help verbs” for kan, vill, ska, måste, brukar.

## Product overview

The learner walks a small Swedish village where each red cabin is one grammar topic; mastering a topic fills the cabin’s meter and unlocks decorations. A separate building, the Exam Hall, holds YKI practice.

**Learner profile.** An adult living in Finland, taking a twice-weekly A1–A2 class (17 lessons so far), speaking English and studying in English. Next goal after A2: pass YKI intermediate level in Swedish. Studies mostly on a phone, in 5–20 minute sessions.

**Core loop**

1. Open the app and see today’s review count and streak.
2. Do the daily review (due items from all regions, about 15 items).
3. Pick a region: read its rule cards, play a 10-item practice round, or fight its boss.
4. Earn XP and mastery; the cabin and village change as mastery grows.
5. Once a week, do a YKI task or a mini mock test in the Exam Hall.

**Main screens**

| Screen | Purpose |
| --- | --- |
| Village (home) | Grid of region cabins with mastery meters, daily review button, streak, XP, Exam Hall entrance |
| Region | Title, lessons covered, mastery, buttons: Rules, Practice, Boss |
| Rule cards | Swipeable cards: rule, examples, watch-out |
| Game | One exercise at a time, instant feedback with explanation and audio |
| Results | Score, XP, words to review, next action |
| Word bank | Searchable list of all vocabulary by theme, with mastery and audio |
| Exam Hall | YKI skill tracks, mock tests, level estimate |
| Settings | Audio voice and speed, daily goal, export/import progress, reset |

## Tech stack and architecture

Use Vite + React + TypeScript, built as a static Progressive Web App with no backend. Content is JSON in the repo, validated at build time with Zod schemas.

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | React 18 + TypeScript (strict) | Function components and hooks |
| Build | Vite | Static output, deployable to GitHub Pages, Netlify or Vercel |
| Styling | CSS modules or plain CSS with custom properties | Light and dark theme via tokens |
| State | Zustand (or React context + reducer) | One store for progress, one for session |
| Storage | IndexedDB via `idb-keyval`, with localStorage fallback | Progress, settings, recordings |
| Validation | Zod | Content schemas, run in `npm run validate` and in CI |
| Offline | `vite-plugin-pwa` (Workbox) | Precache app shell and all content JSON |
| Audio | Web Speech API (`sv-SE`) plus optional pre-recorded MP3s | See Audio section |
| Tests | Vitest + React Testing Library; Playwright for one smoke test | See Quality section |

**Folder structure**

```
stugbyn/
  content/                  # all language data, edited by humans
    vocab/                  # one JSON file per theme
      family.json
      food.json
      ...
    grammar/                # word tables used by generators
      nouns.json
      verbs.json
      adjectives.json
      numbers.json
    regions/                # one folder per region
      01-uttal/
        region.json         # metadata + rule cards
        items.json          # hand-written exercises
      ...
    yki/
      reading/*.json
      listening/*.json
      writing/*.json
      speaking/*.json
      mock-tests/*.json
    audio/                  # optional mp3 files, named by item id
  src/
    content/                # loaders, Zod schemas, generators
      schemas.ts
      load.ts
      generators/
        nouns.ts
        verbs.ts
        adjectives.ts
        days.ts
    engine/                 # exercise logic, no React
      srs.ts
      session.ts
      grading.ts
    exercises/              # one React component per exercise type
    screens/
    store/
    audio/
  scripts/
    validate-content.ts
    content-report.ts
    new-item.ts
  DECISIONS.md
  CONTENT_GUIDE.md          # copy of the "Growing the library" section
```

**Architecture rules**

- `src/engine` is pure TypeScript with no React imports, so it can be unit tested in isolation.
- Generators turn grammar tables into exercise items at load time. Item ids must be stable and derived from content (for example `verbs:past:köpa`), never random, so saved progress survives rebuilds.
- Exercise components receive an item and return a graded answer through one shared interface; they never read storage directly.
- Progress is keyed by item id. Unknown ids in saved progress are kept but ignored, so removing content never corrupts saves.

## Content library data model

All language content is JSON with one schema per file type. Every record has a stable `id`, a `level` (A1, A2, B1) and optional `lesson` and `tags`, so the app can filter by class progress and exam level.

**Vocabulary entry** (`content/vocab/<theme>.json`)

```json
{
  "theme": "food",
  "title": "Mat",
  "entries": [
    {
      "id": "vocab:food:ost",
      "sv": "ost",
      "en": "cheese",
      "pos": "noun",
      "gender": "en",
      "forms": { "def": "osten", "pl": "ostar", "defPl": "ostarna" },
      "group": 2,
      "level": "A1",
      "lesson": 7,
      "example": { "sv": "Jag gillar inte ost.", "en": "I don’t like cheese." },
      "note": "",
      "tags": ["yki-everyday"]
    }
  ]
}
```

Rules: `pos` is one of noun, verb, adjective, adverb, phrase, other. Nouns need `gender`; countable nouns need `forms` and `group`. Uncountable nouns set `"countable": false`. Verbs and adjectives may appear in vocab files but their forms live in the grammar tables below, linked by `sv`.

**Noun table** (`content/grammar/nouns.json`): `[sv, gender, def, pl, defPl, en, group, note]` as objects, used by the Nouns region. Any vocab noun with full `forms` is merged in automatically.

**Verb table** (`content/grammar/verbs.json`)

```json
{
  "id": "verb:köpa",
  "inf": "köpa", "pres": "köper", "imp": "köp",
  "past": "köpte", "sup": "köpt",
  "also": { "past": [], "sup": [] },
  "en": "buy", "group": 2,
  "object": "en bil",
  "level": "A1", "lesson": 6
}
```

`also` holds accepted alternatives (`sa`/`sade`, `gett`/`givit`). `object` is a short phrase that makes sense after the verb in a sentence frame; leave it `null` to exclude the verb from sentence frames (e.g. `tycka`, `veta`).

**Adjective table** (`content/grammar/adjectives.json`): `base, t, a, def, comp, sup, en`, plus sample nouns `enNoun, ettNoun, plNoun, enDefNoun` for frames. `def` differs from `a` only for liten (lilla). Set `comp`/`sup` to `null` if the class hasn’t covered them.

**Rule card** (inside `region.json`)

```json
{
  "title": "The -ar house",
  "rule": "Short concrete en-words, en-words with an e in one of the last two letters, and -ing words.",
  "examples": [["en bil", "bilar", "car"], ["en pojke", "pojkar", "boy"]],
  "watch": "The last e often disappears: fågel → fåglar."
}
```

**Exercise item** (`items.json`, or produced by a generator). One shape for all types, discriminated by `kind`:

```json
{
  "id": "fragor:var-bor",
  "kind": "choice",
  "prompt": "___ bor du?",
  "hint": "Where do you live?",
  "answer": "Var",
  "options": ["Var", "Vart", "Vad"],
  "explain": "Var = where (a place). Vart = where to.",
  "say": "Var bor du?",
  "level": "A1", "lesson": 2, "tags": ["questions"]
}
```

| kind | Required fields | Grading |
| --- | --- | --- |
| `choice` | prompt, answer, options (2–4, includes answer) | exact match |
| `houses` | prompt, answer (group 1–5) | exact match |
| `type` | prompt, answer, `accept` (extra accepted strings) | normalised match (see Game engine) |
| `order` | `sentence`, `accept` (other valid orders), `en` | normalised token match |
| `match` | `pairs` (4–6 Swedish/English pairs) | all pairs correct |
| `listen` | `audio` or `say`, then choice or type fields | as choice or type |
| `cloze` | `text` with `{{answer}}` gaps, each gap with options or accept | per gap |

**YKI task** (`content/yki/<skill>/*.json`): see the YKI section for its schema.

## Growing the library: adding and updating content

The learner will add words after every class, so adding content must take minutes and need no code. Copy this section into `CONTENT_GUIDE.md` in the repo.

**Add words after a class (the common case)**

1. Open the matching theme file in `content/vocab/` (or create a new one, see below).
2. Add entries with `id`, `sv`, `en`, `pos`, `level` and `lesson`. Nouns also need `gender`, and countable nouns need `forms` and `group`.
3. Run `npm run validate`. It reports missing fields, duplicate ids, a plural group that doesn’t match the forms, and suspicious entries.
4. Run `npm run dev` and check the word in the Word bank. New words enter spaced repetition as unseen items.

Faster option: `npm run new-item -- --theme food` starts a prompt that asks for each field and appends a valid entry. A bulk option: paste a two-column list (`sv;en`) into `content/inbox/*.txt` and run `npm run import-inbox`; the script creates draft entries marked `"draft": true` that the validator lists until gender and forms are filled in. Drafts are hidden in the app.

**Use Claude to draft entries.** The learner can paste class notes into Claude with this prompt and paste the result into the theme file:

```
Convert these Swedish words into entries for content/vocab/<theme>.json
following the schema in CONTENT_GUIDE.md. Fill gender, definite form,
plural, definite plural and plural group (1-5) for nouns. Use level A1
and lesson <n>. Mark any form you are not certain about with "check": true.
<paste words>
```

The validator lists every `"check": true` entry so a human (or the teacher) confirms it before the flag is removed.

**Add a new theme.** Create `content/vocab/<theme>.json` with `theme`, `title` (Swedish) and `entries`. Themes are discovered automatically; the Word bank and the theme deck picker show them without code changes. Suggested themes from the class so far: family, work, free time, health and body, animals, clothes, food, numbers, weather, days and months, personality, directions and transport, shopping and complaints.

**Add verbs or adjectives.** Add a row to `content/grammar/verbs.json` or `adjectives.json`. The generators pick them up and create practice items for every relevant region (present, help verbs, past, perfect; or agreement and comparison). Give verbs an `object` phrase so sentence frames read naturally.

**Add hand-written exercises.** Append items to the region’s `items.json`. Use the next free id in the region’s namespace and include an `explain` line for every item.

**Add a new region.** Create `content/regions/NN-slug/` with `region.json` (id, name in Swedish, English subtitle, lessons, colour, order, rule cards, optional generator names) and `items.json`. The village grid renders regions sorted by `order`.

**Fix or update content.** Edit the entry in place and keep its `id`. Changing an id resets that item’s progress, so only do it on purpose. To retire content, set `"retired": true` rather than deleting, so the item stops appearing but old progress stays valid.

**Validation rules** (`scripts/validate-content.ts`, also run in CI and before build)

- Every file passes its Zod schema; ids are unique across the whole library.
- `choice` options contain the answer exactly once and have no duplicates.
- Noun groups agree with forms: Group 1 plural ends in -or, 2 in -ar, 3 in -er or -r, 4 in -n, 5 equals the singular (or is a listed irregular such as män).
- Definite plural agrees with the plural (adds -na, -a or -en) unless listed as irregular.
- Swedish text uses å, ä, ö (warn on a/o substitutes like "lasa" for läsa when a near match exists).
- Every item has `level`; every rule card has at least two examples.

**Content report.** `npm run content-report` prints counts per theme, level, lesson and region, and lists drafts and `check` flags. Use it to see gaps against the YKI vocabulary topics.

**Versioning and migrations.** `content/version.json` holds a content version number; bump it when content changes. Saved progress stores the version it was made with. On load, the app runs migration functions in `src/content/migrations.ts` for renamed ids (an `idRenames` map), so an intentional rename can keep progress.

## Game engine and exercise types

One session engine runs every game; exercise types differ only in how they display an item and collect an answer. Build the engine and the `choice` type first, then add types one at a time.

**Session flow**

1. `buildSession(pool, size, mode)` picks items (see Spaced repetition) and shuffles them.
2. For each item, the exercise component shows the prompt and collects one answer.
3. `grade(item, answer)` returns `{ correct, expected, explain }`.
4. Feedback panel: “Rätt!” or “Inte riktigt.”, the full correct Swedish (with the gap filled), the explanation, and a play-audio button. Correct answers can auto-advance after 1.2 s if the setting is on; wrong answers always wait for “Next”.
5. A wrong item is re-queued once, 3–4 positions later, in the same session.
6. Results screen: score, XP, list of missed items, buttons for another round or back to the region.

**Grading and normalisation (typed answers).** Trim, collapse spaces, lowercase, strip final punctuation, and compare to `answer` plus `accept`. Never treat a/å/ä or o/ö as equal; instead, when the only difference is a missing diacritic, mark the answer wrong and say “Check the å, ä, ö.” One-letter typos on words longer than 5 letters get “Almost!” feedback but still count as wrong for spaced repetition.

**Exercise types**

| Type | What the learner does | Used for |
| --- | --- | --- |
| Choice | Taps one of 2–4 options | Most grammar items, question words, help verbs |
| Houses | Taps one of five group houses (1 -or, 2 -ar, 3 -er, 4 -n, 5 no ending) | Noun plural groups |
| Type | Types the answer; å ä ö buttons under the field | Boss battles, verb forms, plurals, dictation |
| Order | Taps word tiles into the right order; tap a placed tile to return it | Word order, V2, inte placement, questions |
| Match | Pairs Swedish and English cards, 4–6 pairs, timed | Vocabulary decks |
| Listen | Plays audio, then choice or type | Pronunciation, numbers, listening, dictation |
| Cloze | Fills several gaps in a short text | A2 texts, YKI reading and writing prep |
| Speak | Records the learner, plays model then recording, learner self-rates | Pronunciation, YKI speaking |

**Game modes**

- **Practice:** 10 items from one region, no lives, full XP.
- **Boss battle:** 10 harder items from the region (typed or order types where available), 3 lives. Winning gives a badge and a cabin decoration.
- **Daily review:** up to 15 due items across all regions and vocab decks.
- **Word decks:** pick a vocab theme; mix of match, choice (sv→en and en→sv), listen and type.
- **Speed round (optional, phase 3):** 60 seconds of choice items, for en/ett and plural groups.

**Generators.** Each generator takes a grammar table and returns items with stable ids. Required generators:

- `nouns`: en/ett choice, definite singular, plural group (houses), definite plural, typed plural (boss).
- `verbs`: present vs infinitive in frames (“Jag kan \_\_\_ {object}.” / “Anna \_\_\_ {object} varje dag.”), past (“Igår \_\_\_ jag {object}.”), perfect (“Jag har redan \_\_\_ {object}.”), typed past and supine (boss).
- `adjectives`: en / ett / plural / definite frames, comparison frames, typed agreement (boss).
- `days`: “på fredag” vs “på fredagar” vs “i fredags”.
- `numbers`: number to word (choice, listen, type).

Distractors come from the item’s own other forms (for verbs: present, past, supine, infinitive), so every wrong option is a real Swedish form the learner might confuse.

## Curriculum: the 12 grammar regions

The regions follow the learner’s class (Lektion 1–17, September–October 2026). Seed each region’s rule cards and items from the content below; the class notes are the source of truth for examples and terms.

| # | Region | Lessons | Rule cards | Practice | Boss |
| --- | --- | --- | --- | --- | --- |
| 1 | Uttal (pronunciation) | 1 | Nine vowels; long vs short (tak/tack, väg/vägg); g, k, sk + front vowel (y i e ö ä) → j, tj, sh; tj, sj, skj always tj/sh; rs → sh, rt blended; hj, dj, lj → j | Listen + choice: which sound, which word | Listen and type |
| 2 | Verb (verbs and help verbs) | 3, 4, 13 | Present -r, command form, infinitive -a; kan, vill, ska, måste, brukar + infinitive; borde, får, får inte, behöver inte (never “måste inte”); kunde, ville, skulle | Present vs infinitive frames; help verb meaning | Type infinitive after a help verb |
| 3 | Ordföljd (word order) | 3, 5, 15 | Verb second (golden rule); subject next to verb; inte and adverbs after the first verb; yes/no questions verb first; och, så, eller, men, för; eftersom + clause vs på grund av + noun | Order tiles; pick the correct sentence; linking word choice | Order tiles with lives |
| 4 | Frågor (questions) | 2, 3 | vad, hur, var, när, varför; var vs vart vs varifrån; vilken / vilket / vilka; “Nej, jag gör inte det” | Pick the question word; match answer to question | Build the question (order) |
| 5 | Här & hit (location vs direction) | 6 | hem/hemma, här/hit, där/dit, upp/uppe, ner/nere, in/inne, ut/ute, bort/borta | Arrow or pin choice | Mixed choice with lives |
| 6 | Substantiv (nouns) | 4, 5, 8, 11 | en/ett and definite form; plural Groups 1–5 with the teacher’s rules; exceptions katter, chefer, saker, vänner; definite plural (-na, -a, -en; lärare → lärarna) | en/ett, houses, definite forms | Type plural and definite plural |
| 7 | Adjektiv (adjectives) | 5, 9, 12 | rolig / roligt / roliga; definite after den här and possessives; liten / litet / små / lilla; ny → nytt; comparison -are/-ast, bra bättre bäst, stor större störst; mycket mer mest vs många fler flest | Agreement and comparison frames | Type the right form |
| 8 | Preteritum (past tense) | 6, 7 | Time markers (igår, förra veckan, för … sedan); groups I +de, II +de/+te (PocKeTS + X), III +dde, IV irregular | Past in frames | Type the past form |
| 9 | Pronomen (pronouns) | 12, 14, 15 | Subject vs object (mig, dig, honom, henne, oss, er, dem); possessives min/mitt/mina etc.; sin/sitt/sina vs hans/hennes/deras; reflexive (känner mig, gifta sig); man | Choice with context hints (“her own”, “Sara’s”) | Mixed choice with lives |
| 10 | Dagar & tal (days, numbers, weather) | 10, 11, 13 | på fredag / på fredagar / i fredags; numbers 0–1000, teens -ton, tens -tio; dates (den 6 december); weather phrases | Day frames, number listen, weather emoji choice | Type numbers from audio |
| 11 | Framtid (future and opinions) | 16 | Present + time marker; ska (plans); kommer att (predictions); tänker + infinitive; tycker vs tror vs tänker på | Choice in context | Mixed choice with lives |
| 12 | Perfekt (present perfect) | 17 | har + supine; supine endings (+t, +tt, -it, irregulars); used with aldrig, redan, ännu, någon gång, i + period; bodde vs har bott | Supine frames; past vs perfect choice | Type the supine |

**Example items per region** (seed at least 15 hand-written items per region on top of generated ones):

- Uttal: word “gäst”, ask “How does the g sound?”, options j / hard g, explain “G before a front vowel sounds like j.”
- Verb: “Du \_\_\_ boka bord på McDonald’s.” (no need) → behöver inte; distractors måste inte, får inte.
- Ordföljd: tiles for “Igår köpte hon en kaka”, accepting “Hon köpte en kaka igår”.
- Frågor: “\_\_\_ ska du?” (where are you going) → Vart.
- Här & hit: “Det är sent, jag måste gå \_\_\_.” → hem.
- Pronomen: “Anna ringer \_\_\_ föräldrar.” (her own) → sina; same sentence (Sara’s) → hennes.
- Framtid: “Det \_\_\_ regna imorgon.” → kommer att; “Jag \_\_\_ att Anna har en ny pojkvän.” → tror.
- Perfekt: “Jag \_\_\_ i Finland i 10 år.” (still live here) → har bott.

**Avoid ambiguous items.** If two options are both grammatical (for example a fronted object such as “Kaffe dricker jag inte”), either accept both or rewrite the item. Every choice item needs an English hint that makes exactly one answer correct.

**Unlocking.** All regions are open from the start (the learner already attends class), but the village highlights the region matching the latest lesson, and the A2 regions added later (relative clauses, subordinate word order, passive with -s, conditionals) unlock when their lesson number is reached in Settings.

## YKI preparation mode (the Exam Hall)

The target is the YKI intermediate test in Swedish (mellannivå, levels 3–4, about CEFR B1–B2), with level 3 as the minimum goal. The Exam Hall trains all four subtests separately, because each is scored separately and Finnish citizenship accepts specific pairs of them.

**Facts the app relies on** (verify against the sources before release):

- YKI has four subtests, each assessed separately: speaking, listening comprehension, writing and reading comprehension ([OPH](https://www.oph.fi/sv/allmanna-sprakexamina-yki)).
- For citizenship, level 3 or 4 is needed in one of these pairs: speaking + writing, listening + writing, or reading + speaking; results can come from two separate certificates ([Migri](https://migri.fi/sv/allman-sprakexamen)).
- OPH trialled single-subtest days in autumn 2026, initially only for Finnish ([OPH news](https://www.oph.fi/sv/nyheter/2026/forsok-med-delprovsdagar-yki-testerna-hosten-2026)). Show this as a note in the Exam Hall, not as a feature dependency.

**Skill tracks**

| Track | Practice in the app | Self-check |
| --- | --- | --- |
| Textförståelse (reading) | Short everyday texts: notices, ads, emails, news in easy Swedish; multiple choice, true/false, short typed answers | Auto-graded |
| Talförståelse (listening) | Audio dialogues and announcements (TTS at first, recorded later); choice and gap-fill; play limit of 2 in exam mode | Auto-graded |
| Skriftlig framställning (writing) | Timed tasks: informal message to a friend, formal message (complaint, request, enquiry), opinion text; word counter; phrase bank | Checklist rubric + model answer |
| Muntlig framställning (speaking) | Recorded answers: short dialogue turns, reacting to situations, telling about an experience, giving an opinion; prep timer then answer timer | Self-rating rubric, compare with model answer |

**Writing support.** Each writing task shows the situation, required points, recommended length, and a timer. After submission, the learner ticks a rubric: all points covered, right register (Hej vs formal greeting, Tack på förhand, Vänliga hälsningar), linking words used (och, men, så, för, eftersom, dessutom), verb second, past and perfect correct. A model answer appears after the rubric. Store the text so the learner can show it to the teacher.

**Speaking support.** Use `MediaRecorder` to record answers locally (stored in IndexedDB, never uploaded). Show the prompt, a 30–60 s prep timer, then a 60–90 s answer timer. Afterwards: play model answer (TTS or recorded), play own recording, self-rate on fluency, vocabulary, grammar and pronunciation (1–4).

**Phrase banks.** Reusable chunks tagged by function: greetings and closings, giving opinions (Jag tycker att …, Enligt mig …, Jag håller med / inte med), complaining (Jag skriver eftersom …, Kvittot är bifogat, Garantin gäller fortfarande), asking for things (Kan ni …?, Skulle det vara möjligt att …), telling a story (Först …, sedan …, till slut …). These are vocab entries with `pos: "phrase"` and a `function` tag, drilled like any deck.

**YKI vocabulary topics.** Tag vocab with `yki-<topic>`: home and housing, work and study, health and services, shopping, travel and transport, free time, nature and weather, society and news, relationships. The content report shows coverage per topic.

**Mock tests.** A mock test is a JSON file listing task ids per subtest with time limits. Exam mode hides feedback until the end, enforces timers and listening play limits, then shows a per-subtest result: auto-graded score for reading and listening, rubric results for writing and speaking, and an estimated band (below 3, around 3, around 4). Label the estimate clearly as practice, not an official result.

**YKI task schema** (`content/yki/<skill>/*.json`)

```json
{
  "id": "yki:writing:klagomal-horlurar",
  "skill": "writing",
  "level": "B1",
  "topic": "shopping",
  "register": "formal",
  "situation": "Du köpte hörlurar som inte fungerar. Skriv till affären.",
  "points": ["Vad du köpte och när", "Vad som är fel", "Vad du vill att affären gör"],
  "words": [60, 100],
  "timeMinutes": 15,
  "model": "Hej, Jag skriver om hörlurarna …",
  "rubric": ["all-points", "formal-register", "linking-words", "v2", "tenses"]
}
```

Reading and listening tasks use `text` or `audio`/`script`, plus `questions` (each a choice, true/false or type item from the exercise schema). Speaking tasks use `prompt`, `prepSeconds`, `answerSeconds` and `model`.

**Content sources.** Write original tasks modelled on the official format; do not copy text from the course book (Förbered dig för allmän språkexamen) or other copyrighted material into the repo. The learner can add their own tasks from class through the same JSON format. Use OPH’s published sample tasks as the reference for format and difficulty.

## Spaced repetition, progression and gamification

Use a Leitner box system with six boxes; it is simple to reason about and good enough for this content size. Keep the scheduler behind an interface so it can be swapped for FSRS later.

**Per-item record**

```ts
type ItemProgress = {
  box: 0 | 1 | 2 | 3 | 4 | 5;
  due: number;        // epoch ms
  seen: boolean;
  right: number;
  wrong: number;
  lastAnswer?: number;
};
```

**Intervals:** box 0 = now, 1 = 10 minutes, 2 = 1 day, 3 = 3 days, 4 = 7 days, 5 = 16 days. Correct: box + 1. Wrong: box 1 (or 0 if already 0). An item counts as mastered at box 3 or higher.

**Picking a session of 10:** up to 6 due items (oldest due first), up to 4 unseen items, then fill with more due, more unseen, then the soonest upcoming items. Shuffle the result. Daily review uses only due items, up to 15, across all regions and decks.

**Gamification**

| Element | Rule |
| --- | --- |
| XP | +10 per correct practice answer, +20 per correct boss answer, +50 for winning a boss, +5 per completed writing or speaking task self-check |
| Streak | +1 for each calendar day with at least one completed session; one free “lagom day” per week keeps the streak if a day is missed |
| Daily goal | Default 50 XP, adjustable in Settings |
| Region mastery | Average box of the region’s practice items divided by 5, shown as the cabin’s meter |
| Cabin decorations | Unlocked at 25%, 50%, 75% and 100% mastery (window boxes, flag, lantern, birch tree) and by beating the boss |
| Badges | First boss, 7-day streak, 100 words mastered, all 12 bosses, first mock test, “PocKeTS pro” (50 past-tense items correct) |
| Idiom cards | Collectible cards for Swedish idioms (Det är ingen ko på isen, Lagom är bäst), unlocked by streak milestones |

Keep gamification calm: no countdown pressure outside boss and speed rounds, no punishment screens, and no notifications unless the learner turns on a daily reminder.

**Progress storage and backup.** Save after every answer. Settings has Export (downloads a JSON file with progress, settings and writing texts) and Import (merges by item id, keeping the record with the later `lastAnswer`). Recordings stay local and are not exported unless the learner chooses “include recordings”.

## Audio and pronunciation

Every Swedish word and sentence in the app must be playable. Start with the browser’s built-in Swedish voice and allow recorded files to override it item by item.

**Playback order for an item**

1. `content/audio/<item-id>.mp3` if it exists (ids with `:` mapped to `__` in file names).
2. Web Speech API: `speechSynthesis` with `lang = "sv-SE"`, preferring a voice whose `lang` starts with `sv`, rate 0.9 (Settings: slow 0.7 / normal 0.9 / fast 1.0).
3. If no Swedish voice exists, hide audio buttons and show a one-time note explaining how to install a Swedish voice on the device.

**What gets audio:** the full correct sentence after every answer, every rule-card example, every vocab entry, listening items, and YKI listening tasks.

**Pronunciation region specifics.** Items show a word, play it, and ask which sound a letter makes, which of two words was said (tak or tack), or where the stress falls (kaffe vs kafé). Highlight the target letters in the word. Rule cards include the teacher’s mouth tips (y: mouth for u, say i; ö: mouth for o, say e).

**Recordings for YKI listening.** TTS sounds flat, so YKI listening tasks should move to real recordings when possible: store MP3s under `content/audio/yki/` with a `script` field in JSON (the transcript, shown after answering). A script `scripts/tts-batch.ts` may pre-generate audio with a cloud TTS service at build time if the learner adds an API key in a local `.env`; never ship keys in the app.

**Speaking practice** uses `MediaRecorder` (see YKI section). Ask for microphone permission only when the learner taps Record, and explain what happens to the recording (stays on the device).

## UX and visual design guidelines

Keep the look of the existing Pluralbyn prototype: a calm Swedish village with Falu-red cabins, white trim and a cool birch-white background, readable on a phone in one hand.

**Design tokens** (define as CSS custom properties on `:root`, with dark values under `prefers-color-scheme: dark` and a manual theme switch)

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | #E9EFEE | #121A20 | Page background |
| `--surface` | #FFFFFF | #1B262E | Cards, buttons |
| `--ink` | #1E2B35 | #E4EBED | Text |
| `--muted` | #5B6B75 | #9AAAB3 | Secondary text |
| `--falu` | #9B2B21 | #C0473B | Primary buttons, Group 1 |
| `--ochre` | #C08A27 | #D8A445 | Progress, Group 2 |
| `--lake` | #2E6A8E | #4D8DB3 | Focus ring, Group 3 |
| `--moss` | #5C7838 | #7E9C55 | Ground, Group 4 |
| `--lupin` | #7A6A9A | #9C8BC0 | Group 5 |
| `--good` / `--bad` | #3D7A3A / #A33A2C | #6BB066 / #E06A5A | Feedback |

**Typography:** Young Serif for headings and the big prompt word; Atkinson Hyperlegible for everything else (chosen for letter clarity, which matters for å, ä, ö). Body 17 px, prompt word 44–52 px, sentence prompts 26–30 px.

**Layout and interaction**

- Single column, max width 560 px, sticky top bar with streak and XP, safe-area insets for phones.
- Tap targets at least 44 px; answer options large enough to hit with a thumb.
- Feedback appears below the options without moving them, and the Next button receives focus.
- Show the blank as a visible gap in prompts (“\_\_\_ bor du?”) and fill it in green after answering.
- å, ä, ö buttons under every text field; inputs set `lang="sv"`, `autocapitalize="off"`, `autocorrect="off"`, `spellcheck="false"`.
- One deliberate animation: a small bounce on the correct option. Respect `prefers-reduced-motion`.
- UI language is English; all Swedish content is marked `lang="sv"` so screen readers pronounce it correctly.
- Use curly apostrophes and quotes in all UI text (’ “ ”).

## Quality: tests, content checks, accessibility

Wrong Swedish is the worst bug this app can have, so content checks matter as much as code tests.

**Automated tests (Vitest)**

- `srs.ts`: box moves, intervals, session picking with fake timers.
- `grading.ts`: normalisation, accepted alternatives, diacritic warning, typo “Almost!”.
- Each generator: snapshot of items for three sample rows; every generated choice item has the answer in its options exactly once; ids are stable across runs.
- Migrations: an old save with renamed ids loads with progress intact.
- One Playwright smoke test: open the village, play a practice round in Substantiv, win, see results.

**Content checks** (`npm run validate`, required to pass in CI): see the validation rules in “Growing the library”. Add a spot-check fixture, `content/fixtures/known-forms.json`, listing forms that must stay correct (böcker, lärarna, rummen, män, åt, gjorde, sett, litet, små, lilla, större, bäst), and fail the build if any generator output differs.

**Human review.** Before each content release, the learner exports `npm run content-report -- --new` (all entries added since the last release) and checks it, ideally with the teacher. Entries with `"check": true` never ship to the default decks.

**Accessibility:** WCAG 2.1 AA contrast in both themes, full keyboard play (number keys 1–5 pick options, Enter submits, Space plays audio), visible focus rings, `aria-live` region for feedback, and no meaning carried by colour alone (houses also show their number and ending).

## Build phases and acceptance criteria

Build in five phases and stop for the learner to test after each one. Each phase ends with a working, deployed app.

| Phase | Scope | Done when |
| --- | --- | --- |
| 1. Foundation | Repo, Vite + TS, Zod schemas, content loader, validator, SRS engine, session engine, choice and houses types, Village, Region, Rules, Game and Results screens, storage, PWA | Substantiv region fully playable from JSON (port the Pluralbyn word list); `npm run validate` and tests pass; works offline |
| 2. Grammar regions | Type and order exercise types; generators for nouns, verbs, adjectives, days, numbers; all 12 regions with rule cards and at least 15 hand-written items each; boss battles; daily review | Every region has practice and boss; known-forms fixture passes; daily review pulls from all regions |
| 3. Vocabulary | Theme files for the class themes, Word bank, word decks (match, listen, choice, type), `new-item` and `import-inbox` scripts, content report | Learner adds 10 words from a class in under 5 minutes without touching code |
| 4. Audio and speaking | TTS with recorded overrides, audio on every item, pronunciation region with listen items, MediaRecorder speaking practice | Every Swedish string can be played; recordings stay on device |
| 5. Exam Hall | YKI task schema, reading, listening, writing and speaking tracks, phrase banks, mock test runner with timers and estimated band | One complete mock test can be taken end to end; at least 5 tasks per subtest seeded |

**Definition of done for every phase**

- [ ] `npm run validate`, `npm test` and `npm run build` pass with no warnings.
- [ ] Works on a 375 px wide phone screen and on desktop, in light and dark mode.
- [ ] No Swedish text is hard-coded in components; all of it comes from `content/`.
- [ ] `DECISIONS.md` and `CONTENT_GUIDE.md` are updated.
- [ ] Existing progress still loads after the update.

**First prompt for Claude Code.** “Read SPEC.md. Implement Phase 1 only. Start with the content schemas and validator, then the SRS and session engines with tests, then the screens. Port the noun list and rule cards from the attached pluralbyn.html into content files. Stop when Phase 1’s done-criteria pass and summarise what to test.”

Save this document as `SPEC.md` in the repo root (export it as Markdown) and attach the Pluralbyn prototype HTML and the class notes PDF as reference material.
