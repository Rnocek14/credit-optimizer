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
import { useToast } from '@/hooks/use-toast';
import { FileText, Download, Globe, Loader2, RefreshCw, Save } from 'lucide-react';

interface ResumeContent {
  summary: string;
  bullets: string[];
  skills: {
    [category: string]: string[];
  };
}

interface ResumeData {
  content: ResumeContent;
  criAverage: number;
  readinessScore: number;
  dataUsed: {
    transcriptCount: number;
    courseCount: number;
    hasCareerGoal: boolean;
    feedbackCount: number;
  };
}

const ResumeBuilder = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [editableContent, setEditableContent] = useState<ResumeContent | null>(null);
  const [resumeTitle, setResumeTitle] = useState('');
  const [publishToProfile, setPublishToProfile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

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
        body: { user_id: user.id }
      });

      if (error) throw error;

      setResumeData(data);
      setEditableContent(data.content);
      setResumeTitle(`Resume Draft - ${new Date().toLocaleDateString()}`);

      toast({
        title: "Resume generated!",
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

  const saveResume = async () => {
    if (!editableContent || !resumeData) {
      toast({
        title: "No content to save",
        description: "Please generate a resume first.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('ai_resume_drafts')
        .insert({
          user_id: user.id,
          title: resumeTitle || 'Untitled Resume',
          content: editableContent as any,
          cri_average: resumeData.criAverage,
          readiness_score: resumeData.readinessScore,
          published_to_profile: publishToProfile
        });

      if (error) throw error;

      toast({
        title: "Resume saved!",
        description: publishToProfile 
          ? "Your resume draft has been saved and published to your profile."
          : "Your resume draft has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving resume:', error);
      toast({
        title: "Save failed",
        description: error.message || "Failed to save resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updateBullet = (index: number, newText: string) => {
    if (!editableContent) return;
    const newBullets = [...editableContent.bullets];
    newBullets[index] = newText;
    setEditableContent({
      ...editableContent,
      bullets: newBullets
    });
  };

  const addBullet = () => {
    if (!editableContent) return;
    setEditableContent({
      ...editableContent,
      bullets: [...editableContent.bullets, 'New achievement or experience...']
    });
  };

  const removeBullet = (index: number) => {
    if (!editableContent) return;
    const newBullets = editableContent.bullets.filter((_, i) => i !== index);
    setEditableContent({
      ...editableContent,
      bullets: newBullets
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'bg-success';
    if (score >= 40) return 'bg-warning';
    return 'bg-destructive';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <FileText className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Resume Builder</h1>
          <p className="text-muted-foreground">Generate a smart resume using your learning data and AI insights</p>
        </div>
      </div>

      {/* Generate Resume Section */}
      {!resumeData && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Generate Your Resume Draft</CardTitle>
            <CardDescription>
              We'll analyze your transcript entries, saved courses, and career goals to create a tailored resume
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={generateResume} 
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Resume...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Resume Draft
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Resume Content */}
      {resumeData && editableContent && (
        <div className="space-y-6">
          {/* Resume Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Resume Insights
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateResume}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{resumeData.criAverage.toFixed(1)}</div>
                  <div className="text-sm text-muted-foreground">Average CRI Score</div>
                  <Progress 
                    value={resumeData.criAverage} 
                    className={`h-2 mt-2 ${getScoreColor(resumeData.criAverage)}`}
                  />
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{resumeData.readinessScore.toFixed(1)}</div>
                  <div className="text-sm text-muted-foreground">Readiness Score</div>
                  <Progress 
                    value={resumeData.readinessScore} 
                    className={`h-2 mt-2 ${getScoreColor(resumeData.readinessScore)}`}
                  />
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {resumeData.dataUsed.transcriptCount + resumeData.dataUsed.courseCount}
                  </div>
                  <div className="text-sm text-muted-foreground">Learning Items Used</div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="secondary">
                  {resumeData.dataUsed.transcriptCount} Transcripts
                </Badge>
                <Badge variant="secondary">
                  {resumeData.dataUsed.courseCount} Courses
                </Badge>
                {resumeData.dataUsed.hasCareerGoal && (
                  <Badge variant="secondary">Career Goal</Badge>
                )}
                {resumeData.dataUsed.feedbackCount > 0 && (
                  <Badge variant="secondary">
                    {resumeData.dataUsed.feedbackCount} Mentor Reviews
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Resume Title & Publish Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Resume Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="resume-title" className="text-sm font-medium">
                  Resume Title
                </Label>
                <Input
                  id="resume-title"
                  value={resumeTitle}
                  onChange={(e) => setResumeTitle(e.target.value)}
                  placeholder="Enter a title for your resume..."
                  className="mt-1"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="publish-toggle"
                  checked={publishToProfile}
                  onCheckedChange={setPublishToProfile}
                />
                <Label htmlFor="publish-toggle" className="text-sm font-medium">
                  Publish to Profile
                </Label>
              </div>
              
              {publishToProfile && (
                <div className="text-sm text-muted-foreground bg-primary/5 p-3 rounded-lg border border-primary/20">
                  <p className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-primary" />
                    This resume will be visible on your public profile at <code>/resume/:id</code>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

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

          {/* Key Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Key Achievements
                <Button variant="outline" size="sm" onClick={addBullet}>
                  Add Bullet
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {editableContent.bullets.map((bullet, index) => (
                <div key={index} className="flex gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <Textarea
                    value={bullet}
                    onChange={(e) => updateBullet(index, e.target.value)}
                    rows={2}
                    className="flex-1 resize-none"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeBullet(index)}
                    className="mt-1"
                  >
                    Remove
                  </Button>
                </div>
              ))}
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
                  <h4 className="font-semibold text-foreground mb-2">{category}</h4>
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

          {/* Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={saveResume} disabled={isSaving} className="flex-1">
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {publishToProfile ? 'Save & Publish' : 'Save Resume Draft'}
                    </>
                  )}
                </Button>
                <Button variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                {publishToProfile && (
                  <Badge variant="secondary" className="flex items-center gap-1 px-3 py-1 h-auto">
                    <Globe className="h-3 w-3" />
                    Will Publish
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ResumeBuilder;