import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Lock, CheckCircle, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BlockWithCourses, getBlockProgressText, isBlockComplete, AltCreditOption } from '@/lib/types/eduTree';
import { CourseNode } from './CourseNode';
import { useNodeResize } from '@/hooks/useNodeResize';
import { useFeatureFlags } from '@/lib/featureFlags';

export function BlockGroup(props: NodeProps) {
  const flags = useFeatureFlags();
  const nodeRef = useRef<HTMLDivElement>(null);
  const { attachResizeObserver, detachResizeObserver } = useNodeResize(props.id);
  
  const { 
    block, 
    completedCourseIds, 
    isUnlocked, 
    progress, 
    subBlocks = [], 
    altCreditOptions = [],
    isHighlighted = false,
    planningLens = null
  } = props.data as {
    block: BlockWithCourses;
    completedCourseIds: Set<string>;
    isUnlocked: boolean;
    progress: { completed: number; required: number };
    subBlocks?: BlockWithCourses[];
    altCreditOptions?: AltCreditOption[];
    isHighlighted?: boolean;
    planningLens?: string | null;
  };
  
  const [showAltCredits, setShowAltCredits] = useState(false);
  const [subBlocksExpanded, setSubBlocksExpanded] = useState(false);
  
  const isComplete = isBlockComplete(block, block.courses, completedCourseIds);
  const progressText = getBlockProgressText(block, block.courses);
  const progressPercent = progress.required > 0 ? (progress.completed / progress.required) * 100 : 0;
  const hasSubBlocks = subBlocks.length > 0;
  const hasAltCredits = altCreditOptions.length > 0;

  // Attach resize observer when layoutV2 is enabled
  useEffect(() => {
    if (flags.eduTreeLayoutV2 && nodeRef.current) {
      attachResizeObserver(nodeRef.current);
      return () => detachResizeObserver();
    }
  }, [flags.eduTreeLayoutV2, attachResizeObserver, detachResizeObserver]);

  return (
    <div className="relative" ref={nodeRef}>
      {/* Fixed connection handles for better edge routing */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-primary border-2 border-background"
        style={{ left: -6 }}
      />

      <Card className={`
        min-w-[320px] max-w-[320px] 
        ${!isUnlocked ? 'opacity-60' : ''}
        ${isComplete ? 'border-primary bg-primary/10 ring-1 ring-primary/25' : 'border-muted-foreground/40 bg-card hover:border-muted-foreground/60'}
        ${isHighlighted ? 'ring-2 ring-primary shadow-xl border-primary' : ''}
        ${planningLens ? 'border-l-4 border-l-accent' : ''}
        transition-all duration-200
      `}>
        <CardHeader className="pb-3 space-y-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {!isUnlocked && <Lock className="w-4 h-4 text-muted-foreground" />}
              {isComplete && <CheckCircle className="w-4 h-4 text-primary" />}
              {block.title}
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Year {block.level_year}
              </Badge>
              {hasAltCredits && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => setShowAltCredits(!showAltCredits)}
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Alt Credit
                </Button>
              )}
              {planningLens && (
                <Badge variant="secondary" className="text-xs">
                  {planningLens}
                </Badge>
              )}
            </div>
          </div>
          
          {/* Rule and progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <Badge variant="secondary" className="text-xs">
                {progressText}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {progress.completed}/{progress.required}
              </span>
            </div>
            
            <Progress value={progressPercent} className="h-3" />
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Sub-blocks if any */}
          {hasSubBlocks && (
            <Collapsible open={subBlocksExpanded} onOpenChange={setSubBlocksExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-8 mb-2">
                  <span className="text-sm font-medium">Specializations ({subBlocks.length})</span>
                  {subBlocksExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 mb-3">
                {subBlocks.map((subBlock) => (
                  <div key={subBlock.id} className="p-2 rounded border bg-muted/30">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{subBlock.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {getBlockProgressText(subBlock, subBlock.courses)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {subBlock.courses.slice(0, 4).map((course) => (
                        <div key={course.id} className="text-xs p-1 rounded bg-muted">
                          {course.code}
                        </div>
                      ))}
                      {subBlock.courses.length > 4 && (
                        <div className="text-xs p-1 rounded bg-muted text-center text-muted-foreground">
                          +{subBlock.courses.length - 4} more
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Alt Credit Options */}
          {showAltCredits && hasAltCredits && (
            <div className="mb-3 p-2 rounded border bg-accent/5">
              <div className="text-xs font-medium mb-2">Alternative Credit Options</div>
              <div className="space-y-1">
                {altCreditOptions.slice(0, 3).map((option) => (
                  <div key={option.id} className="flex items-center justify-between text-xs">
                    <span>{option.provider_course_name}</span>
                    <div className="flex items-center gap-2">
                      {option.cost_estimate && (
                        <span className="text-muted-foreground">${option.cost_estimate}</span>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {option.provider}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Course grid with single column layout for better readability */}
          <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto">
            {block.courses.map((course) => (
              <CourseNode
                key={course.id}
                course={course}
                isCompleted={completedCourseIds.has(course.id)}
              />
            ))}
          </div>
          
          {!isUnlocked && (
            <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground text-center">
              Complete prerequisites to unlock
            </div>
          )}
        </CardContent>
      </Card>

      {/* Output handle for edges */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-primary border-2 border-background"
        style={{ right: -6 }}
      />
    </div>
  );
}