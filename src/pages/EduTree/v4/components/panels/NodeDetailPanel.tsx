/**
 * Node Detail Panel - Shows course details and alternative providers
 */
import { X, Building2, Clock, DollarSign, Award, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useProviderAlternates, type ProviderAlternative } from '@/hooks/useProviderAlternates';
import type { PlanNodeData } from '../../types/v4';

interface NodeDetailPanelProps {
  isOpen: boolean;
  nodeData: PlanNodeData | null;
  onClose: () => void;
  onSelectProvider: (institutionId: string, teacherId?: string) => void;
}

export function NodeDetailPanel({ isOpen, nodeData, onClose, onSelectProvider }: NodeDetailPanelProps) {
  const { data: alternatives, isLoading } = useProviderAlternates({
    skillTags: nodeData?.skillTags || [],
    difficulty: nodeData?.difficulty,
    estimatedHours: nodeData?.estimatedHours,
  });

  if (!isOpen || !nodeData) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full md:w-[500px] bg-card border-l shadow-2xl z-50 animate-slide-in-right">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="border-b p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-foreground">{nodeData.label}</h2>
                <div className="flex gap-2 mt-2">
                  {nodeData.credits && (
                    <Badge variant="outline">{nodeData.credits} credits</Badge>
                  )}
                  {nodeData.difficulty && (
                    <Badge variant="secondary">{nodeData.difficulty}</Badge>
                  )}
                  {nodeData.status && (
                    <Badge>{nodeData.status}</Badge>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="hover-scale"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            {nodeData.estimatedHours && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Estimated: {nodeData.estimatedHours} hours</span>
              </div>
            )}
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 p-6">
            {/* Current Selection */}
            {nodeData.selectedProviderId && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                  CURRENT SELECTION
                </h3>
                <Card className="p-4 bg-primary/5 border-primary">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    <span className="font-medium">Custom Provider Selected</span>
                  </div>
                </Card>
              </div>
            )}

            {/* Alternative Providers */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-4">
                ALTERNATIVE PROVIDERS {alternatives && `(${alternatives.length})`}
              </h3>
              
              {isLoading && (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <Card key={i} className="p-4">
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-4" />
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-8 w-20" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {!isLoading && alternatives && alternatives.length === 0 && (
                <Card className="p-6 text-center">
                  <p className="text-muted-foreground">
                    No alternative providers found for this course.
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Try updating the course tags or difficulty level.
                  </p>
                </Card>
              )}

              {!isLoading && alternatives && alternatives.length > 0 && (
                <div className="space-y-3">
                  {alternatives.map((alt) => (
                    <AlternateProviderCard
                      key={`${alt.institutionId}-${alt.teacherId || 'default'}`}
                      alternative={alt}
                      isSelected={
                        alt.institutionId === nodeData.selectedProviderId &&
                        alt.teacherId === nodeData.selectedTeacherId
                      }
                      onSelect={() => onSelectProvider(alt.institutionId, alt.teacherId)}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
}

interface AlternateProviderCardProps {
  alternative: ProviderAlternative;
  isSelected: boolean;
  onSelect: () => void;
}

function AlternateProviderCard({ alternative, isSelected, onSelect }: AlternateProviderCardProps) {
  const { institution, teacher, teacherRating, isBestRating, isBestOutcome, isFastest } = alternative;

  return (
    <Card className={`p-4 hover-scale transition-all ${isSelected ? 'border-primary bg-primary/5' : ''}`}>
      <div className="space-y-3">
        {/* Institution & Teacher */}
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold text-foreground">{institution.name}</h4>
              </div>
              {teacher && (
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  <span className="text-muted-foreground">
                    {teacher.name} • {teacherRating?.toFixed(1) || 'N/A'}/5
                  </span>
                </div>
              )}
            </div>
            
            {/* Badges */}
            <div className="flex flex-col gap-1">
              {isBestRating && (
                <Badge variant="default" className="text-xs">Best Rating</Badge>
              )}
              {isBestOutcome && (
                <Badge variant="default" className="text-xs">Best Outcome</Badge>
              )}
              {isFastest && (
                <Badge variant="default" className="text-xs">Fastest</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div className="flex gap-4 text-sm">
          {alternative.timeDelta !== undefined && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{Math.abs(alternative.timeDelta)}h</span>
            </div>
          )}
          {alternative.costDelta !== undefined && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              <span>${Math.abs(alternative.costDelta)}</span>
            </div>
          )}
        </div>

        {/* Action */}
        <Button
          onClick={onSelect}
          variant={isSelected ? "default" : "outline"}
          size="sm"
          className="w-full"
        >
          {isSelected ? 'Selected' : 'Select This Option'}
        </Button>
      </div>
    </Card>
  );
}
