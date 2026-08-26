import {
  DEFAULT_CONTEXT,
  QUANT_LADDER,
  TRAIN_MULTIPLIER,
  availableGb,
  bandFor,
  kvCacheGb,
  overheadGb,
  roundGb,
  weightsGb,
} from "./memory";
import type {
  FitOptions,
  FitResult,
  Hardware,
  Model,
  Quant,
} from "./types";

const SPEED_EFFICIENCY: Record<Hardware["memoryKind"], number> = {
  vram: 0.35,
  unified: 0.22,
  system: 0.08,
};

function extraGb(model: Model): number {
  if (model.kind === "vlm") return 0.8;
  if (model.kind === "detector" || model.kind === "segment") {
    return Math.max(0.4, (model.weightGb ?? model.paramsB * 0.15) * 0.5);
  }
  if (model.kind === "asr") return 0.3;
  if (model.kind === "embed") return 0.1;
  return 0;
}

function quantsFor(model: Model, mode: FitOptions["mode"]): Quant[] {
  if (mode === "train") return ["fp16"];
  if (model.kind === "detector" || model.kind === "segment") {
    return ["fp16", "q8"];
  }
  if (model.kind === "embed" || model.kind === "asr") {
    return model.gguf ? QUANT_LADDER : ["fp16"];
  }
  return model.gguf ? QUANT_LADDER : ["fp16"];
}

function scoreQuant(
  model: Model,
  hardware: Hardware,
  quant: Quant,
  options: FitOptions,
): FitResult {
  const mode = options.mode ?? "infer";
  const context = options.context ?? DEFAULT_CONTEXT;
  const avail = availableGb(hardware.memoryGb, hardware.memoryKind);

  let weights: number;
  let kv: number;
  let extra = extraGb(model);
  let noteParts: string[] = [];

  if (mode === "train") {
    const base = model.weightGb ?? weightsGb(model.paramsB, "fp16");
    weights = base * TRAIN_MULTIPLIER;
    kv = 0;
    extra = extra * 2;
    noteParts.push(
      `training ~${TRAIN_MULTIPLIER}× FP16 weights (optimizer + activations; LoRA not modeled)`,
    );
  } else if (
    model.kind === "detector" ||
    model.kind === "segment" ||
    model.kind === "embed" ||
    model.kind === "asr"
  ) {
    const fp16 = model.weightGb ?? weightsGb(model.paramsB, "fp16");
    weights = quant === "fp16" ? fp16 : fp16 * (weightsGb(1, quant) / 2);
    kv = 0;
    noteParts.push("no KV cache; activation memory is a coarse add-on");
  } else {
    weights = weightsGb(model.paramsB, quant);
    kv = kvCacheGb(model.arch, model.paramsB, context);
    noteParts.push(`KV cache at ${context} context (fp16, estimate)`);
  }

  const overhead = overheadGb(weights);
  const total = weights + overhead + kv + extra;
  const ratio = avail > 0 ? total / avail : Infinity;
  const band = bandFor(ratio);

  const tokensPerSec =
    model.kind === "llm" || model.kind === "vlm"
      ? roundGb(
          (hardware.bandwidthGBs / Math.max(total, 0.1)) *
            SPEED_EFFICIENCY[hardware.memoryKind],
        )
      : null;

  if (hardware.memoryKind === "unified") {
    noteParts.push(
      `Apple unified: counting ${Math.round(avail * 10) / 10} GB usable of ${hardware.memoryGb} GB`,
    );
  } else if (hardware.memoryKind === "system") {
    noteParts.push("CPU path: system RAM, slow");
  }

  if (band === "no") {
    noteParts.push("does not fit at this quant");
  }

  const quantLabel = mode === "train" ? null : quant;

  return {
    band,
    gb: roundGb(total),
    quant: quantLabel,
    note: noteParts.join(". ") + ".",
    breakdown: {
      weightsGb: roundGb(weights),
      kvCacheGb: roundGb(kv),
      overheadGb: roundGb(overhead),
      extraGb: roundGb(extra),
      totalGb: roundGb(total),
      availableGb: roundGb(avail),
      ratio: roundGb(ratio),
    },
    tokensPerSec,
    estimate: true,
  };
}

/**
 * Score a model against hardware.
 * If `quant` is set, score that quant only.
 * Otherwise pick the highest-quality quant that still fits (tight counts as fit).
 */
export function fit(
  model: Model,
  hardware: Hardware,
  options: FitOptions = {},
): FitResult {
  const mode = options.mode ?? "infer";
  const allowed = quantsFor(model, mode);

  if (options.quant) {
    const q = allowed.includes(options.quant) ? options.quant : allowed[0]!;
    return scoreQuant(model, hardware, q, options);
  }

  let fallback: FitResult | null = null;
  for (const q of allowed) {
    const result = scoreQuant(model, hardware, q, options);
    fallback = result;
    if (result.band !== "no") return result;
  }
  return fallback!;
}
