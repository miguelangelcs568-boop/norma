const KEY = "norma-desk-keys";

export type Brush = "off" | "trial" | "xai";
export type DeskKeys = { deepseek: string; image: string; brush: Brush };

function brushOf(raw: unknown): Brush {
  return raw === "trial" || raw === "xai" || raw === "off" ? raw : "off";
}

export function loadKeys(): DeskKeys {
  if (typeof window === "undefined") return { deepseek: "", image: "", brush: "off" };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { deepseek: "", image: "", brush: "off" };
    const parsed = JSON.parse(raw) as Partial<DeskKeys>;
    return { deepseek: parsed.deepseek ?? "", image: parsed.image ?? "", brush: brushOf(parsed.brush) };
  } catch {
    return { deepseek: "", image: "", brush: "off" };
  }
}

export function saveKeys(keys: DeskKeys) {
  localStorage.setItem(
    KEY,
    JSON.stringify({ deepseek: keys.deepseek.trim(), image: keys.image.trim(), brush: brushOf(keys.brush) }),
  );
}
