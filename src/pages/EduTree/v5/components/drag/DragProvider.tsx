import { ReactNode } from 'react';
import { DndContext, MouseSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, closestCenter, DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';

interface DragProviderProps {
  children: ReactNode;
  onDragStart?: (event: DragStartEvent) => void;
  onDragOver?: (event: DragOverEvent) => void;
  onDragEnd?: (event: DragEndEvent) => void;
}

export function DragProvider({ children, onDragStart, onDragOver, onDragEnd }: DragProviderProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 3 } }),
    useSensor(KeyboardSensor)
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      {children}
    </DndContext>
  );
}
