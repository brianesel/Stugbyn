# Stugbyn

A mobile-first web app that teaches Swedish from A1 to A2 through short games, then prepares for YKI intermediate. See [SPEC.md](SPEC.md) for the full build spec, [CONTENT_GUIDE.md](CONTENT_GUIDE.md) for adding words, and [DECISIONS.md](DECISIONS.md) for choices made along the way. To put it online with email login and saved progress, follow [DEPLOY.md](DEPLOY.md).

**Status:** Phases 1–3 plus accounts — Word bank with 17 theme decks from class, 13 grammar regions following the class up to lesson 21 (see [CURRICULUM.md](CURRICULUM.md)), with rule cards, practice and boss battles; daily review spans all regions.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server at http://localhost:5173 |
| `npm run validate` | Checks all content in `content/` (also runs before every build) |
| `npm test` | Unit and component tests (Vitest) |
| `npm run build` | Validates content, typechecks, builds the static PWA into `dist/` |
| `npm run preview` | Serves the built app (test offline mode here) |
| `npm run new-item -- --theme food` | Add a word step by step (suggests noun forms) |
| `npm run import-inbox` | Turn `content/inbox/<theme>.txt` lines `sv;en` into draft words |
| `npm run content-report` | Counts per theme, level, lesson; drafts and words to check (`-- --new` for words since the last `content-release-*` tag) |
| `npm run icons` | Re-render the PNG app icons from `public/icon.svg` |
| `npm run test:e2e` | Playwright smoke test (first run: `npx playwright install chromium`) |

## Layout

- `content/` — all Swedish: noun table, regions (rule cards + hand-written items), vocab themes, UI phrases, fixtures.
- `src/content/` — Zod schemas, library builder, validator, generators, migrations.
- `src/engine/` — SRS, session picking and grading. Pure TypeScript, no React.
- `src/exercises/`, `src/screens/`, `src/store/`, `src/audio/` — the app.
- `scripts/` — command-line tools that read `content/` from disk.

Deploy `dist/` to any static host (GitHub Pages, Netlify, Vercel).
