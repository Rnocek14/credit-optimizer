import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { TrustTranscript } from "@/components/resume/TrustTranscript";
import { useCourseIntelligence } from "@/hooks/useCourseIntelligence";
import { trackTelemetryEvent } from '@/utils/telemetry';
import { useActiveTrackStore } from "@/stores/useActiveTrackStore";
import { useQuery } from "@tanstack/react-query";
import { 
  GraduationCap, 
  Plus, 
  Edit, 
  Trash2, 
  Award, 
  Check, 
  X,
  Sparkles,
  Brain,
  TrendingUp,
  FileText
} from "lucide-react";

interface TranscriptEntry {
  id: string;
  title: string;
  description: string;
  grade: string;
  credits: number;
  difficulty: string;
  skill_tags: string[];
  cri_score: number;
  verified: boolean;
  use_in_resume: boolean;
  created_at: string;
}

export default function Transcript() {
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { getCRI } = useCourseIntelligence();
  const { activeTrackId } = useActiveTrackStore();

  // Fetch CRI data for Trust Transcript
  const { data: criData } = useQuery({
    queryKey: ['user-cri', activeTrackId],
    queryFn: async () => {
      if (!activeTrackId) return null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      try {
        return await getCRI(user.id, activeTrackId, false);
      } catch (error) {
        console.error('CRI fetch error:', error);
        return null;
      }
    },
    enabled: !!activeTrackId
  });

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    grade: "",
    credits: "",
    difficulty: "",
    skill_tags: ""
  });

  useEffect(() => {
    fetchEntries();
    
    // Track transcript view
    trackTelemetryEvent({
      task: 'resume_view',
      route: '/transcript',
      function_name: 'transcript_page_load'
    });
  }, []);

  const fetchEntries = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .eq('user_id', user.id)
        .order('cri_score', { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching transcript entries:', error);
      toast({
        title: "Error",
        description: "Failed to load transcript entries.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateCRIScore = async (entryData: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('calculate-cri-score', {
        body: {
          title: entryData.title,
          description: entryData.description,
          difficulty: entryData.difficulty,
          skillTags: entryData.skill_tags.split(',').map((s: string) => s.trim()).filter(Boolean)
        }
      });

      if (error) throw error;
      return data.criScore || 50;
    } catch (error) {
      console.error('Error calculating CRI score:', error);
      return 50; // Fallback score
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Calculate CRI score
      const criScore = await calculateCRIScore(formData);

      const entryData = {
        user_id: user.id,
        title: formData.title,
        description: formData.description,
        grade: formData.grade,
        credits: formData.credits ? parseFloat(formData.credits) : null,
        difficulty: formData.difficulty,
        skill_tags: formData.skill_tags.split(',').map(s => s.trim()).filter(Boolean),
        cri_score: criScore
      };

      let error;
      if (editingId) {
        ({ error } = await supabase
          .from('transcripts')
          .update(entryData)
          .eq('id', editingId));
      } else {
        ({ error } = await supabase
          .from('transcripts')
          .insert(entryData));
      }

      if (error) throw error;

      toast({
        title: "Success",
        description: `Entry ${editingId ? 'updated' : 'created'} successfully!`,
      });

      resetForm();
      fetchEntries();
    } catch (error) {
      console.error('Error saving entry:', error);
      toast({
        title: "Error",
        description: "Failed to save entry.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (entry: TranscriptEntry) => {
    setFormData({
      title: entry.title,
      description: entry.description,
      grade: entry.grade,
      credits: entry.credits?.toString() || "",
      difficulty: entry.difficulty,
      skill_tags: entry.skill_tags.join(', ')
    });
    setEditingId(entry.id);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('transcripts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Entry deleted successfully.",
      });

      fetchEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({
        title: "Error",
        description: "Failed to delete entry.",
        variant: "destructive",
      });
    }
  };

  const handleToggleVerified = async (id: string, verified: boolean) => {
    try {
      const { error } = await supabase
        .from('transcripts')
        .update({ verified: !verified })
        .eq('id', id);

      if (error) throw error;
      fetchEntries();
    } catch (error) {
      console.error('Error updating verification:', error);
      toast({
        title: "Error",
        description: "Failed to update verification status.",
        variant: "destructive",
      });
    }
  };

  const handleToggleResume = async (id: string, useInResume: boolean) => {
    try {
      const { error } = await supabase
        .from('transcripts')
        .update({ use_in_resume: !useInResume })
        .eq('id', id);

      if (error) throw error;
      fetchEntries();
    } catch (error) {
      console.error('Error updating resume status:', error);
      toast({
        title: "Error",
        description: "Failed to update resume status.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      grade: "",
      credits: "",
      difficulty: "",
      skill_tags: ""
    });
    setEditingId(null);
  };

  const getCRIColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getCRIBgColor = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-64 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <GraduationCap className="h-8 w-8 text-primary mr-3" />
            <span className="text-lg font-semibold text-primary tracking-wide">LEARNING TRANSCRIPT</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Your Learning History
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Track and verify your learning achievements with AI-powered career relevance insights.
          </p>
        </div>

        {/* Add Entry Form */}
        <Card className="mb-8 border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              {editingId ? 'Edit Entry' : 'Add New Transcript Entry'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    placeholder="Course or certification title"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="grade">Grade</Label>
                  <Input
                    id="grade"
                    value={formData.grade}
                    onChange={(e) => setFormData({...formData, grade: e.target.value})}
                    placeholder="A+, 98%, Pass, etc."
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="What did you learn? Key skills and outcomes..."
                  className="h-20"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="credits">Credits</Label>
                  <Input
                    id="credits"
                    type="number"
                    step="0.5"
                    value={formData.credits}
                    onChange={(e) => setFormData({...formData, credits: e.target.value})}
                    placeholder="3.0"
                  />
                </div>
                <div>
                  <Label>Difficulty</Label>
                  <Select value={formData.difficulty} onValueChange={(value) => setFormData({...formData, difficulty: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="skill_tags">Skills (comma-separated)</Label>
                  <Input
                    id="skill_tags"
                    value={formData.skill_tags}
                    onChange={(e) => setFormData({...formData, skill_tags: e.target.value})}
                    placeholder="React, JavaScript, Project Management"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Processing..." : editingId ? "Update Entry" : "Add Entry"}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel Edit
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Trust Transcript */}
        <TrustTranscript 
          currentCRI={criData?.cri || 0}
          computedAt={criData?.computedAt}
          trackId={activeTrackId || undefined}
        />

        {/* Entries Grid */}
        {entries.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-semibold mb-4">No transcript entries yet</h3>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Start building your learning profile by adding your courses, certifications, and achievements.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {entries.map((entry) => (
              <Card key={entry.id} className="hover:shadow-lg transition-all duration-300 relative">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2 pr-2">{entry.title}</CardTitle>
                      {entry.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{entry.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(entry)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Grade and Credits */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {entry.grade && (
                      <Badge variant="outline">
                        <Award className="h-3 w-3 mr-1" />
                        {entry.grade}
                      </Badge>
                    )}
                    {entry.credits && (
                      <Badge variant="outline">
                        {entry.credits} credits
                      </Badge>
                    )}
                    {entry.difficulty && (
                      <Badge variant="secondary">
                        {entry.difficulty}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  {/* CRI Score */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">CRI Score</span>
                        {entry.cri_score > 80 && (
                          <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI
                          </Badge>
                        )}
                      </div>
                      <span className={`text-sm font-bold ${getCRIColor(entry.cri_score)}`}>
                        {entry.cri_score}/100
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${getCRIBgColor(entry.cri_score)}`}
                        style={{ width: `${entry.cri_score}%` }}
                      />
                    </div>
                  </div>

                  {/* Skills */}
                  {entry.skill_tags.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {entry.skill_tags.slice(0, 4).map((skill, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                        {entry.skill_tags.length > 4 && (
                          <Badge variant="secondary" className="text-xs">
                            +{entry.skill_tags.length - 4} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Toggles */}
                  <div className="space-y-3 pt-3 border-t">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Verified</span>
                      </div>
                      <Switch
                        checked={entry.verified}
                        onCheckedChange={() => handleToggleVerified(entry.id, entry.verified)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="text-sm">Use in Resume</span>
                      </div>
                      <Switch
                        checked={entry.use_in_resume}
                        onCheckedChange={() => handleToggleResume(entry.id, entry.use_in_resume)}
                      />
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground mt-3">
                    Added {new Date(entry.created_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}