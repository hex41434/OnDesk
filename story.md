# Story

How FitWatch showed up. Not a spec. The questions, what turned out to be true, and why the idea kept getting sharper.

This sits next to [PLAN.md](./PLAN.md). The plan is what to build. This is why that shape.

---

## The starting point was not a startup

It started with installing [llmfit](https://github.com/AlexsJones/llmfit) from source, because Homebrew had failed, and opening the web dashboard at `http://127.0.0.1:8787`. The tool works. It is also busy. TUI, CLI, Ollama, llama.cpp, MLX, LM Studio, Docker Model Runner, community benches, a leaderboard. A lot of product in one binary.

The useful thought was not “I should clone this.” It was: *the question I actually have is simpler, and this UI is not that question.*

---

## Where do the model cards come from?

**The question:** Does llmfit read the cards from Ollama? If I give it a HuggingFace link, can it look that model over?

**The answer:** No, and no.

The cards are a catalog. HuggingFace is scraped into `hf_models.json` and baked into the binary at compile time. That is why the table is full even if you have never pulled a model. `llmfit update` can fetch trending HuggingFace models without a rebuild. Contributors add a repo id to a scraper script and wait for a release. You can also drop a `custom_models.json` in the app support folder and type the specs yourself.

Ollama is a *runtime*, not the catalog. If Ollama is running (`localhost:11434`), llmfit lists what you already installed (`GET /api/tags`), puts a tick on those rows, and can `pull`. Same idea for llama.cpp, MLX, LM Studio, Docker Model Runner. The table still comes from the baked catalog. Ollama only marks “you already have this.”

A HuggingFace URL is not an input. Paste `org/name` into llmfit and it will not fetch `config.json`, will not estimate weights, will not score a stranger repo. If it is not in the catalog (or in your custom JSON), it does not exist.

Search is a substring on name, provider, size, use-case. It is not “I want a vision model and I do not know the names.”

That gap is the first product: **paste a HuggingFace link, get a fit card against chosen hardware.**

---

## Can I just make a simpler one and publish it?

**The question:** This UI is too cluttered. Could I write something simpler for myself and publish it?

**The answer:** Yes. And you should not try to beat llmfit at being llmfit.

llmfit is MIT. You *could* fork it, keep the notice, and ship a thinner skin. People can tell. It does not grow *your* GitHub. It also drags in five runtimes you do not want.

The simpler product is a different question:

> I do not have the machine yet. I have a GPU name, or a Mac config, or a model I just saw. Does it fit?

That is a web page, not a TUI. No Ollama. No install. A scoring function you can explain on a call. Cite llmfit as prior art. Reimplement a small engine. That looks like taste.

---

## What if I give it a hardware link?

**The question:** If I drop a link to a hardware device, can it say which models will run on that box? That is extremely useful for AI engineers. Can I do this? Even as an online service. It could be free. I would not have to share the source. It is very useful.

**The answer:** llmfit cannot do this. You can.

llmfit detects *this* computer (sysinfo, `nvidia-smi`, Apple unified memory, and so on). Or you override RAM / VRAM / CPU by hand (TUI key `S`, or `--memory --ram --cpu-cores`). That is simulation of numbers, not of a product page.

It has the *inverse*: `llmfit plan` (TUI key `p`) asks “what hardware does *this model* need?” Useful, and not the same thing.

What does not exist:

- paste an RTX 4070 laptop listing
- paste a Mac mini product page
- paste a used-server SKU

and get a ranked list of local models.

That direction is the better one for engineers who are *about to buy*. Shop URLs are messy (Amazon vs vendor vs five languages), so the honest v1 is not a scraper. It is autocomplete on a curated GPU / chip table. A URL parser can come later and dump into that same table.

On “free, but keep the source closed”: that is a valid SaaS move *later*. At the moment the empty website and a quiet GitHub need the opposite: a public repo, a live demo, a README that reads like a product. Closed source does not fill those. Open source does. MIT, small repo, demo on the site. If it ever becomes a company, the commercial layer can still sit on top. v1 is not a company.

---

## Smart search, and the hardware you have not bought

**The question:** Add smart search. I want a vision model. Assume I do not know the names. Tell me: on the hardware you are about to buy, you can actually run these. Then maybe sponsors from GPU vendors and server companies.

**The answer:** This is the same product, with language on the front.

Today in llmfit you already *can* filter by use-case if you know to press `U` and pick `multimodal`. You still have to know the names in the table. Intent search is the opposite: one box.

> vision model for a Mac mini with 16GB

becomes: job = vision, hardware = Apple Silicon 16GB unified, then rank. The user never types Qwen2.5-VL.

Sponsors are real and they are also a trap. Hardware companies will pay to sit next to “on this card, these models fit” only if the table is not lying. Affiliates on “buy this GPU” can work. Ads *in* the results table would kill trust on day one. So: numbers first, money second. The about page shows the formulas. Estimates are labeled estimates. No fake tok/s.

---

## Ping me when something new actually fits

**The question:** Or, tell me when a new open-source model is released. Automatically check whether it fits *my* hardware. This idea has a lot of room.

**The answer:** This is the habit loop. It is the difference between a calculator and a product.

A calculator: you open the page, pick a GPU, leave. llmfit is this, plus a TUI. The catalog updates when you upgrade the app. Nobody pings you.

A watch: you saved a profile once (this Mac, or the GPU you are shopping). New OSS models show up on HuggingFace. Most of them are junk, gated, tiny, or a duplicate quant. The watch skips those, scores the rest, and only speaks when something is runnable *and* interesting: it fits, it is better than what you already look at, or it is a capability you asked for (vision, coding, Persian).

Fifty alerts a day would train you to ignore it. A weekday digest is the product: “this week, these new models fit an M4 16GB.” That digest can live on the personal site. It *is* the blog. It is also a GitHub changelog people can star.

llmfit does not do this. `plan` is “hardware for this model.” The watch is “new models for this hardware.” Same math, opposite trigger.

On the plan, this is not a phase-four extra. The scoring engine is shared with the GPU picker. The watch is that engine on a timer. Even without accounts, a public digest against five common profiles (M4 16GB, RTX 4060 8GB, RTX 4090, 32GB CPU, Mac Studio class) is enough to look alive.

---

## The empty website

**The question:** The personal site is empty. I need something good to put there as a sample of work. This seems like a strong one. Maybe open-sourcing it is better, because it also grows GitHub. There are good things in my head. Write them down as a real plan, a markdown file.

**The answer:** Yes. One live tool beats five toy clones. The site and the repo are the same object.

| Surface | Job |
| --- | --- |
| Personal site, first project | Live demo, one screenshot, three sentences, link to the repo |
| GitHub README | Same demo, formulas, “why not llmfit”, how to run |
| Changelog / `/digest` | Weekly fit list. Content without a blog |

The plan file (`PLAN.md`) is the build order: core scoring and tests in week 1, HuggingFace paste and a page that photographs well in week 2, intent search plus the digest in week 3, polish and stop in week 4. Shop URLs, Ollama, accounts, sponsors: after it has a pulse.

The name is **OnDesk**. On the desk, not in the cloud. FitWatch was the working title; it googles as a fitness tracker.

---

## What we are *not* answering with v1

These came up and they stay on the later list on purpose:

- Parsing Amazon / vendor hardware URLs
- Talking to Ollama or any local runtime
- A TUI
- Closed-source SaaS
- Injecting sponsored rows into the table
- Claiming measured tokens/sec

The inverse question (“I want this model, which GPU should I buy?”) is useful and llmfit already does it locally. A web version can wait. Mode A (hardware → models) is the missing one.

---

## Hugging Face already has MCP. It still does not do the match.

**The question:** Hugging Face has MCP, right? Their UI is still complicated: you search hardware and it dumps model cards. It would be great to use these MCPs and services to find a proper model/hardware match. Also: everyone hears AI and thinks LLM. The same problem exists for other nets. Inference *and* training. YOLO, RF-DETR, not just chat models.

**The answer:** Yes. Hugging Face ships an official MCP at `https://huggingface.co/mcp`. An assistant can search models, datasets, Spaces, papers, filter by *task* (object detection, image-text-to-text, automatic-speech-recognition, not only text-generation). There is a Cursor plugin for it. It is not connected here yet.

What it does **not** do is the thing we care about. Hub search is still “here are cards.” Hardware on the Hub is a browse filter, not a fit engine. You still get a list. You still do the math. llmfit’s own MCP (`llmfit serve --mcp`) is the other half and it is LLM-only: system specs, recommend, plan hardware for a *language* model.

So the architecture is composition, not a new Hub:

```
Hugging Face MCP     →  what exists (YOLO, RF-DETR, Qwen, Whisper, …)
Roboflow MCP         →  detectors, datasets, train/deploy (optional)
hardware profile     →  the box you have or the SKU you will buy
FitWatch scoring     →  infer vs train, this architecture, this memory
```

FitWatch should also *be* an MCP later: `fit(model, hardware, mode=infer|train) → band + GB math`. Then any agent can say “search Hub for object detection, then ask FitWatch what runs on an RTX 4060 8GB.” That is the product hiding in “use these MCPs.”

The LLM-only trap is real. A 7B Q4 chat model and RF-DETR-small are different animals:

| | LLM inference | Detector inference | Training (any net) |
| --- | --- | --- | --- |
| Bound by | weights + KV cache | weights + image size / batch | weights + activations + optimizer + batch |
| “Fits” means | VRAM for quant + context | VRAM for engine (TensorRT / CoreML / ONNX) + resolution | often 4–8× inference, sometimes more |
| Job tags | chat, coding, vision-LM | detect, segment, classify | fine-tune vs from-scratch |

v1 can still be small: job chips include `detect` and `train`, not only `chat`. A YOLO/RF-DETR card uses a coarser memory table than LLM quants. Honesty > fake tok/s. Same page, wider AI.

---

## Their key, your math

**The question:** If everyone brings their own Google API token for the AI search, I am not responsible for those answers. And a router that can run free in the background would be great.

**The answer:** Split the product in two.

The **fit engine** is yours. Deterministic. No Google. No OpenRouter. Parameters, VRAM, quant, train vs infer. You *are* responsible for that, and that is the point: it is explainable, testable, and the thing you learn hardware from.

The **language layer** (intent search, “explain this card”, digest prose) can be BYOK. User pastes a Gemini key, it never touches your server if you call Google from the browser, or it touches your server only as a proxy that does not store the key. One sentence on the page: *search text is generated with your key; the numbers are ours.* BYOK cuts your bill and the “FitWatch said” problem. It does not erase product liability for a wrong GB number.

The **watch** should work with zero keys. Hugging Face’s public list + your `fit()` function is enough for “new detector that fits an RTX 4060.” A router (OpenRouter is the usual one; free-model tier exists) is an optional extra for nicer summaries, still *their* token. Do not make the digest depend on anyone’s Gemini quota or it will die on day two.

Do not put *your* Google key in a public demo.

---

## Why this one

This is worth more time than the other ideas on the pile. It fills the empty site, it is a real GitHub repo, and it forces hardware literacy that kept getting postponed. That last one is not a side effect. It is part of why to do it. Only if v1 stays small enough to actually ship.

---

## The idea, in one breath

llmfit tells you what fits the machine you already have, if you install it, if the model is already in its catalog, if you know how to filter.

The thing worth building is the other moment: *before* you buy, *before* you know the model’s name, and *again* next Tuesday when something new drops.

Hardware in. HuggingFace in. A sentence in. A short honest table out. A digest if it actually fits you.

That is enough for a website that is no longer empty, and a GitHub that looks like you shipped a product.
