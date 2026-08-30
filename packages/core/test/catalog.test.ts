import { describe, expect, it } from "vitest";
import {
  enoughFitInfo,
  findHardware,
  gpus,
  mapKnownModelQuery,
  matchHostSku,
  models,
  rank,
  rankHardware,
} from "../src/index";

describe("catalog", () => {
  it("catalog cards have enough info to score", () => {
    expect(models.every((m) => enoughFitInfo(m))).toBe(true);
  });

  it("has enough SKUs and models to demo", () => {
    expect(gpus.length).toBeGreaterThanOrEqual(40);
    expect(models.length).toBeGreaterThanOrEqual(100);
    expect(gpus.some((g) => g.id === "rtx-4060")).toBe(true);
    expect(gpus.some((g) => g.id === "m4-16")).toBe(true);
  });

  it("includes all five official YOLO26 detector sizes", () => {
    const ids = models.filter((m) => m.id.startsWith("yolo26")).map((m) => m.id);
    expect(ids).toEqual([
      "yolo26n",
      "yolo26s",
      "yolo26m",
      "yolo26l",
      "yolo26x",
    ]);
  });

  it("RTX 4060 + vision is a non-embarrassing list", () => {
    const gpu = gpus.find((g) => g.id === "rtx-4060")!;
    const rows = rank(models, gpu, { job: "vision" });
    const names = rows.map((r) => r.model.hf ?? r.model.id).join(" ");
    expect(rows.length).toBeGreaterThan(5);
    expect(names).toMatch(/Qwen2\.5-VL/);
    expect(rows.every((r) => r.band !== "no")).toBe(true);
  });

  it("rank() is stable across two calls", () => {
    const gpu = gpus.find((g) => g.id === "rtx-4060")!;
    const a = rank(models, gpu).map((r) => r.model.id);
    const b = rank(models, gpu).map((r) => r.model.id);
    expect(a).toEqual(b);
  });

  it("matchHostSku maps Apple M4 16GB", () => {
    expect(matchHostSku("Apple M4", 16, gpus)?.id).toBe("m4-16");
  });

  it("finds current M5 MacBook configurations", () => {
    const hits = findHardware("MacBook M5", gpus);
    expect(hits.map((hw) => hw.id)).toEqual(
      expect.arrayContaining(["m5-16", "m5-24", "m5-32"]),
    );
  });

  it("maps a model company to its Hub family without Gemini", () => {
    expect(mapKnownModelQuery("Alibaba")).toBe("Qwen");
    expect(mapKnownModelQuery("علی بابا")).toBe("Qwen");
  });

  it("Qwen2.5 7B has matching hardware", () => {
    const qwen = models.find((m) => m.id === "qwen2.5-7b")!;
    const rows = rankHardware(qwen, gpus);
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.every((r) => r.band !== "no")).toBe(true);
    expect(rows.some((r) => r.hardware.id === "rtx-4060")).toBe(true);
  });

  it("RTX 4060 + tools lists function-calling models", () => {
    const gpu = gpus.find((g) => g.id === "rtx-4060")!;
    const rows = rank(models, gpu, { job: "tools" });
    const names = rows.map((r) => r.model.id).join(" ");
    expect(rows.length).toBeGreaterThan(5);
    expect(rows.every((r) => r.model.jobs.includes("tools"))).toBe(true);
    expect(names).toMatch(/qwen/);
  });

  it("within perfect, larger models come first", () => {
    const gpu = gpus.find((g) => g.id === "rtx-4060")!;
    const perfect = rank(models, gpu).filter((r) => r.band === "perfect");
    expect(perfect.length).toBeGreaterThan(3);
    for (let i = 1; i < perfect.length; i++) {
      expect(perfect[i - 1]!.model.paramsB).toBeGreaterThanOrEqual(
        perfect[i]!.model.paramsB,
      );
    }
  });
});
