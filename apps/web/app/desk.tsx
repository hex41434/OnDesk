"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  findHardware,
  fit,
  gpus,
  models,
  parseHfRepo,
  rank,
  type Hardware,
  type Job,
  type Model,
  type RankedFit,
  type RunMode,
} from "@ondesk/core";
import { jsonAuthHeaders } from "../lib/browser-key";

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

function sameModel(a: Model, b: Model): boolean {
  return a.id === b.id || (!!a.hf && a.hf === b.hf);
}

export function Desk() {
  const [hwQuery, setHwQuery] = useState("RTX 4060 8GB");
  const [picked, setPicked] = useState<Hardware>(
    () => gpus.find((g) => g.id === "rtx-4060") ?? gpus[0]!,
  );
  const [openSuggest, setOpenSuggest] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [job, setJob] = useState<Job | null>(null);
  const [mode, setMode] = useState<RunMode>("infer");
  const [hfInput, setHfInput] = useState("");
  const [pastedModel, setPastedModel] = useState<Model | null>(null);
  const [hfError, setHfError] = useState<string | null>(null);
  const [hfLoading, setHfLoading] = useState(false);
  const [showNo, setShowNo] = useState(false);
  const [hits, setHits] = useState<
    { id: string; pipeline_tag: string | null; downloads: number | null }[]
  >([]);
  const [searchVia, setSearchVia] = useState<"gemini" | "hub" | null>(null);
  const [searchHint, setSearchHint] = useState<string | null>(null);
  const [smartHw, setSmartHw] = useState<Hardware[] | null>(null);
  const [hwVia, setHwVia] = useState<"gemini" | "local" | null>(null);
  const hwBox = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const localHw = useMemo(
    () => (hwQuery.trim() ? findHardware(hwQuery, gpus) : gpus.slice()),
    [hwQuery],
  );
  const suggestions = smartHw ?? localHw;

  const pasted = pastedModel
    ? { model: pastedModel, result: fit(pastedModel, picked, { mode }) }
    : null;

  const rows = useMemo(() => {
    const catalog = rank(models, picked, {
      job,
      mode,
      hideNo: !showNo,
    });
    if (!pasted) return catalog.slice(0, 20);
    const head: RankedFit = { ...pasted.result, model: pasted.model };
    const rest = catalog.filter((r) => !sameModel(r.model, pasted.model));
    return [head, ...rest].slice(0, 20);
  }, [picked, job, mode, showNo, pasted]);

  function closeHw() {
    setOpenSuggest(false);
    setHwQuery(picked.name);
    setActiveIndex(0);
    setSmartHw(null);
    setHwVia(null);
  }

  function pickHw(hw: Hardware) {
    setPicked(hw);
    setHwQuery(hw.name);
    setOpenSuggest(false);
    setActiveIndex(0);
    setSmartHw(null);
    setHwVia(null);
  }

  function openHw() {
    setOpenSuggest(true);
    const i = suggestions.findIndex((h) => h.id === picked.id);
    setActiveIndex(i >= 0 ? i : 0);
  }

  useEffect(() => {
    if (!openSuggest) return;
    function onDoc(e: MouseEvent) {
      if (!hwBox.current?.contains(e.target as Node)) closeHw();
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
    // closeHw reads picked; re-bind when the picker opens or the SKU changes
  }, [openSuggest, picked]);

  useEffect(() => {
    if (activeIndex >= suggestions.length) {
      setActiveIndex(Math.max(0, suggestions.length - 1));
    }
  }, [suggestions, activeIndex]);

  useEffect(() => {
    if (!openSuggest) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-hw-index="${activeIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, openSuggest]);

  useEffect(() => {
    if (!openSuggest) return;
    const q = hwQuery.trim();
    if (q.length < 2 || q === picked.name) {
      setSmartHw(null);
      setHwVia(null);
      return;
    }
    const t = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/search-hardware", {
          method: "POST",
          headers: jsonAuthHeaders(),
          body: JSON.stringify({ query: q }),
        });
        const body = (await res.json()) as {
          hits?: Hardware[];
          via?: "gemini" | "local";
        };
        if (!res.ok || !body.hits?.length) return;
        setSmartHw(body.hits);
        setHwVia(body.via ?? "local");
        setActiveIndex(0);
      } catch {
        // keep substring list
      }
    }, 450);
    return () => window.clearTimeout(t);
  }, [hwQuery, openSuggest, picked.name]);

  async function scoreRepo(id: string) {
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
      setHfInput(id);
      setHits([]);
      setJob(null);
    } catch {
      setHfError("Network error talking to Hugging Face.");
      setPastedModel(null);
    } finally {
      setHfLoading(false);
    }
  }

  async function onModelQuery() {
    const asId = parseHfRepo(hfInput);
    if (asId) {
      await scoreRepo(asId);
      return;
    }
    const query = hfInput.trim();
    if (query.length < 2) {
      setHfError("Type a name (qwen 2.5 code) or paste org/name.");
      return;
    }
    setHfLoading(true);
    setHfError(null);
    setHits([]);
    try {
      const res = await fetch("/api/search-models", {
        method: "POST",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ query }),
      });
      const body = (await res.json()) as {
        hits?: { id: string; pipeline_tag: string | null; downloads: number | null }[];
        search?: string;
        via?: "gemini" | "hub";
        error?: string;
      };
      if (!res.ok) {
        setHfError(body.error ?? "Search failed.");
        return;
      }
      setHits(body.hits ?? []);
      setSearchVia(body.via ?? "hub");
      setSearchHint(body.search ?? query);
      if (!body.hits?.length) {
        setHfError("No Hub repos for that. Try a more specific name.");
      }
    } catch {
      setHfError("Network error while searching.");
    } finally {
      setHfLoading(false);
    }
  }

  return (
    <>
      <h1 className="lede">What fits on the desk. Not in the cloud.</h1>
      <p className="sub">
        Pick a GPU, or search a model. Hub links are real. Fit numbers are
        ours, not Gemini. Cite{" "}
        <a href="https://github.com/AlexsJones/llmfit">llmfit</a> as prior art
        for local scoring; this page answers the question before you buy.
      </p>

      <div className="panel">
        <div className="row two">
          <div className="hw-picker" ref={hwBox}>
            <label className="field" htmlFor="hw">
              Hardware
            </label>
            <div className="hw-input-wrap">
              <input
                id="hw"
                type="text"
                role="combobox"
                aria-expanded={openSuggest}
                aria-controls="hw-list"
                aria-activedescendant={
                  openSuggest ? `hw-opt-${suggestions[activeIndex]?.id ?? ""}` : undefined
                }
                value={hwQuery}
                autoComplete="off"
                onChange={(e) => {
                  setHwQuery(e.target.value);
                  setOpenSuggest(true);
                  setActiveIndex(0);
                }}
                onFocus={() => openHw()}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    closeHw();
                    (e.target as HTMLInputElement).blur();
                    return;
                  }
                  if (!openSuggest && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
                    e.preventDefault();
                    openHw();
                    return;
                  }
                  if (!openSuggest || suggestions.length === 0) return;
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIndex((i) => Math.max(i - 1, 0));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const hw = suggestions[activeIndex];
                    if (hw) pickHw(hw);
                  }
                }}
              />
              {openSuggest && (
                <button
                  type="button"
                  className="hw-close"
                  aria-label="Close hardware list"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    closeHw();
                  }}
                >
                  ×
                </button>
              )}
            </div>
            {!openSuggest && (
              <p className="hw-spec picked">
                {picked.memoryGb} GB {picked.memoryKind} · {picked.bandwidthGBs}{" "}
                GB/s
              </p>
            )}
            {openSuggest && hwVia === "gemini" && (
              <p className="hint">smart hardware search</p>
            )}
            {openSuggest && suggestions.length > 0 && (
              <ul
                id="hw-list"
                className="suggest"
                role="listbox"
                ref={listRef}
              >
                {suggestions.map((hw, i) => (
                  <li key={hw.id} role="presentation">
                    <button
                      type="button"
                      id={`hw-opt-${hw.id}`}
                      role="option"
                      aria-selected={i === activeIndex}
                      data-hw-index={i}
                      className={
                        i === activeIndex
                          ? "hw-option on"
                          : "hw-option"
                      }
                      onMouseEnter={() => setActiveIndex(i)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickHw(hw)}
                    >
                      <span className="hw-name">{hw.name}</span>
                      <span className="hw-spec">
                        {hw.memoryGb} GB {hw.memoryKind} · {hw.bandwidthGBs} GB/s
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label className="field" htmlFor="hf">
              Search a model
            </label>
            <input
              id="hf"
              type="text"
              placeholder="qwen 2.5 code — or paste org/name"
              value={hfInput}
              onChange={(e) => setHfInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void onModelQuery();
              }}
            />
            <p className="hint">
              <button
                type="button"
                className="chip"
                onClick={() => void onModelQuery()}
              >
                {hfLoading ? "Searching…" : "Search Hub"}
              </button>
              {searchVia && (
                <span className="est">
                  {" "}
                  via {searchVia}
                  {searchHint ? ` · ${searchHint}` : ""}
                </span>
              )}
              {hfError && <span className="error"> {hfError}</span>}
            </p>
            {hits.length > 0 && (
              <ul className="search-hits">
                {hits.map((hit) => (
                  <li key={hit.id}>
                    <button type="button" onClick={() => void scoreRepo(hit.id)}>
                      <span className="hw-name">{hit.id}</span>
                      <span className="hw-spec">
                        {hit.pipeline_tag ?? "model"}
                        {hit.downloads != null
                          ? ` · ${hit.downloads.toLocaleString()} downloads`
                          : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="table-bar">
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
          <span className="chip-gap" />
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
          <button
            type="button"
            className={showNo ? "chip on" : "chip"}
            onClick={() => setShowNo((v) => !v)}
          >
            {showNo ? "hide no" : "show no"}
          </button>
        </div>
      </div>

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
            const isPasted = pasted ? sameModel(row.model, pasted.model) : false;
            return (
              <tr key={row.model.id} className={isPasted ? "pasted" : undefined}>
                <td>
                  {isPasted && (
                    <span className="ref" title="From the Hugging Face link you pasted">
                      *{" "}
                    </span>
                  )}
                  {row.model.name}
                </td>
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
          {pasted && (
            <tr className="math-row">
              <td colSpan={6}>
                weights {pasted.result.breakdown.weightsGb} GB · KV{" "}
                {pasted.result.breakdown.kvCacheGb} GB · overhead{" "}
                {pasted.result.breakdown.overheadGb} GB · extra{" "}
                {pasted.result.breakdown.extraGb} GB · total {pasted.result.gb}{" "}
                GB / {pasted.result.breakdown.availableGb} GB available
                <span className="hint"> {pasted.result.note}</span>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="hint">Nothing in the catalog fits this filter.</p>
      )}
    </>
  );
}
