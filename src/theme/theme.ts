export type Theme = "light" | "dark";

const STORAGE_KEY = "taneHesap.theme";

/** Kayıtlı tercih yoksa işletim sistemi tercihi kullanılır. */
export function resolveInitialTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch {
    // localStorage kapalı olabilir (gizli mod) — sistem tercihine düş.
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Temayı `<html data-theme>` üzerinden uygular; tüm renkler `index.css`'teki token'lardan gelir. */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#1c1714" : "#c8691f");
}

export function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Kaydedilemezse tema yalnızca bu oturum için geçerli kalır.
  }
}
