"use client";

import { useEffect, useMemo, useState } from "react";
import {
  enoughFitInfo,
  fit,
  gpus,
  models,
  parseHfRepo,
  rankHardware,
  type Hardware,
  type Model,
  type Quant,
  type RankedHardware,
  type RunMode,
} from "@ondesk/core";
import { jsonAuthHeaders } from "../lib/browser-key";
import { JOB_LABEL } from "../lib/job-labels";
import { quantLabel, sizeLabel } from "../lib/labels";
import { HfLogo } from "../components/hf-logo";
import { SortTh, type SortDir } from "../components/sort-th";
import { SpeedBar } from "../components/speed-bar";

type HubHit = {
  id: string;
  pipeline_tag: string | null;
  downloads: number | null;
};

type HwSortKey = "name" | "mem" | "gb" | "quant" | "fit" | "toks";

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

function nameHit(model: Model, query: string): boolean {
  const q = query.toLowerCase();
  return (
    model.name.toLowerCase().includes(q) ||
    model.id.toLowerCase().includes(q) ||
    (model.hf?.toLowerCase().includes(q) ?? false)
  );
}

const PROBE: Hardware = {
  id: "probe",
  name: "probe",
  maker: "nvidia",
  memoryGb: 1_000_000,
  memoryKind: "vram",
  bandwidthGBs: 10_000,
};

function minNeed(model: Model, mode: RunMode, ranked: RankedHardware[]) {
  if (!enoughFitInfo(model)) {
    return { ok: false as const };
  }
  const low: Quant =
    mode === "train"
      ? "fp16"
      : model.availableQuants?.at(-1) ??
        (model.sourceQuant === null
          ? "fp16"
          : model.sourceQuant ?? (model.gguf ? "q2" : "fp16"));
  const full = fit(model, PROBE, { mode, quant: low });
  const ok = ranked.filter((r) => r.band !== "no");
  const smallest = ok.length
    ? ok.reduce((a, b) =>
        a.hardware.memoryGb < b.hardware.memoryGb ? a : b,
      )
    : null;
  return {
    ok: true as const,
    loadGb: Math.max(1, Math.ceil(full.gb)),
    quant: full.quant,
    smallest,
  };
}

function hfUrl(id: string): string {
  return `https://huggingface.co/${id}`;
}

function HfCardLink({ id }: { id: string }) {
  return (
    <a
      href={hfUrl(id)}
      target="_blank"
      rel="noreferrer"
      className="model-link min-req-hf"
    >
      <HfLogo size={14} className="hf-mark" />
      link to model page
    </a>
  );
}

function hwHit(hw: Hardware, query: string): boolean {
  const q = query.toLowerCase();
  return (
    hw.name.toLowerCase().includes(q) ||
    hw.id.toLowerCase().includes(q) ||
    hw.maker.toLowerCase().includes(q)
  );
}

function sortHw(
  rows: RankedHardware[],
  key: HwSortKey,
  dir: SortDir,
): RankedHardware[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    if (key === "fit") {
      const band = (BAND_SORT[a.band] - BAND_SORT[b.band]) * mul;
      if (band !== 0) return band;
      return ((b.tokensPerSec ?? -1) - (a.tokensPerSec ?? -1)) * mul;
    }
    let cmp = 0;
    if (key === "name") cmp = cmpText(a.hardware.name, b.hardware.name);
    else if (key === "mem") cmp = a.hardware.memoryGb - b.hardware.memoryGb;
    else if (key === "gb") cmp = a.gb - b.gb;
    else if (key === "quant") {
      cmp =
        (a.quant ? QUANT_SORT[a.quant] : 99) -
        (b.quant ? QUANT_SORT[b.quant] : 99);
    } else if (key === "toks") cmp = (a.tokensPerSec ?? -1) - (b.tokensPerSec ?? -1);
    if (cmp === 0) cmp = cmpText(a.hardware.id, b.hardware.id);
    return cmp * mul;
  });
}

export function ModelTab() {
  const [hfInput, setHfInput] = useState("");
  const [picked, setPicked] = useState<Model | null>(null);
  const [mode, setMode] = useState<RunMode>("infer");
  const [hfError, setHfError] = useState<string | null>(null);
  const [hfLoading, setHfLoading] = useState(false);
  const [hits, setHits] = useState<HubHit[]>([]);
  const [catalogHits, setCatalogHits] = useState<Model[]>([]);
  const [searchVia, setSearchVia] = useState<"gemini" | "hub" | null>(null);
  const [searchHint, setSearchHint] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<HwSortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [mine, setMine] = useState<Hardware | null>(null);
  const [hwFilter, setHwFilter] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    const hostname = window.location.hostname;
    if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) return;
    let gone = false;
    void fetch("/api/host-hardware")
      .then((res) => res.json() as Promise<{ hardware?: Hardware | null }>)
      .then((body) => {
        if (!gone && body.hardware) setMine(body.hardware);
      })
      .catch(() => {
        // catalog rank still works
      });
    return () => {
      gone = true;
    };
  }, []);

  const ranked = useMemo(() => {
    if (!picked) return [];
    const list = rankHardware(picked, gpus, { mode });
    if (!mine) return list;
    const i = list.findIndex((r) => r.hardware.id === mine.id);
    if (i >= 0) {
      const copy = list.slice();
      const [row] = copy.splice(i, 1);
      return [row!, ...copy];
    }
    return [{ ...fit(picked, mine, { mode }), hardware: mine }, ...list];
  }, [picked, mode, mine]);
  const sorted = sortKey ? sortHw(ranked, sortKey, sortDir) : ranked;
  const qHw = hwFilter.trim();
  const rows = qHw ? sorted.filter((r) => hwHit(r.hardware, qHw)) : sorted;
  const visibleRows = rows.slice(0, visibleCount);
  const need = picked ? minNeed(picked, mode, ranked) : null;
  const mathHw =
    mine ?? (need?.ok ? need.smallest?.hardware : undefined) ?? ranked[0]?.hardware;
  const math = picked && mathHw ? fit(picked, mathHw, { mode }) : null;
  const repoId = picked?.hf ?? picked?.id ?? null;

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [picked, mode, sortKey, sortDir, hwFilter]);

  function onSort(key: HwSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir(key === "name" || key === "fit" ? "asc" : "desc");
  }

  function pickCatalog(model: Model) {
    setPicked(model);
    setHfInput(model.hf ?? model.id);
    setHits([]);
    setCatalogHits([]);
    setHfError(null);
  }

  async function scoreRepo(id: string) {
    if (hfLoading) return;
    const local = models.find(
      (m) => m.hf?.toLowerCase() === id.toLowerCase(),
    );
    if (local) {
      pickCatalog(local);
      return;
    }
    setHfLoading(true);
    setHfError(null);
    try {
      const res = await fetch(`/api/hf?id=${encodeURIComponent(id)}`);
      const body = (await res.json()) as { model?: Model; error?: string };
      if (!res.ok || !body.model) {
        setHfError(body.error ?? "Could not fetch that repo.");
        setPicked(null);
        return;
      }
      setPicked(body.model);
      setHfInput(id);
      setHits([]);
      setCatalogHits([]);
    } catch {
      setHfError("Network error talking to Hugging Face.");
      setPicked(null);
    } finally {
      setHfLoading(false);
    }
  }

  async function onModelQuery() {
    if (hfLoading) return;
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
    const local = models.filter((m) => nameHit(m, query)).slice(0, 8);
    setCatalogHits(local);
    try {
      const res = await fetch("/api/search-models", {
        method: "POST",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({ query }),
      });
      const body = (await res.json()) as {
        hits?: HubHit[];
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
      if (!body.hits?.length && local.length === 0) {
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
      <div className="panel">
        <label className="field field-hf" htmlFor="hf">
          <HfLogo size={15} />
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
            disabled={hfLoading}
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
        {(catalogHits.length > 0 || hits.length > 0) && (
          <ul className="search-hits">
            {catalogHits.map((m) => (
              <li key={`cat-${m.id}`}>
                <button type="button" onClick={() => pickCatalog(m)}>
                  <span className="hw-name model-link-inline">
                    <HfLogo size={14} />
                    {m.hf ?? m.id}
                  </span>
                  <span className="hw-spec">
                    catalog · {sizeLabel(m.paramsB)}
                  </span>
                </button>
              </li>
            ))}
            {hits.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  disabled={hfLoading}
                  onClick={() => void scoreRepo(hit.id)}
                >
                  <span className="hw-name model-link-inline">
                    <HfLogo size={14} />
                    {hit.id}
                  </span>
                  <span className="hw-spec">
                    {hit.pipeline_tag ?? "model"}
                    {hit.downloads != null
                      ? ` · ${hit.downloads.toLocaleString("en-US")} downloads`
                      : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!picked && (
        <p className="hint">
          Search a model, then pick one. The table lists hardware that can run
          it.
        </p>
      )}

      {picked && (
        <>
          {need && !need.ok && (
            <p className="min-req">
              <span className="min-req-k">Minimum</span>
              <span className="min-req-v">no enough info</span>
              {repoId && <HfCardLink id={repoId} />}
            </p>
          )}
          {need && need.ok && (
            <p className="min-req">
              <span className="min-req-k">Minimum</span>
              <span className="min-req-v">
                ≥ {need.loadGb} GB
              </span>
              <span className="min-req-v">
                {need.quant ? quantLabel(need.quant) : "quant not declared"}
              </span>
              <span className="min-req-v">
                {need.smallest
                  ? need.smallest.hardware.name
                  : "no catalog card holds all experts"}
              </span>
              {repoId && <HfCardLink id={repoId} />}
            </p>
          )}
          {picked.jobs.length > 0 && (
            <div className="chips model-tags" aria-label="Model tags">
              {picked.jobs.map((j) => (
                <span key={j} className="chip tag">
                  {JOB_LABEL[j]}
                </span>
              ))}
            </div>
          )}
          {need?.ok && (
          <>
          <div className="table-bar">
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
            <label className="field table-filter-label" htmlFor="hw-filter">
              Filter hardware
            </label>
            <input
              id="hw-filter"
              type="search"
              className="table-filter"
              placeholder="4060, m4, 4090…"
              value={hwFilter}
              autoComplete="off"
              onChange={(e) => setHwFilter(e.target.value)}
            />
          </div>
          {math && mathHw && (
            <p className="fit-math">
              on {mathHw.name}
              {mine && mathHw.id === mine.id ? " (this machine)" : ""}: weights{" "}
              {math.breakdown.weightsGb} GB · KV {math.breakdown.kvCacheGb} GB ·
              overhead {math.breakdown.overheadGb} GB · extra{" "}
              {math.breakdown.extraGb} GB · total {math.gb} GB /{" "}
              {math.breakdown.availableGb} GB available
              <span className="hint"> {math.note}</span>
            </p>
          )}
          <table className="results">
            <thead>
              <tr>
                <SortTh
                  id="name"
                  label="Hardware"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                />
                <SortTh
                  id="mem"
                  label="RAM"
                  title="Card or unified memory on this SKU"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={onSort}
                />
                <SortTh
                  id="gb"
                  label="Used"
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
                const toks = row.tokensPerSec;
                const isMine = mine?.id === row.hardware.id;
                return (
                  <tr
                    key={row.hardware.id}
                    className={`band-row ${row.band}${isMine ? " mine" : ""}`}
                  >
                    <td>
                      {isMine && (
                        <span className="mine-mark" title="This machine">
                          ★
                        </span>
                      )}
                      <span className="hw-name">
                        {row.hardware.name}
                        {isMine ? " · this machine" : ""}
                      </span>
                    </td>
                    <td>{row.hardware.memoryGb} GB</td>
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
            <p className="hint">Nothing in the catalog fits this model.</p>
          )}
          </>
          )}
        </>
      )}
    </>
  );
}
