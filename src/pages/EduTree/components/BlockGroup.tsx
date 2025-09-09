import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Lock, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BlockWithCourses, getBlockProgressText, isBlockComplete } from '@/lib/types/eduTree';
import { CourseNode } from './CourseNode';

export function BlockGroup(props: NodeProps) {
  const { block, completedCourseIds, isUnlocked, progress } = props.data as {
    block: BlockWithCourses;
    completedCourseIds: Set<string>;
    isUnlocked: boolean;
    progress: { completed: number; required: number };
  };
  const isComplete = isBlockComplete(block, block.courses, completedCourseIds);
  const progressText = getBlockProgressText(block, block.courses);
  const progressPercent = progress.required > 0 ? (progress.completed / progress.required) * 100 : 0;

  return (
    <div className="relative">
      {/* Input handle for edges */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-muted-foreground"
      />

      <Card className={`
        min-w-[280px] max-w-[320px] 
        ${!isUnlocked ? 'opacity-60' : ''}
        ${isComplete ? 'border-primary bg-primary/5' : 'border-border'}
        transition-all duration-200
      `}>
        <CardHeader className="pb-2">
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
            
            <Progress value={progressPercent} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Course grid */}
          <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto">
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
        className="w-3 h-3 bg-primary"
      />
    </div>
  );
}