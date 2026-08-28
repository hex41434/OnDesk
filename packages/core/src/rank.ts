import { fit } from "./fit";
import { matchIntent } from "./intent";
import type {
  FitOptions,
  Hardware,
  Model,
  RankOptions,
  RankedFit,
  RankedHardware,
} from "./types";

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
    const size = b.model.paramsB - a.model.paramsB;
    if (size !== 0) return size;
    const gb = b.gb - a.gb;
    if (gb !== 0) return gb;
    if (a.model.id < b.model.id) return -1;
    if (a.model.id > b.model.id) return 1;
    return 0;
  });

  return rows;
}

/**
 * Rank hardware for one model. Cards that cannot run it are hidden
 * unless `hideNo` is false.
 */
export function rankHardware(
  model: Model,
  hardware: Hardware[],
  options: FitOptions & { hideNo?: boolean } = {},
): RankedHardware[] {
  const hideNo = options.hideNo ?? true;
  const rows: RankedHardware[] = [];

  for (const hw of hardware) {
    const result = fit(model, hw, options);
    if (hideNo && result.band === "no") continue;
    rows.push({ ...result, hardware: hw });
  }

  rows.sort((a, b) => {
    const band = BAND_ORDER[a.band] - BAND_ORDER[b.band];
    if (band !== 0) return band;
    const speed = (b.tokensPerSec ?? -1) - (a.tokensPerSec ?? -1);
    if (speed !== 0) return speed;
    const mem = b.hardware.memoryGb - a.hardware.memoryGb;
    if (mem !== 0) return mem;
    if (a.hardware.id < b.hardware.id) return -1;
    if (a.hardware.id > b.hardware.id) return 1;
    return 0;
  });

  return rows;
}
