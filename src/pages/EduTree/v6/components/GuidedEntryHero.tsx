import { GraduationCap, Clock, DollarSign, BookOpen, ArrowRight, MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { V6_COPY } from '../copy';

interface GuidedEntryHeroProps {
  degreeTitle?: string;
  totalCredits?: number;
  estimatedCost?: number;
  estimatedYears?: number;
  onStartYear1: () => void;
  onBrowseTemplates: () => void;
  onShowFullMap: () => void;
}

export function GuidedEntryHero({
  degreeTitle,
  totalCredits = 120,
  estimatedCost,
  estimatedYears = 4,
  onStartYear1,
  onBrowseTemplates,
  onShowFullMap,
}: GuidedEntryHeroProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <Card className="max-w-xl w-full p-8 space-y-8 text-center border-2 border-primary/20 bg-gradient-to-b from-primary/5 to-background shadow-lg">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
            <GraduationCap className="w-10 h-10 text-primary" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            {V6_COPY.heroTitle(degreeTitle || '')}
          </h1>
          <p className="text-muted-foreground">{V6_COPY.heroSubtitle}</p>
        </div>

        {/* Stats row */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>{estimatedYears} years</span>
          </div>
          {estimatedCost != null && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span>${estimatedCost.toLocaleString()}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-muted-foreground">
            <BookOpen className="w-4 h-4" />
            <span>{totalCredits} credits</span>
          </div>
        </div>

        {/* Steps preview */}
        <div className="flex flex-col gap-3 text-left max-w-xs mx-auto">
          {[V6_COPY.step1, V6_COPY.step2, V6_COPY.step3].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                {i + 1}
              </div>
              <span className="text-sm text-foreground">{step}</span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="space-y-3 pt-2">
          <Button size="lg" className="w-full gap-2" onClick={onStartYear1}>
            {V6_COPY.startYear1}
            <ArrowRight className="w-4 h-4" />
          </Button>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" size="sm" onClick={onBrowseTemplates}>
              {V6_COPY.browseDegrees}
            </Button>
            <Button variant="ghost" size="sm" className="gap-1" onClick={onShowFullMap}>
              <MapIcon className="w-3 h-3" />
              {V6_COPY.seeFullMap}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
