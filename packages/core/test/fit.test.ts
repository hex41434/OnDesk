import { describe, expect, it } from "vitest";
import { fit } from "../src/fit";
import { findHardware } from "../src/hardware";
import { enoughFitInfo, modelFromHub, parseHfRepo, sizeFromId } from "../src/hub";
import { matchIntent } from "../src/intent";
import {
  availableGb,
  bandFor,
  kvCacheGb,
  weightsGb,
} from "../src/memory";
import { rank, rankHardware } from "../src/rank";
import type { Hardware, Model } from "../src/types";

const gpu8: Hardware = {
  id: "rtx-4060",
  name: "RTX 4060 8GB",
  maker: "nvidia",
  memoryGb: 8,
  memoryKind: "vram",
  bandwidthGBs: 272,
};

const m4: Hardware = {
  id: "m4-16",
  name: "M4 16GB",
  maker: "apple",
  memoryGb: 16,
  memoryKind: "unified",
  bandwidthGBs: 120,
};

const llama7: Model = {
  id: "llama-7b",
  name: "Llama 7B",
  paramsB: 7,
  kind: "llm",
  jobs: ["chat"],
  license: "llama2",
  gguf: true,
  hf: "meta-llama/Llama-2-7b-chat-hf",
  arch: { nLayers: 32, nKvHeads: 8, headDim: 128 },
};

const llama70: Model = {
  id: "llama-70b",
  name: "Llama 70B",
  paramsB: 70,
  kind: "llm",
  jobs: ["chat"],
  license: "llama2",
  gguf: true,
  hf: "meta-llama/Llama-2-70b-chat-hf",
  arch: { nLayers: 80, nKvHeads: 8, headDim: 128 },
};

const vl7: Model = {
  id: "qwen-vl-7b",
  name: "Qwen2.5 VL 7B",
  paramsB: 8.3,
  kind: "vlm",
  jobs: ["vision"],
  license: "apache-2.0",
  gguf: true,
  hf: "Qwen/Qwen2.5-VL-7B-Instruct",
  arch: { nLayers: 28, nKvHeads: 4, headDim: 128 },
};

const yolo: Model = {
  id: "yolov8n",
  name: "YOLOv8n",
  paramsB: 0.003,
  kind: "detector",
  jobs: ["detect"],
  license: "agpl-3.0",
  gguf: false,
  hf: "Ultralytics/YOLOv8",
  weightGb: 0.006,
};

describe("fit()", () => {
  it("a 7B Q4 on 8GB VRAM is good", () => {
    const result = fit(llama7, gpu8, { quant: "q4" });
    const weights = weightsGb(7, "q4");
    const kv = kvCacheGb(llama7.arch, 7, 8192);
    expect(weights).toBeCloseTo(4.23, 1);
    expect(kv).toBeCloseTo(1.07, 1);
    expect(result.band).toBe("good");
    expect(result.quant).toBe("q4");
    expect(result.estimate).toBe(true);
  });

  it("a 70B Q8 on 8GB VRAM is no", () => {
    const result = fit(llama70, gpu8, { quant: "q8" });
    expect(result.band).toBe("no");
    expect(result.gb).toBeGreaterThan(8);
  });

  it("picks the highest quant that still fits on 8GB", () => {
    const result = fit(llama7, gpu8);
    expect(result.band).not.toBe("no");
    expect(result.quant).toBeTruthy();
    const order = ["fp16", "q8", "q6", "q5", "q4", "q3", "q2"];
    expect(order.indexOf(result.quant!)).toBeLessThan(order.indexOf("q2"));
  });

  it("70B does not fit an 8GB card at any quant", () => {
    expect(fit(llama70, gpu8).band).toBe("no");
  });

  it("Apple unified memory reserves OS headroom", () => {
    expect(availableGb(16, "unified")).toBeCloseTo(11.2, 5);
    const result = fit(llama7, m4, { quant: "q4" });
    expect(result.breakdown.availableGb).toBeCloseTo(11.2, 1);
    expect(["perfect", "good"]).toContain(result.band);
  });

  it("longer context increases KV and can worsen the band", () => {
    const short = fit(llama7, gpu8, { quant: "q4", context: 2048 });
    const long = fit(llama7, gpu8, { quant: "q4", context: 32768 });
    expect(long.breakdown.kvCacheGb).toBeGreaterThan(short.breakdown.kvCacheGb);
    expect(long.gb).toBeGreaterThan(short.gb);
  });

  it("training needs much more memory than inference", () => {
    const infer = fit(llama7, gpu8, { mode: "infer", quant: "fp16" });
    const train = fit(llama7, gpu8, { mode: "train" });
    expect(train.gb).toBeGreaterThan(infer.gb * 3);
    expect(train.band).toBe("no");
    expect(train.note.toLowerCase()).toContain("training");
  });

  it("detectors skip KV cache and tok/s", () => {
    const result = fit(yolo, gpu8);
    expect(result.breakdown.kvCacheGb).toBe(0);
    expect(result.breakdown.extraGb).toBeCloseTo(0.59, 1);
    expect(result.tokensPerSec).toBeNull();
    expect(result.band).toBe("perfect");
    expect(result.note).toContain("800×800");
    expect(result.note).toContain("batch 1");
  });

  it("labels the fixed YOLO training assumptions without treating epochs as memory", () => {
    const result = fit(yolo, gpu8, { mode: "train" });
    expect(result.breakdown.extraGb).toBeGreaterThan(9);
    expect(result.note).toContain("800×800");
    expect(result.note).toContain("batch 16");
    expect(result.note).toContain("100 epochs");
    expect(result.note).toContain("training time not modeled");
  });

  it("labels speed as an estimate, never a measurement", () => {
    const result = fit(llama7, gpu8, { quant: "q4" });
    expect(result.estimate).toBe(true);
    expect(result.tokensPerSec).toBeGreaterThan(0);
  });

  it("honors a requested quant even when the repo has no GGUF", () => {
    const dense: Model = { ...llama7, gguf: false, paramsB: 2446, arch: undefined };
    const q4 = fit(dense, { ...gpu8, memoryGb: 10_000 }, { quant: "q4" });
    expect(q4.quant).toBe("q4");
    expect(q4.breakdown.weightsGb).toBeCloseTo(weightsGb(2446, "q4"), 0);
  });

  it("MoE KV uses active params, not the full 2.4T", () => {
    const moe: Model = {
      ...llama7,
      id: "qwen-2.4t",
      name: "Qwen 2.4T A95B",
      paramsB: 2446,
      activeParamsB: 95,
      arch: undefined,
    };
    const huge = fit(moe, { ...gpu8, memoryGb: 10_000 }, { quant: "q4" });
    const dense = fit({ ...moe, activeParamsB: undefined }, { ...gpu8, memoryGb: 10_000 }, { quant: "q4" });
    expect(huge.breakdown.kvCacheGb).toBeLessThan(dense.breakdown.kvCacheGb);
    expect(huge.breakdown.kvCacheGb).toBeCloseTo(0.125 * 95, 0);
  });

  it("Qwen2.5-VL-7B fits an M4 16GB at some quant", () => {
    const result = fit(vl7, m4);
    expect(result.band).not.toBe("no");
    expect(result.quant).toBeTruthy();
  });
});

describe("bandFor()", () => {
  it("uses the published headroom cuts", () => {
    expect(bandFor(0.4)).toBe("perfect");
    expect(bandFor(0.5)).toBe("perfect");
    expect(bandFor(0.6)).toBe("good");
    expect(bandFor(0.75)).toBe("good");
    expect(bandFor(0.8)).toBe("tight");
    expect(bandFor(0.9)).toBe("tight");
    expect(bandFor(0.91)).toBe("no");
  });
});

describe("rank()", () => {
  it("filters vision and hides rows that do not fit", () => {
    const rows = rank([llama7, llama70, vl7, yolo], gpu8, { job: "vision" });
    expect(rows.map((r) => r.model.id)).toEqual(["qwen-vl-7b"]);
    expect(rows[0]?.band).not.toBe("no");
  });

  it("sorts better bands before worse", () => {
    const tiny: Model = {
      ...llama7,
      id: "tiny",
      name: "Tiny",
      paramsB: 0.5,
    };
    const rows = rank([llama7, tiny], gpu8, { hideNo: false });
    expect(BAND_INDEX(rows[0]!.band)).toBeLessThanOrEqual(
      BAND_INDEX(rows[1]!.band),
    );
  });
});

describe("rankHardware()", () => {
  it("lists cards that can run a 7B and hides a 2GB card", () => {
    const tiny: Hardware = { ...gpu8, id: "2gb", name: "2GB", memoryGb: 2 };
    const rows = rankHardware(llama7, [gpu8, m4, tiny]);
    expect(rows.every((r) => r.band !== "no")).toBe(true);
    expect(rows.map((r) => r.hardware.id)).toEqual(
      expect.arrayContaining(["rtx-4060", "m4-16"]),
    );
    expect(rows.some((r) => r.hardware.id === "2gb")).toBe(false);
  });
});

function BAND_INDEX(band: string): number {
  return { perfect: 0, good: 1, tight: 2, no: 3 }[band] ?? 9;
}

describe("matchIntent()", () => {
  it("maps a sentence to vision without a model name", () => {
    const intent = matchIntent("vision model for a mac mini with 16GB");
    expect(intent.jobs).toContain("vision");
    expect(intent.mode).toBe("infer");
  });

  it("maps detect and train", () => {
    expect(matchIntent("yolo detector").jobs).toContain("detect");
    expect(matchIntent("I want to fine-tune a 7B").mode).toBe("train");
  });

  it("maps tool calling", () => {
    expect(matchIntent("tool calling agent").jobs).toContain("tools");
    expect(matchIntent("function-calling").jobs).toContain("tools");
  });
});

describe("findHardware()", () => {
  it("finds RTX 4060 from a short query", () => {
    const hits = findHardware("4060 8", [
      gpu8,
      m4,
      { ...gpu8, id: "rtx-4090", name: "RTX 4090 24GB", memoryGb: 24 },
    ]);
    expect(hits[0]?.id).toBe("rtx-4060");
  });
});

describe("parseHfRepo / modelFromHub", () => {
  it("accepts org/name and Hub URLs", () => {
    expect(parseHfRepo("Qwen/Qwen2.5-VL-7B-Instruct")).toBe(
      "Qwen/Qwen2.5-VL-7B-Instruct",
    );
    expect(
      parseHfRepo("https://huggingface.co/Qwen/Qwen2.5-VL-7B-Instruct"),
    ).toBe("Qwen/Qwen2.5-VL-7B-Instruct");
    expect(parseHfRepo("not a repo")).toBeNull();
  });

  it("builds a scorable model from a Hub card", () => {
    const model = modelFromHub({
      id: "Qwen/Qwen2.5-VL-7B-Instruct",
      pipeline_tag: "image-text-to-text",
      tags: ["vision"],
      safetensors: { total: 16.6e9, parameters: { BF16: 8.3e9 } },
      cardData: { license: "apache-2.0" },
      config: {
        num_hidden_layers: 28,
        num_key_value_heads: 4,
        hidden_size: 3584,
        num_attention_heads: 28,
      },
    });
    expect(model.kind).toBe("vlm");
    expect(model.jobs).toContain("vision");
    expect(model.paramsB).toBeCloseTo(8.3, 1);
    expect(model.arch?.nLayers).toBe(28);
    expect(enoughFitInfo(model)).toBe(true);
  });

  it("scores a dense Hub card even when total is a param count, not bytes", () => {
    const model = modelFromHub({
      id: "Qwen/Qwen2.5-7B-Instruct",
      pipeline_tag: "text-generation",
      tags: ["qwen"],
      safetensors: {
        total: 7615616512,
        parameters: { BF16: 7615616512 },
      },
      siblings: [
        { rfilename: "model-00001-of-00002.safetensors", size: 7.7e9 },
        { rfilename: "model-00002-of-00002.safetensors", size: 7.6e9 },
      ],
      cardData: { license: "apache-2.0" },
    });
    expect(model.paramsB).toBeCloseTo(7.62, 1);
    expect(model.weightGb).toBeCloseTo(15.3, 1);
    expect(model.gguf).toBe(false);
    expect(model.availableQuants).toEqual(["fp16"]);
    expect(enoughFitInfo(model)).toBe(true);
  });

  it("scores a GGUF repo from its real file plus declared name size", () => {
    const model = modelFromHub({
      id: "projectj/Instinct-Python-Coder-Gemma4-12B-KimiK3",
      pipeline_tag: "text-generation",
      tags: ["gguf"],
      siblings: [
        {
          rfilename: "Instinct-Python-Coder-Gemma4-12B-KimiK3-Q8_0.gguf",
          size: 12.67e9,
        },
      ],
      cardData: { license: "apache-2.0" },
    });
    expect(model.paramsB).toBe(12);
    expect(model.gguf).toBe(true);
    expect(model.availableQuants).toEqual(["q8"]);
    expect(enoughFitInfo(model)).toBe(true);
    const rows = rankHardware(model, [
      gpu8,
      { ...gpu8, id: "rtx-4090", name: "RTX 4090 24GB", memoryGb: 24 },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.hardware.id).toBe("rtx-4090");
    expect(rows[0]?.quant).toBe("q8");
  });

  it("uses the declared AWQ quant and real weight size", () => {
    const model = modelFromHub({
      id: "Qwen/Qwen2.5-7B-Instruct-AWQ",
      pipeline_tag: "text-generation",
      tags: ["4-bit", "awq"],
      safetensors: {
        total: 7615616512,
        parameters: { BF16: 7615616512 },
      },
      siblings: [
        { rfilename: "model-00001-of-00002.safetensors", size: 2.8e9 },
        { rfilename: "model-00002-of-00002.safetensors", size: 2.77e9 },
      ],
    });
    const result = fit(model, gpu8);
    expect(model.availableQuants).toEqual(["q4"]);
    expect(result.quant).toBe("q4");
    expect(result.breakdown.weightsGb).toBeCloseTo(5.57, 1);
  });

  it("reads nested compressed-tensors INT4 metadata", () => {
    const model = modelFromHub({
      id: "moonshotai/Kimi-K2.6",
      pipeline_tag: "image-text-to-text",
      tags: ["compressed-tensors"],
      safetensors: {
        total: 1_026_879_376_368,
        parameters: { I32: 1_014_686_023_680, BF16: 12_193_329_648 },
      },
      siblings: [
        { rfilename: "model-00001-of-00064.safetensors", size: 595.18e9 },
      ],
      config: {
        text_config: {
          quantization_config: {
            quant_method: "compressed-tensors",
            config_groups: {
              group_0: { weights: { num_bits: 4 } },
            },
          },
        },
      },
    });

    expect(model.paramsB).toBeCloseTo(1_026.88, 1);
    expect(model.availableQuants).toEqual(["q4"]);
    expect(model.sourceQuant).toBe("q4");
    expect(fit(model, { ...gpu8, memoryGb: 1_000 }).quant).toBe("q4");
  });

  it("does not invent a size from the repo name alone", () => {
    const model = modelFromHub({
      id: "Someone/Mystery-7B",
      pipeline_tag: "text-generation",
      tags: [],
    });
    expect(model.paramsB).toBe(0);
    expect(enoughFitInfo(model)).toBe(false);
  });

  it("reads MoE size from the repo id and does not treat Hub total as bytes", () => {
    expect(sizeFromId("Qwen/Qwen3.8-2.4T-A95B")).toEqual({
      totalB: 2400,
      activeB: 95,
    });
    const model = modelFromHub({
      id: "Qwen/Qwen3.8-2.4T-A95B",
      pipeline_tag: "text-generation",
      tags: ["qwen3_5_moe_text"],
      safetensors: {
        total: 2446182725504,
        parameters: { BF16: 2446182725504 },
      },
      cardData: { license: "other" },
    });
    expect(model.paramsB).toBeCloseTo(2446, 0);
    expect(model.activeParamsB).toBe(95);
    expect(model.gguf).toBe(false);
    expect(model.weightGb).toBeUndefined();
    expect(enoughFitInfo(model)).toBe(false);
  });

  it("maps function-calling tags to tools", () => {
    const model = modelFromHub({
      id: "Qwen/Qwen2.5-7B-Instruct",
      pipeline_tag: "text-generation",
      tags: ["function-calling"],
      safetensors: { total: 15.2e9, parameters: { BF16: 7.62e9 } },
      cardData: { license: "apache-2.0" },
    });
    expect(model.kind).toBe("llm");
    expect(model.jobs).toContain("chat");
    expect(model.jobs).toContain("tools");
  });
});
