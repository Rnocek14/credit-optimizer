import React, { useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, ChevronRight, Code, Smartphone, Eye, Focus } from 'lucide-react';
import { BlockWithCourses, getBlockProgressText, isBlockComplete } from '@/lib/types/eduTree';
import { CourseNode } from './CourseNode';
import { useFocus } from '../contexts/FocusContext';

interface SpecializationTrackData {
  track: 'web' | 'mobile';
  blocks: BlockWithCourses[];
  completedCourseIds: Set<string>;
  isUnlocked: boolean;
}

export function SpecializationTrack(props: NodeProps) {
  const { track, blocks, completedCourseIds, isUnlocked } = props.data as unknown as SpecializationTrackData;
  const { focusState, setFocusMode, setDisclosureLevel, highlightTrack } = useFocus();
  const [expanded, setExpanded] = useState(false);
  
  const trackConfig = {
    web: {
      title: 'Web Development Track',
      icon: Code,
      color: 'hsl(var(--primary))',
      bgColor: 'bg-primary/5',
      borderColor: 'border-primary/20',
      accentColor: 'border-l-primary'
    },
    mobile: {
      title: 'Mobile Development Track', 
      icon: Smartphone,
      color: 'hsl(var(--accent))',
      bgColor: 'bg-accent/5',
      borderColor: 'border-accent/20',
      accentColor: 'border-l-accent'
    }
  };

  const config = trackConfig[track];
  const TrackIcon = config.icon;
  
  // Calculate overall track progress
  const totalCourses = blocks.reduce((sum, block) => sum + block.courses.length, 0);
  const completedCourses = blocks.reduce((sum, block) => 
    sum + block.courses.filter(c => completedCourseIds.has(c.id)).length, 0
  );
  const progressPercent = totalCourses > 0 ? (completedCourses / totalCourses) * 100 : 0;
  
  const isHighlighted = focusState.highlightedTrack === track;
  const isFocused = focusState.mode === `${track}-track`;
  const showDetails = focusState.disclosureLevel !== 'summary' || expanded;
  
  const handleFocus = () => {
    if (isFocused) {
      setFocusMode('overview');
    } else {
      setFocusMode(`${track}-track` as any);
      setDisclosureLevel('details');
    }
  };

  const handleTrackHover = (isHovering: boolean) => {
    highlightTrack(isHovering ? track : null);
  };

  return (
    <div className="relative">
      {/* Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-primary border-2 border-background"
        style={{ left: -6, top: '20%' }}
      />

      <Card className={`
        min-w-[360px] max-w-[360px] transition-all duration-300
        ${!isUnlocked ? 'opacity-60' : ''}
        ${config.bgColor} ${config.borderColor} border-l-4 ${config.accentColor}
        ${isHighlighted ? 'ring-2 ring-primary/50 shadow-lg scale-[1.02]' : ''}
        ${isFocused ? 'ring-2 ring-primary shadow-xl scale-[1.05]' : ''}
        hover:shadow-md
      `}
        onMouseEnter={() => handleTrackHover(true)}
        onMouseLeave={() => handleTrackHover(false)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrackIcon className="w-5 h-5" style={{ color: config.color }} />
              {config.title}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFocus}
                className="h-8 px-3"
              >
                {isFocused ? (
                  <>
                    <Eye className="w-4 h-4 mr-1" />
                    Exit Focus
                  </>
                ) : (
                  <>
                    <Focus className="w-4 h-4 mr-1" />
                    Focus Mode
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Track Progress Summary */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {blocks.length} specialization{blocks.length !== 1 ? 's' : ''}
              </span>
              <span className="text-muted-foreground text-xs">
                {completedCourses}/{totalCourses} courses
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Track Overview - Always Visible */}
          <div className="mb-4 p-3 rounded-lg bg-background/50">
            <div className="grid grid-cols-2 gap-2 text-xs">
              {blocks.slice(0, 2).map((block) => {
                const blockProgress = {
                  completed: block.courses.filter(c => completedCourseIds.has(c.id)).length,
                  required: block.courses.length
                };
                return (
                  <div key={block.id} className="p-2 rounded bg-card border">
                    <div className="font-medium mb-1 truncate">{block.title}</div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {getBlockProgressText(block, block.courses)}
                      </Badge>
                      <span className="text-muted-foreground">
                        {blockProgress.completed}/{blockProgress.required}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expandable Details */}
          <div className="flex items-center justify-between mb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-8 px-0 text-muted-foreground hover:text-foreground"
            >
              {showDetails ? (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  Hide Details
                </>
              ) : (
                <>
                  <ChevronRight className="w-4 h-4 mr-1" />
                  View All Courses
                </>
              )}
            </Button>
            
            {!showDetails && (
              <Badge variant="secondary" className="text-xs">
                {totalCourses} courses total
              </Badge>
            )}
          </div>

          {/* Detailed Course View */}
          {showDetails && (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {blocks.map((block) => (
                <div key={block.id} className="border rounded-lg p-3 bg-background/30">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-sm">{block.title}</h4>
                    <Badge variant="outline" className="text-xs">
                      {getBlockProgressText(block, block.courses)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {block.courses.slice(0, isFocused ? block.courses.length : 3).map((course) => (
                      <div key={course.id} className="scale-90 origin-left">
                        <CourseNode
                          course={course}
                          isCompleted={completedCourseIds.has(course.id)}
                          compact={true}
                        />
                      </div>
                    ))}
                    
                    {!isFocused && block.courses.length > 3 && (
                      <div className="text-xs text-center text-muted-foreground py-2">
                        +{block.courses.length - 3} more courses
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isUnlocked && (
            <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground text-center">
              Complete prerequisites to unlock this track
            </div>
          )}
        </CardContent>
      </Card>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-primary border-2 border-background"
        style={{ right: -6, top: '20%' }}
      />
    </div>
  );
}