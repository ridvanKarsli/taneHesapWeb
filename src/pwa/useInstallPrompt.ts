import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandaloneDisplay(): boolean {
  const matchesStandaloneMedia = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
  const isIosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return matchesStandaloneMedia || isIosStandalone;
}

/** iOS Safari `beforeinstallprompt` olayını desteklemez; "Ana Ekrana Ekle" orada elle yapılır. */
export function isIosSafari(): boolean {
  const userAgent = window.navigator.userAgent;
  const isIos = /iphone|ipad|ipod/i.test(userAgent);
  const isSafariBrowser = /safari/i.test(userAgent) && !/crios|fxios|edgios/i.test(userAgent);
  return isIos && isSafariBrowser;
}

/**
 * Chrome/Edge/Android'de tarayıcının kendi "ana ekrana ekle" istemini yakalayıp istediğimiz
 * anda (`promptInstall`) tetiklememizi sağlar — bkz. `InstallPromptBanner`.
 */
export function useInstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(isStandaloneDisplay());

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredEvent(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setIsInstalled(true);
      setDeferredEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function promptInstall(): Promise<void> {
    if (!deferredEvent) {
      return;
    }
    await deferredEvent.prompt();
    await deferredEvent.userChoice;
    setDeferredEvent(null);
  }

  return {
    isInstalled,
    canInstall: deferredEvent !== null,
    promptInstall,
  };
}
