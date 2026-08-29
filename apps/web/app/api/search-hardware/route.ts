import { findHardware, gpus, type Hardware } from "@ondesk/core";
import { mapHardwareQuery, resolveGeminiKey } from "../../../lib/gemini";

export const dynamic = "force-dynamic";

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
  if (!query) {
    return Response.json({
      search: "",
      via: "local" as const,
      hits: gpus,
    });
  }

  const key = resolveGeminiKey(req);
  let search = query;
  let via: "gemini" | "local" = "local";

  if (key) {
    const mapped = await mapHardwareQuery(key, query);
    if (mapped) {
      search = mapped;
      via = "gemini";
    }
  }

  const hits: Hardware[] = findHardware(search, gpus);
  return Response.json({ search, via, hits: hits.length ? hits : findHardware(query, gpus) });
}
