# Decisions

Choices made where SPEC.md is silent or where reality differed. Newest phase at the bottom.

## Phase 1 — Foundation (2026-10-17)

**Reference material.** The Pluralbyn prototype HTML and the class-notes PDF were not available when Phase 1 was built. The noun list (83 nouns across Groups 1–5) and the nine Substantiv rule cards were written from the spec’s rules and terms instead. Lesson numbers on nouns (4, 8, 11) are best guesses inside the region’s lessons 4, 5, 8, 11. **Action:** when the prototype is attached, compare its word list and rule cards with `content/grammar/nouns.json` and `content/regions/06-substantiv/region.json`, keeping existing ids.

**Repo layout.** The app lives in the repository root (not a `stugbyn/` subfolder). The YKI textbook PDF in the root is git-ignored (`*.pdf`) because it is copyrighted reference material.

**Noun table shape.** `content/grammar/nouns.json` is an object, not a bare array: `groups` (ending, label and rule text per group, used by the houses buttons and explanations), `explain` and `say` (templates with `{placeholders}` that the generator fills), and `nouns`. This keeps every Swedish string and grammar explanation in content rather than in `src/`.

**Extra noun fields.** `enPl` (English plural when it isn’t +s, for hints like “the children”), `irregular` (skips the validator’s group and definite-plural agreement checks; used for öga, öra, rum, fönster, lärare, läkare, man), `defPlNote` (explanation for the definite plural of irregulars).

**Extra item field.** `ask`: an optional short English instruction above the prompt (“Pick the plural.”). Generated noun items need it because the prompt (“en bil”) is the same for several question types.

**Generated noun items.** Five per noun: en/ett choice, definite form choice, plural choice, definite plural choice, and houses. The plural choice item was added (beyond the spec’s list) so the known-forms fixture can check plurals such as böcker and män before the typed boss items exist. Ids: `nouns:gender|def|pl|defpl|houses:<sv>`.

**Distractors in hand-written items.** Generator distractors are always real forms of the same noun, as the spec requires. Hand-written items may use typical learner errors as distractors (kattar, bokar), because those are exactly the mistakes being trained. The diacritic check therefore ignores choice options and only checks prompts, answers, `say`, rule-card Swedish and vocab examples.

**Content loading.** The app imports content with Vite `import.meta.glob` (eager), so JSON is bundled into the JS and precached by the service worker; offline works after the first visit. Scripts read the same files from disk into the same `RawContent` shape and share `buildLibrary()` / `validateContent()` with the app and tests. Invalid records are skipped with a console warning in dev rather than breaking the app; the validator fails the build on them.

**Validator severity.** Errors and warnings both fail `npm run validate` (and therefore `npm run build`), matching “no warnings” in the definition of done. Drafts and `"check": true` entries are reported as info lines and don’t fail. Vocab nouns with `check` or `draft` are excluded from generated items.

**SRS on retries.** Only the first attempt at an item in a session moves it between Leitner boxes. The in-session retry (re-queued 3–4 positions later) still earns XP when correct but doesn’t change the box. Unseen items are picked at random rather than in file order, so a round doesn’t drill five forms of one word in a row.

**Score vs XP.** The results score counts first attempts (“7/10”). XP counts every correct answer, including retries.

**Streak and lagom day.** A missed single day keeps the streak if the lagom day hasn’t been used in that ISO week (Monday–Sunday) of the missed day.

**Export / import merge.** Items merge by id, keeping the record with the later `lastAnswer`. XP takes the larger total, the streak the one with the more recent day, and settings come from whichever save was updated last.

**Routing.** Hash routing (`#/region/substantiv`) without a router library, so the static build works on GitHub Pages sub-paths. `base: './'` in Vite for the same reason.

**Fonts.** Young Serif and Atkinson Hyperlegible are self-hosted through `@fontsource` packages so they are precached and work offline.

**Contrast.** White text on the Falu red in both themes (the dark-theme Falu with dark text fails AA). The “Latest lesson” tag uses dark ink on ochre in both themes.

**PWA icon.** A single SVG icon (`sizes: any`). Add PNG icons (192/512) if a platform needs them.

**Audio.** A minimal TTS layer ships in Phase 1 because the feedback panel needs a play button: recorded `content/audio/<id>.mp3` first (`:` written as `__`), then the browser’s `sv` voice at the chosen speed, else audio buttons are hidden and the village shows a one-time note on installing a Swedish voice. Full audio coverage is Phase 4.

**Scope held back to later phases.** Boss battles (button shown disabled), daily-review content from vocab decks, Word bank, Exam Hall (shown as a placeholder), badges, idiom cards, boss decorations. The engine already supports boss lives so Phase 2 only needs harder item selection and the typed/order components.

**Smoke test.** The Playwright test plays a full Substantiv practice round and checks the results screen. It doesn’t force a perfect score, since options are shuffled and the test can’t know the answer before tapping.

## Phase 2 — Grammar regions (2026-10-17)

**Hand-written content was drafted in parallel and reviewed.** The 11 new regions’ rule cards and items were drafted region by region, then every item was read back for correctness and ambiguity before shipping. Lesson numbers inside each region (e.g. Pronomen: 12 subject/object, 14 possessives and sin, 15 reflexives) are guesses; adjust them against the class notes.

**Boss items.** Items carry an optional `boss: true`. Practice rounds and region mastery use only non-boss items; boss battles use boss items first and top up with practice items when a region has fewer than 10. Generators emit a typed boss twin for every frame item (`verbs:past-type:köpa`, `adj:ett-type:stor`, `days:last-type:fredag`, `numbers:type:245`, `numbers:dictation:245`).

**Boss rewards.** Winning (finishing with lives left) gives +50 XP on top of +20 per correct answer, and stores the first win time in `save.bosses`. The cabin shows a golden star on the roof. Losing shows a calm “Out of lives” screen with no penalty. Badges are not built yet.

**Grammar tables.** `verbs.json`, `adjectives.json`, `days.json` and `numbers.json` keep both data and sentence/explanation templates, like `nouns.json`. Extra fields beyond the spec: verbs have English forms (`en3`, `enPast`, `enPp`), `objectEn`, an optional `time` marker for the past frame (Förra året bodde jag …) and `noHelp` to skip the help-verb frame where it reads oddly. Adjectives have English nouns for hints and optional `compFrame`/`supFrame` when “Min X är …” reads oddly (kall, varm, ung, gammal, lång, trött). The frame for each verb is chosen by a stable hash of the word, so content and ids never shuffle between builds.

**Verb object rule.** `object: null` keeps a verb out of sentence frames (vara, tycka, veta, tro, må, behöva); those verbs still get bare drills (“tycka → ___”) for past and supine.

**Numbers.** Written as one word (tvåhundrafyrtiofem). Typed answers also accept en for a final one (tjugoen) and etthundra/ettusen. Number listening uses the word as speech text and digits as the answer.

**Listen exercise.** Built in Phase 2 (ahead of Phase 4) because Uttal and Dagar & tal need it. It plays once on appearing, has a Play again button, and if the device has no Swedish voice it shows the text instead, so the item stays playable.

**Order exercise.** Tiles are the sentence’s words with final punctuation removed; capitalisation is kept (the first word shows a capital). Used tiles leave an invisible placeholder so the remaining tiles never move under the thumb. Grading ignores case and punctuation and accepts every order listed in `accept`.

**Validator additions.** Verb forms are checked against their group (I: -ar/-ade/-at, II: -de/-te and -t, III: -r/-dde/-tt). Adjective plurals must end in -a and ett-forms in -t unless irregular or indeclinable. Gap-fill choice items need a hint; non-gap choice items (a number, an emoji, a word for Uttal) don’t. `content/allowed-words.json` lists real words the diacritic check must not flag (kort vs kört, svart vs svårt).

## Accounts and hosting (2026-10-17)

**Accounts replace a v1 non-goal.** The spec said “no user accounts”; the learner asked for email login and saved progress, so accounts were added as an optional layer. A build without `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` behaves exactly as before.

**Supabase in an EU region, magic link + code.** Supabase gives email login and Postgres with row level security; the project is created in Stockholm or Frankfurt. Login is passwordless: the email carries both a link and a 6-digit code, because a link tapped in a mail app often opens a different browser than the installed PWA. Implicit flow (not PKCE) is used so a link opened in another browser on the same device still signs that browser in.

**One row per user.** `progress(user_id, data jsonb, updated_at)` holds the whole save. The save is small (a few hundred KB at most), so per-item rows aren’t worth the complexity.

**Local-first sync.** The device copy stays primary; sync is pull → merge → push, a few seconds after changes, on leaving the app and on reconnect. The merge reuses the import rules (latest `lastAnswer` per item, max XP, latest streak, union of boss wins, settings from the most recently changed save). A brand-new save has `updatedAt: 0` so it never overrides the account’s settings. Known limit: XP earned on two devices between syncs is combined with max(), not added.

**Reset and delete.** Reset while signed in overwrites the account copy instead of merging (otherwise the old progress would come straight back). Delete account calls a `security definer` function that deletes the auth user; progress cascades. Voice recordings (Phase 4) stay local.

## Class notes up to lesson 21 (2026-10-26)

**Lesson numbers come from the notes.** Grammar tables have a `lessons` map giving the lesson each generated item type was taught in (nouns: en/ett 4, definite 5, plural and houses 8, definite plural 11; verbs: present 3, past 6, perfect 17; adjectives: en/ett 5, plural/definite 9, comparison 12). It overrides the row’s own `lesson`. Numbers are lesson 10, days lesson 13. CURRICULUM.md maps every lesson to its region.

**Region 13, Bisatser (lessons 18–21),** covers conjunctions vs subjunctions, inte before the verb in subordinate clauses, inversion after a fronted clause, för att + infinitive, trots att, and å ena sidan / å andra sidan. It is open from the start (no `unlockLesson`), since the class has already reached it. Order items accept marked-but-correct fronted orders (Att du ljuger vet jag.) so a grammatical answer is never marked wrong.

**Raw class notes stay out of the repo.** They include classmates’ personal introductions and the repo is public; only the topic map and our own example sentences are committed.

**Default latest lesson is 21.** Existing saves keep their stored value until changed in Settings.

## Phase 3 — Vocabulary and iPhone install (2026-10-26)

**Vocab nouns are not merged into Substantiv.** The spec merges complete vocab nouns into the noun region. With ~340 class nouns that region would have ~2,300 items and its mastery meter would barely move, so vocab nouns are practised in their theme decks instead (each deck includes en/ett items). They are still validated with the same plural-group and definite-plural rules. The grammar noun table stays the curated Substantiv list.

**Deck items.** Per word: meaning (sv → en choice), recall (en → sv choice), listening (choice), typing (words and phrases up to three words, without “…”; the answer is accepted with or without en/ett), en/ett for countable nouns, plus matching rounds of five words in file order. Distractors are other words from the same theme, same part of speech first, chosen by a stable hash. Ids hang off the entry id (`vocab:food:ost:sv-en`), so editing a word keeps its progress; matching rounds are numbered, so append new words at the end of a theme file to keep earlier rounds stable.

**Decks reuse the session engine** as pseudo-regions `deck:<theme>`: practice rounds, daily review and SRS work unchanged. The Word bank shows a three-step dot per word (new, learning, known = average box ≥ 3) and the deck’s mastery meter.

**English prompts.** Items can set `promptLang: "en"`; the prompt is then shown in the body font, isn’t read aloud, and is skipped by the diacritic check.

**Plural-only and uncountable nouns** (kläder, pengar, mjölk) set `countable: false` and give only the definite form. The schema still requires a gender; for plural-only words it is a formality and is never shown.

**Uncertain forms stay hidden.** Entries with `"check": true` are left out of decks until confirmed: bastu (bastur or bastuar?), ananas, bikini (two plurals in use), anställd (an adjective used as a noun). `npm run content-report` lists them.

**iPhone install.** iOS ignores SVG icons and has no install prompt, so the build ships PNG icons (180 apple-touch-icon, 192, 512, maskable 512, rendered from public/icon.svg by `npm run icons`), Apple home-screen meta tags, and an in-app guide: a one-time card on the village in iPhone Safari (dismissal remembered in localStorage) and an “Install on your phone” section in Settings. The installed app has its own storage on iOS, so the guide says to sign in again inside it with the 6-digit code.

## Jokes behind ⓘ (2026-10-28)

**Every word, rule card and hand-written exercise has a `fun` example** (`{ sv, en, note? }`): a small joke, pun or funny everyday situation that uses the word or rule, A1–A2 Swedish, with an English translation and a note when the joke depends on the Swedish (får/får, glas/glass, recept, ben). Generated exercises inherit the joke of the row they drill (noun, verb, adjective, vocab word). 1,356 jokes in total; all were read back for correct Swedish before shipping.

**Shown only on demand.** An ⓘ button opens a small popover: on hover with a mouse, on tap on a phone; a click keeps it open until you click elsewhere or press Escape. It appears in the answer feedback, on rule cards, in the Word bank and in the results list. The Swedish line can be played aloud.

**Validator.** Jokes are checked for missing å/ä/ö like other Swedish text. Real words that look like typos (vantar = mittens, bar) go in content/allowed-words.json.

**Bundle.** Content data now has its own chunk (~150 kB gzipped, precached). The warning limit is raised to 800 kB for that data chunk only in spirit; code chunks stay small.
