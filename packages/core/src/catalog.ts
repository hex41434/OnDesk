import gpusJson from "../../../data/gpus.json";
import modelsJson from "../../../data/models.json";
import type { Hardware, Model } from "./types";

export const gpus = gpusJson as Hardware[];
export const models = modelsJson as Model[];
