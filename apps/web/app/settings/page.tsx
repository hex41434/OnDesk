"use client";

import { KEY_STORAGE, readBrowserKey } from "../../lib/browser-key";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setKey(readBrowserKey());
  }, []);

  function save() {
    try {
      if (key.trim()) localStorage.setItem(KEY_STORAGE, key.trim());
      else localStorage.removeItem(KEY_STORAGE);
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }

  return (
    <article className="prose">
      <h1>Settings</h1>
      <p>
        Gemini is only for turning a sentence into a search string (hardware SKU
        or Hub keywords). Fit bands and tok/s never go through Google. The key
        stays in this browser, or in{" "}
        <code>apps/web/.env.local</code> as <code>GEMINI_API_KEY</code> (restart
        dev after that).
      </p>
      <label className="field" htmlFor="gemini">
        Gemini API key
      </label>
      <input
        id="gemini"
        type="password"
        autoComplete="off"
        placeholder="AIza…"
        value={key}
        onChange={(e) => {
          setKey(e.target.value);
          setSaved(false);
        }}
      />
      <p className="hint">
        <button type="button" className="chip on" onClick={save}>
          Save in this browser
        </button>
        {saved && <span className="est"> saved</span>}
      </p>
    </article>
  );
}
