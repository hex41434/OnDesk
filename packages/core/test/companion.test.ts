import { describe, expect, it } from "vitest";
import { companionFor, companionLine } from "../src/companion";
import type { Hardware } from "../src/types";

const gpu8: Hardware = {
  id: "rtx-4060",
  name: "RTX 4060 8GB",
  maker: "nvidia",
  memoryGb: 8,
  memoryKind: "vram",
  bandwidthGBs: 272,
};

const gpu24: Hardware = {
  id: "rtx-4090",
  name: "RTX 4090 24GB",
  maker: "nvidia",
  memoryGb: 24,
  memoryKind: "vram",
  bandwidthGBs: 1008,
};

const m4: Hardware = {
  id: "m4-16",
  name: "M4 16GB",
  maker: "apple",
  memoryGb: 16,
  memoryKind: "unified",
  bandwidthGBs: 120,
};

const cpu32: Hardware = {
  id: "cpu-32",
  name: "CPU only 32GB RAM",
  maker: "cpu",
  memoryGb: 32,
  memoryKind: "system",
  bandwidthGBs: 50,
};

describe("companionFor", () => {
  it("pairs an 8GB card with a modest CPU and 16–32 GB RAM", () => {
    const c = companionFor(gpu8);
    expect(c.ramMinGb).toBe(16);
    expect(c.ramMaxGb).toBe(32);
    expect(c.cpu).toMatch(/6–8 cores/);
    expect(companionLine(c)).toMatch(/16–32 GB RAM/);
  });

  it("pairs a 24GB card with more cores and 32–64 GB RAM", () => {
    const c = companionFor(gpu24);
    expect(c.ramMinGb).toBe(32);
    expect(c.ramMaxGb).toBe(64);
    expect(c.cpu).toMatch(/12–16 cores/);
  });

  it("Apple unified is the same chip and the same RAM", () => {
    const c = companionFor(m4);
    expect(c.ramMinGb).toBe(16);
    expect(c.ramMaxGb).toBe(16);
    expect(c.cpu).toMatch(/M4/);
    expect(c.cpu).toMatch(/share RAM/);
    expect(c.note).toMatch(/macOS/);
  });

  it("CPU-only restates this machine's RAM", () => {
    const c = companionFor(cpu32);
    expect(c.ramMinGb).toBe(32);
    expect(c.ramMaxGb).toBe(32);
    expect(c.note).toMatch(/75%/);
  });
});
