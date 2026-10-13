# TaskCycle Architecture

> Adopts miniCycle's architecture wholesale, then adds Pro/tier/format modules on top. This doc is the
> module map and the pattern reference. Authoritative source for the patterns themselves is miniCycle's
> `web/docs/developer-guides/` (especially `DI_PATTERNS.md`, `MODULE_LOADER_GUIDE.md`,
> `MAKING_CODE_CHANGES.md`, `DATA_SCHEMA_GUIDE.md`).

---

## 1. Inherited patterns (don't redesign these)

These come straight from miniCycle and are load-bearing. Follow them exactly.

### Dependency injection — `diBase.js`
Every new module uses `createDIModule()` with `required()` / `optional()` declarations. Deps are set via
`Object.defineProperties` (never spread — spreading evaluates lazy getters early). Every dep a module
touches is declared in `moduleManifests.js` (`requires` / `optionalDeps` / `lazyRequires`).

### State — `AppState` producer pattern
```javascript
const state = this.deps.AppState.get();
this.deps.AppState.update(state => {
    state.data.routine[routineId].tasks.push(newTask);
}, true); // immediate save; default = 600ms debounce
```
`dataAccess.js` is legacy — new code uses `AppState.get/.update` directly.

### Boot — three phases, do not bypass
```
orchestrator.js → coreBoot (Phase 1: AppState, utils, migration)
               → featureBoot (Phase 2: moduleLoader wires ALL DI from manifests)
               → uiBoot (Phase 3: listeners, finalization)
```
All DI wiring lives in `featureBoot.js`. Wire deps before creating instances. `await appInit.waitForCore()`
before touching `AppState`.

### Strings / selectors / constants / theming
`getLabel()` for all user-facing text; `DOM_IDS`/`DOM_SELECTORS`/`DATA_SELECTORS` for DOM; `Z_INDEX`/
`UI_TIMEOUTS`/`INTERVALS`/`LIMITS`/`COLORS` for tunables; CSS variables from `styles/base/variables.css`.
`textContent` for user data, never `innerHTML`. Every modal cleans up **all** listeners on close.

### Facade sub-module pattern
Four facades (`settingsManager`, `taskCore`, `taskDOM`, `preferencesManager`) dynamically import their
sub-modules in `init()` and are **not** listed in manifests. TaskCycle keeps this; the new `format/`,
`tools/`, and `licensing/` groups follow normal manifest registration (they are not facades).

---

## 2. Module map

Forked groups keep miniCycle's structure. **Bold** groups are net-new for TaskCycle.

```
web/
├── taskCycle.html              # entry (was miniCycle.html)
├── service-worker.js
├── version.js                  # APP_VERSION + CACHE_VERSION
├── modules/
│   ├── boot/                   # FORK: orchestrator, coreBoot, featureBoot, uiBoot, moduleLoader, manifests
│   ├── core/                   # FORK: appState, appInit, appContext, appGlobalState, diBase, constants, types
│   ├── task/                   # FORK + EXTEND: CRUD, DOM, events, drag-drop, renderer, validation
│   │   └── types/              #   ** NEW: taskTypeStandard, taskTypeCounter, taskTypeBoolean,
│   │                           #            taskTypeMultiChoice, taskTypeComment  (Pro)
│   ├── routine/                # FORK: manager, switcher, loader, migration, mode  (+ Free 3-routine gate hook)
│   ├── recurring/              # FORK as-is (16 modules)
│   ├── progress/               # FORK: cycleCompletion
│   ├── features/               # FORK: themes, statsPanel, achievements, history, reminders, dueDates, clearedTasks
│   ├── labels/                 # FORK + EXTEND: defaultLabels, labelResolver, themes
│   ├── ui/                     # FORK: modalManager, modalRegistry, menuManager, settings, onboarding, etc.
│   ├── utils/                  # FORK as-is
│   ├── storage/                # FORK: backupManager (IndexedDB)
│   ├── ** format/ **           # NEW: tcycCodec, mcycCodec, formatDowngrade, formatDetect, pdfExport
│   ├── ** licensing/ **        # NEW: licenseState, tierGate, licenseVerify, upgradeUI
│   ├── ** tools/ **            # NEW (Pro): timerTool, stopwatchTool, counterTool, notesTool, toolsManager
│   └── ** stats/ **            # NEW (Pro): full dashboard on top of features/statsPanel
├── styles/                     # FORK token-based CSS; rebrand theme tokens
└── tests/                      # Playwright; fork helpers, add format/licensing/tools suites
```

---

## 3. The Pro feature delta (what TaskCycle adds over miniCycle)

| Capability | Where it lives | Tier |
|------------|----------------|------|
| Subtasks | `task/` model + `taskRenderer`/`taskDOM` extensions | Pro |
| Task types: counter, true/false, multiple-choice, comment | `task/types/*` | Pro |
| Tools: timer, stopwatch, counter, notes | `tools/*` | Pro |
| Full statistics dashboard | `stats/*` (extends `features/statsPanel`) | Pro |
| PDF export | `format/pdfExport.js` | Pro |
| Unlimited routines | gate in `routine/` via `tierGate` | Pro (Free ≤3 w/ save lock) |
| `.tcyc` native format | `format/tcycCodec.js` | All (Pro features serialize their fields) |
| Degraded `.mcyc` export | `format/formatDowngrade.js` | All |
| Cloud sync, teams | sync adapter behind `AppState` storage boundary | **Online (deferred)** |

---

## 4. Data schema (additive over miniCycle 2.6)

TaskCycle's schema is **miniCycle schema 2.6 plus additive fields** — never a breaking change. Reuse
miniCycle's `core/types.js`, `routine/migrationManager.js`, `routine/schemaMigration26.js`, and
`core/migrationFacade.js` patterns. Canonical reference: miniCycle `web/docs/reference/SCHEMA_2_6.md`.

**What 2.6 means for the fork (changed from 2.5 in Sep 2026):**
- Routines live under `data.routine[<generated id>]` (not `data.cycles[<name>]`); the display name is `title`.
- `appState.activeRoutineId` (not `activeCycleId`).
- Task priority is a **level**: `priority: "high" | "medium" | "low" | null`. No colour is stored
  (the old `highPriority` + `priorityColor` pair is gone).
- Per-mode clear setting is one open map: `autoClear: { cycle, todo }` (replaces `deleteWhenCompleteSettings`
  + the derived `deleteWhenComplete` mirror).
- Two version stamps: document `schemaVersion` is the string `"2.6"`; each task carries `schemaVersion: 2`
  (a number). They are intentionally different counters.
- Mode is **derived** from `autoReset` / `deleteCheckedTasks`; nothing stores a mode string.

```jsonc
{
  "schemaVersion": "2.6",          // base schema stays 2.6 (compatible)
  "tcycVersion": "1.0",            // NEW: TaskCycle-format envelope version
  "generator": "taskcycle",        // NEW: provenance — "taskcycle" | "minicycle"
  "metadata": { /* unchanged: createdAt, lastModified, totalRoutinesCreated, ... */ },
  "data": {
    "routine": {
      "routine-1789760998636-bqphapbbc": {
        /* ...all miniCycle 2.6 routine fields unchanged: title, theme, autoReset,
           deleteCheckedTasks, cycleCount, taskOptionButtons, history, clearedTasks... */
        "tasks": [
          {
            /* ...all miniCycle 2.6 task fields unchanged: id, text, completed, priority,
               autoClear, recurring, recurringSettings, schemaVersion: 2... */
            "taskType": "standard",      // NEW (Pro): standard|counter|boolean|multiChoice|comment
            "subtasks": [],              // NEW (Pro)
            "tools": {}                  // NEW (Pro): attached timer/stopwatch/counter/notes state
          }
        ]
      }
    }
  }
}
```

**Compatibility rules (the contract):**
- miniCycle is **never expected to read `.tcyc`**. The only artefact handed to a miniCycle user is a
  downcast `.mcyc` (see [02-FILE-FORMATS.md](02-FILE-FORMATS.md)). A TaskCycle file with **only standard
  tasks, no subtasks, no tools** downcasts with an empty loss manifest.
- A miniCycle `.mcyc` read by TaskCycle gets the NEW fields defaulted (`taskType: "standard"`, `subtasks: []`,
  `tools: {}`) — a lossless **upcast**.
- Writing `.mcyc` from a TaskCycle file with Pro fields populated is a lossy **downcast** — handled with an
  explicit loss manifest (see [02-FILE-FORMATS.md](02-FILE-FORMATS.md)).

---

## 5. Where tiers plug in (architecture view)

Tiers do **not** thread `if (isPro)` through feature code. A single `licensing/licenseState` holds the
resolved tier, and `licensing/tierGate` exposes a declarative capability check:

```javascript
// In any feature module that needs gating:
if (!this.deps.tierGate.can('routine.createBeyondFreeLimit')) {
    return this.deps.tierGate.promptUpgrade('routine.createBeyondFreeLimit');
}
```

This mirrors miniCycle's existing `FeatureFlags` (in `core/appGlobalState.js`) but makes the flags
**license-derived** instead of milestone-derived. Full design in
[03-TIERS-AND-LICENSING.md](03-TIERS-AND-LICENSING.md).

---

## 6. Adoption checklist (per forked module)

When porting a module from miniCycle:
1. Copy the module + its tests.
2. Rebrand strings → ensure they route through `getLabel()` (add TaskCycle keys to `defaultLabels.js`).
3. Replace any `miniCycle`-specific IDs/selectors with TaskCycle equivalents in `constants.js`.
4. Confirm its manifest entry in `moduleManifests.js` (requires/optionalDeps/lazyRequires).
5. Wire its `setXDependencies()` in `featureBoot.js` **before** instantiation.
6. Run its ported test suite green before moving on.
7. Do **not** "improve" it during the port — structural parity keeps fixes portable between products.
