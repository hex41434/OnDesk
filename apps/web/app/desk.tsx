"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  companionFor,
  companionLine,
  findHardware,
  gpus,
  models,
  rank,
  type Hardware,
  type Job,
  type Model,
  type Quant,
  type RankedFit,
  type RunMode,
} from "@ondesk/core";
import { jsonAuthHeaders } from "../lib/browser-key";
import { HfLogo } from "../components/hf-logo";
import { quantLabel, sizeLabel } from "../lib/labels";
import { SortTh, type SortDir } from "../components/sort-th";
import { SpeedBar } from "../components/speed-bar";
import { ModelTab } from "./model-tab";

const JOB_MULTIMODAL: { id: Job; label: string }[] = [
  { id: "vision", label: "multimodal" },
];

const JOB_CV: { id: Job; label: string }[] = [
  { id: "detect", label: "detect" },
  { id: "segment", label: "segment" },
];

const JOB_LANG: { id: Job; label: string }[] = [
  { id: "coding", label: "coding" },
  { id: "chat", label: "chat" },
  { id: "reasoning", label: "reasoning" },
  { id: "tools", label: "tool calling" },
  { id: "embeddings", label: "embeddings" },
  { id: "speech", label: "speech" },
];

type SortKey = "name" | "params" | "gb" | "quant" | "fit" | "toks";
type DeskTab = "hw" | "model";

const BAND_SORT = { perfect: 0, good: 1, tight: 2, no: 3 } as const;
const QUANT_SORT: Record<Quant, number> = {
  fp16: 0,
  q8: 1,
  q6: 2,
  q5: 3,
  q4: 4,
  q3: 5,
  q2: 6,
};
const PAGE_SIZE = 32;

function cmpText(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function sortRows(rows: RankedFit[], key: SortKey, dir: SortDir): RankedFit[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (key === "fit") {
      const band = (BAND_SORT[a.band] - BAND_SORT[b.band]) * mul;
      if (band !== 0) return band;
      const size = b.model.paramsB - a.model.paramsB;
      if (size !== 0) return size;
      return cmpText(a.model.id, b.model.id);
    }
    let cmp = 0;
    if (key === "name") cmp = cmpText(a.model.name, b.model.name);
    else if (key === "params") cmp = a.model.paramsB - b.model.paramsB;
    else if (key === "gb") cmp = a.gb - b.gb;
    else if (key === "quant") {
      cmp = (a.quant ? QUANT_SORT[a.quant] : 99) - (b.quant ? QUANT_SORT[b.quant] : 99);
    } else if (key === "toks") cmp = (a.tokensPerSec ?? -1) - (b.tokensPerSec ?? -1);
    if (cmp === 0) cmp = cmpText(a.model.id, b.model.id);
    return cmp * mul;
  });
}

function hfUrl(id: string): string {
  return `https://huggingface.co/${id}`;
}

function nameHit(model: Model, query: string): boolean {
  const q = query.toLowerCase();
  return (
    model.name.toLowerCase().includes(q) ||
    model.id.toLowerCase().includes(q) ||
    (model.hf?.toLowerCase().includes(q) ?? false)
  );
}

export function Desk() {
  const [hwQuery, setHwQuery] = useState("RTX 4060 8GB");
  const [picked, setPicked] = useState<Hardware>(
    () => gpus.find((g) => g.id === "rtx-4060") ?? gpus[0]!,
  );
  const [openSuggest, setOpenSuggest] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [tab, setTab] = useState<DeskTab>("hw");
  const [job, setJob] = useState<Job | null>(null);
  const [mode, setMode] = useState<RunMode>("infer");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [nameFilter, setNameFilter] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [smartHw, setSmartHw] = useState<Hardware[] | null>(null);
  const [hwVia, setHwVia] = useState<"gemini" | "local" | null>(null);
  const hwBox = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const localHw = useMemo(
    () => (hwQuery.trim() ? findHardware(hwQuery, gpus) : gpus.slice()),
    [hwQuery],
  );
  const suggestions = smartHw ?? localHw;

  const pair = useMemo(() => companionFor(picked), [picked]);

  const rows = useMemo(() => {
    const catalog = rank(models, picked, { job, mode });
    const ordered = sortKey ? sortRows(catalog, sortKey, sortDir) : catalog;
    const q = nameFilter.trim();
    return q ? ordered.filter((r) => nameHit(r.model, q)) : ordered;
  }, [picked, job, mode, sortKey, sortDir, nameFilter]);
  const visibleRows = rows.slice(0, visibleCount);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [picked, job, mode, sortKey, sortDir, nameFilter]);

  function onSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "name" || key === "fit" ? "asc" : "desc");
  }

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
    const controller = new AbortController();
    let cancelled = false;
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
          signal: controller.signal,
        });
        const body = (await res.json()) as {
          hits?: Hardware[];
          via?: "gemini" | "local";
        };
        if (cancelled || !res.ok || !body.hits?.length) return;
        setSmartHw(body.hits);
        setHwVia(body.via ?? "local");
        setActiveIndex(0);
      } catch {
        // keep substring list
      }
    }, 450);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(t);
    };
  }, [hwQuery, openSuggest, picked.name]);

  return (
    <>
      <h1 className="lede">What fits on the desk. Not in the cloud.</h1>
      <p className="sub">
        Pick a GPU, or open Model and search a repo. Fit numbers are ours, not
        Gemini. This page answers the question before you buy.
      </p>
      <p className="hf-badge">
        <HfLogo size={18} />
        <span>
          Catalog &amp; repo links via{" "}
          <a href="https://huggingface.co/models" target="_blank" rel="noreferrer">
            Hugging Face Hub
          </a>
        </span>
      </p>

      <div className="tabs" role="tablist" aria-label="Fit mode">
        <button
          type="button"
          role="tab"
          id="tab-hw"
          aria-selected={tab === "hw"}
          aria-controls="panel-hw"
          className={tab === "hw" ? "tab on" : "tab"}
          onClick={() => setTab("hw")}
        >
          Hardware
        </button>
        <button
          type="button"
          role="tab"
          id="tab-model"
          aria-selected={tab === "model"}
          aria-controls="panel-model"
          className={tab === "model" ? "tab on" : "tab"}
          onClick={() => setTab("model")}
        >
          Model
        </button>
      </div>

      <div
        id="panel-hw"
        role="tabpanel"
        aria-labelledby="tab-hw"
        hidden={tab !== "hw"}
      >
      <div className="panel">
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
              <>
                <p className="hw-spec picked">
                  {picked.memoryGb} GB {picked.memoryKind} · {picked.bandwidthGBs}{" "}
                  GB/s
                </p>
                <p className="hw-spec companion">{companionLine(pair)}</p>
                <p className="hint pair-note">{pair.note}</p>
              </>
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
      </div>

      <div className="table-bar">
        <div className="chips chips-jobs">
          <button
            type="button"
            className={job === null ? "chip on" : "chip"}
            onClick={() => setJob(null)}
          >
            any
          </button>
          <span className="chip-split" aria-hidden="true" />
          {JOB_MULTIMODAL.map((j) => (
            <button
              key={j.id}
              type="button"
              className={job === j.id ? "chip on" : "chip"}
              onClick={() => setJob(j.id)}
            >
              {j.label}
            </button>
          ))}
          <span className="chip-split" aria-hidden="true" />
          {JOB_LANG.map((j) => (
            <button
              key={j.id}
              type="button"
              className={job === j.id ? "chip on" : "chip"}
              onClick={() => setJob(j.id)}
            >
              {j.label}
            </button>
          ))}
          <span className="chip-spacer" aria-hidden="true" />
          {JOB_CV.map((j) => (
            <button
              key={j.id}
              type="button"
              className={job === j.id ? "chip on" : "chip"}
              onClick={() => setJob(j.id)}
            >
              {j.label}
            </button>
          ))}
        </div>
        <div className="chips chips-mode">
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
        <label className="field table-filter-label" htmlFor="name-filter">
          Filter names
        </label>
        <input
          id="name-filter"
          type="search"
          className="table-filter"
          placeholder="qwen, llama, mistral…"
          value={nameFilter}
          autoComplete="off"
          onChange={(e) => setNameFilter(e.target.value)}
        />
      </div>

      <table className="results">
        <thead>
          <tr>
            <SortTh
              id="name"
              label="Name"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              id="params"
              label="Params"
              title="Parameter count (7B), not gigabytes"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              id="gb"
              label="GB"
              title="Working set on this SKU (weights + KV + overhead)"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              id="quant"
              label="Quant"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              id="fit"
              label="Fit"
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <SortTh
              id="toks"
              label="tok/s"
              title="Estimate: memory bandwidth ÷ working set × efficiency. Not a measured bench."
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={onSort}
            />
            <th
              className="speed-th"
              title="Color bar of the same estimate. Red crawl, amber usable, green snappy. Full bar ≈ 90 tok/s."
            >
              Speed
            </th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => {
            const id = row.model.hf ?? row.model.id;
            const toks = row.tokensPerSec;
            return (
              <tr key={row.model.id} className={`band-row ${row.band}`}>
                <td>
                  <a
                    href={hfUrl(id)}
                    target="_blank"
                    rel="noreferrer"
                    className="model-link"
                  >
                    {row.model.name}
                  </a>
                </td>
                <td>{sizeLabel(row.model.paramsB)}</td>
                <td>{row.gb}</td>
                <td>{quantLabel(row.quant)}</td>
                <td>
                  <span className={`band ${row.band}`}>{row.band}</span>
                </td>
                <td className="est">
                  {toks == null ? "—" : `est. ${Math.round(toks)}`}
                </td>
                <td className="speed-cell">
                  <SpeedBar toks={toks} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {visibleCount < rows.length && (
        <p className="hint">
          Showing {visibleRows.length} of {rows.length}.{" "}
          <button
            type="button"
            className="chip"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
          >
            Show {Math.min(PAGE_SIZE, rows.length - visibleCount)} more
          </button>
        </p>
      )}
      {rows.length === 0 && (
        <p className="hint">Nothing in the catalog fits this filter.</p>
      )}
      </div>

      <div
        id="panel-model"
        role="tabpanel"
        aria-labelledby="tab-model"
        hidden={tab !== "model"}
      >
        <ModelTab />
      </div>
    </>
  );
}
