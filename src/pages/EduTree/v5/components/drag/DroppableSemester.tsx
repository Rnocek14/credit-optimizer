import { ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';

interface DroppableSemesterProps {
  id: string;
  header: string;
  credits: number;
  workloadHours: number;
  children?: ReactNode;
}

export function DroppableSemester({ id, header, credits, workloadHours, children }: DroppableSemesterProps) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{header}</span>
        <span className="text-xs text-muted-foreground">{credits} cr • {workloadHours} h/wk</span>
      </div>
      <div
        ref={setNodeRef}
        data-semester-id={id}
        className={`rounded-lg border-2 p-3 min-h-[120px] transition-all duration-200
          ${isOver 
            ? 'border-primary bg-primary/15 scale-[0.98] shadow-inner' 
            : 'border-dashed border-muted bg-muted/20 hover:border-muted-foreground/50 hover:bg-muted/30'
          }`}
        aria-label={`${header} drop zone`}
      >
        {children}
      </div>
    </div>
  );
}
