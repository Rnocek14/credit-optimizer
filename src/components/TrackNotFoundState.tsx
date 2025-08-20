import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TrackNotFoundStateProps {
  reason?: 'not-found' | 'archived' | 'access-denied';
  onOpenTrackManager: () => void;
}

export function TrackNotFoundState({ reason = 'not-found', onOpenTrackManager }: TrackNotFoundStateProps) {
  const navigate = useNavigate();

  const getContent = () => {
    switch (reason) {
      case 'archived':
        return {
          title: 'Track Archived',
          description: 'This track has been archived and is no longer available for editing.',
        };
      case 'access-denied':
        return {
          title: 'Access Denied',
          description: 'You don\'t have permission to access this track.',
        };
      default:
        return {
          title: 'Track Not Found',
          description: 'The requested track could not be found or no longer exists.',
        };
    }
  };

  const content = getContent();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center space-y-6 pt-8 pb-8">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold">{content.title}</h1>
            <p className="text-muted-foreground">
              {content.description}
            </p>
          </div>
          
          <div className="flex flex-col w-full space-y-3">
            <Button 
              onClick={onOpenTrackManager}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Open Track Manager
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => navigate('/hub')}
              className="w-full"
            >
              Back to Hub
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}