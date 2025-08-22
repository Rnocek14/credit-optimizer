// You can swap this with your existing queries/RPCs:
export type SimpleBadge = { id: string; name: string; description: string; earnedAt?: string | null; icon?: string };

export function useGamificationData(userId?: string | null) {
  // Replace with real queries when available:
  const badges: SimpleBadge[] = [
    { id: 'starter', name: 'Getting Started', description: 'Complete your first challenge', earnedAt: new Date().toISOString(), icon: '🌱' },
    { id: 'streak3', name: 'On a Roll', description: '3-day streak achieved', earnedAt: null, icon: '🔥' },
    { id: 'level5', name: 'Level 5', description: 'Reach Level 5', earnedAt: null, icon: '🏆' },
    { id: 'course', name: 'Course Complete', description: 'Complete your first course', earnedAt: null, icon: '🎓' },
    { id: 'mentor', name: 'Mentor', description: 'Help 5 other learners', earnedAt: null, icon: '👨‍🏫' },
    { id: 'explorer', name: 'Explorer', description: 'Try 10 different skill areas', earnedAt: null, icon: '🗺️' },
  ];

  // Make 14 days; first is today
  const today = new Date();
  const days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    // active pattern: just an example; replace with actual daily activity
    const active = i === 0 || i === 1 || i === 3 || i === 6 || i === 7 || i === 9 || i === 12;
    return { date: d.toISOString(), active };
  });

  return { badges, days };
}