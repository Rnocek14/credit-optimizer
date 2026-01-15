import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SaveButton from "@/components/SaveButton";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Star, 
  Eye, 
  Trophy, 
  Copy,
  Share2,
  GraduationCap,
  ExternalLink,
  Sparkles,
  User,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { SafeExternalLink } from '@/components/ui/SafeExternalLink';

interface ProfileData {
  id: string;
  user_id: string;
  name: string;
  role_title: string;
  location: string;
  industry: string;
  years_experience: number;
  experience_level: string;
  skills: string[];
  interests: string[];
  career_goals: string;
  education: string;
  work_preferences: string;
  salary_expectations: number;
  resume_review_summary: string;
  gallery_featured: boolean;
  ai_reviewed_at: string;
  created_at: string;
}

interface UserBadge {
  id: string;
  badge: {
    name: string;
    emoji: string;
    description: string;
    slug: string;
  };
}

interface ReviewData {
  overall_score: number;
  strengths: string[];
  gaps: string[];
  taglines: string[];
  summary: string;
}

interface AIResumeDraft {
  id: string;
  title: string;
  content: {
    summary: string;
    bullets: string[];
    skills: {
      [category: string]: string[];
    };
  };
  cri_average: number;
  readiness_score: number;
  created_at: string;
}

const PublicResume = () => {
  const { userId } = useParams();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [aiResumeDraft, setAiResumeDraft] = useState<AIResumeDraft | null>(null);
  const [viewCount, setViewCount] = useState(0);
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (userId) {
      console.log('PublicResume: Loading profile for user:', userId);
      fetchProfileData();
      trackView();
    }
  }, [userId]);

  const fetchProfileData = async () => {
    try {
      console.log('Fetching profile data for user:', userId);
      
      // Fetch profile data - try both user_id and id for demo compatibility
      let profileData, profileError;
      
      // First try by user_id (normal case)
      const userIdResult = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (userIdResult.data) {
        profileData = userIdResult.data;
        profileError = userIdResult.error;
      } else {
        // If not found by user_id, try by id (demo case)
        const idResult = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        
        profileData = idResult.data;
        profileError = idResult.error;
      }

      console.log('Profile data:', profileData);
      console.log('Profile error:', profileError);

      if (profileError || !profileData) {
        console.log('Profile not found or error:', profileError);
        setNotFound(true);
        return;
      }

      setProfile(profileData);

      // Fetch user badges
      const { data: badgesData } = await supabase
        .from('user_badges')
        .select(`
          id,
          badge:badges(
            name,
            emoji,
            description,
            slug
          )
        `)
        .eq('user_id', userId);

      setBadges(badgesData || []);

      // Fetch view count
      const { data: events } = await supabase
        .from('resume_events')
        .select('id')
        .eq('user_id', userId)
        .eq('event_type', 'view');

      setViewCount(events?.length || 0);

      // Fetch recommended courses if this user is a mentor
      const { data: coursesData } = await supabase
        .from('recommended_courses')
        .select('id, title, platform, difficulty, cost, skill_tags, url, is_ai_recommended')
        .eq('mentor_id', userId)
        .eq('active', true)
        .limit(3);

      setRecommendedCourses(coursesData || []);

      // Fetch latest published AI resume draft
      const { data: resumeDraftData } = await supabase
        .from('ai_resume_drafts')
        .select('*')
        .eq('user_id', userId)
        .eq('published_to_profile', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (resumeDraftData) {
        setAiResumeDraft({
          ...resumeDraftData,
          content: resumeDraftData.content as any
        } as AIResumeDraft);
      }

    } catch (error) {
      console.error('Error fetching profile:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const trackView = async () => {
    try {
      await supabase.from('resume_events').insert({
        user_id: userId,
        event_type: 'view',
        source: 'direct',
        metadata: {
          timestamp: new Date().toISOString(),
          referrer: document.referrer || 'direct'
        }
      });
    } catch (error) {
      console.error('Error tracking view:', error);
    }
  };

  const getReviewData = (): ReviewData | null => {
    if (!profile?.resume_review_summary) return null;
    try {
      return JSON.parse(profile.resume_review_summary);
    } catch {
      return null;
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const shareToTwitter = () => {
    const text = `Check out ${profile?.name}'s resume - ${profile?.role_title}`;
    const url = window.location.href;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  };

  const shareToLinkedIn = () => {
    const url = window.location.href;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading resume...</p>
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-8">
            <User className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Resume Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This resume is not available or has been removed from the public gallery.
            </p>
            <Button asChild>
              <a href="/resume-gallery">Browse Gallery</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const reviewData = getReviewData();

  // Generate meta tag content
  const ogTitle = `${profile.name} – ${profile.role_title}`;
  const ogDescription = reviewData?.summary || 
    (reviewData?.taglines && reviewData.taglines.length > 0 
      ? reviewData.taglines.join(' • ') 
      : `${profile.role_title} with ${profile.years_experience || 0} years of experience`);
  const ogUrl = window.location.href;
  const ogImage = `https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=1200&h=630&fit=crop&crop=entropy&auto=format&q=80`;

  return (
    <>
      <Helmet>
        {/* Open Graph Tags */}
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={ogUrl} />
        <meta property="og:type" content="profile" />
        <meta property="og:site_name" content="Talent Gallery" />
        
        {/* Twitter Card Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={ogImage} />
        
        {/* Page Title */}
        <title>{ogTitle} | Talent Gallery</title>
        <meta name="description" content={ogDescription} />
      </Helmet>
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header Card */}
        <Card className="mb-8 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl border-2 hover:border-primary/20">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary-foreground">
                      {profile.name?.charAt(0) || '?'}
                    </span>
                  </div>
                  
                  <div>
                    <CardTitle className="text-2xl md:text-3xl font-bold text-foreground">
                      {profile.name}
                    </CardTitle>
                    <p className="text-lg text-muted-foreground font-medium">
                      {profile.role_title}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {profile.location}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {viewCount} views
                  </div>

                  {profile.gallery_featured && (
                    <Badge variant="secondary" className="bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border-yellow-200">
                      <Trophy className="h-3 w-3 mr-1" />
                      Featured in Gallery
                    </Badge>
                  )}
                </div>
        </div>


        {/* Share Tools */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <Button variant="outline" size="sm" onClick={shareToTwitter}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Twitter
                </Button>
                <Button variant="outline" size="sm" onClick={shareToLinkedIn}>
                  <Share2 className="h-4 w-4 mr-2" />
                  LinkedIn
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* AI Resume Draft Section */}
        {aiResumeDraft && (
          <Card className="mb-8 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Resume Draft
                <Badge variant="outline" className="bg-gradient-to-r from-primary/10 to-primary/5">
                  {aiResumeDraft.title}
                </Badge>
                {aiResumeDraft.readiness_score > 75 && (
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    AI Verified
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Resume Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">{aiResumeDraft.cri_average.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">CRI Score</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-primary">{aiResumeDraft.readiness_score.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">Readiness</div>
                </div>
                <div className="text-center col-span-2 md:col-span-1">
                  <div className="text-xs text-muted-foreground">Generated: {new Date(aiResumeDraft.created_at).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Professional Summary */}
              {aiResumeDraft.content.summary && (
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Professional Summary</h4>
                  <p className="text-muted-foreground leading-relaxed bg-card/50 p-4 rounded-lg border">
                    {aiResumeDraft.content.summary}
                  </p>
                </div>
              )}

              {/* Key Achievements */}
              {aiResumeDraft.content.bullets && aiResumeDraft.content.bullets.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Key Achievements</h4>
                  <ul className="space-y-2">
                    {aiResumeDraft.content.bullets.map((bullet, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-muted-foreground">{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Skills Categories */}
              {aiResumeDraft.content.skills && Object.keys(aiResumeDraft.content.skills).length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Skills & Competencies</h4>
                  <div className="space-y-3">
                    {Object.entries(aiResumeDraft.content.skills).map(([category, skills]) => (
                      <div key={category} className="mb-4">
                        <div className="text-sm font-semibold text-muted-foreground mb-1">{category}</div>
                        <div className="flex flex-wrap gap-2">
                          {Array.isArray(skills) ? (
                            skills.map((skill, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 text-xs bg-muted rounded-md border text-muted-foreground"
                              >
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="px-2 py-1 text-xs bg-muted rounded-md border text-muted-foreground">
                              {String(skills)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Recommended Courses */}
        {recommendedCourses.length > 0 && (
          <Card className="mb-8 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🎓 <span className="font-bold">Recommended Courses</span>
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Courses handpicked by {profile.name} to help you advance your career
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendedCourses.map((course: any) => (
                  <Card key={course.id} className="rounded-md shadow-sm p-4 mb-3 hover:shadow-md transition-shadow border border-border/50">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-semibold text-foreground text-sm leading-tight">
                          {course.title}
                        </h3>
                        {course.is_ai_recommended && (
                          <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs shrink-0">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground font-medium">
                        {course.platform}
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">{course.difficulty}</span>
                        <span>•</span>
                        <span>{course.cost}</span>
                      </div>
                      
                      {course.skill_tags && course.skill_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {course.skill_tags.slice(0, 3).map((skill: string, index: number) => (
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
                      
                      <div className="flex gap-2 pt-2">
                        <SafeExternalLink 
                          url={course.url} 
                          urlStatus="unknown"
                          className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-8 rounded-md px-3 flex-1"
                          fallback="hidden"
                          showIcon={true}
                        >
                          View Course
                        </SafeExternalLink>
                        <SaveButton courseId={course.id} size="sm" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Review Summary */}
        {reviewData && (
          <Card className="mb-8 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Review Summary
                <Badge variant="outline" className="ml-auto text-lg font-bold bg-gradient-to-r from-primary/10 to-primary/5">
                  {reviewData.overall_score}/100
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Taglines */}
              {reviewData.taglines && reviewData.taglines.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Professional Highlights</h4>
                  <div className="flex flex-wrap gap-2">
                    {reviewData.taglines.map((tagline, index) => (
                      <Badge key={index} variant="secondary" className="text-sm px-3 py-1">
                        {tagline}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              {reviewData.summary && (
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Summary</h4>
                  <p className="text-muted-foreground leading-relaxed">
                    {reviewData.summary}
                  </p>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-6">
                {/* Strengths */}
                {reviewData.strengths && reviewData.strengths.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Key Strengths
                    </h4>
                    <ul className="space-y-2">
                      {reviewData.strengths.map((strength, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-muted-foreground">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Gaps */}
                {reviewData.gaps && reviewData.gaps.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      Growth Areas
                    </h4>
                    <ul className="space-y-2">
                      {reviewData.gaps.map((gap, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-muted-foreground">{gap}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Skills & Badges */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Skills */}
          {profile.skills && profile.skills.length > 0 && (
            <Card className="shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
              <CardHeader>
                <CardTitle>Skills & Expertise</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {profile.skills.map((skill, index) => (
                    <Badge key={index} variant="outline" className="text-sm">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Badges */}
          {badges.length > 0 && (
            <Card className="shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
              <CardHeader>
                <CardTitle>Verified Achievements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {badges.map((badge) => (
                    <div key={badge.id} className="relative group">
                      <Badge
                        variant="secondary"
                        className="text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-help"
                      >
                        <span className="mr-1">{badge.badge.emoji}</span>
                        {badge.badge.name}
                      </Badge>
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-background border rounded shadow-lg text-xs w-max max-w-xs opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        {badge.badge.description}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Additional Info */}
        {(profile.career_goals || profile.education || profile.work_preferences) && (
          <Card className="shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {profile.career_goals && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Career Goals</h4>
                  <p className="text-muted-foreground">{profile.career_goals}</p>
                </div>
              )}

              {profile.education && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Education</h4>
                  <p className="text-muted-foreground">{profile.education}</p>
                </div>
              )}

              {profile.work_preferences && (
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Work Preferences</h4>
                  <p className="text-muted-foreground">{profile.work_preferences}</p>
                </div>
              )}

              <Separator />

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {profile.years_experience && (
                  <span>{profile.years_experience} years experience</span>
                )}
                {profile.experience_level && (
                  <span>• {profile.experience_level} level</span>
                )}
                {profile.industry && (
                  <span>• {profile.industry}</span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer CTA */}
        <div className="text-center mt-12 py-8">
          <Button size="lg" asChild>
            <a href="/resume-gallery">
              Discover More Talent
            </a>
          </Button>
        </div>
      </div>
    </div>
    </>
  );
};

export default PublicResume;
