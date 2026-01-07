import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { InstitutionChip } from '@/components/providers/InstitutionChip';
import { TeacherChip } from '@/components/providers/TeacherChip';
import { 
  Target, 
  BookOpen, 
  FolderOpen, 
  Trophy,
  Clock,
  DollarSign,
  Shield,
  ShieldCheck,
  User,
  Lock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import type { PathNode as PathNodeType } from '@/stores/usePathStore';

interface PathNodeProps {
  data: PathNodeType['data'];
  selected?: boolean;
}

const getNodeIcon = (type: string) => {
  switch (type) {
    case 'track': return Target;
    case 'course': return BookOpen;
    case 'project': return FolderOpen;
    case 'milestone': return Trophy;
    default: return BookOpen;
  }
};

const getVerificationIcon = (verification?: string) => {
  switch (verification) {
    case 'institution_verified': return ShieldCheck;
    case 'mentor_verified': return Shield;
    case 'self_reported': return User;
    default: return null;
  }
};

const getVerificationColor = (verification?: string) => {
  switch (verification) {
    case 'institution_verified': return 'text-green-600';
    case 'mentor_verified': return 'text-blue-600';
    case 'self_reported': return 'text-muted-foreground';
    default: return 'text-muted-foreground';
  }
};

export const PathNode = memo(({ data, selected }: PathNodeProps) => {
  const Icon = getNodeIcon(data.title.toLowerCase().includes('track') ? 'track' : 
                          data.title.toLowerCase().includes('project') ? 'project' :
                          data.title.toLowerCase().includes('milestone') ? 'milestone' : 'course');
  
  const VerificationIcon = getVerificationIcon(data.verification);
  const verificationColor = getVerificationColor(data.verification);

  const getStatusBorderClass = (status?: string) => {
    switch (status) {
      case 'locked': return 'border-destructive border-2';
      case 'in_progress': return 'border-primary border-2';
      case 'completed': return 'border-green-500 border-2';
      default: return '';
    }
  };

  const getStatusBackgroundClass = (status?: string) => {
    const normalizedStatus = status || 'available';
    
    if (normalizedStatus === 'completed') {
      return 'bg-[hsl(var(--lp-green-50))] border-[hsl(var(--lp-green-200))]';
    } else if (normalizedStatus === 'locked') {
      return 'bg-[hsl(var(--lp-red-50))] border-[hsl(var(--lp-red-300))]';
    } else {
      // available / default
      return 'bg-[hsl(var(--lp-blue-50))] border-[hsl(var(--lp-blue-200))]';
    }
  };

  return (
    <Card className={`min-w-[280px] max-w-[320px] transition-all duration-200 rounded-xl border ${
      selected ? 'ring-2 ring-primary shadow-md' : 'shadow-sm hover:shadow-md'
    } ${getStatusBackgroundClass(data.status)}`}>
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 border-2 border-background"
      />
      
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            <Icon className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm leading-tight">{data.title}</h3>
            {data.status === 'locked' && <Lock className="w-3 h-3 text-destructive" />}
            {data.status === 'completed' && <CheckCircle className="w-3 h-3 text-green-500" />}
          </div>
          {VerificationIcon && (
            <VerificationIcon className={`w-4 h-4 ${verificationColor}`} />
          )}
        </div>

        {/* Prerequisites Warning */}
        {data.prerequisites && data.prerequisites.length > 0 && data.status === 'locked' && (
          <div className="flex items-center gap-1 text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
            <AlertTriangle className="w-3 h-3" />
            <span>{data.prerequisites.length} prerequisite(s) required</span>
          </div>
        )}

        {/* Description */}
        {data.description && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {data.description}
          </p>
        )}

        {/* Progress Ring for Tracks */}
        {data.progress !== undefined && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Progress</span>
              <span>{data.progress}%</span>
            </div>
            <Progress value={data.progress} className="h-2" />
          </div>
        )}

        {/* Metrics Row */}
        {(data.xp || data.cri || data.estimatedHours || data.cost) && (
          <div className="flex items-center gap-3 text-xs">
            {data.xp && (
              <Badge variant="secondary" className="text-xs">
                {data.xp} XP
              </Badge>
            )}
            {data.cri && (
              <Badge variant="secondary" className="text-xs">
                CRI {data.cri}
              </Badge>
            )}
            {data.estimatedHours && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{data.estimatedHours}h</span>
              </div>
            )}
            {data.cost && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="w-3 h-3" />
                <span>${data.cost}</span>
              </div>
            )}
          </div>
        )}

        {/* Provider Information */}
        {(data.institutionId || data.teacherId) && (
          <div className="space-y-2">
            {data.institutionId && (
              <InstitutionChip 
                institutionId={data.institutionId}
                variant="compact"
              />
            )}
            {data.teacherId && (
              <TeacherChip 
                teacherId={data.teacherId}
                variant="compact"
              />
            )}
          </div>
        )}

        {/* Skill Tags */}
        {data.skillTags && data.skillTags.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium">Skills:</p>
            <div className="flex flex-wrap gap-1">
              {data.skillTags.slice(0, 3).map((skill, index) => (
                <Badge key={index} variant="outline" className="text-xs px-2 py-0">
                  {skill}
                </Badge>
              ))}
              {data.skillTags.length > 3 && (
                <Badge variant="outline" className="text-xs px-2 py-0">
                  +{data.skillTags.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Difficulty Badge */}
        {data.difficulty && (
          <Badge 
            variant={data.difficulty === 'beginner' ? 'secondary' : 
                    data.difficulty === 'intermediate' ? 'default' : 'destructive'}
            className="text-xs w-fit"
          >
            {data.difficulty}
          </Badge>
        )}
      </CardContent>

      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 border-2 border-background"
      />
    </Card>
  );
});

PathNode.displayName = 'PathNode';