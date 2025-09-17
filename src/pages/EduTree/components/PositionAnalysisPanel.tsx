import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';

/**
 * Panel for analyzing and exporting manual node positions
 */
export function PositionAnalysisPanel() {
  const [exportCount, setExportCount] = useState(0);

  const handleExport = () => {
    if ((window as any).exportManualPositions) {
      const positions = (window as any).exportManualPositions();
      if (positions && Object.keys(positions).length > 0) {
        setExportCount(Object.keys(positions).length);
        toast({
          title: "Positions Exported! ✅",
          description: `${Object.keys(positions).length} node positions copied to clipboard and logged to console. Press F12 to view console.`,
          duration: 5000,
        });
      } else {
        toast({
          title: "No Positions to Export",
          description: "Drag some nodes around first, then try exporting.",
          variant: "destructive",
        });
      }
    }
  };

  const handleClear = () => {
    if ((window as any).clearManualPositions) {
      (window as any).clearManualPositions();
      setExportCount(0);
      toast({
        title: "Positions Cleared",
        description: "All manual positions have been reset.",
      });
    }
  };

  return (
    <Card className="w-64">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Position Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-xs text-muted-foreground mb-3">
          Drag nodes to position them manually. Use the buttons below to capture and analyze your layout.
          {exportCount > 0 && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-green-700">
              ✅ {exportCount} positions captured
            </div>
          )}
        </div>
        
        <Button 
          onClick={handleExport} 
          size="sm" 
          className="w-full text-xs"
          variant="outline"
        >
          Export Positions
        </Button>
        
        <Button 
          onClick={handleClear} 
          size="sm" 
          className="w-full text-xs"
          variant="outline"
        >
          Clear Positions
        </Button>
        
        <div className="text-xs text-muted-foreground pt-2 border-t">
          <strong>Instructions:</strong>
          <br />• Drag nodes to correct positions
          <br />• Export copies to clipboard + console
          <br />• Press F12 to open browser console
          <br />• Look for "📍 MANUAL POSITIONS CAPTURED"
        </div>
      </CardContent>
    </Card>
  );
}