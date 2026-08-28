import type { Hardware } from "./types";

/** Typical desk-PC pairing for a GPU SKU. Ranges, not a shopping list. */
export type Companion = {
  cpu: string;
  ramMinGb: number;
  ramMaxGb: number;
  note: string;
};

function appleCpu(name: string): string {
  const chip = name.replace(/\s+\d+\s*GB.*$/i, "").trim();
  const n = name.toLowerCase();
  let cores: string;
  if (n.includes("ultra")) cores = "24–32 cores";
  else if (n.includes("max")) cores = "14–16 cores";
  else if (n.includes("pro")) cores = "12–14 cores";
  else cores = "8–10 cores";
  return `${chip} · ${cores} (CPU + GPU share RAM)`;
}

function discreteCpu(vramGb: number): string {
  if (vramGb <= 8) return "6–8 cores (Ryzen 5 / Core i5), PCIe 4.0";
  if (vramGb <= 12) return "8 cores (Ryzen 7 / Core i7), PCIe 4.0 x16";
  if (vramGb <= 16) return "8–12 cores (Ryzen 7 / Core i7), PCIe 4.0 x16";
  if (vramGb <= 24) return "12–16 cores (Ryzen 9 / Core i9), PCIe 4.0/5.0 x16";
  return "16+ cores (Ryzen 9 / Core Ultra 9), PCIe 5.0 x16";
}

function discreteRam(vramGb: number): { min: number; max: number } {
  if (vramGb <= 8) return { min: 16, max: 32 };
  if (vramGb <= 12) return { min: 32, max: 64 };
  if (vramGb <= 16) return { min: 32, max: 64 };
  if (vramGb <= 24) return { min: 32, max: 64 };
  return { min: 64, max: 128 };
}

export function companionFor(hw: Hardware): Companion {
  if (hw.memoryKind === "unified") {
    return {
      cpu: appleCpu(hw.name),
      ramMinGb: hw.memoryGb,
      ramMaxGb: hw.memoryGb,
      note: "CPU and GPU share this RAM. Fit already keeps ~30% for macOS.",
    };
  }
  if (hw.memoryKind === "system") {
    return {
      cpu: `CPU-only · this ${hw.memoryGb} GB machine`,
      ramMinGb: hw.memoryGb,
      ramMaxGb: hw.memoryGb,
      note: "No discrete GPU. Fit uses ~75% of this RAM.",
    };
  }
  const ram = discreteRam(hw.memoryGb);
  return {
    cpu: discreteCpu(hw.memoryGb),
    ramMinGb: ram.min,
    ramMaxGb: ram.max,
    note: "System RAM besides VRAM. Low end ≈ VRAM; high end ≈ 2× for OS and offload.",
  };
}

export function companionLine(c: Companion): string {
  const ram =
    c.ramMinGb === c.ramMaxGb
      ? `${c.ramMinGb} GB RAM`
      : `${c.ramMinGb}–${c.ramMaxGb} GB RAM`;
  return `${c.cpu} · ${ram}`;
}
