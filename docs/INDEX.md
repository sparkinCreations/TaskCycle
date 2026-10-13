# TaskCycle — Refactor Documentation

> **Goal:** Rebuild TaskCycle on miniCycle's proven architecture (vanilla-JS ES6 modules, strict DI, `AppState` producer pattern) instead of a framework. TaskCycle is a **superset of miniCycle's engine** with tiered licensing and richer task tooling.

This folder is the planning home for the rebuild. Read in order.

| Doc | What it covers |
|-----|----------------|
| [00-REFACTOR-PLAN.md](00-REFACTOR-PLAN.md) | The master plan — vision, principles, phased roadmap, milestones, risks, what to reuse vs build |
| [01-ARCHITECTURE.md](01-ARCHITECTURE.md) | Architecture adoption — module map, DI/boot/state patterns, the Pro feature delta over miniCycle |
| [02-FILE-FORMATS.md](02-FILE-FORMATS.md) | `.tcyc` native format spec, reading `.mcyc`, **degraded `.mcyc` export with data-loss warnings** |
| [03-TIERS-AND-LICENSING.md](03-TIERS-AND-LICENSING.md) | Free / Pro / Online tier model, offline license verification, the feature-gate architecture |

## The one-paragraph version

TaskCycle and miniCycle are the *same engine* — miniCycle was literally extracted from TaskCycle
(`🚀 Extract miniCycle as standalone app`). So we don't start cold and we don't adopt React: we fork
miniCycle's battle-tested architecture (124 modules, schema 2.6, strict DI, zero `window.*` globals) and
build TaskCycle's extras *on top* as additive modules. Three tiers — **Free** (≤3 routines, saving locked
beyond), **Pro** (one-time, everything unlocked locally), **Online** (subscription, sync + teams, deferred)
— are a licensing concern, not an architecture concern. Native format is **`.tcyc`** (a superset of
`.mcyc`); TaskCycle reads `.mcyc` losslessly (upcast) and can export a **degraded `.mcyc`** (downcast) with
explicit warnings about exactly what data is dropped.

## Status

- [ ] Plan reviewed / approved
- [x] Phase 0 — Scaffold (branch `phase-0-scaffold`; see `web/FORK_MANIFEST.md`)
- [ ] Phase 1 — Engine parity
- [ ] Phase 2 — File formats (`.tcyc` + `.mcyc` interop)
- [ ] Phase 3 — Tiers & licensing
- [ ] Phase 4 — Pro modules
- [ ] Phase 5 — Polish & packaging
- [ ] Future — Online tier
