import { useMemo, useState } from 'react';
import { logEvent } from '@/lib/analytics';
import { BadgeDrawer } from './BadgeDrawer';

type Badge = {
  id: string;
  name: string;
  description: string;
  icon?: string; // url or emoji
  earnedAt?: string | null;
};

type Props = {
  badges: Badge[];
};

type Filter = 'all' | 'earned' | 'locked';

export default function AchievementGallery({ badges }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const [active, setActive] = useState<Badge | null>(null);

  const filtered = useMemo(() => {
    if (filter === 'earned') return badges.filter((b) => !!b.earnedAt);
    if (filter === 'locked') return badges.filter((b) => !b.earnedAt);
    return badges;
  }, [badges, filter]);

  function onFilterChange(f: Filter) {
    setFilter(f);
    logEvent('gallery_filter_changed', { filter: f, total: filtered.length });
  }

  function openBadge(b: Badge) {
    setActive(b);
    logEvent('badge_viewed', { id: b.id, earned: !!b.earnedAt });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-card-foreground">Achievements</h3>
        <div className="flex gap-2">
          {(['all', 'earned', 'locked'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => onFilterChange(f)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                filter === f 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'bg-background text-foreground border-border hover:bg-accent'
              }`}
            >
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground">No badges yet.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((b) => (
            <button
              key={b.id}
              onClick={() => openBadge(b)}
              className={`rounded-xl border p-3 text-left hover:shadow-sm transition-all hover-lift ${
                b.earnedAt ? 'bg-card border-border' : 'bg-muted/50 opacity-80 border-border'
              }`}
            >
              <div className="text-2xl mb-2">{b.icon ?? '🏅'}</div>
              <div className="text-sm font-medium text-card-foreground">{b.name}</div>
              <div className="text-xs text-muted-foreground line-clamp-2">{b.description}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">
                {b.earnedAt ? 'Earned' : 'Locked'}
              </div>
            </button>
          ))}
        </div>
      )}
      <BadgeDrawer badge={active} onClose={() => setActive(null)} />
    </div>
  );
}