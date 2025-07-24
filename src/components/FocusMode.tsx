import React, { useState, useMemo } from 'react';
import { CareerRelationship } from '@/lib/unifiedCareerData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Focus, Network } from 'lucide-react';

interface FocusModeProps {
  focusedNodeId: string | null;
  allRelationships: CareerRelationship[];
  onFocusNode: (nodeId: string | null) => void;
  onClose: () => void;
}

export const FocusMode: React.FC<FocusModeProps> = ({
  focusedNodeId,
  allRelationships,
  onFocusNode,
  onClose
}) => {
  const [selectedRelationType, setSelectedRelationType] = useState<string | null>(null);

  const focusedRelationships = useMemo(() => {
    if (!focusedNodeId) return [];
    
    const directRelationships = allRelationships.filter(
      rel => rel.from === focusedNodeId || rel.to === focusedNodeId
    );

    // Limit to max 15 relationships to prevent overwhelming display
    const sortedByWeight = directRelationships
      .sort((a, b) => (b.weight || 1) - (a.weight || 1))
      .slice(0, 15);

    if (selectedRelationType) {
      return sortedByWeight.filter(rel => rel.type === selectedRelationType);
    }

    return sortedByWeight;
  }, [focusedNodeId, allRelationships, selectedRelationType]);

  const relationshipTypes = useMemo(() => {
    if (!focusedNodeId) return [];
    
    const types = new Set(
      allRelationships
        .filter(rel => rel.from === focusedNodeId || rel.to === focusedNodeId)
        .map(rel => rel.type)
    );
    
    return Array.from(types);
  }, [focusedNodeId, allRelationships]);

  const getRelationshipDescription = (type: string): string => {
    const descriptions: Record<string, string> = {
      prerequisite: 'Required before learning',
      learningPath: 'Natural progression',
      skillDependency: 'Builds upon this skill',
      courseMapping: 'Taught in course',
      jobRequirement: 'Required for position',
      careerProgression: 'Career advancement'
    };
    
    return descriptions[type] || type;
  };

  const getRelationshipColor = (type: string): string => {
    const colors: Record<string, string> = {
      prerequisite: 'hsl(var(--destructive))',
      learningPath: 'hsl(var(--primary))',
      skillDependency: 'hsl(var(--secondary))',
      courseMapping: 'hsl(var(--accent))',
      jobRequirement: 'hsl(var(--warning))',
      careerProgression: 'hsl(var(--success))'
    };
    
    return colors[type] || 'hsl(var(--muted))';
  };

  if (!focusedNodeId) return null;

  return (
    <Card className="absolute top-4 right-4 w-80 max-h-96 overflow-auto z-50 bg-background/95 backdrop-blur border shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Focus className="h-4 w-4" />
            Focus Mode
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Relationship Type Filters */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Filter by relationship:</p>
          <div className="flex flex-wrap gap-1">
            <Button
              variant={selectedRelationType === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedRelationType(null)}
              className="h-6 text-xs px-2"
            >
              All ({focusedRelationships.length})
            </Button>
            {relationshipTypes.map(type => {
              const count = allRelationships.filter(
                rel => (rel.from === focusedNodeId || rel.to === focusedNodeId) && rel.type === type
              ).length;
              
              return (
                <Button
                  key={type}
                  variant={selectedRelationType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedRelationType(type)}
                  className="h-6 text-xs px-2"
                  style={{
                    backgroundColor: selectedRelationType === type ? getRelationshipColor(type) : undefined
                  }}
                >
                  {type} ({count})
                </Button>
              );
            })}
          </div>
        </div>

        {/* Connected Nodes */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Connected nodes ({focusedRelationships.length}):
          </p>
          {focusedRelationships.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">
              No relationships of this type found.
            </p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-auto">
              {focusedRelationships.map((rel, index) => {
                const connectedNodeId = rel.from === focusedNodeId ? rel.to : rel.from;
                const isOutgoing = rel.from === focusedNodeId;
                const strength = rel.weight || 1;
                
                return (
                  <div
                    key={`${rel.from}-${rel.to}-${index}`}
                    className="flex items-center justify-between p-2 rounded border border-border/50 hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => onFocusNode(connectedNodeId)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getRelationshipColor(rel.type) }}
                        />
                        <span className="text-xs font-medium truncate">
                          {connectedNodeId}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isOutgoing ? '→' : '←'} {getRelationshipDescription(rel.type)}
                      </p>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className="text-xs px-1 py-0 h-4"
                    >
                      {strength.toFixed(1)}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Network className="h-3 w-3" />
            <span>
              Total connections: {allRelationships.filter(
                rel => rel.from === focusedNodeId || rel.to === focusedNodeId
              ).length}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};