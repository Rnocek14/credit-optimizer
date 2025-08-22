import { useEffect, useState } from 'react';

type Toast = { id: string; text: string };
export function XPToast({ queue }: { queue: Toast[] }) {
  const [visible, setVisible] = useState<Toast[]>([]);

  useEffect(() => {
    if (!queue.length) return;
    const next = queue[0];
    setVisible((v) => [...v, next]);
    const t = setTimeout(() => {
      setVisible((v) => v.filter((x) => x.id !== next.id));
    }, 2200);
    return () => clearTimeout(t);
  }, [queue]);

  return (
    <div className="fixed bottom-4 right-4 z-[1100] space-y-2">
      {visible.map((t) => (
        <div
          key={t.id}
          className="rounded-xl bg-card border text-card-foreground px-3 py-2 text-sm shadow-lg animate-slide-in-right"
          aria-live="polite"
        >
          {t.text}
        </div>
      ))}
    </div>
  );
}