import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, BookmarkPlus, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isVerifiedCourseUrl } from '@/lib/urlValidation';

export interface CourseRecoRowProps {
  title: string;
  platform: string;
  difficulty: number;
  durationHours?: number | null;
  url?: string | null;
  expectedCRIChange?: number;
  onSave?: () => void;
  className?: string;
}

const getDifficultyLabel = (difficulty: number): { label: string; color: string } => {
  if (difficulty <= 2) return { label: 'Beginner', color: 'bg-green-100 text-green-800' };
  if (difficulty <= 3) return { label: 'Intermediate', color: 'bg-yellow-100 text-yellow-800' };
  return { label: 'Advanced', color: 'bg-red-100 text-red-800' };
};

const formatDuration = (hours?: number | null): string => {
  if (!hours) return '';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
};

export function CourseRecoRow({
  title,
  platform,
  difficulty,
  durationHours,
  url,
  expectedCRIChange,
  onSave,
  className
}: CourseRecoRowProps) {
  const difficultyInfo = getDifficultyLabel(difficulty);
  const durationText = formatDuration(durationHours);
  // Only show external link if URL is verified (not fabricated)
  const hasVerifiedUrl = isVerifiedCourseUrl(url);

  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors",
      className
    )}>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          {hasVerifiedUrl ? (
            <a 
              href={url!} 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-medium text-sm hover:text-primary transition-colors truncate"
            >
              {title}
            </a>
          ) : (
            <span className="font-medium text-sm truncate">{title}</span>
          )}
          {expectedCRIChange && expectedCRIChange > 0 && (
            <Badge variant="secondary" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              +{expectedCRIChange.toFixed(1)} CRI
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <span className="truncate">{platform}</span>
          <span>•</span>
          <Badge 
            variant="outline" 
            className={cn("text-xs", difficultyInfo.color)}
          >
            {difficultyInfo.label}
          </Badge>
          {durationText && (
            <>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{durationText}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 ml-3">
        {onSave && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={onSave}
          >
            <BookmarkPlus className="h-3 w-3 mr-1" />
            Save
          </Button>
        )}
        {hasVerifiedUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            asChild
          >
            <a href={url!} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}