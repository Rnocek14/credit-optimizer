import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Trophy, Star, ArrowLeft, Copy, Download, Eye, MousePointer, Info } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAnalytics } from "@/lib/analytics";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ProfileData {
  id: string;
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

interface ResumeStats {
  totalViews: number;
  clickThroughRate: number;
  sourceBreakdown: {
    gallery: number;
    embed: number;
    direct: number;
  };
}

const PublicResume = () => {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const isPublic = searchParams.get("public") === "true";
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [stats, setStats] = useState<ResumeStats | null>(null);
  const analytics = useAnalytics();

  useEffect(() => {
    if (userId) {
      fetchProfile();
      fetchStats();
    }
  }, [userId]);

  const fetchStats = async () => {
    try {
      const { data: events, error } = await supabase
        .from("resume_events")
        .select("event_type, source, created_at")
        .eq("user_id", userId);

      if (error) throw error;

      const totalViews = events?.filter(e => e.event_type === 'resume_view').length || 0;
      const totalClicks = events?.filter(e => e.event_type === 'resume_click').length || 0;
      const clickThroughRate = totalViews > 0 ? Math.round((totalClicks / totalViews) * 100) : 0;

      const sourceBreakdown = events?.reduce((acc, event) => {
        if (event.event_type === 'resume_view') {
          const source = event.source || 'direct';
          acc[source] = (acc[source] || 0) + 1;
        }
        return acc;
      }, { gallery: 0, embed: 0, direct: 0 }) || { gallery: 0, embed: 0, direct: 0 };

      setStats({
        totalViews,
        clickThroughRate,
        sourceBreakdown
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          setNotFound(true);
        } else {
          throw error;
        }
        return;
      }

      // For public access, check if gallery is enabled
      if (isPublic && (!data.gallery_enabled || !data.resume_review_summary)) {
        setNotFound(true);
        return;
      }

      setProfile(data);
      
      // Track resume view
      analytics.trackResumeView(data.user_id, isPublic ? 'public' : 'direct', {
        resume_id: data.id,
        source_type: isPublic ? 'gallery' : 'direct_link'
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load resume");
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const getReviewData = () => {
    if (!profile?.resume_review_summary) return null;
    try {
      return JSON.parse(profile.resume_review_summary);
    } catch {
      return null;
    }
  };

  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const downloadResume = async () => {
    try {
      const response = await fetch('/api/generate-resume-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile?.id })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${profile?.name?.replace(/\s+/g, '_')}_Resume.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Resume downloaded successfully!");
      } else {
        throw new Error('Failed to generate PDF');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error("Failed to download resume");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading resume...</p>
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Resume Not Found</h1>
          <p className="text-muted-foreground mb-6">
            This resume is not available for public viewing.
          </p>
          <Button onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const reviewData = getReviewData();
  const score = reviewData?.overall_score || 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => window.history.back()}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{profile.name}</h1>
              <p className="text-xl text-muted-foreground mb-4">{profile.role_title}</p>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {profile.location && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1" />
                    {profile.location}
                  </div>
                )}
                {profile.years_experience && (
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {profile.years_experience} years experience
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-2">
              {score > 0 && (
                <Badge variant="secondary" className="text-xl font-bold px-4 py-2">
                  {score}/100
                </Badge>
              )}
              {score >= 90 && (
                <Badge variant="default" className="bg-yellow-500 text-yellow-50">
                  <Trophy className="w-4 h-4 mr-1" />
                  Top Candidate
                </Badge>
              )}
              {profile.gallery_featured && (
                <Badge variant="outline">
                  <Star className="w-4 h-4 mr-1" />
                  Featured
                </Badge>
              )}
            </div>
          </div>

          {/* Resume Stats */}
          {stats && (
            <TooltipProvider>
              <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm">Public Resume Stats</h3>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Stats reflect verified activity across all public embeds, shares, and gallery views. Updated daily.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-lg font-bold">{stats.totalViews}</p>
                      <p className="text-xs text-muted-foreground">Total Views</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <MousePointer className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-lg font-bold">{stats.clickThroughRate}%</p>
                      <p className="text-xs text-muted-foreground">Click Rate</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-lg font-bold">
                        {stats.sourceBreakdown.gallery + stats.sourceBreakdown.embed + stats.sourceBreakdown.direct}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        G:{stats.sourceBreakdown.gallery} E:{stats.sourceBreakdown.embed} D:{stats.sourceBreakdown.direct}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TooltipProvider>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <Button onClick={copyLink} variant="outline">
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
            <Button onClick={downloadResume} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download Resume
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* AI Review Summary */}
            {reviewData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    AI Career Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Professional Summary</h4>
                    <p className="text-muted-foreground">{reviewData.professional_feedback}</p>
                  </div>
                  
                  {reviewData.taglines && reviewData.taglines.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Key Strengths</h4>
                      <div className="flex flex-wrap gap-2">
                        {reviewData.taglines.map((tagline: string, index: number) => (
                          <Badge key={index} variant="outline">{tagline}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-1">Career Readiness</h4>
                      <p className="text-2xl font-bold text-primary">{reviewData.career_readiness_score}/100</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">Overall Score</h4>
                      <p className="text-2xl font-bold text-primary">{reviewData.overall_score}/100</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Career Goals */}
            {profile.career_goals && (
              <Card>
                <CardHeader>
                  <CardTitle>Career Goals</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{profile.career_goals}</p>
                </CardContent>
              </Card>
            )}

            {/* Education */}
            {profile.education && (
              <Card>
                <CardHeader>
                  <CardTitle>Education</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{profile.education}</p>
                </CardContent>
              </Card>
            )}

            {/* Work Preferences */}
            {profile.work_preferences && (
              <Card>
                <CardHeader>
                  <CardTitle>Work Preferences</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{profile.work_preferences}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {profile.industry && (
                  <div>
                    <h4 className="font-semibold mb-1">Industry</h4>
                    <p className="text-muted-foreground">{profile.industry}</p>
                  </div>
                )}
                
                {profile.experience_level && (
                  <div>
                    <h4 className="font-semibold mb-1">Experience Level</h4>
                    <p className="text-muted-foreground">{profile.experience_level}</p>
                  </div>
                )}
                
                {profile.salary_expectations && (
                  <div>
                    <h4 className="font-semibold mb-1">Salary Expectations</h4>
                    <p className="text-muted-foreground">
                      ${profile.salary_expectations.toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Skills */}
            {profile.skills && profile.skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Interests */}
            {profile.interests && profile.interests.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Interests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest, index) => (
                      <Badge key={index} variant="outline">{interest}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Profile Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Profile Created</span>
                  <span>{format(new Date(profile.created_at), "MMM yyyy")}</span>
                </div>
                {profile.ai_reviewed_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AI Reviewed</span>
                    <span>{format(new Date(profile.ai_reviewed_at), "MMM dd, yyyy")}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicResume;