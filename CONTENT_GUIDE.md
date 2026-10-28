# Content guide

> Copied from SPEC.md, “Growing the library”. **Status after Phase 3:** everything below works: `npm run validate`, `npm run new-item`, `npm run import-inbox`, `npm run content-report` and the Word bank. One difference from the original plan: vocab nouns are practised in their theme deck (with en/ett items), not merged into the Substantiv region. Add new words at the end of a theme file so the matching rounds keep their ids.
>
> Phase 2 additions: mark harder hand-written items with `"boss": true` (they appear only in boss battles). A verb row needs `en`, `en3`, `enPast`, `enPp` and, if it has an `object`, `objectEn`. If a real word is flagged as a missing å/ä/ö, add it to `content/allowed-words.json`.
>
> Phase 1 additions to the schema: noun rows take optional `enPl` (English plural when it isn’t just +s), `irregular: true` (skips the group/definite-plural checks), and `defPlNote` (explanation for the definite plural). Exercise items take an optional `ask` (short English instruction above the prompt).

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

## Funny examples (ⓘ)

Any word, rule card or exercise can have a `"fun"` field, shown behind the ⓘ button:

```json
"fun": { "sv": "– Får jag klappa ditt får? – Ja, det får du.", "en": "“May I pet your sheep?” “Yes, you may.”", "note": "Pun: får means both ‘sheep’ and ‘may’." }
```

Keep it short, kind and in A1–A2 Swedish, use the word or rule itself, and add a `note` when the joke depends on the Swedish. Exercises generated from a word reuse that word’s joke.
