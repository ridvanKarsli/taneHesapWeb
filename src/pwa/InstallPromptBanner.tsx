import { useState } from "react";
import { isIosSafari, useInstallPrompt } from "./useInstallPrompt";
import "./InstallPromptBanner.css";

const DISMISSED_STORAGE_KEY = "taneHesap.installPromptDismissed";

function wasDismissedBefore(): boolean {
  try {
    return localStorage.getItem(DISMISSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function rememberDismissal(): void {
  try {
    localStorage.setItem(DISMISSED_STORAGE_KEY, "true");
  } catch {
    // localStorage yoksa banner sadece bu oturumda tekrar görünmeyecek kadar kısa süre kalır.
  }
}

/**
 * "Ana ekrana ekle" daveti. Chrome/Edge/Android'de tarayıcının gerçek kurulum istemini
 * (`beforeinstallprompt`, bkz. `useInstallPrompt`) tetikler. iOS Safari bu olayı desteklemediği
 * için orada elle "Paylaş > Ana Ekrana Ekle" adımlarını gösteren bir ipucu sunulur. Kullanıcı
 * kapatırsa bir daha gösterilmez (nagging olmasın diye kalıcı olarak hatırlanır).
 */
export function InstallPromptBanner() {
  const { isInstalled, canInstall, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(wasDismissedBefore);

  const showIosHint = isIosSafari() && !isInstalled;
  const shouldShow = !dismissed && !isInstalled && (canInstall || showIosHint);

  if (!shouldShow) {
    return null;
  }

  function handleDismiss() {
    rememberDismissal();
    setDismissed(true);
  }

  return (
    <div className="install-banner" role="status">
      <span className="install-banner-icon" aria-hidden="true">
        📲
      </span>
      <div className="install-banner-text">
        <strong>taneHesap&apos;ı ana ekranına ekle</strong>
        <p>
          {canInstall
            ? "Uygulama gibi hızlıca açmak için ana ekranına ekleyebilirsin."
            : 'Paylaş düğmesine dokunup "Ana Ekrana Ekle"yi seç.'}
        </p>
      </div>
      <div className="install-banner-actions">
        {canInstall && (
          <button type="button" onClick={() => void promptInstall()}>
            Ekle
          </button>
        )}
        <button type="button" className="install-banner-dismiss" onClick={handleDismiss} aria-label="Kapat">
          ✕
        </button>
      </div>
    </div>
  );
}
