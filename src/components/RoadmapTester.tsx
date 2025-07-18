import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const RoadmapTester = () => {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const testPayload = {
    user_id: "5b11f83e-2f25-422d-aa61-b4f9c07b7eee",
    profile_data: {
      user_background: {
        experience_level: "beginner",
        role_title: "Graphic Designer",
        industry: "Design",
        skills: ["Figma", "Photoshop", "Illustrator"],
        education: "BA in Graphic Design",
        years_experience: 2
      },
      goals_and_interests: {
        career_goals: "Become a UX Designer at a product company",
        interests: ["User Experience", "Mobile Apps"],
        preferred_learning_style: "Project-based",
        availability: "10 hours/week"
      },
      context: {
        location: "Remote",
        willing_to_relocate: false,
        salary_expectations: 80000,
        work_preferences: "remote-first"
      }
    }
  };

  const handleGenerateRoadmap = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      console.log('Calling generate-roadmap function with payload:', testPayload);
      
      const { data, error } = await supabase.functions.invoke('generate-roadmap', {
        body: testPayload
      });

      if (error) {
        console.error('Function error:', error);
        setError(`Function error: ${error.message}`);
        toast({
          title: "Error",
          description: `Failed to generate roadmap: ${error.message}`,
          variant: "destructive"
        });
      } else {
        console.log('Function response:', data);
        setResponse(data);
        toast({
          title: "Success",
          description: "Roadmap generated successfully!"
        });
      }
    } catch (err) {
      console.error('Request error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Request error: ${errorMessage}`);
      toast({
        title: "Error",
        description: `Request failed: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Roadmap Generator Tester</CardTitle>
        <CardDescription>
          Test the generate-roadmap Edge Function with sample profile data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleGenerateRoadmap} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Generating Roadmap...' : 'Generate Roadmap'}
        </Button>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <h3 className="font-semibold text-destructive mb-2">Error:</h3>
            <pre className="text-sm text-destructive whitespace-pre-wrap">{error}</pre>
          </div>
        )}

        {response && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Response received at: {new Date().toISOString()}</h3>
              <pre className="text-sm bg-background p-4 rounded border overflow-auto max-h-96">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="p-4 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-2">Test Payload:</h3>
          <pre className="text-sm bg-background p-4 rounded border overflow-auto max-h-48">
            {JSON.stringify(testPayload, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
};