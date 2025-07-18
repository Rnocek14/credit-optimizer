import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Trophy, Star, Search } from "lucide-react";
import { toast } from "sonner";
import { useAnalytics } from "@/lib/analytics";

interface GalleryProfile {
  id: string;
  user_id: string;
  name: string;
  role_title: string;
  location: string;
  industry: string;
  resume_review_summary: string;
  gallery_featured: boolean;
}

const ResumeGallery = () => {
  const [profiles, setProfiles] = useState<GalleryProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<GalleryProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const navigate = useNavigate();
  const analytics = useAnalytics();

  useEffect(() => {
    fetchGalleryProfiles();
  }, []);

  useEffect(() => {
    filterProfiles();
  }, [profiles, searchTerm, roleFilter, industryFilter, scoreFilter]);

  const fetchGalleryProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, name, role_title, location, industry, resume_review_summary, gallery_featured")
        .eq("gallery_enabled", true)
        .not("resume_review_summary", "is", null);

      if (error) throw error;

      // Filter by score >= 80
      const scoredProfiles = data?.filter(profile => {
        if (!profile.resume_review_summary) return false;
        try {
          const summary = JSON.parse(profile.resume_review_summary);
          return summary.overall_score >= 80;
        } catch {
          return false;
        }
      }) || [];

      setProfiles(scoredProfiles);
    } catch (error) {
      console.error("Error fetching gallery profiles:", error);
      toast.error("Failed to load resume gallery");
    } finally {
      setLoading(false);
    }
  };

  const filterProfiles = () => {
    let filtered = profiles;

    if (searchTerm) {
      filtered = filtered.filter(profile => 
        profile.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        profile.role_title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter(profile => 
        profile.role_title?.toLowerCase().includes(roleFilter.toLowerCase())
      );
    }

    if (industryFilter !== "all") {
      filtered = filtered.filter(profile => profile.industry === industryFilter);
    }

    if (scoreFilter !== "all") {
      filtered = filtered.filter(profile => {
        try {
          const summary = JSON.parse(profile.resume_review_summary);
          const score = summary.overall_score;
          
          switch (scoreFilter) {
            case "90+": return score >= 90;
            case "85-89": return score >= 85 && score < 90;
            case "80-84": return score >= 80 && score < 85;
            default: return true;
          }
        } catch {
          return false;
        }
      });
    }

    setFilteredProfiles(filtered);
  };

  const getReviewData = (resumeReviewSummary: string) => {
    try {
      return JSON.parse(resumeReviewSummary);
    } catch {
      return null;
    }
  };

  const uniqueRoles = [...new Set(profiles.map(p => p.role_title).filter(Boolean))];
  const uniqueIndustries = [...new Set(profiles.map(p => p.industry).filter(Boolean))];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading resume gallery...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Resume Gallery</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover verified talent with AI-reviewed resumes scoring 80+ points
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {uniqueRoles.map(role => (
                  <SelectItem key={role} value={role}>{role}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={industryFilter} onValueChange={setIndustryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {uniqueIndustries.map(industry => (
                  <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={scoreFilter} onValueChange={setScoreFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by score" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Scores</SelectItem>
                <SelectItem value="90+">90+ Points</SelectItem>
                <SelectItem value="85-89">85-89 Points</SelectItem>
                <SelectItem value="80-84">80-84 Points</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results */}
        <div className="mb-6">
          <p className="text-muted-foreground">
            Showing {filteredProfiles.length} of {profiles.length} verified resumes
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProfiles.map((profile) => {
            const reviewData = getReviewData(profile.resume_review_summary);
            const score = reviewData?.overall_score || 0;
            const taglines = reviewData?.taglines || [];

            return (
              <Card key={profile.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{profile.name}</h3>
                      <p className="text-muted-foreground">{profile.role_title}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="secondary" className="text-lg font-bold">
                        {score}
                      </Badge>
                      {score >= 90 && (
                        <Badge variant="default" className="bg-yellow-500 text-yellow-50">
                          <Trophy className="w-3 h-3 mr-1" />
                          Top Candidate
                        </Badge>
                      )}
                      {profile.gallery_featured && (
                        <Badge variant="outline">
                          <Star className="w-3 h-3 mr-1" />
                          Featured
                        </Badge>
                      )}
                    </div>
                  </div>

                  {profile.location && (
                    <div className="flex items-center text-sm text-muted-foreground mb-3">
                      <MapPin className="w-4 h-4 mr-1" />
                      {profile.location}
                    </div>
                  )}

                  {taglines.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium mb-2">Key Strengths:</p>
                      <div className="flex flex-wrap gap-1">
                        {taglines.slice(0, 3).map((tagline: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tagline}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button 
                    className="w-full" 
                    onClick={() => {
                      analytics.trackGalleryImpression(profile.user_id, {
                        resume_id: profile.id,
                        button_type: 'view_full_resume'
                      });
                      navigate(`/resume/${profile.id}?public=true`);
                    }}
                  >
                    View Full Resume
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredProfiles.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              No resumes found matching your criteria
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumeGallery;