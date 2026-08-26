# OnDesk

**What fits on the desk. Not in the cloud.**

Hardware in. A ranked table out. A ping when a new open-source model actually runs on the box you have — or the one you are about to buy. This is the plan for a small open-source project that can fill an empty personal site and a quiet GitHub, without trying to be llmfit.

---

## Why this, not another clone

[llmfit](https://github.com/AlexsJones/llmfit) is a local TUI that scores hundreds of models against *the computer you are sitting at*. Catalog is a HuggingFace scrape baked into the binary. Ollama is only a runtime (installed-model ticks + pulls), not the source of the cards. It does not take a HuggingFace URL. It does not take a product page. It does not ping you when a new open-source model drops.

That gap is the product.

People who buy GPUs, Mac minis, and cheap inference boxes do not have the machine yet. They have a SKU, a budget, and a job (“I need vision”, “I need coding”). They find out it does not fit *after* the box arrives. OnDesk answers the question *before* checkout, then keeps watching.

For a portfolio, this is better than a todo app or a blog theme. It is a real tool with a live demo, a scoring engine you can explain, and a feed that stays interesting after launch day.

---

## One-liner

Pick a GPU (or paste a model). See what actually fits. Get told when a new open-source model fits *your* hardware.

---

## The ideas worth keeping

These are the ones already in your head. Everything else is later.

1. **Hardware in, models out.** “RTX 4070 laptop” / “M4 16GB” / later a shop link → ranked models, not a wall of names.
2. **HuggingFace in, fit out.** Paste a repo. Read `config.json` and weight size. Tell me if it runs on the chosen hardware, at what quant, roughly how fast.
3. **Intent search.** “I want a vision model” when you do not know the names. Map the sentence to a job (vision / coding / chat / embeddings) plus hardware, then rank.
4. **New-model watch.** When something open-source ships, score it against a saved profile. Ping only if it is runnable *and* interesting. This is the habit loop. A calculator is a one-visit site. A watch is a product.
5. **Stay small.** llmfit is busy because it mixes TUI, five runtimes, benchmarks, and a leaderboard. Do not compete there. One page, three inputs, a honest table.
6. **Not just LLMs.** Detection, segmentation, speech, and training vs inference. YOLO and RF-DETR belong on the same page as Qwen. Hub search already has those tasks. The match layer does not.
7. **MCP is the glue, not the product.** Hugging Face MCP finds cards. FitWatch scores them against a hardware profile. Later FitWatch *is* an MCP so agents can compose the two.
8. **BYOK for language, never for numbers.** Gemini (or a router like OpenRouter) is the user’s token for intent search and prose. The watch and the GB math run with no key. Your Google key does not belong in the public demo.

Money (affiliates, GPU vendors, server sponsors) is real, but it is not v1. The table has to be trusted first or the sponsors will smell it.

---

## Who it is for

| Person | They have | They need |
| --- | --- | --- |
| Engineer about to buy a box | A SKU, not the metal | “What local models will I actually run?” |
| Someone who already has a machine | RAM / VRAM they can type | A watch for new OSS models |
| You, on the empty website | A live demo URL | One project that looks like you shipped a product |

Not for: cluster schedulers, Ollama power users, people who want a TUI. llmfit already owns that.

---

## What v1 is

One web page. Two modes. No accounts required for the demo.

**Mode A — hardware**

- Autocomplete a GPU / Apple chip / “CPU only” from a small curated table (VRAM, bandwidth, unified memory yes/no).
- Optional: RAM and CPU cores.
- Optional: a job chip (`vision`, `detect`, `coding`, `chat`, `reasoning`, `embeddings`, plus infer vs train).
- Output: a short ranked table. Name, size, best quant that fits, fit label (perfect / good / tight / no), estimated tok/s, HuggingFace link.

**Mode B — this model**

- Paste a HuggingFace repo URL or `org/name`.
- Same hardware picker.
- Output: one card. Fits or not, at which quant, memory math shown, not hidden.

**Mode C, still v1 if it stays tiny — watch**

- Save a hardware profile in localStorage (or a single “notify me” email later).
- Daily job: new HuggingFace models (filter: real weights, not empty, not 50M toy checkpoints).
- Score against the profile.
- Public RSS / markdown changelog on the site: “this week, these new models fit an M4 16GB”.
- GitHub Issues or a discussion can be the first “notify me”. Email is extra.

If Mode C slips, ship A + B. The weekly “new models vs popular GPUs” page on your site is still a portfolio magnet even without personal accounts.

---

## What v1 is not

- Ollama / LM Studio / llama.cpp integration
- Parsing Amazon or vendor product URLs
- A TUI
- Accounts, teams, SSO
- A 10k-model clone of llmfit’s catalog
- Ads in the results table
- Claiming measured tok/s (estimate, labeled as estimate)

Shop-URL parsing and sponsors come after people trust the numbers.

---

## How scoring should work (honest, explainable)

Do not pretend this is a benchmark lab.

1. **Memory.** Parameters × bytes/param × quant overhead + KV cache for a stated context (default 8k). Unified memory (Apple) vs discrete VRAM vs system RAM as fallback.
2. **Fit.** Headroom bands: perfect / good / tight / no. Show the GB math on the card.
3. **Speed.** Bandwidth ÷ working set × a conservative efficiency factor. Label it **estimate**. Never show a fake “87 tok/s” as fact.
4. **Job.** A small tag table: vision, coding, chat, embeddings. Intent search maps to these tags. Name search is a fallback.

The about page should show the formulas in plain language. That page *is* the portfolio write-up.

---

## Open source, on purpose

You asked whether to open-source it. For an empty site and a GitHub you want to grow: **yes.**

Closed-source free SaaS is a later move if this becomes a company. Right now the asset is:

- a public repo people can star and fork
- a live demo on your site
- a README that reads like a product, not a class assignment

**License:** MIT. Simple, familiar, no drama.

**Do not** fork llmfit and reskin it. MIT would allow a lot of that if you keep the notice, but reviewers can tell, and it does not grow *your* GitHub. Reimplement a small scoring engine and a small catalog. Cite llmfit as prior art in the README. That looks like taste, not theft.

**Repo shape that looks good:**

```
ondesk/
  README.md          ← this story, plus a screenshot of the demo
  PLAN.md            ← this file
  apps/web           ← the page
  packages/core      ← scoring + hardware table + HF fetch
  data/gpus.json     ← curated SKUs
  data/models.json   ← starter catalog (a few hundred, not “all of HF”)
  CHANGELOG.md       ← weekly “new models that fit…” can live here at first
```

Pin a live demo at the top of the README. The empty website should embed or link that same demo as the first project.

---

## Site + GitHub together

Treat them as one object:

| Surface | What it shows |
| --- | --- |
| Personal site, first project | Live FitWatch, one screenshot, three sentences, link to repo |
| GitHub README | Same demo, formulas, “why not llmfit”, how to run |
| GitHub releases / changelog | Weekly fit digest. This *is* content. People subscribe. |

You do not need a blog. The digest is the blog.

---

## Four-week ship plan

### Week 1 — core that you can demo on a static page

- Curate ~40 GPUs and Apple chips (VRAM + bandwidth). Good enough to look real.
- Curate ~150–300 models with params, license, job tags, GGUF-or-not. HuggingFace API + a script, not by hand forever.
- Scoring function with tests: a 7B Q4 on 8GB VRAM should be “good”; a 70B Q8 on 8GB should be “no”.
- Ugly but working UI: picker + table.

**Done when:** you can choose “RTX 4060 8GB” and “vision” and get a list that is not embarrassing.

### Week 2 — HuggingFace paste + a page that looks like you

- `org/name` or URL → fetch config / siblings, estimate size, score.
- Fit card with the GB math visible.
- Visual design: one typeface, one accent color, no dashboard chrome. This is the screenshot that goes on the empty site.
- Deploy: Vercel (or whatever already hosts the site). Public URL.

**Done when:** a stranger can paste `Qwen/Qwen2.5-VL-7B-Instruct` and see a yes/no on an M4 16GB.

### Week 3 — intent search + the watch

- One search box. Cheap mapping: keywords + job tags. Do not start with a custom LLM router. Add that only if keyword mapping feels dumb.
- Daily script: new HF models in the last 48h → score against 5 preset profiles (M4 16GB, RTX 4060 8GB, RTX 4090, 32GB RAM CPU, Mac Studio class).
- Publish a `/digest` page and a GitHub-flavored changelog.

**Done when:** Monday morning there is a page titled “new models that fit an RTX 4060”.

### Week 4 — polish for portfolio, then stop

- README, formulas page, screenshot, LICENSE, one-click run.
- Pin the demo on the personal site. Short case note: problem, constraint (not llmfit), what you shipped.
- Cut anything that is not in this list.

After week 4, only add what users actually ask for. Shop URLs, accounts, and sponsors are post-portfolio.

---

## Later, if it has a pulse

- Autocomplete from a pasted shop URL (LLM extracts the SKU, then the same table).
- Personal watch with a saved profile (email / RSS / GitHub).
- Inverse of Mode A: “I want this model, what GPU should I buy?” (llmfit `plan` already does this locally; the web version is still useful).
- Affiliates on “buy this GPU” *after* the table is trusted.
- Hardware / server sponsors as “profiles we certify”, never as injected rows.

---

## Stack (keep it boring)

- **TypeScript.** Scoring in a small library with tests. Easy to show.
- **Next.js (App Router) + static-ish deploy.** Demo URL on your site in a day.
- **HuggingFace Hub API** for model cards and new listings. Cache aggressively.
- **No database in v1.** JSON files in git. The digest is a markdown file the daily job commits, or a generated page at build time.

If you would rather stay in Python, FastAPI + a Jinja page is fine. The TypeScript path photographs better on a personal site. Pick one and do not look back.

---

## Success, honestly

**Portfolio success (this is the real goal):**

- Live URL on the empty site
- README a stranger understands in one minute
- You can talk through the scoring on a call without sliding into “I wrapped llmfit”

**Product success (nice if it happens):**

- People bookmark `/digest`
- Issues that are feature requests, not “how do I install Node”
- A GPU name you did not curate showing up in search logs

Ignore star count for the first month. Stars follow a demo people can click.

---

## Name

**OnDesk** — on the desk, not in the cloud. Working title was FitWatch (fitness-tracker collision).

---

## Next concrete step

Do not start with the website layout.

Start with `packages/core`: one function, `fit(model, hardware) → { band, gb, quant, note }`, and ten tests. Then the GPU JSON. Then the ugly page. The pretty page is week 2.

If you want, the next file after this one is a stub repo: `README.md`, `data/gpus.json` with a first dozen SKUs, and the scoring function with tests.
