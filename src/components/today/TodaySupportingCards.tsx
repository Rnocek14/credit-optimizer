/**
 * TodaySupportingCards — renders the top 2 most relevant supporting cards.
 * Rule: If a card doesn't change what the user should do today, skip it.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSkillGaps } from '@/hooks/useSkillGaps';
import type { QuickWin } from '@/hooks/useSmartTodayDashboard';

interface TodaySupportingCardsProps {
  userId: string;
  quickWins: QuickWin[];
  onQuickWinAction: (win: QuickWin) => void;
}

export function TodaySupportingCards({
  userId,
  quickWins,
  onQuickWinAction,
}: TodaySupportingCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <SkillGapsCard userId={userId} />
      <QuickWinsCard quickWins={quickWins} onAction={onQuickWinAction} />
    </div>
  );
}

/* ── Skill Gaps ─────────────────────────────────── */
function SkillGapsCard({ userId }: { userId: string }) {
  const { data: gaps, isLoading } = useSkillGaps(userId);

  const priorityColor: Record<string, string> = {
    critical: 'text-destructive',
    high: 'text-primary',
    medium: 'text-muted-foreground',
    low: 'text-muted-foreground',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4 text-primary" />
          Skill Gaps
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-16 bg-muted rounded animate-pulse" />
        ) : !gaps || gaps.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <BookOpen className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No skill gaps detected</p>
          </div>
        ) : (
          <div className="space-y-2">
            {gaps.slice(0, 3).map((gap) => (
              <div
                key={gap.skill}
                className="flex items-center justify-between p-2.5 rounded-lg border bg-card/50"
              >
                <div>
                  <p className="font-medium text-sm capitalize">{gap.skill}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {gap.priority} priority
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={priorityColor[gap.priority] ?? ''}
                >
                  {gap.currentLevel} → {gap.targetLevel}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── Quick Wins ─────────────────────────────────── */
function QuickWinsCard({
  quickWins,
  onAction,
}: {
  quickWins: QuickWin[];
  onAction: (win: QuickWin) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-4 w-4 text-primary" />
          Quick Wins
        </CardTitle>
      </CardHeader>
      <CardContent>
        {quickWins.length > 0 ? (
          <div className="space-y-2">
            {quickWins.slice(0, 3).map((win) => (
              <div
                key={win.id}
                className="flex items-center justify-between p-2.5 rounded-lg border bg-card/50"
              >
                <div className="min-w-0 flex-1 mr-2">
                  <p className="font-medium text-sm truncate">{win.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {win.timeEstimate}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onAction(win)}
                >
                  Start
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            <Zap className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No quick wins available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
