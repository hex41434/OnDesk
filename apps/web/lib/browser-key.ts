export const KEY_STORAGE = "ondesk.geminiKey";

export function readBrowserKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function jsonAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const key = readBrowserKey();
  if (key) headers["x-gemini-key"] = key;
  return headers;
}
