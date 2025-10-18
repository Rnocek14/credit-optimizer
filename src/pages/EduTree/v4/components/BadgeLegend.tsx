/**
 * BadgeLegend - Collapsible legend explaining badges and icons
 */
import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown, HelpCircle } from 'lucide-react';

const NODE_TYPES = [
  { type: 'solid', label: 'Concrete Course', description: 'Course locked in your plan' },
  { type: 'dashed', label: 'Placeholder', description: 'Choose from available options' },
];

const LEGEND_ITEMS = [
  { icon: '💻', label: 'Core', description: 'Core CS courses' },
  { icon: '📐', label: 'Math', description: 'Math & Science' },
  { icon: '📚', label: 'Gen Ed', description: 'General Education' },
  { icon: '🎯', label: 'Elective', description: 'Elective courses' },
  { icon: '🎓', label: 'Capstone', description: 'Capstone project' },
  { icon: '🔁', label: 'Transfer', description: 'Transfer credit' },
  { icon: '✅', label: 'Articulated', description: 'Guaranteed transfer via Florida articulation' },
  { icon: '⚠️', label: 'Non-Transfer', description: 'Does not count toward transfer limit' },
  { icon: '🛒', label: 'Marketplace', description: 'Selected from course marketplace' },
  { icon: '🍂', label: 'Fall', description: 'Fall semester' },
  { icon: '🌸', label: 'Spring', description: 'Spring semester' },
];

export const BadgeLegend: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="p-3 bg-card/95 backdrop-blur-sm border-border shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Badge Legend</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-6 w-6 p-0"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronUp className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isExpanded && (
        <div className="space-y-3 mt-2">
          {/* Node Types Section */}
          <div className="space-y-1.5">
            <h4 className="font-semibold text-xs text-muted-foreground">Node Types</h4>
            {NODE_TYPES.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-xs"
              >
                <div className={`w-4 h-4 flex-shrink-0 rounded mt-0.5 ${
                  item.type === 'solid' 
                    ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-2 border-dashed border-muted-foreground/50 bg-muted/20'
                }`} />
                <div className="flex-1">
                  <span className="font-medium">{item.label}:</span>{' '}
                  <span className="text-muted-foreground">{item.description}</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Badges Section */}
          <div className="space-y-1.5">
            <h4 className="font-semibold text-xs text-muted-foreground">Course Badges</h4>
            {LEGEND_ITEMS.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-xs"
              >
                <span className="text-base flex-shrink-0">{item.icon}</span>
                <div className="flex-1">
                  <span className="font-medium">{item.label}:</span>{' '}
                  <span className="text-muted-foreground">{item.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};
