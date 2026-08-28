import type { Job } from "@ondesk/core";

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash"];

export const JOBS: Job[] = [
  "vision",
  "detect",
  "segment",
  "coding",
  "chat",
  "reasoning",
  "tools",
  "embeddings",
  "speech",
];

/** Header from /settings overrides env. Never log this. */
export function resolveGeminiKey(req: Request): string {
  return (
    req.headers.get("x-gemini-key")?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim() ||
    ""
  );
}

function extractJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const fence = trimmed.match(/\{[\s\S]*\}/);
  return JSON.parse(fence ? fence[0] : trimmed) as Record<string, unknown>;
}

export async function geminiJson(
  key: string,
  prompt: string,
): Promise<Record<string, unknown> | null> {
  for (const model of GEMINI_MODELS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
          },
        }),
        cache: "no-store",
      },
    );
    if (!res.ok) continue;
    const body = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) continue;
    try {
      return extractJsonObject(text);
    } catch {
      continue;
    }
  }
  return null;
}

export async function mapModelQuery(
  key: string,
  query: string,
): Promise<{ search: string; job: Job | null } | null> {
  const parsed = await geminiJson(
    key,
    `Map this user request to a Hugging Face Hub keyword search.
The request may be Persian, English, or informal.
Return JSON only: {"search":"short English Hub query","job":"coding"|null}
"search" is identifiers/names (Qwen2.5-Coder), not a sentence.
"job" is one of: vision, detect, segment, coding, chat, reasoning, tools, embeddings, speech — or null.
Do not mention VRAM, GB, tok/s, or whether a model fits.

User: ${query}`,
  );
  const search =
    typeof parsed?.search === "string" ? parsed.search.trim() : "";
  if (!search) return null;
  const jobRaw = parsed?.job;
  const job =
    typeof jobRaw === "string" && JOBS.includes(jobRaw as Job)
      ? (jobRaw as Job)
      : null;
  return { search, job };
}

export async function mapHardwareQuery(
  key: string,
  query: string,
): Promise<string | null> {
  const parsed = await geminiJson(
    key,
    `Map this to a short search string for a GPU / Apple Silicon / CPU SKU list.
The request may be Persian, English, or informal (e.g. "مینی مک ۱۶ گیگ", "8GB laptop", "mac studio").
Return JSON only: {"search":"RTX 4060"} or {"search":"M4 16GB"}
Use vendor + memory size when the user implied them. Do not invent a SKU they did not hint at.
Do not mention models, tok/s, or fit.

User: ${query}`,
  );
  const search =
    typeof parsed?.search === "string" ? parsed.search.trim() : "";
  return search || null;
}
