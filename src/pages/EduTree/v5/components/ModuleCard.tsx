import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CourseCard } from './CourseCard';
import { ModuleData } from '../types/v5';

interface ModuleCardProps extends ModuleData {
  onToggle: () => void;
  onCourseClick?: (courseId: string) => void;
  onModuleClick?: () => void;
}

export function ModuleCard({ 
  id,
  label, 
  icon, 
  description, 
  courses, 
  creditsEarned, 
  creditsRequired,
  isCollapsed,
  onToggle,
  onCourseClick,
  onModuleClick,
  optionsCount,
  cheapestOption,
  hasAceCredit,
  hasClep
}: ModuleCardProps) {
  const progress = creditsRequired > 0 ? (creditsEarned / creditsRequired) * 100 : 0;
  
  return (
    <div
      className="module-card bg-card border-2 border-border rounded-lg overflow-hidden"
      data-testid={`module-card-${id}`}
    >
      {/* Module Header - Clickable */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="module-header p-4 cursor-pointer hover:bg-accent/50 transition-colors flex items-center gap-3"
      >
        {/* Icon */}
        <div className="text-2xl flex-shrink-0">{icon}</div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">{label}</h3>
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
          
          {/* Marketplace Preview Badge */}
          {optionsCount !== undefined && optionsCount > 0 && (
            <Badge 
              variant="outline" 
              className="text-xs cursor-pointer hover:bg-accent w-fit mt-2"
              onClick={(e) => {
                e.stopPropagation();
                onModuleClick?.();
              }}
              data-testid="marketplace-preview-badge"
            >
              🛒 {optionsCount} options
              {cheapestOption !== null && ` • from $${cheapestOption}`}
              {hasAceCredit && ' • ✅ ACE'}
              {hasClep && ' • ✅ CLEP'}
            </Badge>
          )}
        </div>
        
        {/* Progress Indicator */}
        <div className="flex-shrink-0 flex items-center gap-2">
          <div className="text-right">
            <div className="text-xs font-semibold">{creditsEarned}/{creditsRequired}</div>
            <div className="text-xs text-muted-foreground">credits</div>
          </div>
          <div className="relative w-12 h-12">
            <svg className="transform -rotate-90" width="48" height="48">
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-muted/20"
              />
              <circle
                cx="24"
                cy="24"
                r="20"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 20}`}
                strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
                className="text-primary transition-all duration-300"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
              {Math.round(progress)}%
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}
