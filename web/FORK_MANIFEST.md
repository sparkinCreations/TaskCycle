# Fork manifest — TaskCycle `web/`

Forked from the miniCycle repository (local checkout `../../miniCycle`, branch `main`).

| Field | Value |
|-------|-------|
| Source commit | `251664e96d18cf26a3c9a77cff9d8df411b0e424` |
| Source app version | 2.613 |
| Fork date | 2026-10-12 |
| Phase | 0 — Scaffold (see `../docs/00-REFACTOR-PLAN.md`) |

## Copied
- `modules/` (all module groups, unchanged in Phase 0 except where noted in RENAMES)
- `styles/`, `tests/`, `scripts/` (validators + build tooling; `backup/` and `__pycache__` excluded)
- `games/`, `schema/`
- `assets/`: only the files the app references (fonts, logo, PWA icons, theme patterns); miniCycle's
  store screenshots / videos / marketing images were NOT copied
- `miniCycle.html` → `index.html`, `miniCycle-main.js` → `main.js`
- `version.js`, `service-worker.js`, `boot-sw.js`, `manifest.json`, `package.json`,
  `package-lock.json`, `eslint.config.js`, `jsconfig.json`, `mcyc.schema.json`

## Deliberately not copied
`dist/`, `node_modules/`, `blog/`, `lite/`, `archive/`, `backup/`, `docs/` (miniCycle's own docs),
`examples/`, `pages/`, `legal/`, `netlify/`, `test-results/`, `_redirects`, `netlify.toml`,
`CHANGELOG.md`, `robots.txt`, `sitemap.xml`, `nginx-security.conf`, `timestamp-converter.*`.

## Renames applied in Phase 0
See the RENAMES section appended below as the scaffold is wired up.

## RENAMES (Phase 0)

Everything below is the complete list of edits made to the forked files in Phase 0. Module code under
`modules/` is byte-identical to upstream except for the seven label values noted.

| File | Change |
|------|--------|
| `miniCycle.html` → `index.html` | renamed; all `miniCycle.html` / `miniCycle-main.js` references inside updated; `<title>` and `<meta name="description">` reworded for TaskCycle; `?v=2.613` cache-busters → `?v=0.1.0` |
| `miniCycle-main.js` → `main.js` | renamed; three self-describing comment/log strings updated, logic unchanged |
| `version.js` | hand-maintained for now: `APP_VERSION = '0.1.0'`, `CACHE_VERSION = 1` |
| `service-worker.js` | `APP_VERSION` 0.1.0; precache entries point at `index.html` / `main.js`; cache names `taskCycle-static-*` / `taskCycle-dynamic-*`; `CACHE_VERSION = 'v1'` |
| `boot-sw.js` | `miniCycle.html` reference → `index.html` |
| `manifest.json` | `id` `/taskCycle`, `name`/`short_name` TaskCycle, `start_url` `./index.html`, `version` 0.1.0 |
| `package.json` | `name` taskcycle-web, `version` 0.1.0; `start` serves on **8090** (miniCycle keeps 8080); `lint` targets `main.js`; new `test:smoke`; blog/lite/screenshot scripts dropped |
| `modules/labels/defaultLabels.js` | brand VALUES only (keys unchanged): `miniCycle`, `appShareTitle`, `wordmark` ×2, `product`, `title`, `productName` → `'TaskCycle'` |
| `tests/automated/run-browser-tests.cjs` | server origin parametrised: `TEST_PORT` env (default 8090) instead of hard-coded 8080 |
| `tests/automated/run-smoke-test.cjs` | **new** — Phase 0 exit check (boots all 3 phases, 0 console errors, 0 page errors, 0 failed requests; ignores browser-cancelled `ERR_ABORTED` duplicates) |
| `tests/appInit.tests.js` | one fetch of the entry page updated `miniCycle.html` → `index.html` (the only forked test that names the file) |
| `examples/sample-routines/` | **copied after the first baseline** — `routineManager` fetches `examples/sample-routines/manifest.json` for "Load a Sample"; the rest of upstream `examples/` is still excluded |
| `../.gitignore` | **new** — ignores `web/node_modules`, `web/test-results`, `web/dist`, pycache |

### Known upstream condition carried into the fork
`settingsUIManager.setupThreeDotsToggle()` logs `State data required for three dots toggle` once on a
brand-new profile (AppState has no data until the first-run choice persists a routine). Verified identical
on the upstream build the same day. The smoke test allow-lists exactly that string with a comment; it is
upstream's to fix, and the fork should pick the fix up rather than diverge.

### Deferred to Phase 1 (deliberately NOT done in Phase 0)
- `STORAGE_KEYS.DATA` is still `'miniCycleData'` (35 literal uses across 12 modules, plus tests). Renaming is
  a Phase 1 task done together with the forked test suite so every assertion moves at once.
- CSS class / DOM id prefixes (`mini-cycle-*`, `miniCycle-*`) are untouched.
- Lite-version fallbacks in `index.html` and `utils/liteVersion.js` still point at `lite/` (not copied).
  TaskCycle has no Lite tier; these need removing or re-pointing in Phase 1.
- `scripts/validate-html.py`, `validate-csp.py`, `validate-inline.py`, `update-version.sh`, `build-web.cjs`
  and the Capacitor/Electron build scripts still name `miniCycle.html`; not run in Phase 0.
