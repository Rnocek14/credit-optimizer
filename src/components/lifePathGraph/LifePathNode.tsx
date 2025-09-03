import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { GraphNode } from '@/types/lifePathGraph';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  BookOpen, 
  Briefcase, 
  Award, 
  Code, 
  GraduationCap, 
  Target,
  FileText,
  Clock,
  DollarSign,
  MapPin
} from 'lucide-react';

interface LifePathNodeData {
  node: GraphNode;
  isSelected: boolean;
  isInPath: boolean;
  pathType?: string;
}

interface LifePathNodeProps {
  data: LifePathNodeData;
}

export function LifePathNodeComponent({ data }: LifePathNodeProps) {
  const { node, isSelected, isInPath, pathType } = data;

  const getNodeIcon = () => {
    switch (node.type) {
      case 'skill': return <Target className="w-4 h-4" />;
      case 'course': return <BookOpen className="w-4 h-4" />;
      case 'job': return <Briefcase className="w-4 h-4" />;
      case 'certification': return <Award className="w-4 h-4" />;
      case 'project': return <Code className="w-4 h-4" />;
      case 'step': return <GraduationCap className="w-4 h-4" />;
      case 'exam': return <FileText className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getNodeColor = () => {
    if (isSelected) return 'ring-2 ring-primary';
    if (pathType === 'fastest') return 'border-blue-500 bg-blue-50 dark:bg-blue-950/20';
    if (pathType === 'cheapest') return 'border-green-500 bg-green-50 dark:bg-green-950/20';
    if (pathType === 'credit-max') return 'border-purple-500 bg-purple-50 dark:bg-purple-950/20';
    if (isInPath) return 'border-primary bg-primary/10';
    
    switch (node.type) {
      case 'skill': return 'border-orange-300 bg-orange-50 dark:bg-orange-950/20';
      case 'course': return 'border-blue-300 bg-blue-50 dark:bg-blue-950/20';
      case 'job': return 'border-green-300 bg-green-50 dark:bg-green-950/20';
      case 'certification': return 'border-purple-300 bg-purple-50 dark:bg-purple-950/20';
      case 'project': return 'border-indigo-300 bg-indigo-50 dark:bg-indigo-950/20';
      case 'exam': return 'border-amber-300 bg-amber-50 dark:bg-amber-950/20';
      default: return 'border-gray-300 bg-gray-50 dark:bg-gray-950/20';
    }
  };

  const getBadgeVariant = () => {
    switch (node.type) {
      case 'skill': return 'secondary';
      case 'course': return 'default';
      case 'job': return 'destructive';
      case 'certification': return 'outline';
      case 'project': return 'secondary';
      case 'exam': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-muted-foreground"
      />
      
      <Card className={`w-64 cursor-pointer transition-all hover:shadow-md ${getNodeColor()}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              {getNodeIcon()}
              <Badge variant={getBadgeVariant()} className="text-xs">
                {node.type}
              </Badge>
            </div>
            
            {node.aceRecommended && (
              <Badge variant="outline" className="text-xs bg-yellow-50 dark:bg-yellow-950/20">
                ACE
              </Badge>
            )}
          </div>
          
          <h3 className="font-semibold text-sm mb-2 line-clamp-2">
            {node.title}
          </h3>
          
          {node.institution && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <MapPin className="w-3 h-3" />
              {node.institution}
            </div>
          )}
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {node.estimatedHours}h
            </div>
            
            {node.cost > 0 && (
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                ${node.cost.toLocaleString()}
              </div>
            )}
            
            {node.credits && (
              <div className="text-xs font-medium">
                {node.credits} cr
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-1 mt-2">
            {node.tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                {tag}
              </Badge>
            ))}
          </div>
          
          {/* Difficulty indicator */}
          <div className="flex items-center gap-1 mt-2">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i < node.difficulty 
                      ? 'bg-orange-400' 
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              Level {node.difficulty}
            </span>
          </div>
        </CardContent>
      </Card>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-muted-foreground"
      />
    </>
  );
}