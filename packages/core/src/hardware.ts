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

const GENERIC = new Set([
  "apple",
  "nvidia",
  "amd",
  "geforce",
  "radeon",
  "chip",
  "gpu",
  "graphics",
  "intel",
  "core",
  "metal",
  "silicon",
]);

/**
 * Map a host probe (chip string + RAM) to the closest catalog SKU.
 * "Apple M4" + 16 → M4 16GB. Generic vendor words are ignored.
 */
export function matchHostSku(
  hint: string,
  memoryGb: number | null,
  catalog: Hardware[],
): Hardware | undefined {
  const keys = tokens(hint).filter((t) => !GENERIC.has(t) && t.length > 1);
  const q = [keys.join(" "), memoryGb != null ? String(memoryGb) : ""]
    .filter(Boolean)
    .join(" ");
  const hits = findHardware(q || hint, catalog);
  if (!hits.length) return undefined;
  if (memoryGb == null) return hits[0];
  return hits.reduce((best, hw) =>
    Math.abs(hw.memoryGb - memoryGb) < Math.abs(best.memoryGb - memoryGb)
      ? hw
      : best,
  );
}
