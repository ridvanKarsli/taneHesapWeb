import { useCallback, useState } from "react";
import { applyTheme, persistTheme, resolveInitialTheme, type Theme } from "./theme";

/** Açık/koyu tema durumu ve değiştirici — üst bardaki tek düğme kullanır. */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme === "dark" ? "dark" : resolveInitialTheme()));

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === "dark" ? "light" : "dark";
      applyTheme(next);
      persistTheme(next);
      return next;
    });
  }, []);

  return { theme, toggle };
}
