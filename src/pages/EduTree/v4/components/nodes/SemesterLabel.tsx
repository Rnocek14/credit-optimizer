/**
 * SemesterLabel - Displays "Fall" / "Spring" headers above course columns
 */
import React from 'react';

interface SemesterLabelProps {
  semester: 'fall' | 'spring';
  position: { x: number; y: number };
}

export function SemesterLabel({ semester, position }: SemesterLabelProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, 0)',
        zIndex: 100,
      }}
      className="px-3 py-1 rounded-md bg-muted/50 text-muted-foreground text-xs font-semibold uppercase tracking-wide border border-border/30"
    >
      {semester === 'fall' ? '🍂 Fall Semester' : '🌸 Spring Semester'}
    </div>
  );
}
