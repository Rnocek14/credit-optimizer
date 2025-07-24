import React from 'react';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2, Search, Filter } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

interface SkillTreeControlsProps {
  onFitView: () => void;
  onToggleSearch?: () => void;
  onToggleFilter?: () => void;
}

export const SkillTreeControls: React.FC<SkillTreeControlsProps> = ({
  onFitView,
  onToggleSearch,
  onToggleFilter
}) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const handleFitView = () => {
    fitView({ padding: 0.1 });
    onFitView();
  };

  return (
    <div className="absolute top-4 right-4 z-10 flex gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleFitView}
        className="bg-white shadow-sm"
      >
        <Maximize2 className="w-4 h-4" />
      </Button>
      
      <Button
        size="sm"
        variant="outline"
        onClick={() => zoomIn()}
        className="bg-white shadow-sm"
      >
        <ZoomIn className="w-4 h-4" />
      </Button>
      
      <Button
        size="sm"
        variant="outline"
        onClick={() => zoomOut()}
        className="bg-white shadow-sm"
      >
        <ZoomOut className="w-4 h-4" />
      </Button>

      {onToggleSearch && (
        <Button
          size="sm"
          variant="outline"
          onClick={onToggleSearch}
          className="bg-white shadow-sm"
        >
          <Search className="w-4 h-4" />
        </Button>
      )}

      {onToggleFilter && (
        <Button
          size="sm"
          variant="outline"
          onClick={onToggleFilter}
          className="bg-white shadow-sm"
        >
          <Filter className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};