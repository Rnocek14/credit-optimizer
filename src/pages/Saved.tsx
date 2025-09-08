import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/lib/authHelper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SaveButton from "@/components/SaveButton";
import { StartLearningButton } from "@/components/StartLearningButton";
import { CourseCompletionModal } from "@/components/CourseCompletionModal";
import { useCourseProgress } from "@/hooks/useCourseProgress";
import { 
  BookOpen, 
  ExternalLink,
  Sparkles,
  Award,
  Trash2,
  Trophy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SavedCourse {
  id: string;
  created_at: string;
  course: {
    id: string;
    title: string;
    platform: string;
    difficulty: string;
    cost: string;
    skill_tags: string[];
    url: string;
    is_ai_recommended: boolean;
    mentor_id?: string;
    mentor: {
      name: string;
      role_title: string;
    };
  };
}

export default function Saved() {
  const [savedCourses, setSavedCourses] = useState<SavedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [selectedCourseForCompletion, setSelectedCourseForCompletion] = useState<{id: string, title: string} | null>(null);
  const { toast } = useToast();
  const { getProgressStatus } = useCourseProgress();

  useEffect(() => {
    fetchSavedCourses();
  }, []);

  const fetchSavedCourses = async () => {
    try {
      console.log('🔍 Fetching saved courses...');
      const user = await getCurrentUser();
      console.log('👤 User:', user?.id);
      
      if (!user) {
        console.log('❌ No user found');
        setLoading(false);
        return;
      }

      // First get saved courses with course IDs
      const { data: savedData, error: savedError } = await supabase
        .from('saved_courses')
        .select('id, created_at, course_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('💾 Saved courses data:', savedData);
      if (savedError) {
        console.error('❌ Saved courses error:', savedError);
        throw savedError;
      }

      if (!savedData || savedData.length === 0) {
        console.log('📭 No saved courses found');
        setSavedCourses([]);
        return;
      }

      // Get course details for each saved course
      const courseIds = savedData.map(saved => saved.course_id);
      console.log('🔍 Course IDs to fetch:', courseIds);

      const { data: coursesData, error: coursesError } = await supabase
        .from('recommended_courses')
        .select('id, title, platform, difficulty, cost, skill_tags, url, is_ai_recommended, mentor_id')
        .in('id', courseIds);

      console.log('📚 Courses data:', coursesData);
      if (coursesError) {
        console.error('❌ Courses error:', coursesError);
        throw coursesError;
      }

      // Combine saved data with course data
      const combinedData = savedData.map(saved => {
        const course = coursesData?.find(c => c.id === saved.course_id);
        return {
          id: saved.id,
          created_at: saved.created_at,
          course: course || null
        };
      }).filter(item => item.course) as Array<{
        id: string;
        created_at: string;
        course: any;
      }>;

      console.log('🔄 Combined data:', combinedData);

      // Get mentor info for each course
      const coursesWithMentors = await Promise.all(
        combinedData.map(async (saved) => {
          let mentorData = null;
          
          if (saved.course.mentor_id) {
            try {
              const { data } = await supabase
                .from('profiles')
                .select('name, role_title')
                .eq('user_id', saved.course.mentor_id)
                .maybeSingle();
              mentorData = data;
            } catch (mentorError) {
              console.warn('⚠️ Mentor fetch error:', mentorError);
            }
          }

          return {
            ...saved,
            course: {
              ...saved.course,
              mentor: mentorData || { name: 'Anonymous Mentor', role_title: 'Educator' }
            }
          };
        })
      );

      console.log('✅ Final courses with mentors:', coursesWithMentors);
      setSavedCourses(coursesWithMentors as SavedCourse[]);
    } catch (error) {
      console.error('💥 Error fetching saved courses:', error);
      toast({
        title: "Error",
        description: "Failed to load saved courses.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (courseId: string) => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { error } = await supabase
        .from('saved_courses')
        .delete()
        .eq('user_id', user.id)
        .eq('course_id', courseId);

      if (error) throw error;

      // Update local state
      setSavedCourses(prev => prev.filter(saved => saved.course.id !== courseId));

      toast({
        title: "Course removed",
        description: "Course removed from your saved list.",
      });
    } catch (error) {
      console.error('Error removing saved course:', error);
      toast({
        title: "Error",
        description: "Failed to remove course.",
        variant: "destructive",
      });
    }
  };

  const handleCompleteClick = (courseId: string, courseTitle: string) => {
    setSelectedCourseForCompletion({ id: courseId, title: courseTitle });
    setCompletionModalOpen(true);
  };

  const handleCompletionClose = () => {
    setCompletionModalOpen(false);
    setSelectedCourseForCompletion(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading saved courses...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <BookOpen className="h-8 w-8 text-primary mr-3" />
            <span className="text-lg font-semibold text-primary tracking-wide">MY SAVED COURSES</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Your Learning Library
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Keep track of courses you want to take and build your personalized learning path.
          </p>
        </div>

        {/* Saved Courses Grid */}
        {savedCourses.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold mb-4">No saved courses yet</h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Start exploring courses and save the ones you're interested in to build your learning library.
            </p>
            <Button asChild size="lg">
              <a href="/explore">
                Explore Courses
              </a>
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="text-muted-foreground">
                {savedCourses.length} course{savedCourses.length === 1 ? '' : 's'} saved
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedCourses.map((saved) => (
                <Card key={saved.id} className="soft-hover transition-all duration-300 hover:shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-2 line-clamp-2">{saved.course.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{saved.course.platform}</p>
                      </div>
                      <div className="flex gap-2">
                        {saved.course.is_ai_recommended && (
                          <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mb-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Award className="h-4 w-4 text-muted-foreground" />
                        {saved.course.difficulty}
                      </div>
                      <div className="font-medium text-primary">
                        {saved.course.cost}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-4">
                      {saved.course.skill_tags.slice(0, 3).map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>

                    <div className="text-xs text-muted-foreground mb-4 pt-2 border-t">
                      <p>Recommended by <span className="font-medium">{saved.course.mentor.name}</span></p>
                      <p>{saved.course.mentor.role_title}</p>
                    </div>

                    <div className="flex gap-2">
                      <StartLearningButton
                        courseId={saved.course.id}
                        courseUrl={saved.course.url}
                        size="sm"
                        className="flex-1"
                      />
                      {getProgressStatus(saved.course.id) === 'in_progress' && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleCompleteClick(saved.course.id, saved.course.title)}
                          className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600"
                        >
                          <Trophy className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnsave(saved.course.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="text-xs text-muted-foreground mt-3">
                      Saved on {new Date(saved.created_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Course Completion Modal */}
      {selectedCourseForCompletion && (
        <CourseCompletionModal
          isOpen={completionModalOpen}
          onClose={handleCompletionClose}
          courseId={selectedCourseForCompletion.id}
          courseTitle={selectedCourseForCompletion.title}
        />
      )}
    </div>
  );
}