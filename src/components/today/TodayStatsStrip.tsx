/**
 * TodayStatsStrip — single-row summary: Level, Streak, Career Readiness.
 * Kept visually light, always visible, no scroll required.
 */
import { Flame, TrendingUp, Target } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TodayStatsStripProps {
  currentLevel: number;
  totalXP: number;
  currentStreak: number;
  /** null = no target career set */
  readinessPercent: number | null;
}

export function TodayStatsStrip({
  currentLevel,
  totalXP,
  currentStreak,
  readinessPercent,
}: TodayStatsStripProps) {
  return (
    <div className="grid grid-cols-3 gap-4" data-testid="today-stats-strip">
      {/* Level / XP */}
      <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
        <TrendingUp className="h-5 w-5 text-primary shrink-0" />
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none">{currentLevel}</p>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            Level · {totalXP.toLocaleString()} XP
          </p>
        </div>
      </div>

      {/* Streak */}
      <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
        <Flame className="h-5 w-5 text-orange-500 shrink-0" />
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none">{currentStreak}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Day streak
          </p>
        </div>
      </div>

      {/* Career Readiness */}
      <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
        <Target className="h-5 w-5 text-primary shrink-0" />
        <div className="min-w-0">
          {readinessPercent !== null ? (
            <>
              <p className="text-2xl font-bold leading-none">{readinessPercent}%</p>
              <p className="text-xs text-muted-foreground mt-1">Readiness</p>
            </>
          ) : (
            <Link
              to="/discover"
              className="text-sm font-medium text-primary hover:underline"
            >
              Set a target career →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
