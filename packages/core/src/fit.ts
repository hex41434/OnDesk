import {
  DEFAULT_CONTEXT,
  QUANT_LADDER,
  TRAIN_MULTIPLIER,
  YOLO_IMAGE_SIZE,
  YOLO_INFER_BATCH,
  YOLO_TRAIN_BATCH,
  YOLO_TRAIN_EPOCHS,
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

const VISION_BASE_IMAGE_SIZE = 640;

const SPEED_EFFICIENCY: Record<Hardware["memoryKind"], number> = {
  vram: 0.35,
  unified: 0.22,
  system: 0.08,
};

function isYolo(model: Model): boolean {
  return (
    model.id.toLowerCase().startsWith("yolo") ||
    model.hf?.toLowerCase().includes("ultralytics/yolo") === true
  );
}

function extraGb(model: Model, mode: FitOptions["mode"]): number {
  if (model.kind === "vlm") return 0.8;
  if (model.kind === "detector" || model.kind === "segment") {
    if (isYolo(model)) {
      const resolutionScale = (YOLO_IMAGE_SIZE / VISION_BASE_IMAGE_SIZE) ** 2;
      const batch = mode === "train" ? YOLO_TRAIN_BATCH : YOLO_INFER_BATCH;
      return (0.35 + model.paramsB * 10) * resolutionScale * batch;
    }
    const base = Math.max(
      0.4,
      (model.weightGb ?? model.paramsB * 0.15) * 0.5,
    );
    return base;
  }
  if (model.kind === "asr") return 0.3;
  if (model.kind === "embed") return 0.1;
  return 0;
}

function quantsFor(model: Model, mode: FitOptions["mode"]): Quant[] {
  if (mode === "train") return ["fp16"];
  if (model.availableQuants?.length) return model.availableQuants;
  if (model.sourceQuant === null) return ["fp16"];
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
  let extra = extraGb(model, mode);
  let noteParts: string[] = [];

  if (mode === "train") {
    const base = model.weightGb ?? weightsGb(model.paramsB, "fp16");
    weights = base * TRAIN_MULTIPLIER;
    kv = 0;
    if (!isYolo(model)) extra = extra * 2;
    noteParts.push(
      `training ~${TRAIN_MULTIPLIER}× FP16 weights (optimizer + activations; LoRA not modeled)`,
    );
    if (isYolo(model)) {
      noteParts.push(
        `YOLO assumption: ${YOLO_IMAGE_SIZE}×${YOLO_IMAGE_SIZE}, batch ${YOLO_TRAIN_BATCH}, ${YOLO_TRAIN_EPOCHS} epochs; training time not modeled`,
      );
    }
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
    if (isYolo(model)) {
      noteParts.push(
        `YOLO assumption: ${YOLO_IMAGE_SIZE}×${YOLO_IMAGE_SIZE}, batch ${YOLO_INFER_BATCH}`,
      );
    }
  } else {
    const useSourceWeights =
      model.weightGb != null &&
      (model.sourceQuant === null || model.sourceQuant === quant);
    weights = useSourceWeights
      ? model.weightGb!
      : weightsGb(model.paramsB, quant);
    const kvParams = model.activeParamsB ?? model.paramsB;
    kv = kvCacheGb(model.arch, kvParams, context);
    noteParts.push(`KV cache at ${context} context (fp16, estimate)`);
    if (model.activeParamsB && model.activeParamsB < model.paramsB) {
      noteParts.push(
        `MoE: ${model.paramsB.toFixed(0)}B total, ${model.activeParamsB.toFixed(0)}B active`,
      );
    }
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

  const quantLabel =
    mode === "train" || model.sourceQuant === null ? null : quant;

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
    return scoreQuant(model, hardware, options.quant, options);
  }

  let fallback: FitResult | null = null;
  for (const q of allowed) {
    const result = scoreQuant(model, hardware, q, options);
    fallback = result;
    if (result.band !== "no") return result;
  }
  return fallback!;
}
