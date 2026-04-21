/**
 * WinnerBadges — compact tags identifying which metric a school wins on.
 * Designed for the column header (table) and card title row.
 *
 * Hierarchy: "Best fit" wins when shown alongside narrower badges (it's the
 * composite). Cheapest / Fastest / Most credits show only when strictly best.
 */
import { Badge } from '@/components/ui/badge';
import { Trophy, DollarSign, Zap, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CompareRow } from '../buildCompareRows';

interface WinnerBadgesProps {
  row: CompareRow;
  /** Stack vertically on cards, wrap inline on table headers */
  layout?: 'stack' | 'inline';
  className?: string;
}

const BADGE_BASE =
  'text-[10px] gap-1 px-1.5 py-0.5 font-medium border';

export function WinnerBadges({ row, layout = 'inline', className }: WinnerBadgesProps) {
  const badges: React.ReactNode[] = [];

  if (row.isBest) {
    badges.push(
      <Badge
        key="best"
        variant="default"
        className={cn(BADGE_BASE, 'border-transparent bg-primary text-primary-foreground')}
      >
        <Trophy className="h-2.5 w-2.5" />
        Best fit
      </Badge>
    );
  }
  if (row.isCheapest) {
    badges.push(
      <Badge
        key="cheap"
        variant="outline"
        className={cn(BADGE_BASE, 'border-border/60 bg-muted/30 text-muted-foreground')}
      >
        <DollarSign className="h-2.5 w-2.5" />
        Cheapest
      </Badge>
    );
  }
  if (row.isFastest) {
    badges.push(
      <Badge
        key="fast"
        variant="outline"
        className={cn(BADGE_BASE, 'border-border/60 bg-muted/30 text-muted-foreground')}
      >
        <Zap className="h-2.5 w-2.5" />
        Fastest
      </Badge>
    );
  }
  if (row.isMostCreditFriendly) {
    badges.push(
      <Badge
        key="credits"
        variant="outline"
        className={cn(BADGE_BASE, 'border-border/60 bg-muted/30 text-muted-foreground')}
      >
        <GraduationCap className="h-2.5 w-2.5" />
        Most credits
      </Badge>
    );
  }

  if (badges.length === 0) return null;

  return (
    <div
      className={cn(
        'flex gap-1',
        layout === 'stack' ? 'flex-col items-start' : 'flex-wrap justify-center',
        className
      )}
    >
      {badges}
    </div>
  );
}
