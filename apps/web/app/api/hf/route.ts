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

  const [config, siblings] = await Promise.all([
    fetch(`https://huggingface.co/${id}/resolve/main/config.json`, {
      next: { revalidate: 3600 },
    })
      .then(async (res) => (res.ok ? ((await res.json()) as HubConfig) : null))
      .catch(() => null),
    fetch(
      `https://huggingface.co/api/models/${id}/tree/main?recursive=true&expand=false`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      },
    )
      .then(async (res) => {
        if (!res.ok) return null;
        const files = (await res.json()) as {
          path?: string;
          size?: number;
          type?: string;
        }[];
        return files
          .filter((file) => file.type === "file" && file.path)
          .map((file) => ({
            rfilename: file.path!,
            size: file.size,
          }));
      })
      .catch(() => null),
  ]);

  if (config) card.config = config;
  if (siblings) card.siblings = siblings;

  const model = modelFromHub(card);
  return Response.json({ model });
}
