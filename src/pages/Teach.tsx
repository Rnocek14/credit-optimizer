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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  GraduationCap, 
  Star, 
  Users, 
  BookOpen, 
  Award, 
  Plus,
  ExternalLink,
  Edit,
  Trash2,
  MessageSquare,
  TrendingUp,
  Sparkles
} from "lucide-react";

interface MentorProfile {
  id: string;
  user_id: string;
  name: string;
  role_title: string;
  badges: Array<{
    id: string;
    badge_type: {
      name: string;
      display_name: string;
      icon: string;
      color: string;
      background_color: string;
    };
  }>;
}

interface MentorStats {
  resumes_reviewed: number;
  courses_recommended: number;
  average_rating: number;
  total_feedback: number;
}

interface FeedbackRecord {
  id: string;
  resume_event_id: string;
  rating: number;
  feedback: string;
  created_at: string;
  recommend_for_gallery: boolean;
  recommend_for_jobs: boolean;
}

interface CourseRecommendation {
  id: string;
  title: string;
  platform: string;
  url: string;
  skill_tags: string[];
  difficulty: string;
  cost: string;
  description: string;
  reasoning: string;
  is_ai_recommended: boolean;
  created_at: string;
}

export default function Teach() {
  const [profile, setProfile] = useState<MentorProfile | null>(null);
  const [stats, setStats] = useState<MentorStats>({
    resumes_reviewed: 0,
    courses_recommended: 0,
    average_rating: 0,
    total_feedback: 0
  });
  const [feedbackRecords, setFeedbackRecords] = useState<FeedbackRecord[]>([]);
  const [courseRecommendations, setCourseRecommendations] = useState<CourseRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Course recommendation form state
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

  useEffect(() => {
    fetchMentorData();
  }, []);

  const fetchMentorData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get mentor profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          name,
          role_title
        `)
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      // Get badges
      const { data: badgesData } = await supabase
        .from('user_badges')
        .select(`
          id,
          badge_type:badge_types (
            name,
            display_name,
            icon,
            color,
            background_color
          )
        `)
        .eq('user_id', user.id)
        .eq('active', true);

      setProfile({
        ...profileData,
        badges: badgesData || []
      });

      // Get mentor feedback records
      const { data: feedbackData } = await supabase
        .from('mentor_feedback')
        .select('*')
        .eq('mentor_email', user.email) // Assuming mentor_email maps to user email
        .order('created_at', { ascending: false });

      setFeedbackRecords(feedbackData || []);

      // Calculate stats
      const ratings = feedbackData?.map(f => f.rating) || [];
      const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

      // Get course recommendations
      const { data: coursesData } = await supabase
        .from('recommended_courses')
        .select('*')
        .eq('mentor_id', user.id)
        .eq('active', true)
        .order('created_at', { ascending: false });

      setCourseRecommendations(coursesData || []);

      setStats({
        resumes_reviewed: feedbackData?.length || 0,
        courses_recommended: coursesData?.length || 0,
        average_rating: Math.round(avgRating * 10) / 10,
        total_feedback: feedbackData?.length || 0
      });

    } catch (error) {
      console.error('Error fetching mentor data:', error);
      toast({
        title: "Error",
        description: "Failed to load mentor data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('recommended_courses')
        .insert({
          mentor_id: user.id,
          title: courseForm.title,
          platform: courseForm.platform,
          url: courseForm.url,
          skill_tags: courseForm.skill_tags.split(',').map(s => s.trim()).filter(Boolean),
          difficulty: courseForm.difficulty,
          cost: courseForm.cost,
          description: courseForm.description,
          reasoning: courseForm.reasoning
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Course recommendation submitted successfully!",
      });

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

      // Refresh data
      fetchMentorData();

    } catch (error) {
      console.error('Error submitting course:', error);
      toast({
        title: "Error",
        description: "Failed to submit course recommendation.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
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
        description: "Course recommendation deleted.",
      });

      fetchMentorData();
    } catch (error) {
      console.error('Error deleting course:', error);
      toast({
        title: "Error",
        description: "Failed to delete course recommendation.",
        variant: "destructive",
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
            Welcome, {profile?.name}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Share your expertise, recommend courses, and help shape the next generation of talent.
          </p>
        </div>

        {/* Overview Panel */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Mentor Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Profile Info */}
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-primary-foreground">
                    {profile?.name?.charAt(0) || '?'}
                  </span>
                </div>
                <h3 className="font-bold">{profile?.name}</h3>
                <p className="text-sm text-muted-foreground">{profile?.role_title}</p>
                
                {/* AI Verified Badge */}
                <div className="mt-3">
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI-Verified Mentor
                  </Badge>
                </div>
              </div>

              {/* Stats */}
              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-1">{stats.resumes_reviewed}</div>
                <div className="text-sm text-muted-foreground">Resumes Reviewed</div>
                <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mt-2" />
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-1">{stats.courses_recommended}</div>
                <div className="text-sm text-muted-foreground">Courses Recommended</div>
                <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mt-2" />
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-primary mb-1">{stats.average_rating}/5</div>
                <div className="text-sm text-muted-foreground">Average Rating</div>
                <Star className="h-8 w-8 text-muted-foreground mx-auto mt-2" />
              </div>
            </div>

            {/* Badges */}
            {profile?.badges && profile.badges.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold mb-3">Your Badges</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.badges.map((badge) => (
                    <Badge
                      key={badge.id}
                      variant="outline"
                      className="px-3 py-1"
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
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Panels */}
        <Tabs defaultValue="recommend" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="recommend">Recommend Course</TabsTrigger>
            <TabsTrigger value="feedback">Feedback Log</TabsTrigger>
            <TabsTrigger value="courses">My Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="recommend">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Recommend a Course
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCourseSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="title">Course Title *</Label>
                      <Input
                        id="title"
                        value={courseForm.title}
                        onChange={(e) => setCourseForm({...courseForm, title: e.target.value})}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="platform">Platform *</Label>
                      <Input
                        id="platform"
                        value={courseForm.platform}
                        onChange={(e) => setCourseForm({...courseForm, platform: e.target.value})}
                        placeholder="e.g., Coursera, Udemy, edX"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="url">Course URL</Label>
                    <Input
                      id="url"
                      type="url"
                      value={courseForm.url}
                      onChange={(e) => setCourseForm({...courseForm, url: e.target.value})}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="skill_tags">Skills (comma-separated)</Label>
                      <Input
                        id="skill_tags"
                        value={courseForm.skill_tags}
                        onChange={(e) => setCourseForm({...courseForm, skill_tags: e.target.value})}
                        placeholder="React, JavaScript, Web Development"
                      />
                    </div>
                    <div>
                      <Label>Difficulty</Label>
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
                    <div>
                      <Label htmlFor="cost">Cost</Label>
                      <Input
                        id="cost"
                        value={courseForm.cost}
                        onChange={(e) => setCourseForm({...courseForm, cost: e.target.value})}
                        placeholder="Free, $49, $99"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Course Description</Label>
                    <Textarea
                      id="description"
                      value={courseForm.description}
                      onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                      placeholder="Brief description of what the course covers..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="reasoning">Why do you recommend this course?</Label>
                    <Textarea
                      id="reasoning"
                      value={courseForm.reasoning}
                      onChange={(e) => setCourseForm({...courseForm, reasoning: e.target.value})}
                      placeholder="Explain why this course is valuable and who would benefit..."
                    />
                  </div>

                  <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? "Submitting..." : "Recommend Course"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Resume Feedback Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                {feedbackRecords.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No feedback submitted yet</h3>
                    <p className="text-muted-foreground">Your resume reviews will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {feedbackRecords.map((feedback) => (
                      <div key={feedback.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < feedback.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {new Date(feedback.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {feedback.recommend_for_gallery && (
                              <Badge variant="secondary">Gallery Rec</Badge>
                            )}
                            {feedback.recommend_for_jobs && (
                              <Badge variant="secondary">Job Rec</Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm">{feedback.feedback}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  My Course Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {courseRecommendations.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No course recommendations yet</h3>
                    <p className="text-muted-foreground">Start by recommending your first course!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {courseRecommendations.map((course) => (
                      <div key={course.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold">{course.title}</h3>
                            <p className="text-sm text-muted-foreground">{course.platform}</p>
                          </div>
                          <div className="flex gap-2">
                            {course.is_ai_recommended && (
                              <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                                <Sparkles className="h-3 w-3 mr-1" />
                                AI
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCourse(course.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-3">
                          {course.skill_tags.map((skill, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <span>{course.difficulty}</span>
                          <span>{course.cost}</span>
                        </div>

                        <p className="text-sm mb-3">{course.description}</p>

                        {course.url && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={course.url} target="_blank" rel="noopener noreferrer">
                              View Course
                              <ExternalLink className="h-3 w-3 ml-2" />
                            </a>
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}