import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { triggerBadgeAssignment } from '@/lib/badgeUtils';
import { 
  FileText, 
  Download, 
  Globe, 
  Loader2, 
  RefreshCw, 
  Save, 
  Plus,
  Target,
  TrendingUp,
  BarChart3,
  CheckCircle,
  Clock,
  Award,
  Sparkles
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import { useProjectsStore } from '@/state/projectsStore';

interface ResumeContent {
  personalInfo?: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedIn: string;
    portfolio: string;
  };
  summary: string;
  bullets?: string[];
  experience?: any[];
  projects?: any[];
  education?: any[];
  skills: {
    [category: string]: string[];
  };
  certifications?: any[];
}

interface ResumeData {
  id?: string;
  title?: string;
  content: any; // JSON from database
  cri_average?: number;
  readiness_score?: number;
  submitted_for_cri?: boolean;
  cri_feedback?: any;
  improvement_suggestions?: string[];
  scored_at?: string;
  created_at?: string;
  published_to_profile?: boolean;
  criAverage?: number; // For compatibility
  readinessScore?: number; // For compatibility
  dataUsed?: {
    transcriptCount: number;
    courseCount: number;
    hasCareerGoal: boolean;
    feedbackCount: number;
  };
}

const ResumeBuilder = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isScoring, setIsScoring] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [editableContent, setEditableContent] = useState<ResumeContent | null>(null);
  const [resumeTitle, setResumeTitle] = useState('');
  const [publishToProfile, setPublishToProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedDrafts, setSavedDrafts] = useState<ResumeData[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { items: proofProjects } = useProjectsStore();

  useEffect(() => {
    loadSavedDrafts();
  }, []);

  const loadSavedDrafts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: drafts, error } = await supabase
        .from('ai_resume_drafts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedDrafts((drafts || []) as ResumeData[]);
    } catch (error) {
      console.error('Error loading drafts:', error);
    }
  };

  const loadDraft = (draft: ResumeData) => {
    setResumeData(draft);
    setEditableContent(draft.content);
    setResumeTitle(draft.title || 'Untitled Resume');
    setPublishToProfile(draft.published_to_profile || false);
    setSelectedDraftId(draft.id || null);
  };

  const generateResume = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to generate a resume",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase.functions.invoke('generate-resume-draft', {
        body: { 
          userId: user.id,
          resumeTitle: resumeTitle || `Resume Draft - ${new Date().toLocaleDateString()}`
        }
      });

      if (error) throw error;

      setResumeData(data);
      setEditableContent(data.resume.content);
      setResumeTitle(data.resume.title);
      setSelectedDraftId(data.resume.id);

      // Refresh drafts list
      await loadSavedDrafts();

      toast({
        title: "Resume generated! 🎉",
        description: "Your AI-powered resume draft is ready for review.",
      });
    } catch (error) {
      console.error('Error generating resume:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitForCRIScoring = async () => {
    if (!selectedDraftId) {
      toast({
        title: "No resume selected",
        description: "Please select a resume draft to score.",
        variant: "destructive",
      });
      return;
    }

    setIsScoring(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('calculate-cri-score', {
        body: { 
          resumeId: selectedDraftId,
          userId: user.id
        }
      });

      if (error) throw error;

      // Update current resume data with scoring results
      setResumeData(prev => ({
        ...prev,
        ...data.resume,
        submitted_for_cri: true
      }));

      // Refresh drafts list
      await loadSavedDrafts();

      toast({
        title: "🎯 CRI Scoring Complete!",
        description: `Your resume scored ${data.scoring.criScore}/100 on career readiness.`,
      });
    } catch (error) {
      console.error('Error scoring resume:', error);
      toast({
        title: "Scoring failed",
        description: error.message || "Failed to score resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsScoring(false);
    }
  };

  const updateResume = async () => {
    if (!selectedDraftId || !editableContent) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('ai_resume_drafts')
        .update({
          title: resumeTitle,
          content: editableContent as any,
          published_to_profile: publishToProfile
        })
        .eq('id', selectedDraftId);

      if (error) throw error;

      await loadSavedDrafts();

      toast({
        title: "Resume updated!",
        description: "Your changes have been saved.",
      });
    } catch (error) {
      console.error('Error updating resume:', error);
      toast({
        title: "Update failed",
        description: error.message || "Failed to update resume.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 85) return 'default';
    if (score >= 70) return 'secondary';
    return 'outline';
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Sidebar - Saved Drafts */}
          <div className="lg:col-span-1">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Resume Drafts
                </CardTitle>
                <CardDescription>
                  Your saved resume drafts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={generateResume} 
                  disabled={isLoading}
                  className="w-full mb-4"
                  variant="outline"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      New Resume
                    </>
                  )}
                </Button>

                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {savedDrafts.map((draft) => (
                      <Card 
                        key={draft.id}
                        className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                          selectedDraftId === draft.id ? 'ring-2 ring-primary' : ''
                        }`}
                        onClick={() => loadDraft(draft)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm line-clamp-2">
                              {draft.title || 'Untitled Resume'}
                            </h4>
                            {draft.published_to_profile && (
                              <Globe className="h-3 w-3 text-primary flex-shrink-0 ml-1" />
                            )}
                          </div>
                          
                          <div className="space-y-1">
                            {draft.submitted_for_cri && (
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-3 w-3 text-green-600" />
                                <span className="text-xs text-muted-foreground">CRI Scored</span>
                              </div>
                            )}
                            {draft.cri_average && (
                              <Badge variant={getScoreBadgeVariant(draft.cri_average)} className="text-xs">
                                CRI: {Math.round(draft.cri_average)}
                              </Badge>
                            )}
                            <div className="text-xs text-muted-foreground">
                              {new Date(draft.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {!resumeData ? (
              <Card className="text-center">
                <CardContent className="py-12">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="text-2xl font-semibold mb-2">AI Resume Builder</h2>
                  <p className="text-muted-foreground mb-6">
                    Generate professional resumes using your learning data and get AI-powered CRI scoring
                  </p>
                  <Button onClick={generateResume} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Resume...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Create Your First Resume
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Resume Header & Actions */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          {resumeTitle}
                        </CardTitle>
                        <CardDescription>
                          AI-generated resume from your learning journey
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {!resumeData.submitted_for_cri && (
                          <Button
                            onClick={submitForCRIScoring}
                            disabled={isScoring}
                            variant="default"
                          >
                            {isScoring ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Scoring...
                              </>
                            ) : (
                              <>
                                <Target className="w-4 h-4 mr-2" />
                                Submit for CRI Scoring
                              </>
                            )}
                          </Button>
                        )}
                        <Button onClick={updateResume} disabled={isSaving} variant="outline">
                          {isSaving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4 mr-2" />
                          )}
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                {/* CRI Scoring Results */}
                {resumeData.submitted_for_cri && (
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        CRI Scoring Results
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="text-center">
                          <div className={`text-4xl font-bold ${getScoreColor(resumeData.cri_average || 0)}`}>
                            {Math.round(resumeData.cri_average || 0)}
                          </div>
                          <div className="text-sm text-muted-foreground">🎯 CRI Score</div>
                          <Progress 
                            value={resumeData.cri_average || 0} 
                            className="h-2 mt-2"
                          />
                        </div>
                        <div className="text-center">
                          <div className={`text-4xl font-bold ${getScoreColor(resumeData.readiness_score || 0)}`}>
                            {Math.round(resumeData.readiness_score || 0)}%
                          </div>
                          <div className="text-sm text-muted-foreground">🔎 Readiness Score</div>
                          <Progress 
                            value={resumeData.readiness_score || 0} 
                            className="h-2 mt-2"
                          />
                        </div>
                      </div>

                      {resumeData.improvement_suggestions && (
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary" />
                            Improvement Suggestions
                          </h4>
                          <div className="space-y-2">
                            {resumeData.improvement_suggestions.map((suggestion, index) => (
                              <div key={index} className="flex items-start gap-2 text-sm">
                                <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
                                <span>{suggestion}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {resumeData.scored_at && (
                        <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Scored on {new Date(resumeData.scored_at).toLocaleDateString()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Resume Settings */}
                <Card>
                  <CardHeader>
                    <CardTitle>Resume Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="resume-title">Resume Title</Label>
                      <Input
                        id="resume-title"
                        value={resumeTitle}
                        onChange={(e) => setResumeTitle(e.target.value)}
                        placeholder="Enter a title for your resume..."
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={publishToProfile}
                        onCheckedChange={setPublishToProfile}
                      />
                      <Label>Publish to Profile</Label>
                    </div>
                  </CardContent>
                </Card>

                {/* Resume Content Editing */}
                {editableContent && (
                  <>
                    {/* Professional Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Professional Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Textarea
                          value={editableContent.summary}
                          onChange={(e) => setEditableContent({
                            ...editableContent,
                            summary: e.target.value
                          })}
                          rows={4}
                          className="resize-none"
                        />
                      </CardContent>
                    </Card>

                    {/* Skills */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Skills & Competencies</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {Object.entries(editableContent.skills).map(([category, skills]) => (
                          <div key={category}>
                            <h4 className="font-semibold mb-2">{category}</h4>
                            <div className="flex flex-wrap gap-2">
                              {skills.map((skill, index) => (
                                <Badge key={index} variant="outline">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Key Achievements */}
                    {editableContent.bullets && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Key Achievements</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {editableContent.bullets.map((bullet, index) => (
                            <div key={index} className="flex gap-2">
                              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                              <Textarea
                                value={bullet}
                                onChange={(e) => {
                                  const newBullets = [...editableContent.bullets!];
                                  newBullets[index] = e.target.value;
                                  setEditableContent({
                                    ...editableContent,
                                    bullets: newBullets
                                  });
                                }}
                                rows={2}
                                className="flex-1 resize-none"
                              />
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeBuilder;