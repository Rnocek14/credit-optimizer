
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const MayaRoadmapGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Maya Lin profile data
  const mayaProfile = {
    id: "maya-lin-test-id-2025",
    user_id: "maya-lin-auth-id-2025", 
    name: "Maya Lin",
    experience_level: "Entry Level",
    role_title: "High School Graduate",
    industry: "Technology",
    skills: ["Basic Computer Skills", "Microsoft Excel"],
    education: "High School Diploma",
    years_experience: 0,
    career_goals: "Become a Data Analyst within 12 months with budget-conscious online learning",
    interests: ["Data Analysis", "Statistics", "Problem Solving"],
    learning_style: "Self-paced online learning",
    availability: "Full-time study (40+ hours/week)",
    location: "Remote",
    willing_to_relocate: false,
    salary_expectations: 50000,
    work_preferences: "Remote work preferred, entry-level positions"
  };

  const createMayaProfile = async () => {
    try {
      console.log('Creating Maya Lin profile...');
      
      const { data, error } = await supabase
        .from('profiles')
        .upsert(mayaProfile)
        .select();

      if (error) {
        console.error('Profile creation error:', error);
        throw new Error(`Failed to create profile: ${error.message}`);
      }

      console.log('Maya profile created:', data);
      toast({
        title: "Success",
        description: "Maya Lin's profile created successfully!"
      });

      return data[0];
    } catch (err) {
      console.error('Error creating profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Profile creation error: ${errorMessage}`);
      toast({
        title: "Error",
        description: `Failed to create profile: ${errorMessage}`,
        variant: "destructive"
      });
      throw err;
    }
  };

  const generateRoadmap = async () => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // First create the profile
      await createMayaProfile();

      console.log('Calling generate-roadmap function for Maya Lin...');
      
      const { data, error } = await supabase.functions.invoke('generate-roadmap', {
        body: { user_id: mayaProfile.id }
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
          description: "Maya's roadmap generated successfully!"
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

  const checkResults = async () => {
    try {
      // Check career tracks
      const { data: careerTracks, error: careerError } = await supabase
        .from('career_tracks')
        .select('*')
        .eq('user_id', mayaProfile.id);

      // Check roadmap steps  
      const { data: roadmapSteps, error: roadmapError } = await supabase
        .from('roadmap_steps')
        .select('*')
        .eq('user_id', mayaProfile.id);

      if (careerError || roadmapError) {
        throw new Error("Error fetching results from database");
      }

      console.log("Maya's career tracks:", careerTracks);
      console.log("Maya's roadmap steps:", roadmapSteps);

      const formattedTracks = careerTracks?.map((track, index) => ({
        track_title: track.title,
        description: track.description,
        reasoning: track.reasoning,
        growth_potential: track.growth_potential,
        time_to_proficiency: track.time_to_proficiency,
        steps: roadmapSteps?.filter((_, stepIndex) => 
          Math.floor(stepIndex / 3) === index
        ).map(step => ({
          title: step.title,
          description: step.description,
          category: step.category,
          timeline: step.timeline,
          priority: step.priority,
          estimated_duration: step.estimated_duration,
          prerequisites: step.prerequisites,
          success_metrics: step.success_metrics
        }))
      }));

      setResponse({
        ...response,
        formatted_roadmap: {
          user_profile: {
            name: mayaProfile.name,
            starting_point: "High school graduate with no college degree",
            goal: "Become a Data Analyst within 12 months",
            constraints: [
              "Budget-conscious",
              "Prefers online/self-paced learning", 
              "No prior experience or formal education in data",
              "Wants job-ready proof (portfolio/certs)"
            ]
          },
          career_tracks: formattedTracks,
          database_summary: {
            career_tracks_count: careerTracks?.length || 0,
            roadmap_steps_count: roadmapSteps?.length || 0
          }
        }
      });

      toast({
        title: "Results Retrieved",
        description: `Found ${careerTracks?.length || 0} career tracks and ${roadmapSteps?.length || 0} roadmap steps for Maya`,
      });

    } catch (error) {
      console.error("Error checking results:", error);
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
        <CardTitle>Maya Lin - Data Analyst Roadmap Generator</CardTitle>
        <CardDescription>
          Generate a personalized 12-month roadmap for Maya to become a Data Analyst
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-2">Maya's Profile:</h3>
          <div className="text-sm space-y-1">
            <p><strong>Starting Point:</strong> High school graduate, no college degree</p>
            <p><strong>Goal:</strong> Data Analyst within 12 months</p>
            <p><strong>Constraints:</strong> Budget-conscious, online learning, no prior data experience</p>
            <p><strong>Requirements:</strong> Job-ready proof (portfolio/certifications)</p>
          </div>
        </div>

        <div className="flex gap-4">
          <Button 
            onClick={generateRoadmap} 
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Generating Roadmap...' : 'Generate Maya\'s Data Analyst Roadmap'}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={checkResults}
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
      </CardContent>
    </Card>
  );
};
