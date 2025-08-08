import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Linkedin, ArrowRight, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePlanStore } from '@/state/planStore';
import { useToast } from '@/hooks/use-toast';

interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  timeline: string;
  category: string;
}

export const LinkedInImportDemo: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [roadmapSteps, setRoadmapSteps] = useState<RoadmapStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [parsedSkills, setParsedSkills] = useState<string[]>([]);
  const { addCourseToPlan } = usePlanStore();
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      // Mock parsing - in real implementation would parse PDF/JSON
      const mockSkills = ['SQL', 'Market Analysis', 'User Research', 'Project Management'];
      setParsedSkills(mockSkills);
      await generateRoadmap(mockSkills);
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Upload Failed",
        description: "Could not parse the uploaded file",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateOAuth = async () => {
    setLoading(true);
    try {
      // Call linkedin-parse edge function
      const { data, error } = await supabase.functions.invoke('linkedin-parse', {
        body: { demo: true }
      });

      if (error) throw error;

      setParsedSkills(data.skills);
      await generateRoadmap(data.skills);
    } catch (error) {
      console.error('OAuth simulation error:', error);
      toast({
        title: "Import Failed",
        description: "Could not simulate LinkedIn import",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateRoadmap = async (skills: string[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-roadmap', {
        body: { user_skills: skills }
      });

      if (error) throw error;

      // Extract steps from the roadmap response
      const steps = data.roadmap?.steps || [];
      setRoadmapSteps(steps.slice(0, 5)); // Show top 5 steps
      setModalOpen(true);
    } catch (error) {
      console.error('Roadmap generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate roadmap steps",
        variant: "destructive",
      });
    }
  };

  const addTop2ToPlan = () => {
    const top2Steps = roadmapSteps.slice(0, 2);
    top2Steps.forEach(step => {
      addCourseToPlan({
        id: step.id,
        title: step.title,
        provider: 'Demo',
        url: '#'
      });
    });

    toast({
      title: "Steps Added to Plan!",
      description: `Added ${top2Steps.length} steps to your learning plan`,
    });

    setModalOpen(false);
  };

  return (
    <>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Linkedin className="h-5 w-5 text-blue-600" />
            Import from LinkedIn (demo)
          </CardTitle>
          <CardDescription>
            Import your experience and get personalized roadmap recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="resume-upload">Upload Resume</Label>
              <div className="relative">
                <Input
                  id="resume-upload"
                  type="file"
                  accept=".pdf,.json"
                  onChange={handleFileUpload}
                  disabled={loading}
                  className="cursor-pointer"
                />
                <Upload className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">PDF or JSON format</p>
            </div>

            <div className="space-y-2">
              <Label>LinkedIn OAuth Simulation</Label>
              <Button 
                onClick={handleSimulateOAuth}
                disabled={loading}
                className="w-full"
                variant="outline"
              >
                <Linkedin className="h-4 w-4 mr-2" />
                {loading ? 'Processing...' : 'Simulate OAuth'}
              </Button>
              <p className="text-xs text-muted-foreground">Demo LinkedIn data import</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generated Roadmap Steps</DialogTitle>
            <DialogDescription>
              Based on your skills: {parsedSkills.join(', ')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {roadmapSteps.map((step, index) => (
              <Card key={step.id} className={index < 2 ? "border-primary" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h4 className="font-medium">{step.title}</h4>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                      <div className="flex gap-2">
                        <Badge variant="outline">{step.category}</Badge>
                        <Badge variant="secondary">{step.timeline}</Badge>
                        {index < 2 && (
                          <Badge className="bg-primary text-primary-foreground">
                            Top Recommendation
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {roadmapSteps.length > 0 && (
              <div className="flex justify-center pt-4">
                <Button onClick={addTop2ToPlan} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Top 2 Steps to Plan (demo)
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};