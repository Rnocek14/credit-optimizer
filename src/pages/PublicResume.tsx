import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SaveButton from "@/components/SaveButton";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, Star, Eye, Trophy, Copy, Share2, GraduationCap, ExternalLink,
  Sparkles, User, CheckCircle, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { SafeExternalLink, safeOpenExternal } from '@/components/ui/SafeExternalLink';
import {
  fetchPublicProfile,
  fetchUserBadges,
  fetchResumeViewCount,
  fetchRecommendedCourses,
  fetchPublishedResumeDraft,
  trackResumeEvent,
} from '@/shared/lib/api/publicResume';

// Define interfaces for the data
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
      
      const profileData = await fetchPublicProfile(userId!);

      if (!profileData) {
        console.log('Profile not found');
        setNotFound(true);
        return;
      }

      setProfile(profileData);

      const badgesData = await fetchUserBadges(userId!);
      setBadges(badgesData || []);

      const count = await fetchResumeViewCount(userId!);
      setViewCount(count);

      const coursesData = await fetchRecommendedCourses(userId!);
      setRecommendedCourses(coursesData || []);

      const resumeDraftData = await fetchPublishedResumeDraft(userId!);
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
      await trackResumeEvent(userId!, 'view', 'direct', {
        referrer: document.referrer || 'direct'
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
    safeOpenExternal(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
  };

  const shareToLinkedIn = () => {
    const url = window.location.href;
    safeOpenExternal(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`);
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
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={ogUrl} />
        <meta property="og:type" content="profile" />
        <meta property="og:site_name" content="Talent Gallery" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={ogImage} />
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

              {aiResumeDraft.content.summary && (
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Professional Summary</h4>
                  <p className="text-muted-foreground leading-relaxed bg-card/50 p-4 rounded-lg border">
                    {aiResumeDraft.content.summary}
                  </p>
                </div>
              )}

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
                              <span key={index} className="px-2 py-1 text-xs bg-muted rounded-md border text-muted-foreground">
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
                          <Badge variant="secondary" className="text-xs shrink-0">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI Pick
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>📚 {course.platform}</span>
                        {course.difficulty && <span>📊 {course.difficulty}</span>}
                        {course.cost !== undefined && (
                          <span>💰 {course.cost === 0 ? 'Free' : `$${course.cost}`}</span>
                        )}
                      </div>

                      {course.skill_tags && course.skill_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {course.skill_tags.slice(0, 3).map((tag: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {course.url && (
                        <SafeExternalLink
                          url={course.url}
                          mode="allowlisted"
                          className="flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          View Course <ExternalLink className="h-3 w-3" />
                        </SafeExternalLink>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Review Summary */}
        {reviewData && (
          <Card className="mb-8 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-primary" />
                AI Review Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overall Score */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary-foreground">
                    {reviewData.overall_score}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Overall Score</h3>
                  <p className="text-muted-foreground">
                    {reviewData.overall_score >= 90 ? 'Outstanding' :
                     reviewData.overall_score >= 80 ? 'Excellent' :
                     reviewData.overall_score >= 70 ? 'Very Good' : 'Good'} Profile
                  </p>
                </div>
              </div>

              <Separator />

              {/* Taglines */}
              {reviewData.taglines && reviewData.taglines.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-3">Key Highlights</h4>
                  <div className="flex flex-wrap gap-2">
                    {reviewData.taglines.map((tagline, index) => (
                      <Badge key={index} variant="secondary" className="text-sm px-3 py-1">
                        {tagline}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Strengths */}
              {reviewData.strengths && reviewData.strengths.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Strengths
                  </h4>
                  <ul className="space-y-2">
                    {reviewData.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
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
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    Areas for Growth
                  </h4>
                  <ul className="space-y-2">
                    {reviewData.gaps.map((gap, index) => (
                      <li key={index} className="flex items-start gap-3 text-sm">
                        <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-muted-foreground">{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Badges Section */}
        {badges.length > 0 && (
          <Card className="mb-8 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Verified Badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {badges.map((badge) => (
                  <div key={badge.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                    <span className="text-2xl">{badge.badge.emoji}</span>
                    <div>
                      <p className="font-medium text-sm">{badge.badge.name}</p>
                      <p className="text-xs text-muted-foreground">{badge.badge.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Skills Section */}
        {profile.skills && profile.skills.length > 0 && (
          <Card className="mb-8 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Skills & Expertise
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary"
                    className="px-3 py-1 text-sm bg-primary/10 text-primary border-primary/20"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Save Button */}
        <div className="flex justify-center mt-8">
          <SaveButton 
            courseId={profile.user_id}
          />
        </div>
      </div>
    </div>
    </>
  );
};

export default PublicResume;
