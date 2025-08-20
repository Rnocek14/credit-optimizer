import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Hammer, Plus, Settings } from 'lucide-react';

interface EmptyBuildStateProps {
  onOpenTrackManager: () => void;
  onCreateTrack: () => void;
}

export function EmptyBuildState({ onOpenTrackManager, onCreateTrack }: EmptyBuildStateProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center space-y-6 pt-8 pb-8">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Hammer className="w-8 h-8 text-muted-foreground" />
          </div>
          
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold">No Track Selected</h1>
            <p className="text-muted-foreground">
              Pick a track to start building your learning path, or create a new one.
            </p>
          </div>
          
          <div className="flex flex-col w-full space-y-3">
            <Button 
              onClick={onOpenTrackManager}
              className="w-full"
            >
              <Settings className="w-4 h-4 mr-2" />
              Open Track Manager
            </Button>
            
            <Button 
              variant="outline" 
              onClick={onCreateTrack}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Track
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}