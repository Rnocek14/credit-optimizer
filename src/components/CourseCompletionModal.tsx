import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trophy, Zap, BookOpen } from 'lucide-react';
import { useCourseProgress } from '@/hooks/useCourseProgress';
import confetti from 'canvas-confetti';

interface CourseCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle?: string;
}

export function CourseCompletionModal({
  isOpen,
  onClose,
  courseId,
  courseTitle = "this course"
}: CourseCompletionModalProps) {
  const [notes, setNotes] = useState('');
  const { completeCourse } = useCourseProgress();

  const handleComplete = async () => {
    try {
      await completeCourse.mutateAsync({ courseId, notes });
      
      // Trigger confetti animation
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      
      onClose();
      setNotes('');
    } catch (error) {
      console.error('Error completing course:', error);
    }
  };

  const handleClose = () => {
    onClose();
    setNotes('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-yellow-400 to-orange-500">
            <Trophy className="h-10 w-10 text-white" />
          </div>
          <DialogTitle className="text-xl">
            Congratulations! 🎉
          </DialogTitle>
          <DialogDescription className="text-base">
            You're about to complete <strong>{courseTitle}</strong>!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* XP Reward Badge */}
          <div className="flex justify-center">
            <Badge variant="default" className="px-4 py-2 text-base gap-2">
              <Zap className="h-4 w-4" />
              +50 XP Reward
            </Badge>
          </div>

          {/* Completion Notes */}
          <div className="space-y-2">
            <Label htmlFor="completion-notes">
              Share your thoughts (optional)
            </Label>
            <Textarea
              id="completion-notes"
              placeholder="What did you learn? How was the course? Any key takeaways?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Benefits */}
          <div className="bg-muted rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Course completion benefits:
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 50 XP added to your profile</li>
              <li>• Course added to your resume</li>
              <li>• Learning milestone achievement</li>
              <li>• Progress towards badges</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose}>
            Not Yet
          </Button>
          <Button 
            onClick={handleComplete}
            disabled={completeCourse.isPending}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"
          >
            {completeCourse.isPending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
            ) : (
              <Trophy className="h-4 w-4 mr-2" />
            )}
            Complete Course
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}