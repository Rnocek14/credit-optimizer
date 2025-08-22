import { useMemo } from 'react';
import { logEvent } from '@/lib/analytics';

type Day = { date: string; active: boolean };
export default function StreakTimeline({ days }: { days: Day[] }) {
  const items = useMemo(() => {
    // expect days[0] = today; pad/crop to 14
    const arr = [...days].slice(0, 14);
    logEvent('streak_timeline_viewed', { length: arr.length });
    return arr;
  }, [days]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="text-lg font-semibold mb-3 text-card-foreground">Streak Timeline (14d)</h3>
      <div className="grid grid-cols-14 gap-1">
        {items.map((d, i) => (
          <div key={d.date} className="group relative">
            <div
              title={`${d.date} — ${d.active ? 'Active' : 'Missed'}`}
              className={`h-6 rounded transition-all ${i === 0 ? 'ring-2 ring-primary' : ''} ${
                d.active ? 'bg-primary' : 'bg-muted'
              }`}
            />
            <div className="absolute left-1/2 -translate-x-1/2 top-7 text-[10px] text-muted-foreground">
              {new Date(d.date).toLocaleDateString(undefined, { weekday: 'narrow' })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}