import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card } from '@/components/ui/card';
import { 
  Eye, 
  Code, 
  Smartphone, 
  GitCompare, 
  RotateCcw, 
  Layers,
  Search,
  Filter
} from 'lucide-react';
import { useFocus } from '../contexts/FocusContext';

interface FocusToolbarProps {
  onSearch?: (query: string) => void;
  onFilter?: () => void;
  className?: string;
}

export function FocusToolbar({ onSearch, onFilter, className = '' }: FocusToolbarProps) {
  const { focusState, setFocusMode, setDisclosureLevel, resetFocus } = useFocus();

  const focusModes = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Eye,
      description: 'See all tracks and blocks'
    },
    {
      id: 'web-track',
      label: 'Web Dev',
      icon: Code,
      description: 'Focus on web development track'
    },
    {
      id: 'mobile-track',
      label: 'Mobile Dev',
      icon: Smartphone,
      description: 'Focus on mobile development track'
    },
    {
      id: 'compare-tracks',
      label: 'Compare',
      icon: GitCompare,
      description: 'Side-by-side track comparison'
    }
  ];

  const disclosureLevels = [
    { id: 'summary', label: 'Summary' },
    { id: 'details', label: 'Details' },
    { id: 'full', label: 'Full' }
  ];

  return (
    <Card className={`p-3 bg-background/95 backdrop-blur-sm border-muted ${className}`}>
      <div className="flex items-center justify-between gap-4">
        {/* Focus Mode Controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Focus:</span>
          <div className="flex items-center gap-1">
            {focusModes.map((mode) => {
              const Icon = mode.icon;
              const isActive = focusState.mode === mode.id;
              
              return (
                <Button
                  key={mode.id}
                  variant={isActive ? "default" : "ghost"}
                  size="sm" 
                  onClick={() => setFocusMode(mode.id as any)}
                  className="h-8 px-3"
                  title={mode.description}
                >
                  <Icon className="w-4 h-4 mr-1" />
                  {mode.label}
                </Button>
              );
            })}
          </div>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Disclosure Level Controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Detail:</span>
          <div className="flex items-center gap-1">
            {disclosureLevels.map((level) => {
              const isActive = focusState.disclosureLevel === level.id;
              
              return (
                <Button
                  key={level.id}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setDisclosureLevel(level.id as any)}
                  className="h-7 px-2 text-xs"
                >
                  {level.label}
                </Button>
              );
            })}
          </div>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Utility Controls */}
        <div className="flex items-center gap-2">
          {onSearch && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSearch?.('')}
              className="h-8 px-3"
              title="Search courses"
            >
              <Search className="w-4 h-4" />
            </Button>
          )}
          
          {onFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onFilter}
              className="h-8 px-3"
              title="Filter options"
            >
              <Filter className="w-4 h-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={resetFocus}
            className="h-8 px-3"
            title="Reset to overview"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        </div>

        {/* Focus State Indicator */}
        {focusState.mode !== 'overview' && (
          <Badge variant="outline" className="text-xs">
            <Layers className="w-3 h-3 mr-1" />
            {focusState.mode.replace('-', ' ')}
          </Badge>
        )}
      </div>
    </Card>
  );
}