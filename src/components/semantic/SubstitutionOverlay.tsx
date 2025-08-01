import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, TrendingUp, DollarSign, Star } from 'lucide-react';
import { SubstitutionOption } from '@/types/semantic';

interface SubstitutionOverlayProps {
  substitutions: SubstitutionOption[];
  onSelect?: (substitution: SubstitutionOption) => void;
  onClose: () => void;
}

export const SubstitutionOverlay: React.FC<SubstitutionOverlayProps> = ({
  substitutions,
  onSelect,
  onClose
}) => {
  const getScoreColor = (score: number) => {
    if (score > 0.8) return 'text-success';
    if (score > 0.6) return 'text-warning';
    return 'text-muted-foreground';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score > 0.8) return 'default';
    if (score > 0.6) return 'secondary';
    return 'outline';
  };

  return (
    <Card className="absolute top-full left-0 z-50 p-4 min-w-[300px] max-w-[400px] mt-2 bg-popover border shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h5 className="font-medium text-sm">Alternative Options</h5>
        <Button
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="h-6 w-6 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Substitution list */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {substitutions.map((substitution, index) => (
          <div
            key={`${substitution.node_id}-${index}`}
            className="p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
            onClick={() => onSelect?.(substitution)}
          >
            {/* Title and type */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h6 className="font-medium text-sm">{substitution.title}</h6>
                <Badge variant="outline" className="text-xs mt-1">
                  {substitution.type}
                </Badge>
              </div>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div className="text-center">
                <div className={`text-xs font-bold ${getScoreColor(substitution.substitution_score)}`}>
                  {Math.round(substitution.substitution_score * 100)}%
                </div>
                <div className="text-xs text-muted-foreground">Match</div>
              </div>
              
              <div className="text-center">
                <div className={`text-xs font-bold ${getScoreColor(substitution.skill_equivalence)}`}>
                  {Math.round(substitution.skill_equivalence * 100)}%
                </div>
                <div className="text-xs text-muted-foreground">Skills</div>
              </div>
              
              <div className="text-center">
                <div className={`text-xs font-bold ${getScoreColor(substitution.cost_benefit_ratio)}`}>
                  {Math.round(substitution.cost_benefit_ratio * 100)}%
                </div>
                <div className="text-xs text-muted-foreground">ROI</div>
              </div>
            </div>

            {/* Quality indicators */}
            <div className="flex gap-1">
              {substitution.substitution_score > 0.8 && (
                <Badge variant={getScoreBadgeVariant(substitution.substitution_score)} className="text-xs">
                  <Star className="w-3 h-3 mr-1" />
                  Best Match
                </Badge>
              )}
              
              {substitution.cost_benefit_ratio > 0.7 && (
                <Badge variant="secondary" className="text-xs">
                  <DollarSign className="w-3 h-3 mr-1" />
                  Good Value
                </Badge>
              )}
              
              {substitution.skill_equivalence > 0.9 && (
                <Badge variant="default" className="text-xs">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Equivalent
                </Badge>
              )}
            </div>

            {/* Reasoning */}
            {substitution.reasoning && (
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {substitution.reasoning}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      {substitutions.length === 0 && (
        <div className="text-center text-xs text-muted-foreground py-4">
          No alternatives found for this skill
        </div>
      )}
    </Card>
  );
};