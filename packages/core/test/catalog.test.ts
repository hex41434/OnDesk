import { describe, expect, it } from "vitest";
import { gpus, models, rank } from "../src/index";

describe("catalog", () => {
  it("has enough SKUs and models to demo", () => {
    expect(gpus.length).toBeGreaterThanOrEqual(40);
    expect(models.length).toBeGreaterThanOrEqual(100);
    expect(gpus.some((g) => g.id === "rtx-4060")).toBe(true);
    expect(gpus.some((g) => g.id === "m4-16")).toBe(true);
  });

  it("RTX 4060 + vision is a non-embarrassing list", () => {
    const gpu = gpus.find((g) => g.id === "rtx-4060")!;
    const rows = rank(models, gpu, { job: "vision" });
    const names = rows.map((r) => r.model.hf ?? r.model.id).join(" ");
    expect(rows.length).toBeGreaterThan(5);
    expect(names).toMatch(/Qwen2\.5-VL/);
    expect(rows.every((r) => r.band !== "no")).toBe(true);
  });
});
