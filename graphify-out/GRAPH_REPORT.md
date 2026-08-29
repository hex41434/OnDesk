# Graph Report - fitwatch  (2026-08-29)

## Corpus Check
- 48 files · ~20,949 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 300 nodes · 487 edges · 23 communities (20 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5627c23a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]

## God Nodes (most connected - your core abstractions)
1. `OnDesk` - 16 edges
2. `Story` - 13 edges
3. `compilerOptions` - 12 edges
4. `fit()` - 11 edges
5. `modelFromHub()` - 10 edges
6. `scoreQuant()` - 9 edges
7. `Hardware` - 9 edges
8. `ModelTab()` - 7 edges
9. `compilerOptions` - 7 edges
10. `findHardware()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `findHardware()`  [INFERRED]
  apps/web/app/api/search-hardware/route.ts → packages/core/src/hardware.ts
- `hubSearch()` --calls--> `parseHfRepo()`  [INFERRED]
  apps/web/app/api/search-models/route.ts → packages/core/src/hub.ts
- `Desk()` --calls--> `fit()`  [INFERRED]
  apps/web/app/desk.tsx → packages/core/src/fit.ts
- `minNeed()` --calls--> `enoughFitInfo()`  [INFERRED]
  apps/web/app/model-tab.tsx → packages/core/src/hub.ts
- `GET()` --calls--> `modelFromHub()`  [INFERRED]
  apps/web/app/api/hf/route.ts → packages/core/src/hub.ts

## Import Cycles
- None detected.

## Communities (23 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.28
Nodes (11): GET(), archFromConfig(), hasToolCalling(), kindAndJobs(), modelFromHub(), paramsFromCard(), parseHfRepo(), quantFromBits() (+3 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (20): Four-week ship plan, How scoring should work (honest, explainable), Later, if it has a pulse, Name, Next concrete step, OnDesk, One-liner, Open source, on purpose (+12 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (45): gpus, models, extraGb(), scoreQuant(), SPEED_EFFICIENCY, enoughFitInfo(), Intent, JOB_WORDS (+37 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (18): dependencies, next, @ondesk/core, react, react-dom, devDependencies, @types/node, @types/react (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (14): devDependencies, typescript, vitest, exports, main, name, private, scripts (+6 more)

### Community 5 - "Community 5"
Cohesion: 0.14
Nodes (13): description, engines, node, license, name, private, scripts, build (+5 more)

### Community 6 - "Community 6"
Cohesion: 0.14
Nodes (13): Can I just make a simpler one and publish it?, Hugging Face already has MCP. It still does not do the match., Ping me when something new actually fits, Smart search, and the hardware you have not bought, Story, The empty website, The idea, in one breath, The starting point was not a startup (+5 more)

### Community 7 - "Community 7"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, isolatedModules, lib, module, moduleResolution, noEmit, noUncheckedIndexedAccess (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.18
Nodes (11): Desk(), appleCpu(), Companion, companionFor(), companionLine(), discreteCpu(), discreteRam(), cpu32 (+3 more)

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (11): compilerOptions, allowJs, incremental, jsx, lib, paths, plugins, exclude (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (32): BAND_SORT, DeskTab, JOB_CV, JOB_LANG, JOB_MULTIMODAL, QUANT_SORT, SortKey, BAND_SORT (+24 more)

### Community 11 - "Community 11"
Cohesion: 0.33
Nodes (5): compilerOptions, rootDir, types, extends, include

### Community 12 - "Community 12"
Cohesion: 0.33
Nodes (3): Entry, Week, weeks

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (5): License, OnDesk, Quick start, Repo, What you get

### Community 21 - "Community 21"
Cohesion: 0.27
Nodes (11): extractJsonObject(), GEMINI_MODELS, geminiJson(), JOBS, mapHardwareQuery(), mapModelQuery(), resolveGeminiKey(), POST() (+3 more)

### Community 22 - "Community 22"
Cohesion: 0.29
Nodes (10): exec, GET(), probe(), run(), findHardware(), GENERIC, hardwareById(), matchHostSku() (+2 more)

## Knowledge Gaps
- **132 isolated node(s):** `HubHit`, `JOB_MULTIMODAL`, `JOB_CV`, `JOB_LANG`, `SortKey` (+127 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `fit()` connect `Community 10` to `Community 8`, `Community 2`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Why does `Desk()` connect `Community 8` to `Community 10`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `fit()` (e.g. with `Desk()` and `minNeed()`) actually correct?**
  _`fit()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `HubHit`, `JOB_MULTIMODAL`, `JOB_CV` to the rest of the system?**
  _132 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09335839598997493 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._