export type Maker = "nvidia" | "amd" | "apple" | "cpu";
export type MemoryKind = "vram" | "unified" | "system";
export type Job =
  | "vision"
  | "detect"
  | "segment"
  | "coding"
  | "chat"
  | "reasoning"
  | "tools"
  | "embeddings"
  | "speech";
export type RunMode = "infer" | "train";
export type Quant = "fp16" | "q8" | "q6" | "q5" | "q4" | "q3" | "q2";
export type FitBand = "perfect" | "good" | "tight" | "no";
export type ModelKind = "llm" | "vlm" | "detector" | "segment" | "embed" | "asr";

export type Hardware = {
  id: string;
  name: string;
  maker: Maker;
  memoryGb: number;
  memoryKind: MemoryKind;
  bandwidthGBs: number;
};

export type Architecture = {
  nLayers: number;
  nKvHeads: number;
  headDim: number;
};

export type Model = {
  id: string;
  name: string;
  paramsB: number;
  /** MoE active params when smaller than paramsB (A95B). KV uses this. */
  activeParamsB?: number;
  kind: ModelKind;
  jobs: Job[];
  license: string;
  gguf: boolean;
  /** Quantizations explicitly present in the selected Hub repo. */
  availableQuants?: Quant[];
  /**
   * Quantization used by weightGb. Null means the repo is compressed but does
   * not declare a precise quantization.
   */
  sourceQuant?: Quant | null;
  /** Hugging Face repo, org/name */
  hf?: string;
  arch?: Architecture;
  /**
   * On-disk FP16/BF16 weight size when known (GB). Used for detectors and
   * as a check against paramsB * 2 for dense LLMs.
   */
  weightGb?: number;
};

export type FitOptions = {
  mode?: RunMode;
  context?: number;
  /** Prefer this quant if it fits; otherwise pick the best that does. */
  quant?: Quant;
};

export type FitBreakdown = {
  weightsGb: number;
  kvCacheGb: number;
  overheadGb: number;
  extraGb: number;
  totalGb: number;
  availableGb: number;
  ratio: number;
};

export type FitResult = {
  band: FitBand;
  gb: number;
  quant: Quant | null;
  note: string;
  breakdown: FitBreakdown;
  tokensPerSec: number | null;
  estimate: true;
};

export type RankedFit = FitResult & {
  model: Model;
};

export type RankedHardware = FitResult & {
  hardware: Hardware;
};

export type RankOptions = FitOptions & {
  job?: Job | null;
  query?: string;
  /** Hide rows with band "no" (default true for the table). */
  hideNo?: boolean;
};

export type HubConfig = {
  architectures?: string[];
  model_type?: string;
  num_hidden_layers?: number;
  n_layer?: number;
  num_key_value_heads?: number;
  num_attention_heads?: number;
  n_head?: number;
  hidden_size?: number;
  n_embd?: number;
  head_dim?: number;
  torch_dtype?: string;
  vocab_size?: number;
  quantization_config?: {
    bits?: number;
    quant_method?: string;
  };
  text_config?: HubConfig;
};

export type HubCard = {
  id: string;
  pipeline_tag?: string | null;
  library_name?: string | null;
  gated?: boolean | string;
  safetensors?: {
    total?: number;
    parameters?: Record<string, number>;
  } | null;
  siblings?: { rfilename: string; size?: number }[];
  cardData?: { license?: string; tags?: string[] };
  tags?: string[];
  config?: HubConfig;
};
