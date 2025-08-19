import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { InstitutionChip } from './InstitutionChip';
import { TeacherChip } from './TeacherChip';
import { useProviderAlternates } from '@/hooks/useProviderAlternates';
import { 
  Shuffle, 
  TrendingUp, 
  Clock, 
  DollarSign,
  ArrowRight,
  Star
} from 'lucide-react';

interface ProviderAlternatesProps {
  skillTags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours?: number;
  currentInstitutionId?: string;
  currentTeacherId?: string;
  onSwap: (institutionId: string, teacherId?: string) => void;
}

export function ProviderAlternates({
  skillTags = [],
  difficulty,
  estimatedHours,
  currentInstitutionId,
  currentTeacherId,
  onSwap,
}: ProviderAlternatesProps) {
  const { data: alternatives = [], isLoading } = useProviderAlternates({
    skillTags,
    difficulty,
    estimatedHours,
  });

  // Filter out current provider
  const filteredAlternatives = alternatives.filter(alt => 
    alt.institutionId !== currentInstitutionId || alt.teacherId !== currentTeacherId
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (filteredAlternatives.length === 0) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
          <Shuffle className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold">No Alternatives Found</h3>
          <p className="text-sm text-muted-foreground">
            No alternative providers found for this learning item. The current provider appears to be the best match.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Shuffle className="w-4 h-4" />
        <h3 className="font-semibold text-sm">Alternative Providers</h3>
        <Badge variant="secondary" className="text-xs">
          {filteredAlternatives.length} found
        </Badge>
      </div>

      <div className="space-y-3">
        {filteredAlternatives.slice(0, 5).map((alternative) => (
          <Card key={`${alternative.institutionId}-${alternative.teacherId}`} className="relative">
            <CardContent className="p-3 space-y-3">
              {/* Provider Info */}
              <div className="space-y-2">
                <InstitutionChip 
                  institutionId={alternative.institutionId}
                  variant="compact"
                />
                {alternative.teacherId && (
                  <TeacherChip 
                    teacherId={alternative.teacherId}
                    variant="compact"
                  />
                )}
              </div>

              {/* Metrics Comparison */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {alternative.teacherRating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                    <span>{alternative.teacherRating.toFixed(1)}</span>
                  </div>
                )}
                
                {alternative.outcomeScore && (
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span>{alternative.outcomeScore}%</span>
                  </div>
                )}
                
                {alternative.criDelta && (
                  <div className="flex items-center gap-1">
                    <Badge 
                      variant={alternative.criDelta > 0 ? 'default' : 'secondary'}
                      className="text-xs px-1"
                    >
                      CRI {alternative.criDelta > 0 ? '+' : ''}{alternative.criDelta.toFixed(1)}
                    </Badge>
                  </div>
                )}
                
                {alternative.timeDelta && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className={alternative.timeDelta < 0 ? 'text-green-600' : 'text-orange-600'}>
                      {alternative.timeDelta > 0 ? '+' : ''}{alternative.timeDelta}h
                    </span>
                  </div>
                )}
              </div>

              {/* Cost Difference */}
              {alternative.costDelta && (
                <div className="flex items-center gap-1 text-xs">
                  <DollarSign className="w-3 h-3 text-muted-foreground" />
                  <span className={alternative.costDelta < 0 ? 'text-green-600' : 'text-red-600'}>
                    {alternative.costDelta > 0 ? '+' : ''}${Math.abs(alternative.costDelta)}
                    {alternative.costDelta < 0 ? ' cheaper' : ' more'}
                  </span>
                </div>
              )}

              {/* Swap Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSwap(alternative.institutionId, alternative.teacherId)}
                className="w-full"
              >
                <ArrowRight className="w-3 h-3 mr-1" />
                Swap to this provider
              </Button>
            </CardContent>

            {/* Best badges */}
            {alternative.isBestRating && (
              <Badge className="absolute -top-2 -right-2 text-xs bg-yellow-500 text-yellow-50">
                Best Rating
              </Badge>
            )}
            {alternative.isBestOutcome && (
              <Badge className="absolute -top-2 -right-2 text-xs bg-green-500 text-green-50">
                Best Outcome
              </Badge>
            )}
            {alternative.isFastest && (
              <Badge className="absolute -top-2 -right-2 text-xs bg-blue-500 text-blue-50">
                Fastest
              </Badge>
            )}
          </Card>
        ))}
      </div>

      {filteredAlternatives.length > 5 && (
        <Button variant="ghost" size="sm" className="w-full">
          View {filteredAlternatives.length - 5} more alternatives
        </Button>
      )}
    </div>
  );
}