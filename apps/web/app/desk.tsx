"use client";

import {
  findHardware,
  fit,
  gpus,
  matchIntent,
  models,
  parseHfRepo,
  rank,
  type Hardware,
  type Job,
  type Model,
  type RunMode,
} from "@ondesk/core";
import { useMemo, useState } from "react";

const JOBS: { id: Job | null; label: string }[] = [
  { id: null, label: "any" },
  { id: "vision", label: "vision" },
  { id: "detect", label: "detect" },
  { id: "segment", label: "segment" },
  { id: "coding", label: "coding" },
  { id: "chat", label: "chat" },
  { id: "reasoning", label: "reasoning" },
  { id: "embeddings", label: "embeddings" },
  { id: "speech", label: "speech" },
];

function hfUrl(id: string): string {
  return `https://huggingface.co/${id}`;
}

function sizeLabel(paramsB: number): string {
  if (paramsB >= 100) return `${paramsB.toFixed(0)}B`;
  if (paramsB >= 1) return `${paramsB.toFixed(paramsB >= 10 ? 0 : 1)}B`;
  if (paramsB >= 0.1) return `${Math.round(paramsB * 1000)}M`;
  return `${Math.round(paramsB * 1e9).toLocaleString()} params`;
}

export function Desk() {
  const [hwQuery, setHwQuery] = useState("RTX 4060 8GB");
  const [picked, setPicked] = useState<Hardware>(
    () => gpus.find((g) => g.id === "rtx-4060") ?? gpus[0]!,
  );
  const [openSuggest, setOpenSuggest] = useState(false);
  const [job, setJob] = useState<Job | null>("vision");
  const [mode, setMode] = useState<RunMode>("infer");
  const [intent, setIntent] = useState("");
  const [hfInput, setHfInput] = useState("");
  const [pastedModel, setPastedModel] = useState<Model | null>(null);
  const [hfError, setHfError] = useState<string | null>(null);
  const [hfLoading, setHfLoading] = useState(false);
  const [showNo, setShowNo] = useState(false);

  const suggestions = useMemo(
    () => findHardware(hwQuery, gpus).slice(0, 8),
    [hwQuery],
  );

  const rows = useMemo(() => {
    const mapped = matchIntent(intent);
    return rank(models, picked, {
      job: job ?? (mapped.jobs[0] ?? null),
      query: !job && intent ? intent : undefined,
      mode,
      hideNo: !showNo,
    }).slice(0, 20);
  }, [picked, job, intent, mode, showNo]);

  const pasted = pastedModel
    ? { model: pastedModel, result: fit(pastedModel, picked, { mode }) }
    : null;

  async function onPaste() {
    const id = parseHfRepo(hfInput);
    if (!id) {
      setHfError("Need org/name or a huggingface.co URL.");
      setPastedModel(null);
      return;
    }
    setHfLoading(true);
    setHfError(null);
    try {
      const res = await fetch(`/api/hf?id=${encodeURIComponent(id)}`);
      const body = (await res.json()) as { model?: Model; error?: string };
      if (!res.ok || !body.model) {
        setHfError(body.error ?? "Could not fetch that repo.");
        setPastedModel(null);
        return;
      }
      setPastedModel(body.model);
    } catch {
      setHfError("Network error talking to Hugging Face.");
      setPastedModel(null);
    } finally {
      setHfLoading(false);
    }
  }

  return (
    <>
      <h1 className="lede">What fits on the desk. Not in the cloud.</h1>
      <p className="sub">
        Pick a GPU, or paste a Hub repo. Numbers are a deterministic estimate —
        not a benchmark. Cite{" "}
        <a href="https://github.com/AlexsJones/llmfit">llmfit</a> as prior art
        for local scoring; this page answers the question before you buy.
      </p>

      <div className="panel">
        <div className="row two">
          <div>
            <label className="field" htmlFor="hw">
              Hardware
            </label>
            <input
              id="hw"
              type="search"
              value={hwQuery}
              autoComplete="off"
              onChange={(e) => {
                setHwQuery(e.target.value);
                setOpenSuggest(true);
              }}
              onFocus={() => setOpenSuggest(true)}
            />
            {openSuggest && suggestions.length > 0 && (
              <ul className="suggest">
                {suggestions.map((hw) => (
                  <li key={hw.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPicked(hw);
                        setHwQuery(hw.name);
                        setOpenSuggest(false);
                      }}
                    >
                      {hw.name}
                      <span className="est">
                        {" "}
                        · {hw.memoryGb} GB {hw.memoryKind} · {hw.bandwidthGBs}{" "}
                        GB/s
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label className="field" htmlFor="hf">
              Or paste a Hugging Face repo
            </label>
            <input
              id="hf"
              type="text"
              placeholder="Qwen/Qwen2.5-VL-7B-Instruct"
              value={hfInput}
              onChange={(e) => setHfInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onPaste();
              }}
            />
            <p className="hint">
              <button type="button" className="chip" onClick={() => void onPaste()}>
                {hfLoading ? "Fetching…" : "Score this model"}
              </button>
              {hfError && <span className="error"> {hfError}</span>}
            </p>
          </div>
        </div>
      </div>

      <div className="panel">
        <label className="field">Job</label>
        <div className="chips">
          {JOBS.map((j) => (
            <button
              key={String(j.id)}
              type="button"
              className={job === j.id ? "chip on" : "chip"}
              onClick={() => setJob(j.id)}
            >
              {j.label}
            </button>
          ))}
          <button
            type="button"
            className={mode === "infer" ? "chip on" : "chip"}
            onClick={() => setMode("infer")}
          >
            infer
          </button>
          <button
            type="button"
            className={mode === "train" ? "chip on" : "chip"}
            onClick={() => setMode("train")}
          >
            train
          </button>
        </div>
        <p className="hint">
          <label className="field" htmlFor="intent">
            Intent (no key — keyword map)
          </label>
          <input
            id="intent"
            type="search"
            placeholder="vision model for a mac mini"
            value={intent}
            onChange={(e) => {
              setIntent(e.target.value);
              const mapped = matchIntent(e.target.value);
              if (mapped.jobs[0]) setJob(mapped.jobs[0]);
              if (mapped.mode === "train") setMode("train");
            }}
          />
        </p>
      </div>

      {pasted && (
        <section className="card" style={{ marginBottom: "1rem" }}>
          <p className="meta">This model · {picked.name}</p>
          <h2>
            <a href={hfUrl(pasted.model.hf ?? pasted.model.id)}>
              {pasted.model.name}
            </a>
          </h2>
          <p>
            <span className={`band ${pasted.result.band}`}>
              {pasted.result.band}
            </span>
            {pasted.result.quant && <> · {pasted.result.quant}</>}
            {" · "}
            {sizeLabel(pasted.model.paramsB)}
            {pasted.result.tokensPerSec != null && (
              <>
                {" · "}
                <span className="est">
                  est. {Math.round(pasted.result.tokensPerSec)} tok/s
                </span>
              </>
            )}
          </p>
          <dl className="math">
            <dt>weights</dt>
            <dd>{pasted.result.breakdown.weightsGb} GB</dd>
            <dt>KV</dt>
            <dd>{pasted.result.breakdown.kvCacheGb} GB</dd>
            <dt>overhead</dt>
            <dd>{pasted.result.breakdown.overheadGb} GB</dd>
            <dt>extra</dt>
            <dd>{pasted.result.breakdown.extraGb} GB</dd>
            <dt>total</dt>
            <dd>{pasted.result.gb} GB</dd>
            <dt>available</dt>
            <dd>{pasted.result.breakdown.availableGb} GB</dd>
          </dl>
          <p className="hint">{pasted.result.note}</p>
        </section>
      )}

      <p className="meta">
        {picked.name}
        {job ? ` · ${job}` : ""} · {mode} · {rows.length} shown
        {" · "}
        <button
          type="button"
          className="chip"
          onClick={() => setShowNo((v) => !v)}
        >
          {showNo ? "hide no" : "show no"}
        </button>
      </p>

      <table className="results">
        <thead>
          <tr>
            <th>Name</th>
            <th>Size</th>
            <th>Quant</th>
            <th>Fit</th>
            <th>tok/s</th>
            <th>Hub</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const id = row.model.hf ?? row.model.id;
            return (
              <tr key={row.model.id}>
                <td>{row.model.name}</td>
                <td>{sizeLabel(row.model.paramsB)}</td>
                <td>{row.quant ?? "—"}</td>
                <td>
                  <span className={`band ${row.band}`}>{row.band}</span>
                </td>
                <td className="est">
                  {row.tokensPerSec == null
                    ? "—"
                    : `est. ${Math.round(row.tokensPerSec)}`}
                </td>
                <td>
                  <a href={hfUrl(id)} target="_blank" rel="noreferrer">
                    {id}
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="hint">Nothing in the catalog fits this filter.</p>
      )}
    </>
  );
}
