import type { NextRequest } from "next/server";
import { modelFromHub, parseHfRepo, type HubCard, type HubConfig } from "@ondesk/core";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("id") ?? "";
  const id = parseHfRepo(raw) ?? parseHfRepo(decodeURIComponent(raw));
  if (!id) {
    return Response.json({ error: "Invalid Hugging Face id." }, { status: 400 });
  }

  const cardRes = await fetch(
    `https://huggingface.co/api/models/${id}?full=true`,
    { headers: { Accept: "application/json" }, next: { revalidate: 3600 } },
  );
  if (!cardRes.ok) {
    return Response.json(
      { error: `Hugging Face returned ${cardRes.status} for ${id}.` },
      { status: 502 },
    );
  }
  const card = (await cardRes.json()) as HubCard;
  card.id = id;

  try {
    const cfgRes = await fetch(
      `https://huggingface.co/${id}/resolve/main/config.json`,
      { next: { revalidate: 3600 } },
    );
    if (cfgRes.ok) {
      card.config = (await cfgRes.json()) as HubConfig;
    }
  } catch {
    // config is optional; params from safetensors still score
  }

  const model = modelFromHub(card);
  return Response.json({ model });
}
