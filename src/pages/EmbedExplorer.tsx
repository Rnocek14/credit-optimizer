import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Star, Clock, Search, Filter, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ExplorerProfile {
  id: string;
  user_id: string;
  name: string;
  role_title: string;
  location: string;
  industry: string;
  resume_review_summary: string;
  gallery_featured: boolean;
  skills: string[];
  badges: Array<{
    id: string;
    badge: {
      name: string;
      emoji: string;
      description: string;
      slug: string;
    };
  }>;
  view_count: number;
  latest_view: string;
}

const EmbedExplorer = () => {
  const [profiles, setProfiles] = useState<ExplorerProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<ExplorerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("");
  const [badgeFilter, setBadgeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("most_viewed");
  const [minScore, setMinScore] = useState(80);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchExplorerProfiles();
  }, []);

  useEffect(() => {
    filterAndSortProfiles();
  }, [profiles, searchTerm, industryFilter, roleFilter, badgeFilter, sortBy, minScore]);

  const fetchExplorerProfiles = async () => {
    try {
      // First get profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          user_id,
          name,
          role_title,
          location,
          industry,
          resume_review_summary,
          gallery_featured,
          skills,
          created_at
        `)
        .eq('gallery_enabled', true)
        .not('resume_review_summary', 'is', null);

      if (profilesError) throw profilesError;

      // Get badges for each profile and view counts
      const profilesWithStats = await Promise.all(
        (profilesData || []).map(async (profile) => {
          // Get badges
          const { data: badgesData } = await supabase
            .from('user_badges')
            .select(`
              id,
              badge:badges (
                name,
                emoji,
                description,
                slug
              )
            `)
            .eq('user_id', profile.user_id);

          // Get view counts
          const { data: events } = await supabase
            .from('resume_events')
            .select('created_at')
            .eq('user_id', profile.user_id)
            .eq('event_type', 'view')
            .order('created_at', { ascending: false });

          return {
            ...profile,
            badges: badgesData || [],
            view_count: events?.length || 0,
            latest_view: events?.[0]?.created_at || profile.created_at
          };
        })
      );

      setProfiles(profilesWithStats);
    } catch (error) {
      console.error('Error fetching explorer profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortProfiles = () => {
    let filtered = profiles.filter((profile) => {
      // Search filter
      const searchMatch = !searchTerm || 
        profile.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.role_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.skills?.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()));

      // Industry filter
      const industryMatch = industryFilter === "all" || profile.industry === industryFilter;

      // Role filter
      const roleMatch = !roleFilter || profile.role_title?.toLowerCase().includes(roleFilter.toLowerCase());

      // Badge filter
      const badgeMatch = badgeFilter === "all" || 
        profile.badges.some(badge => badge.badge.name === badgeFilter);

      // Score filter
      const reviewData = getReviewData(profile.resume_review_summary);
      const scoreMatch = !reviewData || (reviewData.overall_score || 0) >= minScore;

      return searchMatch && industryMatch && roleMatch && badgeMatch && scoreMatch;
    });

    // Sort profiles
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'most_viewed':
          return b.view_count - a.view_count;
        case 'top_rated':
          const aScore = getReviewData(a.resume_review_summary)?.overall_score || 0;
          const bScore = getReviewData(b.resume_review_summary)?.overall_score || 0;
          return bScore - aScore;
        case 'recently_added':
          return new Date(b.latest_view).getTime() - new Date(a.latest_view).getTime();
        case 'featured':
          return (b.gallery_featured ? 1 : 0) - (a.gallery_featured ? 1 : 0);
        default:
          return 0;
      }
    });

    setFilteredProfiles(filtered);
  };

  const getReviewData = (resumeReviewSummary: string) => {
    try {
      return JSON.parse(resumeReviewSummary);
    } catch {
      return null;
    }
  };

  const getUniqueIndustries = () => {
    return [...new Set(profiles.map(p => p.industry).filter(Boolean))];
  };

  const getUniqueBadges = () => {
    const badges = new Set<string>();
    profiles.forEach(profile => {
      profile.badges.forEach(badge => {
        badges.add(badge.badge.name);
      });
    });
    return Array.from(badges);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading resume explorer...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-4">
            Resume Explorer
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover top talent across industries. Browse verified resumes with AI-powered insights and professional badges.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card/50 backdrop-blur-sm rounded-lg border p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, role, or skill..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Industries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {getUniqueIndustries().map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={badgeFilter} onValueChange={setBadgeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Badges" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Badges</SelectItem>
                {getUniqueBadges().map((badge) => (
                  <SelectItem key={badge} value={badge}>
                    {badge}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="most_viewed">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Most Viewed
                  </div>
                </SelectItem>
                <SelectItem value="top_rated">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Top Rated
                  </div>
                </SelectItem>
                <SelectItem value="recently_added">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Recently Added
                  </div>
                </SelectItem>
                <SelectItem value="featured">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Featured
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Min AI Score:</span>
              <Select value={minScore.toString()} onValueChange={(value) => setMinScore(parseInt(value))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="70">70+</SelectItem>
                  <SelectItem value="80">80+</SelectItem>
                  <SelectItem value="90">90+</SelectItem>
                  <SelectItem value="95">95+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {filteredProfiles.length} of {profiles.length} resumes
            </div>
          </div>
        </div>

        {/* Results Grid */}
        {filteredProfiles.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No resumes found</h3>
            <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProfiles.map((profile) => {
              const reviewData = getReviewData(profile.resume_review_summary);
              const score = reviewData?.overall_score || 0;

              return (
                <Card key={profile.id} className="group hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                          {profile.name}
                        </h3>
                        <p className="text-muted-foreground">{profile.role_title}</p>
                        <p className="text-sm text-muted-foreground">{profile.location}</p>
                      </div>
                      
                      {profile.gallery_featured && (
                        <Badge variant="secondary" className="bg-gradient-to-r from-primary/10 to-primary/5">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                    </div>

                    {/* Badges */}
                    {profile.badges.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {profile.badges.slice(0, 3).map((badge) => (
                          <Badge
                            key={badge.id}
                            variant="secondary"
                            className="text-xs bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            <span className="mr-1">{badge.badge.emoji}</span>
                            {badge.badge.name}
                          </Badge>
                        ))}
                        {profile.badges.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{profile.badges.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {profile.view_count} views
                      </div>
                      {score > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4" />
                          {score}/100 AI Score
                        </div>
                      )}
                    </div>

                    {/* Skills Preview */}
                    {profile.skills && profile.skills.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-1">
                          {profile.skills.slice(0, 4).map((skill, index) => (
                            <span
                              key={index}
                              className="text-xs bg-muted px-2 py-1 rounded-md"
                            >
                              {skill}
                            </span>
                          ))}
                          {profile.skills.length > 4 && (
                            <span className="text-xs text-muted-foreground">
                              +{profile.skills.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={() => navigate(`/resume/${profile.user_id}`)}
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      variant="outline"
                    >
                      View Resume
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmbedExplorer;