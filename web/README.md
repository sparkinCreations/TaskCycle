# TaskCycle `web/` — v2 scaffold

This folder is the TaskCycle v2 app, forked from miniCycle's `web/` (see `FORK_MANIFEST.md` for the exact
source commit and every edit made since). The planning docs live one level up in `../docs/`.

## Run it

```bash
cd web
npm ci                 # once
npm start              # http://localhost:8090/index.html   (miniCycle's own dev server owns 8080)
```

## Check it

```bash
npm run test:smoke     # Phase 0 exit criterion: boots all 3 phases, 0 console errors (self-contained)
npm run lint           # ESLint, security + SonarJS, error-free with a warning ratchet
npm run validate:di    # plus validate:provides / labels / keys / api / reset / comments / builtins
TEST_PORT=8090 npm test   # full forked browser unit suite — needs `npm start` running
```

## House rules

Identical to miniCycle's: strict DI via `core/diBase.js`, `AppState.get/.update`, every user-facing string
through `getLabel()`, ids/classes/selectors from `core/constants.js`, `textContent` over `innerHTML`,
listener cleanup on every modal. Read miniCycle's `web/docs/working-on-code/` guides before touching
`moduleManifests.js`, the boot files, or the five facade modules (`settingsManager`, `taskCore`, `taskDOM`,
`preferencesManager`, `statsPanel`).
