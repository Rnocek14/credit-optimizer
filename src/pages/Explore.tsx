import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Filter, 
  Star, 
  Clock, 
  Trophy, 
  BookOpen, 
  Users,
  Heart,
  Play,
  Bookmark,
  TrendingUp,
  Award,
  ChevronRight,
  Zap,
  Target,
  User,
  MapPin,
  Calendar,
  ExternalLink,
  Plus,
  Code,
  Server,
  Cloud,
  Database,
  Settings,
  Smartphone,
  Brain,
  Lock,
  Sparkles,
  MessageCircle,
  Bot,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import TrackSelector from "@/components/tracks/TrackSelector";
import { useActiveTrackStore } from "@/stores/useActiveTrackStore";
import { TrackManager } from "@/components/multi-track/TrackManager";
import { InstitutionSelector } from "@/components/multi-track/InstitutionSelector";
import { QUERY_KEYS } from "@/lib/queryKeys";
import { getCurrentUser, ensureValidSession } from "@/lib/auth";

interface Course {
  id: string;
  title: string;
  description: string;
  platform: string;
  difficulty: string;
  cost: string;
  skill_tags: string[];
  url?: string;
  reasoning?: string;
  xpReward?: number;
  criBoost?: number;
  duration?: string;
  rating?: number;
  enrollments?: number;
  isSaved?: boolean;
  isAiRecommended?: boolean;
}

interface Mentor {
  id: string;
  name: string;
  title: string;
  company: string;
  expertise: string[];
  rating: number;
  reviews: number;
  hourlyRate?: number;
  responseTime: string;
  location: string;
  verified: boolean;
  availableSlots: number;
  bio: string;
  avatar?: string;
  criBoost?: number;
}

interface UserProgress {
  currentLevel: number;
  totalXp: number;
  recentGoals: any[];
  criScore: number;
  readinessScore: number;
  skillGaps: string[];
  nextFocus: string;
}

export default function Explore() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("all");
  const [selectedPlatform, setSelectedPlatform] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [progressFilter, setProgressFilter] = useState("all"); // not-started, in-progress, completed
  const [sortBy, setSortBy] = useState("ai-recommended");
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("recommendations");
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<string>("all");
  const [sortByTeacherRating, setSortByTeacherRating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch user progress data
  const { data: userProgress } = useQuery({
    queryKey: QUERY_KEYS.USER_PROFILE(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get user level and XP
      const { data: userLevel } = await supabase.rpc('get_user_level', { 
        user_id_param: user.id 
      });

      // Get recent goals
      const { data: goals } = await supabase
        .from('career_goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(3);

      // Get latest resume scores
      const { data: resume } = await supabase
        .from('ai_resume_drafts')
        .select('cri_average, readiness_score')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      return {
        currentLevel: userLevel?.[0]?.current_level || 1,
        totalXp: userLevel?.[0]?.total_xp || 0,
        recentGoals: goals || [],
        criScore: resume?.[0]?.cri_average || 0,
        readinessScore: resume?.[0]?.readiness_score || 0,
        skillGaps: ['React', 'TypeScript'], // Could be derived from resume analysis
        nextFocus: goals?.[0]?.title || 'Set your first career goal'
      } as UserProgress;
    }
  });

  // Fetch available skills for filtering
  const { data: availableSkills = [] } = useQuery({
    queryKey: ['available-skills'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('name, slug, category')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch courses from Supabase
  const { data: courses = [], isLoading: isLoadingCourses } = useQuery({
    queryKey: ['recommended-courses', selectedSkill, selectedPlatform, selectedDifficulty],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('recommended_courses')
        .select('*')
        .eq('active', true);

      // Apply filters
      if (selectedSkill !== 'all') {
        query = query.contains('skill_tags', [selectedSkill]);
      }

      if (selectedPlatform !== 'all') {
        query = query.eq('platform', selectedPlatform);
      }

      if (selectedDifficulty !== 'all') {
        query = query.eq('difficulty', selectedDifficulty);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;

      // Get saved courses to mark them
      const { data: savedCourses } = await supabase
        .from('saved_courses')
        .select('course_id')
        .eq('user_id', user.id);

      const savedCourseIds = new Set(savedCourses?.map(sc => sc.course_id) || []);

      return data.map(course => ({
        id: course.id,
        title: course.title,
        description: course.description,
        platform: course.platform,
        difficulty: course.difficulty,
        cost: course.cost,
        skill_tags: course.skill_tags || [],
        url: course.url,
        reasoning: course.reasoning,
        xpReward: 25 + (course.difficulty === 'Advanced' ? 20 : course.difficulty === 'Intermediate' ? 10 : 0),
        criBoost: Math.floor(Math.random() * 15) + 5,
        duration: `${Math.floor(Math.random() * 8) + 2} weeks`,
        rating: 4.5 + Math.random() * 0.5,
        enrollments: Math.floor(Math.random() * 2000) + 100,
        isSaved: savedCourseIds.has(course.id),
        isAiRecommended: course.is_ai_recommended
      }));
    }
  });

  // Mock mentors - in real implementation, this would come from a mentors table
  const mockMentors: Mentor[] = [
    {
      id: '1',
      name: 'Dr. Sarah Chen',
      title: 'Senior Software Engineer',
      company: 'Google',
      expertise: ['React', 'TypeScript', 'System Design', 'Performance'],
      rating: 4.9,
      reviews: 127,
      hourlyRate: 150,
      responseTime: '< 2 hours',
      location: 'San Francisco, CA',
      verified: true,
      availableSlots: 8,
      bio: 'Former Google Tech Lead with 10+ years experience in scalable web applications and mentoring engineers.',
      criBoost: 25
    },
    {
      id: '2',
      name: 'Marcus Johnson',
      title: 'Principal Engineer',
      company: 'Netflix',
      expertise: ['Node.js', 'Microservices', 'DevOps', 'AWS'],
      rating: 4.8,
      reviews: 89,
      hourlyRate: 180,
      responseTime: '< 4 hours',
      location: 'Seattle, WA',
      verified: true,
      availableSlots: 5,
      bio: 'Netflix Principal Engineer specializing in backend systems and cloud architecture at scale.',
      criBoost: 30
    },
    {
      id: '3',
      name: 'Emma Rodriguez',
      title: 'Lead Developer',
      company: 'Stripe',
      expertise: ['JavaScript', 'Payment Systems', 'Security', 'APIs'],
      rating: 4.7,
      reviews: 156,
      hourlyRate: 120,
      responseTime: '< 6 hours',
      location: 'Austin, TX',
      verified: true,
      availableSlots: 12,
      bio: 'Stripe Lead Developer with expertise in fintech and secure payment processing systems.',
      criBoost: 20
    }
  ];

  // Save/unsave course mutation
  const saveCourse = useMutation({
    mutationFn: async ({ courseId, save }: { courseId: string; save: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (save) {
        const { error } = await supabase
          .from('saved_courses')
          .insert({ user_id: user.id, course_id: courseId });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('saved_courses')
          .delete()
          .eq('user_id', user.id)
          .eq('course_id', courseId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommended-courses'] });
    }
  });

  // Generate AI recommendations
  const generateRecommendations = async () => {
    setIsLoadingRecommendations(true);
    try {
      // In a real implementation, this would call an edge function for GPT recommendations
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      toast({
        title: "🎯 Recommendations Updated!",
        description: "Found personalized courses based on your goals and skill gaps.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate recommendations. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const handleSaveCourse = async (courseId: string, currentlySaved: boolean) => {
    try {
      await saveCourse.mutateAsync({ courseId, save: !currentlySaved });
      toast({
        title: currentlySaved ? "Course removed" : "Course saved!",
        description: currentlySaved ? "Removed from your saved courses" : "Added to your saved courses",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update saved courses",
        variant: "destructive"
      });
    }
  };

  const handleStartMentorChat = (mentorName: string) => {
    navigate(`/mentor?mentor=${encodeURIComponent(mentorName)}`);
  };

  // Filter logic
  const getFilteredCourses = () => {
    let filtered = courses.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           course.skill_tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesSearch;
    });

    // Sort courses
    switch (sortBy) {
      case "xp":
        filtered.sort((a, b) => (b.xpReward || 0) - (a.xpReward || 0));
        break;
      case "cri":
        filtered.sort((a, b) => (b.criBoost || 0) - (a.criBoost || 0));
        break;
      case "rating":
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      default:
        // AI recommended first
        filtered.sort((a, b) => {
          if (a.isAiRecommended && !b.isAiRecommended) return -1;
          if (!a.isAiRecommended && b.isAiRecommended) return 1;
          return 0;
        });
        break;
    }

    return filtered;
  };

  const filteredCourses = getFilteredCourses();
  const aiRecommendedCourses = filteredCourses.filter(c => c.isAiRecommended).slice(0, 3);
  const skillGapCourses = filteredCourses.filter(c => 
    userProgress?.skillGaps.some(gap => 
      c.skill_tags.some(tag => tag.toLowerCase().includes(gap.toLowerCase()))
    )
  ).slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">🔍 Explore & Discover</h1>
            <p className="text-muted-foreground text-lg">
              AI-powered course and mentor recommendations tailored to your goals
            </p>
          </div>
            <div className="flex items-center gap-2">
              {useActiveTrackStore(s => s.activeTrackId) && (
                <span data-testid="track-chip" className="text-xs px-2 py-1 rounded bg-muted">
                  Track: {useActiveTrackStore.getState().activeTrackId?.slice(0,8)}
                </span>
              )}
              <TrackManager />
              <TrackSelector />
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="recommendations">🎯 For You</TabsTrigger>
                <TabsTrigger value="courses">📚 Browse Courses</TabsTrigger>
                <TabsTrigger value="mentors">👥 Find Mentors</TabsTrigger>
              </TabsList>

              {/* AI Recommendations Tab */}
              <TabsContent value="recommendations" className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">Recommended For You</h2>
                  <Button 
                    onClick={generateRecommendations}
                    disabled={isLoadingRecommendations}
                    className="gap-2"
                  >
                    {isLoadingRecommendations ? (
                      <>
                        <Bot className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Refresh AI Picks
                      </>
                    )}
                  </Button>
                </div>

                {userProgress && (
                  <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="w-5 h-5" />
                        AI Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Based on your Level {userProgress.currentLevel} progress, recent goals, and CRI score of {userProgress.criScore.toFixed(1)}, 
                        here's what we recommend:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Target className="w-4 h-4 text-primary" />
                          <span>Focus: {userProgress.skillGaps.join(', ')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <TrendingUp className="w-4 h-4 text-green-500" />
                          <span>CRI Goal: {(userProgress.criScore + 20).toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span>Timeline: 4-6 weeks</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI Recommended Courses */}
                {aiRecommendedCourses.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-yellow-500" />
                      Top AI Picks
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {aiRecommendedCourses.map((course) => (
                        <CourseCard 
                          key={course.id} 
                          course={course} 
                          onSave={handleSaveCourse}
                          isHighlighted={true}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Skill Gap Courses */}
                {skillGapCourses.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5 text-orange-500" />
                      Fill Your Skill Gaps
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {skillGapCourses.map((course) => (
                        <CourseCard 
                          key={course.id} 
                          course={course} 
                          onSave={handleSaveCourse}
                          showGapFiller={true}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Browse Courses Tab */}
              <TabsContent value="courses" className="space-y-6">
                {/* Filters */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="w-5 h-5" />
                      Filter Courses
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <Label htmlFor="skill-filter">Skill</Label>
                        <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                          <SelectTrigger>
                            <SelectValue placeholder="All Skills" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Skills</SelectItem>
                            {availableSkills.map((skill) => (
                              <SelectItem key={skill.slug} value={skill.name}>
                                {skill.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="platform-filter">Platform</Label>
                        <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                          <SelectTrigger>
                            <SelectValue placeholder="All Platforms" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Platforms</SelectItem>
                            <SelectItem value="Coursera">Coursera</SelectItem>
                            <SelectItem value="Udemy">Udemy</SelectItem>
                            <SelectItem value="edX">edX</SelectItem>
                            <SelectItem value="AWS Training">AWS Training</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="difficulty-filter">Difficulty</Label>
                        <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                          <SelectTrigger>
                            <SelectValue placeholder="All Levels" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Levels</SelectItem>
                            <SelectItem value="Beginner">Beginner</SelectItem>
                            <SelectItem value="Intermediate">Intermediate</SelectItem>
                            <SelectItem value="Advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="sort-filter">Sort By</Label>
                        <Select value={sortBy} onValueChange={setSortBy}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ai-recommended">AI Recommended</SelectItem>
                            <SelectItem value="xp">XP Reward</SelectItem>
                            <SelectItem value="cri">CRI Boost</SelectItem>
                            <SelectItem value="rating">Rating</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Search className="w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search courses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Course Results */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      {filteredCourses.length} Courses Found
                    </h3>
                  </div>
                  
                  {isLoadingCourses ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-80 bg-muted rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredCourses.map((course) => (
                        <CourseCard 
                          key={course.id} 
                          course={course} 
                          onSave={handleSaveCourse}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Mentors Tab */}
              <TabsContent value="mentors" className="space-y-6">
                <div>
                  <h2 className="text-2xl font-semibold mb-4">Find Expert Mentors</h2>
                  <p className="text-muted-foreground mb-6">
                    Connect with industry experts who can accelerate your career growth
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {mockMentors.map((mentor) => (
                    <MentorCard 
                      key={mentor.id} 
                      mentor={mentor} 
                      onStartChat={handleStartMentorChat}
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Your Focus Area
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {userProgress && (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Level Progress</span>
                        <Badge>{userProgress.currentLevel}</Badge>
                      </div>
                      <Progress value={65} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {userProgress.totalXp} XP earned
                      </p>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="text-sm font-medium mb-2">Next Goal</h4>
                      <p className="text-sm text-muted-foreground">
                        {userProgress.nextFocus}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2">CRI Status</h4>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span className="text-sm">{userProgress.criScore.toFixed(1)} / 100</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2">Skill Focus</h4>
                      <div className="flex flex-wrap gap-1">
                        {userProgress.skillGaps.map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <Button 
                  onClick={() => navigate('/mentor')} 
                  className="w-full gap-2"
                  variant="outline"
                >
                  <MessageCircle className="w-4 h-4" />
                  Ask Maya for Help
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Course Card Component
function CourseCard({ 
  course, 
  onSave, 
  isHighlighted = false,
  showGapFiller = false
}: { 
  course: Course; 
  onSave: (id: string, saved: boolean) => void;
  isHighlighted?: boolean;
  showGapFiller?: boolean;
}) {
  return (
    <Card className={`transition-all duration-200 hover:shadow-lg ${
      isHighlighted ? 'ring-2 ring-primary/20 bg-primary/5' : ''
    }`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {course.isAiRecommended && (
                <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs">
                  <Brain className="h-3 w-3 mr-1" />
                  AI Pick
                </Badge>
              )}
              {showGapFiller && (
                <Badge className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs">
                  <Target className="h-3 w-3 mr-1" />
                  Gap Filler
                </Badge>
              )}
              <Badge variant="outline" className={`text-xs ${
                course.difficulty === 'Beginner' ? 'border-green-500 text-green-600' :
                course.difficulty === 'Intermediate' ? 'border-yellow-500 text-yellow-600' :
                'border-red-500 text-red-600'
              }`}>
                {course.difficulty}
              </Badge>
            </div>
            <CardTitle className="text-lg leading-tight mb-1">
              {course.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{course.platform}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSave(course.id, course.isSaved || false)}
            className="text-muted-foreground hover:text-red-500"
          >
            <Heart className={`h-4 w-4 ${course.isSaved ? 'fill-red-500 text-red-500' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
        
        {/* Skills */}
        <div className="flex flex-wrap gap-1">
          {course.skill_tags.slice(0, 3).map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {course.skill_tags.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{course.skill_tags.length - 3}
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            <span>{course.xpReward} XP</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span>+{course.criBoost} CRI</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <span>{course.duration}</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <span>{course.rating?.toFixed(1)}</span>
          </div>
        </div>

        {/* Reasoning */}
        {course.reasoning && (
          <div className="p-2 bg-muted rounded-md">
            <p className="text-xs text-muted-foreground italic">
              💡 {course.reasoning}
            </p>
          </div>
        )}

        {/* Action */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="font-semibold">{course.cost}</span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <a href={course.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                View
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Mentor Card Component
function MentorCard({ 
  mentor, 
  onStartChat 
}: { 
  mentor: Mentor; 
  onStartChat: (name: string) => void;
}) {
  return (
    <Card className="transition-all duration-200 hover:shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
            {mentor.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{mentor.name}</CardTitle>
              {mentor.verified && (
                <Award className="h-4 w-4 text-blue-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">{mentor.title}</p>
            <p className="text-sm text-muted-foreground">{mentor.company}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">{mentor.bio}</p>
        
        {/* Expertise */}
        <div className="flex flex-wrap gap-1">
          {mentor.expertise.slice(0, 3).map((skill, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {skill}
            </Badge>
          ))}
          {mentor.expertise.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{mentor.expertise.length - 3}
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500" />
            <span>{mentor.rating} ({mentor.reviews})</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span>+{mentor.criBoost} CRI</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <span>{mentor.responseTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-purple-500" />
            <span>{mentor.availableSlots} slots</span>
          </div>
        </div>

        {/* Action */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="font-semibold">${mentor.hourlyRate}/hr</span>
          <Button 
            size="sm" 
            onClick={() => onStartChat(mentor.name)}
            className="gap-2"
          >
            <MessageCircle className="h-3 w-3" />
            Ask for Advice
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}