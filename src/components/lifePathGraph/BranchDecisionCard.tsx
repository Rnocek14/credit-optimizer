import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, BookOpen, Zap } from 'lucide-react';

interface BranchOption {
  id: string;
  title: string;
  type: 'course' | 'exam' | 'credit';
  time: number;
  cost: number;
  credits: number;
  difficulty: number;
  tags: string[];
}

interface BranchDecisionCardProps {
  title: string;
  description: string;
  options: BranchOption[];
  onSelectOption: (optionId: string) => void;
  className?: string;
}

export function BranchDecisionCard({ 
  title, 
  description, 
  options, 
  onSelectOption,
  className = ""
}: BranchDecisionCardProps) {
  return (
    <Card className={`absolute z-50 w-80 bg-card/95 backdrop-blur-sm border-2 border-primary/20 shadow-lg ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          {title}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {options.map((option) => (
          <div key={option.id} className="p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-medium text-sm">{option.title}</h4>
                <Badge variant="outline" className="text-xs mt-1">
                  {option.type}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSelectOption(option.id)}
                className="h-8 text-xs"
              >
                Select
              </Button>
            </div>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {option.time}mo
                </span>
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  ${option.cost.toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {option.credits}cr
                </span>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: option.difficulty }, (_, i) => (
                  <div key={i} className="w-1 h-3 bg-yellow-400 rounded-full" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}