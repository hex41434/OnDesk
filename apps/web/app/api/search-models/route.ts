import { parseHfRepo } from "@ondesk/core";
import { mapModelQuery, resolveGeminiKey } from "../../../lib/gemini";

export const dynamic = "force-dynamic";

export type HubHit = {
  id: string;
  pipeline_tag: string | null;
  downloads: number | null;
};

async function hubSearch(search: string): Promise<HubHit[]> {
  const url = new URL("https://huggingface.co/api/models");
  url.searchParams.set("search", search);
  url.searchParams.set("limit", "12");
  url.searchParams.set("sort", "downloads");
  url.searchParams.set("direction", "-1");

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Hugging Face search returned ${res.status}`);
  }
  const rows = (await res.json()) as {
    id?: string;
    modelId?: string;
    pipeline_tag?: string | null;
    downloads?: number;
  }[];
  const hits: HubHit[] = [];
  for (const row of rows) {
    const id = parseHfRepo(row.id ?? row.modelId ?? "");
    if (!id) continue;
    hits.push({
      id,
      pipeline_tag: row.pipeline_tag ?? null,
      downloads: row.downloads ?? null,
    });
  }
  return hits;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const query =
    typeof body === "object" &&
    body !== null &&
    "query" in body &&
    typeof body.query === "string"
      ? body.query.trim()
      : "";
  if (query.length < 2) {
    return Response.json({ error: "Type a model name or job." }, { status: 400 });
  }

  const key = resolveGeminiKey(req);
  let search = query;
  let via: "gemini" | "hub" = "hub";
  let job = null;

  if (key) {
    const mapped = await mapModelQuery(key, query);
    if (mapped) {
      search = mapped.search;
      job = mapped.job;
      via = "gemini";
    }
  }

  try {
    const hits = await hubSearch(search);
    return Response.json({ search, job, via, hits });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Hub search failed.";
    return Response.json({ error: message }, { status: 502 });
  }
}
