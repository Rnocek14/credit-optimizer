import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign, BookOpen, TrendingUp } from 'lucide-react';

interface BranchOption {
  id: string;
  title: string;
  type: string;
  time: number; // weeks
  cost: number;
  credits?: number;
  creditLoss?: number;
  isRecommended?: boolean;
  preset?: string; // which preset recommends this
}

interface BranchDecisionCardProps {
  options: BranchOption[];
  title?: string;
  onOptionSelect?: (optionId: string) => void;
}

export function BranchDecisionCard({ 
  options, 
  title = "Choose Your Path", 
  onOptionSelect 
}: BranchDecisionCardProps) {
  if (options.length < 2) return null;

  return (
    <Card className="w-80 bg-background/95 backdrop-blur-sm border-2 border-dashed border-muted-foreground/30 shadow-lg">
      <CardContent className="p-4">
        <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          {title}
        </h4>
        
        <div className="space-y-2">
          {options.map((option) => (
            <div 
              key={option.id}
              className="p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
              onClick={() => onOptionSelect?.(option.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="font-medium text-sm line-clamp-1">{option.title}</div>
                  <Badge variant="outline" className="text-xs mt-1">
                    {option.type}
                  </Badge>
                </div>
                
                {option.isRecommended && (
                  <Badge variant="default" className="text-xs ml-2">
                    Best for {option.preset}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {option.time}w
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  ${option.cost.toLocaleString()}
                </div>
                {option.credits && (
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {option.credits}cr
                  </div>
                )}
              </div>
              
              {option.creditLoss && option.creditLoss > 0 && (
                <div className="text-xs text-destructive mt-1">
                  -{option.creditLoss}cr loss
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="text-xs text-muted-foreground mt-3 text-center">
          Click option to select path
        </div>
      </CardContent>
    </Card>
  );
}