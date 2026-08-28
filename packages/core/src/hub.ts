import type {
  Architecture,
  HubCard,
  HubConfig,
  Job,
  Model,
  ModelKind,
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
  const bytes = card.safetensors?.total;
  if (bytes && bytes > 0) return bytes / 2 / 1e9;
  const sib = card.siblings?.reduce((a, s) => a + (s.size ?? 0), 0) ?? 0;
  if (sib > 1e8) return sib / 2 / 1e9;
  return 0;
}

function archFromConfig(cfg: HubConfig | undefined): Architecture | undefined {
  if (!cfg) return undefined;
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
  if (/embed|feature-extraction|sentence/.test(tags)) {
    return { kind: "embed", jobs: ["embeddings"] };
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

  const jobs: Job[] = ["chat"];
  if (/code|coder|starcoder|codestral/.test(tags)) jobs.push("coding");
  if (/reason|r1|thinking/.test(tags)) jobs.push("reasoning");
  if (hasToolCalling(tags)) jobs.push("tools");
  return { kind: "llm", jobs };
}

/**
 * Turn a Hugging Face Hub API payload into a Model the scorer understands.
 * Numbers stay deterministic; tags are a best-effort map.
 */
export function modelFromHub(card: HubCard, config?: HubConfig): Model {
  const cfg = config ?? card.config;
  const { kind, jobs } = kindAndJobs({ ...card, config: cfg });
  const paramsB = paramsFromCard(card);
  const weightBytes = card.safetensors?.total;
  const gguf =
    card.siblings?.some((s) => s.rfilename.toLowerCase().endsWith(".gguf")) ??
    false;

  return {
    id: card.id,
    name: card.id.split("/")[1] ?? card.id,
    paramsB: paramsB || 7,
    kind,
    jobs,
    license: card.cardData?.license ?? "unknown",
    gguf: gguf || kind === "llm" || kind === "vlm",
    hf: card.id,
    arch: archFromConfig(cfg),
    weightGb: weightBytes ? weightBytes / 1e9 : undefined,
  };
}
