# OnDesk

**What fits on the desk. Not in the cloud.**

Pick a GPU (or paste a Hugging Face repo). See what actually runs locally. Get a digest when something new fits *that* hardware.

This is not [llmfit](https://github.com/AlexsJones/llmfit). llmfit scores the machine you already have, from a catalog baked into a TUI. OnDesk answers the moment *before* checkout, and again next week. Cite llmfit as prior art. The scoring engine here is small and ours.

Live demo: run `npm run dev` until a public URL exists.

## Quick start

```bash
npm install
npm test          # scoring engine
npm run dev       # http://localhost:3000
```

Requires Node 20+.

## What you get

- **Hardware → table.** Autocomplete a SKU. Optional job chip (`vision`, `detect`, `coding`, …). Ranked rows: name, size, best quant, fit band, estimated tok/s, Hub link.
- **This model.** Paste `org/name` or a Hub URL. One card with the GB math visible.
- **Formulas.** `/about` is the scoring write-up.
- **Digest stub.** `/digest` — weekly “new models that fit an RTX 4060”.

Numbers are **deterministic**. Same SKU + same catalog = same table. Estimated tok/s is labeled **est.** It is not a bench.

## Repo

```
data/gpus.json       curated SKUs (VRAM / unified / bandwidth)
data/models.json     starter catalog (~140 cards, not all of HF)
packages/core        fit() + rank() + tests
apps/web             Next.js page
PLAN.md              why this shape
story.md             how the idea got here
```

`fit(model, hardware) → { band, gb, quant, note, tokensPerSec, breakdown }`.

## License

MIT.
