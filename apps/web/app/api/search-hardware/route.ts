import { findHardware, gpus, type Hardware } from "@ondesk/core";
import { mapHardwareQuery, resolveGeminiKey } from "../../../lib/gemini";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as { query?: string };
  const query = body.query?.trim() ?? "";
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
