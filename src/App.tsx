import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { InstallPromptBanner } from "./pwa/InstallPromptBanner";
import { AppRoutes } from "./routes/AppRoutes";

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <InstallPromptBanner />
      </AuthProvider>
    </BrowserRouter>
  );
}
