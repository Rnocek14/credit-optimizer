import React from 'react';
import { Target, Crown, TrendingUp } from 'lucide-react';

interface CareerDestinationNodeProps {
  careerPath: {
    id: string;
    title: string;
    level: string;
    track: string;
    average_salary?: number;
    roi_score?: number;
  };
  position: { x: number; y: number };
  isSelected?: boolean;
  isReachable?: boolean;
  completionPercentage?: number;
  onClick: () => void;
}

const getTrackIcon = (track: string) => {
  const icons = {
    design: '🎨',
    engineering: '⚛️', 
    data: '📊',
    product: '🚀',
    marketing: '📈',
    security: '🔒',
    general: '💼'
  };
  return icons[track as keyof typeof icons] || '💼';
};

const getTrackColor = (track: string) => {
  const colors = {
    design: 'hsl(var(--chart-1))',
    engineering: 'hsl(var(--chart-2))', 
    data: 'hsl(var(--chart-3))',
    product: 'hsl(var(--chart-4))',
    marketing: 'hsl(var(--chart-5))',
    security: 'hsl(var(--destructive))',
    general: 'hsl(var(--muted-foreground))'
  };
  return colors[track as keyof typeof colors] || 'hsl(var(--muted-foreground))';
};

export const CareerDestinationNode: React.FC<CareerDestinationNodeProps> = ({
  careerPath,
  position,
  isSelected = false,
  isReachable = false,
  completionPercentage = 0,
  onClick
}) => {
  const trackColor = getTrackColor(careerPath.track);
  const trackIcon = getTrackIcon(careerPath.track);

  return (
    <div
      className={`
        absolute cursor-pointer group transition-all duration-300 transform
        ${isSelected ? 'scale-110 z-30' : 'hover:scale-105 z-20'}
        ${!isReachable ? 'opacity-60' : ''}
      `}
      style={{
        left: position.x,
        top: position.y,
        transform: `translate(-50%, -50%) ${isSelected ? 'scale(1.1)' : ''}`
      }}
      onClick={onClick}
    >
      {/* Glow effect for selected */}
      {isSelected && (
        <div 
          className="absolute inset-0 rounded-2xl blur-lg opacity-50 animate-pulse"
          style={{ 
            background: `linear-gradient(135deg, ${trackColor}, transparent)`,
            transform: 'scale(1.2)'
          }}
        />
      )}
      
      {/* Main destination card */}
      <div 
        className={`
          relative bg-card border-2 rounded-2xl p-4 min-w-[200px] max-w-[250px]
          shadow-lg transition-all duration-300
          ${isSelected 
            ? 'border-primary shadow-2xl' 
            : 'border-border hover:border-primary/50'
          }
          ${!isReachable ? 'border-muted' : ''}
        `}
      >
        {/* Flag banner */}
        <div 
          className="absolute -top-3 -right-3 px-3 py-1 rounded-full text-xs font-semibold text-white flex items-center gap-1"
          style={{ backgroundColor: trackColor }}
        >
          <Target className="w-3 h-3" />
          GOAL
        </div>

        {/* Track icon and level */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-2xl">{trackIcon}</div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {careerPath.level === 'senior' && <Crown className="w-3 h-3" />}
            <span className="capitalize">{careerPath.level}</span>
          </div>
        </div>

        {/* Career title */}
        <h3 className="font-semibold text-sm mb-2 leading-tight">
          {careerPath.title}
        </h3>

        {/* Progress bar */}
        {completionPercentage > 0 && (
          <div className="mb-2">
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all duration-500"
                style={{ 
                  width: `${completionPercentage}%`,
                  backgroundColor: trackColor
                }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {completionPercentage}% Ready
            </div>
          </div>
        )}

        {/* Salary info */}
        {careerPath.average_salary && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <TrendingUp className="w-3 h-3" />
            <span>${(careerPath.average_salary / 1000).toFixed(0)}k avg</span>
          </div>
        )}

        {/* ROI indicator */}
        {careerPath.roi_score && careerPath.roi_score > 1.2 && (
          <div className="text-xs text-green-600 font-medium">
            High ROI Market
          </div>
        )}

        {/* Selection indicator */}
        {isSelected && (
          <div className="absolute inset-0 border-2 border-primary rounded-2xl animate-pulse" />
        )}
      </div>
    </div>
  );
};