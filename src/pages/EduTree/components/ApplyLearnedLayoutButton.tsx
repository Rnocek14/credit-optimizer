import React from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

/**
 * Button to apply the learned layout algorithm and lock nodes back in place
 */
export function ApplyLearnedLayoutButton() {
  const handleApplyLayout = () => {
    const positions = (window as any).manualPositions;
    if (!positions || Object.keys(positions).length === 0) {
      toast({
        title: "No Manual Positions",
        description: "Drag some nodes around first, then try applying the learned layout.",
        variant: "destructive",
      });
      return;
    }

    // Store the learned layout flag and trigger a refresh
    localStorage.setItem('eduTreeUseLearned', 'true');
    
    toast({
      title: "Layout Applied! 🎯",
      description: "The algorithm learned from your positioning. Refreshing to apply learned layout...",
      duration: 3000,
    });

    // Refresh the page to apply the learned layout
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleResetToOriginal = () => {
    localStorage.removeItem('eduTreeUseLearned');
    (window as any).manualPositions = {};
    
    toast({
      title: "Reset to Original",
      description: "Refreshing to show original layout...",
    });

    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const isUsingLearned = localStorage.getItem('eduTreeUseLearned') === 'true';

  return (
    <div className="space-y-2">
      {!isUsingLearned ? (
        <Button 
          onClick={handleApplyLayout} 
          size="sm" 
          className="w-full text-xs"
          variant="default"
        >
          🎯 Apply Learned Layout
        </Button>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-green-600 font-medium">
            ✅ Using Learned Layout
          </div>
          <Button 
            onClick={handleResetToOriginal} 
            size="sm" 
            className="w-full text-xs"
            variant="outline"
          >
            Reset to Original
          </Button>
        </div>
      )}
    </div>
  );
}