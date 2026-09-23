import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { applyTheme, resolveInitialTheme } from "./theme/theme";
import "./index.css";

// İlk boyamadan önce uygulanır ki koyu temada açık ekran "yanıp sönmesin".
applyTheme(resolveInitialTheme());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
