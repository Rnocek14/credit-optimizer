import { Button } from '@/components/ui/button';
import { usePlanBasket } from '../state/usePlanBasket';
import { toast } from 'sonner';

interface TemplateActionsProps {
  moduleId: string;
  hasTemplate: boolean;
  onChangeTemplate: () => void;
  onAddCourse: () => void;
}

export function TemplateActions({ 
  moduleId, 
  hasTemplate, 
  onChangeTemplate,
  onAddCourse
}: TemplateActionsProps) {
  const pinAllItems = usePlanBasket(s => s.pinAllItems);
  const basket = usePlanBasket(s => s.items);
  
  const autoFilledCount = basket.filter(
    item => item.moduleId === moduleId && item.status === 'auto-filled'
  ).length;
  
  const handlePinAll = () => {
    pinAllItems(moduleId);
    toast.success('All courses pinned', {
      description: 'Template selections are now locked',
      duration: 3000
    });
  };
  
  return (
    <div className="flex gap-2">
      {/* Primary: Change template */}
      <Button
        variant="outline"
        size="sm"
        onClick={onChangeTemplate}
        className="flex-1 text-xs h-8"
      >
        {hasTemplate ? 'Change Template' : 'Browse Templates'}
      </Button>
      
      {/* Secondary: Add course */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onAddCourse}
        className="text-xs h-8"
        title="Add individual course"
      >
        + Course
      </Button>
      
      {/* Tertiary: Pin all (only show if auto-filled courses exist) */}
      {autoFilledCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePinAll}
          className="text-xs h-8"
          title="Lock all auto-filled selections"
        >
          📌 Pin All
        </Button>
      )}
    </div>
  );
}
