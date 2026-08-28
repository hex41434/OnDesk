/** Chat feel, not a bench. 90 tok/s fills the bar. */
const SPEED_CAP = 90;

function speedTone(toks: number): "crawl" | "slow" | "ok" | "fast" {
  if (toks < 8) return "crawl";
  if (toks < 20) return "slow";
  if (toks < 45) return "ok";
  return "fast";
}

function speedWord(tone: ReturnType<typeof speedTone>): string {
  if (tone === "crawl") return "crawl";
  if (tone === "slow") return "usable";
  if (tone === "ok") return "good";
  return "snappy";
}

function speedPct(toks: number): number {
  return Math.min(100, Math.round((toks / SPEED_CAP) * 100));
}

export function SpeedBar({ toks }: { toks: number | null }) {
  if (toks == null) return "—";
  const tone = speedTone(toks);
  const n = Math.round(toks);
  return (
    <div
      className={`speed-bar ${tone}`}
      title={`est. ${n} tok/s — ${speedWord(tone)} chat`}
      role="img"
      aria-label={`est. ${n} tok/s, ${speedWord(tone)}`}
    >
      <span style={{ width: `${speedPct(toks)}%` }} />
    </div>
  );
}
