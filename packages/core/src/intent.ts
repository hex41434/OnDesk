import type { Job, RunMode } from "./types";

export type Intent = {
  jobs: Job[];
  mode: RunMode;
};

const JOB_WORDS: { job: Job; words: string[] }[] = [
  {
    job: "vision",
    words: [
      "vision",
      "vlm",
      "multimodal",
      "image-text",
      "look at",
      "screenshot",
      "vl-",
    ],
  },
  {
    job: "detect",
    words: [
      "detect",
      "detection",
      "yolo",
      "rf-detr",
      "rfdetr",
      "bbox",
      "object",
    ],
  },
  {
    job: "segment",
    words: ["segment", "segmentation", "sam", "mask"],
  },
  {
    job: "coding",
    words: ["cod", "program", "dev", "refactor", "autocomplete"],
  },
  {
    job: "reasoning",
    words: ["reason", "think", "r1", "math", "logic"],
  },
  {
    job: "embeddings",
    words: ["embed", "retrieval", "rag", "vector", "search index"],
  },
  {
    job: "speech",
    words: ["speech", "whisper", "asr", "transcri", "audio"],
  },
  {
    job: "chat",
    words: ["chat", "instruct", "assistant", "talk", "write"],
  },
];

/**
 * Cheap keyword map. No model, no key.
 * "vision model for a mac" → jobs: [vision].
 */
export function matchIntent(query: string): Intent {
  const q = query.toLowerCase();
  const mode: RunMode =
    /\b(train|fine-?tune|finetune|lora)\b/.test(q) ? "train" : "infer";

  const jobs: Job[] = [];
  for (const { job, words } of JOB_WORDS) {
    if (words.some((w) => q.includes(w))) jobs.push(job);
  }

  return { jobs, mode };
}
