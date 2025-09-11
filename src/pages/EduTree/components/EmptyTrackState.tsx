import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrackId } from '../tracks';

interface EmptyTrackStateProps {
  onSelectTrack: (trackId: TrackId) => void;
}

export function EmptyTrackState({ onSelectTrack }: EmptyTrackStateProps) {
  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <Card className="max-w-md mx-auto text-center border-2 border-dashed border-muted-foreground/30">
        <CardHeader>
          <CardTitle className="text-2xl">🎯 Track Comparison</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Select a track above to visualize your educational pathway and compare different specializations.
          </p>
          
          <div className="grid gap-2">
            <Button 
              variant="outline" 
              onClick={() => onSelectTrack('web')}
              className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
            >
              🌐 Web Frontend Track
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onSelectTrack('data')}
              className="bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
            >
              📊 Data Analytics Track
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onSelectTrack('systems')}
              className="bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
            >
              ⚙️ Systems & DevOps Track
            </Button>
          </div>

          <div className="text-xs text-muted-foreground mt-4 space-y-1">
            <p>💡 <strong>Single Track:</strong> See your focused pathway</p>
            <p>🔄 <strong>Compare Tracks:</strong> View shared foundations and unique specializations</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}