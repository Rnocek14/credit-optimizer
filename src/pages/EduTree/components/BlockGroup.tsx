import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Lock, CheckCircle, ChevronDown, ChevronRight, Sparkles, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { BlockWithCourses, getBlockProgressText, isBlockComplete, AltCreditOption } from '@/lib/types/eduTree';
import { CourseNode } from './CourseNode';
import { useNodeResize } from '@/hooks/useNodeResize';
import { useFeatureFlags } from '@/lib/featureFlags';

export const BlockGroup: React.FC<NodeProps> = (props: NodeProps) => {
  const flags = useFeatureFlags();
  const nodeRef = useRef<HTMLDivElement>(null);
  const { attachResizeObserver, detachResizeObserver } = useNodeResize(props.id);
  
  // Apply null-safety guards for all destructured properties
  const block = (props.data as any)?.block ?? {};
  const progress = (props.data as any)?.progress ?? { completed: 0, required: 0 };
  const completedCourseIds = (props.data as any)?.completedCourseIds ?? new Set();
  const isUnlocked = !!(props.data as any)?.isUnlocked;
  const subBlocks = (props.data as any)?.subBlocks ?? [];
  const altCreditOptions = (props.data as any)?.altCreditOptions ?? [];
  const isHighlighted = !!(props.data as any)?.isHighlighted;
  const planningLens = (props.data as any)?.planningLens ?? null;
  const isDegreeNode = !!(props.data as any)?.isDegreeNode;
  const isDegreeComplete = !!(props.data as any)?.isDegreeComplete;
  const onCourseClick = (props.data as any)?.onCourseClick;

  // Expose handle capabilities for edge safety
  if (props.data) {
    (props.data as any).hasLeftHandle = true;
    (props.data as any).hasRightHandle = true;
  }
  
  const [showAltCredits, setShowAltCredits] = useState(false);
  const [subBlocksExpanded, setSubBlocksExpanded] = useState(false);
  
  const isComplete = isBlockComplete(block, block.courses, completedCourseIds);
  const progressText = getBlockProgressText(block, block.courses);
  const progressPercent = progress.required > 0 ? (progress.completed / progress.required) * 100 : 0;
  const hasSubBlocks = subBlocks.length > 0;
  const hasAltCredits = altCreditOptions.length > 0;

  // Always attach resize observer for better layout management
  useEffect(() => {
    if (nodeRef.current) {
      attachResizeObserver(nodeRef.current);
      return () => detachResizeObserver();
    }
  }, [attachResizeObserver, detachResizeObserver]);

  // Track classification for path identity
  const trackClass = !block.track_id ? 'node--shared'
    : block.track_id === 'software-engineering' ? 'node--se'
    : 'node--ds';

  return (
    <div 
      className={`relative node ${trackClass}`}
      ref={nodeRef}
      data-node-id={block.id}
      data-track={block.track_id ?? ''}
      data-level-year={block.level_year}
    >
      {/* Left/Right handles for overlay step edges when multipath overlay is enabled */}
      {flags.eduTreeMultiPathOverlay ? (
        <>
          <Handle
            type="target"
            position={Position.Left}
            className="w-3 h-3 bg-primary border-2 border-background"
            style={{ left: -6 }}
            isConnectable={false}
          />
          <Handle
            type="source"
            position={Position.Right}
            className="w-3 h-3 bg-primary border-2 border-background"
            style={{ right: -6 }}
            isConnectable={false}
          />
        </>
      ) : (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 bg-primary border-2 border-background"
          style={{ left: -6 }}
        />
      )}

      <Card className={`
        ${isDegreeNode ? 'w-[420px]' : 'w-[360px]'}
        ${!isUnlocked ? 'opacity-65' : ''}
        ${isDegreeNode && isDegreeComplete ? 'border-accent-gold bg-gradient-to-br from-accent-gold/20 to-accent-gold/10 ring-2 ring-accent-gold/50 shadow-lg shadow-accent-gold/20' :
          isDegreeNode ? 'border-accent-gold/60 bg-accent-gold/5 ring-1 ring-accent-gold/30' :
          isComplete ? 'border-primary bg-primary/10 ring-1 ring-primary/25' : 'border-muted-foreground/40 bg-card hover:border-muted-foreground/60'}
        ${isHighlighted ? 'ring-2 ring-primary shadow-xl border-primary' : ''}
        ${planningLens ? 'border-l-4 border-l-accent' : ''}
        transition-all duration-200
      `}>
        <CardHeader className="pb-3 space-y-3">
          {/* Track identity badges */}
          <div className="node-badge-row">
            {!block.track_id && <span className="chip chip--shared">Shared</span>}
            {block.track_id === 'software-engineering' && <span className="chip chip--se">SE</span>}
            {block.track_id === 'data-science' && <span className="chip chip--ds">DS</span>}
            <span className="chip chip--year">Y{block.level_year}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              {!isUnlocked && !isDegreeNode && (
                <Lock className="w-4 h-4 text-muted-foreground opacity-80" />
              )}
              {isDegreeNode && <GraduationCap className={`w-5 h-5 ${isDegreeComplete ? 'text-accent-gold' : 'text-accent-gold/60'}`} />}
              {isComplete && !isDegreeNode && <CheckCircle className="w-4 h-4 text-primary" />}
              {isDegreeComplete && <CheckCircle className="w-4 h-4 text-accent-gold" />}
              <span 
                className={`
                  ${isDegreeNode ? 'text-accent-gold font-bold' : ''}
                  ${!isUnlocked && !isDegreeNode ? 'text-foreground/90' : 'text-foreground'}
                `}
              >
                {block.title}
              </span>
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs ${isDegreeNode ? 'border-accent-gold text-accent-gold' : ''}`}>
                {isDegreeNode ? 'Degree' : `Year ${block.level_year}`}
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
              {isDegreeComplete && (
                <Badge className="text-xs bg-accent-gold text-accent-gold-foreground">
                  🎓 Complete
                </Badge>
              )}
            </div>
          </div>
          
          {/* Rule and progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <Badge variant="secondary" className={`text-xs ${isDegreeNode ? 'bg-accent-gold/20 text-accent-gold-foreground' : ''}`}>
                {isDegreeNode ? 'Total Program' : progressText}
              </Badge>
              <span className={`text-muted-foreground text-xs ${isDegreeNode ? 'font-semibold text-accent-gold' : ''}`}>
                {progress.completed}/{progress.required} {isDegreeNode ? 'Courses' : ''}
              </span>
            </div>
            
            <Progress 
              value={progressPercent} 
              className={`h-3 ${isDegreeNode ? 'bg-accent-gold/20' : ''}`}
              style={isDegreeNode ? {
                background: 'hsl(var(--accent-gold) / 0.2)'
              } : {}}
            />
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
          {!isDegreeNode && (
            <div className="grid grid-cols-1 gap-3 max-h-[300px] overflow-y-auto">
              {block.courses.map((course) => (
                <CourseNode
                  key={course.id}
                  course={course}
                  isCompleted={completedCourseIds.has(course.id)}
                  equivalencies={altCreditOptions.filter(opt => 
                    // Match by course area or general alternative options
                    course.area === opt.provider || !opt.provider
                  )}
                  onClick={onCourseClick}
                />
              ))}
            </div>
          )}

          {/* Degree completion message */}
          {isDegreeNode && (
            <div className="text-center py-6">
              <div className={`text-lg font-semibold mb-2 ${isDegreeComplete ? 'text-accent-gold' : 'text-muted-foreground'}`}>
                {isDegreeComplete ? '🎓 Congratulations!' : '🎯 Complete all requirements'}
              </div>
              <div className="text-sm text-muted-foreground">
                {isDegreeComplete 
                  ? 'You have earned your Bachelor of Science in Software Engineering!'
                  : 'Finish all courses to earn your degree'
                }
              </div>
            </div>
          )}
          
          {!isUnlocked && !isDegreeNode && (
            <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground text-center">
              Complete prerequisites to unlock
            </div>
          )}

          {isDegreeNode && !isUnlocked && (
            <div className="mt-3 p-2 bg-accent-gold/10 border border-accent-gold/30 rounded text-xs text-accent-gold-foreground text-center">
              Complete Capstone and Architecture blocks to unlock degree
            </div>
          )}
        </CardContent>
      </Card>

      {/* Handles for PhaseA mode - always render left/right for clean edges */}
      {flags.eduTreePhaseA && (
        <>
          <Handle id="l" type="target" position={Position.Left} isConnectable={false} />
          <Handle id="r" type="source" position={Position.Right} isConnectable={false} />
        </>
      )}
      
      {/* Fallback handle for non-PhaseA modes */}
      {!flags.eduTreePhaseA && !flags.eduTreeMultiPathOverlay && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-primary border-2 border-background"
          style={{ right: -6 }}
        />
      )}
    </div>
  );
}