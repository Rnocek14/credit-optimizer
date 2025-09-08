import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';

interface SkillTreeSkillNodeData {
  name: string;
  category: string;
  description: string;
}

interface SkillTreeSkillNodeProps {
  data: SkillTreeSkillNodeData;
}

export const SkillTreeSkillNode: React.FC<SkillTreeSkillNodeProps> = memo(({ data }) => {
  const { name, category, description } = data;

  const getCategoryColor = (category: string) => {
    const colors = {
      'Programming': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'Framework': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'Tools': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'Design': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      'Data': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'DevOps': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'Testing': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    };
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  return (
    <div className="group">
      <Handle type="target" position={Position.Top} className="opacity-0 group-hover:opacity-100" />
      
      <div className={`
        w-40 p-3 rounded-lg border border-border bg-background/80 backdrop-blur-sm
        transition-all duration-200 hover:shadow-md soft-hover
        flex flex-col items-center text-center
      `}>
        {/* Icon */}
        <div className="mb-2 p-2 rounded-full bg-muted">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Name */}
        <h4 className="font-medium text-sm mb-1 leading-tight">
          {name}
        </h4>

        {/* Category */}
        <Badge 
          variant="secondary" 
          className={`text-xs mb-2 ${getCategoryColor(category)}`}
        >
          {category}
        </Badge>

        {/* Description */}
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="opacity-0 group-hover:opacity-100" />
    </div>
  );
});

SkillTreeSkillNode.displayName = 'SkillTreeSkillNode';