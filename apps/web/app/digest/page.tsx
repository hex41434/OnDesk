import digest from "./entries.json";

type Entry = {
  hf: string;
  name: string;
  band: string;
  quant: string;
  note: string;
};

type Week = {
  week: string;
  title: string;
  profileId: string;
  entries: Entry[];
};

const weeks = digest as Week[];

export default function DigestPage() {
  return (
    <article className="prose">
      <h1>Digest</h1>
      <p>
        New open-source models scored against a few desks. No account. The
        daily job is still a stub; this page is the shape.
      </p>
      {weeks.map((week) => (
        <section key={week.week}>
          <h2>{week.title}</h2>
          <p className="meta">Week of {week.week}</p>
          <ul>
            {week.entries.map((e) => (
              <li key={e.hf}>
                <a href={`https://huggingface.co/${e.hf}`}>{e.name}</a>
                {" · "}
                <span className={`band ${e.band}`}>{e.band}</span>
                {" · "}
                {e.quant}
                <br />
                <span className="hint">{e.note}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </article>
  );
}
