import { useEffect, useRef } from 'react';
import { useFeatureFlags } from '@/lib/featureFlags';
import { logEvent } from '@/lib/analytics';

type CelebrationKind = 'LEVEL_UP' | 'STREAK' | 'CHALLENGE';
type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  kind: CelebrationKind;
  xpAwarded?: number;
};

export default function CelebrationOverlay({ open, onClose, title, subtitle, kind, xpAwarded }: Props) {
  const { gamificationSound } = useFeatureFlags();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!open) return;
    logEvent('celebration_shown', { kind, xpAwarded });

    // confetti (tiny inline)
    requestAnimationFrame(() => {
      const count = 120;
      for (let i = 0; i < count; i++) {
        const s = document.createElement('span');
        s.className = 'pointer-events-none fixed z-[1001] animate-[fall_1.6s_linear]';
        s.style.left = `${Math.random() * 100}vw`;
        s.style.top = `-10px`;
        s.style.fontSize = `${10 + Math.random() * 14}px`;
        s.textContent = ['🎉', '✨', '🎊', '⭐'][i % 4];
        document.body.appendChild(s);
        setTimeout(() => s.remove(), 1700);
      }
    });

    // optional sound
    if (gamificationSound && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (!audioRef.current) {
        const a = new Audio();
        a.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAYBjiS0fPReiwEJHfH8N2QQAoUXrTp66hVFApGn+DyvmAYBjiS0fPReiwEJHfH8N2QQAoUXrTp66hVFApGn+DyvmAYBjiS0fPReiwEJHfH8N2QQAoUXrTp66hVFApGn+DyvmAYBjiS0fPReiwEJHfH8N2QQAoUXrTp66hVFApGn+DyvmAYBjiS0fPReiwEJHfH8N2QQAoUXrTp66hVFApGn+DyvmAYBjiS0fPReiwEJHfH8N2QQAoUXrTp66hVFApGn+DyvmAYBjiS0fPReiwEJHfH8N2QQAoUXrTp66hVFApGn+DyvmAYBjiS0fPReiwEJHfH8N2QQAoUXrTp66hVFApGn+DyvmAYBjiS0fPReiwEJHfH8N2QQAoUXrTp66hVFApGn+DyvmAYBjiS0fPReiwEJHfH8N2QQAoUXrTp66hVFApGn+DyvmAYBjiS0fPReiwEJHfH8N2QQAoUXrTp66hVFApGn+DyvmAYBjiS0fPReiwEJHfH8N2QQAoUXrTp66hVFApGn+DyvmAYBjiS0fPReiwEJHfH8N2QQAoUXrTp66hVFApGn+DyvmAYBjiS0fPReiwEJHfH8N2QOAGAn+hAqWEkBjkCnwLHcqGAHQ==';
        a.volume = 0.15;
        audioRef.current = a;
      }
      audioRef.current.currentTime = 0;
      void audioRef.current.play().catch(() => {});
    }
  }, [open, kind, xpAwarded, gamificationSound]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      tabIndex={-1}
    >
      <div
        className="mx-4 w-full max-w-md rounded-2xl bg-card p-6 shadow-xl text-center border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-4xl mb-2">🎉</div>
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
        {typeof xpAwarded === 'number' && (
          <div className="mt-3 text-sm text-primary font-medium">+{xpAwarded} XP</div>
        )}
        <button
          className="mt-5 inline-flex items-center rounded-xl px-4 py-2 bg-primary text-primary-foreground hover:bg-primary-hover transition-colors"
          onClick={onClose}
          autoFocus
        >
          Continue
        </button>
      </div>
    </div>
  );
}