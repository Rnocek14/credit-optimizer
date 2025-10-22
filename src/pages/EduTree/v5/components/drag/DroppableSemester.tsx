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
        className={`rounded-lg border p-3 min-h-[120px] transition-colors
          ${isOver ? 'border-primary bg-primary/10' : 'border-muted bg-muted/30'}`}
        aria-label={`${header} drop zone`}
      >
        {children || (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
            Drop courses here
          </div>
        )}
      </div>
    </div>
  );
}
