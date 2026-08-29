import type { Job } from "@ondesk/core";

export const JOB_LABEL: Record<Job, string> = {
  vision: "multimodal",
  detect: "detect",
  segment: "segment",
  coding: "coding",
  chat: "chat",
  reasoning: "reasoning",
  tools: "tool calling",
  embeddings: "embeddings",
  speech: "speech",
};
