import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Target, TrendingUp, Clock, MapPin } from 'lucide-react';

interface CheckpointCommitmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkpointSkill: {
    id: string;
    name: string;
    category: string;
  };
  availablePaths: Array<{
    id: string;
    title: string;
    track: string;
    level: string;
    average_salary?: number;
    roi_score?: number;
    estimated_time?: string;
    required_skill_ids: string[];
    description?: string;
  }>;
  onPathSelect: (pathId: string) => void;
  currentLocation?: string;
}

const getTrackIcon = (track: string) => {
  const icons = {
    design: '🎨',
    engineering: '⚛️', 
    data: '📊',
    product: '🚀',
    marketing: '📈',
    security: '🔒',
    general: '💼'
  };
  return icons[track as keyof typeof icons] || '💼';
};

const getTrackColor = (track: string) => {
  const colors = {
    design: 'hsl(var(--chart-1))',
    engineering: 'hsl(var(--chart-2))', 
    data: 'hsl(var(--chart-3))',
    product: 'hsl(var(--chart-4))',
    marketing: 'hsl(var(--chart-5))',
    security: 'hsl(var(--destructive))',
    general: 'hsl(var(--muted-foreground))'
  };
  return colors[track as keyof typeof colors] || 'hsl(var(--muted-foreground))';
};

export const CheckpointCommitmentModal: React.FC<CheckpointCommitmentModalProps> = ({
  isOpen,
  onClose,
  checkpointSkill,
  availablePaths,
  onPathSelect,
  currentLocation = 'US'
}) => {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedPath) {
      onPathSelect(selectedPath);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Career Path Decision Point
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Checkpoint skill info */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                Checkpoint Reached
              </Badge>
            </div>
            <h3 className="font-semibold text-lg">
              Congratulations on mastering {checkpointSkill.name}!
            </h3>
            <p className="text-muted-foreground mt-1">
              You've reached a key decision point. Choose your specialization path to focus your learning journey.
            </p>
          </div>

          {/* Available paths */}
          <div>
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Available Career Paths ({availablePaths.length})
            </h4>
            
            <div className="grid gap-4">
              {availablePaths.map((path) => {
                const isSelected = selectedPath === path.id;
                const trackColor = getTrackColor(path.track);
                const trackIcon = getTrackIcon(path.track);

                return (
                  <Card 
                    key={path.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      isSelected 
                        ? 'border-primary shadow-md' 
                        : 'hover:border-primary/50 hover:shadow-sm'
                    }`}
                    onClick={() => setSelectedPath(path.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{trackIcon}</div>
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {path.title}
                              <Badge 
                                variant="outline" 
                                className="capitalize text-xs"
                                style={{ borderColor: trackColor, color: trackColor }}
                              >
                                {path.level}
                              </Badge>
                            </CardTitle>
                            <CardDescription className="capitalize">
                              {path.track} Track
                            </CardDescription>
                          </div>
                        </div>
                        
                        {/* ROI and Salary indicators */}
                        <div className="text-right text-sm">
                          {path.average_salary && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <TrendingUp className="w-3 h-3" />
                              ${(path.average_salary / 1000).toFixed(0)}k avg
                            </div>
                          )}
                          {path.roi_score && path.roi_score > 1.2 && (
                            <Badge variant="secondary" className="text-xs text-green-600">
                              High ROI
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      {path.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {path.description}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          {path.estimated_time && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {path.estimated_time}
                            </div>
                          )}
                          <div className="text-muted-foreground">
                            {path.required_skill_ids.length} required skills
                          </div>
                        </div>
                        
                        {isSelected && (
                          <Badge className="bg-primary/10 text-primary border-primary/30">
                            Selected
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Decide Later
            </Button>
            
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleConfirm}
                disabled={!selectedPath}
                className="flex items-center gap-2"
              >
                Commit to Path
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};