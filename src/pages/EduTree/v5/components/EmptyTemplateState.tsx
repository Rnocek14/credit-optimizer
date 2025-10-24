import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface EmptyTemplateStateProps {
  templateLabel?: string;
  onBrowseTemplates: () => void;
  onAddCourse: () => void;
}

export function EmptyTemplateState({ 
  templateLabel, 
  onBrowseTemplates, 
  onAddCourse 
}: EmptyTemplateStateProps) {
  return (
    <div className="p-6 border-2 border-dashed rounded-lg text-center space-y-3">
      <div className="text-4xl">📝</div>
      <div>
        <h4 className="font-semibold text-sm">No courses selected</h4>
        <p className="text-xs text-muted-foreground mt-1">
          {templateLabel 
            ? `Template "${templateLabel}" was applied but all courses were removed`
            : 'Add courses to this module to get started'
          }
        </p>
      </div>
      <div className="flex gap-2 justify-center">
        <Button variant="outline" size="sm" onClick={onBrowseTemplates}>
          Browse Templates
        </Button>
        <Button size="sm" onClick={onAddCourse}>
          <Plus className="w-3 h-3 mr-1" />
          Add Course
        </Button>
      </div>
    </div>
  );
}
