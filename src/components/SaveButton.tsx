import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Bookmark, BookmarkCheck } from "lucide-react";
import TutorialTip from '@/tutorial/TutorialTip';

interface SaveButtonProps {
  courseId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export default function SaveButton({ courseId, variant = "outline", size = "sm", className = "" }: SaveButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkSavedStatus();
  }, [courseId]);

  const checkSavedStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAuthenticated(false);
        return;
      }

      setIsAuthenticated(true);

      const { data, error } = await supabase
        .from('saved_courses')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      setIsSaved(!!data);
    } catch (error) {
      console.error('Error checking saved status:', error);
    }
  };

  const handleSaveToggle = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save courses.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (isSaved) {
        // Unsave the course
        const { error } = await supabase
          .from('saved_courses')
          .delete()
          .eq('user_id', user.id)
          .eq('course_id', courseId);

        if (error) throw error;

        setIsSaved(false);
        toast({
          title: "Course removed",
          description: "Course removed from your saved list.",
        });
      } else {
        // Save the course
        const { error } = await supabase
          .from('saved_courses')
          .insert({
            user_id: user.id,
            course_id: courseId
          });

        if (error) throw error;

        setIsSaved(true);
        toast({
          title: "Course saved!",
          description: "Course added to your saved list.",
        });
      }
    } catch (error) {
      console.error('Error toggling save status:', error);
      toast({
        title: "Error",
        description: "Failed to update saved status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant={variant}
          size={size}
          className={className}
          onClick={handleSaveToggle}
          disabled={loading}
        >
          <Bookmark className="h-4 w-4 mr-2" />
          Save
        </Button>
        <TutorialTip id="saveButtonUnauthenticated" label="Sign in to save courses to your personalized learning plan" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant={isSaved ? "default" : variant}
        size={size}
        className={className}
        onClick={handleSaveToggle}
        disabled={loading}
      >
        {isSaved ? (
          <>
            <BookmarkCheck className="h-4 w-4 mr-2" />
            Saved
          </>
        ) : (
          <>
            <Bookmark className="h-4 w-4 mr-2" />
            Save
          </>
        )}
      </Button>
      <TutorialTip 
        id={isSaved ? "saveButtonSaved" : "saveButtonAuthenticated"} 
        label={isSaved ? "Course successfully saved to your learning plan" : "Save courses to your personalized learning plan when logged in"} 
      />
    </div>
  );
}