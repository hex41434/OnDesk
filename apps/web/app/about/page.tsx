export default function AboutPage() {
  return (
    <article className="prose">
      <h1>How the numbers work</h1>
      <p>
        OnDesk is not a benchmark lab. The table is a deterministic function of
        the catalog and the SKU you picked. Same inputs, same GB, same band,
        same estimated tok/s.
      </p>

      <h2>Memory</h2>
      <p>
        Weights ≈ parameters × bits-per-weight / 8. The quant ladder uses
        GGUF-like bit widths (Q4_K_M ≈ 4.83 bpw). Add a small overhead (0.35 GB
        + 3%), then a KV cache at 8k context unless you change it:{" "}
        <code>2 × layers × KV heads × head dim × context × 2 bytes</code>.
        Vision towers get a coarse extra. Detectors skip KV.
      </p>
      <p>
        For detectors, segmentation, speech, and embedding models, activation
        memory is deliberately a rough allowance. Input resolution, batch size,
        framework workspace, and runtime-specific optimizations are not modeled.
        YOLO uses an 800×800 input assumption; inference assumes batch 1.
      </p>

      <h2>Available RAM</h2>
      <p>
        Discrete GPU: the VRAM on the card. Apple unified: 70% of the chip
        memory (the rest is the OS). CPU-only: 75% of system RAM. Training is
        modeled as about 6× FP16 weights (Adam + activations). LoRA is not
        modeled yet.
      </p>
      <p>
        Training results are capacity estimates, not configuration advice. This
        matters especially for vision training, where image size, batch size,
        optimizer, and augmentation can dominate memory use. YOLO training is
        estimated at batch 16 for 100 epochs. Epochs affect duration rather than
        peak memory; total training time is not estimated yet.
      </p>

      <h2>Fit bands</h2>
      <p>
        Ratio = used / available. ≤ 50% perfect, ≤ 75% good, ≤ 90% tight,
        otherwise no. “Best quant” is the highest quality on that ladder that
        is not <code>no</code>. Tight still counts as a fit.
      </p>

      <h2>Speed</h2>
      <p>
        Estimated tok/s ≈ memory bandwidth ÷ working set × an efficiency factor
        (0.35 NVIDIA/AMD, 0.22 Apple, 0.08 CPU). Always labeled{" "}
        <strong>est.</strong> Never a measured bench. Detectors and embeddings
        show a dash.
      </p>

      <h2>What this is not</h2>
      <p>
        Not Ollama. Not a scrape of every Hub repo. Not a measured bench. Host
        hardware is read from this machine (chip + RAM), then matched to the
        catalog. Same SKU, same numbers.
      </p>
    </article>
  );
}
