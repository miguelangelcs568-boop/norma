const KEY = "norma-desk-prefs";

export type Theme = "light" | "dark";

export type DeskPrefs = { theme: Theme };

const FALLBACK: DeskPrefs = { theme: "light" };

export function loadPrefs(): DeskPrefs {
  if (typeof window === "undefined") return FALLBACK;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return FALLBACK;
    const parsed = JSON.parse(raw) as Partial<DeskPrefs>;
    return { theme: parsed.theme === "dark" ? "dark" : "light" };
  } catch {
    return FALLBACK;
  }
}

export function savePrefs(prefs: DeskPrefs) {
  localStorage.setItem(KEY, JSON.stringify(prefs));
  applyTheme(prefs.theme);
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "dark" ? "#000000" : "#f5f5f7");
}
