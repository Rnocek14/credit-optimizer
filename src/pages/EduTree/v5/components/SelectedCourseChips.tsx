import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import type { BasketItem } from '../state/usePlanBasket';

interface SelectedCourseChipsProps {
  moduleId: string;
  basketItems: BasketItem[];
  onRemove: (courseId: string) => void;
  creditsRequired: number;
}

export function SelectedCourseChips({ 
  moduleId, 
  basketItems, 
  onRemove, 
  creditsRequired 
}: SelectedCourseChipsProps) {
  const totalCredits = basketItems.reduce((sum, i) => sum + i.credits, 0);
  const isOverCredits = totalCredits > creditsRequired;
  
  return (
    <div className="space-y-2">
      {/* Summary header */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {basketItems.length} {basketItems.length === 1 ? 'course' : 'courses'} selected
        </span>
        {isOverCredits && (
          <Badge variant="outline" className="text-xs border-warning text-warning">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Over by {totalCredits - creditsRequired}cr
          </Badge>
        )}
      </div>
      
      {/* Course chips grid */}
      <div className="flex flex-wrap gap-2">
        {basketItems.map(item => (
          <div
            key={item.courseId}
            className="group flex items-center gap-1.5 px-2 py-1 rounded-md border bg-background hover:bg-accent/50 transition-all text-xs"
            title={item.title || item.courseId}
          >
            {/* Status icon */}
            <span 
              className="text-[10px]" 
              title={item.status === 'auto-filled' ? 'Auto-filled from template' : item.status === 'pinned' ? 'Manually pinned' : 'Prerequisite'}
            >
              {item.status === 'auto-filled' ? '🤖' : item.status === 'pinned' ? '👤' : '🔗'}
            </span>
            
            {/* Course info */}
            <span className="font-medium truncate max-w-[120px]">
              {item.courseId}
            </span>
            <span className="text-muted-foreground">{item.credits}cr</span>
            
            {/* Remove button (appears on hover) */}
            <button
              onClick={() => onRemove(item.courseId)}
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 hover:text-destructive"
              aria-label={`Remove ${item.courseId}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
