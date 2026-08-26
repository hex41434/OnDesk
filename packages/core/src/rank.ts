import { fit } from "./fit";
import { matchIntent } from "./intent";
import type { Hardware, Model, RankOptions, RankedFit } from "./types";

const BAND_ORDER = { perfect: 0, good: 1, tight: 2, no: 3 } as const;

function jobMatch(model: Model, options: RankOptions): boolean {
  const jobs = new Set(model.jobs);
  if (options.job) return jobs.has(options.job);
  if (options.query) {
    const intent = matchIntent(options.query);
    if (intent.jobs.length === 0) {
      const q = options.query.toLowerCase();
      return (
        model.name.toLowerCase().includes(q) ||
        model.id.toLowerCase().includes(q) ||
        (model.hf?.toLowerCase().includes(q) ?? false)
      );
    }
    return intent.jobs.some((j) => jobs.has(j));
  }
  return true;
}

/**
 * Rank catalog models for a hardware profile.
 * Fits that do not run are hidden unless `hideNo` is false.
 */
export function rank(
  models: Model[],
  hardware: Hardware,
  options: RankOptions = {},
): RankedFit[] {
  const hideNo = options.hideNo ?? true;
  const rows: RankedFit[] = [];

  for (const model of models) {
    if (!jobMatch(model, options)) continue;
    const result = fit(model, hardware, options);
    if (hideNo && result.band === "no") continue;
    rows.push({ ...result, model });
  }

  rows.sort((a, b) => {
    const band = BAND_ORDER[a.band] - BAND_ORDER[b.band];
    if (band !== 0) return band;
    const size = a.model.paramsB - b.model.paramsB;
    if (Math.abs(size) > 0.05) return -size;
    return a.gb - b.gb;
  });

  return rows;
}
