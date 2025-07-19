import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Star, 
  Award, 
  BookOpen, 
  MessageSquare, 
  Plus,
  Eye,
  Edit,
  Trash2,
  ExternalLink,
  TrendingUp,
  Users,
  GraduationCap,
  Sparkles
} from "lucide-react";

interface MentorStats {
  resumesReviewed: number;
  courseRecommendations: number;
  averageRating: number;
  totalFeedback: number;
}

interface CourseRecommendation {
  id: string;
  title: string;
  platform: string;
  url?: string;
  skill_tags: string[];
  difficulty: string;
  cost: string;
  description: string;
  reasoning: string;
  created_at: string;
}

interface FeedbackItem {
  id: string;
  resume_event_id: string;
  rating: number;
  feedback: string;
  created_at: string;
  user_name?: string;
  user_role?: string;
}

export default function Teach() {
  const [loading, setLoading] = useState(true);
  const [mentorProfile, setMentorProfile] = useState<any>(null);
  const [stats, setStats] = useState<MentorStats>({
    resumesReviewed: 0,
    courseRecommendations: 0,
    averageRating: 0,
    totalFeedback: 0
  });
  const [courseRecommendations, setCourseRecommendations] = useState<CourseRecommendation[]>([]);
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackItem[]>([]);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseRecommendation | null>(null);
  
  // Course form state
  const [courseForm, setCourseForm] = useState({
    title: "",
    platform: "",
    url: "",
    skill_tags: "",
    difficulty: "",
    cost: "",
    description: "",
    reasoning: ""
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchMentorData();
  }, []);

  const fetchMentorData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get mentor profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          user_badges (
            id,
            badge_type:badge_types (
              name,
              display_name,
              description,
              icon,
              color,
              background_color
            )
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      setMentorProfile(profile);

      // Get mentor feedback stats
      const { data: feedbackData } = await supabase
        .from('mentor_feedback')
        .select('rating')
        .eq('mentor_email', user.email);

      const ratings = feedbackData?.map(f => f.rating) || [];
      const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

      // Get course recommendations count
      const { data: courseData } = await supabase
        .from('recommended_courses')
        .select('id')
        .eq('mentor_id', user.id)
        .eq('active', true);

      // Get feedback history with limited details
      const { data: feedbackHistory } = await supabase
        .from('mentor_feedback')
        .select(`
          id,
          resume_event_id,
          rating,
          feedback,
          created_at
        `)
        .eq('mentor_email', user.email)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get course recommendations
      const { data: coursesData } = await supabase
        .from('recommended_courses')
        .select('*')
        .eq('mentor_id', user.id)
        .eq('active', true)
        .order('created_at', { ascending: false });

      setStats({
        resumesReviewed: feedbackHistory?.length || 0,
        courseRecommendations: courseData?.length || 0,
        averageRating: Math.round(avgRating * 10) / 10,
        totalFeedback: ratings.length
      });

      setFeedbackHistory(feedbackHistory || []);
      setCourseRecommendations(coursesData || []);

    } catch (error) {
      console.error('Error fetching mentor data:', error);
      toast({
        title: "Error",
        description: "Failed to load mentor data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const skillTags = courseForm.skill_tags.split(',').map(tag => tag.trim()).filter(Boolean);

      const courseData = {
        mentor_id: user.id,
        title: courseForm.title,
        platform: courseForm.platform,
        url: courseForm.url || null,
        skill_tags: skillTags,
        difficulty: courseForm.difficulty,
        cost: courseForm.cost,
        description: courseForm.description,
        reasoning: courseForm.reasoning
      };

      if (editingCourse) {
        const { error } = await supabase
          .from('recommended_courses')
          .update(courseData)
          .eq('id', editingCourse.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Course recommendation updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('recommended_courses')
          .insert(courseData);

        if (error) throw error;
        
        toast({
          title: "Success", 
          description: "Course recommendation submitted successfully"
        });
      }

      // Reset form
      setCourseForm({
        title: "",
        platform: "",
        url: "",
        skill_tags: "",
        difficulty: "",
        cost: "",
        description: "",
        reasoning: ""
      });
      setShowCourseForm(false);
      setEditingCourse(null);
      fetchMentorData();

    } catch (error) {
      console.error('Error submitting course:', error);
      toast({
        title: "Error",
        description: "Failed to submit course recommendation",
        variant: "destructive"
      });
    }
  };

  const handleEditCourse = (course: CourseRecommendation) => {
    setCourseForm({
      title: course.title,
      platform: course.platform,
      url: course.url || "",
      skill_tags: course.skill_tags.join(', '),
      difficulty: course.difficulty,
      cost: course.cost,
      description: course.description,
      reasoning: course.reasoning
    });
    setEditingCourse(course);
    setShowCourseForm(true);
  };

  const handleDeleteCourse = async (courseId: string) => {
    try {
      const { error } = await supabase
        .from('recommended_courses')
        .update({ active: false })
        .eq('id', courseId);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Course recommendation deleted"
      });
      
      fetchMentorData();
    } catch (error) {
      console.error('Error deleting course:', error);
      toast({
        title: "Error",
        description: "Failed to delete course recommendation",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading mentor dashboard...</p>
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
            <GraduationCap className="h-8 w-8 text-primary mr-3" />
            <span className="text-lg font-semibold text-primary tracking-wide">MENTOR DASHBOARD</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Teaching & Mentoring
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Share your expertise, recommend courses, and help guide the next generation of talent.
          </p>
        </div>

        {/* Overview Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Mentor Profile Card */}
          <Card className="lg:col-span-1 hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary-foreground">
                  {mentorProfile?.name?.charAt(0) || '?'}
                </span>
              </div>
              <CardTitle className="text-xl">{mentorProfile?.name}</CardTitle>
              <p className="text-muted-foreground">{mentorProfile?.role_title}</p>
              
              {/* AI Verified Badge */}
              <div className="flex justify-center mt-4">
                <Badge className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI-Verified Mentor
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* User Badges */}
              {mentorProfile?.user_badges && mentorProfile.user_badges.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {mentorProfile.user_badges.slice(0, 3).map((badge: any) => (
                    <Badge
                      key={badge.id}
                      variant="outline"
                      className="text-xs"
                      style={{
                        color: badge.badge_type.color,
                        backgroundColor: badge.badge_type.background_color,
                        borderColor: badge.badge_type.color
                      }}
                    >
                      {badge.badge_type.icon} {badge.badge_type.display_name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Cards */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <MessageSquare className="h-8 w-8 text-blue-500" />
                </div>
                <div className="text-2xl font-bold">{stats.resumesReviewed}</div>
                <p className="text-sm text-muted-foreground">Resumes Reviewed</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <BookOpen className="h-8 w-8 text-green-500" />
                </div>
                <div className="text-2xl font-bold">{stats.courseRecommendations}</div>
                <p className="text-sm text-muted-foreground">Courses Recommended</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Star className="h-8 w-8 text-yellow-500" />
                </div>
                <div className="text-2xl font-bold">{stats.averageRating || 'N/A'}</div>
                <p className="text-sm text-muted-foreground">Average Rating</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
                <div className="text-2xl font-bold">{stats.totalFeedback}</div>
                <p className="text-sm text-muted-foreground">Total Feedback</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Action Panels */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Course Recommendation Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Recommend a Course
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => {
                  setShowCourseForm(!showCourseForm);
                  setEditingCourse(null);
                  setCourseForm({
                    title: "",
                    platform: "",
                    url: "",
                    skill_tags: "",
                    difficulty: "",
                    cost: "",
                    description: "",
                    reasoning: ""
                  });
                }}
                className="w-full mb-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Course Recommendation
              </Button>

              {showCourseForm && (
                <form onSubmit={handleCourseSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Course Title</Label>
                    <Input
                      id="title"
                      value={courseForm.title}
                      onChange={(e) => setCourseForm({...courseForm, title: e.target.value})}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="platform">Platform</Label>
                      <Input
                        id="platform"
                        value={courseForm.platform}
                        onChange={(e) => setCourseForm({...courseForm, platform: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <Select value={courseForm.difficulty} onValueChange={(value) => setCourseForm({...courseForm, difficulty: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Beginner">Beginner</SelectItem>
                          <SelectItem value="Intermediate">Intermediate</SelectItem>
                          <SelectItem value="Advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cost">Cost</Label>
                      <Input
                        id="cost"
                        value={courseForm.cost}
                        onChange={(e) => setCourseForm({...courseForm, cost: e.target.value})}
                        placeholder="e.g., Free, $49, $199"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="url">Course URL (Optional)</Label>
                      <Input
                        id="url"
                        type="url"
                        value={courseForm.url}
                        onChange={(e) => setCourseForm({...courseForm, url: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="skill_tags">Skills (comma-separated)</Label>
                    <Input
                      id="skill_tags"
                      value={courseForm.skill_tags}
                      onChange={(e) => setCourseForm({...courseForm, skill_tags: e.target.value})}
                      placeholder="React, JavaScript, Frontend Development"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={courseForm.description}
                      onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="reasoning">Why do you recommend this course?</Label>
                    <Textarea
                      id="reasoning"
                      value={courseForm.reasoning}
                      onChange={(e) => setCourseForm({...courseForm, reasoning: e.target.value})}
                      rows={3}
                      required
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">
                      {editingCourse ? 'Update Course' : 'Submit Recommendation'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowCourseForm(false);
                        setEditingCourse(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Feedback History Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Resume Feedback Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              {feedbackHistory.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No feedback given yet</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {feedbackHistory.map((feedback) => (
                    <div key={feedback.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-medium">{feedback.rating}/5</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {new Date(feedback.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {feedback.feedback || 'No feedback text provided'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Course Recommendations Log */}
        {courseRecommendations.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Your Course Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courseRecommendations.map((course) => (
                  <div key={course.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold line-clamp-1">{course.title}</h3>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditCourse(course)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCourse(course.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">{course.platform}</p>
                    
                    <div className="flex items-center gap-4 text-xs mb-2">
                      <span className="bg-muted px-2 py-1 rounded">{course.difficulty}</span>
                      <span className="text-primary font-medium">{course.cost}</span>
                    </div>
                    
                    {course.skill_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {course.skill_tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {course.description}
                    </p>
                    
                    {course.url && (
                      <Button size="sm" variant="outline" asChild className="w-full">
                        <a href={course.url} target="_blank" rel="noopener noreferrer">
                          View Course
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}