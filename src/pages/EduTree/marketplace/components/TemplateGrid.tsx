import { TemplateCard } from './TemplateCard';
import type { MarketplaceDegreeTemplate } from '@/pages/EduTree/v5/types/templates';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap } from 'lucide-react';

interface TemplateGridProps {
  templates: MarketplaceDegreeTemplate[];
  isLoading: boolean;
  selectedTemplates: string[];
  onToggleSelect: (templateId: string) => void;
  strengthMap?: Map<string, number>;
}

export function TemplateGrid({ 
  templates, 
  isLoading, 
  selectedTemplates, 
  onToggleSelect,
  strengthMap,
}: TemplateGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-[400px] rounded-lg" />
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <GraduationCap className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No degree paths found</h3>
        <p className="text-muted-foreground max-w-md">
          Try adjusting your filters to see more options. We're constantly adding new paths!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((template, index) => {
        const strength = strengthMap?.get(`${template.anchorSchool}::${template.programId}`);
        return (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={selectedTemplates.includes(template.id)}
            onToggleSelect={onToggleSelect}
            careerFitRank={strengthMap ? (index === 0 && strength != null ? 'best' : undefined) : undefined}
            careerFitPercent={strength != null ? Math.round(strength * 100) : undefined}
          />
        );
      })}
    </div>
  );
}
