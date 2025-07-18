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

  // Jordan Reyes profile data for testing
  const testPayload = {
    user_id: "cd43942f-56c5-49b5-8771-39f88b2775a2"
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

  const checkDatabaseResults = async () => {
    try {
      // Check career tracks
      const { data: careerTracks, error: careerError } = await supabase
        .from('career_tracks')
        .select('*')
        .eq('user_id', testPayload.user_id);

      // Check roadmap steps  
      const { data: roadmapSteps, error: roadmapError } = await supabase
        .from('roadmap_steps')
        .select('*')
        .eq('user_id', testPayload.user_id);

      if (careerError || roadmapError) {
        throw new Error("Error fetching results from database");
      }

      console.log("Career tracks created:", careerTracks);
      console.log("Roadmap steps created:", roadmapSteps);

      setResponse({
        ...response,
        database_check: {
          career_tracks: careerTracks,
          roadmap_steps: roadmapSteps,
          career_tracks_count: careerTracks?.length || 0,
          roadmap_steps_count: roadmapSteps?.length || 0,
        }
      });

      toast({
        title: "Database Check Complete",
        description: `Found ${careerTracks?.length || 0} career tracks and ${roadmapSteps?.length || 0} roadmap steps`,
      });

    } catch (error) {
      console.error("Error checking database:", error);
      toast({
        title: "Error",
        description: "Failed to check database results",
        variant: "destructive",
      });
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
        <div className="flex gap-4">
          <Button 
            onClick={handleGenerateRoadmap} 
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Generating Roadmap...' : 'Generate Roadmap for Jordan Reyes'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={checkDatabaseResults}
            disabled={loading}
            className="flex-1"
          >
            Check Database Results
          </Button>
        </div>

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