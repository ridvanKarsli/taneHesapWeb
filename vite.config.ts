import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "taneHesap — Meydan Pilavcısı",
        short_name: "taneHesap",
        description: "Gelir, gider, stok ve gün sonu yönetim paneli.",
        lang: "tr",
        id: "/",
        scope: "/",
        start_url: "/",
        display: "standalone",
        categories: ["business", "finance", "food"],
        shortcuts: [
          { name: "Gider ekle", short_name: "Gider", url: "/finans/giderler", icons: [{ src: "pwa-192.png", sizes: "192x192" }] },
          { name: "Gün sonu Excel yükle", short_name: "Gün sonu", url: "/gun-sonu/satislar", icons: [{ src: "pwa-192.png", sizes: "192x192" }] },
          { name: "Kasa", short_name: "Kasa", url: "/finans/kasa", icons: [{ src: "pwa-192.png", sizes: "192x192" }] },
        ],
        background_color: "#FAF6F0",
        theme_color: "#EF6A4C",
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // API istekleri her zaman ağdan gitmeli (finansal veri) — sadece uygulama kabuğu
        // (statik dosyalar) önbelleklenir, bu yüzden runtimeCaching burada tanımlanmaz.
        navigateFallbackDenylist: [/^\/api\//, /^\/hubs\//],
      },
    }),
  ],
});
