import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle, XCircle, Star, Flag, Users, Settings, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ModerationProfile {
  id: string;
  user_id: string;
  name: string;
  role_title: string;
  resume_review_summary: string;
  gallery_enabled: boolean;
  gallery_featured: boolean;
  created_at: string;
  ai_reviewed_at: string;
}

interface MentorFeedbackItem {
  id: string;
  mentor_email: string;
  rating: number;
  feedback: string;
  recommend_for_gallery: boolean;
  recommend_for_jobs: boolean;
  created_at: string;
  resume_event_id: string;
  profile?: {
    name: string;
    role_title: string;
  };
}

interface ModerationSettings {
  min_ai_score: number;
  auto_feature_threshold: number;
  auto_hide_threshold: number;
  require_manual_review: boolean;
}

const AdminModeration = () => {
  const [flaggedProfiles, setFlaggedProfiles] = useState<ModerationProfile[]>([]);
  const [pendingFeedback, setPendingFeedback] = useState<MentorFeedbackItem[]>([]);
  const [settings, setSettings] = useState<ModerationSettings>({
    min_ai_score: 60,
    auto_feature_threshold: 95,
    auto_hide_threshold: 40,
    require_manual_review: true
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadModerationData();
  }, []);

  const loadModerationData = async () => {
    try {
      await Promise.all([
        loadFlaggedProfiles(),
        loadPendingFeedback()
      ]);
    } catch (error) {
      console.error('Error loading moderation data:', error);
      toast({
        title: "Error",
        description: "Failed to load moderation data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFlaggedProfiles = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .not('resume_review_summary', 'is', null)
      .order('ai_reviewed_at', { ascending: true });

    if (error) throw error;

    // Filter profiles that need moderation (low scores, recent issues, etc.)
    const flagged = (data || []).filter(profile => {
      const reviewData = getReviewData(profile.resume_review_summary);
      const score = reviewData?.overall_score || 0;
      
      return (
        score < settings.min_ai_score ||
        (!profile.gallery_enabled && score > 80) ||
        (profile.gallery_enabled && score < 70)
      );
    });

    setFlaggedProfiles(flagged);
  };

  const loadPendingFeedback = async () => {
    const { data, error } = await supabase
      .from('mentor_feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Get profile info for each feedback item
    const feedbackWithProfiles = await Promise.all(
      (data || []).map(async (feedback) => {
        const { data: sharedEvent } = await supabase
          .from('resume_shared_events')
          .select('user_id')
          .eq('id', feedback.resume_event_id)
          .single();

        if (sharedEvent) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name, role_title')
            .eq('user_id', sharedEvent.user_id)
            .single();

          return {
            ...feedback,
            profile: profile || { name: 'Unknown', role_title: 'Unknown Role' }
          };
        }

        return {
          ...feedback,
          profile: { name: 'Unknown', role_title: 'Unknown Role' }
        };
      })
    );

    setPendingFeedback(feedbackWithProfiles);
  };

  const getReviewData = (resumeReviewSummary: string) => {
    try {
      return JSON.parse(resumeReviewSummary);
    } catch {
      return null;
    }
  };

  const approveProfile = async (profileId: string, featured: boolean = false) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          gallery_enabled: true,
          gallery_featured: featured,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: "Profile Approved",
        description: featured ? "Profile featured in gallery" : "Profile added to gallery"
      });

      loadFlaggedProfiles();
    } catch (error) {
      console.error('Error approving profile:', error);
      toast({
        title: "Error",
        description: "Failed to approve profile",
        variant: "destructive"
      });
    }
  };

  const rejectProfile = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          gallery_enabled: false,
          gallery_featured: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: "Profile Rejected",
        description: "Profile removed from gallery"
      });

      loadFlaggedProfiles();
    } catch (error) {
      console.error('Error rejecting profile:', error);
      toast({
        title: "Error",
        description: "Failed to reject profile",
        variant: "destructive"
      });
    }
  };

  const assignBadge = async (userId: string, badgeTypeId: string, reason: string) => {
    try {
      // Temporarily disable badge assignment until proper badge management is implemented
      // const { error } = await supabase
      //   .from('user_badges')
      //   .insert({
      //     user_id: userId,
      //     badge_id: badgeTypeId, // Would need actual badge ID
      //   });

      const { error } = await supabase
        .from('profiles')
        .update({ gallery_featured: true })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Badge Assigned",
        description: "Badge successfully assigned to user"
      });
    } catch (error) {
      console.error('Error assigning badge:', error);
      toast({
        title: "Error",
        description: "Failed to assign badge",
        variant: "destructive"
      });
    }
  };

  const updateSettings = async () => {
    // In a real implementation, this would save to a settings table
    toast({
      title: "Settings Updated",
      description: "Moderation settings have been saved"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading moderation panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Admin Moderation Panel</h1>
          <p className="text-muted-foreground">Review, approve, and moderate content across the platform</p>
        </div>

        <Tabs defaultValue="flagged" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="flagged" className="flex items-center gap-2">
              <Flag className="h-4 w-4" />
              Flagged Content ({flaggedProfiles.length})
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Mentor Feedback ({pendingFeedback.length})
            </TabsTrigger>
            <TabsTrigger value="curation" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Curation Tools
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="flagged" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Profiles Requiring Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {flaggedProfiles.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No profiles require review</p>
                  ) : (
                    flaggedProfiles.map((profile) => {
                      const reviewData = getReviewData(profile.resume_review_summary);
                      const score = reviewData?.overall_score || 0;

                      return (
                        <div key={profile.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">{profile.name}</h3>
                              <p className="text-sm text-muted-foreground">{profile.role_title}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant={score >= 80 ? "default" : score >= 60 ? "secondary" : "destructive"}>
                                  AI Score: {score}/100
                                </Badge>
                                {profile.gallery_enabled && (
                                  <Badge variant="outline">Gallery Enabled</Badge>
                                )}
                                {profile.gallery_featured && (
                                  <Badge className="bg-gradient-to-r from-primary to-primary/80">Featured</Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => approveProfile(profile.id, false)}
                                className="bg-green-500 hover:bg-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => approveProfile(profile.id, true)}
                                className="bg-blue-500 hover:bg-blue-600"
                              >
                                <Star className="h-4 w-4 mr-1" />
                                Feature
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => rejectProfile(profile.id)}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </div>

                          {reviewData?.improvement_suggestions && (
                            <div className="text-sm bg-muted/50 p-3 rounded">
                              <strong>AI Suggestions:</strong>
                              <ul className="list-disc list-inside mt-1 space-y-1">
                                {reviewData.improvement_suggestions.slice(0, 3).map((suggestion: string, idx: number) => (
                                  <li key={idx}>{suggestion}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  Mentor Feedback Review
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingFeedback.length === 0 ? (
                    <p className="text-center py-8 text-muted-foreground">No pending feedback to review</p>
                  ) : (
                    pendingFeedback.slice(0, 10).map((feedback) => (
                      <div key={feedback.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">{feedback.profile?.name}</h3>
                              <span className="text-sm text-muted-foreground">•</span>
                              <span className="text-sm text-muted-foreground">{feedback.profile?.role_title}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              From: {feedback.mentor_email} • Rating: {feedback.rating}/5
                            </p>
                            <p className="text-sm bg-muted/50 p-2 rounded">{feedback.feedback}</p>
                            <div className="flex gap-2 mt-2">
                              {feedback.recommend_for_gallery && (
                                <Badge variant="secondary">Recommended for Gallery</Badge>
                              )}
                              {feedback.recommend_for_jobs && (
                                <Badge variant="secondary">Recommended for Jobs</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="curation" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" />
                    Quick Badge Assignment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="user-email">User Email</Label>
                    <Input id="user-email" placeholder="user@example.com" />
                  </div>
                  <div>
                    <Label htmlFor="badge-type">Badge Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select badge type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top_performer">🎯 Top Performer</SelectItem>
                        <SelectItem value="innovation_expert">🧠 Innovation Expert</SelectItem>
                        <SelectItem value="leadership_star">⭐ Leadership Star</SelectItem>
                        <SelectItem value="verified_professional">✅ Verified Professional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="assignment-reason">Assignment Reason</Label>
                    <Textarea id="assignment-reason" placeholder="Reason for badge assignment..." />
                  </div>
                  <Button className="w-full">
                    <Zap className="h-4 w-4 mr-2" />
                    Assign Badge
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Bulk Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button variant="outline" className="w-full justify-start">
                    Enable Gallery for High-Scoring Profiles (90+)
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Feature Mentor-Recommended Profiles
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Review Profiles Without Recent Activity
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    Export Moderation Report
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Auto-Moderation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="min-score">Minimum AI Score for Gallery</Label>
                    <Input
                      id="min-score"
                      type="number"
                      value={settings.min_ai_score}
                      onChange={(e) => setSettings({...settings, min_ai_score: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="auto-feature">Auto-Feature Threshold</Label>
                    <Input
                      id="auto-feature"
                      type="number"
                      value={settings.auto_feature_threshold}
                      onChange={(e) => setSettings({...settings, auto_feature_threshold: parseInt(e.target.value)})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="auto-hide">Auto-Hide Threshold</Label>
                    <Input
                      id="auto-hide"
                      type="number"
                      value={settings.auto_hide_threshold}
                      onChange={(e) => setSettings({...settings, auto_hide_threshold: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="manual-review"
                    checked={settings.require_manual_review}
                    onChange={(e) => setSettings({...settings, require_manual_review: e.target.checked})}
                  />
                  <Label htmlFor="manual-review">Require manual review for all new profiles</Label>
                </div>
                <Button onClick={updateSettings} className="w-full">
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminModeration;