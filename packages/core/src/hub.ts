import type {
  Architecture,
  HubCard,
  HubConfig,
  Job,
  Model,
  ModelKind,
  Quant,
} from "./types";

const HF_ID = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

/**
 * Accept a Hub URL or `org/name`.
 */
export function parseHfRepo(input: string): string | null {
  const trimmed = input.trim();
  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const u = new URL(trimmed);
      if (!u.hostname.endsWith("huggingface.co")) return null;
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "models") parts.shift();
      if (parts.length >= 2) {
        const id = `${parts[0]}/${parts[1]}`;
        return HF_ID.test(id) ? id : null;
      }
      return null;
    }
  } catch {
    return null;
  }
  return HF_ID.test(trimmed) ? trimmed : null;
}

function paramsFromCard(card: HubCard): number {
  const params = card.safetensors?.parameters;
  if (params) {
    let n = 0;
    for (const v of Object.values(params)) n += v;
    if (n > 0) return n / 1e9;
  }
  const totalParams = card.safetensors?.total;
  if (totalParams && totalParams > 0) {
    return totalParams / 1e9;
  }
  const hasSizedWeights = card.siblings?.some(
    (s) =>
      (s.size ?? 0) > 1e8 &&
      /\.(?:safetensors|bin|gguf)$/i.test(s.rfilename),
  );
  if (hasSizedWeights) {
    return sizeFromId(card.id).totalB ?? 0;
  }
  return 0;
}

/** `Qwen3.8-2.4T-A95B` → 2400B total, 95B active. */
export function sizeFromId(id: string): { totalB?: number; activeB?: number } {
  const leaf = id.split("/").pop() ?? id;
  const t = leaf.match(/(\d+(?:\.\d+)?)T\b/i);
  const a = leaf.match(/A(\d+(?:\.\d+)?)B\b/i);
  const b = leaf.match(/(?<![A-Za-z0-9])(\d+(?:\.\d+)?)B\b/i);
  return {
    totalB: t ? Number(t[1]) * 1000 : b ? Number(b[1]) : undefined,
    activeB: a ? Number(a[1]) : undefined,
  };
}

function weightBytesFromCard(card: HubCard): number | undefined {
  const bytes =
    card.siblings?.reduce((sum, sibling) => {
      if (!/\.(?:safetensors|bin)$/i.test(sibling.rfilename)) return sum;
      return sum + (sibling.size ?? 0);
    }, 0) ?? 0;
  return bytes > 1e8 ? bytes : undefined;
}

function archFromConfig(cfg: HubConfig | undefined): Architecture | undefined {
  if (!cfg) return undefined;
  if (cfg.text_config) {
    const textArch = archFromConfig(cfg.text_config);
    if (textArch) return textArch;
  }
  const nLayers = cfg.num_hidden_layers ?? cfg.n_layer;
  const nKvHeads = cfg.num_key_value_heads ?? cfg.num_attention_heads ?? cfg.n_head;
  const hidden = cfg.hidden_size ?? cfg.n_embd;
  const heads = cfg.num_attention_heads ?? cfg.n_head;
  const headDim = cfg.head_dim ?? (hidden && heads ? hidden / heads : undefined);
  if (!nLayers || !nKvHeads || !headDim) return undefined;
  return { nLayers, nKvHeads, headDim };
}

function hasToolCalling(tags: string): boolean {
  return /function.?call|tool.?use|tool.?call/.test(tags);
}

function kindAndJobs(card: HubCard): { kind: ModelKind; jobs: Job[] } {
  const tags = [
    ...(card.tags ?? []),
    ...(card.cardData?.tags ?? []),
    card.pipeline_tag ?? "",
    card.config?.model_type ?? "",
    ...(card.config?.architectures ?? []),
  ]
    .join(" ")
    .toLowerCase();

  if (/yolo|detr|object-detection|object_detection/.test(tags)) {
    return { kind: "detector", jobs: ["detect"] };
  }
  if (/mask|segformer|sam|panoptic|image-segmentation/.test(tags)) {
    return { kind: "segment", jobs: ["segment"] };
  }
  if (/whisper|automatic-speech|asr|speech/.test(tags)) {
    return { kind: "asr", jobs: ["speech"] };
  }
  if (
    /vl|vision|image-text|idefics|llava|internvl|qwen2-vl|qwen2_vl|pixtral/.test(
      tags,
    )
  ) {
    const jobs: Job[] = ["vision"];
    if (/code/.test(tags)) jobs.push("coding");
    if (hasToolCalling(tags)) jobs.push("tools");
    return { kind: "vlm", jobs };
  }
  if (/embed|feature-extraction|sentence/.test(tags)) {
    return { kind: "embed", jobs: ["embeddings"] };
  }

  const jobs: Job[] = ["chat"];
  if (/code|coder|starcoder|codestral/.test(tags)) jobs.push("coding");
  if (/reason|r1|thinking/.test(tags)) jobs.push("reasoning");
  if (hasToolCalling(tags)) jobs.push("tools");
  return { kind: "llm", jobs };
}

function quantFromBits(bits: number | undefined): Quant | undefined {
  if (bits === 2) return "q2";
  if (bits === 3) return "q3";
  if (bits === 4) return "q4";
  if (bits === 5) return "q5";
  if (bits === 6) return "q6";
  if (bits === 8) return "q8";
  if (bits === 16) return "fp16";
  return undefined;
}

function configuredQuant(config: HubConfig | undefined): Quant | undefined {
  for (let current = config; current; current = current.text_config) {
    const quant = current.quantization_config;
    if (!quant) continue;
    const direct = quantFromBits(quant.bits ?? quant.num_bits);
    if (direct) return direct;
    for (const group of Object.values(quant.config_groups ?? {})) {
      const nested = quantFromBits(group.weights?.num_bits);
      if (nested) return nested;
    }
  }
  return undefined;
}

function quantsFromCard(
  card: HubCard,
  config: HubConfig | undefined,
  hasGguf: boolean,
  weightGb: number | undefined,
  paramsB: number,
): { availableQuants?: Quant[]; sourceQuant?: Quant | null } {
  const found = new Set<Quant>();
  for (const sibling of card.siblings ?? []) {
    if (!sibling.rfilename.toLowerCase().endsWith(".gguf")) continue;
    const match = sibling.rfilename.match(
      /(?:^|[-_.])(?:Q([234568])|F(16))(?:[-_.]|$)/i,
    );
    const quant = quantFromBits(
      match?.[1] ? Number(match[1]) : match?.[2] ? 16 : undefined,
    );
    if (quant) found.add(quant);
  }

  const configured = configuredQuant(config);
  if (configured) found.add(configured);

  const tags = [...(card.tags ?? []), ...(card.cardData?.tags ?? [])]
    .join(" ")
    .toLowerCase();
  if (/\b(?:4-bit|int4|4bit|q4)\b/.test(tags)) found.add("q4");
  if (/\b(?:8-bit|int8|8bit|q8)\b/.test(tags)) found.add("q8");

  const order: Quant[] = ["fp16", "q8", "q6", "q5", "q4", "q3", "q2"];
  const availableQuants = order.filter((quant) => found.has(quant));
  if (availableQuants.length > 0) {
    return {
      availableQuants,
      sourceQuant: availableQuants.length === 1 ? availableQuants[0] : undefined,
    };
  }
  if (hasGguf) return {};
  if (weightGb != null && paramsB > 0) {
    const bytesPerParam = weightGb / paramsB;
    if (bytesPerParam >= 1.5) {
      return { availableQuants: ["fp16"], sourceQuant: "fp16" };
    }
    return { sourceQuant: null };
  }
  return {};
}

/**
 * Turn a Hugging Face Hub API payload into a Model the scorer understands.
 * Numbers stay deterministic; tags are a best-effort map.
 */
export function modelFromHub(card: HubCard, config?: HubConfig): Model {
  const cfg = config ?? card.config;
  const { kind, jobs } = kindAndJobs({ ...card, config: cfg });
  const named = sizeFromId(card.id);
  const paramsB = paramsFromCard(card);
  const active =
    named.activeB && paramsB > 0 && named.activeB < paramsB * 0.8
      ? named.activeB
      : undefined;
  const hasGguf =
    card.siblings?.some((s) => s.rfilename.toLowerCase().endsWith(".gguf")) ??
    false;
  const weightBytes = weightBytesFromCard(card);
  const weightGb = weightBytes ? weightBytes / 1e9 : undefined;
  const quantInfo = quantsFromCard(card, cfg, hasGguf, weightGb, paramsB);

  return {
    id: card.id,
    name: card.id.split("/")[1] ?? card.id,
    paramsB,
    activeParamsB: active,
    kind,
    jobs,
    license: card.cardData?.license ?? "unknown",
    gguf: hasGguf,
    ...quantInfo,
    hf: card.id,
    arch: archFromConfig(cfg),
    weightGb,
  };
}

/**
 * True when we can score without inventing a size.
 * Hub `safetensors.total` is often a param count, not file bytes — that is
 * still enough for a dense model. MoE with no on-disk size and no GGUF is not.
 */
export function enoughFitInfo(model: Model): boolean {
  if (!(model.paramsB > 0)) return false;
  if (model.weightGb != null && model.weightGb > 0) return true;
  if (model.gguf) return true;
  const moe =
    model.activeParamsB != null &&
    model.activeParamsB < model.paramsB * 0.5;
  if (moe) return false;
  return true;
}
