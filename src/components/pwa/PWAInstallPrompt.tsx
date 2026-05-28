import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(() =>
    localStorage.getItem('fc_pwa_dismissed') === 'true'
  );

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone || dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('fc_pwa_dismissed', 'true');
  };

  if (!showBanner || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe-bottom">
      <div
        className="mx-auto max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="p-4 flex items-center gap-4">
          <div className="shrink-0">
            <img src="/fundcircle-logo.png" alt="FundCircle" className="h-12 w-12 rounded-xl" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm">Install FundCircle App</p>
            <p className="text-slate-400 text-xs mt-0.5">Work offline · Fast · No browser needed</p>
          </div>
        </div>
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={handleInstall}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="px-4 rounded-xl py-2.5 text-sm font-medium text-slate-400 bg-white/5 hover:bg-white/10 transition-all active:scale-95"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
