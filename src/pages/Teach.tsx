import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Edit,
  MapPin,
  Briefcase,
  Star,
  BookOpen,
  Users,
  Calendar,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";

interface MentorProfile {
  id: string;
  name: string;
  role_title: string;
  location: string;
  industry: string;
  skills: string[];
  years_experience: number;
  experience_level: string;
}

interface TeachingContribution {
  id: string;
  title: string;
  platform: string;
  difficulty: string;
  skill_tags: string[];
  description?: string;
  url?: string;
}

const Teach = () => {
  const [profile, setProfile] = useState<MentorProfile | null>(null);
  const [contributions, setContributions] = useState<TeachingContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      fetchMentorProfile(user.id);
      fetchTeachingContributions(user.id);
    } else {
      // Use demo data for Aisha Khan if no user is logged in
      fetchMentorProfile('2b458624-d498-4cca-a63d-9341cc20e363');
      fetchTeachingContributions('2b458624-d498-4cca-a63d-9341cc20e363');
    }
  };

  const fetchMentorProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching mentor profile:', error);
        toast.error('Failed to load mentor profile');
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load mentor profile');
    }
  };

  const fetchTeachingContributions = async (userId: string) => {
    try {
      // Fetch recommended courses created by this mentor
      const { data, error } = await supabase
        .from('recommended_courses')
        .select('*')
        .eq('mentor_id', userId)
        .eq('active', true)
        .limit(6);

      if (error) {
        console.error('Error fetching teaching contributions:', error);
        return;
      }

      setContributions(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading mentor profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <Card className="max-w-md mx-auto shadow-lg rounded-xl">
            <CardContent className="text-center py-12">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Mentor Profile Not Found</h3>
              <p className="text-muted-foreground mb-6">
                Complete your profile to start mentoring and sharing your expertise with others.
              </p>
              <Button className="bg-primary hover:bg-primary/90">
                <Edit className="h-4 w-4 mr-2" />
                Complete Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            🧑‍🏫 <span>Mentor Profile</span>
          </h1>
          <p className="text-muted-foreground">
            Share your expertise and help others grow in their careers
          </p>
        </div>

        {/* Mentor Profile Card */}
        <Card className="mb-8 shadow-lg rounded-xl">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary-foreground">
                    {profile.name?.charAt(0) || '?'}
                  </span>
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">
                    {profile.name}
                  </CardTitle>
                  <p className="text-lg text-muted-foreground font-medium">
                    {profile.role_title}
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                {profile.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.location}</span>
                  </div>
                )}
                {profile.industry && (
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.industry}</span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {profile.years_experience && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.years_experience}+ years experience</span>
                  </div>
                )}
                {profile.experience_level && (
                  <div className="flex items-center gap-2 text-sm">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.experience_level} Level</span>
                  </div>
                )}
              </div>
            </div>

            {/* Skills */}
            {profile.skills && profile.skills.length > 0 && (
              <div>
                <h4 className="font-semibold text-foreground mb-3">Areas of Expertise</h4>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="text-sm">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Mentorship Statement */}
            <div>
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Why I Mentor
              </h4>
              <p className="text-muted-foreground leading-relaxed italic">
                "I mentor to give back and support others in navigating the same path I once took. 
                My experience in {profile.industry} has taught me valuable lessons that I'm passionate 
                about sharing with the next generation of professionals."
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Teaching Contributions */}
        <div className="border-t border-gray-200 mt-6 pt-6">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Teaching Contributions
          </h2>

          {contributions.length === 0 ? (
            <Card className="shadow-sm rounded-xl">
              <CardContent className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Courses Shared Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Start sharing your knowledge by recommending courses and resources that helped shape your expertise.
                </p>
                <Button variant="outline">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Share Your First Course
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {contributions.map((course) => (
                <Card key={course.id} className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-foreground text-sm leading-tight">
                        {course.title}
                      </h3>
                      <Badge variant="outline" className={getDifficultyColor(course.difficulty)}>
                        {course.difficulty}
                      </Badge>
                    </div>
                    
                    <div className="text-xs text-muted-foreground font-medium">
                      {course.platform}
                    </div>
                    
                    {course.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {course.description}
                      </p>
                    )}
                    
                    {course.skill_tags && course.skill_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {course.skill_tags.slice(0, 3).map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {course.skill_tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{course.skill_tags.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {course.url && (
                      <div className="pt-2">
                        <Button asChild size="sm" variant="outline" className="w-full">
                          <a href={course.url} target="_blank" rel="noopener noreferrer">
                            View Course
                            <ExternalLink className="h-3 w-3 ml-2" />
                          </a>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Floating Edit Button */}
        <Button
          className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg hover:shadow-xl bg-primary hover:bg-primary/90 z-50"
          size="icon"
        >
          <Edit className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};

export default Teach;