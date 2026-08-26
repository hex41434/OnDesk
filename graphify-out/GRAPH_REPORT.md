# Graph Report - fitwatch  (2026-08-25)

## Corpus Check
- 34 files · ~14,820 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 216 nodes · 317 edges · 21 communities (18 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

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

## God Nodes (most connected - your core abstractions)
1. `OnDesk` - 16 edges
2. `Story` - 13 edges
3. `compilerOptions` - 12 edges
4. `scoreQuant()` - 9 edges
5. `fit()` - 8 edges
6. `compilerOptions` - 7 edges
7. `modelFromHub()` - 7 edges
8. `Hardware` - 7 edges
9. `Model` - 7 edges
10. `rank()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Desk()` --calls--> `fit()`  [INFERRED]
  apps/web/app/desk.tsx → packages/core/src/fit.ts
- `GET()` --calls--> `modelFromHub()`  [INFERRED]
  apps/web/app/api/hf/route.ts → packages/core/src/hub.ts
- `GET()` --calls--> `parseHfRepo()`  [INFERRED]
  apps/web/app/api/hf/route.ts → packages/core/src/hub.ts
- `scoreQuant()` --calls--> `availableGb()`  [EXTRACTED]
  packages/core/src/fit.ts → packages/core/src/memory.ts
- `scoreQuant()` --calls--> `bandFor()`  [EXTRACTED]
  packages/core/src/fit.ts → packages/core/src/memory.ts

## Import Cycles
- None detected.

## Communities (21 total, 3 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.13
Nodes (30): GET(), fit(), quantsFor(), archFromConfig(), kindAndJobs(), modelFromHub(), paramsFromCard(), parseHfRepo() (+22 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (20): Four-week ship plan, How scoring should work (honest, explainable), Later, if it has a pulse, Name, Next concrete step, OnDesk, One-liner, Open source, on purpose (+12 more)

### Community 2 - "Community 2"
Cohesion: 0.19
Nodes (17): extraGb(), scoreQuant(), SPEED_EFFICIENCY, availableGb(), bandFor(), kvCacheGb(), overheadGb(), QUANT_LADDER (+9 more)

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
Cohesion: 0.23
Nodes (7): gpus, models, findHardware(), hardwareById(), norm(), tokens(), Hardware

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (11): compilerOptions, allowJs, incremental, jsx, lib, paths, plugins, exclude (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.43
Nodes (4): Desk(), hfUrl(), JOBS, sizeLabel()

### Community 11 - "Community 11"
Cohesion: 0.33
Nodes (5): compilerOptions, rootDir, types, extends, include

### Community 12 - "Community 12"
Cohesion: 0.33
Nodes (3): Entry, Week, weeks

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (5): License, OnDesk, Quick start, Repo, What you get

## Knowledge Gaps
- **113 isolated node(s):** `JOBS`, `Entry`, `Week`, `weeks`, `plex` (+108 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `fit()` connect `Community 0` to `Community 10`, `Community 2`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `Desk()` connect `Community 10` to `Community 0`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `JOBS`, `Entry`, `Week` to the rest of the system?**
  _113 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1253968253968254 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._