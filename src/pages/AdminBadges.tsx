import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface NewBadge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  slug: string;
  trigger_type: string;
  threshold: number;
  created_at: string;
}

interface NewUserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  badge?: NewBadge;
}

const AdminBadges = () => {
  const [badges, setBadges] = useState<NewBadge[]>([]);
  const [userBadges, setUserBadges] = useState<NewUserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    emoji: "",
    description: "",
    slug: "",
    trigger_type: "manual",
    threshold: 0
  });

  const [assignData, setAssignData] = useState({
    user_id: "",
    badge_id: ""
  });

  useEffect(() => {
    fetchBadges();
    fetchUserBadges();
  }, []);

  const fetchBadges = async () => {
    try {
      const { data, error } = await supabase
        .from("badges")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBadges(data || []);
    } catch (error) {
      console.error("Error fetching badges:", error);
      toast.error("Failed to load badges");
    }
  };

  const fetchUserBadges = async () => {
    try {
      const { data, error } = await supabase
        .from("user_badges")
        .select(`
          *,
          badge:badges(*)
        `)
        .order("earned_at", { ascending: false });

      if (error) throw error;
      setUserBadges(data || []);
    } catch (error) {
      console.error("Error fetching user badges:", error);
      toast.error("Failed to load user badges");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBadge = async () => {
    try {
      const { error } = await supabase
        .from("badges")
        .insert([formData]);

      if (error) throw error;

      toast.success("Badge created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      fetchBadges();
    } catch (error) {
      console.error("Error creating badge:", error);
      toast.error("Failed to create badge");
    }
  };

  const handleAssignBadge = async () => {
    try {
      const { error } = await supabase
        .from("user_badges")
        .insert([assignData]);

      if (error) throw error;

      toast.success("Badge assigned successfully");
      setIsAssignDialogOpen(false);
      setAssignData({ user_id: "", badge_id: "" });
      fetchUserBadges();
    } catch (error) {
      console.error("Error assigning badge:", error);
      toast.error("Failed to assign badge");
    }
  };

  const handleRemoveBadge = async (id: string) => {
    try {
      const { error } = await supabase
        .from("user_badges")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Badge removed successfully");
      fetchUserBadges();
    } catch (error) {
      console.error("Error removing badge:", error);
      toast.error("Failed to remove badge");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      emoji: "",
      description: "",
      slug: "",
      trigger_type: "manual",
      threshold: 0
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading badges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Badge Management</h1>
          <p className="text-muted-foreground">
            Create and manage badges for recognizing achievements
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Badge Types */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Available Badges</CardTitle>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={resetForm}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Badge
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Badge</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., High Achiever"
                        />
                      </div>
                      <div>
                        <Label htmlFor="emoji">Emoji</Label>
                        <Input
                          id="emoji"
                          value={formData.emoji}
                          onChange={(e) => setFormData(prev => ({ ...prev, emoji: e.target.value }))}
                          placeholder="⭐"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Badge description..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="slug">Slug</Label>
                        <Input
                          id="slug"
                          value={formData.slug}
                          onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                          placeholder="high-achiever"
                        />
                      </div>
                      <div>
                        <Label htmlFor="trigger_type">Trigger Type</Label>
                        <Input
                          id="trigger_type"
                          value={formData.trigger_type}
                          onChange={(e) => setFormData(prev => ({ ...prev, trigger_type: e.target.value }))}
                          placeholder="cri_score"
                        />
                      </div>
                      <div>
                        <Label htmlFor="threshold">Threshold</Label>
                        <Input
                          id="threshold"
                          type="number"
                          value={formData.threshold}
                          onChange={(e) => setFormData(prev => ({ ...prev, threshold: Number(e.target.value) }))}
                          placeholder="80"
                        />
                      </div>
                      <Button onClick={handleCreateBadge} className="w-full">
                        Create Badge
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {badges.map((badge) => (
                  <div key={badge.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-sm">
                        <span className="mr-1">{badge.emoji}</span>
                        {badge.name}
                      </Badge>
                      <div>
                        <p className="text-sm text-muted-foreground">{badge.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {badge.trigger_type} ≥ {badge.threshold}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Assigned Badges */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Assigned Badges</CardTitle>
                <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Assign Badge
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assign Badge to User</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="user_id">User ID</Label>
                        <Input
                          id="user_id"
                          value={assignData.user_id}
                          onChange={(e) => setAssignData(prev => ({ ...prev, user_id: e.target.value }))}
                          placeholder="Enter user UUID"
                        />
                      </div>
                      <div>
                        <Label htmlFor="badge_id">Badge</Label>
                        <select
                          value={assignData.badge_id}
                          onChange={(e) => setAssignData(prev => ({ ...prev, badge_id: e.target.value }))}
                          className="w-full p-2 border rounded"
                        >
                          <option value="">Select badge</option>
                          {badges.map((badge) => (
                            <option key={badge.id} value={badge.id}>
                              {badge.emoji} {badge.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <Button onClick={handleAssignBadge} className="w-full">
                        Assign Badge
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userBadges.map((userBadge) => (
                  <div key={userBadge.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-sm">
                        <span className="mr-1">{userBadge.badge?.emoji}</span>
                        {userBadge.badge?.name}
                      </Badge>
                      <div>
                        <p className="font-medium">User {userBadge.user_id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">
                          Earned {format(new Date(userBadge.earned_at), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveBadge(userBadge.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {userBadges.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No badges assigned yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminBadges;