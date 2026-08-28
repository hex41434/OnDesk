export type SortDir = "asc" | "desc";

export function SortTh<K extends string>({
  id,
  label,
  title,
  sortKey,
  sortDir,
  onSort,
}: {
  id: K;
  label: string;
  title?: string;
  sortKey: K | null;
  sortDir: SortDir;
  onSort: (key: K) => void;
}) {
  const active = sortKey === id;
  return (
    <th
      aria-sort={
        active ? (sortDir === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        className={active ? "th-sort on" : "th-sort"}
        title={title}
        onClick={() => onSort(id)}
      >
        {label}
        {active ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
      </button>
    </th>
  );
}
