import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, GitBranch } from 'lucide-react';

interface TransitionBlockData {
  title: string;
  description: string;
  availableTracks: Array<{
    id: string;
    title: string;
    color: string;
    isUnlocked: boolean;
  }>;
}

export function TransitionBlock({ data }: NodeProps) {
  const transitionData = data as unknown as TransitionBlockData;
  return (
    <div className="transition-block-wrapper">
      <Handle 
        type="target" 
        position={Position.Left}
        className="!bg-primary !border-2 !border-background !w-3 !h-3"
      />
      
      <Card className="w-80 bg-gradient-to-br from-card to-muted/50 border-primary/20 shadow-lg">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
              <GitBranch className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {transitionData.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {transitionData.description}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-medium text-foreground/80">
              Available Specializations:
            </div>
            
            {transitionData.availableTracks.map((track) => (
              <div 
                key={track.id}
                className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: track.color }}
                  />
                  <span className="text-sm font-medium">
                    {track.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {track.isUnlocked ? (
                    <Badge variant="secondary" className="text-xs">
                      Available
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs opacity-60">
                      Complete prerequisites
                    </Badge>
                  )}
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Handle 
        type="source" 
        position={Position.Right}
        className="!bg-primary !border-2 !border-background !w-3 !h-3"
      />
    </div>
  );
}