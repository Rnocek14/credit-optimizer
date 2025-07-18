import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Trophy, Eye, ArrowRight, Sparkles } from "lucide-react";

interface FeaturedProfile {
  id: string;
  user_id: string;
  name: string;
  role_title: string;
  location: string;
  industry: string;
  resume_review_summary: string;
  badges: Array<{
    id: string;
    badge_type: {
      name: string;
      display_name: string;
      description: string;
      icon: string;
      color: string;
      background_color: string;
    };
  }>;
  view_count: number;
}

export default function Discover() {
  const [featuredProfiles, setFeaturedProfiles] = useState<FeaturedProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedProfiles();
  }, []);

  const fetchFeaturedProfiles = async () => {
    try {
      // Get featured profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          name,
          role_title,
          location,
          industry,
          resume_review_summary
        `)
        .eq('gallery_enabled', true)
        .eq('gallery_featured', true)
        .not('resume_review_summary', 'is', null)
        .limit(3);

      if (profilesError) throw profilesError;

      // Get badges and view counts for each profile
      const profilesWithStats = await Promise.all(
        (profilesData || []).map(async (profile) => {
          // Get badges
          const { data: badgesData } = await supabase
            .from('user_badges')
            .select(`
              id,
              badge_type:badge_types (
                name,
                display_name,
                description,
                icon,
                color,
                background_color
              )
            `)
            .eq('user_id', profile.user_id)
            .eq('active', true)
            .limit(2); // Show top 2 badges

          // Get view counts
          const { data: events } = await supabase
            .from('resume_events')
            .select('id')
            .eq('user_id', profile.user_id)
            .eq('event_type', 'view');

          return {
            ...profile,
            badges: badgesData || [],
            view_count: events?.length || 0
          };
        })
      );

      setFeaturedProfiles(profilesWithStats);
    } catch (error) {
      console.error('Error fetching featured profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReviewData = (resumeReviewSummary: string) => {
    try {
      return JSON.parse(resumeReviewSummary);
    } catch {
      return null;
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading featured talent...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 opacity-50"></div>
        <div className="relative container mx-auto px-4 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-6">
              <Sparkles className="h-8 w-8 text-primary mr-3" />
              <span className="text-lg font-semibold text-primary tracking-wide">FEATURED TALENT</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Discover the Future of Talent
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              Browse verified AI-reviewed resumes from rising professionals and top mentors.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild className="group">
                <Link to="/resume-gallery">
                  Explore Talent Gallery
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/auth">Join as Talent</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Profiles Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Featured Professionals</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Meet our top-rated talent with verified skills and AI-validated expertise.
          </p>
        </div>

        {featuredProfiles.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No featured profiles yet</h3>
            <p className="text-muted-foreground mb-6">Check back soon for featured talent highlights.</p>
            <Button asChild>
              <Link to="/resume-gallery">Browse All Talent</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProfiles.map((profile) => {
              const reviewData = getReviewData(profile.resume_review_summary);
              const score = reviewData?.overall_score || 0;

              return (
                <Card 
                  key={profile.id} 
                  className="group hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-2xl border-2 hover:border-primary/30 bg-card/80 backdrop-blur-sm"
                >
                  <CardContent className="p-8">
                    {/* Header */}
                    <div className="text-center mb-6">
                      <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <span className="text-2xl font-bold text-primary-foreground">
                          {profile.name?.charAt(0) || '?'}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                        {truncateText(profile.name, 25)}
                      </h3>
                      
                      <p className="text-muted-foreground font-medium mb-2">
                        {truncateText(profile.role_title, 35)}
                      </p>
                      
                      <div className="flex items-center justify-center text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-1" />
                        {truncateText(profile.location, 20)}
                      </div>
                    </div>

                    {/* AI Score */}
                    {score > 0 && (
                      <div className="text-center mb-6">
                        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 px-4 py-2 rounded-full border border-yellow-200 dark:border-yellow-800">
                          <Star className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                          <span className="font-bold text-yellow-700 dark:text-yellow-300">
                            {score}/100 AI Score
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Badges */}
                    {profile.badges.length > 0 && (
                      <div className="flex flex-wrap gap-2 justify-center mb-6">
                        {profile.badges.map((badge) => (
                          <Badge
                            key={badge.id}
                            variant="outline"
                            className="text-xs px-3 py-1 font-medium"
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

                    {/* Stats */}
                    <div className="flex items-center justify-center text-sm text-muted-foreground mb-6">
                      <Eye className="h-4 w-4 mr-1" />
                      <span>{profile.view_count} profile views</span>
                    </div>

                    {/* CTA */}
                    <Button 
                      asChild 
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      variant="outline"
                    >
                      <Link to={`/resume/${profile.user_id}`}>
                        View Profile
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-primary/10 to-secondary/10 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Discover More?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Explore our complete talent gallery with advanced filters, AI insights, and verified professionals.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="group">
              <Link to="/resume-gallery">
                Browse Full Gallery
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/auth">Join the Platform</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}