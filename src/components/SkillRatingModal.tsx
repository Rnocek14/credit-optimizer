import React, { useState } from 'react';
import { Star, BookOpen, Award, Target, Lightbulb } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface SkillRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  skill: {
    id: string;
    name: string;
    category: string;
    description?: string;
    difficulty_level: number;
  } | null;
  currentRating?: number;
  currentNotes?: string;
  onSave: (rating: number, notes: string, confidence: number) => void;
}

const RATING_DESCRIPTIONS = [
  { level: 1, label: 'Beginner', description: 'I\'m just starting to learn this skill', color: 'text-red-600' },
  { level: 2, label: 'Novice', description: 'I have basic understanding but need guidance', color: 'text-orange-600' },
  { level: 3, label: 'Intermediate', description: 'I can work independently with this skill', color: 'text-yellow-600' },
  { level: 4, label: 'Advanced', description: 'I\'m proficient and can teach others', color: 'text-blue-600' },
  { level: 5, label: 'Expert', description: 'I\'m highly skilled and innovate in this area', color: 'text-green-600' }
];

const CONFIDENCE_LEVELS = [
  { level: 1, label: 'Not Confident', description: 'I need significant help' },
  { level: 2, label: 'Somewhat Confident', description: 'I need occasional guidance' },
  { level: 3, label: 'Confident', description: 'I can handle most situations' },
  { level: 4, label: 'Very Confident', description: 'I\'m comfortable in complex scenarios' },
  { level: 5, label: 'Extremely Confident', description: 'I can mentor others effectively' }
];

export const SkillRatingModal: React.FC<SkillRatingModalProps> = ({
  isOpen,
  onClose,
  skill,
  currentRating = 0,
  currentNotes = '',
  onSave
}) => {
  const [rating, setRating] = useState(currentRating);
  const [confidence, setConfidence] = useState(currentRating);
  const [notes, setNotes] = useState(currentNotes);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [hoveredConfidence, setHoveredConfidence] = useState(0);

  const handleSave = () => {
    if (skill && rating > 0) {
      onSave(rating, notes, confidence);
      onClose();
    }
  };

  const handleClose = () => {
    // Reset to current values when closing without saving
    setRating(currentRating);
    setConfidence(currentRating);
    setNotes(currentNotes);
    onClose();
  };

  if (!skill) return null;

  const displayRating = hoveredRating || rating;
  const displayConfidence = hoveredConfidence || confidence;
  const currentRatingDesc = RATING_DESCRIPTIONS.find(r => r.level === displayRating);
  const currentConfidenceDesc = CONFIDENCE_LEVELS.find(c => c.level === displayConfidence);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Rate Your Skill Level
          </DialogTitle>
          <DialogDescription>
            Assess your proficiency in <strong>{skill.name}</strong> to track your progress and get personalized recommendations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Skill Info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{skill.name}</h4>
              <Badge variant="outline">{skill.category}</Badge>
            </div>
            {skill.description && (
              <p className="text-sm text-muted-foreground">{skill.description}</p>
            )}
          </div>

          {/* Proficiency Rating */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Proficiency Level
            </Label>
            
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setRating(level)}
                  onMouseEnter={() => setHoveredRating(level)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className={cn(
                    "p-2 rounded-lg transition-all duration-200 hover:scale-110",
                    (displayRating >= level) ? "text-yellow-500" : "text-muted-foreground hover:text-yellow-400"
                  )}
                >
                  <Star 
                    className={cn(
                      "h-6 w-6 transition-all",
                      (displayRating >= level) ? "fill-current" : ""
                    )} 
                  />
                </button>
              ))}
            </div>

            {currentRatingDesc && (
              <div className="p-3 bg-background/50 rounded-lg border border-border/50">
                <div className={cn("font-medium text-sm", currentRatingDesc.color)}>
                  {currentRatingDesc.label}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {currentRatingDesc.description}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Confidence Level */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Confidence Level
            </Label>
            
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setConfidence(level)}
                  onMouseEnter={() => setHoveredConfidence(level)}
                  onMouseLeave={() => setHoveredConfidence(0)}
                  className={cn(
                    "p-2 rounded-lg transition-all duration-200 hover:scale-110",
                    (displayConfidence >= level) ? "text-blue-500" : "text-muted-foreground hover:text-blue-400"
                  )}
                >
                  <Award 
                    className={cn(
                      "h-5 w-5 transition-all",
                      (displayConfidence >= level) ? "fill-current" : ""
                    )} 
                  />
                </button>
              ))}
            </div>

            {currentConfidenceDesc && (
              <div className="p-3 bg-background/50 rounded-lg border border-border/50">
                <div className="font-medium text-sm text-blue-600">
                  {currentConfidenceDesc.label}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {currentConfidenceDesc.description}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Notes & Reflections (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="What specific areas do you want to improve? What resources have helped you? Any goals or milestones?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-20 bg-background/50"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={rating === 0}
            className="min-w-20"
          >
            Save Rating
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};