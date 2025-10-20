import { ChevronDown, ChevronRight } from 'lucide-react';
import { CourseCard } from './CourseCard';
import { ModuleData } from '../types/v5';
import { usePlanStore } from '../state/usePlanStore';
import { Checkbox } from '@/components/ui/checkbox';

interface ModuleCardProps extends ModuleData {
  onToggle: () => void;
  onCourseClick?: (courseId: string) => void;
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
  optionsCount,
  marketplaceOptions
}: ModuleCardProps) {
  const progress = creditsRequired > 0 ? (creditsEarned / creditsRequired) * 100 : 0;
  const selections = usePlanStore(s => s.selections);
  const toggleCourse = usePlanStore(s => s.toggleCourse);
  const selectedIds = selections[id]?.selected ?? [];
  
  return (
    <div
      className="module-card bg-card border-2 border-border rounded-lg overflow-hidden"
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
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-xs text-muted-foreground truncate">{description}</p>
            {optionsCount && optionsCount > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full whitespace-nowrap">
                {optionsCount} {optionsCount === 1 ? 'option' : 'options'} available
              </span>
            )}
          </div>
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
      
      {/* Courses List - Expandable */}
      {!isCollapsed && courses.length > 0 && (
        <div className="module-courses p-4 pt-0 space-y-2" onClick={e => e.stopPropagation()}>
          {courses.map(course => (
            <CourseCard
              key={course.courseId}
              courseId={course.courseId}
              title={course.title}
              credits={course.credits}
              subject={course.subject}
              onClick={() => onCourseClick?.(course.courseId)}
            />
          ))}
        </div>
      )}
      
      {/* Available Options - Expandable */}
      {!isCollapsed && marketplaceOptions && marketplaceOptions.length > 0 && (
        <div className="module-courses p-4 pt-0 space-y-2" onClick={e => e.stopPropagation()}>
          <div className="text-xs font-semibold text-muted-foreground mb-2">
            Available Options
          </div>
          {marketplaceOptions.map(option => {
            const isSelected = selectedIds.includes(option.courseId);
            const atMax = !isSelected && (selections[id]?.selectedCredits ?? 0) >= creditsRequired;
            
            return (
              <div
                key={option.id}
                className="course-card bg-background border border-border rounded-md p-2 hover:bg-accent/50 transition-colors flex items-center gap-2"
              >
                <Checkbox 
                  checked={isSelected}
                  onCheckedChange={() => {
                    toggleCourse(id, option.courseId, option.credits, creditsRequired);
                  }}
                  disabled={atMax}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">
                    {option.courseId}: {option.title}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <span>{option.credits} cr</span>
                    <span>•</span>
                    <span className="truncate">{option.provider}</span>
                    {option.cost_usd !== null && (
                      <>
                        <span>•</span>
                        <span>${option.cost_usd}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCourse(id, option.courseId, option.credits, creditsRequired);
                  }}
                  disabled={atMax}
                  className={`text-xs px-3 py-1 rounded transition-colors whitespace-nowrap ${
                    isSelected 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : atMax
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                  }`}
                >
                  {isSelected ? '✓ Selected' : atMax ? 'Max reached' : 'Select'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
