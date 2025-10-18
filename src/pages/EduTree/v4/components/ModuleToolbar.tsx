/**
 * ModuleToolbar - Bulk expand/collapse controls
 */
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ModuleToolbarProps {
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

export const ModuleToolbar: React.FC<ModuleToolbarProps> = ({
  onExpandAll,
  onCollapseAll,
}) => {
  return (
    <Card className="p-2 bg-card/95 backdrop-blur-sm border-border shadow-sm">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground mr-1">
          Modules:
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={onExpandAll}
          className="h-7 text-xs"
        >
          <ChevronDown className="h-3 w-3 mr-1" />
          Expand All
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onCollapseAll}
          className="h-7 text-xs"
        >
          <ChevronRight className="h-3 w-3 mr-1" />
          Collapse All
        </Button>
      </div>
    </Card>
  );
};
