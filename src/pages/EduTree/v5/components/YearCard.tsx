import { ChevronDown, ChevronRight } from 'lucide-react';

interface YearCardProps {
  year: number;
  isCollapsed: boolean;
  onToggle: () => void;
  totalCredits?: number;
}

export function YearCard({ year, isCollapsed, onToggle, totalCredits = 0 }: YearCardProps) {
  console.log(`[YearCard] Rendering Year ${year}:`, { isCollapsed });
  
  return (
    <div
      onClick={(e) => {
        console.log('[YearCard] Click event:', { year, isCollapsed });
        e.stopPropagation();
        onToggle();
      }}
      className={`
        year-card
        px-6 py-4 rounded-lg border-2 cursor-pointer
        transition-all duration-200
        min-w-[200px] min-h-[100px]
        flex flex-col justify-center gap-2
        hover:scale-105
        ${isCollapsed 
          ? 'bg-primary/5 border-primary border-dashed opacity-70' 
          : 'bg-primary/10 border-primary'
        }
      `}
    >
      <div className="flex items-center justify-center gap-2 text-primary font-bold text-lg">
        <span>Year {year}</span>
        {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
      </div>
      
      {!isCollapsed && totalCredits > 0 && (
        <div className="text-center text-xs text-muted-foreground">
          {totalCredits} credits
        </div>
      )}
    </div>
  );
}
