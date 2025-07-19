import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { 
  Star, 
  User, 
  GraduationCap, 
  Filter, 
  Search, 
  MapPin, 
  ExternalLink,
  Sparkles,
  Award,
  Target
} from "lucide-react";

interface Mentor {
  id: string;
  user_id: string;
  name: string;
  role_title: string;
  location: string;
  skills: string[];
  industry: string;
  resume_review_summary: string;
  rating: number;
  feedback_count: number;
}

interface Course {
  id: string;
  title: string;
  platform: string;
  difficulty: string;
  cost: string;
  skill_tags: string[];
  url: string;
  is_ai_recommended: boolean;
  mentor: {
    name: string;
    role_title: string;
  };
}

export default function Explore() {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filters
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [minRating, setMinRating] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [showFreeOnly, setShowFreeOnly] = useState(false);

  useEffect(() => {
    fetchMentors();
    fetchCourses();
  }, []);

  const fetchMentors = async () => {
    try {
      // Get profiles marked as mentors (using a field that exists)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          name,
          role_title,
          location,
          skills,
          industry,
          resume_review_summary
        `)
        .eq('gallery_enabled', true)
        .not('resume_review_summary', 'is', null);

      if (profilesError) throw profilesError;

      // Get mentor feedback ratings for each profile
      const mentorsWithRatings = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { data: feedbackData } = await supabase
            .from('mentor_feedback')
            .select('rating')
            .eq('mentor_email', profile.user_id); // This would need proper email lookup

          const ratings = feedbackData?.map(f => f.rating) || [];
          const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

          return {
            ...profile,
            rating: Math.round(avgRating * 10) / 10,
            feedback_count: ratings.length
          };
        })
      );

      setMentors(mentorsWithRatings);
    } catch (error) {
      console.error('Error fetching mentors:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data: coursesData, error } = await supabase
        .from('recommended_courses')
        .select(`
          id,
          title,
          platform,
          difficulty,
          cost,
          skill_tags,
          url,
          is_ai_recommended,
          profiles!recommended_courses_mentor_id_fkey (
            name,
            role_title
          )
        `)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCourses(coursesData || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };
        })
      );

      setMentors(mentorsWithRatings);
    } catch (error) {
      console.error('Error fetching mentors:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and search logic
  const filteredMentors = useMemo(() => {
    return mentors.filter(mentor => {
      const matchesSearch = !searchTerm || 
        mentor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mentor.role_title?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSkills = selectedSkills.length === 0 || 
        selectedSkills.some(skill => mentor.skills?.includes(skill));
      
      const matchesIndustry = !selectedIndustry || mentor.industry === selectedIndustry;
      const matchesRole = !selectedRole || mentor.role_title?.includes(selectedRole);
      const matchesRating = !minRating || mentor.rating >= parseFloat(minRating);

      return matchesSearch && matchesSkills && matchesIndustry && matchesRole && matchesRating;
    });
  }, [mentors, searchTerm, selectedSkills, selectedIndustry, selectedRole, minRating]);

  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const matchesSearch = !searchTerm || 
        course.title.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSkills = selectedSkills.length === 0 || 
        selectedSkills.some(skill => course.skill_tags.includes(skill));
      
      const matchesPlatform = !selectedPlatform || course.platform === selectedPlatform;
      const matchesDifficulty = !selectedDifficulty || course.difficulty === selectedDifficulty;
      const matchesFree = !showFreeOnly || course.cost === "Free";

      return matchesSearch && matchesSkills && matchesPlatform && matchesDifficulty && matchesFree;
    });
  }, [courses, searchTerm, selectedSkills, selectedPlatform, selectedDifficulty, showFreeOnly]);

  const availableSkills = ["React", "JavaScript", "Python", "UX Design", "Machine Learning", "Frontend", "Backend"];
  const availableIndustries = ["Technology", "Healthcare", "Finance", "Education", "Marketing"];
  const availablePlatforms = ["Coursera", "edX", "Udemy", "Pluralsight"];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading courses & mentors...</p>
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
            <Target className="h-8 w-8 text-primary mr-3" />
            <span className="text-lg font-semibold text-primary tracking-wide">EXPLORE</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Explore Courses & Mentors
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover curated learning resources and connect with experienced mentors to accelerate your career growth.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-md mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses or mentors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="mentors" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
            <TabsTrigger value="mentors" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Mentors
            </TabsTrigger>
            <TabsTrigger value="courses" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Courses
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mentors">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Mentors Filters */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Filters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Industry</Label>
                      <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Industries" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Industries</SelectItem>
                          {availableIndustries.map(industry => (
                            <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Min Rating</Label>
                      <Select value={minRating} onValueChange={setMinRating}>
                        <SelectTrigger>
                          <SelectValue placeholder="Any Rating" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Any Rating</SelectItem>
                          <SelectItem value="4">4+ Stars</SelectItem>
                          <SelectItem value="4.5">4.5+ Stars</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Mentors Grid */}
              <div className="lg:col-span-3">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredMentors.map((mentor) => (
                    <Card key={mentor.id} className="hover:scale-105 transition-all duration-300 hover:shadow-lg">
                      <CardContent className="p-6">
                        <div className="text-center mb-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center mx-auto mb-3">
                            <span className="text-xl font-bold text-primary-foreground">
                              {mentor.name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <h3 className="font-bold text-lg mb-1">{mentor.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{mentor.role_title}</p>
                          {mentor.location && (
                            <div className="flex items-center justify-center text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 mr-1" />
                              {mentor.location}
                            </div>
                          )}
                        </div>

                        {mentor.rating > 0 && (
                          <div className="flex items-center justify-center mb-4">
                            <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full">
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <span className="text-sm font-medium">{mentor.rating}</span>
                              <span className="text-xs text-muted-foreground">({mentor.feedback_count})</span>
                            </div>
                          </div>
                        )}

                        {mentor.skills && mentor.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-4">
                            {mentor.skills.slice(0, 3).map((skill, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <Button asChild variant="outline" className="w-full">
                          <Link to={`/resume/${mentor.user_id}`}>
                            View Profile
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {filteredMentors.length === 0 && (
                  <div className="text-center py-12">
                    <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No mentors found</h3>
                    <p className="text-muted-foreground">Try adjusting your search criteria.</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="courses">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Courses Filters */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Filters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Platform</Label>
                      <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Platforms" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Platforms</SelectItem>
                          {availablePlatforms.map(platform => (
                            <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Difficulty</Label>
                      <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Levels" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Levels</SelectItem>
                          <SelectItem value="Beginner">Beginner</SelectItem>
                          <SelectItem value="Intermediate">Intermediate</SelectItem>
                          <SelectItem value="Advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch 
                        id="free-only" 
                        checked={showFreeOnly}
                        onCheckedChange={setShowFreeOnly}
                      />
                      <Label htmlFor="free-only">Free only</Label>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Courses Grid */}
              <div className="lg:col-span-3">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredCourses.map((course) => (
                    <Card key={course.id} className="hover:scale-105 transition-all duration-300 hover:shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg mb-2 line-clamp-2">{course.title}</h3>
                            <p className="text-sm text-muted-foreground mb-2">{course.platform}</p>
                          </div>
                          {course.is_ai_recommended && (
                            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                              <Sparkles className="h-3 w-3 mr-1" />
                              AI Suggested
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mb-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Award className="h-4 w-4 text-muted-foreground" />
                            {course.difficulty}
                          </div>
                          <div className="font-medium text-primary">
                            {course.cost}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1 mb-4">
                          {course.skill_tags.slice(0, 3).map((skill, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                        </div>

                        <div className="text-xs text-muted-foreground mb-4 pt-2 border-t">
                          <p>Recommended by <span className="font-medium">{course.mentor.name}</span></p>
                          <p>{course.mentor.role_title}</p>
                        </div>

                        <Button asChild className="w-full">
                          <a href={course.url} target="_blank" rel="noopener noreferrer">
                            View Course
                            <ExternalLink className="h-4 w-4 ml-2" />
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {filteredCourses.length === 0 && (
                  <div className="text-center py-12">
                    <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No courses found</h3>
                    <p className="text-muted-foreground">Try adjusting your search criteria.</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}