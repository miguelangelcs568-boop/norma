const KEY = "norma-desk-keys";

export type DeskKeys = { deepseek: string; image: string };

export function loadKeys(): DeskKeys {
  if (typeof window === "undefined") return { deepseek: "", image: "" };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { deepseek: "", image: "" };
    const parsed = JSON.parse(raw) as Partial<DeskKeys>;
    return { deepseek: parsed.deepseek ?? "", image: parsed.image ?? "" };
  } catch {
    return { deepseek: "", image: "" };
  }
}

export function saveKeys(keys: DeskKeys) {
  localStorage.setItem(KEY, JSON.stringify({ deepseek: keys.deepseek.trim(), image: keys.image.trim() }));
}
