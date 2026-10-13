# TaskCycle Refactor Plan

> **Decision:** Rebuild on miniCycle's architecture, **not** React. See [the reasoning](#why-not-react)
> for the full case. This document is the master roadmap; the companion docs go deep on architecture,
> file formats, and licensing.

---

## 1. Vision

TaskCycle is the **full** product in the SparkinCreations cycle-app family. miniCycle is the free,
polished "Mini" tier that was extracted out of the original TaskCycle codebase. We are now rebuilding
TaskCycle properly — on the architecture miniCycle matured into — so that:

- The **engine is shared in spirit** with miniCycle (same domain: routines, cycles, resets, recurring, themes).
- TaskCycle adds **Pro-grade tooling** (tools, richer task types, subtasks, full stats, PDF export).
- Three **tiers** gate features without forking the architecture.
- Everything is **local-first and privacy-first** — Pro is fully usable offline with no account.

### The lineage (why this is a rebuild, not a new app)

```
TaskCycle (original monolith — 3,616-line main.js)
   └── 🚀 Extract miniCycle as standalone app
          └── miniCycle (124 modules, schema 2.6, strict DI)  ← the mature architecture
                 └── TaskCycle v2 (THIS PLAN) — fork that architecture, add Pro on top
```

The original `scripts/main.js` was 3,616 lines with empty module stubs
(`storageManager.js`, `statsManager.js`, the whole `toolsModal/` dir — all 0 bytes). That was the
instinct toward structure *before the patterns existed*. miniCycle is what those patterns became. This
rebuild closes the loop.

---

## 2. Principles (non-negotiable)

1. **Reuse the engine, don't reinvent it.** Where TaskCycle's domain is identical to miniCycle's
   (state, tasks, routines, recurring, labels, constants, utils, DI/boot), we **fork miniCycle's modules**
   as the starting point. Net-new code is only for Pro features, tiers, and file formats.
2. **Same house rules as miniCycle.** Strict DI via `diBase.js`, `AppState.get/.update`, `getLabel()` for
   all strings, `DOM_IDS`/constants instead of hardcoded selectors/numbers, `textContent` over `innerHTML`,
   listener cleanup on every modal. (See miniCycle's root `CLAUDE.md`.)
3. **Local-first / privacy-first.** No network required for Free or Pro. No telemetry. Pro license verifies
   **offline**. Online tier is the *only* networked surface, and it's deferred.
4. **Tiers are gates, not forks.** One codebase. A single `licensing/` source of truth drives a declarative
   capability map. No `if (isPro)` scattered through feature code — features ask the gate.
5. **Format compatibility is a contract.** `.tcyc` is a documented superset of `.mcyc`. Reading `.mcyc` is
   lossless. Writing `.mcyc` from TaskCycle is a *documented lossy downgrade* that always warns the user.
6. **Don't prematurely extract a shared package.** Tempting to make `@sparkin/cycle-core` shared between
   miniCycle and TaskCycle on day one. Don't. Fork first, let them stabilize, extract a shared core **only
   if** duplicate maintenance actually starts hurting. (Classic solo-dev trap.)

---

## 3. Scope for this round

**In scope now:** Free + Pro, fully local. Native `.tcyc` format, `.mcyc` read, degraded `.mcyc` export.

**Explicitly deferred:** the **Online** tier (cloud sync, team collaboration, subscription billing). It is
designed-for but not built — it lands *behind* the `AppState` storage boundary as a sync adapter, so it
requires **no rewrite** of Pro. See [03-TIERS-AND-LICENSING.md](03-TIERS-AND-LICENSING.md#online-tier-deferred).

---

## 4. What we reuse vs. build

| Area | miniCycle module(s) | TaskCycle plan |
|------|---------------------|----------------|
| Boot/orchestration | `boot/*` (orchestrator, coreBoot, featureBoot, uiBoot, moduleLoader, manifests) | **Fork as-is**, add Pro modules + licensing to manifests |
| State | `core/appState.js`, `appInit.js`, `appContext.js`, `appGlobalState.js` | **Fork as-is**; extend `FeatureFlags` → license-driven |
| DI base | `core/diBase.js` | **Fork as-is** |
| Constants / labels | `core/constants.js`, `labels/*` | **Fork**, add TaskCycle IDs, Pro labels, `.tcyc` strings |
| Tasks | `task/*` (CRUD, DOM, events, drag-drop, renderer, validation) | **Fork**, extend task model for new task types + subtasks |
| Routines | `routine/*` (manager, switcher, loader, migration, mode) | **Fork**, add the 3-routine Free cap at the gate |
| Recurring | `recurring/*` (16 modules) | **Fork as-is** |
| Themes / stats / achievements | `features/*` | **Fork**; Pro gets the *full* stats dashboard on top of `statsPanel` |
| Import/Export | `ui/cycleExportManager.js`, `cycleImportManager.js`, `shareManager.js` | **Rework** into the `format/` codec layer (see formats doc) |
| UI infra | `ui/modalManager`, `modalRegistry`, `menuManager`, `notificationDialogHost`, etc. | **Fork as-is** |
| Utils / storage | `utils/*`, `storage/backupManager.js` | **Fork as-is** |
| **Licensing** | — (none) | **NET-NEW** `licensing/` module group |
| **Tools** (timer/stopwatch/counter/notes) | — (only stubs in old TaskCycle) | **NET-NEW** `tools/` module group (Pro) |
| **Task types** (multi-choice, counter, true/false, comment) | — | **NET-NEW** extensions in `task/` (Pro) |
| **PDF export** | — | **NET-NEW** `format/pdfExport.js` (Pro) |
| **`.tcyc` / degraded `.mcyc`** | partial (`.mcyc` only) | **NET-NEW** `format/` codecs + downgrade |

---

## 5. Phased roadmap

Each phase ends with a working app. We never have a months-long "nothing runs" window.

### Phase 0 — Scaffold (foundation)
- Create the `web/` structure mirroring miniCycle (`miniCycle.html` → `taskCycle.html`, `modules/`, `styles/`, `tests/`, `version.js`, `service-worker.js`, `package.json`).
- Fork the **boot + core + diBase + AppState + appInit** skeleton so the DI pipeline and boot sequence run.
- Stand up the Playwright test harness and `createProtectedTest()` helper.
- Port `constants.js` and the `labels/` system; rebrand IDs/labels TaskCycle → confirm `getLabel()` path works.
- **Exit:** empty app boots through all three phases with no console errors; one smoke test green.

### Phase 1 — Engine parity (TaskCycle ≈ miniCycle core)
- Fork `task/`, `routine/`, `recurring/`, `progress/`, core `features/` (themes, basic stats, achievements, history, reminders, due dates).
- Wire all DI in `featureBoot.js` via manifests.
- Reach functional parity with miniCycle's core: create/complete/reset routines, recurring, themes, milestones.
- **Exit:** a user can do everything miniCycle does, branded as TaskCycle. All forked module tests pass.

### Phase 2 — File formats
- Build the `format/` layer: `tcycCodec` (native read/write), `mcycCodec` (read = upcast), `formatDowngrade` (write degraded `.mcyc` + loss manifest), and the warning modal.
- Migration: miniCycle schema 2.6 → TaskCycle schema (additive; see formats doc).
- **Exit:** round-trip `.tcyc` save/load; import a real miniCycle `.mcyc` losslessly; export degraded `.mcyc` and see an accurate data-loss warning. Tests cover upcast, downcast, and the loss manifest.

### Phase 3 — Tiers & licensing
- Build the `licensing/` module group: `licenseState`, `tierGate` (declarative capability map), offline license verification, the upgrade/unlock UI.
- Apply gates: Free = ≤3 routines + save lock beyond; Pro = full unlock.
- **Exit:** fresh install is Free and enforces the 3-routine save lock; applying a valid Pro license unlocks everything; license survives reload and works fully offline. Gate logic is unit-tested.

### Phase 4 — Pro modules
- `tools/` group: timer, stopwatch, counter, notes (the old empty stubs, finally real).
- Task model extensions: subtasks + task types (multiple-choice, counter, true/false, comment).
- Full stats dashboard (on top of `statsPanel`).
- `format/pdfExport.js`.
- **Exit:** all Pro features work and are correctly gated; Pro-only fields round-trip in `.tcyc` and are correctly dropped+warned in degraded `.mcyc`.

### Phase 5 — Polish & packaging
- Onboarding/guided tour, help surfaces, messaging-surface review.
- Multi-target packaging via miniCycle's pattern (`web/`, `desktop/`, `mobile/`, `shared/`).
- Performance, a11y pass, PWA/service-worker/offline verification.
- **Exit:** shippable Pro build.

### Future — Online tier (deferred)
- Sync adapter behind `AppState` storage boundary; subscription entitlement layered onto `licenseState`; team/collaboration UI.
- No rebuild of Pro required — that's the payoff of doing the storage boundary right now.

---

## 6. Milestones (shippable checkpoints)

| Milestone | = end of | User-visible result |
|-----------|----------|---------------------|
| **M1 — "It boots"** | Phase 0 | Branded shell boots clean |
| **M2 — "It cycles"** | Phase 1 | Full miniCycle-equivalent routine engine |
| **M3 — "It speaks both formats"** | Phase 2 | `.tcyc` native + `.mcyc` in/out with warnings |
| **M4 — "It sells"** | Phase 3 | Free vs Pro enforced; offline unlock works |
| **M5 — "It's Pro"** | Phase 4 | Tools, task types, subtasks, full stats, PDF |
| **M6 — "It ships"** | Phase 5 | Packaged, polished Pro release |

---

## 7. Risks & mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| **Scope creep — rebuilding all 124 modules** | High | Reuse table (§4) is the contract. Net-new only for Pro/tiers/formats. Don't "improve" forked modules mid-rebuild. |
| **Two-codebase drift** (miniCycle vs TaskCycle diverge) | Medium | Keep forked modules structurally identical so fixes port by hand cheaply. Track which modules are forked. Revisit shared-core extraction only post-M5. |
| **Offline licensing is inherently crackable** | Certain | Accept it. Use pragmatic signed-key verification (good-faith, privacy-respecting). Don't over-engineer DRM; it hurts honest users. See licensing doc. |
| **Format downgrade silently loses data** | Medium | Downgrade is *never* silent — always produces a loss manifest surfaced in a confirm modal. Tested. |
| **Solo-founder bandwidth** | High | Phases each ship something usable; you can stop after any milestone with a coherent product. |
| **Schema migration bugs** | Medium | TaskCycle schema is **additive** over 2.6; reuse miniCycle's `migrationManager`/`migrationFacade` patterns; migrations are tested with real fixtures. |

---

## 8. Why not React

Short version (full argument lives in the conversation that produced this plan):

- TaskCycle and miniCycle are **the same engine** — adopting React means re-implementing a mature, proven
  architecture in a paradigm you'd be learning, for ~zero domain benefit.
- React's real strengths (component ecosystem, state libs, hiring) **don't apply**: you already have a
  component/module system and a disciplined `AppState`; you're solo.
- The one place React earns its keep — **complex collaborative UI** — is the **Online** tier, which is deferred.
  Paying the rewrite tax now for a shelved feature is backwards.
- **Local-first is the brand**, and your vanilla architecture is *best in class* at exactly that.
- Tiers and sync are **not framework problems**: tiers are a gate; sync is a backend + adapter behind `AppState`.

The flip condition: if the real goal becomes "hire a frontend team soon and optimize for conventional-stack
hireability over shipping speed and code reuse," revisit. Until then, the existing architecture wins cleanly.
