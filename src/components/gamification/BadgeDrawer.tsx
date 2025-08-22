type Badge = {
  id: string;
  name: string;
  description: string;
  icon?: string;
  earnedAt?: string | null;
};

export function BadgeDrawer({ badge, onClose }: { badge: Badge | null; onClose: () => void }) {
  if (!badge) return null;
  return (
    <div className="fixed inset-0 z-[1000] bg-black/50" onClick={onClose}>
      <div
        className="absolute right-0 top-0 h-full w-full max-w-md bg-card shadow-2xl p-6 animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-semibold mb-1 text-card-foreground">{badge.name}</h3>
        <p className="text-muted-foreground mb-4">{badge.description}</p>
        <div className="text-sm text-muted-foreground">
          {badge.earnedAt ? `Earned on ${new Date(badge.earnedAt).toLocaleDateString()}` : 'Not earned yet'}
        </div>
        <button 
          className="mt-6 rounded-xl bg-primary text-primary-foreground px-4 py-2 hover:bg-primary-hover transition-colors" 
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}