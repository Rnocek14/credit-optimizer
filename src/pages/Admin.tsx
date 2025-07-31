import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  CheckCircle, 
  Star, 
  Flag, 
  Eye, 
  Filter,
  Mail,
  Trophy,
  Brain,
  Link,
  Calendar
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { AdminCourseReview } from "@/components/AdminCourseReview";

interface GalleryProfile {
  id: string;
  name: string;
  role_title: string;
  industry: string;
  location: string;
  years_experience: number;
  resume_review_summary: string;
  gallery_enabled: boolean;
  gallery_featured: boolean;
  created_at: string;
  ai_reviewed_at: string;
}

interface ResumeSharedEvent {
  id: string;
  user_id: string;
  shared_with_email: string;
  shared_at: string;
  resume_data: any;
  ai_review_data: any;
  profile?: {
    name: string;
    role_title: string;
  };
}

interface FeatureDialogData {
  profileId: string;
  currentTag: string;
}

export default function Admin() {
  const [galleryProfiles, setGalleryProfiles] = useState<GalleryProfile[]>([]);
  const [mentorSubmissions, setMentorSubmissions] = useState<ResumeSharedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("gallery");
  
  // Filters
  const [roleFilter, setRoleFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Feature dialog
  const [featureDialog, setFeatureDialog] = useState<FeatureDialogData | null>(null);
  const [featureTag, setFeatureTag] = useState("");
  
  const { toast } = useToast();

  useEffect(() => {
    fetchGalleryProfiles();
    fetchMentorSubmissions();
  }, []);

  const fetchGalleryProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('gallery_enabled', true)
        .not('resume_review_summary', 'is', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setGalleryProfiles(data || []);
    } catch (error) {
      console.error('Error fetching gallery profiles:', error);
      toast({
        title: "Error",
        description: "Failed to fetch gallery profiles",
        variant: "destructive"
      });
    }
  };

  const fetchMentorSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('resume_shared_events')
        .select(`
          *,
          profiles:user_id (
            name,
            role_title
          )
        `)
        .order('shared_at', { ascending: false });
      
      if (error) throw error;
      setMentorSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching mentor submissions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch mentor submissions",
        variant: "destructive"
      });
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

  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return "bg-green-500";
    if (score >= 80) return "bg-blue-500";
    if (score >= 70) return "bg-yellow-500";
    return "bg-gray-500";
  };

  const approveForGallery = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ gallery_featured: false })
        .eq('id', profileId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Profile approved for gallery"
      });
      
      fetchGalleryProfiles();
    } catch (error) {
      console.error('Error approving profile:', error);
      toast({
        title: "Error",
        description: "Failed to approve profile",
        variant: "destructive"
      });
    }
  };

  const featureProfile = async (profileId: string, tag: string) => {
    try {
      // Update profile as featured
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ gallery_featured: true })
        .eq('id', profileId);
      
      if (profileError) throw profileError;

      // Add to featured curations
      const { error: curationError } = await supabase
        .from('featured_gallery_curations')
        .insert({
          profile_id: profileId,
          curation_tag: tag,
          active: true
        });
      
      if (curationError) throw curationError;
      
      toast({
        title: "Success",
        description: `Profile featured with tag: ${tag}`
      });
      
      setFeatureDialog(null);
      setFeatureTag("");
      fetchGalleryProfiles();
    } catch (error) {
      console.error('Error featuring profile:', error);
      toast({
        title: "Error",
        description: "Failed to feature profile",
        variant: "destructive"
      });
    }
  };

  const removeFromGallery = async (profileId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          gallery_enabled: false,
          gallery_featured: false 
        })
        .eq('id', profileId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `Profile removed from gallery: ${reason}`
      });
      
      fetchGalleryProfiles();
    } catch (error) {
      console.error('Error removing profile:', error);
      toast({
        title: "Error",
        description: "Failed to remove profile",
        variant: "destructive"
      });
    }
  };

  const filteredGalleryProfiles = galleryProfiles.filter(profile => {
    const reviewData = getReviewData(profile.resume_review_summary);
    const score = reviewData?.overall_score || 0;
    
    // Role filter
    if (roleFilter !== "all" && !profile.role_title?.toLowerCase().includes(roleFilter.toLowerCase())) {
      return false;
    }
    
    // Industry filter
    if (industryFilter !== "all" && profile.industry !== industryFilter) {
      return false;
    }
    
    // Score filter
    if (scoreFilter !== "all") {
      if (scoreFilter === "90+" && score < 90) return false;
      if (scoreFilter === "80-89" && (score < 80 || score >= 90)) return false;
      if (scoreFilter === "70-79" && (score < 70 || score >= 80)) return false;
      if (scoreFilter === "below-70" && score >= 70) return false;
    }
    
    // Search term
    if (searchTerm && !profile.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !profile.role_title?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    return true;
  });

  const uniqueRoles = [...new Set(galleryProfiles.map(p => p.role_title).filter(Boolean))];
  const uniqueIndustries = [...new Set(galleryProfiles.map(p => p.industry).filter(Boolean))];

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Moderation Panel</h1>
        <p className="text-muted-foreground">Manage gallery submissions and mentor reviews</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gallery">Gallery Queue ({galleryProfiles.length})</TabsTrigger>
          <TabsTrigger value="mentor">Mentor Submissions ({mentorSubmissions.length})</TabsTrigger>
          <TabsTrigger value="courses">Course Review</TabsTrigger>
        </TabsList>

        <TabsContent value="gallery" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Input
                  placeholder="Search by name or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Roles" />
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
                    <SelectValue placeholder="All Industries" />
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
                    <SelectValue placeholder="All Scores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Scores</SelectItem>
                    <SelectItem value="90+">90+ (Top Tier)</SelectItem>
                    <SelectItem value="80-89">80-89 (High)</SelectItem>
                    <SelectItem value="70-79">70-79 (Good)</SelectItem>
                    <SelectItem value="below-70">Below 70</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-sm text-muted-foreground self-center">
                  {filteredGalleryProfiles.length} profiles
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gallery Profiles */}
          <div className="grid gap-4">
            {filteredGalleryProfiles.map(profile => {
              const reviewData = getReviewData(profile.resume_review_summary);
              const score = reviewData?.overall_score || 0;
              
              return (
                <Card key={profile.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{profile.name}</h3>
                        <Badge 
                          className={`${getScoreBadgeColor(score)} text-white`}
                        >
                          {score}/100
                        </Badge>
                        {profile.gallery_featured && (
                          <Badge variant="secondary">
                            <Star className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                        {score >= 90 && (
                          <Badge className="bg-green-100 text-green-800">
                            <Trophy className="h-3 w-3 mr-1" />
                            Top 10%
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground mb-1">{profile.role_title}</p>
                      <p className="text-sm text-muted-foreground">{profile.industry} • {profile.location}</p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>Added {formatDistanceToNow(new Date(profile.created_at))} ago</p>
                      {profile.ai_reviewed_at && (
                        <p>Reviewed {formatDistanceToNow(new Date(profile.ai_reviewed_at))} ago</p>
                      )}
                    </div>
                  </div>

                  {/* AI Summary */}
                  {reviewData && (
                    <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2">AI Review Summary</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="font-medium text-green-600 mb-1">Strengths:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {reviewData.strengths?.slice(0, 3).map((strength: string, idx: number) => (
                              <li key={idx}>{strength}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-amber-600 mb-1">Areas for Improvement:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {reviewData.areas_for_improvement?.slice(0, 3).map((area: string, idx: number) => (
                              <li key={idx}>{area}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium mb-1">Key Skills:</p>
                          <div className="flex flex-wrap gap-1">
                            {reviewData.key_skills?.slice(0, 4).map((skill: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => approveForGallery(profile.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    
                    <Dialog 
                      open={featureDialog?.profileId === profile.id} 
                      onOpenChange={(open) => !open && setFeatureDialog(null)}
                    >
                      <DialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setFeatureDialog({ profileId: profile.id, currentTag: "" })}
                        >
                          <Star className="h-4 w-4 mr-1" />
                          Feature
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Feature Profile</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Feature Tag</label>
                            <Select value={featureTag} onValueChange={setFeatureTag}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a tag" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Rising Star">Rising Star</SelectItem>
                                <SelectItem value="Top 1%">Top 1%</SelectItem>
                                <SelectItem value="Best Portfolio">Best Portfolio</SelectItem>
                                <SelectItem value="Industry Leader">Industry Leader</SelectItem>
                                <SelectItem value="Innovation Expert">Innovation Expert</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => featureProfile(profile.id, featureTag)}
                              disabled={!featureTag}
                            >
                              Feature Profile
                            </Button>
                            <Button variant="outline" onClick={() => setFeatureDialog(null)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => removeFromGallery(profile.id, "Manual removal")}
                    >
                      <Flag className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => window.open(`/resume/${profile.id}`, '_blank')}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="mentor" className="space-y-6">
          <div className="grid gap-4">
            {mentorSubmissions.map(submission => (
              <Card key={submission.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">
                        {submission.profile?.name || 'Unknown User'}
                      </h3>
                      <Badge variant="outline">
                        <Mail className="h-3 w-3 mr-1" />
                        Mentor Submission
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mb-1">
                      {submission.profile?.role_title || 'Unknown Role'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Sent to: {submission.shared_with_email}
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(new Date(submission.shared_at))} ago
                    </p>
                  </div>
                </div>

                {/* AI Review Data */}
                {submission.ai_review_data && (
                  <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">AI Analysis</h4>
                    <div className="text-sm">
                      <p><strong>Score:</strong> {submission.ai_review_data.overall_score}/100</p>
                      {submission.ai_review_data.key_strengths && (
                        <p><strong>Key Strengths:</strong> {submission.ai_review_data.key_strengths.join(', ')}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(`/resume/${submission.user_id}`, '_blank')}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View Resume
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="courses" className="space-y-6">
          <AdminCourseReview />
        </TabsContent>
      </Tabs>
    </div>
  );
}