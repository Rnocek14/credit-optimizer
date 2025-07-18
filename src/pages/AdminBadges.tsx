import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trophy, Star, Eye, Zap, Users, Lightbulb, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface BadgeType {
  id: string;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  color: string;
  background_color: string;
  criteria_type: string;
  criteria_value: any;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface UserBadge {
  id: string;
  user_id: string;
  badge_type: BadgeType;
  assigned_by: string;
  assigned_reason: string;
  active: boolean;
  created_at: string;
}

const iconMap = {
  trophy: Trophy,
  star: Star,
  eye: Eye,
  zap: Zap,
  users: Users,
  lightbulb: Lightbulb,
};

const AdminBadges = () => {
  const [badgeTypes, setBadgeTypes] = useState<BadgeType[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<BadgeType | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    display_name: "",
    description: "",
    icon: "trophy",
    color: "#3b82f6",
    background_color: "#dbeafe",
    criteria_type: "manual",
  });

  const [assignData, setAssignData] = useState({
    user_id: "",
    badge_type_id: "",
    assigned_reason: "",
  });

  useEffect(() => {
    fetchBadgeTypes();
    fetchUserBadges();
  }, []);

  const fetchBadgeTypes = async () => {
    try {
      const { data, error } = await supabase
        .from("badge_types")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBadgeTypes(data || []);
    } catch (error) {
      console.error("Error fetching badge types:", error);
      toast.error("Failed to load badge types");
    }
  };

  const fetchUserBadges = async () => {
    try {
      const { data, error } = await supabase
        .from("user_badges")
        .select(`
          *,
          badge_type:badge_types(*)
        `)
        .eq("active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUserBadges(data as UserBadge[] || []);
    } catch (error) {
      console.error("Error fetching user badges:", error);
      toast.error("Failed to load user badges");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBadgeType = async () => {
    try {
      const { error } = await supabase
        .from("badge_types")
        .insert([formData]);

      if (error) throw error;

      toast.success("Badge type created successfully");
      setIsCreateDialogOpen(false);
      resetForm();
      fetchBadgeTypes();
    } catch (error) {
      console.error("Error creating badge type:", error);
      toast.error("Failed to create badge type");
    }
  };

  const handleUpdateBadgeType = async () => {
    if (!editingBadge) return;

    try {
      const { error } = await supabase
        .from("badge_types")
        .update(formData)
        .eq("id", editingBadge.id);

      if (error) throw error;

      toast.success("Badge type updated successfully");
      setEditingBadge(null);
      resetForm();
      fetchBadgeTypes();
    } catch (error) {
      console.error("Error updating badge type:", error);
      toast.error("Failed to update badge type");
    }
  };

  const handleToggleBadgeType = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase
        .from("badge_types")
        .update({ active })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Badge type ${active ? "activated" : "deactivated"}`);
      fetchBadgeTypes();
    } catch (error) {
      console.error("Error toggling badge type:", error);
      toast.error("Failed to update badge type");
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
      setAssignData({ user_id: "", badge_type_id: "", assigned_reason: "" });
      fetchUserBadges();
    } catch (error) {
      console.error("Error assigning badge:", error);
      toast.error("Failed to assign badge");
    }
  };

  const handleRevokeBadge = async (id: string) => {
    try {
      const { error } = await supabase
        .from("user_badges")
        .update({ active: false })
        .eq("id", id);

      if (error) throw error;

      toast.success("Badge revoked successfully");
      fetchUserBadges();
    } catch (error) {
      console.error("Error revoking badge:", error);
      toast.error("Failed to revoke badge");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      display_name: "",
      description: "",
      icon: "trophy",
      color: "#3b82f6",
      background_color: "#dbeafe",
      criteria_type: "manual",
    });
  };

  const openEditDialog = (badge: BadgeType) => {
    setEditingBadge(badge);
    setFormData({
      name: badge.name,
      display_name: badge.display_name,
      description: badge.description || "",
      icon: badge.icon,
      color: badge.color,
      background_color: badge.background_color,
      criteria_type: badge.criteria_type,
    });
    setIsCreateDialogOpen(true);
  };

  const renderBadgePreview = (badge: Partial<BadgeType>) => {
    const IconComponent = iconMap[badge.icon as keyof typeof iconMap] || Trophy;
    return (
      <Badge 
        variant="secondary" 
        className="text-sm px-3 py-1"
        style={{ 
          color: badge.color, 
          backgroundColor: badge.background_color,
          border: `1px solid ${badge.color}20`
        }}
      >
        <IconComponent className="w-4 h-4 mr-1" />
        {badge.display_name}
      </Badge>
    );
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
            Create and manage badges for recognizing exceptional candidates
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Badge Types */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Badge Types</CardTitle>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => { resetForm(); setEditingBadge(null); }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Badge
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingBadge ? "Edit Badge Type" : "Create Badge Type"}
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="e.g., top_performer"
                        />
                      </div>
                      <div>
                        <Label htmlFor="display_name">Display Name</Label>
                        <Input
                          id="display_name"
                          value={formData.display_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                          placeholder="e.g., Top Performer"
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
                        <Label htmlFor="icon">Icon</Label>
                        <Select value={formData.icon} onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trophy">Trophy</SelectItem>
                            <SelectItem value="star">Star</SelectItem>
                            <SelectItem value="eye">Eye</SelectItem>
                            <SelectItem value="zap">Zap</SelectItem>
                            <SelectItem value="users">Users</SelectItem>
                            <SelectItem value="lightbulb">Lightbulb</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="color">Text Color</Label>
                          <Input
                            id="color"
                            type="color"
                            value={formData.color}
                            onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="background_color">Background Color</Label>
                          <Input
                            id="background_color"
                            type="color"
                            value={formData.background_color}
                            onChange={(e) => setFormData(prev => ({ ...prev, background_color: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="criteria_type">Criteria Type</Label>
                        <Select value={formData.criteria_type} onValueChange={(value) => setFormData(prev => ({ ...prev, criteria_type: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual Assignment</SelectItem>
                            <SelectItem value="ai_score">AI Score Based</SelectItem>
                            <SelectItem value="mentor_feedback">Mentor Feedback</SelectItem>
                            <SelectItem value="gallery_featured">Gallery Featured</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Preview</Label>
                        <div className="mt-2">
                          {renderBadgePreview(formData)}
                        </div>
                      </div>
                      <Button 
                        onClick={editingBadge ? handleUpdateBadgeType : handleCreateBadgeType}
                        className="w-full"
                      >
                        {editingBadge ? "Update Badge" : "Create Badge"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {badgeTypes.map((badge) => (
                  <div key={badge.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {renderBadgePreview(badge)}
                      <div>
                        <p className="font-medium">{badge.display_name}</p>
                        <p className="text-sm text-muted-foreground">{badge.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={badge.active}
                        onCheckedChange={(checked) => handleToggleBadgeType(badge.id, checked)}
                      />
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(badge)}>
                        <Edit className="w-4 h-4" />
                      </Button>
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
                        <Label htmlFor="badge_type_id">Badge Type</Label>
                        <Select value={assignData.badge_type_id} onValueChange={(value) => setAssignData(prev => ({ ...prev, badge_type_id: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select badge type" />
                          </SelectTrigger>
                          <SelectContent>
                            {badgeTypes.filter(b => b.active).map((badge) => (
                              <SelectItem key={badge.id} value={badge.id}>
                                {badge.display_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="assigned_reason">Reason</Label>
                        <Textarea
                          id="assigned_reason"
                          value={assignData.assigned_reason}
                          onChange={(e) => setAssignData(prev => ({ ...prev, assigned_reason: e.target.value }))}
                          placeholder="Reason for assigning this badge..."
                        />
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
                      {renderBadgePreview(userBadge.badge_type)}
                      <div>
                        <p className="font-medium">User {userBadge.user_id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">{userBadge.badge_type.display_name} Badge</p>
                        <p className="text-xs text-muted-foreground">
                          Assigned {format(new Date(userBadge.created_at), "MMM dd, yyyy")}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeBadge(userBadge.id)}
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