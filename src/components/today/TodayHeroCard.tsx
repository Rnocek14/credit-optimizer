/**
 * TodayHeroCard — single state-aware CTA: "What should I do next?"
 */
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, GraduationCap, Search, Loader2 } from 'lucide-react';
import type { HeroAction } from '@/hooks/useTodayHeroAction';

const ICONS: Record<HeroAction['reasonCode'], React.ElementType> = {
  'no-plan': GraduationCap,
  'has-plan': GraduationCap,
  fallback: Search,
};

interface TodayHeroCardProps {
  hero: HeroAction;
  isLoading: boolean;
}

export function TodayHeroCard({ hero, isLoading }: TodayHeroCardProps) {
  if (isLoading) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const Icon = ICONS[hero.reasonCode];

  return (
    <Card className="border-primary/20 bg-primary/5" data-testid="today-hero">
      <CardContent className="flex items-center justify-between py-6 gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{hero.title}</p>
            <p className="text-sm text-muted-foreground truncate">
              {hero.subtitle}
            </p>
          </div>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link to={hero.to}>
            {hero.ctaLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
