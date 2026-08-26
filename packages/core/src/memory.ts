import type { FitBand, MemoryKind, Quant } from "./types";

/** GGUF-like bits per weight. Independent of any one vendor's file sizes. */
export const BITS_PER_WEIGHT: Record<Quant, number> = {
  fp16: 16,
  q8: 8.5,
  q6: 6.59,
  q5: 5.67,
  q4: 4.83,
  q3: 4.02,
  q2: 3.35,
};

/** Highest quality first. */
export const QUANT_LADDER: Quant[] = [
  "fp16",
  "q8",
  "q6",
  "q5",
  "q4",
  "q3",
  "q2",
];

export const DEFAULT_CONTEXT = 8192;

/** OS / desktop reservation on unified and system memory. */
export const UNIFIED_USABLE = 0.7;
export const SYSTEM_USABLE = 0.75;

export const BAND_PERFECT = 0.5;
export const BAND_GOOD = 0.75;
export const BAND_TIGHT = 0.9;

/** Training (Adam + activations) vs inference. Not LoRA. */
export const TRAIN_MULTIPLIER = 6;

export function weightsGb(paramsB: number, quant: Quant): number {
  return (paramsB * BITS_PER_WEIGHT[quant]) / 8;
}

export function overheadGb(weights: number): number {
  return 0.35 + weights * 0.03;
}

export function kvCacheGb(
  arch: { nLayers: number; nKvHeads: number; headDim: number } | undefined,
  paramsB: number,
  context: number,
): number {
  if (arch) {
    // K+V, fp16
    return (
      (2 * arch.nLayers * arch.nKvHeads * arch.headDim * context * 2) / 1e9
    );
  }
  return 0.125 * paramsB * (context / DEFAULT_CONTEXT);
}

export function availableGb(
  memoryGb: number,
  kind: MemoryKind,
): number {
  if (kind === "unified") return memoryGb * UNIFIED_USABLE;
  if (kind === "system") return memoryGb * SYSTEM_USABLE;
  return memoryGb;
}

export function bandFor(ratio: number): FitBand {
  if (ratio <= BAND_PERFECT) return "perfect";
  if (ratio <= BAND_GOOD) return "good";
  if (ratio <= BAND_TIGHT) return "tight";
  return "no";
}

export function roundGb(n: number): number {
  return Math.round(n * 100) / 100;
}
