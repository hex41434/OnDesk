import type { Quant } from "@ondesk/core";

export function sizeLabel(paramsB: number): string {
  if (paramsB >= 1000) {
    const trillions = paramsB / 1000;
    return `${trillions.toFixed(trillions >= 10 ? 0 : 2).replace(/\.0+$/, "")}T`;
  }
  if (paramsB >= 100) return `${paramsB.toFixed(0)}B`;
  if (paramsB >= 1) return `${paramsB.toFixed(paramsB >= 10 ? 0 : 1)}B`;
  if (paramsB >= 0.001) return `${Math.round(paramsB * 1000)}M`;
  if (paramsB >= 0.000001) return `${Math.round(paramsB * 1e6)}K`;
  return `${Math.round(paramsB * 1e9).toLocaleString("en-US")}`;
}

export function quantLabel(q: Quant | null): string {
  if (!q) return "—";
  if (q === "fp16") return "FP16";
  return q.toUpperCase();
}

const SIZE_IN_NAME = /\d+(\.\d+)?\s*[bBmM]\b/;

export function modelMeta(name: string, paramsB: number, license: string): string {
  const parts: string[] = [];
  if (!SIZE_IN_NAME.test(name)) parts.push(sizeLabel(paramsB));
  if (license && license !== "unknown") parts.push(license);
  return parts.join(" · ");
}
