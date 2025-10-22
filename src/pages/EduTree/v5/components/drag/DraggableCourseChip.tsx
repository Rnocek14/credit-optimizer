import { useDraggable } from '@dnd-kit/core';
import type { MarketplaceOption } from '../../types/v5';

interface DraggableCourseChipProps {
  course: MarketplaceOption;
}

export function DraggableCourseChip({ course }: DraggableCourseChipProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `course-${course.id}`,
    data: { course }
  });

  const style = transform 
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } 
    : undefined;

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      aria-label={`Drag ${course.title}, ${course.credits} credits`}
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 bg-card text-sm hover:shadow transition-shadow cursor-grab active:cursor-grabbing"
    >
      <span className="truncate max-w-[160px]">{course.title}</span>
      <span className="text-xs text-muted-foreground">{course.credits}cr</span>
      {/* Provider icon and CRI dot can be added later */}
    </button>
  );
}
