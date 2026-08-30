const MODEL_FAMILY_ALIASES: { pattern: RegExp; family: string }[] = [
  {
    pattern: /\b(?:alibaba|ali\s*baba|tongyi|dashscope)\b|علی\s*بابا/iu,
    family: "Qwen",
  },
  { pattern: /\b(?:meta|facebook)\b/iu, family: "Llama" },
  { pattern: /\bmicrosoft\b/iu, family: "Phi" },
  { pattern: /\bgoogle\b/iu, family: "Gemma" },
];

/**
 * Small offline fallback for well-known company → open-model-family queries.
 * Gemini remains the primary semantic mapper when the user provides a key.
 */
export function mapKnownModelQuery(query: string): string | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const alias = MODEL_FAMILY_ALIASES.find(({ pattern }) => pattern.test(trimmed));
  if (!alias) return null;

  if (/\b(?:code|coder|coding)\b|کد/iu.test(trimmed)) {
    return `${alias.family} Coder`;
  }
  if (/\b(?:vision|visual|image)\b|تصویر/iu.test(trimmed)) {
    return `${alias.family} VL`;
  }
  return alias.family;
}
