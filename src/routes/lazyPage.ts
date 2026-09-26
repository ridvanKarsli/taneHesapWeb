import { lazy, type ComponentType } from "react";

/**
 * Adlandırılmış dışa aktarımlı (named export) bir sayfa modülünü `React.lazy` ile ayrı parça olarak yükler.
 * Yeni sürüm yayınlandıktan sonra eski parça adı bulunamazsa (önbellekteki eski index.html) sayfa bir kez yenilenir.
 */
export function lazyPage<TModule extends Record<string, unknown>>(load: () => Promise<TModule>, exportName: keyof TModule & string) {
  return lazy(async () => {
    try {
      const module = await load();
      forgetReload();
      return { default: module[exportName] as ComponentType };
    } catch (error) {
      if (reloadOnceForNewVersion()) {
        return new Promise<never>(() => undefined); // sayfa yenileniyor
      }
      throw error;
    }
  });
}

const RELOAD_FLAG = "taneHesap.chunkReload";

function forgetReload(): void {
  try {
    sessionStorage.removeItem(RELOAD_FLAG);
  } catch {
    // depolama kapalıysa önemi yok
  }
}

function reloadOnceForNewVersion(): boolean {
  try {
    if (sessionStorage.getItem(RELOAD_FLAG)) {
      return false; // zaten bir kez yenilendi; hata gerçek, gösterilsin
    }
    sessionStorage.setItem(RELOAD_FLAG, "1");
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}
