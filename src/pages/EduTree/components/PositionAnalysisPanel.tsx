import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Panel for analyzing and exporting manual node positions
 */
export function PositionAnalysisPanel() {
  const handleExport = () => {
    if ((window as any).exportManualPositions) {
      (window as any).exportManualPositions();
    }
  };

  const handleClear = () => {
    if ((window as any).clearManualPositions) {
      (window as any).clearManualPositions();
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
          <br />• Export captures positions
          <br />• Check console for JSON data
        </div>
      </CardContent>
    </Card>
  );
}