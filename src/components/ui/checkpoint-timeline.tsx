import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  History, 
  GitBranch, 
  RotateCcw, 
  Info, 
  Plus, 
  Minus,
  Clock,
  BookOpen,
  Target
} from 'lucide-react';
import { UserCheckpoint, UserState } from '@/types/lifePathGraph';

interface CheckpointTimelineProps {
  checkpoints: UserCheckpoint[];
  currentUserState: UserState;
  onRestoreCheckpoint: (checkpoint: UserCheckpoint) => void;
  onCreateBranch: (checkpoint: UserCheckpoint) => void;
  onCreateCheckpoint: () => void;
}

export function CheckpointTimeline({ 
  checkpoints, 
  currentUserState,
  onRestoreCheckpoint,
  onCreateBranch,
  onCreateCheckpoint
}: CheckpointTimelineProps) {
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<UserCheckpoint | null>(null);

  const sortedCheckpoints = useMemo(() => 
    [...checkpoints].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [checkpoints]
  );

  const getDiffSummary = (checkpoint: UserCheckpoint) => {
    const changes = checkpoint.changesSince;
    if (!changes) return null;

    const totalChanges = changes.added.length + changes.removed.length + changes.completed.length;
    return {
      total: totalChanges,
      added: changes.added.length,
      removed: changes.removed.length,
      completed: changes.completed.length
    };
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  if (checkpoints.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center h-32 text-center">
          <History className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground mb-3">No checkpoints created yet</p>
          <Button onClick={onCreateCheckpoint} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create First Checkpoint
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Checkpoint Timeline
          </div>
          <Button onClick={onCreateCheckpoint} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Save Checkpoint
          </Button>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Track your planning progress and restore previous states
        </p>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4">
            {sortedCheckpoints.map((checkpoint, index) => {
              const diffSummary = getDiffSummary(checkpoint);
              const isLatest = index === 0;
              
              return (
                <div key={checkpoint.id} className="relative">
                  {/* Timeline connector */}
                  {index < sortedCheckpoints.length - 1 && (
                    <div className="absolute left-6 top-12 w-0.5 h-8 bg-border" />
                  )}
                  
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isLatest 
                        ? 'bg-primary border-primary text-primary-foreground' 
                        : 'bg-background border-border text-muted-foreground'
                    }`}>
                      {isLatest ? <Target className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-foreground">{checkpoint.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {getRelativeTime(checkpoint.createdAt)}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {isLatest && (
                            <Badge variant="secondary" className="text-xs">
                              Current
                            </Badge>
                          )}
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setSelectedCheckpoint(checkpoint)}
                              >
                                <Info className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Checkpoint Details</DialogTitle>
                              </DialogHeader>
                              <CheckpointDetails 
                                checkpoint={checkpoint} 
                                onRestore={() => onRestoreCheckpoint(checkpoint)}
                                onCreateBranch={() => onCreateBranch(checkpoint)}
                              />
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                      
                      {checkpoint.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {checkpoint.description}
                        </p>
                      )}
                      
                      {diffSummary && (
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {diffSummary.total} changes
                          </Badge>
                          {diffSummary.added > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              <Plus className="w-3 h-3 mr-1" />
                              {diffSummary.added} added
                            </Badge>
                          )}
                          {diffSummary.completed > 0 && (
                            <Badge variant="default" className="text-xs">
                              <BookOpen className="w-3 h-3 mr-1" />
                              {diffSummary.completed} completed
                            </Badge>
                          )}
                          {diffSummary.removed > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              <Minus className="w-3 h-3 mr-1" />
                              {diffSummary.removed} removed
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function CheckpointDetails({ 
  checkpoint, 
  onRestore, 
  onCreateBranch 
}: { 
  checkpoint: UserCheckpoint; 
  onRestore: () => void;
  onCreateBranch: () => void;
}) {
  const { planSnapshot, changesSince } = checkpoint;

  return (
    <div className="space-y-4">
      <div>
        <h4 className="font-medium mb-2">Snapshot Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Goal:</span>
            <p className="font-medium">{planSnapshot.goalId || 'None selected'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Selected Nodes:</span>
            <p className="font-medium">{planSnapshot.selectedNodeIds.length}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Completed:</span>
            <p className="font-medium">{planSnapshot.completedNodeIds.length}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Max Budget:</span>
            <p className="font-medium">
              {planSnapshot.preferences.maxCost 
                ? `$${planSnapshot.preferences.maxCost.toLocaleString()}`
                : 'No limit'
              }
            </p>
          </div>
        </div>
      </div>

      {changesSince && (
        <>
          <Separator />
          <div>
            <h4 className="font-medium mb-2">Changes Since Checkpoint</h4>
            <div className="space-y-2">
              {changesSince.added.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-green-600">Added ({changesSince.added.length})</p>
                  <ul className="text-xs text-muted-foreground ml-4">
                    {changesSince.added.slice(0, 3).map(id => (
                      <li key={id}>• {id}</li>
                    ))}
                    {changesSince.added.length > 3 && (
                      <li>• ... and {changesSince.added.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}
              
              {changesSince.completed.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-blue-600">Completed ({changesSince.completed.length})</p>
                  <ul className="text-xs text-muted-foreground ml-4">
                    {changesSince.completed.slice(0, 3).map(id => (
                      <li key={id}>• {id}</li>
                    ))}
                    {changesSince.completed.length > 3 && (
                      <li>• ... and {changesSince.completed.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}
              
              {changesSince.removed.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-red-600">Removed ({changesSince.removed.length})</p>
                  <ul className="text-xs text-muted-foreground ml-4">
                    {changesSince.removed.slice(0, 3).map(id => (
                      <li key={id}>• {id}</li>
                    ))}
                    {changesSince.removed.length > 3 && (
                      <li>• ... and {changesSince.removed.length - 3} more</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <Separator />
      <div className="flex gap-2">
        <Button onClick={onRestore} variant="default" className="flex-1">
          <RotateCcw className="w-4 h-4 mr-2" />
          Restore State
        </Button>
        <Button onClick={onCreateBranch} variant="outline" className="flex-1">
          <GitBranch className="w-4 h-4 mr-2" />
          Create Branch
        </Button>
      </div>
    </div>
  );
}