"use client";

import { useMemo, useState } from "react";
import {
  fit,
  gpus,
  models,
  parseHfRepo,
  rankHardware,
  type Model,
  type Quant,
  type RankedHardware,
  type RunMode,
} from "@ondesk/core";
import { jsonAuthHeaders } from "../lib/browser-key";
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

function sizeLabel(paramsB: number): string {
  if (paramsB >= 100) return `${paramsB.toFixed(0)}B`;
  if (paramsB >= 1) return `${paramsB.toFixed(paramsB >= 10 ? 0 : 1)}B`;
  if (paramsB >= 0.1) return `${Math.round(paramsB * 1000)}M`;
  return `${Math.round(paramsB * 1e9).toLocaleString("en-US")} params`;
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

  const ranked = useMemo(
    () => (picked ? rankHardware(picked, gpus, { mode }) : []),
    [picked, mode],
  );
  const rows = sortKey ? sortHw(ranked, sortKey, sortDir) : ranked;
  const best = ranked[0];
  const math =
    picked && best ? fit(picked, best.hardware, { mode }) : null;

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
                <button type="button" onClick={() => void scoreRepo(hit.id)}>
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
          <p className="picked-model">
            <a
              href={`https://huggingface.co/${picked.hf ?? picked.id}`}
              target="_blank"
              rel="noreferrer"
              className="model-link"
            >
              <HfLogo size={14} className="hf-mark" />
              {picked.name}
            </a>
            <span className="est">
              {" "}
              · {sizeLabel(picked.paramsB)} · {picked.license}
            </span>
          </p>
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
          </div>
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
                  label="Memory"
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
              {rows.map((row) => {
                const toks = row.tokensPerSec;
                return (
                  <tr key={row.hardware.id} className={`band-row ${row.band}`}>
                    <td>
                      <span className="hw-name">{row.hardware.name}</span>
                    </td>
                    <td>
                      {row.hardware.memoryGb} GB {row.hardware.memoryKind}
                    </td>
                    <td>{row.gb}</td>
                    <td>{row.quant ?? "—"}</td>
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
              {math && best && (
                <tr className="math-row">
                  <td colSpan={7}>
                    on {best.hardware.name}: weights {math.breakdown.weightsGb}{" "}
                    GB · KV {math.breakdown.kvCacheGb} GB · overhead{" "}
                    {math.breakdown.overheadGb} GB · extra {math.breakdown.extraGb}{" "}
                    GB · total {math.gb} GB / {math.breakdown.availableGb} GB
                    available
                    <span className="hint"> {math.note}</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {rows.length === 0 && (
            <p className="hint">Nothing in the catalog fits this model.</p>
          )}
        </>
      )}
    </>
  );
}
