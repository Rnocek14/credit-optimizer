import React from "react";
import { X, TrendingUp, Clock, DollarSign, Star, CheckCircle, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PivotPath {
  new_career: string;
  shared_skills: string[];
  missing_skills: string[];
  roi_score: number;
  estimated_time: string;
  estimated_cost: string;
  reasoning: string;
}

interface PivotPathModalProps {
  isOpen: boolean;
  pivots: PivotPath[];
  onClose: () => void;
}

export const PivotPathModal: React.FC<PivotPathModalProps> = ({
  isOpen,
  pivots,
  onClose,
}) => {
  if (!pivots || pivots.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🔁 Career Pivot Recommendations
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No pivot recommendations available.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              🔁 Career Pivot Recommendations
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <p className="text-muted-foreground">
            Discover new career paths based on your existing skills
          </p>
        </DialogHeader>

        <ScrollArea className="px-6 pb-6 max-h-[70vh]">
          <div className="space-y-6">
            {pivots.map((pivot, index) => (
              <Card key={index} className="border-2 hover:border-primary/20 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      {pivot.new_career}
                    </span>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="font-semibold text-green-600">
                        {pivot.roi_score}x ROI
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Skills Section */}
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Shared Skills */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium text-green-700">
                          Skills You Have ({pivot.shared_skills.length})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {pivot.shared_skills.map((skill, skillIndex) => (
                          <Badge 
                            key={skillIndex} 
                            variant="secondary"
                            className="bg-green-100 text-green-800 border-green-200"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Missing Skills */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium text-orange-700">
                          Skills to Learn ({pivot.missing_skills.length})
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {pivot.missing_skills.map((skill, skillIndex) => (
                          <Badge 
                            key={skillIndex} 
                            variant="outline"
                            className="border-orange-200 text-orange-700"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <TrendingUp className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium">ROI</span>
                      </div>
                      <p className="text-lg font-bold text-purple-600">
                        {pivot.roi_score}x
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Clock className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Time</span>
                      </div>
                      <p className="text-lg font-bold text-blue-600">
                        {pivot.estimated_time}
                      </p>
                    </div>
                    
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Cost</span>
                      </div>
                      <p className="text-lg font-bold text-green-600">
                        {pivot.estimated_cost}
                      </p>
                    </div>
                  </div>

                  {/* Reasoning */}
                  <div className="p-4 bg-background border rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Why This Pivot Makes Sense</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {pivot.reasoning}
                    </p>
                  </div>

                  {/* Action Button */}
                  <Button className="w-full" variant="default">
                    Start {pivot.new_career} Learning Path
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};