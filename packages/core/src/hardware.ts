import type { Hardware } from "./types";

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokens(s: string): string[] {
  return norm(s).split(/\s+/).filter(Boolean);
}

/**
 * Substring / token overlap against the curated SKU table.
 */
export function findHardware(
  query: string,
  catalog: Hardware[],
): Hardware[] {
  const q = norm(query);
  if (!q) return catalog.slice();

  const qTokens = tokens(query);
  const scored = catalog
    .map((hw) => {
      const hay = norm(`${hw.name} ${hw.id} ${hw.maker}`);
      let score = 0;
      if (hay === q) score += 100;
      if (hay.includes(q)) score += 40;
      for (const t of qTokens) {
        if (hay.includes(t)) score += 8;
      }
      return { hw, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (a.hw.id < b.hw.id ? -1 : 1));

  return scored.map((x) => x.hw);
}

export function hardwareById(
  id: string,
  catalog: Hardware[],
): Hardware | undefined {
  return catalog.find((h) => h.id === id);
}
