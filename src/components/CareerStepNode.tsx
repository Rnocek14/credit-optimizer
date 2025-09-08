import React from 'react';

interface CareerStepNodeProps {
  step: {
    id: string;
    title: string;
    level: number;
    is_checkpoint?: boolean;
    is_capstone?: boolean;
    is_terminal?: boolean;
    estimated_duration?: string;
    completed?: boolean;
  };
  position: { x: number; y: number };
  isCompleted?: boolean;
  isInProgress?: boolean;
  isInPath?: boolean;
  onClick?: (step: any) => void;
  zoomLevel?: number;
}

export const CareerStepNode: React.FC<CareerStepNodeProps> = ({
  step,
  position,
  isCompleted = false,
  isInProgress = false,
  isInPath = false,
  onClick,
  zoomLevel = 1
}) => {
  const handleClick = () => {
    onClick?.(step);
  };

  // Enhanced styling for career steps with terminal emphasis
  const isTerminal = step.is_terminal;
  
  const stepStyle = {
    backgroundColor: isCompleted 
      ? 'hsl(var(--primary))' 
      : isInProgress 
        ? 'hsl(var(--warning))' 
        : isTerminal
          ? '#fef3c7' // Light gold background for terminal steps
          : 'hsl(var(--muted))',
    color: isCompleted || isInProgress 
      ? 'hsl(var(--primary-foreground))' 
      : isTerminal
        ? '#92400e' // Dark gold text for terminal steps
        : 'hsl(var(--muted-foreground))',
    border: `${isTerminal ? '3px' : '2px'} solid ${
      isTerminal
        ? '#facc15' // Gold border for terminal steps
        : step.is_capstone 
          ? 'hsl(var(--primary))' 
          : step.is_checkpoint 
            ? 'hsl(var(--secondary))' 
            : isInPath
              ? 'hsl(var(--primary))'
              : 'hsl(var(--border))'
    }`,
    borderRadius: '12px',
    padding: '12px',
    minWidth: '120px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: isTerminal ? 600 : 500,
    transition: 'all 0.2s ease',
    transform: `scale(${Math.max(0.8, zoomLevel)})`,
    transformOrigin: 'center',
    boxShadow: isTerminal 
      ? '0 0 20px rgba(250, 204, 21, 0.3), 0 4px 12px rgba(0,0,0,0.1)' 
      : isInPath
        ? '0 0 15px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(0,0,0,0.1)'
        : '0 2px 8px rgba(0,0,0,0.1)',
    ...(isTerminal && {
      animation: 'pulse 2s infinite'
    })
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
      className="hover-quiet transition-transform cursor-pointer"
    >
      <div className="text-xs font-medium mb-1">
        {step.is_terminal && '🎯 '}
        {step.is_capstone && '🎯 '}
        {step.is_checkpoint && '📍 '}
        Step {step.level + 1}
      </div>
      <div className="font-semibold">
        {step.is_terminal && '🎯 '}
        {step.title}
      </div>
      {step.estimated_duration && (
        <div className="text-xs opacity-75 mt-1">
          ⏱️ {step.estimated_duration}
        </div>
      )}
      {step.is_terminal && (
        <div className="text-xs font-medium mt-1 text-amber-700">
          Goal: Final step for this path
        </div>
      )}
    </div>
  );
};