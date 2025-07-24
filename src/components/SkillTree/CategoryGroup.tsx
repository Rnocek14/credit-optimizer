import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CategoryGroupProps {
  category: string;
  color: string;
  skillCount: number;
  isExpanded: boolean;
  onToggle: () => void;
  position: { x: number; y: number };
  width: number;
}

export const CategoryGroup: React.FC<CategoryGroupProps> = ({
  category,
  color,
  skillCount,
  isExpanded,
  onToggle,
  position,
  width
}) => {
  return (
    <div
      className="absolute z-0"
      style={{
        left: position.x - 10,
        top: position.y - 30,
        width: width + 20,
        height: isExpanded ? 'auto' : 40
      }}
    >
      <div 
        className={cn(
          "border-2 border-dashed rounded-lg bg-white/50 backdrop-blur-sm",
          "transition-all duration-200"
        )}
        style={{ borderColor: color + '40' }}
      >
        {/* Category header */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="absolute -top-2 left-2 h-6 px-2 text-xs font-medium bg-white border shadow-sm"
          style={{ color }}
        >
          {isExpanded ? (
            <FolderOpen className="w-3 h-3 mr-1" />
          ) : (
            <Folder className="w-3 h-3 mr-1" />
          )}
          {category}
          <span className="ml-1 text-gray-500">({skillCount})</span>
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 ml-1" />
          ) : (
            <ChevronRight className="w-3 h-3 ml-1" />
          )}
        </Button>
        
        {/* Expanded content area */}
        {isExpanded && (
          <div className="pt-6 pb-4 px-4 min-h-[120px]">
            {/* Skills will be rendered inside this area */}
          </div>
        )}
      </div>
    </div>
  );
};