import React from 'react';

interface CareerStepNodeProps {
  step: {
    id: string;
    title: string;
    level: number;
    is_checkpoint?: boolean;
    is_capstone?: boolean;
    estimated_duration?: string;
    completed?: boolean;
  };
  position: { x: number; y: number };
  isCompleted?: boolean;
  isInProgress?: boolean;
  onClick?: (step: any) => void;
  zoomLevel: number;
}

export const CareerStepNode: React.FC<CareerStepNodeProps> = ({
  step,
  position,
  isCompleted = false,
  isInProgress = false,
  onClick,
  zoomLevel
}) => {
  const handleClick = () => {
    onClick?.(step);
  };

  // Use a lighter, more muted styling for career steps vs skills
  const stepStyle = {
    backgroundColor: isCompleted 
      ? 'hsl(var(--primary))' 
      : isInProgress 
        ? 'hsl(var(--warning))' 
        : 'hsl(var(--muted))',
    color: isCompleted || isInProgress 
      ? 'hsl(var(--primary-foreground))' 
      : 'hsl(var(--muted-foreground))',
    border: `2px solid ${
      step.is_capstone 
        ? 'hsl(var(--primary))' 
        : step.is_checkpoint 
          ? 'hsl(var(--secondary))' 
          : 'hsl(var(--border))'
    }`,
    borderRadius: '12px',
    padding: '12px',
    minWidth: '120px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    transform: `scale(${Math.max(0.8, zoomLevel)})`,
    transformOrigin: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: 10,
        ...stepStyle
      }}
      onClick={handleClick}
      className="hover:scale-110 transition-transform"
    >
      <div className="text-xs font-medium mb-1">
        {step.is_capstone && '🎯 '}
        {step.is_checkpoint && '📍 '}
        Step {step.level + 1}
      </div>
      <div className="font-semibold">{step.title}</div>
      {step.estimated_duration && (
        <div className="text-xs opacity-75 mt-1">
          ⏱️ {step.estimated_duration}
        </div>
      )}
    </div>
  );
};